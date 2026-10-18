import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { EditorAdjuntos, VerAdjuntos } from '../componentes/Adjuntos'
import { Confirmar } from '../componentes/Confirmar'
import { Selector } from '../componentes/Selector'
import { buscarRecomendacion, RECOMENDACIONES, type Enlace } from '../datos/revisiones'
import { guardarAdjuntos, type AdjuntoNuevo } from '../db/adjuntos'
import { db } from '../db/db'
import { agruparPorAno } from '../db/historial'
import {
  borrarRegistro,
  claveDelNombre,
  datosEnlazados,
  guardarPropia,
  guardarRegistro,
  listarRegistros,
  ocultarRecomendacion,
  queToca,
  quitarPropia,
  revisarRegistro,
  textoMeses,
  type EstadoRevision,
  type QueToca,
} from '../db/revisiones'
import type { Perfil, RegistroRevision } from '../db/tipos'
import { anadirAlCalendario } from '../utils/calendario'
import { sumarDias } from '../utils/ciclos'
import { calcularEdad, esFechaValida, fechaLarga, hoyISO, mesYAno } from '../utils/fechas'
import { normalizar } from '../utils/texto'

const ESTADOS: Record<EstadoRevision, { texto: string; clase: string }> = {
  toca: { texto: '⚠️ Te toca', clase: 'nivel nivel-fuera' },
  pronto: { texto: '⏰ Pronto', clase: 'nivel nivel-atencion' },
  'al-dia': { texto: '✓ Al día', clase: 'nivel nivel-bien' },
  hecha: { texto: '✓ Hecho', clase: 'nivel nivel-bien' },
  'mas-adelante': { texto: 'Más adelante', clase: 'nivel' },
}

const DE_DONDE: Record<'apuntada' | Enlace, string> = {
  apuntada: '',
  tension: ' (en tus constantes)',
  colesterol: ' (en tus análisis)',
  azucar: ' (en tus análisis)',
  dentista: ' (en Salud dental)',
}

type Editando =
  { que: 'registro'; registro?: RegistroRevision; tipo: 'revision' | 'vacuna'; clave?: string; nombre?: string } | { que: 'propia' }

