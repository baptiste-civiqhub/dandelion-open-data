const ALLOWED_HOSTS = new Set(['www.senat.fr', 'senat.fr'])

/** Lien officiel affichable : HTTPS, hôte du Sénat uniquement ; URL relative au protocole normalisée. Sinon null. */
export function toSafeSenateUrl(raw: string | null | undefined): string | null {
  const value = raw?.trim()
  if (!value) return null
  let url: URL
  try {
    url = new URL(value.startsWith('//') ? `https:${value}` : value)
  } catch {
    return null
  }
  if ((url.protocol !== 'https:' && url.protocol !== 'http:') || !ALLOWED_HOSTS.has(url.hostname)) return null
  if (url.username || url.password || url.port) return null
  url.protocol = 'https:'
  return url.toString()
}
