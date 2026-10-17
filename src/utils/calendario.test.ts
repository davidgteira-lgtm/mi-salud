import { describe, expect, it } from 'vitest'
import type { Cita } from '../db/tipos'
import { crearIcs, enlaceGoogleCalendar, nombreArchivoIcs } from './calendario'

const base: Cita = {
  id: 'abc',
  perfilId: 'p',
  creadoEn: 0,
  actualizadoEn: 0,
  fecha: '2026-10-20',
  especialidad: 'Cardiología',
}

describe('archivo de calendario', () => {
  it('cita con hora: empieza a esa hora, dura 30 minutos y avisa el día antes y 2 horas antes', () => {
    const ics = crearIcs({ ...base, hora: '10:30', lugar: 'Hospital La Paz, planta 2' }, new Date(Date.UTC(2026, 9, 17, 8)))
    expect(ics).toContain('DTSTART:20261020T103000')
    expect(ics).toContain('DTEND:20261020T110000')
    expect(ics).toContain('SUMMARY:Cita: Cardiología')
    expect(ics).toContain('LOCATION:Hospital La Paz\\, planta 2')
    expect(ics).toContain('TRIGGER:-P1D')
    expect(ics).toContain('TRIGGER:-PT2H')
    expect(ics).toContain('DTSTAMP:20261017T080000Z')
    expect(ics.split('\r\n')[0]).toBe('BEGIN:VCALENDAR')
  })

  it('cita sin hora: ocupa el día entero y avisa solo el día antes', () => {
    const ics = crearIcs(base)
    expect(ics).toContain('DTSTART;VALUE=DATE:20261020')
    expect(ics).toContain('DTEND;VALUE=DATE:20261021')
    expect(ics).not.toContain('TRIGGER:-PT2H')
  })

  it('cambia bien de mes y de año', () => {
    expect(crearIcs({ ...base, fecha: '2026-12-31' })).toContain('DTEND;VALUE=DATE:20270101')
    expect(crearIcs({ ...base, fecha: '2026-12-31', hora: '23:45' })).toContain('DTEND:20270101T001500')
  })

  it('parte las líneas largas', () => {
    const ics = crearIcs({ ...base, motivo: 'Revisión '.repeat(20) })
    for (const linea of ics.split('\r\n')) expect(linea.length).toBeLessThanOrEqual(75)
  })
})

describe('Google Calendar', () => {
  it('crea el enlace con la hora de España', () => {
    const url = new URL(enlaceGoogleCalendar({ ...base, hora: '10:30', medico: 'Dra. Gil' }))
    expect(url.hostname).toBe('calendar.google.com')
    expect(url.searchParams.get('dates')).toBe('20261020T103000/20261020T110000')
    expect(url.searchParams.get('ctz')).toBe('Europe/Madrid')
    expect(url.searchParams.get('text')).toBe('Cita: Cardiología (Dra. Gil)')
  })
})

describe('nombre del archivo', () => {
  it('sin tildes ni espacios', () => {
    expect(nombreArchivoIcs({ ...base, especialidad: 'Oftalmología (ojos)' })).toBe('cita-oftalmologia-ojos-2026-10-20.ics')
  })
})
