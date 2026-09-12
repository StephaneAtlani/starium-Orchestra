/* Conformité — référentiels, évaluation, remédiation
   Extrait de « Refonte Portail Client.html ». Script classique, portée globale partagée.
   Chargé avant le script principal. Dépendances globales : fmtEur(), showToast(), showView(). */

/* ═══════════ CONFORMITÉ · détail d'un référentiel ═══════════ */
const CD_ST={
  conf :{lbl:'Conforme',       cls:'chip-conf', w:1,   col:'var(--state-success)', ic:'<polyline points="20 6 9 17 4 12"/>'},
  part :{lbl:'Partiel',        cls:'chip-part', w:0.5, col:'var(--brand-gold)',    ic:'<circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 0 20z" fill="currentColor" stroke="none"/>'},
  ecart:{lbl:'Écart',          cls:'chip-ecart',w:0,   col:'var(--state-danger)',  ic:'<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>'},
  todo :{lbl:'À évaluer',      cls:'chip-todo', w:null, col:'var(--state-info)',   ic:'<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>'},
  na   :{lbl:'Non applicable', cls:'chip-na',   w:null, col:'var(--neutral-300)',  ic:'<circle cx="12" cy="12" r="10"/><line x1="5" y1="12" x2="19" y2="12"/>'}
};
const CD_CYCLE=['conf','part','ecart','todo','na'];
function av(cls,ini){return '<div class="assignee"><div class="av '+cls+'" style="width:24px;height:24px;font-size:9px">'+ini+'</div></div>';}

