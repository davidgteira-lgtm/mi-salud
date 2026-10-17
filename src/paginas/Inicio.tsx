import { Link, useNavigate } from 'react-router'
import { Avatar } from '../componentes/Avatar'
import { Banner } from '../componentes/Banner'
import { usePerfilActivo } from '../perfilActivo'
import { SECCIONES } from '../secciones'
import { diasDesdeUltimaCopia } from '../copia/recordatorio'

/** Pantalla de inicio con los banners de todas las secciones. */
export function Inicio() {
  const { perfil, elegir } = usePerfilActivo()
  const ir = useNavigate()
  if (!perfil) return null

  const dias = diasDesdeUltimaCopia()

  return (
    <main className="pagina pila">
      <header className="cabecera">
        <Link to={`/persona/${perfil.id}`} aria-label="Cambiar mis datos">
          <Avatar perfil={perfil} pequeno />
        </Link>
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
