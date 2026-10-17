// Se ejecuta antes de cada test.
// fake-indexeddb: una base de datos "de mentira" en memoria, para probar sin navegador.
import 'fake-indexeddb/auto'
import '@testing-library/jest-dom/vitest'
import { Blob as BlobDeNode } from 'node:buffer'

// El "navegador de mentira" (jsdom) tiene su propio tipo de archivo (Blob) que la
// base de datos de pruebas no sabe copiar. Usamos el de Node, que sí se copia bien,
// igual que pasa en un navegador de verdad.
globalThis.Blob = BlobDeNode as unknown as typeof Blob
