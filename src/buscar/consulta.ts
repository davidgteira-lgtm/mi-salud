// La búsqueda inteligente: entiende lo que se escribe aunque sea con otras palabras,
// con faltas o con fechas («el año pasado», «marzo de 2025»). Todo sin internet.
import type { FechaISO } from '../db/tipos'
import { hoyISO } from '../utils/fechas'
import { normalizar } from '../utils/texto'

/** Palabras que, para buscar, significan lo mismo (ya sin tildes ni mayúsculas). */
export const SINONIMOS: string[][] = [
  ['tension', 'hipertension', 'hipotension', 'presion'],
  ['azucar', 'glucosa', 'glucemia', 'diabetes', 'diabetico', 'diabetica', 'hba1c', 'glicada'],
  ['corazon', 'cardiologia', 'cardiologo', 'cardiologa', 'cardiaco', 'cardiaca', 'infarto', 'arritmia'],
  ['rinon', 'nefrologia', 'nefrologo', 'nefrologa', 'renal', 'creatinina'],
  ['ojo', 'vista', 'oftalmologia', 'oftalmologo', 'oftalmologa', 'oculista', 'gafas', 'lentilla', 'graduacion', 'optica'],
  ['miopia', 'miope'],
  ['hipermetropia', 'hipermetrope'],
  ['baja', 'incapacidad', 'parte'],
  ['hueso', 'traumatologia', 'traumatologo', 'traumatologa', 'fractura'],
  ['piel', 'dermatologia', 'dermatologo', 'dermatologa'],
  ['estomago', 'digestivo', 'gastroenterologia', 'gastritis'],
  ['pulmon', 'neumologia', 'neumologo', 'neumologa', 'asma', 'epoc'],
  ['cabeza', 'neurologia', 'neurologo', 'neurologa', 'migrana', 'jaqueca'],
  ['ginecologia', 'ginecologo', 'ginecologa', 'ginecologico'],
  ['diente', 'muela', 'dentista', 'dental', 'boca', 'odontologo', 'odontologa'],
  ['vacuna', 'vacunacion'],
  ['analisis', 'analitica', 'resultado'],
  ['medicamento', 'medicina', 'pastilla', 'farmaco', 'medicacion', 'tratamiento', 'comprimido'],
  ['cita', 'consulta', 'visita'],
  ['colesterol', 'ldl', 'hdl', 'trigliceridos'],
  ['alergia', 'alergico', 'alergica', 'intolerancia'],
  ['operacion', 'cirugia', 'intervencion', 'operado', 'operada', 'quirofano'],
  ['radiografia', 'rx', 'placa', 'rayos'],
  ['tac', 'escaner', 'tomografia'],
  ['resonancia', 'rmn'],
  ['ecografia', 'eco'],
  ['urgencia'],
  ['ingreso', 'hospitalizacion', 'ingresado', 'ingresada'],
  ['regla', 'periodo', 'menstruacion'],
  ['peso', 'kilo'],
  ['fiebre', 'temperatura'],
  ['oxigeno', 'saturacion'],
  ['pulso', 'pulsacion', 'latido'],
  ['tiroides', 'tsh', 'endocrino', 'endocrinologia', 'endocrinologo', 'endocrinologa'],
  ['telefono', 'llamar'],
]

/** Palabras que no aportan nada al buscar. */
const VACIAS = new Set(
  'de del la el los las un una unos unas en mi mis me y o a al con para por que cuando cual donde lo le se su sus es fue era tengo tenia tome tomo tomar ver ultima ultimo esta este estas estos hay'.split(
    ' ',
  ),
)

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

/** Singular sencillo: «pastillas» → «pastilla», «análisis» se queda igual. */
export function singular(palabra: string): string {
  if (palabra.length > 4 && palabra.endsWith('es') && !palabra.endsWith('ies') && /[^aeiou]es$/.test(palabra) && !palabra.endsWith('sis')) {
    return palabra.slice(0, -2)
  }
  if (palabra.length > 3 && palabra.endsWith('s') && !palabra.endsWith('sis') && !palabra.endsWith('us')) return palabra.slice(0, -1)
  return palabra
}

