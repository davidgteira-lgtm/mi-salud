// La base de datos de la app. Usa IndexedDB, que viene dentro del navegador
// del móvil, a través de Dexie (una librería que hace IndexedDB más fácil de usar).
// Todo se queda en el móvil: nada se envía a ningún sitio.
import Dexie, { type Table } from 'dexie'
import { PRUEBAS } from '../datos/pruebasLaboratorio'
import { corregirSentido } from '../utils/analisis'
import type {
  Adjunto,
  Alergia,
  Analitica,
  Cita,
  Ciclo,
  Contacto,
  DatosSanitarios,
  EntradaHistorial,
  Medicamento,
  Medida,
  Perfil,
  RegistroBase,
  RegistroRevision,
  RevisionOcular,
  Baja,
  Toma,
  TratamientoDental,
} from './tipos'

/** Registro genérico mientras cada sección no tenga su forma definitiva. */
export type RegistroLibre = RegistroBase & Record<string, unknown>

export class BaseDeDatos extends Dexie {
  perfiles!: Table<Perfil, string>
  medicamentos!: Table<Medicamento, string>
  citas!: Table<Cita, string>
  historial!: Table<EntradaHistorial, string>
  analiticas!: Table<Analitica, string>
  revisiones!: Table<RegistroRevision, string>
  dental!: Table<TratamientoDental, string>
  constantes!: Table<Medida, string>
  alergias!: Table<Alergia, string>
  adjuntos!: Table<Adjunto, string>
  /** Ficha de emergencia y datos sanitarios: una por persona. */
  fichas!: Table<DatosSanitarios, string>
  telefonos!: Table<Contacto, string>
  ojos!: Table<RevisionOcular, string>
  bajas!: Table<Baja, string>
  tomas!: Table<Toma, string>
  ciclos!: Table<Ciclo, string>

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
    // Versión 3: ciclos de la regla.
    this.version(3).stores({
      ciclos: 'id, perfilId, [perfilId+inicio]',
    })
    // Versión 4: salud dental. La tabla estaba vacía; ahora se busca por fecha.
    this.version(4).stores({
      dental: 'id, perfilId, [perfilId+fecha]',
    })
    // Versión 5: salud ocular y bajas médicas.
    this.version(5).stores({
      ojos: 'id, perfilId, [perfilId+fecha]',
      bajas: 'id, perfilId, [perfilId+inicio]',
    })
    // Versión 6: tomas de la medicación («Tomada» / «Sin tomar»).
    this.version(6).stores({
      tomas: 'id, perfilId, medicamentoId, [medicamentoId+fecha+hora]',
    })
    // v7: corrige el sentido de las referencias ya guardadas (p. ej. HDL «inferior a 35» = riesgo, no lo normal).
    this.version(7)
      .stores({})
      .upgrade((tx) =>
        tx
          .table<Analitica>('analiticas')
          .toCollection()
          .modify((a) => {
            a.resultados = a.resultados.map((r) => {
              if (!r.clave || (r.refMin === undefined && r.refMax === undefined)) return r
              const prueba = PRUEBAS.find((x) => x.clave === r.clave)
              const c = corregirSentido({ min: r.refMin, max: r.refMax }, prueba)
              return c ? { ...r, refMin: c.min, refMax: c.max } : r
            })
          }),
      )
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
