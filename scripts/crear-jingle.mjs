// Jingle ORIGINAL de la intro (8 s), sintetizado aquí mismo: sin música de nadie ni licencias.
// Va al compás de la animación (src/intro/AnimacionLogo.tsx). Necesita ffmpeg para pasarlo a M4A.
// Uso: node scripts/crear-jingle.mjs  → src/intro/jingle.m4a
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const HZ = 44100
const DURACION = 8
const N = HZ * DURACION
const izq = new Float32Array(N)
const der = new Float32Array(N)

const frec = (midi) => 440 * 2 ** ((midi - 69) / 12)
/** Suma una señal mono, un poco más a un lado que a otro (panorama de -1 a 1). */
function sumar(t0, dur, fn, pan = 0) {
  const a = Math.max(0, Math.floor(t0 * HZ))
  const b = Math.min(N, Math.floor((t0 + dur) * HZ))
  const gi = Math.cos(((pan + 1) * Math.PI) / 4)
  const gd = Math.sin(((pan + 1) * Math.PI) / 4)
  for (let i = a; i < b; i++) {
    const v = fn((i - a) / HZ)
    izq[i] += v * gi
    der[i] += v * gd
  }
}

/** Campana: varios armónicos que se apagan a distinto ritmo (suena a cristal o a celesta). */
function campana(t0, midi, amp, largo = 1.6, pan = 0) {
  const f = frec(midi)
  const parciales = [
    [1, 1, 1],
    [2, 0.32, 0.6],
    [2.76, 0.22, 0.42],
    [5.4, 0.08, 0.2],
  ]
  sumar(t0, largo * 2.2, (t) => {
    const ataque = Math.min(1, t / 0.004)
    let v = 0
    for (const [m, a, d] of parciales) v += a * Math.sin(2 * Math.PI * f * m * t) * Math.exp(-t / (largo * d))
    return amp * ataque * v
  }, pan)
}

/** Colchón de cuerdas suave: notas algo desafinadas entre sí, que entran y salen despacio. */
function colchon(t0, t1, midis, amp, ataque = 1.2, salida = 1.4) {
  const dur = t1 - t0 + salida
  midis.forEach((midi, k) => {
    const f = frec(midi)
    const pan = ((k % 3) - 1) * 0.5
    sumar(t0, dur, (t) => {
      const e = Math.min(1, t / ataque) * (t > t1 - t0 ? Math.exp(-(t - (t1 - t0)) / (salida / 3)) : 1)
      const vib = 1 + 0.06 * Math.sin(2 * Math.PI * 0.3 * t + k)
      let v = 0
      for (const desafino of [-0.004, 0, 0.004]) {
        const fi = f * (1 + desafino)
        v += Math.sin(2 * Math.PI * fi * t) + 0.25 * Math.sin(4 * Math.PI * fi * t) + 0.08 * Math.sin(6 * Math.PI * fi * t)
      }
      return (amp / 3) * e * vib * v
    }, pan)
  })
}

/** Golpe grave de cine: un tono muy bajo que cae de afinación. */
function golpe(t0, amp, f0 = 70) {
  sumar(t0, 1.6, (t) => {
    const f = f0 * (0.6 + 0.4 * Math.exp(-t / 0.15))
    return amp * Math.min(1, t / 0.006) * Math.exp(-t / 0.45) * Math.sin(2 * Math.PI * f * t)
  })
}

/**
 * Soplo suave que anticipa la llegada de la luz: aire muy filtrado (sin siseo) que crece despacio,
 * con un acorde que sube de volumen como al revés, y se desvanece con suavidad en vez de cortarse.
 */
function subida(t0, t1, amp) {
  const largo = t1 - t0
  const cola = 0.5
  let f1 = 0
  let f2 = 0
  let semilla = 7
  sumar(t0, largo + cola, (t) => {
    semilla = (semilla * 16807) % 2147483647
    const ruido = semilla / 2147483647 - 0.5
    const x = Math.min(1, t / largo)
    // Dos filtros seguidos y un corte bajo: suena a aire, no a ruido.
    const corte = 0.004 + 0.035 * x * x
    f1 += corte * (ruido - f1)
    f2 += corte * (f1 - f2)
    // Crece con forma de S y, al llegar, se apaga suave.
    const forma = t < largo ? (1 - Math.cos(Math.PI * x)) / 2 : Math.exp(-(t - largo) / 0.18)
    return amp * forma * f2 * 14
  })
  // Acorde «al revés»: entra desde la nada y llega a la vez que la luz.
  for (const [midi, a] of [
    [72, 0.05],
    [79, 0.04],
    [84, 0.03],
  ]) {
    const f = frec(midi)
    sumar(t0, largo + cola, (t) => {
      const x = Math.min(1, t / largo)
      const forma = t < largo ? x ** 2.5 : Math.exp(-(t - largo) / 0.25)
      return a * forma * Math.sin(2 * Math.PI * f * t)
    })
  }
}

