import { describe, expect, it } from 'vitest'
import { CATALOGO, GRUPOS } from '../datos/catalogoMedicamentos'
import {
  buscarMedicamento,
  comprobarAlergias,
  ejemplosDeAviso,
  normalizar,
  resolverAlergia,
  sugerirMedicamentos,
  type AlergiaParaComprobar,
} from './medicamentos'

const alergia = (nombre: string, tipo: AlergiaParaComprobar['tipo'] = 'medicamento'): AlergiaParaComprobar => ({
  id: nombre,
  nombre,
  tipo,
})

describe('normalizar', () => {
  it('quita tildes, mayúsculas y signos', () => {
    expect(normalizar('Amoxicilina/Ácido Clavulánico 875mg')).toBe('amoxicilina acido clavulanico 875mg')
    expect(normalizar('  NOLOTIL  ')).toBe('nolotil')
  })
})

describe('buscarMedicamento', () => {
  it('reconoce el principio activo aunque lleve dosis', () => {
    expect(buscarMedicamento('Ibuprofeno 600 mg')?.nombre).toBe('ibuprofeno')
    expect(buscarMedicamento('omeprazol 20mg cápsulas')?.nombre).toBe('omeprazol')
  })

  it('reconoce nombres comerciales', () => {
    expect(buscarMedicamento('Nolotil')?.nombre).toBe('metamizol')
    expect(buscarMedicamento('Sintrom 4 mg')?.nombre).toBe('acenocumarol')
    expect(buscarMedicamento('ADIRO 100')?.nombre).toBe('acido acetilsalicilico')
    expect(buscarMedicamento('Augmentine 875/125')?.nombre).toBe('amoxicilina clavulanico')
  })

  it('da igual escribirlo con o sin tildes', () => {
    expect(buscarMedicamento('losartán')?.nombre).toBe('losartan')
    expect(buscarMedicamento('Ácido acetilsalicílico')?.nombre).toBe('acido acetilsalicilico')
  })

  it('prefiere el nombre más completo', () => {
    expect(buscarMedicamento('Amoxicilina/Ácido clavulánico')?.nombre).toBe('amoxicilina clavulanico')
    expect(buscarMedicamento('Amoxicilina 500')?.nombre).toBe('amoxicilina')
  })

  it('no confunde palabras que solo se parecen', () => {
    expect(buscarMedicamento('calcioantagonista')).toBeUndefined()
    expect(buscarMedicamento('Vitaminas para el pelo')).toBeUndefined()
    expect(buscarMedicamento('')).toBeUndefined()
  })
})

describe('sugerirMedicamentos', () => {
  it('sugiere a partir de 3 letras', () => {
    expect(sugerirMedicamentos('am')).toEqual([])
    expect(sugerirMedicamentos('amox')).toContain('Amoxicilina')
    expect(sugerirMedicamentos('nolo')).toEqual(['Nolotil'])
    expect(sugerirMedicamentos('SINTR')).toEqual(['Sintrom'])
  })
})

describe('resolverAlergia', () => {
  it('entiende "alergia a la penicilina" como el grupo entero', () => {
    expect(resolverAlergia('Penicilina').grupos).toContain('penicilinas')
    expect(resolverAlergia('penicilinas y derivados').grupos).toContain('penicilinas')
  })

  it('entiende los antiinflamatorios como grupo', () => {
    expect(resolverAlergia('Antiinflamatorios').grupos).toEqual(['aines'])
    expect(resolverAlergia('AINEs').grupos).toEqual(['aines'])
  })

  it('un medicamento concreto trae su grupo', () => {
    expect(resolverAlergia('Nolotil').grupos).toEqual(['pirazolonas'])
    expect(resolverAlergia('Aspirina').grupos).toEqual(['aines'])
  })

  it('sin grupo conocido devuelve lista vacía', () => {
    expect(resolverAlergia('Omeprazol').grupos).toEqual([])
    expect(resolverAlergia('Esparadrapo').grupos).toEqual([])
  })
})

