import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { compression } from 'vite-plugin-compression2';

export default defineConfig({
  plugins: [
    react(),
    compression({ algorithm: 'gzip',          exclude: [/\.(br|gz)$/] }),
    compression({ algorithm: 'brotliCompress', exclude: [/\.(br|gz)$/], filename: '[path][base].br' }),
  ],

  base: './',

  build: {
    minify: 'oxc',
    assetsInlineLimit: 4096,
    cssCodeSplit: true,
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Each lazy-imported page becomes its own chunk automatically.
        // manualChunks handles shared vendor libraries.
        manualChunks(id) {
          // Core React — loaded first, cached forever
          if (id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/react-router-dom/') ||
              id.includes('node_modules/scheduler/')) {
            return 'react-vendor';
          }
          // Firebase — large, rarely changes
          if (id.includes('node_modules/firebase/') ||
              id.includes('node_modules/@firebase/')) {
            return 'firebase-vendor';
          }
          // Socket.IO
          if (id.includes('node_modules/socket.io-client/') ||
              id.includes('node_modules/engine.io-client/')) {
            return 'socket-vendor';
          }
          // Charts — only loaded on analytics page
          if (id.includes('node_modules/recharts/') ||
              id.includes('node_modules/d3-')) {
            return 'chart-vendor';
          }
          // Admin pages — never loaded by regular users
          if (id.includes('/src/admin/')) {
            return 'admin';
          }
        },
      },
    },
  },

  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'socket.io-client'],
  },

  server: {
    compress: true,
  },
});
