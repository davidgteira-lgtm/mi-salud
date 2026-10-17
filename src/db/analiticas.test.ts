import { beforeEach, describe, expect, it } from 'vitest'
import { borrarAnalitica, estadoDe, evolucion, guardarAnalitica, listarAnaliticas, pruebasConHistoria, revisarAnalitica } from './analiticas'
import { guardarAdjuntos } from './adjuntos'
import { db } from './db'
import { crearPerfil } from './perfiles'
import type { ResultadoAnalisis } from './tipos'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

const r = (nombre: string, valor: number, extra: Partial<ResultadoAnalisis> = {}): ResultadoAnalisis => ({ nombre, valor, ...extra })

describe('guardar análisis', () => {
  it('guarda los números exactos, con sus unidades y referencias', async () => {
    const p = await crearPerfil({ nombre: 'Carmen', color: '#2e5c8a' })
    const id = await guardarAnalitica(p.id, {
      fecha: '2026-03-05',
      centro: ' Centro de prueba ',
      resultados: [
        r('Glucosa', 104, { clave: 'glucosa', unidad: 'mg/dl', refMin: 74, refMax: 100 }),
        r('Creatinina', 0.86, { clave: 'creatinina', unidad: 'mg/dl', refMin: 0.6, refMax: 1.3 }),
        r('CEA', 1.73, { clave: 'cea', comparador: '<', unidad: 'ng/ml', refMax: 5 }),
      ],
    })
    const a = await db.analiticas.get(id)
    expect(a?.centro).toBe('Centro de prueba')
    expect(a?.resultados.map((x) => x.valor)).toEqual([104, 0.86, 1.73])
    expect(a?.resultados[2].comparador).toBe('<')
  })

  it('no guarda si falta la fecha, un valor o la referencia está al revés', () => {
    expect(revisarAnalitica({ fecha: '', resultados: [r('Glucosa', 90)] })).toContain('fecha')
    expect(revisarAnalitica({ fecha: '2026-01-01', resultados: [] })).toContain('al menos un resultado')
    expect(revisarAnalitica({ fecha: '2026-01-01', resultados: [r('Glucosa', NaN)] })).toContain('Falta el valor')
    expect(revisarAnalitica({ fecha: '2026-01-01', resultados: [r('Glucosa', 90, { refMin: 100, refMax: 70 })] })).toContain('mayor que la máxima')
  })

  it('dice si cada resultado está dentro de lo normal', () => {
    expect(estadoDe(r('Glucosa', 104, { refMin: 74, refMax: 100 }))).toBe('alto')
    expect(estadoDe(r('HDL', 28, { refMin: 40 }))).toBe('bajo')
    expect(estadoDe(r('CEA', 1.73, { comparador: '<', refMax: 5 }))).toBe('normal')
    expect(estadoDe(r('INR', 2.5))).toBe('sin-referencia')
  })

  it('al borrar un análisis se borra la foto del informe', async () => {
    const p = await crearPerfil({ nombre: 'Carmen', color: '#2e5c8a' })
    const id = await guardarAnalitica(p.id, { fecha: '2026-03-05', resultados: [r('Glucosa', 90)] })
    await guardarAdjuntos(p.id, id, [{ clave: 'a', tipo: 'foto', nombre: 'informe', archivo: new Blob(['x'], { type: 'image/jpeg' }) }])
    await borrarAnalitica(id)
    expect(await db.analiticas.count()).toBe(0)
    expect(await db.adjuntos.count()).toBe(0)
  })
})

