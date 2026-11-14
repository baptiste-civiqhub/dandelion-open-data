import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

export const ENVIRONMENTS = ['development', 'preview', 'production'] as const

/** Public URL of the Supabase project (mloaychfjhajdjfktcjp, eu-central-1). Not a secret. */
export const SUPABASE_PROJECT_URL = 'https://mloaychfjhajdjfktcjp.supabase.co'

export const ENVS = createEnv({
  server: {
    // Secret key (sb_secret_...): bypasses RLS, server only (services/supabase/admin.ts).
    SUPABASE_SECRET_KEY: z.string().min(1).optional(),
    // Featherless, server only. Same key rule as scripts/tag-articles.mjs: FEATHERLESS_API_KEY_1, else FEATHERLESS_API_KEY.
    // Without a key, /api/amendements/analysis answers in degraded mode (no inference).
    FEATHERLESS_API_KEY_1: z.string().min(1).optional(),
    FEATHERLESS_API_KEY: z.string().min(1).optional(),
    // Chat model of the amendment analysis. Distinct from FEATHERLESS_MODEL, the classifier of the tagging script.
    FEATHERLESS_CHAT_MODEL: z.string().min(1).default('zai-org/GLM-5.2')
  },
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.string().url().default(SUPABASE_PROJECT_URL),
    // Publishable key (sb_publishable_...): public by design, security relies on RLS. Optional at build time so
    // that pages which do not touch Supabase still build and deploy; the clients throw explicitly when it is missing.
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
    NEXT_PUBLIC_ENVIRONMENT: z.enum(ENVIRONMENTS).default('development')
  },
  runtimeEnv: {
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    FEATHERLESS_API_KEY_1: process.env.FEATHERLESS_API_KEY_1,
    FEATHERLESS_API_KEY: process.env.FEATHERLESS_API_KEY,
    FEATHERLESS_CHAT_MODEL: process.env.FEATHERLESS_CHAT_MODEL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    // On Vercel, NEXT_PUBLIC_VERCEL_ENV (development | preview | production) is exposed automatically.
    NEXT_PUBLIC_ENVIRONMENT: process.env.NEXT_PUBLIC_ENVIRONMENT || process.env.NEXT_PUBLIC_VERCEL_ENV
  },
  emptyStringAsUndefined: true,
  // Lint / CI without secrets only. Never on Vercel.
  skipValidation: !!process.env.SKIP_ENV_VALIDATION
})

export const isProduction = ENVS.NEXT_PUBLIC_ENVIRONMENT === 'production'
