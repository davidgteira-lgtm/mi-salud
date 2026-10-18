// Mis datos sanitarios: grupo sanguíneo, tarjeta sanitaria, seguro, médico y a quién avisar.
import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { guardarDatos, leerDatos, revisarDatos } from '../db/datosSanitarios'
import { GRUPOS_SANGUINEOS, type ContactoEmergencia, type DatosSanitarios, type GrupoSanguineo } from '../db/tipos'
import { enlaceLlamada, telefonoParaLeer } from '../utils/telefono'

export function MisDatos({ perfilId }: { perfilId: string }) {
  const [editando, setEditando] = useState(false)
  // null = aún no hay ficha.
  const datos = useLiveQuery(async () => (await leerDatos(perfilId)) ?? null, [perfilId])
  if (datos === undefined) return null
  if (editando || datos === null) {
    return (
      <FormularioDatos
        perfilId={perfilId}
        datos={datos ?? undefined}
        onTerminar={() => setEditando(false)}
        primeraVez={datos === null && !editando}
      />
    )
  }

  const fila = (etiqueta: string, valor?: string) =>
    valor ? (
      <div className="dato">
        <span className="texto-suave">{etiqueta}</span>
        <strong>{valor}</strong>
      </div>
    ) : null

  return (
    <div className="pila">
      <section className="tarjeta pila" aria-label="Mis datos" style={{ gap: 10 }}>
        {fila('Grupo sanguíneo', datos.grupoSanguineo ?? 'No lo sé')}
        {fila('Tarjeta sanitaria', datos.tarjetaSanitaria)}
        {fila('Seguro médico', [datos.seguroCompania, datos.seguroPoliza && `póliza ${datos.seguroPoliza}`].filter(Boolean).join(', '))}
        {fila('Centro de salud', datos.centroSalud)}
        {fila('Médico de cabecera', datos.medicoCabecera)}
        {datos.donante && fila('Donación de órganos', 'Soy donante')}
        {fila('Importante en urgencias', datos.avisos)}
        {datos.seguroTelefono && (
          <a className="boton boton-secundario" href={enlaceLlamada(datos.seguroTelefono)}>
            📞 Llamar al seguro ({telefonoParaLeer(datos.seguroTelefono)})
          </a>
        )}
      </section>

      <section className="tarjeta pila" aria-label="A quién avisar" style={{ gap: 10 }}>
        <h2 style={{ margin: 0 }}>👪 A quién avisar</h2>
        {datos.contactos.length === 0 ? (
          <p className="texto-suave" style={{ margin: 0 }}>
            No has puesto a nadie. Es muy útil en urgencias.
          </p>
        ) : (
          datos.contactos.map((c, i) => (
            <div key={i} className="contacto-familia">
              <span>
                <strong>{c.nombre}</strong>
                {c.relacion && <span className="texto-suave"> · {c.relacion}</span>}
                <br />
                {telefonoParaLeer(c.telefono)}
              </span>
              <a className="boton" href={enlaceLlamada(c.telefono)} aria-label={`Llamar a ${c.nombre}`}>
                📞 Llamar
              </a>
            </div>
          ))
        )}
      </section>

      <button className="boton" onClick={() => setEditando(true)}>
        ✏️ Cambiar mis datos
      </button>
      <Link to="/seccion/emergencia" className="boton boton-secundario" style={{ textAlign: 'center' }}>
        🚑 Ver mi ficha de emergencia
      </Link>
    </div>
  )
}

