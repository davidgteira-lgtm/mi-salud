import { beforeEach, describe, expect, it } from 'vitest'
import { borrarAlergia, guardarAlergia, listarAlergias } from './alergias'
import { db } from './db'
import { dejarDeTomar, guardarMedicamento, listarMedicamentos, volverATomar, type DatosMedicamento } from './medicamentos'
import { borrarPerfil, crearPerfil } from './perfiles'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

const med = (nombre: string, extra: Partial<DatosMedicamento> = {}): DatosMedicamento => ({
  nombre,
  momentos: [],
  activo: 1,
  ...extra,
})

describe('medicamentos', () => {
  it('guarda y rellena la familia desde la lista de medicamentos', async () => {
    const p = await crearPerfil({ nombre: 'Carmen', color: '#2e5c8a' })
    const id = await guardarMedicamento(p.id, med('Sintrom 4 mg', { dosis: ' 1/4 de comprimido ' }))
    expect(await db.medicamentos.get(id)).toMatchObject({
      nombre: 'Sintrom 4 mg',
      dosis: '1/4 de comprimido',
      familia: 'Anticoagulante (para que la sangre no coagule)',
      activo: 1,
    })
  })

  it('respeta la familia si la persona la escribe', async () => {
    const p = await crearPerfil({ nombre: 'Carmen', color: '#2e5c8a' })
    const id = await guardarMedicamento(p.id, med('Sintrom', { familia: 'La pastilla de la sangre' }))
    expect((await db.medicamentos.get(id))?.familia).toBe('La pastilla de la sangre')
  })

  it('ordena los momentos del día y no los repite', async () => {
    const p = await crearPerfil({ nombre: 'Carmen', color: '#2e5c8a' })
    const id = await guardarMedicamento(p.id, med('Omeprazol', { momentos: ['cena', 'desayuno', 'cena'] }))
    expect((await db.medicamentos.get(id))?.momentos).toEqual(['desayuno', 'cena'])
  })

  it('no guarda sin nombre ni con fechas al revés', async () => {
    const p = await crearPerfil({ nombre: 'Carmen', color: '#2e5c8a' })
    await expect(guardarMedicamento(p.id, med('  '))).rejects.toThrow('nombre')
    await expect(
      guardarMedicamento(p.id, med('Ibuprofeno', { activo: 0, fechaInicio: '2026-05-10', fechaFin: '2026-05-01' })),
    ).rejects.toThrow('anterior')
    expect(await db.medicamentos.count()).toBe(0)
  })

  it('separa lo que toma ahora de lo que tomó antes', async () => {
    const p = await crearPerfil({ nombre: 'Carmen', color: '#2e5c8a' })
    await guardarMedicamento(p.id, med('Omeprazol'))
    await guardarMedicamento(p.id, med('Adiro'))
    await guardarMedicamento(p.id, med('Amoxicilina', { activo: 0, fechaFin: '2026-03-01' }))
    await guardarMedicamento(p.id, med('Ibuprofeno', { activo: 0, fechaFin: '2026-09-15' }))

    expect((await listarMedicamentos(p.id, true)).map((m) => m.nombre)).toEqual(['Adiro', 'Omeprazol'])
    // El historial, lo más reciente primero.
    expect((await listarMedicamentos(p.id, false)).map((m) => m.nombre)).toEqual(['Ibuprofeno', 'Amoxicilina'])
  })

  it('"Ya no lo tomo" lo pasa al historial con la fecha', async () => {
    const p = await crearPerfil({ nombre: 'Carmen', color: '#2e5c8a' })
    const id = await guardarMedicamento(p.id, med('Omeprazol', { fechaInicio: '2026-01-10' }))
    await dejarDeTomar(id, '2026-10-17')
    expect(await db.medicamentos.get(id)).toMatchObject({ activo: 0, fechaFin: '2026-10-17', fechaInicio: '2026-01-10' })
    expect(await listarMedicamentos(p.id, true)).toHaveLength(0)
  })

  it('"Lo vuelvo a tomar" crea una toma nueva y conserva la anterior', async () => {
    const p = await crearPerfil({ nombre: 'Carmen', color: '#2e5c8a' })
    const id = await guardarMedicamento(
      p.id,
      med('Lorazepam', { activo: 0, dosis: '1 mg', fechaInicio: '2025-01-01', fechaFin: '2025-06-01' }),
    )
    const nuevo = await volverATomar(id, '2026-10-17')

    expect(nuevo).not.toBe(id)
    expect(await db.medicamentos.get(nuevo)).toMatchObject({ activo: 1, dosis: '1 mg', fechaInicio: '2026-10-17' })
    expect((await db.medicamentos.get(nuevo))?.fechaFin).toBeUndefined()
    expect(await db.medicamentos.get(id)).toMatchObject({ activo: 0, fechaFin: '2025-06-01' })
  })

  it('cada persona ve solo sus medicamentos, y se borran con ella', async () => {
    const madre = await crearPerfil({ nombre: 'Carmen', color: '#2e5c8a' })
    const hijo = await crearPerfil({ nombre: 'David', color: '#4f7fb5' })
    await guardarMedicamento(madre.id, med('Sintrom'))
    await guardarMedicamento(hijo.id, med('Ibuprofeno'))
    expect((await listarMedicamentos(madre.id, true)).map((m) => m.nombre)).toEqual(['Sintrom'])
    await borrarPerfil(madre.id)
    expect(await db.medicamentos.count()).toBe(1)
  })
})

describe('alergias', () => {
  it('guarda y ordena: primero las graves', async () => {
    const p = await crearPerfil({ nombre: 'Carmen', color: '#2e5c8a' })
    await guardarAlergia(p.id, { tipo: 'alimento', clase: 'intolerancia', nombre: 'Lactosa', gravedad: 'leve' })
    await guardarAlergia(p.id, { tipo: 'medicamento', clase: 'alergia', nombre: ' Penicilina ', gravedad: 'grave', reaccion: 'Ronchas' })
    await guardarAlergia(p.id, { tipo: 'alimento', clase: 'alergia', nombre: 'Marisco', gravedad: 'moderada' })

    const lista = await listarAlergias(p.id)
    expect(lista.map((a) => a.nombre)).toEqual(['Penicilina', 'Marisco', 'Lactosa'])
    expect(lista[0].reaccion).toBe('Ronchas')
  })

  it('no guarda una alergia sin nombre, y se puede borrar', async () => {
    const p = await crearPerfil({ nombre: 'Carmen', color: '#2e5c8a' })
    await expect(
      guardarAlergia(p.id, { tipo: 'alimento', clase: 'alergia', nombre: '', gravedad: 'leve' }),
    ).rejects.toThrow()
    const id = await guardarAlergia(p.id, { tipo: 'alimento', clase: 'alergia', nombre: 'Nueces', gravedad: 'leve' })
    await borrarAlergia(id)
    expect(await db.alergias.count()).toBe(0)
  })
})
