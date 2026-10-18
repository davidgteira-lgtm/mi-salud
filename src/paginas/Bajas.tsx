// Bajas médicas: cada baja con sus partes de confirmación y su alta.
import { pideNuevo, tomarArchivo } from '../componentes/archivoEntrante'
import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type FormEvent } from 'react'
import { EditorAdjuntos, VerAdjuntos } from '../componentes/Adjuntos'
import { Confirmar } from '../componentes/Confirmar'
import { Selector } from '../componentes/Selector'
import { guardarAdjuntos, type AdjuntoNuevo } from '../db/adjuntos'
import { bajaEnCurso, borrarBaja, darAlta, diasDeBaja, diasEnElAno, guardarBaja, listarBajas, revisarBaja, TIPOS_ALTA, TIPOS_BAJA } from '../db/bajas'
import type { Baja, TipoAlta, TipoBaja } from '../db/tipos'
import { fechaLarga, hoyISO } from '../utils/fechas'

const dias = (n: number) => `${n} ${n === 1 ? 'día' : 'días'}`

export function Bajas({ perfilId }: { perfilId: string }) {
  const [editando, setEditando] = useState<Baja | null | undefined>(() => (pideNuevo() ? null : undefined))
  const [alta, setAlta] = useState<Baja>()
  const lista = useLiveQuery(() => listarBajas(perfilId), [perfilId])
  if (editando !== undefined) return <FormularioBaja perfilId={perfilId} baja={editando ?? undefined} onTerminar={() => setEditando(undefined)} />
  if (!lista) return null

  const hoy = hoyISO()
  const ano = Number(hoy.slice(0, 4))
  const enCurso = bajaEnCurso(lista)
  const esteAno = diasEnElAno(lista, ano)

  return (
    <div className="pila">
      {enCurso && (
        <section className="aviso pila" role="status" style={{ gap: 10 }}>
          <span>
            <strong>Estás de baja</strong> desde el {fechaLarga(enCurso.inicio)} ({enCurso.motivo}): llevas{' '}
            <strong>{dias(diasDeBaja(enCurso))}</strong>.
          </span>
          <button className="boton" onClick={() => setAlta(enCurso)}>
            ✓ Me han dado el alta
          </button>
        </section>
      )}

      {lista.length > 0 && (
        <p style={{ margin: 0 }}>
          En {ano}: <strong>{esteAno === 0 ? 'ningún día de baja' : `${dias(esteAno)} de baja`}</strong>.
        </p>
      )}

      <button className={enCurso ? 'boton boton-secundario' : 'boton'} onClick={() => setEditando(null)}>
        ➕ Apuntar una baja
      </button>

      {lista.length === 0 ? (
        <p className="aviso">Aún no has apuntado ninguna baja. Guarda aquí el parte de baja, los de confirmación y el de alta.</p>
      ) : (
        lista.map((b) => {
          const tipo = TIPOS_BAJA.find((t) => t.valor === b.tipo)
          const tipoAlta = TIPOS_ALTA.find((t) => t.valor === b.tipoAlta)
          return (
            <article key={b.id} className="tarjeta pila" style={{ gap: 6 }}>
              <div className="medida-linea" style={{ alignItems: 'flex-start' }}>
                <strong style={{ fontSize: '1.2rem' }}>📋 {b.motivo}</strong>
                <span className={b.fin ? 'nivel nivel-bien' : 'nivel nivel-atencion'}>{b.fin ? '✓ Alta' : '● De baja'}</span>
              </div>
              <span>
                Del {fechaLarga(b.inicio)} {b.fin ? `al ${fechaLarga(b.fin)}` : 'hasta hoy'} · <strong>{dias(diasDeBaja(b))}</strong>
              </span>
              <span className="texto-suave">{[tipo?.texto, b.diagnostico].filter(Boolean).join(' · ')}</span>
              {(b.medico || b.centro) && <span>👩‍⚕️ {[b.medico, b.centro].filter(Boolean).join(' · ')}</span>}
              {b.empresa && <span>🏢 {b.empresa}</span>}
              {b.confirmaciones.length > 0 && (
                <span>
                  Partes de confirmación: {b.confirmaciones.map((c) => fechaLarga(c).replace(/ de \d{4}$/, '')).join(', ')}
                </span>
              )}
              {tipoAlta && <span>Alta por: {tipoAlta.texto.toLowerCase()}</span>}
              {b.notas && <p style={{ margin: 0, whiteSpace: 'pre-line' }}>{b.notas}</p>}
              <VerAdjuntos registroId={b.id} />
              <button className="enlace" onClick={() => setEditando(b)}>
                Cambiar, añadir partes o borrar
              </button>
            </article>
          )
        })
      )}

      {alta && <DialogoAlta baja={alta} onTerminar={() => setAlta(undefined)} />}
    </div>
  )
}

function DialogoAlta({ baja, onTerminar }: { baja: Baja; onTerminar: () => void }) {
  const [fecha, setFecha] = useState(hoyISO())
  const [tipo, setTipo] = useState<TipoAlta>('curacion')
  const [error, setError] = useState('')
  return (
    <Confirmar
      titulo="Alta de la baja"
      textoSi="Guardar el alta"
      onSi={async () => {
        try {
          await darAlta(baja.id, fecha, tipo)
          onTerminar()
        } catch (e) {
          setError(e instanceof Error ? e.message : 'No se ha podido guardar.')
        }
      }}
      onNo={onTerminar}
    >
      <div className="pila" style={{ gap: 10, textAlign: 'left' }}>
        <label className="campo">
          <span>Día del alta</span>
          <input type="date" value={fecha} min={baja.inicio} max={hoyISO()} onChange={(e) => setFecha(e.target.value)} />
        </label>
        <Selector etiqueta="Motivo del alta" opciones={TIPOS_ALTA} valor={tipo} onCambio={setTipo} />
        {error && <p className="aviso aviso-error">{error}</p>}
      </div>
    </Confirmar>
  )
}

