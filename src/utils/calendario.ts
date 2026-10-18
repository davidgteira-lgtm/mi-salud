// "Añadir al calendario del móvil": así es el propio teléfono el que avisa de la cita
// o de la revisión, aunque Mi Salud esté cerrada.
import type { Cita } from '../db/tipos'

const DURACION_MINUTOS = 30

/** Cualquier cosa que se puede poner en el calendario: una cita, una revisión, una vacuna… */
export interface EventoCalendario {
  id: string
  fecha: string
  hora?: string
  titulo: string
  lugar?: string
  descripcion?: string
}

function sinGuiones(fecha: string): string {
  return fecha.replaceAll('-', '')
}

/** "2026-10-20" → "20261021" (el día siguiente, para citas sin hora). */
function diaSiguiente(fecha: string): string {
  const [a, m, d] = fecha.split('-').map(Number)
  const f = new Date(Date.UTC(a, m - 1, d + 1))
  return `${f.getUTCFullYear()}${String(f.getUTCMonth() + 1).padStart(2, '0')}${String(f.getUTCDate()).padStart(2, '0')}`
}

/** "2026-10-20" y "10:30" → inicio y fin en formato de calendario (hora local). */
function inicioYFin(fecha: string, hora: string): [string, string] {
  const [h, min] = hora.split(':').map(Number)
  const total = h * 60 + min + DURACION_MINUTOS
  const p = (n: number) => String(n).padStart(2, '0')
  const fin = `${p(Math.floor(total / 60) % 24)}${p(total % 60)}00`
  const diaFin = total >= 24 * 60 ? diaSiguiente(fecha) : sinGuiones(fecha)
  return [`${sinGuiones(fecha)}T${p(h)}${p(min)}00`, `${diaFin}T${fin}`]
}

export function tituloCita(c: Cita): string {
  return `Cita: ${c.especialidad}${c.medico ? ` (${c.medico})` : ''}`
}

export function eventoDeCita(c: Cita): EventoCalendario {
  return {
    id: c.id,
    fecha: c.fecha,
    hora: c.hora,
    titulo: tituloCita(c),
    lugar: c.lugar,
    descripcion: [c.motivo && `Motivo: ${c.motivo}`, 'Apuntada en Mi Salud'].filter(Boolean).join('\n'),
  }
}

/** Escapa el texto como piden los archivos de calendario. */
function escapar(t: string): string {
  return t.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
}

/** Las líneas de más de 75 caracteres se parten (lo pide el formato). */
function plegar(linea: string): string {
  const partes: string[] = []
  let resto = linea
  while (resto.length > 75) {
    partes.push(resto.slice(0, 75))
    resto = ' ' + resto.slice(75)
  }
  partes.push(resto)
  return partes.join('\r\n')
}

/**
 * Archivo de calendario (.ics). Con hora: avisa el día antes y 2 horas antes.
 * Sin hora (todo el día): avisa el día antes y ese mismo día a las 9 de la mañana.
 */
export function crearIcsEvento(e: EventoCalendario, ahora: Date = new Date()): string {
  const sello = ahora.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const cuando = e.hora
    ? (() => {
        const [ini, fin] = inicioYFin(e.fecha, e.hora)
        return [`DTSTART:${ini}`, `DTEND:${fin}`]
      })()
    : [`DTSTART;VALUE=DATE:${sinGuiones(e.fecha)}`, `DTEND;VALUE=DATE:${diaSiguiente(e.fecha)}`]

  const aviso = (cuandoAvisar: string) => [
    'BEGIN:VALARM',
    `TRIGGER:${cuandoAvisar}`,
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapar(e.titulo)}`,
    'END:VALARM',
  ]

  const lineas = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Mi Salud//ES',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${e.id}@mi-salud`,
    `DTSTAMP:${sello}`,
    ...cuando,
    `SUMMARY:${escapar(e.titulo)}`,
    ...(e.lugar ? [`LOCATION:${escapar(e.lugar)}`] : []),
    ...(e.descripcion ? [`DESCRIPTION:${escapar(e.descripcion)}`] : []),
    ...aviso('-P1D'),
    ...aviso(e.hora ? '-PT2H' : 'PT9H'),
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return lineas.map(plegar).join('\r\n') + '\r\n'
}

export function crearIcs(c: Cita, ahora: Date = new Date()): string {
  return crearIcsEvento(eventoDeCita(c), ahora)
}

/** Enlace para añadirlo en Google Calendar (necesita internet al pulsarlo). */
export function enlaceGoogleEvento(e: EventoCalendario): string {
  const fechas = e.hora ? inicioYFin(e.fecha, e.hora).join('/') : `${sinGuiones(e.fecha)}/${diaSiguiente(e.fecha)}`
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: e.titulo,
    dates: fechas,
    ctz: 'Europe/Madrid',
  })
  if (e.descripcion) p.set('details', e.descripcion)
  if (e.lugar) p.set('location', e.lugar)
  return `https://calendar.google.com/calendar/render?${p.toString()}`
}

export function enlaceGoogleCalendar(c: Cita): string {
  return enlaceGoogleEvento(eventoDeCita(c))
}

/** "cita-cardiologia-2026-10-20.ics" */
export function nombreArchivoIcs(c: Cita): string {
  return `cita-${enMinusculasSinAcentos(c.especialidad)}-${c.fecha}.ics`
}

function enMinusculasSinAcentos(t: string): string {
  return t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Lo pone en el calendario del móvil. En Android con internet abre Google Calendar;
 * si no, descarga un archivo de calendario (en iPhone se abre directamente el Calendario).
 */
export function anadirAlCalendario(e: EventoCalendario, nombreArchivo = `${enMinusculasSinAcentos(e.titulo)}-${e.fecha}.ics`): void {
  const android = /android/i.test(navigator.userAgent)
  if (android && navigator.onLine) {
    window.open(enlaceGoogleEvento(e), '_blank', 'noopener')
    return
  }
  const archivo = new Blob([crearIcsEvento(e)], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(archivo)
  const enlace = document.createElement('a')
  enlace.href = url
  if (!/iphone|ipad/i.test(navigator.userAgent)) enlace.download = nombreArchivo
  enlace.click()
  setTimeout(() => URL.revokeObjectURL(url), 30_000)
}
