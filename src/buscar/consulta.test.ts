import { describe, expect, it } from 'vitest'
import { buscarEn, distancia, entender, singular, type Documento } from './consulta'

const HOY = '2026-10-18'

const doc = (id: string, titulo: string, extra: Partial<Documento> = {}): Documento => ({
  seccion: 'historial',
  id,
  icono: '📄',
  titulo,
  textos: [],
  ...extra,
})

const DOCS: Documento[] = [
  doc('sintrom', 'Sintrom 4 mg', {
    seccion: 'medicacion',
    detalle: 'Anticoagulante',
    textos: ['Medicación', 'Para que la sangre no coagule'],
  }),
  doc('hta', 'Hipertensión arterial', { fecha: '2018-05-01', detalle: 'Diagnóstico · Crónica' }),
  doc('cardio', 'Cardiología', { seccion: 'citas', fecha: '2025-03-12', detalle: 'Dra. Álvarez' }),
  doc('gluc', 'Análisis del 10 de septiembre de 2026', {
    seccion: 'analisis',
    fecha: '2026-09-10',
    textos: ['Glucosa 104 mg/dL', 'Colesterol total 190 mg/dL'],
  }),
  doc('rodilla', 'Radiografía de rodilla', { fecha: '2025-11-02', textos: ['Artrosis leve en la rodilla derecha'] }),
  doc('gripe', 'Vacuna de la gripe', { seccion: 'revisiones', fecha: '2025-10-22' }),
  doc('voz', 'Nota de voz', { seccion: 'citas', fecha: '2026-10-01', textos: ['Me han dicho que vuelva en tres meses para la tensión'] }),
]

const ids = (texto: string) => buscarEn(DOCS, entender(texto, HOY)).map((r) => r.doc.id)

describe('entender lo que se escribe', () => {
  it('quita palabras vacías y saca el singular', () => {
    expect(entender('¿Cuándo me pusieron las vacunas?', HOY).terminos.map((t) => t.original)).toEqual(['pusieron', 'vacunas'])
    expect(singular('pastillas')).toBe('pastilla')
    expect(singular('análisis'.normalize('NFD').replace(/[̀-ͯ]/g, ''))).toBe('analisis')
    expect(singular('dolores')).toBe('dolor')
  })

  it('entiende fechas', () => {
    expect(entender('2025', HOY).rango).toMatchObject({ desde: '2025-01-01', hasta: '2025-12-31' })
    expect(entender('análisis de marzo de 2025', HOY).rango).toMatchObject({ desde: '2025-03-01', hasta: '2025-03-31' })
    expect(entender('el año pasado', HOY).rango).toMatchObject({ desde: '2025-01-01', hasta: '2025-12-31', texto: 'en 2025' })
    expect(entender('este mes', HOY).rango).toMatchObject({ desde: '2026-10-01', hasta: '2026-10-31' })
    expect(entender('el mes pasado', '2026-01-15').rango).toMatchObject({ desde: '2025-12-01', hasta: '2025-12-31' })
    // Un mes sin año: el último que ha pasado.
    expect(entender('febrero', HOY).rango).toMatchObject({ desde: '2026-02-01', hasta: '2026-02-28' })
    expect(entender('noviembre', HOY).rango).toMatchObject({ desde: '2025-11-01', hasta: '2025-11-30' })
  })

  it('cuenta las erratas', () => {
    expect(distancia('sintron', 'sintrom', 2)).toBe(1)
    expect(distancia('cardiologia', 'cardiolojia', 2)).toBe(1)
    expect(distancia('gripe', 'grupo', 1)).toBe(2)
  })
})

describe('buscar', () => {
  it('da igual las tildes y las mayúsculas', () => {
    // Primero lo que lo dice tal cual; después, lo que habla de la tensión (es sinónimo).
    expect(ids('HIPERTENSION')).toEqual(['hta', 'voz'])
    expect(ids('radiografia')).toEqual(['rodilla'])
  })

  it('perdona las faltas', () => {
    expect(ids('sintron')).toEqual(['sintrom'])
    expect(ids('cardiolojia')).toEqual(['cardio'])
  })

  it('entiende sinónimos', () => {
    // «tensión» encuentra la hipertensión y la nota de voz que habla de la tensión.
    expect(ids('tensión')).toEqual(expect.arrayContaining(['hta', 'voz']))
    expect(ids('azúcar')).toEqual(['gluc'])
    expect(ids('corazón')).toEqual(['cardio'])
    expect(ids('pastillas para la sangre')).toEqual(['sintrom'])
  })

  it('busca dentro de los resultados, las notas y lo que dijo la IA', () => {
    expect(ids('colesterol')).toEqual(['gluc'])
    expect(ids('artrosis')).toEqual(['rodilla'])
  })

  it('tienen que aparecer todas las palabras', () => {
    expect(ids('radiografía rodilla')).toEqual(['rodilla'])
    expect(ids('radiografía hombro')).toEqual([])
  })

  it('filtra por fecha, sola o con palabras', () => {
    expect(ids('2025').sort()).toEqual(['cardio', 'gripe', 'rodilla'])
    expect(ids('vacuna 2025')).toEqual(['gripe'])
    expect(ids('vacuna 2024')).toEqual([])
    expect(ids('análisis septiembre 2026')).toEqual(['gluc'])
  })

  it('lo encontrado en el título va antes', () => {
    const lista = buscarEn([doc('a', 'Revisión', { textos: ['habló de la tensión'] }), doc('b', 'Tensión alta')], entender('tensión', HOY))
    expect(lista.map((r) => r.doc.id)).toEqual(['b', 'a'])
    expect(lista[1].fragmento).toBe('habló de la tensión')
  })

  it('sin nada que buscar no devuelve nada', () => {
    expect(ids('')).toEqual([])
    expect(ids('de la')).toEqual([])
  })
})
