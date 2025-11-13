import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    outDir: 'dist-electron',
    lib: {
      entry: path.resolve(__dirname, 'electron/main.js'),
      formats: ['cjs'],
      fileName: () => 'main.js',
    },
    rollupOptions: {
      external: ['electron', 'path', 'fs', 'electron-store', 'pdf-lib', 'xlsx'],
    },
  },
});
