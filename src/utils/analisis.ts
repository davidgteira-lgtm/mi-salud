// Reglas para los análisis: reconocer la prueba, leer resultados y rangos tal como
// vienen en los informes, convertir unidades y decir si un valor está dentro de lo normal.
import { PRUEBAS, type PruebaLab, type Referencia } from '../datos/pruebasLaboratorio'
import type { Sexo } from '../db/tipos'
import { esFechaValida } from './fechas'
import { leerNumero, type Lectura } from './numeros'
import { normalizar } from './texto'

// ---- Reconocer la prueba ---------------------------------------------------

const NOMBRES = PRUEBAS.flatMap((p) => [p.nombre, ...(p.otrosNombres ?? [])].map((n) => ({ nombre: normalizar(n), prueba: p })))

/**
 * Busca la prueba por su nombre. En la fórmula leucocitaria, "% Neutrófilos" y "# Neutrófilos"
 * son pruebas distintas: se distinguen por el símbolo del principio o por la unidad.
 */
export function buscarPrueba(nombre: string, unidad?: string): PruebaLab | undefined {
  const t = normalizar(nombre)
  if (!t) return undefined
  const variante = /^\s*%/.test(nombre) ? '%' : /^\s*#/.test(nombre) ? '#' : unidad ? (normalizarUnidad(unidad) === '%' ? '%' : '#') : undefined
  const candidatas = NOMBRES.filter((n) => n.nombre === t).map((n) => n.prueba)
  const unicas = [...new Set(candidatas)]
  if (unicas.length <= 1) return unicas[0] ?? buscarSinParentesis(nombre)
  return unicas.find((p) => p.variante === variante) ?? unicas.find((p) => p.variante === '%')
}

/** "Volumen corpuscular medio (VCM)" → prueba también por "Volumen corpuscular medio" o "VCM". */
function buscarSinParentesis(nombre: string): PruebaLab | undefined {
  const dentro = /\(([^)]+)\)/.exec(nombre)?.[1]
  const fuera = nombre.replace(/\([^)]*\)/g, ' ')
  for (const parte of [fuera, dentro]) {
    if (!parte) continue
    const t = normalizar(parte)
    const p = NOMBRES.find((n) => n.nombre === t)?.prueba
    if (p) return p
  }
  return undefined
}

/** Sugerencias de nombres al escribir (a partir de 2 letras). */
export function sugerirPruebas(texto: string, maximo = 5): PruebaLab[] {
  const t = normalizar(texto)
  if (t.length < 2) return []
  return PRUEBAS.filter((p) => [p.nombre, ...(p.otrosNombres ?? [])].some((n) => normalizar(n).includes(t))).slice(0, maximo)
}

/** La referencia orientativa según el sexo (si la prueba la distingue). */
export function referenciaOrientativa(p: PruebaLab, sexo?: Sexo): Referencia | undefined {
  if (sexo === 'hombre' && p.refHombre) return p.refHombre
  if (sexo === 'mujer' && p.refMujer) return p.refMujer
  if (p.ref) return p.ref
  // Sin sexo: el rango más amplio de los dos.
  if (p.refHombre && p.refMujer) {
    const min = Math.min(p.refHombre.min ?? Infinity, p.refMujer.min ?? Infinity)
    const max = Math.max(p.refHombre.max ?? -Infinity, p.refMujer.max ?? -Infinity)
    return { min: Number.isFinite(min) ? min : undefined, max: Number.isFinite(max) ? max : undefined }
  }
  return undefined
}

// ---- Unidades ----------------------------------------------------------------

/**
 * Deja la unidad en una forma única para poder compararla:
 * "mg/dl" = "mg/dL"; "µUI/ml" = "mcU/mL" = "uU/mL"; "10e3/µL" = "x10³/µL" = "10^3/uL"; "UI/l" = "U/L".
 */
export function normalizarUnidad(unidad: string): string {
  return unidad
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[µμ]/g, 'u')
    .replace(/mcg/g, 'ug')
    .replace(/^mc/, 'u')
    .replace(/ui/g, 'u')
    .replace(/[x×*]?10(?:\^|e|\*\*)?(3|³)/g, '10e3')
    .replace(/[x×*]?10(?:\^|e|\*\*)?(6|⁶)/g, '10e6')
    .replace(/[x×*]?10(?:\^|e|\*\*)?(9|⁹)/g, '10e9')
    .replace(/[x×*]?10(?:\^|e|\*\*)?12/g, '10e12')
    .replace(/mm3|mm³/g, 'ul')
    .replace(/1[.,]73m(?:\^)?2|1[.,]73m²/g, '1.73m2')
}

