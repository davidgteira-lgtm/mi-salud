import { db } from '../db/db'
import { pideNuevo, tomarArchivo } from '../componentes/archivoEntrante'
import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type FormEvent } from 'react'
import { EditorAdjuntos, VerAdjuntos } from '../componentes/Adjuntos'
import { Confirmar } from '../componentes/Confirmar'
import { Odontograma } from '../componentes/Odontograma'
import { ESTADOS_DIENTE, infoTipoDental, nombreDiente, TIPOS_DENTAL } from '../datos/dientes'
import { guardarAdjuntos, type AdjuntoNuevo } from '../db/adjuntos'
import {
  borrarDental,
  dentistasUsados,
  llevaFactura,
  euros,
  gastoDental,
  leerImporte,
  estadoDeLosDientes,
  guardarDental,
  historiaDelDiente,
  listarDental,
  revisarDental,
  ultimaRevision,
} from '../db/dental'
import { agruparPorAno } from '../db/historial'
import type { TipoDental, TratamientoDental } from '../db/tipos'
import { fechaLarga, hoyISO, mesYAno } from '../utils/fechas'
import { normalizar } from '../utils/texto'

/** Salud dental: el dibujo de la boca, lo que tiene cada diente y todo lo que te han hecho. */
export function Dental({ perfilId }: { perfilId: string }) {
  const [editando, setEditando] = useState<{ tratamiento?: TratamientoDental; dientes?: number[] } | undefined>(() =>
    pideNuevo() ? {} : undefined,
  )
  const [diente, setDiente] = useState<number>()
  const lista = useLiveQuery(() => listarDental(perfilId), [perfilId])

  if (!lista) return null
  if (editando) {
    return (
      <FormularioDental
        perfilId={perfilId}
        tratamiento={editando.tratamiento}
        dientesIniciales={editando.dientes}
        anteriores={lista}
        onTerminar={() => setEditando(undefined)}
      />
    )
  }

  const estados = estadoDeLosDientes(lista)
  const revision = ultimaRevision(lista)
  const gasto = gastoDental(lista, Number(hoyISO().slice(0, 4)))
  const caries = [...estados.values()].filter((e) => e === 'caries').length
  const historia = diente ? historiaDelDiente(lista, diente) : []

  return (
    <div className="pila">
      {caries > 0 && (
        <p className="aviso" role="status">
          ⚠️ Tienes {caries === 1 ? '1 caries por arreglar' : `${caries} caries por arreglar`}. Cuanto antes se arregle, mejor.
        </p>
      )}
      {revision?.haceMasDeUnAno && (
        <p className="aviso">
          Tu última revisión fue en {mesYAno(revision.fecha)}, hace más de un año. Lo normal es ir al dentista una vez al año.
        </p>
      )}

      <p className="texto-suave" style={{ margin: 0 }}>
        Toca un diente para ver lo que tiene y lo que te han hecho en él.
      </p>
      <Odontograma estados={estados} marcados={diente ? [diente] : []} onTocar={(n) => setDiente(n === diente ? undefined : n)} />

      {diente && (
        <section className="tarjeta pila" aria-label="El diente elegido" style={{ gap: 8 }} role="status">
          <strong style={{ fontSize: '1.2rem' }}>{nombreDiente(diente)}</strong>
          <span className="texto-suave">
            Número {diente} en los papeles del dentista · {ESTADOS_DIENTE[estados.get(diente) ?? 'sano'].texto}
          </span>
          {historia.length === 0 ? (
            <span>No tienes nada apuntado en este diente.</span>
          ) : (
            <ul className="dientes-elegidos">
              {historia.map((t) => (
                <li key={t.id}>
                  {infoTipoDental(t.tipo).texto} · {fechaLarga(t.fecha)}
                  {t.importe !== undefined && ` · ${euros(t.importe)}`}
                  {/* La factura y los documentos de ese tratamiento, aquí mismo. */}
                  <VerAdjuntos registroId={t.id} />
                </li>
              ))}
            </ul>
          )}
          <button className="boton" onClick={() => setEditando({ dientes: [diente] })}>
            ➕ Apuntar algo en este diente
          </button>
          <button className="enlace" onClick={() => setDiente(undefined)}>
            Cerrar
          </button>
        </section>
      )}

      <button className="boton" onClick={() => setEditando({})}>
        ➕ Apuntar visita al dentista
      </button>

      {lista.length === 0 ? (
        <p className="aviso">
          Aún no has apuntado nada. Empieza por lo que ya tienes: empastes, fundas, dientes que te faltan… No hace falta que sepas la fecha
          exacta.
        </p>
      ) : (
        <>
          <h2 style={{ marginBottom: 0 }}>Lo que te han hecho</h2>
          {gasto.total > 0 && (
            <p style={{ margin: 0 }}>
              💶 Llevas pagado <strong>{euros(gasto.total)}</strong> en el dentista
              {gasto.ano > 0 && ` (este año, ${euros(gasto.ano)})`}.
            </p>
          )}
          {revision && !revision.haceMasDeUnAno && (
            <p className="texto-suave" style={{ margin: 0 }}>
              Última revisión: {fechaLarga(revision.fecha)}.
            </p>
          )}
          {agruparPorAno(lista).map(([ano, tratamientos]) => (
            <section key={ano} className="pila">
              <h3 className="titulo-ano">{ano}</h3>
              {tratamientos.map((t) => (
                <TarjetaDental key={t.id} tratamiento={t} onCambiar={() => setEditando({ tratamiento: t })} />
              ))}
            </section>
          ))}
        </>
      )}
    </div>
  )
}

