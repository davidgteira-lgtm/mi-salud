// Guardar, cambiar y borrar los teléfonos de centros médicos de cada persona.
import { esTelefonoValido } from '../utils/telefono'
import { db, nuevoId } from './db'
import type { Contacto, TipoContacto } from './tipos'

export const TIPOS_CONTACTO: { valor: TipoContacto; texto: string; icono: string }[] = [
  { valor: 'centro-salud', texto: 'Centro de salud', icono: '🏥' },
  { valor: 'medico', texto: 'Médico particular', icono: '🩺' },
  { valor: 'hospital', texto: 'Hospital', icono: '🏨' },
  { valor: 'farmacia', texto: 'Farmacia', icono: '💊' },
  { valor: 'otro', texto: 'Otro', icono: '📞' },
]

export type DatosContacto = Pick<Contacto, 'tipo' | 'nombre' | 'telefono' | 'direccion'>

/** Devuelve el problema que tienen los datos, o null si están bien. */
export function revisarContacto(datos: DatosContacto): string | null {
  if (!datos.nombre.trim()) return 'Escribe el nombre, por favor.'
  if (!esTelefonoValido(datos.telefono)) return 'El número de teléfono no parece correcto.'
  return null
}

export async function guardarContacto(perfilId: string, datos: DatosContacto, id?: string): Promise<string> {
  const problema = revisarContacto(datos)
  if (problema) throw new Error(problema)
  const limpio = {
    tipo: datos.tipo,
    nombre: datos.nombre.trim(),
    telefono: datos.telefono.trim(),
    direccion: datos.direccion?.trim() || undefined,
  }
  const ahora = Date.now()
  if (id) {
    await db.telefonos.update(id, { ...limpio, actualizadoEn: ahora })
    return id
  }
  const nuevo: Contacto = { ...limpio, id: nuevoId(), perfilId, creadoEn: ahora, actualizadoEn: ahora }
  await db.telefonos.add(nuevo)
  return nuevo.id
}

export function borrarContacto(id: string): Promise<void> {
  return db.telefonos.delete(id)
}

/** Los teléfonos de una persona: primero el centro de salud, luego médicos, hospitales… */
export async function listarContactos(perfilId: string): Promise<Contacto[]> {
  const orden = TIPOS_CONTACTO.map((t) => t.valor)
  const lista = await db.telefonos.where('perfilId').equals(perfilId).toArray()
  return lista.sort(
    (a, b) => orden.indexOf(a.tipo) - orden.indexOf(b.tipo) || a.nombre.localeCompare(b.nombre, 'es'),
  )
}
