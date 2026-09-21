/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // Served from https://<user>.github.io/lletraferit/ (a GitHub Pages
  // *project* site, not a user/org site), so production builds need every
  // asset URL prefixed with the repo name. The dev server still runs at the
  // domain root, so only apply this for `vite build`.
  base: command === 'build' ? '/lletraferit/' : '/',
  plugins: [react(), tailwindcss()],
  worker: {
    format: 'es',
  },
  resolve: {
    alias: {
      // hunspell-asm's ESM build does `import * as nanoid from 'nanoid'` and
      // then calls `nanoid(45)` directly — relying on Node's CJS-interop
      // quirk of making the namespace object itself callable when the
      // required module is `module.exports = fn`. That quirk is Node-
      // specific: Rollup's real ES module semantics (used by `vite build`)
      // make namespace imports genuinely non-callable, so the ESM build
      // throws "nanoid is not a function" at runtime in the production
      // bundle. Its CJS build uses plain `require('nanoid')` instead, which
      // has no such ambiguity, so force resolution to that build instead.
      'hunspell-asm': fileURLToPath(new URL('./node_modules/hunspell-asm/dist/cjs/index.js', import.meta.url)),
      'emscripten-wasm-loader': fileURLToPath(
        new URL('./node_modules/emscripten-wasm-loader/dist/cjs/index.js', import.meta.url),
      ),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
}))
