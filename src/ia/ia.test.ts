import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { guardarAlergia } from '../db/alergias'
import { db } from '../db/db'
import { guardarMedicamento, listarMedicamentos } from '../db/medicamentos'
import { crearPerfil } from '../db/perfiles'
import { adjuntosPendientes, bloquesDeTexto, marcarAdjunto, pedirPropuestas, sePuedeAnalizar } from './analizar'
import { cuerpoPeticion, ErrorIa, explicarError, llamarClaude, MODELO, pareceClave } from './claude'
import { guardarPropuesta, HERRAMIENTA, instrucciones, leerPropuesta, leerRespuesta, verPropuesta } from './propuestas'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

/** Simula que la IA contesta rellenando la ficha con estos datos. */
function simularIa(input: unknown, estado = 200) {
  const fetch = vi.fn(
    async () => new Response(JSON.stringify({ content: [{ type: 'tool_use', name: 'proponer_registros', input }] }), { status: estado }),
  )
  vi.stubGlobal('fetch', fetch)
  return fetch
}

describe('conexión con Claude', () => {
  it('reconoce cómo es una clave', () => {
    expect(pareceClave('sk-ant-api03-abcdefghijklmnopqrstuvwxyz0123')).toBe(true)
    expect(pareceClave('hola')).toBe(false)
    expect(pareceClave('  sk-ant-api03-abcdefghijklmnopqrstuvwxyz0123  ')).toBe(true)
  })

  it('obliga a la IA a contestar con la ficha', () => {
    const cuerpo = cuerpoPeticion({ sistema: 'x', contenido: [{ type: 'text', text: 'hola' }], herramienta: HERRAMIENTA })
    expect(cuerpo.model).toBe(MODELO)
    expect(cuerpo.tool_choice).toEqual({ type: 'tool', name: 'proponer_registros' })
  })

  it('envía la clave solo a Anthropic, con las cabeceras para el navegador', async () => {
    const fetch = simularIa({ resumen: 'ok', propuestas: [] })
    await llamarClaude({ clave: 'sk-ant-prueba', sistema: 'x', contenido: [{ type: 'text', text: 'hola' }], herramienta: HERRAMIENTA })
    const [url, opciones] = fetch.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://api.anthropic.com/v1/messages')
    const cabeceras = opciones.headers as Record<string, string>
    expect(cabeceras['x-api-key']).toBe('sk-ant-prueba')
    expect(cabeceras['anthropic-dangerous-direct-browser-access']).toBe('true')
  })

  it('explica los errores con palabras sencillas', async () => {
    simularIa({}, 401)
    await expect(llamarClaude({ clave: 'mala', sistema: 'x', contenido: [] })).rejects.toThrow(/clave/)
    expect(explicarError(429)).toMatch(/Espera/)
    expect(explicarError(529)).toMatch(/ocupado/)

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))),
    )
    await expect(llamarClaude({ clave: 'x', sistema: 'x', contenido: [] })).rejects.toBeInstanceOf(ErrorIa)
  })
})

describe('las instrucciones para la IA', () => {
  it('llevan la edad, el sexo y lo que ya toma, pero nunca el nombre', () => {
    const texto = instrucciones(
      { fechaNacimiento: '1958-03-21', sexo: 'mujer' },
      { medicamentos: ['Enalapril'], alergias: ['Penicilina'] },
      '2026-10-18',
    )
    expect(texto).toContain('68 años, mujer')
    expect(texto).toContain('Enalapril')
    expect(texto).toContain('Penicilina')
    expect(texto).toContain('Hoy es 2026-10-18')
  })
})