const FRAMEWORKS={
  nist:{name:'NIST CSF 2.0', ver:'Cybersecurity Framework 2.0', logoTxt:'CSF', logoBg:'var(--state-success-bg)', logoFg:'var(--state-success)',
    scope:'Périmètre SI groupe', owner:['av-4','PD'], ownerName:'Paul Dubois — RSSI', mode:'Auto-évaluation', audit:'Octobre 2026', maturityLabel:'Niveau (Tier)',
    fns:[
      {code:'GV', name:'Gouverner', color:'var(--brand-gold)', cats:[
        {code:'GV.OC', name:'Contexte organisationnel', ctrl:'Mission, attentes des parties prenantes, exigences légales', st:'conf', o:['av-4','PD']},
        {code:'GV.RM', name:'Stratégie de gestion des risques', ctrl:'Appétence, tolérance et priorisation du risque cyber', st:'part', o:['av-2','MD']},
        {code:'GV.RR', name:'Rôles, responsabilités & autorités', ctrl:'RACI cybersécurité, dotation en ressources', st:'conf', o:['av-4','PD']},
        {code:'GV.PO', name:'Politique de cybersécurité', ctrl:'PSSI approuvée, revue et communiquée', st:'part', o:['av-3','SL']},
        {code:'GV.OV', name:'Supervision', ctrl:'Revue de la stratégie et des résultats par la direction', st:'todo', o:['av-4','PD']},
        {code:'GV.SC', name:'Risque de la chaîne d\'approvisionnement', ctrl:'Gestion du risque fournisseurs & tiers TIC', st:'ecart', o:['av-2','MD']}
      ]},
      {code:'ID', name:'Identifier', color:'var(--state-info)', cats:[
        {code:'ID.AM', name:'Gestion des actifs', ctrl:'Inventaire matériel, logiciel, données et services', st:'conf', o:['av-1','JT']},
        {code:'ID.RA', name:'Évaluation des risques', ctrl:'Identification des vulnérabilités et menaces', st:'part', o:['av-3','SL']},
        {code:'ID.IM', name:'Amélioration', ctrl:'Enseignements tirés, plans d\'amélioration', st:'todo', o:['av-2','MD']}
      ]},
      {code:'PR', name:'Protéger', color:'var(--purple)', cats:[
        {code:'PR.AA', name:'Gestion des identités & des accès', ctrl:'Authentification, autorisation, moindre privilège', st:'part', o:['av-1','JT']},
        {code:'PR.AT', name:'Sensibilisation & formation', ctrl:'Programme de sensibilisation cyber', st:'conf', o:['av-6','AB']},
        {code:'PR.DS', name:'Sécurité des données', ctrl:'Chiffrement, cycle de vie, intégrité', st:'part', o:['av-3','SL']},
        {code:'PR.PS', name:'Sécurité des plateformes', ctrl:'Durcissement, gestion des configurations', st:'ecart', o:['av-1','JT']},
        {code:'PR.IR', name:'Résilience de l\'infrastructure', ctrl:'Architecture résiliente, capacité', st:'todo', o:['av-2','MD']}
      ]},
      {code:'DE', name:'Détecter', color:'var(--teal)', cats:[
        {code:'DE.CM', name:'Surveillance continue', ctrl:'Supervision réseaux, actifs et services', st:'part', o:['av-3','SL']},
        {code:'DE.AE', name:'Analyse des événements indésirables', ctrl:'Corrélation, qualification des alertes', st:'ecart', o:['av-1','JT']}
      ]},
      {code:'RS', name:'Répondre', color:'var(--state-warning)', cats:[
        {code:'RS.MA', name:'Gestion des incidents', ctrl:'Processus, classification, escalade', st:'part', o:['av-2','MD']},
        {code:'RS.AN', name:'Analyse', ctrl:'Investigation, analyse forensique', st:'todo', o:['av-1','JT']},
        {code:'RS.CO', name:'Communication de la réponse', ctrl:'Coordination interne et parties prenantes', st:'conf', o:['av-6','AB']},
        {code:'RS.MI', name:'Atténuation', ctrl:'Endiguement et éradication', st:'part', o:['av-3','SL']}
      ]},
      {code:'RC', name:'Rétablir', color:'var(--state-success)', cats:[
        {code:'RC.RP', name:'Exécution du plan de rétablissement', ctrl:'Restauration des systèmes et services', st:'todo', o:['av-2','MD']},
        {code:'RC.CO', name:'Communication du rétablissement', ctrl:'Information des parties prenantes', st:'na', o:['av-6','AB']}
      ]}
    ]},
  iso27001:{name:'ISO/IEC 27001', ver:'Édition 2022 — Annexe A', logoTxt:'27001', logoBg:'var(--purple-bg)', logoFg:'var(--purple)',
    scope:'SMSI — périmètre certifié', owner:['av-4','PD'], ownerName:'Paul Dubois — RSSI', mode:'Certification', audit:'Recertif. mars 2027', maturityLabel:'Couverture par thème',
    fns:[
      {code:'A.5', name:'Contrôles organisationnels', color:'var(--brand-gold)', cats:[
        {code:'A.5.1', name:'Politiques de sécurité de l\'information', ctrl:'Définies, approuvées, publiées', st:'conf', o:['av-4','PD']},
        {code:'A.5.9', name:'Inventaire des actifs', ctrl:'Actifs associés à l\'information', st:'conf', o:['av-1','JT']},
        {code:'A.5.15', name:'Contrôle d\'accès', ctrl:'Règles d\'accès physique et logique', st:'part', o:['av-1','JT']},
        {code:'A.5.23', name:'Sécurité des services cloud', ctrl:'Acquisition, usage et sortie du cloud', st:'ecart', o:['av-3','SL']},
        {code:'A.5.30', name:'Préparation des TIC à la continuité', ctrl:'Continuité d\'activité', st:'part', o:['av-2','MD']}
      ]},
      {code:'A.6', name:'Contrôles liés aux personnes', color:'var(--state-info)', cats:[
        {code:'A.6.1', name:'Sélection des candidats', ctrl:'Vérifications préalables à l\'embauche', st:'conf', o:['av-6','AB']},
        {code:'A.6.3', name:'Sensibilisation & formation', ctrl:'Sensibilisation à la sécurité', st:'part', o:['av-6','AB']},
        {code:'A.6.7', name:'Travail à distance', ctrl:'Mesures de sécurité du télétravail', st:'conf', o:['av-3','SL']}
      ]},
      {code:'A.7', name:'Contrôles physiques', color:'var(--teal)', cats:[
        {code:'A.7.1', name:'Périmètres de sécurité physique', ctrl:'Zones sécurisées', st:'conf', o:['av-2','MD']},
        {code:'A.7.4', name:'Surveillance de la sécurité physique', ctrl:'Détection d\'accès non autorisé', st:'part', o:['av-2','MD']},
        {code:'A.7.10', name:'Supports de stockage', ctrl:'Gestion du cycle de vie des supports', st:'na', o:['av-1','JT']}
      ]},
      {code:'A.8', name:'Contrôles technologiques', color:'var(--purple)', cats:[
        {code:'A.8.1', name:'Terminaux des utilisateurs', ctrl:'Protection des postes de travail', st:'part', o:['av-1','JT']},
        {code:'A.8.5', name:'Authentification sécurisée', ctrl:'MFA, gestion des secrets', st:'conf', o:['av-1','JT']},
        {code:'A.8.8', name:'Gestion des vulnérabilités techniques', ctrl:'Détection et remédiation', st:'ecart', o:['av-3','SL']},
        {code:'A.8.16', name:'Surveillance des activités', ctrl:'Journalisation et supervision', st:'part', o:['av-3','SL']},
        {code:'A.8.24', name:'Utilisation de la cryptographie', ctrl:'Politique de chiffrement', st:'conf', o:['av-4','PD']}
      ]}
    ]},
  rgpd:{name:'RGPD', ver:'Règlement (UE) 2016/679', logoTxt:'RGPD', logoBg:'var(--state-info-bg)', logoFg:'var(--state-info)',
    scope:'Traitements de données personnelles', owner:['av-1','JT'], ownerName:'Julien Tran — DPO', mode:'Conformité continue', audit:'Audit nov. 2026', maturityLabel:'Couverture par chapitre',
    fns:[
      {code:'Ch. II', name:'Principes', color:'var(--state-success)', cats:[
        {code:'Art. 5', name:'Principes relatifs au traitement', ctrl:'Licéité, minimisation, exactitude', st:'conf', o:['av-1','JT']},
        {code:'Art. 6', name:'Licéité du traitement', ctrl:'Base légale documentée', st:'conf', o:['av-1','JT']},
        {code:'Art. 7', name:'Conditions du consentement', ctrl:'Recueil et preuve du consentement', st:'part', o:['av-6','AB']},
        {code:'Art. 9', name:'Catégories particulières de données', ctrl:'Données sensibles', st:'part', o:['av-1','JT']}
      ]},
      {code:'Ch. III', name:'Droits des personnes', color:'var(--state-info)', cats:[
        {code:'Art. 13-14', name:'Information des personnes', ctrl:'Mentions et politique de confidentialité', st:'conf', o:['av-6','AB']},
        {code:'Art. 15', name:'Droit d\'accès', ctrl:'Procédure de réponse aux demandes', st:'conf', o:['av-1','JT']},
        {code:'Art. 17', name:'Droit à l\'effacement', ctrl:'Suppression et durées de conservation', st:'part', o:['av-3','SL']},
        {code:'Art. 20', name:'Droit à la portabilité', ctrl:'Export des données dans un format ouvert', st:'todo', o:['av-3','SL']}
      ]},
      {code:'Ch. IV', name:'Responsable & sous-traitant', color:'var(--purple)', cats:[
        {code:'Art. 28', name:'Sous-traitant', ctrl:'Contrats et clauses de sous-traitance', st:'part', o:['av-2','MD']},
        {code:'Art. 30', name:'Registre des traitements', ctrl:'Registre tenu à jour', st:'conf', o:['av-1','JT']},
        {code:'Art. 32', name:'Sécurité du traitement', ctrl:'Mesures techniques et organisationnelles', st:'part', o:['av-4','PD']},
        {code:'Art. 33-34', name:'Notification de violation', ctrl:'Procédure CNIL sous 72 h', st:'conf', o:['av-1','JT']},
        {code:'Art. 35', name:'Analyse d\'impact (AIPD)', ctrl:'DPIA pour traitements à risque', st:'part', o:['av-1','JT']}
      ]},
      {code:'Ch. V', name:'Transferts internationaux', color:'var(--brand-gold)', cats:[
        {code:'Art. 46', name:'Garanties appropriées', ctrl:'Clauses contractuelles types (CCT)', st:'ecart', o:['av-2','MD']},
        {code:'Art. 49', name:'Dérogations', ctrl:'Situations particulières', st:'na', o:['av-1','JT']}
      ]}
    ]},
  dora:{name:'DORA', ver:'Règlement (UE) 2022/2554', logoTxt:'DORA', logoBg:'var(--state-warning-bg)', logoFg:'var(--state-warning)',
    scope:'Résilience opérationnelle numérique', owner:['av-2','MD'], ownerName:'Marc Dubois — Resp. résilience', mode:'Mise en conformité', audit:'Échéance Q3 2026', maturityLabel:'Couverture par pilier',
    fns:[
      {code:'P1', name:'Gouvernance & gestion du risque TIC', color:'var(--brand-gold)', cats:[
        {code:'Art. 5-6', name:'Cadre de gestion du risque TIC', ctrl:'Stratégie, politiques et procédures', st:'part', o:['av-2','MD']},
        {code:'Art. 5', name:'Rôle de l\'organe de direction', ctrl:'Responsabilité et supervision', st:'conf', o:['av-4','PD']}
      ]},
      {code:'P2', name:'Gestion des incidents TIC', color:'var(--state-info)', cats:[
        {code:'Art. 17', name:'Processus de gestion des incidents', ctrl:'Détection, classification, suivi', st:'part', o:['av-2','MD']},
        {code:'Art. 19', name:'Notification des incidents majeurs', ctrl:'Déclaration aux autorités compétentes', st:'ecart', o:['av-3','SL']}
      ]},
      {code:'P3', name:'Tests de résilience opérationnelle', color:'var(--purple)', cats:[
        {code:'Art. 24', name:'Programme de tests', ctrl:'Tests réguliers des outils TIC', st:'ecart', o:['av-3','SL']},
        {code:'Art. 26', name:'Tests de pénétration (TLPT)', ctrl:'Tests fondés sur la menace', st:'todo', o:['av-1','JT']}
      ]},
      {code:'P4', name:'Risque lié aux prestataires tiers TIC', color:'var(--teal)', cats:[
        {code:'Art. 28', name:'Registre des prestataires', ctrl:'Cartographie des dépendances TIC', st:'part', o:['av-2','MD']},
        {code:'Art. 30', name:'Clauses contractuelles', ctrl:'Dispositions contractuelles clés', st:'part', o:['av-2','MD']}
      ]},
      {code:'P5', name:'Partage d\'informations', color:'var(--state-success)', cats:[
        {code:'Art. 45', name:'Partage sur les cybermenaces', ctrl:'Dispositifs d\'échange de renseignement', st:'na', o:['av-4','PD']}
      ]}
    ]}
};
let CD_KEY='nist';
const CIRC=(r)=>2*Math.PI*r;

