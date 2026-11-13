import { configDefaults, defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.')
    }
  },
  // tsconfig garde jsx: preserve pour Next ; vitest doit transformer le TSX pour les tests de composants.
  oxc: {
    jsx: {
      runtime: 'automatic'
    }
  },
  test: {
    environment: 'node',
    globals: false,
    include: ['**/*.test.ts'],
    // Les worktrees d'agents (.claude/worktrees/) sont des checkouts complets imbriqués : les exclure.
    exclude: [...configDefaults.exclude, '.claude/**'],
    // next-intl importe `next/server` sans extension en ESM : l'inliner laisse Vite le résoudre.
    server: { deps: { inline: ['next-intl'] } }
  }
})
