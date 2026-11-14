# Évaluation du prototype PFAS et revue distante

Le prototype sert une tâche précise : préparer une note sourcée en retrouvant le contexte, les différences de texte et le sort d'amendements. Il n'évalue ni les intentions des élus, ni l'effet économique ou environnemental d'une loi.

## Ce que les tests peuvent établir

- Fidélité du corpus : 32 lignes, provenance et empreinte, 17 lignes sous Article 1er dont le sous-amendement 32.
- Relation documentée : 32 → 14, confirmée dans la page officielle archivée.
- Comparaison : les mots « utilisant des fluoropolymères » distinguent 27 de 26 ; le sort des deux reste « Retiré ».
- Parcours : consultation, sélection de deux amendements, export, clavier, largeur de 375 px, accueil inchangé.
- Cas d'échec : une comparaison qui dépasse la limite est annoncée indisponible ; une note de l'ancienne sélection n'est plus présentée comme celle de la sélection courante.

Les tests ne prouvent pas un gain de temps utilisateur, une compréhension juridique correcte ou la conformité réglementaire globale.

## Petit benchmark utilisateur à mener sur place

Prévoir 4 à 6 personnes si le temps le permet. Ce sera une observation descriptive, pas une estimation représentative. Une personne ne doit pas refaire exactement la même tâche avec l'autre outil après avoir appris sa réponse.

Répartir aléatoirement les participants entre deux groupes : l'un utilise la liste officielle du Sénat ou un tableur filtrable du CSV, l'autre le prototype. Donner les mêmes consignes, le même accès aux sources et le même temps maximal de 180 secondes par tâche. Conserver les échecs et interruptions.

| Tâche                                  | Réponse attendue                                                                        | Erreur critique                                                                     |
| -------------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Retrouver le parent de 32 et sa preuve | 14, avec la source officielle du sous-amendement 32                                     | Parent inventé ou absence de preuve                                                 |
| Comparer les dispositifs 26 et 27      | 27 ajoute « utilisant des fluoropolymères » au passage sur les textiles de construction | Textes déclarés identiques ou conclusion sur un effet écologique réel               |
| Retrouver le sort de 26 et une source  | « Retiré », URL officielle de 26                                                        | « Rejeté », « Adopté », ou effet dans le droit en vigueur déduit du seul amendement |

Utiliser la fiche vide de [pfas-mvp.md](pfas-mvp.md). Mesurer temps, réussite, erreurs critiques et source correctement citée. Rapporter les résultats individuels et les médianes des tâches réussies avec leur effectif ; ne pas masquer les échecs derrière une moyenne. Noter les différences d'expérience préalable entre groupes.

Phrase de pitch possible après mesure seulement : « Sur N participants et ces trois tâches, X/Y réponses sourcées correctes ; temps observés de … avec le prototype et … avec la liste. » Si l'échantillon est trop petit ou déséquilibré, montrer les observations brutes et éviter un pourcentage de gain.

## Revue distante proposée à François

Mission facultative, indépendante du développement, à confirmer selon les règles de composition d'équipe. Aucun accès en écriture à la base, à la branche ou au déploiement n'est nécessaire.

Entrées : la PR, les trois pages officielles 26/27/32, le manifeste, une capture du parcours et une note exportée. Sortie : un fichier de revue ou des observations transmises à Wilfred pour synchronisation, avec cas, résultat attendu, résultat observé, preuve et sévérité.

Vérifier en priorité :

1. Le sort « Retiré » reste distinct de « Rejeté » et d'une décision applicable aujourd'hui.
2. Les extraits, sources et relation parent/enfant sont cohérents entre écran et export.
3. La présentation n'invente pas une causalité, une intention politique, une certification ou un gain utilisateur non mesuré.
4. Une source absente, une comparaison trop longue ou un résultat négatif restent visibles et compréhensibles.
5. Le parcours est compréhensible sans connaître notre architecture.

Suzan AI peut servir d'outil de revue si François dispose du cadre et des accès appropriés. Son résultat doit être décrit comme une revue ou une évaluation de ce périmètre, avec méthode et limites ; pas comme une certification générale de l'application. Le code existant effectue une comparaison déterministe, sans génération LLM dans le parcours PFAS.

## Intégration à Séléné

L'arborescence actuelle est une base fonctionnelle. Le graphe pourra consommer les mêmes identifiants et relations sourcées. La comparaison et l'export restent réutilisables ; leur logique pure est dans `features/pfas-amendments/lib/`, leur frontière de données dans `apis/pfas-amendments/request.ts`. Conserver un accès clavier et une vue lisible lorsque la représentation graphique sera ajoutée.
