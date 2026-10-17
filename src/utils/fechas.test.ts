import { describe, expect, it } from 'vitest'
import { calcularEdad, esFechaValida, fechaLarga, hoyISO } from './fechas'

describe('esFechaValida', () => {
  it('acepta fechas reales', () => {
    expect(esFechaValida('1958-03-21')).toBe(true)
    expect(esFechaValida('2024-02-29')).toBe(true) // año bisiesto
  })

  it('rechaza fechas que no existen o mal escritas', () => {
    expect(esFechaValida('2023-02-29')).toBe(false) // 2023 no es bisiesto
    expect(esFechaValida('2024-13-01')).toBe(false)
    expect(esFechaValida('21/03/1958')).toBe(false)
    expect(esFechaValida('')).toBe(false)
  })
})

describe('calcularEdad', () => {
  const hoy = new Date(2026, 9, 17) // 17 de octubre de 2026

  it('cuenta los años cumplidos', () => {
    expect(calcularEdad('1958-03-21', hoy)).toBe(68)
  })

  it('no suma el año si aún no ha llegado el cumpleaños', () => {
    expect(calcularEdad('1958-10-18', hoy)).toBe(67)
    expect(calcularEdad('1958-12-01', hoy)).toBe(67)
  })

  it('suma el año justo el día del cumpleaños', () => {
    expect(calcularEdad('1958-10-17', hoy)).toBe(68)
  })

  it('da error con una fecha no válida', () => {
    expect(() => calcularEdad('1958-02-30', hoy)).toThrow()
  })
})

describe('fechaLarga', () => {
  it('escribe la fecha en español', () => {
    expect(fechaLarga('1958-03-21')).toBe('21 de marzo de 1958')
    expect(fechaLarga('2026-12-05')).toBe('5 de diciembre de 2026')
  })
})

describe('hoyISO', () => {
  it('usa la fecha local con ceros delante', () => {
    expect(hoyISO(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})
