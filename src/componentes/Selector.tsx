import type { ReactNode } from 'react'

interface Opcion<T> {
  valor: T
  texto: string
  icono?: string
}

/** Grupo de botones grandes para elegir una opción (o varias, si `multiple`). */
export function Selector<T extends string>(props: {
  etiqueta: string
  ayuda?: ReactNode
  opciones: Opcion<T>[]
  valor: T | T[]
  onCambio: (valor: T) => void
}) {
  const marcado = (v: T) => (Array.isArray(props.valor) ? props.valor.includes(v) : props.valor === v)
  return (
    <fieldset className="campo" style={{ border: 0, padding: 0, margin: 0 }}>
      <span>{props.etiqueta}</span>
      {props.ayuda && <small>{props.ayuda}</small>}
      <div className="opciones">
        {props.opciones.map((o) => (
          <button key={o.valor} type="button" className="opcion" aria-pressed={marcado(o.valor)} onClick={() => props.onCambio(o.valor)}>
            {o.icono} {o.texto}
          </button>
        ))}
      </div>
    </fieldset>
  )
}
