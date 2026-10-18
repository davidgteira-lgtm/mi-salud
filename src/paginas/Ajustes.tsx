import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { AjustesIa } from '../componentes/AjustesIa'
import { Confirmar } from '../componentes/Confirmar'
import {
  crearCopia,
  empaquetarCopia,
  ErrorCopia,
  leerCopia,
  nombreArchivoCopia,
  personasDeCopia,
  recuperarCopia,
  tieneContrasena,
  type Copia,
} from '../copia/copia'
import { apuntarCopiaHecha } from '../copia/recordatorio'
import { db } from '../db/db'
import { borrarEjemplos, hayEjemplos } from '../demo/ejemplo'
import { usePerfilActivo } from '../perfilActivo'

export function Ajustes() {
  const { apartado } = useParams()
  const { perfil } = usePerfilActivo()
  const ir = useNavigate()
  // Se llega desde abajo del inicio: se empieza a leer por arriba.
  useEffect(() => window.scrollTo(0, 0), [apartado])

  return (
    <main className="pagina pila">
      <button className="boton-volver" onClick={() => ir(perfil ? '/inicio' : '/')} style={{ alignSelf: 'flex-start' }}>
        ← Volver
      </button>
      <h1>{apartado === 'recuperar' ? 'Recuperar una copia' : apartado === 'ia' ? 'Leer documentos con IA' : 'Ajustes'}</h1>

      {/* Desde el aviso del inicio: solo la explicación de la IA. */}
      {apartado === 'ia' && <AjustesIa />}
      {apartado !== 'ia' && <ResumenAjustes apartado={apartado} />}
    </main>
  )
}

function ResumenAjustes({ apartado }: { apartado?: string }) {
  const { perfil } = usePerfilActivo()
  const ir = useNavigate()
  return (
    <>
      {apartado !== 'recuperar' && <GuardarCopia />}
      <RecuperarCopia />

      {apartado !== 'recuperar' && perfil && (
        <section className="tarjeta pila">
          <h2>👤 Mis datos</h2>
          <button className="boton boton-secundario" onClick={() => ir(`/persona/${perfil.id}`)}>
            Cambiar nombre, foto o fecha de nacimiento
          </button>
        </section>
      )}

      {apartado !== 'recuperar' && <AjustesIa />}
      {apartado !== 'recuperar' && <BorrarEjemplos />}

      <section className="tarjeta">
        <h2>🔒 ¿Dónde están mis datos?</h2>
        <p>
          Todo lo que guardas está <strong>solo en este móvil</strong>. Nadie más puede verlo. Solo sale de él lo que tú decides analizar
          con la IA (si la activas).
        </p>
        <p style={{ margin: 0 }}>
          Por eso es importante hacer copias de seguridad: si pierdes el móvil o se rompe, con la copia lo recuperas todo en otro.
        </p>
      </section>
    </>
  )
}

