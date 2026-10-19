// «Alertas»: lo pendiente de hoy, todo junto. Se entra desde el primer banner del inicio.
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useNavigate } from 'react-router'
import { TomaDeAhora } from '../componentes/TomaDeAhora'
import { copiaPendiente, diasDesdeUltimaCopia } from '../copia/recordatorio'
import { DIAS_AVISO_CITAS, resumenAlertas, textoResumen } from '../db/alertas'
import { listarProximas } from '../db/citas'
import { textoValor } from '../db/constantes'
import { db } from '../db/db'
import { enfermedadesCronicas } from '../db/historial'
import { listarMedicamentos } from '../db/medicamentos'
import { datosEnlazados, listarRegistros, queToca } from '../db/revisiones'
import type { Perfil } from '../db/tipos'
import { usePerfilActivo } from '../perfilActivo'
import { controlesEnCasa } from '../utils/controles'
import { calcularEdad, cuandoFalta, diasEntre, esFechaValida, hoyISO } from '../utils/fechas'
import { horasDe } from '../utils/tomas'

/** "📅 Mañana a las 10:30: Cardiología" para las citas de los próximos días. */
function ProximasCitas({ perfilId }: { perfilId: string }) {
  const hoy = hoyISO()
  const citas = useLiveQuery(
    async () => (await listarProximas(perfilId, hoy)).filter((c) => diasEntre(hoy, c.fecha) <= DIAS_AVISO_CITAS),
    [perfilId, hoy],
  )
  if (!citas?.length) return null
  return (
    <section className="tarjeta pila alerta-bloque" style={{ gap: 10 }}>
      <h2 className="hoy-titulo">📅 Citas de estos días</h2>
      <Link to="/seccion/citas" className="aviso aviso-cita" style={{ margin: 0 }}>
        {citas.map((c) => (
          <div key={c.id}>
            📅 <strong>{cuandoFalta(c.fecha, hoy)}</strong>
            {c.hora && ` a las ${c.hora}`}: {c.especialidad}
          </div>
        ))}
      </Link>
    </section>
  )
}

/** La toma de ahora de cada medicamento, para ver de un vistazo si ya se ha tomado. */
function MedicacionDeAhora({ perfilId }: { perfilId: string }) {
  const meds = useLiveQuery(async () => (await listarMedicamentos(perfilId, true)).filter((m) => horasDe(m).length > 0), [perfilId])
  if (!meds?.length) return null
  return (
    <section className="tarjeta pila alerta-bloque" aria-label="Medicación de ahora" style={{ gap: 10 }}>
      <h2 className="hoy-titulo">💊 Medicación</h2>
      {meds.map((m) => (
        <TomaDeAhora key={m.id} medicamento={m} conNombre />
      ))}
    </section>
  )
}

/** Controles en casa (azúcar, tensión) que tocan hoy, con un botón para apuntarlos. */
function ControlesDeHoy({ perfilId }: { perfilId: string }) {
  const hoy = hoyISO()
  const controles = useLiveQuery(async () => {
    const [enfermedades, medicamentos, medidas] = await Promise.all([
      enfermedadesCronicas(perfilId),
      listarMedicamentos(perfilId, true),
      db.constantes.where('[perfilId+fecha]').equals([perfilId, hoy]).toArray(),
    ])
    return controlesEnCasa({ enfermedades, medicamentos, medidas, hoy })
  }, [perfilId, hoy])
  if (!controles?.length) return null
  return (
    <section className="tarjeta pila alerta-bloque" style={{ gap: 10 }}>
      <h2 className="hoy-titulo">🩺 Controles en casa</h2>
      {controles.map((c) => (
        <div key={c.tipo} className={c.deHoy ? 'toma toma-hecha' : 'toma'}>
          <span className="toma-texto">
            <strong>
              {c.tipo === 'glucosa' ? '🩸' : '🩺'} {c.titulo}
            </strong>
            <span className="texto-suave"> · {c.motivo}</span>
          </span>
          {c.deHoy ? (
            <span>
              ✅ Apuntado hoy: <strong>{textoValor(c.deHoy)}</strong>
              {c.deHoy.hora && ` a las ${c.deHoy.hora}`}
            </span>
          ) : (
            <Link
              to={`/seccion/constantes?tipo=${c.tipo}&nueva=1`}
              className="toma-boton"
              style={{ textAlign: 'center', textDecoration: 'none', padding: '14px' }}
            >
              ⬜ Aún no · Apuntarlo
            </Link>
          )}
        </div>
      ))}
    </section>
  )
}

