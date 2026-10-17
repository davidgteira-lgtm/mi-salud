import { describe, expect, it } from 'vitest'
import { calcularEdad, cuandoFalta, diasEntre, esFechaValida, fechaConDia, fechaLarga, hoyISO } from './fechas'

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

describe('cuandoFalta', () => {
  it('dice cuánto falta con palabras', () => {
    expect(cuandoFalta('2026-10-17', '2026-10-17')).toBe('Hoy')
    expect(cuandoFalta('2026-10-18', '2026-10-17')).toBe('Mañana')
    expect(cuandoFalta('2026-10-19', '2026-10-17')).toBe('Pasado mañana')
    expect(cuandoFalta('2026-11-01', '2026-10-17')).toBe('En 15 días')
    expect(cuandoFalta('2026-10-16', '2026-10-17')).toBe('Ayer')
    expect(cuandoFalta('2026-10-14', '2026-10-17')).toBe('Hace 3 días')
  })

  it('no se lía con el cambio de hora de octubre', () => {
    expect(diasEntre('2026-10-24', '2026-10-26')).toBe(2)
  })
})

describe('fechaConDia', () => {
  it('pone el día de la semana', () => {
    const hoy = new Date(2026, 9, 17)
    expect(fechaConDia('2026-10-19', hoy)).toBe('lunes 19 de octubre')
    expect(fechaConDia('2027-01-01', hoy)).toBe('viernes 1 de enero de 2027')
  })
})

describe('hoyISO', () => {
  it('usa la fecha local con ceros delante', () => {
    expect(hoyISO(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})
