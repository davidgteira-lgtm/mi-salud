import { lazy, Suspense, type ComponentType } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { FondoSeccion } from '../componentes/Banner'
import { usePerfilActivo } from '../perfilActivo'
import { buscarSeccion } from '../secciones'
// Cada sección se carga cuando se entra en ella (así la app arranca antes).
// Sin internet también funciona: todas quedan guardadas en el móvil al instalar la app.
type Contenido = ComponentType<{ perfilId: string }>
const cargar = <K extends string>(importar: () => Promise<Record<K, Contenido>>, nombre: K) =>
  lazy(async () => ({ default: (await importar())[nombre] }))

const Alergias = cargar(() => import('./Alergias'), 'Alergias')
const Analisis = cargar(() => import('./Analisis'), 'Analisis')
const Citas = cargar(() => import('./Citas'), 'Citas')
const Constantes = cargar(() => import('./Constantes'), 'Constantes')
const Dental = cargar(() => import('./Dental'), 'Dental')
const Emergencia = cargar(() => import('./Emergencia'), 'Emergencia')
const Historial = cargar(() => import('./Historial'), 'Historial')
const Medicacion = cargar(() => import('./Medicacion'), 'Medicacion')
const MisDatos = cargar(() => import('./MisDatos'), 'MisDatos')
const Revisiones = cargar(() => import('./Revisiones'), 'Revisiones')
const Telefonos = cargar(() => import('./Telefonos'), 'Telefonos')

/** El contenido de cada sección que ya está hecha. Las demás se ven "en construcción". */
const CONTENIDO: Record<string, Contenido> = {
  alergias: Alergias,
  analisis: Analisis,
  citas: Citas,
  constantes: Constantes,
  dental: Dental,
  datos: MisDatos,
  emergencia: Emergencia,
  historial: Historial,
  medicacion: Medicacion,
  revisiones: Revisiones,
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
        <Suspense fallback={<p className="texto-suave">Cargando…</p>}>
          <Contenido perfilId={perfil.id} />
        </Suspense>
      ) : (
        <p className="aviso">Esta sección está en construcción. Muy pronto podrás usarla.</p>
      )}
    </main>
  )
}
