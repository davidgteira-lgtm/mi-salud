import { beforeEach, describe, expect, it } from 'vitest'
import { RECOMENDACIONES } from '../datos/revisiones'
import { guardarAnalitica } from './analiticas'
import { guardarMedida } from './constantes'
import { db } from './db'
import { guardarDental } from './dental'
import { crearPerfil } from './perfiles'
import {
  borrarRegistro,
  claveDelNombre,
  datosEnlazados,
  guardarPropia,
  guardarRegistro,
  listarRegistros,
  ocultarRecomendacion,
  queToca,
  revisarRegistro,
  textoMeses,
} from './revisiones'
import { sumarMeses } from '../utils/fechas'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

const HOY = '2026-10-18'
const de = (lista: ReturnType<typeof queToca>, clave: string) => lista.find((x) => x.clave === clave)

describe('sumar meses', () => {
  it('no se pasa de mes', () => {
    expect(sumarMeses('2026-01-31', 1)).toBe('2026-02-28')
    expect(sumarMeses('2024-02-29', 12)).toBe('2025-02-28')
    expect(sumarMeses('2026-10-18', 24)).toBe('2028-10-18')
    expect(sumarMeses('2026-11-15', 3)).toBe('2027-02-15')
  })
})

describe('qué toca según la edad y el sexo', () => {
  it('una mujer de 55 sin nada apuntado: mamografía, colon, cuello del útero y lo demás', () => {
    const lista = queToca({ edad: 55, sexo: 'mujer', registros: [], hoy: HOY })
    const tocan = lista.filter((x) => x.estado === 'toca').map((x) => x.clave)
    expect(tocan).toEqual(expect.arrayContaining(['mama', 'colon', 'cervix', 'colesterol', 'azucar', 'tension', 'dentista']))
    expect(de(lista, 'gripe')).toMatchObject({ estado: 'mas-adelante', edadInicio: 60 })
    expect(de(lista, 'zoster')).toMatchObject({ estado: 'mas-adelante', edadInicio: 65 })
    // Lo que toca va primero.
    expect(lista[0].estado).toBe('toca')
    expect(lista.at(-1)?.estado).toBe('mas-adelante')
  })

  it('a un hombre no le salen las pruebas de mujer, y el colesterol empieza antes', () => {
    const hombre = queToca({ edad: 38, sexo: 'hombre', registros: [], hoy: HOY })
    expect(de(hombre, 'mama')).toBeUndefined()
    expect(de(hombre, 'cervix')).toBeUndefined()
    expect(de(hombre, 'colesterol')?.estado).toBe('toca')
    const mujer = queToca({ edad: 38, sexo: 'mujer', registros: [], hoy: HOY })
    expect(de(mujer, 'colesterol')).toMatchObject({ estado: 'mas-adelante', edadInicio: 45 })
  })

  it('pasada la edad, ya no sale', () => {
    const lista = queToca({ edad: 72, sexo: 'mujer', registros: [], hoy: HOY })
    expect(de(lista, 'mama')).toBeUndefined()
    expect(de(lista, 'colon')).toBeUndefined()
    expect(de(lista, 'cervix')).toBeUndefined()
    expect(de(lista, 'covid')?.estado).toBe('toca')
  })

  it('cuenta el tiempo desde la última vez', () => {
    const lista = queToca({
      edad: 55,
      sexo: 'mujer',
      registros: [
        { clave: 'mama', fecha: '2025-03-01' }, // próxima en marzo de 2027: al día
        { clave: 'colon', fecha: '2024-11-20' }, // próxima el 20 de noviembre: pronto
        { clave: 'cervix', fecha: '2020-01-10' }, // cada 5 años a los 55: toca desde enero de 2025
      ],
      hoy: HOY,
    })
    expect(de(lista, 'mama')).toMatchObject({ estado: 'al-dia', proxima: '2027-03-01' })
    expect(de(lista, 'colon')).toMatchObject({ estado: 'pronto', proxima: '2026-11-20' })
    expect(de(lista, 'cervix')).toMatchObject({ estado: 'toca', proxima: '2025-01-10' })
  })

  it('la tensión: cada 4 años antes de los 40 y cada 2 después', () => {
    const registros = [{ clave: 'tension', fecha: '2024-01-01' }]
    expect(de(queToca({ edad: 35, registros, hoy: HOY }), 'tension')?.proxima).toBe('2028-01-01')
    expect(de(queToca({ edad: 45, registros, hoy: HOY }), 'tension')?.proxima).toBe('2026-01-01')
  })

  it('usa lo apuntado en otras partes de la app si es más reciente', () => {
    const lista = queToca({
      edad: 50,
      sexo: 'hombre',
      registros: [{ clave: 'tension', fecha: '2020-01-01' }],
      enlazados: { tension: '2026-09-01', colesterol: '2025-05-20', dentista: '2025-03-08' },
      hoy: HOY,
    })
    expect(de(lista, 'tension')).toMatchObject({ estado: 'al-dia', ultima: { fecha: '2026-09-01', origen: 'tension' } })
    expect(de(lista, 'colesterol')).toMatchObject({ estado: 'al-dia', ultima: { origen: 'colesterol' } })
    expect(de(lista, 'dentista')).toMatchObject({ estado: 'toca', proxima: '2026-03-08' })
  })

  it('lo apuntado para el futuro aún no cuenta', () => {
    const lista = queToca({ edad: 55, sexo: 'mujer', registros: [{ clave: 'mama', fecha: '2026-12-01' }], hoy: HOY })
    expect(de(lista, 'mama')?.estado).toBe('toca')
  })

  it('sin edad solo salen las revisiones propias', () => {
    const lista = queToca({ registros: [], propias: [{ clave: 'propia-1', nombre: 'Cardiólogo', cadaMeses: 12 }], hoy: HOY })
    expect(lista.map((x) => x.clave)).toEqual(['propia-1'])
  })

  it('se pueden quitar las que no le tocan', () => {
    const lista = queToca({ edad: 55, sexo: 'mujer', registros: [], ocultas: ['mama'], hoy: HOY })
    expect(de(lista, 'mama')).toBeUndefined()
  })
})

