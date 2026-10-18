// Sacar el texto de un PDF dentro del propio móvil, sin internet (con pdf.js, el lector de Firefox).
// Se recompone línea a línea, como si se hubiera copiado y pegado, para que lo entienda leerInforme().

/** Un trozo de texto del PDF con su posición en la página. */
export interface TrozoPdf {
  str: string
  /** Matriz de posición de pdf.js: [a, b, c, d, x, y]. */
  transform: number[]
  width: number
}

/** Une los trozos que están a la misma altura en una línea, de izquierda a derecha. */
export function lineasDeTrozos(trozos: TrozoPdf[]): string[] {
  const conTexto = trozos.filter((t) => t.str.trim() !== '')
  // De arriba abajo (en los PDF, la y crece hacia arriba).
  const orden = [...conTexto].sort((a, b) => b.transform[5] - a.transform[5] || a.transform[4] - b.transform[4])
  const lineas: TrozoPdf[][] = []
  for (const t of orden) {
    const alto = Math.abs(t.transform[3]) || 10
    const linea = lineas.find((l) => Math.abs(l[0].transform[5] - t.transform[5]) <= alto * 0.4)
    if (linea) linea.push(t)
    else lineas.push([t])
  }
  return lineas.map((l) => {
    const ordenados = l.sort((a, b) => a.transform[4] - b.transform[4])
    let texto = ''
    let finAnterior: number | undefined
    for (const t of ordenados) {
      const x = t.transform[4]
      // Si hay hueco entre un trozo y el siguiente, va un espacio.
      if (finAnterior !== undefined && x - finAnterior > 1 && !texto.endsWith(' ') && !t.str.startsWith(' ')) texto += ' '
      texto += t.str
      finAnterior = x + t.width
    }
    return texto.replace(/\s+/g, ' ').trim()
  })
}

/** Todo el texto de un PDF, página a página. Si el PDF es una imagen escaneada, sale vacío. */
export async function textoDePdf(archivo: Blob): Promise<string> {
  // Se carga solo cuando hace falta (es grande). La versión «legacy» funciona también en móviles antiguos.
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const { default: trabajador } = await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = trabajador
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await archivo.arrayBuffer()) }).promise
  const paginas: string[] = []
  for (let n = 1; n <= doc.numPages; n++) {
    const pagina = await doc.getPage(n)
    const contenido = await pagina.getTextContent()
    const trozos = contenido.items.filter((i) => 'str' in i) as TrozoPdf[]
    paginas.push(lineasDeTrozos(trozos).join('\n'))
  }
  await doc.destroy()
  return paginas.join('\n')
}
