import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/upload-pancard': { target: 'http://localhost:3000', changeOrigin: true },
      '/upload-voterid': { target: 'http://localhost:3000', changeOrigin: true },
      '/upload-income':  { target: 'http://localhost:3000', changeOrigin: true },
      '/upload-caste':   { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
  build: {
    outDir: '../public',
    emptyOutDir: true,
  },
})
