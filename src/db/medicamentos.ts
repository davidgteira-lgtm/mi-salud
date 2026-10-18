// Guardar los medicamentos de cada persona: los que toma ahora y los que tomó antes.
import { esHora } from '../utils/tomas'
import { borrarAdjuntosDe } from './adjuntos'
import { hoyISO } from '../utils/fechas'
import { buscarMedicamento } from '../utils/medicamentos'
import { db, nuevoId } from './db'
import type { Medicamento, Momento } from './tipos'

export const MOMENTOS: { valor: Momento; texto: string; icono: string }[] = [
  { valor: 'desayuno', texto: 'Desayuno', icono: '🌅' },
  { valor: 'comida', texto: 'Comida', icono: '☀️' },
  { valor: 'cena', texto: 'Cena', icono: '🌙' },
  { valor: 'acostarse', texto: 'Al acostarse', icono: '🛏️' },
]

export type DatosMedicamento = Pick<
  Medicamento,
  | 'nombre'
  | 'dosis'
  | 'momentos'
  | 'horas'
  | 'otroHorario'
  | 'paraQue'
  | 'familia'
  | 'fechaInicio'
  | 'fechaFin'
  | 'activo'
  | 'notas'
  | 'valoracion'
  | 'efectos'
  | 'motivoFin'
>

export function revisarMedicamento(datos: DatosMedicamento): string | null {
  if (!datos.nombre.trim()) return 'Escribe el nombre del medicamento, por favor.'
  if (datos.fechaInicio && datos.fechaFin && datos.fechaFin < datos.fechaInicio) {
    return 'La fecha en que lo dejaste no puede ser anterior a la fecha en que empezaste.'
  }
  if (datos.horas?.some((h) => !esHora(h))) return 'Alguna hora no es correcta. Escríbela así: 08:00.'
  return null
}

export async function guardarMedicamento(perfilId: string, datos: DatosMedicamento, id?: string): Promise<string> {
  const problema = revisarMedicamento(datos)
  if (problema) throw new Error(problema)
  const texto = (t?: string) => t?.trim() || undefined
  const limpio: DatosMedicamento = {
    nombre: datos.nombre.trim(),
    dosis: texto(datos.dosis),
    // Siempre en el mismo orden del día, sin repetir.
    momentos: MOMENTOS.map((m) => m.valor).filter((m) => datos.momentos.includes(m)),
    horas: datos.horas?.length ? [...new Set(datos.horas)].sort() : undefined,
    otroHorario: texto(datos.otroHorario),
    paraQue: texto(datos.paraQue),
    // Si no se sabe la familia, se busca en la lista de medicamentos.
    familia: texto(datos.familia) ?? buscarMedicamento(datos.nombre)?.familia,
    fechaInicio: datos.fechaInicio || undefined,
    fechaFin: datos.activo ? undefined : datos.fechaFin || undefined,
    activo: datos.activo,
    notas: texto(datos.notas),
    valoracion: datos.valoracion || undefined,
    efectos: texto(datos.efectos),
    motivoFin: datos.activo ? undefined : datos.motivoFin || undefined,
  }
  const ahora = Date.now()
  if (id) {
    await db.medicamentos.update(id, { ...limpio, actualizadoEn: ahora })
    return id
  }
  const nuevo: Medicamento = { ...limpio, id: nuevoId(), perfilId, creadoEn: ahora, actualizadoEn: ahora }
  await db.medicamentos.add(nuevo)
  return nuevo.id
}

/** "Ya no lo tomo": pasa al historial con la fecha de hoy (o la indicada). */
export async function dejarDeTomar(
  id: string,
  fecha: string = hoyISO(),
  como: Pick<Medicamento, 'valoracion' | 'motivoFin'> = {},
): Promise<void> {
  await db.medicamentos.update(id, {
    activo: 0,
    fechaFin: fecha,
    ...(como.valoracion && { valoracion: como.valoracion }),
    ...(como.motivoFin && { motivoFin: como.motivoFin }),
    actualizadoEn: Date.now(),
  })
}

/** "Lo vuelvo a tomar": crea una toma nueva desde hoy y deja la anterior en el historial. */
export async function volverATomar(id: string, fecha: string = hoyISO()): Promise<string> {
  const anterior = await db.medicamentos.get(id)
  if (!anterior) throw new Error('No se encuentra el medicamento')
  // Lo de qué tal le fue y por qué lo dejó se queda en la toma anterior.
  return guardarMedicamento(anterior.perfilId, {
    ...anterior,
    fechaInicio: fecha,
    fechaFin: undefined,
    activo: 1,
    valoracion: undefined,
    efectos: undefined,
    motivoFin: undefined,
  })
}

/** Lo borra junto con sus fotos y documentos. */
export async function borrarMedicamento(id: string): Promise<void> {
  await db.transaction('rw', [db.medicamentos, db.adjuntos, db.tomas], async () => {
    await borrarAdjuntosDe(id)
    await db.tomas.where('medicamentoId').equals(id).delete()
    await db.medicamentos.delete(id)
  })
}

/** Lo que toma ahora (por nombre) o lo que tomó antes (lo más reciente primero). */
export async function listarMedicamentos(perfilId: string, activos: boolean): Promise<Medicamento[]> {
  const lista = await db.medicamentos
    .where('[perfilId+activo]')
    .equals([perfilId, activos ? 1 : 0])
    .toArray()
  if (activos) return lista.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  return lista.sort((a, b) => (b.fechaFin ?? '').localeCompare(a.fechaFin ?? ''))
}
