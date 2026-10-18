import { guardarMedicamento, listarMedicamentos } from '../db/medicamentos'
import { sugerirMedicamentos } from '../utils/medicamentos'
import { normalizar } from '../utils/texto'
import { pideNuevo, tomarArchivo } from '../componentes/archivoEntrante'
import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type FormEvent } from 'react'
import { EditorAdjuntos, VerAdjuntos } from '../componentes/Adjuntos'
import { Confirmar } from '../componentes/Confirmar'
import { Selector } from '../componentes/Selector'
import { guardarAdjuntos, type AdjuntoNuevo } from '../db/adjuntos'
import { ESPECIALIDADES } from '../db/citas'
import {
  agruparPorAno,
  borrarHistorial,
  guardarHistorial,
  listarHistorial,
  PRUEBAS,
  revisarHistorial,
  TIPOS_HISTORIAL,
} from '../db/historial'
import { EtiquetaRegla } from '../componentes/EtiquetaRegla'
import { useCiclosVisibles } from '../componentes/useCiclosVisibles'
import type { Ciclo, EntradaHistorial, TipoHistorial } from '../db/tipos'
import { fechaLarga, hoyISO } from '../utils/fechas'

/** Historial: todo lo médico que ha pasado, de lo más reciente a lo más antiguo. */
export function Historial({ perfilId }: { perfilId: string }) {
  const [tipo, setTipo] = useState<TipoHistorial | ''>('')
  const [busqueda, setBusqueda] = useState('')
  const [soloCronicas, setSoloCronicas] = useState(false)
  const [editando, setEditando] = useState<EntradaHistorial | null | undefined>(() => (pideNuevo() ? null : undefined))
  const ciclos = useCiclosVisibles(perfilId)
  const todas = useLiveQuery(() => listarHistorial(perfilId, { tipo: tipo || undefined, busqueda }), [perfilId, tipo, busqueda])
  const lista = todas && (soloCronicas ? todas.filter((h) => h.cronica) : todas)
  const hayCronicas = useLiveQuery(async () => (await listarHistorial(perfilId)).some((h) => h.cronica), [perfilId])
  // Tipos que de verdad hay apuntados: solo esos salen como filtro.
  const tiposPresentes = useLiveQuery(async () => new Set((await listarHistorial(perfilId)).map((h) => h.tipo)), [perfilId])
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
          Aquí puedes guardar informes, pruebas (radiografías, TAC, ecografías…), operaciones, ingresos y diagnósticos. Con una foto del
          papel es suficiente.
        </p>
      )}

      {hayAlgo && (
        <>
          <label className="campo">
            <span>Buscar</span>
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Por ejemplo: rodilla, TAC, La Paz…"
            />
          </label>
          {(tiposPresentes?.size ?? 0) > 1 && (
            <div className="sugerencias" style={{ marginTop: 0 }}>
              <button
                type="button"
                className="opcion"
                aria-pressed={tipo === '' && !soloCronicas}
                onClick={() => {
                  setTipo('')
                  setSoloCronicas(false)
                }}
              >
                Todo
              </button>
              {TIPOS_HISTORIAL.filter((t) => tiposPresentes?.has(t.valor)).map((t) => (
                <button
                  key={t.valor}
                  type="button"
                  className="opcion"
                  aria-pressed={tipo === t.valor && !soloCronicas}
                  onClick={() => {
                    setTipo(t.valor)
                    setSoloCronicas(false)
                  }}
                >
                  {t.icono} {t.texto}
                </button>
              ))}
              {hayCronicas && (
                <button
                  type="button"
                  className="opcion"
                  aria-pressed={soloCronicas}
                  onClick={() => {
                    setTipo('')
                    setSoloCronicas(true)
                  }}
                >
                  🔁 Crónicas
                </button>
              )}
            </div>
          )}
          {(busqueda || tipo || soloCronicas) && (
            <p className="aviso aviso-ok" style={{ margin: 0 }} aria-live="polite">
              <strong>{lista.length === 1 ? 'Sale 1 resultado' : `Salen ${lista.length} resultados`}</strong>
              {tipo === 'diagnostico' && '. Diagnóstico: lo que el médico te ha dicho que tienes.'}
              {soloCronicas &&
                '. Crónicas: las enfermedades que duran mucho o para siempre (diabetes, tensión alta…). Salen en tu ficha de emergencia.'}
            </p>
          )}
        </>
      )}

      {agruparPorAno(lista).map(([ano, entradas]) => (
        <section key={ano} className="pila">
          <h2 className="titulo-ano">{ano}</h2>
          {entradas.map((h) => (
            <TarjetaHistorial key={h.id} entrada={h} ciclos={ciclos} onCambiar={() => setEditando(h)} />
          ))}
        </section>
      ))}
    </div>
  )
}

