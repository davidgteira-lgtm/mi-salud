import { beforeEach, describe, expect, it } from 'vitest'
import { bajaEnCurso, borrarBaja, darAlta, diasDeBaja, diasEnElAno, guardarBaja, listarBajas, revisarBaja } from './bajas'
import { db } from './db'
import { borrarPerfil, crearPerfil } from './perfiles'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

const base = { inicio: '2026-03-02', tipo: 'comun' as const, motivo: 'Lumbalgia', confirmaciones: [] }

describe('bajas médicas', () => {
  it('cuenta los días de baja (el primero y el último incluidos)', () => {
    expect(diasDeBaja({ inicio: '2026-03-02', fin: '2026-03-02' })).toBe(1)
    expect(diasDeBaja({ inicio: '2026-03-02', fin: '2026-03-15' })).toBe(14)
    // Sin alta: hasta hoy.
    expect(diasDeBaja({ inicio: '2026-10-07' }, '2026-10-18')).toBe(12)
  })

  it('suma los días de un año, aunque la baja cruce de un año a otro', () => {
    const bajas = [
      { inicio: '2025-12-20', fin: '2026-01-05' },
      { inicio: '2026-03-02', fin: '2026-03-15' },
      { inicio: '2026-10-07' },
    ]
    expect(diasEnElAno(bajas, 2026, '2026-10-18')).toBe(5 + 14 + 12)
    expect(diasEnElAno(bajas, 2025, '2026-10-18')).toBe(12)
  })

  it('revisa las fechas', () => {
    expect(revisarBaja({ ...base, motivo: '' })).toContain('motivo')
    expect(revisarBaja({ ...base, fin: '2026-03-01' })).toContain('antes')
    expect(revisarBaja({ ...base, confirmaciones: ['2026-02-20'] })).toContain('confirmación')
    expect(revisarBaja({ ...base, fin: '2026-03-10', confirmaciones: ['2026-03-12'] })).toContain('después del alta')
    expect(revisarBaja({ ...base, fin: '2026-03-15', confirmaciones: ['2026-03-09'] })).toBeNull()
  })

  it('guarda, da el alta, ordena y se borra con la persona', async () => {
    const p = await crearPerfil({ nombre: 'Lucía', color: '#2e5c8a' })
    await guardarBaja(p.id, { ...base, fin: '2026-03-15', tipoAlta: 'curacion', confirmaciones: ['2026-03-09', '2026-03-09'] })
    const id = await guardarBaja(p.id, { ...base, inicio: '2026-10-07', motivo: ' Migraña ', empresa: ' Empresa Ejemplo ' })

    let lista = await listarBajas(p.id)
    expect(lista.map((b) => b.motivo)).toEqual(['Migraña', 'Lumbalgia'])
    expect(lista[1].confirmaciones).toEqual(['2026-03-09'])
    expect(bajaEnCurso(lista)?.id).toBe(id)

    await darAlta(id, '2026-10-16', 'mejoria')
    lista = await listarBajas(p.id)
    expect(bajaEnCurso(lista)).toBeUndefined()
    expect(lista[0]).toMatchObject({ fin: '2026-10-16', tipoAlta: 'mejoria' })
    await expect(darAlta(id, '2026-10-01', 'curacion')).rejects.toThrow(/antes/)

    await borrarBaja(id)
    expect(await listarBajas(p.id)).toHaveLength(1)
    await borrarPerfil(p.id)
    expect(await db.bajas.count()).toBe(0)
  })
})
