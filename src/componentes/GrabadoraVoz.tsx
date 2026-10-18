import { useEffect, useRef, useState } from 'react'
import { iaAceptada, obtenerClave } from '../ia/claude'
import { empezarDictado } from '../utils/dictado'

const MAXIMO_SEGUNDOS = 5 * 60

/**
 * Graba una nota de voz con el micrófono del móvil. Funciona sin internet.
 * Si la IA está activada, además intenta escribir lo que se dice (con el dictado del móvil),
 * para que la IA pueda leer la nota después. Si el móvil no puede hacer las dos cosas a la vez,
 * la nota se guarda igual, solo que sin texto.
 */
export function GrabadoraVoz({ onListo, onCancelar }: { onListo: (audio: Blob, transcripcion?: string) => void; onCancelar: () => void }) {
  const [estado, setEstado] = useState<'pidiendo' | 'grabando' | 'error'>(() =>
    typeof navigator !== 'undefined' && navigator.mediaDevices ? 'pidiendo' : 'error',
  )
  const [segundos, setSegundos] = useState(0)
  const grabadora = useRef<MediaRecorder | null>(null)
  const trozos = useRef<Blob[]>([])
  const cancelado = useRef(false)
  const frases = useRef<string[]>([])
  const pararDictado = useRef<(() => void) | null>(null)

  useEffect(() => {
    let flujo: MediaStream | undefined
    let reloj: ReturnType<typeof setInterval> | undefined
    let limite: ReturnType<typeof setTimeout> | undefined
    cancelado.current = false

    navigator.mediaDevices
      ?.getUserMedia({ audio: true })
      .then((f) => {
        flujo = f
        // Cada móvil graba en un formato: Android suele usar webm y iPhone mp4.
        const tipo = ['audio/webm', 'audio/mp4', 'audio/ogg'].find((t) => MediaRecorder.isTypeSupported?.(t))
        const g = new MediaRecorder(f, tipo ? { mimeType: tipo } : undefined)
        g.ondataavailable = (e) => e.data.size > 0 && trozos.current.push(e.data)
        g.onstop = () => {
          f.getTracks().forEach((t) => t.stop())
          const audio = new Blob(trozos.current, { type: g.mimeType || tipo || 'audio/webm' })
          // Se espera un momento a que el dictado entregue la última frase.
          const entregar = () => {
            if (!cancelado.current) onListo(audio, frases.current.join(' ').trim() || undefined)
          }
          if (pararDictado.current) {
            pararDictado.current()
            setTimeout(entregar, 800)
          } else entregar()
        }
        g.start()
        // Escribir lo que se dice, solo si la IA está activada y aceptada (el dictado usa internet).
        if (obtenerClave() && iaAceptada()) {
          pararDictado.current = empezarDictado(
            (frase) => frases.current.push(frase),
            () => {},
          )
        }
        grabadora.current = g
        setEstado('grabando')
        reloj = setInterval(() => setSegundos((s) => s + 1), 1000)
        // Al llegar al máximo, se para sola y se guarda.
        limite = setTimeout(() => g.state === 'recording' && g.stop(), MAXIMO_SEGUNDOS * 1000)
      })
      .catch(() => setEstado('error'))

    return () => {
      cancelado.current = true
      clearInterval(reloj)
      clearTimeout(limite)
      pararDictado.current?.()
      if (grabadora.current?.state === 'recording') grabadora.current.stop()
      flujo?.getTracks().forEach((t) => t.stop())
    }
    // Solo al abrir la grabadora.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function parar() {
    if (grabadora.current?.state === 'recording') grabadora.current.stop()
  }

  const mmss = `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, '0')}`

  return (
    <div className="dialogo-fondo" role="dialog" aria-modal="true" aria-label="Grabar nota de voz">
      <div className="tarjeta dialogo pila" style={{ textAlign: 'center' }}>
        {estado === 'error' ? (
          <>
            <h2>No se puede usar el micrófono</h2>
            <p>Revisa que has dado permiso a Mi Salud para usar el micrófono en los ajustes del móvil.</p>
            <button className="boton" onClick={onCancelar}>
              Vale
            </button>
          </>
        ) : (
          <>
            <h2>{estado === 'pidiendo' ? 'Preparando el micrófono…' : '🔴 Grabando'}</h2>
            <p style={{ fontSize: '2.2rem', fontWeight: 800, margin: 0 }}>{mmss}</p>
            <p className="texto-suave">Habla con normalidad. Puedes grabar hasta 5 minutos.</p>
            <button className="boton" onClick={parar} disabled={estado !== 'grabando'}>
              ⏹️ Parar y guardar
            </button>
            <button className="boton boton-secundario" onClick={onCancelar}>
              Cancelar
            </button>
          </>
        )}
      </div>
    </div>
  )
}
