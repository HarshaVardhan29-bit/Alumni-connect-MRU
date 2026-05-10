import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { compression } from 'vite-plugin-compression2';

export default defineConfig({
  plugins: [
    react(),
    // Gzip
    compression({ algorithm: 'gzip', exclude: [/\.(br|gz)$/] }),
    // Brotli (better compression than gzip)
    compression({ algorithm: 'brotliCompress', exclude: [/\.(br|gz)$/], filename: '[path][base].br' }),
  ],

  // Required for Capacitor
  base: './',

  build: {
    minify: 'oxc',
    // Increase inline limit — small assets inlined as base64 (fewer requests)
    assetsInlineLimit: 4096,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router-dom')) {
            return 'react-vendor';
          }
          if (id.includes('node_modules/recharts')) {
            return 'chart-vendor';
          }
          if (id.includes('node_modules/firebase')) {
            return 'firebase-vendor';
          }
          if (id.includes('node_modules/socket.io-client')) {
            return 'socket-vendor';
          }
          if (id.includes('/src/admin/')) {
            return 'admin';
          }
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    sourcemap: false,
    // CSS code splitting
    cssCodeSplit: true,
  },

  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'socket.io-client'],
  },

  server: {
    compress: true,
  },
});
