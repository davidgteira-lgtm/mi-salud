// La intro a pantalla completa: la animación del logo (Remotion) y, al final, el botón «Entrar» que lleva a la app.
// «Saltar» (o tocar la pantalla) lleva directamente al final, con el botón ya a la vista.
import { Player, type PlayerRef } from '@remotion/player'
import { useEffect, useRef, useState } from 'react'
import { AnimacionLogo } from './AnimacionLogo'
import { INTRO, medidasIntro } from './config'

/** Cuando la animación llena la pantalla con el fondo de la app (a los 3,75 s), el resto de la pantalla también. */
const MS_FONDO_CLARO = 3750
/** El botón sale cuando el lema ya se lee (a los 5,6 s). */
const MS_BOTON = 5600
const MS_FUNDIDO = 500

export function Intro({ onFin }: { onFin: () => void }) {
  const reproductor = useRef<PlayerRef>(null)
  const [medidas] = useState(() => medidasIntro())
  const [claro, setClaro] = useState(false)
  const [boton, setBoton] = useState(false)
  const [saliendo, setSaliendo] = useState(false)

  useEffect(() => {
    const tClaro = setTimeout(() => setClaro(true), MS_FONDO_CLARO)
    const tBoton = setTimeout(() => setBoton(true), MS_BOTON)
    return () => {
      clearTimeout(tClaro)
      clearTimeout(tBoton)
    }
  }, [])

  /** Al final de la animación, quieta, con el botón. */
  function irAlFinal() {
    const p = reproductor.current
    p?.pause()
    p?.seekTo(INTRO.fps * INTRO.segundos - 1)
    setClaro(true)
    setBoton(true)
  }

  function entrar() {
    if (saliendo) return
    setSaliendo(true)
    setTimeout(onFin, MS_FUNDIDO)
  }

  return (
    <div
      className={`intro${claro ? ' intro-clara' : ''}${saliendo ? ' intro-saliendo' : ''}`}
      role="presentation"
      onClick={() => !boton && irAlFinal()}
    >
      <Player
        ref={reproductor}
        component={AnimacionLogo}
        durationInFrames={INTRO.fps * INTRO.segundos}
        fps={INTRO.fps}
        compositionWidth={medidas.ancho}
        compositionHeight={medidas.alto}
        autoPlay
        // Al acabar se queda en la última imagen (logo y lema) junto al botón «Entrar», no vuelve al principio.
        moveToBeginningWhenEnded={false}
        controls={false}
        clickToPlay={false}
        doubleClickToFullscreen={false}
        spaceKeyToPlayOrPause={false}
        acknowledgeRemotionLicense
        style={{ width: '100%', height: '100%' }}
      />
      {boton ? (
        <button
          type="button"
          className="intro-entrar"
          autoFocus
          onClick={(e) => {
            e.stopPropagation()
            entrar()
          }}
        >
          Entrar
        </button>
      ) : (
        <button
          type="button"
          className="intro-saltar"
          onClick={(e) => {
            e.stopPropagation()
            irAlFinal()
          }}
        >
          Saltar ›
        </button>
      )}
    </div>
  )
}