function cdCompliance(cats){
  let num=0, den=0;
  cats.forEach(c=>{ const w=CD_ST[c.st].w; if(w!==null){ num+=w; den+=1; } });
  return den? Math.round(num/den*100) : 0;
}
function cdCounts(fw){
  const c={conf:0,part:0,ecart:0,todo:0,na:0,total:0};
  fw.fns.forEach(f=>f.cats.forEach(x=>{c[x.st]++;c.total++;}));
  return c;
}
function pctColor(p){ return p>=75?'var(--state-success)':(p>=50?'var(--brand-gold)':'var(--state-danger)'); }

function openConfDetail(key){
  CD_KEY=key;
  document.getElementById('conformite-library').style.display='none';
  document.getElementById('conformite-home').style.display='none';
  document.getElementById('conformite-detail').style.display='';
  document.querySelector('.page-content').scrollTop=0;
  document.getElementById('breadcrumb').innerHTML='<a onclick="showView(\'dashboard\')">Gouvernance &amp; conformité</a><span class="bc-sep">/</span><a onclick="confBack()">Conformité</a><span class="bc-sep">/</span><span class="bc-current">'+FRAMEWORKS[key].name+'</span>';
  cdRender();
}
function confBack(){
  const h=document.getElementById('conformite-home'), d=document.getElementById('conformite-detail'), l=document.getElementById('conformite-library');
  if(h) h.style.display=''; if(d) d.style.display='none'; if(l) l.style.display='none';
  document.getElementById('breadcrumb').innerHTML=VIEW_META.conformite.bc;
  document.querySelector('.page-content').scrollTop=0;
}

