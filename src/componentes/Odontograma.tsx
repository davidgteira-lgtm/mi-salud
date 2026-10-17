// El dibujo de la boca: arriba y abajo, cada diente con su color y su letra.
// Se dibuja como lo ve el dentista (tu derecha queda a la izquierda del dibujo),
// igual que en sus papeles, y por eso se indica con un rótulo a cada lado.
import { Fragment } from 'react'
import { ABAJO, ANCHO_DIENTE, ARRIBA, ESTADOS_DIENTE, nombreDiente, type EstadoDiente } from '../datos/dientes'

const ANCHO = 340
const ALTO = 178
/** Media elipse por la que van los dientes. */
const RADIO_X = 136
const RADIO_Y = 140
const FONDO_DIENTE = { muela: 34, otro: 27 }

interface Colocado {
  diente: number
  x: number
  y: number
  /** Giro para que siga la curva de la boca. */
  angulo: number
  ancho: number
  fondo: number
  /** Dónde va el número del diente: al lado, por dentro de la curva. */
  numero: { x: number; y: number }
}

/** Reparte los 16 dientes a lo largo de la curva según lo ancho que es cada uno. */
function colocar(dientes: number[], arriba: boolean): Colocado[] {
  const cx = ANCHO / 2
  const cy = arriba ? ALTO - 14 : 14
  const punto = (t: number) => ({ x: cx - RADIO_X * Math.cos(t), y: arriba ? cy - RADIO_Y * Math.sin(t) : cy + RADIO_Y * Math.sin(t) })

  // Longitud de la curva, a trozos pequeños.
  const pasos = 600
  const largos = [0]
  for (let i = 1; i <= pasos; i++) {
    const a = punto((Math.PI * (i - 1)) / pasos)
    const b = punto((Math.PI * i) / pasos)
    largos.push(largos[i - 1] + Math.hypot(b.x - a.x, b.y - a.y))
  }
  const total = largos[pasos]
  const anchos = dientes.map((d) => ANCHO_DIENTE[(d % 10) - 1])
  const escala = total / anchos.reduce((s, a) => s + a, 0)

  let recorrido = 0
  return dientes.map((diente, i) => {
    const centro = recorrido + (anchos[i] * escala) / 2
    recorrido += anchos[i] * escala
    let j = largos.findIndex((l) => l >= centro)
    if (j < 1) j = 1
    const t = (Math.PI * j) / pasos
    const { x, y } = punto(t)
    const antes = punto((Math.PI * (j - 1)) / pasos)
    const angulo = (Math.atan2(y - antes.y, x - antes.x) * 180) / Math.PI
    const muela = diente % 10 >= 6
    const fondo = muela ? FONDO_DIENTE.muela : FONDO_DIENTE.otro
    // Perpendicular a la curva, hacia dentro de la boca.
    const rad = (angulo * Math.PI) / 180
    let nx = -Math.sin(rad)
    let ny = Math.cos(rad)
    if (nx * (cx - x) + ny * (cy - y) < 0) [nx, ny] = [-nx, -ny]
    const separacion = fondo / 2 + 17
    return { diente, x, y, angulo, ancho: anchos[i] * escala - 3, fondo, numero: { x: x + nx * separacion, y: y + ny * separacion } }
  })
}

const POSICIONES = { arriba: colocar(ARRIBA, true), abajo: colocar(ABAJO, false) }

export function Odontograma(props: {
  estados: Map<number, EstadoDiente>
  /** Dientes marcados (el que se está mirando, o los elegidos en el formulario). */
  marcados?: number[]
  onTocar?: (diente: number) => void
}) {
  return (
    <div className="odontograma">
      <Arcada titulo="Arriba" colocados={POSICIONES.arriba} {...props} />
      <Arcada titulo="Abajo" colocados={POSICIONES.abajo} {...props} />
      {/* La explicación de los colores, pegada a los dientes */}
      <LeyendaDientes estados={props.estados} />
    </div>
  )
}

