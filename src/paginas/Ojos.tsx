// Salud ocular: la graduación de cada ojo, explicada, y cómo va cambiando.
import { pideNuevo, tomarArchivo } from '../componentes/archivoEntrante'
import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type FormEvent } from 'react'
import { EditorAdjuntos, VerAdjuntos } from '../componentes/Adjuntos'
import { COLOR_SERIE } from '../componentes/coloresGrafica'
import { Confirmar } from '../componentes/Confirmar'
import { Grafica, type SerieGrafica } from '../componentes/Grafica'
import { Selector } from '../componentes/Selector'
import { guardarAdjuntos, type AdjuntoNuevo } from '../db/adjuntos'
import {
  borrarOcular,
  CAMPOS_OJO,
  dioptrias,
  explicarOjo,
  guardarOcular,
  listarOcular,
  PRESION_NORMAL,
  presionAlta,
  revisarOcular,
  TIPOS_OCULAR,
} from '../db/ojos'
import type { GraduacionOjo, RevisionOcular } from '../db/tipos'
import { fechaLarga, hoyISO } from '../utils/fechas'
import { leerNumero } from '../utils/numeros'
import { leerRecetaGafas } from '../utils/leerDocumentos'
import { textoLectura, useLecturaPdf } from '../componentes/useLecturaPdf'

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const etiqueta = (f: string) => `${MESES[Number(f.slice(5, 7)) - 1]} ${f.slice(2, 4)}`
const OJOS = [
  { clave: 'derecho', nombre: 'Ojo derecho', corto: 'OD' },
  { clave: 'izquierdo', nombre: 'Ojo izquierdo', corto: 'OI' },
] as const

/** Un valor del ojo, como se escribe en las recetas. */
function valorTexto(clave: keyof GraduacionOjo, v: number): string {
  if (clave === 'esfera' || clave === 'cilindro' || clave === 'adicion') return dioptrias(v)
  if (clave === 'eje') return `${v}°`
  return String(v).replace('.', ',')
}

