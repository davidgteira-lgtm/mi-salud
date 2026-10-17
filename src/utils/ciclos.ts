// Cálculos de la regla: cuánto dura, cada cuánto viene, cuándo toca la próxima
// y si una fecha cae durante la regla (para relacionarlo con otros problemas de salud).
import type { Ciclo, FechaISO, Perfil } from '../db/tipos'
import { diasEntre, hoyISO } from './fechas'

export const SINTOMAS_REGLA = ['Dolor', 'Migraña', 'Cansancio', 'Hinchazón', 'Cambios de ánimo', 'Mareos']

/** Si a esta persona se le enseña la regla: nunca a los hombres; a las mujeres sí, salvo que lo quiten;
 *  a quien prefiere no decir su sexo, solo si lo activa. */
export function muestraRegla(p: Pick<Perfil, 'sexo' | 'apuntarRegla'> | undefined): boolean {
  if (!p || p.sexo === 'hombre') return false
  return p.apuntarRegla ?? p.sexo === 'mujer'
}

/** Si no se apuntó el día que acabó, se cuenta que dura 5 días. */
const DURACION_SI_NO_SE_SABE = 5

/** Suma días a una fecha: "2026-10-30" + 3 → "2026-11-02". */
export function sumarDias(fecha: FechaISO, dias: number): FechaISO {
  const [a, m, d] = fecha.split('-').map(Number)
  const f = new Date(Date.UTC(a, m - 1, d + dias))
  return `${f.getUTCFullYear()}-${String(f.getUTCMonth() + 1).padStart(2, '0')}-${String(f.getUTCDate()).padStart(2, '0')}`
}

/** Días que duró la regla (contando el primero y el último), o null si aún no acabó. */
export function duracionRegla(c: Pick<Ciclo, 'inicio' | 'fin'>): number | null {
  return c.fin ? diasEntre(c.inicio, c.fin) + 1 : null
}

/** ¿Esta fecha cae durante alguna regla? */
export function conLaRegla(fecha: FechaISO, ciclos: Pick<Ciclo, 'inicio' | 'fin'>[]): boolean {
  return ciclos.some((c) => fecha >= c.inicio && fecha <= (c.fin ?? sumarDias(c.inicio, DURACION_SI_NO_SE_SABE - 1)))
}

export interface ResumenCiclos {
  ultimo: Pick<Ciclo, 'inicio' | 'fin'>
  /** Día del ciclo hoy (el día que empezó la última regla es el día 1). */
  diaDelCiclo: number
  /** Si la última regla sigue en curso. */
  enCurso: boolean
  /** Días entre el comienzo de una regla y el de la siguiente. */
  longitudes: number[]
  /** Media de los últimos ciclos (hasta 6), o null si aún no hay ninguno completo. */
  media: number | null
  /** Si los últimos ciclos cambian mucho de unos a otros (más de 7 días). */
  irregular: boolean
  /** Fecha aproximada de la próxima regla. */
  proxima: FechaISO | null
}

export function resumirCiclos(ciclos: Pick<Ciclo, 'inicio' | 'fin'>[], hoy: FechaISO = hoyISO()): ResumenCiclos | null {
  const orden = [...ciclos].sort((a, b) => a.inicio.localeCompare(b.inicio))
  if (orden.length === 0) return null
  const ultimo = orden[orden.length - 1]
  const longitudes = orden.slice(1).map((c, i) => diasEntre(orden[i].inicio, c.inicio))
  const recientes = longitudes.slice(-6)
  const media = recientes.length ? Math.round(recientes.reduce((s, n) => s + n, 0) / recientes.length) : null
  const irregular = recientes.length >= 2 && Math.max(...recientes) - Math.min(...recientes) > 7
  const finUltimo = ultimo.fin ?? sumarDias(ultimo.inicio, DURACION_SI_NO_SE_SABE - 1)
  return {
    ultimo,
    diaDelCiclo: diasEntre(ultimo.inicio, hoy) + 1,
    enCurso: hoy >= ultimo.inicio && hoy <= finUltimo,
    longitudes,
    media,
    irregular,
    proxima: media ? sumarDias(ultimo.inicio, media) : null,
  }
}
