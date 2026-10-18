// Al adjuntar un PDF en un formulario, se lee en el propio móvil y se rellena lo que se reconozca (sin IA).
import { useEffect, useRef, useState } from 'react'
import type { AdjuntoNuevo } from '../db/adjuntos'
import { filasDePdf, type FilaPdf } from '../utils/leerPdf'

export type EstadoLectura = { estado: 'leyendo' } | { estado: 'leido'; texto: string } | { estado: 'nada' } | null

/**
 * leer: lo que se saca del PDF (o null si no es ese tipo de documento).
 * aplicar: rellena el formulario con lo leído y devuelve el aviso para la persona.
 */
export function useLecturaPdf<T>(pendientes: AdjuntoNuevo[], leer: (filas: FilaPdf[]) => T | null, aplicar: (leido: T) => string): EstadoLectura {
  const [estado, setEstado] = useState<EstadoLectura>(null)
  const vistos = useRef(new Set<string>())
  const funciones = useRef({ leer, aplicar })
  useEffect(() => {
    funciones.current = { leer, aplicar }
  })

  useEffect(() => {
    const nuevos = pendientes.filter((p) => p.archivo.type === 'application/pdf' && !vistos.current.has(p.clave))
    if (nuevos.length === 0) return
    nuevos.forEach((p) => vistos.current.add(p.clave))
    setEstado({ estado: 'leyendo' })
    ;(async () => {
      let aviso: string | undefined
      for (const p of nuevos) {
        try {
          const leido = funciones.current.leer(await filasDePdf(p.archivo))
          if (leido) aviso = funciones.current.aplicar(leido)
        } catch {
          // Un PDF que no se puede leer se queda solo como adjunto.
        }
      }
      setEstado(aviso ? { estado: 'leido', texto: aviso } : { estado: 'nada' })
    })()
  }, [pendientes])

  return estado
}

/** El aviso, debajo del título del formulario. */
export function textoLectura(e: EstadoLectura): { texto: string; clase: string } | null {
  if (!e) return null
  if (e.estado === 'leyendo') return { texto: '📄 Leyendo el PDF…', clase: 'aviso aviso-cita' }
  if (e.estado === 'leido') return { texto: e.texto, clase: 'aviso aviso-cita' }
  return { texto: 'No he reconocido los datos de este PDF: queda guardado con el registro, pero rellena tú los datos.', clase: 'aviso' }
}
