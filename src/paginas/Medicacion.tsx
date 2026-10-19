import { pideNuevo, tomarArchivo } from '../componentes/archivoEntrante'
import { esHora, HORA_DE_MOMENTO, horasDe } from '../utils/tomas'
import { TomaDeAhora } from '../componentes/TomaDeAhora'
import { FotoMedicina, LADO_FOTO_MEDICINA } from '../componentes/FotoMedicina'
import { reducirFoto } from '../utils/imagen'
import { urlDeArchivo } from '../utils/urlDeArchivo'
import { EditorAdjuntos, VerAdjuntos } from '../componentes/Adjuntos'
import { guardarAdjuntos, type AdjuntoNuevo } from '../db/adjuntos'
import { useLiveQuery } from 'dexie-react-hooks'
import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Confirmar } from '../componentes/Confirmar'
import { Selector } from '../componentes/Selector'
import { listarAlergias } from '../db/alergias'
import {
  borrarMedicamento,
  dejarDeTomar,
  guardarMedicamento,
  listarMedicamentos,
  MOMENTOS,
  revisarMedicamento,
} from '../db/medicamentos'
import type { Alergia, Medicamento, MotivoFinMedicamento, ValoracionMedicamento } from '../db/tipos'
import {
  agruparPorTipo,
  buscarEnHistorial,
  duracionToma,
  infoValoracion,
  mismoTipo,
  MOTIVOS_FIN,
  textoMotivoFin,
  VALORACIONES,
  vecesTomado,
} from '../utils/historialMedicacion'
import { fechaLarga, hoyISO } from '../utils/fechas'
import { buscarMedicamento, comprobarAlergias, sugerirMedicamentos, tipoDeMedicamento, type AvisoAlergia } from '../utils/medicamentos'