function TarjetaDental({ tratamiento: t, onCambiar }: { tratamiento: TratamientoDental; onCambiar: () => void }) {
  const info = infoTipoDental(t.tipo)
  const conFactura = llevaFactura(t.tipo)
  const archivos = useLiveQuery(() => db.adjuntos.where('registroId').equals(t.id).count(), [t.id])
  return (
    <article className="tarjeta pila" style={{ gap: 6 }}>
      <strong style={{ fontSize: '1.2rem' }}>
        {info.icono} {info.texto}
      </strong>
      <span className="texto-suave">{fechaLarga(t.fecha)}</span>
      {t.dientes.length > 0 ? (
        <ul className="dientes-elegidos">
          {t.dientes.map((n) => (
            <li key={n}>{nombreDiente(n)}</li>
          ))}
        </ul>
      ) : (
        info.boca && <span>Toda la boca</span>
      )}
      {t.dentista && <span>📍 {t.dentista}</span>}
      {t.importe !== undefined && <span>💶 {euros(t.importe)}</span>}
      {t.notas && <p style={{ margin: 0, whiteSpace: 'pre-line' }}>{t.notas}</p>}
      <VerAdjuntos registroId={t.id} titulo={conFactura ? 'Factura y documentos' : 'Documentos'} />
      {conFactura && archivos === 0 && (
        <button className="boton boton-secundario" onClick={onCambiar}>
          🧾 Subir la factura
        </button>
      )}
      <button className="enlace" onClick={onCambiar}>
        Cambiar o borrar
      </button>
    </article>
  )
}

