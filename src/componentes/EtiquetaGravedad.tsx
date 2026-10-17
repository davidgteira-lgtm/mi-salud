import { GRAVEDADES } from '../db/alergias'
import type { Gravedad } from '../db/tipos'

/** Etiqueta de color con la gravedad de una alergia. */
export function EtiquetaGravedad({ gravedad }: { gravedad: Gravedad }) {
  const texto = GRAVEDADES.find((g) => g.valor === gravedad)?.texto
  return <span className={`etiqueta etiqueta-${gravedad}`}>{gravedad === 'desconocida' ? 'Gravedad: no lo sé' : texto}</span>
}
