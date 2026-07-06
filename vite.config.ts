import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages serves a project site from a sub-path
// (https://kglashower.github.io/steampunk-tactics/), so production builds need
// that base. Local dev/preview stays at the root.
// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/steampunk-tactics/' : '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Steampunk Tactics',
        short_name: 'SteamTactics',
        description: 'A steampunk turn-based tactics game of territory, resources, and machines.',
        theme_color: '#1a1714',
        background_color: '#1a1714',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
      devOptions: {
        // Allow testing offline/PWA behavior during `npm run dev`.
        enabled: true,
      },
    }),
  ],
}))
