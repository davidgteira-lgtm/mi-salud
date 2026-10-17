import { useState } from 'react'
import { Link } from 'react-router'
import type { Seccion } from '../secciones'

/** Banner grande con foto que lleva a una sección. */
export function Banner({ seccion }: { seccion: Seccion }) {
  return (
    <Link to={`/seccion/${seccion.clave}`} className="banner">
      <FondoSeccion seccion={seccion} />
      <span className="banner-texto">
        <strong>{seccion.titulo}</strong>
        <span>{seccion.descripcion}</span>
      </span>
    </Link>
  )
}

/** La foto de la sección; si no hay o no carga, un color con su icono. */
export function FondoSeccion({ seccion }: { seccion: Seccion }) {
  const [fallo, setFallo] = useState(false)
  if (seccion.imagen && !fallo) {
    return (
      <img
        src={seccion.imagen}
        alt=""
        loading="lazy"
        style={seccion.encuadre ? { objectPosition: seccion.encuadre } : undefined}
        onError={() => setFallo(true)}
      />
    )
  }
  return (
    <span className="banner-fondo" style={{ background: seccion.fondo }} aria-hidden="true">
      {seccion.icono}
    </span>
  )
}
