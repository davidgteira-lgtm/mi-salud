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

/** Qué hace la IA, cuánto cuesta y cómo conseguir la clave, paso a paso. */
export function ComoActivarIa() {
  return (
    <div className="pila" style={{ gap: 10 }}>
      <p style={{ margin: 0 }}>
        <strong>Sin IA la app funciona igual:</strong> lo apuntas tú, y los PDF de análisis, de la receta de las gafas y de los partes de
        baja los lee igualmente ella sola.
      </p>
      <p style={{ margin: 0 }}>
        <strong>Con IA</strong>, además, la app lee cualquier informe, receta, foto o nota de voz y te deja el registro rellenado: tú solo
        lo revisas y dices que sí.
      </p>
      <p className="aviso aviso-cita" style={{ margin: 0 }}>
        💶 <strong>¿Cuánto cuesta?</strong> Se paga lo que se usa: unos 3 o 4 céntimos por documento. Con <strong>5 € de saldo</strong>{' '}
        tienes para <strong>más de 100 documentos</strong> (es aproximado: depende de lo largo que sea cada uno).
      </p>
      <strong>Cómo activarla, paso a paso:</strong>
      <ol className="pasos-ia">
        <li>
          Entra en{' '}
          <a href="https://console.anthropic.com" target="_blank" rel="noreferrer">
            console.anthropic.com
          </a>{' '}
          y crea una cuenta con tu correo. Es la de Anthropic, la empresa de la IA Claude (distinta de la de claude.ai).
        </li>
        <li>
          En <strong>«Billing»</strong> (facturación), añade saldo: con 5 € basta para empezar. Pon un límite de gasto al mes y así estás
          tranquilo.
        </li>
        <li>
          En <strong>«API Keys»</strong>, pulsa <strong>«Create Key»</strong>, ponle un nombre (por ejemplo, «Mi Salud») y copia la clave:
          empieza por <code>sk-ant-</code>.
        </li>
        <li>
          Vuelve aquí, pégala abajo y pulsa <strong>«Guardar y probar»</strong>. Se queda guardada solo en este móvil.
        </li>
      </ol>
      <p className="texto-suave" style={{ margin: 0 }}>
        Si te ha instalado la app un familiar, puede hacerlo él y poner la clave en tu móvil.
      </p>
    </div>
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
    <section className="tarjeta pila" aria-label="Inteligencia artificial" id="ia">
      <h2>🤖 Que la app lea tus documentos (IA)</h2>
      <p style={{ margin: 0 }}>
        La IA lee tus informes, recetas y fotos, y te propone qué apuntar en cada sección. Es opcional.
      </p>
      <details>
        <summary>
          <strong>Qué se envía y qué no</strong>
        </summary>
        <QueSeEnvia />
      </details>

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
          <ComoActivarIa />
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
