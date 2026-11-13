import { createNavigation } from 'next-intl/navigation'

import { routing } from './routing'

// Wrappers des API de navigation Next.js conscients de la configuration de locale.
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing)
