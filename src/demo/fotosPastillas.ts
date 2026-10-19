// Ilustraciones de ejemplo de cada medicina (caja + pastilla), dibujadas aquí mismo para las personas de ejemplo.
// No son fotos de medicamentos reales: llevan «Imagen de ejemplo». Si el navegador no sabe dibujar, no hay foto.

export type FormaPastilla = 'redonda' | 'ovalada' | 'alargada'

export interface DibujoPastilla {
  /** Color de la franja de la caja. */
  franja: string
  /** Color de la pastilla. */
  color: string
  forma: FormaPastilla
  /** Raya para partirla. */
  ranura?: boolean
  /** «28 comprimidos», «14 cápsulas»… */
  unidades: string
}

const LADO = 600

function caja(c: OffscreenCanvasRenderingContext2D, nombre: string, d: DibujoPastilla) {
  const [principal, ...resto] = nombre.split(' ')
  c.save()
  c.translate(60, 70)
  c.rotate(-0.06)
  c.shadowColor = 'rgba(40, 50, 60, 0.28)'
  c.shadowBlur = 26
  c.shadowOffsetY = 14
  c.fillStyle = '#ffffff'
  c.beginPath()
  c.roundRect(0, 0, 420, 270, 14)
  c.fill()
  c.shadowColor = 'transparent'
  // Franja de color, como en las cajas de verdad.
  c.fillStyle = d.franja
  c.beginPath()
  c.roundRect(0, 0, 420, 62, [14, 14, 0, 0])
  c.fill()
  c.fillRect(0, 230, 420, 10)
  c.fillStyle = '#ffffff'
  c.font = 'bold 26px system-ui, sans-serif'
  c.fillText('IMAGEN DE EJEMPLO', 24, 42)
  c.fillStyle = '#1b2633'
  c.font = 'bold 50px system-ui, sans-serif'
  c.fillText(principal, 24, 128)
  c.font = '600 34px system-ui, sans-serif'
  c.fillStyle = '#45525f'
  c.fillText(resto.join(' '), 24, 172)
  c.font = '26px system-ui, sans-serif'
  c.fillText(d.unidades, 24, 212)
  c.restore()
}

function pastilla(c: OffscreenCanvasRenderingContext2D, x: number, y: number, giro: number, d: DibujoPastilla) {
  const [an, al] = d.forma === 'redonda' ? [110, 110] : d.forma === 'ovalada' ? [150, 92] : [180, 72]
  c.save()
  c.translate(x, y)
  c.rotate(giro)
  c.shadowColor = 'rgba(30, 40, 50, 0.35)'
  c.shadowBlur = 16
  c.shadowOffsetY = 8
  const brillo = c.createRadialGradient(-an * 0.2, -al * 0.25, 4, 0, 0, an * 0.7)
  brillo.addColorStop(0, '#ffffff')
  brillo.addColorStop(0.35, d.color)
  brillo.addColorStop(1, d.color)
  c.fillStyle = brillo
  c.beginPath()
  if (d.forma === 'alargada') c.roundRect(-an / 2, -al / 2, an, al, al / 2)
  else c.ellipse(0, 0, an / 2, al / 2, 0, 0, Math.PI * 2)
  c.fill()
  c.shadowColor = 'transparent'
  c.strokeStyle = 'rgba(0, 0, 0, 0.12)'
  c.lineWidth = 2
  c.stroke()
  if (d.ranura) {
    c.strokeStyle = 'rgba(0, 0, 0, 0.18)'
    c.lineWidth = 4
    c.beginPath()
    c.moveTo(0, -al / 2 + 10)
    c.lineTo(0, al / 2 - 10)
    c.stroke()
  }
  c.restore()
}

/** La ilustración de una medicina (caja y dos pastillas), en JPEG. */
export async function dibujarMedicina(nombre: string, d: DibujoPastilla): Promise<Blob | undefined> {
  if (typeof OffscreenCanvas === 'undefined') return undefined
  try {
    const lienzo = new OffscreenCanvas(LADO, LADO)
    const c = lienzo.getContext('2d')
    if (!c) return undefined
    const fondo = c.createLinearGradient(0, 0, LADO, LADO)
    fondo.addColorStop(0, '#f4f1ea')
    fondo.addColorStop(1, '#e3ddd1')
    c.fillStyle = fondo
    c.fillRect(0, 0, LADO, LADO)
    caja(c, nombre, d)
    pastilla(c, 400, 450, -0.35, d)
    pastilla(c, 220, 480, 0.5, d)
    return await lienzo.convertToBlob({ type: 'image/jpeg', quality: 0.85 })
  } catch {
    return undefined
  }
}
