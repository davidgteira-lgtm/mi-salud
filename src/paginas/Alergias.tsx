import { pideNuevo, tomarArchivo } from '../componentes/archivoEntrante'
import { EditorAdjuntos, VerAdjuntos } from '../componentes/Adjuntos'
import { guardarAdjuntos, type AdjuntoNuevo } from '../db/adjuntos'
import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type FormEvent } from 'react'
import { Confirmar } from '../componentes/Confirmar'
import { EtiquetaGravedad } from '../componentes/EtiquetaGravedad'
import { Selector } from '../componentes/Selector'
import { borrarAlergia, GRAVEDADES, guardarAlergia, listarAlergias, revisarAlergia } from '../db/alergias'
import type { Alergia, Gravedad } from '../db/tipos'
import { fechaLarga, hoyISO } from '../utils/fechas'
import { ejemplosDeAviso, resolverAlergia, sugerirMedicamentos } from '../utils/medicamentos'

const TIPOS: { valor: Alergia['tipo']; texto: string; icono: string; titulo: string }[] = [
  { valor: 'medicamento', texto: 'Medicamento', icono: '💊', titulo: 'Medicamentos' },
  { valor: 'alimento', texto: 'Alimento', icono: '🍽️', titulo: 'Alimentos' },
  { valor: 'otro', texto: 'Otra cosa', icono: '🌿', titulo: 'Otras (polen, látex, animales…)' },
]

/** Alergias e intolerancias, agrupadas por tipo. */
export function Alergias({ perfilId }: { perfilId: string }) {
  const alergias = useLiveQuery(() => listarAlergias(perfilId), [perfilId])
  const [editando, setEditando] = useState<Alergia | null | undefined>(() => (pideNuevo() ? null : undefined))

  if (editando !== undefined) {
    return <FormularioAlergia perfilId={perfilId} alergia={editando ?? undefined} onTerminar={() => setEditando(undefined)} />
  }
  if (!alergias) return null

  return (
    <div className="pila">
      {alergias.length === 0 && (
        <p className="aviso">
          No has apuntado ninguna alergia ni intolerancia. Si tienes alguna, añádela: la app te avisará si apuntas un medicamento que te
          puede sentar mal.
        </p>
      )}

      {TIPOS.map((t) => {
        const deEsteTipo = alergias.filter((a) => a.tipo === t.valor)
        if (deEsteTipo.length === 0) return null
        return (
          <section key={t.valor} className="pila">
            <h2>
              {t.icono} {t.titulo}
            </h2>
            {deEsteTipo.map((a) => (
              <TarjetaAlergia key={a.id} alergia={a} onCambiar={() => setEditando(a)} />
            ))}
          </section>
        )
      })}

      <button className="boton" onClick={() => setEditando(null)}>
        ➕ Añadir alergia o intolerancia
      </button>
    </div>
  )
}

function TarjetaAlergia({ alergia, onCambiar }: { alergia: Alergia; onCambiar: () => void }) {
  const ejemplos = alergia.tipo === 'medicamento' ? ejemplosDeAviso(alergia.nombre) : []
  return (
    <article className="tarjeta pila" style={{ gap: 8 }}>
      <div className="etiquetas">
        <EtiquetaGravedad gravedad={alergia.gravedad} />
        <span className="etiqueta">{alergia.clase === 'alergia' ? 'Alergia' : 'Intolerancia'}</span>
      </div>
      <strong style={{ fontSize: '1.3rem' }}>{alergia.nombre}</strong>
      {alergia.reaccion && <span>Qué te pasó: {alergia.reaccion}</span>}
      {alergia.desde && <span className="texto-suave">Desde el {fechaLarga(alergia.desde)}</span>}
      {ejemplos.length > 0 && <span className="texto-suave">Te avisaremos también con: {ejemplos.join(', ')}…</span>}
      <VerAdjuntos registroId={alergia.id} />
      <button className="enlace" onClick={onCambiar}>
        Cambiar o borrar
      </button>
    </article>
  )
}