describe('comprobar lo que propone la IA', () => {
  it('se queda con lo válido y cuenta lo descartado', () => {
    const lectura = leerRespuesta({
      resumen: 'Informe de cardiología.',
      propuestas: [
        { tipo: 'cita', explicacion: 'Próxima revisión', datos: { fecha: '2027-03-15', hora: '10:30', especialidad: 'Cardiología' } },
        { tipo: 'cita', explicacion: 'Sin fecha', datos: { especialidad: 'Cardiología' } },
        { tipo: 'inventado', explicacion: '', datos: {} },
        { tipo: 'medicamento', explicacion: '', datos: { nombre: 'Bisoprolol', dosis: '2,5 mg', momentos: ['desayuno', 'merienda'] } },
      ],
    })
    expect(lectura.resumen).toBe('Informe de cardiología.')
    expect(lectura.propuestas.map((p) => p.tipo)).toEqual(['cita', 'medicamento'])
    expect(lectura.descartadas).toBe(2)
    // «merienda» no es un momento de la app: se quita.
    expect(lectura.propuestas[1]).toMatchObject({ momentos: ['desayuno'] })
  })

  it('no acepta fechas ni horas imposibles', () => {
    expect(leerPropuesta({ tipo: 'cita', datos: { fecha: '2026-02-30', especialidad: 'Digestivo' } })).toBeNull()
    expect(leerPropuesta({ tipo: 'cita', datos: { fecha: '2026-11-03', hora: '25:00', especialidad: 'Digestivo' } })).toMatchObject({
      hora: undefined,
    })
  })

  it('en los análisis respeta los números y reconoce las pruebas', () => {
    const p = leerPropuesta({
      tipo: 'analitica',
      datos: {
        fecha: '2026-09-10',
        resultados: [
          { nombre: 'Glucosa', valor: 104, unidad: 'mg/dL', refMin: 74, refMax: 100 },
          { nombre: 'Creatinina', valor: '0,85', unidad: 'mg/dL' },
          { nombre: 'Filtrado glomerular', valor: 90, comparador: '>' },
          { nombre: 'Sin valor' },
        ],
      },
    })
    expect(p).toMatchObject({ tipo: 'analitica' })
    if (p?.tipo !== 'analitica') throw new Error()
    expect(p.resultados).toHaveLength(3)
    expect(p.resultados[0]).toMatchObject({ clave: 'glucosa', valor: 104, refMin: 74, refMax: 100 })
    expect(p.resultados[1].valor).toBe(0.85)
    expect(p.resultados[2].comparador).toBe('>')
    expect(verPropuesta(p).detalles[0]).toBe('Glucosa: 104 mg/dL (74 - 100)')
  })

  it('en el dentista solo acepta dientes que existen', () => {
    const p = leerPropuesta({ tipo: 'dental', datos: { fecha: '2026-05-05', tipoDental: 'empaste', dientes: [36, 36, 19, '46'] } })
    expect(p).toMatchObject({ dientes: [36, 46] })
  })
})

describe('guardar lo que la persona confirma', () => {
  it('cada propuesta va a su sección', async () => {
    const perfil = await crearPerfil({ nombre: 'Carmen', color: '#2e5c8a' })
    const propuestas = leerRespuesta({
      resumen: '',
      propuestas: [
        { tipo: 'medicamento', datos: { nombre: 'Omeprazol', dosis: '20 mg', momentos: ['desayuno'] } },
        { tipo: 'cita', datos: { fecha: '2027-01-20', especialidad: 'Digestivo' } },
        { tipo: 'historial', datos: { fecha: '2026-09-10', tipoHistorial: 'diagnostico', titulo: 'Gastritis', cronica: true } },
        { tipo: 'alergia', datos: { nombre: 'Ibuprofeno', tipoAlergia: 'medicamento', gravedad: 'moderada' } },
        { tipo: 'vacuna', datos: { nombre: 'Vacuna de la gripe', fecha: '2026-10-10' } },
        { tipo: 'medida', datos: { tipoMedida: 'tension', fecha: '2026-10-10', valor: 135, valor2: 85 } },
        { tipo: 'analitica', datos: { fecha: '2026-09-10', resultados: [{ nombre: 'Glucosa', valor: 95 }] } },
        { tipo: 'dental', datos: { fecha: '2026-06-01', tipoDental: 'limpieza' } },
      ],
    }).propuestas
    const secciones = []
    for (const p of propuestas) secciones.push(await guardarPropuesta(perfil, p))
    expect(secciones).toEqual([
      'Medicación',
      'Citas',
      'Historial',
      'Alergias',
      'Revisiones y vacunas',
      'Constantes vitales',
      'Análisis',
      'Salud dental',
    ])
    expect((await db.revisiones.toArray())[0].clave).toBe('gripe')
    expect((await db.historial.toArray())[0].cronica).toBe(true)
  })

  it('«dejar de tomar» busca el medicamento aunque el nombre no sea exacto', async () => {
    const perfil = await crearPerfil({ nombre: 'Carmen', color: '#2e5c8a' })
    await guardarMedicamento(perfil.id, { nombre: 'Omeprazol 20 mg', momentos: ['desayuno'], activo: 1 })
    await guardarPropuesta(perfil, { tipo: 'dejar_medicamento', explicacion: '', nombre: 'omeprazol', fecha: '2026-10-01' })
    expect(await listarMedicamentos(perfil.id, true)).toHaveLength(0)
    await expect(guardarPropuesta(perfil, { tipo: 'dejar_medicamento', explicacion: '', nombre: 'Sintrom' })).rejects.toThrow(
      /No encuentro/,
    )
  })

  it('no guarda lo que no pasaría la comprobación del formulario', async () => {
    const perfil = await crearPerfil({ nombre: 'Carmen', color: '#2e5c8a' })
    await expect(
      guardarPropuesta(perfil, { tipo: 'medida', explicacion: '', tipoMedida: 'tension', fecha: '2026-10-10', valor: 135 }),
    ).rejects.toThrow()
    expect(await db.constantes.count()).toBe(0)
  })
})

