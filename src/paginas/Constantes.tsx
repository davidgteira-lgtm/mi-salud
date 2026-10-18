import { useSearchParams } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type FormEvent } from 'react'
import { Confirmar } from '../componentes/Confirmar'
import { EtiquetaNivel } from '../componentes/EtiquetaNivel'
import { COLOR_SERIE } from '../componentes/coloresGrafica'
import { Grafica, type SerieGrafica } from '../componentes/Grafica'
import { Selector } from '../componentes/Selector'
import { ResumenFichaRegla, SeccionRegla } from './Regla'
import { CONSTANTES, infoConstante, TENSION_BAJA, tensionEnCentimetros, valorar, zonaNormal } from '../datos/constantes'
import { borrarMedida, guardarMedida, listarMedidas, revisarMedida, textoValor, ultimasMedidas } from '../db/constantes'
import { db } from '../db/db'
import type { Medida, TipoConstante } from '../db/tipos'
import { muestraRegla } from '../utils/ciclos'
import { cuandoFalta, hoyISO } from '../utils/fechas'
import { leerNumero, leerNumeroEntre, type Eleccion } from '../utils/numeros'

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const fechaCorta = (f: string) => `${Number(f.slice(8, 10))} ${MESES_CORTOS[Number(f.slice(5, 7)) - 1]}`

