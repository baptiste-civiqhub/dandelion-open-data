import { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

import { getSecurityHeaders } from './configs/security-headers'
import pkg from './package.json'

const SUPABASE_PROJECT_REF = 'mloaychfjhajdjfktcjp'

const nextConfig: NextConfig = {
  // Pas de `output: 'standalone'` : Vercel produit son propre bundle de fonctions.
  poweredByHeader: false,
  turbopack: {
    root: process.cwd()
  },
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: `${SUPABASE_PROJECT_REF}.supabase.co`,
        pathname: '/storage/v1/object/public/**'
      }
    ]
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: getSecurityHeaders()
      }
    ]
  }
}

const withNextIntl = createNextIntlPlugin()
export default withNextIntl(nextConfig)
