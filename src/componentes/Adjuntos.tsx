import { useLiveQuery } from 'dexie-react-hooks'
import { useRef, useState } from 'react'
import { borrarAdjunto, listarAdjuntos, nombrePorDefecto, tipoDeArchivo, type AdjuntoNuevo } from '../db/adjuntos'
import type { Adjunto } from '../db/tipos'
import { reducirFoto } from '../utils/imagen'
import { urlDeArchivo } from '../utils/urlDeArchivo'
import { Confirmar } from './Confirmar'
import { GrabadoraVoz } from './GrabadoraVoz'

const ICONO = { foto: '📷', documento: '📄', voz: '🎤' }

/**
 * Los tres botones para añadir foto, documento o nota de voz, y la lista de lo añadido.
 * Lo nuevo se queda en `pendientes` hasta que se guarda el formulario.
 */
export function EditorAdjuntos(props: {
  registroId?: string
  pendientes: AdjuntoNuevo[]
  onPendientes: (lista: AdjuntoNuevo[]) => void
  titulo?: string
  ayuda?: string
}) {
  const guardados = useLiveQuery(() => (props.registroId ? listarAdjuntos(props.registroId) : []), [props.registroId])
  const camara = useRef<HTMLInputElement>(null)
  const documento = useRef<HTMLInputElement>(null)
  const [grabando, setGrabando] = useState(false)
  const [preparando, setPreparando] = useState(false)
  const [quitar, setQuitar] = useState<Adjunto>()

  async function anadir(archivos: FileList | null, deCamara: boolean) {
    if (!archivos?.length) return
    setPreparando(true)
    const nuevos: AdjuntoNuevo[] = []
    for (const f of Array.from(archivos)) {
      const tipo = deCamara ? 'foto' : tipoDeArchivo(f)
      // Las fotos se reducen, pero no tanto: un informe fotografiado tiene que poder leerse.
      const archivo = tipo === 'foto' ? await reducirFoto(f, 1800, 0.82) : f
      nuevos.push({ clave: crypto.randomUUID(), tipo, archivo, nombre: deCamara ? nombrePorDefecto('foto') : f.name })
    }
    props.onPendientes([...props.pendientes, ...nuevos])
    setPreparando(false)
  }

  return (
    <div className="campo">
      <span>{props.titulo ?? 'Fotos, documentos y notas de voz'}</span>
      <small>{props.ayuda ?? 'Por ejemplo, una foto del informe o una nota de voz contando lo que te dijeron.'}</small>
      <div className="botones-adjuntos">
        <button type="button" className="boton boton-secundario" onClick={() => camara.current?.click()}>
          📷 Hacer foto
        </button>
        <button type="button" className="boton boton-secundario" onClick={() => documento.current?.click()}>
          📄 Subir documento
        </button>
        <button type="button" className="boton boton-secundario" onClick={() => setGrabando(true)}>
          🎤 Nota de voz
        </button>
      </div>
      <input
        ref={camara}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          anadir(e.target.files, true)
          e.target.value = ''
        }}
      />
      <input
        ref={documento}
        type="file"
        accept="application/pdf,image/*"
        multiple
        hidden
        onChange={(e) => {
          anadir(e.target.files, false)
          e.target.value = ''
        }}
      />
      {preparando && <p className="texto-suave">Preparando…</p>}

      {(guardados?.length ?? 0) + props.pendientes.length > 0 && (
        <ul className="lista-adjuntos">
          {guardados?.map((a) => (
            <FilaAdjunto key={a.id} tipo={a.tipo} nombre={a.nombre} archivo={a.archivo} onQuitar={() => setQuitar(a)} />
          ))}
          {props.pendientes.map((a) => (
            <FilaAdjunto
              key={a.clave}
              tipo={a.tipo}
              nombre={a.nombre}
              archivo={a.archivo}
              onQuitar={() => props.onPendientes(props.pendientes.filter((x) => x.clave !== a.clave))}
            />
          ))}
        </ul>
      )}

      {grabando && (
        <GrabadoraVoz
          onCancelar={() => setGrabando(false)}
          onListo={(audio, transcripcion) => {
            setGrabando(false)
            props.onPendientes([
              ...props.pendientes,
              { clave: crypto.randomUUID(), tipo: 'voz', nombre: nombrePorDefecto('voz'), archivo: audio, transcripcion },
            ])
          }}
        />
      )}
      {quitar && (
        <Confirmar
          titulo={`¿Quitar «${quitar.nombre}»?`}
          textoSi="Sí, quitar"
          peligroso
          onSi={async () => {
            await borrarAdjunto(quitar.id)
            setQuitar(undefined)
          }}
          onNo={() => setQuitar(undefined)}
        />
      )}
    </div>
  )
}

function FilaAdjunto(props: { tipo: Adjunto['tipo']; nombre: string; archivo: Blob; onQuitar: () => void }) {
  return (
    <li className="fila-adjunto">
      <MiniaturaAdjunto tipo={props.tipo} nombre={props.nombre} archivo={props.archivo} />
      <button type="button" className="enlace" onClick={props.onQuitar}>
        Quitar
      </button>
    </li>
  )
}

/** Ver un adjunto: foto pequeña (se amplía al pulsar), documento (se abre) o nota de voz (se escucha). */
export function MiniaturaAdjunto({ tipo, nombre, archivo }: { tipo: Adjunto['tipo']; nombre: string; archivo: Blob }) {
  const [ampliada, setAmpliada] = useState(false)
  const url = urlDeArchivo(archivo)
  if (tipo === 'voz') {
    return (
      <span className="adjunto-voz">
        <span>🎤 {nombre}</span>
        <audio controls src={url} preload="metadata" />
      </span>
    )
  }
  if (tipo === 'foto') {
    return (
      <>
        <button type="button" className="adjunto-foto" onClick={() => setAmpliada(true)} aria-label={`Ver ${nombre}`}>
          <img src={url} alt="" />
          <span>{nombre}</span>
        </button>
        {ampliada && (
          <div className="dialogo-fondo visor" role="dialog" aria-modal="true" aria-label={nombre} onClick={() => setAmpliada(false)}>
            <img src={url} alt={nombre} />
            <button type="button" className="boton">
              Cerrar
            </button>
          </div>
        )}
      </>
    )
  }
  return (
    <a className="adjunto-documento" href={url} target="_blank" rel="noreferrer">
      {ICONO.documento} {nombre}
    </a>
  )
}

/** Solo para ver (en las tarjetas): los adjuntos de un registro. */
/** Los archivos de un registro. Con `titulo`, se pone encima («Partes e informes (3)»). */
export function VerAdjuntos({ registroId, titulo }: { registroId: string; titulo?: string }) {
  const lista = useLiveQuery(() => listarAdjuntos(registroId), [registroId])
  if (!lista?.length) return null
  return (
    <ul className="lista-adjuntos" aria-label={titulo}>
      {titulo && (
        <li className="texto-suave" style={{ fontWeight: 700 }}>
          📎 {titulo} ({lista.length})
        </li>
      )}
      {lista.map((a) => (
        <li key={a.id} className="fila-adjunto">
          <MiniaturaAdjunto tipo={a.tipo} nombre={a.nombre} archivo={a.archivo} />
        </li>
      ))}
    </ul>
  )
}
