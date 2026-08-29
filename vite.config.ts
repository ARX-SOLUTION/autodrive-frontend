import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { componentTagger } from 'lovable-tagger';
import { VitePWA } from 'vite-plugin-pwa';
import { visualizer } from 'rollup-plugin-visualizer';
import { tanstackRouter } from '@tanstack/router-plugin/vite';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: '::',
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
    react(),
    mode === 'development' && componentTagger(),
    // ponytail: opt-in via ANALYZE=1 npm run build -- writes dist/stats.html,
    // no effect on normal builds. autodrive-6ef.16 baseline harness.
    !!process.env.ANALYZE &&
      visualizer({
        filename: 'dist/stats.html',
        gzipSize: true,
        brotliSize: true,
      }),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      injectRegister: false,
      includeManifestIcons: false,
      injectManifest: {
        globPatterns: ['offline.html', 'favicon.png'],
      },
      manifest: {
        name: 'Auto Maktab CRM',
        short_name: 'Auto Maktab',
        description:
          "Avtomaktablar uchun boshqaruv tizimi: to'lov, davomat va dars jadvali bitta tizimda",
        theme_color: '#092634',
        background_color: '#092634',
        display: 'standalone',
        start_url: '/',
        lang: 'uz',
        icons: [
          {
            src: 'favicon.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'favicon.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      '@tanstack/react-query',
      '@tanstack/query-core',
    ],
  },
  build: {
    rollupOptions: {
      output: {
        // Keep only genuinely optional heavy libraries in explicit chunks.
        // Broad framework/vendor buckets create circular chunks and pull
        // route-only TanStack Table/Virtual code into the initial shell.
        onlyExplicitManualChunks: true,
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (
            id.includes('/.pnpm/react@') ||
            id.includes('/.pnpm/react-dom@') ||
            id.includes('/.pnpm/scheduler@')
          ) {
            return 'react-core';
          }
          if (id.includes('/xlsx/')) return 'export-xlsx';
          if (id.includes('/recharts/') || id.includes('/d3-')) {
            return 'charts-vendor';
          }
        },
      },
    },
  },
}));
