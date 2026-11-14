---
name: nommer
description: Nommer un fichier, un composant, un type, une variable, une clé i18n ou une clé de requête selon les conventions du repo. À utiliser dès qu'un symbole ou un fichier nouveau est créé.
---

# Nommer

Appliquer ces noms au code nouveau. Ne pas renommer le code existant au passage.

1. Fichiers et dossiers : kebab-case (`home-screen.tsx`, `locale-switch.tsx`).
2. Composants React : PascalCase, export nommé, un composant par fichier (`LocaleSwitch`).
3. Variables, fonctions, paramètres, champs de domaine : camelCase (`fullName`, `groupId`).
4. Types, interfaces, enums : PascalCase (`Deputy`, `QueryKeysEnum`).
5. Membres d'enum et constantes de module : `SCREAMING_SNAKE` (`QueryKeysEnum.GET_HEALTH`, `PUBLIC_PATHS.HOME`).
6. Booléens : préfixe `is` ou `has` (`isProduction`).
7. snake_case uniquement pour les colonnes SQL, et seulement dans `apis/*/request.ts` (mapping vers camelCase) et dans les noms de migrations.
8. Clés i18n : camelCase. Clés de requête : `GET_<RESSOURCE>` dans `QueryKeysEnum`.
9. Pas d'abréviation (`dep`, `btn`, `msg`). Variables d'environnement lues via `ENVS` de `configs/env.ts`, jamais un alias local qui masque le nom.
