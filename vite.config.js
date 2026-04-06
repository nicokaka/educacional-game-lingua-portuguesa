import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: {
        name: 'Alquimia Verbal',
        short_name: 'Alquimia Verbal',
        description: 'Jogo educacional de gramática portuguesa — derrote os monstros respondendo desafios!',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        // Cache das imagens de monstros e professor (assets estáticos grandes)
        runtimeCaching: [
          {
            urlPattern: /\/monstro\d+\.png$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'monster-images',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: /\/prof-.+\.png$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'professor-images',
              expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ],
  assetsInclude: ['**/*.jsonc'],
})
