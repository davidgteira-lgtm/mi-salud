// Resumen para el médico: una página con lo importante, para enseñar en la consulta,
// guardar en PDF o imprimir (con la opción «Imprimir» del móvil, que permite «Guardar como PDF»).
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router'
import { MOMENTOS } from '../db/medicamentos'
import { crearResumen } from '../db/resumen'
import { usePerfilActivo } from '../perfilActivo'
import { fechaLarga } from '../utils/fechas'
import { telefonoParaLeer } from '../utils/telefono'

const fecha = (f: string) => fechaLarga(f)
const numero = (n: number) => String(n).replace('.', ',')

export function Resumen() {
  const { perfil } = usePerfilActivo()
  const ir = useNavigate()
  const r = useLiveQuery(() => (perfil ? crearResumen(perfil) : undefined), [perfil])
  if (!perfil || !r) return null
  const f = r.ficha

  const bloque = (titulo: string, vacio: boolean, contenido: React.ReactNode, siVacio = 'Nada apuntado.') => (
    <section className="resumen-bloque">
      <h2>{titulo}</h2>
      {vacio ? <p className="emergencia-vacio">{siVacio}</p> : contenido}
    </section>
  )

  return (
    <main className="pagina pila">
      <button className="boton-volver" onClick={() => ir('/inicio')} style={{ alignSelf: 'flex-start' }}>
        ← Volver al inicio
      </button>

      <div className="aviso pila no-imprimir" style={{ gap: 10 }}>
        <span>
          Enséñaselo al médico o guárdalo en PDF: pulsa el botón y, en el móvil, elige <strong>«Guardar como PDF»</strong>.
        </span>
        <button className="boton" onClick={() => window.print()}>
          📄 Guardar en PDF o imprimir
        </button>
      </div>

      <article className="resumen" aria-label="Resumen de salud">
        <header className="resumen-cabecera">
          <h1>Resumen de salud</h1>
          <p>
            <strong>{f.nombre}</strong>
            {[
              f.edad !== undefined && `${f.edad} años`,
              f.sexo === 'mujer' ? 'mujer' : f.sexo === 'hombre' ? 'hombre' : '',
              f.grupoSanguineo && `grupo ${f.grupoSanguineo}`,
            ]
              .filter(Boolean)
              .map((x) => ` · ${x}`)}
          </p>
          {(f.tarjetaSanitaria || f.seguro) && (
            <p className="texto-suave">
              {[f.tarjetaSanitaria && `Tarjeta sanitaria: ${f.tarjetaSanitaria}`, f.seguro && `Seguro: ${f.seguro}`]
                .filter(Boolean)
                .join(' · ')}
            </p>
          )}
          <p className="texto-suave">A {fecha(r.hoy)}. Datos apuntados por el paciente en la app Mi Salud.</p>
        </header>

        {bloque(
          '⚠️ Alergias e intolerancias',
          f.alergias.length === 0,
          <ul>
            {f.alergias.map((a) => (
              <li key={a.id}>
                <strong>{a.nombre}</strong> ({a.clase}
                {a.gravedad !== 'desconocida' && `, ${a.gravedad}`}){a.reaccion && `: ${a.reaccion}`}
              </li>
            ))}
          </ul>,
          'Sin alergias conocidas apuntadas.',
        )}

        {bloque(
          '💊 Medicación actual',
          f.medicamentos.length === 0,
          <ul>
            {f.medicamentos.map((m) => (
              <li key={m.id}>
                <strong>{m.nombre}</strong>
                {m.dosis && ` · ${m.dosis}`}
                {(m.momentos.length > 0 || m.otroHorario) &&
                  ` · ${[...m.momentos.map((x) => MOMENTOS.find((y) => y.valor === x)?.texto.toLowerCase()), m.otroHorario].filter(Boolean).join(', ')}`}
                {m.paraQue && ` (${m.paraQue})`}
                {m.fechaInicio && <span className="texto-suave"> · desde {fecha(m.fechaInicio)}</span>}
              </li>
            ))}
          </ul>,
        )}

        {r.dejados.length > 0 &&
          bloque(
            '⏹️ Medicación que dejó en el último año',
            false,
            <ul>
              {r.dejados.map((m) => (
                <li key={m.id}>
                  {m.nombre}
                  {m.dosis && ` · ${m.dosis}`} · hasta {fecha(m.fechaFin!)}
                </li>
              ))}
            </ul>,
          )}

        {bloque(
          '🩺 Enfermedades crónicas',
          f.enfermedades.length === 0,
          <ul>
            {f.enfermedades.map((e) => (
              <li key={e.id}>
                {e.titulo} <span className="texto-suave">(desde {fecha(e.fecha)})</span>
              </li>
            ))}
          </ul>,
        )}

        {f.avisos && bloque('❗ Importante', false, <p style={{ margin: 0, whiteSpace: 'pre-line' }}>{f.avisos}</p>)}

        {bloque(
          '❤️ Últimas constantes',
          r.constantes.length === 0,
          <ul>
            {r.constantes.map((c) => (
              <li key={c.nombre}>
                {c.nombre}: <strong>{c.valor}</strong> <span className="texto-suave">({fecha(c.fecha)})</span>
              </li>
            ))}
          </ul>,
        )}

        {bloque(
          '🧪 Último análisis',
          !r.analisis,
          r.analisis && (
            <>
              <p style={{ margin: '0 0 6px' }}>
                {fecha(r.analisis.fecha)}
                {r.analisis.centro && ` · ${r.analisis.centro}`} · {r.analisis.total} resultados,{' '}
                {r.analisis.fuera.length === 0 ? 'todos dentro de lo normal.' : `${r.analisis.fuera.length} fuera de lo normal:`}
              </p>
              {r.analisis.fuera.length > 0 && (
                <ul>
                  {r.analisis.fuera.map((x, i) => (
                    <li key={i}>
                      {x.nombre}:{' '}
                      <strong>
                        {x.comparador ?? ''}
                        {numero(x.valor)}
                      </strong>{' '}
                      {x.unidad} ({x.estado === 'alto' ? '▲ alto' : '▼ bajo'}
                      {textoReferencia(x.refMin, x.refMax)})
                    </li>
                  ))}
                </ul>
              )}
            </>
          ),
        )}

        {bloque(
          '🏥 Operaciones',
          r.operaciones.length === 0,
          <ul>
            {r.operaciones.map((h) => (
              <li key={h.id}>
                {h.titulo} <span className="texto-suave">({fecha(h.fecha)})</span>
              </li>
            ))}
          </ul>,
        )}

        {r.recientes.length > 0 &&
          bloque(
            '📁 Último año: ingresos, urgencias, pruebas e informes',
            false,
            <ul>
              {r.recientes.map((h) => (
                <li key={h.id}>
                  {h.titulo}
                  {h.especialidad && ` · ${h.especialidad}`} <span className="texto-suave">({fecha(h.fecha)})</span>
                </li>
              ))}
            </ul>,
          )}

        {bloque(
          '💉 Vacunas',
          r.vacunas.length === 0,
          <ul>
            {r.vacunas.map((v) => (
              <li key={v.id}>
                {v.nombre} <span className="texto-suave">(última: {fecha(v.fecha)})</span>
              </li>
            ))}
          </ul>,
        )}

        {f.contactos.length > 0 &&
          bloque(
            '👪 Contacto',
            false,
            <ul>
              {f.contactos.map((c, i) => (
                <li key={i}>
                  {c.nombre}
                  {c.relacion && ` (${c.relacion})`}: {telefonoParaLeer(c.telefono)}
                </li>
              ))}
            </ul>,
          )}
      </article>
    </main>
  )
}

/** "; ref. 74–100", "; ref. < 200", "; ref. > 40" */
function textoReferencia(min?: number, max?: number): string {
  if (min !== undefined && max !== undefined) return `; ref. ${numero(min)}–${numero(max)}`
  if (max !== undefined) return `; ref. < ${numero(max)}`
  if (min !== undefined) return `; ref. > ${numero(min)}`
  return ''
}
