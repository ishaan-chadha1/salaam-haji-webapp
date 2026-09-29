/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'logo.png', 'fonts/*.otf'],
      manifest: {
        name: 'Salaam Haji',
        short_name: 'Salaam Haji',
        description: 'Umrah companion: live Tawaf and Sa\'i counting, family tracking, Quran, duas and more.',
        theme_color: '#064E3B',
        background_color: '#064E3B',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,otf,json}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            // Quran text: cached forever once fetched (Offline Quran pre-fetches all 114 surahs).
            urlPattern: /^https:\/\/api\.alquran\.cloud\/.*/,
            handler: 'CacheFirst',
            options: { cacheName: 'quran-text', expiration: { maxEntries: 300 }, cacheableResponse: { statuses: [0, 200] } },
          },
          {
            urlPattern: /^https:\/\/(api\.aladhan\.com|open\.er-api\.com)\/.*/,
            handler: 'NetworkFirst',
            options: { cacheName: 'daily-data', networkTimeoutSeconds: 6, expiration: { maxEntries: 100, maxAgeSeconds: 7 * 24 * 3600 } },
          },
          {
            urlPattern: /^https:\/\/([abc]\.)?tile\.openstreetmap\.org\/.*|^https:\/\/server\.arcgisonline\.com\/.*/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'map-tiles', expiration: { maxEntries: 800, maxAgeSeconds: 30 * 24 * 3600 } },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
