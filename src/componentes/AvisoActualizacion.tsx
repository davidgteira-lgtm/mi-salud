import { useRegisterSW } from 'virtual:pwa-register/react'

/**
 * Activa el modo "sin internet" y avisa cuando la app ya se puede usar sin conexión.
 * Las actualizaciones se instalan solas la próxima vez que se abre la app.
 */
export function AvisoActualizacion() {
  const {
    offlineReady: [listo, setListo],
  } = useRegisterSW()

  if (!listo) return null
  return (
    <div
      role="status"
      className="aviso aviso-ok"
      style={{ position: 'fixed', left: 16, right: 16, bottom: 16, zIndex: 20, maxWidth: 608, margin: '0 auto', boxShadow: 'var(--sombra)' }}
    >
      ✅ Mi Salud ya funciona sin internet.{' '}
      <button className="boton-volver" style={{ minHeight: 0, margin: 0, padding: 0 }} onClick={() => setListo(false)}>
        Vale
      </button>
    </div>
  )
}