/* ─── Bibliothèque de référentiels (activation par environnement) ─── */
const CATALOG=[
  {key:'rgpd',      txt:'RGPD', bg:'var(--state-info-bg)',    fg:'var(--state-info)',    name:'RGPD',           sub:'Protection des données personnelles',    domain:'Réglementaire',       origin:'Règlement (UE) 2016/679', req:46, active:true,  pct:83, ok:38, wip:6,  ko:2,  ring:'var(--state-success)', pcol:'var(--state-success)', foot:'Audit : nov. 2026',      badge:'<span class="badge bdg-success">Conforme</span>'},
  {key:'iso27001',  txt:'27001',bg:'var(--purple-bg)',        fg:'var(--purple)',        name:'ISO/IEC 27001',  sub:'Sécurité de l’information (SMSI)',        domain:'Sécurité & cyber',    origin:'Édition 2022 — Annexe A', req:51, active:true,  pct:74, ok:38, wip:10, ko:3,  ring:'var(--purple)',        pcol:'var(--purple)',        foot:'Recertif. : mars 2027',  badge:'<span class="badge bdg-info">En cours</span>'},
  {key:'nist',      txt:'CSF',  bg:'var(--state-success-bg)', fg:'var(--state-success)', name:'NIST CSF 2.0',   sub:'Cybersécurité — cadre de gestion',        domain:'Sécurité & cyber',    origin:'Cybersecurity Framework 2.0', req:22, active:true,  pct:61, ok:58, wip:26, ko:12, ring:'var(--brand-gold)',    pcol:'var(--brand-gold-700)',foot:'Auto-éval. : oct. 2026', badge:'<span class="badge bdg-warn">En progression</span>'},
  {key:'dora',      txt:'DORA', bg:'var(--state-warning-bg)', fg:'var(--state-warning)', name:'DORA',           sub:'Résilience opérationnelle numérique',    domain:'Réglementaire',       origin:'Règlement (UE) 2022/2554', req:11, active:true,  pct:45, ok:18, wip:14, ko:8,  ring:'var(--brand-gold)',    pcol:'var(--brand-gold-700)',foot:'Échéance : Q3 2026',     badge:'<span class="badge bdg-warn">À risque</span>', border:'#F2D9A8'},
  {key:'nis2',      txt:'NIS2', bg:'var(--state-info-bg)',    fg:'var(--state-info)',    name:'NIS2',           sub:'Sécurité des réseaux et systèmes',        domain:'Réglementaire',       origin:'Directive (UE) 2022/2555', req:24, active:false},
  {key:'iso27002',  txt:'27002',bg:'var(--purple-bg)',        fg:'var(--purple)',        name:'ISO/IEC 27002',  sub:'Bonnes pratiques de sécurité',            domain:'Sécurité & cyber',    origin:'Édition 2022', req:93, active:false},
  {key:'cis',       txt:'CIS',  bg:'var(--teal-bg,var(--state-info-bg))', fg:'var(--teal,var(--state-info))', name:'CIS Controls v8', sub:'Contrôles de sécurité prioritaires', domain:'Sécurité & cyber', origin:'Center for Internet Security', req:18, active:false},
  {key:'soc2',      txt:'SOC2', bg:'var(--state-success-bg)', fg:'var(--state-success)', name:'SOC 2',          sub:'Trust Services Criteria',                 domain:'Sécurité & cyber',    origin:'AICPA', req:64, active:false},
  {key:'pcidss',    txt:'PCI',  bg:'var(--state-warning-bg)', fg:'var(--state-warning)', name:'PCI-DSS v4.0',   sub:'Sécurité des données de paiement',        domain:'Sectoriel',           origin:'PCI SSC', req:12, active:false},
  {key:'hds',       txt:'HDS',  bg:'var(--state-info-bg)',    fg:'var(--state-info)',    name:'HDS',            sub:'Hébergement de données de santé',         domain:'Sectoriel',           origin:'Référentiel ANS', req:16, active:false},
  {key:'anssi',     txt:'ANSSI',bg:'var(--purple-bg)',        fg:'var(--purple)',        name:'Guide d’hygiène ANSSI', sub:'42 mesures d’hygiène informatique', domain:'Sécurité & cyber', origin:'ANSSI', req:42, active:false}
];
function confRing(color,pct){const off=(188.5*(100-pct)/100).toFixed(1);return '<svg width="72" height="72" viewBox="0 0 72 72"><circle cx="36" cy="36" r="30" fill="none" stroke="var(--neutral-200)" stroke-width="9"/><circle cx="36" cy="36" r="30" fill="none" stroke="'+color+'" stroke-width="9" stroke-linecap="round" stroke-dasharray="188.5" stroke-dashoffset="'+off+'"/></svg>';}
function confCard(it){
  const clickable=FRAMEWORKS[it.key];
  const onclick=clickable?'onclick="openConfDetail(\''+it.key+'\')"':'onclick="showToast(\'Évaluation à démarrer — '+it.name+'\')"';
  const started=it.pct!==undefined;
  const ringColor=started?it.ring:'var(--neutral-300)', pcol=started?it.pcol:'var(--neutral-400)', pct=started?it.pct:0;
  const foot=started?it.foot:'Évaluation à démarrer', badge=started?it.badge:'<span class="badge bdg-neutral">À démarrer</span>';
  return '<div class="card refcard clickable"'+(it.border?' style="border-color:'+it.border+'"':'')+' '+onclick+'>'+
    '<div class="refcard-head"><div class="refcard-logo" style="background:'+it.bg+';color:'+it.fg+'">'+it.txt+'</div><div><div class="refcard-name">'+it.name+'</div><div class="refcard-sub">'+it.sub+'</div></div></div>'+
    '<div class="refcard-gauge"><div class="refcard-ring">'+confRing(ringColor,pct)+'<div class="refcard-ring-c" style="color:'+pcol+'">'+pct+'%</div></div>'+
    '<div class="refcard-gstat"><div class="gs-row"><span class="gs-lbl">Conformes</span><span class="gs-val" style="color:var(--state-success)">'+(started?it.ok:0)+'</span></div><div class="gs-row"><span class="gs-lbl">En cours</span><span class="gs-val" style="color:var(--state-warning)">'+(started?it.wip:0)+'</span></div><div class="gs-row"><span class="gs-lbl">Écarts</span><span class="gs-val" style="color:var(--state-danger)">'+(started?it.ko:0)+'</span></div></div></div>'+
    '<div class="refcard-foot"><span class="refcard-due"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/></svg>'+foot+'</span>'+badge+'</div></div>';
}
function renderActiveGrid(){
  const g=document.getElementById('conf-active-grid'); if(!g) return;
  const act=CATALOG.filter(x=>x.active);
  g.innerHTML=act.length? act.map(confCard).join('')
    : '<div class="pp-empty" style="grid-column:1/-1">Aucun référentiel actif. Ouvrez la bibliothèque pour en activer un.</div>';
}
function openLibrary(){
  document.getElementById('conformite-home').style.display='none';
  document.getElementById('conformite-detail').style.display='none';
  document.getElementById('conformite-library').style.display='';
  document.querySelector('.page-content').scrollTop=0;
  document.getElementById('breadcrumb').innerHTML='<a onclick="showView(\'dashboard\')">Gouvernance &amp; conformité</a><span class="bc-sep">/</span><a onclick="confBack()">Conformité</a><span class="bc-sep">/</span><span class="bc-current">Bibliothèque</span>';
  renderLibrary();
}
function toggleFramework(key){
  const it=CATALOG.find(x=>x.key===key); if(!it) return;
  it.active=!it.active;
  renderLibrary(); renderActiveGrid();
  showToast(it.name+(it.active?' activé pour votre environnement':' désactivé'));
}
function renderLibrary(){
  const nAct=CATALOG.filter(x=>x.active).length;
  document.getElementById('lib-count').textContent=nAct+' référentiel'+(nAct>1?'s':'')+' actif'+(nAct>1?'s':'')+' sur '+CATALOG.length+' disponibles dans le catalogue.';
  const domains=[...new Set(CATALOG.map(x=>x.domain))];
  document.getElementById('conf-library-body').innerHTML=domains.map(dom=>{
    const items=CATALOG.filter(x=>x.domain===dom);
    const cards=items.map(it=>
      '<div class="lib-card'+(it.active?' on':'')+'">'+
        '<div class="lib-logo" style="background:'+it.bg+';color:'+it.fg+'">'+it.txt+'</div>'+
        '<div class="lib-body"><div class="lib-name">'+it.name+(FRAMEWORKS[it.key]?'':'  <span class="badge bdg-neutral nodot" style="font-size:10px">Catalogue</span>')+'</div>'+
          '<div class="lib-sub">'+it.sub+'</div>'+
          '<div class="lib-meta"><span>'+it.origin+'</span><span>'+it.req+' exigences</span></div></div>'+
        '<button class="sw'+(it.active?' on':'')+'" role="switch" aria-checked="'+it.active+'" title="Activer / désactiver" onclick="toggleFramework(\''+it.key+'\')"></button>'+
      '</div>').join('');
    return '<div class="lib-group"><div class="sec-title">'+dom+'</div><div class="lib-grid">'+cards+'</div></div>';
  }).join('');
}
function cdSwitch(key){ CD_KEY=key; document.querySelector('.page-content').scrollTop=0; document.getElementById('breadcrumb').innerHTML='<a onclick="showView(\'dashboard\')">Gouvernance &amp; conformité</a><span class="bc-sep">/</span><a onclick="confBack()">Conformité</a><span class="bc-sep">/</span><span class="bc-current">'+FRAMEWORKS[key].name+'</span>'; cdRender(); }
function cdCycle(fi,ci){ const c=FRAMEWORKS[CD_KEY].fns[fi].cats[ci]; const i=CD_CYCLE.indexOf(c.st); c.st=CD_CYCLE[(i+1)%CD_CYCLE.length]; cdRender(); }
function cdExpandAll(open){ document.querySelectorAll('#cd-tree .cd-fn').forEach(el=>el.classList.toggle('open', open)); }
function cdToggle(el){ el.closest('.cd-fn').classList.toggle('open'); }

