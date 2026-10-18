// El historial de medicación: cuánto tiempo se tomó cada medicamento, qué tal fue
// y si ya se tomó antes (ese mismo u otro del mismo tipo), para cuando el médico receta uno.
import type { Medicamento, MotivoFinMedicamento, ValoracionMedicamento } from '../db/tipos'
import { diasEntre, hoyISO } from './fechas'
import { buscarMedicamento, tipoDeMedicamento } from './medicamentos'
import { normalizar } from './texto'

export const VALORACIONES: { valor: ValoracionMedicamento; texto: string; icono: string }[] = [
  { valor: 'bien', texto: 'Me fue bien', icono: '👍' },
  { valor: 'regular', texto: 'Regular', icono: '😐' },
  { valor: 'mal', texto: 'Me fue mal', icono: '👎' },
]

export const MOTIVOS_FIN: { valor: MotivoFinMedicamento; texto: string }[] = [
  { valor: 'terminado', texto: 'Terminé el tratamiento' },
  { valor: 'no-funciono', texto: 'No me hacía efecto' },
  { valor: 'efectos', texto: 'Me sentaba mal' },
  { valor: 'cambio', texto: 'Me lo cambiaron por otro' },
  { valor: 'otro', texto: 'Otro motivo' },
]

export const infoValoracion = (v?: ValoracionMedicamento) => VALORACIONES.find((x) => x.valor === v)
export const textoMotivoFin = (v?: MotivoFinMedicamento) => MOTIVOS_FIN.find((x) => x.valor === v)?.texto

/** Hasta este número de días se considera un tratamiento puntual (un antibiótico, un antiinflamatorio…). */
const DIAS_PUNTUAL = 45

/** «Puntual: 7 días», «Durante 3 meses», «Durante 4 años». Sin fecha de inicio, nada. */
export function duracionToma(m: Pick<Medicamento, 'fechaInicio' | 'fechaFin' | 'activo'>, hoy = hoyISO()): { texto: string; puntual: boolean } | undefined {
  if (!m.fechaInicio) return undefined
  const dias = diasEntre(m.fechaInicio, (m.activo ? hoy : m.fechaFin) ?? hoy) + 1
  if (dias <= DIAS_PUNTUAL) return { texto: `Puntual: ${dias === 1 ? '1 día' : `${dias} días`}`, puntual: true }
  const meses = Math.round(dias / 30.4)
  if (meses < 12) return { texto: `${m.activo ? 'Desde hace' : 'Durante'} ${meses === 1 ? '1 mes' : `${meses} meses`}`, puntual: false }
  const anos = Math.round(dias / 365.25)
  return { texto: `${m.activo ? 'Desde hace' : 'Durante'} ${anos === 1 ? '1 año' : `${anos} años`}`, puntual: false }
}

/** El principio activo (de la lista de medicamentos) o, si no está, la primera palabra del nombre. */
export function principioActivo(nombre: string): string {
  return buscarMedicamento(nombre)?.nombre ?? normalizar(nombre).split(' ')[0]
}

/** Las veces que se tomó antes ese mismo medicamento (aunque fuese con otra marca o dosis). */
export function vecesTomado(nombre: string, historial: Medicamento[]): Medicamento[] {
  const clave = principioActivo(nombre)
  if (!clave || clave.length < 3) return []
  return historial.filter((m) => principioActivo(m.nombre) === clave)
}

/**
 * La familia grande de un tipo: «Antibiótico (macrólido)» → «Antibiótico»; «Analgésico opioide» → «Analgésico».
 * Así se ven juntos todos los antibióticos o todo lo que se tomó para el dolor.
 */
export function familiaGeneral(tipo: string): string {
  const sin = tipo.replace(/\s*\(.*?\)/g, '').trim()
  if (/^analg[eé]sico/i.test(sin)) return 'Analgésico'
  if (/^anticoagulante/i.test(sin)) return 'Anticoagulante'
  return sin
}

const familiaDe = (m: Pick<Medicamento, 'nombre' | 'familia'>) => {
  const tipo = buscarMedicamento(m.nombre)?.familia ?? m.familia?.trim()
  return tipo ? familiaGeneral(tipo) : undefined
}

/** Otros medicamentos de la misma familia que ya se tomaron, uno por principio activo (la toma más reciente). */
export function mismoTipo(nombre: string, historial: Medicamento[]): Medicamento[] {
  const familia = familiaDe({ nombre })
  if (!familia) return []
  const clave = principioActivo(nombre)
  const vistos = new Set<string>()
  return historial.filter((m) => {
    const p = principioActivo(m.nombre)
    if (p === clave || vistos.has(p) || familiaDe(m) !== familia) return false
    vistos.add(p)
    return true
  })
}

/** El historial agrupado por familia de medicamento (las que tienen más medicamentos, primero). */
export function agruparPorTipo(lista: Medicamento[]): [string, Medicamento[]][] {
  const grupos = new Map<string, Medicamento[]>()
  for (const m of lista) {
    const tipo = familiaDe(m) ?? 'Otros'
    grupos.set(tipo, [...(grupos.get(tipo) ?? []), m])
  }
  return [...grupos].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0], 'es'))
}

/** Busca en el historial por nombre, tipo, para qué o lo que se notó. */
export function buscarEnHistorial(lista: Medicamento[], texto: string): Medicamento[] {
  const t = normalizar(texto.trim())
  if (!t) return lista
  return lista.filter((m) =>
    normalizar([m.nombre, tipoDeMedicamento(m), m.familia, m.paraQue, m.efectos, m.notas].filter(Boolean).join(' ')).includes(t),
  )
}
