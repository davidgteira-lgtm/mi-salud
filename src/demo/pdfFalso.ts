// Documentos PDF INVENTADOS para las personas de ejemplo (partes de baja, informes…).
// Un PDF muy sencillo, con letra Helvetica, hecho a mano para no depender de nada.

/** Una línea: [x, y, tamaño, texto, negrita?]. La página es A4 (595 × 842 puntos). */
export type LineaPdf = [number, number, number, string, boolean?]

const BARRA = String.fromCharCode(92)
const escapar = (s: string) =>
  s
    .split('')
    .map((c) => ('()'.includes(c) || c === BARRA ? BARRA + c : c))
    .join('')

/** Texto a bytes en la codificación de las letras del PDF (WinAnsi: sirve para á, é, ñ…). */
function aBytes(texto: string): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(new ArrayBuffer(texto.length))
  for (let i = 0; i < texto.length; i++) {
    const c = texto.charCodeAt(i)
    bytes[i] = c < 256 ? c : 63 // lo que no cabe, «?»
  }
  return bytes
}

export function crearPdf(lineas: LineaPdf[], rayas: [number, number, number, number][] = []): Blob {
  const aviso: LineaPdf[] = [
    [50, 30, 8, 'DOCUMENTO DE EJEMPLO CON DATOS INVENTADOS. NO TIENE NINGUNA VALIDEZ.', true],
    [420, 812, 8, 'EJEMPLO - NO VÁLIDO', true],
  ]
  const flujo = [
    ...rayas.map(([a, b, c, d]) => `0.6 G ${a} ${b} m ${c} ${d} l S`),
    ...[...lineas, ...aviso].map(([x, y, t, s, negrita]) => `BT /${negrita ? 'F2' : 'F1'} ${t} Tf ${x} ${y} Td (${escapar(s)}) Tj ET`),
  ].join('\n')
  const fuente = (n: string) => `<< /Type /Font /Subtype /Type1 /BaseFont /${n} /Encoding /WinAnsiEncoding >>`
  const objetos = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>',
    fuente('Helvetica'),
    fuente('Helvetica-Bold'),
    `<< /Length ${flujo.length} >>\nstream\n${flujo}\nendstream`,
  ]
  let doc = '%PDF-1.4\n'
  const posiciones: number[] = []
  objetos.forEach((o, i) => {
    posiciones.push(doc.length)
    doc += `${i + 1} 0 obj\n${o}\nendobj\n`
  })
  const xref = doc.length
  doc += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n` + posiciones.map((p) => `${String(p).padStart(10, '0')} 00000 n \n`).join('')
  doc += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  // Cada letra ocupa un byte, así que las posiciones contadas en letras son las de los bytes.
  return new Blob([aBytes(doc)], { type: 'application/pdf' })
}

/** «2026-03-04» → «04/03/2026» */
export const fechaEs = (f: string) => `${f.slice(8, 10)}/${f.slice(5, 7)}/${f.slice(0, 4)}`
