/**
 * Contenu « fiche projet » (RFC-PROJ-012) pour le seed démo — textes et indicateurs crédibles.
 */
import {
  Prisma,
  ProjectCopilRecommendation,
  ProjectRiskLevel,
} from "@prisma/client";

const dec = (n: number) => new Prisma.Decimal(n);

/** Aligné `parseTowsActions` / fiche projet — matrice 4 quadrants, pas un tableau plat. */
export type DemoProjectTows = {
  SO: string[];
  ST: string[];
  WO: string[];
  WT: string[];
};

export type DemoProjectSheet = {
  pilotNotes: string | null;
  targetBudgetAmount: Prisma.Decimal | null;
  businessValueScore: number | null;
  strategicAlignment: number | null;
  urgencyScore: number | null;
  estimatedCost: Prisma.Decimal | null;
  estimatedGain: Prisma.Decimal | null;
  roi: Prisma.Decimal | null;
  riskLevel: ProjectRiskLevel | null;
  riskResponse: string | null;
  priorityScore: Prisma.Decimal | null;
  businessProblem: string | null;
  businessBenefits: string | null;
  businessSuccessKpis: Prisma.InputJsonValue;
  cadreLocation: string | null;
  cadreQui: string | null;
  involvedTeams: string | null;
  swotStrengths: Prisma.InputJsonValue;
  swotWeaknesses: Prisma.InputJsonValue;
  swotOpportunities: Prisma.InputJsonValue;
  swotThreats: Prisma.InputJsonValue;
  towsActions: DemoProjectTows;
  copilRecommendation: ProjectCopilRecommendation;
  copilRecommendationNote: string | null;
};

