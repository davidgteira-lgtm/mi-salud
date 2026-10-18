// La IA propone y la persona confirma. Aquí se dice a la IA qué puede proponer,
// se comprueba cada propuesta (la IA puede equivocarse) y, si la persona dice que sí,
// se guarda en su sección con las mismas comprobaciones que si la escribiera a mano.
import { TIPOS_DENTAL, nombreDiente, esDiente } from '../datos/dientes'
import { guardarAlergia, revisarAlergia } from '../db/alergias'
import { guardarAnalitica, revisarAnalitica } from '../db/analiticas'
import { guardarCita, revisarCita } from '../db/citas'
import { guardarMedida, revisarMedida, textoValor } from '../db/constantes'
import { guardarDental, revisarDental } from '../db/dental'
import { guardarHistorial, revisarHistorial, TIPOS_HISTORIAL } from '../db/historial'
import { dejarDeTomar, guardarMedicamento, listarMedicamentos, revisarMedicamento } from '../db/medicamentos'
import { claveDelNombre, guardarRegistro } from '../db/revisiones'
import type { Alergia, FechaISO, Gravedad, Momento, Perfil, ResultadoAnalisis, TipoConstante, TipoDental, TipoHistorial } from '../db/tipos'
import { buscarPrueba } from '../utils/analisis'
import { calcularEdad, esFechaValida, fechaLarga, hoyISO } from '../utils/fechas'
import { normalizar } from '../utils/texto'
import type { Herramienta } from './claude'

// ---------- Lo que puede proponer ----------

interface Base {
  /** Por qué lo propone, en palabras sencillas. */
  explicacion: string
}

export type Propuesta = Base &
  (
    | {
        tipo: 'medicamento'
        nombre: string
        dosis?: string
        momentos: Momento[]
        otroHorario?: string
        paraQue?: string
        fechaInicio?: FechaISO
      }
    | { tipo: 'dejar_medicamento'; nombre: string; fecha?: FechaISO }
    | { tipo: 'cita'; fecha: FechaISO; hora?: string; especialidad: string; medico?: string; lugar?: string; motivo?: string }
    | {
        tipo: 'historial'
        fecha: FechaISO
        tipoHistorial: TipoHistorial
        titulo: string
        prueba?: string
        especialidad?: string
        centro?: string
        medico?: string
        resumen?: string
        cronica?: boolean
      }
    | { tipo: 'analitica'; fecha: FechaISO; centro?: string; resultados: ResultadoAnalisis[] }
    | { tipo: 'alergia'; nombre: string; tipoAlergia: Alergia['tipo']; clase: Alergia['clase']; gravedad: Gravedad; reaccion?: string }
    | { tipo: 'vacuna' | 'revision'; nombre: string; fecha: FechaISO; dosis?: string; lote?: string; lugar?: string }
    | { tipo: 'dental'; fecha: FechaISO; tipoDental: TipoDental; dientes: number[]; dentista?: string; notas?: string }
    | {
        tipo: 'medida'
        tipoMedida: TipoConstante
        fecha: FechaISO
        hora?: string
        valor: number
        valor2?: number
        pulso?: number
        momento?: 'ayunas' | 'despues-comer' | 'otro'
      }
  )

export const TIPOS_PROPUESTA = [
  'medicamento',
  'dejar_medicamento',
  'cita',
  'historial',
  'analitica',
  'alergia',
  'vacuna',
  'revision',
  'dental',
  'medida',
] as const

const MOMENTOS: Momento[] = ['desayuno', 'comida', 'cena', 'acostarse']
const CONSTANTES: TipoConstante[] = ['tension', 'pulso', 'peso', 'glucosa', 'saturacion', 'temperatura']

