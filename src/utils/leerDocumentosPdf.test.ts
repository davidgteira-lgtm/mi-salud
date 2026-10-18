// Los documentos de prueba de verdad (public/documentos-de-prueba), leídos con pdf.js como en el móvil.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { leerParteBaja, leerRecetaGafas } from './leerDocumentos'
import { filasDeTrozos, type TrozoPdf } from './leerPdf'

async function filas(nombre: string) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const datos = new Uint8Array(readFileSync(`public/documentos-de-prueba/${nombre}`))
  const doc = await pdfjs.getDocument({ data: datos }).promise
  const contenido = await (await doc.getPage(1)).getTextContent()
  await doc.destroy()
  return filasDeTrozos(contenido.items.filter((i) => 'str' in i) as TrozoPdf[])
}

describe('documentos de prueba', () => {
  it('lee la receta de las gafas', async () => {
    const r = leerRecetaGafas(await filas('receta-gafas-ejemplo.pdf'))!
    expect(r.fecha).toBe('2026-08-18')
    expect(r.donde).toBe('Óptica Ejemplo')
    expect(r.derecho).toEqual({ esfera: '-2,50', agudeza: '1,0' })
    expect(r.izquierdo).toEqual({ esfera: '-2,25', cilindro: '-0,50', eje: '180', agudeza: '1,0' })
  })

  it('lee los tres partes de la baja', async () => {
    expect(leerParteBaja(await filas('parte-baja-ejemplo.pdf'))).toMatchObject({ clase: 'baja', inicio: '2026-10-05', tipo: 'comun', motivo: 'Gripe' })
    expect(leerParteBaja(await filas('parte-confirmacion-ejemplo.pdf'))).toMatchObject({ clase: 'confirmacion', confirmacion: '2026-10-12' })
    expect(leerParteBaja(await filas('parte-alta-ejemplo.pdf'))).toMatchObject({ clase: 'alta', fin: '2026-10-15', tipoAlta: 'curacion' })
  })

  it('no confunde la receta de medicinas con nada de esto', async () => {
    const f = await filas('receta-ejemplo.pdf')
    expect(leerRecetaGafas(f)).toBeNull()
    expect(leerParteBaja(f)).toBeNull()
  })
})
