import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // In dev, proxy /api calls to wrangler pages dev (port 8788)
      '/api': 'http://localhost:8788'
    }
  }
})
