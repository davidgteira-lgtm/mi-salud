// La intro sale una vez cada vez que se abre la app (no al volver a cargar la misma ventana),
// y nunca si el móvil pide menos movimiento ni en las pruebas automáticas.
const CLAVE = 'mi-salud:intro-vista'

export function tocaIntro(): boolean {
  if (import.meta.env.MODE === 'test') return false
  try {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false
    return sessionStorage.getItem(CLAVE) !== '1'
  } catch {
    return true
  }
}

export function introVista(): void {
  try {
    sessionStorage.setItem(CLAVE, '1')
  } catch {
    // Sin almacenamiento, saldrá otra vez al recargar: no pasa nada.
  }
}
