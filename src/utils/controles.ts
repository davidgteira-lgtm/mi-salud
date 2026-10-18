// Controles en casa: si la persona tiene diabetes o tensión alta (porque está en su historial
// o porque toma medicación para ello), la app le recuerda cada día medirse el azúcar o la tensión.
import type { EntradaHistorial, FechaISO, Medida, Medicamento } from '../db/tipos'
import { tipoDeMedicamento } from './medicamentos'
import { normalizar } from './texto'

export interface ControlEnCasa {
  tipo: 'glucosa' | 'tension'
  /** «Mídete el azúcar». */
  titulo: string
  /** Por qué se pide: «Por tu diabetes». */
  motivo: string
  /** La medida de hoy, si ya está apuntada. */
  deHoy?: Medida
}

const DIABETES = /diabet/
const HIPERTENSION = /hipertension|tension alta|presion alta/

export function controlesEnCasa(p: {
  enfermedades: Pick<EntradaHistorial, 'titulo'>[]
  medicamentos: Pick<Medicamento, 'nombre' | 'familia' | 'paraQue'>[]
  medidas: Pick<Medida, 'tipo' | 'fecha' | 'hora' | 'valor' | 'valor2' | 'momento' | 'id'>[]
  hoy: FechaISO
}): ControlEnCasa[] {
  const textos = p.enfermedades.map((e) => normalizar(e.titulo))
  const tipos = p.medicamentos.map((m) => normalizar(`${tipoDeMedicamento(m) ?? ''} ${m.paraQue ?? ''}`))
  const tiene = (patron: RegExp, medicina: RegExp) => textos.some((t) => patron.test(t)) || tipos.some((t) => medicina.test(t))
  const deHoy = (tipo: Medida['tipo']) =>
    p.medidas.filter((m) => m.tipo === tipo && m.fecha === p.hoy).sort((a, b) => (b.hora ?? '').localeCompare(a.hora ?? ''))[0] as Medida | undefined

  const lista: ControlEnCasa[] = []
  if (tiene(DIABETES, /antidiabetico|insulina|azucar/)) {
    lista.push({ tipo: 'glucosa', titulo: 'Mídete el azúcar', motivo: 'Por tu diabetes', deHoy: deHoy('glucosa') })
  }
  if (tiene(HIPERTENSION, /antihipertensivo|tension/)) {
    lista.push({ tipo: 'tension', titulo: 'Tómate la tensión', motivo: 'Por tu tensión alta', deHoy: deHoy('tension') })
  }
  return lista
}
