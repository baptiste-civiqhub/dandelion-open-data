import { describe, expect, it } from 'vitest'

import { renderDandelionSvg } from './dandelion-svg'

describe('renderDandelionSvg', () => {
  it('renders the bare mark: five chevrons filled with the ink colour', () => {
    const svg = renderDandelionSvg({ ink: '#141414' })

    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true)
    expect(svg.match(/<path /g)).toHaveLength(5)
    expect(svg).toContain('<g fill="#141414">')
    expect(svg).not.toContain('<rect')
  })

  it('renders an app icon on a vertical gradient, mark scaled into the safe area', () => {
    const svg = renderDandelionSvg({ ink: '#FFFFFF', background: ['#F96B61', '#FAD870'] })

    expect(svg).toContain('<stop offset="0" stop-color="#F96B61"/>')
    expect(svg).toContain('<stop offset="1" stop-color="#FAD870"/>')
    expect(svg).toContain('fill="url(#bg)"')
    expect(svg).toContain('scale(0.66)')
  })

  it('accepts a solid background', () => {
    expect(renderDandelionSvg({ ink: '#FFFFFF', background: '#141414' })).toContain('fill="#141414"')
  })

  it('refuses anything but an opaque hex colour, so no markup can be injected', () => {
    expect(() => renderDandelionSvg({ ink: '"/><script>' })).toThrow()
    expect(() => renderDandelionSvg({ ink: '#FFFFFF', background: ['#F96B61', 'red'] })).toThrow()
  })
})
