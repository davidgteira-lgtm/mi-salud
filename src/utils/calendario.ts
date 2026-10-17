// "Añadir al calendario del móvil": así es el propio teléfono el que avisa de la cita,
// aunque Mi Salud esté cerrada.
import type { Cita } from '../db/tipos'

const DURACION_MINUTOS = 30

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

function descripcionCita(c: Cita): string {
  return [c.motivo && `Motivo: ${c.motivo}`, 'Apuntada en Mi Salud'].filter(Boolean).join('\n')
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

/** Archivo de calendario (.ics) con avisos el día antes y 2 horas antes. */
export function crearIcs(c: Cita, ahora: Date = new Date()): string {
  const sello = ahora.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const cuando = c.hora
    ? (() => {
        const [ini, fin] = inicioYFin(c.fecha, c.hora)
        return [`DTSTART:${ini}`, `DTEND:${fin}`]
      })()
    : [`DTSTART;VALUE=DATE:${sinGuiones(c.fecha)}`, `DTEND;VALUE=DATE:${diaSiguiente(c.fecha)}`]

  const aviso = (cuandoAvisar: string) => [
    'BEGIN:VALARM',
    `TRIGGER:${cuandoAvisar}`,
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapar(tituloCita(c))}`,
    'END:VALARM',
  ]

  const lineas = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Mi Salud//ES',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${c.id}@mi-salud`,
    `DTSTAMP:${sello}`,
    ...cuando,
    `SUMMARY:${escapar(tituloCita(c))}`,
    ...(c.lugar ? [`LOCATION:${escapar(c.lugar)}`] : []),
    `DESCRIPTION:${escapar(descripcionCita(c))}`,
    ...aviso('-P1D'),
    ...(c.hora ? aviso('-PT2H') : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return lineas.map(plegar).join('\r\n') + '\r\n'
}

/** Enlace para añadirla en Google Calendar (necesita internet al pulsarlo). */
export function enlaceGoogleCalendar(c: Cita): string {
  const fechas = c.hora ? inicioYFin(c.fecha, c.hora).join('/') : `${sinGuiones(c.fecha)}/${diaSiguiente(c.fecha)}`
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: tituloCita(c),
    dates: fechas,
    ctz: 'Europe/Madrid',
    details: descripcionCita(c),
  })
  if (c.lugar) p.set('location', c.lugar)
  return `https://calendar.google.com/calendar/render?${p.toString()}`
}

/** "cita-cardiologia-2026-10-20.ics" */
export function nombreArchivoIcs(c: Cita): string {
  const esp = c.especialidad
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `cita-${esp}-${c.fecha}.ics`
}
