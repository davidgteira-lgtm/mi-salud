// Convierte un archivo guardado (foto…) en una dirección que se puede mostrar en pantalla.
// Se reutiliza la misma dirección para el mismo archivo, así no se crean de más.
const direcciones = new WeakMap<Blob, string>()

export function urlDeArchivo(archivo: Blob | undefined): string | undefined {
  if (!archivo) return undefined
  let url = direcciones.get(archivo)
  if (!url) {
    url = URL.createObjectURL(archivo)
    direcciones.set(archivo, url)
  }
  return url
}
