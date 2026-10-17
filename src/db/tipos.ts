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
  /** Si quiere llevar el control de la regla (si no se ha dicho, sí para las mujeres). */
  apuntarRegla?: boolean
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

export type Gravedad = 'leve' | 'moderada' | 'grave' | 'desconocida'

/** Una alergia o intolerancia a un medicamento, un alimento u otra cosa. */
export interface Alergia extends RegistroBase {
  tipo: 'medicamento' | 'alimento' | 'otro'
  clase: 'alergia' | 'intolerancia'
  nombre: string
  gravedad: Gravedad
  /** Qué le pasó: "ronchas", "se me hinchó la cara"… */
  reaccion?: string
  desde?: FechaISO
}

export type Momento = 'desayuno' | 'comida' | 'cena' | 'acostarse'

/** Un medicamento que se toma ahora (activo = 1) o que se tomó antes (activo = 0). */
export interface Medicamento extends RegistroBase {
  nombre: string
  /** Cuánto se toma: "1 comprimido de 500 mg". */
  dosis?: string
  momentos: Momento[]
  /** Si no encaja en los momentos: "cada 8 horas", "los lunes"… */
  otroHorario?: string
  paraQue?: string
  familia?: string
  fechaInicio?: FechaISO
  fechaFin?: FechaISO
  /** 1 = lo toma ahora; 0 = lo tomó antes. (Número y no sí/no porque la base de datos busca por él.) */
  activo: 0 | 1
  notas?: string
}

/** Una cita médica, próxima o pasada. */
export interface Cita extends RegistroBase {
  fecha: FechaISO
  /** "10:30". Puede no saberse. */
  hora?: string
  especialidad: string
  medico?: string
  lugar?: string
  motivo?: string
  /** Lo que te dijeron en la consulta (se rellena después). */
  resultado?: string
  anulada?: boolean
}

export type TipoHistorial =
  | 'consulta'
  | 'informe'
  | 'prueba'
  | 'operacion'
  | 'ingreso'
  | 'urgencias'
  | 'diagnostico'
  | 'otro'

/** Una entrada del historial: visita, informe, prueba, operación… */
export interface EntradaHistorial extends RegistroBase {
  fecha: FechaISO
  tipo: TipoHistorial
  titulo: string
  /** Para las pruebas: radiografía, TAC, ecografía… */
  prueba?: string
  especialidad?: string
  centro?: string
  medico?: string
  /** Qué dice o qué pasó, con palabras normales. */
  resumen?: string
  /** Solo para diagnósticos: si es una enfermedad que dura (diabetes, hipertensión…). */
  cronica?: boolean
}

export type TipoConstante = 'tension' | 'pulso' | 'peso' | 'glucosa' | 'saturacion' | 'temperatura'

/** Una medida de constantes vitales: tensión, pulso, peso… */
export interface Medida extends RegistroBase {
  tipo: TipoConstante
  fecha: FechaISO
  hora?: string
  /** El número principal (en la tensión, la alta). */
  valor: number
  /** Solo en la tensión: la baja. */
  valor2?: number
  /** En la tensión se puede apuntar también el pulso que da el aparato. */
  pulso?: number
  /** Solo en el azúcar. */
  momento?: 'ayunas' | 'despues-comer' | 'otro'
  notas?: string
}

/** Un resultado de un análisis: "Glucosa 91 mg/dL (74 - 100)". */
export interface ResultadoAnalisis {
  /** La prueba de la lista de la app, si se ha reconocido (para juntar la evolución). */
  clave?: string
  /** Como venía en el informe. */
  nombre: string
  valor: number
  /** "< 1.73": el valor real es menor. ">90": mayor. */
  comparador?: '<' | '>'
  unidad?: string
  /** Referencia del propio informe (es la que vale). */
  refMin?: number
  refMax?: number
}

/** Un análisis (de sangre, de orina…) con todos sus resultados. */
export interface Analitica extends RegistroBase {
  fecha: FechaISO
  centro?: string
  notas?: string
  resultados: ResultadoAnalisis[]
}

/** Una regla (menstruación): cuándo empezó, cuándo acabó y cómo fue. */
export interface Ciclo extends RegistroBase {
  inicio: FechaISO
  /** Puede no saberse todavía (si está en curso). */
  fin?: FechaISO
  intensidad?: 'poca' | 'normal' | 'mucha'
  sintomas: string[]
  notas?: string
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
  'ciclos',
] as const

export type TablaDePerfil = (typeof TABLAS_DE_PERFIL)[number]