/** Revisiones y vacunas: lo que te toca por tu edad y lo que ya te has hecho. */
export function Revisiones({ perfilId }: { perfilId: string }) {
  const ir = useNavigate()
  const [editando, setEditando] = useState<Editando>()
  const [quitar, setQuitar] = useState<QueToca>()
  const perfil = useLiveQuery(() => db.perfiles.get(perfilId), [perfilId])
  const registros = useLiveQuery(() => listarRegistros(perfilId), [perfilId])
  const enlazados = useLiveQuery(() => datosEnlazados(perfilId), [perfilId])

  if (!perfil || !registros || !enlazados) return null

  if (editando?.que === 'registro') {
    return (
      <FormularioRegistro
        perfil={perfil}
        tipo={editando.tipo}
        clave={editando.clave}
        nombre={editando.nombre}
        registro={editando.registro}
        onTerminar={() => setEditando(undefined)}
      />
    )
  }
  if (editando?.que === 'propia') return <FormularioPropia perfil={perfil} onTerminar={() => setEditando(undefined)} />

  const conFecha = perfil.fechaNacimiento && esFechaValida(perfil.fechaNacimiento)
  const lista = queToca({
    edad: conFecha ? calcularEdad(perfil.fechaNacimiento!) : undefined,
    sexo: perfil.sexo,
    registros,
    enlazados,
    ocultas: perfil.revisionesOcultas,
    propias: perfil.revisionesPropias,
  })
  const grupo = (...estados: EstadoRevision[]) => lista.filter((x) => estados.includes(x.estado))
  const tocan = grupo('toca')
  const pronto = grupo('pronto')
  const alDia = grupo('al-dia', 'hecha')
  const masAdelante = grupo('mas-adelante')
  const ocultas = (perfil.revisionesOcultas ?? []).map(buscarRecomendacion).filter((r) => r !== undefined)

  const apuntar = (x: QueToca) => setEditando({ que: 'registro', tipo: x.tipo, clave: x.clave, nombre: x.nombre })
  const tarjeta = (x: QueToca) => <TarjetaQueToca key={x.clave} item={x} onApuntar={() => apuntar(x)} onQuitar={() => setQuitar(x)} />

  return (
    <div className="pila">
      {!conFecha && (
        <div className="aviso pila" style={{ gap: 10 }}>
          <span>Para saber qué revisiones y vacunas te tocan, la app necesita tu fecha de nacimiento.</span>
          <button className="boton" onClick={() => ir(`/persona/${perfil.id}`)}>
            Poner mi fecha de nacimiento
          </button>
        </div>
      )}

      {conFecha && tocan.length === 0 && pronto.length === 0 && (
        <p className="aviso aviso-ok" role="status">
          ✓ Estás al día con todo lo que te toca por tu edad.
        </p>
      )}

      {tocan.length > 0 && (
        <section className="pila" aria-label="Te toca">
          <h2 style={{ marginBottom: 0 }}>Te toca</h2>
          {tocan.map(tarjeta)}
        </section>
      )}
      {pronto.length > 0 && (
        <section className="pila" aria-label="Pronto">
          <h2 style={{ marginBottom: 0 }}>Pronto</h2>
          {pronto.map(tarjeta)}
        </section>
      )}
      {alDia.length > 0 && (
        <section className="pila" aria-label="Al día">
          <h2 style={{ marginBottom: 0 }}>Al día</h2>
          {alDia.map(tarjeta)}
        </section>
      )}

      <div className="pila" style={{ gap: 10 }}>
        <button className="boton" onClick={() => setEditando({ que: 'registro', tipo: 'vacuna' })}>
          ➕ Apuntar una vacuna
        </button>
        <button className="boton boton-secundario" onClick={() => setEditando({ que: 'registro', tipo: 'revision' })}>
          ➕ Apuntar una revisión
        </button>
        <button className="boton boton-secundario" onClick={() => setEditando({ que: 'propia' })}>
          📌 Una revisión que te ha mandado tu médico
        </button>
      </div>

      {masAdelante.length > 0 && (
        <section className="tarjeta pila" aria-label="Más adelante" style={{ gap: 6 }}>
          <strong>Más adelante</strong>
          <ul className="dientes-elegidos">
            {masAdelante.map((x) => (
              <li key={x.clave}>
                A los {x.edadInicio}: {x.nombre.charAt(0).toLowerCase() + x.nombre.slice(1)}
              </li>
            ))}
          </ul>
        </section>
      )}

      {registros.length > 0 && (
        <>
          <h2 style={{ marginBottom: 0 }}>Lo que has apuntado</h2>
          {agruparPorAno(registros).map(([ano, lista]) => (
            <section key={ano} className="pila">
              <h3 className="titulo-ano">{ano}</h3>
              {lista.map((r) => (
                <TarjetaRegistro
                  key={r.id}
                  registro={r}
                  onCambiar={() => setEditando({ que: 'registro', registro: r, tipo: r.tipo, clave: r.clave, nombre: r.nombre })}
                />
              ))}
            </section>
          ))}
        </>
      )}

      {ocultas.length > 0 && (
        <section className="tarjeta pila" aria-label="Quitadas de tu lista" style={{ gap: 6 }}>
          <strong>Has quitado de tu lista</strong>
          {ocultas.map((r) => (
            <span key={r.clave}>
              {r.nombre}{' '}
              <button className="enlace" onClick={() => ocultarRecomendacion(perfil, r.clave, false)}>
                Volver a ponerla
              </button>
            </span>
          ))}
        </section>
      )}

      <p className="texto-suave" style={{ fontSize: '0.85rem' }}>
        Según el calendario de vacunación 2026 del Ministerio de Sanidad, los programas de cribado del Sistema Nacional de Salud y las
        recomendaciones de los médicos de familia. Tu comunidad o tu médico pueden decirte otra cosa: hazles caso a ellos.
      </p>

      {quitar && (
        <Confirmar
          titulo={quitar.propia ? `¿Quitar «${quitar.nombre}»?` : `¿Quitar «${quitar.nombre}» de tu lista?`}
          textoSi="Sí, quitar"
          onSi={async () => {
            if (quitar.propia) await quitarPropia(perfil, quitar.clave)
            else await ocultarRecomendacion(perfil, quitar.clave, true)
            setQuitar(undefined)
          }}
          onNo={() => setQuitar(undefined)}
        >
          <p>
            {quitar.propia
              ? 'Lo que ya tengas apuntado no se borra.'
              : 'Por ejemplo, si tu médico te ha dicho que no te toca. Podrás volver a ponerla.'}
          </p>
        </Confirmar>
      )}
    </div>
  )
}

