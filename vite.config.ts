import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: '/', // Add this line to fix MIME type errors
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: './dist',
    rollupOptions: {
      input: './index.html',
    },
  },
  server: {
    fs: {
      strict: false,
    },
  },
})
