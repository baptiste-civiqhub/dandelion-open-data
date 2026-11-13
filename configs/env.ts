import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

export const ENVIRONMENTS = ['development', 'preview', 'production'] as const

export const ENVS = createEnv({
  server: {
    // Clé secrète Supabase (sb_secret_...) : contourne la RLS, serveur uniquement (services/supabase/admin.ts).
    SUPABASE_SECRET_KEY: z.string().min(1).optional()
  },
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    // Clé publishable (sb_publishable_...) : publique par conception, la sécurité repose sur la RLS.
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
    NEXT_PUBLIC_ENVIRONMENT: z.enum(ENVIRONMENTS).default('development')
  },
  runtimeEnv: {
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    // Sur Vercel, NEXT_PUBLIC_VERCEL_ENV (development | preview | production) est exposée automatiquement :
    // pas besoin de déclarer NEXT_PUBLIC_ENVIRONMENT par environnement.
    NEXT_PUBLIC_ENVIRONMENT: process.env.NEXT_PUBLIC_ENVIRONMENT || process.env.NEXT_PUBLIC_VERCEL_ENV
  },
  emptyStringAsUndefined: true,
  // Lint / CI sans secrets uniquement. Jamais sur Vercel.
  skipValidation: !!process.env.SKIP_ENV_VALIDATION
})

export const isProduction = ENVS.NEXT_PUBLIC_ENVIRONMENT === 'production'
