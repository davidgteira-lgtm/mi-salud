import { describe, expect, it } from 'vitest'
import { coincide } from './texto'

describe('buscador sencillo', () => {
  it('encuentra palabras aunque cambien tildes y mayúsculas', () => {
    expect(coincide('espalda', 'Dolor de ESPALDA')).toBe(true)
    expect(coincide('cardiologia', 'Cardiología')).toBe(true)
  })

  it('vale con el principio de la palabra', () => {
    expect(coincide('dolor espal', 'Dolor de espalda')).toBe(true)
  })

  it('tienen que estar todas las palabras, en cualquiera de los textos', () => {
    expect(coincide('espalda rodilla', 'Dolor de espalda')).toBe(false)
    expect(coincide('espalda lumbalgia', 'Dolor de espalda', undefined, 'Lumbalgia')).toBe(true)
  })

  it('una búsqueda vacía lo encuentra todo', () => {
    expect(coincide('  ', 'lo que sea')).toBe(true)
  })
})
