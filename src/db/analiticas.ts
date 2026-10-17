// Guardar los análisis de cada persona y ver cómo evoluciona cada prueba.
import { PRUEBAS } from '../datos/pruebasLaboratorio'
import { estadoResultado, factorAUnidadHabitual, redondear, type EstadoResultado } from '../utils/analisis'
import { esFechaValida } from '../utils/fechas'
import { normalizar } from '../utils/texto'
import { borrarAdjuntosDe } from './adjuntos'
import { db, nuevoId } from './db'
import type { Analitica, ResultadoAnalisis } from './tipos'

export type DatosAnalitica = Pick<Analitica, 'fecha' | 'centro' | 'notas' | 'resultados'>

export function revisarAnalitica(d: DatosAnalitica): string | null {
  if (!esFechaValida(d.fecha)) return 'Pon la fecha del análisis, por favor.'
  if (d.resultados.length === 0) return 'Añade al menos un resultado (o una foto del informe en «Notas»).'
  for (const r of d.resultados) {
    if (!r.nombre.trim()) return 'Hay un resultado sin nombre.'
    if (!Number.isFinite(r.valor)) return `Falta el valor de «${r.nombre}».`
    if (r.refMin !== undefined && r.refMax !== undefined && r.refMin > r.refMax) {
      return `En «${r.nombre}», la referencia mínima es mayor que la máxima.`
    }
  }
  return null
}

export async function guardarAnalitica(perfilId: string, datos: DatosAnalitica, id?: string): Promise<string> {
  const problema = revisarAnalitica(datos)
  if (problema) throw new Error(problema)
  const limpio: DatosAnalitica = {
    fecha: datos.fecha,
    centro: datos.centro?.trim() || undefined,
    notas: datos.notas?.trim() || undefined,
    resultados: datos.resultados.map((r) => ({
      ...r,
      nombre: r.nombre.trim(),
      unidad: r.unidad?.trim() || undefined,
    })),
  }
  const ahora = Date.now()
  if (id) {
    await db.analiticas.update(id, { ...limpio, actualizadoEn: ahora })
    return id
  }
  const nueva: Analitica = { ...limpio, id: nuevoId(), perfilId, creadoEn: ahora, actualizadoEn: ahora }
  await db.analiticas.add(nueva)
  return nueva.id
}

export async function borrarAnalitica(id: string): Promise<void> {
  await db.transaction('rw', db.analiticas, db.adjuntos, async () => {
    await borrarAdjuntosDe(id)
    await db.analiticas.delete(id)
  })
}

/** Los análisis de una persona, el más reciente primero. */
export async function listarAnaliticas(perfilId: string): Promise<Analitica[]> {
  const lista = await db.analiticas.where('perfilId').equals(perfilId).toArray()
  return lista.sort((a, b) => b.fecha.localeCompare(a.fecha) || b.creadoEn - a.creadoEn)
}

export function estadoDe(r: ResultadoAnalisis): EstadoResultado {
  return estadoResultado(r.valor, r.comparador, r.refMin === undefined && r.refMax === undefined ? undefined : { min: r.refMin, max: r.refMax })
}

/** Para juntar la misma prueba de distintos análisis aunque no esté en la lista de la app. */
export function claveDeGrupo(r: Pick<ResultadoAnalisis, 'clave' | 'nombre'>): string {
  return r.clave ?? `n:${normalizar(r.nombre)}`
}

export interface PruebaConHistoria {
  grupo: string
  nombre: string
  veces: number
  ultimoEstado: EstadoResultado
}

/** Las pruebas que aparecen en los análisis de una persona (para elegir la evolución). */
export async function pruebasConHistoria(perfilId: string): Promise<PruebaConHistoria[]> {
  const analiticas = await listarAnaliticas(perfilId)
  const mapa = new Map<string, PruebaConHistoria>()
  // De más antiguo a más reciente, para que el "último estado" sea el del último análisis.
  for (const a of [...analiticas].reverse()) {
    for (const r of a.resultados) {
      const g = claveDeGrupo(r)
      const nombre = PRUEBAS.find((p) => p.clave === r.clave)?.nombre ?? r.nombre
      const actual = mapa.get(g)
      mapa.set(g, { grupo: g, nombre, veces: (actual?.veces ?? 0) + 1, ultimoEstado: estadoDe(r) })
    }
  }
  return [...mapa.values()].sort((a, b) => b.veces - a.veces || a.nombre.localeCompare(b.nombre, 'es'))
}

export interface PuntoEvolucion {
  fecha: string
  valor: number
  comparador?: '<' | '>'
  refMin?: number
  refMax?: number
  estado: EstadoResultado
  /** Valor y unidad tal como venían en el informe. */
  original: string
  /** Si se ha pasado a otra unidad para poder compararlo (entonces se enseña cómo venía). */
  convertido: boolean
}

/**
 * Evolución de una prueba en el tiempo, todo en la MISMA unidad (la habitual de la prueba).
 * Si algún análisis venía en una unidad que no se sabe convertir, va a `sinConvertir`
 * en vez de mezclarse en la gráfica.
 */
export async function evolucion(
  perfilId: string,
  grupo: string,
): Promise<{ unidad: string; puntos: PuntoEvolucion[]; sinConvertir: PuntoEvolucion[] }> {
  const analiticas = (await listarAnaliticas(perfilId)).reverse()
  const prueba = PRUEBAS.find((p) => p.clave === grupo)
  const puntos: PuntoEvolucion[] = []
  const sinConvertir: PuntoEvolucion[] = []
  let unidad = prueba?.unidad ?? ''

  for (const a of analiticas) {
    for (const r of a.resultados.filter((x) => claveDeGrupo(x) === grupo)) {
      const original = `${r.comparador ?? ''}${r.valor} ${r.unidad ?? ''}`.trim()
      const factor = prueba ? factorAUnidadHabitual(prueba, r.unidad) : 1
      if (!prueba && !unidad) unidad = r.unidad ?? ''
      const conv = (v: number | undefined) => (v === undefined || factor === null ? v : redondear(v * factor))
      const punto: PuntoEvolucion = {
        fecha: a.fecha,
        valor: conv(r.valor)!,
        comparador: r.comparador,
        refMin: conv(r.refMin),
        refMax: conv(r.refMax),
        estado: estadoDe(r),
        original,
        convertido: factor !== null && factor !== 1,
      }
      if (factor === null) sinConvertir.push({ ...punto, valor: r.valor, refMin: r.refMin, refMax: r.refMax })
      else puntos.push(punto)
    }
  }
  return { unidad, puntos, sinConvertir }
}
