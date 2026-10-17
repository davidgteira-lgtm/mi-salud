import type { ReactNode } from 'react'

/** Ventana para confirmar algo importante, con dos botones grandes. */
export function Confirmar(props: {
  titulo: string
  children?: ReactNode
  textoSi: string
  peligroso?: boolean
  onSi: () => void
  onNo: () => void
}) {
  return (
    <div className="dialogo-fondo" role="dialog" aria-modal="true" aria-label={props.titulo}>
      <div className="tarjeta dialogo pila">
        <h2>{props.titulo}</h2>
        {props.children}
        <button className={props.peligroso ? 'boton boton-peligro' : 'boton'} onClick={props.onSi}>
          {props.textoSi}
        </button>
        <button className="boton boton-secundario" onClick={props.onNo} autoFocus>
          No, volver
        </button>
      </div>
    </div>
  )
}
