/** Contraste WCAG 2.x entre deux couleurs hexadécimales opaques (#RGB ou #RRGGBB). */

export function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace('#', '')
  const full =
    value.length === 3
      ? value
          .split('')
          .map((char) => char + char)
          .join('')
      : value
  if (!/^[0-9a-fA-F]{6}$/.test(full)) throw new Error(`Couleur hexadécimale invalide : ${hex}`)

  return [0, 2, 4].map((index) => parseInt(full.slice(index, index + 2), 16)) as [number, number, number]
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((channel) => {
    const srgb = channel / 255
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4
  })

  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrastRatio(first: string, second: string): number {
  const [lighter, darker] = [relativeLuminance(first), relativeLuminance(second)].sort((a, b) => b - a)
  return (lighter + 0.05) / (darker + 0.05)
}

/** Seuils WCAG AA : texte courant 4.5:1, grand texte et éléments d'interface 3:1. */
export const WCAG_AA = { text: 4.5, largeText: 3, nonText: 3 } as const
