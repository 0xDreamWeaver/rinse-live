import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
  server: {
    allowedHosts: ['localhost', '127.0.0.1', '0.0.0.0', 'rinse.live', '.ngrok-free.app', '.ngrok.io'],
    proxy: {
      // Proxy API requests to backend - works for both local dev and ngrok
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        ws: true, // Enable WebSocket proxying
      },
    },
  },
})
