// Preparar lo que se envía a la IA y pedirle las propuestas.
import { listarAlergias } from '../db/alergias'
import { db } from '../db/db'
import { listarMedicamentos } from '../db/medicamentos'
import type { Adjunto, Perfil } from '../db/tipos'
import { reducirFoto } from '../utils/imagen'
import { ErrorIa, enBase64, llamarClaude, type Bloque } from './claude'
import { HERRAMIENTA, instrucciones, leerRespuesta, type Lectura } from './propuestas'

/** Las fotos se reducen antes de enviarlas: se leen igual de bien y tardan mucho menos. */
const LADO_MAXIMO_FOTO = 1800
/** Límite de la IA para un PDF. */
const MAXIMO_PDF = 30 * 1024 * 1024

/** Si se puede analizar este archivo, o por qué no. */
export function sePuedeAnalizar(a: Pick<Adjunto, 'tipo' | 'archivo' | 'transcripcion'>): { si: true } | { si: false; motivo: string } {
  if (a.tipo === 'foto') return { si: true }
  if (a.tipo === 'voz') {
    return a.transcripcion?.trim()
      ? { si: true }
      : { si: false, motivo: 'Esta nota de voz no tiene texto. Para que la IA la entienda, cuéntaselo con «Cuéntaselo a la app».' }
  }
  if (a.archivo.type === 'application/pdf') {
    return a.archivo.size <= MAXIMO_PDF ? { si: true } : { si: false, motivo: 'Este PDF es demasiado grande para analizarlo.' }
  }
  return { si: false, motivo: 'De momento la IA solo lee fotos y PDF. Haz una foto del documento.' }
}

export async function bloquesDeAdjunto(a: Pick<Adjunto, 'tipo' | 'archivo' | 'transcripcion'>): Promise<Bloque[]> {
  const puede = sePuedeAnalizar(a)
  if (!puede.si) throw new ErrorIa(puede.motivo)
  if (a.tipo === 'voz') return [{ type: 'text', text: `Nota de voz de la persona (pasada a texto):\n«${a.transcripcion!.trim()}»` }]
  if (a.tipo === 'foto') {
    const foto = await reducirFoto(a.archivo, LADO_MAXIMO_FOTO, 0.85)
    return [
      { type: 'image', source: { type: 'base64', media_type: foto.type || 'image/jpeg', data: await enBase64(foto) } },
      { type: 'text', text: 'Esta foto la ha hecho la persona. Lee lo que pone y propón qué apuntar.' },
    ]
  }
  return [
    { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: await enBase64(a.archivo) } },
    { type: 'text', text: 'Este documento lo ha guardado la persona. Léelo y propón qué apuntar.' },
  ]
}

export function bloquesDeTexto(mensaje: string): Bloque[] {
  return [{ type: 'text', text: `La persona cuenta:\n«${mensaje.trim()}»\nPropón qué apuntar.` }]
}

/** Pide a la IA las propuestas. No guarda nada: eso lo decide la persona. */
export async function pedirPropuestas(clave: string, perfil: Perfil, contenido: Bloque[]): Promise<Lectura> {
  const [medicamentos, alergias] = await Promise.all([listarMedicamentos(perfil.id, true), listarAlergias(perfil.id)])
  const { datos } = await llamarClaude({
    clave,
    sistema: instrucciones(perfil, { medicamentos: medicamentos.map((m) => m.nombre), alergias: alergias.map((a) => a.nombre) }),
    contenido,
    herramienta: HERRAMIENTA,
  })
  if (!datos) throw new ErrorIa('La IA no ha devuelto nada. Vuelve a probar.')
  return leerRespuesta(datos)
}

/** Los archivos que aún no ha leído la IA, los más nuevos primero. */
export async function adjuntosPendientes(perfilId: string): Promise<Adjunto[]> {
  const lista = await db.adjuntos.where('[perfilId+analisis]').equals([perfilId, 'pendiente']).toArray()
  return lista.sort((a, b) => b.creadoEn - a.creadoEn)
}

/** Ya leído por la IA (o la persona ha dicho que no hace falta). */
export async function marcarAdjunto(id: string, analisis: 'hecho' | 'no', resumenIa?: string): Promise<void> {
  await db.adjuntos.update(id, { analisis, ...(resumenIa ? { resumenIa } : {}), actualizadoEn: Date.now() })
}
