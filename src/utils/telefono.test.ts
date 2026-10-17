import { describe, expect, it } from 'vitest'
import { enlaceLlamada, esTelefonoValido, limpiarTelefono, telefonoParaLeer } from './telefono'

describe('limpiarTelefono', () => {
  it('quita espacios, puntos, guiones y paréntesis', () => {
    expect(limpiarTelefono('91 234 56 78')).toBe('912345678')
    expect(limpiarTelefono('912.345.678')).toBe('912345678')
    expect(limpiarTelefono('(91) 234-56-78')).toBe('912345678')
  })

  it('respeta el + del prefijo', () => {
    expect(limpiarTelefono('+34 612 34 56 78')).toBe('+34612345678')
  })

  it('convierte el 00 del principio en +', () => {
    expect(limpiarTelefono('0034 612 345 678')).toBe('+34612345678')
  })

  it('no toca números cortos que empiezan por 0', () => {
    expect(limpiarTelefono('016')).toBe('016')
  })
})

describe('esTelefonoValido', () => {
  it('acepta números normales y cortos de emergencia', () => {
    expect(esTelefonoValido('912 345 678')).toBe(true)
    expect(esTelefonoValido('+34 612 345 678')).toBe(true)
    expect(esTelefonoValido('112')).toBe(true)
  })

  it('rechaza números vacíos, demasiado cortos o largos', () => {
    expect(esTelefonoValido('')).toBe(false)
    expect(esTelefonoValido('12')).toBe(false)
    expect(esTelefonoValido('hola')).toBe(false)
    expect(esTelefonoValido('1234567890123456')).toBe(false)
  })
})

describe('telefonoParaLeer', () => {
  it('agrupa los números españoles de 3 en 3', () => {
    expect(telefonoParaLeer('912345678')).toBe('912 345 678')
    expect(telefonoParaLeer('91 234 56 78')).toBe('912 345 678')
    expect(telefonoParaLeer('0034612345678')).toBe('+34 612 345 678')
  })

  it('deja los demás tal cual, solo limpios', () => {
    expect(telefonoParaLeer('112')).toBe('112')
    expect(telefonoParaLeer('+33 1 23 45 67 89')).toBe('+33123456789')
  })
})

describe('enlaceLlamada', () => {
  it('crea el enlace que abre la llamada', () => {
    expect(enlaceLlamada('91 234 56 78')).toBe('tel:912345678')
    expect(enlaceLlamada('+34 612 34 56 78')).toBe('tel:+34612345678')
  })
})
