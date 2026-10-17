// Guardar las citas médicas de cada persona y buscarlas.
import { hoyISO, esFechaValida } from '../utils/fechas'
import { coincide } from '../utils/texto'
import { borrarAdjuntosDe } from './adjuntos'
import { db, nuevoId } from './db'
import type { Cita } from './tipos'

export const ESPECIALIDADES = [
  'Médico de cabecera',
  'Enfermería',
  'Análisis de sangre',
  'Cardiología',
  'Dermatología',
  'Digestivo',
  'Endocrinología',
  'Ginecología',
  'Hematología',
  'Nefrología (riñón)',
  'Neumología (pulmón)',
  'Neurología',
  'Oftalmología (ojos)',
  'Oncología',
  'Otorrino',
  'Psicología',
  'Psiquiatría',
  'Radiología (pruebas)',
  'Rehabilitación',
  'Reumatología',
  'Traumatología',
  'Urología',
  'Dentista',
  'Podología',
]

export type DatosCita = Pick<Cita, 'fecha' | 'hora' | 'especialidad' | 'medico' | 'lugar' | 'motivo' | 'resultado' | 'anulada'>

export function revisarCita(datos: DatosCita): string | null {
  if (!esFechaValida(datos.fecha)) return 'Pon la fecha de la cita, por favor.'
  if (!datos.especialidad.trim()) return 'Elige o escribe la especialidad, por favor.'
  if (datos.hora && !/^([01]\d|2[0-3]):[0-5]\d$/.test(datos.hora)) return 'La hora no parece correcta.'
  return null
}

export async function guardarCita(perfilId: string, datos: DatosCita, id?: string): Promise<string> {
  const problema = revisarCita(datos)
  if (problema) throw new Error(problema)
  const texto = (t?: string) => t?.trim() || undefined
  const limpio: DatosCita = {
    fecha: datos.fecha,
    hora: datos.hora || undefined,
    especialidad: datos.especialidad.trim(),
    medico: texto(datos.medico),
    lugar: texto(datos.lugar),
    motivo: texto(datos.motivo),
    resultado: texto(datos.resultado),
    anulada: datos.anulada || undefined,
  }
  const ahora = Date.now()
  if (id) {
    await db.citas.update(id, { ...limpio, actualizadoEn: ahora })
    return id
  }
  const nueva: Cita = { ...limpio, id: nuevoId(), perfilId, creadoEn: ahora, actualizadoEn: ahora }
  await db.citas.add(nueva)
  return nueva.id
}

/** Borra la cita y sus fotos, documentos y notas de voz. */
export async function borrarCita(id: string): Promise<void> {
  await db.transaction('rw', db.citas, db.adjuntos, async () => {
    await borrarAdjuntosDe(id)
    await db.citas.delete(id)
  })
}

const momento = (c: Cita) => `${c.fecha} ${c.hora ?? '99:99'}`

/** Citas de hoy en adelante, la más cercana primero. Las anuladas no salen. */
export async function listarProximas(perfilId: string, hoy: string = hoyISO()): Promise<Cita[]> {
  const lista = await db.citas.where('[perfilId+fecha]').between([perfilId, hoy], [perfilId, '￿'], true, true).toArray()
  return lista.filter((c) => !c.anulada).sort((a, b) => momento(a).localeCompare(momento(b)))
}

export interface FiltroCitas {
  especialidad?: string
  busqueda?: string
}

/** Citas anteriores a hoy, la más reciente primero, con filtros opcionales. */
export async function listarPasadas(perfilId: string, filtro: FiltroCitas = {}, hoy: string = hoyISO()): Promise<Cita[]> {
  const lista = await db.citas.where('[perfilId+fecha]').between([perfilId, ''], [perfilId, hoy], true, false).toArray()
  return lista
    .filter((c) => !filtro.especialidad || c.especialidad === filtro.especialidad)
    .filter((c) => !filtro.busqueda || coincide(filtro.busqueda, c.especialidad, c.medico, c.lugar, c.motivo, c.resultado))
    .sort((a, b) => momento(b).localeCompare(momento(a)))
}

/** Especialidades que aparecen en las citas pasadas de una persona (para el filtro). */
export async function especialidadesPasadas(perfilId: string, hoy: string = hoyISO()): Promise<string[]> {
  const pasadas = await listarPasadas(perfilId, {}, hoy)
  return [...new Set(pasadas.map((c) => c.especialidad))].sort((a, b) => a.localeCompare(b, 'es'))
}
