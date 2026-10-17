import { describe, expect, it } from 'vitest'
import { conLaRegla, duracionRegla, muestraRegla, resumirCiclos, sumarDias } from './ciclos'

describe('sumar días', () => {
  it('cambia bien de mes y de año', () => {
    expect(sumarDias('2026-10-30', 3)).toBe('2026-11-02')
    expect(sumarDias('2026-12-30', 5)).toBe('2027-01-04')
    expect(sumarDias('2028-02-27', 2)).toBe('2028-02-29') // bisiesto
  })
})

describe('duración de la regla', () => {
  it('cuenta el primer y el último día', () => {
    expect(duracionRegla({ inicio: '2026-10-02', fin: '2026-10-06' })).toBe(5)
    expect(duracionRegla({ inicio: '2026-10-02', fin: '2026-10-02' })).toBe(1)
  })

  it('si no ha acabado, no se sabe', () => {
    expect(duracionRegla({ inicio: '2026-10-02' })).toBeNull()
  })
})

describe('¿con la regla en esta fecha?', () => {
  const ciclos = [
    { inicio: '2026-09-04', fin: '2026-09-08' },
    { inicio: '2026-10-02' }, // sin fin: se cuentan 5 días (2 al 6)
  ]

  it('dentro de una regla', () => {
    expect(conLaRegla('2026-09-04', ciclos)).toBe(true)
    expect(conLaRegla('2026-09-08', ciclos)).toBe(true)
    expect(conLaRegla('2026-10-06', ciclos)).toBe(true)
  })

  it('fuera de las reglas', () => {
    expect(conLaRegla('2026-09-09', ciclos)).toBe(false)
    expect(conLaRegla('2026-10-07', ciclos)).toBe(false)
    expect(conLaRegla('2026-09-20', [])).toBe(false)
  })
})

describe('resumen de los ciclos', () => {
  it('sin datos no hay resumen', () => {
    expect(resumirCiclos([])).toBeNull()
  })

  it('con una sola regla: día del ciclo, pero aún sin media ni próxima', () => {
    const r = resumirCiclos([{ inicio: '2026-10-02', fin: '2026-10-06' }], '2026-10-17')!
    expect(r.diaDelCiclo).toBe(16)
    expect(r.media).toBeNull()
    expect(r.proxima).toBeNull()
    expect(r.enCurso).toBe(false)
  })

  it('calcula cada cuánto viene y la próxima', () => {
    const r = resumirCiclos(
      [
        { inicio: '2026-07-10', fin: '2026-07-14' },
        { inicio: '2026-08-07', fin: '2026-08-11' },
        { inicio: '2026-09-04', fin: '2026-09-08' },
        { inicio: '2026-10-02', fin: '2026-10-06' },
      ],
      '2026-10-17',
    )!
    expect(r.longitudes).toEqual([28, 28, 28])
    expect(r.media).toBe(28)
    expect(r.proxima).toBe('2026-10-30')
    expect(r.irregular).toBe(false)
  })

  it('el orden en que se apuntaron da igual', () => {
    const r = resumirCiclos([{ inicio: '2026-10-02' }, { inicio: '2026-08-31' }, { inicio: '2026-09-30' }], '2026-10-03')!
    expect(r.longitudes).toEqual([30, 2])
    expect(r.ultimo.inicio).toBe('2026-10-02')
  })

  it('avisa si los ciclos cambian mucho', () => {
    const r = resumirCiclos([{ inicio: '2026-06-01' }, { inicio: '2026-06-24' }, { inicio: '2026-07-30' }, { inicio: '2026-08-25' }])!
    expect(r.longitudes).toEqual([23, 36, 26])
    expect(r.irregular).toBe(true)
  })

  it('sabe si la regla está en curso', () => {
    expect(resumirCiclos([{ inicio: '2026-10-15' }], '2026-10-17')!.enCurso).toBe(true)
    expect(resumirCiclos([{ inicio: '2026-10-15', fin: '2026-10-16' }], '2026-10-17')!.enCurso).toBe(false)
  })
})

describe('a quién se le enseña la regla', () => {
  it('a las mujeres sí, salvo que lo quiten; a los hombres nunca; al resto si lo activan', () => {
    expect(muestraRegla({ sexo: 'mujer' })).toBe(true)
    expect(muestraRegla({ sexo: 'mujer', apuntarRegla: false })).toBe(false)
    expect(muestraRegla({ sexo: 'hombre', apuntarRegla: true })).toBe(false)
    expect(muestraRegla({ sexo: 'otro' })).toBe(false)
    expect(muestraRegla({ sexo: 'otro', apuntarRegla: true })).toBe(true)
    expect(muestraRegla({})).toBe(false)
    expect(muestraRegla(undefined)).toBe(false)
  })
})