function FormularioDental(props: {
  perfilId: string
  tratamiento?: TratamientoDental
  dientesIniciales?: number[]
  anteriores: TratamientoDental[]
  onTerminar: () => void
}) {
  const t = props.tratamiento
  const [tipo, setTipo] = useState<TipoDental | undefined>(t?.tipo)
  const [dientes, setDientes] = useState<number[]>(t?.dientes ?? props.dientesIniciales ?? [])
  const [fecha, setFecha] = useState(t?.fecha ?? hoyISO())
  const [dentista, setDentista] = useState(t?.dentista ?? '')
  const [notas, setNotas] = useState(t?.notas ?? '')
  const [importe, setImporte] = useState(t?.importe !== undefined ? String(t.importe).replace('.', ',') : '')
  const [pendientes, setPendientes] = useState<AdjuntoNuevo[]>(tomarArchivo)
  const [error, setError] = useState('')
  const [preguntarBorrar, setPreguntarBorrar] = useState(false)

  const info = tipo ? infoTipoDental(tipo) : undefined
  // El dibujo del formulario enseña cómo está la boca sin contar lo que se está cambiando.
  const estados = estadoDeLosDientes(props.anteriores.filter((x) => x.id !== t?.id))
  const sugerencias = dentistasUsados(props.anteriores)
    .filter((d) => d !== dentista && (!dentista || normalizar(d).includes(normalizar(dentista))))
    .slice(0, 3)

  const tocar = (n: number) => setDientes((l) => (l.includes(n) ? l.filter((x) => x !== n) : [...l, n].sort((a, b) => a - b)))

  async function guardar(e: FormEvent) {
    e.preventDefault()
    if (!tipo) return setError('Elige qué te hicieron, por favor.')
    const cantidad = leerImporte(importe)
    if (cantidad !== null && Number.isNaN(cantidad)) return setError('No entiendo el importe. Escríbelo así: 85 o 1.200,50.')
    const datos = { fecha, tipo, dientes, dentista, notas, importe: cantidad ?? undefined }
    const problema = revisarDental(datos)
    if (problema) return setError(problema)
    const id = await guardarDental(props.perfilId, datos, t?.id)
    await guardarAdjuntos(props.perfilId, id, pendientes)
    props.onTerminar()
  }

  return (
    <form className="pila" onSubmit={guardar} noValidate>
      <h2>🦷 {t ? 'Cambiar' : 'Apuntar'} en la boca</h2>

      <fieldset className="campo" style={{ border: 0, padding: 0, margin: 0 }}>
        <span>¿Qué te hicieron?</span>
        <div className="opciones">
          {TIPOS_DENTAL.map((x) => (
            <button key={x.valor} type="button" className="opcion" aria-pressed={tipo === x.valor} onClick={() => setTipo(x.valor)}>
              {x.icono} {x.texto}
            </button>
          ))}
        </div>
      </fieldset>

      {info && !info.boca && (
        <div className="pila" style={{ gap: 8 }}>
          <strong>¿En qué dientes?</strong>
          <span className="texto-suave">
            Toca los dientes en el dibujo. Si no lo sabes seguro, marca el que más se parezca.
            {info.valor === 'otro' && ' Si es para toda la boca, no marques ninguno.'}
          </span>
          <Odontograma estados={estados} marcados={dientes} onTocar={tocar} />
          {dientes.length > 0 && (
            <div role="status">
              <strong>{dientes.length === 1 ? 'Has elegido:' : `Has elegido ${dientes.length} dientes:`}</strong>
              <ul className="dientes-elegidos">
                {dientes.map((n) => (
                  <li key={n}>
                    {nombreDiente(n)}{' '}
                    <button type="button" className="enlace" onClick={() => tocar(n)} aria-label={`Quitar ${nombreDiente(n)}`}>
                      Quitar
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <label className="campo">
        <span>Fecha</span>
        <small>Si no te acuerdas del día, pon uno aproximado.</small>
        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
      </label>

      <label className="campo">
        <span>Dentista o clínica (si quieres)</span>
        <input type="text" value={dentista} onChange={(e) => setDentista(e.target.value)} placeholder="Clínica dental, Dr. Pérez…" />
      </label>
      {sugerencias.length > 0 && (
        <div className="sugerencias">
          {sugerencias.map((s) => (
            <button key={s} type="button" className="opcion" onClick={() => setDentista(s)}>
              📍 {s}
            </button>
          ))}
        </div>
      )}

      <label className="campo">
        <span>Notas (si quieres)</span>
        <textarea
          rows={3}
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          placeholder="Me dolía al masticar, presupuesto, próxima cita…"
        />
      </label>

      <label className="campo">
        <span>¿Cuánto pagaste? (si quieres)</span>
        <small>En euros. Te sirve para comparar con otro dentista y saber lo que llevas gastado.</small>
        <input type="text" inputMode="decimal" value={importe} onChange={(e) => setImporte(e.target.value)} placeholder="85,00" />
      </label>

      <EditorAdjuntos
        registroId={t?.id}
        pendientes={pendientes}
        onPendientes={setPendientes}
        titulo="Factura, presupuesto y radiografías"
        ayuda="Sube aquí la factura de lo que pagaste (foto o PDF), el presupuesto o las radiografías."
      />

      {error && <p className="aviso aviso-error">{error}</p>}

      <button type="submit" className="boton">
        Guardar
      </button>
      <button type="button" className="boton boton-secundario" onClick={props.onTerminar}>
        Cancelar
      </button>
      {t && (
        <button type="button" className="boton boton-peligro-suave" onClick={() => setPreguntarBorrar(true)}>
          Borrar
        </button>
      )}
      {preguntarBorrar && t && (
        <Confirmar
          titulo="¿Borrar esto?"
          textoSi="Sí, borrar"
          peligroso
          onSi={async () => {
            await borrarDental(t.id)
            props.onTerminar()
          }}
          onNo={() => setPreguntarBorrar(false)}
        />
      )}
    </form>
  )
}
