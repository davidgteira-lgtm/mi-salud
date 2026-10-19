// Intro de la app con Remotion: el logo de Mi Salud entra con movimiento, profundidad 3D, sombra y luz,
// y termina sobre el fondo de la app para que la primera pantalla aparezca sin salto.
// El logo es el mismo de public/icono.svg (mismas formas y proporciones) y «Mi Salud» va con la letra de la app.
import { AbsoluteFill, Easing, interpolate, interpolateColors, random, spring, useCurrentFrame, useVideoConfig } from 'remotion'


const AZUL = '#2e5c8a'
const AZUL_OSCURO = '#1f4468'
const FONDO_APP = '#eef4fa'
const NOCHE = '#050b14'
const LETRA = "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"

/** Tamaño del icono en la composición; la letra guarda la proporción del logo de la app (0,85rem bajo 44 px). */
const LADO = 440
const TAM_LETRA = Math.round(LADO * (13.6 / 44))
const RADIO = `${(112 / 512) * 100}%`

const limitar = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const

/** Motas de polvo en el haz de luz (siempre las mismas). */
const MOTAS = Array.from({ length: 40 }, (_, i) => ({
  x: random(`x${i}`),
  y: random(`y${i}`),
  r: 1.5 + random(`r${i}`) * 3.5,
  v: 0.3 + random(`v${i}`) * 0.9,
  o: 0.15 + random(`o${i}`) * 0.45,
}))