function Arcada(props: {
  titulo: string
  colocados: Colocado[]
  estados: Map<number, EstadoDiente>
  marcados?: number[]
  onTocar?: (diente: number) => void
}) {
  const arriba = props.titulo === 'Arriba'
  return (
    <figure className="arcada">
      <figcaption className="arcada-titulo">
        <span>← Tu derecha</span>
        <strong>{props.titulo}</strong>
        <span>Tu izquierda →</span>
      </figcaption>
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} role="group" aria-label={`Dientes de ${props.titulo.toLowerCase()}`}>
        {props.colocados.map((c) => {
          const estado = props.estados.get(c.diente) ?? 'sano'
          const info = ESTADOS_DIENTE[estado]
          const marcado = props.marcados?.includes(c.diente)
          const nombre = `${nombreDiente(c.diente)} (${c.diente}): ${info.texto.toLowerCase()}`
          return (
            <Fragment key={c.diente}>
              <g
                transform={`translate(${c.x} ${c.y}) rotate(${c.angulo})`}
                className={props.onTocar ? 'diente diente-tocable' : 'diente'}
                role={props.onTocar ? 'button' : 'img'}
                aria-label={nombre}
                aria-pressed={props.onTocar ? !!marcado : undefined}
                tabIndex={props.onTocar ? 0 : undefined}
                onClick={() => props.onTocar?.(c.diente)}
                onKeyDown={(e) => {
                  if (props.onTocar && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault()
                    props.onTocar(c.diente)
                  }
                }}
              >
                {/* Zona de toque algo más grande que el diente */}
                <rect x={-c.ancho / 2 - 1.5} y={-c.fondo / 2 - 4} width={c.ancho + 3} height={c.fondo + 8} fill="transparent" />
                <rect
                  x={-c.ancho / 2}
                  y={-c.fondo / 2}
                  width={c.ancho}
                  height={c.fondo}
                  rx={Math.min(9, c.ancho / 3)}
                  fill={info.relleno}
                  stroke={info.borde}
                  strokeWidth={1.8}
                  strokeDasharray={estado === 'falta' ? '4 3' : undefined}
                />
                {/* El elegido lleva un anillo alrededor, sin perder su color */}
                {marcado && (
                  <rect
                    x={-c.ancho / 2 - 3.5}
                    y={-c.fondo / 2 - 3.5}
                    width={c.ancho + 7}
                    height={c.fondo + 7}
                    rx={Math.min(11, c.ancho / 3 + 2)}
                    fill="none"
                    stroke="var(--principal)"
                    strokeWidth={3.5}
                  />
                )}
                {info.letra && (
                  <text
                    // La letra siempre derecha, aunque el diente esté girado.
                    transform={`rotate(${-c.angulo})`}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={c.ancho < 24 ? 12 : 14}
                    fontWeight={800}
                    fill={estado === 'falta' ? '#5b6875' : info.borde}
                    style={{ pointerEvents: 'none' }}
                  >
                    {info.letra}
                  </text>
                )}
              </g>
              {/* El número del dentista, al lado del diente y siempre derecho */}
              <text
                x={c.numero.x}
                y={c.numero.y}
                textAnchor="middle"
                dominantBaseline="central"
                className={marcado ? 'numero-diente numero-diente-marcado' : 'numero-diente'}
                aria-hidden="true"
              >
                {c.diente}
              </text>
            </Fragment>
          )
        })}
        <text x={ANCHO / 2} y={arriba ? ALTO - 50 : 56} textAnchor="middle" className="arcada-centro">
          {arriba ? 'Paladar' : 'Lengua'}
        </text>
      </svg>
    </figure>
  )
}

/** Explicación de colores y letras: solo de lo que hay en la boca, más «sano». */
function LeyendaDientes({ estados }: { estados: Map<number, EstadoDiente> }) {
  const presentes = new Set<EstadoDiente>(['sano', ...estados.values()])
  return (
    <ul className="leyenda-dientes" aria-label="Qué significa cada color">
      {(Object.keys(ESTADOS_DIENTE) as EstadoDiente[])
        .filter((e) => presentes.has(e))
        .map((e) => {
          const info = ESTADOS_DIENTE[e]
          return (
            <li key={e}>
              <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
                <rect
                  x="2"
                  y="2"
                  width="22"
                  height="22"
                  rx="7"
                  fill={info.relleno}
                  stroke={info.borde}
                  strokeWidth="1.8"
                  strokeDasharray={e === 'falta' ? '4 3' : undefined}
                />
                <text
                  x="13"
                  y="13.5"
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="13"
                  fontWeight="800"
                  fill={e === 'falta' ? '#5b6875' : info.borde}
                >
                  {info.letra}
                </text>
              </svg>
              {info.texto}
            </li>
          )
        })}
    </ul>
  )
}
