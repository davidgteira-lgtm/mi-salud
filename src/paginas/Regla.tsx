// La regla, dentro de Constantes vitales: cuándo empieza y acaba, cómo es,
// cada cuánto viene y cuándo toca la próxima.
import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type FormEvent } from 'react'
import { Confirmar } from '../componentes/Confirmar'
import { Selector } from '../componentes/Selector'
import { borrarCiclo, guardarCiclo, listarCiclos, revisarCiclo, terminarCiclo } from '../db/ciclos'
import type { Ciclo } from '../db/tipos'
import { duracionRegla, resumirCiclos, SINTOMAS_REGLA } from '../utils/ciclos'
import { cuandoFalta, diasEntre, fechaLarga, hoyISO } from '../utils/fechas'

const INTENSIDADES: {
  valor: NonNullable<Ciclo['intensidad']>
  texto: string
}[] = [
  { valor: 'poca', texto: 'Poca' },
  { valor: 'normal', texto: 'Normal' },
  { valor: 'mucha', texto: 'Mucha' },
]

const dias = (n: number) => `${n} ${n === 1 ? 'día' : 'días'}`

/** Lo que se ve en la ficha de arriba. */
export function ResumenFichaRegla({ perfilId }: { perfilId: string }) {
  const ciclos = useLiveQuery(() => listarCiclos(perfilId), [perfilId])
  const r = ciclos && resumirCiclos(ciclos)
  if (!r) return <span className="texto-suave">Sin datos</span>
  return (
    <>
      <span className="ficha-valor">{r.enCurso ? 'Con la regla' : `Día ${r.diaDelCiclo}`}</span>
      <span className="texto-suave" style={{ fontSize: '0.8rem' }}>
        {r.proxima && !r.enCurso ? `Próxima: ${cuandoFalta(r.proxima).toLowerCase()}` : `Empezó ${cuandoFalta(r.ultimo.inicio).toLowerCase()}`}
      </span>
    </>
  )
}

export function SeccionRegla({ perfilId }: { perfilId: string }) {
  const [editando, setEditando] = useState<Ciclo | null>()
  const ciclos = useLiveQuery(() => listarCiclos(perfilId), [perfilId])

  if (editando !== undefined) {
    return <FormularioRegla perfilId={perfilId} ciclo={editando ?? undefined} onTerminar={() => setEditando(undefined)} />
  }
  if (!ciclos) return null
  const r = resumirCiclos(ciclos)
  const hoy = hoyISO()
  const enCursoSinFin = ciclos[0] && !ciclos[0].fin && r?.enCurso ? ciclos[0] : undefined

  return (
    <div className="pila">
      <h2 style={{ marginTop: 8 }}>🌸 Regla</h2>
      <p className="texto-suave" style={{ margin: 0 }}>
        Apunta el día que te viene y el día que se te va. Así podrás ver si algún problema de salud coincide con esos días.
      </p>

      {r && (
        <section className="tarjeta pila" aria-label="Resumen de la regla" style={{ gap: 6 }}>
          {r.enCurso ? (
            <p style={{ margin: 0 }}>
              <strong>Tienes la regla:</strong> hoy es su día {r.diaDelCiclo}.
            </p>
          ) : (
            <p style={{ margin: 0 }}>
              Hoy es el <strong>día {r.diaDelCiclo}</strong> de tu ciclo.
            </p>
          )}
          {r.media ? (
            <p style={{ margin: 0 }}>
              Te viene cada <strong>{dias(r.media)}</strong>, más o menos.
            </p>
          ) : (
            <p className="texto-suave" style={{ margin: 0 }}>
              Cuando apuntes dos reglas, la app calculará cada cuánto te viene.
            </p>
          )}
          {r.proxima && !r.enCurso && (
            <p style={{ margin: 0 }}>
              La próxima, sobre el <strong>{fechaLarga(r.proxima)}</strong> ({cuandoFalta(r.proxima).toLowerCase()}).
            </p>
          )}
          {r.irregular && (
            <p className="aviso" role="status" style={{ margin: 0 }}>
              ⚠️ Tus últimos ciclos cambian bastante de unos a otros. Si te preocupa, coméntaselo a tu médico.
            </p>
          )}
        </section>
      )}

      {enCursoSinFin && (
        <button className="boton" onClick={() => terminarCiclo(enCursoSinFin.id, hoy)}>
          ✓ Se me ha ido hoy
        </button>
      )}
      <button className={enCursoSinFin ? 'boton boton-secundario' : 'boton'} onClick={() => setEditando(null)}>
        ➕ Apuntar regla
      </button>

      {ciclos.length === 0 ? (
        <p className="aviso">Aún no has apuntado ninguna regla.</p>
      ) : (
        <section className="tarjeta" aria-label="Reglas apuntadas">
          {ciclos.map((c, i) => {
            const duracion = duracionRegla(c)
            const anterior = ciclos[i + 1]
            const separacion = anterior ? diasEntre(anterior.inicio, c.inicio) : null
            return (
              <div key={c.id} className="medida">
                <div className="medida-linea">
                  <span className="medida-valores">
                    <strong>{fechaCorta(c.inicio, hoy)}</strong>
                    {c.fin && (
                      <>
                        {' '}
                        <small>al</small> <strong>{fechaCorta(c.fin, hoy)}</strong>
                      </>
                    )}
                  </span>
                  <button className="enlace" onClick={() => setEditando(c)} aria-label={`Cambiar la regla del ${c.inicio}`}>
                    <span className="medida-cambiar-texto">Cambiar</span>
                    <span className="medida-cambiar-icono" aria-hidden="true">
                      ✏️
                    </span>
                  </button>
                </div>
                <div className="medida-linea medida-linea-2">
                  <span className="texto-suave">
                    {duracion ? `Duró ${dias(duracion)}` : 'Sin apuntar cuándo acabó'}
                    {c.intensidad && ` · ${INTENSIDADES.find((x) => x.valor === c.intensidad)?.texto.toLowerCase()}`}
                  </span>
                  {separacion !== null && <span className="texto-suave medida-fecha">{dias(separacion)} desde la anterior</span>}
                </div>
                {(c.sintomas.length > 0 || c.notas) && (
                  <div className="medida-notas">{[c.sintomas.join(', '), c.notas].filter(Boolean).join(' · ')}</div>
                )}
              </div>
            )
          })}
        </section>
      )}

      <p className="texto-suave" style={{ fontSize: '0.85rem' }}>
        Las fechas de la próxima regla son aproximadas. Esto no sirve como método anticonceptivo.
      </p>
    </div>
  )
}

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
function fechaCorta(f: string, hoy: string): string {
  const texto = `${Number(f.slice(8, 10))} ${MESES_CORTOS[Number(f.slice(5, 7)) - 1]}`
  return f.slice(0, 4) === hoy.slice(0, 4) ? texto : `${texto} ${f.slice(0, 4)}`
}