function cdRender(){
  const fw=FRAMEWORKS[CD_KEY];
  const overall=cdCompliance(fw.fns.flatMap(f=>f.cats));
  const cnt=cdCounts(fw);
  // hero
  document.getElementById('cd-h1').textContent=fw.name;
  document.getElementById('cd-h1sub').textContent='Évaluation de conformité — '+fw.scope+'.';
  const logo=document.getElementById('cd-logo'); logo.textContent=fw.logoTxt; logo.style.background=fw.logoBg; logo.style.color=fw.logoFg;
  document.getElementById('cd-title').innerHTML=fw.name+'<span class="cd-hero-ver">'+fw.ver+'</span>';
  document.getElementById('cd-sub').textContent=fw.scope;
  document.getElementById('cd-meta').innerHTML=
    '<div class="cd-hm"><span class="l">Responsable</span><span class="v">'+av(fw.owner[0],fw.owner[1])+fw.ownerName+'</span></div>'+
    '<div class="cd-hm"><span class="l">Modalité</span><span class="v">'+fw.mode+'</span></div>'+
    '<div class="cd-hm"><span class="l">Exigences</span><span class="v">'+cnt.total+' évaluées</span></div>'+
    '<div class="cd-hm"><span class="l">Prochaine échéance</span><span class="v">'+fw.audit+'</span></div>';
  // ring
  const r=document.getElementById('cd-ring'); const c=CIRC(40); r.setAttribute('stroke-dasharray',c.toFixed(1)); r.setAttribute('stroke-dashoffset',(c*(100-overall)/100).toFixed(1)); r.setAttribute('stroke',pctColor(overall));
  const rp=document.getElementById('cd-ringpct'); rp.textContent=overall+'%'; rp.style.color=pctColor(overall);
  // distribution bar + legend
  const order=['conf','part','ecart','todo','na'];
  document.getElementById('cd-dist').innerHTML=order.map(k=>cnt[k]?'<span style="width:'+(cnt[k]/cnt.total*100)+'%;background:'+CD_ST[k].col+'"></span>':'').join('');
  document.getElementById('cd-legend').innerHTML=order.map(k=>'<span class="cd-lg"><i style="background:'+CD_ST[k].col+'"></i>'+CD_ST[k].lbl+' <b>'+cnt[k]+'</b></span>').join('');
  // framework switch tabs
  document.getElementById('cd-fswitch').innerHTML=Object.keys(FRAMEWORKS).map(k=>'<button class="cd-ftab'+(k===CD_KEY?' active':'')+'" onclick="cdSwitch(\''+k+'\')">'+FRAMEWORKS[k].logoTxt+'</button>').join('');
  // tree
  document.getElementById('cd-tree').innerHTML=fw.fns.map((f,fi)=>{
    const p=cdCompliance(f.cats);
    const rows=f.cats.map((x,ci)=>{
      const s=CD_ST[x.st];
      return '<div class="cd-req" onclick="openAssess('+fi+','+ci+')"><div class="cd-req-code">'+x.code+'</div>'+
        '<div class="cd-req-body"><div class="cd-req-name">'+x.name+'</div><div class="cd-req-sub">'+x.ctrl+'</div></div>'+
        '<div class="cd-req-owner">'+av(x.o[0],x.o[1])+'</div>'+
        '<span class="cd-chip '+s.cls+'" title="Cliquer pour changer" onclick="event.stopPropagation();cdCycle('+fi+','+ci+')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4">'+s.ic+'</svg>'+s.lbl+'</span>'+
        '<svg class="cd-req-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><polyline points="9 18 15 12 9 6"/></svg></div>';
    }).join('');
    return '<div class="cd-fn'+(fi===0?' open':'')+'">'+
      '<div class="cd-fn-head" onclick="cdToggle(this)">'+
        '<svg class="cd-fn-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>'+
        '<div class="cd-fn-badge" style="background:color-mix(in srgb,'+f.color+' 14%,transparent);color:'+f.color+'">'+f.code+'</div>'+
        '<div class="cd-fn-name"><div class="n">'+f.name+'</div><div class="m">'+f.cats.length+' exigences · '+f.code+'</div></div>'+
        '<div class="cd-fn-prog"><div class="cd-fn-bar"><i style="width:'+p+'%;background:'+pctColor(p)+'"></i></div><div class="cd-fn-pct" style="color:'+pctColor(p)+'">'+p+'%</div></div>'+
      '</div>'+
      '<div class="cd-fn-body">'+rows+'</div>'+
    '</div>';
  }).join('');
  // rail
  const dc=CIRC(54), evalTotal=cnt.conf+cnt.part+cnt.ecart+cnt.todo+cnt.na;
  let acc=0;
  const segs=order.filter(k=>cnt[k]).map(k=>{
    const frac=cnt[k]/evalTotal, len=dc*frac, gap=dc-len, off=-acc*dc; acc+=frac;
    return '<circle cx="65" cy="65" r="54" fill="none" stroke="'+CD_ST[k].col+'" stroke-width="18" stroke-dasharray="'+len.toFixed(1)+' '+gap.toFixed(1)+'" stroke-dashoffset="'+off.toFixed(1)+'"/>';
  }).join('');
  const railList=order.map(k=>'<div class="cd-rl"><span class="cd-rl-l"><i style="background:'+CD_ST[k].col+'"></i>'+CD_ST[k].lbl+'</span><span class="cd-rl-v">'+cnt[k]+'</span></div>').join('');
  const mat=fw.fns.map(f=>{const p=cdCompliance(f.cats);return '<div class="cd-mat-row"><div class="top"><span class="n">'+f.code+' · '+f.name+'</span><span class="lv">'+p+'%</span></div><div class="cd-mat-bar"><i style="width:'+p+'%;background:'+pctColor(p)+'"></i></div></div>';}).join('');
  document.getElementById('cd-rail').innerHTML=
    '<div class="card" style="padding:18px"><div class="sp-head"><span class="sp-title">Répartition</span></div>'+
      '<div class="cd-donut"><svg width="130" height="130" viewBox="0 0 130 130"><circle cx="65" cy="65" r="54" fill="none" stroke="var(--neutral-100)" stroke-width="18"/>'+segs+'</svg><div class="cd-donut-c"><span class="n" style="color:'+pctColor(overall)+'">'+overall+'%</span><span class="t">Conforme</span></div></div>'+
      '<div style="margin-top:14px">'+railList+'</div>'+
    '</div>'+
    '<div class="card" style="padding:18px"><div class="sp-head"><span class="sp-title">'+fw.maturityLabel+'</span></div><div class="cd-mat">'+mat+'</div></div>'+
    '<div class="card" style="padding:18px"><div class="sp-head"><span class="sp-title">Évaluation</span></div>'+
      '<div class="cd-rl"><span class="cd-rl-l">Modalité</span><span class="cd-rl-v">'+fw.mode+'</span></div>'+
      '<div class="cd-rl"><span class="cd-rl-l">Responsable</span><span class="cd-rl-v" style="font-weight:600">'+fw.ownerName.split(' — ')[0]+'</span></div>'+
      '<div class="cd-rl"><span class="cd-rl-l">Prochaine échéance</span><span class="cd-rl-v" style="font-weight:600">'+fw.audit+'</span></div>'+
      '<button class="sp-btn" style="margin-top:12px" onclick="openRemediation()">Voir le plan de remédiation</button>'+
    '</div>';
}
try{ renderActiveGrid(); }catch(e){}

