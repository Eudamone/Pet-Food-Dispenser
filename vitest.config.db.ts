import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

// Pruebas unitarias contra la BD de prueba (DATABASE_URL_TEST).
// Los archivos terminan en .db-spec.ts para quedar fuera de `npm test`.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['test/unit/db/**/*.db-spec.ts'],
  },
});
