#!/usr/bin/env node
/**
 * Garde-fou du design system : échoue si du code d'interface contourne les tokens.
 * Interdit dans app/, components/, features/, hooks/ (hors tests) :
 * - couleur littérale : #hex, rgb()/rgba()/hsl()/hsla()/oklch()/oklab()/lab()/lch()/hwb() ;
 * - valeur Tailwind arbitraire d'espacement, de taille, de couleur, de rayon ou de typo : `p-[13px]`, `bg-[#fff]`… ;
 * - consommation directe d'une primitive : `var(--palette-…)`.
 * Les valeurs vivent dans design-system/tokens/source/ ; un besoin non couvert = un nouveau token.
 *
 *   node scripts/lint-raw-values.mjs [dossiers…]
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = process.cwd()
const DEFAULT_ROOTS = ['app', 'components', 'features', 'hooks']
const EXTENSIONS = new Set(['.ts', '.tsx', '.css', '.mjs', '.js'])

const RULES = [
  { name: 'couleur hexadécimale', re: /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/ },
  { name: 'fonction de couleur', re: /\b(?:rgba?|hsla?|oklch|oklab|lab|lch|hwb)\s*\(/i },
  {
    name: 'valeur Tailwind arbitraire',
    re: /\b(?:m[tblrxy]?|p[tblrxy]?|gap(?:-[xy])?|space-[xy]|w|h|size|min-w|min-h|max-w|max-h|text|bg|border|rounded|leading|tracking|font|shadow|fill|stroke|ring|outline|from|via|to)-\[(?!var\(--(?:color|spacing|radius|text|font|leading|shadow)-)[^\]]+\]/
  },
  { name: 'primitive de palette consommée directement', re: /var\(--palette-/ }
]

function isIgnored(relPath) {
  const path = relPath.replace(/\\/g, '/')
  return /\.test\.tsx?$/.test(path) || /\.spec\.m?[jt]s$/.test(path)
}

function walk(dir, files = []) {
  let entries
  try {
    entries = readdirSync(dir)
  } catch {
    return files
  }
  for (const name of entries) {
    if (name === 'node_modules' || name.startsWith('.')) continue
    const path = join(dir, name)
    if (statSync(path).isDirectory()) walk(path, files)
    else if (EXTENSIONS.has(name.slice(name.lastIndexOf('.')))) files.push(path)
  }
  return files
}

function stripComments(content) {
  return content
    .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
}

const roots = process.argv.slice(2).length > 0 ? process.argv.slice(2) : DEFAULT_ROOTS
const violations = []

for (const root of roots) {
  for (const file of walk(join(ROOT, root))) {
    const rel = relative(ROOT, file)
    if (isIgnored(rel)) continue
    stripComments(readFileSync(file, 'utf8'))
      .split('\n')
      .forEach((line, index) => {
        for (const rule of RULES) {
          const match = line.match(rule.re)
          if (match) violations.push(`${rel}:${index + 1}  ${rule.name} « ${match[0]} »`)
        }
      })
  }
}

if (violations.length > 0) {
  console.error(`Valeurs hors design system (${violations.length}) :\n${violations.join('\n')}`)
  console.error(
    '→ Utiliser un token sémantique (design-system/README.md) ou en créer un dans design-system/tokens/source/.'
  )
  process.exit(1)
}

console.log(`Design system : aucune valeur brute dans ${roots.join(', ')}.`)
