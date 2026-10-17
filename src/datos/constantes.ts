// Las constantes vitales: qué se mide, en qué unidad, qué valores son posibles
// y cuándo un valor está bien o conviene vigilarlo.
//
// IMPORTANTE: orientativo. Tu médico puede haberte dado otros objetivos.
// Tensión: clasificación de la Sociedad Europea de Hipertensión (ESH 2023).
import type { Medida, TipoConstante } from '../db/tipos'

export interface InfoConstante {
  tipo: TipoConstante
  nombre: string
  icono: string
  unidad: string
  /** Límites para cazar erratas al escribir (no son límites "sanos"). */
  minimo: number
  maximo: number
  /** Cómo se dice al comprobarlo: "una temperatura". */
  queEs: string
  decimales: number
}

export const CONSTANTES: InfoConstante[] = [
  // La tensión se mide en mmHg, pero no se enseña la unidad: se dice «Alta» y «Baja», como habla la gente.
  { tipo: 'tension', nombre: 'Tensión', icono: '🩺', unidad: '', minimo: 50, maximo: 260, queEs: 'una tensión', decimales: 0 },
  { tipo: 'pulso', nombre: 'Pulso', icono: '💓', unidad: 'latidos por minuto', minimo: 25, maximo: 250, queEs: 'un pulso', decimales: 0 },
  { tipo: 'peso', nombre: 'Peso', icono: '⚖️', unidad: 'kg', minimo: 2, maximo: 350, queEs: 'un peso', decimales: 1 },
  { tipo: 'glucosa', nombre: 'Azúcar', icono: '🩸', unidad: 'mg/dL', minimo: 10, maximo: 800, queEs: 'un azúcar', decimales: 0 },
  { tipo: 'saturacion', nombre: 'Oxígeno', icono: '🫁', unidad: '%', minimo: 50, maximo: 100, queEs: 'un oxígeno', decimales: 0 },
  { tipo: 'temperatura', nombre: 'Temperatura', icono: '🌡️', unidad: '°C', minimo: 32, maximo: 44, queEs: 'una temperatura', decimales: 1 },
]

/** Límites para la tensión baja (la alta usa los de la tabla). */
export const TENSION_BAJA = { minimo: 30, maximo: 160 }

export function infoConstante(tipo: TipoConstante): InfoConstante {
  return CONSTANTES.find((c) => c.tipo === tipo)!
}

/** bien = verde; atencion = vigilar; alto/bajo = fuera de lo normal; urgente = consulta pronto. */
export type Nivel = 'bien' | 'atencion' | 'fuera' | 'urgente'

export interface Valoracion {
  nivel: Nivel
  texto: string
  /** Consejo corto, solo cuando hace falta. */
  consejo?: string
}

const CONSULTA_HOY = 'Si te encuentras mal, llama a tu centro de salud o al 112.'

/** Dice si una medida está bien, con palabras sencillas. El peso no se valora. */
export function valorar(m: Pick<Medida, 'tipo' | 'valor' | 'valor2' | 'momento'>): Valoracion | null {
  const v = m.valor
  switch (m.tipo) {
    case 'tension': {
      const alta = v
      const baja = m.valor2 ?? 0
      if (alta >= 180 || baja >= 110) return { nivel: 'urgente', texto: 'Muy alta', consejo: CONSULTA_HOY }
      if (alta >= 140 || baja >= 90) return { nivel: 'fuera', texto: 'Alta' }
      if (alta < 90 || baja < 60) return { nivel: 'atencion', texto: 'Baja' }
      if (alta >= 130 || baja >= 85) return { nivel: 'atencion', texto: 'Normal-alta' }
      if (alta >= 120 || baja >= 80) return { nivel: 'bien', texto: 'Normal' }
      return { nivel: 'bien', texto: 'Óptima' }
    }
    case 'pulso':
      if (v < 50) return { nivel: 'atencion', texto: 'Bajo' }
      if (v > 120) return { nivel: 'fuera', texto: 'Muy alto' }
      if (v > 100) return { nivel: 'atencion', texto: 'Alto' }
      return { nivel: 'bien', texto: 'Normal' }
    case 'saturacion':
      if (v < 92) return { nivel: 'urgente', texto: 'Baja', consejo: CONSULTA_HOY }
      if (v < 95) return { nivel: 'atencion', texto: 'Algo baja' }
      return { nivel: 'bien', texto: 'Normal' }
    case 'temperatura':
      if (v < 35) return { nivel: 'fuera', texto: 'Baja' }
      if (v >= 39.5) return { nivel: 'fuera', texto: 'Fiebre alta' }
      if (v >= 38) return { nivel: 'fuera', texto: 'Fiebre' }
      if (v >= 37.3) return { nivel: 'atencion', texto: 'Febrícula' }
      return { nivel: 'bien', texto: 'Normal' }
    case 'glucosa': {
      if (v < 54) return { nivel: 'urgente', texto: 'Muy baja', consejo: CONSULTA_HOY }
      if (v < 70) return { nivel: 'fuera', texto: 'Baja' }
      if (v >= 300) return { nivel: 'urgente', texto: 'Muy alta', consejo: CONSULTA_HOY }
      if (m.momento === 'ayunas') {
        if (v >= 126) return { nivel: 'fuera', texto: 'Alta' }
        if (v >= 100) return { nivel: 'atencion', texto: 'Algo alta' }
        return { nivel: 'bien', texto: 'Normal' }
      }
      if (v >= 200) return { nivel: 'fuera', texto: 'Alta' }
      if (v >= 140) return { nivel: 'atencion', texto: 'Algo alta' }
      return { nivel: 'bien', texto: 'Normal' }
    }
    case 'peso':
      return null
  }
}

/** Zona "normal" para pintarla en la gráfica. */
export function zonaNormal(tipo: TipoConstante): { min: number; max: number } | null {
  switch (tipo) {
    case 'pulso':
      return { min: 50, max: 100 }
    case 'saturacion':
      return { min: 95, max: 100 }
    case 'temperatura':
      return { min: 35, max: 37.2 }
    case 'glucosa':
      return { min: 70, max: 140 }
    default:
      return null
  }
}

/**
 * Mucha gente dice la tensión en centímetros: "13 de alta y 8 de baja" es 130/80.
 * Si el número escrito encaja así, devuelve el valor en la medida del aparato.
 */
export function tensionEnCentimetros(valor: number, cual: 'alta' | 'baja'): number | null {
  const [minimo, maximo] = cual === 'alta' ? [8, 26] : [4, 16]
  return valor >= minimo && valor <= maximo ? Math.round(valor * 10) : null
}
