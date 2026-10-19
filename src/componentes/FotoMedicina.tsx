// La foto de la pastilla o de la caja, a la izquierda de cada medicina, para reconocerla de un vistazo.
// Sin foto: «Añadir foto». Con foto: al tocarla se ve en grande y se puede cambiar o quitar.
// Al elegir, el móvil deja hacer la foto con la cámara o cogerla de la galería.
import { useRef, useState } from 'react'
import { cambiarFotoMedicamento } from '../db/medicamentos'
import type { Medicamento } from '../db/tipos'
import { reducirFoto } from '../utils/imagen'
import { urlDeArchivo } from '../utils/urlDeArchivo'

/** Tamaño con el que se guarda: nítida en grande, sin ocupar mucho. */
export const LADO_FOTO_MEDICINA = 900

/** Solo la miniatura, sin poder cambiarla (para las alertas). */
export function MiniaturaMedicina({ foto, tamano = 56 }: { foto?: Blob; tamano?: number }) {
  const url = urlDeArchivo(foto)
  if (!url) return null
  return <img src={url} alt="" className="foto-medicina-mini" width={tamano} height={tamano} />
}

export function FotoMedicina({ medicamento: m }: { medicamento: Pick<Medicamento, 'id' | 'nombre' | 'foto'> }) {
  const selector = useRef<HTMLInputElement>(null)
  const [viendo, setViendo] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const url = urlDeArchivo(m.foto)

  async function alElegir(archivo: File | undefined) {
    if (!archivo) return
    setGuardando(true)
    await cambiarFotoMedicamento(m.id, await reducirFoto(archivo, LADO_FOTO_MEDICINA, 0.85))
    setGuardando(false)
  }

  return (
    <>
      <button
        type="button"
        className={url ? 'foto-medicina' : 'foto-medicina foto-medicina-vacia'}
        onClick={() => (url ? setViendo(true) : selector.current?.click())}
        aria-label={url ? `Ver la foto de ${m.nombre} en grande` : `Añadir una foto de ${m.nombre}`}
        disabled={guardando}
      >
        {url ? (
          <img src={url} alt="" />
        ) : (
          <>
            <span aria-hidden="true">📷</span>
            <small>{guardando ? 'Guardando…' : 'Añadir foto'}</small>
          </>
        )}
      </button>
      <input
        ref={selector}
        type="file"
        accept="image/*"
        hidden
        aria-label={`Foto de ${m.nombre}`}
        onChange={(e) => {
          alElegir(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      {viendo && url && (
        <div className="dialogo-fondo" role="dialog" aria-modal="true" aria-label={`Foto de ${m.nombre}`} onClick={() => setViendo(false)}>
          <div className="tarjeta dialogo pila" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ margin: 0 }}>{m.nombre}</h2>
            <img src={url} alt={`Foto de ${m.nombre}`} className="foto-medicina-grande" />
            <button
              className="boton"
              onClick={() => {
                setViendo(false)
                selector.current?.click()
              }}
            >
              📷 Cambiar foto
            </button>
            <button
              className="boton boton-peligro-suave"
              onClick={async () => {
                await cambiarFotoMedicamento(m.id, undefined)
                setViendo(false)
              }}
            >
              Quitar la foto
            </button>
            <button className="boton boton-secundario" onClick={() => setViendo(false)} autoFocus>
              Cerrar
            </button>
          </div>
        </div>
      )}
    </>
  )
}
