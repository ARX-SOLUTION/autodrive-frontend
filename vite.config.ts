import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { componentTagger } from 'lovable-tagger';
import { VitePWA } from 'vite-plugin-pwa';

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
    react(),
    mode === 'development' && componentTagger(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globIgnores: ['**/export-xlsx-*.js'],
      },
      manifest: {
        name: 'Auto Maktab CRM',
        short_name: 'Auto Maktab',
        description:
          "Avtomaktablar uchun boshqaruv tizimi: to'lov, davomat va dars jadvali bitta tizimda",
        theme_color: '#1a1f2e',
        background_color: '#0e1018',
        display: 'standalone',
        start_url: '/',
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
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('/xlsx/')) return 'export-xlsx';
          if (
            id.includes('/node_modules/react/') ||
            id.includes('/react-dom/') ||
            id.includes('/react-router') ||
            id.includes('/scheduler/')
          ) {
            return 'react-vendor';
          }
          if (id.includes('/@tanstack/')) return 'query-vendor';
          if (id.includes('/@radix-ui/')) return 'ui-vendor';
          if (id.includes('/recharts/') || id.includes('/d3-')) {
            return 'charts-vendor';
          }
          if (id.includes('/i18next') || id.includes('/react-i18next/')) {
            return 'i18n-vendor';
          }
          if (
            id.includes('/react-markdown/') ||
            id.includes('/remark') ||
            id.includes('/rehype') ||
            id.includes('/mdast') ||
            id.includes('/micromark') ||
            id.includes('/unist-util') ||
            id.includes('/hast-util') ||
            id.includes('/vfile') ||
            id.includes('/unified/') ||
            id.includes('/highlight.js/') ||
            id.includes('/lowlight/') ||
            id.includes('/property-information/') ||
            id.includes('/space-separated-tokens/') ||
            id.includes('/comma-separated-tokens/')
          ) {
            return 'blog-vendor';
          }
        },
      },
    },
  },
}));
