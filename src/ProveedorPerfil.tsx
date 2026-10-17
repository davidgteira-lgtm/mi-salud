import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type ReactNode } from 'react'
import { db } from './db/db'
import { CLAVE_PERFIL_ACTIVO, ContextoPerfilActivo } from './perfilActivo'

function leerGuardado(): string | null {
  try {
    return localStorage.getItem(CLAVE_PERFIL_ACTIVO)
  } catch {
    return null
  }
}

export function ProveedorPerfil({ children }: { children: ReactNode }) {
  const [id, setId] = useState<string | null>(leerGuardado)
  // Se guarda también el id consultado: así, al cambiar de persona, no se usa
  // por error el resultado de la persona anterior mientras se carga la nueva.
  const consulta = useLiveQuery(async () => ({ id, perfil: id ? ((await db.perfiles.get(id)) ?? null) : null }), [id])
  const perfil = consulta && consulta.id === id ? consulta.perfil : undefined

  const elegir = (nuevo: string | null) => {
    setId(nuevo)
    try {
      if (nuevo) localStorage.setItem(CLAVE_PERFIL_ACTIVO, nuevo)
      else localStorage.removeItem(CLAVE_PERFIL_ACTIVO)
    } catch {
      // Sin almacenamiento, simplemente habrá que elegir persona cada vez.
    }
  }

  return <ContextoPerfilActivo.Provider value={{ perfil, elegir }}>{children}</ContextoPerfilActivo.Provider>
}
