import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type FormEvent } from 'react'
import { EditorAdjuntos, VerAdjuntos } from '../componentes/Adjuntos'
import { Confirmar } from '../componentes/Confirmar'
import { Selector } from '../componentes/Selector'
import { guardarAdjuntos, type AdjuntoNuevo } from '../db/adjuntos'
import { borrarCita, ESPECIALIDADES, especialidadesPasadas, guardarCita, listarPasadas, listarProximas, revisarCita } from '../db/citas'
import { listarContactos } from '../db/telefonos'
import { EtiquetaRegla } from '../componentes/EtiquetaRegla'
import { useCiclosVisibles } from '../componentes/useCiclosVisibles'
import type { Ciclo, Cita } from '../db/tipos'
import { anadirAlCalendario, eventoDeCita, nombreArchivoIcs } from '../utils/calendario'
import { cuandoFalta, fechaConDia, hoyISO } from '../utils/fechas'
import { normalizar } from '../utils/texto'

/** Citas médicas: las próximas y las que ya pasaron, con filtros y buscador. */
export function Citas({ perfilId }: { perfilId: string }) {
  const [pestana, setPestana] = useState<'proximas' | 'pasadas'>('proximas')
  const [especialidad, setEspecialidad] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [editando, setEditando] = useState<Cita | null>()

  const proximas = useLiveQuery(() => listarProximas(perfilId), [perfilId])
  const ciclos = useCiclosVisibles(perfilId)
  const pasadas = useLiveQuery(() => listarPasadas(perfilId, { especialidad, busqueda }), [perfilId, especialidad, busqueda])
  const especialidades = useLiveQuery(() => especialidadesPasadas(perfilId), [perfilId])

  if (editando !== undefined) {
    return <FormularioCita perfilId={perfilId} cita={editando ?? undefined} onTerminar={() => setEditando(undefined)} />
  }
  if (!proximas || !pasadas || !especialidades) return null

  return (
    <div className="pila">
      <div className="pestanas" role="tablist">
        <button role="tab" aria-selected={pestana === 'proximas'} onClick={() => setPestana('proximas')}>
          Próximas ({proximas.length})
        </button>
        <button role="tab" aria-selected={pestana === 'pasadas'} onClick={() => setPestana('pasadas')}>
          Pasadas
        </button>
      </div>

      {pestana === 'proximas' && (
        <>
          {proximas.length === 0 && <p className="aviso">No tienes ninguna cita apuntada. Pulsa «Añadir cita» para apuntar la próxima.</p>}
          {proximas.map((c) => (
            <TarjetaCita key={c.id} cita={c} proxima onCambiar={() => setEditando(c)} />
          ))}
        </>
      )}

      {pestana === 'pasadas' && (
        <>
          <label className="campo">
            <span>Buscar</span>
            <input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Por ejemplo: espalda, rodilla, análisis…" />
          </label>
          {especialidades.length > 1 && (
            <div className="sugerencias" style={{ marginTop: 0 }}>
              <button type="button" className="opcion" aria-pressed={especialidad === ''} onClick={() => setEspecialidad('')}>
                Todas
              </button>
              {especialidades.map((e) => (
                <button key={e} type="button" className="opcion" aria-pressed={especialidad === e} onClick={() => setEspecialidad(e)}>
                  {e}
                </button>
              ))}
            </div>
          )}
          <p className="texto-suave" style={{ margin: 0 }} aria-live="polite">
            {pasadas.length === 1 ? '1 cita' : `${pasadas.length} citas`}
            {(busqueda || especialidad) && ' encontradas'}
          </p>
          {pasadas.map((c) => (
            <TarjetaCita key={c.id} cita={c} ciclos={ciclos} onCambiar={() => setEditando(c)} />
          ))}
        </>
      )}

      <button className="boton" onClick={() => setEditando(null)}>
        ➕ Añadir cita
      </button>
    </div>
  )
}

function TarjetaCita({
  cita: c,
  proxima = false,
  ciclos = [],
  onCambiar,
}: {
  cita: Cita
  proxima?: boolean
  ciclos?: Ciclo[]
  onCambiar: () => void
}) {
  const falta = cuandoFalta(c.fecha)
  return (
    <article className={proxima && (falta === 'Hoy' || falta === 'Mañana') ? 'tarjeta pila tarjeta-pronto' : 'tarjeta pila'} style={{ gap: 6 }}>
      {proxima && <span className="etiqueta" style={{ alignSelf: 'flex-start', fontSize: '1rem' }}>{falta}</span>}
      {!proxima && <EtiquetaRegla fecha={c.fecha} ciclos={ciclos} />}
      <strong style={{ fontSize: '1.3rem' }}>{c.especialidad}</strong>
      <span>
        {capitalizar(fechaConDia(c.fecha))}
        {c.hora && ` a las ${c.hora}`}
      </span>
      {c.medico && <span>👩‍⚕️ {c.medico}</span>}
      {c.lugar && <span>📍 {c.lugar}</span>}
      {c.motivo && (
        <span>
          <span className="texto-suave">Motivo: </span>
          {c.motivo}
        </span>
      )}
      {c.resultado && (
        <span>
          <span className="texto-suave">Qué te dijeron: </span>
          {c.resultado}
        </span>
      )}
      <VerAdjuntos registroId={c.id} />
      {proxima && (
        <button className="boton boton-secundario" onClick={() => anadirAlCalendario(eventoDeCita(c), nombreArchivoIcs(c))}>
          📅 Añadir al calendario del móvil
        </button>
      )}
      {!proxima && !c.resultado && (
        <button className="enlace" onClick={onCambiar}>
          ¿Qué te dijeron? Apúntalo
        </button>
      )}
      <button className="enlace" onClick={onCambiar}>
        Cambiar o borrar
      </button>
    </article>
  )
}

