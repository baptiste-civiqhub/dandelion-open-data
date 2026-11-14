# Alignements réels : pjl18-677, de `03_1erelecture_senat_hemicycle` à `05_1erelecture_assemblee_commission`

Données : La Fabrique de la Loi (Regards Citoyens), licence ODbL. Textes officiels : liens ci-dessous. Labels calculés par `build_dataset.py` d'après le statut et `n_diff` de `articles_etapes.json`.

- Version k : https://www.senat.fr/leg/tas19-008.html (API : https://www.lafabriquedelaloi.fr/api/pjl18-677/procedure/03_1erelecture_senat_hemicycle/texte/texte.json)
- Version k+1 : http://www.assemblee-nationale.fr/dyn/opendata/PRJLANR5L15BTC2401.html (API : https://www.lafabriquedelaloi.fr/api/pjl18-677/procedure/05_1erelecture_assemblee_commission/texte/texte.json)
- Observations sur cette transition : 122

Un changement lexical ne prouve pas un changement de fond : chaque exemple est à relire sur les deux sources.

## inchange (29 cas sur cette transition)

- Article : `11`, label `inchange`, n_diff à k+1 : 0.0000

Avant (k) :

> Après l'article L. 5211-39-1 du code général des collectivités territoriales, il est inséré un article L. 5211-39-2 ainsi rédigé : / "Art. L. 5211-39-2. - En cas de rattachement d'une commune à un établissement public de coopération intercommunale à fiscalité propre dans les conditions prévues à l'article L. 5210-1-2, de création d'un tel établissement par partage dans les conditions prévues à l'article L. 5211-5-1 A [...]

Après (k+1) :

> Après l'article L. 5211-39-1 du code général des collectivités territoriales, il est inséré un article L. 5211-39-2 ainsi rédigé : / "Art. L. 5211-39-2. - En cas de rattachement d'une commune à un établissement public de coopération intercommunale à fiscalité propre dans les conditions prévues à l'article L. 5210-1-2, de création d'un tel établissement par partage dans les conditions prévues à l'article L. 5211-5-1 A [...]

## modifie_mineur (n_diff < 0,02) (8 cas sur cette transition)

- Article : `35`, label `modifie`, n_diff à k+1 : 0.0019

Avant (k) :

> Le chapitre III du titre VII du livre V de la deuxième partie du code général des collectivités territoriales est ainsi modifié : / 1° Après le IV de l'article L. 2573-19, il est inséré un IV bis ainsi rédigé : / "IV bis. - Pour l'application de l'article L. 2213-6, la seconde phrase est supprimée." ; / 2° L'article L. 2573-50 est ainsi rédigé : / "Art. L. 2573-50. - Pour son application en Polynésie française, l'art [...]

Après (k+1) :

> Le chapitre III du titre VII du livre V de la deuxième partie du code général des collectivités territoriales est ainsi modifié : / 1° Après le IV de l'article L. 2573-19, il est inséré un IV bis ainsi rédigé : / "IV bis. - Pour l'application de l'article L. 2213-6, la seconde phrase est supprimée." ; / 2° L'article L. 2573-50 est ainsi rédigé : / "Art. L. 2573-50. - Pour son application en Polynésie française, l'art [...]

Différence par alinéa (extrait) :

```diff
-""Le tarif peut être modulé en fonction de la durée du stationnement. Il peut prévoir également une tranche gratuite pour une durée déterminée. L'acte instituant la redevance peut prévoir une tarification spécifique pour certaines catégories d'usagers et notamment les résidents.""
+""Le tarif peut être modulé en fonction de la durée du stationnement. Il peut prévoir également une tranche gratuite pour une durée déterminée. L'acte instituant la redevance peut prévoir une tarification spécifique pour certaines catégories d'usagers, notamment les résidents.""
```

## modifie_important (n_diff >= 0,3) (21 cas sur cette transition)

- Article : `5`, label `modifie`, n_diff à k+1 : 0.8464

Avant (k) :

> I. - Le chapitre Ier du titre II de la loi n° 2015-991 du 7 août 2015 portant nouvelle organisation territoriale de la République est ainsi modifié : / 1° Le IV de l'article 64 est abrogé ; / 2° Le II de l'article 66 est abrogé. / II. - L'article 1er de la loi n° 2018-702 du 3 août 2018 relative à la mise en oeuvre du transfert des compétences eau et assainissement aux communautés de communes est abrogé. / III. - Lor [...]

Après (k+1) :

