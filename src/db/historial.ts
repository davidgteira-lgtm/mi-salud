// El historial médico: visitas, informes, pruebas, operaciones, ingresos…
import { esFechaValida } from '../utils/fechas'
import { coincide } from '../utils/texto'
import { borrarAdjuntosDe } from './adjuntos'
import { db, nuevoId } from './db'
import type { EntradaHistorial, TipoHistorial } from './tipos'

export const TIPOS_HISTORIAL: { valor: TipoHistorial; texto: string; icono: string }[] = [
  { valor: 'consulta', texto: 'Visita médica', icono: '🩺' },
  { valor: 'informe', texto: 'Informe', icono: '📄' },
  { valor: 'prueba', texto: 'Prueba', icono: '🩻' },
  { valor: 'operacion', texto: 'Operación', icono: '🏥' },
  { valor: 'ingreso', texto: 'Ingreso en hospital', icono: '🛏️' },
  { valor: 'urgencias', texto: 'Urgencias', icono: '🚑' },
  { valor: 'diagnostico', texto: 'Diagnóstico', icono: '📋' },
  { valor: 'otro', texto: 'Otro', icono: '📁' },
]

export const PRUEBAS = [
  'Radiografía',
  'TAC (escáner)',
  'Resonancia',
  'Ecografía',
  'Mamografía',
  'Electrocardiograma',
  'Ecocardiograma',
  'Holter',
  'Colonoscopia',
  'Gastroscopia',
  'Densitometría',
  'Biopsia',
  'Espirometría',
]

export type DatosHistorial = Pick<
  EntradaHistorial,
  'fecha' | 'tipo' | 'titulo' | 'prueba' | 'especialidad' | 'centro' | 'medico' | 'resumen' | 'cronica' | 'medicacion'
>

export function revisarHistorial(datos: DatosHistorial): string | null {
  if (!esFechaValida(datos.fecha)) return 'Pon la fecha, por favor (aunque sea aproximada).'
  if (!datos.titulo.trim()) return 'Escribe un título, por ejemplo «Radiografía de rodilla».'
  return null
}

export async function guardarHistorial(perfilId: string, datos: DatosHistorial, id?: string): Promise<string> {
  const problema = revisarHistorial(datos)
  if (problema) throw new Error(problema)
  const texto = (t?: string) => t?.trim() || undefined
  const limpio: DatosHistorial = {
    fecha: datos.fecha,
    tipo: datos.tipo,
    titulo: datos.titulo.trim(),
    prueba: datos.tipo === 'prueba' ? texto(datos.prueba) : undefined,
    especialidad: texto(datos.especialidad),
    centro: texto(datos.centro),
    medico: texto(datos.medico),
    resumen: texto(datos.resumen),
    cronica: datos.tipo === 'diagnostico' ? Boolean(datos.cronica) : undefined,
    medicacion: datos.medicacion?.map((m) => m.trim()).filter(Boolean).length ? [...new Set(datos.medicacion.map((m) => m.trim()).filter(Boolean))] : undefined,
  }
  const ahora = Date.now()
  if (id) {
    await db.historial.update(id, { ...limpio, actualizadoEn: ahora })
    return id
  }
  const nueva: EntradaHistorial = { ...limpio, id: nuevoId(), perfilId, creadoEn: ahora, actualizadoEn: ahora }
  await db.historial.add(nueva)
  return nueva.id
}

/** Borra la entrada y sus fotos, documentos y notas de voz. */
export async function borrarHistorial(id: string): Promise<void> {
  await db.transaction('rw', db.historial, db.adjuntos, async () => {
    await borrarAdjuntosDe(id)
    await db.historial.delete(id)
  })
}

export interface FiltroHistorial {
  tipo?: TipoHistorial
  busqueda?: string
}

/** El historial de una persona, lo más reciente primero, con filtros opcionales. */
export async function listarHistorial(perfilId: string, filtro: FiltroHistorial = {}): Promise<EntradaHistorial[]> {
  const lista = await db.historial.where('perfilId').equals(perfilId).toArray()
  return lista
    .filter((h) => !filtro.tipo || h.tipo === filtro.tipo)
    .filter(
      (h) =>
        !filtro.busqueda ||
        coincide(filtro.busqueda, h.titulo, h.prueba, h.especialidad, h.centro, h.medico, h.resumen, tipoEnTexto(h.tipo)),
    )
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.creadoEn - a.creadoEn)
}

/** Enfermedades crónicas apuntadas como diagnóstico (para la ficha de emergencia). */
export async function enfermedadesCronicas(perfilId: string): Promise<EntradaHistorial[]> {
  return (await listarHistorial(perfilId, { tipo: 'diagnostico' })).filter((h) => h.cronica)
}

/** Agrupa por año: [["2026", [...]], ["2025", [...]]] */
export function agruparPorAno<T extends { fecha: string }>(lista: T[]): [string, T[]][] {
  const grupos = new Map<string, T[]>()
  for (const h of lista) {
    const ano = h.fecha.slice(0, 4)
    grupos.set(ano, [...(grupos.get(ano) ?? []), h])
  }
  return [...grupos.entries()]
}

function tipoEnTexto(tipo: TipoHistorial): string {
  return TIPOS_HISTORIAL.find((t) => t.valor === tipo)?.texto ?? ''
}