/** Factor para pasar un valor de `unidad` a la unidad habitual de la prueba; null si no se sabe. */
export function factorAUnidadHabitual(p: PruebaLab, unidad: string | undefined): number | null {
  const u = normalizarUnidad(unidad ?? '')
  if (u === normalizarUnidad(p.unidad)) return 1
  if (!u && !p.unidad) return 1
  const alt = p.otrasUnidades?.find((a) => normalizarUnidad(a.unidad) === u)
  return alt ? alt.factor : null
}

/** Redondeo para no arrastrar decimales falsos al convertir (5,5 mmol/L → 99,1 mg/dL). */
export function redondear(v: number): number {
  if (v === 0) return 0
  const cifras = Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 10 ? 1 : Math.abs(v) >= 1 ? 2 : 3
  return Number(v.toFixed(cifras))
}

// ---- Resultados y rangos tal como vienen en el informe -----------------------

export interface ResultadoLeido {
  valor: number
  /** "< 1.73": el valor real es menor que 1.73. ">90": mayor que 90. */
  comparador?: '<' | '>'
  /** Si el número se podía leer de dos maneras ("1.025"). */
  alternativa?: number
}

export function leerResultado(texto: string): ResultadoLeido | null {
  const m = /^\s*([<>]=?|inf\.?|sup\.?|menor de|mayor de)?\s*(.+)$/i.exec(texto)
  if (!m) return null
  const l: Lectura = leerNumero(m[2])
  if (!l.ok) return null
  const signo = m[1]?.toLowerCase()
  const comparador = !signo ? undefined : signo.startsWith('<') || signo.startsWith('inf') || signo.startsWith('menor') ? '<' : '>'
  return { valor: l.valor, ...(comparador ? { comparador } : {}), ...(l.alternativa !== undefined ? { alternativa: l.alternativa } : {}) }
}

/**
 * Lee el rango de referencia como lo escriben los laboratorios:
 * "(74 - 100)", "3,5-5,5", "(Inf. 37)" → menos de 37, "(Sup. 40)" → más de 40, "<200", ">60".
 */
export function leerRango(texto: string): Referencia | null {
  const t = texto.replace(/[()]/g, ' ').trim()
  const num = (s: string) => {
    const l = leerNumero(s)
    return l.ok ? l.valor : null
  }
  const entre = /^(-?[\d.,]+)\s*(?:-|–|a|hasta)\s*(-?[\d.,]+)/i.exec(t)
  if (entre) {
    const min = num(entre[1])
    const max = num(entre[2])
    return min !== null && max !== null && min <= max ? { min, max } : null
  }
  const menor = /^(?:inf\.?|inferior a|menor de|hasta|<=?)\s*([\d.,]+)/i.exec(t)
  if (menor) {
    const max = num(menor[1])
    return max !== null ? { max } : null
  }
  const mayor = /^(?:sup\.?|superior a|mayor de|>=?)\s*([\d.,]+)/i.exec(t)
  if (mayor) {
    const min = num(mayor[1])
    return min !== null ? { min } : null
  }
  return null
}

/** "74 - 100", "menos de 37", "más de 40" */
export function textoRango(r: Referencia | undefined, formatear: (n: number) => string): string {
  if (!r || (r.min === undefined && r.max === undefined)) return ''
  if (r.min !== undefined && r.max !== undefined) return `${formatear(r.min)} - ${formatear(r.max)}`
  if (r.max !== undefined) return `menos de ${formatear(r.max)}`
  return `más de ${formatear(r.min!)}`
}

/**
 * Si un número es ambiguo ("1.025"), elige la lectura que encaja con la referencia
 * (dentro de 10 veces por arriba o por abajo). Si no se puede decidir, devuelve null.
 */
export function resolverAmbiguo(r: ResultadoLeido, ref: Referencia | undefined): number | null {
  if (r.alternativa === undefined) return r.valor
  if (!ref) return null
  const bajo = (ref.min ?? ref.max ?? 0) / 10
  const alto = (ref.max ?? ref.min ?? 0) * 10
  const encaja = (v: number) => v >= bajo && v <= alto
  const opciones = [r.valor, r.alternativa].filter(encaja)
  return opciones.length === 1 ? opciones[0] : null
}

// ---- ¿Dentro de lo normal? ---------------------------------------------------

export type EstadoResultado = 'normal' | 'bajo' | 'alto' | 'sin-referencia'

export function estadoResultado(valor: number, comparador: '<' | '>' | undefined, ref: Referencia | undefined): EstadoResultado {
  if (!ref || (ref.min === undefined && ref.max === undefined)) return 'sin-referencia'
  const { min, max } = ref
  if (comparador === '<') {
    // El valor real es menor que `valor`.
    if (min !== undefined && valor <= min) return 'bajo'
    return 'normal'
  }
  if (comparador === '>') {
    // El valor real es mayor que `valor`.
    if (max !== undefined && valor >= max) return 'alto'
    return 'normal'
  }
  if (min !== undefined && valor < min) return 'bajo'
  if (max !== undefined && valor > max) return 'alto'
  return 'normal'
}

