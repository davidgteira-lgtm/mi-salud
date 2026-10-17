import { beforeEach, describe, expect, it } from 'vitest'
import { borrarCiclo, guardarCiclo, listarCiclos, revisarCiclo, terminarCiclo } from './ciclos'
import { db } from './db'
import { borrarPerfil, crearPerfil } from './perfiles'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

describe('guardar la regla', () => {
  it('guarda, ordena (la más reciente primero) y no repite síntomas', async () => {
    const p = await crearPerfil({ nombre: 'Laura', color: '#2e5c8a', sexo: 'mujer' })
    await guardarCiclo(p.id, { inicio: '2026-09-04', fin: '2026-09-08', sintomas: [] })
    const id = await guardarCiclo(p.id, { inicio: '2026-10-02', intensidad: 'mucha', sintomas: ['Dolor', 'Migraña', 'Dolor'] })

    const lista = await listarCiclos(p.id)
    expect(lista.map((c) => c.inicio)).toEqual(['2026-10-02', '2026-09-04'])
    expect((await db.ciclos.get(id))?.sintomas).toEqual(['Dolor', 'Migraña'])
  })

  it('"Se me ha acabado hoy" apunta el último día', async () => {
    const p = await crearPerfil({ nombre: 'Laura', color: '#2e5c8a' })
    const id = await guardarCiclo(p.id, { inicio: '2026-10-02', sintomas: [] })
    await terminarCiclo(id, '2026-10-06')
    expect((await db.ciclos.get(id))?.fin).toBe('2026-10-06')
  })

  it('caza fechas imposibles', () => {
    expect(revisarCiclo({ inicio: '', sintomas: [] })).toContain('empezó')
    expect(revisarCiclo({ inicio: '2026-10-06', fin: '2026-10-02', sintomas: [] })).toContain('antes')
    expect(revisarCiclo({ inicio: '2026-10-01', fin: '2026-10-30', sintomas: [] })).toContain('error')
  })

  it('se borra con la persona y entra en la copia de seguridad como el resto', async () => {
    const p = await crearPerfil({ nombre: 'Laura', color: '#2e5c8a' })
    const id = await guardarCiclo(p.id, { inicio: '2026-10-02', sintomas: [] })
    await borrarCiclo(id)
    await guardarCiclo(p.id, { inicio: '2026-10-02', sintomas: [] })
    await borrarPerfil(p.id)
    expect(await db.ciclos.count()).toBe(0)
  })
})
