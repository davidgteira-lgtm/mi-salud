import { beforeEach, describe, expect, it } from 'vitest'
import { ABAJO, ARRIBA, nombreDiente, TODOS_LOS_DIENTES } from '../datos/dientes'
import { borrarDental, dentistasUsados, estadoDeLosDientes, guardarDental, historiaDelDiente, listarDental, revisarDental, ultimaRevision } from './dental'
import { db } from './db'
import { crearPerfil } from './perfiles'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

describe('los dientes', () => {
  it('hay 32, sin repetir', () => {
    expect(TODOS_LOS_DIENTES).toHaveLength(32)
    expect(new Set(TODOS_LOS_DIENTES).size).toBe(32)
    expect(ARRIBA[0]).toBe(18)
    expect(ABAJO.at(-1)).toBe(38)
  })

  it('se llaman como se entiende', () => {
    expect(nombreDiente(13)).toBe('Colmillo de arriba, a tu derecha')
    expect(nombreDiente(21)).toBe('Incisivo central de arriba, a tu izquierda')
    expect(nombreDiente(36)).toBe('Primera muela de abajo, a tu izquierda')
    expect(nombreDiente(48)).toBe('Muela del juicio de abajo, a tu derecha')
  })
})

const t = (fecha: string, tipo: Parameters<typeof estadoDeLosDientes>[0][number]['tipo'], dientes: number[], creadoEn = 0) => ({
  fecha,
  tipo,
  dientes,
  creadoEn,
})

describe('cómo está cada diente', () => {
  it('manda lo último que se hizo, sea cual sea el orden en que se apuntó', () => {
    const estados = estadoDeLosDientes([
      t('2025-03-01', 'empaste', [16]),
      t('2024-01-10', 'caries', [16, 26]),
      t('2025-06-01', 'endodoncia', [26]),
      t('2026-01-01', 'corona', [26]),
      t('2023-05-05', 'extraccion', [38]),
      t('2024-05-05', 'implante', [38]),
    ])
    expect(estados.get(16)).toBe('empaste')
    expect(estados.get(26)).toBe('corona')
    expect(estados.get(38)).toBe('implante')
    expect(estados.has(11)).toBe(false) // sano
  })

  it('las limpiezas y revisiones no cambian el dibujo', () => {
    const estados = estadoDeLosDientes([t('2024-01-10', 'caries', [16]), t('2025-01-10', 'limpieza', [])])
    expect(estados.get(16)).toBe('caries')
  })

  it('el mismo día, manda lo que se apuntó después', () => {
    const estados = estadoDeLosDientes([t('2025-01-10', 'empaste', [16], 2), t('2025-01-10', 'caries', [16], 1)])
    expect(estados.get(16)).toBe('empaste')
  })
})

describe('última revisión', () => {
  it('busca la última revisión o limpieza', () => {
    const lista = [t('2024-02-01', 'revision', []), t('2025-09-01', 'limpieza', []), t('2026-01-01', 'empaste', [16])]
    expect(ultimaRevision(lista, '2026-10-17')).toEqual({ fecha: '2025-09-01', haceMasDeUnAno: true })
    expect(ultimaRevision(lista, '2026-03-01')).toEqual({ fecha: '2025-09-01', haceMasDeUnAno: false })
    expect(ultimaRevision([t('2026-01-01', 'empaste', [16])])).toBeNull()
  })

  it('una revisión con cita para el futuro aún no cuenta', () => {
    expect(ultimaRevision([t('2026-12-01', 'revision', [])], '2026-10-17')).toBeNull()
  })
})

describe('guardar en la base de datos', () => {
  it('pide dientes cuando hacen falta y no cuando es toda la boca', () => {
    expect(revisarDental({ fecha: '2026-01-01', tipo: 'empaste', dientes: [] })).toContain('dientes')
    expect(revisarDental({ fecha: '2026-01-01', tipo: 'limpieza', dientes: [] })).toBeNull()
    expect(revisarDental({ fecha: '2026-01-01', tipo: 'empaste', dientes: [19] })).toContain('no existe')
    expect(revisarDental({ fecha: '', tipo: 'limpieza', dientes: [] })).toContain('fecha')
  })

  it('guarda, ordena y cuenta la historia de cada diente', async () => {
    const p = await crearPerfil({ nombre: 'Manuel', color: '#2e5c8a' })
    await guardarDental(p.id, { fecha: '2024-01-10', tipo: 'caries', dientes: [26, 16, 16], dentista: ' Clínica Sonrisa ' })
    const id = await guardarDental(p.id, { fecha: '2025-06-01', tipo: 'empaste', dientes: [16] })
    // Una limpieza con dientes marcados por error se guarda como toda la boca.
    await guardarDental(p.id, { fecha: '2025-09-01', tipo: 'limpieza', dientes: [11] })

    const lista = await listarDental(p.id)
    expect(lista.map((x) => x.tipo)).toEqual(['limpieza', 'empaste', 'caries'])
    expect(lista[2].dientes).toEqual([16, 26])
    expect(lista[0].dientes).toEqual([])
    expect(historiaDelDiente(lista, 16).map((x) => x.tipo)).toEqual(['empaste', 'caries'])
    expect(dentistasUsados(lista)).toEqual(['Clínica Sonrisa'])

    await borrarDental(id)
    expect(estadoDeLosDientes(await listarDental(p.id)).get(16)).toBe('caries')
  })
})

describe('lo pagado en el dentista', () => {
  it('lee importes escritos a la española', async () => {
    const { leerImporte } = await import('./dental')
    expect(leerImporte('85')).toBe(85)
    expect(leerImporte('85,50 €')).toBe(85.5)
    expect(leerImporte('1.200')).toBe(1200)
    expect(leerImporte('1.200,50')).toBe(1200.5)
    expect(leerImporte('')).toBeNull()
    expect(leerImporte('mucho')).toBeNaN()
  })

  it('suma el total y lo de un año', async () => {
    const { gastoDental } = await import('./dental')
    expect(gastoDental([{ fecha: '2025-03-01', importe: 60 }, { fecha: '2026-02-01', importe: 450 }, { fecha: '2026-06-01' }], 2026)).toEqual({
      total: 510,
      ano: 450,
    })
  })
})
