import { useRef, useState } from 'react'
import { actualizarPerfil } from '../db/perfiles'
import type { Perfil } from '../db/tipos'
import { reducirFoto } from '../utils/imagen'
import { Avatar } from './Avatar'

/**
 * La foto de la persona con un botón de cámara encima para ponerla o cambiarla.
 * Al pulsarlo, el móvil deja elegir entre hacer una foto o cogerla de la galería.
 */
export function AvatarEditable({ perfil }: { perfil: Perfil }) {
  const selector = useRef<HTMLInputElement>(null)
  const [guardando, setGuardando] = useState(false)
  const texto = perfil.foto ? 'Cambiar foto' : 'Poner foto'

  async function alElegir(archivo: File | undefined) {
    if (!archivo) return
    setGuardando(true)
    await actualizarPerfil(perfil.id, { foto: await reducirFoto(archivo, 400) })
    setGuardando(false)
  }

  return (
    <span className="avatar-editable">
      <button type="button" className="avatar-boton" onClick={() => selector.current?.click()} aria-label={texto} disabled={guardando}>
        <Avatar perfil={perfil} />
        <span className="avatar-camara" aria-hidden="true">
          📷
        </span>
      </button>
      <input
        ref={selector}
        type="file"
        accept="image/*"
        hidden
        aria-label={`${texto} de ${perfil.nombre}`}
        onChange={(e) => {
          alElegir(e.target.files?.[0])
          e.target.value = ''
        }}
      />
    </span>
  )
}
