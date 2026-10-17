import { describe, expect, it } from 'vitest'
import { medidasReducidas } from './imagen'

describe('medidasReducidas', () => {
  it('no agranda fotos pequeñas', () => {
    expect(medidasReducidas(300, 200, 600)).toEqual({ ancho: 300, alto: 200 })
  })

  it('reduce manteniendo la forma (horizontal y vertical)', () => {
    expect(medidasReducidas(4000, 3000, 600)).toEqual({ ancho: 600, alto: 450 })
    expect(medidasReducidas(3000, 4000, 600)).toEqual({ ancho: 450, alto: 600 })
  })
})
