// Revisiones y vacunas que tocan según la edad y el sexo biológico, en España.
// Fuentes (revisadas en octubre de 2026):
// - Vacunas: Calendario común de vacunación a lo largo de toda la vida 2026,
//   Consejo Interterritorial del SNS (Ministerio de Sanidad).
// - Cáncer de mama, colon y cuello de útero: cartera común de cribados del SNS.
// - Tensión, colesterol y azúcar: recomendaciones de los médicos de familia (PAPPS, semFYC).
// Cada comunidad autónoma puede ampliar edades (por ejemplo, el colon hasta los 74):
// por eso cada persona puede quitar lo que no le toque o añadir lo suyo.
import type { Sexo } from '../db/tipos'

/** Con qué otros datos de la app se puede saber cuándo se hizo por última vez. */
export type Enlace = 'tension' | 'colesterol' | 'azucar' | 'dentista'

export interface Recomendacion {
  clave: string
  tipo: 'revision' | 'vacuna'
  nombre: string
  icono: string
  /** Qué es y cada cuánto, en palabras sencillas. */
  explicacion: string
  /** Solo para este sexo biológico. */
  sexo?: 'mujer' | 'hombre'
  /** Edad a la que empieza. Puede ser distinta en mujeres y hombres. */
  desde: number | { mujer: number; hombre: number }
  /** Última edad a la que toca (incluida). */
  hasta?: number
  /** Cada cuántos meses se repite, o 'temporada' (cada otoño), o 'una-vez'. */
  cada: number | ((edad: number) => number) | 'temporada' | 'una-vez'
  /** Dosis necesarias, si es una vacuna de varias dosis. */
  dosis?: number
  /** Meses entre dosis. */
  mesesEntreDosis?: number
  enlace?: Enlace
  fuente: string
}

const MINISTERIO = 'Calendario de vacunación 2026 del Ministerio de Sanidad'
const CRIBADOS = 'Programas de cribado del Sistema Nacional de Salud'
const PAPPS = 'Recomendaciones de los médicos de familia (PAPPS)'

export const RECOMENDACIONES: Recomendacion[] = [
  // ---------- Revisiones ----------
  {
    clave: 'tension',
    tipo: 'revision',
    nombre: 'Tomarte la tensión',
    icono: '🩺',
    explicacion: 'Cada 4 años hasta los 40 y cada 2 años a partir de los 40. Vale una medida en casa o en el centro de salud.',
    desde: 18,
    cada: (edad) => (edad >= 40 ? 24 : 48),
    enlace: 'tension',
    fuente: PAPPS,
  },
  {
    clave: 'colesterol',
    tipo: 'revision',
    nombre: 'Análisis del colesterol',
    icono: '🧪',
    explicacion: 'Cada 5 años hasta los 75. Suele venir en los análisis de sangre normales.',
    desde: { hombre: 35, mujer: 45 },
    hasta: 75,
    cada: 60,
    enlace: 'colesterol',
    fuente: PAPPS,
  },
  {
    clave: 'azucar',
    tipo: 'revision',
    nombre: 'Análisis del azúcar',
    icono: '🩸',
    explicacion: 'Cada 4 años a partir de los 45, para ver a tiempo si hay diabetes. Suele venir en los análisis de sangre normales.',
    desde: 45,
    cada: 48,
    enlace: 'azucar',
    fuente: PAPPS,
  },
  {
    clave: 'dentista',
    tipo: 'revision',
    nombre: 'Revisión del dentista',
    icono: '🦷',
    explicacion: 'Una vez al año, aunque no te duela nada.',
    desde: 18,
    cada: 12,
    enlace: 'dentista',
    fuente: 'Recomendación general de salud bucodental',
  },
  {
    clave: 'mama',
    tipo: 'revision',
    nombre: 'Mamografía',
    icono: '🎀',
    explicacion: 'Cada 2 años de los 50 a los 69. Te suelen llamar por carta desde el programa de tu comunidad.',
    sexo: 'mujer',
    desde: 50,
    hasta: 69,
    cada: 24,
    fuente: CRIBADOS,
  },
  {
    clave: 'cervix',
    tipo: 'revision',
    nombre: 'Prueba del cuello del útero',
    icono: '🌷',
    explicacion: 'De 25 a 34 años, citología cada 3 años. De 35 a 65, prueba del virus del papiloma (VPH) cada 5 años.',
    sexo: 'mujer',
    desde: 25,
    hasta: 65,
    cada: (edad) => (edad >= 35 ? 60 : 36),
    fuente: CRIBADOS,
  },
  {
    clave: 'colon',
    tipo: 'revision',
    nombre: 'Prueba de cáncer de colon',
    icono: '🔬',
    explicacion: 'Cada 2 años de los 50 a los 69: una prueba de sangre en las heces que se hace en casa. Algunas comunidades llegan hasta los 74.',
    desde: 50,
    hasta: 69,
    cada: 24,
    fuente: CRIBADOS,
  },

  // ---------- Vacunas ----------
  {
    clave: 'gripe',
    tipo: 'vacuna',
    nombre: 'Vacuna de la gripe',
    icono: '💉',
    explicacion: 'Una cada otoño a partir de los 60 años.',
    desde: 60,
    cada: 'temporada',
    fuente: MINISTERIO,
  },
  {
    clave: 'covid',
    tipo: 'vacuna',
    nombre: 'Vacuna del COVID',
    icono: '💉',
    explicacion: 'Una cada otoño a partir de los 70 años. La edad puede cambiar de un año a otro: tu centro de salud te lo dirá.',
    desde: 70,
    cada: 'temporada',
    fuente: MINISTERIO,
  },
  {
    clave: 'neumococo',
    tipo: 'vacuna',
    nombre: 'Vacuna del neumococo (neumonía)',
    icono: '💉',
    explicacion: 'Una sola vez, a partir de los 65 años.',
    desde: 65,
    cada: 'una-vez',
    fuente: MINISTERIO,
  },
  {
    clave: 'zoster',
    tipo: 'vacuna',
    nombre: 'Vacuna del herpes zóster (culebrilla)',
    icono: '💉',
    explicacion: 'Dos dosis separadas por al menos 2 meses, a partir de los 65 años.',
    desde: 65,
    cada: 'una-vez',
    dosis: 2,
    mesesEntreDosis: 2,
    fuente: MINISTERIO,
  },
  {
    clave: 'tetanos',
    tipo: 'vacuna',
    nombre: 'Vacuna del tétanos (recuerdo)',
    icono: '💉',
    explicacion:
      'Una dosis de recuerdo hacia los 65 años si te pusieron todas de pequeño. Si no lo sabes, pregunta en tu centro de salud: puede que necesites alguna más.',
    desde: 65,
    cada: 'una-vez',
    fuente: MINISTERIO,
  },
]

export function buscarRecomendacion(clave: string | undefined): Recomendacion | undefined {
  return RECOMENDACIONES.find((r) => r.clave === clave)
}

/** A qué edad empieza para esta persona. Si no se sabe el sexo, la edad más temprana. */
export function edadDeInicio(r: Recomendacion, sexo?: Sexo): number {
  if (typeof r.desde === 'number') return r.desde
  if (sexo === 'mujer') return r.desde.mujer
  if (sexo === 'hombre') return r.desde.hombre
  return Math.min(r.desde.mujer, r.desde.hombre)
}

/** Si es para esta persona por su sexo (sin saberlo, se enseña todo). */
export function esParaSuSexo(r: Recomendacion, sexo?: Sexo): boolean {
  return !r.sexo || !sexo || sexo === 'otro' || r.sexo === sexo
}
