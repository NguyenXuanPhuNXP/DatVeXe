
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ['shopper-please-grade-letter.trycloudflare.com'],
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
