// Crear, cambiar y borrar personas (perfiles).
import { db, nuevoId } from './db'
import { TABLAS_DE_PERFIL, type Perfil } from './tipos'

/** Colores para distinguir a cada persona; todos se leen bien con letra blanca. */
export const COLORES_PERFIL = ['#2e5c8a', '#4f7fb5', '#6a5fa8', '#2f7f8f', '#a8566f', '#4f7f5f']

export type DatosPerfil = Pick<Perfil, 'nombre' | 'fechaNacimiento' | 'sexo' | 'apuntarRegla' | 'ejemplo' | 'ejemploVersion' | 'foto' | 'color'>

export async function crearPerfil(datos: DatosPerfil): Promise<Perfil> {
  const nombre = datos.nombre.trim()
  if (!nombre) throw new Error('Falta el nombre')
  const perfil: Perfil = { ...datos, nombre, id: nuevoId(), creadoEn: Date.now() }
  await db.perfiles.add(perfil)
  return perfil
}

export async function actualizarPerfil(id: string, cambios: Partial<DatosPerfil>): Promise<void> {
  if (cambios.nombre !== undefined) {
    cambios.nombre = cambios.nombre.trim()
    if (!cambios.nombre) throw new Error('Falta el nombre')
  }
  await db.perfiles.update(id, cambios)
}

/** Borra a la persona y TODOS sus datos (citas, medicación, fotos…). */
export async function borrarPerfil(id: string): Promise<void> {
  const tablas = [db.perfiles, ...TABLAS_DE_PERFIL.map((t) => db.table(t))]
  await db.transaction('rw', tablas, async () => {
    for (const t of TABLAS_DE_PERFIL) {
      await db.table(t).where('perfilId').equals(id).delete()
    }
    await db.perfiles.delete(id)
  })
}

export function listarPerfiles(): Promise<Perfil[]> {
  return db.perfiles.orderBy('nombre').toArray()
}
