// Las horas de la medicación: qué toma toca ahora y cuál es la siguiente.
// «Ahora» es la última toma cuya hora ya ha llegado: se ve «Tomada» o «Sin tomar» hasta que llega la siguiente.
import type { FechaISO, Medicamento, Momento } from '../db/tipos'
import { hoyISO } from './fechas'
import { sumarDias } from './ciclos'

/** Hora habitual de cada momento, para los medicamentos que se apuntaron con «desayuno», «cena»… */
export const HORA_DE_MOMENTO: Record<Momento, string> = {
  desayuno: '08:00',
  comida: '14:00',
  cena: '21:00',
  acostarse: '23:00',
}

export const esHora = (h: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(h)

/** Las horas de un medicamento, ordenadas y sin repetir. */
export function horasDe(m: Pick<Medicamento, 'horas' | 'momentos'>): string[] {
  const horas = m.horas?.length ? m.horas : m.momentos.map((x) => HORA_DE_MOMENTO[x])
  return [...new Set(horas.filter(esHora))].sort()
}

export interface MomentoToma {
  fecha: FechaISO
  hora: string
}

const horaDe = (ahora: Date) => `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`

/** La toma que toca ahora (la última cuya hora ya ha pasado). Antes de la primera del día, la última de ayer. */
export function tomaActual(horas: string[], ahora: Date = new Date()): MomentoToma | null {
  if (horas.length === 0) return null
  const hoy = hoyISO(ahora)
  const ya = horas.filter((h) => h <= horaDe(ahora))
  if (ya.length > 0) return { fecha: hoy, hora: ya.at(-1)! }
  return { fecha: sumarDias(hoy, -1), hora: horas.at(-1)! }
}

/** La siguiente toma (hoy más tarde, o la primera de mañana). */
export function siguienteToma(horas: string[], ahora: Date = new Date()): MomentoToma | null {
  if (horas.length === 0) return null
  const hoy = hoyISO(ahora)
  const luego = horas.find((h) => h > horaDe(ahora))
  return luego ? { fecha: hoy, hora: luego } : { fecha: sumarDias(hoy, 1), hora: horas[0] }
}

/** «hoy a las 08:00», «anoche a las 21:00», «mañana a las 08:00». */
export function cuandoEs(t: MomentoToma, ahora: Date = new Date()): string {
  const hoy = hoyISO(ahora)
  if (t.fecha === hoy) return `hoy a las ${t.hora}`
  // «Anoche» solo tiene sentido de madrugada o por la mañana; por la tarde se dice «ayer».
  if (t.fecha === sumarDias(hoy, -1)) return `${t.hora >= '20:00' && ahora.getHours() < 12 ? 'anoche' : 'ayer'} a las ${t.hora}`
  if (t.fecha === sumarDias(hoy, 1)) return `mañana a las ${t.hora}`
  return `el ${t.fecha} a las ${t.hora}`
}