function GuardarCopia() {
  const { perfil } = usePerfilActivo()
  const [quien, setQuien] = useState<'todos' | 'yo'>('todos')
  const [conContrasena, setConContrasena] = useState(true)
  const [contrasena, setContrasena] = useState('')
  const [repetida, setRepetida] = useState('')
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string }>()
  const [trabajando, setTrabajando] = useState(false)

  async function guardar() {
    setMensaje(undefined)
    if (conContrasena) {
      if (contrasena.length < 6) {
        setMensaje({ tipo: 'error', texto: 'La contraseña tiene que tener al menos 6 letras o números.' })
        return
      }
      if (contrasena !== repetida) {
        setMensaje({ tipo: 'error', texto: 'Las dos contraseñas no son iguales.' })
        return
      }
    }
    setTrabajando(true)
    try {
      const copia = await crearCopia(db, quien === 'yo' && perfil ? [perfil.id] : undefined)
      const archivo = await empaquetarCopia(copia, conContrasena ? contrasena : undefined)
      const enviado = await compartirOdescargar(archivo, nombreArchivoCopia())
      if (enviado) {
        apuntarCopiaHecha()
        setMensaje({
          tipo: 'ok',
          texto: 'Copia hecha. Guárdala en un sitio seguro fuera del móvil (Google Drive, correo, WhatsApp a ti mismo…).',
        })
      }
    } catch {
      setMensaje({ tipo: 'error', texto: 'No se pudo hacer la copia. Inténtalo otra vez.' })
    } finally {
      setTrabajando(false)
    }
  }

  return (
    <section className="tarjeta pila">
      <h2>💾 Hacer copia de seguridad</h2>
      <p style={{ margin: 0 }}>Crea un archivo con todos los datos para guardarlo fuera del móvil.</p>

      {perfil && (
        <div className="opciones">
          <button type="button" className="opcion" aria-pressed={quien === 'todos'} onClick={() => setQuien('todos')}>
            Todas las personas
          </button>
          <button type="button" className="opcion" aria-pressed={quien === 'yo'} onClick={() => setQuien('yo')}>
            Solo {perfil.nombre}
          </button>
        </div>
      )}

      <label style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 56 }}>
        <input
          type="checkbox"
          checked={conContrasena}
          onChange={(e) => setConContrasena(e.target.checked)}
          style={{ width: 32, height: 32 }}
        />
        <span>Proteger con contraseña (recomendado)</span>
      </label>

      {conContrasena && (
        <>
          <label className="campo">
            <span>Contraseña</span>
            <input type="password" value={contrasena} onChange={(e) => setContrasena(e.target.value)} autoComplete="new-password" />
          </label>
          <label className="campo">
            <span>Repite la contraseña</span>
            <input type="password" value={repetida} onChange={(e) => setRepetida(e.target.value)} autoComplete="new-password" />
          </label>
          <p className="aviso" style={{ margin: 0 }}>
            ⚠️ Apúntala en un papel. <strong>Si la olvidas, la copia no se podrá abrir</strong>.
          </p>
        </>
      )}

      {mensaje && <p className={`aviso ${mensaje.tipo === 'ok' ? 'aviso-ok' : 'aviso-error'}`}>{mensaje.texto}</p>}

      <button className="boton" onClick={guardar} disabled={trabajando}>
        {trabajando ? 'Preparando…' : 'Hacer copia ahora'}
      </button>
    </section>
  )
}

