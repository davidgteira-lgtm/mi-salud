// Crea documentos INVENTADOS para probar la subida de archivos en la app (sin datos de nadie).
// Uso: node scripts/crear-documentos-prueba.mjs  → public/documentos-de-prueba/
import { mkdirSync, writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const CARPETA = new URL('../public/documentos-de-prueba/', import.meta.url)
mkdirSync(CARPETA, { recursive: true })

// ---------- PDF sencillo: textos (Helvetica) y líneas ----------

const BARRA = String.fromCharCode(92)
const escapar = (s) =>
  s
    .split('')
    .map((c) => ('()'.includes(c) || c === BARRA ? BARRA + c : c))
    .join('')

/** textos: [x, y, tamaño, texto, negrita?]; rayas: [x1, y1, x2, y2] */
function pdf(nombre, textos, rayas = []) {
  const aviso = [
    [50, 30, 8, 'DOCUMENTO DE PRUEBA CON DATOS INVENTADOS. NO TIENE NINGUNA VALIDEZ.', true],
    [400, 812, 8, 'EJEMPLO - NO VALIDO', true],
  ]
  const flujo = [
    ...rayas.map(([a, b, c, d]) => `0.6 G ${a} ${b} m ${c} ${d} l S`),
    ...[...textos, ...aviso].map(([x, y, t, s, negrita]) => `BT /${negrita ? 'F2' : 'F1'} ${t} Tf ${x} ${y} Td (${escapar(s)}) Tj ET`),
  ].join('\n')
  const fuente = (n) => `<< /Type /Font /Subtype /Type1 /BaseFont /${n} /Encoding /WinAnsiEncoding >>`
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>',
    fuente('Helvetica'),
    fuente('Helvetica-Bold'),
    `<< /Length ${Buffer.byteLength(flujo, 'latin1')} >>\nstream\n${flujo}\nendstream`,
  ]
  let doc = '%PDF-1.4\n'
  const pos = []
  objs.forEach((o, i) => {
    pos.push(Buffer.byteLength(doc, 'latin1'))
    doc += `${i + 1} 0 obj\n${o}\nendobj\n`
  })
  const xref = Buffer.byteLength(doc, 'latin1')
  doc += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + pos.map((p) => `${String(p).padStart(10, '0')} 00000 n \n`).join('')
  doc += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  writeFileSync(new URL(nombre, CARPETA), doc, 'latin1')
}

/** Filas de una tabla: [y, columnas...] con las x indicadas. */
const tabla = (y0, paso, xs, filas, tam = 10) => filas.flatMap((f, i) => f.map((t, j) => [xs[j], y0 - i * paso, tam, t]))

// 1. Análisis de sangre
pdf(
  'analisis-ejemplo.pdf',
  [
    [50, 780, 16, 'LABORATORIO DE EJEMPLO', true],
    [50, 762, 9, 'Calle Ejemplo, 1 - 00000 Ciudad Ejemplo'],
    [50, 735, 10, 'Paciente: PERSONA DE PRUEBA'],
    [50, 720, 10, 'Fecha de nacimiento: 12/04/1956'],
    [320, 735, 10, 'N. de muestra: 0000000'],
    [320, 720, 10, 'Fecha de extracción: 02/10/2026'],
    [50, 690, 11, 'BIOQUÍMICA', true],
    [50, 672, 9, 'Prueba', true],
    [230, 672, 9, 'Resultado', true],
    [300, 672, 9, 'Unidades', true],
    [380, 672, 9, 'Valores de referencia', true],
    ...tabla(654, 17, [50, 230, 300, 380], [
      ['Glucosa', '112', 'mg/dl', '(74 - 100)'],
      ['Hemoglobina glicada (HbA1c)', '6.8', '%', '(4 - 6)'],
      ['Colesterol total', '189', 'mg/dl', '(Inf. 200)'],
      ['HDL Colesterol', '52', 'mg/dl', '(Sup. 40)'],
      ['LDL Colesterol', '108', 'mg/dl', '(Inf. 130)'],
      ['Triglicéridos', '140', 'mg/dl', '(Inf. 150)'],
      ['Creatinina', '1.1', 'mg/dl', '(0.5 - 1.1)'],
      ['Filtrado glomerular', '58', 'ml/min', '(Sup. 60)'],
      ['Potasio', '4.9', 'mmol/l', '(3.5 - 5.1)'],
    ]),
    [50, 490, 11, 'HEMATOLOGÍA', true],
    ...tabla(470, 17, [50, 230, 300, 380], [
      ['Hemoglobina', '12.2', 'g/dl', '(12 - 16)'],
      ['Hematíes', '4.3', '10e6/uL', '(3.8 - 5.2)'],
      ['Leucocitos', '6.9', '10e3/uL', '(4 - 10)'],
      ['Plaquetas', '245', '10e3/uL', '(150 - 400)'],
    ]),
    [50, 380, 9, 'Validado por: Dr. Ejemplo (Análisis Clínicos)'],
  ],
  [[50, 667, 545, 667]],
)

