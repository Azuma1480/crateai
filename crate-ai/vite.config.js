import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const base = process.env.GITHUB_ACTIONS ? '/crateai/' : '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'CrateAI',
        short_name: 'CrateAI',
        description: 'DJ track suggestion app for vinyl DJs',
        theme_color: '#7c3aed',
        background_color: '#0f0f0f',
        display: 'standalone',
        orientation: 'portrait',
        scope: base,
        start_url: base,
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.discogs\.com\/.*/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'discogs-api', expiration: { maxEntries: 50, maxAgeSeconds: 3600 } }
          },
          {
            urlPattern: /^https:\/\/accounts\.spotify\.com\/.*/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'spotify-auth', expiration: { maxEntries: 10, maxAgeSeconds: 3600 } }
          }
        ]
      }
    })
  ]
});
