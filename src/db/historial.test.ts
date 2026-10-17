import { beforeEach, describe, expect, it } from 'vitest'
import { guardarAdjuntos } from './adjuntos'
import { db } from './db'
import {
  agruparPorAno,
  borrarHistorial,
  enfermedadesCronicas,
  guardarHistorial,
  listarHistorial,
  type DatosHistorial,
} from './historial'
import { crearPerfil } from './perfiles'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

const entrada = (fecha: string, tipo: DatosHistorial['tipo'], titulo: string, extra: Partial<DatosHistorial> = {}): DatosHistorial => ({
  fecha,
  tipo,
  titulo,
  ...extra,
})

describe('historial', () => {
  it('ordena de lo más reciente a lo más antiguo y agrupa por años', async () => {
    const p = await crearPerfil({ nombre: 'Carmen', color: '#2e5c8a' })
    await guardarHistorial(p.id, entrada('2024-05-10', 'operacion', 'Cataratas ojo derecho'))
    await guardarHistorial(p.id, entrada('2026-02-01', 'prueba', 'Radiografía de rodilla', { prueba: 'Radiografía' }))
    await guardarHistorial(p.id, entrada('2026-09-20', 'consulta', 'Revisión de tensión'))

    const lista = await listarHistorial(p.id)
    expect(lista.map((h) => h.titulo)).toEqual(['Revisión de tensión', 'Radiografía de rodilla', 'Cataratas ojo derecho'])
    expect(agruparPorAno(lista).map(([ano, hs]) => [ano, hs.length])).toEqual([
      ['2026', 2],
      ['2024', 1],
    ])
  })

  it('filtra por tipo y busca por palabras en cualquier campo', async () => {
    const p = await crearPerfil({ nombre: 'Carmen', color: '#2e5c8a' })
    await guardarHistorial(p.id, entrada('2026-01-10', 'prueba', 'Rodilla', { prueba: 'Resonancia', resumen: 'Menisco roto' }))
    await guardarHistorial(p.id, entrada('2026-03-10', 'consulta', 'Traumatólogo', { resumen: 'Dolor de rodilla al subir escaleras' }))
    await guardarHistorial(p.id, entrada('2026-04-10', 'urgencias', 'Caída en casa', { centro: 'Hospital La Paz' }))

    expect(await listarHistorial(p.id, { tipo: 'prueba' })).toHaveLength(1)
    expect(await listarHistorial(p.id, { busqueda: 'rodilla' })).toHaveLength(2)
    expect(await listarHistorial(p.id, { busqueda: 'resonancia' })).toHaveLength(1)
    expect(await listarHistorial(p.id, { busqueda: 'la paz' })).toHaveLength(1)
    // También encuentra por el tipo escrito con palabras.
    expect(await listarHistorial(p.id, { busqueda: 'urgencias' })).toHaveLength(1)
  })

  it('solo guarda "crónica" en los diagnósticos y la prueba en las pruebas', async () => {
    const p = await crearPerfil({ nombre: 'Carmen', color: '#2e5c8a' })
    await guardarHistorial(p.id, entrada('2015-01-01', 'diagnostico', 'Diabetes tipo 2', { cronica: true }))
    await guardarHistorial(p.id, entrada('2020-01-01', 'diagnostico', 'Gripe', { cronica: false }))
    const id = await guardarHistorial(p.id, entrada('2026-01-01', 'consulta', 'Revisión', { cronica: true, prueba: 'TAC' }))

    expect((await enfermedadesCronicas(p.id)).map((h) => h.titulo)).toEqual(['Diabetes tipo 2'])
    const consulta = await db.historial.get(id)
    expect(consulta?.cronica).toBeUndefined()
    expect(consulta?.prueba).toBeUndefined()
  })

  it('no guarda sin fecha ni sin título', async () => {
    const p = await crearPerfil({ nombre: 'Carmen', color: '#2e5c8a' })
    await expect(guardarHistorial(p.id, entrada('', 'informe', 'Informe'))).rejects.toThrow('fecha')
    await expect(guardarHistorial(p.id, entrada('2026-01-01', 'informe', ' '))).rejects.toThrow('título')
  })

  it('al borrar una entrada se borran sus archivos', async () => {
    const p = await crearPerfil({ nombre: 'Carmen', color: '#2e5c8a' })
    const id = await guardarHistorial(p.id, entrada('2026-01-01', 'informe', 'Informe de alta'))
    await guardarAdjuntos(p.id, id, [{ clave: 'a', tipo: 'documento', nombre: 'alta.pdf', archivo: new Blob(['%PDF'], { type: 'application/pdf' }) }])
    await borrarHistorial(id)
    expect(await db.historial.count()).toBe(0)
    expect(await db.adjuntos.count()).toBe(0)
  })
})