// ---------- La partitura, al compás de la animación (30 imágenes por segundo) ----------
colchon(0, 3.8, [48, 55, 64], 0.07, 1.4, 1.2) //            fondo cálido mientras todo está oscuro
golpe(0.67, 0.3, 66) //                                      entra el icono
campana(1.27, 76, 0.42, 1.8, -0.2) //                         aparece el corazón
campana(1.87, 79, 0.34, 1.4, 0.15) //                         la cruz…
campana(2.1, 84, 0.36, 1.6, 0.3)
;[72, 76, 79, 83].forEach((m, i) => campana(2.93 + i * 0.09, m, 0.2, 0.7, -0.4 + i * 0.25)) // «Mi Salud»
subida(2.95, 3.73, 0.2) //                                    se acerca la luz (soplo suave)
golpe(3.73, 0.28, 55) //                                      llega la luz
colchon(3.73, 7.2, [48, 55, 64, 71, 74], 0.075, 0.35, 1.3) // acorde abierto y luminoso
campana(3.75, 96, 0.12, 1.2, 0.5) //                          destellos
campana(3.8, 100, 0.08, 1.0, -0.5)
// El lema: una frase corta que se resuelve.
campana(4.2, 79, 0.24, 1.2, -0.1)
campana(4.6, 88, 0.22, 1.2, 0.1)
campana(5.0, 86, 0.2, 1.2, 0)
campana(5.5, 84, 0.3, 2.4, 0)
campana(5.5, 72, 0.14, 2.4, 0)

// ---------- Sala: una reverberación sencilla (filtros en peine y paso-todo) ----------
function reverberar(canal, desfase) {
  const peines = [1116, 1188, 1277, 1356].map((d) => d + desfase)
  const salida = new Float32Array(N)
  for (const d of peines) {
    const buf = new Float32Array(d)
    let pos = 0
    let lp = 0
    for (let i = 0; i < N; i++) {
      const y = buf[pos]
      lp = y * 0.7 + lp * 0.3
      buf[pos] = canal[i] + lp * 0.8
      salida[i] += y
      pos = (pos + 1) % d
    }
  }
  for (const d of [556 + desfase, 225 + desfase]) {
    const buf = new Float32Array(d)
    let pos = 0
    for (let i = 0; i < N; i++) {
      const b = buf[pos]
      const y = -salida[i] + b
      buf[pos] = salida[i] + b * 0.5
      salida[i] = y
      pos = (pos + 1) % d
    }
  }
  return salida
}
const ri = reverberar(izq, 0)
const rd = reverberar(der, 23)
for (let i = 0; i < N; i++) {
  izq[i] = izq[i] * 0.8 + ri[i] * 0.07
  der[i] = der[i] * 0.8 + rd[i] * 0.07
}

// ---------- Volumen final: sin pasarse, y se apaga del todo al acabar ----------
let pico = 0
for (let i = 0; i < N; i++) pico = Math.max(pico, Math.abs(izq[i]), Math.abs(der[i]))
const ganancia = 0.85 / pico
const datos = Buffer.alloc(44 + N * 4)
datos.write('RIFF', 0)
datos.writeUInt32LE(36 + N * 4, 4)
datos.write('WAVEfmt ', 8)
datos.writeUInt32LE(16, 16)
datos.writeUInt16LE(1, 20)
datos.writeUInt16LE(2, 22)
datos.writeUInt32LE(HZ, 24)
datos.writeUInt32LE(HZ * 4, 28)
datos.writeUInt16LE(4, 32)
datos.writeUInt16LE(16, 34)
datos.write('data', 36)
datos.writeUInt32LE(N * 4, 40)
for (let i = 0; i < N; i++) {
  const t = i / HZ
  const fundido = t > DURACION - 0.8 ? Math.max(0, (DURACION - t) / 0.8) : 1
  const a = (x) => Math.round(Math.max(-1, Math.min(1, x * ganancia * fundido)) * 32767)
  datos.writeInt16LE(a(izq[i]), 44 + i * 4)
  datos.writeInt16LE(a(der[i]), 46 + i * 4)
}

const carpeta = mkdtempSync(join(tmpdir(), 'jingle-'))
const wav = join(carpeta, 'jingle.wav')
writeFileSync(wav, datos)
const destino = new URL('../src/intro/jingle.m4a', import.meta.url)
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wav, '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', destino.pathname.replace(/^\/([A-Za-z]:)/, '$1')])
rmSync(carpeta, { recursive: true, force: true })
console.log('Jingle creado en src/intro/jingle.m4a')
