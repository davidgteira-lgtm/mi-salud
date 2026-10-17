// Copia de seguridad: guarda todos los datos en un archivo y los recupera.
// El archivo puede ir protegido con contraseña (cifrado AES-GCM).
// Sin la contraseña, nadie puede leerlo… ni siquiera nosotros. Si se olvida, no hay forma de recuperarlo.
import type Dexie from 'dexie'
import { TABLAS_DE_PERFIL } from '../db/tipos'

const TABLAS = ['perfiles', ...TABLAS_DE_PERFIL] as const
const VERSION_COPIA = 1
const ITERACIONES = 250_000

export interface Copia {
  app: 'mi-salud'
  version: number
  creadaEn: number
  tablas: Record<string, unknown[]>
}

interface ArchivoCifrado {
  app: 'mi-salud'
  cifrado: true
  version: number
  sal: string
  iv: string
  datos: string
}

/** Motivos por los que no se puede abrir una copia, con un mensaje para la persona. */
export class ErrorCopia extends Error {
  readonly motivo: 'archivo-no-valido' | 'falta-contrasena' | 'contrasena-incorrecta'
  constructor(motivo: ErrorCopia['motivo']) {
    const mensajes = {
      'archivo-no-valido': 'Este archivo no es una copia de Mi Salud.',
      'falta-contrasena': 'Esta copia tiene contraseña. Escríbela para abrirla.',
      'contrasena-incorrecta': 'La contraseña no es correcta.',
    }
    super(mensajes[motivo])
    this.motivo = motivo
  }
}

// --- Exportar ---------------------------------------------------------------

/** Lee la base de datos y la convierte en un objeto que se puede guardar en un archivo. */
export async function crearCopia(db: Dexie, perfilIds?: string[]): Promise<Copia> {
  const tablas: Record<string, unknown[]> = {}
  for (const nombre of TABLAS) {
    let filas = await db.table(nombre).toArray()
    if (perfilIds) {
      const campo = nombre === 'perfiles' ? 'id' : 'perfilId'
      filas = filas.filter((f) => perfilIds.includes(f[campo]))
    }
    tablas[nombre] = await Promise.all(filas.map(aTexto))
  }
  return { app: 'mi-salud', version: VERSION_COPIA, creadaEn: Date.now(), tablas }
}

/** Convierte la copia en el archivo final, con o sin contraseña. */
export async function empaquetarCopia(copia: Copia, contrasena?: string): Promise<Blob> {
  const json = JSON.stringify(copia)
  if (!contrasena) return new Blob([json], { type: 'application/json' })

  const sal = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const clave = await derivarClave(contrasena, sal)
  const cifrado = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, clave, new TextEncoder().encode(json))
  const archivo: ArchivoCifrado = {
    app: 'mi-salud',
    cifrado: true,
    version: VERSION_COPIA,
    sal: bytesABase64(sal),
    iv: bytesABase64(iv),
    datos: bytesABase64(new Uint8Array(cifrado)),
  }
  return new Blob([JSON.stringify(archivo)], { type: 'application/json' })
}

// --- Importar ---------------------------------------------------------------

/** Abre un archivo de copia. Lanza ErrorCopia si no se puede. */
export async function leerCopia(texto: string, contrasena?: string): Promise<Copia> {
  let contenido: unknown
  try {
    contenido = JSON.parse(texto)
  } catch {
    throw new ErrorCopia('archivo-no-valido')
  }
  if (!esObjeto(contenido) || contenido.app !== 'mi-salud') throw new ErrorCopia('archivo-no-valido')

  if (contenido.cifrado === true) {
    if (!contrasena) throw new ErrorCopia('falta-contrasena')
    const c = contenido as unknown as ArchivoCifrado
    let json: string
    try {
      const clave = await derivarClave(contrasena, base64ABytes(c.sal))
      const descifrado = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: base64ABytes(c.iv) },
        clave,
        base64ABytes(c.datos),
      )
      json = new TextDecoder().decode(descifrado)
    } catch {
      throw new ErrorCopia('contrasena-incorrecta')
    }
    return leerCopia(json)
  }

  if (!esObjeto(contenido.tablas)) throw new ErrorCopia('archivo-no-valido')
  return contenido as unknown as Copia
}

