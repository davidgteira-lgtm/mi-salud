import { beforeEach, describe, expect, it } from 'vitest'
import { guardarAdjuntos } from './adjuntos'
import { borrarCita, especialidadesPasadas, guardarCita, listarPasadas, listarProximas, type DatosCita } from './citas'
import { db } from './db'
import { crearPerfil } from './perfiles'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

const HOY = '2026-10-17'
const cita = (fecha: string, especialidad: string, extra: Partial<DatosCita> = {}): DatosCita => ({ fecha, especialidad, ...extra })

describe('citas', () => {
  it('separa próximas (desde hoy) y pasadas (antes de hoy)', async () => {
    const p = await crearPerfil({ nombre: 'Carmen', color: '#2e5c8a' })
    await guardarCita(p.id, cita('2026-10-17', 'Dentista', { hora: '17:00' }))
    await guardarCita(p.id, cita('2026-11-02', 'Cardiología'))
    await guardarCita(p.id, cita('2026-10-17', 'Enfermería', { hora: '09:15' }))
    await guardarCita(p.id, cita('2026-10-16', 'Traumatología'))
    await guardarCita(p.id, cita('2025-03-01', 'Digestivo'))

    expect((await listarProximas(p.id, HOY)).map((c) => c.especialidad)).toEqual(['Enfermería', 'Dentista', 'Cardiología'])
    expect((await listarPasadas(p.id, {}, HOY)).map((c) => c.especialidad)).toEqual(['Traumatología', 'Digestivo'])
  })

  it('las anuladas no salen en próximas', async () => {
    const p = await crearPerfil({ nombre: 'Carmen', color: '#2e5c8a' })
    await guardarCita(p.id, cita('2026-11-02', 'Cardiología', { anulada: true }))
    expect(await listarProximas(p.id, HOY)).toEqual([])
  })

  it('filtra las pasadas por especialidad y por palabras', async () => {
    const p = await crearPerfil({ nombre: 'Carmen', color: '#2e5c8a' })
    await guardarCita(p.id, cita('2026-01-10', 'Traumatología', { motivo: 'Dolor de espalda' }))
    await guardarCita(p.id, cita('2026-03-05', 'Médico de cabecera', { motivo: 'Me duele la espalda', resultado: 'Lumbalgia' }))
    await guardarCita(p.id, cita('2026-05-20', 'Traumatología', { motivo: 'Rodilla' }))

    expect(await listarPasadas(p.id, { especialidad: 'Traumatología' }, HOY)).toHaveLength(2)
    expect(await listarPasadas(p.id, { busqueda: 'espalda' }, HOY)).toHaveLength(2)
    expect(await listarPasadas(p.id, { busqueda: 'lumbal' }, HOY)).toHaveLength(1)
    expect(await listarPasadas(p.id, { busqueda: 'ESPALDA', especialidad: 'Traumatología' }, HOY)).toHaveLength(1)
    expect(await especialidadesPasadas(p.id, HOY)).toEqual(['Médico de cabecera', 'Traumatología'])
  })

  it('no guarda sin fecha, sin especialidad o con una hora imposible', async () => {
    const p = await crearPerfil({ nombre: 'Carmen', color: '#2e5c8a' })
    await expect(guardarCita(p.id, cita('', 'Dentista'))).rejects.toThrow('fecha')
    await expect(guardarCita(p.id, cita(HOY, '  '))).rejects.toThrow('especialidad')
    await expect(guardarCita(p.id, cita(HOY, 'Dentista', { hora: '25:00' }))).rejects.toThrow('hora')
    expect(await db.citas.count()).toBe(0)
  })

  it('al borrar una cita se borran sus fotos y notas de voz', async () => {
    const p = await crearPerfil({ nombre: 'Carmen', color: '#2e5c8a' })
    const id = await guardarCita(p.id, cita(HOY, 'Dentista'))
    const otra = await guardarCita(p.id, cita(HOY, 'Cardiología'))
    await guardarAdjuntos(p.id, id, [{ clave: 'a', tipo: 'foto', nombre: 'Informe', archivo: new Blob(['x'], { type: 'image/jpeg' }) }])
    await guardarAdjuntos(p.id, otra, [{ clave: 'b', tipo: 'voz', nombre: 'Nota', archivo: new Blob(['y'], { type: 'audio/webm' }) }])

    await borrarCita(id)

    expect(await db.citas.count()).toBe(1)
    expect((await db.adjuntos.toArray()).map((a) => a.registroId)).toEqual([otra])
  })

  it('los adjuntos nuevos quedan pendientes de leer por la IA', async () => {
    const p = await crearPerfil({ nombre: 'Carmen', color: '#2e5c8a' })
    const id = await guardarCita(p.id, cita(HOY, 'Dentista'))
    await guardarAdjuntos(p.id, id, [{ clave: 'a', tipo: 'documento', nombre: 'informe.pdf', archivo: new Blob(['%PDF'], { type: 'application/pdf' }) }])
    expect((await db.adjuntos.toArray())[0]).toMatchObject({ analisis: 'pendiente', perfilId: p.id, registroId: id })
  })
})