describe('vacunas de cada otoño', () => {
  const registros = [{ clave: 'gripe', fecha: '2025-10-20' }]

  it('en otoño, si no te la has puesto esta temporada, toca', () => {
    expect(de(queToca({ edad: 68, registros, hoy: '2026-10-18' }), 'gripe')?.estado).toBe('toca')
    expect(de(queToca({ edad: 68, registros, hoy: '2027-01-15' }), 'gripe')?.estado).toBe('toca')
  })

  it('puesta esta temporada: al día hasta el otoño siguiente', () => {
    const lista = queToca({ edad: 68, registros: [{ clave: 'gripe', fecha: '2026-10-05' }], hoy: '2026-10-18' })
    expect(de(lista, 'gripe')).toMatchObject({ estado: 'al-dia', proxima: '2027-10-01' })
    // En enero sigue contando la de octubre.
    expect(de(queToca({ edad: 68, registros: [{ clave: 'gripe', fecha: '2026-10-05' }], hoy: '2027-01-15' }), 'gripe')?.estado).toBe('al-dia')
  })

  it('en primavera y verano, la próxima es en octubre', () => {
    // Puesta la temporada pasada: sigue al día hasta octubre.
    expect(de(queToca({ edad: 68, registros, hoy: '2026-05-10' }), 'gripe')).toMatchObject({ estado: 'al-dia', proxima: '2026-10-01' })
    // Sin ponérsela la temporada pasada: la campaña ya acabó; la próxima, en octubre.
    const antigua = [{ clave: 'gripe', fecha: '2024-10-20' }]
    expect(de(queToca({ edad: 68, registros: antigua, hoy: '2026-05-10' }), 'gripe')).toMatchObject({ estado: 'pronto', proxima: '2026-10-01' })
  })
})

describe('vacunas de una vez y de varias dosis', () => {
  it('neumococo: una vez y ya', () => {
    expect(de(queToca({ edad: 66, registros: [], hoy: HOY }), 'neumococo')?.estado).toBe('toca')
    expect(de(queToca({ edad: 70, registros: [{ clave: 'neumococo', fecha: '2022-11-01' }], hoy: HOY }), 'neumococo')?.estado).toBe(
      'hecha',
    )
  })

  it('herpes zóster: la segunda dosis, 2 meses después de la primera', () => {
    const una = queToca({ edad: 66, registros: [{ clave: 'zoster', fecha: '2026-09-01' }], hoy: HOY })
    expect(de(una, 'zoster')).toMatchObject({ estado: 'pronto', proxima: '2026-11-01', dosisPuestas: 1, dosisTotales: 2 })
    const dos = queToca({
      edad: 66,
      registros: [
        { clave: 'zoster', fecha: '2026-06-01' },
        { clave: 'zoster', fecha: '2026-08-10' },
      ],
      hoy: HOY,
    })
    expect(de(dos, 'zoster')).toMatchObject({ estado: 'hecha', dosisPuestas: 2 })
  })
})

