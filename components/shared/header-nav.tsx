'use client'

import type { ComponentProps } from 'react'

import { cva } from 'class-variance-authority'

import { Link, usePathname } from '@/i18n/navigation'
import { isActivePath } from '@/lib/navigation/is-active-path'
import { cn } from '@/lib/utils'

/** Liste de liens du header. `label` nomme le repère de navigation pour les lecteurs d'écran (déjà traduit). */
export function HeaderNav({ label, className, children, ...props }: ComponentProps<'nav'> & { label: string }) {
  return (
    <nav aria-label={label} data-slot='header-nav' className={className} {...props}>
      <ul className='flex items-center gap-1'>{children}</ul>
    </nav>
  )
}

const linkVariants = cva(
  'focus-visible:ring-ring/50 inline-flex h-9 items-center rounded-full px-3 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-3',
  {
    variants: {
      active: {
        true: 'bg-secondary text-foreground',
        false: 'text-muted-foreground hover:text-foreground hover:bg-secondary'
      }
    },
    defaultVariants: { active: false }
  }
)

type HeaderNavLinkProps = Omit<ComponentProps<typeof Link>, 'href'> & { href: string }

/**
 * Lien du header. Actif sur sa page et ses sous-pages (`isActivePath`) : fond `secondary` et `aria-current='page'`,
 * l'état n'est donc jamais porté par la seule couleur du texte.
 */
export function HeaderNavLink({ href, className, ...props }: HeaderNavLinkProps) {
  const active = isActivePath(usePathname(), href)

  return (
    <li>
      <Link
        href={href}
        aria-current={active ? 'page' : undefined}
        data-slot='header-nav-link'
        className={cn(linkVariants({ active }), className)}
        {...props}
      />
    </li>
  )
}
