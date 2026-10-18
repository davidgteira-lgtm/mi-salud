import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import { borrarOcular, dioptrias, explicarOjo, guardarOcular, listarOcular, presionAlta, revisarOcular } from './ojos'
import { borrarPerfil, crearPerfil } from './perfiles'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

const base = { fecha: '2026-05-10', tipo: 'gafas' as const, derecho: {}, izquierdo: {} }

describe('salud ocular', () => {
  it('lo explica con palabras', () => {
    expect(explicarOjo({ esfera: -2.25 })).toBe('Miopía de 2,25')
    expect(explicarOjo({ esfera: 1.5, adicion: 2 })).toBe('Hipermetropía de 1,50 y vista cansada (+2,00)')
    expect(explicarOjo({ esfera: -1, cilindro: -0.75, eje: 90 })).toBe('Miopía de 1,00 y astigmatismo de 0,75 a 90°')
    expect(explicarOjo({ esfera: 0 })).toBe('Sin graduación')
    expect(dioptrias(-2.25)).toBe('−2,25')
    expect(dioptrias(0.5)).toBe('+0,50')
  })

  it('caza erratas', () => {
    expect(revisarOcular(base)).toContain('al menos')
    expect(revisarOcular({ ...base, derecho: { esfera: -2.3 } })).toContain('0,25 en 0,25')
    expect(revisarOcular({ ...base, derecho: { esfera: -45 } })).toContain('no parece correcto')
    expect(revisarOcular({ ...base, izquierdo: { eje: 200 } })).toContain('izquierdo')
    expect(revisarOcular({ ...base, izquierdo: { eje: 90.5 } })).toContain('sin decimales')
    expect(revisarOcular({ ...base, derecho: { esfera: -2.25, cilindro: -0.5, eje: 180, agudeza: 0.9, presion: 15 } })).toBeNull()
  })

  it('avisa si la presión del ojo está alta', () => {
    expect(presionAlta({ derecho: { presion: 24 }, izquierdo: { presion: 18 } })).toBe(true)
    expect(presionAlta({ derecho: { presion: 16 }, izquierdo: {} })).toBe(false)
  })

  it('guarda, ordena y se borra con la persona', async () => {
    const p = await crearPerfil({ nombre: 'Lucía', color: '#2e5c8a' })
    await guardarOcular(p.id, { ...base, fecha: '2020-01-10', derecho: { esfera: -1.5 }, izquierdo: { esfera: -1.25 }, donde: ' Óptica ' })
    const id = await guardarOcular(p.id, { ...base, derecho: { esfera: -2 }, izquierdo: { esfera: -1.75 } })
    expect((await listarOcular(p.id)).map((r) => r.fecha)).toEqual(['2026-05-10', '2020-01-10'])
    expect((await listarOcular(p.id))[1].donde).toBe('Óptica')
    await borrarOcular(id)
    expect(await listarOcular(p.id)).toHaveLength(1)
    await borrarPerfil(p.id)
    expect(await db.ojos.count()).toBe(0)
  })
})
