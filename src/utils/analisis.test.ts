import { describe, expect, it } from 'vitest'
import { PRUEBAS } from '../datos/pruebasLaboratorio'
import {
  buscarPrueba,
  estadoResultado,
  factorAUnidadHabitual,
  leerInforme,
  leerRango,
  leerResultado,
  normalizarUnidad,
  redondear,
  referenciaOrientativa,
  resolverAmbiguo,
} from './analisis'

describe('reconocer la prueba por su nombre', () => {
  it('nombres tal como vienen en los informes', () => {
    expect(buscarPrueba('ASAT (GOT)')?.clave).toBe('got')
    expect(buscarPrueba('ALAT (GPT)')?.clave).toBe('gpt')
    expect(buscarPrueba('Gamma-GT')?.clave).toBe('ggt')
    expect(buscarPrueba('HDL Colesterol')?.clave).toBe('hdl')
    expect(buscarPrueba('LDL Colesterol')?.clave).toBe('ldl')
    expect(buscarPrueba('Hemoglobina A1c')?.clave).toBe('hba1c')
    expect(buscarPrueba('Vitamina D 25-Hidroxi')?.clave).toBe('vitamina-d')
    expect(buscarPrueba('Proteína C reactiva hs (alta sensibilidad)')?.clave).toBe('pcr')
    expect(buscarPrueba('CA 19-9')?.clave).toBe('ca19-9')
    expect(buscarPrueba('Albúmina suero')?.clave).toBe('albumina')
  })

  it('con siglas entre paréntesis', () => {
    expect(buscarPrueba('Volumen corpuscular medio (VCM)')?.clave).toBe('vcm')
    expect(buscarPrueba('Índice de anisocitosis (RDW)')?.clave).toBe('rdw')
  })

  it('distingue "% Neutrófilos" de "# Neutrófilos"', () => {
    expect(buscarPrueba('% Neutrófilos')?.clave).toBe('neutrofilos-pct')
    expect(buscarPrueba('# Neutrófilos')?.clave).toBe('neutrofilos-abs')
    expect(buscarPrueba('Linfocitos', '%')?.clave).toBe('linfocitos-pct')
    expect(buscarPrueba('Linfocitos', '10e3/µL')?.clave).toBe('linfocitos-abs')
  })

  it('no inventa pruebas', () => {
    expect(buscarPrueba('Página')).toBeUndefined()
    expect(buscarPrueba('')).toBeUndefined()
  })
})

describe('unidades escritas de muchas formas', () => {
  it('son iguales aunque se escriban distinto', () => {
    expect(normalizarUnidad('mg/dl')).toBe(normalizarUnidad('mg/dL'))
    expect(normalizarUnidad('UI/l')).toBe(normalizarUnidad('U/L'))
    expect(normalizarUnidad('mcU/mL')).toBe(normalizarUnidad('µUI/mL'))
    expect(normalizarUnidad('10e3/µL')).toBe(normalizarUnidad('x10³/µL'))
    expect(normalizarUnidad('10^3/uL')).toBe(normalizarUnidad('10e3/µL'))
    expect(normalizarUnidad('ml/min/1.73m^2')).toBe(normalizarUnidad('mL/min/1,73m²'))
  })

  it('convierte a la unidad habitual', () => {
    const glucosa = PRUEBAS.find((p) => p.clave === 'glucosa')!
    expect(factorAUnidadHabitual(glucosa, 'mg/dl')).toBe(1)
    expect(redondear(5.5 * factorAUnidadHabitual(glucosa, 'mmol/L')!)).toBe(99.1)
    const colesterol = PRUEBAS.find((p) => p.clave === 'colesterol-total')!
    expect(redondear(5.17 * factorAUnidadHabitual(colesterol, 'mmol/l')!)).toBe(200)
    const plaquetas = PRUEBAS.find((p) => p.clave === 'plaquetas')!
    expect(250000 * factorAUnidadHabitual(plaquetas, '/µL')!).toBe(250)
    const creatinina = PRUEBAS.find((p) => p.clave === 'creatinina')!
    expect(redondear(88.4 * factorAUnidadHabitual(creatinina, 'µmol/L')!)).toBe(1)
  })

  it('si no conoce la unidad, no convierte (mejor no inventar)', () => {
    const glucosa = PRUEBAS.find((p) => p.clave === 'glucosa')!
    expect(factorAUnidadHabitual(glucosa, 'g/L')).toBeNull()
  })
})

