/* Demandes de projet — entonnoir amont du portefeuille
   Saisie d'une demande → circuit de validation (avec ou sans passage en cycle de
   pilotage, selon la configuration) → création du projet.
   Script classique, portée globale partagée. Dépendances : fmtEur(), showToast(), showView(). */

const DEM_CFG={
  n1:true, instr:true, autoProj:false,
  seuilCopil:50000, seuilCodir:250000,
  exempt:['reglementaire'],
  delai:10
};
const DEM_TYPES={
  transformation:{l:'Transformation',m:'Refonte, digitalisation métier',bg:'var(--brand-gold-050)',fg:'var(--brand-gold-700)',ico:'<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><path d="M6.5 10v4h11v-4"/><rect x="14" y="14" width="7" height="7"/>'},
  infra:{l:'Infrastructure',m:'Cloud, réseau, résilience',bg:'var(--state-info-bg)',fg:'var(--state-info)',ico:'<path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>'},
  reglementaire:{l:'Réglementaire',m:'RGPD, DORA, obligation légale',bg:'var(--state-success-bg)',fg:'var(--state-success)',ico:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>'},
  produit:{l:'Produit & innovation',m:'Nouvelle offre, expérimentation',bg:'var(--purple-bg)',fg:'var(--purple)',ico:'<path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1h6c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z"/>'},
  evolution:{l:'Évolution applicative',m:'Amélioration d\'un existant',bg:'var(--teal-bg)',fg:'var(--teal)',ico:'<path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>'}
};
const DEM_ST={
  brouillon:{l:'Brouillon',bdg:'bdg-neutral'},
  soumise:{l:'Soumise',bdg:'bdg-info'},
  instruction:{l:'En instruction',bdg:'bdg-gold'},
  cycle:{l:'En cycle de pilotage',bdg:'bdg-gold'},
  validee:{l:'Validée',bdg:'bdg-success'},
  projet:{l:'Projet créé',bdg:'bdg-success'},
  ajournee:{l:'Ajournée',bdg:'bdg-warn'},
  refusee:{l:'Refusée',bdg:'bdg-danger'}
};
/* Séances proposées : lues dans les modules Cycles de pilotage (INST_PREP) et Réunions (MTG_LIST). */
function demSeanceOptions(inst){
  const out=[];
  try{
    if(typeof INST_PREP==='object'&&INST_PREP) Object.keys(INST_PREP).forEach(function(k){
      const x=INST_PREP[k];
      out.push({v:'prep:'+k,l:x.name+' — '+x.d+' '+x.m,m:x.type===inst});
    });
  }catch(e){}
  try{
    if(typeof MTG_LIST!=='undefined') MTG_LIST.filter(m=>m.st==='plan').forEach(function(m){
      const i=(typeof mtgInst==='function')?mtgInst(m.t):null;
      out.push({v:'mtg:'+m.id,l:m.title+' — '+((typeof mtgFDate==='function')?mtgFDate(m.date):m.date),m:!!i&&i.name===inst});
    });
  }catch(e){}
  out.sort((a,b)=>(b.m?1:0)-(a.m?1:0));
  return out;
}
function demSeanceLabel(ref){
  const o=demSeanceOptions('').find(x=>x.v===ref);
  return o?o.l:null;
}
let DEM=[
  {id:'DP-2026-018',t:'Portail fournisseurs self-care',type:'transformation',dir:'Direction Achats',who:'Nadia Cherif',ini:'NC',sponsor:'Marc Delaunay — DSI',date:'2026-09-02',
   need:"Les fournisseurs transmettent leurs factures et pièces justificatives par e-mail. Le traitement est manuel, non traçable, et génère 4 à 6 jours de retard sur les paiements.",
   obj:['Dématérialiser le dépôt des factures et des pièces contractuelles','Réduire le délai de traitement de 5 à 1 jour ouvré','Tracer les échanges pour les audits fournisseurs'],
   benef:'Gain estimé de 1,2 ETP sur le service Achats, réduction des pénalités de retard et conformité au devoir de vigilance.',
   outcome:"Les 480 fournisseurs référencés déposent leurs factures et pièces contractuelles dans un espace dédié, avec accusé de réception et suivi du paiement en ligne.",
   risk:"Poursuite des retards de paiement (pénalités de 34 k€ en 2025), absence de piste d'audit pour le devoir de vigilance, et dégradation de la relation fournisseurs sur les marchés tendus.",
   scope:'Service Achats (14 personnes), comptabilité fournisseurs (6), et les 480 fournisseurs référencés. Tous sites.',users:500,
   deadlineWhy:"Entrée en vigueur du nouveau processus de clôture comptable au 1er avril 2027.",
   constraints:'Interfaçage avec l\'ERP comptable ; hébergement UE imposé ; authentification externe à double facteur.',
   solutions:"Boîte e-mail dédiée avec tri manuel (testée en 2024, abandonnée) ; module fournisseur de l'ERP (licence jugée trop coûteuse pour le périmètre).",
   objective:'SO-1',val:'Claire Besson — Dir. Achats',
   swot:{s:"Équipe Achats mobilisée, processus déjà cartographié, référentiel fournisseurs à jour.",w:"Aucune compétence interne sur les portails externes ; dépendance à l'ERP comptable.",o:"Mise en conformité au devoir de vigilance ; socle d'authentification externe déjà acquis en 2026.",t:"Fenêtre de clôture comptable d'avril 2027 ; résistance possible des petits fournisseurs au dépôt en ligne."},
   tows:{so:"Capitaliser sur la cartographie existante pour livrer un lot 1 « dépôt de factures » avant la clôture d'avril.",wo:"Faire porter l'authentification externe par le socle existant plutôt que de recruter la compétence.",st:"Embarquer les 30 principaux fournisseurs en pilote pour sécuriser l'adhésion avant généralisation.",wt:"Limiter le périmètre du lot 1 à la facturation pour ne pas dépendre d'une évolution de l'ERP."},
   docs:[{n:'Cartographie du processus actuel.pdf',s:'1,4 Mo'},{n:'Pénalités de retard 2025.xlsx',s:'82 Ko'}],
   budget:180000,charge:210,deadline:'2027-03-31',prio:'haute',st:'cycle',instance:'COPIL',seance:'COPIL Transformation — 24 sept. 2026',
   jrn:[['Demande créée','Nadia Cherif','2 sept. 2026'],['Soumise pour validation','Nadia Cherif','3 sept. 2026'],['Validée par le N+1','Claire Besson — Dir. Achats','4 sept. 2026'],['Instruction terminée · avis favorable','Julie Fontaine — PMO','10 sept. 2026'],['Inscrite à l\'ordre du jour du COPIL du 24 sept.','Julie Fontaine — PMO','11 sept. 2026']]},
  {id:'DP-2026-017',t:'Mise en conformité DORA — registre des prestataires',type:'reglementaire',dir:'Direction Risques',who:'Amélie Rousseau',ini:'AR',sponsor:'Isabelle Fournier — DG',date:'2026-08-28',
   need:"Le règlement DORA impose un registre complet des prestataires TIC critiques avant janvier 2027. Le recensement actuel est partiel et tenu sous Excel.",
   obj:['Constituer le registre réglementaire complet','Automatiser la collecte auprès des métiers','Produire les états exigés par le superviseur'],
   benef:'Évite le risque de sanction et sécurise la supervision des prestataires critiques.',
   outcome:'Un registre unique, tenu à jour automatiquement, produisant les états exigés par le superviseur en un clic.',
   risk:"Sanction administrative et injonction de mise en conformité ; impossibilité de démontrer la maîtrise des prestataires critiques.",
   scope:'Direction Risques, achats IT, 120 contrats prestataires.',users:35,
   deadlineWhy:'Échéance réglementaire DORA au 17 janvier 2027.',
   constraints:'Réglementaire (DORA) · données contractuelles sensibles.',solutions:'Suivi Excel actuel, non auditable.',
   objective:'SO-2',val:'Isabelle Fournier — DG',docs:[{n:'Exigences DORA — registre TIC.pdf',s:'640 Ko'}],
   budget:40000,charge:60,deadline:'2026-12-31',prio:'haute',st:'validee',instance:null,seance:null,
   jrn:[['Demande créée','Amélie Rousseau','28 août 2026'],['Soumise pour validation','Amélie Rousseau','28 août 2026'],['Validée par le N+1','Isabelle Fournier — DG','29 août 2026'],['Instruction terminée · avis favorable','Julie Fontaine — PMO','5 sept. 2026'],['Validée hors cycle — type réglementaire exempté','Julie Fontaine — PMO','5 sept. 2026']]},
  {id:'DP-2026-016',t:'Refonte du parcours de souscription mobile',type:'produit',dir:'Direction Marketing',who:'Sophie Marchand',ini:'SM',sponsor:'Antoine Roy — Dir. Marketing',date:'2026-09-08',
   need:"Le taux d'abandon du parcours de souscription mobile atteint 62 %. Aucune refonte n'a été menée depuis 2022.",
   obj:['Réduire l\'abandon sous 40 %','Aligner le parcours sur la nouvelle identité','Ouvrir le paiement fractionné'],
   benef:'+ 3 200 souscriptions annuelles estimées, soit 480 k€ de chiffre d\'affaires additionnel.',
   outcome:"Un parcours mobile en 4 étapes, avec reprise de saisie et paiement fractionné, portant l'abandon sous 40 %.",
   risk:"Poursuite de l'érosion du taux de conversion mobile (− 8 pts en deux ans) au profit des offres concurrentes.",
   scope:'Parcours de souscription mobile, tous produits ; 120 000 visiteurs mensuels.',users:120000,
   deadlineWhy:'Campagne d\'acquisition prévue à la rentrée 2027.',
   constraints:'Conformité DSP2 sur le paiement ; refonte à iso-back-office.',solutions:'Optimisations ponctuelles du tunnel en 2025 (gain de 3 pts seulement).',
   objective:'SO-3',val:'Antoine Roy — Dir. Marketing',docs:[],
   budget:260000,charge:340,deadline:'2027-06-30',prio:'moyenne',st:'instruction',instance:null,seance:null,
   jrn:[['Demande créée','Sophie Marchand','8 sept. 2026'],['Soumise pour validation','Sophie Marchand','8 sept. 2026'],['Validée par le N+1','Antoine Roy — Dir. Marketing','9 sept. 2026'],['Instruction affectée au PMO','Julie Fontaine — PMO','10 sept. 2026']]},
  {id:'DP-2026-015',t:'Espace documentaire RH unifié',type:'evolution',dir:'Direction RH',who:'Farida Haddad',ini:'FH',sponsor:'Sophie Marchand — DRH adj.',date:'2026-09-11',
   need:"Les documents RH sont répartis sur trois espaces distincts, ce qui multiplie les demandes au service du personnel.",
   obj:['Regrouper les documents dans un espace unique','Gérer les droits par population'],
   benef:'Réduction estimée de 30 % des sollicitations du service RH.',
   budget:28000,charge:45,deadline:'2027-01-31',prio:'basse',st:'soumise',instance:null,seance:null,
   jrn:[['Demande créée','Farida Haddad','11 sept. 2026'],['Soumise pour validation','Farida Haddad','11 sept. 2026']]},
  {id:'DP-2026-014',t:'Supervision applicative temps réel',type:'infra',dir:'Direction Technique',who:'Marc Lefèvre',ini:'ML',sponsor:'Marc Delaunay — DSI',date:'2026-09-12',
   need:"Les incidents de production sont détectés par les utilisateurs avant l'exploitation. Aucune supervision centralisée.",
   obj:['Détecter 90 % des incidents avant signalement','Unifier les alertes des 14 applications critiques'],
   benef:'Réduction du temps moyen de rétablissement de 4 h à 45 min.',
   budget:95000,charge:120,deadline:'2027-02-28',prio:'haute',st:'brouillon',instance:null,seance:null,
   jrn:[['Demande créée','Marc Lefèvre','12 sept. 2026']]},
  {id:'DP-2026-011',t:'Chatbot de support niveau 1',type:'produit',dir:'Direction Client',who:'Julie Fontaine',ini:'JF',sponsor:'Antoine Roy — Dir. Marketing',date:'2026-07-15',
   need:"Volume d'appels de niveau 1 en hausse de 18 % sur un an.",
   obj:['Automatiser 35 % des demandes de niveau 1'],
   benef:'Économie estimée de 0,8 ETP sur le centre de contact.',
   budget:120000,charge:150,deadline:'2027-04-30',prio:'basse',st:'ajournee',koAt:'arb',instance:'COPIL',seance:'COPIL Transformation — 27 août 2026',
   jrn:[['Demande créée','Julie Fontaine','15 juil. 2026'],['Soumise pour validation','Julie Fontaine','16 juil. 2026'],['Validée par le N+1','Antoine Roy','17 juil. 2026'],['Instruction terminée · avis réservé (gains non étayés)','Julie Fontaine — PMO','5 août 2026'],['Ajournée en COPIL du 27 août — dossier de gains à consolider','COPIL Transformation','27 août 2026']]},
  {id:'DP-2026-009',t:'Migration du parc bureautique Windows 12',type:'infra',dir:'Direction Technique',who:'Jean Tissot',ini:'JT',sponsor:'Marc Delaunay — DSI',date:'2026-06-20',
   need:"Fin de support de l'OS actuel en décembre 2027.",
   obj:['Migrer 1 400 postes','Industrialiser le masterisation'],
   benef:'Maintien du support éditeur et du niveau de sécurité.',
   budget:310000,charge:260,deadline:'2027-11-30',prio:'moyenne',st:'projet',proj:'Migration Poste de travail',instance:'CODIR',seance:'CODIR — 2 juil. 2026',
   jrn:[['Demande créée','Jean Tissot','20 juin 2026'],['Soumise pour validation','Jean Tissot','20 juin 2026'],['Validée par le N+1','Marc Delaunay — DSI','22 juin 2026'],['Instruction terminée · avis favorable','Julie Fontaine — PMO','28 juin 2026'],['Arbitrage favorable en CODIR du 2 juil.','CODIR','2 juil. 2026'],['Projet « Migration Poste de travail » créé','Julie Fontaine — PMO','3 juil. 2026']]},
  {id:'DP-2026-006',t:'Application de covoiturage interne',type:'produit',dir:'Direction RSE',who:'Hugo Petit',ini:'HP',sponsor:'Isabelle Fournier — DG',date:'2026-05-04',
   need:"Demande interne portée par le comité RSE.",
   obj:['Réduire l\'empreinte carbone des déplacements domicile-travail'],
   benef:'Gain d\'image, contribution au bilan carbone.',
   budget:75000,charge:90,deadline:'2027-09-30',prio:'basse',st:'refusee',koAt:'arb',instance:'COPIL',seance:'COPIL Transformation — 28 mai 2026',
   jrn:[['Demande créée','Hugo Petit','4 mai 2026'],['Soumise pour validation','Hugo Petit','5 mai 2026'],['Validée par le N+1','Isabelle Fournier — DG','6 mai 2026'],['Instruction terminée · avis défavorable (hors trajectoire SI)','Julie Fontaine — PMO','20 mai 2026'],['Refusée en COPIL du 28 mai — hors priorités du schéma directeur','COPIL Transformation','28 mai 2026']]}
];
let DEM_SEQ=19, DEM_CUR=null, DEM_FILTER='all', DEM_FORM=null, DEM_DOCS=[];
const DEM_ME='Nadia Cherif';  /* utilisateur courant du prototype */
/* Référentiels : organisations demandeuses, objectifs stratégiques, personnes.
   Lus depuis les modules existants quand ils sont chargés, jamais d'UUID en UI. */
const DEM_ORG=['Direction Achats','Direction Risques','Direction Marketing','Direction RH','Direction Technique','Direction Client','Direction RSE','Direction Financière','Direction Juridique'];
const DEM_OBJ=[{id:'SO-1',l:'Industrialiser les processus de gestion'},{id:'SO-2',l:'Sécuriser la conformité et la maîtrise des risques'},{id:'SO-3',l:'Améliorer l\'expérience client'},{id:'SO-4',l:'Moderniser le socle technique'},{id:'SO-5',l:'Développer l\'engagement des collaborateurs'}];
const DEM_URG={haute:{l:'Haute',bdg:'bdg-danger',m:'Bloquant à court terme'},moyenne:{l:'Moyenne',bdg:'bdg-warn',m:'À traiter dans l\'année'},basse:{l:'Basse',bdg:'bdg-neutral',m:'Sans échéance contrainte'}};
function demPeople(){
  const out=[];
  try{ if(typeof DIR==='object'&&DIR) Object.keys(DIR).forEach(function(k){ out.push(DIR[k][0]+' — '+DIR[k][1]); }); }catch(e){}
  ['Marc Delaunay — DSI','Isabelle Fournier — DG','Claire Besson — Dir. Achats','Antoine Roy — Dir. Marketing','Julie Fontaine — PMO'].forEach(function(n){ if(out.indexOf(n)<0) out.push(n); });
  return out;
}
function demObjLabel(id){ const o=DEM_OBJ.find(x=>x.id===id); return o?o.l:null; }
/* compatibilité : les demandes antérieures n'ont pas les nouveaux champs */
DEM.forEach(function(d){
  if(!d.org) d.org=d.dir;
  if(!d.val) d.val=d.sponsor;
  if(!d.docs) d.docs=[];
  ['outcome','risk','scope','deadlineWhy','constraints','solutions','objective'].forEach(function(k){ if(d[k]===undefined) d[k]=''; });
  if(!d.swot) d.swot={s:'',w:'',o:'',t:''};
  if(!d.tows) d.tows={so:'',st:'',wo:'',wt:''};
  if(d.users===undefined) d.users=null;
});

function demEsc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function demIco(p,sz){ return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"'+(sz?' style="width:'+sz+'px;height:'+sz+'px"':'')+'>'+p+'</svg>'; }
function demK(n){ return (n/1000).toLocaleString('fr-FR',{maximumFractionDigits:0})+' k€'; }
/* badge collaborateur — s'appuie sur les helpers globaux (photo si enregistrée) */
function demPerson(name,size,role){
  if(typeof avPerson==='function') return avPerson(name,size||'av-sm',role);
  const ini=String(name||'?').split(/[\s-]+/).filter(Boolean).map(w=>w[0]).slice(0,2).join('').toUpperCase();
  return '<span class="av-p"><span class="av av-1 '+(size||'av-sm')+'">'+ini+'</span><span class="av-n">'+demEsc(name)+'</span></span>';
}
function demBadge(name,size){ return (typeof avBadge==='function')?avBadge(name,size||'av-sm'):demPerson(name,size); }
/* n'affiche un badge que si l'auteur est une personne (et non un comit\u00e9) */
function demAuthor(who,size){
  const n=String(who||'').split(' \u2014 ')[0].trim();
  if(!n || /^(COPIL|CODIR|COPROJ|Comit\u00e9|Instance)/i.test(n)) return '';
  return demBadge(n,size);
}
function demToday(){ return new Date('2026-09-14').toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'}); }
function demDate(s){ if(!s) return '—'; const d=new Date(s); return d.toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'}); }

/* ─── Circuit calculé depuis la configuration ─── */
function demNeedsCycle(d){
  if(DEM_CFG.exempt.indexOf(d.type)>=0) return false;
  return (d.budget||0)>=DEM_CFG.seuilCopil;
}
function demInstance(d){
  if(!demNeedsCycle(d)) return null;
  return (d.budget||0)>=DEM_CFG.seuilCodir?'CODIR':'COPIL';
}
function demSteps(d){
  const cyc=demNeedsCycle(d), inst=demInstance(d)||d.instance;
  const s=[{k:'sub',l:'Soumission',s:'Demandeur'}];
  if(DEM_CFG.n1) s.push({k:'n1',l:'Validation N+1',s:'Responsable de direction'});
  if(DEM_CFG.instr) s.push({k:'ins',l:'Instruction',s:'PMO · '+DEM_CFG.delai+' j ouvrés'});
  s.push(cyc?{k:'arb',l:'Arbitrage '+inst,s:'Cycle de pilotage'}:{k:'arb',l:'Validation PMO',s:'Hors cycle de pilotage'});
  s.push({k:'prj',l:'Création du projet',s:DEM_CFG.autoProj?'Automatique':'Sur action du PMO'});
  return s;
}
function demReached(d){
  if(d.st==='brouillon') return 'sub';
  if(d.st==='soumise') return DEM_CFG.n1?'n1':(DEM_CFG.instr?'ins':'arb');
  if(d.st==='instruction') return 'ins';
  if(d.st==='cycle') return 'arb';
  if(d.st==='validee') return 'prj';
  if(d.st==='projet') return 'end';
  return d.koAt||'arb';
}
function demNext(d,from){
  if(from==='sub') return DEM_CFG.n1?'soumise':(DEM_CFG.instr?'instruction':'cycle');
  if(from==='n1') return DEM_CFG.instr?'instruction':'cycle';
  if(from==='ins') return demNeedsCycle(d)?'cycle':'validee';
  return 'validee';
}
function demLog(d,txt,who){ d.jrn.push([txt,who||'Julie Fontaine — PMO',demToday()]); }

/* ─── Écran : liste ─── */
function demRender(){ demShowList(); }
function demShowList(){
  DEM_CUR=null;
  const r=document.getElementById('dem-root'); if(!r) return;
  const n=k=>DEM.filter(d=>k(d)).length;
  const kAInstruire=n(d=>d.st==='soumise'||d.st==='instruction'), kCycle=n(d=>d.st==='cycle'),
        kValid=n(d=>d.st==='validee'), kKo=n(d=>d.st==='refusee'||d.st==='ajournee');
  const enveloppe=DEM.filter(d=>['soumise','instruction','cycle','validee'].indexOf(d.st)>=0).reduce((s,d)=>s+d.budget,0);
  r.innerHTML=
   '<div class="pg-head">'
    +'<div><h1>Demandes de projet</h1><p class="np-sub">Point d\'entrée unique des besoins métiers. Chaque demande suit le circuit défini dans la configuration, passe en cycle de pilotage lorsque les seuils l\'exigent, et devient un projet du portefeuille une fois validée.</p></div>'
    +'<div class="head-actions">'
      +'<button class="btn btn-secondary" onclick="demOpenConfig()">'+demIco('<path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6h.09A1.65 1.65 0 0 0 10 3.09V3a2 2 0 1 1 4 0v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9v.09c.36.14.68.38.91.7"/>')+'Configuration du circuit</button>'
      +'<button class="btn btn-primary" onclick="demNew()">'+demIco('<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>')+'Nouvelle demande</button>'
    +'</div></div>'
   +'<div class="list-kpis" style="grid-template-columns:repeat(4,1fr)">'
    +demKpi('À instruire',kAInstruire,'En attente du PMO ou du N+1','var(--state-info-bg)','var(--state-info)','<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>')
    +demKpi('En cycle de pilotage',kCycle,'Inscrites à un comité','var(--brand-gold-050)','var(--brand-gold-700)','<path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0"/><polyline points="12 8 12 12 14 14"/>')
    +demKpi('Validées à convertir',kValid,'Prêtes à devenir un projet','var(--state-success-bg)','var(--state-success)','<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>')
    +demKpi('Enveloppe en circuit',demK(enveloppe),kKo+' demande'+(kKo>1?'s':'')+' refusée'+(kKo>1?'s':'')+' ou ajournée'+(kKo>1?'s':''),'var(--purple-bg)','var(--purple)','<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>')
   +'</div>'
   +'<div class="card tablecard">'
    +'<div class="dem-bar">'
      +'<div class="dem-search">'+demIco('<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>')+'<input id="dem-q" placeholder="Rechercher une demande, une direction…" oninput="demRenderRows()"></div>'
      +'<div class="seg-toggle" id="dem-seg">'
        +['all','En circuit','Terminées'].map(function(x,i){ const k=['all','circuit','done'][i]; return '<button class="seg-btn'+(DEM_FILTER===k?' active':'')+'" onclick="demFilter(\''+k+'\',this)">'+(k==='all'?'Toutes':x)+'</button>'; }).join('')
      +'</div>'
      +'<div style="flex:1"></div>'
      +'<span style="font-size:12px;color:var(--neutral-500)">Seuil de passage en cycle : <b style="color:var(--brand-ink)">'+demK(DEM_CFG.seuilCopil)+'</b></span>'
    +'</div>'
    +'<div class="table-wrap"><table class="dem-table"><thead><tr>'
      +'<th>Réf.</th><th>Demande</th><th>Urgence</th><th>Demandeur</th><th>Validateur</th><th class="right">Budget estimé</th><th>Échéance</th><th>Circuit</th><th>Statut</th><th></th>'
    +'</tr></thead><tbody id="dem-rows"></tbody></table></div>'
   +'</div>'
   +'<div class="dem-rules">'
    +'<div class="card dem-rule"><div class="dem-rule-k">Passage en cycle de pilotage</div><div class="dem-rule-v">À partir de '+demK(DEM_CFG.seuilCopil)+'</div><div class="dem-rule-m">En dessous du seuil, la demande est validée par le PMO sans arbitrage en comité. Au-delà de '+demK(DEM_CFG.seuilCodir)+', l\'arbitrage remonte au CODIR.</div></div>'
    +'<div class="card dem-rule"><div class="dem-rule-k">Étapes actives</div><div class="dem-rule-v">'+demSteps({budget:DEM_CFG.seuilCopil,type:'transformation'}).length+' étapes</div><div class="dem-rule-m">'+demSteps({budget:DEM_CFG.seuilCopil,type:'transformation'}).map(s=>s.l).join(' → ')+'</div></div>'
    +'<div class="card dem-rule"><div class="dem-rule-k">Exemptions</div><div class="dem-rule-v">'+(DEM_CFG.exempt.length?DEM_CFG.exempt.map(t=>DEM_TYPES[t].l).join(', '):'Aucune')+'</div><div class="dem-rule-m">Ces types de demandes sont validés hors cycle quel que soit leur montant — typiquement les obligations réglementaires à échéance contrainte.</div></div>'
   +'</div>'
   +demModals();
  demRenderRows();
}
function demKpi(label,num,sub,bg,fg,ico){
  return '<div class="card list-kpi"><div class="list-kpi-ico" style="background:'+bg+';color:'+fg+'">'+demIco(ico)+'</div><div><div class="list-kpi-label">'+label+'</div><div class="list-kpi-num"'+(typeof num==='string'?' style="font-size:22px"':'')+'>'+num+'</div><div class="list-kpi-sub" style="color:'+fg+'">'+sub+'</div></div></div>';
}
function demFilter(k,btn){
  DEM_FILTER=k;
  document.querySelectorAll('#dem-seg .seg-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  demRenderRows();
}
function demRenderRows(){
  const tb=document.getElementById('dem-rows'); if(!tb) return;
  const q=((document.getElementById('dem-q')||{}).value||'').toLowerCase();
  const done=['projet','refusee','ajournee'];
  const rows=DEM.filter(function(d){
    if(DEM_FILTER==='circuit' && done.indexOf(d.st)>=0) return false;
    if(DEM_FILTER==='done' && done.indexOf(d.st)<0) return false;
    if(q && (d.t+' '+d.dir+' '+d.who+' '+d.id).toLowerCase().indexOf(q)<0) return false;
    return true;
  });
  tb.innerHTML=rows.length?rows.map(function(d){
    const ty=DEM_TYPES[d.type], st=DEM_ST[d.st], cyc=demNeedsCycle(d), inst=demInstance(d)||d.instance;
    const urg=DEM_URG[d.prio]||DEM_URG.moyenne;
    const route=cyc
      ? '<span class="dem-route" style="background:var(--brand-gold-050);color:var(--brand-gold-700)">'+demIco('<path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0"/><polyline points="12 8 12 12 14 14"/>')+inst+'</span>'
      : '<span class="dem-route" style="background:var(--neutral-100);color:var(--neutral-600)">'+demIco('<polyline points="20 6 9 17 4 12"/>')+'Hors cycle</span>';
    return '<tr onclick="demOpen(\''+d.id+'\')">'
      +'<td><span class="dem-ref">'+d.id+'</span></td>'
      +'<td><div style="display:flex;align-items:flex-start;gap:10px"><span class="dem-tyi" style="background:'+ty.bg+';color:'+ty.fg+'" title="'+ty.l+'">'+demIco(ty.ico)+'</span><span style="min-width:0"><span class="dem-title">'+demEsc(d.t)+'</span><div class="dem-sub">'+demEsc(d.dir)+' · créée le '+demDate(d.date)+'</div></span></div></td>'
      +'<td><span class="badge '+urg.bdg+'">'+urg.l+'</span></td>'
      +'<td>'+demPerson(d.who)+'</td>'
      +'<td>'+(d.val?demPerson(d.val.split(' — ')[0]):'<span class="dem-sub">—</span>')+'</td>'
      +'<td class="right"><span class="dem-num">'+(d.budget?demK(d.budget):'<span class="dem-sub">non chiffré</span>')+'</span></td>'
      +'<td><span class="dem-sub" style="font-size:12.5px;color:var(--neutral-600)">'+demDate(d.deadline)+'</span></td>'
      +'<td>'+route+(d.seance&&d.st==='cycle'?'<div class="dem-sub" style="margin-top:4px">'+demEsc(d.seance.replace(/^[A-Z]+ ?[A-Za-z]* — /,''))+'</div>':'')+'</td>'
      +'<td><span class="badge '+st.bdg+'">'+st.l+'</span>'+(d.st==='projet'?'<div class="dem-sub" style="margin-top:4px">'+demEsc(d.proj)+'</div>':'')+'</td>'
      +'<td class="dem-chev">'+demIco('<polyline points="9 18 15 12 9 6"/>')+'</td>'
    +'</tr>';
  }).join(''):'<tr><td colspan="10" class="dem-empty">Aucune demande ne correspond à ce filtre.</td></tr>';
}

/* ─── Écran : fiche demande ─── */
function demOpen(id){
  const d=DEM.find(x=>x.id===id); if(!d) return;
  DEM_CUR=id;
  const r=document.getElementById('dem-root');
  const ty=DEM_TYPES[d.type], st=DEM_ST[d.st], steps=demSteps(d), reached=demReached(d);
  const ki=steps.map(s=>s.k).indexOf(reached);
  const ko=(d.st==='refusee'||d.st==='ajournee');
  r.innerHTML=
   '<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">'
    +'<button class="btn btn-secondary" onclick="demShowList()">'+demIco('<polyline points="15 18 9 12 15 6"/>')+'Toutes les demandes</button>'
    +'<span style="font-size:12.5px;color:var(--neutral-500)">'+d.id+' · déposée le '+demDate(d.date)+'</span>'
   +'</div>'
   +'<div class="card dem-hero">'
    +'<div class="dem-hero-ico" style="background:'+ty.bg+';color:'+ty.fg+'">'+demIco(ty.ico)+'</div>'
    +'<div class="dem-hero-mid"><h2>'+demEsc(d.t)+'</h2>'
      +'<div class="dem-hero-meta"><span class="badge '+st.bdg+'">'+st.l+'</span><span class="dem-route" style="background:'+ty.bg+';color:'+ty.fg+'">'+ty.l+'</span><span>'+demEsc(d.dir)+'</span><span>·</span>'+demPerson(d.who,'av-xs')+'<span>·</span><span>Sponsor</span>'+demPerson(d.sponsor.split(' — ')[0],'av-xs')+'</div></div>'
    +'<div class="dem-hero-acts">'+demActions(d)+'</div>'
   +'</div>'
   +'<div class="dem-flow">'+steps.map(function(s,i){
      let cls='';
      if(ko && i===ki) cls='ko';
      else if(d.st==='projet'||i<ki) cls='done';
      else if(i===ki) cls='cur';
      const num=(cls==='done')?demIco('<polyline points="20 6 9 17 4 12"/>'):(cls==='ko'?demIco('<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>'):(i+1));
      return '<div class="dem-step '+cls+'"><div class="dem-step-n">'+num+'</div><div class="dem-step-l">'+s.l+'</div><div class="dem-step-s">'+s.s+'</div></div>';
    }).join('')+'</div>'
   +'<div class="card dem-panel" style="margin-bottom:16px"><div class="dem-panel-t" style="margin-bottom:12px">Synthèse pour le validateur</div>'+demSynth(d)+'</div>'
   +'<div class="dem-grid">'
    +'<div class="card dem-card">'
      +'<div class="dem-sec"><div class="dem-sec-t">Besoin / problème à résoudre</div><div class="dem-body">'+demEsc(d.need)+'</div></div>'
      +(d.outcome?'<div class="dem-sec"><div class="dem-sec-t">Résultat attendu</div><div class="dem-body">'+demEsc(d.outcome)+'</div></div>':'')
      +(d.obj&&d.obj.length?'<div class="dem-sec"><div class="dem-sec-t">Objectifs visés</div><div class="dem-obj">'+d.obj.map(o=>'<div class="dem-obj-i">'+demIco('<polyline points="20 6 9 17 4 12"/>')+'<span>'+demEsc(o)+'</span></div>').join('')+'</div></div>':'')
      +(d.scope||d.users?'<div class="dem-sec"><div class="dem-sec-t">Périmètre concerné</div><div class="dem-body muted">'+demEsc(d.scope||'—')+(d.users?' <b style="color:var(--brand-ink)">'+d.users.toLocaleString('fr-FR')+' utilisateurs concernés.</b>':'')+'</div></div>':'')
      +'<div class="dem-sec"><div class="dem-sec-t">Bénéfices attendus</div><div class="dem-body muted">'+demEsc(d.benef)+'</div></div>'
      +(d.risk?'<div class="dem-sec"><div class="dem-sec-t">Risques si on ne fait rien</div><div class="dem-body muted">'+demEsc(d.risk)+'</div></div>':'')
      +(d.constraints?'<div class="dem-sec"><div class="dem-sec-t">Contraintes connues</div><div class="dem-body muted">'+demEsc(d.constraints)+'</div></div>':'')
      +(d.solutions?'<div class="dem-sec"><div class="dem-sec-t">Solutions déjà envisagées</div><div class="dem-body muted">'+demEsc(d.solutions)+'</div></div>':'')
      +demSwotView(d)
      +'<div class="dem-sec"><div class="dem-sec-t">Cadrage estimatif</div><div class="dem-kv">'
        +'<div class="dem-kv-i"><div class="dem-kv-k">Budget estimé</div><div class="dem-kv-v">'+(d.budget?fmtEur(d.budget):'Non chiffré')+'</div></div>'
        +'<div class="dem-kv-i"><div class="dem-kv-k">Charge interne</div><div class="dem-kv-v">'+(d.charge?d.charge+' J/H':'Non chiffrée')+'</div></div>'
        +'<div class="dem-kv-i"><div class="dem-kv-k">Échéance souhaitée</div><div class="dem-kv-v" style="font-size:14px">'+demDate(d.deadline)+'</div>'+(d.deadlineWhy?'<div class="dem-syn-m">'+demEsc(d.deadlineWhy)+'</div>':'')+'</div>'
        +'<div class="dem-kv-i"><div class="dem-kv-k">Urgence</div><div class="dem-kv-v" style="font-size:14px">'+(DEM_URG[d.prio]||DEM_URG.moyenne).l+'</div><div class="dem-syn-m">'+(DEM_URG[d.prio]||DEM_URG.moyenne).m+'</div></div>'
      +'</div></div>'
      +(d.docs&&d.docs.length?'<div class="dem-sec"><div class="dem-sec-t">Pièces jointes</div><div class="dem-files">'+d.docs.map(function(f){ return '<div class="dem-file">'+demIco('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>')+'<span class="dem-file-n">'+demEsc(f.n)+'</span><span class="dem-file-s">'+demEsc(f.s)+'</span></div>'; }).join('')+'</div></div>':'')
    +'</div>'
    +'<div>'
      +'<div class="card dem-panel">'+demDecisionPanel(d)+'</div>'
      +'<div class="card dem-panel"><div class="dem-panel-t">Journal de la demande</div><div class="dem-panel-s">Toutes les étapes sont horodatées et reprises dans le dossier d\'arbitrage.</div>'
        +'<div class="dem-jrn">'+d.jrn.slice().reverse().map(function(j,i){
          return '<div class="dem-jrn-i"><div class="dem-jrn-d"'+(i===0?' style="background:var(--brand-gold)"':'')+'></div><div class="dem-jrn-b"><div class="dem-jrn-t">'+demEsc(j[0])+'</div><div class="dem-jrn-m" style="display:flex;align-items:center;gap:6px">'+demAuthor(j[1],'av-xs')+'<span>'+demEsc(j[1])+' · '+demEsc(j[2])+'</span></div></div></div>';
        }).join('')+'</div>'
      +'</div>'
    +'</div>'
   +'</div>'
   +demModals();
}
/* synthèse lisible sans entrer en édition — ce que le validateur doit voir d'abord */
function demSynth(d){
  const urg=DEM_URG[d.prio]||DEM_URG.moyenne, obj=demObjLabel(d.objective);
  const i=[
    ['Urgence','<span class="badge '+urg.bdg+'">'+urg.l+'</span>',urg.m,true],
    ['Budget estimé',(d.budget?demK(d.budget):'Non chiffré'),(d.budget?fmtEur(d.budget):'À préciser à l\'instruction')],
    ['Charge interne',(d.charge?d.charge+' J/H':'Non chiffrée'),'Estimation du demandeur'],
    ['Échéance souhaitée',demDate(d.deadline),d.deadlineWhy?demEsc(d.deadlineWhy):'Aucune justification'],
    ['Direction demandeuse',demEsc(d.dir),(d.users?d.users.toLocaleString('fr-FR')+' utilisateurs concernés':'Périmètre non chiffré')],
    ['Sponsor métier',d.sponsor?demPerson(d.sponsor.split(' — ')[0],'av-xs'):'—',d.sponsor?demEsc(d.sponsor.split(' — ')[1]||''):'Non désigné',true],
    ['Validateur',d.val?demPerson(d.val.split(' — ')[0],'av-xs'):'—',d.val?demEsc(d.val.split(' — ')[1]||''):'Défini par le circuit',true],
    ['Objectif stratégique',obj?demEsc(obj):'Aucun',obj?'Objectif rattaché':'Non rattachée',!!obj]
  ];
  return '<div class="dem-syn">'+i.map(function(x){
    return '<div class="dem-syn-i"><div class="dem-syn-k">'+x[0]+'</div><div class="dem-syn-v'+(x[3]?' sm':'')+'">'+x[1]+'</div>'+(x[2]?'<div class="dem-syn-m">'+x[2]+'</div>':'')+'</div>';
  }).join('')+'</div>';
}
/* SWOT / TOWS de la fiche — masqué si l'analyse n'a pas été renseignée */
function demSwotView(d){
  const sw=d.swot||{}, tw=d.tows||{};
  const hasSw=['s','w','o','t'].some(k=>sw[k]), hasTw=['so','wo','st','wt'].some(k=>tw[k]);
  if(!hasSw&&!hasTw) return '';
  const q=function(k,b,t,m){
    return '<div class="dem-q '+k+'"><div class="dem-q-h"><span class="dem-q-b">'+b+'</span><span class="dem-q-t">'+t+'</span><span class="dem-q-m">'+m+'</span></div>'
      +'<div class="dem-q-v'+(sw[k]?'':' empty')+'">'+(sw[k]?demEsc(sw[k]):'Non renseigné')+'</div></div>';
  };
  const tows=[['so','SO','Forces × Opportunités · attaquer'],['wo','WO','Faiblesses × Opportunités · renforcer'],['st','ST','Forces × Menaces · défendre'],['wt','WT','Faiblesses × Menaces · éviter']].filter(x=>tw[x[0]]);
  return '<div class="dem-sec"><div class="dem-sec-t">Analyse SWOT'+(tows.length?' / TOWS':'')+'</div>'
    +(hasSw?'<div class="dem-swot">'+q('s','S','Forces','Atouts internes')+q('w','W','Faiblesses','Limites internes')+q('o','O','Opportunités','Externe favorable')+q('t','T','Menaces','Externe défavorable')+'</div>':'')
    +(tows.length?'<div class="dem-tows">'+tows.map(function(x){
        return '<div class="dem-tw"><div class="dem-tw-k">'+x[1]+'</div><div class="dem-tw-t">'+x[2]+'</div><div class="dem-q-v">'+demEsc(tw[x[0]])+'</div></div>';
      }).join('')+'</div>':'')
  +'</div>';
}
function demActions(d){
  const s=d.st;
  if(s==='brouillon') return '<button class="btn btn-secondary" onclick="demEdit(\''+d.id+'\')">'+demIco('<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/>')+'Modifier</button><button class="btn btn-primary" onclick="demSubmit(\''+d.id+'\')">'+demIco('<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>')+'Soumettre la demande</button>';
  if(s==='soumise') return '<button class="btn btn-secondary" onclick="demReject(\''+d.id+'\')">Refuser</button><button class="btn btn-primary" onclick="demValidateN1(\''+d.id+'\')">'+demIco('<polyline points="20 6 9 17 4 12"/>')+'Valider (N+1)</button>';
  if(s==='instruction') return '<button class="btn btn-primary" onclick="demOpenInstr()">'+demIco('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>')+'Conclure l\'instruction</button>';
  if(s==='cycle') return d.seance
    ? '<button class="btn btn-secondary" onclick="showView(\'cycles\')">Voir le cycle</button><button class="btn btn-primary" onclick="demOpenDec()">'+demIco('<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>')+'Enregistrer la décision</button>'
    : '<button class="btn btn-primary" onclick="demOpenOdj()">'+demIco('<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/>')+'Inscrire à l\'ordre du jour</button>';
  if(s==='validee') return '<button class="btn btn-primary" onclick="demConvert(\''+d.id+'\')">'+demIco('<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>')+'Créer le projet</button>';
  if(s==='projet') return '<button class="btn btn-primary" onclick="showView(\'detail\')">'+demIco('<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>')+'Ouvrir le projet</button>';
  return '<button class="btn btn-secondary" onclick="demReopen(\''+d.id+'\')">'+demIco('<path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/>')+'Rouvrir la demande</button>';
}
function demDecisionPanel(d){
  const cyc=demNeedsCycle(d), inst=demInstance(d)||d.instance;
  let t,s;
  if(d.st==='brouillon'){ t='Demande en cours de rédaction'; s='Complétez le dossier puis soumettez-le. Le circuit sera déterminé automatiquement à la soumission.'; }
  else if(d.st==='soumise'){ t='En attente de validation N+1'; s='Le responsable de '+d.dir+' doit confirmer l\'opportunité avant instruction par le PMO.'; }
  else if(d.st==='instruction'){ t='Instruction par le PMO'; s='Vérification de la faisabilité, du chiffrage et de l\'alignement au schéma directeur. Délai cible : '+DEM_CFG.delai+' jours ouvrés.'; }
  else if(d.st==='cycle'){ t=d.seance?'Inscrite au '+inst:'À inscrire en '+inst; s=d.seance?'Point programmé : '+d.seance+'. La décision du comité clôturera l\'arbitrage.':'Le montant ('+demK(d.budget)+') dépasse le seuil de '+demK(DEM_CFG.seuilCopil)+' : un arbitrage en '+inst+' est requis.'; }
  else if(d.st==='validee'){ t='Validée — prêt à devenir un projet'; s='La création du projet reprend le cadrage, le budget et le sponsor de la demande.'; }
  else if(d.st==='projet'){ t='Projet créé'; s='La demande est clôturée ; le suivi se poursuit dans la fiche projet « '+(d.proj||d.t)+' ».'; }
  else { t=d.st==='refusee'?'Demande refusée':'Demande ajournée'; s=d.jrn[d.jrn.length-1][0]; }
  return '<div class="dem-panel-t">'+t+'</div><div class="dem-panel-s">'+demEsc(s)+'</div>'
    +'<div class="dem-prev-row"><span class="k">Circuit appliqué</span><span class="v">'+(cyc?inst:'Hors cycle')+'</span></div>'
    +'<div class="dem-prev-row"><span class="k">Validation N+1</span><span class="v">'+(DEM_CFG.n1?'Requise':'Désactivée')+'</span></div>'
    +'<div class="dem-prev-row"><span class="k">Instruction PMO</span><span class="v">'+(DEM_CFG.instr?'Requise':'Désactivée')+'</span></div>'
    +'<div class="dem-prev-row"><span class="k">Séance d\'arbitrage</span><span class="v">'+(d.seance?demEsc(d.seance):'—')+'</span></div>'
    +'<div class="dem-note">'+demIco('<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>')+'<span>Le circuit est recalculé à chaque modification du budget ou du type. Règles modifiables dans <a class="cyc-link" style="display:inline" onclick="demOpenConfig()">la configuration</a>.</span></div>';
}

/* ─── Transitions ─── */
function demRefresh(){ if(DEM_CUR) demOpen(DEM_CUR); else demShowList(); }
function demSubmit(id){
  const d=DEM.find(x=>x.id===id); d.st=demNext(d,'sub');
  demLog(d,'Soumise pour validation',d.who);
  if(d.st==='cycle'){ d.instance=demInstance(d); demLog(d,'Circuit sans instruction — arbitrage en '+d.instance+' requis'); }
  showToast('Demande « '+d.t+' » soumise · '+(DEM_CFG.n1?'validation N+1 attendue':'instruction PMO ouverte'));
  demRefresh();
}
function demValidateN1(id){
  const d=DEM.find(x=>x.id===id); d.st=demNext(d,'n1');
  demLog(d,'Validée par le N+1','Responsable '+d.dir);
  if(d.st==='cycle') d.instance=demInstance(d);
  showToast('Validation N+1 enregistrée'+(d.st==='instruction'?' · instruction affectée au PMO':''));
  demRefresh();
}
function demReject(id){
  const d=DEM.find(x=>x.id===id); d.st='refusee'; d.koAt=demReached(d);
  demLog(d,'Refusée avant instruction','Responsable '+d.dir);
  showToast('Demande refusée'); demRefresh();
}
function demReopen(id){
  const d=DEM.find(x=>x.id===id); d.st='brouillon'; d.koAt=null; d.seance=null;
  demLog(d,'Demande rouverte pour complément de dossier');
  showToast('Demande rouverte en brouillon'); demRefresh();
}
function demConvert(id){
  const d=DEM.find(x=>x.id===id);
  d.st='projet'; d.proj=d.t;
  demLog(d,'Projet « '+d.t+' » créé depuis la demande');
  demAddProjectRow(d);
  showToast('Projet « '+d.t+' » créé · fiche projet initialisée');
  demRefresh();
}
function demAddProjectRow(d){
  const tb=document.querySelector('#plTableCard tbody'); if(!tb) return;
  const ty=DEM_TYPES[d.type];
  const tr=document.createElement('tr');
  tr.style.cursor='pointer';
  tr.setAttribute('onclick',"showView('detail')");
  tr.innerHTML='<td><div class="cat-cell"><div class="cat-ico ti-gold">'+demIco(ty.ico)+'</div><span class="cat-name">'+ty.l+'</span></div></td>'
   +'<td><div class="pname">'+demEsc(d.t)+'</div><div class="psub2">Issu de la demande '+d.id+'</div></td>'
   +'<td><span class="nature">Build</span></td>'
   +'<td><span class="sante">Non évaluée</span></td>'
   +'<td><span class="badge bdg-info">Cadrage</span></td>'
   +'<td><span class="mrole">Sponsor</span></td>'
   +'<td><div class="prog-cell"><span class="prog-val">0%</span></div></td>'
   +'<td>'+demDate(d.deadline)+'</td>'
   +'<td><span class="dem-sub">— · — · —</span></td>'
   +'<td><span class="dem-sub">Nouveau</span></td>'
   +'<td><span class="badge bdg-neutral">Demande '+d.id+'</span></td>';
  tb.insertBefore(tr,tb.firstChild);
}

/* ─── Modales ─── */
function demModals(){
  return ''
  +'<div class="modal-overlay" id="demCfgModal" onclick="if(event.target===this)demCloseCfg()"><div class="modal modal-dem">'
    +'<div class="modal-head"><div class="modal-head-ico">'+demIco('<path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path d="M4 12h2M18 12h2M12 4v2M12 18v2"/>')+'</div>'
      +'<div><div class="modal-title">Configuration du circuit de demande</div><div class="modal-sub">Détermine les étapes imposées et le déclenchement du passage en cycle de pilotage.</div></div>'
      +'<button class="modal-close" onclick="demCloseCfg()">'+demIco('<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>')+'</button></div>'
    +'<div class="modal-body">'
      +'<div class="field-row3" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px">'
        +'<div class="field"><label class="field-label">Seuil COPIL (€)</label><input class="input" id="cfg-copil" type="number" step="5000" value="'+DEM_CFG.seuilCopil+'"></div>'
        +'<div class="field"><label class="field-label">Seuil CODIR (€)</label><input class="input" id="cfg-codir" type="number" step="10000" value="'+DEM_CFG.seuilCodir+'"></div>'
        +'<div class="field"><label class="field-label">Délai d\'instruction (j)</label><input class="input" id="cfg-delai" type="number" value="'+DEM_CFG.delai+'"></div>'
      +'</div>'
      +'<div class="dem-sec-t" style="margin-top:6px">Étapes du circuit</div>'
      +demSw('n1','Validation hiérarchique (N+1)','Le responsable de la direction demandeuse valide avant instruction.')
      +demSw('instr','Instruction par le PMO','Étude de faisabilité, chiffrage et alignement au schéma directeur.')
      +demSw('autoProj','Création automatique du projet','Le projet est créé dès la validation, sans action manuelle du PMO.')
      +'<div class="dem-sec-t" style="margin-top:18px">Types exemptés de cycle de pilotage</div>'
      +'<div class="dem-pillrow">'+Object.keys(DEM_TYPES).map(k=>'<button class="dem-pill'+(DEM_CFG.exempt.indexOf(k)>=0?' sel':'')+'" data-t="'+k+'" onclick="this.classList.toggle(\'sel\')">'+DEM_TYPES[k].l+'</button>').join('')+'</div>'
      +'<div class="dem-note" style="margin-top:14px">'+demIco('<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>')+'<span>Les demandes déjà engagées conservent leur historique ; le circuit restant est recalculé avec les nouvelles règles.</span></div>'
    +'</div>'
    +'<div class="modal-foot"><button class="btn btn-secondary" onclick="demCloseCfg()">Annuler</button><button class="btn btn-primary" onclick="demSaveCfg()">Enregistrer la configuration</button></div>'
  +'</div></div>'
  +'<div class="modal-overlay" id="demOdjModal" onclick="if(event.target===this)demCloseOdj()"><div class="modal">'
    +'<div class="modal-head"><div class="modal-head-ico">'+demIco('<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/>')+'</div>'
      +'<div><div class="modal-title">Inscrire la demande à un cycle de pilotage</div><div class="modal-sub">Le point est ajouté à l\'ordre du jour avec le dossier d\'instruction.</div></div>'
      +'<button class="modal-close" onclick="demCloseOdj()">'+demIco('<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>')+'</button></div>'
    +'<div class="modal-body"><div class="field"><label class="field-label">Séance</label><select class="input" id="odj-seance"></select></div>'
      +'<div class="field"><label class="field-label">Type de point</label><select class="input" id="odj-kind"><option>Décision — Go / No Go</option><option>Arbitrage budgétaire</option><option>Information</option></select></div>'
      +'<div class="field"><label class="field-label">Temps demandé</label><select class="input" id="odj-time"><option>10 min</option><option selected>15 min</option><option>20 min</option><option>30 min</option></select></div></div>'
    +'<div class="modal-foot"><button class="btn btn-secondary" onclick="demCloseOdj()">Annuler</button><button class="btn btn-primary" onclick="demSaveOdj()">Inscrire à l\'ordre du jour</button></div>'
  +'</div></div>'
  +'<div class="modal-overlay" id="demDecModal" onclick="if(event.target===this)demCloseDec()"><div class="modal">'
    +'<div class="modal-head"><div class="modal-head-ico">'+demIco('<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>')+'</div>'
      +'<div><div class="modal-title">Décision du comité</div><div class="modal-sub" id="dec-sub">—</div></div>'
      +'<button class="modal-close" onclick="demCloseDec()">'+demIco('<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>')+'</button></div>'
    +'<div class="modal-body">'
      +'<label class="field-label" style="display:block;margin-bottom:10px">Issue de l\'arbitrage</label>'
      +'<div class="type-pills" id="dec-pills"><button class="type-pill sel" data-k="validee" onclick="demPick(this)">Validée</button><button class="type-pill" data-k="ajournee" onclick="demPick(this)">Ajournée</button><button class="type-pill" data-k="refusee" onclick="demPick(this)">Refusée</button></div>'
      +'<div class="field" style="margin-top:18px"><label class="field-label">Motivation / conditions</label><textarea class="textarea" id="dec-txt" placeholder="Ex. : validée sous réserve d\'un lot 1 limité au périmètre facturation."></textarea></div>'
    +'</div>'
    +'<div class="modal-foot"><button class="btn btn-secondary" onclick="demCloseDec()">Annuler</button><button class="btn btn-primary" onclick="demSaveDec()">Enregistrer la décision</button></div>'
  +'</div></div>'
  +'<div class="modal-overlay" id="demInstrModal" onclick="if(event.target===this)demCloseInstr()"><div class="modal">'
    +'<div class="modal-head"><div class="modal-head-ico">'+demIco('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>')+'</div>'
      +'<div><div class="modal-title">Conclusion de l\'instruction</div><div class="modal-sub">Le circuit aval est déterminé par le budget retenu et la configuration.</div></div>'
      +'<button class="modal-close" onclick="demCloseInstr()">'+demIco('<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>')+'</button></div>'
    +'<div class="modal-body">'
      +'<label class="field-label" style="display:block;margin-bottom:10px">Avis du PMO</label>'
      +'<div class="type-pills" id="ins-pills"><button class="type-pill sel" data-k="fav" onclick="demPick(this)">Favorable</button><button class="type-pill" data-k="res" onclick="demPick(this)">Réservé</button><button class="type-pill" data-k="def" onclick="demPick(this)">Défavorable</button></div>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:18px">'
        +'<div class="field"><label class="field-label">Budget retenu (€)</label><input class="input" id="ins-budget" type="number" step="5000"></div>'
        +'<div class="field"><label class="field-label">Charge retenue (j·h)</label><input class="input" id="ins-charge" type="number"></div>'
      +'</div>'
      +'<div class="field"><label class="field-label">Synthèse d\'instruction</label><textarea class="textarea" id="ins-txt" placeholder="Faisabilité, dépendances, alignement au schéma directeur…"></textarea></div>'
      +'<div class="dem-note" id="ins-route"></div>'
    +'</div>'
    +'<div class="modal-foot"><button class="btn btn-secondary" onclick="demCloseInstr()">Annuler</button><button class="btn btn-primary" onclick="demSaveInstr()">Conclure l\'instruction</button></div>'
  +'</div></div>';
}
function demSw(key,label,meta){
  return '<div class="dem-cfg-row"><div class="dem-cfg-b"><div class="dem-cfg-l">'+label+'</div><div class="dem-cfg-m">'+meta+'</div></div>'
    +'<button class="dem-sw'+(DEM_CFG[key]?' on':'')+'" id="cfg-'+key+'" onclick="this.classList.toggle(\'on\')" aria-label="'+label+'"></button></div>';
}
function demPick(el){ el.parentElement.querySelectorAll('.type-pill').forEach(p=>p.classList.remove('sel')); el.classList.add('sel'); if(el.parentElement.id==='ins-pills') demInsRoute(); }
function demSel(id){ const w=document.getElementById(id); const s=w&&w.querySelector('.type-pill.sel'); return s?s.dataset.k:null; }
function demOpenConfig(){ document.getElementById('demCfgModal').classList.add('open'); }
function demCloseCfg(){ document.getElementById('demCfgModal').classList.remove('open'); }
function demSaveCfg(){
  DEM_CFG.seuilCopil=parseInt(document.getElementById('cfg-copil').value,10)||0;
  DEM_CFG.seuilCodir=parseInt(document.getElementById('cfg-codir').value,10)||0;
  DEM_CFG.delai=parseInt(document.getElementById('cfg-delai').value,10)||10;
  DEM_CFG.n1=document.getElementById('cfg-n1').classList.contains('on');
  DEM_CFG.instr=document.getElementById('cfg-instr').classList.contains('on');
  DEM_CFG.autoProj=document.getElementById('cfg-autoProj').classList.contains('on');
  DEM_CFG.exempt=Array.prototype.slice.call(document.querySelectorAll('#demCfgModal .dem-pill.sel')).map(p=>p.dataset.t);
  demCloseCfg();
  showToast('Configuration enregistrée · passage en cycle à partir de '+demK(DEM_CFG.seuilCopil));
  demRefresh();
}
function demOpenOdj(){
  const d=DEM.find(x=>x.id===DEM_CUR); const inst=demInstance(d)||'COPIL';
  const sel=document.getElementById('odj-seance');
  const opts=demSeanceOptions(inst);
  sel.innerHTML=opts.length?opts.map(o=>'<option value="'+o.v+'">'+demEsc(o.l)+(o.m?' · '+inst:'')+'</option>').join(''):'<option value="">Aucune séance planifiée</option>';
  document.getElementById('demOdjModal').classList.add('open');
}
function demCloseOdj(){ document.getElementById('demOdjModal').classList.remove('open'); }
function demSaveOdj(){
  const d=DEM.find(x=>x.id===DEM_CUR);
  const sel=document.getElementById('odj-seance');
  const kind=document.getElementById('odj-kind').value, time=document.getElementById('odj-time').value;
  d.seanceRef=sel.value||null;
  d.seance=sel.selectedIndex>=0?sel.options[sel.selectedIndex].text.split(' · ')[0]:null;
  d.instance=demInstance(d)||d.instance;
  demPushAgenda(d,kind,time);
  demLog(d,'Inscrite à l\'ordre du jour — '+d.seance+' ('+kind+', '+time+')');
  demCloseOdj();
  showToast('Point inscrit à l\'ordre du jour · '+d.seance);
  demRefresh();
}
/* écrit réellement le point dans le module cible (Cycles de pilotage ou Réunions) */
function demPushAgenda(d,kind,time){
  const ref=d.seanceRef||''; const label='Demande '+d.id+' — '+d.t;
  if(ref.indexOf('prep:')===0 && typeof INST_PREP==='object'){
    const k=ref.slice(5), x=INST_PREP[k]; if(!x) return;
    x.agenda.push([kind.split(' — ')[0]+' — '+label,time,null]);
    if(typeof curPrepKey!=='undefined' && curPrepKey===k && typeof prepRerender==='function'
       && document.getElementById('prepModal') && document.getElementById('prepModal').classList.contains('open')) prepRerender();
  } else if(ref.indexOf('mtg:')===0 && typeof MTG_LIST!=='undefined'){
    const m=MTG_LIST.find(x=>x.id===ref.slice(4)); if(!m) return;
    m.ag=m.ag||[];
    m.ag.push({t:label,d:parseInt(time,10)||15,o:d.who,k:(kind.indexOf('Information')>=0?'info':(kind.indexOf('Arbitrage')>=0?'arb':'deci'))});
    if(typeof mtgRenderList==='function' && document.getElementById('mtg-reunions')) try{ mtgRenderList(); }catch(e){}
  }
}
function demOpenDec(){
  const d=DEM.find(x=>x.id===DEM_CUR);
  document.getElementById('dec-sub').textContent=d.seance||'Arbitrage';
  document.getElementById('demDecModal').classList.add('open');
}
function demCloseDec(){ document.getElementById('demDecModal').classList.remove('open'); }
function demSaveDec(){
  const d=DEM.find(x=>x.id===DEM_CUR), k=demSel('dec-pills')||'validee';
  const txt=(document.getElementById('dec-txt').value||'').trim();
  const src=(d.seance||'Comité');
  if(k==='validee'){
    demLog(d,'Arbitrage favorable'+(txt?' — '+txt:''),src);
    if(DEM_CFG.autoProj){ d.st='validee'; demCloseDec(); demConvert(d.id); return; }
    d.st='validee';
    showToast('Arbitrage favorable enregistré · demande prête à devenir un projet');
  } else {
    d.st=k; d.koAt='arb';
    demLog(d,(k==='refusee'?'Refusée en comité':'Ajournée en comité')+(txt?' — '+txt:''),src);
    showToast(k==='refusee'?'Demande refusée en comité':'Demande ajournée · dossier à compléter');
  }
  demCloseDec(); demRefresh();
}
function demOpenInstr(){
  const d=DEM.find(x=>x.id===DEM_CUR);
  document.getElementById('ins-budget').value=d.budget;
  document.getElementById('ins-charge').value=d.charge;
  document.getElementById('ins-budget').oninput=demInsRoute;
  demInsRoute();
  document.getElementById('demInstrModal').classList.add('open');
}
function demCloseInstr(){ document.getElementById('demInstrModal').classList.remove('open'); }
function demInsRoute(){
  const d=DEM.find(x=>x.id===DEM_CUR); if(!d) return;
  const b=parseInt((document.getElementById('ins-budget')||{}).value,10)||0;
  const probe={budget:b,type:d.type};
  const cyc=demNeedsCycle(probe), inst=demInstance(probe);
  const avis=demSel('ins-pills');
  const el=document.getElementById('ins-route'); if(!el) return;
  el.innerHTML=demIco('<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>')
   +'<span>'+(avis==='def'
      ? 'Avis défavorable : la demande sera refusée à l\'issue de l\'instruction.'
      : (cyc
        ? 'Avec '+demK(b)+', la demande passera en arbitrage <b>'+inst+'</b> (seuil '+demK(DEM_CFG.seuilCopil)+(inst==='CODIR'?' / CODIR '+demK(DEM_CFG.seuilCodir):'')+').'
        : 'Avec '+demK(b)+', la demande sera <b>validée hors cycle de pilotage</b>'+(DEM_CFG.exempt.indexOf(d.type)>=0?' (type exempté)':'')+'.'))
   +'</span>';
}
function demSaveInstr(){
  const d=DEM.find(x=>x.id===DEM_CUR), avis=demSel('ins-pills')||'fav';
  const txt=(document.getElementById('ins-txt').value||'').trim();
  d.budget=parseInt(document.getElementById('ins-budget').value,10)||d.budget;
  d.charge=parseInt(document.getElementById('ins-charge').value,10)||d.charge;
  const lbl={fav:'avis favorable',res:'avis réservé',def:'avis défavorable'}[avis];
  demLog(d,'Instruction terminée · '+lbl+(txt?' — '+txt:''));
  demCloseInstr();
  if(avis==='def'){ d.st='refusee'; d.koAt='ins'; showToast('Instruction conclue · demande refusée'); demRefresh(); return; }
  d.st=demNext(d,'ins');
  if(d.st==='cycle'){ d.instance=demInstance(d); showToast('Instruction conclue · arbitrage en '+d.instance+' requis'); }
  else if(DEM_CFG.autoProj){ demRefresh(); demConvert(d.id); return; }
  else showToast('Instruction conclue · demande validée hors cycle');
  demRefresh();
}

/* ─── Écran : formulaire de demande — 4 sections métier ─── */
function demNew(){ demForm(null); }
function demEdit(id){ demForm(DEM.find(x=>x.id===id)); }
function demSecHead(n,t,m){ return '<div class="dem-sh"><div class="dem-sh-n">'+n+'</div><div><div class="dem-sh-t">'+t+'</div><div class="dem-sh-m">'+m+'</div></div></div>'; }
function demOptTag(){ return '<span class="dem-opt">facultatif</span>'; }
function demQ(k,b,t,m,val,ph){
  return '<div class="dem-q '+k+'"><div class="dem-q-h"><span class="dem-q-b">'+b+'</span><span class="dem-q-t">'+t+'</span><span class="dem-q-m">'+m+'</span></div>'
    +'<textarea class="textarea" id="df-sw-'+k+'" rows="3" placeholder="'+ph+'">'+demEsc(val||'')+'</textarea></div>';
}
function demTw(k,b,t,val,ph){
  return '<div class="dem-tw"><div class="dem-tw-k">'+b+'</div><div class="dem-tw-t">'+t+'</div>'
    +'<textarea class="textarea" id="df-tw-'+k+'" rows="2" placeholder="'+ph+'">'+demEsc(val||'')+'</textarea></div>';
}
function demSelect(id,opts,val,ph,oninput){
  return '<select class="input" id="'+id+'"'+(oninput?' onchange="'+oninput+'"':'')+'>'
    +'<option value=""'+(val?'':' selected')+'>'+ph+'</option>'
    +opts.map(function(o){ const v=(typeof o==='string')?o:o.id, l=(typeof o==='string')?o:o.l;
      return '<option value="'+demEsc(v)+'"'+(val===v?' selected':'')+'>'+demEsc(l)+'</option>'; }).join('')
  +'</select>';
}
function demForm(d){
  DEM_FORM=d?d.id:null;
  const r=document.getElementById('dem-root');
  const v=d||{t:'',type:'transformation',org:'',dir:'',who:DEM_ME,ini:'NC',sponsor:'',val:'',need:'',outcome:'',scope:'',users:null,obj:[],benef:'',risk:'',budget:'',charge:'',deadline:'',deadlineWhy:'',constraints:'',solutions:'',objective:'',prio:'moyenne',docs:[],swot:{s:'',w:'',o:'',t:''},tows:{so:'',st:'',wo:'',wt:''}};
  DEM_DOCS=(v.docs||[]).slice();
  const people=demPeople();
  r.innerHTML=
   '<div class="pg-head" style="margin-bottom:20px"><div><h1>'+(d?'Modifier la demande':'Nouvelle demande de projet')+'</h1><p class="np-sub">'+(d?demEsc(d.id)+' · les informations obligatoires sont demandées à la soumission, pas à l\'enregistrement du brouillon.':'Décrivez le besoin en langage métier. Le circuit de validation est déduit du type et du budget estimé — vous n\'avez pas à le choisir.')+'</p></div>'
    +'<div class="head-actions"><button class="btn btn-secondary" onclick="'+(d?'demOpen(\''+d.id+'\')':'demShowList()')+'">'+demIco('<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>')+'Annuler</button></div></div>'
   +'<div class="dem-form-grid">'
    +'<div class="card dem-card">'

      /* ── 1. Votre demande ── */
      +'<div class="dem-sec" style="margin-top:0">'+demSecHead(1,'Votre demande','Ce que vous constatez et ce que vous attendez, sans vocabulaire projet.')
        +'<div class="field"><label class="field-label">Titre de la demande <span class="req">*</span></label><input class="input" id="df-t" value="'+demEsc(v.t)+'" oninput="demFormSync()" placeholder="Ex. : Portail fournisseurs self-care"></div>'
        +'<div class="field"><label class="field-label">Catégorie de la demande <span class="req">*</span></label>'
          +'<select class="input" id="df-type" onchange="demFormSync()">'+Object.keys(DEM_TYPES).map(function(k){ const t=DEM_TYPES[k];
            return '<option value="'+k+'"'+(v.type===k?' selected':'')+'>'+t.l+' — '+t.m+'</option>'; }).join('')+'</select>'
          +'<div class="dem-help">La catégorie détermine les exemptions de passage en comité.</div></div>'
        +'<div class="field"><label class="field-label">Besoin / problème à résoudre <span class="req">*</span></label><textarea class="textarea" id="df-need" rows="4" placeholder="Décrivez la situation actuelle, ce qui ne fonctionne pas et depuis quand.">'+demEsc(v.need)+'</textarea><div class="dem-help">Ce que vous vivez aujourd\'hui : le constat, ses impacts concrets, son origine.</div></div>'
        +'<div class="field"><label class="field-label">Résultat attendu <span class="req">*</span></label><textarea class="textarea" id="df-outcome" rows="3" placeholder="Ce qui doit être obtenu concrètement si la demande est réalisée.">'+demEsc(v.outcome)+'</textarea><div class="dem-help">Formulez-le comme une situation atteinte, pas comme une solution technique.</div></div>'
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">'
          +'<div class="field"><label class="field-label">Direction / service demandeur <span class="req">*</span></label>'+demSelect('df-org',DEM_ORG,v.org||v.dir,'Sélectionner une direction','demFormSync()')+'<div class="dem-help">Prérempli d\'après votre rattachement.</div></div>'
          +'<div class="field"><label class="field-label">Nombre d\'utilisateurs concernés'+demOptTag()+'</label><input class="input" id="df-users" type="number" min="0" value="'+(v.users==null?'':v.users)+'" placeholder="Ex. : 120"></div>'
        +'</div>'
        +'<div class="field"><label class="field-label">Périmètre concerné'+demOptTag()+'</label><textarea class="textarea" id="df-scope" rows="2" placeholder="Service, sites, utilisateurs, processus concernés.">'+demEsc(v.scope)+'</textarea></div>'
      +'</div>'

      /* ── 2. Pourquoi maintenant ? ── */
      +'<div class="dem-sec">'+demSecHead(2,'Pourquoi maintenant ?','Ce que la demande apporte, et ce qu\'il en coûte de ne rien faire.')
        +'<div class="field"><label class="field-label">Bénéfices attendus <span class="req">*</span></label><textarea class="textarea" id="df-benef" rows="3" placeholder="Ce que l\'organisation y gagne, si possible chiffré.">'+demEsc(v.benef)+'</textarea><div class="dem-help">Gain de temps, réduction de coûts, chiffre d\'affaires, qualité, conformité, sécurité…</div></div>'
        +'<div class="field"><label class="field-label">Risques si on ne fait rien <span class="req">*</span></label><textarea class="textarea" id="df-risk" rows="3" placeholder="Ce qui se passe si la demande n\'est pas retenue.">'+demEsc(v.risk)+'</textarea><div class="dem-help">Impact métier, financier, réglementaire, sécurité, continuité d\'activité…</div></div>'
        +'<label class="field-label" style="display:block;margin-bottom:10px">Urgence <span class="req">*</span></label>'
        +'<div class="type-pills" id="df-prio" style="margin-bottom:18px">'+Object.keys(DEM_URG).map(function(k){ return '<button class="type-pill'+(v.prio===k?' sel':'')+'" data-k="'+k+'" onclick="demPick(this)">'+DEM_URG[k].l+'</button>'; }).join('')+'</div>'
        +'<div style="display:grid;grid-template-columns:1fr 1.4fr;gap:14px">'
          +'<div class="field"><label class="field-label">Échéance souhaitée'+demOptTag()+'</label><input class="input" id="df-deadline" type="date" value="'+(v.deadline||'')+'"></div>'
          +'<div class="field"><label class="field-label">Pourquoi cette échéance ?'+demOptTag()+'</label><input class="input" id="df-deadlineWhy" value="'+demEsc(v.deadlineWhy)+'" placeholder="Contrainte réglementaire, saisonnalité, fin de support…"></div>'
        +'</div>'
      +'</div>'

      /* ── 3. Première estimation ── */
      +'<div class="dem-sec">'+demSecHead(3,'Première estimation','Un ordre de grandeur suffit. Le chiffrage sera repris à l\'instruction.')
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">'
          +'<div class="field"><label class="field-label">Budget estimé (€)'+demOptTag()+'</label><input class="input" id="df-budget" type="number" step="5000" value="'+(v.budget||'')+'" oninput="demFormSync()" placeholder="120000"'+(v.budget?'':'')+'><label class="dem-chk"><input type="checkbox" id="df-budget-x"'+(d&&!v.budget?' checked':'')+' onchange="demFormUnknown(\'budget\')"> Budget inconnu à ce stade</label></div>'
          +'<div class="field"><label class="field-label">Charge interne estimée (J/H)'+demOptTag()+'</label><input class="input" id="df-charge" type="number" step="0.5" value="'+(v.charge||'')+'" placeholder="120"><label class="dem-chk"><input type="checkbox" id="df-charge-x" onchange="demFormUnknown(\'charge\')"> Charge inconnue à ce stade</label></div>'
        +'</div>'
        +'<div class="field"><label class="field-label">Contraintes connues'+demOptTag()+'</label><textarea class="textarea" id="df-constraints" rows="2" placeholder="Sécurité, réglementaire, contractuel, technique, calendrier, organisation.">'+demEsc(v.constraints)+'</textarea></div>'
        +'<div class="field"><label class="field-label">Solutions déjà envisagées'+demOptTag()+'</label><textarea class="textarea" id="df-solutions" rows="2" placeholder="Ce qui a déjà été tenté ou étudié, et pourquoi cela n\'a pas suffi.">'+demEsc(v.solutions)+'</textarea></div>'
        +'<label class="field-label" style="display:block;margin-bottom:8px">Pièces jointes'+demOptTag()+'</label>'
        +'<label class="dem-drop">'+demIco('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>')
          +'<div class="dem-drop-t">Déposer un document ou parcourir</div><div class="dem-drop-m">Cartographie de processus, chiffrage fournisseur, note de cadrage… PDF, Office, images.</div>'
          +'<input type="file" multiple onchange="demAddDocs(this)"></label>'
        +'<div class="dem-files" id="df-docs"></div>'
      +'</div>'

      /* ── 4. Analyse SWOT / TOWS ── */
      +'<div class="dem-sec">'+demSecHead(4,'Analyse SWOT / TOWS','Facultatif, mais très utile en comité : ce qui joue pour la demande, ce qui joue contre, et ce qu\'on en déduit.')
        +'<div class="dem-swot">'
          +demQ('s','S','Forces','Atouts internes',v.swot.s,'Équipe mobilisée, processus connu, brique technique déjà en place…')
          +demQ('w','W','Faiblesses','Limites internes',v.swot.w,'Compétence manquante, dette technique, disponibilité des équipes…')
          +demQ('o','O','Opportunités','Facteurs externes favorables',v.swot.o,'Fenêtre réglementaire, socle mutualisé, financement disponible…')
          +demQ('t','T','Menaces','Facteurs externes défavorables',v.swot.t,'Échéance contrainte, dépendance fournisseur, résistance au changement…')
        +'</div>'
        +'<div class="dem-help" style="margin-top:12px">Croisé TOWS — ce que l\'on fait de cette analyse. Une ligne par case suffit.</div>'
        +'<div class="dem-tows">'
          +demTw('so','SO','Forces × Opportunités · attaquer',v.tows.so,'Sur quoi s\'appuyer pour aller vite')
          +demTw('wo','WO','Faiblesses × Opportunités · renforcer',v.tows.wo,'Quelle faiblesse combler grâce à une opportunité')
          +demTw('st','ST','Forces × Menaces · défendre',v.tows.st,'Comment neutraliser une menace avec un atout')
          +demTw('wt','WT','Faiblesses × Menaces · éviter',v.tows.wt,'Ce que l\'on retire du périmètre pour limiter le risque')
        +'</div>'
      +'</div>'

      /* ── 5. Gouvernance ── */
      +'<div class="dem-sec">'+demSecHead(5,'Gouvernance','Qui porte la demande et à quel objectif elle contribue.')
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">'
          +'<div class="field"><label class="field-label">Demandeur</label><div class="dem-ro">'+demPerson(v.who||DEM_ME,'av-sm')+'<span class="dem-ro-m">'+((v.who&&v.who!==DEM_ME)?'Demandeur':'Vous')+' · lecture seule</span></div></div>'
          +'<div class="field"><label class="field-label">Sponsor métier'+demOptTag()+'</label>'+demSelect('df-sponsor',people,v.sponsor,'Sélectionner un sponsor')+'</div>'
        +'</div>'
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">'
          +'<div class="field"><label class="field-label">Objectif stratégique'+demOptTag()+'</label>'+demSelect('df-objective',DEM_OBJ,v.objective,'Aucun objectif rattaché')+'<div class="dem-help">Rattacher la demande à un objectif facilite son arbitrage.</div></div>'
          +'<div class="field"><label class="field-label">Validateur</label>'+demSelect('df-val',people,v.val,'Défini par le circuit de validation')+'<div class="dem-help">Proposé par le circuit ; seul le validateur désigné pourra décider.</div></div>'
        +'</div>'
      +'</div>'

      +'<div id="df-errs"></div>'
      +'<div style="display:flex;justify-content:flex-end;gap:12px;margin-top:22px">'
        +'<button class="btn btn-secondary" onclick="demFormSave(false)">'+demIco('<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/>')+'Enregistrer en brouillon</button>'
        +'<button class="btn btn-primary" onclick="demFormSave(true)">'+demIco('<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>')+'Soumettre la demande</button>'
      +'</div>'
    +'</div>'
    +'<div class="card dem-prev" id="df-prev"></div>'
   +'</div>'
   +demModals();
  demRenderDocs();
  demFormSync();
}
function demFormType(el){ el.parentElement.querySelectorAll('.typecard').forEach(t=>t.classList.remove('sel')); el.classList.add('sel'); demFormSync(); }
function demFormUnknown(k){
  const cb=document.getElementById('df-'+k+'-x'), inp=document.getElementById('df-'+k);
  if(cb.checked){ inp.value=''; inp.disabled=true; } else { inp.disabled=false; }
  demFormSync();
}
function demAddDocs(inp){
  Array.prototype.slice.call(inp.files||[]).forEach(function(f){
    DEM_DOCS.push({n:f.name,s:(f.size>1048576?(f.size/1048576).toFixed(1)+' Mo':Math.max(1,Math.round(f.size/1024))+' Ko')});
  });
  inp.value=''; demRenderDocs();
}
function demDelDoc(i){ DEM_DOCS.splice(i,1); demRenderDocs(); }
function demRenderDocs(){
  const el=document.getElementById('df-docs'); if(!el) return;
  el.innerHTML=DEM_DOCS.map(function(f,i){
    return '<div class="dem-file">'+demIco('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>')
      +'<span class="dem-file-n">'+demEsc(f.n)+'</span><span class="dem-file-s">'+demEsc(f.s)+'</span>'
      +'<span class="dem-file-x" onclick="demDelDoc('+i+')">'+demIco('<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>')+'</span></div>';
  }).join('');
}
function demVal(id){ const el=document.getElementById(id); return el?(el.value||'').trim():''; }
function demFormRead(){
  const type=demVal('df-type')||'transformation';
  const org=demVal('df-org');
  return {
    t:demVal('df-t'),
    type:type,
    org:org, dir:org,
    who:(DEM_FORM?((DEM.find(x=>x.id===DEM_FORM)||{}).who||DEM_ME):DEM_ME),
    sponsor:demVal('df-sponsor'),
    val:demVal('df-val'),
    need:demVal('df-need'),
    outcome:demVal('df-outcome'),
    scope:demVal('df-scope'),
    users:demVal('df-users')?parseInt(demVal('df-users'),10):null,
    benef:demVal('df-benef'),
    risk:demVal('df-risk'),
    budget:parseInt(demVal('df-budget'),10)||0,
    charge:parseFloat(demVal('df-charge'))||0,
    deadline:demVal('df-deadline'),
    deadlineWhy:demVal('df-deadlineWhy'),
    constraints:demVal('df-constraints'),
    solutions:demVal('df-solutions'),
    objective:demVal('df-objective'),
    prio:demSel('df-prio')||'moyenne',
    swot:{s:demVal('df-sw-s'),w:demVal('df-sw-w'),o:demVal('df-sw-o'),t:demVal('df-sw-t')},
    tows:{so:demVal('df-tw-so'),wo:demVal('df-tw-wo'),st:demVal('df-tw-st'),wt:demVal('df-tw-wt')},
    docs:DEM_DOCS.slice()
  };
}
/* champs exigés à la soumission (jamais au brouillon) */
const DEM_REQ=[['t','Titre de la demande'],['need','Besoin / problème à résoudre'],['outcome','Résultat attendu'],['org','Direction / service demandeur'],['benef','Bénéfices attendus'],['risk','Risques si on ne fait rien'],['prio','Urgence']];
function demMissing(f){ return DEM_REQ.filter(function(r){ const x=f[r[0]]; return !x || (typeof x==='string' && !x.trim()); }); }
function demFormSync(){
  const p=document.getElementById('df-prev'); if(!p) return;
  const f=demFormRead(), steps=demSteps(f), cyc=demNeedsCycle(f), inst=demInstance(f);
  const miss=demMissing(f), unknownBudget=!f.budget;
  p.innerHTML='<div class="dem-prev-k">Circuit qui sera appliqué</div>'
   +'<div class="dem-jrn">'+steps.map(function(s,i){ return '<div class="dem-jrn-i"><div class="dem-jrn-d" style="background:'+(i===0?'var(--brand-gold)':'var(--neutral-300)')+'"></div><div class="dem-jrn-b"><div class="dem-jrn-t">'+s.l+'</div><div class="dem-jrn-m">'+s.s+'</div></div></div>'; }).join('')+'</div>'
   +'<div class="dem-prev-row"><span class="k">Catégorie</span><span class="v">'+DEM_TYPES[f.type].l+'</span></div>'
   +'<div class="dem-prev-row"><span class="k">Direction</span><span class="v">'+(f.org?demEsc(f.org):'—')+'</span></div>'
   +'<div class="dem-prev-row"><span class="k">Budget estimé</span><span class="v">'+(f.budget?demK(f.budget):'Non renseigné')+'</span></div>'
   +'<div class="dem-prev-row"><span class="k">Cycle de pilotage</span><span class="v" style="color:'+(cyc?'var(--brand-gold-700)':'var(--neutral-600)')+'">'+(cyc?'Requis · '+inst:'Non requis')+'</span></div>'
   +'<div class="dem-note">'+demIco('<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>')+'<span>'+(unknownBudget
      ?'Sans budget renseigné, le routage sera déterminé à l\'instruction par le PMO.'
      :(cyc?'Au-delà de '+demK(DEM_CFG.seuilCopil)+', la demande est arbitrée en '+inst+' avant création du projet.'
           :'En dessous du seuil'+(DEM_CFG.exempt.indexOf(f.type)>=0?' ou pour un type exempté':'')+', le PMO valide sans passer en comité.'))+'</span></div>'
   +'<div class="dem-prev-k" style="margin-top:18px">Prêt à soumettre</div>'
   +(miss.length
      ? '<div class="dem-jrn">'+miss.map(function(m){ return '<div class="dem-jrn-i" style="padding-bottom:9px"><div class="dem-jrn-d" style="background:var(--state-warning);box-shadow:none"></div><div class="dem-jrn-b"><div class="dem-jrn-m" style="margin-top:1px">'+m[1]+'</div></div></div>'; }).join('')+'</div>'
        +'<div class="dem-note"><span>'+miss.length+' information'+(miss.length>1?'s':'')+' à compléter avant soumission. L\'enregistrement en brouillon reste possible.</span></div>'
      : '<div class="dem-note" style="color:var(--state-success)">'+demIco('<polyline points="20 6 9 17 4 12"/>')+'<span style="color:var(--neutral-600)">Toutes les informations obligatoires sont renseignées.</span></div>');
}
function demFormSave(submit){
  const f=demFormRead();
  const ids={t:'df-t',need:'df-need',outcome:'df-outcome',org:'df-org',benef:'df-benef',risk:'df-risk'};
  Object.keys(ids).forEach(function(k){ const el=document.getElementById(ids[k]); if(el) el.classList.remove('err'); });
  const errBox=document.getElementById('df-errs'); if(errBox) errBox.innerHTML='';
  /* brouillon : seuls le titre et la direction sont nécessaires pour identifier la demande */
  if(!f.t){ document.getElementById('df-t').classList.add('err'); showToast('Donnez un titre à la demande'); return; }
  if(!f.org){ document.getElementById('df-org').classList.add('err'); showToast('Indiquez la direction demandeuse'); return; }
  if(submit){
    const miss=demMissing(f);
    if(miss.length){
      miss.forEach(function(m){ const el=document.getElementById(ids[m[0]]); if(el) el.classList.add('err'); });
      if(errBox) errBox.innerHTML='<div class="dem-err" style="margin-top:16px">Soumission impossible : '+miss.map(m=>m[1]).join(', ')+'.</div>';
      showToast(miss.length+' information'+(miss.length>1?'s':'')+' obligatoire'+(miss.length>1?'s':'')+' manquante'+(miss.length>1?'s':'')+' pour soumettre');
      return;
    }
  }
  let d=DEM_FORM?DEM.find(x=>x.id===DEM_FORM):null;
  const ini=(f.who||'Demandeur').split(/[\s-]+/).filter(Boolean).map(w=>w[0].toUpperCase()).slice(0,2).join('')||'DP';
  if(d){
    Object.assign(d,f); d.ini=ini;
    demLog(d,'Demande modifiée',DEM_ME);
  } else {
    d={id:'DP-2026-0'+(DEM_SEQ++),ini:ini,date:'2026-09-14',st:'brouillon',instance:null,seance:null,obj:[],jrn:[['Demande créée',f.who||'Demandeur',demToday()]]};
    Object.assign(d,f);
    DEM.unshift(d);
  }
  DEM_CUR=d.id;
  if(submit && d.st==='brouillon'){ demSubmit(d.id); return; }
  showToast('Demande « '+d.t+' » enregistrée en brouillon');
  demOpen(d.id);
}