// ---- Leer un informe pegado ----------------------------------------------------

export interface FilaLeida {
  nombre: string
  resultado: ResultadoLeido
  unidad: string
  referencia: Referencia | null
  prueba?: PruebaLab
}

const NO_SON_PRUEBAS = /^(p[aá]gina|fecha|edad|sexo|nombre|n[ºo°.]|d\.?n\.?i|tel[eé]fono|madrid|barcelona|direct|centro|garante|servicio|peticionario|comentario)/i

/**
 * Lee el texto copiado de un informe de laboratorio, línea a línea:
 *   "Glucosa 91 mg/dl (74 - 100)"
 *   "ASAT (GOT) 25 UI/l (Inf. 37)"
 *   "CEA < 1.73 ng/ml (Inf. 5) No fumadores"
 * Devuelve las filas que entiende; las que no, se ignoran (cabeceras, notas…).
 */
export function leerInforme(texto: string): { filas: FilaLeida[]; fecha?: string } {
  const filas: FilaLeida[] = []
  const completa = /^(?<nombre>[^\d<>(].*?)\s+(?<res>(?:[<>]=?\s*)?-?\d[\d.,]*)(?=\s|$)(?<resto>.*)$/u
  // Línea con solo el resultado: el nombre venía en las líneas de antes (nombres largos partidos).
  const soloResultado = /^(?<res>(?:[<>]=?\s*)?-?\d[\d.,]*)(?=\s|$)(?<resto>.*)$/u
  let pendiente: string[] = []

  for (const bruta of texto.split(/\r?\n/)) {
    const l = bruta.trim()
    if (!l || NO_SON_PRUEBAS.test(l)) {
      pendiente = []
      continue
    }
    const sola = pendiente.length > 0 ? soloResultado.exec(l) : null
    const m = sola ?? (l.startsWith('(') ? null : completa.exec(l))
    if (!m?.groups) {
      // Puede ser el principio de un nombre largo; se guarda por si la línea siguiente trae el resultado.
      pendiente = [...pendiente, l].slice(-3)
      continue
    }
    const nombre = (sola ? pendiente.join(' ') : m.groups.nombre).trim().replace(/\s+/g, ' ')
    pendiente = []
    const fila = leerFila(nombre, m.groups.res, m.groups.resto)
    if (fila) filas.push(fila)
  }
  return { filas, fecha: fechaDelInforme(texto) }
}

/**
 * La fecha del análisis: la de la extracción o la muestra si aparece; si no, la primera «Fecha…».
 * Nunca la de nacimiento.
 */
function fechaDelInforme(texto: string): string | undefined {
  const candidatas: { fecha: string; preferida: boolean }[] = []
  for (const m of texto.matchAll(/fecha([^\d\n]{0,30}?)(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/gi)) {
    const delante = normalizar(m[1])
    if (delante.includes('nac')) continue
    const fecha = `${m[4]}-${m[3].padStart(2, '0')}-${m[2].padStart(2, '0')}`
    if (!esFechaValida(fecha)) continue
    candidatas.push({ fecha, preferida: /extrac|toma|muestra|recog/.test(delante) })
  }
  return (candidatas.find((c) => c.preferida) ?? candidatas[0])?.fecha
}

/** Separa "mg/dl (74 - 100) *" en unidad y referencia, y decide si la fila es una prueba. */
function leerFila(nombre: string, res: string, resto: string): FilaLeida | null {
  const resultado = leerResultado(res)
  if (!resultado) return null
  const r = resto.trim()
  const ref = /\([^)]*\)/.exec(r)?.[0]
  let unidad = /^[^\s(]+/.exec(r)?.[0] ?? ''
  // Si lo que sigue al número es "Inf."/"Sup." o una palabra normal, no es una unidad.
  const esPalabra = /^[a-záéíóúñ]+\.?$/i.test(unidad) && !/^(u|ui|fl|pg|mg|g|kg|l|ml|ug|meq)$/i.test(unidad)
  if (/^(inf|sup)\.?$/i.test(unidad) || esPalabra) unidad = ''
  let referencia = ref ? leerRango(ref) : leerRango(r.replace(unidad, ''))
  // "(Sup. 5.0) Cifra de riesgo": aquí "Sup." no es lo normal, es a partir de dónde hay riesgo.
  if (referencia && /riesgo/i.test(r) && referencia.min !== undefined && referencia.max === undefined) {
    referencia = { max: referencia.min }
  }
  const prueba = buscarPrueba(nombre, unidad)
  // Solo se aceptan líneas con referencia o con una prueba conocida (así no se cuelan fechas o números de póliza).
  if (!referencia && !prueba) return null
  return { nombre, resultado, unidad, referencia, prueba }
}
