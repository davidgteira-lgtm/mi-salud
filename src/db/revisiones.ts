// Revisiones y vacunas: lo que te has hecho y lo que te toca.
import { edadDeInicio, esParaSuSexo, RECOMENDACIONES, type Enlace, type Recomendacion } from '../datos/revisiones'
import { diasEntre, esFechaValida, hoyISO, sumarMeses } from '../utils/fechas'
import { normalizar } from '../utils/texto'
import { borrarAdjuntosDe } from './adjuntos'
import { listarAnaliticas } from './analiticas'
import { listarMedidas } from './constantes'
import { db, nuevoId } from './db'
import { listarDental, ultimaRevision } from './dental'
import type { FechaISO, Perfil, RegistroRevision, RevisionPropia, Sexo } from './tipos'

// ---------- Guardar ----------

export type DatosRevision = Pick<RegistroRevision, 'tipo' | 'clave' | 'nombre' | 'fecha' | 'dosis' | 'lote' | 'lugar' | 'notas'>

export function revisarRegistro(d: DatosRevision): string | null {
  if (!d.nombre.trim()) return d.tipo === 'vacuna' ? 'Escribe qué vacuna es, por favor.' : 'Escribe qué revisión es, por favor.'
  if (!esFechaValida(d.fecha)) return 'Pon la fecha, por favor.'
  return null
}

/** Si el nombre escrito es uno de la lista, se le pone su clave para saber qué revisión cumple. */
export function claveDelNombre(nombre: string, propias: RevisionPropia[] = []): string | undefined {
  const n = normalizar(nombre)
  return [...RECOMENDACIONES, ...propias].find((r) => normalizar(r.nombre) === n)?.clave
}

export async function guardarRegistro(perfilId: string, datos: DatosRevision, id?: string): Promise<string> {
  const problema = revisarRegistro(datos)
  if (problema) throw new Error(problema)
  const texto = (t?: string) => t?.trim() || undefined
  const limpio: DatosRevision = {
    tipo: datos.tipo,
    clave: datos.clave || undefined,
    nombre: datos.nombre.trim(),
    fecha: datos.fecha,
    dosis: texto(datos.dosis),
    lote: texto(datos.lote),
    lugar: texto(datos.lugar),
    notas: texto(datos.notas),
  }
  const ahora = Date.now()
  if (id) {
    await db.revisiones.update(id, { ...limpio, actualizadoEn: ahora })
    return id
  }
  const nuevo: RegistroRevision = { ...limpio, id: nuevoId(), perfilId, creadoEn: ahora, actualizadoEn: ahora }
  await db.revisiones.add(nuevo)
  return nuevo.id
}

export async function borrarRegistro(id: string): Promise<void> {
  await db.transaction('rw', db.revisiones, db.adjuntos, async () => {
    await borrarAdjuntosDe(id)
    await db.revisiones.delete(id)
  })
}

/** Todo lo apuntado, lo más reciente primero. */
export async function listarRegistros(perfilId: string): Promise<RegistroRevision[]> {
  const lista = await db.revisiones.where('perfilId').equals(perfilId).toArray()
  return lista.sort((a, b) => b.fecha.localeCompare(a.fecha) || b.creadoEn - a.creadoEn)
}

/** Quitar de la lista algo que no le toca a esta persona, o volver a ponerlo. */
export async function ocultarRecomendacion(perfil: Perfil, clave: string, ocultar: boolean): Promise<void> {
  const actuales = new Set(perfil.revisionesOcultas ?? [])
  if (ocultar) actuales.add(clave)
  else actuales.delete(clave)
  await db.perfiles.update(perfil.id, { revisionesOcultas: [...actuales] })
}

export async function guardarPropia(perfil: Perfil, nombre: string, cadaMeses: number): Promise<void> {
  if (!nombre.trim()) throw new Error('Escribe qué revisión es, por favor.')
  const propias = [...(perfil.revisionesPropias ?? []), { clave: `propia-${nuevoId()}`, nombre: nombre.trim(), cadaMeses }]
  await db.perfiles.update(perfil.id, { revisionesPropias: propias })
}