function FormularioBaja(props: { perfilId: string; baja?: Baja; onTerminar: () => void }) {
  const b = props.baja
  const [inicio, setInicio] = useState(b?.inicio ?? hoyISO())
  const [fin, setFin] = useState(b?.fin ?? '')
  const [tipo, setTipo] = useState<TipoBaja>(b?.tipo ?? 'comun')
  const [motivo, setMotivo] = useState(b?.motivo ?? '')
  const [diagnostico, setDiagnostico] = useState(b?.diagnostico ?? '')
  const [medico, setMedico] = useState(b?.medico ?? '')
  const [centro, setCentro] = useState(b?.centro ?? '')
  const [empresa, setEmpresa] = useState(b?.empresa ?? '')
  const [confirmaciones, setConfirmaciones] = useState<string[]>(b?.confirmaciones ?? [])
  const [tipoAlta, setTipoAlta] = useState<TipoAlta>(b?.tipoAlta ?? 'curacion')
  const [notas, setNotas] = useState(b?.notas ?? '')
  const [pendientes, setPendientes] = useState<AdjuntoNuevo[]>(tomarArchivo)
  const [error, setError] = useState('')
  const [preguntarBorrar, setPreguntarBorrar] = useState(false)

  async function guardar(e: FormEvent) {
    e.preventDefault()
    const datos = {
      inicio,
      fin: fin || undefined,
      tipo,
      motivo,
      diagnostico,
      medico,
      centro,
      empresa,
      confirmaciones: confirmaciones.filter(Boolean),
      tipoAlta: fin ? tipoAlta : undefined,
      notas,
    }
    const problema = revisarBaja(datos)
    if (problema) return setError(problema)
    const id = await guardarBaja(props.perfilId, datos, b?.id)
    await guardarAdjuntos(props.perfilId, id, pendientes)
    props.onTerminar()
  }

  return (
    <form className="pila" onSubmit={guardar} noValidate>
      <h2>📋 {b ? 'Cambiar baja' : 'Nueva baja'}</h2>

      <label className="campo">
        <span>Día de la baja</span>
        <input type="date" value={inicio} max={hoyISO()} onChange={(e) => setInicio(e.target.value)} />
      </label>
      <label className="campo">
        <span>Motivo</span>
        <input type="text" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Lumbalgia, gripe, operación de rodilla…" />
      </label>
      <Selector etiqueta="Tipo de baja" opciones={TIPOS_BAJA} valor={tipo} onCambio={setTipo} />
      <label className="campo">
        <span>Diagnóstico del parte (si quieres)</span>
        <input type="text" value={diagnostico} onChange={(e) => setDiagnostico(e.target.value)} />
      </label>
      <label className="campo">
        <span>Médico (si quieres)</span>
        <input type="text" value={medico} onChange={(e) => setMedico(e.target.value)} />
      </label>
      <label className="campo">
        <span>Centro de salud o mutua (si quieres)</span>
        <input type="text" value={centro} onChange={(e) => setCentro(e.target.value)} />
      </label>
      <label className="campo">
        <span>Empresa (si quieres)</span>
        <input type="text" value={empresa} onChange={(e) => setEmpresa(e.target.value)} />
      </label>

      <fieldset className="campo" style={{ border: 0, padding: 0, margin: 0 }}>
        <span>Partes de confirmación</span>
        <small>Cada vez que el médico confirma que sigues de baja.</small>
        {confirmaciones.map((c, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input
              type="date"
              aria-label={`Parte de confirmación ${i + 1}`}
              value={c}
              min={inicio}
              max={hoyISO()}
              onChange={(e) => setConfirmaciones((l) => l.map((x, j) => (j === i ? e.target.value : x)))}
            />
            <button type="button" className="enlace" onClick={() => setConfirmaciones((l) => l.filter((_, j) => j !== i))}>
              Quitar
            </button>
          </div>
        ))}
        <button type="button" className="boton boton-secundario" onClick={() => setConfirmaciones((l) => [...l, hoyISO()])}>
          ➕ Añadir parte de confirmación
        </button>
      </fieldset>

      <label className="campo">
        <span>Día del alta</span>
        <small>Déjalo en blanco si todavía sigues de baja.</small>
        <input type="date" value={fin} min={inicio} max={hoyISO()} onChange={(e) => setFin(e.target.value)} />
      </label>
      {fin && <Selector etiqueta="Motivo del alta" opciones={TIPOS_ALTA} valor={tipoAlta} onCambio={setTipoAlta} />}

      <label className="campo">
        <span>Notas (si quieres)</span>
        <textarea rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} />
      </label>

      <EditorAdjuntos
        registroId={b?.id}
        pendientes={pendientes}
        onPendientes={setPendientes}
        ayuda="Por ejemplo, una foto o el PDF del parte de baja, de confirmación o de alta."
      />

      {error && (
        <p className="aviso aviso-error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="boton">
        Guardar
      </button>
      <button type="button" className="boton boton-secundario" onClick={props.onTerminar}>
        Cancelar
      </button>
      {b && (
        <button type="button" className="boton boton-peligro-suave" onClick={() => setPreguntarBorrar(true)}>
          Borrar esta baja
        </button>
      )}
      {preguntarBorrar && b && (
        <Confirmar
          titulo="¿Borrar esta baja?"
          textoSi="Sí, borrar"
          peligroso
          onSi={async () => {
            await borrarBaja(b.id)
            props.onTerminar()
          }}
          onNo={() => setPreguntarBorrar(false)}
        />
      )}
    </form>
  )
}
