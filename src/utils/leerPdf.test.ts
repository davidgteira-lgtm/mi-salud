import { describe, expect, it } from 'vitest'
import { leerInforme } from './analisis'
import { lineasDeTrozos, type TrozoPdf } from './leerPdf'

/** Un trozo de texto en (x, y), con letra de 10. */
const t = (str: string, x: number, y: number, width = str.length * 5): TrozoPdf => ({ str, transform: [10, 0, 0, 10, x, y], width })

describe('recomponer las líneas de un PDF', () => {
  it('junta lo que está a la misma altura y respeta el orden de arriba abajo', () => {
    const lineas = lineasDeTrozos([
      // Desordenados a propósito, como pueden venir del PDF.
      t('mg/dl', 300, 680),
      t('Glucosa', 50, 680),
      t('Fecha: 05/03/2026', 50, 750),
      t('104', 200, 680.6),
      t('(74 - 100)', 380, 680),
      t('Creatinina', 50, 660),
      t('0.85', 200, 660),
      t('mg/dl', 300, 660),
      t('(0.5 - 1.1)', 380, 660),
      t('', 50, 640),
    ])
    expect(lineas).toEqual(['Fecha: 05/03/2026', 'Glucosa 104 mg/dl (74 - 100)', 'Creatinina 0.85 mg/dl (0.5 - 1.1)'])
  })

  it('no mete espacios dentro de una palabra partida en trozos pegados', () => {
    expect(lineasDeTrozos([t('Hemo', 50, 600, 20), t('globina', 70, 600, 35), t('13,5', 200, 600)])).toEqual(['Hemoglobina 13,5'])
  })

  it('el resultado se entiende igual que si se hubiera pegado el texto', () => {
    const texto = lineasDeTrozos([
      t('Fecha de extracción: 05/03/2026', 50, 750),
      t('Glucosa', 50, 680),
      t('104', 200, 680),
      t('mg/dl', 300, 680),
      t('(74 - 100)', 380, 680),
      t('HDL Colesterol', 50, 660),
      t('55', 200, 660),
      t('mg/dl', 300, 660),
      t('(Sup. 40)', 380, 660),
    ]).join('\n')
    const { filas, fecha } = leerInforme(texto)
    expect(fecha).toBe('2026-03-05')
    expect(filas.map((f) => [f.nombre, f.resultado.valor, f.referencia])).toEqual([
      ['Glucosa', 104, { min: 74, max: 100 }],
      ['HDL Colesterol', 55, { min: 40 }],
    ])
  })
})

describe('la fecha del informe', () => {
  it('prefiere la de la extracción y nunca coge la de nacimiento', () => {
    const texto = 'Fecha de nacimiento: 21/03/1958\nFecha de emisión: 10/03/2026\nFecha de extracción: 05/03/2026\nGlucosa 104 mg/dl (74 - 100)'
    expect(leerInforme(texto).fecha).toBe('2026-03-05')
    expect(leerInforme('Fecha nac.: 21/03/1958\nFecha: 05/03/2026').fecha).toBe('2026-03-05')
    expect(leerInforme('Fecha de nacimiento: 21/03/1958').fecha).toBeUndefined()
  })
})
