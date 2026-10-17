// Ayudas para trabajar con fechas, siempre en español.
import type { FechaISO } from '../db/tipos'

/** Comprueba que el texto es una fecha real en formato AAAA-MM-DD. */
export function esFechaValida(fecha: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha)
  if (!m) return false
  const [a, mes, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const f = new Date(Date.UTC(a, mes - 1, d))
  return f.getUTCFullYear() === a && f.getUTCMonth() === mes - 1 && f.getUTCDate() === d
}

/** Años cumplidos en la fecha indicada (por defecto, hoy). */
export function calcularEdad(nacimiento: FechaISO, hoy: Date = new Date()): number {
  if (!esFechaValida(nacimiento)) throw new Error(`Fecha no válida: ${nacimiento}`)
  const [a, m, d] = nacimiento.split('-').map(Number)
  let edad = hoy.getFullYear() - a
  const mesHoy = hoy.getMonth() + 1
  if (mesHoy < m || (mesHoy === m && hoy.getDate() < d)) edad--
  return edad
}

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

/** "1958-03-21" → "21 de marzo de 1958" */
export function fechaLarga(fecha: FechaISO): string {
  if (!esFechaValida(fecha)) return fecha
  const [a, m, d] = fecha.split('-').map(Number)
  return `${d} de ${MESES[m - 1]} de ${a}`
}

const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

/** "2026-10-20" → "lunes 20 de octubre" (con el año si no es el actual). */
export function fechaConDia(fecha: FechaISO, hoy: Date = new Date()): string {
  if (!esFechaValida(fecha)) return fecha
  const [a, m, d] = fecha.split('-').map(Number)
  const dia = DIAS_SEMANA[new Date(Date.UTC(a, m - 1, d)).getUTCDay()]
  return a === hoy.getFullYear() ? `${dia} ${d} de ${MESES[m - 1]}` : `${dia} ${d} de ${MESES[m - 1]} de ${a}`
}

/** Días de una fecha a otra (positivo si `hasta` es posterior). Sin líos de horas ni de cambio de hora. */
export function diasEntre(desde: FechaISO, hasta: FechaISO): number {
  const utc = (f: FechaISO) => {
    const [a, m, d] = f.split('-').map(Number)
    return Date.UTC(a, m - 1, d)
  }
  return Math.round((utc(hasta) - utc(desde)) / 86_400_000)
}

/** "Hoy", "Mañana", "En 5 días", "Hace 3 días"… */
export function cuandoFalta(fecha: FechaISO, hoy: FechaISO = hoyISO()): string {
  const n = diasEntre(hoy, fecha)
  if (n === 0) return 'Hoy'
  if (n === 1) return 'Mañana'
  if (n === 2) return 'Pasado mañana'
  if (n === -1) return 'Ayer'
  return n > 0 ? `En ${n} días` : `Hace ${-n} días`
}

/** Fecha de hoy en formato AAAA-MM-DD (hora local, no UTC). */
export function hoyISO(hoy: Date = new Date()): FechaISO {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${hoy.getFullYear()}-${p(hoy.getMonth() + 1)}-${p(hoy.getDate())}`
}
