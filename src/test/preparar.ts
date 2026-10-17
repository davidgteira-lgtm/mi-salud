// Se ejecuta antes de cada test.
// fake-indexeddb: una base de datos "de mentira" en memoria, para probar sin navegador.
import 'fake-indexeddb/auto'
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Después de cada test se vacía la pantalla, para que no se mezclen unos con otros.
afterEach(() => cleanup())
import { Blob as BlobDeNode, File as FileDeNode } from 'node:buffer'

// El "navegador de mentira" (jsdom) tiene su propio tipo de archivo (Blob) que la
// base de datos de pruebas no sabe copiar. Usamos el de Node, que sí se copia bien,
// igual que pasa en un navegador de verdad.
globalThis.Blob = BlobDeNode as unknown as typeof Blob
globalThis.File = FileDeNode as unknown as typeof File

// Para enseñar fotos en pantalla, el navegador crea una dirección "blob:…".
// En los tests no hay pantalla de verdad, así que basta con una dirección inventada.
URL.createObjectURL = () => `blob:prueba/${crypto.randomUUID()}`
URL.revokeObjectURL = () => {}
