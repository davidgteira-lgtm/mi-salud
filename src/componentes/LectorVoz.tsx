import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router'
import { trocear } from '../utils/lecturaVoz'

// Lectura en voz alta para quien ve mal. Usa la voz que ya trae el móvil (funciona sin internet).
// Con la lectura activada:
//  - cada pantalla nueva se lee sola,
//  - al tocar un texto se lee ese trozo,
//  - los avisos que aparecen ("Entendido: Alta 130…") se leen en cuanto salen.

const CLAVE = 'mi-salud:lectura-voz'

function leerPreferencia(): boolean {
  try {
    return localStorage.getItem(CLAVE) === 'si'
  } catch {
    return false
  }
}

function guardarPreferencia(activo: boolean) {
  try {
    localStorage.setItem(CLAVE, activo ? 'si' : 'no')
  } catch {
    // Si no se puede guardar, solo dura mientras la app está abierta.
  }
}

/** El texto que se ve en un trozo de pantalla, sin casillas, gráficas ni enlaces de "Cambiar". */
function textoVisible(elemento: Element): string {
  const copia = elemento.cloneNode(true) as HTMLElement
  copia.querySelectorAll('input, select, textarea, svg, .enlace, .boton-volver, .lector-voz, [aria-hidden="true"]').forEach((e) => e.remove())
  // innerText solo respeta los saltos de línea si el elemento está en la página: se pone fuera de la vista.
  copia.style.cssText = `position:fixed;left:-10000px;top:0;width:${elemento.clientWidth || 360}px`
  document.body.appendChild(copia)
  const texto = copia.innerText || copia.textContent || ''
  copia.remove()
  return texto
}

/** Trozos de pantalla que se leen al tocarlos. */
const BLOQUES = '.medida, .fila-resultado, .resultado, .ficha, .banner, .banner-emergencia, .contacto, .aviso, .tarjeta, li, p, h1, h2, h3, label, button, a'

export function LectorVoz() {
  const disponible = typeof window !== 'undefined' && 'speechSynthesis' in window
  const [activo, setActivo] = useState(() => disponible && leerPreferencia())
  const [hablando, setHablando] = useState(false)
  const ubicacion = useLocation()
  const leidos = useRef(new WeakMap<Element, string>())

  const hablar = useCallback(
    (texto: string) => {
      if (!disponible) return
      const voz = window.speechSynthesis
      voz.cancel()
      const trozos = trocear(texto)
      if (trozos.length === 0) return
      const espanola =
        voz.getVoices().find((v) => v.lang === 'es-ES') ?? voz.getVoices().find((v) => v.lang?.toLowerCase().startsWith('es'))
      trozos.forEach((t, i) => {
        const frase = new SpeechSynthesisUtterance(t)
        frase.lang = 'es-ES'
        if (espanola) frase.voice = espanola
        frase.rate = 0.92
        if (i === 0) frase.onstart = () => setHablando(true)
        if (i === trozos.length - 1) frase.onend = frase.onerror = () => setHablando(false)
        voz.speak(frase)
      })
    },
    [disponible],
  )

  const callar = useCallback(() => {
    // Con "?." por si el móvil deja de tener voz (no debe dar error al cerrar).
    window.speechSynthesis?.cancel()
    setHablando(false)
  }, [])

  const leerPantalla = useCallback(() => {
    const principal = document.querySelector('main')
    if (principal) hablar(textoVisible(principal))
  }, [hablar])

  // Cada pantalla nueva se lee sola (con un momento para que carguen los datos).
  useEffect(() => {
    if (!activo) return
    const t = setTimeout(leerPantalla, 700)
    return () => clearTimeout(t)
  }, [activo, ubicacion.pathname, leerPantalla])

  // Al tocar un texto, se lee ese trozo (los botones siguen funcionando igual).
  useEffect(() => {
    if (!activo) return
    const alTocar = (e: MouseEvent) => {
      const objetivo = e.target as Element | null
      if (!objetivo || objetivo.closest('.lector-voz, input, select, textarea')) return
      const bloque = objetivo.closest(BLOQUES)
      if (bloque) hablar(textoVisible(bloque) || bloque.getAttribute('aria-label') || '')
    }
    document.addEventListener('click', alTocar, true)
    return () => document.removeEventListener('click', alTocar, true)
  }, [activo, hablar])

  // Los avisos que aparecen o cambian ("Entendido…", errores) se leen en cuanto salen.
  useEffect(() => {
    if (!activo) return
    let espera: ReturnType<typeof setTimeout> | undefined
    const observador = new MutationObserver(() => {
      clearTimeout(espera)
      espera = setTimeout(() => {
        for (const aviso of document.querySelectorAll('main [role="status"], main [role="alert"]')) {
          const texto = textoVisible(aviso).trim()
          if (texto && leidos.current.get(aviso) !== texto) {
            leidos.current.set(aviso, texto)
            hablar(texto)
          }
        }
      }, 800)
    })
    observador.observe(document.body, { subtree: true, childList: true, characterData: true })
    return () => {
      clearTimeout(espera)
      observador.disconnect()
    }
  }, [activo, hablar])

  // Al salir, que no siga hablando.
  useEffect(() => () => callar(), [callar])

  function activar() {
    if (!disponible) {
      alert('Este móvil no permite leer en voz alta.')
      return
    }
    setActivo(true)
    guardarPreferencia(true)
    leerPantalla()
  }

  function desactivar() {
    callar()
    setActivo(false)
    guardarPreferencia(false)
  }

  if (!activo) {
    return (
      <div className="lector-voz">
        <button type="button" className="lector-boton" onClick={activar} aria-label="Leer en voz alta">
          <span aria-hidden="true">🔊</span>
          Leer en voz alta
        </button>
      </div>
    )
  }

  return (
    <div className="lector-voz" role="group" aria-label="Lectura en voz alta">
      {hablando ? (
        <button type="button" className="lector-boton lector-activo" onClick={callar} aria-label="Parar de leer">
          <span aria-hidden="true">⏹</span>
          Parar
        </button>
      ) : (
        <button type="button" className="lector-boton lector-activo" onClick={leerPantalla} aria-label="Leer la pantalla otra vez">
          <span aria-hidden="true">🔁</span>
          Leer otra vez
        </button>
      )}
      <button type="button" className="lector-boton" onClick={desactivar} aria-label="Quitar la lectura en voz alta">
        <span aria-hidden="true">✕</span>
        Quitar
      </button>
    </div>
  )
}
