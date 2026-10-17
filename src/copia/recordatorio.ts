// Recuerda cuándo se hizo la última copia en este móvil, para avisar si hace mucho.
const CLAVE_ULTIMA_COPIA = 'mi-salud:ultima-copia'

/** Días desde la última copia hecha en este móvil, o null si nunca se hizo. */
export function diasDesdeUltimaCopia(ahora = Date.now()): number | null {
  try {
    const guardado = localStorage.getItem(CLAVE_ULTIMA_COPIA)
    if (!guardado) return null
    return Math.floor((ahora - Number(guardado)) / 86_400_000)
  } catch {
    return null
  }
}

export function apuntarCopiaHecha(ahora = Date.now()) {
  try {
    localStorage.setItem(CLAVE_ULTIMA_COPIA, String(ahora))
  } catch {
    // No pasa nada si no se puede apuntar.
  }
}
