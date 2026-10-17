import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from './db/db'

// En los tests no hay modo "sin internet" real: lo sustituimos por uno vacío.
vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({ offlineReady: [false, () => {}], needRefresh: [false, () => {}] }),
}))

const { default: App } = await import('./App')

beforeEach(async () => {
  await db.delete()
  await db.open()
  localStorage.clear()
  window.location.hash = ''
})

describe('la app', () => {
  it('la primera vez da la bienvenida y deja crear una persona', async () => {
    const usuario = userEvent.setup()
    render(<App />)

    await usuario.click(await screen.findByRole('button', { name: 'Empezar' }))
    await usuario.type(screen.getByLabelText('Nombre'), 'Carmen')
    await usuario.click(screen.getByRole('button', { name: 'Mujer' }))
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByRole('heading', { name: 'Hola, Carmen' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Medicación/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Salud dental/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Ficha de emergencia/ })).toBeInTheDocument()
    expect((await db.perfiles.toArray())[0]).toMatchObject({ nombre: 'Carmen', sexo: 'mujer' })
  })

  it('no guarda una persona sin nombre', async () => {
    const usuario = userEvent.setup()
    render(<App />)

    await usuario.click(await screen.findByRole('button', { name: 'Empezar' }))
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(screen.getByText('Escribe el nombre, por favor.')).toBeInTheDocument()
    expect(await db.perfiles.count()).toBe(0)
  })

  it('guarda un teléfono y el botón Llamar marca ese número', async () => {
    const usuario = userEvent.setup()
    render(<App />)

    await usuario.click(await screen.findByRole('button', { name: 'Empezar' }))
    await usuario.type(screen.getByLabelText('Nombre'), 'Carmen')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))
    await usuario.click(await screen.findByRole('link', { name: /Teléfonos de centros médicos/ }))

    // El 112 está siempre, sin rellenar nada.
    expect(await screen.findByRole('link', { name: /Llamar al 112/ })).toHaveAttribute('href', 'tel:112')

    await usuario.click(screen.getByRole('button', { name: /Añadir teléfono/ }))
    await usuario.click(screen.getByRole('button', { name: /Médico particular/ }))
    await usuario.type(screen.getByLabelText(/^Nombre/), 'Dra. Álvarez')
    await usuario.type(screen.getByLabelText('Teléfono'), '612 34 56 78')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByRole('link', { name: 'Llamar a Dra. Álvarez' })).toHaveAttribute('href', 'tel:612345678')
    expect(screen.getByText('612 345 678')).toBeInTheDocument()
  })
})
