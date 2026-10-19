// La intro a pantalla completa: la animación del logo (Remotion) con su jingle y, al final, el botón «Entrar».
// «Saltar» (o tocar la pantalla) lleva directamente al final, con el botón ya a la vista.
// Los móviles no dejan sonar una web hasta que se toca: si no deja, sale «Activar sonido».
import { Player, type PlayerRef } from '@remotion/player'
import { useEffect, useRef, useState } from 'react'
import { AnimacionLogo } from './AnimacionLogo'
import { INTRO, medidasIntro } from './config'
import jingle from './jingle.m4a'

/** Cuando la animación llena la pantalla con el fondo de la app (a los 3,75 s), el resto de la pantalla también. */
const MS_FONDO_CLARO = 3750
/** El botón sale cuando el lema ya se lee (a los 5,6 s). */
const MS_BOTON = 5600
const MS_FUNDIDO = 500

type Sonido = 'sonando' | 'bloqueado' | 'silencio'

export function Intro({ onFin }: { onFin: () => void }) {
  const reproductor = useRef<PlayerRef>(null)
  const musica = useRef<HTMLAudioElement | null>(null)
  const [medidas] = useState(() => medidasIntro())
  const [claro, setClaro] = useState(false)
  const [boton, setBoton] = useState(false)
  const [saliendo, setSaliendo] = useState(false)
  const [sonido, setSonido] = useState<Sonido>('sonando')

  useEffect(() => {
    const audio = new Audio(jingle)
    audio.preload = 'auto'
    musica.current = audio
    audio.play().catch(() => setSonido('bloqueado'))
    const tClaro = setTimeout(() => setClaro(true), MS_FONDO_CLARO)
    const tBoton = setTimeout(() => setBoton(true), MS_BOTON)
    return () => {
      audio.pause()
      clearTimeout(tClaro)
      clearTimeout(tBoton)
    }
  }, [])

  /** Activa el sonido desde el punto en que va la animación. */
  function activarSonido() {
    const audio = musica.current
    const p = reproductor.current
    if (!audio) return
    audio.currentTime = (p?.getCurrentFrame() ?? 0) / INTRO.fps
    audio.muted = false
    audio
      .play()
      .then(() => setSonido('sonando'))
      .catch(() => setSonido('bloqueado'))
  }

  function silenciar() {
    if (musica.current) musica.current.muted = true
    setSonido('silencio')
  }

  /** Al final de la animación, quieta, con el botón. */
  function irAlFinal() {
    const p = reproductor.current
    p?.pause()
    p?.seekTo(INTRO.fps * INTRO.segundos - 1)
    musica.current?.pause()
    setClaro(true)
    setBoton(true)
  }

  function entrar() {
    if (saliendo) return
    setSaliendo(true)
    // La música se apaga a la vez que la pantalla.
    const audio = musica.current
    if (audio && !audio.paused) {
      const inicio = audio.volume
      const paso = setInterval(() => {
        audio.volume = Math.max(0, audio.volume - inicio / 10)
        if (audio.volume === 0) clearInterval(paso)
      }, MS_FUNDIDO / 10)
    }
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
      {!boton && (
        <button
          type="button"
          className="intro-sonido"
          aria-label={sonido === 'sonando' ? 'Quitar el sonido' : 'Activar el sonido'}
          onClick={(e) => {
            e.stopPropagation()
            if (sonido === 'sonando') silenciar()
            else activarSonido()
          }}
        >
          {sonido === 'sonando' ? '🔊' : sonido === 'bloqueado' ? '🔊 Activar sonido' : '🔇'}
        </button>
      )}
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
