import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // During development, forward all /api calls to FastAPI
      // so the React dev server and FastAPI work together
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true
      }
    }
  },
  build: {
    // Output built files to dist/
    // Copy contents of dist/ to backend/frontend/ to deploy
    outDir: 'dist'
  }
})
