import { beforeEach, describe, expect, it } from 'vitest'
import { db, nuevoId } from '../db/db'
import { crearPerfil } from '../db/perfiles'
import {
  crearCopia,
  empaquetarCopia,
  ErrorCopia,
  leerCopia,
  nombreArchivoCopia,
  personasDeCopia,
  recuperarCopia,
  tieneContrasena,
} from './copia'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

async function prepararDatos() {
  const madre = await crearPerfil({ nombre: 'Carmen', color: '#1f6f5c', fechaNacimiento: '1958-03-21' })
  const hijo = await crearPerfil({ nombre: 'David', color: '#2b5797' })
  // Un valor con decimales, para comprobar que no cambia ni una cifra.
  await db.constantes.add({
    id: nuevoId(), perfilId: madre.id, creadoEn: 1, actualizadoEn: 1,
    tipo: 'tension', fecha: '2026-10-01', valor: 135, valor2: 85, pulso: 72, notas: '36,7 de fiebre',
  })
  await db.adjuntos.add({
    id: nuevoId(), perfilId: madre.id, creadoEn: 1, actualizadoEn: 1,
    tipo: 'foto', nombre: 'receta.jpg', analisis: 'pendiente',
    archivo: new Blob([new Uint8Array([255, 216, 255, 0, 1, 2, 3])], { type: 'image/jpeg' }),
  })
  await db.citas.add({ id: nuevoId(), perfilId: hijo.id, creadoEn: 1, actualizadoEn: 1, fecha: '2026-11-03', especialidad: 'Dentista' })
  return { madre, hijo }
}

async function vaciarYRecuperar(archivo: Blob, contrasena?: string) {
  const texto = await archivo.text()
  await db.delete()
  await db.open()
  return recuperarCopia(db, await leerCopia(texto, contrasena))
}

describe('copia de seguridad', () => {
  it('recupera todo exactamente igual, números y fotos incluidos', async () => {
    const { madre } = await prepararDatos()
    const archivo = await empaquetarCopia(await crearCopia(db))

    const total = await vaciarYRecuperar(archivo)

    expect(total).toBe(5)
    const tension = await db.constantes.where('perfilId').equals(madre.id).first()
    expect(tension).toMatchObject({ valor: 135, valor2: 85, pulso: 72, notas: '36,7 de fiebre' })
    const foto = await db.adjuntos.where('perfilId').equals(madre.id).first()
    expect(foto?.archivo.type).toBe('image/jpeg')
    expect([...new Uint8Array(await foto!.archivo.arrayBuffer())]).toEqual([255, 216, 255, 0, 1, 2, 3])
    expect((await db.perfiles.get(madre.id))?.fechaNacimiento).toBe('1958-03-21')
  })

  it('puede guardar solo a una persona', async () => {
    const { madre } = await prepararDatos()
    const copia = await crearCopia(db, [madre.id])
    expect(personasDeCopia(copia)).toEqual(['Carmen'])
    expect(copia.tablas.citas).toHaveLength(0) // la cita era de David
    expect(copia.tablas.constantes).toHaveLength(1)
  })

  it('con contraseña: se recupera con la correcta', async () => {
    await prepararDatos()
    const archivo = await empaquetarCopia(await crearCopia(db), 'Pastillero 2026')
    const texto = await archivo.text()

    expect(tieneContrasena(texto)).toBe(true)
    expect(texto).not.toContain('Carmen') // el nombre no se ve dentro del archivo
    expect(await vaciarYRecuperar(archivo, 'Pastillero 2026')).toBe(5)
  })

  it('con contraseña: avisa si falta o es incorrecta', async () => {
    await prepararDatos()
    const texto = await (await empaquetarCopia(await crearCopia(db), 'secreta')).text()

    await expect(leerCopia(texto)).rejects.toMatchObject({ motivo: 'falta-contrasena' })
    await expect(leerCopia(texto, 'otra')).rejects.toMatchObject({ motivo: 'contrasena-incorrecta' })
  })

  it('rechaza archivos que no son copias de Mi Salud', async () => {
    await expect(leerCopia('esto no es json')).rejects.toBeInstanceOf(ErrorCopia)
    await expect(leerCopia('{"app":"otra"}')).rejects.toMatchObject({ motivo: 'archivo-no-valido' })
    expect(tieneContrasena('{"hola":1}')).toBe(false)
  })

  it('recuperar no borra los datos que no están en la copia', async () => {
    const { madre } = await prepararDatos()
    const copia = await crearCopia(db, [madre.id])
    const nuevo = await crearPerfil({ nombre: 'Luis', color: '#a8501f' })

    await recuperarCopia(db, copia)

    expect(await db.perfiles.get(nuevo.id)).toBeDefined()
    expect(await db.perfiles.count()).toBe(3)
  })

  it('nombra el archivo con la fecha', () => {
    expect(nombreArchivoCopia(new Date(2026, 9, 7))).toBe('mi-salud-copia-2026-10-07.json')
  })
})
