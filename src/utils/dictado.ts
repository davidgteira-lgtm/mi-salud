// Dictar: pasar a texto lo que se dice, con el reconocimiento de voz del propio móvil
// (en Android, el de Google; en iPhone, el de Apple). Necesita internet en la mayoría de móviles.

interface Reconocedor {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
}

type ConstructorReconocedor = new () => Reconocedor

function constructor(): ConstructorReconocedor | undefined {
  if (typeof window === 'undefined') return undefined
  const w = window as unknown as { SpeechRecognition?: ConstructorReconocedor; webkitSpeechRecognition?: ConstructorReconocedor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

export function hayDictado(): boolean {
  return constructor() !== undefined
}

/**
 * Empieza a escuchar. Llama a `onTexto` con cada frase reconocida y a `onFin` al terminar.
 * Devuelve una función para parar, o null si el móvil no sabe dictar.
 */
export function empezarDictado(onTexto: (frase: string) => void, onFin: (error?: string) => void): (() => void) | null {
  const C = constructor()
  if (!C) return null
  const r = new C()
  r.lang = 'es-ES'
  r.continuous = true
  r.interimResults = false
  r.onresult = (e) => {
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const res = e.results[i]
      if (res.isFinal) onTexto(res[0].transcript.trim())
    }
  }
  let error: string | undefined
  r.onerror = (e) => {
    error =
      e.error === 'not-allowed'
        ? 'No hay permiso para usar el micrófono.'
        : e.error === 'network'
          ? 'Para dictar hace falta internet.'
          : e.error === 'no-speech'
            ? undefined
            : 'No se ha podido entender. Prueba otra vez.'
  }
  r.onend = () => onFin(error)
  try {
    r.start()
  } catch {
    return null
  }
  return () => r.stop()
}
