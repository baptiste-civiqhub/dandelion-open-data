# Intégration API / Atlas / fleur — 14 novembre 2026

Branche isolée `codex/atlas-api-integration`, issue de `codex/team-integration` bcb72f3, fusion du contrat Atlas/Area/monde d419fa9. Français par défaut. Aucun changement en production, aucune migration exécutée.

- Préserver les parcours PFAS, municipal, comparaison et assistant existants.
- Raccorder les résumés R5 à la fleur sans classifier des textes pas encore chargés ; couleurs = sorts.
- Charger R7 uniquement pour les fiches/comparaisons demandées ; conserver les URL fournies, signaler les absences.
- Distinguer les zones vides de démonstration, les corpus archivés et les données servies par l'API.
- Tester structure, normalisation, pagination, fiches, comparaison, navigation et erreurs ; exécuter les contrôles du dépôt.
- Vérifier à nouveau le push du jeu avant livraison. Ne pas présenter le contrat de scène vide comme un jeu.
- Vérification réelle Supabase conditionnée à une clé publiable ; aucun secret serveur requis.
