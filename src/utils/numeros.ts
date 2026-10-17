// Leer y escribir números como se escriben en España y en los informes, sin líos.
//
// Reglas para leer:
//  - La coma es decimal: "36,7" → 36.7
//  - El punto también es decimal (así lo escriben muchos laboratorios): "5.20" → 5.2
//  - Varios grupos de 3 cifras con punto son miles: "1.234.567" → 1234567
//  - Punto y coma juntos: el punto es de miles y la coma decimal: "1.234,5" → 1234.5
//  - "250.000" o "1.025" se pueden leer de DOS maneras (miles o decimal). En ese caso
//    se devuelven las dos y quien llama decide según lo que sea razonable, o pregunta.
//  - Se ignoran espacios y unidades pegadas: "75,5 kg" → 75.5

export type Lectura =
  | {
      ok: true
      valor: number
      /** Otra forma de leerlo, cuando el número es ambiguo ("1.025": 1,025 o 1025). */
      alternativa?: number
    }
  | { ok: false; error: string }

const NO_ES_NUMERO: Lectura = { ok: false, error: 'No entiendo el número. Escríbelo solo con cifras, por ejemplo 5,4.' }

export function leerNumero(texto: string): Lectura {
  // Quita espacios (también los de miles "250 000") y lo que vaya detrás del número (unidades).
  const limpio = texto.trim().replace(/\s+/g, '')
  const m = /^(-?[\d.,]+)[a-zA-Zµ%/³²°]*.*$/.exec(limpio)
  if (!m) return NO_ES_NUMERO
  let n = m[1]
  if (!/\d/.test(n)) return NO_ES_NUMERO

  const tienePunto = n.includes('.')
  const tieneComa = n.includes(',')
  let alternativa: number | undefined

  if (tienePunto && tieneComa) {
    // "1.234,5": punto de miles y coma decimal. Al revés ("1,234.5") no es como se escribe aquí.
    if (!/^-?\d{1,3}(\.\d{3})+,\d+$/.test(n)) return NO_ES_NUMERO
    n = n.replaceAll('.', '').replace(',', '.')
  } else if (tieneComa) {
    if ((n.match(/,/g) ?? []).length > 1) return NO_ES_NUMERO
    n = n.replace(',', '.')
  } else if (tienePunto) {
    if (/^-?[1-9]\d{0,2}(\.\d{3}){2,}$/.test(n)) {
      // Dos o más grupos de miles: no hay duda.
      n = n.replaceAll('.', '')
    } else if (/^-?[1-9]\d{0,2}\.\d{3}$/.test(n)) {
      // "1.025" o "250.000": puede ser decimal o de miles.
      alternativa = Number(n.replace('.', ''))
    } else if ((n.match(/\./g) ?? []).length > 1) {
      return NO_ES_NUMERO
    }
  }

  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(n)) return NO_ES_NUMERO
  const valor = Number(n)
  if (!Number.isFinite(valor)) return NO_ES_NUMERO
  return alternativa === undefined ? { ok: true, valor } : { ok: true, valor, alternativa }
}

export type Eleccion =
  | { ok: true; valor: number }
  | { ok: false; error: string }
  /** Las dos lecturas son posibles: hay que preguntar. */
  | { ok: false; error: string; opciones: [number, number] }

/**
 * Lee un número y comprueba que está entre unos límites razonables (para cazar erratas).
 * Si el número es ambiguo, se queda con la lectura que encaja; si encajan las dos, pregunta.
 */
export function leerNumeroEntre(texto: string, minimo: number, maximo: number, que: string): Eleccion {
  const l = leerNumero(texto)
  if (!l.ok) return l
  const dentro = (v: number) => v >= minimo && v <= maximo
  const candidatos = [l.valor, l.alternativa].filter((v): v is number => v !== undefined && dentro(v))
  if (candidatos.length === 1) return { ok: true, valor: candidatos[0] }
  if (candidatos.length === 2) {
    return {
      ok: false,
      error: `¿Quieres decir ${formatearNumero(l.valor, 3)} o ${formatearNumero(l.alternativa!, 3)}?`,
      opciones: [l.valor, l.alternativa!],
    }
  }
  return {
    ok: false,
    error: `${formatearNumero(l.valor, 3)} no parece ${que} posible. Revisa que esté bien escrito.`,
  }
}

/** "120/80" o "120-80" → tensión alta y baja. */
export function leerTension(texto: string): { ok: true; alta: number; baja: number } | { ok: false; error: string } {
  const m = /^\s*(\d{2,3})\s*[/\-–]\s*(\d{2,3})\s*$/.exec(texto)
  if (!m) return { ok: false, error: 'Escribe la tensión así: 120/80.' }
  return { ok: true, alta: Number(m[1]), baja: Number(m[2]) }
}

/**
 * 36.7 → "36,7"; 1500 → "1500"; 250000 → "250.000"; sin decimales de más.
 * Como manda la norma española, los números de 4 cifras no llevan punto de miles
 * (así "1500" nunca se confunde con "1,5"). Se hace a mano para que salga igual en todos los móviles.
 */
export function formatearNumero(n: number, maxDecimales = 2): string {
  const [entera, decimales] = new Intl.NumberFormat('en-US', { maximumFractionDigits: maxDecimales, useGrouping: false })
    .format(n)
    .split('.')
  const signo = entera.startsWith('-') ? '-' : ''
  const cifras = entera.replace('-', '')
  const agrupada = cifras.length >= 5 ? cifras.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : cifras
  return signo + agrupada + (decimales ? `,${decimales}` : '')
}