export function Ojos({ perfilId }: { perfilId: string }) {
  const [editando, setEditando] = useState<RevisionOcular | null | undefined>(() => (pideNuevo() ? null : undefined))
  const lista = useLiveQuery(() => listarOcular(perfilId), [perfilId])
  if (editando !== undefined) {
    return <FormularioOcular perfilId={perfilId} revision={editando ?? undefined} onTerminar={() => setEditando(undefined)} />
  }
  if (!lista) return null
  const ultima = lista[0]
  const antiguas = [...lista].reverse()

  /** Una línea por ojo con el valor elegido, en las revisiones que lo tengan. */
  const series = (clave: keyof GraduacionOjo): SerieGrafica[] =>
    OJOS.map((o, i) => ({
      nombre: o.nombre,
      color: COLOR_SERIE[i],
      puntos: antiguas
        .filter((r) => r[o.clave][clave] !== undefined)
        .map((r) => ({ momento: r.fecha, etiqueta: etiqueta(r.fecha), valor: r[o.clave][clave]! })),
    })).filter((s) => s.puntos.length > 0)
  const conVarias = (clave: keyof GraduacionOjo) => series(clave).some((s) => s.puntos.length >= 2)

  return (
    <div className="pila">
      {ultima && presionAlta(ultima) && (
        <p className="aviso" role="status">
          ⚠️ En la última revisión la presión del ojo estaba por encima de {PRESION_NORMAL.max}. Coméntaselo al oftalmólogo: hay que vigilar el
          glaucoma.
        </p>
      )}

      {ultima ? (
        <section className="tarjeta pila" aria-label="Tu graduación" style={{ gap: 10 }}>
          <h2 style={{ margin: 0 }}>👓 Tu graduación</h2>
          <span className="texto-suave">
            Del {fechaLarga(ultima.fecha)}
            {ultima.donde && ` · ${ultima.donde}`}
          </span>
          {OJOS.map((o) => {
            const g = ultima[o.clave]
            const valores = CAMPOS_OJO.filter((c) => g[c.clave] !== undefined)
            return (
              <div key={o.clave} className="ojo">
                <strong>
                  {o.nombre} ({o.corto})
                </strong>
                {explicarOjo(g) && <span>{explicarOjo(g)}</span>}
                {valores.length > 0 && (
                  <div className="ojo-valores">
                    {valores.map((c) => (
                      <span key={c.clave}>
                        <small>{c.nombre.replace(/ \(.*\)/, '')}</small> {valorTexto(c.clave, g[c.clave]!)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
          {ultima.diagnostico && <span>🩺 {ultima.diagnostico}</span>}
        </section>
      ) : (
        <p className="aviso">
          Aún no has apuntado ninguna revisión de la vista. Ten a mano la receta de las gafas o el informe del oftalmólogo: ahí vienen los
          números.
        </p>
      )}

      <button className="boton" onClick={() => setEditando(null)}>
        ➕ Apuntar revisión de la vista
      </button>

      {conVarias('esfera') && (
        <Grafica titulo="Graduación (esfera): por debajo de 0 es miopía; por encima, hipermetropía" series={series('esfera')} decimales={2} />
      )}
      {conVarias('cilindro') && <Grafica titulo="Astigmatismo (cilindro)" series={series('cilindro')} decimales={2} />}
      {conVarias('adicion') && <Grafica titulo="Vista cansada (adición)" series={series('adicion')} decimales={2} />}
      {conVarias('presion') && <Grafica titulo="Presión del ojo (mmHg)" series={series('presion')} banda={PRESION_NORMAL} decimales={0} />}

      {lista.length > 0 && <h2 style={{ marginBottom: 0 }}>Todas las revisiones</h2>}
      {lista.map((r) => {
        const tipo = TIPOS_OCULAR.find((t) => t.valor === r.tipo)
        return (
          <article key={r.id} className="tarjeta pila" style={{ gap: 6 }}>
            <strong style={{ fontSize: '1.15rem' }}>
              {tipo?.icono} {tipo?.texto} · {fechaLarga(r.fecha)}
            </strong>
            {r.donde && <span className="texto-suave">📍 {r.donde}</span>}
            {OJOS.map((o) => {
              const g = r[o.clave]
              const v = CAMPOS_OJO.filter((c) => c.clave !== 'agudeza' && c.clave !== 'presion' && g[c.clave] !== undefined)
              return v.length > 0 ? (
                <span key={o.clave}>
                  <strong>{o.corto}</strong> {v.map((c) => valorTexto(c.clave, g[c.clave]!)).join('  ')}
                  {g.presion !== undefined && <span className="texto-suave"> · presión {g.presion}</span>}
                </span>
              ) : null
            })}
            {r.diagnostico && <span>🩺 {r.diagnostico}</span>}
            {r.notas && <p style={{ margin: 0, whiteSpace: 'pre-line' }}>{r.notas}</p>}
            <VerAdjuntos registroId={r.id} />
            <button className="enlace" onClick={() => setEditando(r)}>
              Cambiar o borrar
            </button>
          </article>
        )
      })}

      <p className="texto-suave" style={{ fontSize: '0.85rem' }}>
        OD es el ojo derecho y OI el izquierdo. Las cifras son las de la receta: es orientativo, quien te las explica bien es tu óptico u
        oftalmólogo.
      </p>
    </div>
  )
}

type Textos = Record<keyof GraduacionOjo, string>
const VACIO: Textos = { esfera: '', cilindro: '', eje: '', adicion: '', agudeza: '', presion: '' }
const aTextos = (g?: GraduacionOjo): Textos =>
  Object.fromEntries(
    CAMPOS_OJO.map((c) => [c.clave, g?.[c.clave] === undefined ? '' : String(g[c.clave]).replace('.', ',')]),
  ) as Textos

/** Lee lo escrito en un ojo. Acepta «−2,25», «-2.25», «+1,5»… */
function leerOjo(t: Textos, cual: string): GraduacionOjo | string {
  const g: GraduacionOjo = {}
  for (const c of CAMPOS_OJO) {
    const texto = t[c.clave].trim().replace(/[−–]/g, '-').replace(/^\+/, '').replace('°', '')
    if (!texto) continue
    const l = leerNumero(texto)
    if (!l.ok) return `${c.nombre} del ojo ${cual}: ${l.error}`
    g[c.clave] = l.valor
  }
  return g
}

function FormularioOcular(props: { perfilId: string; revision?: RevisionOcular; onTerminar: () => void }) {
  const r = props.revision
  const [fecha, setFecha] = useState(r?.fecha ?? hoyISO())
  const [tipo, setTipo] = useState<RevisionOcular['tipo']>(r?.tipo ?? 'gafas')
  const [donde, setDonde] = useState(r?.donde ?? '')
  const [ojos, setOjos] = useState<{ derecho: Textos; izquierdo: Textos }>({
    derecho: r ? aTextos(r.derecho) : { ...VACIO },
    izquierdo: r ? aTextos(r.izquierdo) : { ...VACIO },
  })
  const [diagnostico, setDiagnostico] = useState(r?.diagnostico ?? '')
  const [notas, setNotas] = useState(r?.notas ?? '')
  const [pendientes, setPendientes] = useState<AdjuntoNuevo[]>(tomarArchivo)
  const [error, setError] = useState('')
  const [preguntarBorrar, setPreguntarBorrar] = useState(false)

  // Con el PDF de la receta, se rellenan los números (sin IA). Solo lo que esté en blanco, para no pisar lo escrito.
  const lectura = useLecturaPdf(pendientes, leerRecetaGafas, (l) => {
    if (!r && l.fecha) setFecha(l.fecha)
    if (!r && l.tipo) setTipo(l.tipo)
    if (l.donde) setDonde((d) => d || l.donde!)
    if (l.notas) setNotas((n) => n || l.notas!)
    setOjos((x) => ({
      derecho: { ...x.derecho, ...Object.fromEntries(Object.entries(l.derecho).filter(([k]) => !x.derecho[k as keyof Textos])) },
      izquierdo: { ...x.izquierdo, ...Object.fromEntries(Object.entries(l.izquierdo).filter(([k]) => !x.izquierdo[k as keyof Textos])) },
    }))
    return '📄 He leído la receta y he copiado los números. Revísalos con el papel antes de guardar.'
  })
  const avisoLectura = textoLectura(lectura)

  async function guardar(e: FormEvent) {
    e.preventDefault()
    const derecho = leerOjo(ojos.derecho, 'derecho')
    if (typeof derecho === 'string') return setError(derecho)
    const izquierdo = leerOjo(ojos.izquierdo, 'izquierdo')
    if (typeof izquierdo === 'string') return setError(izquierdo)
    const datos = { fecha, tipo, donde, derecho, izquierdo, diagnostico, notas }
    const problema = revisarOcular(datos)
    if (problema) return setError(problema)
    const id = await guardarOcular(props.perfilId, datos, r?.id)
    await guardarAdjuntos(props.perfilId, id, pendientes)
    props.onTerminar()
  }

  return (
    <form className="pila" onSubmit={guardar} noValidate>
      <h2>👁️ {r ? 'Cambiar revisión de la vista' : 'Revisión de la vista'}</h2>
      <p className="texto-suave" style={{ margin: 0 }}>
        Copia los números de la receta de las gafas o del informe. Deja en blanco lo que no venga. Si tienes la receta en PDF, adjúntala abajo
        y la app copia los números por ti.
      </p>
      {avisoLectura && (
        <p className={avisoLectura.clase} role="status" style={{ margin: 0 }}>
          {avisoLectura.texto}
        </p>
      )}

      <label className="campo">
        <span>Fecha</span>
        <input type="date" value={fecha} max={hoyISO()} onChange={(e) => setFecha(e.target.value)} />
      </label>
      <Selector etiqueta="¿Qué es?" opciones={TIPOS_OCULAR.map((t) => ({ valor: t.valor, texto: `${t.icono} ${t.texto}` }))} valor={tipo} onCambio={setTipo} />
      <label className="campo">
        <span>Óptica u oftalmólogo (si quieres)</span>
        <input type="text" value={donde} onChange={(e) => setDonde(e.target.value)} />
      </label>

      {OJOS.map((o) => (
        <fieldset key={o.clave} className="tarjeta pila" style={{ gap: 8 }} aria-label={o.nombre}>
          <strong>
            {o.nombre} ({o.corto})
          </strong>
          <div className="ojo-campos">
            {CAMPOS_OJO.map((c) => (
              <label key={c.clave} className="campo">
                <span>{c.nombre}</span>
                <small>{c.ayuda}</small>
                <input
                  type="text"
                  inputMode="decimal"
                  value={ojos[o.clave][c.clave]}
                  onChange={(e) => setOjos((x) => ({ ...x, [o.clave]: { ...x[o.clave], [c.clave]: e.target.value } }))}
                />
              </label>
            ))}
          </div>
        </fieldset>
      ))}

      <label className="campo">
        <span>Qué te dijeron (si quieres)</span>
        <input type="text" value={diagnostico} onChange={(e) => setDiagnostico(e.target.value)} placeholder="Principio de cataratas, todo bien…" />
      </label>
      <label className="campo">
        <span>Notas (si quieres)</span>
        <textarea rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} />
      </label>

      <EditorAdjuntos
        registroId={r?.id}
        pendientes={pendientes}
        onPendientes={setPendientes}
        ayuda="Por ejemplo, la receta de las gafas (si es un PDF, la app copia los números) o el informe del oftalmólogo."
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
      {r && (
        <button type="button" className="boton boton-peligro-suave" onClick={() => setPreguntarBorrar(true)}>
          Borrar esta revisión
        </button>
      )}
      {preguntarBorrar && r && (
        <Confirmar
          titulo="¿Borrar esta revisión?"
          textoSi="Sí, borrar"
          peligroso
          onSi={async () => {
            await borrarOcular(r.id)
            props.onTerminar()
          }}
          onNo={() => setPreguntarBorrar(false)}
        />
      )}
    </form>
  )
}
