import { beforeEach, describe, expect, it } from 'vitest'
import { guardarAnalitica } from './analiticas'
import { guardarMedida } from './constantes'
import { db } from './db'
import { guardarHistorial } from './historial'
import { dejarDeTomar, guardarMedicamento } from './medicamentos'
import { crearPerfil } from './perfiles'
import { crearResumen } from './resumen'
import { guardarRegistro } from './revisiones'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

describe('resumen para el médico', () => {
  it('junta lo importante de cada sección', async () => {
    const p = await crearPerfil({ nombre: 'Carmen', color: '#2e5c8a' })
    await guardarMedicamento(p.id, { nombre: 'Sintrom', momentos: ['cena'], activo: 1 })
    const reciente = await guardarMedicamento(p.id, { nombre: 'Omeprazol', momentos: ['desayuno'], activo: 1 })
    await dejarDeTomar(reciente, '2026-06-01')
    const antiguo = await guardarMedicamento(p.id, { nombre: 'Ibuprofeno', momentos: [], activo: 1 })
    await dejarDeTomar(antiguo, '2020-01-01')
    await guardarMedida(p.id, { tipo: 'tension', fecha: '2026-10-17', valor: 129, valor2: 81, pulso: 72 })
    await guardarMedida(p.id, { tipo: 'peso', fecha: '2026-10-10', valor: 72.4 })
    await guardarAnalitica(p.id, { fecha: '2025-01-01', resultados: [{ nombre: 'Glucosa', valor: 130, refMin: 70, refMax: 100 }] })
    await guardarAnalitica(p.id, {
      fecha: '2026-09-10',
      resultados: [
        { nombre: 'Glucosa', valor: 104, unidad: 'mg/dL', refMin: 74, refMax: 100 },
        { nombre: 'Hierro', valor: 40, refMin: 50, refMax: 170 },
        { nombre: 'Creatinina', valor: 0.8, refMin: 0.5, refMax: 1.1 },
      ],
    })
    await guardarHistorial(p.id, { fecha: '2010-03-03', tipo: 'operacion', titulo: 'Apendicitis' })
    await guardarHistorial(p.id, { fecha: '2026-02-02', tipo: 'urgencias', titulo: 'Caída en casa' })
    await guardarHistorial(p.id, { fecha: '2023-02-02', tipo: 'urgencias', titulo: 'Urgencias antiguas' })
    await guardarRegistro(p.id, { tipo: 'vacuna', clave: 'gripe', nombre: 'gripe', fecha: '2024-10-10' })
    await guardarRegistro(p.id, { tipo: 'vacuna', clave: 'gripe', nombre: 'gripe', fecha: '2025-10-22' })

    const r = await crearResumen((await db.perfiles.get(p.id))!, '2026-10-18')
    expect(r.ficha.medicamentos.map((m) => m.nombre)).toEqual(['Sintrom'])
    expect(r.dejados.map((m) => m.nombre)).toEqual(['Omeprazol'])
    expect(r.constantes).toEqual(
      expect.arrayContaining([
        { nombre: 'Tensión', valor: 'Alta 129 · Baja 81', fecha: '2026-10-17' },
        { nombre: 'Pulso', valor: '72 lpm', fecha: '2026-10-17' },
        { nombre: 'Peso', valor: '72,4 kg', fecha: '2026-10-10' },
      ]),
    )
    // Solo el último análisis, y de él lo que está fuera de lo normal.
    expect(r.analisis).toMatchObject({ fecha: '2026-09-10', total: 3 })
    expect(r.analisis?.fuera.map((x) => [x.nombre, x.estado])).toEqual([
      ['Glucosa', 'alto'],
      ['Hierro', 'bajo'],
    ])
    expect(r.operaciones.map((h) => h.titulo)).toEqual(['Apendicitis'])
    expect(r.recientes.map((h) => h.titulo)).toEqual(['Caída en casa'])
    expect(r.vacunas).toHaveLength(1)
    expect(r.vacunas[0]).toMatchObject({ nombre: 'Vacuna de la gripe', fecha: '2025-10-22' })
  })
})
