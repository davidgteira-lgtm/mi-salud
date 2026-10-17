import { useLiveQuery } from 'dexie-react-hooks'
import { listarCiclos } from '../db/ciclos'
import { db } from '../db/db'
import type { Ciclo } from '../db/tipos'
import { muestraRegla } from '../utils/ciclos'

/** Las reglas de la persona, o una lista vacía si no las lleva apuntadas. */
export function useCiclosVisibles(perfilId: string): Ciclo[] {
  return (
    useLiveQuery(async () => {
      const perfil = await db.perfiles.get(perfilId)
      return muestraRegla(perfil) ? listarCiclos(perfilId) : []
    }, [perfilId]) ?? []
  )
}
