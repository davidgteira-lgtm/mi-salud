// «Tomada» / «Sin tomar»: se apunta cada toma que se marca, y se puede quitar si fue sin querer.
import type { MomentoToma } from '../utils/tomas'
import { db, nuevoId } from './db'
import type { Toma } from './tipos'

export async function marcarTomada(perfilId: string, medicamentoId: string, t: MomentoToma, ahora: number = Date.now()): Promise<void> {
  const ya = await db.tomas.where('[medicamentoId+fecha+hora]').equals([medicamentoId, t.fecha, t.hora]).first()
  if (ya) return
  await db.tomas.add({ id: nuevoId(), perfilId, medicamentoId, fecha: t.fecha, hora: t.hora, tomadaEn: ahora, creadoEn: ahora, actualizadoEn: ahora })
}

/** Por si se marcó sin querer. */
export async function desmarcarTomada(medicamentoId: string, t: MomentoToma): Promise<void> {
  await db.tomas.where('[medicamentoId+fecha+hora]').equals([medicamentoId, t.fecha, t.hora]).delete()
}

/** La toma marcada, si la hay. */
export function buscarToma(medicamentoId: string, t: MomentoToma): Promise<Toma | undefined> {
  return db.tomas.where('[medicamentoId+fecha+hora]').equals([medicamentoId, t.fecha, t.hora]).first()
}

/** Las tomas marcadas de un medicamento, la más reciente primero. */
export async function listarTomas(medicamentoId: string): Promise<Toma[]> {
  const lista = await db.tomas.where('medicamentoId').equals(medicamentoId).toArray()
  return lista.sort((a, b) => `${b.fecha} ${b.hora}`.localeCompare(`${a.fecha} ${a.hora}`))
}
