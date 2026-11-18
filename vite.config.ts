import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';

// BASE_PATH is set by the GitHub Pages workflow to "/<repo>/".
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base,
  define: {
    __BUILD_ID__: JSON.stringify((process.env.GITHUB_SHA ?? 'dev').slice(0, 7)),
  },
  // alphaTab (file import) is ~1.3 MB, loaded only when the user imports a Guitar Pro / MusicXML file.
  build: { chunkSizeWarningLimit: 1500 },
  plugins: [
    preact(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png'],
      // Not precached: alphaTab is fetched (then cached) the first time a file is imported.
      workbox: {
        globIgnores: ['**/alphaTab*'],
        runtimeCaching: [{ urlPattern: /alphaTab/, handler: 'CacheFirst', options: { cacheName: 'alphatab' } }],
      },
      manifest: {
        name: 'GuitarThrow',
        short_name: 'GuitarThrow',
        description: 'Guia de prática de violão',
        lang: 'pt-BR',
        display: 'standalone',
        orientation: 'landscape',
        background_color: '#111318',
        theme_color: '#111318',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
    }),
  ],
  test: { environment: 'node' },
});
