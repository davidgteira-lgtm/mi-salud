// Salud ocular: la graduación de cada ojo en cada revisión, para ver cómo cambia.
import { esFechaValida } from '../utils/fechas'
import { borrarAdjuntosDe } from './adjuntos'
import { db, nuevoId } from './db'
import type { GraduacionOjo, RevisionOcular } from './tipos'

export type DatosOcular = Pick<RevisionOcular, 'fecha' | 'tipo' | 'donde' | 'derecho' | 'izquierdo' | 'diagnostico' | 'notas'>

export const TIPOS_OCULAR: { valor: RevisionOcular['tipo']; texto: string; icono: string }[] = [
  { valor: 'gafas', texto: 'Gafas', icono: '👓' },
  { valor: 'lentillas', texto: 'Lentillas', icono: '👁️' },
  { valor: 'revision', texto: 'Revisión del oftalmólogo', icono: '🩺' },
]

/** Qué es cada valor, con sus límites para cazar erratas (no son límites «sanos»). */
export const CAMPOS_OJO: { clave: keyof GraduacionOjo; nombre: string; ayuda: string; min: number; max: number }[] = [
  { clave: 'esfera', nombre: 'Esfera (ESF)', ayuda: 'Con − es miopía; con + es hipermetropía', min: -30, max: 30 },
  { clave: 'cilindro', nombre: 'Cilindro (CIL)', ayuda: 'Astigmatismo', min: -10, max: 10 },
  { clave: 'eje', nombre: 'Eje', ayuda: 'Del astigmatismo, de 0 a 180', min: 0, max: 180 },
  { clave: 'adicion', nombre: 'Adición (ADD)', ayuda: 'Vista cansada, para ver de cerca', min: 0, max: 4 },
  { clave: 'agudeza', nombre: 'Agudeza visual (AV)', ayuda: 'De 0,05 a 1,5 (1 es ver bien del todo)', min: 0.05, max: 2 },
  { clave: 'presion', nombre: 'Presión del ojo (PIO)', ayuda: 'En mmHg; lo normal es de 10 a 21', min: 3, max: 70 },
]

/** Presión del ojo normal (para la franja de la gráfica y el aviso). */
export const PRESION_NORMAL = { min: 10, max: 21 }

function revisarOjo(g: GraduacionOjo, cual: string): string | null {
  for (const c of CAMPOS_OJO) {
    const v = g[c.clave]
    if (v === undefined) continue
    if (!Number.isFinite(v) || v < c.min || v > c.max) return `${c.nombre} del ojo ${cual}: ${String(v).replace('.', ',')} no parece correcto.`
  }
  if (g.eje !== undefined && !Number.isInteger(g.eje)) return `El eje del ojo ${cual} va sin decimales.`
  // Las graduaciones van de 0,25 en 0,25.
  for (const c of ['esfera', 'cilindro', 'adicion'] as const) {
    const v = g[c]
    if (v !== undefined && Math.abs(v * 4 - Math.round(v * 4)) > 1e-6) return `La graduación va de 0,25 en 0,25: revisa el ojo ${cual}.`
  }
  return null
}

export function revisarOcular(d: DatosOcular): string | null {
  if (!esFechaValida(d.fecha)) return 'Pon la fecha, por favor.'
  const vacio = (g: GraduacionOjo) => Object.values(g).every((v) => v === undefined)
  if (vacio(d.derecho) && vacio(d.izquierdo) && !d.diagnostico?.trim()) return 'Apunta al menos un valor de algún ojo.'
  return revisarOjo(d.derecho, 'derecho') ?? revisarOjo(d.izquierdo, 'izquierdo')
}

export async function guardarOcular(perfilId: string, datos: DatosOcular, id?: string): Promise<string> {
  const problema = revisarOcular(datos)
  if (problema) throw new Error(problema)
  const texto = (t?: string) => t?.trim() || undefined
  const limpio: DatosOcular = { ...datos, donde: texto(datos.donde), diagnostico: texto(datos.diagnostico), notas: texto(datos.notas) }
  const ahora = Date.now()
  if (id) {
    await db.ojos.update(id, { ...limpio, actualizadoEn: ahora })
    return id
  }
  const nueva: RevisionOcular = { ...limpio, id: nuevoId(), perfilId, creadoEn: ahora, actualizadoEn: ahora }
  await db.ojos.add(nueva)
  return nueva.id
}

export async function borrarOcular(id: string): Promise<void> {
  await db.transaction('rw', db.ojos, db.adjuntos, async () => {
    await borrarAdjuntosDe(id)
    await db.ojos.delete(id)
  })
}

/** Las revisiones, la más reciente primero. */
export async function listarOcular(perfilId: string): Promise<RevisionOcular[]> {
  const lista = await db.ojos.where('perfilId').equals(perfilId).toArray()
  return lista.sort((a, b) => b.fecha.localeCompare(a.fecha) || b.creadoEn - a.creadoEn)
}

/** Dioptrías como se escriben: «−2,25», «+1,50», «0,00». */
export function dioptrias(v: number): string {
  const signo = v > 0 ? '+' : v < 0 ? '−' : ''
  return `${signo}${Math.abs(v).toFixed(2).replace('.', ',')}`
}

/** Lo que tiene un ojo, en palabras: «Miopía de 2,25, astigmatismo de 0,75 y vista cansada (+2,00)». */
export function explicarOjo(g: GraduacionOjo): string {
  const partes: string[] = []
  const num = (v: number) => Math.abs(v).toFixed(2).replace('.', ',')
  if (g.esfera !== undefined && g.esfera !== 0) partes.push(`${g.esfera < 0 ? 'miopía' : 'hipermetropía'} de ${num(g.esfera)}`)
  if (g.cilindro !== undefined && g.cilindro !== 0) partes.push(`astigmatismo de ${num(g.cilindro)}${g.eje !== undefined ? ` a ${g.eje}°` : ''}`)
  if (g.adicion !== undefined && g.adicion > 0) partes.push(`vista cansada (${dioptrias(g.adicion)})`)
  if (partes.length === 0) {
    if (g.esfera === 0 || g.cilindro === 0) return 'Sin graduación'
    return ''
  }
  const texto = partes.length === 1 ? partes[0] : `${partes.slice(0, -1).join(', ')} y ${partes.at(-1)}`
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

/** Si la presión de algún ojo está alta (riesgo de glaucoma: que lo mire el oftalmólogo). */
export function presionAlta(r: Pick<RevisionOcular, 'derecho' | 'izquierdo'>): boolean {
  return [r.derecho.presion, r.izquierdo.presion].some((p) => p !== undefined && p > PRESION_NORMAL.max)
}
