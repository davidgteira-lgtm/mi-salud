import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type FormEvent } from 'react'
import { EditorAdjuntos, VerAdjuntos } from '../componentes/Adjuntos'
import { Confirmar } from '../componentes/Confirmar'
import { Selector } from '../componentes/Selector'
import { guardarAdjuntos, type AdjuntoNuevo } from '../db/adjuntos'
import { ESPECIALIDADES } from '../db/citas'
import { agruparPorAno, borrarHistorial, guardarHistorial, listarHistorial, PRUEBAS, revisarHistorial, TIPOS_HISTORIAL } from '../db/historial'
import type { EntradaHistorial, TipoHistorial } from '../db/tipos'
import { fechaLarga, hoyISO } from '../utils/fechas'

/** Historial: todo lo médico que ha pasado, de lo más reciente a lo más antiguo. */
export function Historial({ perfilId }: { perfilId: string }) {
  const [tipo, setTipo] = useState<TipoHistorial | ''>('')
  const [busqueda, setBusqueda] = useState('')
  const [editando, setEditando] = useState<EntradaHistorial | null>()
  const lista = useLiveQuery(() => listarHistorial(perfilId, { tipo: tipo || undefined, busqueda }), [perfilId, tipo, busqueda])
  // Tipos que de verdad hay apuntados: solo esos salen como filtro.
  const tiposPresentes = useLiveQuery(
    async () => new Set((await listarHistorial(perfilId)).map((h) => h.tipo)),
    [perfilId],
  )
  const hayAlgo = tiposPresentes === undefined ? undefined : tiposPresentes.size > 0

  if (editando !== undefined) {
    return <FormularioHistorial perfilId={perfilId} entrada={editando ?? undefined} onTerminar={() => setEditando(undefined)} />
  }
  if (!lista) return null

  return (
    <div className="pila">
      <button className="boton" onClick={() => setEditando(null)}>
        ➕ Añadir al historial
      </button>

      {hayAlgo === false && (
        <p className="aviso">
          Aquí puedes guardar informes, pruebas (radiografías, TAC, ecografías…), operaciones, ingresos y diagnósticos.
          Con una foto del papel es suficiente.
        </p>
      )}

      {hayAlgo && (
        <>
          <label className="campo">
            <span>Buscar</span>
            <input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Por ejemplo: rodilla, TAC, La Paz…" />
          </label>
          {(tiposPresentes?.size ?? 0) > 1 && (
            <div className="sugerencias" style={{ marginTop: 0 }}>
              <button type="button" className="opcion" aria-pressed={tipo === ''} onClick={() => setTipo('')}>
                Todo
              </button>
              {TIPOS_HISTORIAL.filter((t) => tiposPresentes?.has(t.valor)).map((t) => (
                <button key={t.valor} type="button" className="opcion" aria-pressed={tipo === t.valor} onClick={() => setTipo(t.valor)}>
                  {t.icono} {t.texto}
                </button>
              ))}
            </div>
          )}
          {(busqueda || tipo) && (
            <p className="texto-suave" style={{ margin: 0 }} aria-live="polite">
              {lista.length === 1 ? '1 resultado' : `${lista.length} resultados`}
            </p>
          )}
        </>
      )}

      {agruparPorAno(lista).map(([ano, entradas]) => (
        <section key={ano} className="pila">
          <h2 className="titulo-ano">{ano}</h2>
          {entradas.map((h) => (
            <TarjetaHistorial key={h.id} entrada={h} onCambiar={() => setEditando(h)} />
          ))}
        </section>
      ))}
    </div>
  )
}

function TarjetaHistorial({ entrada: h, onCambiar }: { entrada: EntradaHistorial; onCambiar: () => void }) {
  const tipo = TIPOS_HISTORIAL.find((t) => t.valor === h.tipo)
  return (
    <article className="tarjeta pila" style={{ gap: 6 }}>
      <div className="etiquetas">
        <span className="etiqueta">
          {tipo?.icono} {h.prueba ?? tipo?.texto}
        </span>
        {h.cronica && <span className="etiqueta etiqueta-moderada">Crónica</span>}
      </div>
      <strong style={{ fontSize: '1.25rem' }}>{h.titulo}</strong>
      <span className="texto-suave">{fechaLarga(h.fecha)}</span>
      {(h.especialidad || h.medico) && <span>👩‍⚕️ {[h.especialidad, h.medico].filter(Boolean).join(' · ')}</span>}
      {h.centro && <span>📍 {h.centro}</span>}
      {h.resumen && <p style={{ margin: 0, whiteSpace: 'pre-line' }}>{h.resumen}</p>}
      <VerAdjuntos registroId={h.id} />
      <button className="enlace" onClick={onCambiar}>
        Cambiar o borrar
      </button>
    </article>
  )
}

