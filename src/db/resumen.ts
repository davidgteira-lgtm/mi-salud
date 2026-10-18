// El resumen para el médico: lo importante de todas las secciones, en una página.
import { infoConstante } from '../datos/constantes'
import { buscarRecomendacion } from '../datos/revisiones'
import { listarAnaliticas, estadoDe } from './analiticas'
import { ultimasMedidas, textoValor } from './constantes'
import { fichaEmergencia, type FichaEmergencia } from './datosSanitarios'
import { listarHistorial } from './historial'
import { listarMedicamentos } from './medicamentos'
import { listarRegistros } from './revisiones'
import type { EntradaHistorial, Medicamento, Perfil, RegistroRevision, ResultadoAnalisis } from './tipos'
import { hoyISO, sumarMeses } from '../utils/fechas'

export interface Resumen {
  ficha: FichaEmergencia
  hoy: string
  /** Medicación que dejó en el último año. */
  dejados: Medicamento[]
  /** La última medida de cada constante. */
  constantes: { nombre: string; valor: string; fecha: string }[]
  /** El último análisis: fecha y los resultados fuera de lo normal. */
  analisis?: { fecha: string; centro?: string; total: number; fuera: (ResultadoAnalisis & { estado: 'alto' | 'bajo' })[] }
  /** Operaciones (todas) e ingresos, urgencias, pruebas e informes del último año. */
  operaciones: EntradaHistorial[]
  recientes: EntradaHistorial[]
  /** La última dosis de cada vacuna. */
  vacunas: RegistroRevision[]
}

export async function crearResumen(perfil: Perfil, hoy: string = hoyISO()): Promise<Resumen> {
  const haceUnAno = sumarMeses(hoy, -12)
  const [ficha, antiguos, ultimas, analiticas, historial, registros] = await Promise.all([
    fichaEmergencia(perfil),
    listarMedicamentos(perfil.id, false),
    ultimasMedidas(perfil.id),
    listarAnaliticas(perfil.id),
    listarHistorial(perfil.id),
    listarRegistros(perfil.id),
  ])

  const ultima = analiticas[0]
  const fuera = ultima
    ? ultima.resultados
        .map((r) => ({ ...r, estado: estadoDe(r) }))
        .filter((r): r is ResultadoAnalisis & { estado: 'alto' | 'bajo' } => r.estado === 'alto' || r.estado === 'bajo')
    : []

  // De cada vacuna, solo la última (listarRegistros ya viene de la más nueva a la más vieja).
  const vistas = new Set<string>()
  const vacunas = registros.filter((r) => {
    if (r.tipo !== 'vacuna') return false
    const clave = r.clave ?? r.nombre.toLowerCase()
    if (vistas.has(clave)) return false
    vistas.add(clave)
    return true
  })

  return {
    ficha,
    hoy,
    dejados: antiguos.filter((m) => m.fechaFin && m.fechaFin >= haceUnAno),
    constantes: Object.values(ultimas)
      .filter((m) => m !== undefined)
      .map((m) => {
        const info = infoConstante(m!.tipo)
        return { nombre: info.nombre, valor: `${textoValor(m!)} ${m!.tipo === 'pulso' ? 'lpm' : info.unidad}`.trim(), fecha: m!.fecha }
      }),
    analisis: ultima && { fecha: ultima.fecha, centro: ultima.centro, total: ultima.resultados.length, fuera },
    operaciones: historial.filter((h) => h.tipo === 'operacion'),
    recientes: historial.filter((h) => ['ingreso', 'urgencias', 'prueba', 'informe'].includes(h.tipo) && h.fecha >= haceUnAno),
    vacunas: vacunas.map((v) => ({ ...v, nombre: buscarRecomendacion(v.clave)?.nombre ?? v.nombre })),
  }
}
