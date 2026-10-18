import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/db'
import { borrarMedicamento, guardarMedicamento, revisarMedicamento } from '../db/medicamentos'
import { crearPerfil } from '../db/perfiles'
import { buscarToma, desmarcarTomada, listarTomas, marcarTomada } from '../db/tomas'
import { cuandoEs, horasDe, siguienteToma, tomaActual } from './tomas'

const a = (texto: string) => new Date(texto) // hora local

describe('horas de la medicación', () => {
  it('usa las horas apuntadas, o las de los momentos si es un medicamento antiguo', () => {
    expect(horasDe({ horas: ['21:00', '08:00', '08:00'], momentos: [] })).toEqual(['08:00', '21:00'])
    expect(horasDe({ momentos: ['cena', 'desayuno'] })).toEqual(['08:00', '21:00'])
    expect(horasDe({ momentos: [] })).toEqual([])
  })

  it('la toma de ahora es la última cuya hora ya ha llegado', () => {
    const horas = ['08:00', '14:00', '21:00']
    expect(tomaActual(horas, a('2026-10-18T10:30'))).toEqual({ fecha: '2026-10-18', hora: '08:00' })
    expect(tomaActual(horas, a('2026-10-18T14:00'))).toEqual({ fecha: '2026-10-18', hora: '14:00' })
    expect(tomaActual(horas, a('2026-10-18T23:59'))).toEqual({ fecha: '2026-10-18', hora: '21:00' })
    // De madrugada sigue la de anoche, hasta que llega la del desayuno.
    expect(tomaActual(horas, a('2026-10-18T06:00'))).toEqual({ fecha: '2026-10-17', hora: '21:00' })
    expect(tomaActual([], a('2026-10-18T06:00'))).toBeNull()
  })

  it('dice cuál es la siguiente', () => {
    const horas = ['08:00', '21:00']
    expect(siguienteToma(horas, a('2026-10-18T10:30'))).toEqual({ fecha: '2026-10-18', hora: '21:00' })
    expect(siguienteToma(horas, a('2026-10-18T22:00'))).toEqual({ fecha: '2026-10-19', hora: '08:00' })
  })

  it('lo dice con palabras', () => {
    const ahora = a('2026-10-18T06:00')
    expect(cuandoEs({ fecha: '2026-10-18', hora: '08:00' }, ahora)).toBe('hoy a las 08:00')
    expect(cuandoEs({ fecha: '2026-10-17', hora: '21:00' }, ahora)).toBe('anoche a las 21:00')
    expect(cuandoEs({ fecha: '2026-10-19', hora: '08:00' }, ahora)).toBe('mañana a las 08:00')
  })
})

describe('Tomada / Sin tomar', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('marca, no repite, desmarca y se borra con el medicamento', async () => {
    const p = await crearPerfil({ nombre: 'Rosa', color: '#2e5c8a' })
    const id = await guardarMedicamento(p.id, { nombre: 'Enalapril', momentos: [], horas: ['21:00', '08:00'], activo: 1 })
    expect((await db.medicamentos.get(id))?.horas).toEqual(['08:00', '21:00'])

    const t = { fecha: '2026-10-18', hora: '08:00' }
    expect(await buscarToma(id, t)).toBeUndefined()
    await marcarTomada(p.id, id, t, 1000)
    await marcarTomada(p.id, id, t, 2000)
    expect(await listarTomas(id)).toHaveLength(1)
    expect((await buscarToma(id, t))?.tomadaEn).toBe(1000)

    await desmarcarTomada(id, t)
    expect(await buscarToma(id, t)).toBeUndefined()

    await marcarTomada(p.id, id, t)
    await borrarMedicamento(id)
    expect(await db.tomas.count()).toBe(0)
  })

  it('no deja guardar horas mal escritas', () => {
    expect(revisarMedicamento({ nombre: 'X', momentos: [], horas: ['25:00'], activo: 1 })).toContain('hora')
  })
})

describe('ayer o anoche', () => {
  it('por la tarde no dice «anoche»', () => {
    expect(cuandoEs({ fecha: '2026-10-17', hora: '21:30' }, new Date('2026-10-18T21:15'))).toBe('ayer a las 21:30')
  })
})