export function AnimacionLogo() {
  const f = useCurrentFrame()
  const { fps, width, height } = useVideoConfig()

  // 1. Entrada del icono desde el fondo, girando (0,7 s → 2,6 s).
  const entrada = spring({ frame: f - 20, fps, config: { damping: 15, stiffness: 70, mass: 1.1 } })
  const giroY = interpolate(entrada, [0, 1], [72, 0])
  const giroX = interpolate(entrada, [0, 1], [28, 0])
  const escala = interpolate(entrada, [0, 1], [0.32, 1])
  const subida = interpolate(entrada, [0, 1], [160, 0])
  // Un leve balanceo final, para que no se quede «muerto».
  const balanceo = Math.sin((f - 80) / 22) * interpolate(f, [80, 120, 200], [0, 3, 1.5], limitar)

  // 2. Corazón y cruz, uno detrás de otro (2,7 s → 4 s).
  const corazon = spring({ frame: f - 82, fps, config: { damping: 11, stiffness: 120 } })
  const cruzV = spring({ frame: f - 100, fps, config: { damping: 14, stiffness: 160 } })
  const cruzH = spring({ frame: f - 107, fps, config: { damping: 14, stiffness: 160 } })

  // 3. Brillo que recorre el icono (4 s) y otro al final (6 s).
  const brillo1 = interpolate(f, [118, 146], [-140, 140], { ...limitar, easing: Easing.inOut(Easing.cubic) })
  const brillo2 = interpolate(f, [178, 200], [-140, 140], { ...limitar, easing: Easing.inOut(Easing.cubic) })

  // 4. «Mi Salud», letra a letra (4,2 s → 5,3 s).
  const letras = [...'Mi Salud']

  // 5. La luz llena la pantalla y queda el fondo de la app (5 s → 5,8 s).
  const luz = interpolate(f, [150, 174], [0, 1], { ...limitar, easing: Easing.inOut(Easing.quad) })
  const colorLetra = interpolateColors(luz, [0, 1], ['#ffffff', AZUL_OSCURO])
  const acercar = interpolate(f, [150, 210], [1, 1.05], { ...limitar, easing: Easing.out(Easing.quad) })

  // Luz ambiente de la escena oscura.
  const haz = interpolate(f, [0, 60, 150], [-420, 40, 160], limitar)
  const hazOpacidad = interpolate(f, [0, 30, 150, 174], [0, 0.55, 0.55, 0], limitar)
  const halo = interpolate(f, [40, 110, 160], [0, 1, 0.8], limitar) * (1 + 0.08 * Math.sin(f / 9))

  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 42%, #10233d 0%, ${NOCHE} 70%)`, overflow: 'hidden' }}>
      {/* Haz de luz y motas */}
      <div
        style={{
          position: 'absolute',
          left: -400,
          top: height * 0.14,
          width: width + 820,
          height: 620,
          transform: `translateX(${haz}px) rotate(-28deg)`,
          background: 'linear-gradient(to bottom, transparent, rgb(120 175 235 / 0.22), transparent)',
          filter: 'blur(50px)',
          opacity: hazOpacidad,
        }}
      />
      {MOTAS.map((m, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: m.x * width,
            top: (m.y * height - f * m.v * 2 + height) % height,
            width: m.r * 2,
            height: m.r * 2,
            borderRadius: '50%',
            background: '#bcd8f5',
            opacity: m.o * hazOpacidad,
            filter: 'blur(1px)',
          }}
        />
      ))}

      {/* La luz que llena la pantalla y deja el fondo de la app */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 44%, #ffffff 0%, ${FONDO_APP} 35%)`,
          clipPath: `circle(${luz * 130}% at 50% 44%)`,
        }}
      />

      {/* Logo */}
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', perspective: 1700, transform: `scale(${acercar})` }}>
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: -140 }}>
          {/* Halo de luz detrás del icono */}
          <div
            style={{
              position: 'absolute',
              top: -LADO * 0.45,
              width: LADO * 1.9,
              height: LADO * 1.9,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgb(90 160 235 / 0.55) 0%, rgb(90 160 235 / 0) 62%)',
              opacity: halo * (1 - luz * 0.75),
              transform: `scale(${0.6 + halo * 0.4})`,
            }}
          />

          {/* Icono en 3D: varias capas detrás de la cara le dan grosor */}
          <div
            style={{
              width: LADO,
              height: LADO,
              position: 'relative',
              transformStyle: 'preserve-3d',
              transform: `translateY(${subida}px) scale(${escala}) rotateX(${giroX + balanceo * 0.4}deg) rotateY(${giroY + balanceo}deg)`,
              opacity: interpolate(f, [18, 32], [0, 1], limitar),
            }}
          >
            {Array.from({ length: 12 }, (_, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: RADIO,
                  background: interpolateColors(i, [0, 11], [AZUL_OSCURO, '#0f2338']),
                  transform: `translateZ(${-(i + 1) * 3}px)`,
                }}
              />
            ))}
            {/* Sombra realista bajo el icono */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: RADIO,
                transform: 'translateZ(-40px) translateY(46px) scale(0.92)',
                background: 'rgb(0 0 0 / 0.55)',
                filter: 'blur(38px)',
                opacity: interpolate(luz, [0, 1], [1, 0.45]),
              }}
            />
            {/* Cara del icono */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: RADIO,
                overflow: 'hidden',
                background: `linear-gradient(150deg, #3a6d9f 0%, ${AZUL} 45%, #28537d 100%)`,
                boxShadow: `inset 0 3px 0 rgb(255 255 255 / 0.18), 0 0 ${interpolate(f, [60, 100], [0, 40], limitar)}px rgb(120 185 255 / ${0.5 * (1 - luz)})`,
              }}
            >
              <svg viewBox="0 0 512 512" width={LADO} height={LADO} style={{ position: 'absolute', inset: 0 }}>
                <g
                  style={{
                    transformOrigin: '256px 270px',
                    transform: `scale(${corazon}) rotate(${interpolate(corazon, [0, 1], [-10, 0])}deg)`,
                  }}
                >
                  <path
                    d="M256 412c-12 0-150-88-150-196 0-52 40-92 90-92 30 0 50 14 60 30 10-16 30-30 60-30 50 0 90 40 90 92 0 108-138 196-150 196z"
                    fill="#ffffff"
                    style={{ filter: `drop-shadow(0 6px 10px rgb(0 0 0 / 0.25))` }}
                  />
                  <rect x="232" y="186" width="48" height="140" rx="10" fill={AZUL} style={{ transformOrigin: '256px 256px', transform: `scaleY(${cruzV})` }} />
                  <rect x="186" y="232" width="140" height="48" rx="10" fill={AZUL} style={{ transformOrigin: '256px 256px', transform: `scaleX(${cruzH})` }} />
                </g>
              </svg>
              {/* Reflejo de luz que recorre la cara */}
              {[brillo1, brillo2].map((x, i) => (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    top: '-20%',
                    bottom: '-20%',
                    width: '45%',
                    left: `${x}%`,
                    transform: 'skewX(-20deg)',
                    background: 'linear-gradient(90deg, transparent, rgb(255 255 255 / 0.38), transparent)',
                  }}
                />
              ))}
            </div>
          </div>

          {/* «Mi Salud» con la letra y la proporción del logo de la app */}
          <div
            style={{
              marginTop: Math.round(LADO * (2 / 44)) + 12,
              fontFamily: LETRA,
              fontWeight: 800,
              fontSize: TAM_LETRA,
              lineHeight: 1.1,
              color: colorLetra,
              display: 'flex',
              whiteSpace: 'pre',
              textShadow: `0 6px 30px rgb(0 0 0 / ${0.45 * (1 - luz)})`,
            }}
          >
            {letras.map((l, i) => {
              const t = spring({ frame: f - 128 - i * 3, fps, config: { damping: 18, stiffness: 110 } })
              return (
                <span
                  key={i}
                  style={{
                    display: 'inline-block',
                    opacity: t,
                    transform: `translateY(${interpolate(t, [0, 1], [50, 0])}px)`,
                    filter: `blur(${interpolate(t, [0, 1], [14, 0])}px)`,
                  }}
                >
                  {l}
                </span>
              )
            })}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}
