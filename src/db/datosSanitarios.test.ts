import { beforeEach, describe, expect, it } from 'vitest'
import { guardarAlergia } from './alergias'
import { fichaEmergencia, guardarDatos, leerDatos, revisarDatos } from './datosSanitarios'
import { db } from './db'
import { guardarHistorial } from './historial'
import { dejarDeTomar, guardarMedicamento } from './medicamentos'
import { borrarPerfil, crearPerfil } from './perfiles'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

const vacio = { contactos: [] }

describe('mis datos sanitarios', () => {
  it('se guardan una sola vez por persona y se pueden cambiar', async () => {
    const p = await crearPerfil({ nombre: 'Carmen', color: '#2e5c8a' })
    await guardarDatos(p.id, { ...vacio, grupoSanguineo: 'A+', tarjetaSanitaria: ' TEST0000000000 ' })
    await guardarDatos(p.id, { ...vacio, grupoSanguineo: '0-', contactos: [{ nombre: ' Lucía ', relacion: 'Hija', telefono: '600 000 000' }] })
    expect(await db.fichas.count()).toBe(1)
    const d = await leerDatos(p.id)
    expect(d).toMatchObject({ grupoSanguineo: '0-', contactos: [{ nombre: 'Lucía', relacion: 'Hija' }] })
    // Lo que no se ha vuelto a escribir se queda vacío (el formulario siempre manda todo).
    expect(d?.tarjetaSanitaria).toBeUndefined()
  })

  it('revisa los contactos', () => {
    expect(revisarDatos({ contactos: [{ nombre: '', telefono: '600000000' }] })).toContain('nombre')
    expect(revisarDatos({ contactos: [{ nombre: 'Lucía', telefono: '12' }] })).toContain('Lucía')
    expect(revisarDatos({ contactos: [{ nombre: 'Lucía', telefono: '+34 600 000 000' }] })).toBeNull()
  })

  it('se borran con la persona', async () => {
    const p = await crearPerfil({ nombre: 'Carmen', color: '#2e5c8a' })
    await guardarDatos(p.id, { ...vacio, grupoSanguineo: 'A+' })
    await borrarPerfil(p.id)
    expect(await db.fichas.count()).toBe(0)
  })
})

describe('ficha de emergencia', () => {
  it('junta lo importante: alergias graves primero, solo la medicación actual y las enfermedades crónicas', async () => {
    const p = await crearPerfil({ nombre: 'Carmen', color: '#2e5c8a', fechaNacimiento: '1958-03-21', sexo: 'mujer' })
    await guardarDatos(p.id, { ...vacio, grupoSanguineo: 'A+', seguroCompania: 'Seguro (prueba)', seguroPoliza: '0000', avisos: 'Llevo marcapasos' })
    await guardarAlergia(p.id, { tipo: 'alimento', clase: 'intolerancia', nombre: 'Lactosa', gravedad: 'leve' })
    await guardarAlergia(p.id, { tipo: 'medicamento', clase: 'alergia', nombre: 'Penicilina', gravedad: 'grave' })
    await guardarMedicamento(p.id, { nombre: 'Sintrom', momentos: ['cena'], activo: 1 })
    const viejo = await guardarMedicamento(p.id, { nombre: 'Omeprazol', momentos: ['desayuno'], activo: 1 })
    await dejarDeTomar(viejo, '2026-01-01')
    await guardarHistorial(p.id, { fecha: '2018-05-01', tipo: 'diagnostico', titulo: 'Hipertensión', cronica: true })
    await guardarHistorial(p.id, { fecha: '2020-05-01', tipo: 'diagnostico', titulo: 'Gripe', cronica: false })

    const f = await fichaEmergencia((await db.perfiles.get(p.id))!)
    expect(f.edad).toBeGreaterThanOrEqual(68)
    expect(f.grupoSanguineo).toBe('A+')
    expect(f.alergias.map((a) => a.nombre)).toEqual(['Penicilina', 'Lactosa'])
    expect(f.medicamentos.map((m) => m.nombre)).toEqual(['Sintrom'])
    expect(f.enfermedades.map((e) => e.titulo)).toEqual(['Hipertensión'])
    expect(f.seguro).toBe('Seguro (prueba), póliza 0000')
    expect(f.avisos).toBe('Llevo marcapasos')
  })

  it('sin datos sanitarios también funciona', async () => {
    const p = await crearPerfil({ nombre: 'Luis', color: '#2e5c8a' })
    const f = await fichaEmergencia(p)
    expect(f).toMatchObject({ nombre: 'Luis', contactos: [], alergias: [], edad: undefined })
  })
})
