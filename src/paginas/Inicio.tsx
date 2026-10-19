import { useState } from 'react'
import { crearEjemplos, VERSION_EJEMPLOS } from '../demo/ejemplo'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useNavigate } from 'react-router'
import { AvatarEditable } from '../componentes/AvatarEditable'
import { Banner } from '../componentes/Banner'
import { BannerAlertas } from '../componentes/BannerAlertas'
import { db } from '../db/db'
import { adjuntosPendientes, sePuedeAnalizar } from '../ia/analizar'
import { obtenerClave } from '../ia/claude'
import { usePerfilActivo } from '../perfilActivo'
import { SECCIONES } from '../secciones'

const OCULTAR_AVISO_IA = 'mi-salud-ocultar-aviso-ia'

/** Sin IA: un aviso que explica qué es, cuánto cuesta y cómo activarla. Se puede ocultar. */
function AvisoIa() {
  const [oculto, setOculto] = useState(() => {
    try {
      return localStorage.getItem(OCULTAR_AVISO_IA) === '1'
    } catch {
      return false
    }
  })
  if (oculto) return null
  return (
    <div className="pila" style={{ gap: 4 }}>
      <Link to="/ajustes/ia" className="banner-ia">
        <span style={{ fontSize: '2rem' }} aria-hidden="true">
          🤖
        </span>
        <span>
          ¿Quieres que la app lea tus documentos?
          <small>Te explicamos cómo activar la IA y cuánto cuesta (muy poco). Pulsa aquí.</small>
        </span>
      </Link>
      <button
        className="enlace"
        style={{ alignSelf: 'flex-end' }}
        onClick={() => {
          try {
            localStorage.setItem(OCULTAR_AVISO_IA, '1')
          } catch {
            // Sin almacenamiento, se oculta solo hasta la próxima vez.
          }
          setOculto(true)
        }}
      >
        No me interesa, ocultar
      </button>
    </div>
  )
}

/** Entrada a la IA: si está activada en este móvil; si no, el aviso de cómo activarla. */
function EntradaIa({ perfilId }: { perfilId: string }) {
  const sinLeer = useLiveQuery(async () => (await adjuntosPendientes(perfilId)).filter((a) => sePuedeAnalizar(a).si).length, [perfilId])
  if (!obtenerClave()) return <AvisoIa />
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

      <BannerAlertas perfil={perfil} />

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
