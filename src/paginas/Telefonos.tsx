import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type FormEvent } from 'react'
import { Confirmar } from '../componentes/Confirmar'
import { borrarContacto, guardarContacto, listarContactos, revisarContacto, TIPOS_CONTACTO } from '../db/telefonos'
import type { Contacto, TipoContacto } from '../db/tipos'
import { enlaceLlamada, telefonoParaLeer } from '../utils/telefono'

/** Teléfonos de centros médicos: pulsar "Llamar" abre la llamada en el móvil. */
export function Telefonos({ perfilId }: { perfilId: string }) {
  const contactos = useLiveQuery(() => listarContactos(perfilId), [perfilId])
  // null = formulario de uno nuevo; un contacto = cambiar ese; undefined = sin formulario.
  const [editando, setEditando] = useState<Contacto | null>()

  if (editando !== undefined) {
    return <FormularioContacto perfilId={perfilId} contacto={editando ?? undefined} onTerminar={() => setEditando(undefined)} />
  }

  return (
    <div className="pila">
      <div className="contacto contacto-emergencia">
        <div className="contacto-datos">
          <span className="contacto-tipo">🚨 Emergencias</span>
          <strong>112</strong>
          <span>Para cualquier urgencia grave, las 24 horas.</span>
        </div>
        <a className="boton boton-peligro" href={enlaceLlamada('112')}>
          📞 Llamar al 112
        </a>
      </div>

      {contactos?.length === 0 && (
        <p className="aviso">
          Aún no has guardado ningún teléfono. Pulsa <strong>«Añadir teléfono»</strong> para guardar el de tu centro de
          salud, tu médico o tu hospital.
        </p>
      )}

      {contactos?.map((c) => (
        <TarjetaContacto key={c.id} contacto={c} onCambiar={() => setEditando(c)} />
      ))}

      <button className="boton boton-secundario" onClick={() => setEditando(null)}>
        ➕ Añadir teléfono
      </button>
    </div>
  )
}

function TarjetaContacto({ contacto, onCambiar }: { contacto: Contacto; onCambiar: () => void }) {
  const tipo = TIPOS_CONTACTO.find((t) => t.valor === contacto.tipo)
  return (
    <div className="contacto">
      <div className="contacto-datos">
        <span className="contacto-tipo">
          {tipo?.icono} {tipo?.texto}
        </span>
        <strong>{contacto.nombre}</strong>
        <span className="contacto-numero">{telefonoParaLeer(contacto.telefono)}</span>
        {contacto.direccion && <span>{contacto.direccion}</span>}
      </div>
      <a className="boton boton-llamar" href={enlaceLlamada(contacto.telefono)} aria-label={`Llamar a ${contacto.nombre}`}>
        📞 Llamar
      </a>
      <button className="enlace" onClick={onCambiar}>
        Cambiar o borrar
      </button>
    </div>
  )
}

function FormularioContacto(props: { perfilId: string; contacto?: Contacto; onTerminar: () => void }) {
  const { contacto } = props
  const [tipo, setTipo] = useState<TipoContacto>(contacto?.tipo ?? 'centro-salud')
  const [nombre, setNombre] = useState(contacto?.nombre ?? '')
  const [telefono, setTelefono] = useState(contacto?.telefono ?? '')
  const [direccion, setDireccion] = useState(contacto?.direccion ?? '')
  const [error, setError] = useState('')
  const [preguntarBorrar, setPreguntarBorrar] = useState(false)

  async function guardar(e: FormEvent) {
    e.preventDefault()
    const datos = { tipo, nombre, telefono, direccion }
    const problema = revisarContacto(datos)
    if (problema) {
      setError(problema)
      return
    }
    await guardarContacto(props.perfilId, datos, contacto?.id)
    props.onTerminar()
  }

  async function borrar() {
    if (contacto) await borrarContacto(contacto.id)
    props.onTerminar()
  }

  return (
    <form className="pila" onSubmit={guardar} noValidate>
      <h2>{contacto ? 'Cambiar teléfono' : 'Nuevo teléfono'}</h2>

      <fieldset className="campo" style={{ border: 0, padding: 0, margin: 0 }}>
        <span>¿Qué es?</span>
        <div className="opciones">
          {TIPOS_CONTACTO.map((t) => (
            <button key={t.valor} type="button" className="opcion" aria-pressed={tipo === t.valor} onClick={() => setTipo(t.valor)}>
              {t.icono} {t.texto}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="campo">
        <span>Nombre</span>
        <small>Por ejemplo: «Centro de salud Las Águilas» o «Dra. Álvarez, cardióloga».</small>
        <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} />
      </label>

      <label className="campo">
        <span>Teléfono</span>
        <input type="tel" inputMode="tel" autoComplete="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
      </label>

      <label className="campo">
        <span>Dirección (si quieres)</span>
        <input type="text" value={direccion} onChange={(e) => setDireccion(e.target.value)} />
      </label>

      {error && <p className="aviso aviso-error">{error}</p>}

      <button type="submit" className="boton">
        Guardar
      </button>
      <button type="button" className="boton boton-secundario" onClick={props.onTerminar}>
        Cancelar
      </button>
      {contacto && (
        <button type="button" className="boton boton-peligro-suave" onClick={() => setPreguntarBorrar(true)}>
          Borrar este teléfono
        </button>
      )}

      {preguntarBorrar && (
        <Confirmar
          titulo={`¿Borrar el teléfono de ${contacto?.nombre}?`}
          textoSi="Sí, borrar"
          peligroso
          onSi={borrar}
          onNo={() => setPreguntarBorrar(false)}
        />
      )}
    </form>
  )
}