function TarjetaHistorial({ entrada: h, ciclos, onCambiar }: { entrada: EntradaHistorial; ciclos: Ciclo[]; onCambiar: () => void }) {
  const tipo = TIPOS_HISTORIAL.find((t) => t.valor === h.tipo)
  return (
    <article className="tarjeta pila" style={{ gap: 6 }}>
      {/* Qué tipo de registro es: texto, no botón (antes parecía que se podía pulsar). */}
      <span className="tipo-registro">
        {tipo?.icono} {h.prueba ?? tipo?.texto}
        {h.cronica && <strong> · Enfermedad crónica (de larga duración)</strong>}
      </span>
      <EtiquetaRegla fecha={h.fecha} ciclos={ciclos} />
      <strong style={{ fontSize: '1.25rem' }}>{h.titulo}</strong>
      <span className="texto-suave">{fechaLarga(h.fecha)}</span>
      {(h.especialidad || h.medico) && <span>👩‍⚕️ {[h.especialidad, h.medico].filter(Boolean).join(' · ')}</span>}
      {h.centro && <span>📍 {h.centro}</span>}
      {h.resumen && <p style={{ margin: 0, whiteSpace: 'pre-line' }}>{h.resumen}</p>}
      {(h.medicacion?.length ?? 0) > 0 && (
        <span>
          💊 <span className="texto-suave">Te recetaron:</span> {h.medicacion!.join(', ')}
        </span>
      )}
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
  const [medicacion, setMedicacion] = useState<string[]>(h?.medicacion ?? [])
  const [apuntarEnMedicacion, setApuntarEnMedicacion] = useState(!h)
  const [pendientes, setPendientes] = useState<AdjuntoNuevo[]>(tomarArchivo)
  const [error, setError] = useState('')
  const [preguntarBorrar, setPreguntarBorrar] = useState(false)

  async function guardar(e: FormEvent) {
    e.preventDefault()
    const datos = { tipo, fecha, titulo, prueba, especialidad, centro, medico, resumen, cronica: cronica === 'si', medicacion }
    const problema = revisarHistorial(datos)
    if (problema) {
      setError(problema)
      return
    }
    const id = await guardarHistorial(props.perfilId, datos, h?.id)
    // Lo recetado pasa también a «Medicación» (si no lo tomaba ya).
    if (apuntarEnMedicacion && medicacion.length > 0) {
      const yaToma = (await listarMedicamentos(props.perfilId, true)).map((m) => normalizar(m.nombre))
      for (const nombre of medicacion) {
        if (!yaToma.some((y) => y.includes(normalizar(nombre)) || normalizar(nombre).includes(y))) {
          await guardarMedicamento(props.perfilId, {
            nombre,
            momentos: [],
            activo: 1,
            fechaInicio: fecha,
            paraQue: titulo.trim() || undefined,
          })
        }
      }
    }
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
        <textarea
          rows={4}
          value={resumen}
          onChange={(e) => setResumen(e.target.value)}
          placeholder="Con tus palabras. Más adelante la app podrá leer el informe por ti."
        />
      </label>

      <MedicacionRecetada
        lista={medicacion}
        onCambio={setMedicacion}
        nueva={!h}
        apuntar={apuntarEnMedicacion}
        onApuntar={setApuntarEnMedicacion}
      />

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

/** «¿Te recetaron algo?»: medicamentos recetados en esta visita, informe o urgencias. */
function MedicacionRecetada(props: {
  lista: string[]
  onCambio: (l: string[]) => void
  nueva: boolean
  apuntar: boolean
  onApuntar: (si: boolean) => void
}) {
  const [texto, setTexto] = useState('')
  const sugerencias = texto.trim() ? sugerirMedicamentos(texto, 4).filter((s) => !props.lista.includes(s)) : []
  const anadir = (nombre: string) => {
    if (!nombre.trim()) return
    props.onCambio([...new Set([...props.lista, nombre.trim()])])
    setTexto('')
  }
  return (
    <fieldset className="campo" style={{ border: 0, padding: 0, margin: 0 }}>
      <span>💊 ¿Te recetaron algo?</span>
      <small>Escribe el nombre y pulsa «Añadir». Puedes poner varios.</small>
      {props.lista.length > 0 && (
        <div className="etiquetas">
          {props.lista.map((m) => (
            <span key={m} className="hora-toma">
              {m}
              <button
                type="button"
                className="enlace"
                onClick={() => props.onCambio(props.lista.filter((x) => x !== m))}
                aria-label={`Quitar ${m}`}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 10 }}>
        <input
          type="text"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Amoxicilina, ibuprofeno…"
          aria-label="Medicamento recetado"
          style={{ flex: 1 }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              anadir(texto)
            }
          }}
        />
        <button type="button" className="boton boton-secundario" style={{ width: 'auto' }} onClick={() => anadir(texto)}>
          Añadir
        </button>
      </div>
      {sugerencias.length > 0 && (
        <div className="sugerencias">
          {sugerencias.map((s) => (
            <button key={s} type="button" className="opcion" onClick={() => anadir(s)}>
              {s}
            </button>
          ))}
        </div>
      )}
      {props.nueva && props.lista.length > 0 && (
        <label className="casilla">
          <input type="checkbox" checked={props.apuntar} onChange={(e) => props.onApuntar(e.target.checked)} />
          <span>Apuntarlo también en «Medicación»</span>
        </label>
      )}
    </fieldset>
  )
}