/** La «ficha» que rellena la IA. Se le obliga a usarla, así la respuesta siempre tiene la misma forma. */
export const HERRAMIENTA: Herramienta = {
  name: 'proponer_registros',
  description: 'Propone los datos de salud que hay que apuntar en la app, para que la persona los confirme uno a uno.',
  input_schema: {
    type: 'object',
    required: ['resumen', 'propuestas'],
    properties: {
      resumen: {
        type: 'string',
        description: 'Qué es el documento o el mensaje y qué dice lo importante, en 1-3 frases sencillas en español, de tú.',
      },
      propuestas: {
        type: 'array',
        items: {
          type: 'object',
          required: ['tipo', 'explicacion', 'datos'],
          properties: {
            tipo: { type: 'string', enum: [...TIPOS_PROPUESTA] },
            explicacion: { type: 'string', description: 'Por qué lo propones, en una frase sencilla.' },
            datos: {
              type: 'object',
              description: [
                'Fechas en AAAA-MM-DD y horas en HH:MM. Solo los campos que aparezcan claros.',
                'medicamento: nombre, dosis, momentos (lista de: desayuno, comida, cena, acostarse), otroHorario, paraQue, fechaInicio.',
                'dejar_medicamento: nombre, fecha.',
                'cita: fecha, hora, especialidad, medico, lugar, motivo.',
                `historial: fecha, tipoHistorial (${TIPOS_HISTORIAL.map((t) => t.valor).join(', ')}), titulo, prueba, especialidad, centro, medico, resumen (sencillo, sin tecnicismos), cronica (true/false, solo en diagnósticos).`,
                'analitica: fecha, centro, resultados (lista de {nombre, valor (número), comparador ("<" o ">"), unidad, refMin, refMax} tal como vienen en el informe).',
                'alergia: nombre, tipoAlergia (medicamento, alimento, otro), clase (alergia, intolerancia), gravedad (leve, moderada, grave, desconocida), reaccion.',
                'vacuna / revision: nombre, fecha, dosis, lote, lugar.',
                `dental: fecha, tipoDental (${TIPOS_DENTAL.map((t) => t.valor).join(', ')}), dientes (números del 11 al 48), dentista, notas.`,
                `medida: tipoMedida (${CONSTANTES.join(', ')}), fecha, hora, valor, valor2 (tensión baja), pulso, momento (ayunas, despues-comer, otro).`,
              ].join('\n'),
            },
          },
        },
      },
    },
  },
}

/** Instrucciones para la IA. Solo lleva lo imprescindible de la persona (nunca su nombre). */
export function instrucciones(
  perfil: Pick<Perfil, 'fechaNacimiento' | 'sexo'>,
  contexto: { medicamentos: string[]; alergias: string[] },
  hoy = hoyISO(),
): string {
  const edad =
    perfil.fechaNacimiento && esFechaValida(perfil.fechaNacimiento) ? `${calcularEdad(perfil.fechaNacimiento)} años` : 'edad desconocida'
  const sexo = perfil.sexo === 'mujer' ? 'mujer' : perfil.sexo === 'hombre' ? 'hombre' : 'sexo no indicado'
  return [
    'Eres el asistente de Mi Salud, una app donde una persona (muchas veces mayor) guarda su historial médico.',
    'Te llega un documento, una foto o un mensaje. Tu trabajo es proponer qué apuntar en la app; la persona confirmará cada propuesta.',
    'Reglas:',
    '- Propón solo lo que aparezca claro. No inventes ni supongas fechas, dosis ni valores. Si algo no se lee bien, no lo propongas.',
    '- No des consejos médicos ni diagnósticos propios: solo recoge lo que dice el documento o la persona.',
    '- En una analítica, copia TODOS los resultados con sus números y rangos tal cual, sin redondear.',
    '- Si es una receta o un cambio de tratamiento, propón los medicamentos. Si dice que deje uno, usa dejar_medicamento.',
    '- No repitas medicamentos ni alergias que ya tiene apuntados (te los paso abajo), salvo que cambie la dosis.',
    '- Si en el documento hay una próxima cita, propónla.',
    '- Escribe en español de España, sencillo, de tú.',
    '- Si no hay nada que apuntar, deja la lista vacía y explícalo en el resumen.',
    '',
    `Hoy es ${hoy}. La persona: ${edad}, ${sexo}.`,
    `Medicamentos que ya toma: ${contexto.medicamentos.join(', ') || 'ninguno apuntado'}.`,
    `Alergias apuntadas: ${contexto.alergias.join(', ') || 'ninguna'}.`,
  ].join('\n')
}

