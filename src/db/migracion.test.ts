// Al actualizar la app, los análisis ya guardados con una referencia al revés se corrigen solos (datos inventados).
import Dexie from 'dexie'
import { expect, it } from 'vitest'
import { BaseDeDatos } from './db'

it('corrige un HDL guardado como «normal por debajo de 35»', async () => {
  const nombre = 'prueba-migracion-hdl'
  const antigua = new Dexie(nombre)
  antigua.version(6).stores({ analiticas: 'id, perfilId, [perfilId+fecha]' })
  await antigua.table('analiticas').add({
    id: 'a1',
    perfilId: 'p1',
    fecha: '2026-10-01',
    resultados: [
      { clave: 'hdl', nombre: 'HDL Colesterol', valor: 31, unidad: 'mg/dl', refMax: 35 },
      { clave: 'trigliceridos', nombre: 'Triglicéridos', valor: 120, unidad: 'mg/dl', refMax: 150 },
      { nombre: 'Prueba sin clave', valor: 5, refMax: 10 },
    ],
    creadoEn: 0,
    actualizadoEn: 0,
  })
  antigua.close()

  const nueva = new BaseDeDatos(nombre)
  const a = await nueva.analiticas.get('a1')
  expect(a?.resultados.map((r) => [r.nombre, r.refMin, r.refMax])).toEqual([
    ['HDL Colesterol', 35, undefined],
    ['Triglicéridos', undefined, 150],
    ['Prueba sin clave', undefined, 10],
  ])
  nueva.close()
})
