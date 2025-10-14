import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // base: '/dada_prod/', // GitHub repo name
  base: '/', //for local or Docker
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4000', // your mock backend
        changeOrigin: true,
        // rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