/** Revisiones y vacunas que tocan ya. */
function RevisionesDeHoy({ perfil }: { perfil: Perfil }) {
  const tocan = useLiveQuery(async () => {
    const edad = perfil.fechaNacimiento && esFechaValida(perfil.fechaNacimiento) ? calcularEdad(perfil.fechaNacimiento) : undefined
    const [registros, enlazados] = await Promise.all([listarRegistros(perfil.id), datosEnlazados(perfil.id)])
    return queToca({
      edad,
      sexo: perfil.sexo,
      registros,
      enlazados,
      ocultas: perfil.revisionesOcultas,
      propias: perfil.revisionesPropias,
    }).filter((x) => x.estado === 'toca')
  }, [perfil])
  if (!tocan?.length) return null
  return (
    <section className="tarjeta pila alerta-bloque" style={{ gap: 10 }}>
      <h2 className="hoy-titulo">💉 Revisiones y vacunas que te tocan</h2>
      <Link to="/seccion/revisiones" className="aviso" style={{ display: 'block', textDecoration: 'none', margin: 0 }}>
        {tocan.map((x) => (
          <div key={x.clave}>
            {x.icono} {x.nombre}
          </div>
        ))}
        <strong>Ver y apuntarlas</strong>
      </Link>
    </section>
  )
}

function CopiaDeSeguridad() {
  if (!copiaPendiente()) return null
  const dias = diasDesdeUltimaCopia()
  return (
    <section className="tarjeta pila alerta-bloque" style={{ gap: 10 }}>
      <h2 className="hoy-titulo">💾 Copia de seguridad</h2>
      <Link to="/ajustes" className="aviso" style={{ textDecoration: 'none', display: 'block', margin: 0 }}>
        {dias === null ? 'Aún no has hecho ninguna copia de seguridad.' : `Tu última copia es de hace ${dias} días.`}{' '}
        <strong>Pulsa aquí para hacerla.</strong>
      </Link>
    </section>
  )
}

export function Alertas() {
  const { perfil } = usePerfilActivo()
  const ir = useNavigate()
  const resumen = useLiveQuery(async () => (perfil ? resumenAlertas(perfil) : undefined), [perfil])
  if (!perfil) return null
  const { total } = resumen ? textoResumen(resumen, copiaPendiente()) : { total: 0 }

  return (
    <main className="pagina pila">
      <button className="boton-volver" onClick={() => ir('/inicio')} style={{ alignSelf: 'flex-start' }}>
        ← Volver al inicio
      </button>
      <h1>🔔 Alertas</h1>
      {resumen && (
        <p className={total ? 'aviso' : 'aviso aviso-ok'} role="status" style={{ margin: 0 }}>
          {total
            ? `Tienes ${total === 1 ? '1 cosa pendiente' : `${total} cosas pendientes`}. Al marcarlas, desaparecen del aviso.`
            : '✅ Todo al día. No tienes nada pendiente ahora mismo.'}
        </p>
      )}
      <MedicacionDeAhora perfilId={perfil.id} />
      <ControlesDeHoy perfilId={perfil.id} />
      <ProximasCitas perfilId={perfil.id} />
      <RevisionesDeHoy perfil={perfil} />
      <CopiaDeSeguridad />
      <button className="boton boton-secundario" onClick={() => ir('/inicio')}>
        Ir al inicio
      </button>
    </main>
  )
}
