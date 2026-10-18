// Ajustes de la IA: la clave de acceso y qué se envía al analizar.
import { useState } from 'react'
import { borrarClave, ErrorIa, guardarClave, obtenerClave, pareceClave, probarClave } from '../ia/claude'

/** Lo que pasa con los datos al analizar. Se enseña en Ajustes y antes del primer análisis. */
export function QueSeEnvia() {
  return (
    <ul style={{ margin: 0, paddingLeft: '1.2em' }}>
      <li>
        Solo cuando pulsas <strong>«Analizar»</strong>, ese documento, foto o texto se envía por internet a <strong>Anthropic</strong> (la
        empresa de la IA Claude), y nada más.
      </li>
      <li>Junto con él van tu edad, tu sexo y los nombres de tus medicamentos y alergias, para que no los repita. Nunca tu nombre.</li>
      <li>Según sus condiciones de uso, Anthropic no usa lo que le envías para entrenar su IA.</li>
      <li>
        Para «Dictar» y para escribir las notas de voz, el móvil usa su propio reconocimiento de voz (el de Google o el de Apple), que
        también va por internet.
      </li>
      <li>La IA solo propone: no se apunta nada hasta que tú dices que sí.</li>
      <li>El resto de tus datos sigue solo en este móvil.</li>
    </ul>
  )
}

export function AjustesIa() {
  const [guardada, setGuardada] = useState(() => obtenerClave())
  const [clave, setClave] = useState('')
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string }>()
  const [probando, setProbando] = useState(false)

  async function guardar() {
    setMensaje(undefined)
    if (!pareceClave(clave)) {
      setMensaje({ tipo: 'error', texto: 'Eso no parece una clave de Anthropic. Empieza por «sk-ant-».' })
      return
    }
    setProbando(true)
    try {
      await probarClave(clave.trim())
      guardarClave(clave)
      setGuardada(clave.trim())
      setClave('')
      setMensaje({ tipo: 'ok', texto: '✓ La clave funciona. Ya puedes analizar documentos.' })
    } catch (e) {
      setMensaje({ tipo: 'error', texto: e instanceof ErrorIa ? e.message : 'No se ha podido comprobar la clave.' })
    } finally {
      setProbando(false)
    }
  }

  return (
    <section className="tarjeta pila" aria-label="Inteligencia artificial">
      <h2>🤖 Inteligencia artificial</h2>
      <p style={{ margin: 0 }}>
        La IA lee tus informes, recetas y fotos, y te propone qué apuntar en cada sección. Es opcional: la app funciona igual sin ella.
      </p>
      <QueSeEnvia />

      {guardada ? (
        <>
          <p className="aviso aviso-ok" style={{ margin: 0 }}>
            ✓ La IA está activada en este móvil (clave que acaba en …{guardada.slice(-4)}).
          </p>
          <button
            className="boton boton-secundario"
            onClick={() => {
              borrarClave()
              setGuardada(null)
              setMensaje(undefined)
            }}
          >
            Quitar la clave de este móvil
          </button>
        </>
      ) : (
        <>
          <p className="texto-suave" style={{ margin: 0 }}>
            Para activarla hace falta una clave de Anthropic (se saca en console.anthropic.com y se paga según el uso: unos céntimos por
            documento). Puede ponerla quien te haya instalado la app.
          </p>
          <label className="campo">
            <span>Clave de la IA</span>
            <input
              type="password"
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              placeholder="sk-ant-…"
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <button className="boton" onClick={guardar} disabled={probando || !clave.trim()}>
            {probando ? 'Comprobando…' : 'Guardar y probar'}
          </button>
        </>
      )}
      {mensaje && (
        <p className={mensaje.tipo === 'ok' ? 'aviso aviso-ok' : 'aviso aviso-error'} role="status" style={{ margin: 0 }}>
          {mensaje.texto}
        </p>
      )}
    </section>
  )
}