describe('evolución de una prueba', () => {
  it('junta la misma prueba de varios análisis, en orden de fecha', async () => {
    const p = await crearPerfil({ nombre: 'Carmen', color: '#2e5c8a' })
    await guardarAnalitica(p.id, { fecha: '2025-06-01', resultados: [r('Colesterol total', 215, { clave: 'colesterol-total', unidad: 'mg/dl', refMax: 200 })] })
    await guardarAnalitica(p.id, { fecha: '2024-01-10', resultados: [r('Colesterol', 230, { clave: 'colesterol-total', unidad: 'mg/dL', refMax: 200 })] })
    await guardarAnalitica(p.id, { fecha: '2026-03-05', resultados: [r('Colesterol total', 191, { clave: 'colesterol-total', unidad: 'mg/dl', refMax: 200 })] })

    const { puntos, unidad } = await evolucion(p.id, 'colesterol-total')
    expect(unidad).toBe('mg/dL')
    expect(puntos.map((x) => [x.fecha, x.valor, x.estado])).toEqual([
      ['2024-01-10', 230, 'alto'],
      ['2025-06-01', 215, 'alto'],
      ['2026-03-05', 191, 'normal'],
    ])
  })

  it('convierte unidades para no mezclar mmol/L con mg/dL', async () => {
    const p = await crearPerfil({ nombre: 'Carmen', color: '#2e5c8a' })
    await guardarAnalitica(p.id, { fecha: '2025-01-01', resultados: [r('Glucose', 5.5, { clave: 'glucosa', unidad: 'mmol/L', refMin: 3.9, refMax: 5.6 })] })
    await guardarAnalitica(p.id, { fecha: '2026-01-01', resultados: [r('Glucosa', 110, { clave: 'glucosa', unidad: 'mg/dL', refMin: 74, refMax: 100 })] })

    const { puntos } = await evolucion(p.id, 'glucosa')
    expect(puntos.map((x) => x.valor)).toEqual([99.1, 110])
    // La referencia también se convierte.
    expect(puntos[0].refMax).toBe(101)
    // Y se guarda cómo venía en el papel.
    expect(puntos[0].original).toBe('5.5 mmol/L')
  })

  it('si una unidad no se sabe convertir, no se mezcla en la gráfica', async () => {
    const p = await crearPerfil({ nombre: 'Carmen', color: '#2e5c8a' })
    await guardarAnalitica(p.id, { fecha: '2025-01-01', resultados: [r('Glucosa', 0.95, { clave: 'glucosa', unidad: 'g/L' })] })
    await guardarAnalitica(p.id, { fecha: '2026-01-01', resultados: [r('Glucosa', 95, { clave: 'glucosa', unidad: 'mg/dL' })] })

    const { puntos, sinConvertir } = await evolucion(p.id, 'glucosa')
    expect(puntos.map((x) => x.valor)).toEqual([95])
    expect(sinConvertir.map((x) => x.original)).toEqual(['0.95 g/L'])
  })

  it('las pruebas que no están en la lista también tienen evolución (por su nombre)', async () => {
    const p = await crearPerfil({ nombre: 'Carmen', color: '#2e5c8a' })
    await guardarAnalitica(p.id, { fecha: '2025-01-01', resultados: [r('Homocisteína', 12, { unidad: 'µmol/L' })] })
    await guardarAnalitica(p.id, { fecha: '2026-01-01', resultados: [r('homocisteina', 14, { unidad: 'µmol/L' })] })

    const pruebas = await pruebasConHistoria(p.id)
    expect(pruebas).toHaveLength(1)
    expect(pruebas[0]).toMatchObject({ veces: 2 })
    const { puntos, unidad } = await evolucion(p.id, pruebas[0].grupo)
    expect(puntos.map((x) => x.valor)).toEqual([12, 14])
    expect(unidad).toBe('µmol/L')
  })

  it('no mezcla % y número de la fórmula', async () => {
    const p = await crearPerfil({ nombre: 'Carmen', color: '#2e5c8a' })
    await guardarAnalitica(p.id, {
      fecha: '2026-01-01',
      resultados: [r('% Neutrófilos', 60, { clave: 'neutrofilos-pct', unidad: '%' }), r('# Neutrófilos', 3.1, { clave: 'neutrofilos-abs', unidad: '10e3/µL' })],
    })
    expect((await evolucion(p.id, 'neutrofilos-pct')).puntos.map((x) => x.valor)).toEqual([60])
    expect((await evolucion(p.id, 'neutrofilos-abs')).puntos.map((x) => x.valor)).toEqual([3.1])
  })

  it('lista de análisis, el más reciente primero', async () => {
    const p = await crearPerfil({ nombre: 'Carmen', color: '#2e5c8a' })
    await guardarAnalitica(p.id, { fecha: '2024-01-01', resultados: [r('Glucosa', 90)] })
    await guardarAnalitica(p.id, { fecha: '2026-01-01', resultados: [r('Glucosa', 95)] })
    expect((await listarAnaliticas(p.id)).map((a) => a.fecha)).toEqual(['2026-01-01', '2024-01-01'])
  })
})

describe('nota "en el informe"', () => {
  it('solo cuando la unidad se ha convertido de verdad', async () => {
    const p = await crearPerfil({ nombre: 'Carmen', color: '#2e5c8a' })
    await guardarAnalitica(p.id, { fecha: '2025-01-01', resultados: [r('Glucosa', 5.5, { clave: 'glucosa', unidad: 'mmol/L' })] })
    await guardarAnalitica(p.id, { fecha: '2026-01-01', resultados: [r('Glucosa', 95, { clave: 'glucosa', unidad: 'mg/dl' })] })
    const { puntos } = await evolucion(p.id, 'glucosa')
    expect(puntos.map((x) => x.convertido)).toEqual([true, false])
  })
})
