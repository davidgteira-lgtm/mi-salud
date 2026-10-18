import { useLiveQuery } from 'dexie-react-hooks'
import { useRef, useState, type FormEvent } from 'react'
import { EditorAdjuntos, VerAdjuntos } from '../componentes/Adjuntos'
import { COLOR_SERIE } from '../componentes/coloresGrafica'
import { Confirmar } from '../componentes/Confirmar'
import { Grafica } from '../componentes/Grafica'
import { PRUEBAS, type PruebaLab } from '../datos/pruebasLaboratorio'
import { guardarAdjuntos, nombrePorDefecto, type AdjuntoNuevo } from '../db/adjuntos'
import { QueSeEnvia } from '../componentes/AjustesIa'
import { bloquesDeAdjunto, pedirPropuestas } from '../ia/analizar'
import { aceptarIa, ErrorIa, iaAceptada, obtenerClave } from '../ia/claude'
import { reducirFoto } from '../utils/imagen'
import { textoDePdf } from '../utils/leerPdf'
import {
  borrarAnalitica,
  claveDeGrupo,
  estadoDe,
  evolucion,
  guardarAnalitica,
  listarAnaliticas,
  pruebasConHistoria,
  revisarAnalitica,
} from '../db/analiticas'
import type { Analitica, ResultadoAnalisis } from '../db/tipos'
import { usePerfilActivo } from '../perfilActivo'
import {
  buscarPrueba,
  leerInforme,
  leerRango,
  leerResultado,
  referenciaOrientativa,
  resolverAmbiguo,
  sugerirPruebas,
  textoRango,
  type EstadoResultado,
} from '../utils/analisis'
import { fechaLarga, hoyISO } from '../utils/fechas'
import { formatearNumero } from '../utils/numeros'

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const fechaCorta = (f: string) => `${MESES_CORTOS[Number(f.slice(5, 7)) - 1]} ${f.slice(0, 4)}`
const num = (n: number) => formatearNumero(n, 3)

/** "✓ Normal", "▲ Alto", "▼ Bajo": nunca solo color. */
function EtiquetaEstado({ estado }: { estado: EstadoResultado }) {
  if (estado === 'sin-referencia') return <span className="nivel nivel-sin">– Sin referencia</span>
  const e = { normal: ['bien', '✓', 'Normal'], alto: ['fuera', '▲', 'Alto'], bajo: ['fuera', '▼', 'Bajo'] }[estado]
  return (
    <span className={`nivel nivel-${e[0]}`}>
      <span aria-hidden="true">{e[1]}</span> {e[2]}
    </span>
  )
}

/** Análisis: la lista de análisis y la evolución de cada prueba. */
export function Analisis({ perfilId }: { perfilId: string }) {
  const [pestana, setPestana] = useState<'lista' | 'evolucion'>('lista')
  const [grupo, setGrupo] = useState<string>()
  const [editando, setEditando] = useState<Analitica | null>()
  const analiticas = useLiveQuery(() => listarAnaliticas(perfilId), [perfilId])

  if (editando !== undefined) {
    return <FormularioAnalitica perfilId={perfilId} analitica={editando ?? undefined} onTerminar={() => setEditando(undefined)} />
  }
  if (!analiticas) return null

  return (
    <div className="pila">
      <button className="boton" onClick={() => setEditando(null)}>
        ➕ Añadir análisis
      </button>

      {analiticas.length === 0 ? (
        <p className="aviso">
          Aquí guardarás tus análisis de sangre y orina. Si el informe es un PDF, puedes copiar su texto y pegarlo: la app separa cada
          resultado.
        </p>
      ) : (
        <div className="pestanas" role="tablist">
          <button role="tab" aria-selected={pestana === 'lista'} onClick={() => setPestana('lista')}>
            Mis análisis ({analiticas.length})
          </button>
          <button role="tab" aria-selected={pestana === 'evolucion'} onClick={() => setPestana('evolucion')}>
            Evolución
          </button>
        </div>
      )}

      {pestana === 'lista' &&
        analiticas.map((a) => (
          <TarjetaAnalitica
            key={a.id}
            analitica={a}
            onCambiar={() => setEditando(a)}
            onVerEvolucion={(g) => {
              setGrupo(g)
              setPestana('evolucion')
            }}
          />
        ))}

      {pestana === 'evolucion' && analiticas.length > 0 && <Evolucion perfilId={perfilId} grupo={grupo} onGrupo={setGrupo} />}

      <p className="texto-suave" style={{ fontSize: '0.85rem' }}>
        «Normal», «alto» o «bajo» se calcula con la referencia que pone en tu informe. Interpreta los resultados siempre con tu médico.
      </p>
    </div>
  )
}

