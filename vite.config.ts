import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Rutas relativas: la página funciona igual en la raíz o en usuario.github.io/repo/.
  base: './',
  // public/ se copia tal cual a dist/; ahí vive data/matches.json.
  publicDir: 'public',
  server: { port: 5173 },
  test: { include: ['tests/**/*.test.ts'] },
});