/** Medicación: lo que se toma ahora y lo que se tomó antes, con avisos de alergia. */
export function Medicacion({ perfilId }: { perfilId: string }) {
  const actuales = useLiveQuery(() => listarMedicamentos(perfilId, true), [perfilId])
  const anteriores = useLiveQuery(() => listarMedicamentos(perfilId, false), [perfilId])
  const alergias = useLiveQuery(() => listarAlergias(perfilId), [perfilId])
  const [pestana, setPestana] = useState<'ahora' | 'antes'>('ahora')
  const [editando, setEditando] = useState<Medicamento | null | undefined>(() => (pideNuevo() ? null : undefined))
  const [dejando, setDejando] = useState<Medicamento>()
  const [busqueda, setBusqueda] = useState('')
  const [verPor, setVerPor] = useState<'fecha' | 'tipo'>('fecha')

  if (!actuales || !anteriores || !alergias) return null

  if (editando !== undefined) {
    return (
      <FormularioMedicamento
        perfilId={perfilId}
        medicamento={editando ?? undefined}
        alergias={alergias}
        historial={anteriores}
        onTerminar={() => setEditando(undefined)}
      />
    )
  }

  const todos = [...actuales, ...anteriores]
  const tarjeta = (m: Medicamento) => (
    <TarjetaMedicamento
      key={m.id}
      medicamento={m}
      veces={vecesTomado(m.nombre, todos).length}
      avisos={comprobarAlergias(m.nombre, alergias)}
      onCambiar={() => setEditando(m)}
      onDejar={() => setDejando(m)}
    />
  )

  // Medicamentos que se toman ahora y chocan con alguna alergia.
  const conflictos = actuales.map((m) => ({ m, avisos: comprobarAlergias(m.nombre, alergias) })).filter((c) => c.avisos.length > 0)

  return (
    <div className="pila">
      {conflictos.length > 0 && (
        <div className="aviso aviso-error" role="alert">
          <strong>⚠️ Revisa con tu médico:</strong>
          <ul style={{ margin: '6px 0 0', paddingLeft: 22 }}>
            {conflictos.map(({ m, avisos }) => (
              <li key={m.id}>
                <strong>{m.nombre}</strong>: {avisos[0].motivo}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="pestanas" role="tablist">
        <button role="tab" aria-selected={pestana === 'ahora'} onClick={() => setPestana('ahora')}>
          Lo que tomo ahora ({actuales.length})
        </button>
        <button role="tab" aria-selected={pestana === 'antes'} onClick={() => setPestana('antes')}>
          Lo que tomé antes ({anteriores.length})
        </button>
      </div>

      {pestana === 'ahora' && actuales.length === 0 && (
        <p className="aviso">No has apuntado ningún medicamento. Pulsa «Añadir medicamento» para empezar.</p>
      )}
      {pestana === 'antes' && anteriores.length === 0 && (
        <p className="aviso">Aquí aparecerán los medicamentos que dejes de tomar, con sus fechas.</p>
      )}

      {pestana === 'antes' && anteriores.length > 0 && (
        <HistorialAnterior
          anteriores={anteriores}
          busqueda={busqueda}
          onBusqueda={setBusqueda}
          verPor={verPor}
          onVerPor={setVerPor}
          tarjeta={tarjeta}
        />
      )}
      {pestana === 'ahora' && actuales.map(tarjeta)}

      <button className="boton" onClick={() => setEditando(null)}>
        ➕ Añadir medicamento
      </button>

      <p className="texto-suave" style={{ fontSize: '0.85rem' }}>
        El tipo y el uso de cada medicamento son orientativos. Ante cualquier duda, pregunta a tu médico o en la farmacia.
      </p>

      {dejando && <DialogoDejar medicamento={dejando} onTerminar={() => setDejando(undefined)} />}
    </div>
  )
}

function TarjetaMedicamento(props: {
  medicamento: Medicamento
  /** Cuántas veces está apuntado (contando esta). */
  veces: number
  avisos: AvisoAlergia[]
  onCambiar: () => void
  onDejar: () => void
}) {
  const m = props.medicamento
  const duracion = duracionToma(m)
  const valoracion = infoValoracion(m.valoracion)
  return (
    <article className={props.avisos.length > 0 ? 'tarjeta pila tarjeta-alerta' : 'tarjeta pila'} style={{ gap: 8 }}>
      {/* A la izquierda, la foto de la pastilla o de la caja, para reconocerla. */}
      <div className="medicina-cabecera">
        <FotoMedicina medicamento={m} />
        <div className="pila" style={{ gap: 4 }}>
          <strong style={{ fontSize: '1.3rem' }}>{m.nombre}</strong>
          {m.dosis && <span>{m.dosis}</span>}
        </div>
      </div>
      {(horasDe(m).length > 0 || m.otroHorario) && (
        <div className="etiquetas">
          {horasDe(m).map((h) => (
            <span key={h} className="etiqueta etiqueta-momento">
              🕒 {h}
            </span>
          ))}
          {m.otroHorario && <span className="etiqueta etiqueta-momento">📝 {m.otroHorario}</span>}
        </div>
      )}
      {m.paraQue && (
        <span>
          <span className="texto-suave">Para: </span>
          {m.paraQue}
        </span>
      )}
      {tipoDeMedicamento(m) && (
        <span>
          <span className="texto-suave">Tipo de medicamento: </span>
          {tipoDeMedicamento(m)}
        </span>
      )}
      <span className="texto-suave">
        {m.activo
          ? m.fechaInicio && `Desde el ${fechaLarga(m.fechaInicio)}`
          : [m.fechaInicio && `Del ${fechaLarga(m.fechaInicio)}`, m.fechaFin && `hasta el ${fechaLarga(m.fechaFin)}`]
              .filter(Boolean)
              .join(' ')}
      </span>
      {duracion && <span>⏱️ {duracion.texto}</span>}
      {valoracion && (
        <span>
          {valoracion.icono} <strong>{valoracion.texto}</strong>
          {m.motivoFin && <span className="texto-suave"> · {textoMotivoFin(m.motivoFin)}</span>}
        </span>
      )}
      {!valoracion && m.motivoFin && <span className="texto-suave">{textoMotivoFin(m.motivoFin)}</span>}
      {m.efectos && (
        <span>
          <span className="texto-suave">Lo que noté: </span>
          {m.efectos}
        </span>
      )}
      {m.notas && (
        <span className="texto-suave" style={{ whiteSpace: 'pre-line' }}>
          📝 {m.notas}
        </span>
      )}
      {props.veces > 1 && <span className="texto-suave">📚 Lo has tomado {props.veces} veces.</span>}
      {m.activo === 1 && <TomaDeAhora medicamento={m} />}
      {props.avisos.map((a) => (
        <p key={a.alergia.id} className={a.nivel === 'alto' ? 'aviso aviso-error' : 'aviso'} style={{ margin: 0 }}>
          ⚠️ {a.motivo}
        </p>
      ))}
      <VerAdjuntos registroId={m.id} />
      {/* Los pasados se quedan como historial: si se vuelve a tomar, se apunta como nuevo (y la app avisa de que ya lo tomó). */}
      {m.activo === 1 && (
        <button className="boton boton-secundario" onClick={props.onDejar}>
          Ya no lo tomo
        </button>
      )}
      <button className="enlace" onClick={props.onCambiar}>
        Cambiar o borrar
      </button>
    </article>
  )
}

function FormularioMedicamento(props: {
  perfilId: string
  medicamento?: Medicamento
  alergias: Alergia[]
  historial: Medicamento[]
  onTerminar: () => void
}) {
  const m = props.medicamento
  const [nombre, setNombre] = useState(m?.nombre ?? '')
  const [dosis, setDosis] = useState(m?.dosis ?? '')
  // Las horas de cada toma. Un medicamento antiguo con «desayuno», «cena»… empieza con sus horas habituales.
  const [horas, setHoras] = useState<string[]>(() => (m ? horasDe(m) : []))
  const [otroHorario, setOtroHorario] = useState(m?.otroHorario ?? '')
  const [paraQue, setParaQue] = useState(m?.paraQue ?? '')
  const [familia, setFamilia] = useState(m?.familia ?? '')
  const [fechaInicio, setFechaInicio] = useState(m?.fechaInicio ?? (m ? '' : hoyISO()))
  const [loTomaAhora, setLoTomaAhora] = useState<'si' | 'no'>(m && !m.activo ? 'no' : 'si')
  const [fechaFin, setFechaFin] = useState(m?.fechaFin ?? '')
  const [notas, setNotas] = useState(m?.notas ?? '')
  const [foto, setFoto] = useState<Blob | undefined>(m?.foto)
  const [valoracion, setValoracion] = useState<ValoracionMedicamento | ''>(m?.valoracion ?? '')
  const [efectos, setEfectos] = useState(m?.efectos ?? '')
  const [motivoFin, setMotivoFin] = useState<MotivoFinMedicamento | ''>(m?.motivoFin ?? '')
  const [error, setError] = useState('')
  const [pendientes, setPendientes] = useState<AdjuntoNuevo[]>(tomarArchivo)
  const [confirmarAlergia, setConfirmarAlergia] = useState(false)
  const [preguntarBorrar, setPreguntarBorrar] = useState(false)

  const reconocido = nombre.trim() ? buscarMedicamento(nombre) : undefined
  const sugerencias = sugerirMedicamentos(nombre, 4).filter((s) => s.toLowerCase() !== nombre.trim().toLowerCase())
  const avisos = comprobarAlergias(nombre, props.alergias)
  const hayAvisoFuerte = avisos.some((a) => a.nivel === 'alto')

  function datos() {
    return {
      nombre,
      dosis,
      // Ya van con hora: los momentos antiguos se quitan.
      momentos: [],
      horas,
      otroHorario,
      paraQue,
      familia,
      fechaInicio,
      fechaFin: loTomaAhora === 'no' ? fechaFin || hoyISO() : undefined,
      activo: loTomaAhora === 'si' ? (1 as const) : (0 as const),
      notas,
      valoracion: valoracion || undefined,
      efectos,
      motivoFin: motivoFin || undefined,
      foto,
    }
  }

  async function guardar(e?: FormEvent, aunqueHayaAlergia = false) {
    e?.preventDefault()
    const problema = revisarMedicamento(datos())
    if (problema) {
      setError(problema)
      return
    }
    if (hayAvisoFuerte && loTomaAhora === 'si' && !aunqueHayaAlergia) {
      setConfirmarAlergia(true)
      return
    }
    const id = await guardarMedicamento(props.perfilId, datos(), m?.id)
    await guardarAdjuntos(props.perfilId, id, pendientes)
    props.onTerminar()
  }

  return (
    <form className="pila" onSubmit={(e) => guardar(e)} noValidate>
      <h2>{m ? 'Cambiar medicamento' : 'Nuevo medicamento'}</h2>

      <label className="campo">
        <span>Nombre del medicamento</span>
        <small>Como aparece en la caja. Por ejemplo: «Omeprazol 20 mg» o «Sintrom».</small>
        <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} />
      </label>
      {sugerencias.length > 0 && (
        <div className="sugerencias">
          {sugerencias.map((s) => (
            <button key={s} type="button" className="opcion" onClick={() => setNombre(s)}>
              {s}
            </button>
          ))}
        </div>
      )}

      {avisos.map((a) => (
        <p key={a.alergia.id} role="alert" className={a.nivel === 'alto' ? 'aviso aviso-error' : 'aviso'} style={{ margin: 0 }}>
          ⚠️ <strong>{a.nivel === 'alto' ? '¡Cuidado!' : 'Precaución.'}</strong> {a.motivo} Consulta con tu médico antes de tomarlo.
        </p>
      ))}

      {!m && <YaLoTomaste nombre={nombre} historial={props.historial} />}

      {reconocido && (
        <div className="aviso aviso-ok" style={{ margin: 0 }}>
          <div>
            <strong>Tipo de medicamento:</strong> {reconocido.familia}
          </div>
          <div>
            <strong>Se suele usar para:</strong> {reconocido.paraQue}
          </div>
          {!paraQue && (
            <button type="button" className="enlace" onClick={() => setParaQue(reconocido.paraQue)}>
              Apuntar «{reconocido.paraQue}» como para qué lo tomo
            </button>
          )}
        </div>
      )}

      <ElegirFoto foto={foto} onCambio={setFoto} />

      <label className="campo">
        <span>¿Cuánto tomas?</span>
        <input type="text" value={dosis} onChange={(e) => setDosis(e.target.value)} placeholder="1 comprimido, media pastilla…" />
      </label>

      <EditorHoras horas={horas} onCambio={setHoras} />

      <label className="campo">
        <span>Otro horario (si quieres)</span>
        <input type="text" value={otroHorario} onChange={(e) => setOtroHorario(e.target.value)} placeholder="Cada 8 horas, los lunes…" />
      </label>

      <label className="campo">
        <span>¿Para qué lo tomas?</span>
        <input type="text" value={paraQue} onChange={(e) => setParaQue(e.target.value)} placeholder="La tensión, el dolor de rodilla…" />
      </label>

      {m && (
        <label className="campo">
          <span>Tipo de medicamento (si lo sabes)</span>
          <input
            type="text"
            value={familia}
            onChange={(e) => setFamilia(e.target.value)}
            placeholder="Antibiótico, analgésico, estatina…"
          />
        </label>
      )}

      <label className="campo">
        <span>¿Desde cuándo?</span>
        <input type="date" value={fechaInicio} max={hoyISO()} onChange={(e) => setFechaInicio(e.target.value)} />
      </label>

      <Selector
        etiqueta="¿Lo sigues tomando?"
        opciones={[
          { valor: 'si', texto: 'Sí, lo tomo ahora' },
          { valor: 'no', texto: 'No, ya lo dejé' },
        ]}
        valor={loTomaAhora}
        onCambio={setLoTomaAhora}
      />
      {loTomaAhora === 'no' && (
        <label className="campo">
          <span>¿Cuándo lo dejaste?</span>
          <input type="date" value={fechaFin} max={hoyISO()} onChange={(e) => setFechaFin(e.target.value)} />
        </label>
      )}

      {loTomaAhora === 'no' && (
        <Selector
          etiqueta="¿Por qué lo dejaste? (si quieres)"
          opciones={MOTIVOS_FIN}
          valor={motivoFin}
          onCambio={(v) => setMotivoFin((x) => (x === v ? '' : v))}
        />
      )}

      <Selector
        etiqueta={loTomaAhora === 'no' ? '¿Qué tal te fue? (si quieres)' : '¿Qué tal te está yendo? (si quieres)'}
        ayuda="Así, si te lo vuelven a recetar, sabrás si te funcionó."
        opciones={VALORACIONES}
        valor={valoracion}
        onCambio={(v) => setValoracion((x) => (x === v ? '' : v))}
      />
      <label className="campo">
        <span>Efectos o lo que notaste (si quieres)</span>
        <input
          type="text"
          value={efectos}
          onChange={(e) => setEfectos(e.target.value)}
          placeholder="Me daba sueño, me quitó el dolor en dos días…"
        />
      </label>

      <label className="campo">
        <span>Notas (si quieres)</span>
        <textarea rows={3} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Me lo mandó la doctora de digestivo…" />
      </label>

      <EditorAdjuntos
        registroId={m?.id}
        pendientes={pendientes}
        onPendientes={setPendientes}
        ayuda="Por ejemplo, la receta, una foto de la caja o del prospecto."
      />

      {error && <p className="aviso aviso-error">{error}</p>}

      <button type="submit" className="boton">
        Guardar
      </button>
      <button type="button" className="boton boton-secundario" onClick={props.onTerminar}>
        Cancelar
      </button>
      {m && (
        <button type="button" className="boton boton-peligro-suave" onClick={() => setPreguntarBorrar(true)}>
          Borrar este medicamento
        </button>
      )}

      {confirmarAlergia && (
        <Confirmar
          titulo="¿Guardarlo aunque tengas alergia?"
          textoSi="Sí, me lo ha mandado el médico"
          peligroso
          onSi={() => {
            setConfirmarAlergia(false)
            guardar(undefined, true)
          }}
          onNo={() => setConfirmarAlergia(false)}
        >
          <p>{avisos[0]?.motivo}</p>
          <p>Guárdalo solo si tu médico sabe que tienes esa alergia y aun así te lo ha recetado.</p>
        </Confirmar>
      )}
      {preguntarBorrar && m && (
        <Confirmar
          titulo={`¿Borrar ${m.nombre}?`}
          textoSi="Sí, borrar"
          peligroso
          onSi={async () => {
            await borrarMedicamento(m.id)
            props.onTerminar()
          }}
          onNo={() => setPreguntarBorrar(false)}
        >
          <p>Se borrará del todo, también del historial. Si solo lo has dejado de tomar, es mejor pulsar «Ya no lo tomo».</p>
        </Confirmar>
      )}
    </form>
  )
}

/** Las horas de las tomas: atajos por comida y una hora exacta para cada toma. */
function EditorHoras({ horas, onCambio }: { horas: string[]; onCambio: (h: string[]) => void }) {
  const [nueva, setNueva] = useState('08:00')
  const anadir = (h: string) => onCambio([...new Set([...horas, h])].sort())
  return (
    <fieldset className="campo" style={{ border: 0, padding: 0, margin: 0 }}>
      <span>¿A qué hora lo tomas?</span>
      <small>Pon una hora por cada toma. Así la app te deja marcar cada una como «Tomada».</small>
      {horas.length > 0 && (
        <div className="etiquetas">
          {horas.map((h) => (
            <span key={h} className="hora-toma">
              🕒 {h}
              <button
                type="button"
                className="enlace"
                onClick={() => onCambio(horas.filter((x) => x !== h))}
                aria-label={`Quitar las ${h}`}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="sugerencias">
        {MOMENTOS.filter((x) => !horas.includes(HORA_DE_MOMENTO[x.valor])).map((x) => (
          <button key={x.valor} type="button" className="opcion" onClick={() => anadir(HORA_DE_MOMENTO[x.valor])}>
            {x.icono} {x.texto} ({HORA_DE_MOMENTO[x.valor]})
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <input type="time" value={nueva} onChange={(e) => setNueva(e.target.value)} aria-label="Otra hora" style={{ flex: 1 }} />
        <button type="button" className="boton boton-secundario" style={{ width: 'auto' }} onClick={() => esHora(nueva) && anadir(nueva)}>
          ➕ Añadir hora
        </button>
      </div>
    </fieldset>
  )
}

/** Los medicamentos agrupados por el año en que se dejaron (o se empezaron). */
function porAno(lista: Medicamento[]): [string, Medicamento[]][] {
  const grupos = new Map<string, Medicamento[]>()
  for (const m of lista) {
    const ano = (m.fechaFin ?? m.fechaInicio ?? '').slice(0, 4) || 'Sin fecha'
    grupos.set(ano, [...(grupos.get(ano) ?? []), m])
  }
  return [...grupos]
}

/** «Lo que tomé antes»: buscador y la lista por año (de cuándo lo dejó) o por tipo de medicamento. */
function HistorialAnterior(props: {
  anteriores: Medicamento[]
  busqueda: string
  onBusqueda: (t: string) => void
  verPor: 'fecha' | 'tipo'
  onVerPor: (v: 'fecha' | 'tipo') => void
  tarjeta: (m: Medicamento) => ReactNode
}) {
  const lista = buscarEnHistorial(props.anteriores, props.busqueda)
  const bien = props.anteriores.filter((m) => m.valoracion === 'bien').length
  const mal = props.anteriores.filter((m) => m.valoracion === 'mal').length
  const grupos = props.verPor === 'tipo' ? agruparPorTipo(lista) : porAno(lista)
  return (
    <>
      <p style={{ margin: 0 }}>
        Tu historial: <strong>{props.anteriores.length} medicamentos</strong>
        {bien > 0 && ` · 👍 ${bien} te fueron bien`}
        {mal > 0 && ` · 👎 ${mal} te fueron mal`}.
      </p>
      <label className="campo">
        <span>¿Ya lo has tomado alguna vez?</span>
        <small>Escribe el nombre, el tipo (antibiótico, antiinflamatorio…) o para qué era.</small>
        <input
          type="search"
          value={props.busqueda}
          onChange={(e) => props.onBusqueda(e.target.value)}
          placeholder="Amoxicilina, antibiótico, dolor…"
        />
      </label>
      <div className="sugerencias" style={{ marginTop: 0 }}>
        <button type="button" className="opcion" aria-pressed={props.verPor === 'fecha'} onClick={() => props.onVerPor('fecha')}>
          📅 Por año
        </button>
        <button type="button" className="opcion" aria-pressed={props.verPor === 'tipo'} onClick={() => props.onVerPor('tipo')}>
          💊 Por tipo de medicamento
        </button>
      </div>
      {lista.length === 0 && <p className="aviso">No lo has tomado, o no está apuntado. Prueba con otra palabra.</p>}
      {grupos.map(([titulo, meds]) => (
        <section key={titulo} className="pila">
          <h3 className="titulo-ano">
            {titulo}
            {props.verPor === 'tipo' && <span className="texto-suave"> ({meds.length})</span>}
          </h3>
          {meds.map(props.tarjeta)}
        </section>
      ))}
    </>
  )
}

/** Al apuntar uno nuevo: si ya lo tomó antes, o tomó otros del mismo tipo, y qué tal le fue. */
function YaLoTomaste({ nombre, historial }: { nombre: string; historial: Medicamento[] }) {
  if (nombre.trim().length < 4) return null
  const antes = vecesTomado(nombre, historial)
  const parecidos = mismoTipo(nombre, historial)
  if (antes.length === 0 && parecidos.length === 0) return null
  const linea = (m: Medicamento) => {
    const v = infoValoracion(m.valoracion)
    const cuando = (m.fechaFin ?? m.fechaInicio)?.slice(0, 4)
    return (
      <li key={m.id}>
        <strong>{m.nombre}</strong>
        {cuando && ` (${cuando})`}
        {v && `: ${v.icono} ${v.texto.toLowerCase()}`}
        {m.efectos && <span className="texto-suave"> · {m.efectos}</span>}
      </li>
    )
  }
  return (
    <div className="aviso aviso-cita pila" role="status" style={{ margin: 0, gap: 6 }}>
      {antes.length > 0 && (
        <>
          <strong>📚 Ya lo tomaste {antes.length === 1 ? 'una vez' : `${antes.length} veces`}:</strong>
          <ul style={{ margin: 0, paddingLeft: 22 }}>{antes.map(linea)}</ul>
        </>
      )}
      {parecidos.length > 0 && (
        <>
          <strong>💊 Del mismo tipo ya tomaste:</strong>
          <ul style={{ margin: 0, paddingLeft: 22 }}>{parecidos.slice(0, 8).map(linea)}</ul>
        </>
      )}
      <small>Coméntaselo a tu médico si alguno te fue mejor o peor.</small>
    </div>
  )
}

/** «Ya no lo tomo»: con la fecha de hoy y, si quiere, por qué y qué tal le fue. */
function DialogoDejar({ medicamento, onTerminar }: { medicamento: Medicamento; onTerminar: () => void }) {
  const [motivo, setMotivo] = useState<MotivoFinMedicamento | ''>('')
  const [valoracion, setValoracion] = useState<ValoracionMedicamento | ''>(medicamento.valoracion ?? '')
  return (
    <Confirmar
      titulo={`¿Ya no tomas ${medicamento.nombre}?`}
      textoSi="Sí, ya no lo tomo"
      onSi={async () => {
        await dejarDeTomar(medicamento.id, undefined, { motivoFin: motivo || undefined, valoracion: valoracion || undefined })
        onTerminar()
      }}
      onNo={onTerminar}
    >
      <div className="pila" style={{ gap: 10, textAlign: 'left' }}>
        <p style={{ margin: 0 }}>Pasará a «Lo que tomé antes», con la fecha de hoy, y quedará en tu historial.</p>
        <Selector etiqueta="¿Por qué? (si quieres)" opciones={MOTIVOS_FIN} valor={motivo} onCambio={(v) => setMotivo((x) => (x === v ? '' : v))} />
        <Selector
          etiqueta="¿Qué tal te fue? (si quieres)"
          opciones={VALORACIONES}
          valor={valoracion}
          onCambio={(v) => setValoracion((x) => (x === v ? '' : v))}
        />
      </div>
    </Confirmar>
  )
}

/** En el formulario: la foto de la pastilla o de la caja (hacerla, cambiarla o quitarla). */
function ElegirFoto({ foto, onCambio }: { foto?: Blob; onCambio: (f?: Blob) => void }) {
  const selector = useRef<HTMLInputElement>(null)
  const url = urlDeArchivo(foto)
  return (
    <fieldset className="campo" style={{ border: 0, padding: 0, margin: 0 }}>
      <span>Foto de la pastilla o de la caja</span>
      <small>Así la reconoces de un vistazo. Puedes hacerla con la cámara o elegirla de la galería.</small>
      <div className="medicina-cabecera">
        {url ? (
          <img src={url} alt="Foto de la medicina" className="foto-medicina-mini" width={84} height={84} />
        ) : (
          <span className="foto-medicina foto-medicina-vacia" aria-hidden="true">
            <span>💊</span>
          </span>
        )}
        <div className="pila" style={{ gap: 6, flex: 1 }}>
          <button type="button" className="boton boton-secundario" onClick={() => selector.current?.click()}>
            📷 {url ? 'Cambiar foto' : 'Añadir foto'}
          </button>
          {url && (
            <button type="button" className="enlace" onClick={() => onCambio(undefined)}>
              Quitar la foto
            </button>
          )}
        </div>
      </div>
      <input
        ref={selector}
        type="file"
        accept="image/*"
        hidden
        aria-label="Foto de la pastilla o de la caja"
        onChange={async (e) => {
          const archivo = e.target.files?.[0]
          e.target.value = ''
          if (archivo) onCambio(await reducirFoto(archivo, LADO_FOTO_MEDICINA, 0.85))
        }}
      />
    </fieldset>
  )
}
