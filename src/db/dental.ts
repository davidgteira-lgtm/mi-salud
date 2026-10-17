// Salud dental: lo que te han hecho en la boca y cómo está cada diente ahora.
import { esDiente, infoTipoDental, type EstadoDiente } from '../datos/dientes'
import { diasEntre, esFechaValida, hoyISO } from '../utils/fechas'
import { borrarAdjuntosDe } from './adjuntos'
import { db, nuevoId } from './db'
import type { TratamientoDental } from './tipos'

export type DatosDental = Pick<TratamientoDental, 'fecha' | 'tipo' | 'dientes' | 'dentista' | 'notas'>

export function revisarDental(d: DatosDental): string | null {
  if (!esFechaValida(d.fecha)) return 'Pon la fecha, por favor.'
  if (d.dientes.some((n) => !esDiente(n))) return 'Hay algún diente que no existe.'
  const info = infoTipoDental(d.tipo)
  if (info.estado && d.dientes.length === 0) return 'Toca en el dibujo los dientes en los que te lo hicieron.'
  return null
}

export async function guardarDental(perfilId: string, datos: DatosDental, id?: string): Promise<string> {
  const problema = revisarDental(datos)
  if (problema) throw new Error(problema)
  const texto = (t?: string) => t?.trim() || undefined
  const limpio: DatosDental = {
    fecha: datos.fecha,
    tipo: datos.tipo,
    // Para limpiezas, revisiones y ortodoncia es toda la boca.
    dientes: infoTipoDental(datos.tipo).boca ? [] : [...new Set(datos.dientes)].sort((a, b) => a - b),
    dentista: texto(datos.dentista),
    notas: texto(datos.notas),
  }
  const ahora = Date.now()
  if (id) {
    await db.dental.update(id, { ...limpio, actualizadoEn: ahora })
    return id
  }
  const nuevo: TratamientoDental = { ...limpio, id: nuevoId(), perfilId, creadoEn: ahora, actualizadoEn: ahora }
  await db.dental.add(nuevo)
  return nuevo.id
}

/** Lo borra junto con sus fotos, radiografías y notas de voz. */
export async function borrarDental(id: string): Promise<void> {
  await db.transaction('rw', db.dental, db.adjuntos, async () => {
    await borrarAdjuntosDe(id)
    await db.dental.delete(id)
  })
}

/** Todo lo apuntado, lo más reciente primero. */
export async function listarDental(perfilId: string): Promise<TratamientoDental[]> {
  const lista = await db.dental.where('perfilId').equals(perfilId).toArray()
  return lista.sort((a, b) => b.fecha.localeCompare(a.fecha) || b.creadoEn - a.creadoEn)
}

/** Cómo está cada diente ahora: manda lo último que se hizo en él. Los que no salen, están sanos. */
export function estadoDeLosDientes(lista: Pick<TratamientoDental, 'fecha' | 'tipo' | 'dientes' | 'creadoEn'>[]): Map<number, EstadoDiente> {
  const estados = new Map<number, EstadoDiente>()
  const orden = [...lista].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.creadoEn - b.creadoEn)
  for (const t of orden) {
    const estado = infoTipoDental(t.tipo).estado
    if (estado) for (const n of t.dientes) estados.set(n, estado)
  }
  return estados
}

/** Lo que se ha hecho en un diente, lo más reciente primero. */
export function historiaDelDiente(lista: TratamientoDental[], diente: number): TratamientoDental[] {
  return lista.filter((t) => t.dientes.includes(diente))
}

/** Fecha de la última revisión o limpieza, y si ya hace más de un año. */
export function ultimaRevision(
  lista: Pick<TratamientoDental, 'fecha' | 'tipo'>[],
  hoy: string = hoyISO(),
): { fecha: string; haceMasDeUnAno: boolean } | null {
  const fechas = lista.filter((t) => (t.tipo === 'revision' || t.tipo === 'limpieza') && t.fecha <= hoy).map((t) => t.fecha)
  if (fechas.length === 0) return null
  const fecha = fechas.sort().at(-1)!
  return { fecha, haceMasDeUnAno: diasEntre(fecha, hoy) > 365 }
}

/** Dentistas y clínicas ya usados, para no tener que escribirlos otra vez. */
export function dentistasUsados(lista: Pick<TratamientoDental, 'dentista'>[]): string[] {
  return [...new Set(lista.map((t) => t.dentista).filter((d): d is string => !!d))]
}
