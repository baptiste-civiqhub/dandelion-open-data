import { notFound } from 'next/navigation'

// Toute URL inconnue sous [locale] rend le not-found localisé (app/[locale]/not-found.tsx).
export default function CatchAllPage() {
  notFound()
}
