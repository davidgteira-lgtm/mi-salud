import { EditorAdjuntos, VerAdjuntos } from '../componentes/Adjuntos'
import { guardarAdjuntos, type AdjuntoNuevo } from '../db/adjuntos'
import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type FormEvent } from 'react'
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
  volverATomar,
} from '../db/medicamentos'
import type { Alergia, Medicamento, Momento } from '../db/tipos'
import { fechaLarga, hoyISO } from '../utils/fechas'
import { buscarMedicamento, comprobarAlergias, sugerirMedicamentos, type AvisoAlergia } from '../utils/medicamentos'

/** Medicación: lo que se toma ahora y lo que se tomó antes, con avisos de alergia. */
export function Medicacion({ perfilId }: { perfilId: string }) {
  const actuales = useLiveQuery(() => listarMedicamentos(perfilId, true), [perfilId])
  const anteriores = useLiveQuery(() => listarMedicamentos(perfilId, false), [perfilId])
  const alergias = useLiveQuery(() => listarAlergias(perfilId), [perfilId])
  const [pestana, setPestana] = useState<'ahora' | 'antes'>('ahora')
  const [editando, setEditando] = useState<Medicamento | null>()
  const [dejando, setDejando] = useState<Medicamento>()

  if (!actuales || !anteriores || !alergias) return null

  if (editando !== undefined) {
    return (
      <FormularioMedicamento
        perfilId={perfilId}
        medicamento={editando ?? undefined}
        alergias={alergias}
        onTerminar={() => setEditando(undefined)}
      />
    )
  }

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

      {(pestana === 'ahora' ? actuales : anteriores).map((m) => (
        <TarjetaMedicamento
          key={m.id}
          medicamento={m}
          avisos={comprobarAlergias(m.nombre, alergias)}
          onCambiar={() => setEditando(m)}
          onDejar={() => setDejando(m)}
          onVolver={() => volverATomar(m.id).then(() => setPestana('ahora'))}
        />
      ))}

      <button className="boton" onClick={() => setEditando(null)}>
        ➕ Añadir medicamento
      </button>

      <p className="texto-suave" style={{ fontSize: '0.85rem' }}>
        La familia y el uso de cada medicamento son orientativos. Ante cualquier duda, pregunta a tu médico o en la farmacia.
      </p>

      {dejando && (
        <Confirmar
          titulo={`¿Ya no tomas ${dejando.nombre}?`}
          textoSi="Sí, ya no lo tomo"
          onSi={async () => {
            await dejarDeTomar(dejando.id)
            setDejando(undefined)
          }}
          onNo={() => setDejando(undefined)}
        >
          <p>Pasará a «Lo que tomé antes», con la fecha de hoy. Podrás volver a tomarlo cuando quieras.</p>
        </Confirmar>
      )}
    </div>
  )
}

function TarjetaMedicamento(props: {
  medicamento: Medicamento
  avisos: AvisoAlergia[]
  onCambiar: () => void
  onDejar: () => void
  onVolver: () => void
}) {
  const m = props.medicamento
  return (
    <article className={props.avisos.length > 0 ? 'tarjeta pila tarjeta-alerta' : 'tarjeta pila'} style={{ gap: 8 }}>
      <strong style={{ fontSize: '1.3rem' }}>{m.nombre}</strong>
      {m.dosis && <span>{m.dosis}</span>}
      {(m.momentos.length > 0 || m.otroHorario) && (
        <div className="etiquetas">
          {MOMENTOS.filter((x) => m.momentos.includes(x.valor)).map((x) => (
            <span key={x.valor} className="etiqueta etiqueta-momento">
              {x.icono} {x.texto}
            </span>
          ))}
          {m.otroHorario && <span className="etiqueta etiqueta-momento">🕒 {m.otroHorario}</span>}
        </div>
      )}
      {m.paraQue && (
        <span>
          <span className="texto-suave">Para: </span>
          {m.paraQue}
        </span>
      )}
      {m.familia && (
        <span>
          <span className="texto-suave">Familia: </span>
          {m.familia}
        </span>
      )}
      <span className="texto-suave">
        {m.activo
          ? m.fechaInicio && `Desde el ${fechaLarga(m.fechaInicio)}`
          : [m.fechaInicio && `Del ${fechaLarga(m.fechaInicio)}`, m.fechaFin && `hasta el ${fechaLarga(m.fechaFin)}`]
              .filter(Boolean)
              .join(' ')}
      </span>
      {props.avisos.map((a) => (
        <p key={a.alergia.id} className={a.nivel === 'alto' ? 'aviso aviso-error' : 'aviso'} style={{ margin: 0 }}>
          ⚠️ {a.motivo}
        </p>
      ))}
      <VerAdjuntos registroId={m.id} />
      {m.activo ? (
        <button className="boton boton-secundario" onClick={props.onDejar}>
          Ya no lo tomo
        </button>
      ) : (
        <button className="boton boton-secundario" onClick={props.onVolver}>
          Lo vuelvo a tomar
        </button>
      )}
      <button className="enlace" onClick={props.onCambiar}>
        Cambiar o borrar
      </button>
    </article>
  )
}