function TarjetaQueToca({ item: x, onApuntar, onQuitar }: { item: QueToca; onApuntar: () => void; onQuitar: () => void }) {
  const estado = ESTADOS[x.estado]
  const hoy = hoyISO()
  const pendiente = x.estado === 'toca' || x.estado === 'pronto'
  const recordar = () =>
    anadirAlCalendario({
      id: `revision-${x.clave}`,
      // Si ya toca, el aviso es para dentro de una semana: tiempo para pedir cita.
      fecha: x.proxima && x.proxima > hoy ? x.proxima : sumarDias(hoy, 7),
      titulo: `Me toca: ${x.nombre}`,
      descripcion: `${x.explicacion}\nPide cita en tu centro de salud.\nApuntado en Mi Salud`,
    })

  return (
    <article className="tarjeta pila" style={{ gap: 6 }}>
      <div className="medida-linea" style={{ alignItems: 'flex-start' }}>
        <strong style={{ fontSize: '1.2rem' }}>
          {x.icono} {x.nombre}
        </strong>
        <span className={estado.clase}>{estado.texto}</span>
      </div>
      {pendiente && <span className="texto-suave">{x.explicacion}</span>}
      {x.dosisTotales && (
        <span>
          {x.dosisPuestas} de {x.dosisTotales} dosis puestas
        </span>
      )}
      {x.ultima ? (
        <span>
          Última vez: {fechaLarga(x.ultima.fecha)}
          {DE_DONDE[x.ultima.origen]}
        </span>
      ) : (
        pendiente && <span>No tienes apuntada ninguna.</span>
      )}
      {x.proxima && x.estado !== 'toca' && <span>Próxima: {mesYAno(x.proxima)}</span>}
      {x.proxima && x.estado === 'toca' && <span>Tocaba en {mesYAno(x.proxima)}.</span>}

      {pendiente && (
        <>
          <button className="boton" onClick={onApuntar}>
            ✓ {x.tipo === 'vacuna' ? 'Ya me la he puesto' : 'Ya me la he hecho'}
          </button>
          <button className="boton boton-secundario" onClick={recordar}>
            📅 Recordármelo en el calendario
          </button>
        </>
      )}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {!pendiente && x.estado !== 'hecha' && (
          <button className="enlace" onClick={onApuntar}>
            Apuntar otra vez
          </button>
        )}
        {x.estado !== 'hecha' && (
          <button className="enlace" onClick={onQuitar}>
            {x.propia ? 'Quitar' : 'No me toca'}
          </button>
        )}
      </div>
    </article>
  )
}

function TarjetaRegistro({ registro: r, onCambiar }: { registro: RegistroRevision; onCambiar: () => void }) {
  return (
    <article className="tarjeta pila" style={{ gap: 6 }}>
      <strong style={{ fontSize: '1.15rem' }}>
        {r.tipo === 'vacuna' ? '💉' : (buscarRecomendacion(r.clave)?.icono ?? '🩺')} {r.nombre}
        {r.dosis && <span className="texto-suave"> · {r.dosis}</span>}
      </strong>
      <span className="texto-suave">{fechaLarga(r.fecha)}</span>
      {r.lugar && <span>📍 {r.lugar}</span>}
      {r.lote && <span>Lote: {r.lote}</span>}
      {r.notas && <p style={{ margin: 0, whiteSpace: 'pre-line' }}>{r.notas}</p>}
      <VerAdjuntos registroId={r.id} />
      <button className="enlace" onClick={onCambiar}>
        Cambiar o borrar
      </button>
    </article>
  )
}

