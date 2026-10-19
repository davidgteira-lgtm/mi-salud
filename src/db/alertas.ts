// Lo pendiente de hoy, para el banner de «Alertas» del inicio: tomas sin marcar, controles en casa,
// citas cercanas y revisiones que tocan.
import { controlesEnCasa } from '../utils/controles'
import { calcularEdad, diasEntre, esFechaValida, hoyISO } from '../utils/fechas'
import { horasDe, tomaActual } from '../utils/tomas'
import { listarProximas } from './citas'
import { db } from './db'
import { enfermedadesCronicas } from './historial'
import { listarMedicamentos } from './medicamentos'
import { datosEnlazados, listarRegistros, queToca } from './revisiones'
import { buscarToma } from './tomas'
import type { Perfil } from './tipos'

/** Citas que se avisan: las de los próximos días. */
export const DIAS_AVISO_CITAS = 7

export interface ResumenAlertas {
  sinTomar: number
  citas: number
  controles: string[]
  revisiones: number
}

export async function resumenAlertas(perfil: Perfil, ahora: Date = new Date()): Promise<ResumenAlertas> {
  const hoy = hoyISO(ahora)
  const [medicamentos, citas, enfermedades, medidas, registros, enlazados] = await Promise.all([
    listarMedicamentos(perfil.id, true),
    listarProximas(perfil.id, hoy),
    enfermedadesCronicas(perfil.id),
    db.constantes.where('[perfilId+fecha]').equals([perfil.id, hoy]).toArray(),
    listarRegistros(perfil.id),
    datosEnlazados(perfil.id),
  ])

  let sinTomar = 0
  for (const m of medicamentos) {
    const actual = tomaActual(horasDe(m), ahora)
    if (actual && !(await buscarToma(m.id, actual))) sinTomar++
  }
  const edad = perfil.fechaNacimiento && esFechaValida(perfil.fechaNacimiento) ? calcularEdad(perfil.fechaNacimiento) : undefined
  const revisiones = queToca({
    edad,
    sexo: perfil.sexo,
    registros,
    enlazados,
    ocultas: perfil.revisionesOcultas,
    propias: perfil.revisionesPropias,
  }).filter((x) => x.estado === 'toca').length

  return {
    sinTomar,
    citas: citas.filter((c) => diasEntre(hoy, c.fecha) <= DIAS_AVISO_CITAS).length,
    controles: controlesEnCasa({ enfermedades, medicamentos, medidas, hoy })
      .filter((c) => !c.deHoy)
      .map((c) => (c.tipo === 'glucosa' ? 'azúcar' : 'tensión')),
    revisiones,
  }
}

/** Una línea por cada cosa pendiente («💊 2 medicinas sin tomar»…), para el banner. Vacío si no hay nada. */
export function textoResumen(r: ResumenAlertas, copiaPendiente = false): { total: number; partes: string[] } {
  const plural = (n: number, uno: string, varios: string) => (n === 1 ? `1 ${uno}` : `${n} ${varios}`)
  const medidas = r.controles.map((c) => (c === 'tensión' ? 'la tensión' : `el ${c}`))
  const partes = [
    r.sinTomar && `💊 ${plural(r.sinTomar, 'medicina sin tomar', 'medicinas sin tomar')}`,
    medidas.length && `🩸 Apuntar ${medidas.join(' y ')}`,
    r.citas && `📅 ${plural(r.citas, 'cita', 'citas')} en los próximos días`,
    r.revisiones && `💉 ${plural(r.revisiones, 'revisión o vacuna que toca', 'revisiones o vacunas que tocan')}`,
    copiaPendiente && '💾 Hacer la copia de seguridad',
  ].filter((x): x is string => !!x)
  return { total: r.sinTomar + r.citas + r.controles.length + r.revisiones + (copiaPendiente ? 1 : 0), partes }
}
