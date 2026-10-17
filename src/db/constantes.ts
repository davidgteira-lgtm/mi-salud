// Guardar las medidas de constantes vitales de cada persona.
import { infoConstante, TENSION_BAJA } from '../datos/constantes'
import { esFechaValida } from '../utils/fechas'
import { formatearNumero } from '../utils/numeros'
import { db, nuevoId } from './db'
import type { Medida, TipoConstante } from './tipos'

export type DatosMedida = Pick<Medida, 'tipo' | 'fecha' | 'hora' | 'valor' | 'valor2' | 'pulso' | 'momento' | 'notas'>

/** Comprueba que la medida tiene sentido (para cazar erratas antes de guardar). */
export function revisarMedida(d: DatosMedida): string | null {
  const info = infoConstante(d.tipo)
  if (!esFechaValida(d.fecha)) return 'Pon la fecha, por favor.'
  if (!Number.isFinite(d.valor)) return 'Escribe el valor, por favor.'
  if (d.valor < info.minimo || d.valor > info.maximo) {
    return `${formatearNumero(d.valor)} no parece ${info.queEs} posible. Revisa que esté bien escrito.`
  }
  if (d.tipo === 'tension') {
    if (d.valor2 === undefined || !Number.isFinite(d.valor2)) return 'Escribe también la tensión baja.'
    if (d.valor2 < TENSION_BAJA.minimo || d.valor2 > TENSION_BAJA.maximo) return `${d.valor2} no parece una tensión baja posible.`
    if (d.valor2 >= d.valor) return 'La tensión alta tiene que ser mayor que la baja. ¿Están al revés?'
  }
  if (d.pulso !== undefined && (d.pulso < 25 || d.pulso > 250)) return `${d.pulso} no parece un pulso posible.`
  return null
}

export async function guardarMedida(perfilId: string, datos: DatosMedida, id?: string): Promise<string> {
  const problema = revisarMedida(datos)
  if (problema) throw new Error(problema)
  const limpio: DatosMedida = {
    tipo: datos.tipo,
    fecha: datos.fecha,
    hora: datos.hora || undefined,
    valor: datos.valor,
    valor2: datos.tipo === 'tension' ? datos.valor2 : undefined,
    pulso: datos.tipo === 'tension' ? datos.pulso : undefined,
    momento: datos.tipo === 'glucosa' ? (datos.momento ?? 'otro') : undefined,
    notas: datos.notas?.trim() || undefined,
  }
  const ahora = Date.now()
  if (id) {
    await db.constantes.update(id, { ...limpio, actualizadoEn: ahora })
    return id
  }
  const nueva: Medida = { ...limpio, id: nuevoId(), perfilId, creadoEn: ahora, actualizadoEn: ahora }
  await db.constantes.add(nueva)
  return nueva.id
}

export function borrarMedida(id: string): Promise<void> {
  return db.constantes.delete(id)
}

const momento = (m: Medida) => `${m.fecha} ${m.hora ?? '00:00'}`

/** Una medida tal como se enseña. Si es un pulso sacado de una tensión, lo indica. */
export type MedidaVista = Medida & { deTension?: boolean }

/**
 * Todas las medidas, más los pulsos que se apuntaron junto a la tensión
 * (el aparato de la tensión también da el pulso: cuenta como un pulso más).
 */
async function todasConPulsos(perfilId: string): Promise<MedidaVista[]> {
  const todas = await db.constantes.where('perfilId').equals(perfilId).toArray()
  const pulsos: MedidaVista[] = todas
    .filter((m) => m.tipo === 'tension' && m.pulso !== undefined)
    .map((m) => ({ ...m, tipo: 'pulso', valor: m.pulso!, valor2: undefined, pulso: undefined, deTension: true }))
  return [...todas, ...pulsos]
}

/** Las medidas de un tipo, la más reciente primero. */
export async function listarMedidas(perfilId: string, tipo: TipoConstante): Promise<MedidaVista[]> {
  const todas = await todasConPulsos(perfilId)
  return todas.filter((m) => m.tipo === tipo).sort((a, b) => momento(b).localeCompare(momento(a)) || b.creadoEn - a.creadoEn)
}

/** La última medida de cada tipo (para las fichas de arriba). */
export async function ultimasMedidas(perfilId: string): Promise<Partial<Record<TipoConstante, MedidaVista>>> {
  const todas = await todasConPulsos(perfilId)
  const ultimas: Partial<Record<TipoConstante, MedidaVista>> = {}
  for (const m of todas) {
    const actual = ultimas[m.tipo]
    if (!actual || momento(m) > momento(actual) || (momento(m) === momento(actual) && m.creadoEn > actual.creadoEn)) {
      ultimas[m.tipo] = m
    }
  }
  return ultimas
}

/** "Alta 135 · Baja 85", "72", "75,5"… */
export function textoValor(m: Pick<Medida, 'tipo' | 'valor' | 'valor2'>): string {
  if (m.tipo === 'tension') return `Alta ${m.valor} · Baja ${m.valor2}`
  return formatearNumero(m.valor, infoConstante(m.tipo).decimales)
}
