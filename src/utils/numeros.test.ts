import { describe, expect, it } from 'vitest'
import { formatearNumero, leerNumero, leerNumeroEntre, leerTension } from './numeros'

const valor = (t: string) => {
  const l = leerNumero(t)
  return l.ok ? l.valor : null
}

describe('leerNumero: decimales', () => {
  it('la coma es decimal', () => {
    expect(valor('36,7')).toBe(36.7)
    expect(valor('5,4')).toBe(5.4)
    expect(valor('0,8')).toBe(0.8)
  })

  it('el punto también es decimal, como en los informes de laboratorio', () => {
    expect(valor('5.20')).toBe(5.2)
    expect(valor('0.86')).toBe(0.86)
    expect(valor('39.19')).toBe(39.19)
    expect(valor('9.00')).toBe(9)
  })

  it('números que empiezan por 0 nunca son de miles', () => {
    expect(leerNumero('0.835')).toEqual({ ok: true, valor: 0.835 })
  })

  it('números enteros', () => {
    expect(valor('120')).toBe(120)
    expect(valor('7')).toBe(7)
  })
})

describe('leerNumero: miles y números ambiguos', () => {
  it('varios grupos de miles no tienen duda', () => {
    expect(leerNumero('1.234.567')).toEqual({ ok: true, valor: 1234567 })
  })

  it('espacios de miles', () => {
    expect(valor('250 000')).toBe(250000)
  })

  it('punto de miles y coma decimal juntos', () => {
    expect(leerNumero('1.234,5')).toEqual({ ok: true, valor: 1234.5 })
  })

  it('"1.025" o "250.000" dan las dos lecturas posibles', () => {
    expect(leerNumero('1.025')).toEqual({ ok: true, valor: 1.025, alternativa: 1025 })
    expect(leerNumero('250.000')).toEqual({ ok: true, valor: 250, alternativa: 250000 })
  })

  it('rechaza mezclas que no se usan en España', () => {
    expect(valor('1,234.5')).toBeNull()
    expect(valor('1.23,4')).toBeNull()
    expect(valor('1,2,3')).toBeNull()
    expect(valor('1.2.3')).toBeNull()
  })
})

describe('leerNumero: con unidades y textos raros', () => {
  it('ignora la unidad pegada', () => {
    expect(valor('75,5 kg')).toBe(75.5)
    expect(valor('98%')).toBe(98)
    expect(valor('36,7°')).toBe(36.7)
    expect(valor(' 110 mg/dL ')).toBe(110)
  })

  it('no acepta texto sin número', () => {
    expect(valor('')).toBeNull()
    expect(valor('normal')).toBeNull()
    expect(valor(',')).toBeNull()
    expect(valor('.')).toBeNull()
  })

  it('el error se explica con palabras sencillas', () => {
    const l = leerNumero('mucho')
    expect(l.ok).toBe(false)
    if (!l.ok) expect(l.error).toContain('No entiendo el número')
  })
})

describe('leerNumeroEntre (caza erratas y resuelve dudas)', () => {
  it('acepta valores razonables', () => {
    expect(leerNumeroEntre('36,7', 32, 43, 'una temperatura')).toEqual({ ok: true, valor: 36.7 })
  })

  it('rechaza valores imposibles con un aviso claro', () => {
    const l = leerNumeroEntre('367', 32, 43, 'una temperatura')
    expect(l).toEqual({ ok: false, error: '367 no parece una temperatura posible. Revisa que esté bien escrito.' })
  })

  it('si el número es ambiguo, elige la lectura que tiene sentido', () => {
    // Densidad de la orina: 1,025 (no mil veinticinco).
    expect(leerNumeroEntre('1.025', 1, 1.05, 'una densidad')).toEqual({ ok: true, valor: 1.025 })
    // Plaquetas por microlitro: doscientas cincuenta mil (no 250).
    expect(leerNumeroEntre('250.000', 10000, 2000000, 'un número de plaquetas')).toEqual({ ok: true, valor: 250000 })
    // Peso: 75,5 kg aunque se escriba con punto.
    expect(leerNumeroEntre('75.500', 2, 350, 'un peso')).toEqual({ ok: true, valor: 75.5 })
  })

  it('si las dos lecturas tienen sentido, pregunta', () => {
    const l = leerNumeroEntre('1.500', 0, 100000, 'un valor')
    expect(l.ok).toBe(false)
    if (!l.ok && 'opciones' in l) {
      expect(l.opciones).toEqual([1.5, 1500])
      expect(l.error).toBe('¿Quieres decir 1,5 o 1500?')
    } else {
      throw new Error('Debería preguntar')
    }
  })
})

describe('leerTension', () => {
  it('entiende 120/80 y variantes', () => {
    expect(leerTension('120/80')).toEqual({ ok: true, alta: 120, baja: 80 })
    expect(leerTension(' 135 / 85 ')).toEqual({ ok: true, alta: 135, baja: 85 })
    expect(leerTension('140-90')).toEqual({ ok: true, alta: 140, baja: 90 })
  })

  it('rechaza lo que no es una tensión', () => {
    expect(leerTension('120').ok).toBe(false)
    expect(leerTension('12/8,5').ok).toBe(false)
  })
})

describe('formatearNumero', () => {
  it('escribe como en España', () => {
    expect(formatearNumero(36.7)).toBe('36,7')
    expect(formatearNumero(250000)).toBe('250.000')
    expect(formatearNumero(5.4)).toBe('5,4')
    expect(formatearNumero(1 / 3)).toBe('0,33')
    expect(formatearNumero(1500)).toBe('1500')
    expect(formatearNumero(12500)).toBe('12.500')
    expect(formatearNumero(-3.5)).toBe('-3,5')
    expect(formatearNumero(1.025, 3)).toBe('1,025')
  })
})