function FormularioRegistro(props: {
  perfil: Perfil
  tipo: 'revision' | 'vacuna'
  clave?: string
  nombre?: string
  registro?: RegistroRevision
  onTerminar: () => void
}) {
  const r = props.registro
  const [tipo, setTipo] = useState(r?.tipo ?? props.tipo)
  const [nombre, setNombre] = useState(r?.nombre ?? props.nombre ?? '')
  const [fecha, setFecha] = useState(r?.fecha ?? hoyISO())
  const [dosis, setDosis] = useState(r?.dosis ?? '')
  const [lote, setLote] = useState(r?.lote ?? '')
  const [lugar, setLugar] = useState(r?.lugar ?? '')
  const [notas, setNotas] = useState(r?.notas ?? '')
  const [pendientes, setPendientes] = useState<AdjuntoNuevo[]>([])
  const [error, setError] = useState('')
  const [preguntarBorrar, setPreguntarBorrar] = useState(false)

  const propias = props.perfil.revisionesPropias ?? []
  const opciones = [...RECOMENDACIONES.filter((x) => x.tipo === tipo), ...(tipo === 'revision' ? propias : [])].map((x) => x.nombre)
  const sugerencias = opciones.filter((o) => o !== nombre && (!nombre || normalizar(o).includes(normalizar(nombre)))).slice(0, 6)
  const esVacuna = tipo === 'vacuna'

  async function guardar(e: FormEvent) {
    e.preventDefault()
    // Si no se ha cambiado el nombre, se mantiene a qué revisión corresponde; si no, se busca por el nombre.
    const clave =
      nombre === (r?.nombre ?? props.nombre) && (r?.clave ?? props.clave) ? (r?.clave ?? props.clave) : claveDelNombre(nombre, propias)
    const datos = { tipo, clave, nombre, fecha, dosis: esVacuna ? dosis : undefined, lote: esVacuna ? lote : undefined, lugar, notas }
    const problema = revisarRegistro(datos)
    if (problema) return setError(problema)
    const id = await guardarRegistro(props.perfil.id, datos, r?.id)
    await guardarAdjuntos(props.perfil.id, id, pendientes)
    props.onTerminar()
  }

  return (
    <form className="pila" onSubmit={guardar} noValidate>
      <h2>
        {esVacuna ? '💉' : '🩺'} {r ? 'Cambiar' : 'Apuntar'} {esVacuna ? 'vacuna' : 'revisión'}
      </h2>

      {!r && !props.clave && (
        <Selector
          etiqueta="¿Qué es?"
          opciones={[
            { valor: 'vacuna', texto: '💉 Una vacuna' },
            { valor: 'revision', texto: '🩺 Una revisión' },
          ]}
          valor={tipo}
          onCambio={setTipo}
        />
      )}

      <label className="campo">
        <span>{esVacuna ? '¿Qué vacuna?' : '¿Qué revisión?'}</span>
        <input
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder={esVacuna ? 'Gripe, tétanos…' : 'Mamografía, vista…'}
        />
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

      <label className="campo">
        <span>Fecha</span>
        <small>Si no te acuerdas del día, pon uno aproximado.</small>
        <input type="date" value={fecha} max={hoyISO()} onChange={(e) => setFecha(e.target.value)} />
      </label>

      {esVacuna && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <label className="campo">
            <span>Dosis (si quieres)</span>
            <input type="text" value={dosis} onChange={(e) => setDosis(e.target.value)} placeholder="1ª dosis" />
          </label>
          <label className="campo">
            <span>Lote (si quieres)</span>
            <input type="text" value={lote} onChange={(e) => setLote(e.target.value)} placeholder="En la pegatina" />
          </label>
        </div>
      )}

      <label className="campo">
        <span>Dónde (si quieres)</span>
        <input type="text" value={lugar} onChange={(e) => setLugar(e.target.value)} placeholder="Centro de salud, farmacia…" />
      </label>

      <label className="campo">
        <span>{esVacuna ? 'Notas (si quieres)' : '¿Qué te dijeron?'}</span>
        <textarea
          rows={3}
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          placeholder={esVacuna ? 'Me dolió el brazo un par de días…' : 'Todo bien, repetir en 2 años…'}
        />
      </label>

      <EditorAdjuntos registroId={r?.id} pendientes={pendientes} onPendientes={setPendientes} />

      {error && <p className="aviso aviso-error">{error}</p>}

      <button type="submit" className="boton">
        Guardar
      </button>
      <button type="button" className="boton boton-secundario" onClick={props.onTerminar}>
        Cancelar
      </button>
      {r && (
        <button type="button" className="boton boton-peligro-suave" onClick={() => setPreguntarBorrar(true)}>
          Borrar
        </button>
      )}
      {preguntarBorrar && r && (
        <Confirmar
          titulo="¿Borrar esto?"
          textoSi="Sí, borrar"
          peligroso
          onSi={async () => {
            await borrarRegistro(r.id)
            props.onTerminar()
          }}
          onNo={() => setPreguntarBorrar(false)}
        />
      )}
    </form>
  )
}

const CADA = [6, 12, 24, 36]

function FormularioPropia({ perfil, onTerminar }: { perfil: Perfil; onTerminar: () => void }) {
  const [nombre, setNombre] = useState('')
  const [cada, setCada] = useState('12')
  const [error, setError] = useState('')

  async function guardar(e: FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) return setError('Escribe qué revisión es, por favor.')
    await guardarPropia(perfil, nombre, Number(cada))
    onTerminar()
  }

  return (
    <form className="pila" onSubmit={guardar} noValidate>
      <h2>📌 Una revisión que te ha mandado tu médico</h2>
      <p className="texto-suave" style={{ margin: 0 }}>
        Por ejemplo, el cardiólogo una vez al año o el oculista cada 2 años. La app te avisará cuando toque.
      </p>
      <label className="campo">
        <span>¿Qué revisión?</span>
        <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Cardiólogo, oculista…" />
      </label>
      <Selector
        etiqueta="¿Cada cuánto?"
        opciones={CADA.map((m) => ({ valor: String(m), texto: `Cada ${textoMeses(m)}` }))}
        valor={cada}
        onCambio={setCada}
      />
      {error && <p className="aviso aviso-error">{error}</p>}
      <button type="submit" className="boton">
        Guardar
      </button>
      <button type="button" className="boton boton-secundario" onClick={onTerminar}>
        Cancelar
      </button>
    </form>
  )
}
