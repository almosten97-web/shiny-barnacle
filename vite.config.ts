import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/', // Fix for MIME type errors
  resolve: {
    alias: {
      '@/components': path.resolve(__dirname, './src/components'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@/assets': path.resolve(__dirname, './src/assets'),
    },
  },
  build: {
    outDir: './dist',
    sourcemap: true, // Recommended for production debugging
    rollupOptions: {
      input: './index.html',
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('/@fullcalendar/')) return 'vendor-fullcalendar';
          if (id.includes('/@supabase/')) return 'vendor-supabase';
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/react-router')) return 'vendor-react';
        }
      }
    },
  },
  server: {
    fs: {
      strict: false,
    },
    // Proxy settings if you need to talk to a backend
    // proxy: {
    //   '/api': {
    //     target: 'http://localhost:3000',
    //     changeOrigin: true,
    //     rewrite: (path) => path.replace(/^\/api/, '')
    //   }
    // }
  },
});
