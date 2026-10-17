import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import { borrarPerfil, crearPerfil } from './perfiles'
import { borrarContacto, guardarContacto, listarContactos } from './telefonos'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

describe('teléfonos de centros médicos', () => {
  it('guarda un teléfono limpiando espacios del nombre', async () => {
    const p = await crearPerfil({ nombre: 'Carmen', color: '#2e5c8a' })
    await guardarContacto(p.id, { tipo: 'centro-salud', nombre: '  C.S. Las Águilas ', telefono: '91 234 56 78' })
    const [c] = await listarContactos(p.id)
    expect(c).toMatchObject({ nombre: 'C.S. Las Águilas', telefono: '91 234 56 78', tipo: 'centro-salud' })
  })

  it('no guarda si falta el nombre o el número está mal', async () => {
    const p = await crearPerfil({ nombre: 'Carmen', color: '#2e5c8a' })
    await expect(guardarContacto(p.id, { tipo: 'medico', nombre: '', telefono: '912345678' })).rejects.toThrow('nombre')
    await expect(guardarContacto(p.id, { tipo: 'medico', nombre: 'Dra. Pérez', telefono: '12' })).rejects.toThrow('teléfono')
    expect(await db.telefonos.count()).toBe(0)
  })

  it('ordena: centro de salud, médico, hospital… y por nombre', async () => {
    const p = await crearPerfil({ nombre: 'Carmen', color: '#2e5c8a' })
    await guardarContacto(p.id, { tipo: 'hospital', nombre: 'Hospital La Paz', telefono: '917277000' })
    await guardarContacto(p.id, { tipo: 'medico', nombre: 'Dra. Ruiz', telefono: '612345678' })
    await guardarContacto(p.id, { tipo: 'centro-salud', nombre: 'Centro de salud', telefono: '912345678' })
    await guardarContacto(p.id, { tipo: 'medico', nombre: 'Dra. Álvarez', telefono: '623456789' })
    expect((await listarContactos(p.id)).map((c) => c.nombre)).toEqual([
      'Centro de salud',
      'Dra. Álvarez',
      'Dra. Ruiz',
      'Hospital La Paz',
    ])
  })

  it('cambia y borra un teléfono', async () => {
    const p = await crearPerfil({ nombre: 'Carmen', color: '#2e5c8a' })
    const id = await guardarContacto(p.id, { tipo: 'medico', nombre: 'Dr. Ruiz', telefono: '612345678' })
    await guardarContacto(p.id, { tipo: 'medico', nombre: 'Dr. Ruiz', telefono: '699999999' }, id)
    expect((await db.telefonos.get(id))?.telefono).toBe('699999999')
    await borrarContacto(id)
    expect(await db.telefonos.count()).toBe(0)
  })

  it('cada persona ve solo sus teléfonos, y se borran con ella', async () => {
    const madre = await crearPerfil({ nombre: 'Carmen', color: '#2e5c8a' })
    const hijo = await crearPerfil({ nombre: 'David', color: '#4f7fb5' })
    await guardarContacto(madre.id, { tipo: 'medico', nombre: 'Dr. Ruiz', telefono: '612345678' })
    await guardarContacto(hijo.id, { tipo: 'medico', nombre: 'Dra. Gil', telefono: '623456789' })

    expect((await listarContactos(madre.id)).map((c) => c.nombre)).toEqual(['Dr. Ruiz'])
    await borrarPerfil(madre.id)
    expect(await db.telefonos.count()).toBe(1)
  })
})
