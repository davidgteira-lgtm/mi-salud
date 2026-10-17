// Reglas para los números de teléfono: limpiarlos para llamar y escribirlos bonitos.

/**
 * Deja solo lo que el móvil necesita para llamar: números y, si lo hay, el "+" del principio.
 * "91 234 56 78" → "912345678"   ·   "0034 912 345 678" → "+34912345678"
 */
export function limpiarTelefono(texto: string): string {
  const t = texto.trim()
  const digitos = t.replace(/\D/g, '')
  if (t.startsWith('+')) return '+' + digitos
  if (digitos.startsWith('00') && digitos.length > 4) return '+' + digitos.slice(2)
  return digitos
}

/** Vale cualquier número de 3 cifras (112, 016…) hasta 15 (el máximo internacional). */
export function esTelefonoValido(texto: string): boolean {
  const cifras = limpiarTelefono(texto).replace('+', '')
  return cifras.length >= 3 && cifras.length <= 15
}

/**
 * Escribe el número en grupos fáciles de leer.
 * "912345678" → "912 345 678"   ·   "+34912345678" → "+34 912 345 678"
 */
export function telefonoParaLeer(texto: string): string {
  const limpio = limpiarTelefono(texto)
  const espanol = /^(\+34)?(\d{9})$/.exec(limpio)
  if (!espanol) return limpio
  const [, prefijo, n] = espanol
  const agrupado = `${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}`
  return prefijo ? `${prefijo} ${agrupado}` : agrupado
}

/** Enlace que abre la llamada en el móvil. */
export function enlaceLlamada(texto: string): string {
  return `tel:${limpiarTelefono(texto)}`
}