function TarjetaAnalitica(props: { analitica: Analitica; onCambiar: () => void; onVerEvolucion: (grupo: string) => void }) {
  const a = props.analitica
  const [abierta, setAbierta] = useState(false)
  const fuera = a.resultados.filter((r) => ['alto', 'bajo'].includes(estadoDe(r)))
  return (
    <article className="tarjeta pila" style={{ gap: 8 }}>
      <strong style={{ fontSize: '1.25rem' }}>Análisis del {fechaLarga(a.fecha)}</strong>
      {a.centro && <span>📍 {a.centro}</span>}
      <span>
        {a.resultados.length} resultados ·{' '}
        {fuera.length === 0 ? (
          <span className="nivel nivel-bien">✓ Todos dentro de lo normal</span>
        ) : (
          <span className="nivel nivel-fuera">▲ {fuera.length} fuera de lo normal</span>
        )}
      </span>
      {fuera.length > 0 && !abierta && <span className="texto-suave">{fuera.map((r) => r.nombre).join(', ')}</span>}
      {a.notas && <span>{a.notas}</span>}
      <VerAdjuntos registroId={a.id} />
      <button className="boton boton-secundario" onClick={() => setAbierta(!abierta)} aria-expanded={abierta}>
        {abierta ? 'Ocultar los resultados' : 'Ver todos los resultados'}
      </button>
      {abierta && (
        <ul className="lista-resultados">
          {a.resultados.map((r, i) => (
            <li key={i}>
              <button className="resultado" onClick={() => props.onVerEvolucion(claveDeGrupo(r))} aria-label={`${r.nombre}: ver evolución`}>
                <span className="resultado-nombre">{r.nombre}</span>
                <span className="resultado-valor">
                  {r.comparador}
                  {num(r.valor)} <small>{r.unidad}</small>
                </span>
                <EtiquetaEstado estado={estadoDe(r)} />
                {(r.refMin !== undefined || r.refMax !== undefined) && (
                  <span className="texto-suave resultado-ref">Referencia: {textoRango({ min: r.refMin, max: r.refMax }, num)}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      <button className="enlace" onClick={props.onCambiar}>
        Cambiar o borrar
      </button>
    </article>
  )
}

function Evolucion(props: { perfilId: string; grupo?: string; onGrupo: (g: string) => void }) {
  const pruebas = useLiveQuery(() => pruebasConHistoria(props.perfilId), [props.perfilId])
  const grupo = props.grupo ?? pruebas?.[0]?.grupo
  const datos = useLiveQuery(() => (grupo ? evolucion(props.perfilId, grupo) : undefined), [props.perfilId, grupo])
  if (!pruebas) return null
  const elegida = pruebas.find((p) => p.grupo === grupo)
  const catalogo = PRUEBAS.find((p) => p.clave === grupo)
  const ultimo = datos?.puntos[datos.puntos.length - 1]
  const banda = ultimo && (ultimo.refMin !== undefined || ultimo.refMax !== undefined) ? { min: ultimo.refMin, max: ultimo.refMax } : null

  return (
    <div className="pila">
      <label className="campo">
        <span>¿Qué prueba quieres ver?</span>
        <select value={grupo} onChange={(e) => props.onGrupo(e.target.value)}>
          {pruebas.map((p) => (
            <option key={p.grupo} value={p.grupo}>
              {p.nombre} ({p.veces} {p.veces === 1 ? 'vez' : 'veces'})
              {p.ultimoEstado === 'alto' ? ' ▲' : p.ultimoEstado === 'bajo' ? ' ▼' : ''}
            </option>
          ))}
        </select>
      </label>

      {catalogo && (
        <p className="aviso aviso-cita" style={{ margin: 0 }}>
          {catalogo.explicacion}
        </p>
      )}

      {datos && datos.puntos.length >= 2 && elegida && (
        <Grafica
          titulo={`${elegida.nombre}${datos.unidad ? ` (${datos.unidad})` : ''}`}
          series={[
            {
              nombre: elegida.nombre,
              color: COLOR_SERIE[0],
              puntos: datos.puntos.map((p) => ({ momento: `${p.fecha} 12:00`, etiqueta: fechaCorta(p.fecha), valor: p.valor })),
            },
          ]}
          banda={banda}
          decimales={2}
        />
      )}
      {datos && datos.puntos.length === 1 && (
        <p className="texto-suave" style={{ margin: 0 }}>
          Solo hay un análisis con esta prueba. Cuando haya más, aquí verás cómo cambia.
        </p>
      )}

      {datos && (
        <section className="tarjeta" aria-label="Valores">
          {[...datos.puntos].reverse().map((p, i) => (
            // Línea 1: el valor. Línea 2: la valoración y la fecha (igual que en Constantes).
            <div key={i} className="medida">
              <span className="medida-valores">
                <strong>
                  {p.comparador}
                  {num(p.valor)}
                </strong>{' '}
                <small>{datos.unidad}</small>
              </span>
              <div className="medida-linea medida-linea-2">
                <EtiquetaEstado estado={p.estado} />
                <span className="texto-suave medida-fecha">{fechaLarga(p.fecha)}</span>
              </div>
              {p.convertido && <div className="medida-notas texto-suave">En el informe ponía: {p.original}</div>}
            </div>
          ))}
          {datos.sinConvertir.map((p, i) => (
            <div key={`s${i}`} className="medida">
              <span className="medida-valores">
                <strong>{p.original}</strong>
              </span>
              <div className="medida-linea medida-linea-2">
                <EtiquetaEstado estado={p.estado} />
                <span className="texto-suave medida-fecha">{fechaLarga(p.fecha)}</span>
              </div>
              <div className="medida-notas texto-suave">En otra unidad: no sale en la gráfica.</div>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}

// ---- Formulario ------------------------------------------------------------

interface FilaFormulario {
  id: string
  nombre: string
  valor: string
  unidad: string
  referencia: string
  /** Si un número es ambiguo y la persona ya ha elegido. */
  elegido?: number
  abierta: boolean
}

function filaDesdeResultado(r: ResultadoAnalisis): FilaFormulario {
  return {
    id: crypto.randomUUID(),
    nombre: r.nombre,
    valor: `${r.comparador ?? ''}${String(r.valor).replace('.', ',')}`,
    unidad: r.unidad ?? '',
    referencia: textoReferencia(r.refMin, r.refMax),
    abierta: false,
  }
}

/** "74 - 100", "< 37", "> 40" (se puede volver a leer con leerRango). */
function textoReferencia(min?: number, max?: number): string {
  const f = (n: number) => String(n).replace('.', ',')
  if (min !== undefined && max !== undefined) return `${f(min)} - ${f(max)}`
  if (max !== undefined) return `< ${f(max)}`
  if (min !== undefined) return `> ${f(min)}`
  return ''
}

/** Lo que la app entiende de una fila, o el problema que tiene. */
function interpretar(f: FilaFormulario, prueba: PruebaLab | undefined) {
  const leido = leerResultado(f.valor)
  if (!f.valor.trim()) return { error: 'Falta el resultado.' as const }
  if (!leido) return { error: 'No entiendo el resultado. Escríbelo con cifras, por ejemplo 5,4.' as const }
  const ref = f.referencia.trim() ? leerRango(f.referencia) : null
  if (f.referencia.trim() && !ref) return { error: 'No entiendo la referencia. Escríbela así: 74 - 100, < 37 o > 40.' as const }
  const valor = f.elegido ?? resolverAmbiguo(leido, ref ?? (prueba ? referenciaOrientativa(prueba) : undefined))
  if (valor === null) return { dudas: [leido.valor, leido.alternativa!] as [number, number] }
  const resultado: ResultadoAnalisis = {
    clave: prueba?.clave,
    nombre: f.nombre.trim(),
    valor,
    comparador: leido.comparador,
    unidad: f.unidad.trim() || undefined,
    refMin: ref?.min,
    refMax: ref?.max,
  }
  return { resultado }
}

function FormularioAnalitica(props: { perfilId: string; analitica?: Analitica; onTerminar: () => void }) {
  const a = props.analitica
  const { perfil } = usePerfilActivo()
  const [fecha, setFecha] = useState(a?.fecha ?? hoyISO())
  const [centro, setCentro] = useState(a?.centro ?? '')
  const [notas, setNotas] = useState(a?.notas ?? '')
  const [filas, setFilas] = useState<FilaFormulario[]>(() => a?.resultados.map(filaDesdeResultado) ?? [])
  const [pegando, setPegando] = useState(false)
  const [textoPegado, setTextoPegado] = useState('')
  const [avisoPegado, setAvisoPegado] = useState('')
  const [pendientes, setPendientes] = useState<AdjuntoNuevo[]>([])
  const [leyendo, setLeyendo] = useState(false)
  const [sinLeer, setSinLeer] = useState<{ tipo: 'foto' | 'documento'; archivo: Blob }>()
  const [permisoIa, setPermisoIa] = useState(false)
  const subirPdf = useRef<HTMLInputElement>(null)
  const subirFoto = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const [preguntarBorrar, setPreguntarBorrar] = useState(false)

  const cambiar = (id: string, cambios: Partial<FilaFormulario>) =>
    setFilas((fs) => fs.map((f) => (f.id === id ? { ...f, ...cambios } : f)))

  /** Lee un texto de informe y añade sus resultados. Devuelve cuántos ha leído. */
  function leerTexto(texto: string, deDonde: string): number {
    const { filas: leidas, fecha: fechaInforme } = leerInforme(texto)
    if (leidas.length === 0) return 0
    setFilas((fs) => [
      ...fs,
      ...leidas.map((l) => ({
        id: crypto.randomUUID(),
        nombre: l.nombre,
        valor: `${l.resultado.comparador ?? ''}${l.resultado.valor}`,
        unidad: l.unidad,
        referencia: textoReferencia(l.referencia?.min, l.referencia?.max),
        abierta: false,
      })),
    ])
    if (fechaInforme) setFecha(fechaInforme)
    setAvisoPegado(
      `He leído ${leidas.length} resultados ${deDonde}${fechaInforme ? ` y la fecha (${fechaLarga(fechaInforme)})` : ''}. Revísalos antes de guardar.`,
    )
    return leidas.length
  }

  function leerPegado() {
    if (leerTexto(textoPegado, 'del texto') === 0) {
      setAvisoPegado('No he encontrado resultados en ese texto. Comprueba que has copiado la parte de las pruebas.')
      return
    }
    setTextoPegado('')
    setPegando(false)
  }

  /** Al subir el informe: el PDF se lee en el propio móvil; si no se puede (foto o escaneado), se ofrece la IA. */
  async function alSubirInforme(archivo: File, deCamara: boolean) {
    setAvisoPegado('')
    setSinLeer(undefined)
    const tipo = deCamara || archivo.type.startsWith('image/') ? 'foto' : 'documento'
    const guardado = tipo === 'foto' ? await reducirFoto(archivo, 1800, 0.82) : archivo
    const nombre = deCamara ? nombrePorDefecto('foto') : archivo.name
    let leidos = 0
    if (tipo === 'documento' && archivo.type === 'application/pdf') {
      setLeyendo(true)
      try {
        leidos = leerTexto(await textoDePdf(archivo), 'del PDF')
      } catch {
        leidos = 0
      } finally {
        setLeyendo(false)
      }
    }
    // El informe se guarda con el análisis (y si ya está leído, no vuelve a salir en «Por revisar»).
    setPendientes((ps) => [...ps, { clave: crypto.randomUUID(), tipo, nombre, archivo: guardado, leido: leidos > 0 }])
    if (leidos === 0) setSinLeer({ tipo, archivo: guardado })
  }

  /** Para fotos y PDF escaneados: que lo lea la IA (si está activada). */
  async function leerConIa() {
    const clave = obtenerClave()
    if (!sinLeer || !clave || !perfil) return
    setLeyendo(true)
    setAvisoPegado('')
    try {
      const lectura = await pedirPropuestas(clave, perfil, await bloquesDeAdjunto({ ...sinLeer, transcripcion: undefined }))
      const analiticas = lectura.propuestas.filter((p) => p.tipo === 'analitica')
      const resultados = analiticas.flatMap((p) => p.resultados)
      if (resultados.length === 0) {
        setAvisoPegado('La IA no ha encontrado resultados de análisis en este archivo.')
        return
      }
      setFilas((fs) => [...fs, ...resultados.map(filaDesdeResultado)])
      const primera = analiticas[0]
      if (primera.fecha) setFecha(primera.fecha)
      if (primera.centro && !centro) setCentro(primera.centro)
      setPendientes((ps) => ps.map((p) => (p.archivo === sinLeer.archivo ? { ...p, leido: true } : p)))
      setSinLeer(undefined)
      setAvisoPegado(`La IA ha leído ${resultados.length} resultados. Revísalos bien antes de guardar: a veces se equivoca.`)
    } catch (e) {
      setAvisoPegado(e instanceof ErrorIa ? e.message : 'No se ha podido leer con la IA. Prueba otra vez.')
    } finally {
      setLeyendo(false)
    }
  }

  async function guardar(e: FormEvent) {
    e.preventDefault()
    const resultados: ResultadoAnalisis[] = []
    for (const f of filas) {
      const i = interpretar(f, buscarPrueba(f.nombre, f.unidad))
      if ('error' in i) {
        cambiar(f.id, { abierta: true })
        return setError(`«${f.nombre || 'Sin nombre'}»: ${i.error}`)
      }
      if ('dudas' in i) {
        cambiar(f.id, { abierta: true })
        return setError(`«${f.nombre}»: elige cuál es el valor correcto.`)
      }
      resultados.push(i.resultado!)
    }
    const datos = { fecha, centro, notas, resultados }
    const problema = revisarAnalitica(datos)
    if (problema) return setError(problema)
    const id = await guardarAnalitica(props.perfilId, datos, a?.id)
    await guardarAdjuntos(props.perfilId, id, pendientes)
    props.onTerminar()
  }

  return (
    <form className="pila" onSubmit={guardar} noValidate>
      <h2>{a ? 'Cambiar análisis' : 'Nuevo análisis'}</h2>

      <label className="campo">
        <span>Fecha del análisis</span>
        <input type="date" value={fecha} max={hoyISO()} onChange={(e) => setFecha(e.target.value)} />
      </label>
      <label className="campo">
        <span>Laboratorio o centro (si quieres)</span>
        <input type="text" value={centro} onChange={(e) => setCentro(e.target.value)} />
      </label>

      <section className="tarjeta pila subir-informe" aria-label="Subir el informe">
        <strong style={{ fontSize: '1.15rem' }}>📄 ¿Tienes el informe?</strong>
        <span className="texto-suave">Súbelo y la app leerá los resultados por ti. Luego solo tienes que revisarlos.</span>
        <button type="button" className="boton" disabled={leyendo} onClick={() => subirPdf.current?.click()}>
          {leyendo ? 'Leyendo el informe…' : '📄 Subir el PDF del análisis'}
        </button>
        <button type="button" className="boton boton-secundario" disabled={leyendo} onClick={() => subirFoto.current?.click()}>
          📷 Hacer una foto del informe
        </button>
        <input
          ref={subirPdf}
          type="file"
          accept="application/pdf,image/*"
          hidden
          aria-label="Elegir el PDF del análisis"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) alSubirInforme(f, false)
            e.target.value = ''
          }}
        />
        <input
          ref={subirFoto}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) alSubirInforme(f, true)
            e.target.value = ''
          }}
        />
        {sinLeer && (
          <div className="aviso pila" role="status" style={{ margin: 0, gap: 10 }}>
            <span>
              {sinLeer.tipo === 'foto'
                ? 'He guardado la foto del informe.'
                : 'He guardado el PDF, pero no tiene texto que la app pueda leer (parece escaneado).'}{' '}
              {obtenerClave()
                ? 'La IA puede leer los resultados por ti.'
                : 'Para que se lean solos, activa la IA en Ajustes. Si no, añade los resultados a mano abajo.'}
            </span>
            {obtenerClave() && (
              <button type="button" className="boton" disabled={leyendo} onClick={() => (iaAceptada() ? leerConIa() : setPermisoIa(true))}>
                {leyendo ? 'Leyendo…' : '🤖 Leerlo con la IA'}
              </button>
            )}
          </div>
        )}
      </section>
      {permisoIa && (
        <Confirmar
          titulo="Antes de leerlo con la IA"
          textoSi="Entendido, leerlo"
          onSi={() => {
            aceptarIa(true)
            setPermisoIa(false)
            leerConIa()
          }}
          onNo={() => setPermisoIa(false)}
        >
          <QueSeEnvia />
        </Confirmar>
      )}

      <h3 style={{ margin: '8px 0 0' }}>Resultados ({filas.length})</h3>

      {!pegando ? (
        <button type="button" className="enlace" style={{ alignSelf: 'flex-start' }} onClick={() => setPegando(true)}>
          ¿El PDF no se lee bien? Pega aquí su texto
        </button>
      ) : (
        <div className="tarjeta pila">
          <label className="campo">
            <span>Pega aquí el texto del informe</span>
            <small>Abre el PDF del análisis, selecciona todo el texto, cópialo y pégalo aquí.</small>
            <textarea rows={6} value={textoPegado} onChange={(e) => setTextoPegado(e.target.value)} />
          </label>
          <button type="button" className="boton" onClick={leerPegado} disabled={!textoPegado.trim()}>
            Leer resultados
          </button>
          <button type="button" className="boton boton-secundario" onClick={() => setPegando(false)}>
            Cancelar
          </button>
        </div>
      )}
      {avisoPegado && (
        <p className="aviso aviso-ok" role="status" style={{ margin: 0 }}>
          {avisoPegado}
        </p>
      )}

      {filas.map((f) => (
        <FilaResultado
          key={f.id}
          fila={f}
          sexo={perfil?.sexo}
          onCambiar={(c) => cambiar(f.id, c)}
          onQuitar={() => setFilas((fs) => fs.filter((x) => x.id !== f.id))}
        />
      ))}

      <button
        type="button"
        className="boton boton-secundario"
        onClick={() =>
          setFilas((fs) => [...fs, { id: crypto.randomUUID(), nombre: '', valor: '', unidad: '', referencia: '', abierta: true }])
        }
      >
        ➕ Añadir un resultado a mano
      </button>

      <EditorAdjuntos
        registroId={a?.id}
        pendientes={pendientes}
        onPendientes={setPendientes}
        titulo="Archivos del análisis"
        ayuda="Aquí queda guardado el informe que has subido. Puedes añadir más fotos o una nota de voz."
      />

      <label className="campo">
        <span>Notas (si quieres)</span>
        <textarea rows={3} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Me lo pidió el médico de cabecera…" />
      </label>

      {error && <p className="aviso aviso-error">{error}</p>}

      <button type="submit" className="boton">
        Guardar
      </button>
      <button type="button" className="boton boton-secundario" onClick={props.onTerminar}>
        Cancelar
      </button>
      {a && (
        <button type="button" className="boton boton-peligro-suave" onClick={() => setPreguntarBorrar(true)}>
          Borrar este análisis
        </button>
      )}
      {preguntarBorrar && a && (
        <Confirmar
          titulo="¿Borrar este análisis?"
          textoSi="Sí, borrar"
          peligroso
          onSi={async () => {
            await borrarAnalitica(a.id)
            props.onTerminar()
          }}
          onNo={() => setPreguntarBorrar(false)}
        >
          <p>Se borrarán todos sus resultados y la foto o el PDF del informe.</p>
        </Confirmar>
      )}
    </form>
  )
}

function FilaResultado(props: {
  fila: FilaFormulario
  sexo?: 'mujer' | 'hombre' | 'otro'
  onCambiar: (c: Partial<FilaFormulario>) => void
  onQuitar: () => void
}) {
  const f = props.fila
  const prueba = buscarPrueba(f.nombre, f.unidad)
  const i = interpretar(f, prueba)
  const orientativa = prueba ? referenciaOrientativa(prueba, props.sexo === 'otro' ? undefined : props.sexo) : undefined
  const sugerencias = f.abierta && !prueba ? sugerirPruebas(f.nombre, 4) : []

  const resumen =
    'resultado' in i && i.resultado ? (
      <>
        <strong>
          {i.resultado.comparador}
          {num(i.resultado.valor)}
        </strong>{' '}
        {i.resultado.unidad} <EtiquetaEstado estado={estadoDe(i.resultado)} />
      </>
    ) : null

  if (!f.abierta) {
    return (
      <div className="fila-resultado">
        <div>
          <div style={{ fontWeight: 700 }}>{f.nombre || 'Sin nombre'}</div>
          <div>{resumen ?? <span className="nivel nivel-urgente">⚠ Revisar</span>}</div>
          {f.referencia && (
            <div className="texto-suave" style={{ fontSize: '0.85rem' }}>
              Referencia: {f.referencia}
            </div>
          )}
        </div>
        <button type="button" className="enlace" onClick={() => props.onCambiar({ abierta: true })} aria-label={`Corregir ${f.nombre}`}>
          Corregir
        </button>
      </div>
    )
  }

  return (
    <div className="tarjeta pila" style={{ gap: 10 }}>
      <label className="campo">
        <span>Prueba</span>
        <input
          type="text"
          value={f.nombre}
          onChange={(e) => props.onCambiar({ nombre: e.target.value })}
          placeholder="Glucosa, colesterol…"
        />
      </label>
      {sugerencias.length > 0 && (
        <div className="sugerencias">
          {sugerencias.map((s) => (
            <button
              key={s.clave}
              type="button"
              className="opcion"
              onClick={() => props.onCambiar({ nombre: s.nombre, unidad: f.unidad || s.unidad })}
            >
              {s.nombre}
            </button>
          ))}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <label className="campo">
          <span>Resultado</span>
          <input
            type="text"
            inputMode="decimal"
            value={f.valor}
            onChange={(e) => props.onCambiar({ valor: e.target.value, elegido: undefined })}
          />
        </label>
        <label className="campo">
          <span>Unidad</span>
          <input type="text" value={f.unidad} onChange={(e) => props.onCambiar({ unidad: e.target.value })} placeholder={prueba?.unidad} />
        </label>
      </div>
      <label className="campo">
        <span>Referencia (como pone en el informe)</span>
        <input type="text" value={f.referencia} onChange={(e) => props.onCambiar({ referencia: e.target.value })} placeholder="74 - 100" />
      </label>
      {!f.referencia && orientativa && (
        <button
          type="button"
          className="enlace"
          onClick={() => props.onCambiar({ referencia: textoReferencia(orientativa.min, orientativa.max) })}
        >
          Usar una referencia orientativa ({textoRango(orientativa, num)}) si el informe no la trae
        </button>
      )}

      <div role="status">
        {'error' in i && (
          <p className="aviso aviso-error" style={{ margin: 0 }}>
            {i.error}
          </p>
        )}
        {'dudas' in i && i.dudas && (
          <div className="aviso" style={{ margin: 0 }}>
            ¿Cuál es el valor?
            <div className="sugerencias" style={{ marginTop: 8 }}>
              {i.dudas.map((d) => (
                <button key={d} type="button" className="opcion" onClick={() => props.onCambiar({ elegido: d })}>
                  {num(d)}
                </button>
              ))}
            </div>
          </div>
        )}
        {resumen && (
          <p className="aviso aviso-ok" style={{ margin: 0 }}>
            Entendido: {resumen}
          </p>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button type="button" className="enlace" onClick={() => props.onCambiar({ abierta: false })} disabled={!resumen}>
          Hecho
        </button>
        <button type="button" className="enlace" onClick={props.onQuitar} style={{ color: 'var(--peligro)' }}>
          Quitar este resultado
        </button>
      </div>
    </div>
  )
}
