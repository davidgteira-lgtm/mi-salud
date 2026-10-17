// Punto de arranque: aquí empieza la app.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { pedirAlmacenamientoPersistente } from './db/db'

// Pide al móvil que no borre los datos de la app aunque le falte espacio.
void pedirAlmacenamientoPersistente()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
