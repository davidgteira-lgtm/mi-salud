// El "mapa" de la app: qué pantalla se ve en cada dirección.
import { lazy, Suspense, type ReactNode } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router'
import { AvisoActualizacion } from './componentes/AvisoActualizacion'
import { LectorVoz } from './componentes/LectorVoz'
import { ElegirPerfil } from './paginas/ElegirPerfil'
import { FormularioPerfil } from './paginas/FormularioPerfil'
import { Inicio } from './paginas/Inicio'
import { PaginaSeccion } from './paginas/PaginaSeccion'
import { usePerfilActivo } from './perfilActivo'
import { ProveedorPerfil } from './ProveedorPerfil'

// Las pantallas que se usan menos se cargan al entrar en ellas.
const Ajustes = lazy(async () => ({ default: (await import('./paginas/Ajustes')).Ajustes }))
const Buscar = lazy(async () => ({ default: (await import('./paginas/Buscar')).Buscar }))
const PorRevisar = lazy(async () => ({ default: (await import('./paginas/PorRevisar')).PorRevisar }))
const Resumen = lazy(async () => ({ default: (await import('./paginas/Resumen')).Resumen }))

/** Si nadie ha elegido persona, vuelve a "¿Quién eres?". */
function ConPerfil({ children }: { children: ReactNode }) {
  const { perfil } = usePerfilActivo()
  if (perfil === undefined) return null
  if (perfil === null) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <ProveedorPerfil>
      <HashRouter>
        {/* La barra de leer en voz alta va arriba del todo en todas las pantallas. */}
        <LectorVoz />
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<ElegirPerfil />} />
            <Route path="/persona/nueva" element={<FormularioPerfil />} />
            <Route
              path="/persona/:id"
              element={
                <ConPerfil>
                  <FormularioPerfil />
                </ConPerfil>
              }
            />
            <Route
              path="/inicio"
              element={
                <ConPerfil>
                  <Inicio />
                </ConPerfil>
              }
            />
            <Route
              path="/seccion/:clave"
              element={
                <ConPerfil>
                  <PaginaSeccion />
                </ConPerfil>
              }
            />
            <Route
              path="/revisar"
              element={
                <ConPerfil>
                  <PorRevisar />
                </ConPerfil>
              }
            />
            <Route
              path="/buscar"
              element={
                <ConPerfil>
                  <Buscar />
                </ConPerfil>
              }
            />
            <Route
              path="/resumen"
              element={
                <ConPerfil>
                  <Resumen />
                </ConPerfil>
              }
            />
            <Route path="/ajustes/:apartado?" element={<Ajustes />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </HashRouter>
      <AvisoActualizacion />
    </ProveedorPerfil>
  )
}