// ---------- Comprobar lo que devuelve la IA ----------

const texto = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined)
const numero = (v: unknown): number | undefined => {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim() && Number.isFinite(Number(v.replace(',', '.')))) return Number(v.replace(',', '.'))
  return undefined
}
const fecha = (v: unknown): FechaISO | undefined => (typeof v === 'string' && esFechaValida(v) ? v : undefined)
const hora = (v: unknown): string | undefined => (typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? v : undefined)
const uno = <T extends string>(v: unknown, validos: readonly T[]): T | undefined => (validos.includes(v as T) ? (v as T) : undefined)

export interface Lectura {
  resumen: string
  propuestas: Propuesta[]
  /** Cuántas propuestas se han descartado por venir mal (para no esconderlo). */
  descartadas: number
}

/** Convierte la respuesta de la IA en propuestas válidas. Lo que no encaja, se descarta. */
export function leerRespuesta(datos: unknown): Lectura {
  const d = (datos ?? {}) as { resumen?: unknown; propuestas?: unknown }
  const lista = Array.isArray(d.propuestas) ? d.propuestas : []
  const propuestas = lista.map(leerPropuesta).filter((p): p is Propuesta => p !== null)
  return { resumen: texto(d.resumen) ?? '', propuestas, descartadas: lista.length - propuestas.length }
}