// 2. Receta médica
pdf('receta-ejemplo.pdf', [
  [50, 780, 16, 'RECETA MÉDICA', true],
  [50, 762, 9, 'Sistema de Salud Ejemplo - Centro de Salud Ejemplo'],
  [50, 730, 10, 'Paciente: PERSONA DE PRUEBA'],
  [50, 715, 10, 'Fecha de prescripción: 10/10/2026'],
  [50, 685, 11, 'Medicamento', true],
  [50, 668, 12, 'ENALAPRIL 20 MG COMPRIMIDOS EFG, 28 comprimidos', true],
  [50, 648, 10, 'Posología: 1 comprimido cada 24 horas, en el desayuno.'],
  [50, 633, 10, 'Duración del tratamiento: crónico.'],
  [50, 618, 10, 'Indicación: hipertensión arterial.'],
  [50, 588, 11, 'Medicamento', true],
  [50, 571, 12, 'PANTOPRAZOL 40 MG COMPRIMIDOS GASTRORRESISTENTES, 28 comprimidos', true],
  [50, 551, 10, 'Posología: 1 comprimido cada 24 horas, en ayunas.'],
  [50, 536, 10, 'Duración del tratamiento: 3 meses.'],
  [50, 490, 10, 'Médico: Dra. Ejemplo - N. colegiado 00/00000'],
])

// 3. Parte de baja
pdf('parte-baja-ejemplo.pdf', [
  [50, 780, 14, 'PARTE MÉDICO DE BAJA DE INCAPACIDAD TEMPORAL', true],
  [50, 762, 9, 'Modelo de prueba (copia para la persona trabajadora)'],
  [50, 730, 10, 'Trabajador/a: PERSONA DE PRUEBA'],
  [50, 715, 10, 'Empresa: EMPRESA EJEMPLO S. L.'],
  [50, 690, 10, 'Fecha de la baja: 16/10/2026'],
  [50, 675, 10, 'Contingencia: enfermedad común'],
  [50, 660, 10, 'Diagnóstico: gripe (síndrome gripal)'],
  [50, 645, 10, 'Duración estimada: muy corta (menos de 5 días naturales)'],
  [50, 630, 10, 'Fecha de la próxima revisión: 19/10/2026'],
  [50, 590, 10, 'Médico: Dra. Ejemplo - Centro de Salud Ejemplo'],
])

// 4. Informe de radiografía
pdf('informe-radiografia-ejemplo.pdf', [
  [50, 780, 14, 'SERVICIO DE RADIODIAGNÓSTICO', true],
  [50, 762, 9, 'Hospital Ejemplo'],
  [50, 730, 10, 'Paciente: PERSONA DE PRUEBA'],
  [50, 715, 10, 'Fecha del estudio: 20/08/2026'],
  [50, 700, 10, 'Estudio: radiografía de rodilla derecha, proyecciones AP y lateral'],
  [50, 670, 11, 'Hallazgos', true],
  [50, 652, 10, 'Disminución leve del espacio articular femorotibial interno.'],
  [50, 637, 10, 'Pequeños osteofitos marginales. No se observan fracturas.'],
  [50, 607, 11, 'Conclusión', true],
  [50, 589, 10, 'Gonartrosis leve (artrosis de rodilla leve).'],
  [50, 550, 10, 'Radiólogo: Dr. Ejemplo'],
])