describe('comprobarAlergias', () => {
  it('avisa (alto) si es el mismo medicamento', () => {
    const [aviso] = comprobarAlergias('Ibuprofeno 600', [alergia('Ibuprofeno')])
    expect(aviso.nivel).toBe('alto')
  })

  it('avisa (alto) con un nombre comercial del mismo medicamento', () => {
    expect(comprobarAlergias('Nolotil', [alergia('Metamizol')])[0]?.nivel).toBe('alto')
    expect(comprobarAlergias('Dalsy', [alergia('ibuprofeno')])[0]?.nivel).toBe('alto')
  })

  it('avisa (alto) si es de la misma familia', () => {
    const [aviso] = comprobarAlergias('Augmentine', [alergia('Penicilina')])
    expect(aviso.nivel).toBe('alto')
    expect(aviso.motivo).toContain('penicilinas')
    expect(comprobarAlergias('Enantyum', [alergia('Aspirina')])[0]?.nivel).toBe('alto')
  })

  it('avisa con precaución si es de una familia relacionada', () => {
    const [aviso] = comprobarAlergias('Cefuroxima 500', [alergia('Penicilina')])
    expect(aviso.nivel).toBe('precaucion')
    expect(comprobarAlergias('Nolotil', [alergia('Antiinflamatorios')])[0]?.nivel).toBe('precaucion')
  })

  it('no avisa si no hay relación', () => {
    expect(comprobarAlergias('Omeprazol', [alergia('Penicilina')])).toEqual([])
    expect(comprobarAlergias('Paracetamol', [alergia('Ibuprofeno')])).toEqual([])
    expect(comprobarAlergias('Azitromicina', [alergia('Penicilina')])).toEqual([])
  })

  it('las alergias a alimentos no cuentan para los medicamentos', () => {
    expect(comprobarAlergias('Ibuprofeno', [alergia('Ibuprofeno', 'alimento')])).toEqual([])
  })

  it('pone primero los avisos fuertes', () => {
    const avisos = comprobarAlergias('Cefuroxima', [alergia('Penicilina'), alergia('Cefalosporinas')])
    expect(avisos.map((a) => a.nivel)).toEqual(['alto', 'precaucion'])
  })

  it('no falla con textos vacíos o muy cortos', () => {
    expect(comprobarAlergias('', [alergia('Penicilina')])).toEqual([])
    expect(comprobarAlergias('Ibuprofeno', [alergia('a')])).toEqual([])
  })
})

describe('ejemplosDeAviso', () => {
  it('pone ejemplos de la misma familia', () => {
    const ej = ejemplosDeAviso('Penicilina')
    expect(ej).toContain('Amoxicilina')
    expect(ej).not.toContain('Penicilina')
  })

  it('nada si no hay familia conocida', () => {
    expect(ejemplosDeAviso('Omeprazol')).toEqual([])
  })
})

describe('la lista de medicamentos está bien hecha', () => {
  it('no repite ningún nombre', () => {
    const nombres = CATALOGO.flatMap((m) => [m.nombre, ...(m.otrosNombres ?? [])]).map(normalizar)
    const repetidos = nombres.filter((n, i) => nombres.indexOf(n) !== i)
    expect(repetidos).toEqual([])
  })

  it('todos tienen familia y para qué', () => {
    for (const m of CATALOGO) {
      expect(m.familia, m.nombre).not.toBe('')
      expect(m.paraQue, m.nombre).not.toBe('')
    }
  })

  it('los grupos usados existen', () => {
    for (const m of CATALOGO) for (const g of m.grupos ?? []) expect(GRUPOS[g], `${m.nombre}: ${g}`).toBeDefined()
  })

  it('cada medicamento se encuentra por su propio nombre', () => {
    for (const m of CATALOGO) {
      for (const n of [m.nombre, ...(m.otrosNombres ?? [])]) expect(buscarMedicamento(n), n).toBe(m)
    }
  })
})
