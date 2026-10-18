// Bajas médicas (incapacidad temporal): la baja, sus partes de confirmación y el alta.
import { diasEntre, esFechaValida, hoyISO } from '../utils/fechas'
import { borrarAdjuntosDe } from './adjuntos'
import { db, nuevoId } from './db'
import type { Baja, FechaISO, TipoAlta, TipoBaja } from './tipos'

export type DatosBaja = Pick<
  Baja,
  'inicio' | 'fin' | 'tipo' | 'motivo' | 'diagnostico' | 'medico' | 'centro' | 'empresa' | 'confirmaciones' | 'tipoAlta' | 'notas'
>

export const TIPOS_BAJA: { valor: TipoBaja; texto: string }[] = [
  { valor: 'comun', texto: 'Enfermedad común' },
  { valor: 'accidente-no-laboral', texto: 'Accidente no laboral' },
  { valor: 'accidente-laboral', texto: 'Accidente de trabajo' },
  { valor: 'enfermedad-profesional', texto: 'Enfermedad profesional' },
]

export const TIPOS_ALTA: { valor: TipoAlta; texto: string }[] = [
  { valor: 'curacion', texto: 'Curación' },
  { valor: 'mejoria', texto: 'Mejoría (puede volver a trabajar)' },
  { valor: 'inspeccion', texto: 'Por la inspección médica' },
  { valor: 'incapacidad', texto: 'Propuesta de incapacidad permanente' },
  { valor: 'otra', texto: 'Otro motivo' },
]

export function revisarBaja(d: DatosBaja): string | null {
  if (!esFechaValida(d.inicio)) return 'Pon el día en que empezó la baja.'
  if (!d.motivo.trim()) return 'Escribe el motivo de la baja, por ejemplo «Lumbalgia».'
  if (d.fin) {
    if (!esFechaValida(d.fin)) return 'El día del alta no es una fecha válida.'
    if (d.fin < d.inicio) return 'El alta no puede ser antes de la baja.'
  }
  for (const c of d.confirmaciones) {
    if (!esFechaValida(c)) return 'Hay un parte de confirmación sin fecha válida.'
    if (c < d.inicio) return 'Un parte de confirmación no puede ser antes de la baja.'
    if (d.fin && c > d.fin) return 'Un parte de confirmación no puede ser después del alta.'
  }
  return null
}

export async function guardarBaja(perfilId: string, datos: DatosBaja, id?: string): Promise<string> {
  const problema = revisarBaja(datos)
  if (problema) throw new Error(problema)
  const texto = (t?: string) => t?.trim() || undefined
  const limpio: DatosBaja = {
    inicio: datos.inicio,
    fin: datos.fin || undefined,
    tipo: datos.tipo,
    motivo: datos.motivo.trim(),
    diagnostico: texto(datos.diagnostico),
    medico: texto(datos.medico),
    centro: texto(datos.centro),
    empresa: texto(datos.empresa),
    confirmaciones: [...new Set(datos.confirmaciones)].sort(),
    tipoAlta: datos.fin ? datos.tipoAlta : undefined,
    notas: texto(datos.notas),
  }
  const ahora = Date.now()
  if (id) {
    await db.bajas.update(id, { ...limpio, actualizadoEn: ahora })
    return id
  }
  const nueva: Baja = { ...limpio, id: nuevoId(), perfilId, creadoEn: ahora, actualizadoEn: ahora }
  await db.bajas.add(nueva)
  return nueva.id
}

/** «Me han dado el alta». */
export async function darAlta(id: string, fin: FechaISO, tipoAlta: TipoAlta): Promise<void> {
  const b = await db.bajas.get(id)
  if (!b) return
  const problema = revisarBaja({ ...b, fin })
  if (problema) throw new Error(problema)
  await db.bajas.update(id, { fin, tipoAlta, actualizadoEn: Date.now() })
}

export async function borrarBaja(id: string): Promise<void> {
  await db.transaction('rw', db.bajas, db.adjuntos, async () => {
    await borrarAdjuntosDe(id)
    await db.bajas.delete(id)
  })
}

/** Las bajas, la más reciente primero. */
export async function listarBajas(perfilId: string): Promise<Baja[]> {
  const lista = await db.bajas.where('perfilId').equals(perfilId).toArray()
  return lista.sort((a, b) => b.inicio.localeCompare(a.inicio) || b.creadoEn - a.creadoEn)
}

/** Días de baja, contando el primero y el último (si sigue de baja, hasta hoy). */
export function diasDeBaja(b: Pick<Baja, 'inicio' | 'fin'>, hoy: FechaISO = hoyISO()): number {
  return diasEntre(b.inicio, b.fin ?? hoy) + 1
}

/** Días de baja dentro de un año (las que cruzan de un año a otro cuentan solo su parte). */
export function diasEnElAno(bajas: Pick<Baja, 'inicio' | 'fin'>[], ano: number, hoy: FechaISO = hoyISO()): number {
  const desde = `${ano}-01-01`
  const hasta = `${ano}-12-31`
  let total = 0
  for (const b of bajas) {
    const ini = b.inicio > desde ? b.inicio : desde
    const finReal = b.fin ?? hoy
    const fin = finReal < hasta ? finReal : hasta
    if (fin >= ini) total += diasEntre(ini, fin) + 1
  }
  return total
}

/** La baja que sigue abierta (sin alta), si la hay. */
export function bajaEnCurso<T extends Pick<Baja, 'fin'>>(bajas: T[]): T | undefined {
  return bajas.find((b) => !b.fin)
}
