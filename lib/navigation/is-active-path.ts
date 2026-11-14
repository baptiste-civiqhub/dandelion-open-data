const trimTrailingSlash = (path: string) => (path.length > 1 ? path.replace(/\/+$/, '') : path)

/**
 * Un lien de navigation est actif sur sa propre page et sur ses sous-pages (`/datasets` l'est sur `/datasets/abc`).
 * L'accueil `/` n'est actif que sur lui-même. Chemins sans préfixe de langue (`localePrefix: 'never'`).
 */
export function isActivePath(pathname: string, href: string): boolean {
  const current = trimTrailingSlash(pathname.split(/[?#]/)[0] || '/')
  const target = trimTrailingSlash(href)
  if (target === '/') return current === '/'
  return current === target || current.startsWith(`${target}/`)
}
