// «Por revisar»: la IA lee tus documentos o lo que le cuentas, propone qué apuntar y tú confirmas.
import { useLiveQuery } from 'dexie-react-hooks'
import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { MiniaturaAdjunto } from '../componentes/Adjuntos'
import { Confirmar } from '../componentes/Confirmar'
import { QueSeEnvia } from '../componentes/AjustesIa'
import type { Adjunto, Perfil } from '../db/tipos'
import { adjuntosPendientes, bloquesDeAdjunto, bloquesDeTexto, marcarAdjunto, pedirPropuestas, sePuedeAnalizar } from '../ia/analizar'
import { aceptarIa, ErrorIa, iaAceptada, obtenerClave, type Bloque } from '../ia/claude'
import { guardarPropuesta, verPropuesta, type Lectura, type Propuesta } from '../ia/propuestas'
import { usePerfilActivo } from '../perfilActivo'
import { empezarDictado, hayDictado } from '../utils/dictado'

type EstadoPropuesta = { que: 'pendiente' } | { que: 'guardada'; seccion: string } | { que: 'descartada' } | { que: 'error'; texto: string }

interface Resultado {
  /** De qué archivo viene (si no, es lo que se ha contado). */
  adjunto?: Adjunto
  lectura: Lectura
  estados: EstadoPropuesta[]
}

export function PorRevisar() {
  const { perfil } = usePerfilActivo()
  const ir = useNavigate()
  if (!perfil) return null
  return (
    <main className="pagina pila">
      <button className="boton-volver" onClick={() => ir('/inicio')} style={{ alignSelf: 'flex-start' }}>
        ← Volver al inicio
      </button>
      <h1>🤖 Por revisar</h1>
      <Contenido perfil={perfil} />
    </main>
  )
}

function Contenido({ perfil }: { perfil: Perfil }) {
  const clave = obtenerClave()
  const pendientes = useLiveQuery(() => adjuntosPendientes(perfil.id), [perfil.id])
  const [trabajando, setTrabajando] = useState<string>()
  const [error, setError] = useState('')
  const [resultado, setResultado] = useState<Resultado>()
  const [preguntar, setPreguntar] = useState<() => void>()

  if (!clave) {
    return (
      <div className="aviso pila" style={{ gap: 10 }}>
        <span>La IA no está activada en este móvil. Se activa en Ajustes, con una clave de acceso.</span>
        <Link to="/ajustes" className="boton" style={{ textAlign: 'center' }}>
          Ir a Ajustes
        </Link>
      </div>
    )
  }

  /** La primera vez, antes de enviar nada, se explica qué se envía. */
  const conPermiso = (hacer: () => void) => (iaAceptada() ? hacer() : setPreguntar(() => hacer))

  async function analizar(que: string, contenido: () => Promise<Bloque[]>, adjunto?: Adjunto) {
    setError('')
    setTrabajando(que)
    try {
      const lectura = await pedirPropuestas(clave!, perfil, await contenido())
      setResultado({ adjunto, lectura, estados: lectura.propuestas.map(() => ({ que: 'pendiente' })) })
    } catch (e) {
      setError(e instanceof ErrorIa ? e.message : 'Algo ha fallado. Vuelve a probar dentro de un rato.')
    } finally {
      setTrabajando(undefined)
    }
  }

  if (resultado) {
    return (
      <Propuestas
        perfil={perfil}
        resultado={resultado}
        onCambio={(cambio) => setResultado((r) => (r ? cambio(r) : r))}
        onTerminar={async () => {
          if (resultado.adjunto) await marcarAdjunto(resultado.adjunto.id, 'hecho', resultado.lectura.resumen)
          setResultado(undefined)
        }}
      />
    )
  }

  return (
    <>
      <Cuentaselo
        trabajando={trabajando === 'texto'}
        ocupado={!!trabajando}
        onAnalizar={(mensaje) => conPermiso(() => analizar('texto', async () => bloquesDeTexto(mensaje)))}
      />

      {error && (
        <p className="aviso aviso-error" role="alert">
          {error}
        </p>
      )}

      <h2 style={{ marginBottom: 0 }}>Archivos sin leer</h2>
      {pendientes === undefined ? null : pendientes.length === 0 ? (
        <p className="aviso aviso-ok">
          ✓ No tienes archivos pendientes. Cuando añadas una foto o un documento en cualquier sección, saldrá aquí.
        </p>
      ) : (
        pendientes.map((a) => {
          const puede = sePuedeAnalizar(a)
          return (
            <article key={a.id} className="tarjeta pila" style={{ gap: 8 }}>
              <MiniaturaAdjunto tipo={a.tipo} nombre={a.nombre} archivo={a.archivo} />
              {puede.si ? (
                <button
                  className="boton"
                  disabled={!!trabajando}
                  onClick={() => conPermiso(() => analizar(a.id, () => bloquesDeAdjunto(a), a))}
                >
                  {trabajando === a.id ? 'Leyendo… (puede tardar un poco)' : '🤖 Analizar'}
                </button>
              ) : (
                <span className="texto-suave">{puede.motivo}</span>
              )}
              <button className="enlace" disabled={!!trabajando} onClick={() => marcarAdjunto(a.id, 'no')}>
                No hace falta analizarlo
              </button>
            </article>
          )
        })
      )}

      {preguntar && (
        <Confirmar
          titulo="Antes de analizar"
          textoSi="Entendido, analizar"
          onSi={() => {
            aceptarIa(true)
            const hacer = preguntar
            setPreguntar(undefined)
            hacer()
          }}
          onNo={() => setPreguntar(undefined)}
        >
          <QueSeEnvia />
        </Confirmar>
      )}
    </>
  )
}

