import { useLiveQuery } from 'dexie-react-hooks'
import { useRef, useState, type FormEvent } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { Avatar } from '../componentes/Avatar'
import { Confirmar } from '../componentes/Confirmar'
import { db } from '../db/db'
import { actualizarPerfil, borrarPerfil, COLORES_PERFIL, crearPerfil } from '../db/perfiles'
import type { Perfil, Sexo } from '../db/tipos'
import { usePerfilActivo } from '../perfilActivo'
import { hoyISO } from '../utils/fechas'
import { reducirFoto } from '../utils/imagen'

const SEXOS: { valor: Sexo; texto: string }[] = [
  { valor: 'mujer', texto: 'Mujer' },
  { valor: 'hombre', texto: 'Hombre' },
  { valor: 'otro', texto: 'Prefiero no decirlo' },
]

/** Crear una persona nueva o cambiar sus datos. */
export function FormularioPerfil() {
  const { id } = useParams()
  // Al editar, primero se cargan los datos guardados y luego se enseña el formulario ya relleno.
  const existente = useLiveQuery(async () => (id ? ((await db.perfiles.get(id)) ?? null) : null), [id])
  if (existente === undefined) return null
  if (id && !existente) return <Navigate to="/" replace />
  return <Formulario existente={existente ?? undefined} />
}

function Formulario({ existente }: { existente?: Perfil }) {
  const id = existente?.id
  const ir = useNavigate()
  const { elegir } = usePerfilActivo()

  const [nombre, setNombre] = useState(existente?.nombre ?? '')
  const [fechaNacimiento, setFecha] = useState(existente?.fechaNacimiento ?? '')
  const [sexo, setSexo] = useState<Sexo | undefined>(existente?.sexo)
  const [foto, setFoto] = useState<Blob | undefined>(existente?.foto)
  const [color, setColor] = useState(existente?.color ?? COLORES_PERFIL[0])
  const [error, setError] = useState('')
  const [preguntarBorrar, setPreguntarBorrar] = useState(false)
  const camara = useRef<HTMLInputElement>(null)
  const galeria = useRef<HTMLInputElement>(null)

  async function alElegirFoto(archivo: File | undefined) {
    if (archivo) setFoto(await reducirFoto(archivo, 400))
  }

  async function guardar(e: FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) {
      setError('Escribe el nombre, por favor.')
      return
    }
    const datos = { nombre, fechaNacimiento: fechaNacimiento || undefined, sexo, foto, color }
    if (id) {
      await actualizarPerfil(id, datos)
      ir('/inicio')
    } else {
      const nuevo = await crearPerfil(datos)
      elegir(nuevo.id)
      ir('/inicio')
    }
  }

  async function borrar() {
    if (!id) return
    await borrarPerfil(id)
    elegir(null)
    ir('/')
  }

  return (
    <main className="pagina">
      <button className="boton-volver" onClick={() => ir(-1)}>
        ← Volver
      </button>
      <h1>{id ? 'Cambiar mis datos' : 'Nueva persona'}</h1>

      <form className="pila" onSubmit={guardar} noValidate>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Avatar perfil={{ nombre: nombre || '?', foto, color }} />
          <div className="pila" style={{ flex: 1, gap: 8 }}>
            <button type="button" className="boton boton-secundario" onClick={() => camara.current?.click()}>
              📷 Hacer foto
            </button>
            <button type="button" className="boton boton-secundario" onClick={() => galeria.current?.click()}>
              🖼️ Elegir foto
            </button>
          </div>
        </div>
        <input ref={camara} type="file" accept="image/*" capture="user" hidden onChange={(e) => alElegirFoto(e.target.files?.[0])} />
        <input ref={galeria} type="file" accept="image/*" hidden onChange={(e) => alElegirFoto(e.target.files?.[0])} />

        <label className="campo">
          <span>Nombre</span>
          <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="given-name" />
        </label>
        {error && <p className="aviso aviso-error">{error}</p>}

        <label className="campo">
          <span>Fecha de nacimiento</span>
          <small>Sirve para avisarte de las revisiones y vacunas que te tocan por edad.</small>
          <input type="date" value={fechaNacimiento} max={hoyISO()} onChange={(e) => setFecha(e.target.value)} />
        </label>

        <fieldset className="campo" style={{ border: 0, padding: 0, margin: 0 }}>
          <span>Sexo</span>
          <small>Algunas revisiones son distintas para mujeres y hombres.</small>
          <div className="opciones">
            {SEXOS.map((s) => (
              <button key={s.valor} type="button" className="opcion" aria-pressed={sexo === s.valor} onClick={() => setSexo(s.valor)}>
                {s.texto}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="campo" style={{ border: 0, padding: 0, margin: 0 }}>
          <span>Color</span>
          <div className="colores">
            {COLORES_PERFIL.map((c, i) => (
              <button
                key={c}
                type="button"
                className="color"
                style={{ background: c }}
                aria-pressed={color === c}
                aria-label={`Color ${i + 1}`}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        </fieldset>

        <button type="submit" className="boton">
          Guardar
        </button>

        {id && (
          <button type="button" className="boton boton-peligro-suave" onClick={() => setPreguntarBorrar(true)}>
            Borrar a esta persona
          </button>
        )}
      </form>

      {preguntarBorrar && (
        <Confirmar
          titulo={`¿Borrar a ${existente?.nombre}?`}
          textoSi="Sí, borrar todo"
          peligroso
          onSi={borrar}
          onNo={() => setPreguntarBorrar(false)}
        >
          <p>
            Se borrarán <strong>todos sus datos</strong>: medicación, citas, informes, fotos… No se puede deshacer.
          </p>
          <p>Si no estás seguro, haz antes una copia de seguridad.</p>
        </Confirmar>
      )}
    </main>
  )
}
