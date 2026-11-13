const isProd = process.env.NODE_ENV === 'production'

export type SecurityHeaderKV = { key: string; value: string }

/**
 * En-têtes de sécurité statiques : protection contre le framing, le MIME sniffing,
 * politique de referrer et de permissions.
 */
export function getSecurityHeaders(): SecurityHeaderKV[] {
  const headers: SecurityHeaderKV[] = [
    { key: 'X-DNS-Prefetch-Control', value: 'on' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    {
      key: 'Permissions-Policy',
      value: 'camera=(), microphone=(), geolocation=()'
    }
  ]

  if (isProd) {
    headers.push({
      key: 'Strict-Transport-Security',
      value: 'max-age=63072000; includeSubDomains; preload'
    })
  }

  return headers
}
