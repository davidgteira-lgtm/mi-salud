// Medidas de la intro: 7 segundos a 30 imágenes por segundo, con la forma exacta de la pantalla
// (el lado corto mide siempre 1080, así el logo se ve igual de grande en el móvil y en el ordenador).
export const INTRO = { fps: 30, segundos: 7 }
export const LADO_CORTO = 1080

export function medidasIntro(ancho = window.innerWidth, alto = window.innerHeight): { ancho: number; alto: number } {
  const escala = LADO_CORTO / Math.max(1, Math.min(ancho, alto))
  return { ancho: Math.round(ancho * escala), alto: Math.round(alto * escala) }
}