describe('guardar en la base de datos', () => {
  it('revisa lo que falta', () => {
    expect(revisarRegistro({ tipo: 'vacuna', nombre: ' ', fecha: HOY })).toContain('vacuna')
    expect(revisarRegistro({ tipo: 'revision', nombre: 'Mamografía', fecha: '' })).toContain('fecha')
  })

  it('reconoce los nombres de la lista sin importar mayúsculas ni acentos', () => {
    expect(claveDelNombre('mamografia')).toBe('mama')
    expect(claveDelNombre('VACUNA DE LA GRIPE')).toBe('gripe')
    expect(claveDelNombre('Cardiólogo', [{ clave: 'propia-1', nombre: 'cardiologo', cadaMeses: 12 }])).toBe('propia-1')
    expect(claveDelNombre('Algo raro')).toBeUndefined()
  })

  it('guarda, lista, oculta y añade revisiones propias', async () => {
    const p = await crearPerfil({ nombre: 'Pilar', color: '#2e5c8a', sexo: 'mujer', fechaNacimiento: '1960-02-02' })
    await guardarRegistro(p.id, { tipo: 'vacuna', clave: 'gripe', nombre: 'Vacuna de la gripe', fecha: '2025-10-20', lote: ' AB123 ' })
    const id = await guardarRegistro(p.id, { tipo: 'revision', clave: 'mama', nombre: 'Mamografía', fecha: '2026-03-01' })
    const lista = await listarRegistros(p.id)
    expect(lista.map((x) => x.clave)).toEqual(['mama', 'gripe'])
    expect(lista[1].lote).toBe('AB123')

    await borrarRegistro(id)
    expect(await listarRegistros(p.id)).toHaveLength(1)

    await ocultarRecomendacion(p, 'colon', true)
    let perfil = (await db.perfiles.get(p.id))!
    expect(perfil.revisionesOcultas).toEqual(['colon'])
    await ocultarRecomendacion(perfil, 'colon', false)
    perfil = (await db.perfiles.get(p.id))!
    expect(perfil.revisionesOcultas).toEqual([])

    await guardarPropia(perfil, 'Cardiólogo', 12)
    perfil = (await db.perfiles.get(p.id))!
    expect(perfil.revisionesPropias).toMatchObject([{ nombre: 'Cardiólogo', cadaMeses: 12 }])
  })

  it('encuentra la tensión, los análisis y el dentista apuntados en otras secciones', async () => {
    const p = await crearPerfil({ nombre: 'Pilar', color: '#2e5c8a' })
    await guardarMedida(p.id, { tipo: 'tension', fecha: '2026-09-01', valor: 125, valor2: 80 })
    await guardarAnalitica(p.id, {
      fecha: '2025-05-20',
      resultados: [
        { clave: 'colesterol-total', nombre: 'Colesterol', valor: 190 },
        { clave: 'glucosa', nombre: 'Glucosa', valor: 92 },
      ],
    })
    await guardarDental(p.id, { fecha: '2025-03-08', tipo: 'limpieza', dientes: [] })
    expect(await datosEnlazados(p.id)).toEqual({
      tension: '2026-09-01',
      colesterol: '2025-05-20',
      azucar: '2025-05-20',
      dentista: '2025-03-08',
    })
  })
})

describe('la lista de la app', () => {
  it('no repite claves y todas tienen fuente y explicación', () => {
    expect(new Set(RECOMENDACIONES.map((r) => r.clave)).size).toBe(RECOMENDACIONES.length)
    for (const r of RECOMENDACIONES) {
      expect(r.fuente).toBeTruthy()
      expect(r.explicacion.length).toBeGreaterThan(10)
    }
  })

  it('dice los meses como se entiende', () => {
    expect(textoMeses(12)).toBe('año')
    expect(textoMeses(24)).toBe('2 años')
    expect(textoMeses(6)).toBe('6 meses')
  })
})
