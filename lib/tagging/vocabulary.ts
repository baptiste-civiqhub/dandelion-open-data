import type { ScoredTag, TagDefinition } from './classify'

const tag = (category: string, slug: string, label: string, rule: string): TagDefinition => ({
  category,
  slug,
  label,
  rule
})

export const TAG_VOCABULARY: readonly TagDefinition[] = [
  tag(
    'institutions',
    'institutions',
    'Institutions',
    "L'article modifie la Constitution, l'organisation des pouvoirs publics, le travail des assemblées, la procédure législative ou le statut des parlementaires."
  ),
  tag(
    'institutions',
    'elections',
    'Élections',
    "L'article change le droit de vote, les campagnes, le financement électoral, le découpage, ou le statut, le financement et les obligations des partis politiques."
  ),
  tag(
    'institutions',
    'collectivites',
    'Collectivités',
    "L'article modifie les compétences, les organes ou les relations des communes, départements, régions et intercommunalités, ou applique un régime propre à un territoire d'outre-mer."
  ),
  tag(
    'institutions',
    'fonction-publique',
    'Fonction publique',
    "L'article porte sur le recrutement, la carrière, le statut ou la paie des agents publics, ou sur les conflits d'intérêts, le patrimoine des responsables publics et la transparence de la vie publique."
  ),
  tag(
    'institutions',
    'justice',
    'Justice',
    "L'article modifie l'organisation des juridictions, la procédure civile ou les moyens de la justice."
  ),
  tag(
    'budget',
    'budget',
    "Budget de l'État",
    "L'article ouvre, annule ou répartit une recette ou une dépense du budget de l'État, porte sur l'emprunt public, la charge de la dette ou un plafond d'endettement, ou fixe une trajectoire, un plafond de dépense ou une règle d'équilibre des finances publiques."
  ),
  tag(
    'budget',
    'comptes-sociaux',
    'Comptes sociaux',
    "L'article modifie les recettes ou les dépenses de la Sécurité sociale."
  ),
  tag(
    'budget',
    'fiscalite-menages',
    'Fiscalité des ménages',
    "L'article change l'impôt sur le revenu, le barème, la CSG due par les ménages, l'impôt sur la fortune immobilière, les successions, les donations ou la taxation du capital des particuliers."
  ),
  tag(
    'budget',
    'fiscalite-entreprises',
    'Fiscalité des entreprises',
    "L'article modifie l'imposition des bénéfices, un crédit d'impôt réservé aux entreprises, un taux, une exonération ou l'assiette de la TVA, ou renforce le contrôle, les sanctions et la coopération contre la fraude et l'évasion fiscales."
  ),
  tag(
    'budget',
    'impots-locaux',
    'Impôts locaux',
    "L'article modifie la fiscalité des collectivités ou les dotations que l'État leur verse."
  ),
  tag(
    'travail',
    'emploi',
    'Emploi',
    "L'article crée ou modifie une aide à l'embauche, un contrat aidé, un parcours d'insertion, ou les conditions et le montant de l'allocation chômage."
  ),
  tag(
    'travail',
    'contrat-travail',
    'Contrat de travail',
    "L'article change le CDI, le CDD, le licenciement, la rupture du contrat, la durée du travail, les heures supplémentaires, le repos, le télétravail, le SMIC, un salaire minimum ou les règles de la fiche de paie."
  ),
  tag(
    'travail',
    'formation',
    'Formation professionnelle',
    "L'article concerne l'apprentissage, le compte personnel de formation ou la formation des actifs."
  ),
  tag(
    'travail',
    'retraites',
    'Retraites',
    "L'article change l'âge de départ, la durée de cotisation, le montant ou l'organisation des pensions."
  ),
  tag(
    'travail',
    'relations-professionnelles',
    'Relations professionnelles',
    "L'article porte sur les syndicats, la négociation collective, le droit de grève, les accidents du travail, les maladies professionnelles, la médecine du travail, ou le statut social et la rémunération des travailleurs des plateformes."
  ),
  tag(
    'social',
    'prestations-sociales',
    'Prestations sociales',
    "L'article modifie le RSA, la prime d'activité, un autre minimum social, ou les prestations liées à l'entretien des enfants."
  ),
  tag(
    'social',
    'enfance',
    'Enfance',
    "L'article porte sur les crèches, les assistantes maternelles, le congé parental, l'aide sociale à l'enfance, les mineurs en danger ou l'adoption."
  ),
  tag(
    'social',
    'autonomie',
    'Autonomie',
    "L'article modifie l'allocation, l'emploi ou l'accessibilité des personnes handicapées, ou porte sur la perte d'autonomie, les EHPAD et l'aide à domicile des personnes âgées."
  ),
  tag(
    'social',
    'logement-social',
    'Logement social',
    "L'article concerne les HLM, les aides personnelles au logement, l'hébergement d'urgence, ou la politique de la ville et les quartiers prioritaires."
  ),
  tag(
    'social',
    'egalite',
    'Égalité',
    "L'article porte sur l'égalité professionnelle, la parité, les violences faites aux femmes, ou interdit et répare une discrimination liée à l'origine, la religion, l'orientation sexuelle, l'âge ou un autre critère prohibé."
  ),
  tag(
    'sante',
    'organisation-soins',
    'Organisation des soins',
    "L'article porte sur les hôpitaux, leur budget, leur gouvernance, leurs personnels, ou sur les médecins, infirmiers et autres soignants installés en ville."
  ),
  tag(
    'sante',
    'assurance-maladie',
    'Assurance maladie',
    "L'article modifie les remboursements, les franchises, le panier de soins, ou le prix, l'autorisation et la distribution des médicaments."
  ),
  tag(
    'sante',
    'prevention',
    'Prévention',
    "L'article organise un dépistage, une vaccination, une campagne de santé publique, ou encadre l'alcool, le tabac, les drogues et les jeux d'argent."
  ),
  tag(
    'sante',
    'sante-mentale',
    'Santé mentale',
    "L'article concerne la psychiatrie, le suivi psychologique ou les soins sans consentement."
  ),
  tag(
    'sante',
    'bioethique',
    'Bioéthique',
    "L'article porte sur la PMA, la recherche sur l'embryon, les dons d'organes, une autre limite éthique du soin, l'aide à mourir, les soins palliatifs, les directives anticipées, ou les délais, conditions et accès à l'interruption volontaire de grossesse."
  ),
  tag(
    'savoir',
    'ecole',
    'École',
    "L'article porte sur le primaire, le collège, le lycée, les programmes, l'école privée ou l'éducation prioritaire."
  ),
  tag(
    'savoir',
    'enseignement-superieur',
    'Enseignement supérieur',
    "L'article modifie les études supérieures, les diplômes, les frais d'inscription, les laboratoires publics, leur financement ou le métier de chercheur."
  ),
  tag(
    'savoir',
    'culture',
    'Culture et sport',
    "L'article concerne la création, le spectacle vivant, les musées, les aides aux artistes, le patrimoine, les fédérations, les équipements sportifs ou l'éthique du sport."
  ),
  tag(
    'savoir',
    'medias',
    'Médias',
    "L'article porte sur la presse, l'audiovisuel public ou la régulation de l'information."
  ),
  tag(
    'savoir',
    'numerique',
    'Numérique',
    "L'article encadre la collecte et la protection des données personnelles, les plateformes numériques et leurs obligations de modération, la conception, l'usage ou la responsabilité des systèmes d'intelligence artificielle, ou la sécurité des systèmes d'information."
  ),
  tag(
    'ecologie',
    'climat',
    'Climat',
    "L'article fixe un budget carbone, une obligation de réduction des émissions, une mesure d'adaptation, ou porte sur les inondations, la sécheresse, leur prévention ou leur indemnisation."
  ),
  tag(
    'ecologie',
    'energie',
    'Énergie',
    "L'article porte sur le prix, le marché, le transport ou la régulation de l'énergie, les réacteurs, le combustible, les déchets nucléaires, la sûreté nucléaire, l'éolien, le solaire, l'hydraulique ou le biogaz."
  ),
  tag(
    'ecologie',
    'renovation',
    'Rénovation énergétique',
    "L'article porte sur l'isolation des logements, les passoires thermiques ou les aides aux travaux."
  ),
  tag(
    'ecologie',
    'biodiversite',
    'Biodiversité',
    "L'article protège des espèces, des habitats ou des espaces naturels, ou limite l'artificialisation et la consommation d'espaces naturels et agricoles."
  ),
  tag(
    'ecologie',
    'pollution',
    'Pollution',
    "L'article limite des émissions, des rejets ou des substances toxiques, porte sur le tri, le recyclage, le réemploi ou la responsabilité des producteurs, ou concerne les prélèvements, la qualité, l'assainissement et le prix de l'eau."
  ),
  tag(
    'agriculture',
    'agriculture',
    'Agriculture',
    "L'article modifie le revenu, les normes ou l'installation des agriculteurs, vise l'origine des produits, les importations agricoles, l'autonomie alimentaire, ou les services, le commerce et l'habitat dans les campagnes."
  ),
  tag(
    'agriculture',
    'alimentation',
    'Alimentation',
    "L'article porte sur la sécurité sanitaire, l'étiquetage ou la qualité des aliments, ou encadre les produits phytosanitaires, leur autorisation ou leur interdiction."
  ),
  tag('agriculture', 'peche', 'Pêche', "L'article concerne la pêche professionnelle, les quotas ou l'aquaculture."),
  tag(
    'agriculture',
    'foret',
    'Forêt',
    "L'article porte sur le code forestier, l'exploitation du bois ou les incendies de forêt."
  ),
  tag(
    'agriculture',
    'animaux',
    'Condition animale',
    "L'article protège les animaux d'élevage, de compagnie ou utilisés en expérimentation, ou modifie les périodes, les espèces chassables ou les fédérations de chasse."
  ),
  tag(
    'economie',
    'logement',
    'Logement',
    "L'article porte sur les loyers, la location, la construction privée, l'accession à la propriété, les plans locaux, les permis de construire ou les règles d'aménagement."
  ),
  tag(
    'economie',
    'transports',
    'Transports',
    "L'article concerne le train, le bus, le métro, leurs tarifs, les infrastructures cyclables, la voiture, la route, les péages, le stationnement, les normes des véhicules ou les zones à faibles émissions."
  ),
  tag(
    'economie',
    'entreprises',
    'Entreprises',
    "L'article modifie la création, la gouvernance, la transmission ou le droit des sociétés, soutient une filière de production, une relocalisation ou un site industriel, ou porte sur les ententes, les abus de position dominante et les fusions."
  ),
  tag(
    'economie',
    'commerce',
    'Commerce',
    "L'article porte sur les magasins, leurs horaires, les soldes, les zones commerciales, ou protège l'acheteur, encadre une pratique commerciale ou le crédit à la consommation."
  ),
  tag(
    'economie',
    'banques',
    'Banques',
    "L'article régule les banques, l'épargne, le crédit ou les marchés financiers."
  ),
  tag(
    'securite',
    'police',
    'Police',
    "L'article porte sur les pouvoirs, les moyens ou les missions de la police et de la gendarmerie, ou sur les services de renseignement, leurs techniques et le secret-défense."
  ),
  tag(
    'securite',
    'penal',
    'Droit pénal',
    "L'article définit une infraction, une peine ou une règle de procédure pénale, y compris en matière de terrorisme, ou porte sur les établissements pénitentiaires, l'aménagement des peines et les alternatives à la prison."
  ),
  tag(
    'securite',
    'immigration',
    'Immigration',
    "L'article change les visas, le séjour, l'asile, l'éloignement ou la nationalité."
  ),
  tag(
    'securite',
    'libertes',
    'Libertés',
    "L'article restreint ou garantit une liberté fondamentale ou un régime d'état d'urgence, ou précise les signes religieux, la neutralité des agents et le régime des cultes dans un cadre public."
  ),
  tag(
    'securite',
    'international',
    'International',
    "L'article transpose le droit de l'Union, organise la relation avec ses institutions, autorise un traité, une politique étrangère, l'aide au développement, ou porte sur les armées, les opérations militaires et l'industrie d'armement."
  )
]

export const OTHER_TAG: TagDefinition = tag(
  'autre',
  'autre',
  'Autre',
  "Aucun des sujets du vocabulaire ne s'applique à l'article."
)

export const withOtherFallback = (tags: readonly ScoredTag[]): ScoredTag[] =>
  tags.length > 0 ? [...tags] : [{ slug: OTHER_TAG.slug, confidence: null }]
