import { describe, expect, it } from 'vitest'
import { prepararParaLeer, trocear } from './lecturaVoz'

describe('preparar el texto para leerlo en voz alta', () => {
  it('quita los iconos', () => {
    expect(prepararParaLeer('💊 Medicación')).toBe('Medicación')
    expect(prepararParaLeer('✓ Normal')).toBe('Normal')
    expect(prepararParaLeer('▲ Alta')).toBe('Alta')
    expect(prepararParaLeer('⚠️ ¡Cuidado!')).toBe('¡Cuidado!')
  })

  it('el punto medio se lee como una pausa', () => {
    expect(prepararParaLeer('Alta 136 · Baja 85 · Pulso 77')).toBe('Alta 136, Baja 85, Pulso 77')
  })

  it('dice las unidades con palabras', () => {
    expect(prepararParaLeer('104 mg/dL')).toBe('104 miligramos por decilitro')
    expect(prepararParaLeer('104 mg/dl')).toBe('104 miligramos por decilitro')
    expect(prepararParaLeer('72 lpm')).toBe('72 latidos por minuto')
    expect(prepararParaLeer('72,4 kg')).toBe('72,4 kilos')
    expect(prepararParaLeer('36,6 °C')).toBe('36,6 grados')
    expect(prepararParaLeer('95 %')).toBe('95 por ciento')
    expect(prepararParaLeer('5,2 10e3/µL')).toBe('5,2 miles por microlitro')
  })

  it('no rompe palabras normales', () => {
    expect(prepararParaLeer('Tengo kilos de papeles')).toBe('Tengo kilos de papeles')
    expect(prepararParaLeer('Médico de cabecera')).toBe('Médico de cabecera')
  })

  it('limpia espacios y líneas vacías', () => {
    expect(prepararParaLeer('  Hola  \n\n\n  Carmen  ')).toBe('Hola\nCarmen')
  })
})

describe('trocear para leer sin cortes', () => {
  it('un trozo por línea', () => {
    expect(trocear('Hola, Carmen\nTensión\nAlta 129 · Baja 81')).toEqual(['Hola, Carmen', 'Tensión', 'Alta 129, Baja 81'])
  })

  it('parte las líneas muy largas por frases', () => {
    const largo = 'Primera frase bastante larga. '.repeat(10).trim()
    const trozos = trocear(largo, 70)
    expect(trozos.length).toBeGreaterThan(1)
    for (const t of trozos) expect(t.length).toBeLessThanOrEqual(70)
  })
})
