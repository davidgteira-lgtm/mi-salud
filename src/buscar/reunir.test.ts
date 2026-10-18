import { beforeEach, describe, expect, it } from 'vitest'
import { guardarAnalitica } from '../db/analiticas'
import { guardarCita } from '../db/citas'
import { guardarMedida } from '../db/constantes'
import { db } from '../db/db'
import { guardarDental } from '../db/dental'
import { guardarHistorial } from '../db/historial'
import { guardarMedicamento } from '../db/medicamentos'
import { crearPerfil } from '../db/perfiles'
import { guardarRegistro } from '../db/revisiones'
import { buscarEn, entender } from './consulta'
import { reunirDocumentos } from './reunir'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

describe('buscar en todo lo apuntado', () => {
  it('encuentra en todas las secciones y solo de esa persona', async () => {
    const carmen = await crearPerfil({ nombre: 'Carmen', color: '#2e5c8a' })
    const otra = await crearPerfil({ nombre: 'Luis', color: '#2e5c8a' })
    await guardarMedicamento(carmen.id, { nombre: 'Sintrom 4 mg', momentos: ['cena'], familia: 'Anticoagulante', activo: 1 })
    const citaId = await guardarCita(carmen.id, { fecha: '2025-03-12', especialidad: 'Cardiología', motivo: 'Revisión del marcapasos' })
    await guardarHistorial(carmen.id, { fecha: '2018-05-01', tipo: 'diagnostico', titulo: 'Hipertensión arterial', cronica: true })
    await guardarAnalitica(carmen.id, { fecha: '2026-09-10', resultados: [{ clave: 'hba1c', nombre: 'HbA1c', valor: 6.1, unidad: '%' }] })
    await guardarRegistro(carmen.id, { tipo: 'vacuna', clave: 'gripe', nombre: 'Vacuna de la gripe', fecha: '2025-10-22' })
    await guardarDental(carmen.id, { fecha: '2024-01-12', tipo: 'corona', dientes: [46] })
    await guardarMedida(carmen.id, { tipo: 'tension', fecha: '2026-10-17', valor: 129, valor2: 81, notas: 'Después de caminar' })
    await guardarMedicamento(otra.id, { nombre: 'Sintrom 1 mg', momentos: ['cena'], activo: 1 })
    // Una nota de voz unida a la cita, ya escrita.
    const ahora = Date.now()
    await db.adjuntos.add({
      id: 'voz1',
      perfilId: carmen.id,
      registroId: citaId,
      tipo: 'voz',
      nombre: 'Nota de voz',
      archivo: new Blob(['x'], { type: 'audio/webm' }),
      analisis: 'pendiente',
      transcripcion: 'El cardiólogo dice que todo va bien con el marcapasos',
      creadoEn: ahora,
      actualizadoEn: ahora,
    })

    const docs = await reunirDocumentos(carmen.id)
    const buscar = (t: string) => buscarEn(docs, entender(t, '2026-10-18')).map((r) => `${r.doc.seccion}:${r.doc.titulo}`)

    expect(buscar('sintron')).toEqual(['medicacion:Sintrom 4 mg'])
    expect(buscar('anticoagulante')).toEqual(['medicacion:Sintrom 4 mg'])
    // «azúcar» encuentra el análisis por la hemoglobina glicada.
    expect(buscar('azúcar')).toEqual(['analisis:Análisis del 10 de septiembre de 2026'])
    // También la nota de voz que habla del cardiólogo, pero después.
    expect(buscar('corazón')).toEqual(['citas:Cardiología', 'citas:Nota de voz'])
    // La nota de voz se encuentra por lo que se dijo, y dice en qué cita está.
    const marcapasos = buscarEn(docs, entender('marcapasos', '2026-10-18'))
    expect(marcapasos.map((r) => r.doc.id)).toEqual(expect.arrayContaining(['voz1']))
    expect(marcapasos.find((r) => r.doc.id === 'voz1')?.doc).toMatchObject({ seccion: 'citas', donde: 'En «Cardiología»' })
    expect(buscar('muela')).toEqual(['dental:Funda o corona: primera muela de abajo, a tu derecha'])
    expect(buscar('caminar')).toEqual(['constantes:Tensión: Alta 129 · Baja 81'])
    expect(buscar('vacunas 2025')).toEqual(['revisiones:Vacuna de la gripe'])
    // «tensión»: primero la ficha de la tensión (palabra exacta); también la hipertensión (sinónimo).
    expect(buscar('tensión').slice(0, 2)).toEqual(['constantes:Tensión', 'constantes:Tensión: Alta 129 · Baja 81'])
    expect(buscar('tensión')).toContain('historial:Hipertensión arterial')
  })
})
