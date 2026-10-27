
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ['shopper-please-grade-letter.trycloudflare.com'],
    proxy: {
      '/api': 'http://localhost:3000',
    },
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: ['handed-employer-radio.ngrok-free.dev'],
    proxy: { '/api': 'http://localhost:3000' },
  },
})
