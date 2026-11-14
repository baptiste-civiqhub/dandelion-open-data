---
name: traduire-l-interface
description: Rendre traduisible tout texte visible (JSX, aria-label, alt, placeholder, title, toast, metadata, message Zod) dans les catalogues en et fr de next-intl. À utiliser dès qu'un libellé utilisateur est ajouté ou modifié, ou dès qu'on touche au bouton de langue.
---

# Traduire l'interface

L'interface est en anglais. `fr` est le catalogue secondaire, mêmes clés. Aucune chaîne utilisateur en dur.

## Quand une chaîne apparaît

1. Namespace = dossier de feature (`home`, `localeSwitch` pour le bouton de langue, `notFound`…). Une feature, un namespace.
2. Clé en camelCase (`backHome`, `metaTitle`). Rédiger d'abord la valeur anglaise dans `i18n/messages/en.json`, puis la française dans `fr.json`. Le test `i18n/messages/messages.test.ts` exige la parité exacte des clés.
3. Lire la chaîne avec `useTranslations('namespace')` dans un composant (serveur ou client) ou `await getTranslations({ locale, namespace })` pour les metadata et le code serveur async.
4. Un composant du design system (`components/ui`, `components/brand`, `components/shared`) n'appelle pas `useTranslations`. Il reçoit le libellé déjà traduit en prop.
5. Messages Zod = clés i18n, pas des phrases.
6. Ne pas traduire les `Error(...)` de `lib/` et `services/` (messages développeur) ni le contenu open data renvoyé par la source.

## Bouton de langue

- Même URL (`localePrefix: 'never'`). Anglais par défaut.
- `localeDetection: true` pour que le cookie `NEXT_LOCALE` soit lu. Le middleware force `accept-language` à `en` : un navigateur français n'impose pas le français.
- Basculer avec `useRouter` et `usePathname` de `@/i18n/navigation` : `router.replace(pathname, { locale })`.
- Libellés du bouton dans le namespace `localeSwitch`, jamais en dur.

## Vérifier

`pnpm check`. La page se consulte sans préfixe (`http://localhost:3000/...`).
