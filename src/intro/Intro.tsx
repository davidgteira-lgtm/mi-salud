// La intro a pantalla completa: la animación del logo (Remotion) y, al acabar o al tocar, la app.
import { Player, type PlayerRef } from '@remotion/player'
import { useEffect, useRef, useState } from 'react'
import { AnimacionLogo } from './AnimacionLogo'
import { INTRO, medidasIntro } from './config'

/** Cuando la animación llena la pantalla con el fondo de la app (a los 5 s), el resto de la pantalla también. */
const MS_FONDO_CLARO = 5000
const MS_FUNDIDO = 500

export function Intro({ onFin }: { onFin: () => void }) {
  const reproductor = useRef<PlayerRef>(null)
  const [medidas] = useState(() => medidasIntro())
  const [claro, setClaro] = useState(false)
  const [saliendo, setSaliendo] = useState(false)
  const fin = useRef(onFin)
  const terminarRef = useRef<() => void>(() => {})
  useEffect(() => {
    fin.current = onFin
  })

  useEffect(() => {
    let cerrado = false
    const terminar = () => {
      if (cerrado) return
      cerrado = true
      setSaliendo(true)
      setTimeout(() => fin.current(), MS_FUNDIDO)
    }
    const p = reproductor.current
    p?.addEventListener('ended', terminar)
    const tClaro = setTimeout(() => setClaro(true), MS_FONDO_CLARO)
    // Por si el móvil no deja reproducirla: no se queda nunca atascada.
    const tSeguro = setTimeout(terminar, INTRO.segundos * 1000 + 1500)
    terminarRef.current = terminar
    return () => {
      p?.removeEventListener('ended', terminar)
      clearTimeout(tClaro)
      clearTimeout(tSeguro)
    }
  }, [])

  return (
    <div
      className={`intro${claro ? ' intro-clara' : ''}${saliendo ? ' intro-saliendo' : ''}`}
      role="presentation"
      onClick={() => terminarRef.current()}
    >
      <Player
        ref={reproductor}
        component={AnimacionLogo}
        durationInFrames={INTRO.fps * INTRO.segundos}
        fps={INTRO.fps}
        compositionWidth={medidas.ancho}
        compositionHeight={medidas.alto}
        autoPlay
        controls={false}
        clickToPlay={false}
        doubleClickToFullscreen={false}
        spaceKeyToPlayOrPause={false}
        acknowledgeRemotionLicense
        style={{ width: '100%', height: '100%' }}
      />
      <button
        type="button"
        className="intro-saltar"
        onClick={(e) => {
          e.stopPropagation()
          terminarRef.current()
        }}
      >
        Saltar ›
      </button>
    </div>
  )
}
