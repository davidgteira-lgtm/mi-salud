import { describe, expect, it } from 'vitest'
import type { Medicamento } from '../db/tipos'
import { agruparPorTipo, buscarEnHistorial, duracionToma, familiaGeneral, mismoTipo, vecesTomado } from './historialMedicacion'

let n = 0
const med = (nombre: string, extra: Partial<Medicamento> = {}): Medicamento => ({
  id: `m${++n}`,
  perfilId: 'p',
  creadoEn: 0,
  actualizadoEn: 0,
  nombre,
  momentos: [],
  activo: 0,
  ...extra,
})

describe('duracionToma', () => {
  it('distingue un tratamiento puntual de uno largo', () => {
    expect(duracionToma({ fechaInicio: '2026-01-01', fechaFin: '2026-01-07', activo: 0 })).toEqual({ texto: 'Puntual: 7 días', puntual: true })
    expect(duracionToma({ fechaInicio: '2026-01-01', fechaFin: '2026-01-01', activo: 0 })?.texto).toBe('Puntual: 1 día')
    expect(duracionToma({ fechaInicio: '2025-01-01', fechaFin: '2025-04-30', activo: 0 })?.texto).toBe('Durante 4 meses')
    expect(duracionToma({ fechaInicio: '2020-01-01', fechaFin: '2023-01-01', activo: 0 })?.texto).toBe('Durante 3 años')
    expect(duracionToma({ fechaInicio: '2024-10-18', activo: 1 }, '2026-10-18')?.texto).toBe('Desde hace 2 años')
    expect(duracionToma({ activo: 0 })).toBeUndefined()
  })
})

describe('ya lo tomaste', () => {
  const historial = [
    med('Amoxicilina 500 mg', { valoracion: 'mal' }),
    med('Fosfomicina 3 g', { valoracion: 'bien' }),
    med('Fosfomicina 3 g', { valoracion: 'bien' }),
    med('Azitromicina 500 mg', { valoracion: 'bien' }),
    med('Claritromicina 500 mg'),
    med('Claritromicina 250 mg'),
    med('Sintrom 4 mg'),
  ]

  it('cuenta las veces aunque cambie la dosis o la marca', () => {
    expect(vecesTomado('fosfomicina', historial)).toHaveLength(2)
    expect(vecesTomado('Claritromicina 500 mg', historial)).toHaveLength(2)
    expect(vecesTomado('Acenocumarol', historial)).toHaveLength(1)
    expect(vecesTomado('Paracetamol', historial)).toHaveLength(0)
  })

  it('busca otros de la misma familia, uno de cada', () => {
    const otros = mismoTipo('Eritromicina 500 mg', historial).map((m) => m.nombre)
    expect(otros).toEqual(['Amoxicilina 500 mg', 'Fosfomicina 3 g', 'Azitromicina 500 mg', 'Claritromicina 500 mg'])
    expect(mismoTipo('Paracetamol', historial)).toEqual([])
  })

  it('junta los antibióticos (y los analgésicos) en una misma familia', () => {
    expect(familiaGeneral('Antibiótico (macrólido)')).toBe('Antibiótico')
    expect(familiaGeneral('Analgésico opioide')).toBe('Analgésico')
    expect(familiaGeneral('Analgésico y antitérmico')).toBe('Analgésico')
    const grupos = agruparPorTipo(historial)
    expect(grupos[0]).toEqual(['Antibiótico', expect.any(Array)])
    expect(grupos[0][1]).toHaveLength(6)
    expect(grupos.flatMap(([, l]) => l)).toHaveLength(historial.length)
  })

  it('busca por nombre, tipo o lo que se notó', () => {
    const lista = [med('Tramadol 50 mg', { efectos: 'Mareos y vómitos' }), med('Bilastina 20 mg', { paraQue: 'Picor' })]
    expect(buscarEnHistorial(lista, 'mareos').map((m) => m.nombre)).toEqual(['Tramadol 50 mg'])
    expect(buscarEnHistorial(lista, 'picor').map((m) => m.nombre)).toEqual(['Bilastina 20 mg'])
    expect(buscarEnHistorial(lista, '')).toHaveLength(2)
  })
})