> I. - L'article 1er de la loi n° 2018-702 du 3 août 2018 relative à la mise en oeuvre du transfert des compétences eau et assainissement aux communautés de communes est ainsi modifié : / 1° À la première phrase du premier alinéa, après le mot : "assainissement", sont insérés les mots : "ou qui exerce en partie seulement, sur tout ou partie du territoire de ces communes, l'une ou l'autre de ces compétences" et la date  [...]

Différence par alinéa (extrait) :

```diff
-I. - Le chapitre Ier du titre II de la loi n° 2015-991 du 7 août 2015 portant nouvelle organisation territoriale de la République est ainsi modifié :
-1° Le IV de l'article 64 est abrogé ;
-2° Le II de l'article 66 est abrogé.
-II. - L'article 1er de la loi n° 2018-702 du 3 août 2018 relative à la mise en oeuvre du transfert des compétences eau et assainissement aux communautés de communes est abrogé.
-III. - Lorsqu'une commune transfère l'ensemble des compétences relatives à l'eau qu'elle exerce à un établissement public de coopération intercommunale à fiscalité propre, la commune transmet le schéma de distribution d'eau potable mentionné à l'article L. 2224-7-1 du code général des collectivités
-Lorsque le schéma fait apparaître un taux de perte en eau supérieur au taux mentionné au deuxième alinéa du même article L. 2224-7-1, le transfert de compétence s'accompagne du transfert du solde positif du budget annexe du service d'eau à l'établissement public de coopération intercommunale, sauf 
```

## supprime (27 cas sur cette transition)

- Article : `11_bis_C`, label `supprime`, n_diff à k+1 : 0.0000

Avant (k) :

> La section 5 du chapitre Ier du titre IV du livre Ier du code électoral est complétée par un article L. 247-1 ainsi rédigé : / "Art. L. 247-1. - Dans les communes de moins de 3 500 habitants, une nuance politique ne peut être attribuée que lorsque la liste de candidats ou les candidats ont choisi une étiquette politique."

Après (k+1) :

> (article absent ou supprimé dans la version k+1)

Différence par alinéa (extrait) :

```diff
-La section 5 du chapitre Ier du titre IV du livre Ier du code électoral est complétée par un article L. 247-1 ainsi rédigé :
-"Art. L. 247-1. - Dans les communes de moins de 3 500 habitants, une nuance politique ne peut être attribuée que lorsque la liste de candidats ou les candidats ont choisi une étiquette politique."
```

## supprime_suspect_renum_ou_fusion (4 cas sur cette transition)

- Article : `11_quater`, label `supprime`, n_diff à k+1 : 0.0000

Avant (k) :

> Le I de l'article L. 5211-43 du code général des collectivités territoriales est ainsi modifié : / 1° Au début du 1°, le taux : "40 %" est remplacé par le taux : "50 %" ; / 2° Au début du 2°, le taux : "40 %" est remplacé par le taux : "30 %".

Après (k+1) :

> (article absent ou supprimé dans la version k+1)

Différence par alinéa (extrait) :

```diff
-Le I de l'article L. 5211-43 du code général des collectivités territoriales est ainsi modifié :
-1° Au début du 1°, le taux : "40 %" est remplacé par le taux : "50 %" ;
-2° Au début du 2°, le taux : "40 %" est remplacé par le taux : "30 %".
```

## non_apparie (0 cas sur cette transition)

Aucun cas sur cette transition.

## Audit manuel du cas suspect `11_quater` (14 novembre 2026)

- Le texte de la commission de l'Assemblée (version k+1) liste encore l'intitulé « 11 quater » : l'article y figure comme supprimé, il n'a pas été renuméroté.
- Aucun article de la version k+1 ne vise l'article L. 5211-43 du code général des collectivités territoriales (recherche dans `texte.json`).
- `articles_etapes.json` montre la suite : `sup` en commission de l'Assemblée, puis `new` en CMP avec la même longueur (239 caractères), puis inchangé. Suppression réelle, rétablie en CMP.
- Le signal venait d'une coïncidence de longueur avec l'article créé `17_ter` (236 caractères). Conclusion : faux positif. Le taux de suppressions « suspectes » mesuré par l'heuristique de longueur surestime les renumérotations ; il faut un appariement sur le texte.
- Leçon pour la cible : une suppression n'est pas définitive. Sur ce dossier, l'article supprimé à l'Assemblée revient en CMP. Une alerte « supprimé » doit le dire.
