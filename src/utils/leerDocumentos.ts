// Lectores sin IA de documentos con forma fija: la receta de las gafas y los partes de baja.
// Como con los análisis, la app propone lo que reconoce y la persona lo revisa antes de guardar.
import type { GraduacionOjo, RevisionOcular, TipoAlta, TipoBaja } from '../db/tipos'
import type { FilaPdf } from './leerPdf'

/** «18/08/2026», «18-08-26», «18.8.2026» → «2026-08-18». */
export function fechaDeTexto(texto: string): string | undefined {
  const m = texto.match(/\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{4}|\d{2})\b/)
  if (!m) return undefined
  const [d, mes, a] = [Number(m[1]), Number(m[2]), m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])]
  if (d < 1 || d > 31 || mes < 1 || mes > 12) return undefined
  return `${a}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

const sinAcentos = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Lo que va detrás de «Etiqueta:» en la primera fila que la tenga. */
function valorDe(filas: FilaPdf[], etiqueta: RegExp): string | undefined {
  const conDosPuntos = new RegExp(`${etiqueta.source}\\s*:`)
  for (const f of filas) {
    const original = f.texto.normalize('NFC')
    // Se busca sin acentos, letra a letra, para poder cortar luego el texto original en el mismo sitio.
    const plano = [...original].map((c) => sinAcentos(c)[0] ?? c).join('')
    const m = plano.match(conDosPuntos)
    if (m && m.index !== undefined) return original.slice(m.index + m[0].length).trim() || undefined
  }
  return undefined
}

/** «gripe (síndrome gripal)» → «Gripe» (el motivo corto, con mayúscula). */
const motivoCorto = (diagnostico: string) => {
  const corto = diagnostico.split(/[(,;]/)[0].trim()
  return corto.charAt(0).toUpperCase() + corto.slice(1)
}

// ---------- Receta de las gafas ----------

export type OjoLeido = Partial<Record<keyof GraduacionOjo, string>>

export interface RecetaGafasLeida {
  fecha?: string
  tipo?: RevisionOcular['tipo']
  donde?: string
  derecho: OjoLeido
  izquierdo: OjoLeido
  notas?: string
}

/** Las columnas de la tabla, como suelen venir en las recetas (en castellano o en inglés). */
const COLUMNAS: [keyof GraduacionOjo, RegExp][] = [
  ['esfera', /^(esf|esfera|sph|esf\.)$/],
  ['cilindro', /^(cil|cilindro|cyl|cil\.)$/],
  ['eje', /^(eje|axis|ax)$/],
  ['adicion', /^(add|adic|adicion|ad)$/],
  ['agudeza', /^(av|agudeza|va)$/],
  ['presion', /^(pio|presion|tio)$/],
]

const esOjo = (s: string): 'derecho' | 'izquierdo' | undefined => {
  const t = sinAcentos(s).replace(/[.:]/g, '')
  if (/^(od|ojo derecho|derecho|re)$/.test(t)) return 'derecho'
  if (/^(oi|os|ojo izquierdo|izquierdo|le)$/.test(t)) return 'izquierdo'
  return undefined
}

/** «-2,50» → «-2,50»; «+1.00» → «1,00»; «180°» → «180». Lo que no es un número, nada. */
function numero(s: string): string | undefined {
  const t = s.replace(/[−–]/g, '-').replace('°', '').replace(/^\+/, '').trim()
  return /^-?\d+([.,]\d+)?$/.test(t) ? t.replace('.', ',') : undefined
}

export function leerRecetaGafas(filas: FilaPdf[]): RecetaGafasLeida | null {
  // La fila de cabecera: la que tiene al menos esfera y otra columna.
  let cabecera: { clave: keyof GraduacionOjo; x: number }[] = []
  for (const f of filas) {
    const cols = f.trozos.flatMap((t) => {
      const c = COLUMNAS.find(([, r]) => r.test(sinAcentos(t.str)))
      return c ? [{ clave: c[0], x: t.x }] : []
    })
    if (cols.some((c) => c.clave === 'esfera') && cols.length >= 2) {
      cabecera = cols
      break
    }
  }
  if (cabecera.length === 0) return null

  const leida: RecetaGafasLeida = { derecho: {}, izquierdo: {} }
  for (const f of filas) {
    const ojo = f.trozos[0] && esOjo(f.trozos[0].str)
    if (!ojo) continue
    // Cada número va a la columna que tiene más cerca (las casillas vacías no salen en el PDF).
    for (const t of f.trozos.slice(1)) {
      const v = numero(t.str)
      if (v === undefined) continue
      const col = cabecera.reduce((a, b) => (Math.abs(b.x - t.x) < Math.abs(a.x - t.x) ? b : a))
      leida[ojo][col.clave] = v
    }
  }
  if (Object.keys(leida.derecho).length + Object.keys(leida.izquierdo).length === 0) return null

  const texto = sinAcentos(filas.map((f) => f.texto).join('\n'))
  leida.fecha = fechaDeTexto(valorDe(filas, /\bfecha\b/) ?? '')
  leida.tipo = /lentilla|lente de contacto/.test(texto) && !/gafa/.test(texto) ? 'lentillas' : /oftalmolog/.test(texto) ? 'revision' : 'gafas'
  // El sitio: una de las primeras líneas, si es una óptica o una consulta («ÓPTICA EJEMPLO - GRADUACIÓN» → «Óptica Ejemplo»).
  const cabeza = filas.slice(0, 4).find((f) => /optica|oftalmolog|clinica|centro/.test(sinAcentos(f.texto)))?.texto
  if (cabeza) {
    const sitio = cabeza.split(/\s+-\s+/)[0].trim()
    leida.donde = sitio === sitio.toUpperCase() ? sitio.toLowerCase().replace(/(^|\s)\p{L}/gu, (l) => l.toUpperCase()) : sitio
  }
  const lentes = valorDe(filas, /lentes recomendadas/)
  if (lentes) leida.notas = `Lentes recomendadas: ${lentes}`
  return leida
}

// ---------- Partes de baja, de confirmación y de alta ----------

export interface ParteLeido {
  clase: 'baja' | 'confirmacion' | 'alta'
  inicio?: string
  tipo?: TipoBaja
  motivo?: string
  diagnostico?: string
  medico?: string
  centro?: string
  empresa?: string
  /** La fecha de este parte, si es de confirmación. */
  confirmacion?: string
  fin?: string
  tipoAlta?: TipoAlta
  proximaRevision?: string
}

export function leerParteBaja(filas: FilaPdf[]): ParteLeido | null {
  const texto = sinAcentos(filas.map((f) => f.texto).join('\n'))
  if (!/incapacidad temporal|parte (medico )?de (baja|alta|confirmacion)/.test(texto)) return null

  const titulo = sinAcentos(filas.slice(0, 3).map((f) => f.texto).join(' '))
  const clase: ParteLeido['clase'] = /confirmacion/.test(titulo) ? 'confirmacion' : /\balta\b/.test(titulo) ? 'alta' : 'baja'
  const p: ParteLeido = { clase }

  p.inicio = fechaDeTexto(valorDe(filas, /fecha (de (la )?)?baja/) ?? '')
  const contingencia = sinAcentos(valorDe(filas, /contingencia/) ?? '')
  p.tipo = /accidente (de trabajo|laboral)/.test(contingencia)
    ? 'accidente-laboral'
    : /accidente no laboral/.test(contingencia)
      ? 'accidente-no-laboral'
      : /profesional/.test(contingencia)
        ? 'enfermedad-profesional'
        : /comun/.test(contingencia)
          ? 'comun'
          : undefined

  const diagnostico = valorDe(filas, /diagnostico/)
  if (diagnostico) {
    p.diagnostico = diagnostico.charAt(0).toUpperCase() + diagnostico.slice(1)
    p.motivo = motivoCorto(diagnostico)
  }
  // «Médico: Dra. Ejemplo - Centro de Salud Ejemplo»
  const medico = valorDe(filas, /\bmedic[oa]\b/)
  if (medico) [p.medico, p.centro] = medico.split(/\s+-\s+/).map((s) => s.trim())
  const empresa = valorDe(filas, /\bempresa\b/)
  if (empresa) p.empresa = empresa === empresa.toUpperCase() ? empresa.replace(/\p{L}+/gu, (w) => (/^(S|L|SL|SA)$/.test(w) ? w : w.charAt(0) + w.slice(1).toLowerCase())) : empresa

  if (clase === 'confirmacion') p.confirmacion = fechaDeTexto(valorDe(filas, /fecha de (este parte|confirmacion|la confirmacion)/) ?? '')
  if (clase === 'alta') {
    p.fin = fechaDeTexto(valorDe(filas, /fecha (del |de )?(la )?alta/) ?? '')
    const causa = sinAcentos(valorDe(filas, /(motivo|causa) del alta/) ?? '')
    p.tipoAlta = /mejoria/.test(causa)
      ? 'mejoria'
      : /curacion/.test(causa)
        ? 'curacion'
        : /inspeccion/.test(causa)
          ? 'inspeccion'
          : /incapacidad/.test(causa)
            ? 'incapacidad'
            : causa
              ? 'otra'
              : undefined
  }
  p.proximaRevision = fechaDeTexto(valorDe(filas, /proxima revision/) ?? '')
  return p
}
