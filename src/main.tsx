// Punto de arranque: aquí empieza la app.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { pedirAlmacenamientoPersistente } from './db/db'

// Cada vez que se abre la app empieza en la primera pantalla («¿Quién eres?»), no en la última que se vio.
// Solo al abrirla: si la página se recarga sola (por una actualización), se queda donde estaba.
try {
  if (!sessionStorage.getItem('mi-salud:abierta')) {
    sessionStorage.setItem('mi-salud:abierta', '1')
    if (location.hash && location.hash !== '#/') history.replaceState(null, '', `${location.pathname}${location.search}#/`)
  }
} catch {
  // Sin almacenamiento de sesión, se respeta la pantalla en la que estaba.
}

// Pide al móvil que no borre los datos de la app aunque le falte espacio.
void pedirAlmacenamientoPersistente()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
