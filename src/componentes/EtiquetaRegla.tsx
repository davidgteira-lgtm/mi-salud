// «🌸 Con la regla» en las tarjetas del historial y de las citas pasadas,
// para ver de un vistazo si algo coincidió con esos días.
import type { Ciclo } from '../db/tipos'
import { conLaRegla } from '../utils/ciclos'

export function EtiquetaRegla({ fecha, ciclos }: { fecha: string; ciclos: Ciclo[] }) {
  if (!conLaRegla(fecha, ciclos)) return null
  return <span className="etiqueta etiqueta-regla">🌸 Con la regla</span>
}
