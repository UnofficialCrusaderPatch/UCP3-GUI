import { defineConfig as defineViteConfig, mergeConfig } from 'vite';
import { defineConfig as defineVitestConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';

// https://vitejs.dev/config/
// https://tauri.app/v1/guides/getting-started/setup/vite/
const viteConfig = defineViteConfig({
  // prevent vite from obscuring rust errors
  clearScreen: false,
  // Tauri expects a fixed port, fail if that port is not available
  server: {
    strictPort: true,
  },
  // to access the Tauri environment variables set by the CLI with information about the current target
  envPrefix: [
    'VITE_',
    'TAURI_PLATFORM',
    'TAURI_ARCH',
    'TAURI_FAMILY',
    'TAURI_PLATFORM_VERSION',
    'TAURI_PLATFORM_TYPE',
    'TAURI_DEBUG',
  ],
  build: {
    // Tauri uses Chromium on Windows and WebKit on macOS and Linux
    target: process.env.TAURI_PLATFORM == 'windows' ? 'chrome105' : 'safari13',
    // don't minify for debug builds
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    // produce sourcemaps for debug builds
    sourcemap: !!process.env.TAURI_DEBUG,
    // never inline svg, but use default for everything else
    assetsInlineLimit: (filePath: string) =>
      filePath.endsWith('.svg') ? false : undefined,
  },

  plugins: [
    react(),
    tsconfigPaths(),
    ViteImageOptimizer({
      svg: {
        plugins: [
          {
            // need to keep ids for svg helper
            name: 'cleanupIds',
            params: {
              minify: false,
              remove: false,
            },
          },
        ],
      },
    }),
  ],

  // define process is here such that the code in tauri-hooks.ts doesn't fail
  // when tauri/vite runs the server instead of a node process
  define: {
    process: import.meta,
  },
});

const vitestConfig = defineVitestConfig({
  //   define: process.env.VITEST ? {} : { global: 'window' },
  test: {
    // globals is necessary for cleanup by vitest to work correctly
    globals: true,
    // To avoid error: 'window is not defined'
    environment: 'jsdom',
  },
});

export default mergeConfig(viteConfig, vitestConfig);
