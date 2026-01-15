import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  root: '.',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: './dist',
    rollupOptions: {
        input: './index.html'
    }
  },
  server: {
    fs: {
      // Allow serving files from one level up to the project root
      strict: false,
    },
  },
})
