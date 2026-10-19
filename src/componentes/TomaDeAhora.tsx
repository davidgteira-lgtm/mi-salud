// «Sin tomar» / «Tomada»: la toma que toca ahora de un medicamento. Se queda marcada hasta la siguiente toma.
import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { useAhora } from './useAhora'
import { buscarToma, desmarcarTomada, marcarTomada } from '../db/tomas'
import type { Medicamento } from '../db/tipos'
import { cuandoEs, horasDe, siguienteToma, tomaActual } from '../utils/tomas'
import { Confirmar } from './Confirmar'
import { FotoMedicina } from './FotoMedicina'

const horaCorta = (ms: number) => {
  const d = new Date(ms)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function TomaDeAhora({ medicamento: m, conNombre = false }: { medicamento: Medicamento; conNombre?: boolean }) {
  const ahora = useAhora()
  const horas = horasDe(m)
  const actual = tomaActual(horas, ahora)
  const siguiente = siguienteToma(horas, ahora)
  const toma = useLiveQuery(async () => (actual ? ((await buscarToma(m.id, actual)) ?? null) : null), [m.id, actual?.fecha, actual?.hora])
  const [deshacer, setDeshacer] = useState(false)
  if (!actual || toma === undefined) return null
  const tomada = toma !== null

  return (
    <div className={tomada ? 'toma toma-hecha' : 'toma'}>
      <span className="toma-cabecera">
        {/* En las alertas, la foto de la pastilla (la misma que en Medicación) ayuda a saber cuál hay que tomar. */}
        {conNombre && <FotoMedicina medicamento={m} />}
        <span className="toma-texto">
          {conNombre && <strong>{m.nombre}</strong>}
          {conNombre && m.dosis && <span className="texto-suave"> · {m.dosis}</span>}
          {conNombre && <br />}
          Toma de {cuandoEs(actual, ahora)}
        </span>
      </span>
      <button
        type="button"
        className="toma-boton"
        aria-pressed={tomada}
        aria-label={tomada ? `${m.nombre}: tomada. Pulsa si fue sin querer` : `${m.nombre}: sin tomar. Pulsa cuando te la tomes`}
        onClick={() => (tomada ? setDeshacer(true) : marcarTomada(m.perfilId, m.id, actual))}
      >
        {tomada ? `✅ Tomada (${horaCorta(toma.tomadaEn)})` : '⬜ Sin tomar'}
      </button>
      {!tomada && <small className="texto-suave">Pulsa el botón cuando te la tomes.</small>}
      {siguiente && horas.length > 1 && <small className="texto-suave">Siguiente: {cuandoEs(siguiente, ahora)}</small>}
      {deshacer && (
        <Confirmar
          titulo="¿Marcarla como sin tomar?"
          textoSi="Sí, no me la he tomado"
          onSi={async () => {
            await desmarcarTomada(m.id, actual)
            setDeshacer(false)
          }}
          onNo={() => setDeshacer(false)}
        >
          <p>Por si la marcaste sin querer.</p>
        </Confirmar>
      )}
    </div>
  )
}
