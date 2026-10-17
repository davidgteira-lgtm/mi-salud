// Preparar el texto de la pantalla para que el móvil lo lea en voz alta de forma natural:
// sin iconos, con las unidades dichas con palabras y en trozos cortos.

// Unidades como se dicen. Las más largas primero, para que "mg/dL" no se lea como "mg" + "/dL".
const UNIDADES: [RegExp, string][] = [
  [/\bmL\/min\/1[.,]73\s?m(?:²|\^?2)/gi, 'mililitros por minuto'],
  [/\bmg\/dL\b/gi, 'miligramos por decilitro'],
  [/\bg\/dL\b/gi, 'gramos por decilitro'],
  [/\bµg\/dL\b/gi, 'microgramos por decilitro'],
  [/\bng\/mL\b/gi, 'nanogramos por mililitro'],
  [/\bpg\/mL\b/gi, 'picogramos por mililitro'],
  [/\bmmol\/L\b/gi, 'milimoles por litro'],
  [/\bµUI\/mL\b|\bmcU\/mL\b/gi, 'microunidades por mililitro'],
  [/\bU\/L\b|\bUI\/L\b/gi, 'unidades por litro'],
  [/\b10e3\/µL\b/gi, 'miles por microlitro'],
  [/\b10e6\/µL\b/gi, 'millones por microlitro'],
  [/\bmmHg\b/g, 'milímetros de mercurio'],
  [/\blpm\b/g, 'latidos por minuto'],
  [/\bkg\b/g, 'kilos'],
  [/(\d)\s?°C/g, '$1 grados'],
  [/(\d)\s?%/g, '$1 por ciento'],
]

/**
 * Deja el texto listo para leerlo:
 * "▲ Alta · 141 mg/dL" → "Alta, 141 miligramos por decilitro"
 */
export function prepararParaLeer(texto: string): string {
  let t = texto
    // Iconos y símbolos que no se leen.
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, ' ')
    .replace(/[✓▲▼⚠⏹•←→]/g, ' ')
    // El punto medio separa cosas: se lee como una pausa.
    .replace(/\s*·\s*/g, ', ')
    .replace(/[«»"]/g, '')
  for (const [patron, palabras] of UNIDADES) t = t.replace(patron, palabras)
  return t
    .replace(/\s*,\s*(,\s*)+/g, ', ')
    .replace(/[ \t]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    // Ojo: sin \s, que también borraría los saltos de línea.
    .replace(/^[ \t,]+|[ \t,]+$/gm, '')
    .replace(/\n{2,}/g, '\n')
    .trim()
}

/**
 * Parte el texto en trozos cortos (por líneas y frases) para leerlos uno detrás de otro.
 * Algunos móviles cortan la lectura si el texto es muy largo.
 */
export function trocear(texto: string, maximo = 180): string[] {
  const trozos: string[] = []
  for (const linea of prepararParaLeer(texto).split('\n')) {
    if (!linea) continue
    if (linea.length <= maximo) {
      trozos.push(linea)
      continue
    }
    let actual = ''
    for (const frase of linea.split(/(?<=[.;:])\s+/)) {
      if (actual && (actual + ' ' + frase).length > maximo) {
        trozos.push(actual)
        actual = frase
      } else actual = actual ? `${actual} ${frase}` : frase
    }
    if (actual) trozos.push(actual)
  }
  return trozos
}
