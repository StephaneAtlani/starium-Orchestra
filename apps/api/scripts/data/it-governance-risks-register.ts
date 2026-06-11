/**
 * Registre risques SI / gouvernance IT — import production.
 * Source : matrice EBIOS simplifiée (domaines métier + scénarios « Si X alors Y »).
 */
export type RiskRegisterSeedRow = {
  category: string;
  domainCode: string;
  typeCode: string;
  fearedEvent: string;
  threatSource: string;
  description: string;
  businessImpact: string;
  impact: number;
  probability: number;
  existingSecurityMeasures: string;
  mitigationPlan: string;
  effort: 'Faible' | 'Moyen';
};

export const IT_GOVERNANCE_RISKS_REGISTER: RiskRegisterSeedRow[] = [
  {
    category: 'Applications et Données',
    domainCode: 'DATA',
    typeCode: 'DATA_LOSS',
    fearedEvent: 'Perte définitive de données critiques',
    threatSource: 'Panne technique, erreur humaine, cyberattaque',
    description:
      'Si les sauvegardes ne sont pas externalisées ou restaurables, alors une panne ou attaque peut entraîner une perte durable de données métier.',
    businessImpact: 'Perte durable de données métier critiques pour l’activité.',
    impact: 5,
    probability: 3,
    existingSecurityMeasures: 'Sauvegardes locales, procédures de sauvegarde existantes',
    mitigationPlan:
      'Externaliser les sauvegardes, chiffrer les copies, tester régulièrement les restaurations',
    effort: 'Moyen',
  },
  {
    category: 'Applications et Données',
    domainCode: 'DATA',
    typeCode: 'DATA_INCONSISTENCY',
    fearedEvent: 'Indisponibilité ou incohérence des données entre systèmes',
    threatSource: 'Obsolescence applicative, dette technique',
    description:
      'Si les bases héritées ne sont pas compatibles avec les systèmes modernes, alors les échanges de données peuvent échouer ou produire des erreurs métier.',
    businessImpact: 'Erreurs métier et rupture des échanges de données entre systèmes.',
    impact: 4,
    probability: 4,
    existingSecurityMeasures: 'Interfaces existantes, traitements manuels de correction',
    mitigationPlan:
      'Cartographier les dépendances, tester l’interopérabilité, planifier la modernisation',
    effort: 'Moyen',
  },
  {
    category: 'Applications et Données',
    domainCode: 'DATA',
    typeCode: 'DATA_CORRUPTION',
    fearedEvent: 'Perte ou altération de données critiques',
    threatSource: 'Défaillance système, erreur d’exploitation',
    description:
      'Si un système critique tombe en panne sans mécanisme de sauvegarde fiable, alors les données nécessaires à l’activité peuvent être perdues ou corrompues.',
    businessImpact: 'Données critiques perdues ou corrompues, activité perturbée.',
    impact: 5,
    probability: 3,
    existingSecurityMeasures: 'Sauvegardes périodiques',
    mitigationPlan:
      'Mettre en place une stratégie 3-2-1, définir RPO/RTO, tester les restaurations',
    effort: 'Moyen',
  },
  {
    category: 'Applications et Données',
    domainCode: 'IT',
    typeCode: 'OTHER_IT_RISK',
    fearedEvent: 'Mauvaise priorisation en cas d’incident applicatif',
    threatSource: 'Organisation interne, manque de gouvernance',
    description:
      'Si les applications critiques ne sont pas cartographiées, alors les équipes peuvent restaurer ou traiter les mauvais systèmes en priorité.',
    businessImpact: 'Retard de reprise et aggravation d’incidents sur des applications critiques.',
    impact: 4,
    probability: 3,
    existingSecurityMeasures: 'Connaissance informelle des équipes',
    mitigationPlan:
      'Créer une cartographie applicative avec criticité, propriétaires et dépendances',
    effort: 'Faible',
  },
  {
    category: 'Applications et Données',
    domainCode: 'DATA',
    typeCode: 'DECISION_ON_INVALID_DATA',
    fearedEvent: 'Décision erronée liée à des données de mauvaise qualité',
    threatSource: 'Erreur humaine, processus non maîtrisé',
    description:
      'Si les données de référence sont incomplètes ou incohérentes, alors les décisions métier peuvent être prises sur des informations fausses.',
    businessImpact: 'Décisions métier prises sur des informations erronées.',
    impact: 4,
    probability: 4,
    existingSecurityMeasures: 'Contrôles ponctuels',
    mitigationPlan:
      'Mettre en place une gouvernance de la donnée, règles de qualité, contrôles automatisés',
    effort: 'Moyen',
  },
  {
    category: 'Applications et Données',
    domainCode: 'DATA',
    typeCode: 'DATA_ACCESS_ERROR',
    fearedEvent: 'Accès illégitime à des données personnelles',
    threatSource: 'Acteur interne, cybercriminel, prestataire',
    description:
      'Si les habilitations ne sont pas maîtrisées, alors un utilisateur ou tiers peut accéder à des données confidentielles sans justification.',
    businessImpact: 'Violation de la confidentialité et exposition RGPD.',
    impact: 5,
    probability: 3,
    existingSecurityMeasures: 'Comptes nominatifs, droits applicatifs partiels',
    mitigationPlan:
      'Revue périodique des droits, principe du moindre privilège, journalisation des accès',
    effort: 'Moyen',
  },
  {
    category: 'Applications et Données',
    domainCode: 'IT',
    typeCode: 'OBSOLESCENCE',
    fearedEvent: 'Maintien d’applications obsolètes ou non maîtrisées',
    threatSource: 'Dette technique, manque de gouvernance',
    description:
      'Si le cycle de vie applicatif n’est pas suivi, alors des applications non maintenues peuvent rester utilisées et exposer l’organisation.',
    businessImpact: 'Exposition accrue via des applications non maintenues.',
    impact: 4,
    probability: 3,
    existingSecurityMeasures: 'Inventaire partiel',
    mitigationPlan:
      'Définir les statuts applicatifs : cible, maintenu, toléré, à retirer',
    effort: 'Faible',
  },
  {
    category: 'Conformité et Réglementation',
    domainCode: 'LEGAL_COMPLIANCE',
    typeCode: 'DOCUMENTATION_GAP',
    fearedEvent: 'Incapacité à démontrer la maîtrise des processus critiques',
    threatSource: 'Régulateur, auditeur, erreur interne',
    description:
      'Si les processus critiques ne sont pas documentés, alors l’organisation ne peut pas prouver leur maîtrise en cas d’audit ou d’incident.',
    businessImpact: 'Impossibilité de démontrer la maîtrise en audit ou incident.',
    impact: 3,
    probability: 2,
    existingSecurityMeasures: 'Documentation partielle',
    mitigationPlan:
      'Standardiser la documentation et définir un responsable par processus',
    effort: 'Faible',
  },
  {
    category: 'Conformité et Réglementation',
    domainCode: 'LEGAL_COMPLIANCE',
    typeCode: 'GDPR_NON_COMPLIANCE',
    fearedEvent: 'Sanction ou mise en demeure liée aux données personnelles',
    threatSource: 'Autorité de contrôle, plainte, audit',
    description:
      'Si les traitements de données personnelles ne respectent pas les obligations légales, alors l’organisation peut subir une sanction ou une atteinte réputationnelle.',
    businessImpact: 'Sanction réglementaire et atteinte réputationnelle.',
    impact: 4,
    probability: 3,
    existingSecurityMeasures: 'Sensibilisation ponctuelle, contrôles internes',
    mitigationPlan:
      'Mettre à jour les traitements, formaliser les bases légales, revoir les durées de conservation',
    effort: 'Moyen',
  },
  {
    category: 'Conformité et Réglementation',
    domainCode: 'LEGAL_COMPLIANCE',
    typeCode: 'GDPR_NON_COMPLIANCE',
    fearedEvent: 'Non-maîtrise des traitements de données personnelles',
    threatSource: 'Organisation interne, DPO, métiers',
    description:
      'Si le registre des traitements est absent ou incomplet, alors l’organisation ne peut pas démontrer sa conformité RGPD.',
    businessImpact: 'Non-démonstration de la conformité RGPD.',
    impact: 4,
    probability: 3,
    existingSecurityMeasures: 'Fichiers ou inventaires partiels',
    mitigationPlan:
      'Créer et maintenir un registre des traitements avec finalité, base légale et responsable',
    effort: 'Faible',
  },
  {
    category: 'Conformité et Réglementation',
    domainCode: 'DATA',
    typeCode: 'GDPR_DATA_RETENTION_ISSUE',
    fearedEvent: 'Conservation excessive ou illicite de données',
    threatSource: 'Erreur humaine, absence de procédure',
    description:
      'Si les données sont conservées au-delà des durées nécessaires, alors l’organisation augmente son exposition juridique et cyber.',
    businessImpact: 'Exposition juridique et cyber accrue.',
    impact: 3,
    probability: 3,
    existingSecurityMeasures: 'Archivage manuel',
    mitigationPlan:
      'Définir une politique de conservation, automatiser les purges, tracer les exceptions',
    effort: 'Faible',
  },
  {
    category: 'Conformité et Réglementation',
    domainCode: 'GOVERNANCE',
    typeCode: 'LACK_OF_AUDIT_TRAIL',
    fearedEvent: 'Absence de preuve en cas d’audit ou litige',
    threatSource: 'Régulateur, auditeur, client',
    description:
      'Si les actions critiques ne sont pas tracées, alors l’organisation ne peut pas démontrer qui a fait quoi, quand et pourquoi.',
    businessImpact: 'Absence de preuve en cas d’audit ou de litige.',
    impact: 4,
    probability: 2,
    existingSecurityMeasures: 'Logs techniques partiels',
    mitigationPlan:
      'Activer les journaux d’audit, centraliser les traces, définir une durée de conservation',
    effort: 'Faible',
  },
  {
    category: 'Conformité et Réglementation',
    domainCode: 'SUPPLIERS',
    typeCode: 'NON_COMPLIANT_CONTRACT',
    fearedEvent:
      'Non-respect des engagements contractuels ou réglementaires par un fournisseur',
    threatSource: 'Fournisseur, sous-traitant',
    description:
      'Si les contrats fournisseurs ne couvrent pas les exigences sécurité, SLA et réversibilité, alors l’organisation peut subir une rupture de service ou une non-conformité.',
    businessImpact: 'Rupture de service ou non-conformité liée à un tiers.',
    impact: 4,
    probability: 3,
    existingSecurityMeasures: 'Contrats existants',
    mitigationPlan:
      'Revue contractuelle annuelle, clauses sécurité, SLA, réversibilité, confidentialité',
    effort: 'Faible',
  },
  {
    category: 'Continuité des Services',
    domainCode: 'CONTINUITY',
    typeCode: 'CRITICAL_SERVICE_UNAVAILABLE',
    fearedEvent: 'Indisponibilité prolongée d’un service critique',
    threatSource: 'Panne, sinistre, erreur d’exploitation',
    description:
      'Si les infrastructures critiques ne sont pas redondées, alors une panne unique peut interrompre durablement l’activité.',
    businessImpact: 'Interruption durable de l’activité.',
    impact: 5,
    probability: 3,
    existingSecurityMeasures: 'Redondance partielle',
    mitigationPlan:
      'Renforcer la redondance, supprimer les points uniques de défaillance',
    effort: 'Moyen',
  },
  {
    category: 'Continuité des Services',
    domainCode: 'CONTINUITY',
    typeCode: 'NO_BCP_PLAN',
    fearedEvent: 'Arrêt prolongé des systèmes critiques',
    threatSource: 'Panne majeure, cyberattaque, sinistre',
    description:
      'Si le PRA n’est pas opérationnel, alors l’organisation ne peut pas reprendre les services dans les délais attendus.',
    businessImpact: 'Reprise des services hors délais attendus.',
    impact: 5,
    probability: 3,
    existingSecurityMeasures: 'Procédures partielles',
    mitigationPlan: 'Formaliser PRA, définir RTO/RPO, organiser des exercices réguliers',
    effort: 'Moyen',
  },
  {
    category: 'Continuité des Services',
    domainCode: 'CONTINUITY',
    typeCode: 'RESILIENCE_TEST_FAILURE',
    fearedEvent: 'Échec de reprise après incident majeur',
    threatSource: 'Organisation interne, manque de tests',
    description:
      'Si le PRA n’est jamais testé, alors les procédures peuvent être inapplicables le jour de la crise.',
    businessImpact: 'Procédures de reprise inapplicables en situation réelle.',
    impact: 5,
    probability: 3,
    existingSecurityMeasures: 'Documentation existante',
    mitigationPlan:
      'Réaliser des tests de restauration et exercices de crise annuels',
    effort: 'Moyen',
  },
  {
    category: 'Continuité des Services',
    domainCode: 'CONTINUITY',
    typeCode: 'SITE_UNAVAILABILITY',
    fearedEvent: 'Perte d’accès aux services hébergés sur un site unique',
    threatSource: 'Sinistre, panne datacenter, fournisseur',
    description:
      'Si les services critiques reposent sur un site unique, alors un incident local peut arrêter l’activité.',
    businessImpact: 'Arrêt de l’activité lié à un site unique.',
    impact: 5,
    probability: 3,
    existingSecurityMeasures: 'Hébergement principal',
    mitigationPlan:
      'Mettre en place une stratégie multi-site, cloud hybride ou solution de secours',
    effort: 'Moyen',
  },
  {
    category: 'Continuité des Services',
    domainCode: 'CONTINUITY',
    typeCode: 'CRISIS_MANAGEMENT_FAILURE',
    fearedEvent: 'Mauvaise coordination en situation de crise SI',
    threatSource: 'Organisation interne, direction, métiers',
    description:
      'Si la procédure de crise SI n’est pas définie, alors les décisions peuvent être lentes, contradictoires ou inadaptées.',
    businessImpact: 'Décisions lentes ou contradictoires en crise SI.',
    impact: 4,
    probability: 3,
    existingSecurityMeasures: 'Contacts informels',
    mitigationPlan:
      'Définir cellule de crise, rôles, escalade, communication interne/externe',
    effort: 'Faible',
  },
  {
    category: 'Continuité des Services',
    domainCode: 'CONTINUITY',
    typeCode: 'RECOVERY_FAILURE',
    fearedEvent: 'Reprise trop lente par rapport aux besoins métier',
    threatSource: 'Panne, défaut de conception, manque de moyens',
    description:
      'Si les RTO/RPO ne sont pas alignés avec les besoins métier, alors la reprise peut être techniquement réussie mais métier inacceptable.',
    businessImpact: 'Reprise techniquement réussie mais inacceptable pour le métier.',
    impact: 5,
    probability: 3,
    existingSecurityMeasures: 'Sauvegardes standards',
    mitigationPlan:
      'Définir RTO/RPO par application et adapter les moyens techniques',
    effort: 'Moyen',
  },
  {
    category: 'Green IT',
    domainCode: 'ENVIRONMENTAL',
    typeCode: 'CLIMATE_IMPACT',
    fearedEvent: 'Surconsommation énergétique du SI',
    threatSource: 'Infrastructure obsolète, exploitation non optimisée',
    description:
      'Si les serveurs fonctionnent en continu sans optimisation, alors les coûts et l’empreinte environnementale augmentent.',
    businessImpact: 'Hausse des coûts et de l’empreinte environnementale.',
    impact: 3,
    probability: 2,
    existingSecurityMeasures: 'Virtualisation partielle',
    mitigationPlan:
      'Optimiser la consolidation, moderniser les équipements énergivores',
    effort: 'Faible',
  },
  {
    category: 'Green IT',
    domainCode: 'IT',
    typeCode: 'PERFORMANCE_DEGRADATION',
    fearedEvent: 'Gaspillage de ressources IT',
    threatSource: 'Surdimensionnement, manque de supervision',
    description:
      'Si les ressources serveurs et stockage sont sous-utilisées, alors l’organisation supporte des coûts inutiles.',
    businessImpact: 'Coûts IT inutiles liés au surdimensionnement.',
    impact: 3,
    probability: 3,
    existingSecurityMeasures: 'Supervision partielle',
    mitigationPlan:
      'Mettre en place une supervision capacitaire et décommissionner les ressources inutiles',
    effort: 'Faible',
  },
  {
    category: 'Green IT',
    domainCode: 'IT',
    typeCode: 'OBSOLESCENCE',
    fearedEvent: 'Maintien d’équipements obsolètes et énergivores',
    threatSource: 'Manque de gouvernance, contraintes budgétaires',
    description:
      'Si la fin de vie des équipements n’est pas suivie, alors des actifs coûteux et risqués restent en production.',
    businessImpact: 'Actifs coûteux, risqués et énergivores maintenus en production.',
    impact: 3,
    probability: 3,
    existingSecurityMeasures: 'Inventaire matériel partiel',
    mitigationPlan:
      'Suivre les dates de fin de support, planifier renouvellement ou retrait',
    effort: 'Faible',
  },
  {
    category: 'Green IT',
    domainCode: 'ENVIRONMENTAL',
    typeCode: 'NON_COMPLIANCE_ENVIRONMENT',
    fearedEvent: 'Achats IT non responsables',
    threatSource: 'Achat, fournisseur, absence de critères',
    description:
      'Si les critères Green IT sont absents des achats, alors l’organisation peut acquérir des équipements peu durables.',
    businessImpact: 'Acquisition d’équipements peu durables.',
    impact: 3,
    probability: 2,
    existingSecurityMeasures: 'Politique achat générale',
    mitigationPlan:
      'Intégrer critères de réparabilité, consommation, durée de support et reconditionnement',
    effort: 'Faible',
  },
  {
    category: 'Infrastructure IT',
    domainCode: 'IT',
    typeCode: 'SYSTEM_OUTAGE',
    fearedEvent: 'Indisponibilité réseau locale ou étendue',
    threatSource: 'Panne matérielle, erreur de configuration',
    description:
      'Si les routeurs ou switchs critiques tombent en panne, alors les utilisateurs peuvent perdre l’accès aux services numériques.',
    businessImpact: 'Perte d’accès aux services numériques.',
    impact: 4,
    probability: 3,
    existingSecurityMeasures: 'Supervision réseau, contrats de maintenance',
    mitigationPlan: 'Redondance réseau, spare matériel, configuration sauvegardée',
    effort: 'Faible',
  },
  {
    category: 'Infrastructure IT',
    domainCode: 'CYBERSECURITY',
    typeCode: 'VULNERABILITY_EXPLOITATION',
    fearedEvent: 'Exploitation de vulnérabilités non corrigées',
    threatSource: 'Cybercriminel, malware, attaquant opportuniste',
    description:
      'Si les mises à jour ne sont pas maîtrisées, alors des vulnérabilités connues peuvent être exploitées.',
    businessImpact: 'Compromission via des vulnérabilités connues non corrigées.',
    impact: 4,
    probability: 3,
    existingSecurityMeasures: 'Mises à jour ponctuelles',
    mitigationPlan:
      'Processus de patch management, priorisation des correctifs critiques',
    effort: 'Moyen',
  },
  {
    category: 'Infrastructure IT',
    domainCode: 'IT',
    typeCode: 'OBSOLESCENCE',
    fearedEvent: 'Panne ou compromission liée à l’obsolescence',
    threatSource: 'Dette technique, fournisseur, cybercriminel',
    description:
      'Si les équipements critiques sont hors support, alors les incidents peuvent devenir non maîtrisables.',
    businessImpact: 'Incidents non maîtrisables sur équipements hors support.',
    impact: 5,
    probability: 4,
    existingSecurityMeasures: 'Maintenance partielle',
    mitigationPlan:
      'Plan de modernisation, remplacement priorisé, budget pluriannuel',
    effort: 'Moyen',
  },
  {
    category: 'Infrastructure IT',
    domainCode: 'IT',
    typeCode: 'SYSTEM_OUTAGE',
    fearedEvent: 'Blocage de services faute de capacité de stockage',
    threatSource: 'Croissance des données, absence d’alerting',
    description:
      'Si le stockage sature, alors les applications peuvent s’arrêter ou perdre des données.',
    businessImpact: 'Arrêt applicatif ou perte de données par saturation stockage.',
    impact: 4,
    probability: 3,
    existingSecurityMeasures: 'Alertes ponctuelles',
    mitigationPlan:
      'Supervision capacitaire, seuils d’alerte, extension ou archivage',
    effort: 'Faible',
  },
  {
    category: 'Infrastructure IT',
    domainCode: 'IT',
    typeCode: 'MONITORING_GAP',
    fearedEvent: 'Détection tardive des incidents techniques',
    threatSource: 'Manque de supervision, exploitation réactive',
    description:
      'Si les infrastructures ne sont pas supervisées, alors les incidents peuvent être découverts par les utilisateurs.',
    businessImpact: 'Incidents découverts tardivement par les utilisateurs.',
    impact: 4,
    probability: 3,
    existingSecurityMeasures: 'Supervision partielle',
    mitigationPlan:
      'Supervision centralisée, alerting, astreinte ou procédure d’escalade',
    effort: 'Faible',
  },
  {
    category: 'Infrastructure IT',
    domainCode: 'IT',
    typeCode: 'CONFIGURATION_ERROR',
    fearedEvent: 'Erreur d’exploitation liée à une documentation obsolète',
    threatSource: 'Équipe IT, prestataire',
    description:
      'Si la documentation réseau est incomplète, alors une intervention peut aggraver un incident ou rallonger la reprise.',
    businessImpact: 'Aggravation d’incident ou reprise rallongée.',
    impact: 3,
    probability: 3,
    existingSecurityMeasures: 'Schémas anciens',
    mitigationPlan:
      'Mise à jour documentaire après changement, revue périodique',
    effort: 'Faible',
  },
  {
    category: 'Infrastructure IT',
    domainCode: 'IT',
    typeCode: 'CONFIGURATION_ERROR',
    fearedEvent: 'Incohérence de configuration des serveurs',
    threatSource: 'Exploitation, absence de standard',
    description:
      'Si les serveurs ne suivent pas un standard, alors les incidents et écarts de sécurité augmentent.',
    businessImpact: 'Hausse des incidents et écarts de sécurité.',
    impact: 4,
    probability: 3,
    existingSecurityMeasures: 'Configuration manuelle',
    mitigationPlan:
      'Standard de configuration, automatisation, contrôle de conformité',
    effort: 'Faible',
  },
  {
    category: 'Infrastructure IT',
    domainCode: 'IT',
    typeCode: 'PERFORMANCE_DEGRADATION',
    fearedEvent: 'Saturation des liens Internet ou intersites',
    threatSource: 'Croissance usage, incident opérateur',
    description:
      'Si les liens réseau sont insuffisants, alors les applications critiques deviennent lentes ou indisponibles.',
    businessImpact: 'Applications critiques lentes ou indisponibles.',
    impact: 4,
    probability: 3,
    existingSecurityMeasures: 'Contrats opérateurs',
    mitigationPlan:
      'Supervision bande passante, lien secondaire, priorisation du trafic',
    effort: 'Faible',
  },
  {
    category: 'Relations Fournisseurs',
    domainCode: 'SUPPLIERS',
    typeCode: 'SINGLE_SUPPLIER_DEPENDENCY',
    fearedEvent: 'Rupture de service liée à un fournisseur unique',
    threatSource: 'Fournisseur critique, défaillance économique ou technique',
    description:
      'Si un service dépend d’un fournisseur unique, alors sa défaillance peut bloquer l’activité.',
    businessImpact: 'Blocage de l’activité par défaillance d’un fournisseur unique.',
    impact: 5,
    probability: 3,
    existingSecurityMeasures: 'Contrat fournisseur principal',
    mitigationPlan:
      'Identifier alternatives, clauses de réversibilité, plan de sortie',
    effort: 'Moyen',
  },
  {
    category: 'Relations Fournisseurs',
    domainCode: 'SUPPLIERS',
    typeCode: 'SLA_PROVIDER_BREACH',
    fearedEvent: 'Non-respect des niveaux de service attendus',
    threatSource: 'Fournisseur, défaut contractuel',
    description:
      'Si les SLA ne sont pas clairs, alors l’organisation ne peut pas exiger un niveau de service suffisant.',
    businessImpact: 'Niveau de service insuffisant non exigible.',
    impact: 4,
    probability: 4,
    existingSecurityMeasures: 'Contrats existants',
    mitigationPlan:
      'Renégocier SLA, indicateurs, pénalités, comités de suivi',
    effort: 'Moyen',
  },
  {
    category: 'Relations Fournisseurs',
    domainCode: 'SUPPLIERS',
    typeCode: 'VENDOR_LOCK_IN',
    fearedEvent: 'Difficulté de sortie ou changement de prestataire',
    threatSource: 'Fournisseur, verrouillage contractuel',
    description:
      'Si les clauses de réversibilité sont absentes, alors la migration vers un autre fournisseur peut devenir coûteuse ou impossible.',
    businessImpact: 'Migration fournisseur coûteuse ou impossible.',
    impact: 5,
    probability: 3,
    existingSecurityMeasures: 'Contrats en cours',
    mitigationPlan:
      'Ajouter clauses de réversibilité, export des données, assistance de transition',
    effort: 'Moyen',
  },
  {
    category: 'Relations Fournisseurs',
    domainCode: 'SUPPLIERS',
    typeCode: 'SLA_PROVIDER_BREACH',
    fearedEvent: 'Dégradation non détectée de la qualité fournisseur',
    threatSource: 'Fournisseur, manque de pilotage',
    description:
      'Si la performance fournisseur n’est pas suivie, alors les incidents peuvent se répéter sans correction structurelle.',
    businessImpact: 'Incidents récurrents sans correction structurelle.',
    impact: 4,
    probability: 3,
    existingSecurityMeasures: 'Suivi informel',
    mitigationPlan: 'Comité fournisseur, reporting SLA, plan d’action correctif',
    effort: 'Faible',
  },
  {
    category: 'Relations Fournisseurs',
    domainCode: 'SUPPLIERS',
    typeCode: 'SUPPLIER_DEFAULT',
    fearedEvent: 'Interruption d’un service critique fournisseur',
    threatSource: 'Fournisseur critique',
    description:
      'Si un fournisseur critique connaît une défaillance financière ou opérationnelle, alors les services dépendants peuvent être interrompus.',
    businessImpact: 'Interruption des services dépendants.',
    impact: 5,
    probability: 2,
    existingSecurityMeasures: 'Contrats actifs',
    mitigationPlan:
      'Évaluation annuelle des fournisseurs critiques, solution alternative',
    effort: 'Faible',
  },
  {
    category: 'Relations Fournisseurs',
    domainCode: 'SUPPLIERS',
    typeCode: 'SUPPLIER_SECURITY_FAILURE',
    fearedEvent: 'Compromission via un sous-traitant',
    threatSource: 'Prestataire, cybercriminel',
    description:
      'Si un fournisseur ne respecte pas les exigences sécurité, alors il peut devenir un vecteur d’attaque.',
    businessImpact: 'Vecteur d’attaque via un tiers.',
    impact: 5,
    probability: 3,
    existingSecurityMeasures: 'Clauses générales',
    mitigationPlan:
      'Audits fournisseurs, exigences sécurité, limitation des accès, revue des droits',
    effort: 'Moyen',
  },
  {
    category: 'Ressources Humaines',
    domainCode: 'HUMAN_RESOURCES',
    typeCode: 'KNOWLEDGE_LOSS',
    fearedEvent: 'Perte de compétences critiques',
    threatSource: 'Départ salarié, indisponibilité, turnover',
    description:
      'Si une personne clé quitte l’organisation sans transfert, alors certaines activités SI peuvent devenir non maîtrisées.',
    businessImpact: 'Activités SI non maîtrisées après départ d’un acteur clé.',
    impact: 4,
    probability: 3,
    existingSecurityMeasures: 'Connaissance individuelle',
    mitigationPlan:
      'Binômage, documentation, plan de succession, transfert de compétences',
    effort: 'Faible',
  },
  {
    category: 'Ressources Humaines',
    domainCode: 'HUMAN_RESOURCES',
    typeCode: 'TRAINING_GAP',
    fearedEvent:
      'Inadéquation des compétences face aux évolutions technologiques',
    threatSource: 'Évolution technologique, manque de formation',
    description:
      'Si les équipes ne sont pas formées, alors elles peuvent mal exploiter ou sécuriser les nouveaux environnements.',
    businessImpact: 'Mauvaise exploitation ou sécurisation des nouveaux environnements.',
    impact: 5,
    probability: 4,
    existingSecurityMeasures: 'Formation ponctuelle',
    mitigationPlan:
      'Plan de formation annuel, veille technologique, certifications ciblées',
    effort: 'Moyen',
  },
  {
    category: 'Ressources Humaines',
    domainCode: 'HUMAN_RESOURCES',
    typeCode: 'KEY_PERSON_DEPENDENCY',
    fearedEvent: 'Dépendance excessive à quelques experts internes',
    threatSource: 'Organisation interne',
    description:
      'Si les connaissances sont concentrées, alors l’absence d’un expert peut ralentir ou bloquer l’exploitation.',
    businessImpact: 'Ralentissement ou blocage de l’exploitation.',
    impact: 4,
    probability: 3,
    existingSecurityMeasures: 'Expertise interne',
    mitigationPlan:
      'Documentation, partage de connaissances, rotation, binômage',
    effort: 'Faible',
  },
  {
    category: 'Ressources Humaines',
    domainCode: 'HUMAN_RESOURCES',
    typeCode: 'WORKLOAD_IMBALANCE',
    fearedEvent: 'Erreurs ou retards liés à une surcharge IT',
    threatSource: 'Organisation, demandes métier, sous-effectif',
    description:
      'Si les équipes IT sont surchargées, alors les incidents, projets et actions sécurité peuvent être mal traités.',
    businessImpact: 'Incidents, projets et actions sécurité mal traités.',
    impact: 4,
    probability: 4,
    existingSecurityMeasures: 'Arbitrage informel',
    mitigationPlan:
      'Priorisation portefeuille, renfort temporaire, limitation du travail non prioritaire',
    effort: 'Moyen',
  },
  {
    category: 'Ressources Humaines',
    domainCode: 'HUMAN_RESOURCES',
    typeCode: 'OTHER_HR_RISK',
    fearedEvent: 'Non-adoption des outils numériques',
    threatSource: 'Utilisateurs, conduite du changement insuffisante',
    description:
      'Si les utilisateurs n’adoptent pas les outils, alors les bénéfices attendus des projets numériques ne sont pas atteints.',
    businessImpact: 'Bénéfices des projets numériques non atteints.',
    impact: 4,
    probability: 3,
    existingSecurityMeasures: 'Formation initiale',
    mitigationPlan:
      'Plan d’accompagnement, support de proximité, relais métiers',
    effort: 'Faible',
  },
  {
    category: 'Ressources Humaines',
    domainCode: 'HUMAN_RESOURCES',
    typeCode: 'OTHER_HR_RISK',
    fearedEvent: 'Compromission par erreur ou négligence utilisateur',
    threatSource: 'Collaborateur, cybercriminel',
    description:
      'Si les collaborateurs ne sont pas sensibilisés, alors ils peuvent faciliter une attaque par phishing ou fuite de données.',
    businessImpact: 'Facilitation d’attaques ou fuites par négligence utilisateur.',
    impact: 5,
    probability: 3,
    existingSecurityMeasures: 'Sensibilisation ponctuelle',
    mitigationPlan:
      'Campagnes régulières, phishing simulé, rappels ciblés',
    effort: 'Moyen',
  },
  {
    category: 'Sécurité Numérique',
    domainCode: 'CYBERSECURITY',
    typeCode: 'MALWARE_INFECTION',
    fearedEvent: 'Propagation latérale d’une attaque interne',
    threatSource: 'Cybercriminel, malware, acteur interne',
    description:
      'Si le réseau n’est pas segmenté, alors une compromission locale peut s’étendre aux systèmes critiques.',
    businessImpact: 'Extension d’une compromission aux systèmes critiques.',
    impact: 4,
    probability: 3,
    existingSecurityMeasures: 'VLAN partiels',
    mitigationPlan:
      'Segmentation réseau, filtrage inter-zones, cloisonnement des actifs critiques',
    effort: 'Moyen',
  },
  {
    category: 'Sécurité Numérique',
    domainCode: 'CYBERSECURITY',
    typeCode: 'RANSOMWARE_ATTACK',
    fearedEvent: 'Paralysie de l’activité par ransomware',
    threatSource: 'Cybercriminel, phishing, exploitation de vulnérabilité',
    description:
      'Si un ransomware compromet les postes ou serveurs, alors les opérations peuvent être arrêtées et les données chiffrées.',
    businessImpact: 'Arrêt des opérations et chiffrement des données.',
    impact: 5,
    probability: 4,
    existingSecurityMeasures: 'Antivirus, sauvegardes',
    mitigationPlan:
      'EDR, MFA, sauvegardes immuables, filtrage mail, exercices de crise',
    effort: 'Moyen',
  },
  {
    category: 'Sécurité Numérique',
    domainCode: 'CYBERSECURITY',
    typeCode: 'SECURITY_LOGGING_GAP',
    fearedEvent: 'Détection tardive d’une compromission',
    threatSource: 'Cybercriminel, absence de supervision',
    description:
      'Si les activités réseau ne sont pas surveillées, alors une attaque peut rester invisible jusqu’à l’impact métier.',
    businessImpact: 'Attaque invisible jusqu’à impact métier.',
    impact: 5,
    probability: 4,
    existingSecurityMeasures: 'Logs locaux',
    mitigationPlan:
      'SIEM, corrélation d’événements, alertes, procédure de réponse incident',
    effort: 'Moyen',
  },
  {
    category: 'Sécurité Numérique',
    domainCode: 'CYBERSECURITY',
    typeCode: 'DATA_BREACH',
    fearedEvent: 'Fuite de données confidentielles',
    threatSource: 'Cybercriminel, prestataire, acteur interne',
    description:
      'Si les accès et protections sont insuffisants, alors des données sensibles peuvent être extraites ou divulguées.',
    businessImpact: 'Extraction ou divulgation de données sensibles.',
    impact: 5,
    probability: 3,
    existingSecurityMeasures: 'Droits applicatifs',
    mitigationPlan:
      'Chiffrement, DLP, revue d’accès, journalisation, limitation des exports',
    effort: 'Moyen',
  },
  {
    category: 'Sécurité Numérique',
    domainCode: 'CYBERSECURITY',
    typeCode: 'IDENTITY_COMPROMISE',
    fearedEvent: 'Compromission de comptes critiques',
    threatSource: 'Cybercriminel, phishing, mot de passe faible',
    description:
      'Si le MFA n’est pas activé sur les accès sensibles, alors un mot de passe compromis peut permettre une intrusion.',
    businessImpact: 'Intrusion via comptes sensibles compromis.',
    impact: 5,
    probability: 4,
    existingSecurityMeasures: 'Mot de passe, politique AD',
    mitigationPlan:
      'MFA obligatoire, accès conditionnel, revue des comptes critiques',
    effort: 'Moyen',
  },
  {
    category: 'Sécurité Numérique',
    domainCode: 'CYBERSECURITY',
    typeCode: 'PRIVILEGE_ESCALATION',
    fearedEvent: 'Prise de contrôle du SI via privilèges excessifs',
    threatSource: 'Administrateur, cybercriminel, erreur interne',
    description:
      'Si les comptes administrateurs sont trop nombreux ou mal maîtrisés, alors une compromission peut donner un contrôle étendu du SI.',
    businessImpact: 'Contrôle étendu du SI après compromission.',
    impact: 5,
    probability: 3,
    existingSecurityMeasures: 'Comptes administrateurs existants',
    mitigationPlan:
      'PAM, revue des privilèges, comptes nominatifs, suppression comptes inutiles',
    effort: 'Moyen',
  },
  {
    category: 'Sécurité Numérique',
    domainCode: 'CYBERSECURITY',
    typeCode: 'VULNERABILITY_EXPLOITATION',
    fearedEvent: 'Exploitation de vulnérabilités critiques exposées',
    threatSource: 'Cybercriminel, attaquant opportuniste',
    description:
      'Si les vulnérabilités critiques ne sont pas corrigées, alors un attaquant peut compromettre les systèmes exposés.',
    businessImpact: 'Compromission de systèmes exposés.',
    impact: 5,
    probability: 4,
    existingSecurityMeasures: 'Correctifs ponctuels',
    mitigationPlan:
      'Scan de vulnérabilités, patch priorisé, isolation temporaire des systèmes exposés',
    effort: 'Moyen',
  },
  {
    category: 'Sécurité Numérique',
    domainCode: 'CYBERSECURITY',
    typeCode: 'PHISHING_ATTACK',
    fearedEvent: 'Compromission par hameçonnage',
    threatSource: 'Cybercriminel, collaborateur ciblé',
    description:
      'Si un utilisateur clique sur un lien ou transmet ses identifiants, alors un attaquant peut accéder au SI.',
    businessImpact: 'Accès non autorisé au SI via hameçonnage.',
    impact: 4,
    probability: 4,
    existingSecurityMeasures: 'Filtrage mail partiel',
    mitigationPlan:
      'Sensibilisation, anti-phishing, MFA, signalement utilisateur, simulation régulière',
    effort: 'Moyen',
  },
];
