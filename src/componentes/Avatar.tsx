import type { Perfil } from '../db/tipos'
import { urlDeArchivo } from '../utils/urlDeArchivo'

/** Foto de la persona, o su inicial si no tiene foto. */
export function Avatar({ perfil, pequeno = false }: { perfil: Pick<Perfil, 'nombre' | 'foto' | 'color'>; pequeno?: boolean }) {
  const url = urlDeArchivo(perfil.foto)
  return (
    <span className={pequeno ? 'avatar avatar-pequeno' : 'avatar'} style={{ background: perfil.color }} aria-hidden="true">
      {url ? <img src={url} alt="" /> : perfil.nombre.trim().charAt(0).toUpperCase()}
    </span>
  )
}
