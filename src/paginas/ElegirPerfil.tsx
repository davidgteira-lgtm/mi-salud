import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Avatar } from '../componentes/Avatar'
import { listarPerfiles } from '../db/perfiles'
import { crearEjemplos } from '../demo/ejemplo'
import { usePerfilActivo } from '../perfilActivo'

/** Primera pantalla: "¿Quién eres?" */
export function ElegirPerfil() {
  const perfiles = useLiveQuery(listarPerfiles)
  const { elegir } = usePerfilActivo()
  const ir = useNavigate()

  if (perfiles === undefined) return null

  if (perfiles.length === 0) {
    return (
      <main className="pagina pila">
        <img src="./icono.svg" alt="" width={96} height={96} style={{ alignSelf: 'center', marginTop: 24 }} />
        <h1 style={{ textAlign: 'center' }}>Bienvenido a Mi Salud</h1>
        <p>Aquí puedes guardar tus medicinas, citas, análisis e informes médicos.</p>
        <p>
          <strong>Todo se queda en este móvil.</strong> No hace falta crear ninguna cuenta.
        </p>
        <button className="boton" onClick={() => ir('/persona/nueva')}>
          Empezar
        </button>
        <button className="boton boton-secundario" onClick={() => ir('/ajustes/recuperar')}>
          Recuperar una copia de seguridad
        </button>
        <BotonEjemplo />
      </main>
    )
  }

  return (
    <main className="pagina pila">
      <h1>¿Quién eres?</h1>
      {perfiles.map((p) => (
        <button
          key={p.id}
          className="persona"
          onClick={() => {
            elegir(p.id)
            ir('/inicio')
          }}
        >
          <Avatar perfil={p} />
          {p.nombre}
        </button>
      ))}
      <button className="boton boton-secundario" onClick={() => ir('/persona/nueva')}>
        ➕ Añadir otra persona
      </button>
      {!perfiles.some((p) => p.ejemplo) && <BotonEjemplo />}
    </main>
  )
}

/** Ver la app llena de datos inventados, para conocerla (o enseñarla) sin escribir nada. */
function BotonEjemplo() {
  const { elegir } = usePerfilActivo()
  const ir = useNavigate()
  const [creando, setCreando] = useState(false)
  return (
    <div className="pila" style={{ gap: 6, marginTop: 8 }}>
      <button
        className="boton boton-secundario"
        disabled={creando}
        onClick={async () => {
          setCreando(true)
          const id = await crearEjemplos()
          elegir(id)
          ir('/inicio')
        }}
      >
        {creando ? 'Preparando…' : '👀 Ver con datos de ejemplo'}
      </button>
      <small className="texto-suave" style={{ textAlign: 'center' }}>
        Crea dos personas inventadas para que veas cómo funciona todo. Se pueden borrar en Ajustes.
      </small>
    </div>
  )
}
