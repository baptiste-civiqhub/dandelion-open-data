# Deck Dandelion — hackathon Open Data

Deck de présentation de Dandelion en 10 diapositives (16:9), autonome : un fichier HTML, sa feuille de style, son script de navigation et ses images. Export PDF prêt à l'emploi : [`dandelion-pitch.pdf`](dandelion-pitch.pdf).

## Plan

| #   | Diapositive      | Idée                                                                                   |
| --- | ---------------- | -------------------------------------------------------------------------------------- |
| 1   | Titre            | Dandelion : voir, explorer et comprendre la fabrique de la loi.                        |
| 2   | Le problème      | Des milliers d'amendements, aucune vue d'ensemble (217 pour un seul texte).            |
| 3   | La solution      | Un framework de visualisation ; trois avantages : voir, explorer, comprendre.          |
| 4   | L'entrée         | Le jardin du Luxembourg en 3D, au pied du Sénat : un pissenlit par zone thématique.    |
| 5   | La visualisation | Le sunburst « pissenlit » : structure, volume, sort ; zoom, survol, filtres, lien.     |
| 6   | Les données      | API Hémicycle → pipeline → huit tables Supabase → interface.                           |
| 7   | L'IA             | Lecture et comparaison d'amendements par Featherless : une aide, pas une source.       |
| 8   | Démo             | 5 zones, 24 textes, 1 308 amendements, 8 sorts ; le parcours en trois gestes.          |
| 9   | Impact           | Citoyens, journalistes, collaborateurs parlementaires, enseignants ; la suite.         |
| 10  | Clôture          | La vision, le lien de démo et l'équipe (emplacements à compléter avant la soutenance). |

## Présenter

Ouvrir `pitch/index.html` dans un navigateur récent (Chrome ou Edge conseillés : les vignettes sont recadrées avec `object-view-box`). Le deck se met à l'échelle de n'importe quel écran en conservant le 16:9.

| Touche                               | Action                      |
| ------------------------------------ | --------------------------- |
| → · Espace · Entrée · Page suivante  | diapositive suivante        |
| ← · Retour arrière · Page précédente | diapositive précédente      |
| Début · Fin                          | première · dernière         |
| F                                    | plein écran (entrer/sortir) |

L'adresse garde la diapositive courante (`index.html#5`). Des boutons de navigation apparaissent en bas à droite au survol de la souris. La police Inter est chargée depuis Google Fonts : hors ligne, le deck retombe sur la police système.

## Régénérer les assets

Tout se lance depuis la racine du dépôt.

1. **Tokens et pictogramme** (après une modification du design system) :

   ```bash
   node pitch/scripts/build-assets.mjs
   ```

   Produit `assets/tokens.css` (copie de `design-system/tokens/generated.css`, bloc `@theme` exposé en `:root`) et `assets/brand/*.svg` via `renderDandelionSvg` (picto encre, picto clair, icône d'app). Aucune couleur n'est saisie à la main : le deck ne consomme que les variables `--color-*`, `--text-*`, `--spacing-*` et `--radius-*`.

2. **Captures du produit** : lancer l'application (`pnpm dev -p 3004`, Supabase configuré ; clé Featherless dans `.env.local` pour que l'analyse par IA réponde), puis :

   ```bash
   node pitch/scripts/capture-world.mjs
   node pitch/scripts/capture-dataviz.mjs
   ```

   Les scripts pilotent Edge (`PLAYWRIGHT_CHANNEL`, par défaut `msedge`) en français à 1600 × 900 (`BASE_URL`, par défaut `http://localhost:3004`). `capture-world.mjs` produit `jardin.png` (survol d'introduction, palais du Sénat) et `pissenlit.png` (approche d'une zone). `capture-dataviz.mjs` produit `sunburst-plffg.png`, `zoom-article.png`, `fiche-amendement.png`, `ia-widgets.png`, `ia-lecture.png` et `ia-comparaison.png`, puis recompte zones, textes et amendements dans `stats.json` (variable `SKIP_STATS=1` pour sauter ce décompte). Mettre à jour la diapositive 8 si les chiffres changent.

3. **PDF et images des diapositives** :

   ```bash
   node pitch/scripts/export.mjs
   SLIDES_DIR=chemin/vers/dossier node pitch/scripts/export.mjs
   ```

   Le premier écrit `pitch/dandelion-pitch.pdf` (une page de 1920 × 1080 par diapositive) ; le second exporte aussi une image PNG par diapositive. Depuis un navigateur, _Imprimer → Enregistrer en PDF_ donne le même résultat grâce à la feuille d'impression (`@page` 1920 × 1080, marges nulles, arrière-plans activés).

## Fichiers

```
pitch/
├── index.html             # les 10 diapositives
├── dandelion-pitch.pdf    # export PDF
├── assets/
│   ├── deck.css           # mise en page, consomme uniquement les tokens
│   ├── deck.js            # marque et pied de page sur chaque diapositive, navigation, mise à l'échelle
│   ├── tokens.css         # GÉNÉRÉ par build-assets.mjs
│   ├── brand/             # GÉNÉRÉ : pictogramme officiel (renderDandelionSvg)
│   └── captures/          # GÉNÉRÉ : captures du produit et stats.json
└── scripts/               # build-assets, capture-world, capture-dataviz, export
```
