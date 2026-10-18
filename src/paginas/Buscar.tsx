// Buscar en todo lo apuntado: con faltas, con otras palabras o con fechas.
import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { buscarEn, entender, recortar, type Encontrado } from '../buscar/consulta'
import { reunirDocumentos } from '../buscar/reunir'
import { usePerfilActivo } from '../perfilActivo'
import { buscarSeccion } from '../secciones'
import { empezarDictado, hayDictado } from '../utils/dictado'

const EJEMPLOS = ['tensión', 'vacunas', 'análisis 2025', 'el año pasado', 'dentista', 'corazón']

export function Buscar() {
  const { perfil } = usePerfilActivo()
  const ir = useNavigate()
  const [texto, setTexto] = useState('')
  const [escuchando, setEscuchando] = useState(false)
  const parar = useRef<(() => void) | null>(null)
  const docs = useLiveQuery(() => (perfil ? reunirDocumentos(perfil.id) : []), [perfil?.id])

  const consulta = useMemo(() => entender(texto), [texto])
  const resultados = useMemo(() => (docs ? buscarEn(docs, consulta) : []), [docs, consulta])
  // Agrupados por sección, empezando por la que tiene lo que mejor encaja.
  const grupos = useMemo(() => {
    const mapa = new Map<string, Encontrado[]>()
    for (const r of resultados) mapa.set(r.doc.seccion, [...(mapa.get(r.doc.seccion) ?? []), r])
    return [...mapa.entries()]
  }, [resultados])

  if (!perfil) return null

  function dictar() {
    if (escuchando) {
      parar.current?.()
      return
    }
    parar.current = empezarDictado(
      (frase) => setTexto(frase),
      () => setEscuchando(false),
    )
    setEscuchando(!!parar.current)
  }

  const buscando = texto.trim().length > 0

  return (
    <main className="pagina pila">
      <button className="boton-volver" onClick={() => ir('/inicio')} style={{ alignSelf: 'flex-start' }}>
        ← Volver al inicio
      </button>
      <h1>🔎 Buscar</h1>

      <div className="buscador">
        <label className="campo" style={{ flex: 1 }}>
          <span className="solo-lector">Qué buscas</span>
          <input
            type="search"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Escribe lo que buscas…"
            autoFocus
            enterKeyHint="search"
          />
        </label>
        {hayDictado() && (
          <button
            type="button"
            className="boton boton-secundario boton-dictar"
            onClick={dictar}
            aria-label={escuchando ? 'Parar de escuchar' : 'Buscar hablando'}
          >
            {escuchando ? '⏹️' : '🎤'}
          </button>
        )}
      </div>

      {!buscando && (
        <section className="pila" style={{ gap: 8 }}>
          <p className="texto-suave" style={{ margin: 0 }}>
            Puedes escribir con faltas o con otras palabras, y también fechas. Por ejemplo:
          </p>
          <div className="sugerencias">
            {EJEMPLOS.map((e) => (
              <button key={e} type="button" className="opcion" onClick={() => setTexto(e)}>
                {e}
              </button>
            ))}
          </div>
        </section>
      )}

      {buscando && (
        <p role="status" style={{ margin: 0 }}>
          {resultados.length === 0
            ? 'No he encontrado nada. Prueba con otras palabras.'
            : `${resultados.length === 1 ? 'He encontrado 1 cosa' : `He encontrado ${resultados.length} cosas`}${consulta.rango ? ` ${consulta.rango.texto}` : ''}.`}
        </p>
      )}

      {grupos.map(([seccion, lista]) => {
        const s = buscarSeccion(seccion)
        const destino = s ? `/seccion/${seccion}` : '/revisar'
        return (
          <section key={seccion} className="pila" aria-label={s?.titulo ?? 'Por revisar'} style={{ gap: 8 }}>
            <h2 style={{ margin: '8px 0 0' }}>
              {s?.icono ?? '🤖'} {s?.titulo ?? 'Por revisar'}
            </h2>
            {lista.map((r) => (
              <Link key={r.doc.id} to={destino} className="tarjeta resultado">
                <strong>
                  {r.doc.icono} {r.doc.titulo}
                </strong>
                {r.doc.detalle && <span className="texto-suave">{r.doc.detalle}</span>}
                {r.doc.donde && <span className="texto-suave">{r.doc.donde}</span>}
                {r.fragmento && <span className="resultado-fragmento">«{recortar(r.fragmento)}»</span>}
              </Link>
            ))}
          </section>
        )
      })}
    </main>
  )
}
