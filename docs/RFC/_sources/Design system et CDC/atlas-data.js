/* ============================================================
   STARIUM ATLAS — jeu de données de démonstration
   Bailleur social / ETI — ~30 objets, flux, risques, conformité
   ============================================================ */

const TYPE_META = {
  application:  {label:'Application',    color:'#5B9BF0', bg:'rgba(91,155,240,.16)',  icon:'<rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/>'},
  processus:    {label:'Processus',      color:'#B892F2', bg:'rgba(184,146,242,.16)', icon:'<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'},
  donnee:       {label:'Donnée',         color:'#3FBE84', bg:'rgba(63,190,132,.16)',  icon:'<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/>'},
  infrastructure:{label:'Infrastructure',color:'#8A93A3', bg:'rgba(138,147,163,.16)', icon:'<rect x="2" y="3" width="20" height="7" rx="1"/><rect x="2" y="14" width="20" height="7" rx="1"/><line x1="6" y1="6.5" x2="6.01" y2="6.5"/><line x1="6" y1="17.5" x2="6.01" y2="17.5"/>'},
  fournisseur:  {label:'Fournisseur',    color:'#F0A05C', bg:'rgba(240,160,92,.16)',  icon:'<path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>'},
  site:         {label:'Site',           color:'#4FC7B8', bg:'rgba(79,199,184,.16)',  icon:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>'}
};

const CRIT_META = {
  critique: {label:'Critique', color:'#E5564A', bg:'rgba(229,86,74,.16)'},
  elevee:   {label:'Élevée',   color:'#E8A317', bg:'rgba(232,163,23,.16)'},
  moyenne:  {label:'Moyenne',  color:'#5B9BF0', bg:'rgba(91,155,240,.14)'},
  faible:   {label:'Faible',   color:'#8A93A3', bg:'rgba(138,147,163,.16)'}
};

const LAYERS_META = {
  processus:'Processus', applications:'Applications', flux_app:'Flux applicatifs', flux_tech:'Flux techniques',
  donnees:'Données', fournisseurs:'Fournisseurs', infra:'Infrastructures', sites:'Sites',
  risques:'Risques', ssi:'Conformité SSI', rgpd:'Conformité RGPD',
  projets:'Projets', decisions:'Décisions', actions:'Actions'
};

/* ---------- Nœuds ---------- */
const NODES = [
  // Processus
  {id:'p1',type:'processus',name:'Quittancement',x:230,y:150,crit:'elevee',status:'Actif',ownerBiz:'Direction Gestion Locative',ownerTech:'DSI',lastReview:'2026-03-02',completeness:88,desc:"Émission et suivi des quittances de loyer auprès des locataires."},
  {id:'p2',type:'processus',name:'Attribution de logements',x:230,y:260,crit:'moyenne',status:'Actif',ownerBiz:'Direction Gestion Locative',ownerTech:'DSI',lastReview:'2025-11-14',completeness:74,desc:"Instruction des dossiers et attribution des logements sociaux."},
  {id:'p3',type:'processus',name:'Gestion des réclamations',x:230,y:370,crit:'moyenne',status:'Actif',ownerBiz:'Relation locataires',ownerTech:'DSI',lastReview:'2026-01-20',completeness:80,desc:"Traitement des réclamations et demandes des locataires."},
  {id:'p4',type:'processus',name:'Gestion des sinistres',x:390,y:430,crit:'moyenne',status:'Actif',ownerBiz:'Direction Technique',ownerTech:'DSI',lastReview:'2025-09-05',completeness:62,desc:"Déclaration, suivi et clôture des sinistres immobiliers."},
  {id:'p5',type:'processus',name:'Paie',x:400,y:130,crit:'elevee',status:'Actif',ownerBiz:'DRH',ownerTech:'DSI',lastReview:'2026-02-18',completeness:95,desc:"Établissement et versement de la paie du personnel."},
  {id:'p6',type:'processus',name:"Recouvrement des impayés",x:390,y:300,crit:'moyenne',status:'Actif',ownerBiz:'Direction Gestion Locative',ownerTech:'DSI',lastReview:'2025-12-01',completeness:70,desc:"Suivi et relance des loyers impayés."},

  // Applications
  {id:'a1',type:'application',name:'ERP Gestion Locative',x:650,y:200,crit:'critique',status:'Production',ownerBiz:'Direction Gestion Locative',ownerTech:'Julien Thomas',lastReview:'2026-02-10',completeness:92,
    badges:['projet','decision'],desc:"Socle applicatif central : locataires, patrimoine, quittancement, contentieux."},
  {id:'a2',type:'application',name:'Portail Locataires',x:860,y:150,crit:'critique',status:'Production',ownerBiz:'Relation locataires',ownerTech:'Alice Bernard',lastReview:'2025-08-22',completeness:78,
    badges:['risque','internet','ssi','action'],desc:"Espace self-care : consultation de compte, paiement en ligne, réclamations."},
  {id:'a3',type:'application',name:'GED',x:650,y:340,crit:'moyenne',status:'Production',ownerBiz:'Direction Technique',ownerTech:'Sophie Leroy',lastReview:'2026-01-05',completeness:83,desc:"Gestion électronique des documents contractuels et techniques."},
  {id:'a4',type:'application',name:'CRM Contacts',x:840,y:300,crit:'moyenne',status:'Production',ownerBiz:'Relation locataires',ownerTech:'Alice Bernard',lastReview:'2025-10-30',completeness:86,desc:"Suivi de la relation locataire multicanal."},
  {id:'a5',type:'application',name:'Logiciel de Paie',x:650,y:460,crit:'elevee',status:'Production',ownerBiz:'DRH',ownerTech:'Paul Dubois',lastReview:'2026-02-18',completeness:90,desc:"Calcul et édition des bulletins de paie, DSN."},
  {id:'a6',type:'application',name:'Outil de Ticketing Réclamations',x:790,y:430,crit:'faible',status:'Production',ownerBiz:'Relation locataires',ownerTech:'Sophie Leroy',lastReview:'2025-07-12',completeness:69,desc:"File de traitement des réclamations locataires."},
  {id:'a7',type:'application',name:'Outil décisionnel BI',x:960,y:250,crit:'faible',status:'Production',ownerTech:'Paul Dubois',lastReview:'2024-11-02',completeness:41,
    badges:['fiche'],desc:"Restitution des indicateurs de pilotage patrimoine et social."},

  // Données
  {id:'d1',type:'donnee',name:'Données locataires',x:700,y:610,crit:'critique',status:'Actif',ownerBiz:'DPO',ownerTech:'Sophie Leroy',lastReview:'2025-06-01',completeness:65,
    badges:['sensible','rgpd'],desc:"Identité, situation familiale et financière des locataires."},
  {id:'d2',type:'donnee',name:'Données de paie',x:555,y:650,crit:'elevee',status:'Actif',ownerBiz:'DRH',ownerTech:'Paul Dubois',lastReview:'2026-02-18',completeness:88,
    badges:['sensible'],desc:"Rémunérations, coordonnées bancaires et données sociales du personnel."},
  {id:'d3',type:'donnee',name:'Référentiel patrimoine',x:840,y:600,crit:'moyenne',status:'Actif',ownerBiz:'Direction Technique',ownerTech:'Sophie Leroy',lastReview:'2025-10-11',completeness:79,desc:"Référentiel des immeubles, logements et équipements."},

  // Infrastructure
  {id:'i1',type:'infrastructure',name:'Serveur applicatif principal',x:650,y:790,crit:'critique',status:'Production',ownerTech:'Julien Thomas',lastReview:'2025-05-14',completeness:70,
    badges:['support'],desc:"Cluster hébergeant les applications métier critiques."},
  {id:'i2',type:'infrastructure',name:'Base de données ERP',x:555,y:850,crit:'critique',status:'Production',ownerTech:'Julien Thomas',lastReview:'2026-01-15',completeness:84,desc:"Instance SQL principale de l'ERP Gestion Locative."},
  {id:'i3',type:'infrastructure',name:'Base de données CRM',x:750,y:880,crit:'moyenne',status:'Production',ownerTech:'Sophie Leroy',lastReview:'2025-11-20',completeness:81,desc:"Instance dédiée au CRM Contacts."},
  {id:'i4',type:'infrastructure',name:'Sauvegardes',x:455,y:900,crit:'elevee',status:'Production',ownerTech:'Sophie Leroy',lastReview:'2026-01-15',completeness:75,desc:"Politique de sauvegarde et de restauration des données critiques."},
  {id:'i5',type:'infrastructure',name:'Annuaire Active Directory',x:855,y:800,crit:'elevee',status:'Production',ownerTech:'Julien Thomas',lastReview:'2025-09-30',completeness:73,desc:"Référentiel d'identités et d'authentification interne."},
  {id:'i6',type:'infrastructure',name:'Pare-feu / VPN',x:970,y:850,crit:'elevee',status:'Production',ownerTech:'Sophie Leroy',lastReview:'2024-12-02',completeness:58,
    badges:['ssi'],desc:"Filtrage périmétrique et accès distants sécurisés."},
  {id:'i7',type:'infrastructure',name:'Supervision technique',x:1050,y:770,crit:'faible',status:'Production',ownerTech:'Sophie Leroy',lastReview:'2025-11-01',completeness:66,desc:"Monitoring de disponibilité et de performance des systèmes."},

  // Fournisseurs
  {id:'f1',type:'fournisseur',name:'Éditeur ERP',x:1260,y:190,crit:'critique',status:'Contrat actif',ownerBiz:'Direction Achats',lastReview:'2025-04-18',completeness:77,desc:"Éditeur et TMA de l'ERP Gestion Locative."},
  {id:'f2',type:'fournisseur',name:'Hébergeur Cloud',x:1310,y:340,crit:'elevee',status:'Contrat actif',ownerBiz:'Direction Achats',lastReview:'2025-06-22',completeness:82,desc:"Hébergement infogéré du datacenter applicatif."},
  {id:'f3',type:'fournisseur',name:'Infogérant IT',x:1310,y:500,crit:'elevee',status:'Contrat actif',ownerBiz:'Direction Achats',lastReview:'2024-10-09',completeness:54,
    badges:['decision','action'],desc:"Exploitation et maintien en condition opérationnelle du SI."},
  {id:'f4',type:'fournisseur',name:'Éditeur SaaS Paie',x:1260,y:650,crit:'critique',status:'Contrat actif',ownerBiz:'DRH',lastReview:'2025-03-01',completeness:69,desc:"Plateforme SaaS de calcul de paie et DSN."},

  // Sites
  {id:'s1',type:'site',name:'Siège social',x:200,y:760,crit:'faible',status:'Actif',lastReview:'2025-01-10',completeness:60,desc:"Site principal hébergeant les services support et la DSI."},
  {id:'s2',type:'site',name:'Agences territoriales',x:200,y:870,crit:'faible',status:'Actif',lastReview:'2025-01-10',completeness:55,desc:"Réseau d'agences de proximité (accueil locataires)."}
];

/* ---------- Flux (arêtes) ---------- */
const EDGES = [
  {id:'e1', s:'p1', t:'a1', flow:'metier', mode:'Intégré', freq:'Temps réel', crit:'elevee', dir:'uni', secure:true, manual:false},
  {id:'e2', s:'p2', t:'a1', flow:'metier', mode:'Intégré', freq:'Quotidien', crit:'moyenne', dir:'uni', secure:true, manual:false},
  {id:'e3', s:'p2', t:'a2', flow:'metier', mode:'API', freq:'Temps réel', crit:'moyenne', dir:'uni', secure:true, manual:false},
  {id:'e4', s:'p3', t:'a6', flow:'metier', mode:'API', freq:'Temps réel', crit:'moyenne', dir:'uni', secure:true, manual:false},
  {id:'e5', s:'p4', t:'a3', flow:'metier', mode:'Saisie manuelle', freq:'À l\'événement', crit:'moyenne', dir:'uni', secure:true, manual:true},
  {id:'e6', s:'p5', t:'a5', flow:'metier', mode:'Intégré', freq:'Mensuel', crit:'elevee', dir:'uni', secure:true, manual:false},
  {id:'e7', s:'p6', t:'a1', flow:'metier', mode:'Intégré', freq:'Quotidien', crit:'moyenne', dir:'uni', secure:true, manual:false},

  {id:'e8', s:'a1', t:'a2', flow:'applicatif', mode:'API', freq:'Temps réel', crit:'critique', dir:'bi', secure:true, manual:false},
  {id:'e9', s:'a1', t:'a3', flow:'applicatif', mode:'Fichier plat', freq:'Quotidien', crit:'moyenne', dir:'uni', secure:true, manual:false},
  {id:'e10', s:'a1', t:'a4', flow:'applicatif', mode:'Batch', freq:'Nocturne', crit:'moyenne', dir:'bi', secure:true, manual:false},
  {id:'e11', s:'a4', t:'a7', flow:'applicatif', mode:'Batch', freq:'Hebdomadaire', crit:'faible', dir:'uni', secure:true, manual:false},

  {id:'e12', s:'a5', t:'f4', flow:'fournisseur', mode:'SFTP', freq:'Mensuel', crit:'critique', dir:'bi', secure:false, manual:true},

  {id:'e13', s:'i5', t:'a1', flow:'technique', mode:'LDAP', freq:'Temps réel', crit:'elevee', dir:'uni', secure:true, manual:false},
  {id:'e14', s:'i5', t:'a2', flow:'technique', mode:'LDAP', freq:'Temps réel', crit:'elevee', dir:'uni', secure:true, manual:false},
  {id:'e15', s:'i5', t:'a4', flow:'technique', mode:'LDAP', freq:'Temps réel', crit:'moyenne', dir:'uni', secure:true, manual:false},

  {id:'e16', s:'d1', t:'i2', flow:'technique', mode:'Stockage', freq:'Continu', crit:'critique', dir:'uni', secure:true, manual:false},
  {id:'e17', s:'d1', t:'a4', flow:'applicatif', mode:'API', freq:'Temps réel', crit:'moyenne', dir:'uni', secure:true, manual:false},
  {id:'e18', s:'d2', t:'a5', flow:'applicatif', mode:'Intégré', freq:'Mensuel', crit:'elevee', dir:'uni', secure:true, manual:false},
  {id:'e19', s:'d3', t:'a1', flow:'applicatif', mode:'Intégré', freq:'Quotidien', crit:'moyenne', dir:'uni', secure:true, manual:false},

  {id:'e20', s:'a1', t:'i2', flow:'technique', mode:'SQL', freq:'Continu', crit:'critique', dir:'uni', secure:true, manual:false},
  {id:'e21', s:'a4', t:'i3', flow:'technique', mode:'SQL', freq:'Continu', crit:'moyenne', dir:'uni', secure:true, manual:false},
  {id:'e22', s:'i2', t:'i4', flow:'technique', mode:'Réplication', freq:'Quotidien', crit:'elevee', dir:'uni', secure:true, manual:false},
  {id:'e23', s:'i3', t:'i4', flow:'technique', mode:'Réplication', freq:'Quotidien', crit:'moyenne', dir:'uni', secure:true, manual:false},
  {id:'e24', s:'a1', t:'i1', flow:'technique', mode:'Hébergement', freq:'Continu', crit:'critique', dir:'uni', secure:true, manual:false},
  {id:'e25', s:'a2', t:'i1', flow:'technique', mode:'Hébergement', freq:'Continu', crit:'critique', dir:'uni', secure:true, manual:false},
  {id:'e26', s:'i7', t:'i1', flow:'technique', mode:'Monitoring', freq:'Continu', crit:'faible', dir:'uni', secure:true, manual:false},
  {id:'e27', s:'a2', t:'i6', flow:'technique', mode:'Réseau', freq:'Continu', crit:'elevee', dir:'uni', secure:true, manual:false},

  {id:'e28', s:'f2', t:'i1', flow:'fournisseur', mode:'Hébergement', freq:'Continu', crit:'elevee', dir:'uni', secure:true, manual:false},
  {id:'e29', s:'f3', t:'i1', flow:'fournisseur', mode:'Exploitation', freq:'Continu', crit:'elevee', dir:'uni', secure:true, manual:false},
  {id:'e30', s:'f3', t:'i6', flow:'fournisseur', mode:'Exploitation', freq:'Continu', crit:'elevee', dir:'uni', secure:true, manual:false},
  {id:'e31', s:'f1', t:'a1', flow:'fournisseur', mode:'TMA', freq:'Continu', crit:'critique', dir:'bi', secure:true, manual:false},

  {id:'e32', s:'s1', t:'i1', flow:'technique', mode:'Hébergement local', freq:'Continu', crit:'faible', dir:'uni', secure:true, manual:false},
  {id:'e33', s:'s2', t:'a1', flow:'applicatif', mode:'API', freq:'Temps réel', crit:'moyenne', dir:'uni', secure:true, manual:false}
];

/* ---------- Risques ---------- */
const RISKS = {
  a2: [{title:"Exposition internet sans authentification forte", niveau:'critique', score:'18/25', statut:'Ouvert', responsable:'Alice Bernard', echeance:'2026-08-15'}],
  f3: [{title:"Absence de plan de continuité d'activité formalisé", niveau:'elevee', score:'14/25', statut:'En traitement', responsable:'Sophie Leroy', echeance:'2026-09-01'}],
  a5: [{title:"Flux de paie non sécurisé vers l'éditeur SaaS", niveau:'critique', score:'16/25', statut:'Ouvert', responsable:'Julien Thomas', echeance:'2026-07-20'}],
  i1: [{title:"Fin de support matériel proche", niveau:'moyenne', score:'9/25', statut:'Planifié', responsable:'Julien Thomas', echeance:'2026-12-01'}],
  i6: [{title:"Règles de filtrage obsolètes", niveau:'elevee', score:'12/25', statut:'Ouvert', responsable:'Sophie Leroy', echeance:'2026-08-01'}]
};

/* ---------- Conformité SSI / RGPD ---------- */
const COMPLIANCE = {
  a2: [{type:'ssi', exigence:'Authentification forte (MFA)', ecart:"Absente sur l'accès locataire", preuve:'Aucune', action:'Déployer le MFA sur le portail locataires'}],
  i6: [{type:'ssi', exigence:'Règles de filtrage à jour', ecart:'Revue de règles > 18 mois', preuve:'Dernière revue 2024-12-02', action:'Planifier une revue des règles de filtrage'}],
  d1: [{type:'rgpd', exigence:'Registre des traitements', ecart:'Finalités non documentées pour le module réclamations', preuve:'Registre incomplet', action:'Compléter le registre des traitements'}]
};

/* ---------- Projets liés ---------- */
const PROJECTS = {
  a1: [{name:'Refonte Portail Client', role:'Système source'}],
  a2: [{name:'Refonte Portail Client', role:'Périmètre applicatif'}]
};

/* ---------- Actions & décisions ---------- */
const ACTIONS = {
  a1: [{type:'decision', title:"Faut-il migrer l'ERP vers le cloud ?", statut:'Attendue', echeance:'2026-09-01', codir:true}],
  a2: [{type:'action', title:'Déployer le MFA sur le portail locataires', statut:'En cours', echeance:'2026-07-25'}],
  f3: [
    {type:'decision', title:"Renouveler le contrat d'infogérance ?", statut:'Attendue', echeance:'2026-08-01', codir:true},
    {type:'action', title:'Mettre à jour le plan de continuité', statut:'En retard', echeance:'2026-06-20'}
  ]
};

/* ---------- Vues préconfigurées ---------- */
const PRESETS = [
  {id:'globale', label:'Globale'},
  {id:'processus', label:'Processus'},
  {id:'applicative', label:'Applicative'},
  {id:'technique', label:'Technique'},
  {id:'conformite', label:'Conformité'},
  {id:'codir', label:'CODIR'}
];
