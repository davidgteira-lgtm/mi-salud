// La base de datos de la app. Usa IndexedDB, que viene dentro del navegador
// del móvil, a través de Dexie (una librería que hace IndexedDB más fácil de usar).
// Todo se queda en el móvil: nada se envía a ningún sitio.
import Dexie, { type Table } from 'dexie'
import type { Adjunto, Contacto, Perfil, RegistroBase } from './tipos'

/** Registro genérico mientras cada sección no tenga su forma definitiva. */
export type RegistroLibre = RegistroBase & Record<string, unknown>

export class BaseDeDatos extends Dexie {
  perfiles!: Table<Perfil, string>
  medicamentos!: Table<RegistroLibre, string>
  citas!: Table<RegistroLibre, string>
  historial!: Table<RegistroLibre, string>
  analiticas!: Table<RegistroLibre, string>
  revisiones!: Table<RegistroLibre, string>
  dental!: Table<RegistroLibre, string>
  constantes!: Table<RegistroLibre, string>
  alergias!: Table<RegistroLibre, string>
  adjuntos!: Table<Adjunto, string>
  /** Ficha de emergencia y datos sanitarios: una por persona. */
  fichas!: Table<RegistroLibre, string>
  telefonos!: Table<Contacto, string>

  constructor(nombre = 'mi-salud') {
    super(nombre)
    // "Índices": los campos por los que vamos a buscar rápido.
    // Si algún día cambian, se añade un .version(2) sin perder datos.
    this.version(1).stores({
      perfiles: 'id, nombre',
      medicamentos: 'id, perfilId, [perfilId+activo]',
      citas: 'id, perfilId, [perfilId+fecha]',
      historial: 'id, perfilId, [perfilId+fecha], [perfilId+tipo]',
      analiticas: 'id, perfilId, [perfilId+fecha]',
      revisiones: 'id, perfilId, [perfilId+fecha]',
      dental: 'id, perfilId, [perfilId+diente]',
      constantes: 'id, perfilId, [perfilId+fecha]',
      alergias: 'id, perfilId',
      adjuntos: 'id, perfilId, registroId, [perfilId+analisis]',
      fichas: 'id, &perfilId',
    })
    // Versión 2: teléfonos de centros médicos. Los datos de la versión 1 se conservan.
    this.version(2).stores({
      telefonos: 'id, perfilId',
    })
  }
}

export const db = new BaseDeDatos()

/** Pide al navegador que no borre nunca los datos por falta de espacio. */
export async function pedirAlmacenamientoPersistente(): Promise<boolean> {
  try {
    if (navigator.storage?.persist) {
      if (await navigator.storage.persisted()) return true
      return await navigator.storage.persist()
    }
  } catch {
    // Si el navegador no lo permite, seguimos igual.
  }
  return false
}

/** Crea un identificador único para cada registro. */
export function nuevoId(): string {
  return crypto.randomUUID()
}