export const DEMO_PROJECT_SHEETS: DemoProjectSheet[] = [
  // 01 — Identité / SSO
  {
    pilotNotes:
      "Comité mensuel : charge sur équipe IAM acceptable. Point d’attention : dépendance calendrier RH pour MFA sur apps métier legacy.",
    targetBudgetAmount: dec(480000),
    businessValueScore: 4,
    strategicAlignment: 5,
    urgencyScore: 3,
    estimatedCost: dec(420000),
    estimatedGain: dec(780000),
    roi: dec(86),
    riskLevel: ProjectRiskLevel.MEDIUM,
    riskResponse:
      "Plan B : IdP secondaire en lecture seule si incident majeur ; runbook testé trimestriellement.",
    priorityScore: new Prisma.Decimal(4.2),
    businessProblem:
      "Les accès sont fragmentés (MFA partiel, comptes partagés sur 12 applications critiques). Les audits SOC2 et les incidents phishing imposent un socle unique et traçable.",
    businessBenefits:
      "Réduction du temps de provisioning (-40% estimé), conformité assurance cyber, base pour B2B et partenaires.",
    businessSuccessKpis: [
      "P95 authentification < 400 ms sur flux nominaux",
      "100% des apps classe A sous MFA obligatoire",
      "0 compte partagé en production à J+6 mois post go-live",
    ],
    cadreLocation:
      "Où : SSO entreprise, annuaire AD/AAD, 45 applications ; hors filiales hors périmètre contrat actuel.",
    cadreQui:
      "Qui : DSI (sponsor), RSSI (validation risques), RH (onboarding), directions métiers pour campagnes MFA.",
    involvedTeams:
      "DSI / Cybersécurité, RH (identités), 4 directions métiers pilotes, intégrateur IdP, support utilisateur N1.",
    swotStrengths: [
      "Budget CAPEX validé en comité",
      "Équipe projet expérimentée (refonte IAM 2019)",
      "Catalogue applications déjà inventorié",
    ],
    swotWeaknesses: [
      "Dette SAML sur 6 applis sans mainteneur identifié",
      "Fenêtres de changement limitées (retail Q4)",
    ],
    swotOpportunities: [
      "Renégociation bundle licences IdP",
      "Alignement avec futur programme « poste de travail »",
    ],
    swotThreats: [
      "Retard fournisseur certificats",
      "Résistance utilisateurs sur MFA sur mobile",
    ],
    towsActions: {
      SO: [
        "Industrialiser MFA sur lot 1 (10 apps) avant pic d’activité",
        "Renégocier bundle IdP (volume groupe) avec levier campagne MFA",
      ],
      ST: [
        "Durcir preuves audit SOC2 avant généralisation MFA",
        "Plan B certificats : AC de secours validé avec RSSI",
      ],
      WO: [
        "Plan de communication ciblé finance et logistique sur mobile MFA",
        "Runbook SAML priorisé sur les 6 applis sans mainteneur identifié",
      ],
      WT: [
        "Geler évolutions mineures legacy le temps de stabiliser l’IdP",
        "Support renforcé N1 semaines 3–4 post vague MFA",
      ],
    },
    copilRecommendation: ProjectCopilRecommendation.POURSUIVRE,
    copilRecommendationNote:
      "COPIL : feu vert phase pilote ; surveiller charge support N1 semaines 3-4 après MFA généralisé.",
  },
  // 02 — Data lakehouse
  {
    pilotNotes:
      "Ateliers architecture bi-hebdomadaires. Lac déjà alimenté à 60% ; priorité qualité données référentiel client.",
    targetBudgetAmount: dec(920000),
    businessValueScore: 5,
    strategicAlignment: 4,
    urgencyScore: 3,
    estimatedCost: dec(880000),
    estimatedGain: dec(2100000),
    roi: dec(139),
    riskLevel: ProjectRiskLevel.LOW,
    riskResponse:
      "Contrôle d’accès par domaine données ; anonymisation systématique des flux RH dans la zone lab.",
    priorityScore: new Prisma.Decimal(4.0),
    businessProblem:
      "Les rapports décisionnels reposent sur 7 silos Excel ; pas de vision 360° client / stock / marge en temps quasi réel.",
    businessBenefits:
      "Scénarios de marge, détection ruptures, base unique pour IA / segmentation ; réduction effort BI manuel.",
    businessSuccessKpis: [
      "Disponibilité pipeline batch > 99,5%",
      "Écart < 2% vs référentiel finance sur CA agrégé mensuel",
      "5 cas d’usage self-service validés par la direction",
    ],
    cadreLocation:
      "Zone Azure : souscription dédiée, données UE ; pas de PII hors UE sans DPA signé.",
    cadreQui:
      "CDO (sponsor), architecte données, DAF pour contrôle finance, DPO pour conformité.",
    involvedTeams:
      "Data platform, finance (contrôle de gestion), supply chain, équipe qualité données, DSI réseau.",
    swotStrengths: [
      "Compétences Spark/Databricks disponibles en interne",
      "Sources ERP déjà extraites en quasi temps réel",
    ],
    swotWeaknesses: [
      "Qualité adresses clients hétérogène",
      "Charge sur équipe ops pour monitoring",
    ],
    swotOpportunities: [
      "Réutilisation modèles pour programme IA documentaire",
      "Mutualisation avec filiale Benelux",
    ],
    swotThreats: [
      "Coût stockage si rétention mal cadrée",
      "Dépendance ETL tiers",
    ],
    towsActions: {
      SO: [
        "Accélérer MDM client pour industrialiser campagnes marketing sur données fiables",
        "Capitaliser pipelines temps réel pour offres groupe / Benelux",
      ],
      ST: [
        "Cadrer rétention et coût stockage avant montée en charge",
        "Mettre en place alerting data quality sur tables clés finance / stock",
      ],
      WO: [
        "Programme de cleansing adresses avec métier avant segmentation avancée",
        "Renforcer monitoring ops (charge équipe) avec scripts runbook",
      ],
      WT: [
        "Plan de sortie / SLA avec ETL tiers si dérive perf",
        "Limiter nouveaux jeux de données sensibles jusqu’à DPA signés",
      ],
    },
    copilRecommendation: ProjectCopilRecommendation.POURSUIVRE,
    copilRecommendationNote: "Valider budget run année 2 avant passage en BAU.",
  },
  // 03 — Legacy terminé
  {
    pilotNotes:
      "Clôture administrative : reste 3 licences à résilier d’ici fin de trimestre ; archive technique basculée sur S3 IA.",
    targetBudgetAmount: dec(310000),
    businessValueScore: 4,
    strategicAlignment: 3,
    urgencyScore: 2,
    estimatedCost: dec(295000),
    estimatedGain: dec(520000),
    roi: dec(76),
    riskLevel: ProjectRiskLevel.LOW,
    riskResponse:
      "Aucun risque ouvert ; clause de sortie fournisseur exercée sans litige.",
    priorityScore: new Prisma.Decimal(3.1),
    businessProblem:
      "Contrat mainframe historique : coût fixe élevé, compétences rares, alignement faible avec stack cible.",
    businessBenefits:
      "Sortie de fournisseur, réduction coût run, simplification audits ; redirection budget vers refonte cible.",
    businessSuccessKpis: [
      "Bascule batch critique sans incident P1",
      "Économie run > 200 k€ / an constatée année N+1",
      "Documentation transférée aux équipes support",
    ],
    cadreLocation: "Périmètre France ; applications batch et paie historique concernées.",
    cadreQui: "DAF, DSI, responsable paie, éditeur sortant, intégrateur entrée.",
    involvedTeams: "Paie, finance, IT production, juridique (contrats).",
    swotStrengths: ["Plan de sortie respecté", "Équipe projet stable sur 18 mois"],
    swotWeaknesses: ["Documentation incomplète sur 2 flux"],
    swotOpportunities: ["Réaffectation FTE sur projets cloud"],
    swotThreats: ["Aucun identifié post cutover"],
    towsActions: {
      SO: [
        "Capitaliser runbooks et scripts sur base de connaissance interne (search)",
        "Réaffecter FTE libérés vers chantiers cloud prioritaires",
      ],
      ST: [
        "Archiver preuves de bascule pour audits N+1",
        "Maintenir hotline réduite le temps de résiliation licences",
      ],
      WO: [
        "Compléter documentation des 2 flux restants (dette technique résiduelle)",
        "Partager retours d’expérience « sortie mainframe » en guild technique",
      ],
      WT: [
        "Aucune action défensive majeure : projet clos, surveillance uniquement sur licences",
      ],
    },
    copilRecommendation: ProjectCopilRecommendation.POURSUIVRE,
    copilRecommendationNote: "Projet clôturé ; bilan positif au CODIR du trimestre.",
  },
  // 04 — ERP ON_HOLD
  {
    pilotNotes:
      "Mise en sommeil jusqu’à arbitrage budget CAPEX T2. Ateliers métiers suspendus ; maintenance correctifs uniquement sur lot 1.",
    targetBudgetAmount: dec(2100000),
    businessValueScore: 3,
    strategicAlignment: 4,
    urgencyScore: 4,
    estimatedCost: dec(450000),
    estimatedGain: dec(0),
    roi: dec(0),
    riskLevel: ProjectRiskLevel.HIGH,
    riskResponse:
      "Scénario dégradé : périmètre réduit aux modules finance + immo ; report achats et prod à N+1 si non arbitré.",
    priorityScore: new Prisma.Decimal(2.8),
    businessProblem:
      "Phase 2 (immobilisations, intercos) bloquée faute d’enveloppe ; risque de dérive coût / périmètre sans cadre finance clair.",
    businessBenefits:
      "Une fois financée : alignement bilan, réduction clôtures manuelles, traçabilité des actifs.",
    businessSuccessKpis: [
      "Décision CODIR sur enveloppe < 8 semaines",
      "Périmètre fonctionnel figé par comité",
      "Plan de charge RFP intégrateurs validé",
    ],
    cadreLocation: "Siège + 3 filiales industrielles ; pas d’extension internationale tant que budget ouvert.",
    cadreQui: "DAF sponsor, contrôle de gestion, DSI, cabinet AMOA en support.",
    involvedTeams: "Finance, immobilier, DSI, intégrateur historique phase 1.",
    swotStrengths: ["Phase 1 stabilisée", "Sponsoring fort direction générale"],
    swotWeaknesses: ["Incertitude budget", "Fatigue métier sur délais"],
    swotOpportunities: ["Mutualisation avec programme groupe à l’étranger"],
    swotThreats: ["Inflation coûts intégration", "Concurrent ERP qui sort offre cloud"],
    towsActions: {
      SO: [
        "Préparer mini-business-case par module pour arbitrage CODIR rapide",
        "S’appuyer sur sponsoring DG pour verrouiller périmètre fonctionnel",
      ],
      ST: [
        "Geler développements spécifiques hors lot validé pour limiter dérive coût",
        "Scénario dégradé finance + immo documenté pour reprise si budget partiel",
      ],
      WO: [
        "Relancer communication métier sur bénéfices bilan / intercos une fois budget confirmé",
        "Étudier mutualisation avec programme groupe à l’étranger (réduction RFP)",
      ],
      WT: [
        "Ne pas répondre à sollicitations intégrateurs tant que budget non arbitré",
        "Surveiller offres cloud concurrentes pour ne pas figer périmètre trop tôt",
      ],
    },
    copilRecommendation: ProjectCopilRecommendation.REPORTER,
    copilRecommendationNote:
      "COPIL : ne pas engager dépenses phase 2 avant revue budget ; risque image si demi-mesure.",
  },
  // 05 — Cyber PAM
  {
    pilotNotes:
      "Revue risques mensuelle ; atelier technique avec RSSI et exploit réseau. POC PAM validé sur 20 comptes privilégiés.",
    targetBudgetAmount: dec(650000),
    businessValueScore: 5,
    strategicAlignment: 5,
    urgencyScore: 5,
    estimatedCost: dec(580000),
    estimatedGain: dec(900000),
    roi: dec(55),
    riskLevel: ProjectRiskLevel.HIGH,
    riskResponse:
      "Contournement temporaire : rotation mots de passe hebdomadaire sur comptes critiques + journalisation renforcée en attendant PAM.",
    priorityScore: new Prisma.Decimal(4.8),
    businessProblem:
      "Comptes à privilèges partagés et sessions administrateur non tracées ; exigences réglementaires et assurance cyber renforcées.",
    businessBenefits:
      "Réduction surface d’attaque, preuves d’audit pour SOC2 / clients grands comptes.",
    businessSuccessKpis: [
      "100% des comptes admin dans PAM à J+9 mois",
      "0 session admin hors bastion en production",
      "MTTR incident privilege < 2 h en exercice",
    ],
    cadreLocation:
      "Datacenters France + cloud public comptes production ; hors postes de développeurs.",
    cadreQui: "RSSI, DSI infrastructure, équipe SOC, propriétaires applicatifs.",
    involvedTeams: "Cybersécurité, réseau, Windows/Linux, équipe SOC, métiers pour fenêtres de changement.",
    swotStrengths: ["Sponsoring RSSI", "Produit PAM déjà short-listé"],
    swotWeaknesses: ["Charge sur équipe pour inventaire comptes"],
    swotOpportunities: ["Extension à partenaires distants via bastion"],
    swotThreats: ["Indisponibilité métier sur fenêtres de bascule"],
    towsActions: {
      SO: [
        "Généraliser PAM en s’appuyant sur sponsoring RSSI et preuves SOC2",
        "Étendre bastion partenaires une fois socle interne stabilisé",
      ],
      ST: [
        "Campagne de sensibilisation avant coupure accès partagés",
        "Tests intrusion ciblés post déploiement sur comptes privilégiés",
      ],
      WO: [
        "Finaliser inventaire comptes : jeu de données propre avant vague 2",
        "Caler fenêtres métier par site pour réduire refus de maintenance",
      ],
      WT: [
        "Plan de communication si indisponibilité métier : créneaux de secours",
        "Rotation mots de passe hebdo maintenue tant que PAM partiel",
      ],
    },
    copilRecommendation: ProjectCopilRecommendation.SOUS_RESERVE,
    copilRecommendationNote:
      "Poursuite sous réserve que métier valide créneaux maintenance ; sinon report phase critique.",
  },
  // 06 — E-commerce retard
  {
    pilotNotes:
      "Retard principalement sur intégration PSP et recette panier mobile. Daily war room jusqu’à stabilisation paiement.",
    targetBudgetAmount: dec(1200000),
    businessValueScore: 4,
    strategicAlignment: 3,
    urgencyScore: 5,
    estimatedCost: dec(1180000),
    estimatedGain: dec(2500000),
    roi: dec(112),
    riskLevel: ProjectRiskLevel.HIGH,
    riskResponse:
      "Plan de contingence : passer en 3-D Secure renforcé + limitation panier max le temps de correction.",
    priorityScore: new Prisma.Decimal(3.9),
    businessProblem:
      "Tunnel d’achat legacy : taux d’abandon élevé, dette UX, intégration paiement fragile lors des pics (soldes).",
    businessBenefits:
      "Hausse conversion estimée 8–12%, réduction appels hotline paiement, conformité DSP2.",
    businessSuccessKpis: [
      "Taux conversion checkout > 3,2%",
      "Taux erreur paiement < 0,5%",
      "Core Web Vitals dans seuils Google sur mobile",
    ],
    cadreLocation: "Site B2C France ; pas d’impact POS magasin dans ce lot.",
    cadreQui: "Direction marketing digital, e-commerce, DSI, PSP, agence UX.",
    involvedTeams: "E-com, marketing, DSI, juridique (CGV), call center niveau 2.",
    swotStrengths: ["Trafic solide", "Équipe agile disponible"],
    swotWeaknesses: ["Dette front ancienne", "Tests de charge tardifs"],
    swotOpportunities: ["Personnalisation panier via CDP"],
    swotThreats: ["Concurrence promo agressive", "Indispo PSP le week-end"],
    towsActions: {
      SO: [
        "Accélérer intégration PSP + UX panier sur trafic existant (levier conversion)",
        "Personnalisation panier via CDP une fois tunnel stabilisé",
      ],
      ST: [
        "Renforcer tests de charge et garde-fous 3-D Secure avant pics soldes",
        "Plan de continuité si indispo PSP week-end (message + file d’attente)",
      ],
      WO: [
        "Découper mise en prod par zones géographiques pour réduire blast radius",
        "Refonte dette front par increments (Core Web Vitals)",
      ],
      WT: [
        "Réduire périmètre « nice-to-have » avant pic saisonnier",
        "War room daily jusqu’à taux erreur paiement < seuil cible",
      ],
    },
    copilRecommendation: ProjectCopilRecommendation.AJUSTER_CADRAGE,
    copilRecommendationNote:
      "Revoir périmètre « must-have » avant pic saisonnier ; prioriser paiement et panier.",
  },
  // 07 — Téléphonie
  {
    pilotNotes:
      "Migration numéros pilotes sans incident. Préparation vague 2 : coordination avec filiales pour plages de bascule.",
    targetBudgetAmount: dec(380000),
    businessValueScore: 3,
    strategicAlignment: 3,
    urgencyScore: 4,
    estimatedCost: dec(360000),
    estimatedGain: dec(480000),
    roi: dec(33),
    riskLevel: ProjectRiskLevel.MEDIUM,
    riskResponse:
      "Rollback documenté par site ; numéros de secours maintenus 48 h post cutover.",
    priorityScore: new Prisma.Decimal(3.5),
    businessProblem:
      "Contrat opérateur historique : coût élevé, manque de flexibilité SBC, qualité audio médiocre sur télétravail.",
    businessBenefits:
      "Réduction coût télécom, meilleure résilience, intégration Teams / contact center.",
    businessSuccessKpis: [
      "Disponibilité vocale > 99,9% mesurée sur pilotes",
      "Réduction facture run > 18%",
      "NPS interne téléphonie > 7/10 après vague 1",
    ],
    cadreLocation: "France métropolitaine ; sites industriels + siège.",
    cadreQui: "DSI télécom, responsable contact center, opérateur sortant / entrant.",
    involvedTeams: "IT réseau, télécom site, RH pour communication utilisateurs.",
    swotStrengths: ["Pilotes réussis", "Documentation numérotation à jour"],
    swotWeaknesses: ["Ancienneté PABX sur 2 sites"],
    swotOpportunities: ["Centraliser supervision sur même outil que réseau"],
    swotThreats: ["Grève transport retardant interventions terrain"],
    towsActions: {
      SO: [
        "Enchaîner vagues de bascule sur la base des pilotes réussis",
        "Centraliser supervision télécom / réseau sur même outil (quick wins)",
      ],
      ST: [
        "Anticiper commandes matériel SBC sites B et C avant fenêtres critiques",
        "Maintenir numéros de secours 48 h documentés par site",
      ],
      WO: [
        "Moderniser PABX obsolètes par vague pour réduire dette et incidents audio",
        "Communication RH utilisateurs : calendrier bascule par site",
      ],
      WT: [
        "Plan B transport / prestataire terrain si grève ou retard livraison",
        "Réduire scope sites à risque si fenêtre manquée",
      ],
    },
    copilRecommendation: ProjectCopilRecommendation.POURSUIVRE,
    copilRecommendationNote: "Tenir le planning de bascule ; aucun report CODIR requis pour l’instant.",
  },
  // 08 — Observabilité
  {
    pilotNotes:
      "Couverture APM sur 40% des services critiques ; objectif 85% d’ici T3. Dette agents identifiée sur parc Linux ancien.",
    targetBudgetAmount: dec(520000),
    businessValueScore: 4,
    strategicAlignment: 4,
    urgencyScore: 3,
    estimatedCost: dec(490000),
    estimatedGain: dec(720000),
    roi: dec(47),
    riskLevel: ProjectRiskLevel.MEDIUM,
    riskResponse:
      "Prioriser agents sur périmètre e-commerce et paiement ; plan de mise à jour OS sur 2 vagues.",
    priorityScore: new Prisma.Decimal(3.8),
    businessProblem:
      "Temps de détection et diagnostic des incidents production trop longs ; corrélation insuffisante entre logs, métriques et traces.",
    businessBenefits:
      "MTTR réduit, visibilité SLA interne/externe, base pour SRE et budgets erreurs.",
    businessSuccessKpis: [
      "MTTR P1 < 90 min en moyenne glissante",
      "Couverture APM > 85% services critiques",
      "Dashboards SLO disponibles pour 10 équipes produit",
    ],
    cadreLocation: "Cloud + on-premise ; hors environnements développeur isolés.",
    cadreQui: "SRE, DSI production, RSSI pour rétention logs.",
    involvedTeams: "SRE, exploitation, équipes produit, sécurité des SI.",
    swotStrengths: ["Outils déjà licenciés", "Sponsoring SRE"],
    swotWeaknesses: ["Hétérogénéité versions agents"],
    swotOpportunities: ["Alerting proactif vers Teams"],
    swotThreats: ["Surcharge stockage logs si rétention mal calibrée"],
    towsActions: {
      SO: [
        "Standardiser version agent par OS sur périmètre e-commerce / paiement en priorité",
        "Étendre dashboards SLO aux 10 équipes produit avec alerting Teams",
      ],
      ST: [
        "Cadrer rétention logs avec RSSI pour éviter explosion coût stockage",
        "Playbooks runbook P1 par scénario (paiement, auth, stock)",
      ],
      WO: [
        "Mettre à jour parc Linux ancien en 2 vagues (dette agents)",
        "Corrélation logs / traces sur services critiques restants",
      ],
      WT: [
        "Réduire verbosité logs bruyants en pré-prod avant montée en charge",
        "Geler nouveaux connecteurs tiers tant que coût ingestion non validé",
      ],
    },
    copilRecommendation: ProjectCopilRecommendation.POURSUIVRE,
    copilRecommendationNote: "Surveiller coût ingestion ; revue trimestrielle avec finance IT.",
  },
  // 09 — Partenariat / sans owner compte
  {
    pilotNotes:
      "Responsable projet côté éditeur à formaliser ; ateliers API bi-mensuels tenus avec le partenaire (contact externe).",
    targetBudgetAmount: dec(180000),
    businessValueScore: 2,
    strategicAlignment: 2,
    urgencyScore: 2,
    estimatedCost: dec(95000),
    estimatedGain: dec(320000),
    roi: dec(237),
    riskLevel: ProjectRiskLevel.MEDIUM,
    riskResponse:
      "Clause SLA API dans contrat cadre ; environnement de recette dédié avant prod.",
    priorityScore: new Prisma.Decimal(2.2),
    businessProblem:
      "Besoin d’exposer des données catalogue vers partenaire pour co-vendre ; pas encore de DPO / référent projet interne nommé sur le périmètre.",
    businessBenefits:
      "Nouveau canal revenus, time-to-market réduit sur offres communes.",
    businessSuccessKpis: [
      "API stable en recette sur 3 scénarios métiers",
      "DPA signé avant mise en production",
      "Référent interne désigné avant J+60",
    ],
    cadreLocation: "Données catalogue France ; pas d’accès données clients nominatives en V1.",
    cadreQui: "Sponsor direction commerciale ; juridique ; RSSI pour flux sortants.",
    involvedTeams: "Commercial, IT intégration, juridique, éditeur partenaire.",
    swotStrengths: ["Intérêt mutuel partenaire", "API standard REST documentée"],
    swotWeaknesses: ["Gouvernance projet floue côté interne"],
    swotOpportunities: ["Extension à autre pays une fois cadre validé"],
    swotThreats: ["Retard contractuel si négociation DPA"],
    towsActions: {
      SO: [
        "Accélérer co-vendre avec API catalogue une fois DPA et RSSI validés",
        "S’appuyer sur documentation REST existante pour réduire time-to-market",
      ],
      ST: [
        "Clause SLA et sandbox recette pour limiter risque juridique / technique",
        "Ne pas ouvrir prod tant que flux sortants non validés RSSI",
      ],
      WO: [
        "Nommer CP interne et RACI sous 30 jours (gouvernance)",
        "Aligner juridique / commercial sur périmètre données V1",
      ],
      WT: [
        "Plan B si retard DPA : périmètre réduit (lecture seule catalogue)",
        "Réduire exposition API si négociation partenaire se prolonge",
      ],
    },
    copilRecommendation: ProjectCopilRecommendation.AJUSTER_CADRAGE,
    copilRecommendationNote:
      "Ne pas ouvrir production sans référent interne et validation RSSI sur exfiltration données.",
  },
  // 10 — IA documentaire (PLANNED)
  {
    pilotNotes:
      "Phase de cadrage : ateliers use cases, évaluation fournisseurs, pas encore de budget OPEX run annoncé.",
    targetBudgetAmount: dec(750000),
    businessValueScore: 3,
    strategicAlignment: 4,
    urgencyScore: 2,
    estimatedCost: dec(120000),
    estimatedGain: dec(0),
    roi: dec(0),
    riskLevel: ProjectRiskLevel.LOW,
    riskResponse:
      "Approche par POC cloisonné ; pas de données personnelles dans les jeux de test initiaux.",
    priorityScore: new Prisma.Decimal(2.5),
    businessProblem:
      "Recherche d’information interne fragmentée (SharePoint, GED, mails) ; productivité équipes support et juridique impactée.",
    businessBenefits:
      "Réponse assistée, synthèse de contrats, réduction temps de recherche documentaire.",
    businessSuccessKpis: [
      "3 POC métiers validés avec critères de succès mesurables",
      "Choix architecture (SaaS vs déployé) arbitré",
      "Budget run estimé pour inclusion budget N+1",
    ],
    cadreLocation: "Périmètre siège ; extension ultérieure filiales si ROI démontré.",
    cadreQui: "DSI innovation, DAF, direction juridique, représentants métiers support.",
    involvedTeams: "DSI, juridique, support utilisateur, acheteurs pour RFP.",
    swotStrengths: ["Forte demande métier", "Données documentaires déjà centralisées à 60%"],
    swotWeaknesses: ["Compétences prompt engineering limitées en interne"],
    swotOpportunities: ["Réutilisation socle data lakehouse"],
    swotThreats: ["Évolution réglementation IA", "Coût tokens imprévisible"],
    towsActions: {
      SO: [
        "Lancer RFP sur critères éthique / souveraineté en s’appuyant sur socle data lakehouse",
        "Constituer comité de pilotage IA transverse (DSI / juridique / métiers)",
      ],
      ST: [
        "POC cloisonné sans PII ; cadre conformité revu par DPO",
        "Surveiller veille réglementation IA (EU AI Act) dans backlog risques",
      ],
      WO: [
        "Monter compétences prompt engineering (formation + guild interne)",
        "Prioriser cas d’usage support / juridique à ROI mesurable",
      ],
      WT: [
        "Limiter expérimentations payantes tant que budget OPEX run non arbitré",
        "Plan B : solution hébergée UE si clause souveraineté non respectée",
      ],
    },
    copilRecommendation: ProjectCopilRecommendation.NOT_SET,
    copilRecommendationNote:
      "Attendre résultats POC et arbitrage budget avant toute recommandation COPIL ferme.",
  },
];
