// Al entrar en cualquier pantalla, se empieza a ver por arriba (y no donde se quedó la anterior).
import { useLayoutEffect } from 'react'
import { useLocation } from 'react-router'

export function ArribaAlCambiar() {
  const { pathname } = useLocation()
  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}
