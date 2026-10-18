// Junta todo lo apuntado de una persona, de todas las secciones, para poder buscar en ello.
import { infoConstante } from '../datos/constantes'
import { infoTipoDental, nombreDiente } from '../datos/dientes'
import { PRUEBAS } from '../datos/pruebasLaboratorio'
import { textoValor } from '../db/constantes'
import { diasDeBaja } from '../db/bajas'
import { explicarOjo, TIPOS_OCULAR } from '../db/ojos'
import { db } from '../db/db'
import { TIPOS_HISTORIAL } from '../db/historial'
import { TIPOS_CONTACTO } from '../db/telefonos'
import type { TipoConstante } from '../db/tipos'
import { duracionRegla } from '../utils/ciclos'
import { tipoDeMedicamento } from '../utils/medicamentos'
import { fechaLarga, hoyISO } from '../utils/fechas'
import type { Documento } from './consulta'

const juntar = (...partes: (string | undefined | false | null)[]) => partes.filter(Boolean).join(' · ')

export async function reunirDocumentos(perfilId: string): Promise<Documento[]> {
  const [medicamentos, citas, historial, analiticas, alergias, revisiones, dental, constantes, telefonos, ciclos, adjuntos, ojos, bajas] =
    await Promise.all([
      db.medicamentos.where('perfilId').equals(perfilId).toArray(),
      db.citas.where('perfilId').equals(perfilId).toArray(),
      db.historial.where('perfilId').equals(perfilId).toArray(),
      db.analiticas.where('perfilId').equals(perfilId).toArray(),
      db.alergias.where('perfilId').equals(perfilId).toArray(),
      db.revisiones.where('perfilId').equals(perfilId).toArray(),
      db.dental.where('perfilId').equals(perfilId).toArray(),
      db.constantes.where('perfilId').equals(perfilId).toArray(),
      db.telefonos.where('perfilId').equals(perfilId).toArray(),
      db.ciclos.where('perfilId').equals(perfilId).toArray(),
      db.adjuntos.where('perfilId').equals(perfilId).toArray(),
      db.ojos.where('perfilId').equals(perfilId).toArray(),
      db.bajas.where('perfilId').equals(perfilId).toArray(),
    ])
  const hoy = hoyISO()
  const docs: Documento[] = []
  /** En qué sección está cada registro (para saber dónde va cada foto o documento). */
  const seccionDe = new Map<string, { seccion: string; titulo: string }>()
  const anadir = (d: Documento) => {
    docs.push(d)
    seccionDe.set(d.id, { seccion: d.seccion, titulo: d.titulo })
  }

  for (const m of medicamentos) {
    anadir({
      seccion: 'medicacion',
      id: m.id,
      icono: '💊',
      titulo: m.nombre,
      detalle: juntar(m.dosis, m.activo ? 'Lo tomas ahora' : `Lo dejaste${m.fechaFin ? ` el ${fechaLarga(m.fechaFin)}` : ''}`),
      fecha: m.fechaInicio,
      textos: ['Medicación', m.paraQue ?? '', tipoDeMedicamento(m) ?? m.familia ?? '', m.otroHorario ?? '', m.notas ?? ''],
    })
  }
  for (const c of citas) {
    anadir({
      seccion: 'citas',
      id: c.id,
      icono: '📅',
      titulo: c.especialidad,
      detalle: juntar(fechaLarga(c.fecha), c.hora, c.medico, c.anulada && 'Anulada', c.fecha >= hoy && 'Próxima'),
      fecha: c.fecha,
      textos: ['Cita', c.lugar ?? '', c.motivo ?? '', c.resultado ?? ''],
    })
  }
  for (const h of historial) {
    const tipo = TIPOS_HISTORIAL.find((t) => t.valor === h.tipo)
    anadir({
      seccion: 'historial',
      id: h.id,
      icono: tipo?.icono ?? '📁',
      titulo: h.titulo,
      detalle: juntar(tipo?.texto, fechaLarga(h.fecha), h.cronica && 'Crónica'),
      fecha: h.fecha,
      textos: ['Historial', h.prueba ?? '', h.especialidad ?? '', h.centro ?? '', h.medico ?? '', h.resumen ?? ''],
    })
  }
  for (const a of analiticas) {
    anadir({
      seccion: 'analisis',
      id: a.id,
      icono: '🧪',
      titulo: `Análisis del ${fechaLarga(a.fecha)}`,
      detalle: juntar(a.centro, `${a.resultados.length} resultados`),
      fecha: a.fecha,
      textos: [
        'Análisis de sangre',
        a.notas ?? '',
        // Cada resultado con su nombre, el de la lista de la app y los otros nombres con que se conoce.
        ...a.resultados.map((r) => {
          const p = PRUEBAS.find((x) => x.clave === r.clave)
          return {
            ver: `${r.nombre} ${r.comparador ?? ''}${String(r.valor).replace('.', ',')} ${r.unidad ?? ''}`.trim(),
            buscar: [p?.nombre, ...(p?.otrosNombres ?? [])].filter(Boolean).join(' '),
          }
        }),
      ],
    })
  }
  for (const a of alergias) {
    anadir({
      seccion: 'alergias',
      id: a.id,
      icono: '⚠️',
      titulo: a.nombre,
      detalle: juntar(a.clase === 'intolerancia' ? 'Intolerancia' : 'Alergia', a.gravedad !== 'desconocida' && a.gravedad),
      fecha: a.desde,
      textos: ['Alergia', a.tipo, a.reaccion ?? ''],
    })
  }
  for (const r of revisiones) {
    anadir({
      seccion: 'revisiones',
      id: r.id,
      icono: r.tipo === 'vacuna' ? '💉' : '🩺',
      titulo: r.nombre,
      detalle: juntar(fechaLarga(r.fecha), r.dosis),
      fecha: r.fecha,
      textos: [r.tipo === 'vacuna' ? 'Vacuna' : 'Revisión', r.lugar ?? '', r.lote ?? '', r.notas ?? ''],
    })
  }
  for (const t of dental) {
    const info = infoTipoDental(t.tipo)
    anadir({
      seccion: 'dental',
      id: t.id,
      icono: '🦷',
      titulo: `${info.texto}${t.dientes.length === 1 ? `: ${nombreDiente(t.dientes[0]).toLowerCase()}` : ''}`,
      detalle: juntar(fechaLarga(t.fecha), t.dientes.length > 1 && `${t.dientes.length} dientes`),
      fecha: t.fecha,
      textos: ['Dentista', t.dentista ?? '', t.notas ?? '', ...t.dientes.map((n) => `${nombreDiente(n)} ${n}`)],
    })
  }

  // Constantes: una entrada por tipo (la última medida), y aparte las medidas con notas.
  const porTipo = new Map<TipoConstante, typeof constantes>()
  for (const m of constantes) porTipo.set(m.tipo, [...(porTipo.get(m.tipo) ?? []), m])
  for (const [tipo, lista] of porTipo) {
    const info = infoConstante(tipo)
    const ultima = [...lista].sort((a, b) => `${b.fecha} ${b.hora ?? ''}`.localeCompare(`${a.fecha} ${a.hora ?? ''}`))[0]
    docs.push({
      seccion: 'constantes',
      id: `constante-${tipo}`,
      icono: info.icono,
      titulo: info.nombre,
      detalle: juntar(`Última: ${textoValor(ultima)} ${info.unidad}`.trim(), fechaLarga(ultima.fecha), `${lista.length} medidas`),
      fecha: ultima.fecha,
      textos: ['Constantes vitales'],
    })
    for (const m of lista.filter((x) => x.notas)) {
      docs.push({
        seccion: 'constantes',
        id: m.id,
        icono: info.icono,
        titulo: `${info.nombre}: ${textoValor(m)}`,
        detalle: fechaLarga(m.fecha),
        fecha: m.fecha,
        textos: [m.notas!],
      })
    }
  }

  for (const c of ciclos) {
    const dias = duracionRegla(c)
    docs.push({
      seccion: 'constantes',
      id: c.id,
      icono: '🌸',
      titulo: `Regla del ${fechaLarga(c.inicio)}`,
      detalle: juntar(dias ? `${dias} días` : undefined, c.intensidad),
      fecha: c.inicio,
      textos: ['Regla', ...c.sintomas, c.notas ?? ''],
    })
  }
  for (const t of telefonos) {
    docs.push({
      seccion: 'telefonos',
      id: t.id,
      icono: TIPOS_CONTACTO.find((x) => x.valor === t.tipo)?.icono ?? '📞',
      titulo: t.nombre,
      detalle: t.telefono,
      textos: ['Teléfono', TIPOS_CONTACTO.find((x) => x.valor === t.tipo)?.texto ?? '', t.direccion ?? ''],
    })
  }

  for (const r of ojos) {
    const tipo = TIPOS_OCULAR.find((t) => t.valor === r.tipo)
    anadir({
      seccion: 'ojos',
      id: r.id,
      icono: '👁️',
      titulo: `${tipo?.texto ?? 'Revisión de la vista'} del ${fechaLarga(r.fecha)}`,
      detalle: juntar(r.donde, r.diagnostico),
      fecha: r.fecha,
      textos: ['Vista ojos', `Ojo derecho: ${explicarOjo(r.derecho)}`, `Ojo izquierdo: ${explicarOjo(r.izquierdo)}`, r.notas ?? ''],
    })
  }
  for (const b of bajas) {
    anadir({
      seccion: 'bajas',
      id: b.id,
      icono: '📋',
      titulo: `Baja: ${b.motivo}`,
      detalle: juntar(`Del ${fechaLarga(b.inicio)}`, b.fin ? `al ${fechaLarga(b.fin)}` : 'sigue de baja', `${diasDeBaja(b)} días`),
      fecha: b.inicio,
      textos: ['Baja médica incapacidad', b.diagnostico ?? '', b.medico ?? '', b.centro ?? '', b.empresa ?? '', b.notas ?? ''],
    })
  }

  // Fotos, documentos y notas de voz: se buscan por su nombre, lo que dijo la IA y lo que se habló.
  for (const a of adjuntos) {
    const padre = a.registroId ? seccionDe.get(a.registroId) : undefined
    const fecha = new Date(a.creadoEn)
    docs.push({
      seccion: padre?.seccion ?? 'revisar',
      id: a.id,
      icono: a.tipo === 'voz' ? '🎤' : a.tipo === 'foto' ? '📷' : '📄',
      titulo: a.nombre,
      donde: padre ? `En «${padre.titulo}»` : undefined,
      fecha: hoyISO(fecha),
      textos: [a.tipo === 'voz' ? 'Nota de voz' : a.tipo === 'foto' ? 'Foto' : 'Documento', a.resumenIa ?? '', a.transcripcion ?? ''],
    })
  }

  return docs
}
