// Guardar los ciclos de la regla de cada persona.
import { diasEntre, esFechaValida } from '../utils/fechas'
import { db, nuevoId } from './db'
import type { Ciclo } from './tipos'

export type DatosCiclo = Pick<Ciclo, 'inicio' | 'fin' | 'intensidad' | 'sintomas' | 'notas'>

export function revisarCiclo(d: DatosCiclo): string | null {
  if (!esFechaValida(d.inicio)) return 'Pon el día que empezó, por favor.'
  if (d.fin) {
    if (!esFechaValida(d.fin)) return 'El día que acabó no es una fecha válida.'
    if (d.fin < d.inicio) return 'El día que acabó no puede ser antes del día que empezó.'
    if (diasEntre(d.inicio, d.fin) > 15) return 'Más de 15 días de regla parece un error. Revisa las fechas.'
  }
  return null
}

export async function guardarCiclo(perfilId: string, datos: DatosCiclo, id?: string): Promise<string> {
  const problema = revisarCiclo(datos)
  if (problema) throw new Error(problema)
  const limpio: DatosCiclo = {
    inicio: datos.inicio,
    fin: datos.fin || undefined,
    intensidad: datos.intensidad,
    sintomas: [...new Set(datos.sintomas)],
    notas: datos.notas?.trim() || undefined,
  }
  const ahora = Date.now()
  if (id) {
    await db.ciclos.update(id, { ...limpio, actualizadoEn: ahora })
    return id
  }
  const nuevo: Ciclo = { ...limpio, id: nuevoId(), perfilId, creadoEn: ahora, actualizadoEn: ahora }
  await db.ciclos.add(nuevo)
  return nuevo.id
}

/** "Se me ha acabado hoy": apunta el último día. */
export async function terminarCiclo(id: string, fin: string): Promise<void> {
  const c = await db.ciclos.get(id)
  if (!c) return
  const problema = revisarCiclo({ ...c, fin })
  if (problema) throw new Error(problema)
  await db.ciclos.update(id, { fin, actualizadoEn: Date.now() })
}

export function borrarCiclo(id: string): Promise<void> {
  return db.ciclos.delete(id)
}

/** Las reglas de una persona, la más reciente primero. */
export async function listarCiclos(perfilId: string): Promise<Ciclo[]> {
  const lista = await db.ciclos.where('perfilId').equals(perfilId).toArray()
  return lista.sort((a, b) => b.inicio.localeCompare(a.inicio))
}
