// Guardar, cambiar y borrar las alergias e intolerancias de cada persona.
import { db, nuevoId } from './db'
import type { Alergia, Gravedad } from './tipos'

export const GRAVEDADES: { valor: Gravedad; texto: string }[] = [
  { valor: 'leve', texto: 'Leve' },
  { valor: 'moderada', texto: 'Moderada' },
  { valor: 'grave', texto: 'Grave' },
  { valor: 'desconocida', texto: 'No lo sé' },
]

export type DatosAlergia = Pick<Alergia, 'tipo' | 'clase' | 'nombre' | 'gravedad' | 'reaccion' | 'desde'>

export function revisarAlergia(datos: DatosAlergia): string | null {
  if (!datos.nombre.trim()) return 'Escribe a qué tienes alergia o intolerancia, por favor.'
  return null
}

export async function guardarAlergia(perfilId: string, datos: DatosAlergia, id?: string): Promise<string> {
  const problema = revisarAlergia(datos)
  if (problema) throw new Error(problema)
  const limpio = {
    ...datos,
    nombre: datos.nombre.trim(),
    reaccion: datos.reaccion?.trim() || undefined,
    desde: datos.desde || undefined,
  }
  const ahora = Date.now()
  if (id) {
    await db.alergias.update(id, { ...limpio, actualizadoEn: ahora })
    return id
  }
  const nueva: Alergia = { ...limpio, id: nuevoId(), perfilId, creadoEn: ahora, actualizadoEn: ahora }
  await db.alergias.add(nueva)
  return nueva.id
}

export function borrarAlergia(id: string): Promise<void> {
  return db.alergias.delete(id)
}

const ORDEN_GRAVEDAD: Gravedad[] = ['grave', 'moderada', 'leve', 'desconocida']

/** Las alergias de una persona: primero las graves. */
export async function listarAlergias(perfilId: string): Promise<Alergia[]> {
  const lista = await db.alergias.where('perfilId').equals(perfilId).toArray()
  return lista.sort(
    (a, b) =>
      ORDEN_GRAVEDAD.indexOf(a.gravedad) - ORDEN_GRAVEDAD.indexOf(b.gravedad) || a.nombre.localeCompare(b.nombre, 'es'),
  )
}
