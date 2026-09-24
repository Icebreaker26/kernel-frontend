import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  resolve: {
    alias: {
      // @digitalpersona/devices hace `import 'WebSdk'` esperando el global que define el script del cliente WebSdk
      // (que el módulo de firma carga en tiempo de ejecución): aquí se resuelve a un módulo vacío.
      WebSdk: fileURLToPath(new URL('./src/modules/firma/lib/websdkGlobal.js', import.meta.url)),
    },
  },
  // Pruebas (Vitest): la lógica pura corre en Node; los componentes, en jsdom con Testing Library
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.test.{js,jsx}'],
    css: false,
  },
});