/* ─── Nouveau contrôle ─── */
function openNewCtrl(){
  const fw=FRAMEWORKS[CD_KEY]; if(!fw) return;
  document.getElementById('nc-sub').textContent='Ajouter une exigence au référentiel — '+fw.name+'.';
  document.getElementById('nc-fn').innerHTML=fw.fns.map((f,i)=>'<option value="'+i+'">'+f.code+' · '+f.name+'</option>').join('');
  document.getElementById('nc-code').value='';
  document.getElementById('nc-name').value='';
  document.getElementById('nc-ctrl').value='';
  document.getElementById('nc-status').value='todo';
  document.getElementById('ctrlModal').classList.add('open');
}
function closeNewCtrl(){ document.getElementById('ctrlModal').classList.remove('open'); }
function saveNewCtrl(){
  const fw=FRAMEWORKS[CD_KEY]; if(!fw) return;
  const fi=+document.getElementById('nc-fn').value;
  const code=document.getElementById('nc-code').value.trim();
  const name=document.getElementById('nc-name').value.trim();
  if(!code||!name){ showToast('Renseignez la référence et l\u2019intitulé du contrôle'); return; }
  const ov=document.getElementById('nc-owner').value.split('|');
  fw.fns[fi].cats.push({ code:code, name:name, ctrl:document.getElementById('nc-ctrl').value.trim()||'Contrôle personnalisé ajouté au référentiel', st:document.getElementById('nc-status').value, o:[ov[0],ov[1]], _custom:true });
  closeNewCtrl();
  if(document.getElementById('conformite-detail').style.display==='none'){ openConfDetail(CD_KEY); }
  else { cdRender(); }
  const fn=document.querySelectorAll('#cd-tree .cd-fn')[fi]; if(fn) fn.classList.add('open');
  showToast('Contrôle '+code+' ajouté à '+fw.fns[fi].code);
}

