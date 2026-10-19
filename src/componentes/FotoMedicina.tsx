// La foto de la pastilla o de la caja, para reconocerla de un vistazo: en Medicación y en cada toma de Alertas.
// Al tocarla se abre una ventana: sin foto, para hacerla o elegirla; con foto, para verla en grande, cambiarla o quitarla.
import { useRef, useState } from 'react'
import { cambiarFotoMedicamento } from '../db/medicamentos'
import type { Medicamento } from '../db/tipos'
import { reducirFoto } from '../utils/imagen'
import { urlDeArchivo } from '../utils/urlDeArchivo'

/** Tamaño con el que se guarda: nítida en grande, sin ocupar mucho. */
export const LADO_FOTO_MEDICINA = 900

/**
 * Dos botones: «Hacer foto» abre la cámara directamente (en muchos Android, si no se pide así, solo sale la galería)
 * y «Elegir de la galería» abre las fotos guardadas.
 */
export function BotonesFoto({ onFoto, haciendo = 'Hacer foto' }: { onFoto: (foto: Blob) => void; haciendo?: string }) {
  const camara = useRef<HTMLInputElement>(null)
  const galeria = useRef<HTMLInputElement>(null)
  const alElegir = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0]
    e.target.value = ''
    if (archivo) onFoto(await reducirFoto(archivo, LADO_FOTO_MEDICINA, 0.85))
  }
  return (
    <>
      <button type="button" className="boton" onClick={() => camara.current?.click()}>
        📷 {haciendo}
      </button>
      <button type="button" className="boton boton-secundario" onClick={() => galeria.current?.click()}>
        🖼️ Elegir de la galería
      </button>
      <input ref={camara} type="file" accept="image/*" capture="environment" hidden aria-label="Hacer una foto con la cámara" onChange={alElegir} />
      <input ref={galeria} type="file" accept="image/*" hidden aria-label="Elegir una foto de la galería" onChange={alElegir} />
    </>
  )
}

export function FotoMedicina({ medicamento: m }: { medicamento: Pick<Medicamento, 'id' | 'nombre' | 'foto'> }) {
  const [abierta, setAbierta] = useState(false)
  const url = urlDeArchivo(m.foto)

  async function guardar(foto: Blob | undefined) {
    await cambiarFotoMedicamento(m.id, foto)
    setAbierta(false)
  }

  return (
    <>
      <button
        type="button"
        className={url ? 'foto-medicina' : 'foto-medicina foto-medicina-vacia'}
        onClick={() => setAbierta(true)}
        aria-label={url ? `Ver la foto de ${m.nombre} en grande` : `Añadir una foto de ${m.nombre}`}
      >
        {url ? (
          <img src={url} alt="" />
        ) : (
          <>
            <span aria-hidden="true">📷</span>
            <small>Añadir foto</small>
          </>
        )}
      </button>
      {abierta && (
        <div className="dialogo-fondo" role="dialog" aria-modal="true" aria-label={`Foto de ${m.nombre}`} onClick={() => setAbierta(false)}>
          <div className="tarjeta dialogo pila" style={{ gap: 10 }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ margin: 0 }}>{m.nombre}</h2>
            {url ? (
              <img src={url} alt={`Foto de ${m.nombre}`} className="foto-medicina-grande" />
            ) : (
              <p style={{ margin: 0 }}>Haz una foto de la pastilla o de la caja para reconocerla de un vistazo.</p>
            )}
            <BotonesFoto onFoto={guardar} haciendo={url ? 'Hacer otra foto' : 'Hacer foto'} />
            {url && (
              <button className="boton boton-peligro-suave" onClick={() => guardar(undefined)}>
                Quitar la foto
              </button>
            )}
            <button className="enlace" onClick={() => setAbierta(false)} autoFocus>
              Cerrar
            </button>
          </div>
        </div>
      )}
    </>
  )
}