describe('analizar', () => {
  it('sabe qué archivos puede leer', () => {
    const foto = new Blob(['x'], { type: 'image/jpeg' })
    expect(sePuedeAnalizar({ tipo: 'foto', archivo: foto }).si).toBe(true)
    expect(sePuedeAnalizar({ tipo: 'documento', archivo: new Blob(['x'], { type: 'application/pdf' }) }).si).toBe(true)
    expect(sePuedeAnalizar({ tipo: 'documento', archivo: new Blob(['x'], { type: 'application/msword' }) }).si).toBe(false)
    expect(sePuedeAnalizar({ tipo: 'voz', archivo: new Blob(['x'], { type: 'audio/webm' }) }).si).toBe(false)
    expect(
      sePuedeAnalizar({ tipo: 'voz', archivo: new Blob(['x'], { type: 'audio/webm' }), transcripcion: 'Me han subido la pastilla' }).si,
    ).toBe(true)
  })

  it('pide propuestas con lo que ya tiene apuntado, sin el nombre de la persona', async () => {
    const perfil = await crearPerfil({ nombre: 'Carmen', color: '#2e5c8a', fechaNacimiento: '1958-03-21' })
    await guardarAlergia(perfil.id, { tipo: 'medicamento', clase: 'alergia', nombre: 'Penicilina', gravedad: 'grave' })
    const fetch = simularIa({
      resumen: 'Te han cambiado la dosis.',
      propuestas: [{ tipo: 'medicamento', datos: { nombre: 'Sintrom', dosis: '4 mg' } }],
    })

    const lectura = await pedirPropuestas('sk-ant-prueba', perfil, bloquesDeTexto('El médico me ha puesto Sintrom de 4'))
    expect(lectura.propuestas).toHaveLength(1)
    const cuerpo = String((fetch.mock.calls[0] as unknown as [string, RequestInit])[1].body)
    expect(cuerpo).toContain('Penicilina')
    expect(cuerpo).toContain('Sintrom de 4')
    expect(cuerpo).not.toContain('Carmen')
  })

  it('lista los archivos pendientes y los marca al terminar', async () => {
    const perfil = await crearPerfil({ nombre: 'Carmen', color: '#2e5c8a' })
    const ahora = Date.now()
    await db.adjuntos.add({
      id: 'a1',
      perfilId: perfil.id,
      tipo: 'foto',
      nombre: 'Receta',
      archivo: new Blob(['x'], { type: 'image/jpeg' }),
      analisis: 'pendiente',
      creadoEn: ahora,
      actualizadoEn: ahora,
    })
    expect((await adjuntosPendientes(perfil.id)).map((a) => a.id)).toEqual(['a1'])
    await marcarAdjunto('a1', 'hecho', 'Una receta de omeprazol.')
    expect(await adjuntosPendientes(perfil.id)).toHaveLength(0)
    expect((await db.adjuntos.get('a1'))?.resumenIa).toBe('Una receta de omeprazol.')
  })
})