function Cuentaselo(props: { trabajando: boolean; ocupado: boolean; onAnalizar: (mensaje: string) => void }) {
  const [mensaje, setMensaje] = useState('')
  const [escuchando, setEscuchando] = useState(false)
  const [aviso, setAviso] = useState('')
  const parar = useRef<(() => void) | null>(null)

  function dictar() {
    if (escuchando) {
      parar.current?.()
      return
    }
    setAviso('')
    parar.current = empezarDictado(
      (frase) => setMensaje((m) => (m ? `${m} ${frase}` : frase)),
      (error) => {
        setEscuchando(false)
        if (error) setAviso(error)
      },
    )
    if (parar.current) setEscuchando(true)
    else setAviso('Este móvil no sabe dictar. Escríbelo, por favor.')
  }

  return (
    <section className="tarjeta pila" aria-label="Cuéntaselo a la app">
      <h2>💬 Cuéntaselo a la app</h2>
      <p className="texto-suave" style={{ margin: 0 }}>
        Por ejemplo: «Hoy la médica me ha quitado el omeprazol y me ha puesto pantoprazol de 40 en el desayuno».
      </p>
      <label className="campo">
        <span>Qué ha pasado</span>
        <textarea rows={4} value={mensaje} onChange={(e) => setMensaje(e.target.value)} />
      </label>
      {hayDictado() && (
        <button type="button" className="boton boton-secundario" onClick={dictar} disabled={props.ocupado}>
          {escuchando ? '⏹️ Parar de escuchar' : '🎤 Dictar'}
        </button>
      )}
      {aviso && (
        <p className="aviso" style={{ margin: 0 }}>
          {aviso}
        </p>
      )}
      <button className="boton" disabled={!mensaje.trim() || props.ocupado} onClick={() => props.onAnalizar(mensaje)}>
        {props.trabajando ? 'Pensando…' : '🤖 Analizar'}
      </button>
    </section>
  )
}

function Propuestas(props: {
  perfil: Perfil
  resultado: Resultado
  onCambio: (cambio: (r: Resultado) => Resultado) => void
  onTerminar: () => void
}) {
  const { lectura, estados, adjunto } = props.resultado
  // Siempre sobre el estado más reciente: así dos «Apuntar» seguidos no se pisan.
  const cambiar = (i: number, e: EstadoPropuesta) => props.onCambio((r) => ({ ...r, estados: r.estados.map((x, j) => (j === i ? e : x)) }))
  const quedan = estados.filter((e) => e.que === 'pendiente' || e.que === 'error').length

  async function apuntar(i: number, p: Propuesta) {
    try {
      cambiar(i, { que: 'guardada', seccion: await guardarPropuesta(props.perfil, p) })
    } catch (e) {
      cambiar(i, { que: 'error', texto: e instanceof Error ? e.message : 'No se ha podido apuntar.' })
    }
  }

  return (
    <div className="pila">
      {adjunto && <MiniaturaAdjunto tipo={adjunto.tipo} nombre={adjunto.nombre} archivo={adjunto.archivo} />}
      {lectura.resumen && (
        <section className="tarjeta" aria-label="Lo que ha entendido la IA">
          <strong>Lo que ha entendido:</strong> {lectura.resumen}
        </section>
      )}
      {lectura.propuestas.length === 0 ? (
        <p className="aviso">La IA no ha encontrado nada que apuntar.</p>
      ) : (
        <p style={{ margin: 0 }}>
          Te propone {lectura.propuestas.length === 1 ? 'esto' : `estas ${lectura.propuestas.length} cosas`}. Revisa cada una y dime si la
          apunto. <strong>Mira bien los números</strong>: la IA a veces se equivoca.
        </p>
      )}
      {lectura.descartadas > 0 && (
        <p className="texto-suave" style={{ margin: 0 }}>
          ({lectura.descartadas === 1 ? 'Había 1 propuesta incompleta' : `Había ${lectura.descartadas} propuestas incompletas`} y no te la
          enseño.)
        </p>
      )}

      {lectura.propuestas.map((p, i) => {
        const v = verPropuesta(p)
        const e = estados[i]
        return (
          <article key={i} className="tarjeta pila" style={{ gap: 6, opacity: e.que === 'descartada' ? 0.6 : 1 }}>
            <strong style={{ fontSize: '1.15rem' }}>
              {v.icono} {v.titulo}
            </strong>
            {v.detalles.length > 0 && (
              <ul className="dientes-elegidos">
                {v.detalles.map((d, j) => (
                  <li key={j}>{d}</li>
                ))}
              </ul>
            )}
            {p.explicacion && <span className="texto-suave">{p.explicacion}</span>}
            {e.que === 'guardada' && (
              <p className="aviso aviso-ok" role="status" style={{ margin: 0 }}>
                ✓ Apuntado en {e.seccion}.
              </p>
            )}
            {e.que === 'descartada' && <span className="texto-suave">No se apunta.</span>}
            {e.que === 'error' && (
              <p className="aviso aviso-error" role="alert" style={{ margin: 0 }}>
                {e.texto} Puedes apuntarlo a mano en su sección.
              </p>
            )}
            {(e.que === 'pendiente' || e.que === 'error') && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button className="boton" onClick={() => apuntar(i, p)}>
                  ✓ Apuntar
                </button>
                <button className="boton boton-secundario" onClick={() => cambiar(i, { que: 'descartada' })}>
                  ✗ No
                </button>
              </div>
            )}
          </article>
        )
      })}

      <button className={quedan === 0 ? 'boton' : 'boton boton-secundario'} onClick={props.onTerminar}>
        {quedan === 0 ? 'Terminar' : 'Terminar (lo que queda no se apunta)'}
      </button>
    </div>
  )
}
