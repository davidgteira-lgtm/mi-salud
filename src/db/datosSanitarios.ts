// Mis datos sanitarios y lo que sale en la ficha de emergencia.
import { calcularEdad, esFechaValida } from '../utils/fechas'
import { esTelefonoValido } from '../utils/telefono'
import { listarAlergias } from './alergias'
import { db, nuevoId } from './db'
import { enfermedadesCronicas } from './historial'
import { listarMedicamentos } from './medicamentos'
import type { Alergia, ContactoEmergencia, DatosSanitarios, EntradaHistorial, Medicamento, Perfil } from './tipos'

export type DatosFicha = Omit<DatosSanitarios, 'id' | 'perfilId' | 'creadoEn' | 'actualizadoEn'>

export function revisarDatos(d: DatosFicha): string | null {
  for (const c of d.contactos) {
    if (!c.nombre.trim()) return 'Cada contacto necesita un nombre.'
    if (!esTelefonoValido(c.telefono)) return `El teléfono de ${c.nombre.trim()} no parece correcto.`
  }
  return null
}

export async function leerDatos(perfilId: string): Promise<DatosSanitarios | undefined> {
  return db.fichas.where('perfilId').equals(perfilId).first()
}

export async function guardarDatos(perfilId: string, datos: DatosFicha): Promise<void> {
  const problema = revisarDatos(datos)
  if (problema) throw new Error(problema)
  const texto = (t?: string) => t?.trim() || undefined
  const limpio: DatosFicha = {
    grupoSanguineo: datos.grupoSanguineo,
    tarjetaSanitaria: texto(datos.tarjetaSanitaria),
    seguroCompania: texto(datos.seguroCompania),
    seguroPoliza: texto(datos.seguroPoliza),
    seguroTelefono: texto(datos.seguroTelefono),
    centroSalud: texto(datos.centroSalud),
    medicoCabecera: texto(datos.medicoCabecera),
    donante: datos.donante || undefined,
    avisos: texto(datos.avisos),
    contactos: datos.contactos.map((c) => ({ nombre: c.nombre.trim(), relacion: texto(c.relacion), telefono: c.telefono.trim() })),
  }
  const ahora = Date.now()
  const actual = await leerDatos(perfilId)
  if (actual) await db.fichas.update(actual.id, { ...limpio, actualizadoEn: ahora })
  else await db.fichas.add({ ...limpio, id: nuevoId(), perfilId, creadoEn: ahora, actualizadoEn: ahora })
}

const ORDEN_GRAVEDAD: Record<Alergia['gravedad'], number> = { grave: 0, moderada: 1, desconocida: 2, leve: 3 }

/** Todo lo que sale en la ficha de emergencia, ya ordenado: lo más importante primero. */
export interface FichaEmergencia {
  nombre: string
  edad?: number
  sexo?: Perfil['sexo']
  grupoSanguineo?: string
  alergias: Alergia[]
  medicamentos: Medicamento[]
  enfermedades: EntradaHistorial[]
  avisos?: string
  donante?: boolean
  contactos: ContactoEmergencia[]
  tarjetaSanitaria?: string
  seguro?: string
  centroSalud?: string
  medicoCabecera?: string
}

export async function fichaEmergencia(perfil: Perfil): Promise<FichaEmergencia> {
  const [datos, alergias, medicamentos, enfermedades] = await Promise.all([
    leerDatos(perfil.id),
    listarAlergias(perfil.id),
    listarMedicamentos(perfil.id, true),
    enfermedadesCronicas(perfil.id),
  ])
  return {
    nombre: perfil.nombre,
    edad: perfil.fechaNacimiento && esFechaValida(perfil.fechaNacimiento) ? calcularEdad(perfil.fechaNacimiento) : undefined,
    sexo: perfil.sexo,
    grupoSanguineo: datos?.grupoSanguineo,
    alergias: [...alergias].sort((a, b) => ORDEN_GRAVEDAD[a.gravedad] - ORDEN_GRAVEDAD[b.gravedad] || a.nombre.localeCompare(b.nombre)),
    medicamentos,
    enfermedades,
    avisos: datos?.avisos,
    donante: datos?.donante,
    contactos: datos?.contactos ?? [],
    tarjetaSanitaria: datos?.tarjetaSanitaria,
    seguro: [datos?.seguroCompania, datos?.seguroPoliza && `póliza ${datos.seguroPoliza}`].filter(Boolean).join(', ') || undefined,
    centroSalud: datos?.centroSalud,
    medicoCabecera: datos?.medicoCabecera,
  }
}
