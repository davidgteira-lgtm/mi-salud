import { AtajoDocumento } from '../componentes/AtajoDocumento'
import { lazy, Suspense, type ComponentType } from 'react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router'
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
const Ojos = cargar(() => import('./Ojos'), 'Ojos')
const Bajas = cargar(() => import('./Bajas'), 'Bajas')

/** El contenido de cada sección que ya está hecha. Las demás se ven "en construcción". */
/** Secciones con el atajo de arriba para crear un registro con un informe, una foto o la voz. */
const CON_ATAJO = ['medicacion', 'citas', 'historial', 'bajas', 'analisis', 'revisiones', 'dental', 'ojos', 'alergias']

const CONTENIDO: Record<string, Contenido> = {
  alergias: Alergias,
  analisis: Analisis,
  bajas: Bajas,
  citas: Citas,
  constantes: Constantes,
  dental: Dental,
  datos: MisDatos,
  emergencia: Emergencia,
  historial: Historial,
  medicacion: Medicacion,
  ojos: Ojos,
  revisiones: Revisiones,
  telefonos: Telefonos,
}

export function PaginaSeccion() {
  const { clave } = useParams()
  // Al llegar con ?nuevo=1 desde el atajo, la sección se vuelve a montar para abrir el formulario.
  const { search } = useLocation()
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
          {CON_ATAJO.includes(seccion.clave) && <AtajoDocumento perfilId={perfil.id} seccion={seccion.clave} />}
          <Contenido key={search} perfilId={perfil.id} />
        </Suspense>
      ) : (
        <p className="aviso">Esta sección está en construcción. Muy pronto podrás usarla.</p>
      )}
    </main>
  )
}
