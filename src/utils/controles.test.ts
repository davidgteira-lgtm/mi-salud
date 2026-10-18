import { describe, expect, it } from 'vitest'
import { controlesEnCasa } from './controles'

const HOY = '2026-10-18'

describe('controles en casa', () => {
  it('pide el azúcar si tiene diabetes y la tensión si tiene hipertensión', () => {
    const c = controlesEnCasa({ enfermedades: [{ titulo: 'Diabetes tipo 2' }, { titulo: 'Hipertensión arterial' }], medicamentos: [], medidas: [], hoy: HOY })
    expect(c.map((x) => x.tipo)).toEqual(['glucosa', 'tension'])
    expect(c.every((x) => !x.deHoy)).toBe(true)
  })

  it('también si toma medicación para ello, aunque no esté en el historial', () => {
    const c = controlesEnCasa({ enfermedades: [], medicamentos: [{ nombre: 'Metformina 850 mg' }, { nombre: 'Enalapril 20 mg' }], medidas: [], hoy: HOY })
    expect(c.map((x) => x.tipo)).toEqual(['glucosa', 'tension'])
  })

  it('sin nada de eso no pide nada', () => {
    expect(controlesEnCasa({ enfermedades: [{ titulo: 'Migraña' }], medicamentos: [{ nombre: 'Paracetamol' }], medidas: [], hoy: HOY })).toEqual([])
  })

  it('cuando ya está apuntado hoy, lo dice (la última del día)', () => {
    const c = controlesEnCasa({
      enfermedades: [{ titulo: 'Diabetes tipo 2' }],
      medicamentos: [],
      medidas: [
        { id: 'a', tipo: 'glucosa', fecha: '2026-10-17', hora: '08:00', valor: 120 },
        { id: 'b', tipo: 'glucosa', fecha: HOY, hora: '08:10', valor: 110 },
        { id: 'c', tipo: 'glucosa', fecha: HOY, hora: '15:00', valor: 150 },
      ],
      hoy: HOY,
    })
    expect(c[0].deHoy?.valor).toBe(150)
  })
})