export async function quitarPropia(perfil: Perfil, clave: string): Promise<void> {
  await db.perfiles.update(perfil.id, { revisionesPropias: (perfil.revisionesPropias ?? []).filter((p) => p.clave !== clave) })
}

/** Fechas de lo que ya está apuntado en otras partes de la app (tensión, análisis, dentista). */
export async function datosEnlazados(perfilId: string): Promise<Partial<Record<Enlace, FechaISO>>> {
  const [tensiones, analiticas, dental] = await Promise.all([
    listarMedidas(perfilId, 'tension'),
    listarAnaliticas(perfilId),
    listarDental(perfilId),
  ])
  const ultimaCon = (claves: string[]) =>
    analiticas
      .filter((a) => a.resultados.some((r) => r.clave && claves.includes(r.clave)))
      .map((a) => a.fecha)
      .sort()
      .at(-1)
  return {
    tension: tensiones[0]?.fecha,
    colesterol: ultimaCon(['colesterol-total', 'hdl', 'ldl']),
    azucar: ultimaCon(['glucosa', 'hba1c']),
    dentista: ultimaRevision(dental)?.fecha,
  }
}

// ---------- Qué toca ----------

export type EstadoRevision = 'toca' | 'pronto' | 'al-dia' | 'hecha' | 'mas-adelante'

export interface QueToca {
  clave: string
  tipo: 'revision' | 'vacuna'
  nombre: string
  icono: string
  explicacion: string
  fuente?: string
  propia?: boolean
  estado: EstadoRevision
  /** La última vez, y de dónde sale la fecha. */
  ultima?: { fecha: FechaISO; origen: 'apuntada' | Enlace }
  /** Cuándo toca la próxima vez (en «toca» puede no haber, o ser una fecha ya pasada). */
  proxima?: FechaISO
  /** Para las que tocan más adelante: a qué edad. */
  edadInicio?: number
  dosisPuestas?: number
  dosisTotales?: number
}

/** Días antes de la fecha en los que ya se avisa con «pronto». */
const DIAS_PRONTO = 60

const ORDEN: Record<EstadoRevision, number> = { toca: 0, pronto: 1, 'al-dia': 2, hecha: 3, 'mas-adelante': 4 }

/** 1 de septiembre de la temporada de vacunas en curso (de septiembre a agosto). */
function inicioTemporada(hoy: FechaISO): FechaISO {
  const ano = Number(hoy.slice(0, 4))
  return Number(hoy.slice(5, 7)) >= 9 ? `${ano}-09-01` : `${ano - 1}-09-01`
}

function segunFecha(proxima: FechaISO, hoy: FechaISO): EstadoRevision {
  if (proxima <= hoy) return 'toca'
  return diasEntre(hoy, proxima) <= DIAS_PRONTO ? 'pronto' : 'al-dia'
}

