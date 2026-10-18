// El logo de la app con «Mi Salud» debajo, arriba a la izquierda de todas las pantallas. Lleva al inicio.
import { Link } from 'react-router'
import { usePerfilActivo } from '../perfilActivo'

export function Logo() {
  const { perfil } = usePerfilActivo()
  return (
    <Link to={perfil ? '/inicio' : '/'} className="logo" aria-label="Mi Salud: ir al inicio">
      <img src={`${import.meta.env.BASE_URL}icono.svg`} alt="" width={44} height={44} />
      <span>Mi Salud</span>
    </Link>
  )
}
