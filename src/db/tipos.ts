// Aquí se describe "la forma" de cada dato que guarda la app.
// TypeScript usa estas descripciones para avisar si algo no encaja
// (por ejemplo, si alguien intenta guardar la tensión como texto).

/** Fecha en formato AAAA-MM-DD, por ejemplo "1958-03-21". */
export type FechaISO = string

export type Sexo = 'mujer' | 'hombre' | 'otro'

/** Una persona que usa la app (tú, tu madre…). Cada una tiene sus datos aparte. */
export interface Perfil {
  id: string
  nombre: string
  fechaNacimiento?: FechaISO
  sexo?: Sexo
  /** Foto de la cara, guardada dentro del móvil. */
  foto?: Blob
  /** Color con el que se distingue a la persona en la app. */
  color: string
  creadoEn: number
}

/** Campos que comparten todos los registros médicos. */
export interface RegistroBase {
  id: string
  /** A qué persona pertenece este registro. */
  perfilId: string
  creadoEn: number
  actualizadoEn: number
}

/** Archivo adjunto: foto, documento o nota de voz. */
export interface Adjunto extends RegistroBase {
  /** Registro al que va unido (una cita, un informe…), si lo hay. */
  registroId?: string
  tipo: 'foto' | 'documento' | 'voz'
  nombre: string
  archivo: Blob
  /** Si la IA ya lo ha leído o está pendiente (por ejemplo, porque no había internet). */
  analisis: 'pendiente' | 'hecho' | 'no'
}

export type TipoContacto = 'centro-salud' | 'medico' | 'hospital' | 'farmacia' | 'otro'

/** Un teléfono de un centro médico, médico, hospital… para llamar con un toque. */
export interface Contacto extends RegistroBase {
  tipo: TipoContacto
  nombre: string
  /** Tal como lo escribió la persona; para llamar se limpia (ver utils/telefono). */
  telefono: string
  direccion?: string
}

/** Tablas de la base de datos que pertenecen a un perfil. */
export const TABLAS_DE_PERFIL = [
  'medicamentos',
  'citas',
  'historial',
  'analiticas',
  'revisiones',
  'dental',
  'constantes',
  'alergias',
  'adjuntos',
  'fichas',
  'telefonos',
] as const

export type TablaDePerfil = (typeof TABLAS_DE_PERFIL)[number]
