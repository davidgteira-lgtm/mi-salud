// Reconocer medicamentos escritos de cualquier manera y avisar si chocan con una alergia.
import { CATALOGO, GRUPOS, type GrupoAlergia, type MedicamentoCatalogo } from '../datos/catalogoMedicamentos'

/** "Amoxicilina/Ácido Clavulánico 875mg" → "amoxicilina acido clavulanico 875mg" */
export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** ¿Aparece la frase como palabras completas dentro del texto? (ya normalizados) */
function contiene(texto: string, frase: string): boolean {
  return frase.length > 0 && ` ${texto} `.includes(` ${frase} `)
}

// Todos los nombres posibles, ya normalizados, apuntando a su medicamento.
const NOMBRES: { nombre: string; med: MedicamentoCatalogo }[] = CATALOGO.flatMap((med) =>
  [med.nombre, ...(med.otrosNombres ?? [])].map((n) => ({ nombre: normalizar(n), med })),
)

/**
 * Busca el medicamento en la lista, aunque venga con dosis o con el nombre comercial.
 * Si encaja con varios, se queda con el nombre más largo ("amoxicilina clavulánico" gana a "amoxicilina").
 */
export function buscarMedicamento(texto: string): MedicamentoCatalogo | undefined {
  const t = normalizar(texto)
  let mejor: { nombre: string; med: MedicamentoCatalogo } | undefined
  for (const n of NOMBRES) {
    if (contiene(t, n.nombre) && (!mejor || n.nombre.length > mejor.nombre.length)) mejor = n
  }
  return mejor?.med
}

/** Sugerencias mientras se escribe (a partir de 3 letras). */
export function sugerirMedicamentos(texto: string, maximo = 5): string[] {
  const t = normalizar(texto)
  if (t.length < 3) return []
  const vistos = new Set<string>()
  const salida: string[] = []
  for (const med of CATALOGO) {
    for (const n of [med.nombre, ...(med.otrosNombres ?? [])]) {
      if (normalizar(n).startsWith(t) && !vistos.has(n)) {
        vistos.add(n)
        salida.push(mayusculaInicial(n))
      }
    }
    if (salida.length >= maximo) break
  }
  return salida.slice(0, maximo)
}

/** Qué medicamento y qué grupos hay detrás de lo que la persona escribió como alergia. */
export function resolverAlergia(texto: string): { medicamento?: MedicamentoCatalogo; grupos: GrupoAlergia[] } {
  const t = normalizar(texto)
  const medicamento = buscarMedicamento(texto)
  const grupos = new Set<GrupoAlergia>(medicamento?.grupos ?? [])
  for (const [clave, info] of Object.entries(GRUPOS) as [GrupoAlergia, (typeof GRUPOS)[GrupoAlergia]][]) {
    if (info.sinonimos.some((s) => contiene(t, normalizar(s)))) grupos.add(clave)
  }
  return { medicamento, grupos: [...grupos] }
}

export interface AlergiaParaComprobar {
  id: string
  nombre: string
  tipo: 'medicamento' | 'alimento' | 'otro'
}

export interface AvisoAlergia {
  alergia: AlergiaParaComprobar
  /** alto = no tomar sin hablar con el médico; precaucion = posible reacción parecida. */
  nivel: 'alto' | 'precaucion'
  motivo: string
}

/** Comprueba si un medicamento choca con alguna alergia a medicamentos de la persona. */
export function comprobarAlergias(nombreMedicamento: string, alergias: AlergiaParaComprobar[]): AvisoAlergia[] {
  const textoMed = normalizar(nombreMedicamento)
  if (!textoMed) return []
  const med = buscarMedicamento(nombreMedicamento)
  const gruposMed = med?.grupos ?? []
  const avisos: AvisoAlergia[] = []

  for (const alergia of alergias) {
    if (alergia.tipo !== 'medicamento') continue
    const textoAlergia = normalizar(alergia.nombre)
    if (textoAlergia.length < 3) continue
    const r = resolverAlergia(alergia.nombre)

    // 1. Es el mismo medicamento.
    if (contiene(textoMed, textoAlergia) || (med && r.medicamento === med)) {
      avisos.push({ alergia, nivel: 'alto', motivo: `Tienes alergia a ${alergia.nombre}.` })
      continue
    }
    // 2. Es de la misma familia.
    const comun = gruposMed.find((g) => r.grupos.includes(g))
    if (comun) {
      avisos.push({
        alergia,
        nivel: 'alto',
        motivo: `Tienes alergia a ${alergia.nombre} y este medicamento es de la misma familia (${GRUPOS[comun].nombre}).`,
      })
      continue
    }
    // 3. Es de una familia relacionada (puede dar reacción cruzada).
    const relacionado = gruposMed.find((g) => r.grupos.some((ga) => GRUPOS[ga].relacionados?.includes(g)))
    if (relacionado) {
      avisos.push({
        alergia,
        nivel: 'precaucion',
        motivo: `Tienes alergia a ${alergia.nombre}. Este medicamento es de una familia parecida (${GRUPOS[relacionado].nombre}) y a veces da reacción.`,
      })
    }
  }
  return avisos.sort((a, b) => (a.nivel === b.nivel ? 0 : a.nivel === 'alto' ? -1 : 1))
}

/** Lista legible de otros medicamentos que entran en el aviso de una alergia (para explicarlo). */
export function ejemplosDeAviso(nombreAlergia: string, maximo = 4): string[] {
  const { medicamento, grupos } = resolverAlergia(nombreAlergia)
  if (grupos.length === 0) return []
  return CATALOGO.filter((m) => m !== medicamento && m.grupos?.some((g) => grupos.includes(g)))
    .map((m) => mayusculaInicial(m.otrosNombres?.[0] && m.nombre.includes(' ') ? m.otrosNombres[0] : m.nombre))
    .slice(0, maximo)
}

function mayusculaInicial(t: string): string {
  return t.charAt(0).toUpperCase() + t.slice(1)
}
