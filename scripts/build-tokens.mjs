#!/usr/bin/env node
/**
 * Pipeline de tokens déterministe et hors ligne :
 *   design-system/tokens/source/*.json → design-system/tokens/generated.{css,ts}
 *
 * Forme de la sortie (voir design-system/README.md) :
 * - palette (primitives) → variables CSS `--palette-*` sur :root, SANS utilitaire Tailwind :
 *   un composant ne peut pas consommer une primitive, même par erreur ;
 * - paletteDark → surcharges des primitives sous `.dark` ;
 * - tokens sémantiques et échelles → un bloc `@theme static` sur les namespaces natifs de Tailwind 4.
 *   `static` : chaque token existe sur :root même sans utilitaire ; pas d'`inline` : les utilitaires
 *   référencent `var(--token)`, ce qui permet de changer de thème sans rebuild ;
 * - `--color-*: initial` retire la palette par défaut de Tailwind : seules les couleurs du design
 *   system existent (`bg-blue-500` ne génère plus rien).
 *
 *   node scripts/build-tokens.mjs           # régénère
 *   node scripts/build-tokens.mjs --check   # échoue si les fichiers générés ne sont pas à jour
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
export const SOURCE_DIR = join(ROOT, 'design-system', 'tokens', 'source')
export const CSS_OUT = join(ROOT, 'design-system', 'tokens', 'generated.css')
export const TS_OUT = join(ROOT, 'design-system', 'tokens', 'generated.ts')
export const MD_OUT = join(ROOT, 'design-system', 'tokens', 'palette.generated.md')

/** Familles de la palette, du préfixe le plus spécifique au plus général (pour la documentation). */
const PALETTE_FAMILIES = [
  ['semantic-tint', 'Semantic Tint'],
  ['likert-tint', 'Likert Tint'],
  ['accent-teal-vivid', 'Accent — Teal Vivid'],
  ['accent-teal-sage', 'Accent — Teal Sage'],
  ['accent-blue-royal', 'Accent — Blue Royal'],
  ['accent-blue-sky', 'Accent — Blue Sky'],
  ['accent-raspberry', 'Accent — Raspberry'],
  ['accent-mauve', 'Accent — Mauve'],
  ['accent-olive', 'Accent — Olive'],
  ['accent-terracotta', 'Accent — Terracotta'],
  ['accent-yellow', 'Accent — Yellow'],
  ['accent-green', 'Accent — Green'],
  ['accent-red', 'Accent — Red'],
  ['blue', 'Primitives — Blue'],
  ['neutral', 'Primitives — Neutral'],
  ['semantic', 'Semantic'],
  ['likert', 'Likert']
]

/** Groupe source → namespace Tailwind 4 (`--<prefix>-<clé>`). Ordre = ordre de sortie. */
export const THEME_GROUPS = [
  ['color', 'color'],
  ['spacing', 'spacing'],
  ['radius', 'radius'],
  ['fontFamily', 'font'],
  ['fontSize', 'text'],
  ['fontWeight', 'font-weight'],
  ['lineHeight', 'leading'],
  ['elevation', 'shadow']
]

const KNOWN_GROUPS = new Set(['meta', 'palette', 'paletteDark', ...THEME_GROUPS.map(([group]) => group)])
const REFERENCE_RE = /^\{(palette|color)\.([a-z0-9-]+)\}$/

export function loadSource(dir = SOURCE_DIR) {
  const files = readdirSync(dir)
    .filter((file) => file.endsWith('.json'))
    .sort()
  if (files.length === 0) throw new Error(`Aucune source de tokens dans ${dir}`)

  const merged = { meta: {}, palette: {}, paletteDark: {} }
  for (const [group] of THEME_GROUPS) merged[group] = {}

  for (const file of files) {
    const raw = JSON.parse(readFileSync(join(dir, file), 'utf8'))
    for (const key of Object.keys(raw)) {
      if (!KNOWN_GROUPS.has(key)) throw new Error(`${file} : groupe de tokens inconnu « ${key} »`)
      Object.assign(merged[key], raw[key])
    }
  }

  return merged
}

