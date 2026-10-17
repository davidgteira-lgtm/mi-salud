// El "mapa" de la app: qué pantalla se ve en cada dirección.
import type { ReactNode } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router'
import { AvisoActualizacion } from './componentes/AvisoActualizacion'
import { Ajustes } from './paginas/Ajustes'
import { ElegirPerfil } from './paginas/ElegirPerfil'
import { FormularioPerfil } from './paginas/FormularioPerfil'
import { Inicio } from './paginas/Inicio'
import { PaginaSeccion } from './paginas/PaginaSeccion'
import { usePerfilActivo } from './perfilActivo'
import { ProveedorPerfil } from './ProveedorPerfil'

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
        <Routes>
          <Route path="/" element={<ElegirPerfil />} />
          <Route path="/persona/nueva" element={<FormularioPerfil />} />
          <Route path="/persona/:id" element={<ConPerfil><FormularioPerfil /></ConPerfil>} />
          <Route path="/inicio" element={<ConPerfil><Inicio /></ConPerfil>} />
          <Route path="/seccion/:clave" element={<ConPerfil><PaginaSeccion /></ConPerfil>} />
          <Route path="/ajustes/:apartado?" element={<Ajustes />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
      <AvisoActualizacion />
    </ProveedorPerfil>
  )
}