function FormularioHistorial(props: { perfilId: string; entrada?: EntradaHistorial; onTerminar: () => void }) {
  const h = props.entrada
  const [tipo, setTipo] = useState<TipoHistorial>(h?.tipo ?? 'informe')
  const [fecha, setFecha] = useState(h?.fecha ?? hoyISO())
  const [titulo, setTitulo] = useState(h?.titulo ?? '')
  const [prueba, setPrueba] = useState(h?.prueba ?? '')
  const [especialidad, setEspecialidad] = useState(h?.especialidad ?? '')
  const [centro, setCentro] = useState(h?.centro ?? '')
  const [medico, setMedico] = useState(h?.medico ?? '')
  const [resumen, setResumen] = useState(h?.resumen ?? '')
  const [cronica, setCronica] = useState<'si' | 'no'>(h?.cronica ? 'si' : 'no')
  const [pendientes, setPendientes] = useState<AdjuntoNuevo[]>([])
  const [error, setError] = useState('')
  const [preguntarBorrar, setPreguntarBorrar] = useState(false)

  async function guardar(e: FormEvent) {
    e.preventDefault()
    const datos = { tipo, fecha, titulo, prueba, especialidad, centro, medico, resumen, cronica: cronica === 'si' }
    const problema = revisarHistorial(datos)
    if (problema) {
      setError(problema)
      return
    }
    const id = await guardarHistorial(props.perfilId, datos, h?.id)
    await guardarAdjuntos(props.perfilId, id, pendientes)
    props.onTerminar()
  }

  const ejemploTitulo: Record<TipoHistorial, string> = {
    consulta: 'Revisión con el cardiólogo',
    informe: 'Informe de alta',
    prueba: 'Radiografía de rodilla',
    operacion: 'Operación de cataratas',
    ingreso: 'Ingreso por neumonía',
    urgencias: 'Caída en casa',
    diagnostico: 'Diabetes tipo 2',
    otro: 'Certificado médico',
  }

  return (
    <form className="pila" onSubmit={guardar} noValidate>
      <h2>{h ? 'Cambiar' : 'Añadir al historial'}</h2>

      <Selector etiqueta="¿Qué es?" opciones={TIPOS_HISTORIAL} valor={tipo} onCambio={setTipo} />

      {tipo === 'prueba' && (
        <>
          <label className="campo">
            <span>¿Qué prueba?</span>
            <input type="text" value={prueba} onChange={(e) => setPrueba(e.target.value)} />
          </label>
          <div className="sugerencias">
            {PRUEBAS.filter((p) => p !== prueba).map((p) => (
              <button key={p} type="button" className="opcion" onClick={() => setPrueba(p)}>
                {p}
              </button>
            ))}
          </div>
        </>
      )}

      <label className="campo">
        <span>Título</span>
        <small>Unas palabras para reconocerlo. Por ejemplo: «{ejemploTitulo[tipo]}».</small>
        <input type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
      </label>

      <label className="campo">
        <span>Fecha</span>
        <small>Si no la sabes exacta, pon una aproximada.</small>
        <input type="date" value={fecha} max={hoyISO()} onChange={(e) => setFecha(e.target.value)} />
      </label>

      {tipo === 'diagnostico' && (
        <Selector
          etiqueta="¿Es una enfermedad que dura (crónica)?"
          ayuda="Por ejemplo: diabetes, tensión alta, EPOC… Saldrá en la ficha de emergencia."
          opciones={[
            { valor: 'si', texto: 'Sí, es crónica' },
            { valor: 'no', texto: 'No' },
          ]}
          valor={cronica}
          onCambio={setCronica}
        />
      )}

      <label className="campo">
        <span>Especialidad (si quieres)</span>
        <input type="text" list="especialidades" value={especialidad} onChange={(e) => setEspecialidad(e.target.value)} />
        <datalist id="especialidades">
          {ESPECIALIDADES.map((e) => (
            <option key={e} value={e} />
          ))}
        </datalist>
      </label>

      <label className="campo">
        <span>Hospital o centro (si quieres)</span>
        <input type="text" value={centro} onChange={(e) => setCentro(e.target.value)} />
      </label>

      <label className="campo">
        <span>Médico (si quieres)</span>
        <input type="text" value={medico} onChange={(e) => setMedico(e.target.value)} />
      </label>

      <label className="campo">
        <span>¿Qué dice o qué pasó?</span>
        <textarea rows={4} value={resumen} onChange={(e) => setResumen(e.target.value)} placeholder="Con tus palabras. Más adelante la app podrá leer el informe por ti." />
      </label>

      <EditorAdjuntos registroId={h?.id} pendientes={pendientes} onPendientes={setPendientes} />

      {error && <p className="aviso aviso-error">{error}</p>}

      <button type="submit" className="boton">
        Guardar
      </button>
      <button type="button" className="boton boton-secundario" onClick={props.onTerminar}>
        Cancelar
      </button>
      {h && (
        <button type="button" className="boton boton-peligro-suave" onClick={() => setPreguntarBorrar(true)}>
          Borrar
        </button>
      )}
      {preguntarBorrar && h && (
        <Confirmar
          titulo={`¿Borrar «${h.titulo}»?`}
          textoSi="Sí, borrar"
          peligroso
          onSi={async () => {
            await borrarHistorial(h.id)
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
