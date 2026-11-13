/**
 * Manrope variable webfont, self-hosted via next/font/local.
 *
 * Upstream file (bytes unchanged, renamed without brackets):
 * https://raw.githubusercontent.com/googlefonts/manrope/468c0dbe38efa331b80bfe9448256abe27be44c3/fonts/webfonts/Manrope%5Bwght%5D.woff2
 * Commit: 468c0dbe38efa331b80bfe9448256abe27be44c3
 * sha256: 30b83738add8c9edd9e3450b98036a9a8fb5668d0cbd4eb0ce5fe6761197f21f
 *
 * License: fonts/manrope/OFL.txt, copied from the same commit.
 */
import localFont from 'next/font/local'

export const ManropeFont = localFont({
  src: './manrope/Manrope-Variable.woff2',
  weight: '400 700',
  style: 'normal',
  display: 'swap',
  variable: '--font-manrope'
})
