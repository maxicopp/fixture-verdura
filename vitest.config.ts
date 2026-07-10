import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'lcov'],
      include: ['app/**/*.{ts,tsx}'],
      exclude: [
        'app/globals.css',
        'app/**/*.d.ts',
        'node_modules/**',
        'app/components/Stats.tsx',
        'app/components/TorneoApp.tsx',
        'app/components/CopaBracket.tsx',
        'app/components/RecopaBracket.tsx',
        'app/components/HistoricalStats.tsx',
        'app/components/HeadToHead.tsx',
        'app/components/HallOfFame.tsx',
        'app/components/Champion.tsx',
        'app/components/Confetti.tsx',
        'app/verdura-admin/page.tsx',
        'app/lib/seed.ts',
      ],
      thresholds: {
        statements: 70,
        branches: 60,
        functions: 60,
        lines: 70,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
