import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useNavigate } from 'react-router'
import { AvatarEditable } from '../componentes/AvatarEditable'
import { Banner } from '../componentes/Banner'
import { diasDesdeUltimaCopia } from '../copia/recordatorio'
import { listarProximas } from '../db/citas'
import { usePerfilActivo } from '../perfilActivo'
import { SECCIONES } from '../secciones'
import { cuandoFalta, diasEntre, hoyISO } from '../utils/fechas'

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

      {!perfil.foto && <p className="aviso aviso-cita">📷 Toca la cámara de arriba para poner tu foto.</p>}

      <AvisoProximasCitas perfilId={perfil.id} />

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