describe('resultados y rangos como en el informe', () => {
  it('resultados con "menor que" y "mayor que"', () => {
    expect(leerResultado('91')).toEqual({ valor: 91 })
    expect(leerResultado('< 1.73')).toEqual({ valor: 1.73, comparador: '<' })
    expect(leerResultado('>90')).toEqual({ valor: 90, comparador: '>' })
    expect(leerResultado('0.86')).toEqual({ valor: 0.86 })
    expect(leerResultado('no realizado')).toBeNull()
  })

  it('rangos de referencia de todas las formas', () => {
    expect(leerRango('(74 - 100)')).toEqual({ min: 74, max: 100 })
    expect(leerRango('(3.81 - 5.81)')).toEqual({ min: 3.81, max: 5.81 })
    expect(leerRango('3,5-5,5')).toEqual({ min: 3.5, max: 5.5 })
    expect(leerRango('(Inf. 37)')).toEqual({ max: 37 })
    expect(leerRango('(Sup. 40)')).toEqual({ min: 40 })
    expect(leerRango('<200')).toEqual({ max: 200 })
    expect(leerRango('> 60')).toEqual({ min: 60 })
    expect(leerRango('(0.0 - 9.7)')).toEqual({ min: 0, max: 9.7 })
    expect(leerRango('normal')).toBeNull()
    expect(leerRango('(10 - 5)')).toBeNull()
  })

  it('números ambiguos: decide con la referencia', () => {
    expect(resolverAmbiguo({ valor: 1.025, alternativa: 1025 }, { min: 1.005, max: 1.03 })).toBe(1.025)
    expect(resolverAmbiguo({ valor: 250, alternativa: 250000 }, { min: 150000, max: 400000 })).toBe(250000)
    expect(resolverAmbiguo({ valor: 1.5, alternativa: 1500 }, undefined)).toBeNull()
    expect(resolverAmbiguo({ valor: 91 }, undefined)).toBe(91)
  })
})

describe('¿dentro de lo normal?', () => {
  it('con mínimo y máximo', () => {
    expect(estadoResultado(91, undefined, { min: 74, max: 100 })).toBe('normal')
    expect(estadoResultado(110, undefined, { min: 74, max: 100 })).toBe('alto')
    expect(estadoResultado(60, undefined, { min: 74, max: 100 })).toBe('bajo')
  })

  it('justo en el límite es normal', () => {
    expect(estadoResultado(100, undefined, { min: 74, max: 100 })).toBe('normal')
    expect(estadoResultado(74, undefined, { min: 74, max: 100 })).toBe('normal')
  })

  it('solo máximo o solo mínimo', () => {
    expect(estadoResultado(139, undefined, { max: 130 })).toBe('alto')
    expect(estadoResultado(28, undefined, { min: 40 })).toBe('bajo')
    expect(estadoResultado(45, undefined, { min: 40 })).toBe('normal')
  })

  it('con "menor que" o "mayor que"', () => {
    expect(estadoResultado(1.73, '<', { max: 5 })).toBe('normal')
    expect(estadoResultado(90, '>', { min: 60 })).toBe('normal')
    expect(estadoResultado(5, '<', { min: 10 })).toBe('bajo')
    expect(estadoResultado(200, '>', { max: 150 })).toBe('alto')
  })

  it('sin referencia no se puede decir', () => {
    expect(estadoResultado(2.5, undefined, undefined)).toBe('sin-referencia')
  })

  it('referencias orientativas según el sexo', () => {
    const hdl = PRUEBAS.find((p) => p.clave === 'hdl')!
    expect(referenciaOrientativa(hdl, 'hombre')).toEqual({ min: 40 })
    expect(referenciaOrientativa(hdl, 'mujer')).toEqual({ min: 50 })
    const hb = PRUEBAS.find((p) => p.clave === 'hemoglobina')!
    expect(referenciaOrientativa(hb)).toEqual({ min: 12, max: 17 })
  })
})

// Informe INVENTADO con el mismo formato que los de laboratorio (sin datos de nadie).
const INFORME = `
Laboratorio de Prueba
Nº Laboratorio: 11112222
Fecha: 05/03/2026
Datos del paciente
Sexo: MUJER Nombre: PERSONA DE PRUEBA
Edad: 01/01/1950 (76 años) Nº Historia: 123456
HEMOGRAMA - SERIE ROJA
Prueba Resultado Unidades Rango de Referencia
Hematíes 4.50 10e6/µL (3.81 - 5.81)
Hemoglobina 13.2 g/dL (12.1 - 18.0)
Conc. Hemoglobina Corpuscular Media
(CHCM)
33.1 g/dL (32.0 - 36.2)
% Neutrófilos 60.0 % (39.3 - 83.1)
# Neutrófilos 3.1 10e3/µL (1.8 - 8.6)
Plaquetas 210 10e3/µL (130 - 400)
Nuevos valores de referencia para plaquetas a partir del 27/08/2024.
BIOQUIMICA BASICA
Glucosa 104 mg/dl (74 - 100)
Creatinina 0.95 mg/dl (0.6 - 1.3) Nuevos valores de referencia desde
Bilirrubina directa mg/dl (Inf. 0.5)
Determinación no realizada de acuerdo a los protocolos de consenso (Bilirrubina Total < 1,5 mg/dL).
Filtrado Glomerular Estimado (CKD-EPI
creatinina 2009)
>90 ml/min/1.73m^2
En caso de raza negra el resultado obtenido debe ser multiplicado por 1.159
ASAT (GOT) 22 UI/l (Inf. 37)
HDL Colesterol 55 mg/dl (Sup. 40)
Indice COL. total / HDL-COL 3.6 (Sup. 5.0) Cifra de riesgo (Prevención primaria)
(Sup. 4.0) Cifra de riesgo (Prevención secundaria)
TSH 2.10 mcU/mL (0.35 - 4.94)
CEA < 1.50 ng/ml (Inf. 5) No fumadores
Vitamina D 25-Hidroxi 24 ng/ml (30 - 96) *
Déficit: <10 ng/mL
Madrid, 06 de marzo de 2026 15:30
Página 1 de 1
`