export function queToca(p: {
  /** Sin edad solo se pueden calcular las revisiones propias. */
  edad?: number
  sexo?: Sexo
  registros: Pick<RegistroRevision, 'clave' | 'fecha'>[]
  enlazados?: Partial<Record<Enlace, FechaISO>>
  ocultas?: string[]
  propias?: RevisionPropia[]
  hoy?: FechaISO
}): QueToca[] {
  const hoy = p.hoy ?? hoyISO()
  const fechasDe = (clave: string) =>
    p.registros
      .filter((r) => r.clave === clave && r.fecha <= hoy)
      .map((r) => r.fecha)
      .sort()

  const lista: QueToca[] = []

  if (p.edad !== undefined) {
    const edad = p.edad
    for (const r of RECOMENDACIONES) {
      if (p.ocultas?.includes(r.clave) || !esParaSuSexo(r, p.sexo)) continue
      if (r.hasta !== undefined && edad > r.hasta) continue
      lista.push(calcular(r, edad, fechasDe(r.clave), p.enlazados, hoy, p.sexo))
    }
  }

  for (const propia of p.propias ?? []) {
    const fechas = fechasDe(propia.clave)
    const ultima = fechas.at(-1)
    const proxima = ultima ? sumarMeses(ultima, propia.cadaMeses) : undefined
    lista.push({
      clave: propia.clave,
      tipo: 'revision',
      nombre: propia.nombre,
      icono: '📌',
      explicacion: `Te la ha mandado tu médico: cada ${textoMeses(propia.cadaMeses)}.`,
      propia: true,
      estado: proxima ? segunFecha(proxima, hoy) : 'toca',
      ultima: ultima ? { fecha: ultima, origen: 'apuntada' } : undefined,
      proxima,
    })
  }

  return lista.sort((a, b) => ORDEN[a.estado] - ORDEN[b.estado] || (a.edadInicio ?? 0) - (b.edadInicio ?? 0))
}

function calcular(
  r: Recomendacion,
  edad: number,
  fechas: FechaISO[],
  enlazados: Partial<Record<Enlace, FechaISO>> | undefined,
  hoy: FechaISO,
  sexo?: Sexo,
): QueToca {
  const base = { clave: r.clave, tipo: r.tipo, nombre: r.nombre, icono: r.icono, explicacion: r.explicacion, fuente: r.fuente }

  // La última vez: lo apuntado aquí o lo que hay en otras partes de la app, lo más reciente.
  const apuntada = fechas.at(-1)
  const enlazada = r.enlace ? enlazados?.[r.enlace] : undefined
  const enlazadaValida = enlazada && enlazada <= hoy ? enlazada : undefined
  const ultima =
    enlazadaValida && (!apuntada || enlazadaValida > apuntada)
      ? { fecha: enlazadaValida, origen: r.enlace! }
      : apuntada
        ? { fecha: apuntada, origen: 'apuntada' as const }
        : undefined

  const inicio = edadDeInicio(r, sexo)
  if (edad < inicio) return { ...base, estado: 'mas-adelante', edadInicio: inicio, ultima }

  if (r.cada === 'temporada') {
    const empieza = inicioTemporada(hoy)
    const siguienteOtono = `${Number(empieza.slice(0, 4)) + 1}-10-01`
    if (ultima && ultima.fecha >= empieza) return { ...base, estado: 'al-dia', ultima, proxima: siguienteOtono }
    // La campaña es en otoño e invierno (de septiembre a febrero).
    const mes = Number(hoy.slice(5, 7))
    if (mes >= 9 || mes <= 2) return { ...base, estado: 'toca', ultima }
    return { ...base, estado: 'pronto', ultima, proxima: `${hoy.slice(0, 4)}-10-01` }
  }

  if (r.cada === 'una-vez') {
    const total = r.dosis ?? 1
    const puestas = fechas.length
    const dosis = total > 1 ? { dosisPuestas: puestas, dosisTotales: total } : {}
    if (puestas >= total) return { ...base, ...dosis, estado: 'hecha', ultima }
    if (puestas === 0) return { ...base, ...dosis, estado: 'toca' }
    const proxima = sumarMeses(fechas.at(-1)!, r.mesesEntreDosis ?? 0)
    return { ...base, ...dosis, estado: segunFecha(proxima, hoy), ultima, proxima }
  }

  const meses = typeof r.cada === 'function' ? r.cada(edad) : r.cada
  if (!ultima) return { ...base, estado: 'toca' }
  const proxima = sumarMeses(ultima.fecha, meses)
  return { ...base, estado: segunFecha(proxima, hoy), ultima, proxima }
}

/** 6 → "6 meses", 12 → "año", 24 → "2 años". */
export function textoMeses(meses: number): string {
  if (meses === 12) return 'año'
  if (meses % 12 === 0) return `${meses / 12} años`
  return meses === 1 ? 'mes' : `${meses} meses`
}
