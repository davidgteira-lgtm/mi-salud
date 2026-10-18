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
  /** Persona de ejemplo, con datos inventados (para enseñar la app). */
  ejemplo?: boolean
  /** Revisiones y vacunas de la lista que ha quitado porque no le tocan. */
  revisionesOcultas?: string[]
  /** Revisiones que le ha mandado su médico (por ejemplo, el cardiólogo cada año). */
  revisionesPropias?: RevisionPropia[]
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
  /** Lo que la IA dijo que es (para recordarlo y para buscar). */
  resumenIa?: string
  /** En las notas de voz: lo que se dijo, escrito (si el móvil pudo pasarlo a texto). */
  transcripcion?: string
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
  'ojos',
  'bajas',
] as const

export type TablaDePerfil = (typeof TABLAS_DE_PERFIL)[number]

/** Lo que hizo el dentista. Ver datos/dientes.ts para los textos. */
export type TipoDental =
  | 'revision'
  | 'limpieza'
  | 'caries'
  | 'empaste'
  | 'endodoncia'
  | 'corona'
  | 'extraccion'
  | 'implante'
  | 'protesis'
  | 'ortodoncia'
  | 'otro'

/** Una visita al dentista o algo que te hicieron en uno o varios dientes. */
export interface TratamientoDental extends RegistroBase {
  fecha: FechaISO
  tipo: TipoDental
  /** Dientes con la numeración del dentista (11 a 48). Vacío = toda la boca. */
  dientes: number[]
  dentista?: string
  notas?: string
}

/** Una vacuna puesta o una revisión hecha. */
export interface RegistroRevision extends RegistroBase {
  tipo: 'revision' | 'vacuna'
  /** Si es una de la lista de la app (datos/revisiones.ts) o una propia de la persona. */
  clave?: string
  nombre: string
  fecha: FechaISO
  /** "1ª dosis", "2ª dosis"… */
  dosis?: string
  /** Número de lote de la vacuna (viene en la pegatina de la cartilla). */
  lote?: string
  lugar?: string
  notas?: string
}

/** Una revisión que el médico le ha mandado a esta persona en concreto. */
export interface RevisionPropia {
  clave: string
  nombre: string
  cadaMeses: number
}

export const GRUPOS_SANGUINEOS = ['0+', '0-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'] as const
export type GrupoSanguineo = (typeof GRUPOS_SANGUINEOS)[number]

/** Alguien a quien avisar en una emergencia (familia, vecinos…). */
export interface ContactoEmergencia {
  nombre: string
  /** «Hija», «Vecino»… */
  relacion?: string
  telefono: string
}

/** Mis datos sanitarios: una ficha por persona. También es lo que sale en la ficha de emergencia. */
export interface DatosSanitarios extends RegistroBase {
  grupoSanguineo?: GrupoSanguineo
  /** Número de la tarjeta sanitaria (CIP o TIS). */
  tarjetaSanitaria?: string
  seguroCompania?: string
  seguroPoliza?: string
  seguroTelefono?: string
  centroSalud?: string
  medicoCabecera?: string
  donante?: boolean
  /** Cosas que deben saber en urgencias: «Llevo marcapasos», «Uso audífono»… */
  avisos?: string
  contactos: ContactoEmergencia[]
}

/** La graduación de un ojo. En dioptrías, como la escribe la óptica o el oftalmólogo. */
export interface GraduacionOjo {
  /** Negativa = miopía; positiva = hipermetropía. */
  esfera?: number
  /** Astigmatismo (se suele escribir en negativo). */
  cilindro?: number
  /** Eje del astigmatismo, de 0 a 180 grados. */
  eje?: number
  /** Vista cansada (presbicia): lo que se suma para ver de cerca. */
  adicion?: number
  /** Agudeza visual, de 0,05 a 1,5 (1 = vista completa). */
  agudeza?: number
  /** Presión del ojo (mmHg). */
  presion?: number
}

/** Una revisión de la vista: graduación de cada ojo, para ver cómo cambia. */
export interface RevisionOcular extends RegistroBase {
  fecha: FechaISO
  tipo: 'gafas' | 'lentillas' | 'revision'
  /** Óptica u oftalmólogo. */
  donde?: string
  derecho: GraduacionOjo
  izquierdo: GraduacionOjo
  /** Lo que dijeron: cataratas, glaucoma, ojo vago… */
  diagnostico?: string
  notas?: string
}

export type TipoBaja = 'comun' | 'accidente-no-laboral' | 'accidente-laboral' | 'enfermedad-profesional'
export type TipoAlta = 'curacion' | 'mejoria' | 'inspeccion' | 'incapacidad' | 'otra'

/** Un parte de baja, de confirmación o de alta. */
export interface ParteBaja {
  fecha: FechaISO
  tipo: 'confirmacion' | 'alta'
  notas?: string
}

/** Una baja médica (incapacidad temporal), con sus partes y su alta. */
export interface Baja extends RegistroBase {
  inicio: FechaISO
  /** Día del alta. Si no hay, la baja sigue. */
  fin?: FechaISO
  tipo: TipoBaja
  motivo: string
  diagnostico?: string
  medico?: string
  centro?: string
  empresa?: string
  /** Partes de confirmación (el de alta va en `fin` y `tipoAlta`). */
  confirmaciones: FechaISO[]
  tipoAlta?: TipoAlta
  notas?: string
}
