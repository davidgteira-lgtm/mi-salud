// Los dientes y lo que el dentista puede hacer en ellos.
// Numeración del dentista (FDI), la que sale en sus papeles:
// el primer número es la zona de la boca y el segundo, el diente desde el centro.
//   1 = arriba a tu derecha · 2 = arriba a tu izquierda
//   3 = abajo a tu izquierda · 4 = abajo a tu derecha
import type { TipoDental } from '../db/tipos'

export type EstadoDiente = 'sano' | 'caries' | 'empaste' | 'endodoncia' | 'corona' | 'falta' | 'implante' | 'protesis'

const NOMBRES = [
  'Incisivo central',
  'Incisivo lateral',
  'Colmillo',
  'Primer premolar',
  'Segundo premolar',
  'Primera muela',
  'Segunda muela',
  'Muela del juicio',
]

/** Ancho de cada diente, de delante (1) a atrás (8), para dibujarlos. */
export const ANCHO_DIENTE = [0.85, 0.72, 0.8, 0.78, 0.78, 1.15, 1.08, 1]

/** Los 32 dientes, de la muela del juicio de un lado a la del otro, como los dibuja el dentista. */
export const ARRIBA = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28]
export const ABAJO = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38]
export const TODOS_LOS_DIENTES = [...ARRIBA, ...ABAJO]

export function esDiente(n: number): boolean {
  return TODOS_LOS_DIENTES.includes(n)
}

/** "Colmillo de arriba, a tu derecha". */
export function nombreDiente(n: number): string {
  const zona = Math.floor(n / 10)
  const posicion = n % 10
  const arriba = zona === 1 || zona === 2
  const derecha = zona === 1 || zona === 4
  return `${NOMBRES[posicion - 1]} de ${arriba ? 'arriba' : 'abajo'}, a tu ${derecha ? 'derecha' : 'izquierda'}`
}

export interface InfoTipoDental {
  valor: TipoDental
  texto: string
  icono: string
  /** Cómo queda el diente después. Si no tiene, no cambia el dibujo. */
  estado?: EstadoDiente
  /** Si es para toda la boca (no hace falta elegir dientes). */
  boca?: boolean
}

export const TIPOS_DENTAL: InfoTipoDental[] = [
  { valor: 'revision', texto: 'Revisión', icono: '🔍', boca: true },
  { valor: 'limpieza', texto: 'Limpieza', icono: '✨', boca: true },
  { valor: 'caries', texto: 'Caries por arreglar', icono: '⚠️', estado: 'caries' },
  { valor: 'empaste', texto: 'Empaste', icono: '🦷', estado: 'empaste' },
  { valor: 'endodoncia', texto: 'Endodoncia (matar el nervio)', icono: '🦷', estado: 'endodoncia' },
  { valor: 'corona', texto: 'Funda o corona', icono: '👑', estado: 'corona' },
  { valor: 'extraccion', texto: 'Quitar un diente o me falta', icono: '➖', estado: 'falta' },
  { valor: 'implante', texto: 'Implante', icono: '🔩', estado: 'implante' },
  { valor: 'protesis', texto: 'Dentadura postiza', icono: '😁', estado: 'protesis' },
  { valor: 'ortodoncia', texto: 'Ortodoncia (aparato)', icono: '😬', boca: true },
  { valor: 'otro', texto: 'Otra cosa', icono: '📝' },
]

export function infoTipoDental(tipo: TipoDental): InfoTipoDental {
  return TIPOS_DENTAL.find((t) => t.valor === tipo) ?? TIPOS_DENTAL[TIPOS_DENTAL.length - 1]
}

export interface InfoEstado {
  texto: string
  /** Letra dentro del diente, para que no dependa solo del color. */
  letra: string
  relleno: string
  borde: string
}

export const ESTADOS_DIENTE: Record<EstadoDiente, InfoEstado> = {
  sano: { texto: 'Sano', letra: '', relleno: '#ffffff', borde: '#9fb1c3' },
  caries: { texto: 'Caries por arreglar', letra: '!', relleno: '#f8c9a6', borde: '#b5531d' },
  empaste: { texto: 'Empaste', letra: 'E', relleno: '#b4d5f3', borde: '#2a6fb0' },
  endodoncia: { texto: 'Endodoncia', letra: 'N', relleno: '#d9cbf2', borde: '#6a4fb0' },
  corona: { texto: 'Funda o corona', letra: 'C', relleno: '#f3e1a0', borde: '#94740c' },
  implante: { texto: 'Implante', letra: 'I', relleno: '#cdd6df', borde: '#4f6475' },
  protesis: { texto: 'Dentadura postiza', letra: 'P', relleno: '#ecdccd', borde: '#86684d' },
  falta: { texto: 'Falta', letra: '✕', relleno: 'none', borde: '#8c9aa8' },
}
