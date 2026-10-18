import { useState } from 'react'
import { crearEjemplos, VERSION_EJEMPLOS } from '../demo/ejemplo'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useNavigate } from 'react-router'
import { AvatarEditable } from '../componentes/AvatarEditable'
import { Banner } from '../componentes/Banner'
import { diasDesdeUltimaCopia } from '../copia/recordatorio'
import { listarProximas } from '../db/citas'
import { listarMedicamentos } from '../db/medicamentos'
import { textoValor } from '../db/constantes'
import { db } from '../db/db'
import { enfermedadesCronicas } from '../db/historial'
import { datosEnlazados, listarRegistros, queToca } from '../db/revisiones'
import type { Perfil } from '../db/tipos'
import { controlesEnCasa } from '../utils/controles'
import { TomaDeAhora } from '../componentes/TomaDeAhora'
import { horasDe } from '../utils/tomas'
import { adjuntosPendientes, sePuedeAnalizar } from '../ia/analizar'
import { obtenerClave } from '../ia/claude'
import { usePerfilActivo } from '../perfilActivo'
import { SECCIONES } from '../secciones'
import { calcularEdad, cuandoFalta, diasEntre, esFechaValida, hoyISO } from '../utils/fechas'

const DIAS_AVISO = 7

/** "📅 Mañana a las 10:30: Cardiología" para las citas de los próximos días. */
function AvisoProximasCitas({ perfilId }: { perfilId: string }) {
  const hoy = hoyISO()
  const citas = useLiveQuery(
    async () => (await listarProximas(perfilId, hoy)).filter((c) => diasEntre(hoy, c.fecha) <= DIAS_AVISO),
    [perfilId, hoy],
  )
  if (!citas?.length) return null
  return (
    <Link to="/seccion/citas" className="aviso aviso-cita">
      {citas.slice(0, 3).map((c) => (
        <div key={c.id}>
          📅 <strong>{cuandoFalta(c.fecha, hoy)}</strong>
          {c.hora && ` a las ${c.hora}`}: {c.especialidad}
        </div>
      ))}
      {citas.length > 3 && <div>…y {citas.length - 3} más</div>}
    </Link>
  )
}

/** Entrada a la IA: solo si está activada en este móvil. */
function EntradaIa({ perfilId }: { perfilId: string }) {
  const sinLeer = useLiveQuery(async () => (await adjuntosPendientes(perfilId)).filter((a) => sePuedeAnalizar(a).si).length, [perfilId])
  if (!obtenerClave()) return null
  return (
    <Link to="/revisar" className="banner-ia">
      <span style={{ fontSize: '2rem' }} aria-hidden="true">
        🤖
      </span>
      <span>
        Cuéntaselo a la app
        <small>
          {sinLeer
            ? `${sinLeer === 1 ? 'Tienes 1 archivo' : `Tienes ${sinLeer} archivos`} sin leer por la IA`
            : 'La IA lo apunta por ti y tú lo confirmas'}
        </small>
      </span>
    </Link>
  )
}

/** En el inicio: la toma de ahora de cada medicamento, para ver de un vistazo si ya se ha tomado. */
function MedicacionDeAhora({ perfilId }: { perfilId: string }) {
  const meds = useLiveQuery(async () => (await listarMedicamentos(perfilId, true)).filter((m) => horasDe(m).length > 0), [perfilId])
  if (!meds?.length) return null
  return (
    <div className="pila" aria-label="Medicación de ahora" style={{ gap: 10 }}>
      <h3 className="hoy-titulo">💊 Medicación</h3>
      {meds.map((m) => (
        <TomaDeAhora key={m.id} medicamento={m} conNombre />
      ))}
    </div>
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
    <div className="pila" style={{ gap: 10 }}>
      <h3 className="hoy-titulo">🩺 Controles en casa</h3>
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
    </div>
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
    <Link to="/seccion/revisiones" className="aviso" style={{ display: 'block', textDecoration: 'none', margin: 0 }}>
      <strong>💉 Te toca:</strong>{' '}
      {tocan
        .slice(0, 3)
        .map((x) => x.nombre.charAt(0).toLowerCase() + x.nombre.slice(1))
        .join(', ')}
      {tocan.length > 3 && ` y ${tocan.length - 3} más`}. <strong>Ver</strong>
    </Link>
  )
}