export function leerPropuesta(bruta: unknown): Propuesta | null {
  const b = (bruta ?? {}) as { tipo?: unknown; explicacion?: unknown; datos?: Record<string, unknown> }
  const x = b.datos ?? {}
  const explicacion = texto(b.explicacion) ?? ''
  switch (b.tipo) {
    case 'medicamento': {
      const nombre = texto(x.nombre)
      if (!nombre) return null
      const momentos = Array.isArray(x.momentos) ? x.momentos.filter((m): m is Momento => MOMENTOS.includes(m as Momento)) : []
      return {
        tipo: 'medicamento',
        explicacion,
        nombre,
        dosis: texto(x.dosis),
        momentos: [...new Set(momentos)],
        otroHorario: texto(x.otroHorario),
        paraQue: texto(x.paraQue),
        fechaInicio: fecha(x.fechaInicio),
      }
    }
    case 'dejar_medicamento': {
      const nombre = texto(x.nombre)
      return nombre ? { tipo: 'dejar_medicamento', explicacion, nombre, fecha: fecha(x.fecha) } : null
    }
    case 'cita': {
      const f = fecha(x.fecha)
      const especialidad = texto(x.especialidad)
      if (!f || !especialidad) return null
      return {
        tipo: 'cita',
        explicacion,
        fecha: f,
        hora: hora(x.hora),
        especialidad,
        medico: texto(x.medico),
        lugar: texto(x.lugar),
        motivo: texto(x.motivo),
      }
    }
    case 'historial': {
      const f = fecha(x.fecha)
      const titulo = texto(x.titulo)
      if (!f || !titulo) return null
      const tipoHistorial =
        uno(
          x.tipoHistorial,
          TIPOS_HISTORIAL.map((t) => t.valor),
        ) ?? 'informe'
      return {
        tipo: 'historial',
        explicacion,
        fecha: f,
        tipoHistorial,
        titulo,
        prueba: texto(x.prueba),
        especialidad: texto(x.especialidad),
        centro: texto(x.centro),
        medico: texto(x.medico),
        resumen: texto(x.resumen),
        cronica: tipoHistorial === 'diagnostico' && x.cronica === true ? true : undefined,
      }
    }
    case 'analitica': {
      const f = fecha(x.fecha)
      const resultados = (Array.isArray(x.resultados) ? x.resultados : [])
        .map((r: Record<string, unknown>) => {
          const nombre = texto(r?.nombre)
          const valor = numero(r?.valor)
          if (!nombre || valor === undefined) return null
          const unidad = texto(r.unidad)
          const resultado: ResultadoAnalisis = {
            clave: buscarPrueba(nombre, unidad)?.clave,
            nombre,
            valor,
            comparador: uno(r.comparador, ['<', '>'] as const),
            unidad,
            refMin: numero(r.refMin),
            refMax: numero(r.refMax),
          }
          return resultado
        })
        .filter((r): r is ResultadoAnalisis => r !== null)
      if (!f || resultados.length === 0) return null
      return { tipo: 'analitica', explicacion, fecha: f, centro: texto(x.centro), resultados }
    }
    case 'alergia': {
      const nombre = texto(x.nombre)
      if (!nombre) return null
      return {
        tipo: 'alergia',
        explicacion,
        nombre,
        tipoAlergia: uno(x.tipoAlergia, ['medicamento', 'alimento', 'otro'] as const) ?? 'otro',
        clase: uno(x.clase, ['alergia', 'intolerancia'] as const) ?? 'alergia',
        gravedad: uno(x.gravedad, ['leve', 'moderada', 'grave', 'desconocida'] as const) ?? 'desconocida',
        reaccion: texto(x.reaccion),
      }
    }
    case 'vacuna':
    case 'revision': {
      const nombre = texto(x.nombre)
      const f = fecha(x.fecha)
      if (!nombre || !f) return null
      return { tipo: b.tipo, explicacion, nombre, fecha: f, dosis: texto(x.dosis), lote: texto(x.lote), lugar: texto(x.lugar) }
    }
    case 'dental': {
      const f = fecha(x.fecha)
      const tipoDental = uno(
        x.tipoDental,
        TIPOS_DENTAL.map((t) => t.valor),
      )
      if (!f || !tipoDental) return null
      const dientes = (Array.isArray(x.dientes) ? x.dientes : []).map(numero).filter((n): n is number => n !== undefined && esDiente(n))
      return {
        tipo: 'dental',
        explicacion,
        fecha: f,
        tipoDental,
        dientes: [...new Set(dientes)],
        dentista: texto(x.dentista),
        notas: texto(x.notas),
      }
    }
    case 'medida': {
      const tipoMedida = uno(x.tipoMedida, CONSTANTES)
      const f = fecha(x.fecha)
      const valor = numero(x.valor)
      if (!tipoMedida || !f || valor === undefined) return null
      return {
        tipo: 'medida',
        explicacion,
        tipoMedida,
        fecha: f,
        hora: hora(x.hora),
        valor,
        valor2: numero(x.valor2),
        pulso: numero(x.pulso),
        momento: uno(x.momento, ['ayunas', 'despues-comer', 'otro'] as const),
      }
    }
    default:
      return null
  }
}

// ---------- Enseñarla ----------

export interface Vista {
  icono: string
  titulo: string
  /** Líneas con los detalles, ya en palabras. */
  detalles: string[]
}

const fechaTxt = (f?: string) => (f ? fechaLarga(f) : undefined)

