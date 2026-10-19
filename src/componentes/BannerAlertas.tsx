// El primer banner del inicio: «ALERTAS · Entra aquí lo primero», con lo pendiente de hoy, una cosa por línea.
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router'
import { copiaPendiente } from '../copia/recordatorio'
import { resumenAlertas, textoResumen } from '../db/alertas'
import type { Perfil } from '../db/tipos'
import { IlustracionAlertas } from './IlustracionAlertas'
import { useAhora } from './useAhora'

export function BannerAlertas({ perfil }: { perfil: Perfil }) {
  const ahora = useAhora()
  // La hora en minutos: así se recalcula al pasar de una toma a la siguiente.
  const minuto = `${ahora.getHours()}:${ahora.getMinutes()}`
  const resumen = useLiveQuery(() => resumenAlertas(perfil, ahora), [perfil, minuto])
  const { total, partes } = resumen ? textoResumen(resumen, copiaPendiente()) : { total: 0, partes: [] }

  return (
    <Link to="/alertas" className="alertas-tarjeta" aria-label={`Alertas: ${total ? `${total} pendientes. ${partes.join('. ')}` : 'todo al día'}`}>
      <div className="banner banner-alertas">
        <IlustracionAlertas />
        <span className="banner-texto">
          {resumen && (
            <span className={total ? 'alertas-numero alertas-parpadeo' : 'alertas-numero alertas-al-dia'}>
              {total ? (total === 1 ? '1 aviso' : `${total} avisos`) : '✓ Todo al día'}
            </span>
          )}
          <strong>ALERTAS</strong>
          <span>Entra aquí lo primero</span>
        </span>
      </div>
      {partes.length > 0 && (
        <ul className="alertas-lista">
          {partes.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
    </Link>
  )
}
