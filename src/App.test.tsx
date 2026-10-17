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
    await usuario.type(await screen.findByLabelText('Nombre'), 'Carmen')
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
    await usuario.type(await screen.findByLabelText('Nombre'), 'Carmen')
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

  it('avisa al apuntar un medicamento de la familia de una alergia', async () => {
    const usuario = userEvent.setup()
    render(<App />)

    await usuario.click(await screen.findByRole('button', { name: 'Empezar' }))
    await usuario.type(await screen.findByLabelText('Nombre'), 'Carmen')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    // 1. Apunta la alergia a la penicilina.
    await usuario.click(await screen.findByRole('link', { name: /Alergias e intolerancias/ }))
    await usuario.click(await screen.findByRole('button', { name: /Añadir alergia/ }))
    await usuario.type(screen.getByLabelText(/^Medicamento/), 'Penicilina')
    expect(screen.getByText(/Reconocido/)).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Grave' }))
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(await screen.findByText('Penicilina')).toBeInTheDocument()

    // 2. Al escribir Augmentine en Medicación, avisa antes de guardar.
    await usuario.click(screen.getByRole('button', { name: /Volver al inicio/ }))
    await usuario.click(await screen.findByRole('link', { name: /Medicación/ }))
    await usuario.click(await screen.findByRole('button', { name: /Añadir medicamento/ }))
    await usuario.type(screen.getByLabelText(/^Nombre del medicamento/), 'Augmentine 875')
    expect(screen.getByRole('alert')).toHaveTextContent(/misma familia/)
    expect(screen.getByText(/Antibiótico \(penicilina\)/)).toBeInTheDocument()

    // 3. Al guardar, pide confirmación; si se confirma, queda marcado en rojo.
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))
    await usuario.click(await screen.findByRole('button', { name: /me lo ha mandado el médico/ }))
    expect(await screen.findByText(/Revisa con tu médico/)).toBeInTheDocument()
    // Sale en el aviso de arriba y en su tarjeta.
    expect(screen.getAllByText('Augmentine 875')).toHaveLength(2)
  })
})
