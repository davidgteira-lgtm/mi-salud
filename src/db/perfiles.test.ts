import { beforeEach, describe, expect, it } from 'vitest'
import { db, nuevoId } from './db'
import { actualizarPerfil, borrarPerfil, crearPerfil, listarPerfiles } from './perfiles'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

function registro(perfilId: string, extra: Record<string, unknown> = {}) {
  return { id: nuevoId(), perfilId, creadoEn: 1, actualizadoEn: 1, ...extra }
}

describe('perfiles', () => {
  it('crea un perfil y quita espacios del nombre', async () => {
    const p = await crearPerfil({ nombre: '  Carmen  ', color: '#1f6f5c' })
    expect(p.nombre).toBe('Carmen')
    expect(await listarPerfiles()).toHaveLength(1)
  })

  it('no deja crear un perfil sin nombre', async () => {
    await expect(crearPerfil({ nombre: '   ', color: '#1f6f5c' })).rejects.toThrow('Falta el nombre')
    await expect(listarPerfiles()).resolves.toHaveLength(0)
  })

  it('ordena los perfiles por nombre', async () => {
    await crearPerfil({ nombre: 'Pilar', color: '#1f6f5c' })
    await crearPerfil({ nombre: 'Antonio', color: '#1f6f5c' })
    expect((await listarPerfiles()).map((p) => p.nombre)).toEqual(['Antonio', 'Pilar'])
  })

  it('cambia los datos de un perfil', async () => {
    const p = await crearPerfil({ nombre: 'Carmen', color: '#1f6f5c' })
    await actualizarPerfil(p.id, { fechaNacimiento: '1958-03-21' })
    expect((await db.perfiles.get(p.id))?.fechaNacimiento).toBe('1958-03-21')
  })

  it('al borrar una persona se borran sus datos, pero no los de las demás', async () => {
    const madre = await crearPerfil({ nombre: 'Carmen', color: '#1f6f5c' })
    const hijo = await crearPerfil({ nombre: 'David', color: '#2b5797' })
    await db.citas.add(registro(madre.id, { fecha: '2026-11-02' }))
    await db.medicamentos.add(registro(madre.id, { activo: 1 }))
    await db.citas.add(registro(hijo.id, { fecha: '2026-11-03' }))

    await borrarPerfil(madre.id)

    expect(await db.perfiles.get(madre.id)).toBeUndefined()
    expect(await db.citas.where('perfilId').equals(madre.id).count()).toBe(0)
    expect(await db.medicamentos.count()).toBe(0)
    expect(await db.citas.where('perfilId').equals(hijo.id).count()).toBe(1)
  })
})
