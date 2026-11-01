import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  // Same origin as nginx in production, so the SameSite=Strict session cookie works.
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        xfwd: true,
        rewrite: (p) => p.replace(/^\/api/, ''),
      },
    },
  },
})