export function verPropuesta(p: Propuesta): Vista {
  const lineas = (...l: (string | undefined | false)[]) => l.filter((x): x is string => !!x)
  switch (p.tipo) {
    case 'medicamento':
      return {
        icono: '💊',
        titulo: `Medicamento: ${p.nombre}`,
        detalles: lineas(
          p.dosis && `Dosis: ${p.dosis}`,
          p.momentos.length > 0 && `Cuándo: ${p.momentos.join(', ')}`,
          p.otroHorario && `Horario: ${p.otroHorario}`,
          p.paraQue && `Para: ${p.paraQue}`,
          p.fechaInicio && `Desde el ${fechaLarga(p.fechaInicio)}`,
        ),
      }
    case 'dejar_medicamento':
      return { icono: '⏹️', titulo: `Dejar de tomar: ${p.nombre}`, detalles: lineas(p.fecha && `Desde el ${fechaLarga(p.fecha)}`) }
    case 'cita':
      return {
        icono: '📅',
        titulo: `Cita: ${p.especialidad}`,
        detalles: lineas(`${fechaLarga(p.fecha)}${p.hora ? ` a las ${p.hora}` : ''}`, p.medico, p.lugar && `📍 ${p.lugar}`, p.motivo),
      }
    case 'historial': {
      const t = TIPOS_HISTORIAL.find((x) => x.valor === p.tipoHistorial)
      return {
        icono: t?.icono ?? '📁',
        titulo: `${t?.texto ?? 'Historial'}: ${p.titulo}`,
        detalles: lineas(
          fechaTxt(p.fecha),
          [p.especialidad, p.medico].filter(Boolean).join(' · '),
          p.centro && `📍 ${p.centro}`,
          p.resumen,
          p.cronica && 'Enfermedad crónica',
        ),
      }
    }
    case 'analitica':
      return {
        icono: '🧪',
        titulo: `Análisis del ${fechaLarga(p.fecha)}`,
        detalles: [
          ...(p.centro ? [p.centro] : []),
          ...p.resultados.map(
            (r) =>
              `${r.nombre}: ${r.comparador ?? ''}${String(r.valor).replace('.', ',')}${r.unidad ? ` ${r.unidad}` : ''}${
                r.refMin !== undefined || r.refMax !== undefined
                  ? ` (${r.refMin !== undefined ? String(r.refMin).replace('.', ',') : ''} - ${r.refMax !== undefined ? String(r.refMax).replace('.', ',') : ''})`
                  : ''
              }`,
          ),
        ],
      }
    case 'alergia':
      return {
        icono: '⚠️',
        titulo: `${p.clase === 'intolerancia' ? 'Intolerancia' : 'Alergia'}: ${p.nombre}`,
        detalles: lineas(p.reaccion && `Qué pasa: ${p.reaccion}`, p.gravedad !== 'desconocida' && `Gravedad: ${p.gravedad}`),
      }
    case 'vacuna':
    case 'revision':
      return {
        icono: p.tipo === 'vacuna' ? '💉' : '🩺',
        titulo: `${p.tipo === 'vacuna' ? 'Vacuna' : 'Revisión'}: ${p.nombre}`,
        detalles: lineas(fechaLarga(p.fecha), p.dosis, p.lote && `Lote: ${p.lote}`, p.lugar && `📍 ${p.lugar}`),
      }
    case 'dental': {
      const t = TIPOS_DENTAL.find((x) => x.valor === p.tipoDental)
      return {
        icono: '🦷',
        titulo: `Dentista: ${t?.texto ?? p.tipoDental}`,
        detalles: lineas(fechaLarga(p.fecha), ...p.dientes.map(nombreDiente), p.dentista && `📍 ${p.dentista}`, p.notas),
      }
    }
    case 'medida':
      return {
        icono: '❤️',
        titulo: `Medida: ${textoValor({ tipo: p.tipoMedida, valor: p.valor, valor2: p.valor2 })}`,
        detalles: lineas(
          `${fechaLarga(p.fecha)}${p.hora ? `, ${p.hora}` : ''}`,
          p.tipoMedida,
          p.pulso !== undefined && `Pulso: ${p.pulso}`,
        ),
      }
  }
}

// ---------- Guardarla (cuando la persona dice que sí) ----------

/** Si hay algún problema, devuelve el motivo en palabras sencillas, sin guardar nada. */
export function revisarPropuesta(p: Propuesta): string | null {
  switch (p.tipo) {
    case 'medicamento':
      return revisarMedicamento({ ...datosMedicamento(p) })
    case 'cita':
      return revisarCita(datosCita(p))
    case 'historial':
      return revisarHistorial(datosHistorial(p))
    case 'alergia':
      return revisarAlergia(datosAlergia(p))
    case 'dental':
      return revisarDental(datosDental(p))
    case 'medida':
      return revisarMedida(datosMedida(p))
    case 'analitica':
      return revisarAnalitica({ fecha: p.fecha, centro: p.centro, resultados: p.resultados })
    default:
      return null
  }
}