function horaActual(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** Constantes vitales: la última de cada una arriba; gráfica y lista de la elegida. */
export function Constantes({ perfilId }: { perfilId: string }) {
  // Desde el panel «Hoy» se llega con ?tipo=glucosa&nueva=1: se abre directamente el formulario.
  const [parametros] = useSearchParams()
  const pedido = CONSTANTES.find((c) => c.tipo === parametros.get('tipo'))?.tipo
  const [elegido, setTipo] = useState<TipoConstante | 'regla'>(pedido ?? 'tension')
  const perfil = useLiveQuery(() => db.perfiles.get(perfilId), [perfilId])
  const conRegla = muestraRegla(perfil)
  // Si se quita la regla en la ficha de la persona, se vuelve a la tensión.
  const tipo: TipoConstante = elegido === 'regla' ? 'tension' : elegido
  const verRegla = elegido === 'regla' && conRegla
  const [editando, setEditando] = useState<Medida | null | undefined>(pedido && parametros.get('nueva') ? null : undefined)
  const ultimas = useLiveQuery(() => ultimasMedidas(perfilId), [perfilId])
  const medidas = useLiveQuery(() => listarMedidas(perfilId, tipo), [perfilId, tipo])

  if (editando !== undefined) {
    return <FormularioMedida perfilId={perfilId} tipo={tipo} medida={editando ?? undefined} onTerminar={() => setEditando(undefined)} />
  }
  if (!ultimas || !medidas) return null
  const info = infoConstante(tipo)

  // Para la gráfica: las 30 últimas, de la más antigua a la más nueva.
  const recientes = medidas.slice(0, 30).reverse()
  const punto = (m: Medida, v: number) => ({
    momento: `${m.fecha} ${m.hora ?? '12:00'}`,
    etiqueta: fechaCorta(m.fecha),
    valor: v,
  })
  const series: SerieGrafica[] =
    tipo === 'tension'
      ? [
          {
            nombre: 'Alta',
            color: COLOR_SERIE[0],
            puntos: recientes.map((m) => punto(m, m.valor)),
          },
          {
            nombre: 'Baja',
            color: COLOR_SERIE[1],
            puntos: recientes.map((m) => punto(m, m.valor2 ?? 0)),
          },
        ]
      : [
          {
            nombre: info.nombre,
            color: COLOR_SERIE[0],
            puntos: recientes.map((m) => punto(m, m.valor)),
          },
        ]

  return (
    <div className="pila">
      <div className="fichas">
        {CONSTANTES.map((c) => {
          const u = ultimas[c.tipo]
          return (
            <button
              key={c.tipo}
              type="button"
              className="ficha"
              aria-pressed={!verRegla && tipo === c.tipo}
              onClick={() => setTipo(c.tipo)}
            >
              <span className="ficha-nombre">
                {c.icono} {c.nombre}
              </span>
              {u ? (
                <>
                  {c.tipo === 'tension' ? (
                    // Una línea para cada una, con su nombre al lado: "Alta 129" / "Baja 81".
                    <span className="ficha-tension">
                      <span>
                        <small>Alta</small> {u.valor}
                      </span>
                      <span>
                        <small>Baja</small> {u.valor2}
                      </span>
                    </span>
                  ) : (
                    <span className="ficha-valor">
                      {textoValor(u)} <small>{c.tipo === 'pulso' ? 'lpm' : c.unidad}</small>
                    </span>
                  )}
                  <EtiquetaNivel valoracion={valorar(u)} />
                  <span className="texto-suave" style={{ fontSize: '0.8rem' }}>
                    {cuandoFalta(u.fecha)}
                  </span>
                </>
              ) : (
                <span className="texto-suave">Sin datos</span>
              )}
            </button>
          )
        })}
        {conRegla && (
          <button type="button" className="ficha" aria-pressed={verRegla} onClick={() => setTipo('regla')}>
            <span className="ficha-nombre">🌸 Regla</span>
            <ResumenFichaRegla perfilId={perfilId} />
          </button>
        )}
      </div>

      {verRegla ? (
        <SeccionRegla perfilId={perfilId} />
      ) : (
        <>
          <h2 style={{ marginTop: 8 }}>
            {info.icono} {info.nombre}
          </h2>
          <button className="boton" onClick={() => setEditando(null)}>
            ➕ Apuntar {info.nombre.toLowerCase()}
          </button>

          {medidas.length >= 2 && (
            <Grafica
              titulo={`${info.nombre}${info.unidad ? ` (${info.unidad})` : ''}${medidas.length > 30 ? ': últimas 30' : ''}`}
              series={series}
              banda={zonaNormal(tipo)}
              decimales={info.decimales}
            />
          )}

          {medidas.length === 0 ? (
            <p className="aviso">Aún no has apuntado ninguna medida de {info.nombre.toLowerCase()}.</p>
          ) : (
            <section className="tarjeta" aria-label={`Medidas de ${info.nombre.toLowerCase()}`}>
              {medidas.map((m) => (
                // Línea 1: los valores (siempre en una línea) y "Cambiar". Línea 2: la valoración y la fecha.
                <div key={m.id} className="medida">
                  <div className="medida-linea">
                    <span className="medida-valores">
                      {m.tipo === 'tension' ? (
                        <>
                          <small>Alta</small> <strong>{m.valor}</strong> <small>· Baja</small> <strong>{m.valor2}</strong>
                          {m.pulso !== undefined && (
                            <>
                              {' '}
                              <small>· Pulso</small> <strong className="medida-secundario">{m.pulso}</strong>
                            </>
                          )}
                        </>
                      ) : (
                        <>
                          <strong>{textoValor(m)}</strong> <small>{info.unidad === 'latidos por minuto' ? 'lpm' : info.unidad}</small>
                        </>
                      )}
                    </span>
                    <button
                      className="enlace"
                      onClick={async () => {
                        // Un pulso apuntado con la tensión se cambia desde su tensión.
                        if (m.deTension) {
                          const original = await db.constantes.get(m.id)
                          setTipo('tension')
                          setEditando(original ?? null)
                        } else setEditando(m)
                      }}
                      aria-label={`Cambiar la medida del ${m.fecha}`}
                    >
                      {/* En móviles muy estrechos solo se ve el lápiz, para que todo quepa en una línea. */}
                      <span className="medida-cambiar-texto">Cambiar</span>
                      <span className="medida-cambiar-icono" aria-hidden="true">
                        ✏️
                      </span>
                    </button>
                  </div>
                  <div className="medida-linea medida-linea-2">
                    <EtiquetaNivel valoracion={valorar(m)} />
                    <span className="texto-suave medida-fecha">
                      {fechaCorta(m.fecha)}
                      {m.fecha.slice(0, 4) !== hoyISO().slice(0, 4) && ` ${m.fecha.slice(0, 4)}`}
                      {m.hora && `, ${m.hora}`}
                      {m.momento === 'ayunas' && ' · en ayunas'}
                      {m.momento === 'despues-comer' && ' · después de comer'}
                      {m.deTension && ' · con la tensión'}
                    </span>
                  </div>
                  {m.notas && <div className="medida-notas">{m.notas}</div>}
                </div>
              ))}
            </section>
          )}

          <p className="texto-suave" style={{ fontSize: '0.85rem' }}>
            Lo de «normal» o «alta» es orientativo. Tu médico puede haberte dado otros objetivos: hazle caso a él.
          </p>
        </>
      )}
    </div>
  )
}

function FormularioMedida(props: { perfilId: string; tipo: TipoConstante; medida?: Medida; onTerminar: () => void }) {
  const m = props.medida
  const info = infoConstante(props.tipo)
  const [valor, setValor] = useState(m ? String(m.valor).replace('.', ',') : '')
  const [valor2, setValor2] = useState(m?.valor2 ? String(m.valor2) : '')
  const [pulso, setPulso] = useState(m?.pulso ? String(m.pulso) : '')
  const [momento, setMomento] = useState<NonNullable<Medida['momento']>>(m?.momento ?? 'ayunas')
  const [fecha, setFecha] = useState(m?.fecha ?? hoyISO())
  const [hora, setHora] = useState(() => m?.hora ?? horaActual())
  const [notas, setNotas] = useState(m?.notas ?? '')
  const [error, setError] = useState('')
  const [preguntarBorrar, setPreguntarBorrar] = useState(false)

  const esTension = props.tipo === 'tension'
  const lectura = valor.trim() ? leerNumeroEntre(valor, info.minimo, info.maximo, info.queEs) : null
  const lectura2 = esTension && valor2.trim() ? leerNumeroEntre(valor2, TENSION_BAJA.minimo, TENSION_BAJA.maximo, 'una tensión baja') : null
  const lecturaPulso = esTension && pulso.trim() ? leerNumeroEntre(pulso, 25, 250, 'un pulso') : null
  const valoracion =
    lectura?.ok && (!esTension || lectura2?.ok)
      ? valorar({
          tipo: props.tipo,
          valor: lectura.valor,
          valor2: lectura2?.ok ? lectura2.valor : undefined,
          momento,
        })
      : null

  async function guardar(e: FormEvent) {
    e.preventDefault()
    for (const l of [lectura, lectura2, lecturaPulso]) {
      if (l && !l.ok) return setError(l.error)
    }
    if (!lectura?.ok) return setError(esTension ? 'Escribe la tensión alta, por favor.' : 'Escribe el valor, por favor.')
    const datos = {
      tipo: props.tipo,
      fecha,
      hora,
      valor: lectura.valor,
      valor2: lectura2?.ok ? lectura2.valor : undefined,
      pulso: lecturaPulso?.ok ? lecturaPulso.valor : undefined,
      momento: props.tipo === 'glucosa' ? momento : undefined,
      notas,
    }
    const problema = revisarMedida(datos)
    if (problema) return setError(problema)
    await guardarMedida(props.perfilId, datos, m?.id)
    props.onTerminar()
  }

  /** Si el número es ambiguo, botones para elegir. */
  const elegir = (l: Eleccion | null, poner: (v: string) => void) =>
    l && !l.ok && 'opciones' in l ? (
      <div className="sugerencias">
        {l.opciones.map((o) => (
          <button key={o} type="button" className="opcion" onClick={() => poner(String(o).replace('.', ','))}>
            {String(o).replace('.', ',')}
          </button>
        ))}
      </div>
    ) : null

  /** "13" de alta o "8" de baja: dicho en centímetros. Devuelve 130 / 80, o null. */
  const propuestaCm = (l: Eleccion | null, texto: string, cual: 'alta' | 'baja') => {
    if (!esTension || !l || l.ok || 'opciones' in l) return null
    const escrito = leerNumero(texto)
    return escrito.ok ? tensionEnCentimetros(escrito.valor, cual) : null
  }
  const pareceCentimetros = propuestaCm(lectura, valor, 'alta') !== null || propuestaCm(lectura2, valor2, 'baja') !== null

  /** Botón para pasar de centímetros a lo que marca el aparato. */
  const enCentimetros = (l: Eleccion | null, texto: string, cual: 'alta' | 'baja', poner: (v: string) => void) => {
    const propuesta = propuestaCm(l, texto, cual)
    if (propuesta === null) return null
    return (
      <button type="button" className="boton boton-secundario" onClick={() => poner(String(propuesta))}>
        ¿Quieres decir {cual} {propuesta}? (dicho en centímetros)
      </button>
    )
  }

  return (
    <form className="pila" onSubmit={guardar} noValidate>
      <h2>
        {info.icono} {m ? 'Cambiar' : 'Apuntar'} {info.nombre.toLowerCase()}
      </h2>

      {esTension ? (
        <>
          <p className="texto-suave" style={{ margin: 0 }}>
            El aparato da dos números: el de arriba es la alta y el de abajo la baja.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label className="campo">
              <span>Alta</span>
              <input type="text" inputMode="numeric" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="120" />
            </label>
            <label className="campo">
              <span>Baja</span>
              <input type="text" inputMode="numeric" value={valor2} onChange={(e) => setValor2(e.target.value)} placeholder="80" />
            </label>
          </div>
          {elegir(lectura, setValor)}
          {elegir(lectura2, setValor2)}
          {enCentimetros(lectura, valor, 'alta', setValor)}
          {enCentimetros(lectura2, valor2, 'baja', setValor2)}
          <label className="campo">
            <span>Pulso (si lo da el aparato)</span>
            <input type="text" inputMode="numeric" value={pulso} onChange={(e) => setPulso(e.target.value)} placeholder="70" />
          </label>
        </>
      ) : (
        <>
          <label className="campo">
            <span>
              {info.nombre}
              {info.unidad && ` (${info.unidad})`}
            </span>
            <input type="text" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} />
          </label>
          {elegir(lectura, setValor)}
        </>
      )}

      {props.tipo === 'glucosa' && (
        <Selector
          etiqueta="¿Cuándo te lo has medido?"
          opciones={[
            { valor: 'ayunas', texto: 'En ayunas' },
            { valor: 'despues-comer', texto: 'Después de comer' },
            { valor: 'otro', texto: 'Otro momento' },
          ]}
          valor={momento}
          onCambio={setMomento}
        />
      )}

      {/* Lo que la app ha entendido, para comprobarlo antes de guardar */}
      {(lectura || lectura2) && (
        <div
          className={lectura?.ok && (!esTension || lectura2?.ok) ? 'aviso aviso-ok' : pareceCentimetros ? 'aviso' : 'aviso aviso-error'}
          role="status"
          style={{ margin: 0 }}
        >
          {pareceCentimetros ? (
            'Parece que lo has escrito en centímetros (como «13 y 8»). Pulsa los botones de arriba para pasarlo a lo que marca el aparato.'
          ) : lectura && !lectura.ok ? (
            lectura.error
          ) : lectura2 && !lectura2.ok ? (
            lectura2.error
          ) : lectura?.ok ? (
            <>
              Entendido:{' '}
              <strong>
                {esTension
                  ? `Alta ${lectura.valor} · Baja ${lectura2?.ok ? lectura2.valor : '…'}`
                  : String(lectura.valor).replace('.', ',')}
              </strong>{' '}
              {info.unidad} <EtiquetaNivel valoracion={valoracion} />
              {valoracion?.consejo && <div style={{ marginTop: 6 }}>{valoracion.consejo}</div>}
            </>
          ) : null}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 12 }}>
        <label className="campo">
          <span>Fecha</span>
          <input type="date" value={fecha} max={hoyISO()} onChange={(e) => setFecha(e.target.value)} />
        </label>
        <label className="campo">
          <span>Hora</span>
          <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
        </label>
      </div>

      <label className="campo">
        <span>Notas (si quieres)</span>
        <input type="text" value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Me notaba mareada, después de caminar…" />
      </label>

      {error && <p className="aviso aviso-error">{error}</p>}

      <button type="submit" className="boton">
        Guardar
      </button>
      <button type="button" className="boton boton-secundario" onClick={props.onTerminar}>
        Cancelar
      </button>
      {m && (
        <button type="button" className="boton boton-peligro-suave" onClick={() => setPreguntarBorrar(true)}>
          Borrar esta medida
        </button>
      )}
      {preguntarBorrar && m && (
        <Confirmar
          titulo="¿Borrar esta medida?"
          textoSi="Sí, borrar"
          peligroso
          onSi={async () => {
            await borrarMedida(m.id)
            props.onTerminar()
          }}
          onNo={() => setPreguntarBorrar(false)}
        />
      )}
    </form>
  )
}
