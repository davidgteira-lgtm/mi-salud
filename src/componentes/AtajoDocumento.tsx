// Arriba de cada sección: subir un informe, hacerle una foto o contarlo con la voz, y que la app cree el registro.
// Con la IA activada, la IA lo lee y propone el registro. Sin IA, se abre el formulario con el archivo ya adjunto.
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { db, nuevoId } from '../db/db'
import { nombrePorDefecto, tipoDeArchivo, type AdjuntoNuevo } from '../db/adjuntos'
import { obtenerClave } from '../ia/claude'
import { reducirFoto } from '../utils/imagen'
import { dejarArchivo } from './archivoEntrante'
import { GrabadoraVoz } from './GrabadoraVoz'

export function AtajoDocumento({ perfilId, seccion }: { perfilId: string; seccion: string }) {
  const ir = useNavigate()
  const subir = useRef<HTMLInputElement>(null)
  const foto = useRef<HTMLInputElement>(null)
  const [grabando, setGrabando] = useState(false)
  const conIa = !!obtenerClave()
  const esAnalisis = seccion === 'analisis'

  async function usar(nuevo: AdjuntoNuevo) {
    // En Análisis, el PDF se lee en el propio móvil: se abre el formulario con él.
    // Con IA (y no siendo un PDF de análisis), la IA propone el registro.
    if (conIa && !(esAnalisis && nuevo.archivo.type === 'application/pdf')) {
      const id = nuevoId()
      const ahora = Date.now()
      await db.adjuntos.add({ id, perfilId, tipo: nuevo.tipo, nombre: nuevo.nombre, archivo: nuevo.archivo, transcripcion: nuevo.transcripcion, analisis: 'pendiente', creadoEn: ahora, actualizadoEn: ahora })
      ir(`/revisar?adjunto=${id}&seccion=${seccion}`)
      return
    }
    dejarArchivo(nuevo)
    ir(`/seccion/${seccion}?nuevo=1`)
  }

  async function alElegir(archivos: FileList | null, deCamara: boolean) {
    const f = archivos?.[0]
    if (!f) return
    const tipo = deCamara ? 'foto' : tipoDeArchivo(f)
    const archivo = tipo === 'foto' ? await reducirFoto(f, 1800, 0.82) : f
    await usar({ clave: crypto.randomUUID(), tipo, archivo, nombre: deCamara ? nombrePorDefecto('foto') : f.name })
  }

  return (
    <section className="tarjeta pila atajo-documento" aria-label="Crear con un informe, una foto o la voz" style={{ gap: 8 }}>
      <strong>📎 ¿Tienes un informe?</strong>
      <span className="texto-suave">
        {conIa
          ? 'Súbelo, hazle una foto o cuéntalo con la voz: la app lo lee y te propone el registro.'
          : esAnalisis
            ? 'Sube el PDF y la app leerá los resultados. También puedes guardar una foto o una nota de voz.'
            : 'Súbelo, hazle una foto o graba una nota de voz: se abre un registro nuevo con él ya adjunto.'}
      </span>
      <div className="botones-adjuntos">
        <button type="button" className="boton boton-secundario" onClick={() => subir.current?.click()}>
          📄 Subir informe
        </button>
        <button type="button" className="boton boton-secundario" onClick={() => foto.current?.click()}>
          📷 Hacer foto
        </button>
        <button type="button" className="boton boton-secundario" onClick={() => setGrabando(true)}>
          🎤 Contarlo
        </button>
      </div>
      <input
        ref={subir}
        type="file"
        accept="application/pdf,image/*"
        hidden
        aria-label="Elegir un informe"
        onChange={(e) => {
          alElegir(e.target.files, false)
          e.target.value = ''
        }}
      />
      <input
        ref={foto}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          alElegir(e.target.files, true)
          e.target.value = ''
        }}
      />
      {grabando && (
        <GrabadoraVoz
          onCancelar={() => setGrabando(false)}
          onListo={(audio, transcripcion) => {
            setGrabando(false)
            usar({ clave: crypto.randomUUID(), tipo: 'voz', nombre: nombrePorDefecto('voz'), archivo: audio, transcripcion })
          }}
        />
      )}
    </section>
  )
}