function FormularioMedicamento(props: { perfilId: string; medicamento?: Medicamento; alergias: Alergia[]; onTerminar: () => void }) {
  const m = props.medicamento
  const [nombre, setNombre] = useState(m?.nombre ?? '')
  const [dosis, setDosis] = useState(m?.dosis ?? '')
  const [momentos, setMomentos] = useState<Momento[]>(m?.momentos ?? [])
  const [otroHorario, setOtroHorario] = useState(m?.otroHorario ?? '')
  const [paraQue, setParaQue] = useState(m?.paraQue ?? '')
  const [familia, setFamilia] = useState(m?.familia ?? '')
  const [fechaInicio, setFechaInicio] = useState(m?.fechaInicio ?? (m ? '' : hoyISO()))
  const [loTomaAhora, setLoTomaAhora] = useState<'si' | 'no'>(m && !m.activo ? 'no' : 'si')
  const [fechaFin, setFechaFin] = useState(m?.fechaFin ?? '')
  const [notas, setNotas] = useState(m?.notas ?? '')
  const [error, setError] = useState('')
  const [pendientes, setPendientes] = useState<AdjuntoNuevo[]>([])
  const [confirmarAlergia, setConfirmarAlergia] = useState(false)
  const [preguntarBorrar, setPreguntarBorrar] = useState(false)

  const reconocido = nombre.trim() ? buscarMedicamento(nombre) : undefined
  const sugerencias = sugerirMedicamentos(nombre, 4).filter((s) => s.toLowerCase() !== nombre.trim().toLowerCase())
  const avisos = comprobarAlergias(nombre, props.alergias)
  const hayAvisoFuerte = avisos.some((a) => a.nivel === 'alto')

  function cambiarMomento(valor: Momento) {
    setMomentos((actual) => (actual.includes(valor) ? actual.filter((x) => x !== valor) : [...actual, valor]))
  }

  function datos() {
    return {
      nombre,
      dosis,
      momentos,
      otroHorario,
      paraQue,
      familia,
      fechaInicio,
      fechaFin: loTomaAhora === 'no' ? fechaFin || hoyISO() : undefined,
      activo: loTomaAhora === 'si' ? (1 as const) : (0 as const),
      notas,
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

      {reconocido && (
        <div className="aviso aviso-ok" style={{ margin: 0 }}>
          <div>
            <strong>Familia:</strong> {reconocido.familia}
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

      <label className="campo">
        <span>¿Cuánto tomas?</span>
        <input type="text" value={dosis} onChange={(e) => setDosis(e.target.value)} placeholder="1 comprimido, media pastilla…" />
      </label>

      <Selector etiqueta="¿Cuándo lo tomas?" ayuda="Puedes marcar varios." opciones={MOMENTOS} valor={momentos} onCambio={cambiarMomento} />

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
          <span>Familia</span>
          <input type="text" value={familia} onChange={(e) => setFamilia(e.target.value)} />
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
