import { DANDELION_MARK, type DandelionGeometry } from './dandelion-geometry'

type RenderOptions = {
  /** Colour of the mark. */
  ink: string
  /** Optional app-icon background: a solid colour, or a vertical gradient [top, bottom]. */
  background?: string | [string, string]
  /** Corner radius of the background square, in viewBox units. */
  cornerRadius?: number
  /** Share of the frame occupied by the mark when a background is drawn (app-icon safe area). */
  markScale?: number
  geometry?: DandelionGeometry
}

const COLOR_RE = /^#[0-9A-Fa-f]{6}$/

/** Standalone SVG of the mark (site icon, exports). Colours come from design tokens, never hard-coded. */
export function renderDandelionSvg({
  ink,
  background,
  cornerRadius = 22,
  markScale = 0.66,
  geometry = DANDELION_MARK
}: RenderOptions): string {
  const colors = [ink, ...(Array.isArray(background) ? background : background ? [background] : [])]
  for (const color of colors) {
    if (!COLOR_RE.test(color)) throw new Error(`Invalid colour for the mark: ${color}`)
  }

  const { size, chevrons } = geometry
  const paths = chevrons.map(({ path }) => `<path d="${path}"/>`).join('')

  if (!background) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}"><g fill="${ink}">${paths}</g></svg>`
  }

  const offset = (size * (1 - markScale)) / 2
  const fill = Array.isArray(background) ? 'url(#bg)' : background
  const gradient = Array.isArray(background)
    ? `<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${background[0]}"/><stop offset="1" stop-color="${background[1]}"/></linearGradient></defs>`
    : ''

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">`,
    gradient,
    `<rect width="${size}" height="${size}" rx="${cornerRadius}" fill="${fill}"/>`,
    `<g fill="${ink}" transform="translate(${offset} ${offset}) scale(${markScale})">${paths}</g>`,
    '</svg>'
  ].join('')
}
