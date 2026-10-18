import { describe, expect, it } from 'vitest'
import { fechaDeTexto, leerParteBaja, leerRecetaGafas } from './leerDocumentos'
import type { FilaPdf } from './leerPdf'

/** Una fila con sus trozos en las x dadas, como las devuelve pdf.js. */
const fila = (...trozos: [number, string][]): FilaPdf => ({
  texto: trozos.map(([, s]) => s).join(' '),
  trozos: trozos.map(([x, str]) => ({ x, str })),
})
const texto = (s: string): FilaPdf => fila([50, s])

describe('fechaDeTexto', () => {
  it('entiende las fechas a la española', () => {
    expect(fechaDeTexto('Fecha: 18/08/2026')).toBe('2026-08-18')
    expect(fechaDeTexto('5-3-26')).toBe('2026-03-05')
    expect(fechaDeTexto('nada')).toBeUndefined()
    expect(fechaDeTexto('45/13/2026')).toBeUndefined()
  })
})

describe('leerRecetaGafas', () => {
  // Como receta-gafas-ejemplo.pdf: el ojo derecho no tiene cilindro ni eje (casillas vacías).
  const receta = [
    texto('ÓPTICA EJEMPLO - GRADUACIÓN'),
    texto('Cliente: PERSONA DE PRUEBA'),
    texto('Fecha: 18/08/2026'),
    fila([140, 'ESF'], [210, 'CIL'], [280, 'EJE'], [340, 'ADD'], [410, 'AV']),
    fila([50, 'OD'], [140, '-2,50'], [410, '1,0']),
    fila([50, 'OI'], [140, '-2,25'], [210, '-0,50'], [280, '180'], [410, '1,0']),
    texto('Lentes recomendadas: monofocales. Revisión en 1 año.'),
  ]

  it('pone cada número en su columna aunque haya casillas vacías', () => {
    const r = leerRecetaGafas(receta)!
    expect(r.derecho).toEqual({ esfera: '-2,50', agudeza: '1,0' })
    expect(r.izquierdo).toEqual({ esfera: '-2,25', cilindro: '-0,50', eje: '180', agudeza: '1,0' })
  })

  it('saca la fecha, la óptica y las lentes', () => {
    const r = leerRecetaGafas(receta)!
    expect(r.fecha).toBe('2026-08-18')
    expect(r.donde).toBe('Óptica Ejemplo')
    expect(r.tipo).toBe('gafas')
    expect(r.notas).toBe('Lentes recomendadas: monofocales. Revisión en 1 año.')
  })

  it('acepta números algo desplazados y en inglés', () => {
    const r = leerRecetaGafas([fila([100, 'SPH'], [160, 'CYL'], [220, 'AXIS']), fila([40, 'RE'], [104, '+1.25'], [158, '-0.75'], [226, '90°'])])!
    expect(r.derecho).toEqual({ esfera: '1,25', cilindro: '-0,75', eje: '90' })
  })

  it('no inventa nada si no es una receta', () => {
    expect(leerRecetaGafas([texto('Glucosa 98 mg/dl'), texto('Fecha: 01/01/2026')])).toBeNull()
  })
})

describe('leerParteBaja', () => {
  const comun = [
    texto('Fecha de la baja: 13/10/2026'),
    texto('Contingencia: enfermedad común'),
    texto('Diagnóstico: gripe (síndrome gripal)'),
    texto('Médico: Dra. Ejemplo - Centro de Salud Ejemplo'),
  ]

  it('lee un parte de baja', () => {
    const p = leerParteBaja([
      texto('PARTE MÉDICO DE BAJA DE INCAPACIDAD TEMPORAL'),
      texto('Trabajador/a: PERSONA DE PRUEBA'),
      texto('Empresa: EMPRESA EJEMPLO S. L.'),
      ...comun,
      texto('Fecha de la próxima revisión: 16/10/2026'),
    ])
    expect(p).toEqual({
      clase: 'baja',
      inicio: '2026-10-13',
      tipo: 'comun',
      motivo: 'Gripe',
      diagnostico: 'Gripe (síndrome gripal)',
      medico: 'Dra. Ejemplo',
      centro: 'Centro de Salud Ejemplo',
      empresa: 'Empresa Ejemplo S. L.',
      proximaRevision: '2026-10-16',
    })
  })

  it('lee un parte de confirmación', () => {
    const p = leerParteBaja([texto('PARTE MÉDICO DE CONFIRMACIÓN N.º 1 DE INCAPACIDAD TEMPORAL'), ...comun, texto('Fecha de este parte: 16/10/2026')])!
    expect(p.clase).toBe('confirmacion')
    expect(p.confirmacion).toBe('2026-10-16')
    expect(p.inicio).toBe('2026-10-13')
  })

  it('lee un parte de alta con su motivo', () => {
    const p = leerParteBaja([
      texto('PARTE MÉDICO DE ALTA DE INCAPACIDAD TEMPORAL'),
      texto('Contingencia: accidente de trabajo'),
      texto('Fecha del alta: 17/10/2026'),
      texto('Motivo del alta: mejoría que permite trabajar'),
    ])!
    expect(p).toMatchObject({ clase: 'alta', tipo: 'accidente-laboral', fin: '2026-10-17', tipoAlta: 'mejoria' })
  })

  it('no confunde otros documentos con un parte', () => {
    expect(leerParteBaja([texto('RECETA MÉDICA'), texto('Fecha de prescripción: 10/10/2026')])).toBeNull()
  })
})