/** Cuántas letras hay que cambiar para pasar de una palabra a otra (con límite, para ir rápido). */
export function distancia(a: string, b: string, limite: number): number {
  if (Math.abs(a.length - b.length) > limite) return limite + 1
  let anterior = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const actual = [i]
    let minimo = i
    for (let j = 1; j <= b.length; j++) {
      actual[j] = Math.min(anterior[j] + 1, actual[j - 1] + 1, anterior[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
      minimo = Math.min(minimo, actual[j])
    }
    if (minimo > limite) return limite + 1
    anterior = actual
  }
  return anterior[b.length]
}

/** Erratas que se perdonan según lo larga que sea la palabra. */
function erratasPermitidas(palabra: string): number {
  if (palabra.length >= 8) return 2
  if (palabra.length >= 5) return 1
  return 0
}

export interface Termino {
  /** Lo que escribió la persona (normalizado). */
  original: string
  /** Lo que se busca: la palabra, su singular y sus sinónimos. */
  variantes: string[]
}

export interface Rango {
  desde: FechaISO
  hasta: FechaISO
  /** Cómo se dice, para enseñarlo: «en 2025», «en marzo de 2025». */
  texto: string
}

export interface Consulta {
  terminos: Termino[]
  rango?: Rango
}

const p2 = (n: number) => String(n).padStart(2, '0')
const finDeMes = (ano: number, mes: number) => `${ano}-${p2(mes)}-${p2(new Date(Date.UTC(ano, mes, 0)).getUTCDate())}`

/** Entiende lo escrito: palabras (con sinónimos) y, si las hay, fechas. */
export function entender(texto: string, hoy: FechaISO = hoyISO()): Consulta {
  let t = ` ${normalizar(texto)} `
  const anoHoy = Number(hoy.slice(0, 4))
  const mesHoy = Number(hoy.slice(5, 7))
  let rango: Rango | undefined

  const quitar = (patron: RegExp) => {
    t = t.replace(patron, ' ')
  }

  // Fechas dichas con palabras.
  if (/ hoy /.test(t)) {
    rango = { desde: hoy, hasta: hoy, texto: 'hoy' }
    quitar(/ hoy /)
  } else if (/ (el )?ano pasado /.test(t)) {
    rango = { desde: `${anoHoy - 1}-01-01`, hasta: `${anoHoy - 1}-12-31`, texto: `en ${anoHoy - 1}` }
    quitar(/ (el )?ano pasado /)
  } else if (/ (este|esto) ano /.test(t)) {
    rango = { desde: `${anoHoy}-01-01`, hasta: `${anoHoy}-12-31`, texto: `en ${anoHoy}` }
    quitar(/ (este|esto) ano /)
  } else if (/ (el )?mes pasado /.test(t)) {
    const ano = mesHoy === 1 ? anoHoy - 1 : anoHoy
    const mes = mesHoy === 1 ? 12 : mesHoy - 1
    rango = { desde: `${ano}-${p2(mes)}-01`, hasta: finDeMes(ano, mes), texto: `en ${MESES[mes - 1]} de ${ano}` }
    quitar(/ (el )?mes pasado /)
  } else if (/ este mes /.test(t)) {
    rango = { desde: `${anoHoy}-${p2(mesHoy)}-01`, hasta: finDeMes(anoHoy, mesHoy), texto: `en ${MESES[mesHoy - 1]} de ${anoHoy}` }
    quitar(/ este mes /)
  } else {
    // «marzo de 2025», «marzo 2025», «2025», «marzo».
    const mes = MESES.findIndex((m) => t.includes(` ${m} `)) + 1
    const anoTexto = / (19\d\d|20\d\d) /.exec(t)?.[1]
    const ano = anoTexto ? Number(anoTexto) : undefined
    if (mes && ano) rango = { desde: `${ano}-${p2(mes)}-01`, hasta: finDeMes(ano, mes), texto: `en ${MESES[mes - 1]} de ${ano}` }
    else if (ano) rango = { desde: `${ano}-01-01`, hasta: `${ano}-12-31`, texto: `en ${ano}` }
    else if (mes) {
      // Un mes sin año: el último que ha pasado (este mismo, si estamos en él).
      const a = mes <= mesHoy ? anoHoy : anoHoy - 1
      rango = { desde: `${a}-${p2(mes)}-01`, hasta: finDeMes(a, mes), texto: `en ${MESES[mes - 1]} de ${a}` }
    }
    if (mes) quitar(new RegExp(` ${MESES[mes - 1]} `))
    if (ano) quitar(new RegExp(` ${ano} `))
  }

  const palabras = t.split(' ').filter((p) => p && !VACIAS.has(p))
  const terminos = palabras.map((original) => {
    const base = singular(original)
    const grupo = SINONIMOS.find((g) => g.includes(original) || g.includes(base))
    return { original, variantes: [...new Set([original, base, ...(grupo ?? [])])] }
  })
  return { terminos, rango }
}

// ---------- Buscar en los documentos ----------

/** Una cosa apuntada en la app, preparada para buscar en ella. */
export interface Documento {
  /** Sección de la app (la clave de la ruta). */
  seccion: string
  id: string
  icono: string
  titulo: string
  detalle?: string
  /** Solo para enseñar dónde está (por ejemplo, en qué cita va una foto). No se busca en él. */
  donde?: string
  fecha?: FechaISO
  /**
   * Otros textos donde buscar (notas, resumen de la IA, resultados…).
   * Con { ver, buscar }, se busca también en «buscar» pero solo se enseña «ver»
   * (por ejemplo, los otros nombres de una prueba de laboratorio).
   */
  textos: (string | { ver: string; buscar: string })[]
}

export interface Encontrado {
  doc: Documento
  puntos: number
  /** El texto donde se ha encontrado, si no es el título ni el detalle. */
  fragmento?: string
}

/** Qué tal encaja un término en un texto: 0 = nada; 4 = la palabra exacta. */
function encaje(termino: Termino, palabrasTexto: string[]): number {
  let mejor = 0
  for (const w of palabrasTexto) {
    for (const v of termino.variantes) {
      const esLaSuya = v === termino.original || v === singular(termino.original)
      if (w === v || singular(w) === v) mejor = Math.max(mejor, esLaSuya ? 4 : 3)
      else if (v.length >= 3 && w.startsWith(v)) mejor = Math.max(mejor, esLaSuya ? 3 : 2)
    }
    // Erratas, solo con lo que escribió la persona (no con los sinónimos, para no traer cosas raras).
    if (mejor < 1) {
      const permitidas = erratasPermitidas(termino.original)
      if (permitidas > 0 && w.length >= 4 && distancia(termino.original, w, permitidas) <= permitidas) mejor = 1
    }
    if (mejor === 4) break
  }
  return mejor
}

/** Busca: tienen que aparecer todas las palabras (o sus sinónimos) y, si hay fecha, estar en ella. */
export function buscarEn(docs: Documento[], consulta: Consulta): Encontrado[] {
  if (consulta.terminos.length === 0 && !consulta.rango) return []
  const resultados: Encontrado[] = []
  for (const doc of docs) {
    if (consulta.rango) {
      if (!doc.fecha || doc.fecha < consulta.rango.desde || doc.fecha > consulta.rango.hasta) continue
    }
    const principal = normalizar(`${doc.titulo} ${doc.detalle ?? ''}`).split(' ')
    const otros = doc.textos.map((x) =>
      typeof x === 'string'
        ? { texto: x, palabras: normalizar(x).split(' ') }
        : { texto: x.ver, palabras: normalizar(`${x.ver} ${x.buscar}`).split(' ') },
    )
    let puntos = 0
    let fragmento: string | undefined
    let vale = true
    for (const termino of consulta.terminos) {
      const enPrincipal = encaje(termino, principal)
      if (enPrincipal > 0) {
        puntos += enPrincipal * 2
        continue
      }
      let mejorOtro = 0
      let donde: string | undefined
      for (const o of otros) {
        const e = encaje(termino, o.palabras)
        if (e > mejorOtro) {
          mejorOtro = e
          donde = o.texto
        }
      }
      if (mejorOtro === 0) {
        vale = false
        break
      }
      puntos += mejorOtro
      fragmento ??= donde
    }
    if (vale) resultados.push({ doc, puntos, fragmento })
  }
  return resultados.sort((a, b) => b.puntos - a.puntos || (b.doc.fecha ?? '').localeCompare(a.doc.fecha ?? ''))
}

/** Recorta un texto largo alrededor de lo encontrado. */
export function recortar(texto: string, maximo = 120): string {
  const limpio = texto.replace(/\s+/g, ' ').trim()
  return limpio.length <= maximo ? limpio : `${limpio.slice(0, maximo - 1).trimEnd()}…`
}
