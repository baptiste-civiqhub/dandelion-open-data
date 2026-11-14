# Un cas PLFSS vérifié pour le parcours de l’équipe

État du 14 novembre 2026. Données disponibles, pas encore intégrées au jeu de voiture de Valentin. L’assistant PFAS est un banc d’intégration distinct.

## Question démontrable

« Quel vote a avancé la date prévue du congé supplémentaire de naissance ? » Cette formulation est un exemple éditorial ; aucun entretien utilisateur ne l’a validée.

Dans le PLFSS 2026 en **nouvelle lecture**, l’amendement AN n° 346 au texte 2141 remplace le 1er janvier 2027 par le 1er janvier 2026 à l’alinéa 127 de l’article 42. Le scrutin 4662 porte sur cet amendement **et des amendements identiques** : 132 pour, 77 contre et 7 abstentions. Le scrutin est daté du 5 décembre 2025 ; le sort de l’amendement est enregistré après minuit, le 6 décembre. Ce résultat historique ne suffit pas à établir les modalités actuelles du congé.

Sources primaires : [amendement](https://www.assemblee-nationale.fr/dyn/17/amendements/2141/AN/346), [scrutin](https://www.assemblee-nationale.fr/dyn/17/scrutins/4662). Le dossier figure aussi dans la [chronologie du Sénat](https://www.senat.fr/travaux-parlementaires/textes-legislatifs/la-loi-en-clair/projet-de-loi-de-financement-de-la-securite-sociale-pour-2026.html).

## Données prêtes à consommer

- `data/plfss/naissance-evidence.json` : question, scrutin, amendement, document, agrégats par groupe, liens, limites et registre des jointures.
- `data/plfss/evidence/` : six réponses publiques Hémicycle et six fichiers de provenance (requête, date et SHA-256). Aucune clé ni donnée de compte.
- `python3 scripts/build-plfss-evidence.py` : reconstruit le JSON après vérification des empreintes, de la pagination, des identités, des dates des groupes et des totaux.

Les votes sont chargés en deux pages, 200 puis 17. **Attention : `tronque: false` n’exclut pas une page suivante ; vérifier aussi `decalage_suivant`.** Les 217 lignes contiennent 216 participants et un non-votant explicite. Chaque votant apparaît une seule fois ; tous les `scrutin_ref` et `groupe_ref` se résolvent. Les totaux concordent avec le scrutin Hémicycle et sa page officielle. Hémicycle redistribue ici la même source Assemblée : il ne s’agit pas de deux mesures indépendantes.

L’amendement est résolu par `(ref_texte_legislatif, organe_examen, numero)`, puis son UID. Le numéro 346 seul renvoie deux lignes : **346 en séance** et **AS346 en commission**, sur des sujets distincts. Le lien de la page officielle du scrutin désigne la première ; la séance concorde. Le document est joint par `amendements.ref_texte_legislatif = documents.uid`, et porte le dossier `DLR5L17N52922`.

## Affichage correct des groupes

Les douze groupes ayant une ligne dans ce scrutin possèdent des effectifs calculés, pas estimés. Dénominateur de `supportShareAmongParticipants` : `pour + contre + abstentions` dans le groupe. Afficher le nombre de participants à côté du pourcentage. Ce ratio n’est pas le soutien de tous les membres du groupe.

Ce corpus **ne contient pas la liste complète des 577 sièges ni des absents**. Une vue à un point par participant peut utiliser les 216 votes ; un hémicycle complet exige un jeu de mandats et d’appartenances à la date du scrutin. Ne pas compléter avec des effectifs approximatifs. Les rectifications de vote annoncées a posteriori ne changent pas les totaux officiels.

## Intégration au jeu ou à la fleur

Le lieu « maternité » peut ouvrir cette fiche puis mettre en évidence le scrutin et les barres par groupe. Les sources restent accessibles pendant l’animation. Un mode direct avec boutons offre le même résultat sans conduire la voiture. Le raccordement du jeu doit se faire sur son code publié, sans remplacer le travail visuel de l’équipe.

Pour répondre à « ai-je droit au congé aujourd’hui ? », ajouter la loi promulguée, les décrets et une source administrative à jour. Tant que ce chaînage manque, afficher la limite et orienter vers le service officiel ; ne pas déduire une éligibilité individuelle de ce seul vote.

Licence des données : [Licence Ouverte Etalab](https://data.assemblee-nationale.fr/licence-ouverte-open-licence). Les archives conservent les métadonnées du fournisseur.
