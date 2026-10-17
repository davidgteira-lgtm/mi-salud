// Fotos, documentos y notas de voz unidos a una cita, un informe…
// Se guardan dentro del móvil, con la base de datos.
import { db, nuevoId } from './db'
import type { Adjunto } from './tipos'

/** Un archivo elegido en el formulario que aún no se ha guardado. */
export interface AdjuntoNuevo {
  /** Identificador provisional, para poder quitarlo antes de guardar. */
  clave: string
  tipo: Adjunto['tipo']
  nombre: string
  archivo: Blob
}

/** Decide si un archivo es foto o documento por su tipo. */
export function tipoDeArchivo(archivo: Blob): Adjunto['tipo'] {
  if (archivo.type.startsWith('audio/')) return 'voz'
  if (archivo.type.startsWith('image/')) return 'foto'
  return 'documento'
}

/** "Foto del 17-10-2026 10:30" */
export function nombrePorDefecto(tipo: Adjunto['tipo'], fecha: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  const cuando = `${p(fecha.getDate())}-${p(fecha.getMonth() + 1)}-${fecha.getFullYear()} ${p(fecha.getHours())}:${p(fecha.getMinutes())}`
  const que = { foto: 'Foto', documento: 'Documento', voz: 'Nota de voz' }[tipo]
  return `${que} del ${cuando}`
}

/** Guarda los archivos nuevos unidos a un registro. Quedan pendientes de leer por la IA. */
export async function guardarAdjuntos(perfilId: string, registroId: string, nuevos: AdjuntoNuevo[]): Promise<void> {
  if (nuevos.length === 0) return
  const ahora = Date.now()
  await db.adjuntos.bulkAdd(
    nuevos.map((n) => ({
      id: nuevoId(),
      perfilId,
      registroId,
      tipo: n.tipo,
      nombre: n.nombre,
      archivo: n.archivo,
      analisis: 'pendiente' as const,
      creadoEn: ahora,
      actualizadoEn: ahora,
    })),
  )
}

export async function listarAdjuntos(registroId: string): Promise<Adjunto[]> {
  const lista = await db.adjuntos.where('registroId').equals(registroId).toArray()
  return lista.sort((a, b) => a.creadoEn - b.creadoEn)
}

export function borrarAdjunto(id: string): Promise<void> {
  return db.adjuntos.delete(id)
}

/** Al borrar una cita o un informe, se borran también sus archivos. */
export async function borrarAdjuntosDe(registroId: string): Promise<void> {
  await db.adjuntos.where('registroId').equals(registroId).delete()
}

/** Cuántos archivos tiene cada registro (para enseñarlo en las tarjetas). */
export async function contarAdjuntos(registroIds: string[]): Promise<Record<string, number>> {
  const lista = await db.adjuntos.where('registroId').anyOf(registroIds).toArray()
  const cuenta: Record<string, number> = {}
  for (const a of lista) if (a.registroId) cuenta[a.registroId] = (cuenta[a.registroId] ?? 0) + 1
  return cuenta
}