/** Vérifie la cohérence de la source ; renvoie la liste des erreurs (vide si tout va bien). */
export function validateSource(source) {
  const errors = []

  for (const key of Object.keys(source.paletteDark)) {
    if (!(key in source.palette)) errors.push(`paletteDark.${key} ne surcharge aucune primitive existante`)
  }

  for (const [key, value] of Object.entries(source.color)) {
    const match = typeof value === 'string' ? value.match(REFERENCE_RE) : null
    if (!match) {
      errors.push(`color.${key} = « ${value} » : un token sémantique référence la palette, jamais une valeur brute`)
      continue
    }
    const [, group, target] = match
    if (!(target in source[group])) errors.push(`color.${key} référence ${value}, qui n'existe pas`)
    if (group === 'color' && target === key) errors.push(`color.${key} se référence lui-même`)
  }

  return errors
}

function toCssReference(value) {
  const [, group, target] = value.match(REFERENCE_RE)
  return group === 'palette' ? `var(--palette-${target})` : `var(--color-${target})`
}

/** Valeur littérale (mode clair) d'un token sémantique, pour les consommateurs JS (dataviz, canvas, OG). */
export function resolveColor(source, key, trail = []) {
  if (trail.length > 5) throw new Error(`Chaîne d'alias trop profonde : ${trail.join(' → ')}`)
  const [, group, target] = source.color[key].match(REFERENCE_RE)
  return group === 'palette' ? source.palette[target] : resolveColor(source, target, [...trail, key])
}

export function buildCss(source) {
  const lines = [
    '/* AUTO-GENERATED by scripts/build-tokens.mjs from design-system/tokens/source — do not edit */',
    '',
    '/* Palette (primitives) : variables CSS uniquement, aucun utilitaire. Jamais consommées par un composant. */',
    ':root {'
  ]
  for (const [key, value] of Object.entries(source.palette)) lines.push(`  --palette-${key}: ${value};`)
  lines.push('}', '')

  lines.push('/* Mode sombre : surcharges des primitives clés (partiel, non activé par défaut). */', '.dark {')
  for (const [key, value] of Object.entries(source.paletteDark)) lines.push(`  --palette-${key}: ${value};`)
  lines.push('}', '')

  lines.push(
    '/* Tokens sémantiques et échelles : seule surface consommable (utilitaires bg-*, text-*, rounded-*…). */',
    '@theme static {',
    '  --color-*: initial;'
  )
  for (const [group, prefix] of THEME_GROUPS) {
    const entries = Object.entries(source[group])
    if (entries.length === 0) continue
    lines.push(`  /* ${group} */`)
    for (const [key, value] of entries) {
      lines.push(`  --${prefix}-${key}: ${group === 'color' ? toCssReference(value) : value};`)
    }
  }
  lines.push('}', '')

  return lines.join('\n')
}

export function buildTs(source) {
  const colors = Object.fromEntries(Object.keys(source.color).map((key) => [key, resolveColor(source, key)]))
  const scales = Object.fromEntries(
    THEME_GROUPS.filter(([group]) => group !== 'color').map(([group]) => [group, source[group]])
  )
  const serialize = (value) => JSON.stringify(value, null, 2)

  return [
    '// AUTO-GENERATED by scripts/build-tokens.mjs from design-system/tokens/source — do not edit',
    '// Pour du code JS qui a besoin d’une valeur littérale (dataviz canvas, export SVG, image OG).',
    '// Dans les composants, toujours préférer les utilitaires Tailwind (bg-primary, text-chart-1…).',
    '',
    `export const palette = ${serialize(source.palette)} as const`,
    '',
    `export const paletteDark = ${serialize(source.paletteDark)} as const`,
    '',
    '/** Tokens sémantiques résolus en valeurs littérales (mode clair). */',
    `export const colors = ${serialize(colors)} as const`,
    '',
    `export const scales = ${serialize(scales)} as const`,
    '',
    'export type SemanticColor = keyof typeof colors',
    ''
  ].join('\n')
}

