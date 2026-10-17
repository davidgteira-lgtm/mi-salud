import { beforeEach, describe, expect, it } from 'vitest'
import { guardarMedida, listarMedidas, revisarMedida, textoValor, ultimasMedidas, type DatosMedida } from './constantes'
import { db } from './db'
import { crearPerfil } from './perfiles'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

const tension = (alta: number, baja: number, fecha = '2026-10-17', hora = '09:00'): DatosMedida => ({
  tipo: 'tension',
  fecha,
  hora,
  valor: alta,
  valor2: baja,
})

describe('revisar medidas antes de guardar (caza erratas)', () => {
  it('acepta medidas normales', () => {
    expect(revisarMedida(tension(135, 85))).toBeNull()
    expect(revisarMedida({ tipo: 'temperatura', fecha: '2026-10-17', valor: 36.7 })).toBeNull()
  })

  it('detecta la tensión al revés', () => {
    expect(revisarMedida(tension(80, 120))).toContain('al revés')
  })

  it('detecta valores imposibles', () => {
    expect(revisarMedida(tension(1350, 85))).toContain('no parece una tensión posible')
    expect(revisarMedida({ tipo: 'temperatura', fecha: '2026-10-17', valor: 367 })).toContain('no parece una temperatura')
    expect(revisarMedida({ tipo: 'peso', fecha: '2026-10-17', valor: 755 })).toContain('no parece un peso')
  })

  it('pide la tensión baja', () => {
    expect(revisarMedida({ tipo: 'tension', fecha: '2026-10-17', valor: 130 })).toContain('baja')
  })
})

describe('guardar y listar medidas', () => {
  it('lista de la más reciente a la más antigua, solo del tipo pedido', async () => {
    const p = await crearPerfil({ nombre: 'Carmen', color: '#2e5c8a' })
    await guardarMedida(p.id, tension(130, 80, '2026-10-15', '08:00'))
    await guardarMedida(p.id, tension(142, 88, '2026-10-17', '21:00'))
    await guardarMedida(p.id, tension(125, 78, '2026-10-17', '08:30'))
    await guardarMedida(p.id, { tipo: 'peso', fecha: '2026-10-17', valor: 72.4 })

    const lista = await listarMedidas(p.id, 'tension')
    expect(lista.map(textoValor)).toEqual(['Alta 142 · Baja 88', 'Alta 125 · Baja 78', 'Alta 130 · Baja 80'])
  })

  it('la última de cada tipo', async () => {
    const p = await crearPerfil({ nombre: 'Carmen', color: '#2e5c8a' })
    await guardarMedida(p.id, tension(130, 80, '2026-10-15'))
    await guardarMedida(p.id, tension(120, 75, '2026-10-16'))
    await guardarMedida(p.id, { tipo: 'peso', fecha: '2026-10-01', valor: 72.4 })

    const ultimas = await ultimasMedidas(p.id)
    expect(ultimas.tension && textoValor(ultimas.tension)).toBe('Alta 120 · Baja 75')
    expect(ultimas.peso && textoValor(ultimas.peso)).toBe('72,4')
    expect(ultimas.glucosa).toBeUndefined()
  })

  it('no guarda campos que no tocan (el pulso solo con la tensión, el momento solo con el azúcar)', async () => {
    const p = await crearPerfil({ nombre: 'Carmen', color: '#2e5c8a' })
    const id = await guardarMedida(p.id, { tipo: 'peso', fecha: '2026-10-17', valor: 72, pulso: 70, momento: 'ayunas' })
    const m = await db.constantes.get(id)
    expect(m?.pulso).toBeUndefined()
    expect(m?.momento).toBeUndefined()

    const g = await guardarMedida(p.id, { tipo: 'glucosa', fecha: '2026-10-17', valor: 95 })
    expect((await db.constantes.get(g))?.momento).toBe('otro')
  })

  it('guarda los decimales exactos', async () => {
    const p = await crearPerfil({ nombre: 'Carmen', color: '#2e5c8a' })
    const id = await guardarMedida(p.id, { tipo: 'temperatura', fecha: '2026-10-17', valor: 37.3 })
    expect((await db.constantes.get(id))?.valor).toBe(37.3)
  })
})

describe('el pulso que da el aparato de la tensión', () => {
  it('cuenta como un pulso más, junto a los pulsos apuntados aparte', async () => {
    const p = await crearPerfil({ nombre: 'Carmen', color: '#2e5c8a' })
    await guardarMedida(p.id, { ...tension(130, 80, '2026-10-15'), pulso: 68 })
    await guardarMedida(p.id, { tipo: 'pulso', fecha: '2026-10-16', hora: '10:00', valor: 75 })
    await guardarMedida(p.id, { ...tension(125, 78, '2026-10-17'), pulso: 82 })
    await guardarMedida(p.id, tension(128, 79, '2026-10-17', '20:00'))

    const pulsos = await listarMedidas(p.id, 'pulso')
    expect(pulsos.map((m) => [m.valor, Boolean(m.deTension)])).toEqual([
      [82, true],
      [75, false],
      [68, true],
    ])
    expect((await ultimasMedidas(p.id)).pulso?.valor).toBe(82)
    // La tensión sigue igual.
    expect((await listarMedidas(p.id, 'tension')).map((m) => m.pulso)).toEqual([undefined, 82, 68])
  })
})
