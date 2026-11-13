// Site icon, generated at build time from the mark geometry and the brand tokens:
// one source, no copy to keep in sync. The dot in the path keeps it out of the middleware.

import { colors } from '@/design-system/tokens/generated'
import { renderDandelionSvg } from '@/lib/brand/dandelion-svg'

export const dynamic = 'force-static'

export function GET() {
  const svg = renderDandelionSvg({
    ink: colors['brand-foreground'],
    background: [colors['brand-gradient-from'], colors['brand-gradient-to']]
  })

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=3600'
    }
  })
}