function FormularioDatos(props: { perfilId: string; datos?: DatosSanitarios; primeraVez: boolean; onTerminar: () => void }) {
  const d = props.datos
  const [grupo, setGrupo] = useState<GrupoSanguineo | ''>(d?.grupoSanguineo ?? '')
  const [tarjeta, setTarjeta] = useState(d?.tarjetaSanitaria ?? '')
  const [compania, setCompania] = useState(d?.seguroCompania ?? '')
  const [poliza, setPoliza] = useState(d?.seguroPoliza ?? '')
  const [telSeguro, setTelSeguro] = useState(d?.seguroTelefono ?? '')
  const [centro, setCentro] = useState(d?.centroSalud ?? '')
  const [medico, setMedico] = useState(d?.medicoCabecera ?? '')
  const [donante, setDonante] = useState(!!d?.donante)
  const [avisos, setAvisos] = useState(d?.avisos ?? '')
  const [contactos, setContactos] = useState<ContactoEmergencia[]>(d?.contactos ?? [])
  const [error, setError] = useState('')

  const cambiarContacto = (i: number, cambio: Partial<ContactoEmergencia>) =>
    setContactos((l) => l.map((c, j) => (j === i ? { ...c, ...cambio } : c)))

  async function guardar(e: FormEvent) {
    e.preventDefault()
    const datos = {
      grupoSanguineo: grupo || undefined,
      tarjetaSanitaria: tarjeta,
      seguroCompania: compania,
      seguroPoliza: poliza,
      seguroTelefono: telSeguro,
      centroSalud: centro,
      medicoCabecera: medico,
      donante,
      avisos,
      // Las filas que se han dejado vacías no cuentan.
      contactos: contactos.filter((c) => c.nombre.trim() || c.telefono.trim()),
    }
    const problema = revisarDatos(datos)
    if (problema) return setError(problema)
    await guardarDatos(props.perfilId, datos)
    props.onTerminar()
  }

  return (
    <form className="pila" onSubmit={guardar} noValidate>
      <h2>{props.primeraVez ? 'Apunta tus datos' : 'Cambiar mis datos'}</h2>
      <p className="texto-suave" style={{ margin: 0 }}>
        Rellena lo que sepas. Todo se queda solo en este móvil.
      </p>

      <fieldset className="campo" style={{ border: 0, padding: 0, margin: 0 }}>
        <span>Grupo sanguíneo</span>
        <small>Viene en algunos análisis y en la tarjeta de donante de sangre.</small>
        <div className="opciones opciones-grupo">
          {GRUPOS_SANGUINEOS.map((g) => (
            <button key={g} type="button" className="opcion" aria-pressed={grupo === g} onClick={() => setGrupo(grupo === g ? '' : g)}>
              {g}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="campo">
        <span>Número de la tarjeta sanitaria</span>
        <input type="text" value={tarjeta} onChange={(e) => setTarjeta(e.target.value)} autoComplete="off" />
      </label>

      <h3 style={{ marginBottom: 0 }}>Seguro médico (si tienes)</h3>
      <label className="campo">
        <span>Compañía</span>
        <input type="text" value={compania} onChange={(e) => setCompania(e.target.value)} />
      </label>
      <label className="campo">
        <span>Número de póliza o de tarjeta</span>
        <input type="text" value={poliza} onChange={(e) => setPoliza(e.target.value)} autoComplete="off" />
      </label>
      <label className="campo">
        <span>Teléfono del seguro</span>
        <input type="tel" value={telSeguro} onChange={(e) => setTelSeguro(e.target.value)} />
      </label>

      <label className="campo">
        <span>Centro de salud</span>
        <input type="text" value={centro} onChange={(e) => setCentro(e.target.value)} />
      </label>
      <label className="campo">
        <span>Médico de cabecera</span>
        <input type="text" value={medico} onChange={(e) => setMedico(e.target.value)} />
      </label>

      <label className="campo">
        <span>Importante en urgencias</span>
        <small>Por ejemplo: llevo marcapasos, uso audífono, tomo anticoagulantes, vivo solo…</small>
        <textarea rows={3} value={avisos} onChange={(e) => setAvisos(e.target.value)} />
      </label>

      <label className="casilla">
        <input type="checkbox" checked={donante} onChange={(e) => setDonante(e.target.checked)} />
        <span>Soy donante de órganos</span>
      </label>

      <h3 style={{ marginBottom: 0 }}>👪 A quién avisar</h3>
      {contactos.map((c, i) => (
        <fieldset key={i} className="tarjeta pila" style={{ gap: 8 }} aria-label={`Contacto ${i + 1}`}>
          <label className="campo">
            <span>Nombre</span>
            <input type="text" value={c.nombre} onChange={(e) => cambiarContacto(i, { nombre: e.target.value })} />
          </label>
          <label className="campo">
            <span>Quién es (si quieres)</span>
            <input
              type="text"
              value={c.relacion ?? ''}
              onChange={(e) => cambiarContacto(i, { relacion: e.target.value })}
              placeholder="Hija, vecino…"
            />
          </label>
          <label className="campo">
            <span>Teléfono</span>
            <input type="tel" value={c.telefono} onChange={(e) => cambiarContacto(i, { telefono: e.target.value })} />
          </label>
          <button type="button" className="enlace" onClick={() => setContactos((l) => l.filter((_, j) => j !== i))}>
            Quitar este contacto
          </button>
        </fieldset>
      ))}
      <button type="button" className="boton boton-secundario" onClick={() => setContactos((l) => [...l, { nombre: '', telefono: '' }])}>
        ➕ Añadir a alguien
      </button>

      {error && (
        <p className="aviso aviso-error" role="alert">
          {error}
        </p>
      )}

      <button type="submit" className="boton">
        Guardar
      </button>
      {!props.primeraVez && (
        <button type="button" className="boton boton-secundario" onClick={props.onTerminar}>
          Cancelar
        </button>
      )}
    </form>
  )
}
