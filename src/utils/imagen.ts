// Hace las fotos más pequeñas antes de guardarlas, para no llenar el móvil.

/** Calcula el tamaño final manteniendo la forma de la foto. */
export function medidasReducidas(ancho: number, alto: number, maximo: number): { ancho: number; alto: number } {
  const mayor = Math.max(ancho, alto)
  if (mayor <= maximo) return { ancho, alto }
  const escala = maximo / mayor
  return { ancho: Math.round(ancho * escala), alto: Math.round(alto * escala) }
}

/** Reduce una foto a como mucho `maximo` píxeles de lado, en formato JPEG. */
export async function reducirFoto(archivo: Blob, maximo = 600, calidad = 0.85): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(archivo)
    const { ancho, alto } = medidasReducidas(bitmap.width, bitmap.height, maximo)
    const lienzo = document.createElement('canvas')
    lienzo.width = ancho
    lienzo.height = alto
    lienzo.getContext('2d')!.drawImage(bitmap, 0, 0, ancho, alto)
    bitmap.close()
    return await new Promise<Blob>((ok, error) =>
      lienzo.toBlob((b) => (b ? ok(b) : error(new Error('No se pudo reducir'))), 'image/jpeg', calidad),
    )
  } catch {
    // Si el móvil no sabe reducirla, se guarda tal cual.
    return archivo
  }
}
