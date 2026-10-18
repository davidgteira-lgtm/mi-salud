import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/db'
import { estadoDeLosDientes, listarDental } from '../db/dental'
import { evolucion, pruebasConHistoria } from '../db/analiticas'
import { crearPerfil } from '../db/perfiles'
import { datosEnlazados, listarRegistros, queToca } from '../db/revisiones'
import { conLaRegla } from '../utils/ciclos'
import { borrarEjemplos, crearEjemplos, hayEjemplos } from './ejemplo'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

const HOY = '2026-10-18'

describe('personas de ejemplo', () => {
  it('crea dos personas con datos en todas las secciones', async () => {
    const rosaId = await crearEjemplos(HOY)
    const perfiles = await db.perfiles.toArray()
    expect(perfiles.map((p) => p.nombre).sort()).toEqual(['Lucía (ejemplo)', 'Rosa (ejemplo)'])
    expect(perfiles.every((p) => p.ejemplo)).toBe(true)

    for (const tabla of [
      'medicamentos',
      'citas',
      'historial',
      'analiticas',
      'alergias',
      'revisiones',
      'dental',
      'constantes',
      'telefonos',
      'fichas',
    ]) {
      expect(await db.table(tabla).where('perfilId').equals(rosaId).count(), tabla).toBeGreaterThan(0)
    }
  })

  it('enseña bien la evolución de los análisis, aunque uno venga en otra unidad', async () => {
    const rosaId = await crearEjemplos(HOY)
    const pruebas = await pruebasConHistoria(rosaId)
    const glucosa = pruebas.find((p) => p.grupo === 'glucosa')
    expect(glucosa).toBeDefined()
    const e = await evolucion(rosaId, glucosa!.grupo)
    expect(e.puntos.map((p) => Math.round(p.valor))).toEqual([118, 126, 112])
  })

  it('a Rosa le tocan cosas (para que se vea la sección de revisiones) y tiene una caries', async () => {
    const rosaId = await crearEjemplos(HOY)
    const rosa = (await db.perfiles.get(rosaId))!
    const lista = queToca({
      edad: 70,
      sexo: rosa.sexo,
      registros: await listarRegistros(rosaId),
      enlazados: await datosEnlazados(rosaId),
      propias: rosa.revisionesPropias,
      hoy: HOY,
    })
    const estado = (clave: string) => lista.find((x) => x.clave === clave)?.estado
    expect(estado('gripe')).toBe('toca')
    expect(estado('tetanos')).toBe('toca')
    expect(estado('zoster')).toBe('pronto')
    expect(estado('neumococo')).toBe('hecha')
    expect(estado('tension')).toBe('al-dia')
    expect(estado('dentista')).toBe('toca')
    expect(estadoDeLosDientes(await listarDental(rosaId)).get(24)).toBe('caries')
  })

  it('las migrañas de Lucía coinciden con la regla', async () => {
    await crearEjemplos(HOY)
    const lucia = (await db.perfiles.filter((p) => p.nombre.startsWith('Lucía')).first())!
    const ciclos = await db.ciclos.where('perfilId').equals(lucia.id).toArray()
    const migranas = (await db.historial.where('perfilId').equals(lucia.id).toArray()).filter((h) => h.titulo.startsWith('Migraña '))
    expect(migranas).toHaveLength(2)
    expect(migranas.every((h) => conLaRegla(h.fecha, ciclos))).toBe(true)
  })

  it('se pueden volver a crear y borrar sin tocar a las personas de verdad', async () => {
    const real = await crearPerfil({ nombre: 'Persona real', color: '#2e5c8a' })
    await crearEjemplos(HOY)
    await crearEjemplos(HOY)
    expect(await db.perfiles.count()).toBe(3)
    expect(await hayEjemplos()).toBe(true)
    await borrarEjemplos()
    expect((await db.perfiles.toArray()).map((p) => p.id)).toEqual([real.id])
    expect(await db.citas.count()).toBe(0)
  })
})
