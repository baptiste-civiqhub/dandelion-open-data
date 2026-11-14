// Résolution minimale pour exécuter la logique pure TypeScript avec `node --experimental-strip-types` :
// alias `@/` → racine du repo, imports relatifs sans extension → `.ts`. Aucune dépendance ajoutée.
import { existsSync } from 'node:fs'
import { dirname, resolve as resolvePath } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolvePath(dirname(fileURLToPath(import.meta.url)), '../..')

export async function resolve(specifier, context, next) {
  let target = null
  if (specifier.startsWith('@/')) target = resolvePath(root, specifier.slice(2))
  else if ((specifier.startsWith('./') || specifier.startsWith('../')) && context.parentURL?.startsWith('file:'))
    target = resolvePath(dirname(fileURLToPath(context.parentURL)), specifier)
  if (target && !/\.(ts|mjs|js|json)$/.test(target) && existsSync(`${target}.ts`)) {
    return next(pathToFileURL(`${target}.ts`).href, context)
  }
  if (target && existsSync(target)) return next(pathToFileURL(target).href, context)
  return next(specifier, context)
}
