import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from './db/db'

// En los tests no hay modo "sin internet" real: lo sustituimos por uno vacío.
vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({ offlineReady: [false, () => {}], needRefresh: [false, () => {}] }),
}))

const { default: App } = await import('./App')

beforeEach(async () => {
  await db.delete()
  await db.open()
  localStorage.clear()
  window.location.hash = ''
})

describe('la app', () => {
  it('la primera vez da la bienvenida y deja crear una persona', async () => {
    const usuario = userEvent.setup()
    render(<App />)

    await usuario.click(await screen.findByRole('button', { name: 'Empezar' }))
    await usuario.type(await screen.findByLabelText('Nombre'), 'Carmen')
    await usuario.click(screen.getByRole('button', { name: 'Mujer' }))
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByRole('heading', { name: 'Hola, Carmen' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Medicación/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Salud dental/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Ficha de emergencia/ })).toBeInTheDocument()
    expect((await db.perfiles.toArray())[0]).toMatchObject({ nombre: 'Carmen', sexo: 'mujer' })
  })

  it('no guarda una persona sin nombre', async () => {
    const usuario = userEvent.setup()
    render(<App />)

    await usuario.click(await screen.findByRole('button', { name: 'Empezar' }))
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(screen.getByText('Escribe el nombre, por favor.')).toBeInTheDocument()
    expect(await db.perfiles.count()).toBe(0)
  })

  it('guarda un teléfono y el botón Llamar marca ese número', async () => {
    const usuario = userEvent.setup()
    render(<App />)

    await usuario.click(await screen.findByRole('button', { name: 'Empezar' }))
    await usuario.type(await screen.findByLabelText('Nombre'), 'Carmen')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))
    await usuario.click(await screen.findByRole('link', { name: /Teléfonos de centros médicos/ }))

    // El 112 está siempre, sin rellenar nada.
    expect(await screen.findByRole('link', { name: /Llamar al 112/ })).toHaveAttribute('href', 'tel:112')

    await usuario.click(screen.getByRole('button', { name: /Añadir teléfono/ }))
    await usuario.click(screen.getByRole('button', { name: /Médico particular/ }))
    await usuario.type(screen.getByLabelText(/^Nombre/), 'Dra. Álvarez')
    await usuario.type(screen.getByLabelText('Teléfono'), '612 34 56 78')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByRole('link', { name: 'Llamar a Dra. Álvarez' })).toHaveAttribute('href', 'tel:612345678')
    expect(screen.getByText('612 345 678')).toBeInTheDocument()
  })

  it('avisa al apuntar un medicamento de la familia de una alergia', async () => {
    const usuario = userEvent.setup()
    render(<App />)

    await usuario.click(await screen.findByRole('button', { name: 'Empezar' }))
    await usuario.type(await screen.findByLabelText('Nombre'), 'Carmen')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    // 1. Apunta la alergia a la penicilina.
    await usuario.click(await screen.findByRole('link', { name: /Alergias e intolerancias/ }))
    await usuario.click(await screen.findByRole('button', { name: /Añadir alergia/ }))
    await usuario.type(screen.getByLabelText(/^Medicamento/), 'Penicilina')
    expect(screen.getByText(/Reconocido/)).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Grave' }))
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(await screen.findByText('Penicilina')).toBeInTheDocument()

    // 2. Al escribir Augmentine en Medicación, avisa antes de guardar.
    await usuario.click(screen.getByRole('button', { name: /Volver al inicio/ }))
    await usuario.click(await screen.findByRole('link', { name: /Medicación/ }))
    await usuario.click(await screen.findByRole('button', { name: /Añadir medicamento/ }))
    await usuario.type(screen.getByLabelText(/^Nombre del medicamento/), 'Augmentine 875')
    expect(screen.getByRole('alert')).toHaveTextContent(/misma familia/)
    expect(screen.getByText(/Antibiótico \(penicilina\)/)).toBeInTheDocument()

    // 3. Al guardar, pide confirmación; si se confirma, queda marcado en rojo.
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))
    await usuario.click(await screen.findByRole('button', { name: /me lo ha mandado el médico/ }))
    expect(await screen.findByText(/Revisa con tu médico/)).toBeInTheDocument()
    // Sale en el aviso de arriba y en su tarjeta.
    expect(screen.getAllByText('Augmentine 875')).toHaveLength(2)
  })

  it('desde el inicio se puede poner la foto de la persona', async () => {
    const usuario = userEvent.setup()
    render(<App />)

    await usuario.click(await screen.findByRole('button', { name: 'Empezar' }))
    await usuario.type(await screen.findByLabelText('Nombre'), 'Carmen')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText(/Toca la cámara de arriba para poner tu foto/)).toBeInTheDocument()
    const foto = new File([new Uint8Array([255, 216, 255])], 'carmen.jpg', { type: 'image/jpeg' })
    await usuario.upload(screen.getByLabelText('Poner foto de Carmen'), foto)

    expect(await screen.findByRole('button', { name: 'Cambiar foto' })).toBeInTheDocument()
    expect(screen.queryByText(/Toca la cámara de arriba/)).not.toBeInTheDocument()
    expect((await db.perfiles.toArray())[0].foto).toBeDefined()
  })

  it('apunta una tensión y dice si está bien', async () => {
    const usuario = userEvent.setup()
    render(<App />)
    await usuario.click(await screen.findByRole('button', { name: 'Empezar' }))
    await usuario.type(await screen.findByLabelText('Nombre'), 'Carmen')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    await usuario.click(await screen.findByRole('link', { name: /Constantes vitales/ }))
    await usuario.click(await screen.findByRole('button', { name: /Apuntar tensión/ }))
    await usuario.type(screen.getByLabelText('Alta'), '150')
    await usuario.type(screen.getByLabelText('Baja'), '95')
    expect(screen.getByText(/Entendido/)).toHaveTextContent('Alta 150 · Baja 95')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByRole('button', { name: /Tensión.*Alta 150.*Baja 95.*Alta/ })).toBeInTheDocument()
  })

  it('la regla sale solo si toca, y se apunta desde Constantes vitales', async () => {
    const usuario = userEvent.setup()
    render(<App />)
    await usuario.click(await screen.findByRole('button', { name: 'Empezar' }))
    await usuario.type(await screen.findByLabelText('Nombre'), 'Antonio')
    await usuario.click(screen.getByRole('button', { name: 'Hombre' }))
    expect(screen.queryByText('¿Quieres apuntar la regla?')).not.toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))
    await usuario.click(await screen.findByRole('link', { name: /Constantes vitales/ }))
    await screen.findByRole('button', { name: /Apuntar tensión/ })
    expect(screen.queryByRole('button', { name: /Regla/ })).not.toBeInTheDocument()
    expect(await db.perfiles.count()).toBe(1)

    // Una mujer: viene marcada por defecto.
    await db.perfiles.update((await db.perfiles.toArray())[0].id, { sexo: 'mujer' })
    await usuario.click(await screen.findByRole('button', { name: /Regla/ }))
    await usuario.click(await screen.findByRole('button', { name: /Apuntar regla/ }))
    fireEvent.change(screen.getByLabelText('¿Qué día te vino?'), { target: { value: '2026-09-04' } })
    fireEvent.change(screen.getByLabelText(/¿Qué día se te fue\?/), { target: { value: '2026-09-08' } })
    await usuario.click(screen.getByRole('button', { name: 'Dolor' }))
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('Duró 5 días')).toBeInTheDocument()
    expect((await db.ciclos.toArray())[0]).toMatchObject({ inicio: '2026-09-04', fin: '2026-09-08', sintomas: ['Dolor'] })
  })

  it('apunta un empaste tocando el diente en el dibujo', async () => {
    const usuario = userEvent.setup()
    render(<App />)
    await usuario.click(await screen.findByRole('button', { name: 'Empezar' }))
    await usuario.type(await screen.findByLabelText('Nombre'), 'Manuel')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    await usuario.click(await screen.findByRole('link', { name: /Salud dental/ }))
    await usuario.click(await screen.findByRole('button', { name: /Apuntar visita al dentista/ }))
    await usuario.click(screen.getByRole('button', { name: /Empaste/ }))
    // Sin dientes no deja guardar.
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(screen.getByText(/Toca en el dibujo/)).toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: /^Primera muela de abajo, a tu izquierda \(36\)/ }))
    expect(screen.getByText('Primera muela de abajo, a tu izquierda')).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByRole('button', { name: /\(36\): empaste/ })).toBeInTheDocument()
    expect((await db.dental.toArray())[0]).toMatchObject({ tipo: 'empaste', dientes: [36] })
  })

  it('revisiones: dice lo que toca por la edad y se apunta con un toque', async () => {
    const usuario = userEvent.setup()
    render(<App />)
    await usuario.click(await screen.findByRole('button', { name: 'Empezar' }))
    await usuario.type(await screen.findByLabelText('Nombre'), 'Pilar')
    await usuario.click(screen.getByRole('button', { name: 'Mujer' }))
    // 66 años
    fireEvent.change(screen.getByLabelText(/Fecha de nacimiento/), { target: { value: `${new Date().getFullYear() - 66}-01-01` } })
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    await usuario.click(await screen.findByRole('link', { name: /Revisiones y vacunas/ }))
    const teToca = await screen.findByRole('region', { name: 'Te toca' })
    expect(teToca).toHaveTextContent('Mamografía')
    expect(teToca).toHaveTextContent('Vacuna del neumococo')
    expect(screen.getByRole('region', { name: 'Más adelante' })).toHaveTextContent('A los 70: vacuna del COVID')

    // Apuntar el neumococo desde su tarjeta: el nombre ya viene puesto.
    const tarjeta = screen.getByText(/Vacuna del neumococo/).closest('article')!
    await usuario.click(within(tarjeta).getByRole('button', { name: /Ya me la he puesto/ }))
    expect(screen.getByLabelText('¿Qué vacuna?')).toHaveValue('Vacuna del neumococo (neumonía)')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByRole('region', { name: 'Al día' })).toHaveTextContent('Vacuna del neumococo')
    expect((await db.revisiones.toArray())[0]).toMatchObject({ tipo: 'vacuna', clave: 'neumococo' })
  })

  it('IA: se cuenta algo, propone y se apunta solo lo que se confirma', async () => {
    localStorage.setItem('mi-salud:clave-ia', 'sk-ant-prueba-0000000000000000000000')
    const respuesta = {
      content: [
        {
          type: 'tool_use',
          name: 'proponer_registros',
          input: {
            resumen: 'Te han cambiado el protector de estómago.',
            propuestas: [
              { tipo: 'medicamento', explicacion: 'Te lo ha recetado la médica.', datos: { nombre: 'Pantoprazol', dosis: '40 mg', momentos: ['desayuno'] } },
              { tipo: 'cita', explicacion: 'Revisión.', datos: { fecha: '2027-02-01', especialidad: 'Digestivo' } },
            ],
          },
        },
      ],
    }
    const fetch = vi.fn(async () => new Response(JSON.stringify(respuesta)))
    vi.stubGlobal('fetch', fetch)
    const usuario = userEvent.setup()
    render(<App />)
    await usuario.click(await screen.findByRole('button', { name: 'Empezar' }))
    await usuario.type(await screen.findByLabelText('Nombre'), 'Carmen')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    await usuario.click(await screen.findByRole('link', { name: /Cuéntaselo a la app/ }))
    await usuario.type(await screen.findByLabelText('Qué ha pasado'), 'Me han puesto pantoprazol de 40')
    await usuario.click(screen.getByRole('button', { name: /Analizar/ }))
    // La primera vez explica qué se envía.
    expect(await screen.findByRole('dialog', { name: 'Antes de analizar' })).toHaveTextContent('Anthropic')
    await usuario.click(screen.getByRole('button', { name: 'Entendido, analizar' }))

    expect(await screen.findByText(/Te han cambiado el protector/)).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledTimes(1)
    const [apuntarMed] = screen.getAllByRole('button', { name: /Apuntar/ })
    await usuario.click(apuntarMed)
    expect(await screen.findByText('✓ Apuntado en Medicación.')).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: /^✗ No$/ }))
    await usuario.click(screen.getByRole('button', { name: 'Terminar' }))

    expect((await db.medicamentos.toArray()).map((m) => m.nombre)).toEqual(['Pantoprazol'])
    expect(await db.citas.count()).toBe(0)
    vi.unstubAllGlobals()
  })

  it('busca en todo, con faltas y sinónimos, y lleva a la sección', async () => {
    const usuario = userEvent.setup()
    render(<App />)
    await usuario.click(await screen.findByRole('button', { name: 'Empezar' }))
    await usuario.type(await screen.findByLabelText('Nombre'), 'Carmen')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))
    const perfil = (await db.perfiles.toArray())[0]
    const ahora = Date.now()
    await db.medicamentos.add({ id: 'm1', perfilId: perfil.id, nombre: 'Sintrom 4 mg', momentos: ['cena'], activo: 1, creadoEn: ahora, actualizadoEn: ahora })

    await usuario.click(await screen.findByRole('link', { name: /Buscar en todo/ }))
    await usuario.type(await screen.findByLabelText('Qué buscas'), 'pastillas sintron')
    expect(await screen.findByRole('status')).toHaveTextContent('He encontrado 1 cosa')
    await usuario.click(screen.getByRole('link', { name: /Sintrom 4 mg/ }))
    expect(await screen.findByText('Lo que tomas ahora y lo que tomaste antes')).toBeInTheDocument()
  })

  it('mis datos sanitarios salen en la ficha de emergencia', async () => {
    const usuario = userEvent.setup()
    render(<App />)
    await usuario.click(await screen.findByRole('button', { name: 'Empezar' }))
    await usuario.type(await screen.findByLabelText('Nombre'), 'Carmen')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    await usuario.click(await screen.findByRole('link', { name: /Mis datos sanitarios/ }))
    await usuario.click(await screen.findByRole('button', { name: 'A+' }))
    await usuario.type(screen.getByLabelText(/Importante en urgencias/), 'Llevo marcapasos')
    await usuario.click(screen.getByRole('button', { name: /Añadir a alguien/ }))
    const contacto = screen.getByRole('group', { name: 'Contacto 1' })
    await usuario.type(within(contacto).getByLabelText('Nombre'), 'Lucía')
    await usuario.type(within(contacto).getByLabelText('Teléfono'), '600000000')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    await usuario.click(await screen.findByRole('link', { name: /Ver mi ficha de emergencia/ }))
    const ficha = await screen.findByRole('article', { name: 'Ficha de emergencia' })
    expect(within(ficha).getByLabelText('Grupo sanguíneo: A+')).toBeInTheDocument()
    expect(ficha).toHaveTextContent('Llevo marcapasos')
    expect(within(ficha).getByRole('link', { name: 'Llamar a Lucía' })).toHaveAttribute('href', 'tel:600000000')
  })

  it('con un toque se ve la app llena de datos de ejemplo', async () => {
    const usuario = userEvent.setup()
    render(<App />)
    await usuario.click(await screen.findByRole('button', { name: /Ver con datos de ejemplo/ }))
    expect(await screen.findByRole('heading', { name: 'Hola, Rosa (ejemplo)' }, { timeout: 5000 })).toBeInTheDocument()
    expect(screen.getByRole('note')).toHaveTextContent('todos sus datos son inventados')
    // La cita de cardiología de dentro de 3 días sale avisada en el inicio.
    expect(await screen.findByRole('link', { name: /En 3 días.*Cardiología/ })).toBeInTheDocument()
  })

  it('pega el texto de un informe y guarda los resultados', async () => {
    const usuario = userEvent.setup()
    render(<App />)
    await usuario.click(await screen.findByRole('button', { name: 'Empezar' }))
    await usuario.type(await screen.findByLabelText('Nombre'), 'Carmen')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    await usuario.click(await screen.findByRole('link', { name: /Análisis/ }))
    await usuario.click(await screen.findByRole('button', { name: /Añadir análisis/ }))
    await usuario.click(screen.getByRole('button', { name: /Pega aquí su texto/ }))
    // Informe inventado.
    fireEvent.change(screen.getByLabelText(/Pega aquí el texto/), {
      target: { value: 'Fecha: 05/03/2026\nGlucosa 104 mg/dl (74 - 100)\nHDL Colesterol 55 mg/dl (Sup. 40)\nCEA < 1.50 ng/ml (Inf. 5)' },
    })
    await usuario.click(screen.getByRole('button', { name: 'Leer resultados' }))
    expect(screen.getByRole('status')).toHaveTextContent('He leído 3 resultados')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('Análisis del 5 de marzo de 2026')).toBeInTheDocument()
    expect(screen.getByText(/1 fuera de lo normal/)).toBeInTheDocument()
    const analitica = (await db.analiticas.toArray())[0]
    expect(analitica.resultados.map((r) => [r.clave, r.valor, r.comparador])).toEqual([
      ['glucosa', 104, undefined],
      ['hdl', 55, undefined],
      ['cea', 1.5, '<'],
    ])
  })

  it('el botón de leer en voz alta está siempre y lee la pantalla', async () => {
    // Voz del móvil simulada: guardamos lo que se le manda leer.
    const leido: string[] = []
    class Frase {
      text: string
      lang = ''
      rate = 1
      voice: unknown = null
      onstart?: () => void
      onend?: () => void
      onerror?: () => void
      constructor(t: string) {
        this.text = t
      }
    }
    vi.stubGlobal('SpeechSynthesisUtterance', Frase)
    vi.stubGlobal('speechSynthesis', { speak: (f: Frase) => leido.push(f.text), cancel: () => {}, getVoices: () => [] })

    const usuario = userEvent.setup()
    render(<App />)
    await usuario.click(await screen.findByRole('button', { name: 'Leer en voz alta' }))

    expect(leido.join(' ')).toContain('Bienvenido a Mi Salud')
    // Ya activada, el botón cambia y se puede quitar.
    expect(screen.getByRole('button', { name: 'Quitar la lectura en voz alta' })).toBeInTheDocument()
    expect(localStorage.getItem('mi-salud:lectura-voz')).toBe('si')

    // Al tocar un texto, se lee ese trozo.
    leido.length = 0
    await usuario.click(screen.getByText(/Todo se queda en este móvil/))
    expect(leido.join(' ')).toContain('Todo se queda en este móvil')

    await usuario.click(screen.getByRole('button', { name: 'Quitar la lectura en voz alta' }))
    expect(screen.getByRole('button', { name: 'Leer en voz alta' })).toBeInTheDocument()
    vi.unstubAllGlobals()
  })

  it('apunta una cita para mañana y el inicio avisa', async () => {
    const usuario = userEvent.setup()
    render(<App />)

    await usuario.click(await screen.findByRole('button', { name: 'Empezar' }))
    await usuario.type(await screen.findByLabelText('Nombre'), 'Carmen')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    await usuario.click(await screen.findByRole('link', { name: /Citas médicas/ }))
    await usuario.click(await screen.findByRole('button', { name: /Añadir cita/ }))
    await usuario.click(screen.getByRole('button', { name: 'Cardiología' }))
    const manana = new Date()
    manana.setDate(manana.getDate() + 1)
    const p = (n: number) => String(n).padStart(2, '0')
    const fecha = `${manana.getFullYear()}-${p(manana.getMonth() + 1)}-${p(manana.getDate())}`
    fireEvent.change(screen.getByLabelText('Fecha'), { target: { value: fecha } })
    fireEvent.change(screen.getByLabelText('Hora'), { target: { value: '10:30' } })
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('Mañana')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Añadir al calendario/ })).toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: /Volver al inicio/ }))
    expect(await screen.findByRole('link', { name: /Mañana a las 10:30: Cardiología/ })).toBeInTheDocument()
  })
})
