// Salud dental: lo que te han hecho en la boca y cómo está cada diente ahora.
import { esDiente, infoTipoDental, type EstadoDiente } from '../datos/dientes'
import { diasEntre, esFechaValida, hoyISO } from '../utils/fechas'
import { borrarAdjuntosDe } from './adjuntos'
import { db, nuevoId } from './db'
import type { TratamientoDental } from './tipos'

export type DatosDental = Pick<TratamientoDental, 'fecha' | 'tipo' | 'dientes' | 'dentista' | 'notas' | 'importe'>

export function revisarDental(d: DatosDental): string | null {
  if (!esFechaValida(d.fecha)) return 'Pon la fecha, por favor.'
  if (d.dientes.some((n) => !esDiente(n))) return 'Hay algún diente que no existe.'
  const info = infoTipoDental(d.tipo)
  if (info.estado && d.dientes.length === 0) return 'Toca en el dibujo los dientes en los que te lo hicieron.'
  if (d.importe !== undefined && (!Number.isFinite(d.importe) || d.importe < 0 || d.importe > 100000)) return 'El importe no parece correcto.'
  return null
}

export async function guardarDental(perfilId: string, datos: DatosDental, id?: string): Promise<string> {
  const problema = revisarDental(datos)
  if (problema) throw new Error(problema)
  const texto = (t?: string) => t?.trim() || undefined
  const limpio: DatosDental = {
    fecha: datos.fecha,
    tipo: datos.tipo,
    // Para limpiezas, revisiones y ortodoncia es toda la boca.
    dientes: infoTipoDental(datos.tipo).boca ? [] : [...new Set(datos.dientes)].sort((a, b) => a - b),
    dentista: texto(datos.dentista),
    notas: texto(datos.notas),
    importe: datos.importe,
  }
  const ahora = Date.now()
  if (id) {
    await db.dental.update(id, { ...limpio, actualizadoEn: ahora })
    return id
  }
  const nuevo: TratamientoDental = { ...limpio, id: nuevoId(), perfilId, creadoEn: ahora, actualizadoEn: ahora }
  await db.dental.add(nuevo)
  return nuevo.id
}

/** Lo borra junto con sus fotos, radiografías y notas de voz. */
export async function borrarDental(id: string): Promise<void> {
  await db.transaction('rw', db.dental, db.adjuntos, async () => {
    await borrarAdjuntosDe(id)
    await db.dental.delete(id)
  })
}

/** Todo lo apuntado, lo más reciente primero. */
export async function listarDental(perfilId: string): Promise<TratamientoDental[]> {
  const lista = await db.dental.where('perfilId').equals(perfilId).toArray()
  return lista.sort((a, b) => b.fecha.localeCompare(a.fecha) || b.creadoEn - a.creadoEn)
}

/** Cómo está cada diente ahora: manda lo último que se hizo en él. Los que no salen, están sanos. */
export function estadoDeLosDientes(lista: Pick<TratamientoDental, 'fecha' | 'tipo' | 'dientes' | 'creadoEn'>[]): Map<number, EstadoDiente> {
  const estados = new Map<number, EstadoDiente>()
  const orden = [...lista].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.creadoEn - b.creadoEn)
  for (const t of orden) {
    const estado = infoTipoDental(t.tipo).estado
    if (estado) for (const n of t.dientes) estados.set(n, estado)
  }
  return estados
}

/** Lo que se ha hecho en un diente, lo más reciente primero. */
export function historiaDelDiente(lista: TratamientoDental[], diente: number): TratamientoDental[] {
  return lista.filter((t) => t.dientes.includes(diente))
}

/** Fecha de la última revisión o limpieza, y si ya hace más de un año. */
export function ultimaRevision(
  lista: Pick<TratamientoDental, 'fecha' | 'tipo'>[],
  hoy: string = hoyISO(),
): { fecha: string; haceMasDeUnAno: boolean } | null {
  const fechas = lista.filter((t) => (t.tipo === 'revision' || t.tipo === 'limpieza') && t.fecha <= hoy).map((t) => t.fecha)
  if (fechas.length === 0) return null
  const fecha = fechas.sort().at(-1)!
  return { fecha, haceMasDeUnAno: diasEntre(fecha, hoy) > 365 }
}

/** Dentistas y clínicas ya usados, para no tener que escribirlos otra vez. */
export function dentistasUsados(lista: Pick<TratamientoDental, 'dentista'>[]): string[] {
  return [...new Set(lista.map((t) => t.dentista).filter((d): d is string => !!d))]
}

/** Lo pagado en el dentista: en total y en un año. */
/** Lo pagado en el dentista: el total y lo de cada año (del más reciente al más antiguo, solo años con algo pagado). */
export function gastoDental(lista: Pick<TratamientoDental, 'fecha' | 'importe'>[]): {
  total: number
  porAno: { ano: string; importe: number; veces: number }[]
} {
  const anos = new Map<string, { importe: number; veces: number }>()
  for (const t of lista) {
    if (!t.importe) continue
    const a = anos.get(t.fecha.slice(0, 4)) ?? { importe: 0, veces: 0 }
    anos.set(t.fecha.slice(0, 4), { importe: a.importe + t.importe, veces: a.veces + 1 })
  }
  const porAno = [...anos].map(([ano, a]) => ({ ano, ...a })).sort((a, b) => b.ano.localeCompare(a.ano))
  return { total: porAno.reduce((s, a) => s + a.importe, 0), porAno }
}

/**
 * Lee un importe escrito a la española: «1.200», «1.200,50», «85,5», «85 €».
 * Con punto y tres cifras detrás es de miles (en dinero no se usa el punto para decimales).
 */
export function leerImporte(texto: string): number | null {
  const t = texto.replace(/€|eur(os)?/gi, '').replace(/\s/g, '')
  if (!t) return null
  if (!/^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+([.,]\d{1,2})?$/.test(t)) return NaN
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(t)) return Number(t.replaceAll('.', '').replace(',', '.'))
  return Number(t.replace(',', '.'))
}

/** «1.250,50 €» */
export function euros(n: number): string {
  // Con el punto de los miles también en 4 cifras («2.060 €»), que es como se lee en una factura.
  const [entero, decimales] = n.toFixed(Number.isInteger(n) ? 0 : 2).split('.')
  return `${entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}${decimales ? `,${decimales}` : ''} €`
}

/** Lo que se paga en el dentista lleva factura; las revisiones y el aviso de caries, no. */
export function llevaFactura(tipo: TratamientoDental['tipo']): boolean {
  return tipo !== 'revision' && tipo !== 'caries'
}
