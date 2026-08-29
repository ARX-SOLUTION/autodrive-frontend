import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { componentTagger } from 'lovable-tagger';
import { VitePWA } from 'vite-plugin-pwa';
import { visualizer } from 'rollup-plugin-visualizer';
import { tanstackRouter } from '@tanstack/router-plugin/vite';

const assertProductionApiBaseUrl = (value: string | undefined) => {
  const apiBaseUrl = value?.trim();

  if (!apiBaseUrl) {
    throw new Error('VITE_API_BASE_URL is required for production builds.');
  }

  let url: URL;
  try {
    url = new URL(apiBaseUrl);
  } catch {
    throw new Error('VITE_API_BASE_URL must be a valid absolute URL.');
  }

  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  const isLocalhost =
    hostname === 'localhost' || hostname.endsWith('.localhost');
  const isLoopback =
    hostname === '::1' || hostname === '0.0.0.0' || hostname.startsWith('127.');

  if (url.protocol !== 'https:' || isLocalhost || isLoopback) {
    throw new Error(
      'VITE_API_BASE_URL must use HTTPS and must not target localhost or a loopback address in production.',
    );
  }
};

const productionApiGuard: Plugin = {
  name: 'autodrive-production-api-guard',
  config(_config, { command, mode }) {
    if (command !== 'build' || mode !== 'production') return;

    const fileEnv = loadEnv(mode, process.cwd(), '');
    const apiBaseUrl =
      process.env.VITE_API_BASE_URL ?? fileEnv.VITE_API_BASE_URL;
    assertProductionApiBaseUrl(apiBaseUrl);
  },
};

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
    productionApiGuard,
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