// 5. Receta de gafas
pdf(
  'receta-gafas-ejemplo.pdf',
  [
    [50, 780, 14, 'ÓPTICA EJEMPLO - GRADUACIÓN', true],
    [50, 750, 10, 'Cliente: PERSONA DE PRUEBA'],
    [50, 735, 10, 'Fecha: 18/08/2026'],
    [50, 705, 10, '', true],
    ...tabla(705, 20, [50, 140, 210, 280, 340, 410], [
      ['', 'ESF', 'CIL', 'EJE', 'ADD', 'AV'],
      ['OD', '-2,50', '', '', '', '1,0'],
      ['OI', '-2,25', '-0,50', '180', '', '1,0'],
    ]),
    [50, 625, 10, 'Lentes recomendadas: monofocales. Revisión en 1 año.'],
    [50, 595, 10, 'Optometrista: Ejemplo - N. colegiado 00000'],
  ],
  [[50, 698, 470, 698]],
)

// ---------- 6. «Radiografía» en PNG (dibujada, no es real) ----------

function png(nombre, ancho, alto, pixel) {
  const crc = (buf) => {
    let c = ~0
    for (const b of buf) {
      c ^= b
      for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
    }
    return ~c >>> 0
  }
  const trozo = (tipo, datos) => {
    const t = Buffer.concat([Buffer.from(tipo), datos])
    const lon = Buffer.alloc(4)
    lon.writeUInt32BE(datos.length)
    const c = Buffer.alloc(4)
    c.writeUInt32BE(crc(t))
    return Buffer.concat([lon, t, c])
  }
  const filas = []
  for (let y = 0; y < alto; y++) {
    const fila = Buffer.alloc(ancho + 1)
    for (let x = 0; x < ancho; x++) fila[x + 1] = pixel(x, y)
    filas.push(fila)
  }
  const cab = Buffer.alloc(13)
  cab.writeUInt32BE(ancho, 0)
  cab.writeUInt32BE(alto, 4)
  cab[8] = 8 // bits
  cab[9] = 0 // escala de grises
  const archivo = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    trozo('IHDR', cab),
    trozo('IDAT', deflateSync(Buffer.concat(filas))),
    trozo('IEND', Buffer.alloc(0)),
  ])
  writeFileSync(new URL(nombre, CARPETA), archivo)
}

// Una rodilla esquemática: fémur arriba, tibia y peroné abajo, rótula al lado.
const elipse = (x, y, cx, cy, rx, ry) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
png('radiografia-ejemplo.png', 600, 800, (x, y) => {
  let v = 18 + Math.round(10 * Math.sin(x / 37) * Math.cos(y / 53)) // fondo oscuro con algo de grano
  v += ((x * 7 + y * 13) % 11) - 5
  const piel = elipse(x, y, 300, 400, 210, 430) < 1
  if (piel) v += 30
  const femur = Math.abs(x - 300) < 70 - Math.max(0, (y - 250) / 6) * -0.6 && y < 360
  const condilos = elipse(x, y, 255, 360, 70, 45) < 1 || elipse(x, y, 345, 360, 70, 45) < 1
  const tibia = Math.abs(x - 300) < 85 - Math.min(30, Math.max(0, y - 440) / 4) && y > 420
  const meseta = elipse(x, y, 300, 430, 120, 22) < 1
  const perone = Math.abs(x - 420) < 18 && y > 470
  const rotula = elipse(x, y, 160, 330, 35, 55) < 1
  if (femur || condilos || tibia || meseta || perone || rotula) {
    const borde = femur || tibia ? Math.abs(Math.abs(x - 300) - 60) < 8 : false
    v = 175 + (borde ? 50 : 0) + ((x + y) % 7)
  }
  // Marca «R» (lado derecho) en la esquina.
  if (x > 520 && x < 560 && y > 40 && y < 100 && (x < 528 || (y < 48 && x < 552) || (y > 66 && y < 74 && x < 552) || (x > 545 && y < 72) || (y > 72 && Math.abs(x - 528 - (y - 72)) < 6))) v = 240
  return Math.max(0, Math.min(255, v))
})

console.log('Documentos de prueba creados en public/documentos-de-prueba/')
