import type { Valoracion } from '../datos/constantes'

const SIMBOLO = { bien: '✓', atencion: '!', fuera: '▲', urgente: '⚠' }

/** "✓ Normal", "▲ Alta"… El color nunca va solo: siempre con símbolo y palabra. */
export function EtiquetaNivel({ valoracion }: { valoracion: Valoracion | null }) {
  if (!valoracion) return null
  return (
    <span className={`nivel nivel-${valoracion.nivel}`}>
      <span aria-hidden="true">{SIMBOLO[valoracion.nivel]}</span> {valoracion.texto}
    </span>
  )
}
