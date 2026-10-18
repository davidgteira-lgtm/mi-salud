// Ficha de emergencia: lo que necesitan saber en urgencias, grande y claro.
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router'
import { db } from '../db/db'
import { fichaEmergencia } from '../db/datosSanitarios'
import { enlaceLlamada, telefonoParaLeer } from '../utils/telefono'

const SEXO = { mujer: 'mujer', hombre: 'hombre', otro: '' } as const

export function Emergencia({ perfilId }: { perfilId: string }) {
  const ficha = useLiveQuery(async () => {
    const perfil = await db.perfiles.get(perfilId)
    return perfil ? fichaEmergencia(perfil) : null
  }, [perfilId])
  if (!ficha) return null

  const vacio = (texto: string) => (
    <p className="emergencia-vacio" style={{ margin: 0 }}>
      {texto}
    </p>
  )
  const faltanDatos = !ficha.grupoSanguineo && ficha.contactos.length === 0

  return (
    <div className="pila">
      <a className="boton boton-peligro no-imprimir" href={enlaceLlamada('112')}>
        📞 Llamar al 112
      </a>

      <article className="emergencia" aria-label="Ficha de emergencia">
        <header className="emergencia-cabecera">
          <div>
            <h2>{ficha.nombre}</h2>
            <small>{[ficha.edad !== undefined && `${ficha.edad} años`, ficha.sexo && SEXO[ficha.sexo]].filter(Boolean).join(' · ')}</small>
          </div>
          <div className="emergencia-grupo" aria-label={`Grupo sanguíneo: ${ficha.grupoSanguineo ?? 'no se sabe'}`}>
            <small>Grupo</small>
            {ficha.grupoSanguineo ?? '¿?'}
          </div>
        </header>

        <section className="emergencia-bloque emergencia-alergias">
          <h3>⚠️ Alergias</h3>
          {ficha.alergias.length === 0 ? (
            vacio('No tiene alergias apuntadas.')
          ) : (
            <ul>
              {ficha.alergias.map((a) => (
                <li key={a.id}>
                  <strong>{a.nombre}</strong>
                  {a.clase === 'intolerancia' && ' (intolerancia)'}
                  {a.gravedad === 'grave' && <strong> · GRAVE</strong>}
                  {a.reaccion && ` · ${a.reaccion}`}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="emergencia-bloque">
          <h3>💊 Medicación que toma</h3>
          {ficha.medicamentos.length === 0 ? (
            vacio('No tiene medicación apuntada.')
          ) : (
            <ul>
              {ficha.medicamentos.map((m) => (
                <li key={m.id}>
                  <strong>{m.nombre}</strong>
                  {m.dosis && ` · ${m.dosis}`}
                  {m.paraQue && ` (${m.paraQue})`}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="emergencia-bloque">
          <h3>🩺 Enfermedades</h3>
          {ficha.enfermedades.length === 0 ? (
            vacio('No tiene enfermedades crónicas apuntadas.')
          ) : (
            <ul>
              {ficha.enfermedades.map((e) => (
                <li key={e.id}>{e.titulo}</li>
              ))}
            </ul>
          )}
        </section>

        {(ficha.avisos || ficha.donante) && (
          <section className="emergencia-bloque">
            <h3>❗ Importante</h3>
            <ul>
              {ficha.avisos && <li style={{ whiteSpace: 'pre-line' }}>{ficha.avisos}</li>}
              {ficha.donante && <li>Es donante de órganos</li>}
            </ul>
          </section>
        )}

        <section className="emergencia-bloque">
          <h3>👪 Avisar a</h3>
          {ficha.contactos.length === 0
            ? vacio('No hay nadie apuntado.')
            : ficha.contactos.map((c, i) => (
                <div key={i} className="contacto-familia" style={{ marginTop: i ? 10 : 0 }}>
                  <span style={{ fontSize: '1.15rem' }}>
                    <strong>{c.nombre}</strong>
                    {c.relacion && ` (${c.relacion})`}
                    <br />
                    {telefonoParaLeer(c.telefono)}
                  </span>
                  <a className="boton no-imprimir" href={enlaceLlamada(c.telefono)} aria-label={`Llamar a ${c.nombre}`}>
                    📞 Llamar
                  </a>
                </div>
              ))}
        </section>

        {(ficha.tarjetaSanitaria || ficha.seguro || ficha.centroSalud || ficha.medicoCabecera) && (
          <section className="emergencia-bloque">
            <h3>🏥 Datos sanitarios</h3>
            <ul>
              {ficha.tarjetaSanitaria && <li>Tarjeta sanitaria: {ficha.tarjetaSanitaria}</li>}
              {ficha.seguro && <li>Seguro: {ficha.seguro}</li>}
              {ficha.centroSalud && <li>Centro de salud: {ficha.centroSalud}</li>}
              {ficha.medicoCabecera && <li>Médico: {ficha.medicoCabecera}</li>}
            </ul>
          </section>
        )}
      </article>

      {faltanDatos && <p className="aviso no-imprimir">Falta tu grupo sanguíneo y a quién avisar. Ponlos en «Mis datos sanitarios».</p>}
      <Link to="/seccion/datos" className="boton boton-secundario no-imprimir" style={{ textAlign: 'center' }}>
        ✏️ Cambiar mis datos
      </Link>
      <button className="boton boton-secundario no-imprimir" onClick={() => window.print()}>
        🖨️ Imprimir para llevarla en la cartera
      </button>
      <p className="texto-suave no-imprimir" style={{ fontSize: '0.85rem' }}>
        Las alergias, la medicación y las enfermedades salen de lo que tienes apuntado en sus secciones.
      </p>
    </div>
  )
}
