/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// Configuración de Vite: el "taller" que construye la app.
export default defineConfig({
  // Rutas relativas: así la app funciona en cualquier carpeta de cualquier web.
  base: './',
  plugins: [
    react(),
    // PWA: permite instalar la app en el móvil y usarla sin internet.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'icono.svg'],
      manifest: {
        name: 'Mi Salud',
        short_name: 'Mi Salud',
        description: 'Tu historial médico siempre contigo, en tu móvil.',
        lang: 'es',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#eef4fa',
        theme_color: '#2e5c8a',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Guarda en el móvil todo lo necesario para funcionar sin conexión.
        globPatterns: ['**/*.{js,mjs,css,html,svg,png,jpg,jpeg,webp,ico,m4a}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
  // Configuración de los tests (Vitest).
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/preparar.ts'],
    globals: false,
  },
})
