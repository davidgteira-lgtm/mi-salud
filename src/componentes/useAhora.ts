import { useEffect, useState } from 'react'

/** La hora de ahora, que se actualiza sola cada medio minuto (para pasar a la siguiente toma). */
export function useAhora(): Date {
  const [ahora, setAhora] = useState(() => new Date())
  useEffect(() => {
    const reloj = setInterval(() => setAhora(new Date()), 30_000)
    return () => clearInterval(reloj)
  }, [])
  return ahora
}
