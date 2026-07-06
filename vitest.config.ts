import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

// Resolve the `@/` path alias to the repo root, mirroring tsconfig.json
// (`"paths": { "@/*": ["./*"] }`). These finance-module tests are pure-logic
// (mock the network via apiFetch), so no browser/jsdom environment is needed.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    globals: false,
    include: ['**/*.{test,spec}.ts'],
    exclude: ['node_modules', '.next', 'backend', 'dist'],
  },
})
