import { defineConfig } from 'vitest/config'

// Backend test harness. Pure-logic unit tests (stock arithmetic in
// models/inventoryItem.ts) — no DB, no server, so the plain node env is enough.
export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['node_modules', 'dist'],
  },
})
