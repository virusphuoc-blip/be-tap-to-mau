import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'], maximumFileSizeToCacheInBytes: 4_000_000 },
      manifest: {
        name: 'Bé Tập Tô Màu',
        short_name: 'Bé Tô Màu',
        description: 'Tô màu tranh 2D và tượng 3D cho bé 2-7 tuổi. Miễn phí, không quảng cáo, dùng được khi không có mạng.',
        lang: 'vi',
        theme_color: '#ffb703',
        background_color: '#fff7e0',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        categories: ['kids', 'education', 'entertainment'],
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
})