function FormularioCita(props: { perfilId: string; cita?: Cita; onTerminar: () => void }) {
  const c = props.cita
  const [fecha, setFecha] = useState(c?.fecha ?? '')
  const [hora, setHora] = useState(c?.hora ?? '')
  const [especialidad, setEspecialidad] = useState(c?.especialidad ?? '')
  const [medico, setMedico] = useState(c?.medico ?? '')
  const [lugar, setLugar] = useState(c?.lugar ?? '')
  const [motivo, setMotivo] = useState(c?.motivo ?? '')
  const [resultado, setResultado] = useState(c?.resultado ?? '')
  const [estado, setEstado] = useState<'normal' | 'anulada'>(c?.anulada ? 'anulada' : 'normal')
  const [pendientes, setPendientes] = useState<AdjuntoNuevo[]>([])
  const [error, setError] = useState('')
  const [preguntarBorrar, setPreguntarBorrar] = useState(false)
  const contactos = useLiveQuery(() => listarContactos(props.perfilId), [props.perfilId])

  const yaPaso = fecha !== '' && fecha < hoyISO()
  const sugerenciasEsp = sugerirEspecialidades(especialidad)
  const sugerenciasLugar = (contactos ?? [])
    .map((x) => x.nombre)
    .filter((n) => n !== lugar && (!lugar || normalizar(n).includes(normalizar(lugar))))
    .slice(0, 4)

  async function guardar(e: FormEvent) {
    e.preventDefault()
    const datos = { fecha, hora, especialidad, medico, lugar, motivo, resultado, anulada: estado === 'anulada' }
    const problema = revisarCita(datos)
    if (problema) {
      setError(problema)
      return
    }
    const id = await guardarCita(props.perfilId, datos, c?.id)
    await guardarAdjuntos(props.perfilId, id, pendientes)
    props.onTerminar()
  }

  return (
    <form className="pila" onSubmit={guardar} noValidate>
      <h2>{c ? 'Cambiar cita' : 'Nueva cita'}</h2>

      <label className="campo">
        <span>Especialidad</span>
        <input type="text" value={especialidad} onChange={(e) => setEspecialidad(e.target.value)} placeholder="Cardiología, dentista…" />
      </label>
      {sugerenciasEsp.length > 0 && (
        <div className="sugerencias">
          {sugerenciasEsp.map((s) => (
            <button key={s} type="button" className="opcion" onClick={() => setEspecialidad(s)}>
              {s}
            </button>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 12 }}>
        <label className="campo">
          <span>Fecha</span>
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </label>
        <label className="campo">
          <span>Hora</span>
          <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
        </label>
      </div>

      <label className="campo">
        <span>Médico (si lo sabes)</span>
        <input type="text" value={medico} onChange={(e) => setMedico(e.target.value)} placeholder="Dra. Álvarez" />
      </label>

      <label className="campo">
        <span>Dónde</span>
        <input type="text" value={lugar} onChange={(e) => setLugar(e.target.value)} placeholder="Centro de salud, hospital, consulta 12…" />
      </label>
      {sugerenciasLugar.length > 0 && (
        <div className="sugerencias">
          {sugerenciasLugar.map((s) => (
            <button key={s} type="button" className="opcion" onClick={() => setLugar(s)}>
              📍 {s}
            </button>
          ))}
        </div>
      )}

      <label className="campo">
        <span>Motivo (si quieres)</span>
        <input type="text" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Revisión, dolor de espalda…" />
      </label>

      {yaPaso && (
        <label className="campo">
          <span>¿Qué te dijeron?</span>
          <textarea rows={4} value={resultado} onChange={(e) => setResultado(e.target.value)} placeholder="Todo bien, volver en 6 meses…" />
        </label>
      )}

      {c && !yaPaso && (
        <Selector
          etiqueta="¿Sigue en pie?"
          opciones={[
            { valor: 'normal', texto: 'Sí' },
            { valor: 'anulada', texto: 'Se ha anulado' },
          ]}
          valor={estado}
          onCambio={setEstado}
        />
      )}

      <EditorAdjuntos registroId={c?.id} pendientes={pendientes} onPendientes={setPendientes} />

      {error && <p className="aviso aviso-error">{error}</p>}

      <button type="submit" className="boton">
        Guardar
      </button>
      <button type="button" className="boton boton-secundario" onClick={props.onTerminar}>
        Cancelar
      </button>
      {c && (
        <button type="button" className="boton boton-peligro-suave" onClick={() => setPreguntarBorrar(true)}>
          Borrar esta cita
        </button>
      )}
      {preguntarBorrar && c && (
        <Confirmar
          titulo="¿Borrar esta cita?"
          textoSi="Sí, borrar"
          peligroso
          onSi={async () => {
            await borrarCita(c.id)
            props.onTerminar()
          }}
          onNo={() => setPreguntarBorrar(false)}
        >
          <p>Se borrarán también sus fotos, documentos y notas de voz.</p>
        </Confirmar>
      )}
    </form>
  )
}

/** Sin escribir nada, las más habituales; al escribir, las que encajan. */
function sugerirEspecialidades(texto: string): string[] {
  const t = normalizar(texto)
  if (!t) return ESPECIALIDADES.slice(0, 6)
  return ESPECIALIDADES.filter((e) => normalizar(e).includes(t) && normalizar(e) !== t).slice(0, 6)
}

function capitalizar(t: string): string {
  return t.charAt(0).toUpperCase() + t.slice(1)
}