describe('leer un informe pegado', () => {
  const { filas, fecha } = leerInforme(INFORME)
  const fila = (clave: string) => filas.find((f) => f.prueba?.clave === clave)

  it('saca la fecha del informe', () => {
    expect(fecha).toBe('2026-03-05')
  })

  it('lee cada prueba con su resultado, unidad y referencia', () => {
    expect(fila('glucosa')).toMatchObject({ resultado: { valor: 104 }, unidad: 'mg/dl', referencia: { min: 74, max: 100 } })
    expect(fila('hematies')).toMatchObject({ resultado: { valor: 4.5 }, unidad: '10e6/µL' })
    expect(fila('got')).toMatchObject({ resultado: { valor: 22 }, referencia: { max: 37 } })
    expect(fila('hdl')).toMatchObject({ resultado: { valor: 55 }, referencia: { min: 40 } })
    expect(fila('tsh')).toMatchObject({ resultado: { valor: 2.1 }, unidad: 'mcU/mL' })
    expect(fila('vitamina-d')).toMatchObject({ resultado: { valor: 24 }, referencia: { min: 30, max: 96 } })
  })

  it('lee los "menor que"', () => {
    expect(fila('cea')).toMatchObject({ resultado: { valor: 1.5, comparador: '<' }, referencia: { max: 5 } })
  })

  it('junta los nombres partidos en varias líneas', () => {
    expect(fila('chcm')).toMatchObject({ resultado: { valor: 33.1 }, referencia: { min: 32, max: 36.2 } })
    expect(fila('filtrado')).toMatchObject({ resultado: { valor: 90, comparador: '>' } })
  })

  it('distingue % y # de la fórmula', () => {
    expect(fila('neutrofilos-pct')?.resultado.valor).toBe(60)
    expect(fila('neutrofilos-abs')?.resultado.valor).toBe(3.1)
  })

  it('índices sin unidad', () => {
    // "(Sup. 5.0) Cifra de riesgo": hay riesgo POR ENCIMA de 5, así que 5 es el máximo.
    expect(fila('indice-col-hdl')).toMatchObject({ resultado: { valor: 3.6 }, unidad: '', referencia: { max: 5 } })
  })

  it('no se cuelan fechas, páginas, notas ni datos personales', () => {
    const nombres = filas.map((f) => f.nombre.toLowerCase())
    for (const raro of ['página', 'madrid', 'déficit', 'en caso', 'nuevos valores', 'determinación', 'edad', 'nº']) {
      expect(nombres.some((n) => n.startsWith(raro))).toBe(false)
    }
    expect(filas.some((f) => f.resultado.valor === 11112222 || f.resultado.valor === 123456)).toBe(false)
  })

  it('cuántas ha leído', () => {
    expect(filas).toHaveLength(15)
  })
})

describe('la lista de pruebas está bien hecha', () => {
  it('claves únicas', () => {
    const claves = PRUEBAS.map((p) => p.clave)
    expect(claves.filter((c, i) => claves.indexOf(c) !== i)).toEqual([])
  })

  it('los rangos tienen mínimo menor que máximo', () => {
    for (const p of PRUEBAS) {
      for (const r of [p.ref, p.refHombre, p.refMujer]) {
        if (r?.min !== undefined && r.max !== undefined) expect(r.min, p.clave).toBeLessThan(r.max)
      }
    }
  })

  it('cada prueba se encuentra por su propio nombre', () => {
    for (const p of PRUEBAS) {
      const encontrada = buscarPrueba(p.nombre, p.unidad)
      expect(encontrada?.clave, p.nombre).toBe(p.clave)
    }
  })
})

describe('"Sup." en los índices de riesgo', () => {
  it('un índice de riesgo por encima del límite sale alto', () => {
    const { filas } = leerInforme('Indice COL. total / HDL-COL 6.2 (Sup. 5.0) Cifra de riesgo (Prevención primaria)')
    expect(filas[0].referencia).toEqual({ max: 5 })
    expect(estadoResultado(filas[0].resultado.valor, undefined, filas[0].referencia ?? undefined)).toBe('alto')
  })

  it('en el HDL, "Sup. 40" sigue siendo el mínimo', () => {
    const { filas } = leerInforme('HDL Colesterol 35 mg/dl (Sup. 40) *')
    expect(filas[0].referencia).toEqual({ min: 40 })
    expect(estadoResultado(35, undefined, filas[0].referencia ?? undefined)).toBe('bajo')
  })
})
