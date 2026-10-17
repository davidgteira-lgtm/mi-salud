// Recuerda qué persona está usando la app en este momento.
import { createContext, useContext } from 'react'
import type { Perfil } from './db/tipos'

export const CLAVE_PERFIL_ACTIVO = 'mi-salud:perfil-activo'

export interface ContextoPerfil {
  /** undefined mientras se carga; null si no hay nadie elegido. */
  perfil: Perfil | null | undefined
  elegir: (id: string | null) => void
}

export const ContextoPerfilActivo = createContext<ContextoPerfil | null>(null)

export function usePerfilActivo(): ContextoPerfil {
  const c = useContext(ContextoPerfilActivo)
  if (!c) throw new Error('usePerfilActivo necesita ProveedorPerfil')
  return c
}
