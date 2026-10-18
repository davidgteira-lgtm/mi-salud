// Conexión con Claude, la IA de Anthropic. Se usa solo cuando la persona pulsa «Analizar»:
// entonces se envía ese documento, foto o texto por internet, directamente desde el móvil
// (no hay ningún servidor de Mi Salud en medio). La clave de acceso se guarda solo en este móvil.

export const MODELO = 'claude-sonnet-5-5'
const URL_API = 'https://api.anthropic.com/v1/messages'
const CLAVE_GUARDADA = 'mi-salud:clave-ia'
const ACEPTADO = 'mi-salud:ia-aceptada'

// ---------- La clave y el permiso, guardados en este móvil ----------

function leer(nombre: string): string | null {
  try {
    return localStorage.getItem(nombre)
  } catch {
    return null
  }
}

function escribir(nombre: string, valor: string | null): void {
  try {
    if (valor === null) localStorage.removeItem(nombre)
    else localStorage.setItem(nombre, valor)
  } catch {
    // Sin almacenamiento (modo privado): no se recuerda.
  }
}

export const obtenerClave = (): string | null => leer(CLAVE_GUARDADA)
export const guardarClave = (clave: string): void => escribir(CLAVE_GUARDADA, clave.trim())
export const borrarClave = (): void => escribir(CLAVE_GUARDADA, null)
/** Si la persona ya ha leído y aceptado qué se envía al analizar. */
export const iaAceptada = (): boolean => leer(ACEPTADO) === 'si'
export const aceptarIa = (si: boolean): void => escribir(ACEPTADO, si ? 'si' : null)

/** Las claves de Anthropic empiezan por «sk-ant-». Sirve para avisar si se ha pegado otra cosa. */
export function pareceClave(texto: string): boolean {
  return /^sk-ant-[A-Za-z0-9_-]{20,}$/.test(texto.trim())
}

// ---------- Llamar a Claude ----------

export type Bloque =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }
  | { type: 'document'; source: { type: 'base64'; media_type: 'application/pdf'; data: string } }

export interface Herramienta {
  name: string
  description: string
  input_schema: Record<string, unknown>
}

/** Un error ya explicado en palabras sencillas. */
export class ErrorIa extends Error {}

export function cuerpoPeticion(p: { sistema: string; contenido: Bloque[]; herramienta?: Herramienta; maxTokens?: number }) {
  return {
    model: MODELO,
    max_tokens: p.maxTokens ?? 8000,
    system: p.sistema,
    messages: [{ role: 'user', content: p.contenido }],
    ...(p.herramienta ? { tools: [p.herramienta], tool_choice: { type: 'tool', name: p.herramienta.name } } : {}),
  }
}

/** Envía la petición y devuelve lo que la IA ha rellenado en la herramienta (o su texto). */
export async function llamarClaude(p: {
  clave: string
  sistema: string
  contenido: Bloque[]
  herramienta?: Herramienta
  maxTokens?: number
}): Promise<{ datos?: unknown; texto: string }> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new ErrorIa('No hay internet. Lo dejo pendiente y lo analizas cuando tengas conexión.')
  }
  let respuesta: Response
  try {
    respuesta = await fetch(URL_API, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': p.clave,
        'anthropic-version': '2023-06-01',
        // Permite llamar desde el navegador del móvil, sin servidor en medio.
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(cuerpoPeticion(p)),
    })
  } catch {
    throw new ErrorIa('No se ha podido conectar. Revisa que tienes internet y vuelve a probar.')
  }
  if (!respuesta.ok) throw new ErrorIa(explicarError(respuesta.status))

  const json = (await respuesta.json()) as { content?: { type: string; text?: string; input?: unknown }[] }
  const bloques = json.content ?? []
  return {
    datos: bloques.find((b) => b.type === 'tool_use')?.input,
    texto: bloques
      .filter((b) => b.type === 'text')
      .map((b) => b.text ?? '')
      .join('\n'),
  }
}

export function explicarError(estado: number): string {
  if (estado === 401 || estado === 403) return 'La clave de la IA no es válida. Revísala en Ajustes.'
  if (estado === 413) return 'El archivo es demasiado grande para analizarlo.'
  if (estado === 429) return 'Se han hecho muchas peticiones seguidas. Espera un minuto y vuelve a probar.'
  if (estado === 400) return 'La IA no ha podido leer este archivo. Prueba con una foto más clara.'
  if (estado >= 500) return 'El servicio de la IA está ocupado ahora mismo. Prueba dentro de un rato.'
  return 'Algo ha fallado al hablar con la IA. Vuelve a probar dentro de un rato.'
}

/** Comprueba que la clave funciona con una pregunta mínima. */
export async function probarClave(clave: string): Promise<void> {
  await llamarClaude({ clave, sistema: 'Responde solo «OK».', contenido: [{ type: 'text', text: 'Prueba' }], maxTokens: 5 })
}

// ---------- Preparar archivos ----------

/** Pasa un archivo a base64 (como lo pide la IA). */
export async function enBase64(archivo: Blob): Promise<string> {
  const bytes = new Uint8Array(await archivo.arrayBuffer())
  let binario = ''
  const trozo = 0x8000
  for (let i = 0; i < bytes.length; i += trozo) binario += String.fromCharCode(...bytes.subarray(i, i + trozo))
  return btoa(binario)
}
