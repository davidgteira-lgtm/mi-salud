import { useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { formatearNumero } from '../utils/numeros'

// Gráfica de líneas sencilla, hecha a mano para que funcione sin internet.
// - Línea de 2px con puntos marcados (anillo blanco para que se vean sobre la línea).
// - Franja verde muy suave con lo "normal", si se conoce.
// - Al tocar o pasar el dedo, una línea vertical y una cajita con los valores de ese momento.
// - Leyenda solo si hay más de una línea (con una, el título ya dice qué es).

export interface PuntoGrafica {
  /** Para ordenar y colocar en el tiempo: "2026-10-17 09:30". */
  momento: string
  /** Para mostrar: "17 oct". */
  etiqueta: string
  valor: number
}

export interface SerieGrafica {
  nombre: string
  color: string
  puntos: PuntoGrafica[]
}


const ANCHO = 340
const ALTO = 210
const M = { arriba: 14, derecha: 46, abajo: 28, izquierda: 40 }

function pasoBonito(rango: number): number {
  const bruto = rango / 4
  const potencia = 10 ** Math.floor(Math.log10(bruto))
  const n = bruto / potencia
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * potencia
}

function aTiempo(momento: string): number {
  const [f, h = '12:00'] = momento.split(' ')
  return new Date(`${f}T${h}:00`).getTime()
}

export function Grafica(props: {
  titulo: string
  series: SerieGrafica[]
  /** Zona normal. Puede tener solo máximo ("menos de 200") o solo mínimo ("más de 40"). */
  banda?: { min?: number; max?: number } | null
  decimales?: number
}) {
  const idTitulo = useId()
  const [activo, setActivo] = useState<number | null>(null)

  const calc = useMemo(() => {
    // Todos los momentos distintos, en orden (el eje X común a todas las líneas).
    const momentos = [...new Set(props.series.flatMap((s) => s.puntos.map((p) => p.momento)))].sort()
    const etiquetas = new Map(props.series.flatMap((s) => s.puntos.map((p) => [p.momento, p.etiqueta] as const)))
    const valores = props.series.flatMap((s) => s.puntos.map((p) => p.valor))
    if (props.banda?.min !== undefined) valores.push(props.banda.min)
    if (props.banda?.max !== undefined) valores.push(props.banda.max)
    let min = Math.min(...valores)
    let max = Math.max(...valores)
    if (min === max) {
      min -= 1
      max += 1
    }
    const paso = pasoBonito(max - min)
    min = Math.floor(min / paso) * paso
    max = Math.ceil(max / paso) * paso
    const marcas: number[] = []
    for (let v = min; v <= max + paso / 2; v += paso) marcas.push(Number(v.toFixed(6)))

    const t0 = aTiempo(momentos[0])
    const t1 = aTiempo(momentos[momentos.length - 1])
    const anchoUtil = ANCHO - M.izquierda - M.derecha
    const altoUtil = ALTO - M.arriba - M.abajo
    const x = (momento: string) => (t1 === t0 ? M.izquierda + anchoUtil / 2 : M.izquierda + ((aTiempo(momento) - t0) / (t1 - t0)) * anchoUtil)
    const y = (v: number) => M.arriba + (1 - (v - min) / (max - min)) * altoUtil
    // Si la zona normal no tiene uno de los límites, llega hasta el borde de la gráfica.
    const zona = props.banda ? { min: props.banda.min ?? min, max: props.banda.max ?? max } : null
    return { momentos, etiquetas, marcas, x, y, min, max, zona }
  }, [props.series, props.banda])

  // El globo del punto tocado se coloca centrado sobre el punto, pero sin salirse nunca de la gráfica
  // (con letra grande o en móviles estrechos se cortaba la fecha).
  const lienzo = useRef<HTMLDivElement>(null)
  const globo = useRef<HTMLDivElement>(null)
  const [izquierdaGlobo, setIzquierdaGlobo] = useState(0)
  useLayoutEffect(() => {
    if (activo === null || !lienzo.current || !globo.current || calc.momentos.length === 0) return
    const ancho = lienzo.current.clientWidth
    const anchoGlobo = globo.current.offsetWidth
    const centro = (calc.x(calc.momentos[activo]) / ANCHO) * ancho
    setIzquierdaGlobo(Math.min(Math.max(0, centro - anchoGlobo / 2), Math.max(0, ancho - anchoGlobo)))
  }, [activo, calc])

  if (calc.momentos.length === 0) return null
  const { momentos, etiquetas, marcas, x, y, zona } = calc
  const dec = props.decimales ?? 1

  function elegirPorPosicion(e: PointerEvent<SVGRectElement>) {
    const caja = e.currentTarget.ownerSVGElement!.getBoundingClientRect()
    const xRaton = ((e.clientX - caja.left) / caja.width) * ANCHO
    let mejor = 0
    momentos.forEach((m, i) => {
      if (Math.abs(x(m) - xRaton) < Math.abs(x(momentos[mejor]) - xRaton)) mejor = i
    })
    setActivo(mejor)
  }

  function teclas(e: KeyboardEvent) {
    if (e.key === 'ArrowLeft') setActivo((a) => Math.max(0, (a ?? momentos.length) - 1))
    if (e.key === 'ArrowRight') setActivo((a) => Math.min(momentos.length - 1, (a ?? -1) + 1))
    if (e.key === 'Escape') setActivo(null)
  }

  const momentoActivo = activo !== null ? momentos[activo] : null
  const xActivo = momentoActivo ? x(momentoActivo) : 0
  const ultimo = momentos[momentos.length - 1]

  return (
    <figure className="grafica" aria-labelledby={idTitulo}>
      <figcaption id={idTitulo} className="grafica-titulo">
        {props.titulo}
      </figcaption>
      {props.series.length > 1 && (
        <div className="grafica-leyenda">
          {props.series.map((s) => (
            <span key={s.nombre}>
              <i style={{ background: s.color }} aria-hidden="true" /> {s.nombre}
            </span>
          ))}
        </div>
      )}
      <div className="grafica-lienzo" ref={lienzo}>
        <svg
          viewBox={`0 0 ${ANCHO} ${ALTO}`}
          role="img"
          aria-label={`${props.titulo}. Usa las flechas para recorrer los valores.`}
          tabIndex={0}
          onKeyDown={teclas}
          onBlur={() => setActivo(null)}
        >
          {/* Zona normal */}
          {zona && (
            <>
              <rect
                x={M.izquierda}
                width={ANCHO - M.izquierda - M.derecha}
                y={y(zona.max)}
                height={Math.max(0, y(zona.min) - y(zona.max))}
                fill="#0ca30c"
                opacity={0.14}
              />
              <text x={ANCHO - M.derecha + 4} y={y(zona.max) + 12} className="grafica-texto-suave">
                normal
              </text>
            </>
          )}
          {/* Rejilla y valores del eje */}
          {marcas.map((v) => (
            <g key={v}>
              <line x1={M.izquierda} x2={ANCHO - M.derecha} y1={y(v)} y2={y(v)} stroke="#e3e8ef" strokeWidth={1} />
              <text x={M.izquierda - 6} y={y(v) + 4} textAnchor="end" className="grafica-texto-suave">
                {formatearNumero(v, 1)}
              </text>
            </g>
          ))}
          {/* Fechas: primera y última */}
          <text x={x(momentos[0])} y={ALTO - 8} textAnchor={momentos.length === 1 ? 'middle' : 'start'} className="grafica-texto-suave">
            {etiquetas.get(momentos[0])}
          </text>
          {momentos.length > 1 && (
            <text x={x(ultimo)} y={ALTO - 8} textAnchor="end" className="grafica-texto-suave">
              {etiquetas.get(ultimo)}
            </text>
          )}
          {/* Líneas y puntos */}
          {props.series.map((s) => {
            const pts = [...s.puntos].sort((a, b) => a.momento.localeCompare(b.momento))
            const final = pts[pts.length - 1]
            return (
              <g key={s.nombre}>
                <polyline
                  points={pts.map((p) => `${x(p.momento)},${y(p.valor)}`).join(' ')}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {pts.map((p) => (
                  <circle key={p.momento} cx={x(p.momento)} cy={y(p.valor)} r={4.5} fill={s.color} stroke="#fff" strokeWidth={2} />
                ))}
                {/* El último valor, escrito al final de la línea */}
                {final && (
                  <text x={x(final.momento) + 8} y={y(final.valor) + 4} className="grafica-texto">
                    {formatearNumero(final.valor, dec)}
                  </text>
                )}
              </g>
            )
          })}
          {/* Línea vertical del valor tocado */}
          {momentoActivo && (
            <line x1={xActivo} x2={xActivo} y1={M.arriba} y2={ALTO - M.abajo} stroke="#45525f" strokeWidth={1} />
          )}
          {/* Zona invisible para tocar: más grande que los puntos */}
          <rect
            x={M.izquierda - 10}
            y={0}
            width={ANCHO - M.izquierda - M.derecha + 20}
            height={ALTO}
            fill="transparent"
            // Con ratón, el globo sigue al puntero. Con el dedo, un toque lo abre y el siguiente lo cierra
            // (en cualquier punto de la gráfica, también sobre el propio globo), para que no tape la gráfica.
            onPointerMove={(e) => e.pointerType === 'mouse' && elegirPorPosicion(e)}
            onPointerDown={(e) => (e.pointerType !== 'mouse' && activo !== null ? setActivo(null) : elegirPorPosicion(e))}
            onPointerLeave={(e) => e.pointerType === 'mouse' && setActivo(null)}
          />
        </svg>
        {momentoActivo && (
          <div
            className="grafica-globo"
            role="status"
            ref={globo}
            style={{ left: izquierdaGlobo }}
          >
            <div className="texto-suave">{etiquetas.get(momentoActivo)}</div>
            {props.series.map((s) => {
              const p = s.puntos.find((q) => q.momento === momentoActivo)
              return p ? (
                <div key={s.nombre}>
                  <strong>{formatearNumero(p.valor, dec)}</strong>{' '}
                  <span className="texto-suave">
                    <i style={{ background: s.color }} aria-hidden="true" /> {s.nombre}
                  </span>
                </div>
              ) : null
            })}
          </div>
        )}
      </div>
    </figure>
  )
}
