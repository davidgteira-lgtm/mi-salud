// Ayudas para comparar textos escritos de cualquier manera.

/** "Amoxicilina/Ácido Clavulánico 875mg" → "amoxicilina acido clavulanico 875mg" */
export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/**
 * Buscador sencillo: todas las palabras buscadas tienen que aparecer
 * (como principio de alguna palabra) en alguno de los textos.
 * "dolor espal" encuentra "Dolor de espalda". Da igual tildes y mayúsculas.
 */
export function coincide(busqueda: string, ...textos: (string | undefined)[]): boolean {
  const palabras = normalizar(busqueda).split(' ').filter(Boolean)
  if (palabras.length === 0) return true
  const donde = normalizar(textos.filter(Boolean).join(' ')).split(' ')
  return palabras.every((p) => donde.some((d) => d.startsWith(p)))
}