/** Lo de hoy, nada más entrar: citas cercanas, tomas, controles en casa y revisiones que tocan. */
function PanelHoy({ perfil }: { perfil: Perfil }) {
  return (
    <section className="tarjeta pila panel-hoy" aria-label="Hoy" style={{ gap: 12 }}>
      <h2 style={{ margin: 0 }}>🔔 Hoy</h2>
      <AvisoProximasCitas perfilId={perfil.id} />
      <MedicacionDeAhora perfilId={perfil.id} />
      <ControlesDeHoy perfilId={perfil.id} />
      <RevisionesDeHoy perfil={perfil} />
    </section>
  )
}

/** Si los datos de ejemplo de este móvil son de una versión anterior, se pueden volver a crear con lo nuevo. */
function ActualizarEjemplos({ nombre }: { nombre: string }) {
  const { elegir } = usePerfilActivo()
  const [trabajando, setTrabajando] = useState(false)
  return (
    <div className="aviso pila" role="status" style={{ gap: 8 }}>
      <span>🔄 Hay datos de ejemplo nuevos (facturas, partes de baja, informes…).</span>
      <button
        className="boton"
        disabled={trabajando}
        onClick={async () => {
          setTrabajando(true)
          await crearEjemplos()
          // Se vuelve a la misma persona de ejemplo, ya con los datos nuevos.
          const misma = await db.perfiles.filter((p) => !!p.ejemplo && p.nombre === nombre).first()
          if (misma) elegir(misma.id)
          // Al borrar la antigua, la app vuelve a «¿Quién eres?»: se regresa al inicio de la nueva.
          window.location.hash = '#/inicio'
          setTrabajando(false)
        }}
      >
        {trabajando ? 'Actualizando…' : 'Actualizar los ejemplos'}
      </button>
    </div>
  )
}
/** Pantalla de inicio con los banners de todas las secciones. */
export function Inicio() {
  const { perfil, elegir } = usePerfilActivo()
  const ir = useNavigate()
  if (!perfil) return null

  const dias = diasDesdeUltimaCopia()

  return (
    <main className="pagina pila">
      <header className="cabecera">
        <AvatarEditable perfil={perfil} />
        <h1>Hola, {perfil.nombre}</h1>
        <button
          className="boton boton-secundario"
          onClick={() => {
            elegir(null)
            ir('/')
          }}
        >
          Cambiar persona
        </button>
      </header>

      <PanelHoy perfil={perfil} />

      {perfil.ejemplo && (
        <p className="aviso aviso-cita" role="note">
          👀 <strong>Persona de ejemplo:</strong> todos sus datos son inventados. Para usar la app de verdad, pulsa «Cambiar persona» y
          añade la tuya.
        </p>
      )}
      {perfil.ejemplo && (perfil.ejemploVersion ?? 1) < VERSION_EJEMPLOS && <ActualizarEjemplos nombre={perfil.nombre} />}

      <Link to="/buscar" className="entrada-buscar">
        <span aria-hidden="true">🔎</span> Buscar en todo lo apuntado
      </Link>
      <Link to="/resumen" className="entrada-buscar">
        <span aria-hidden="true">📄</span> Resumen para el médico
      </Link>

      {!perfil.foto && !perfil.ejemplo && <p className="aviso aviso-cita">📷 Toca la cámara de arriba para poner tu foto.</p>}

      <EntradaIa perfilId={perfil.id} />

      {(dias === null || dias > 30) && (
        <Link to="/ajustes" className="aviso" style={{ textDecoration: 'none', display: 'block' }}>
          💾 {dias === null ? 'Aún no has hecho ninguna copia de seguridad.' : `Tu última copia es de hace ${dias} días.`}{' '}
          <strong>Pulsa aquí para hacerla.</strong>
        </Link>
      )}

      <Link to="/seccion/emergencia" className="banner-emergencia">
        <span style={{ fontSize: '2rem' }} aria-hidden="true">
          🚑
        </span>
        <span>
          Ficha de emergencia
          <small>Alergias, medicación y a quién llamar</small>
        </span>
      </Link>

      {SECCIONES.map((s) => (
        <Banner key={s.clave} seccion={s} />
      ))}

      <Link to="/ajustes" className="boton boton-secundario">
        ⚙️ Ajustes y copia de seguridad
      </Link>
    </main>
  )
}