function RecuperarCopia() {
  const ir = useNavigate()
  const { perfil } = usePerfilActivo()
  const selector = useRef<HTMLInputElement>(null)
  const [texto, setTexto] = useState<string>()
  const [necesitaContrasena, setNecesitaContrasena] = useState(false)
  const [contrasena, setContrasena] = useState('')
  const [copia, setCopia] = useState<Copia>()
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string }>()

  async function alElegirArchivo(archivo: File | undefined) {
    setMensaje(undefined)
    setCopia(undefined)
    if (!archivo) return
    const contenido = await archivo.text()
    setTexto(contenido)
    if (tieneContrasena(contenido)) {
      setNecesitaContrasena(true)
    } else {
      await abrir(contenido)
    }
  }

  async function abrir(contenido: string, clave?: string) {
    try {
      setCopia(await leerCopia(contenido, clave))
      setNecesitaContrasena(false)
    } catch (e) {
      setMensaje({ tipo: 'error', texto: e instanceof ErrorCopia ? e.message : 'No se pudo abrir el archivo.' })
    }
  }

  async function recuperar() {
    if (!copia) return
    try {
      const total = await recuperarCopia(db, copia)
      setCopia(undefined)
      setTexto(undefined)
      setContrasena('')
      setMensaje({ tipo: 'ok', texto: `Copia recuperada: ${total} datos guardados.` })
    } catch {
      setMensaje({ tipo: 'error', texto: 'No se pudo recuperar la copia.' })
    }
  }

  return (
    <section className="tarjeta pila">
      <h2>📂 Recuperar una copia</h2>
      <p style={{ margin: 0 }}>Elige el archivo de copia que guardaste (empieza por «mi-salud-copia»).</p>
      <input
        ref={selector}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={(e) => {
          alElegirArchivo(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      <button className="boton boton-secundario" onClick={() => selector.current?.click()}>
        Elegir archivo de copia
      </button>

      {necesitaContrasena && texto && (
        <form
          className="pila"
          onSubmit={(e) => {
            e.preventDefault()
            abrir(texto, contrasena)
          }}
        >
          <label className="campo">
            <span>Contraseña de la copia</span>
            <input type="password" value={contrasena} onChange={(e) => setContrasena(e.target.value)} autoFocus />
          </label>
          <button type="submit" className="boton">
            Abrir copia
          </button>
        </form>
      )}

      {mensaje && <p className={`aviso ${mensaje.tipo === 'ok' ? 'aviso-ok' : 'aviso-error'}`}>{mensaje.texto}</p>}
      {mensaje?.tipo === 'ok' && (
        <button className="boton" onClick={() => ir(perfil ? '/inicio' : '/')}>
          Ir al inicio
        </button>
      )}

      {copia && (
        <Confirmar titulo="¿Recuperar esta copia?" textoSi="Sí, recuperar" onSi={recuperar} onNo={() => setCopia(undefined)}>
          <p>
            Copia del <strong>{new Date(copia.creadaEn).toLocaleDateString('es-ES', { dateStyle: 'long' })}</strong> con los datos de:{' '}
            <strong>{personasDeCopia(copia).join(', ') || 'nadie'}</strong>.
          </p>
          <p>Si alguno de esos datos ya está en este móvil, se cambiará por el de la copia. Lo demás no se toca.</p>
        </Confirmar>
      )}
    </section>
  )
}

/**
 * En el móvil abre el menú de "Compartir" (para mandarlo a Drive, WhatsApp, correo…).
 * En el ordenador, descarga el archivo. Devuelve false si la persona cancela.
 */
async function compartirOdescargar(archivo: Blob, nombre: string): Promise<boolean> {
  const fichero = new File([archivo], nombre, { type: 'application/json' })
  if (navigator.canShare?.({ files: [fichero] })) {
    try {
      await navigator.share({ files: [fichero], title: 'Copia de Mi Salud' })
      return true
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return false
      // Si compartir falla por otro motivo, se descarga.
    }
  }
  const url = URL.createObjectURL(fichero)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre
  enlace.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return true
}

/** Borrar las personas de ejemplo (las de verdad no se tocan). */
function BorrarEjemplos() {
  const hay = useLiveQuery(hayEjemplos)
  const { perfil, elegir } = usePerfilActivo()
  const ir = useNavigate()
  const [preguntar, setPreguntar] = useState(false)
  if (!hay) return null
  return (
    <section className="tarjeta pila" aria-label="Personas de ejemplo">
      <h2>👀 Personas de ejemplo</h2>
      <p style={{ margin: 0 }}>Rosa y Lucía (ejemplo) tienen datos inventados para enseñar la app. Puedes borrarlas cuando quieras.</p>
      <button className="boton boton-secundario" onClick={() => setPreguntar(true)}>
        Borrar las personas de ejemplo
      </button>
      {preguntar && (
        <Confirmar
          titulo="¿Borrar las personas de ejemplo?"
          textoSi="Sí, borrarlas"
          peligroso
          onSi={async () => {
            const eraEjemplo = !!perfil?.ejemplo
            await borrarEjemplos()
            setPreguntar(false)
            if (eraEjemplo) {
              elegir(null)
              ir('/')
            }
          }}
          onNo={() => setPreguntar(false)}
        >
          <p>Las personas de verdad y sus datos no se tocan.</p>
        </Confirmar>
      )}
    </section>
  )
}
