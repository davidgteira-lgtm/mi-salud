import { describe, expect, it } from 'vitest'
import type { Medida } from '../db/tipos'
import { tensionEnCentimetros, valorar } from './constantes'

const nivel = (m: Pick<Medida, 'tipo' | 'valor' | 'valor2' | 'momento'>) => valorar(m)?.texto

describe('tensión (ESH 2023): manda la peor de las dos', () => {
  it('óptima, normal y normal-alta', () => {
    expect(nivel({ tipo: 'tension', valor: 115, valor2: 75 })).toBe('Óptima')
    expect(nivel({ tipo: 'tension', valor: 125, valor2: 78 })).toBe('Normal')
    expect(nivel({ tipo: 'tension', valor: 118, valor2: 82 })).toBe('Normal')
    expect(nivel({ tipo: 'tension', valor: 135, valor2: 80 })).toBe('Normal-alta')
  })

  it('alta con que una de las dos lo sea', () => {
    expect(nivel({ tipo: 'tension', valor: 140, valor2: 80 })).toBe('Alta')
    expect(nivel({ tipo: 'tension', valor: 125, valor2: 90 })).toBe('Alta')
  })

  it('muy alta: pide consultar', () => {
    const v = valorar({ tipo: 'tension', valor: 182, valor2: 95 })
    expect(v).toMatchObject({ nivel: 'urgente', texto: 'Muy alta' })
    expect(v?.consejo).toContain('112')
    expect(nivel({ tipo: 'tension', valor: 150, valor2: 112 })).toBe('Muy alta')
  })

  it('baja', () => {
    expect(nivel({ tipo: 'tension', valor: 85, valor2: 55 })).toBe('Baja')
  })

  it('justo en los límites', () => {
    expect(nivel({ tipo: 'tension', valor: 119, valor2: 79 })).toBe('Óptima')
    expect(nivel({ tipo: 'tension', valor: 120, valor2: 79 })).toBe('Normal')
    expect(nivel({ tipo: 'tension', valor: 129, valor2: 84 })).toBe('Normal')
    expect(nivel({ tipo: 'tension', valor: 139, valor2: 89 })).toBe('Normal-alta')
    expect(nivel({ tipo: 'tension', valor: 179, valor2: 109 })).toBe('Alta')
  })
})

describe('azúcar: depende de si es en ayunas', () => {
  it('en ayunas', () => {
    expect(nivel({ tipo: 'glucosa', valor: 91, momento: 'ayunas' })).toBe('Normal')
    expect(nivel({ tipo: 'glucosa', valor: 110, momento: 'ayunas' })).toBe('Algo alta')
    expect(nivel({ tipo: 'glucosa', valor: 126, momento: 'ayunas' })).toBe('Alta')
  })

  it('después de comer, 130 es normal', () => {
    expect(nivel({ tipo: 'glucosa', valor: 130, momento: 'despues-comer' })).toBe('Normal')
    expect(nivel({ tipo: 'glucosa', valor: 160, momento: 'despues-comer' })).toBe('Algo alta')
    expect(nivel({ tipo: 'glucosa', valor: 210, momento: 'despues-comer' })).toBe('Alta')
  })

  it('bajadas de azúcar, en cualquier momento', () => {
    expect(nivel({ tipo: 'glucosa', valor: 65, momento: 'ayunas' })).toBe('Baja')
    expect(valorar({ tipo: 'glucosa', valor: 50, momento: 'despues-comer' })?.nivel).toBe('urgente')
  })
})

describe('resto de constantes', () => {
  it('temperatura', () => {
    expect(nivel({ tipo: 'temperatura', valor: 36.7 })).toBe('Normal')
    expect(nivel({ tipo: 'temperatura', valor: 37.5 })).toBe('Febrícula')
    expect(nivel({ tipo: 'temperatura', valor: 38.2 })).toBe('Fiebre')
    expect(nivel({ tipo: 'temperatura', valor: 39.6 })).toBe('Fiebre alta')
  })

  it('oxígeno', () => {
    expect(nivel({ tipo: 'saturacion', valor: 97 })).toBe('Normal')
    expect(nivel({ tipo: 'saturacion', valor: 93 })).toBe('Algo baja')
    expect(valorar({ tipo: 'saturacion', valor: 89 })?.nivel).toBe('urgente')
  })

  it('pulso', () => {
    expect(nivel({ tipo: 'pulso', valor: 72 })).toBe('Normal')
    expect(nivel({ tipo: 'pulso', valor: 45 })).toBe('Bajo')
    expect(nivel({ tipo: 'pulso', valor: 110 })).toBe('Alto')
  })

  it('el peso no se valora', () => {
    expect(valorar({ tipo: 'peso', valor: 75 })).toBeNull()
  })
})

describe('tensión dicha en centímetros ("13 de alta y 8 de baja")', () => {
  it('propone la medida del aparato', () => {
    expect(tensionEnCentimetros(13, 'alta')).toBe(130)
    expect(tensionEnCentimetros(8, 'baja')).toBe(80)
    expect(tensionEnCentimetros(14.5, 'alta')).toBe(145)
  })

  it('no propone nada si no encaja', () => {
    expect(tensionEnCentimetros(130, 'alta')).toBeNull()
    expect(tensionEnCentimetros(3, 'alta')).toBeNull()
    expect(tensionEnCentimetros(20, 'baja')).toBeNull()
  })
})
