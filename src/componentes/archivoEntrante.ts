// Un archivo elegido con el atajo de arriba de cada sección, que pasa al formulario de un registro nuevo.
import type { AdjuntoNuevo } from '../db/adjuntos'

/** Unos segundos para que lo recoja el formulario (la pantalla puede montarse más de una vez al cambiar). */
const VALIDO_MS = 5000
let pendiente: { archivo: AdjuntoNuevo; hasta: number } | null = null

export function dejarArchivo(a: AdjuntoNuevo): void {
  pendiente = { archivo: a, hasta: Date.now() + VALIDO_MS }
}

/** Lo recoge el formulario de uno nuevo, si acaba de elegirse con el atajo. */
export function tomarArchivo(): AdjuntoNuevo[] {
  if (!pendiente || Date.now() > pendiente.hasta) return []
  return [pendiente.archivo]
}

/** Si se ha llegado a la sección con ?nuevo=1 (desde el atajo): se abre el formulario de uno nuevo. */
export function pideNuevo(): boolean {
  return new URLSearchParams(window.location.hash.split('?')[1] ?? '').has('nuevo')
}