/** ¿Este archivo necesita contraseña para abrirse? */
export function tieneContrasena(texto: string): boolean {
  try {
    const c = JSON.parse(texto)
    return esObjeto(c) && c.app === 'mi-salud' && c.cifrado === true
  } catch {
    return false
  }
}

/** Personas que contiene una copia (para enseñarlas antes de recuperar). */
export function personasDeCopia(copia: Copia): string[] {
  return (copia.tablas.perfiles ?? []).map((p) => String((p as { nombre?: unknown }).nombre ?? ''))
}

/**
 * Mete los datos de la copia en la base de datos.
 * Si un registro ya existe (mismo identificador), se sustituye por el de la copia.
 * Los datos que no están en la copia no se tocan.
 */
export async function recuperarCopia(db: Dexie, copia: Copia): Promise<number> {
  let total = 0
  const tablas = TABLAS.map((t) => db.table(t))
  await db.transaction('rw', tablas, async () => {
    for (const nombre of TABLAS) {
      const filas = copia.tablas[nombre]
      if (!Array.isArray(filas) || filas.length === 0) continue
      const restauradas = filas.map(deTexto)
      await db.table(nombre).bulkPut(restauradas)
      total += restauradas.length
    }
  })
  return total
}

/** Nombre del archivo: "mi-salud-copia-2026-10-17.json" */
export function nombreArchivoCopia(fecha: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `mi-salud-copia-${fecha.getFullYear()}-${p(fecha.getMonth() + 1)}-${p(fecha.getDate())}.json`
}

// --- Ayudas internas --------------------------------------------------------

// Las fotos y archivos (Blob) no caben tal cual en un texto: se convierten a base64.
const MARCA_ARCHIVO = '__archivo__'

function esArchivo(v: unknown): v is Blob {
  return (
    typeof v === 'object' &&
    v !== null &&
    typeof (v as Blob).arrayBuffer === 'function' &&
    typeof (v as Blob).type === 'string' &&
    typeof (v as Blob).size === 'number'
  )
}

async function aTexto(valor: unknown): Promise<unknown> {
  if (esArchivo(valor)) {
    const bytes = new Uint8Array(await valor.arrayBuffer())
    return { [MARCA_ARCHIVO]: true, tipo: valor.type, datos: bytesABase64(bytes) }
  }
  if (Array.isArray(valor)) return Promise.all(valor.map(aTexto))
  if (esObjeto(valor)) {
    const salida: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(valor)) salida[k] = await aTexto(v)
    return salida
  }
  return valor
}

function deTexto(valor: unknown): unknown {
  if (Array.isArray(valor)) return valor.map(deTexto)
  if (esObjeto(valor)) {
    if (valor[MARCA_ARCHIVO] === true) {
      const bytes = base64ABytes(String(valor.datos))
      return new Blob([bytes as BlobPart], { type: String(valor.tipo ?? '') })
    }
    const salida: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(valor)) salida[k] = deTexto(v)
    return salida
  }
  return valor
}

function esObjeto(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

async function derivarClave(contrasena: string, sal: Uint8Array): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(contrasena), 'PBKDF2', false, [
    'deriveKey',
  ])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: sal as BufferSource, iterations: ITERACIONES, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

function bytesABase64(bytes: Uint8Array): string {
  let binario = ''
  const trozo = 0x8000
  for (let i = 0; i < bytes.length; i += trozo) {
    binario += String.fromCharCode(...bytes.subarray(i, i + trozo))
  }
  return btoa(binario)
}

function base64ABytes(texto: string): Uint8Array<ArrayBuffer> {
  const binario = atob(texto)
  const bytes = new Uint8Array(binario.length)
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i)
  return bytes
}
