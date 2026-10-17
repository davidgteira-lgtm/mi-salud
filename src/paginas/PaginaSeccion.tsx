import type { ComponentType } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { FondoSeccion } from '../componentes/Banner'
import { usePerfilActivo } from '../perfilActivo'
import { buscarSeccion } from '../secciones'
import { Alergias } from './Alergias'
import { Analisis } from './Analisis'
import { Citas } from './Citas'
import { Constantes } from './Constantes'
import { Historial } from './Historial'
import { Medicacion } from './Medicacion'
import { Telefonos } from './Telefonos'

/** El contenido de cada sección que ya está hecha. Las demás se ven "en construcción". */
const CONTENIDO: Record<string, ComponentType<{ perfilId: string }>> = {
  alergias: Alergias,
  analisis: Analisis,
  citas: Citas,
  constantes: Constantes,
  historial: Historial,
  medicacion: Medicacion,
  telefonos: Telefonos,
}

export function PaginaSeccion() {
  const { clave } = useParams()
  const ir = useNavigate()
  const { perfil } = usePerfilActivo()
  const seccion = buscarSeccion(clave)
  if (!seccion) return <Navigate to="/inicio" replace />
  if (!perfil) return null

  const Contenido = CONTENIDO[seccion.clave]

  return (
    <main className="pagina">
      <button className="boton-volver" onClick={() => ir('/inicio')}>
        ← Volver al inicio
      </button>
      <div className="banner cabecera-seccion">
        <FondoSeccion seccion={seccion} />
        <span className="banner-texto">
          <strong>{seccion.titulo}</strong>
          <span>{seccion.descripcion}</span>
        </span>
      </div>
      {Contenido ? (
        <Contenido perfilId={perfil.id} />
      ) : (
        <p className="aviso">Esta sección está en construcción. Muy pronto podrás usarla.</p>
      )}
    </main>
  )
}
