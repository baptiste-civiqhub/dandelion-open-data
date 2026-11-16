// Exporte les tokens et le pictogramme du design system vers pitch/assets/ (aucune valeur recopiée à la main).
// Usage : node pitch/scripts/build-assets.mjs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { registerHooks } from 'node:module'

// Les sources TypeScript du dépôt importent sans extension : on résout « ./x » en « ./x.ts ».
registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context)
    } catch (error) {
      if (specifier.startsWith('.')) return nextResolve(`${specifier}.ts`, context)
      throw error
    }
  }
})

const { renderDandelionSvg } = await import('../../lib/brand/dandelion-svg.ts')
const { colors } = await import('../../design-system/tokens/generated.ts')

const OUT = new URL('../assets/brand/', import.meta.url)
mkdirSync(OUT, { recursive: true })

const css = readFileSync(new URL('../../design-system/tokens/generated.css', import.meta.url), 'utf8')
  .replace(/@theme static \{/, ':root {')
  .replace(/^\s*--color-\*: initial;\n/m, '')
  .replace(/var\(--font-inter\), /, "'Inter', ")
writeFileSync(new URL('../assets/tokens.css', import.meta.url), css)

writeFileSync(new URL('mark.svg', OUT), renderDandelionSvg({ ink: colors.foreground }))
writeFileSync(new URL('mark-light.svg', OUT), renderDandelionSvg({ ink: colors['brand-foreground'] }))
writeFileSync(
  new URL('app-icon.svg', OUT),
  renderDandelionSvg({
    ink: colors['brand-foreground'],
    background: [colors['brand-gradient-from'], colors['brand-gradient-to']]
  })
)
console.log('pitch/assets : tokens.css, brand/mark.svg, brand/mark-light.svg, brand/app-icon.svg')