function FormularioAlergia(props: { perfilId: string; alergia?: Alergia; onTerminar: () => void }) {
  const { alergia } = props
  const [tipo, setTipo] = useState<Alergia['tipo']>(alergia?.tipo ?? 'medicamento')
  const [clase, setClase] = useState<Alergia['clase']>(alergia?.clase ?? 'alergia')
  const [nombre, setNombre] = useState(alergia?.nombre ?? '')
  const [gravedad, setGravedad] = useState<Gravedad>(alergia?.gravedad ?? 'desconocida')
  const [reaccion, setReaccion] = useState(alergia?.reaccion ?? '')
  const [desde, setDesde] = useState(alergia?.desde ?? '')
  const [error, setError] = useState('')
  const [pendientes, setPendientes] = useState<AdjuntoNuevo[]>(tomarArchivo)
  const [preguntarBorrar, setPreguntarBorrar] = useState(false)

  const sugerencias =
    tipo === 'medicamento' ? sugerirMedicamentos(nombre, 4).filter((s) => s.toLowerCase() !== nombre.trim().toLowerCase()) : []
  const reconocido = tipo === 'medicamento' && nombre.trim() ? resolverAlergia(nombre) : undefined
  const ejemplos = tipo === 'medicamento' ? ejemplosDeAviso(nombre) : []

  async function guardar(e: FormEvent) {
    e.preventDefault()
    const datos = { tipo, clase, nombre, gravedad, reaccion, desde }
    const problema = revisarAlergia(datos)
    if (problema) {
      setError(problema)
      return
    }
    const id = await guardarAlergia(props.perfilId, datos, alergia?.id)
    await guardarAdjuntos(props.perfilId, id, pendientes)
    props.onTerminar()
  }

  return (
    <form className="pila" onSubmit={guardar} noValidate>
      <h2>{alergia ? 'Cambiar alergia' : 'Nueva alergia o intolerancia'}</h2>

      <Selector etiqueta="¿A qué?" opciones={TIPOS} valor={tipo} onCambio={setTipo} />

      <Selector
        etiqueta="¿Qué es?"
        ayuda="Alergia: el cuerpo reacciona (ronchas, picor, hinchazón, ahogo). Intolerancia: te sienta mal (estómago, diarrea…)."
        opciones={[
          { valor: 'alergia', texto: 'Alergia' },
          { valor: 'intolerancia', texto: 'Intolerancia' },
        ]}
        valor={clase}
        onCambio={setClase}
      />

      <label className="campo">
        <span>{tipo === 'medicamento' ? 'Medicamento' : tipo === 'alimento' ? 'Alimento' : 'A qué'}</span>
        <small>
          {tipo === 'medicamento'
            ? 'Por ejemplo: «Penicilina», «Nolotil» o «Antiinflamatorios».'
            : tipo === 'alimento'
              ? 'Por ejemplo: «Marisco», «Frutos secos» o «Lactosa».'
              : 'Por ejemplo: «Polen», «Látex» o «Picaduras de abeja».'}
        </small>
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
      {reconocido && reconocido.grupos.length > 0 && (
        <p className="aviso aviso-ok" style={{ margin: 0 }}>
          ✅ Reconocido. Te avisaremos si apuntas un medicamento de la misma familia
          {ejemplos.length > 0 && <> (por ejemplo: {ejemplos.join(', ')})</>}.
        </p>
      )}

      <Selector etiqueta="¿Cómo de grave?" opciones={GRAVEDADES} valor={gravedad} onCambio={setGravedad} />

      <label className="campo">
        <span>¿Qué te pasó? (si quieres)</span>
        <input type="text" value={reaccion} onChange={(e) => setReaccion(e.target.value)} placeholder="Ronchas, se me hinchó la cara…" />
      </label>

      <label className="campo">
        <span>¿Desde cuándo? (si lo sabes)</span>
        <input type="date" value={desde} max={hoyISO()} onChange={(e) => setDesde(e.target.value)} />
      </label>

      <EditorAdjuntos
        registroId={alergia?.id}
        pendientes={pendientes}
        onPendientes={setPendientes}
        ayuda="Por ejemplo, el informe del alergólogo o una foto de la reacción."
      />

      {error && <p className="aviso aviso-error">{error}</p>}

      <button type="submit" className="boton">
        Guardar
      </button>
      <button type="button" className="boton boton-secundario" onClick={props.onTerminar}>
        Cancelar
      </button>
      {alergia && (
        <button type="button" className="boton boton-peligro-suave" onClick={() => setPreguntarBorrar(true)}>
          Borrar esta alergia
        </button>
      )}
      {preguntarBorrar && alergia && (
        <Confirmar
          titulo={`¿Borrar la alergia a ${alergia.nombre}?`}
          textoSi="Sí, borrar"
          peligroso
          onSi={async () => {
            await borrarAlergia(alergia.id)
            props.onTerminar()
          }}
          onNo={() => setPreguntarBorrar(false)}
        >
          <p>Si la borras, la app dejará de avisarte con los medicamentos relacionados.</p>
        </Confirmar>
      )}
    </form>
  )
}