function FormularioRegla(props: { perfilId: string; ciclo?: Ciclo; onTerminar: () => void }) {
  const c = props.ciclo
  const [inicio, setInicio] = useState(c?.inicio ?? hoyISO())
  const [fin, setFin] = useState(c?.fin ?? '')
  const [intensidad, setIntensidad] = useState<Ciclo['intensidad']>(c?.intensidad)
  const [sintomas, setSintomas] = useState<string[]>(c?.sintomas ?? [])
  const [notas, setNotas] = useState(c?.notas ?? '')
  const [error, setError] = useState('')
  const [preguntarBorrar, setPreguntarBorrar] = useState(false)

  async function guardar(e: FormEvent) {
    e.preventDefault()
    const datos = {
      inicio,
      fin: fin || undefined,
      intensidad,
      sintomas,
      notas,
    }
    const problema = revisarCiclo(datos)
    if (problema) return setError(problema)
    await guardarCiclo(props.perfilId, datos, c?.id)
    props.onTerminar()
  }

  return (
    <form className="pila" onSubmit={guardar} noValidate>
      <h2>🌸 {c ? 'Cambiar' : 'Apuntar'} regla</h2>

      <label className="campo">
        <span>¿Qué día te vino?</span>
        <input type="date" value={inicio} max={hoyISO()} onChange={(e) => setInicio(e.target.value)} />
      </label>
      <label className="campo">
        <span>¿Qué día se te fue?</span>
        <small>Si todavía la tienes, déjalo en blanco y apúntalo cuando acabe.</small>
        <input type="date" value={fin} min={inicio} max={hoyISO()} onChange={(e) => setFin(e.target.value)} />
      </label>

      <Selector
        etiqueta="¿Cuánta cantidad?"
        opciones={INTENSIDADES}
        valor={intensidad ?? ('' as NonNullable<Ciclo['intensidad']>)}
        onCambio={(v) => setIntensidad(v === intensidad ? undefined : v)}
      />
      <Selector
        etiqueta="¿Has notado algo?"
        ayuda="Puedes marcar varias cosas."
        opciones={SINTOMAS_REGLA.map((s) => ({ valor: s, texto: s }))}
        valor={sintomas}
        onCambio={(s) => setSintomas((lista) => (lista.includes(s) ? lista.filter((x) => x !== s) : [...lista, s]))}
      />

      <label className="campo">
        <span>Notas (si quieres)</span>
        <input type="text" value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Me tomé un ibuprofeno…" />
      </label>

      {error && <p className="aviso aviso-error">{error}</p>}

      <button type="submit" className="boton">
        Guardar
      </button>
      <button type="button" className="boton boton-secundario" onClick={props.onTerminar}>
        Cancelar
      </button>
      {c && (
        <button type="button" className="boton boton-peligro-suave" onClick={() => setPreguntarBorrar(true)}>
          Borrar esta regla
        </button>
      )}
      {preguntarBorrar && c && (
        <Confirmar
          titulo="¿Borrar esta regla?"
          textoSi="Sí, borrar"
          peligroso
          onSi={async () => {
            await borrarCiclo(c.id)
            props.onTerminar()
          }}
          onNo={() => setPreguntarBorrar(false)}
        />
      )}
    </form>
  )
}
