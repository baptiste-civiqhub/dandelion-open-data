# Vidéo Dandelion / Séléné — scénario de travail

Statut : scénario proposé pour une vidéo de 75 secondes. La capture automatique montre le prototype réel ; elle constitue une matière de montage, pas une vidéo finale. Voix française et sous-titres proposés pour le hackathon, interface expérimentale et extraits officiels en français.

## Une promesse

« Retrouver, comparer et citer les amendements qui vous concernent. » Une association environnementale prépare une note sur les PFAS. Le résultat utile est une comparaison vérifiable et exportable.

| Temps   | Écran                                                         | Narration proposée                                                                                                                                                                                                                                           |
| ------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0–8 s   | Titre sobre, puis les amendements d'un article                | « Une association veut comprendre les propositions sur les PFAS. Les textes sont publics. Les relier et les comparer prend du travail. »                                                                                                                     |
| 8–19 s  | Déplier Article 1er ; ouvrir 32 et son lien vers 14           | « Dandelion replace chaque amendement dans son contexte. Ici, le 32 modifie le 14 : le lien est vérifiable sur la source officielle. »                                                                                                                       |
| 19–43 s | Capture réelle : sélectionner 26 et 27, cadrer la comparaison | « Ces deux amendements se ressemblent. Mais le second ajoute “utilisant des fluoropolymères”. L'outil rend l'écart visible et conserve les textes complets. Les deux propositions ont été retirées. »                                                        |
| 43–54 s | Source officielle, puis export de la note                     | « On peut consulter la source et emporter une note avec les textes, leur sort et la provenance des données. »                                                                                                                                                |
| 54–66 s | Preuve adaptée aux résultats effectivement obtenus            | Sans étude utilisateur : « Le prototype utilise un corpus daté de 32 amendements du Sénat. La comparaison est lexicale ; elle ne simule pas les effets de la loi. » Avec étude : remplacer par une mesure descriptive réelle, son effectif et son protocole. |
| 66–75 s | Marque Dandelion, parcours visible, URL de démo si disponible | « Comprendre les différences. Vérifier les sources. Préparer le débat. »                                                                                                                                                                                     |

## Direction visuelle

- Typographie Inter, fonds clairs, accents et pictogramme du design system existant. Le logo reste dans sa géométrie officielle.
- Un lien se dessine pour expliquer la relation article → amendement → sous-amendement, puis un recadrage conduit aux deux textes. Si cette animation ne correspond pas à une interaction implémentée, l'identifier comme schéma explicatif.
- Surlignages courts, plans lisibles, sous-titres synchronisés, transitions discrètes. La capture centrale reste assez longue pour lire la différence.
- Composition possible avec Remotion et FFmpeg, selon le montage déjà utilisé pour Calligraphe. DemoDSL peut automatiser les séquences lorsque les sélecteurs de l'interface sont stabilisés.

## Matière à enregistrer

Le script `scripts/record-pfas-demo.mjs` enregistre le parcours sans modifier la page ni ses données. Il conserve un WebM brut, des captures et la note réellement téléchargée. Une deuxième visite au même écran remet la sélection à zéro entre la démonstration du parent et celle de la comparaison.

```bash
# Après pnpm build, dans un terminal :
pnpm exec next start --hostname localhost --port 3100
# Dans un autre terminal, Chrome installé :
node scripts/record-pfas-demo.mjs http://localhost:3100
```

Le binaire vidéo de Playwright peut être installé une fois avec `pnpm exec playwright install ffmpeg`. Aucun compte ni secret n'est requis. Le dossier de sortie par défaut est `test-results/pfas-demo` (ignoré par Git) ; un second argument permet de choisir un autre dossier local.

## Avant montage final

1. Figer le commit et la sélection d'amendements ; refaire une capture si l'interface change.
2. Vérifier les 26/27 et 32/14 sur les sources. Afficher « Sénat, 2024 » pendant la démo ; la date de récupération de l'export n'est pas celle du débat.
3. Le script capture désormais le graphe React/SVG, sa sélection et la comparaison liées. Ne pas le présenter comme un calcul de Séléné ; refaire la capture si le moteur graphique change.
4. Reprendre uniquement les chiffres issus de [l'évaluation](pfas-evaluation.md). Ne pas présenter les tests automatiques comme une étude de gain de temps.
5. Vérifier lisibilité à 1080p, synchronisation des sous-titres, niveau de voix et durée imposée par l'événement avant l'export final.
