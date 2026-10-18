// Arriba de cada sección: subir un informe, hacerle una foto o contarlo con la voz, y que la app cree el registro.
// Con la IA activada, la IA lo lee y propone el registro. Sin IA, se abre el formulario con el archivo ya adjunto.
import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { db, nuevoId } from '../db/db'
import { nombrePorDefecto, tipoDeArchivo, type AdjuntoNuevo } from '../db/adjuntos'
import { obtenerClave } from '../ia/claude'
import { reducirFoto } from '../utils/imagen'
import { dejarArchivo } from './archivoEntrante'
import { GrabadoraVoz } from './GrabadoraVoz'

/** Secciones cuyos PDF se leen sin IA, y de qué documento. */
const SIN_IA: Record<string, string> = {
  analisis: 'del análisis',
  ojos: 'de la receta de las gafas',
  bajas: 'del parte de baja, de confirmación o de alta',
}

export function AtajoDocumento({ perfilId, seccion }: { perfilId: string; seccion: string }) {
  const ir = useNavigate()
  const subir = useRef<HTMLInputElement>(null)
  const foto = useRef<HTMLInputElement>(null)
  const [grabando, setGrabando] = useState(false)
  const conIa = !!obtenerClave()
  const leeSinIa = SIN_IA[seccion]

  async function usar(nuevo: AdjuntoNuevo) {
    // Los PDF de análisis, recetas de gafas y partes de baja se leen en el propio móvil: se abre el formulario con él.
    // Con IA (y si no), la IA propone el registro.
    if (conIa && !(leeSinIa && nuevo.archivo.type === 'application/pdf')) {
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
          : leeSinIa
            ? `Sube el PDF ${leeSinIa} y la app copiará los datos. También puedes guardar una foto o una nota de voz.`
            : 'Súbelo, hazle una foto o graba una nota de voz: se abre un registro nuevo con él ya adjunto.'}
      </span>
      {!conIa && (
        <Link to="/ajustes/ia" style={{ fontSize: '0.95rem' }}>
          ¿Quieres que la app lo lea y lo rellene por ti? Mira cómo activar la IA
        </Link>
      )}
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