/* ─── Panneau d'évaluation d'une exigence ─── */
let ASS_FI=0, ASS_CI=0, ASS_ST='todo', ASS_MAT=0;
const MAT_DEFAULT={conf:4, part:3, ecart:1, todo:0, na:0};
function openAssess(fi,ci){
  const fw=FRAMEWORKS[CD_KEY]; if(!fw) return;
  ASS_FI=fi; ASS_CI=ci;
  const f=fw.fns[fi], x=f.cats[ci];
  ASS_ST=x.st; ASS_MAT=x._mat!=null?x._mat:MAT_DEFAULT[x.st];
  document.getElementById('dw-fw').textContent=fw.name;
  document.getElementById('dw-code').textContent=x.code;
  document.getElementById('dw-title').textContent=x.name;
  document.getElementById('dw-ctrl').textContent=x.ctrl;
  // status buttons
  document.getElementById('dw-status').innerHTML=CD_CYCLE.map(k=>{const s=CD_ST[k];return '<div class="dw-st'+(k===ASS_ST?' sel':'')+'" style="color:'+s.col+'" onclick="assSetStatus(\''+k+'\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">'+s.ic+'</svg><span class="n">'+s.lbl+'</span></div>';}).join('');
  assPaintMat();
  // owner select
  const sel=document.getElementById('dw-owner'); for(const o of sel.options){ if(o.value.split('|')[1]===x.o[1]){ sel.value=o.value; break; } }
  document.getElementById('dw-note').value=x._note||'';
  // evidence
  if(!x._evid) x._evid = x.st==='conf'?[{k:'file',n:'Politique_'+x.code+'.pdf',m:'PDF · 480 Ko',t:'pdf'}]:[];
  assPaintEvid();
  assPaintGap();
  document.getElementById('dw-scrim').classList.add('open');
  document.getElementById('dw-panel').classList.add('open');
}
function closeAssess(){ document.getElementById('dw-scrim').classList.remove('open'); document.getElementById('dw-panel').classList.remove('open'); }
function assSetStatus(k){ ASS_ST=k; document.querySelectorAll('#dw-status .dw-st').forEach((el,i)=>el.classList.toggle('sel',CD_CYCLE[i]===k)); if(MAT_DEFAULT[k]!=null && (k==='na'||k==='todo')){ ASS_MAT=0; assPaintMat(); } assPaintGap(); }
function assSetMat(lv,el){ ASS_MAT=lv; assPaintMat(); }
function assPaintMat(){ document.querySelectorAll('#dw-maturity .dw-mat-b').forEach((el,i)=>el.classList.toggle('sel',i+1===ASS_MAT)); }
const EVID_ICO={
  pdf:{cls:'',svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',lbl:'PDF'},
  xls:{cls:'xls',svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',lbl:'XLS'},
  link:{cls:'link',svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>'},
  doc:{cls:'doc',svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>'},
  note:{cls:'note',svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>'}
};
function assToggleAddMenu(e){ e.stopPropagation(); document.getElementById('dw-addpop').classList.toggle('open'); }
function assPaintEvid(){
  const x=FRAMEWORKS[CD_KEY].fns[ASS_FI].cats[ASS_CI];
  const wrap=document.getElementById('dw-evid');
  if(!x._evid.length){ wrap.innerHTML='<div style="font-size:12px;color:var(--neutral-400);font-weight:600;padding:2px 0">Aucune preuve jointe.</div>'; return; }
  wrap.innerHTML=x._evid.map((e,i)=>{
    const ic=EVID_ICO[e.t]||EVID_ICO.pdf;
    const nameHtml=e.k==='link'&&e.url ? '<a href="'+e.url+'" target="_blank" rel="noopener" onclick="event.stopPropagation()">'+e.n+'</a>' : e.n;
    return '<div class="dw-file"><div class="dw-file-ico '+ic.cls+'">'+(ic.lbl||ic.svg)+'</div><div class="dw-file-b"><div class="dw-file-n">'+nameHtml+'</div><div class="dw-file-m">'+e.m+'</div></div><button class="dw-file-x" onclick="assDelEvidence('+i+')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>';
  }).join('');
}
function assAddEvidence(kind){
  document.getElementById('dw-addpop').classList.remove('open');
  const x=FRAMEWORKS[CD_KEY].fns[ASS_FI].cats[ASS_CI]; const n=x._evid.length+1; const today=new Date().toLocaleDateString('fr-FR');
  if(kind==='link'){
    const url=prompt('URL de la preuve :','https://'); if(!url) return;
    let label=url.replace(/^https?:\/\//,'').replace(/\/$/,''); if(label.length>42) label=label.slice(0,42)+'…';
    x._evid.push({k:'link',t:'link',n:label,url:url,m:'Lien externe · '+today});
  } else if(kind==='doc'){
    const ref=prompt('Référence du document (politique / procédure) :','PSSI-'+x.code); if(!ref) return;
    x._evid.push({k:'doc',t:'doc',n:ref,m:'Référence interne · '+today});
  } else if(kind==='note'){
    const note=prompt('Note / constat :',''); if(!note) return;
    x._evid.push({k:'note',t:'note',n:note.length>48?note.slice(0,48)+'…':note,m:'Note · '+today});
  } else {
    x._evid.push({k:'file',t:'pdf',n:'Preuve_'+x.code+'_'+n+'.pdf',m:'PDF · '+(120+n*37)+' Ko · '+today});
  }
  assPaintEvid(); showToast('Preuve ajoutée à l\'exigence '+x.code);
}
function assDelEvidence(i){ const x=FRAMEWORKS[CD_KEY].fns[ASS_FI].cats[ASS_CI]; x._evid.splice(i,1); assPaintEvid(); }
function assPaintGap(){ document.getElementById('dw-gap').classList.toggle('show', ASS_ST==='ecart'||ASS_ST==='part'); }
function assNav(dir){ saveAssess(true); const fw=FRAMEWORKS[CD_KEY]; let fi=ASS_FI, ci=ASS_CI+dir; while(fi>=0&&fi<fw.fns.length){ const cats=fw.fns[fi].cats; if(ci<0){ fi--; if(fi<0) break; ci=fw.fns[fi].cats.length-1; continue;} if(ci>=cats.length){ fi++; ci=0; continue;} openAssess(fi,ci); return; } showToast('Fin de la liste des exigences'); }
function saveAssess(silent){
  const x=FRAMEWORKS[CD_KEY].fns[ASS_FI].cats[ASS_CI];
  x.st=ASS_ST; x._mat=ASS_MAT; x._note=document.getElementById('dw-note').value;
  const ov=document.getElementById('dw-owner').value.split('|'); x.o=[ov[0],ov[1]];
  cdRender();
  if(!silent){ closeAssess(); showToast('Exigence '+x.code+' mise à jour'); }
}
document.addEventListener('keydown',e=>{ if(e.key==='Escape') closeAssess(); });

/* ─── Lancer une revue ─── */
let RV_MODE='auto';
function openReview(){
  const fw=FRAMEWORKS[CD_KEY]; if(!fw) return;
  document.getElementById('rv-sub').textContent='Campagne d\u2019évaluation — '+fw.name+'.';
  document.getElementById('rv-name').value='Revue '+fw.name+' — '+new Date().getFullYear();
  document.getElementById('rv-scope').innerHTML=fw.fns.map((f,i)=>
    '<div class="rv-dom on" data-fi="'+i+'" onclick="rvToggleDom(this)"><div class="rv-dom-check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></div><div class="rv-dom-b"><div class="rv-dom-n">'+f.code+' · '+f.name+'</div><div class="rv-dom-m">'+f.cats.length+' exigences</div></div><div class="rv-dom-cnt">'+f.cats.length+'</div></div>'
  ).join('');
  rvCount();
  document.getElementById('reviewModal').classList.add('open');
}
function closeReview(){ document.getElementById('reviewModal').classList.remove('open'); }
function rvPickMode(el){ document.querySelectorAll('#reviewModal .type-pill').forEach(p=>p.classList.remove('sel')); el.classList.add('sel'); RV_MODE=el.dataset.mode; }
function rvToggleDom(el){ el.classList.toggle('on'); const c=el.querySelector('.rv-dom-check'); rvCount(); }
function rvCount(){
  const fw=FRAMEWORKS[CD_KEY]; let n=0;
  document.querySelectorAll('#rv-scope .rv-dom.on').forEach(el=>{ n+=fw.fns[+el.dataset.fi].cats.length; });
  document.getElementById('rv-count').textContent=n+' exigence'+(n>1?'s':'')+' sélectionnée'+(n>1?'s':'');
}
function rvLaunch(){ const n=document.getElementById('rv-count').textContent; closeReview(); showToast('Revue lancée · '+n); }

/* ─── Plan de remédiation ─── */
const OWNER_NAMES={PD:'Paul Dubois',MD:'Marc Dubois',SL:'Sophie Leroy',JT:'Julien Tran',AB:'Alice Bernard'};
let REM_FILTER='all';
function remGaps(){
  const fw=FRAMEWORKS[CD_KEY]; const out=[];
  fw.fns.forEach(f=>f.cats.forEach(x=>{ if(x.st==='ecart'||x.st==='part') out.push({fw:fw.name, fcode:f.code, x:x}); }));
  return out;
}
function openRemediation(){
  const fw=FRAMEWORKS[CD_KEY]; if(!fw) return;
  document.getElementById('rem-title').textContent='Plan de remédiation — '+fw.name;
  REM_FILTER='all';
  document.querySelectorAll('#rem-seg .seg-btn').forEach((b,i)=>b.classList.toggle('active',i===0));
  remRender();
  document.getElementById('remModal').classList.add('open');
}
function closeRemediation(){ document.getElementById('remModal').classList.remove('open'); }
function remFilter(f,el){ REM_FILTER=f; document.querySelectorAll('#rem-seg .seg-btn').forEach(b=>b.classList.remove('active')); el.classList.add('active'); remRender(); }const REM_PRIO={ecart:'haute', part:'moyenne'};
const REM_ACT={
  ecart:'Formaliser et déployer le contrôle manquant, puis apporter les preuves.',
  part:'Compléter la mise en œuvre et documenter les preuves manquantes.'
};
function remRender(){
  const all=remGaps();
  const cntE=all.filter(g=>g.x.st==='ecart').length, cntP=all.filter(g=>g.x.st==='part').length;
  const late=Math.min(2,cntE);
  document.getElementById('rem-sub').textContent=(cntE+cntP)+' exigence(s) à traiter — '+cntE+' écart(s), '+cntP+' partiel(s).';
  document.getElementById('rem-kpis').innerHTML=
    '<div class="rem-kpi"><div class="n" style="color:var(--state-danger)">'+cntE+'</div><div class="l">Écarts à corriger</div></div>'+
    '<div class="rem-kpi"><div class="n" style="color:var(--brand-gold-700)">'+cntP+'</div><div class="l">Conformités partielles</div></div>'+
    '<div class="rem-kpi"><div class="n" style="color:var(--state-warning)">'+late+'</div><div class="l">Actions en retard</div></div>'+
    '<div class="rem-kpi"><div class="n" style="color:var(--brand-ink)">'+(cntE+cntP)+'</div><div class="l">Actions ouvertes</div></div>';
  const rows=all.filter(g=>REM_FILTER==='all'||g.x.st===REM_FILTER);
  const body=document.getElementById('rem-body');
  if(!rows.length){ body.innerHTML='<tr><td colspan="6" class="rem-empty">Aucune action de remédiation dans cette catégorie.</td></tr>'; return; }
  body.innerHTML=rows.map((g,i)=>{
    const prio=g.x._prio||REM_PRIO[g.x.st];
    const due=g.x._actiondue||['30 sept. 2026','15 oct. 2026','31 oct. 2026','20 nov. 2026'][i%4];
    const act=g.x._action||REM_ACT[g.x.st];
    return '<tr><td><span class="rem-code">'+g.x.code+'</span></td>'+
      '<td><div class="rem-req">'+g.x.name+'</div><div class="rem-fw">'+g.fcode+'</div></td>'+
      '<td class="rem-action">'+act+'</td>'+
      '<td><div style="display:flex;align-items:center;gap:8px">'+av(g.x.o[0],g.x.o[1])+'<span>'+(OWNER_NAMES[g.x.o[1]]||g.x.o[1])+'</span></div></td>'+
      '<td>'+due+'</td>'+
      '<td><span class="rem-prio rem-p-'+prio+'">'+prio.charAt(0).toUpperCase()+prio.slice(1)+'</span></td></tr>';
  }).join('');
}