function paletteFamily(key) {
  const family = PALETTE_FAMILIES.find(([prefix]) => key.startsWith(`${prefix}-`))
  if (!family) throw new Error(`Primitive « ${key} » hors de toute famille connue (PALETTE_FAMILIES)`)
  return family
}

/** Documentation de la palette et des tokens, générée : elle ne peut pas diverger de la source. */
export function buildMarkdown(source) {
  const lines = [
    '<!-- AUTO-GENERATED by scripts/build-tokens.mjs from design-system/tokens/source — do not edit -->',
    '',
    '# Palette et tokens — référence générée',
    '',
    'Source de vérité : `design-system/tokens/source/brand.json`. Règles d’usage : `design-system/README.md` et `design-system/BRAND.md`.',
    '',
    '## Tokens sémantiques (seule surface consommable)',
    '',
    '| Token | Utilitaires | Primitive | Clair | Sombre |',
    '| --- | --- | --- | --- | --- |'
  ]

  for (const [key, value] of Object.entries(source.color)) {
    const [, group, target] = value.match(REFERENCE_RE)
    const primitive = group === 'palette' ? target : `color.${target}`
    const dark = group === 'palette' && source.paletteDark[target] ? `\`${source.paletteDark[target]}\`` : '—'
    lines.push(
      `| \`${key}\` | \`bg-${key}\` · \`text-${key}\` · \`border-${key}\` | \`${primitive}\` | \`${resolveColor(source, key)}\` | ${dark} |`
    )
  }

  lines.push(
    '',
    `## Palette (${Object.keys(source.palette).length} primitives, jamais consommées directement)`,
    '',
    'Variables CSS `--palette-<nom>`, sans utilitaire Tailwind. Une primitive ne sert qu’à définir un token sémantique.'
  )

  const byFamily = new Map()
  for (const [key, value] of Object.entries(source.palette)) {
    const [, label] = paletteFamily(key)
    if (!byFamily.has(label)) byFamily.set(label, [])
    byFamily.get(label).push([key, value])
  }
  for (const [label, entries] of byFamily) {
    lines.push('', `### ${label}`, '', '| Primitive | Valeur | Mode sombre |', '| --- | --- | --- |')
    for (const [key, value] of entries) {
      const dark = source.paletteDark[key] ? `\`${source.paletteDark[key]}\`` : '—'
      lines.push(`| \`${key}\` | \`${value}\` | ${dark} |`)
    }
  }

  lines.push('')
  return lines.join('\n')
}

function main() {
  const source = loadSource()
  const errors = validateSource(source)
  if (errors.length > 0) {
    console.error(`Source de tokens invalide :\n- ${errors.join('\n- ')}`)
    process.exit(1)
  }

  const outputs = [
    [CSS_OUT, buildCss(source)],
    [TS_OUT, buildTs(source)],
    [MD_OUT, buildMarkdown(source)]
  ]

  if (process.argv.includes('--check')) {
    const stale = outputs.filter(([path, content]) => {
      try {
        return readFileSync(path, 'utf8').replace(/\r\n/g, '\n') !== content
      } catch {
        return true
      }
    })
    if (stale.length > 0) {
      console.error(`Tokens générés obsolètes : ${stale.map(([path]) => path).join(', ')}\n→ pnpm tokens:build`)
      process.exit(1)
    }
    console.log('Tokens générés à jour.')
    return
  }

  for (const [path, content] of outputs) writeFileSync(path, content)
  console.log(
    `Tokens générés : ${Object.keys(source.palette).length} primitives, ${Object.keys(source.color).length} tokens sémantiques.`
  )
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main()
}
