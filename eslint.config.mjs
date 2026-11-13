import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { FlatCompat } from '@eslint/eslintrc'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname
})

const eslintConfig = [
  {
    // Fichiers générés (types Supabase, tokens du design system) : jamais édités à la main, jamais lintés.
    ignores: ['types/supabase.ts', 'design-system/tokens/generated.ts']
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      '@next/next/no-img-element': 'off'
    }
  },
  {
    // Portabilité : le code métier pur ne dépend ni de Supabase ni de Next.
    files: ['lib/**/*.ts', 'features/**/lib/**/*.ts'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@supabase/*',
                'next',
                'next/*',
                'next-intl',
                'next-intl/*',
                'react',
                'react-dom',
                '@/services/*',
                '@/app/*'
              ],
              message:
                'lib/ et features/*/lib/ contiennent des algorithmes purs, portables tels quels. Accès données → apis/<ressource>/, framework → composants.'
            },
            {
              // Les types du contrat de données sont permis, pas le code d'accès aux données.
              group: ['@/apis/*'],
              allowTypeImports: true,
              message: 'Seuls les `import type` depuis apis/ sont permis dans le code pur.'
            }
          ]
        }
      ]
    }
  }
]

export default eslintConfig