const datosMedicamento = (p: Extract<Propuesta, { tipo: 'medicamento' }>) => ({
  nombre: p.nombre,
  dosis: p.dosis,
  momentos: p.momentos,
  otroHorario: p.otroHorario,
  paraQue: p.paraQue,
  fechaInicio: p.fechaInicio,
  activo: 1 as const,
})
const datosCita = (p: Extract<Propuesta, { tipo: 'cita' }>) => ({
  fecha: p.fecha,
  hora: p.hora,
  especialidad: p.especialidad,
  medico: p.medico,
  lugar: p.lugar,
  motivo: p.motivo,
})
const datosHistorial = (p: Extract<Propuesta, { tipo: 'historial' }>) => ({
  fecha: p.fecha,
  tipo: p.tipoHistorial,
  titulo: p.titulo,
  prueba: p.prueba,
  especialidad: p.especialidad,
  centro: p.centro,
  medico: p.medico,
  resumen: p.resumen,
  cronica: p.cronica,
})
const datosAlergia = (p: Extract<Propuesta, { tipo: 'alergia' }>) => ({
  tipo: p.tipoAlergia,
  clase: p.clase,
  nombre: p.nombre,
  gravedad: p.gravedad,
  reaccion: p.reaccion,
})
const datosDental = (p: Extract<Propuesta, { tipo: 'dental' }>) => ({
  fecha: p.fecha,
  tipo: p.tipoDental,
  dientes: p.dientes,
  dentista: p.dentista,
  notas: p.notas,
})
const datosMedida = (p: Extract<Propuesta, { tipo: 'medida' }>) => ({
  tipo: p.tipoMedida,
  fecha: p.fecha,
  hora: p.hora,
  valor: p.valor,
  valor2: p.valor2,
  pulso: p.pulso,
  momento: p.tipoMedida === 'glucosa' ? p.momento : undefined,
})

/** Guarda la propuesta en su sección. Devuelve en qué sección ha quedado. */
export async function guardarPropuesta(perfil: Pick<Perfil, 'id' | 'revisionesPropias'>, p: Propuesta): Promise<string> {
  const problema = revisarPropuesta(p)
  if (problema) throw new Error(problema)
  const id = perfil.id
  switch (p.tipo) {
    case 'medicamento':
      await guardarMedicamento(id, datosMedicamento(p))
      return 'Medicación'
    case 'dejar_medicamento': {
      const activos = await listarMedicamentos(id, true)
      const buscado = normalizar(p.nombre)
      const med = activos.find((m) => normalizar(m.nombre).includes(buscado) || buscado.includes(normalizar(m.nombre)))
      if (!med) throw new Error(`No encuentro «${p.nombre}» entre los medicamentos que tomas ahora.`)
      await dejarDeTomar(med.id, p.fecha ?? hoyISO())
      return 'Medicación'
    }
    case 'cita':
      await guardarCita(id, datosCita(p))
      return 'Citas'
    case 'historial':
      await guardarHistorial(id, datosHistorial(p))
      return 'Historial'
    case 'analitica':
      await guardarAnalitica(id, { fecha: p.fecha, centro: p.centro, resultados: p.resultados })
      return 'Análisis'
    case 'alergia':
      await guardarAlergia(id, datosAlergia(p))
      return 'Alergias'
    case 'vacuna':
    case 'revision':
      await guardarRegistro(id, {
        tipo: p.tipo,
        clave: claveDelNombre(p.nombre, perfil.revisionesPropias),
        nombre: p.nombre,
        fecha: p.fecha,
        dosis: p.dosis,
        lote: p.lote,
        lugar: p.lugar,
      })
      return 'Revisiones y vacunas'
    case 'dental':
      await guardarDental(id, datosDental(p))
      return 'Salud dental'
    case 'medida':
      await guardarMedida(id, datosMedida(p))
      return 'Constantes vitales'
  }
}
