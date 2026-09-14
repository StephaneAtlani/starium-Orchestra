/* ═══ STRATÉGIE PAR DIRECTION — directions, schéma directeur, OKR, risques, revues ═══ */
const STG_Y0=2026, STG_NY=3, STG_NM=STG_NY*12;
const STG_NOW=8; /* sept. 2026 */
const STG_TONES={
  info   :{c:'var(--state-info)',     bg:'var(--state-info-bg)'},
  gold   :{c:'var(--brand-gold-700)', bg:'var(--brand-gold-050)'},
  purple :{c:'var(--purple)',         bg:'var(--purple-bg)'},
  teal   :{c:'var(--teal)',           bg:'var(--teal-bg)'},
  success:{c:'var(--state-success)',  bg:'var(--state-success-bg)'},
  danger :{c:'var(--state-danger)',   bg:'var(--state-danger-bg)'}
};
const STG_STATUS={brouillon:{lbl:'Brouillon',cls:'bdg-neutral'},revue:{lbl:'En revue',cls:'bdg-warn'},valide:{lbl:'Validé',cls:'bdg-success'}};
const STG_SEED=[
{id:'dsi',sigle:'DSI',name:"Direction des Systèmes d'Information",dir:'Claire Dubois',dirIni:'CD',parent:'Direction Générale',tone:'info',
 scope:"Infrastructure et exploitation, applications métiers, cybersécurité, data et gouvernance IT du groupe.",
 fte:78,budget:12400000,horizon:'2026 → 2028',status:'valide',review:'2026-05-02',version:'v3.1',
 ambition:"Devenir le <span class=\"hl\">partenaire de transformation</span> des métiers : un socle IT sécurisé et industrialisé, des produits numériques livrés en continu, une donnée exploitable par tous.",
 axes:[{n:'Socle & exploitation',t:'info'},{n:'Produits & data',t:'purple'},{n:'Cyber & conformité',t:'gold'},{n:'Compétences IT',t:'teal'}],
 align:{ax1:90,ax2:85,ax3:70,ax4:55},
 budgets:{2026:4200000,2027:4600000,2028:3600000},
 chantiers:[
  {id:'c1',n:'Migration Cloud hybride',lane:0,s:0,e:14,own:'Marc Dupont',bud:3200000,pct:62,ga:['ax1','ax2'],prj:['Migration Cloud'],ms:[{m:5,l:'Bascule du socle'},{m:14,l:'Décommissionnement DC'}]},
  {id:'c2',n:'Refonte Portail Client',lane:1,s:3,e:17,own:'Sophie Leroy',bud:1800000,pct:48,ga:['ax2'],prj:['Refonte Portail Client'],ms:[{m:11,l:'MEP v1'}]},
  {id:'c3',n:'Plateforme Data & BI',lane:1,s:12,e:28,own:'Julien Tan',bud:2400000,pct:15,ga:['ax1','ax2'],prj:[],ms:[{m:20,l:'Premier domaine métier'}]},
  {id:'c4',n:'Conformité DORA',lane:2,s:0,e:11,own:'Alice Bernard',bud:900000,pct:70,ga:['ax3'],prj:['Conformité DORA'],ms:[{m:11,l:'Attestation régulateur'}]},
  {id:'c5',n:'SOC & détection 24/7',lane:2,s:9,e:23,own:'Alice Bernard',bud:1500000,pct:20,ga:['ax3'],prj:[],ms:[]},
  {id:'c6',n:'Archivage & conformité légale',lane:2,s:18,e:30,own:'Alice Bernard',bud:600000,pct:0,ga:['ax3'],prj:[],ms:[]},
  {id:'c7',n:'Académie IT interne',lane:3,s:6,e:24,own:'Claire Dubois',bud:400000,pct:35,ga:['ax4'],prj:[],ms:[{m:12,l:'Première promotion'}]}],
 okr:[
  {t:'Disponibilité des services critiques',who:'Marc Dupont',kpi:'99,9 % de disponibilité',cur:'99,72 %',pct:78},
  {t:'Réduire la dette technique de 30 %',who:'Julien Tan',kpi:'-30 % de composants obsolètes',cur:'-13 %',pct:45},
  {t:'Sécurité by design sur tous les cadrages',who:'Alice Bernard',kpi:'100 % des projets',cur:'62 %',pct:60},
  {t:'Time-to-market des évolutions < 6 semaines',who:'Sophie Leroy',kpi:'6 semaines',cur:'11 semaines',pct:35}],
 risks:[
  {n:'Pénurie de compétences cloud',p:'Élevée',i:'Fort',own:'CD',lvl:'danger'},
  {n:'Dépendance à un intégrateur unique',p:'Moyenne',i:'Fort',own:'MD',lvl:'warning'},
  {n:'Retard réglementaire DORA',p:'Moyenne',i:'Critique',own:'AB',lvl:'danger'},
  {n:'Adhésion métier à la plateforme data',p:'Faible',i:'Moyen',own:'JT',lvl:'info'}],
 kpis:[{l:'Disponibilité',v:'99,72 %',d:'cible 99,9 %'},{l:'Coût IT / CA',v:'3,1 %',d:'médiane secteur 3,4 %'},{l:'Satisfaction interne',v:'7,8/10',d:'+0,6 vs 2025'},{l:'Incidents majeurs',v:'4',d:'12 mois glissants'}],
 blocks:[
  {k:'text',t:'Principes directeurs',b:"1 — Cloud d'abord, exceptions documentées et arbitrées en comité d'architecture.\n2 — Une seule source de vérité par domaine de données.\n3 — Sécurité intégrée au cadrage, jamais en contrôle final.\n4 — Aucun nouveau développement sans propriétaire métier identifié."},
  {k:'image',t:'Architecture cible 2028',b:'Schéma d’architecture applicative et d’infrastructure cible',src:''},
  {k:'text',t:'Trajectoire de décommissionnement',b:"37 applications au périmètre. 12 décommissionnées d'ici fin 2026, 18 d'ici 2027, le solde intégré au socle cible. Chaque sortie est conditionnée à la reprise des données et à l'accord du métier propriétaire."}],
 reviews:[
  {v:'v3.1',d:'2026-05-02',by:'CODIR',st:'valide',n:"Ajout du chantier Archivage & conformité légale. Budget 2028 révisé à la baisse (-0,4 M€)."},
  {v:'v3.0',d:'2025-11-14',by:'CODIR',st:'valide',n:"Extension de l'horizon à 2028 et intégration de l'axe Compétences IT."},
  {v:'v2.0',d:'2025-03-20',by:'Comité d’architecture',st:'valide',n:"Recentrage sur le socle et la cybersécurité après l'audit externe."}]},
{id:'daf',sigle:'DAF',name:'Direction Administrative et Financière',dir:'Pierre Moreau',dirIni:'PM',parent:'Direction Générale',tone:'teal',
 scope:"Contrôle de gestion, comptabilité, trésorerie, achats et pilotage de la performance économique du groupe.",
 fte:34,budget:4100000,horizon:'2026 → 2028',status:'revue',review:'2026-06-18',version:'v1.4',
 ambition:"Faire de la fonction finance un <span class=\"hl\">copilote des métiers</span> : une clôture rapide et fiable, des processus dématérialisés de bout en bout, une vision de la performance disponible en continu.",
 axes:[{n:'Pilotage de la performance',t:'info'},{n:'Industrialisation des processus',t:'gold'},{n:'Maîtrise des risques financiers',t:'teal'}],
 align:{ax1:60,ax2:40,ax3:65,ax4:20},
 budgets:{2026:1100000,2027:1500000,2028:800000},
 chantiers:[
  {id:'d1',n:'Refonte du cycle budgétaire',lane:0,s:0,e:9,own:'Pierre Moreau',bud:350000,pct:55,ga:['ax1'],prj:[],ms:[{m:9,l:'Budget 2027 en nouveau format'}]},
  {id:'d2',n:'Dématérialisation facture fournisseur',lane:1,s:2,e:16,own:'Nadia Cherif',bud:500000,pct:40,ga:['ax1','ax3'],prj:[],ms:[{m:10,l:'Obligation e-invoicing'}]},
  {id:'d3',n:'Consolidation ERP finance',lane:1,s:12,e:32,own:'Nadia Cherif',bud:2100000,pct:10,ga:['ax2'],prj:[],ms:[{m:24,l:'Bascule entité pilote'}]},
  {id:'d4',n:'Contrôle interne & conformité',lane:2,s:6,e:22,own:'Hugo Petit',bud:300000,pct:25,ga:['ax3'],prj:[],ms:[]},
  {id:'d5',n:'Pilotage de la dette & trésorerie',lane:0,s:14,e:26,own:'Pierre Moreau',bud:200000,pct:0,ga:['ax1'],prj:[],ms:[]},
  {id:'d6',n:'Plateforme data finance',lane:0,s:16,e:30,own:'Hugo Petit',bud:450000,pct:0,ga:['ax1','ax2'],prj:[],ms:[]}],
 okr:[
  {t:'Clôture mensuelle en 5 jours ouvrés',who:'Pierre Moreau',kpi:'5 jours',cur:'9 jours',pct:40},
  {t:'90 % des factures fournisseurs dématérialisées',who:'Nadia Cherif',kpi:'90 %',cur:'51 %',pct:52},
  {t:'Écart prévision / réalisé budgétaire < 3 %',who:'Hugo Petit',kpi:'3 %',cur:'6,8 %',pct:30}],
 risks:[
  {n:'Retard e-invoicing réglementaire',p:'Moyenne',i:'Critique',own:'NC',lvl:'danger'},
  {n:'Qualité des données de gestion',p:'Élevée',i:'Moyen',own:'HP',lvl:'warning'},
  {n:'Charge de la double tenue pendant l’ERP',p:'Élevée',i:'Fort',own:'NC',lvl:'danger'}],
 kpis:[{l:'Délai de clôture',v:'9 j',d:'cible 5 j'},{l:'Factures dématérialisées',v:'51 %',d:'cible 90 %'},{l:'Écart budgétaire',v:'6,8 %',d:'cible < 3 %'},{l:'Coût fonction finance',v:'0,9 % du CA',d:'stable'}],
 blocks:[
  {k:'text',t:'Principes directeurs',b:"1 — Une donnée financière saisie une seule fois, à la source.\n2 — Pas de nouvel outil sans suppression d'un existant.\n3 — Le contrôle de gestion accompagne les métiers, il ne les contrôle pas à distance.\n4 — Conformité réglementaire traitée en anticipation, jamais en rattrapage."},
  {k:'image',t:'Cartographie des processus finance',b:'Schéma des flux comptables et budgétaires cibles',src:''}],
 reviews:[
  {v:'v1.4',d:'2026-06-18',by:'CODIR',st:'revue',n:"Chiffrage de la consolidation ERP en cours d'arbitrage — décision attendue en septembre."},
  {v:'v1.0',d:'2025-09-09',by:'CODIR',st:'valide',n:'Première version du schéma directeur finance.'}]}
];
let STG_DIRS=[], STG_CUR=null, STG_Q='', STG_BLK=null, STG_CH=null;
try{ const s=JSON.parse(localStorage.getItem('starium_dirstrat')); STG_DIRS=(s&&s.length)?s:JSON.parse(JSON.stringify(STG_SEED)); }catch(e){ STG_DIRS=JSON.parse(JSON.stringify(STG_SEED)); }
function stgSave(){ try{ localStorage.setItem('starium_dirstrat', JSON.stringify(STG_DIRS)); }catch(e){} }
function stgReset(){ STG_DIRS=JSON.parse(JSON.stringify(STG_SEED)); stgSave(); stgRenderDirs(); }
function stgDir(id){ return STG_DIRS.find(d=>d.id===id)||null; }
function stgCur(){ return stgDir(STG_CUR); }
function stgTone(t){ return STG_TONES[t]||STG_TONES.info; }
function stgEsc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'); }
function stgEur(n){ if(!n) return '—'; return n>=1000000?(n/1000000).toFixed(1).replace('.',',')+' M€':Math.round(n/1000)+' k€'; }
function stgDate(iso){ if(!iso) return '—'; const d=new Date(iso); return d.getDate()+' '+['janv','févr','mars','avr','mai','juin','juil','août','sept','oct','nov','déc'][d.getMonth()]+'. '+d.getFullYear(); }
function stgQlbl(m){ return 'T'+(Math.floor((m%12)/3)+1)+' '+(STG_Y0+Math.floor(m/12)); }
function stgGAxes(){ return (typeof AXES!=='undefined'&&AXES.length)?AXES:[{id:'ax1',name:'Axe 1'},{id:'ax2',name:'Axe 2'},{id:'ax3',name:'Axe 3'},{id:'ax4',name:'Axe 4'}]; }
function stgToast(m){ if(typeof showToast==='function') showToast(m); }
function stgSvgRing(pct,color){
  const r=22, c=2*Math.PI*r;
  return '<svg width="52" height="52" viewBox="0 0 52 52"><circle cx="26" cy="26" r="'+r+'" fill="none" stroke="var(--neutral-200)" stroke-width="6"/>'
   +'<circle cx="26" cy="26" r="'+r+'" fill="none" stroke="'+color+'" stroke-width="6" stroke-linecap="round" stroke-dasharray="'+c.toFixed(1)+'" stroke-dashoffset="'+(c*(1-pct/100)).toFixed(1)+'" transform="rotate(-90 26 26)"/></svg>';
}
/* ─── Scores calculés ─── */
function stgScore(d){
  const ax=stgGAxes(); let tot=0;
  ax.forEach(a=>{
    const linked=d.chantiers.filter(c=>(c.ga||[]).includes(a.id));
    const cov=Math.min(100, linked.length*34);
    const prog=linked.length?linked.reduce((s,c)=>s+c.pct,0)/linked.length:0;
    tot += 0.5*(d.align[a.id]||0) + 0.3*cov + 0.2*prog;
  });
  return Math.round(tot/ax.length);
}
function stgMaturity(d){
  const amb=d.ambition?Math.min(100,Math.round(d.ambition.replace(/<[^>]+>/g,'').length/1.8)):0;
  const okrAvg=d.okr.length?d.okr.reduce((s,o)=>s+o.pct,0)/d.okr.length:0;
  const obj=Math.round(0.5*Math.min(100,d.okr.length*25)+0.5*okrAvg);
  const chAvg=d.chantiers.length?d.chantiers.reduce((s,c)=>s+c.pct,0)/d.chantiers.length:0;
  const cha=Math.round(0.5*Math.min(100,d.chantiers.length*15)+0.5*chAvg);
  const bTot=Object.values(d.budgets).reduce((a,b)=>a+b,0), cTot=d.chantiers.reduce((s,c)=>s+c.bud,0);
  const bud=cTot?Math.round(Math.min(100,bTot/cTot*100)):(bTot?100:0);
  const ris=Math.min(100,d.risks.length*30);
  const days=d.review?Math.round((new Date(2026,8,13)-new Date(d.review))/864e5):999;
  const rev=Math.max(0,Math.min(100,100-Math.max(0,days-90)/3.65));
  return {Ambition:amb,Objectifs:obj,Chantiers:cha,Budget:bud,Risques:ris,Revue:Math.round(rev)};
}
/* ─── Onglets de Vision stratégique ─── */
function stgTab(name){
  document.querySelectorAll('#vs-subtabs .bud-subtab').forEach(b=>b.classList.toggle('active', b.dataset.vs===name));
  document.querySelectorAll('#view-vision .bud-pane').forEach(p=>p.classList.toggle('active', p.dataset.vspane===name));
  const ha=document.getElementById('vs-head-actions'); if(ha) ha.dataset.tab=name;
  document.querySelectorAll('#vs-head-actions [data-only]').forEach(b=>{ b.style.display=b.dataset.only===name?'':'none'; });
  if(name==='directions') stgRenderDirs();
  if(name==='consolide' && typeof stgRenderConsol==='function') stgRenderConsol();
}
/* ─── Grille des directions ─── */
function stgRenderDirs(){
  const host=document.getElementById('vs-dir-grid'); if(!host) return;
  const q=STG_Q.trim().toLowerCase();
  const list=STG_DIRS.filter(d=>!q||(d.name+' '+d.sigle+' '+d.dir).toLowerCase().includes(q));
  const cnt=document.getElementById('vs-dir-count'); if(cnt) cnt.textContent=String(STG_DIRS.length);
  host.innerHTML=list.map(d=>{
    const T=stgTone(d.tone), sc=stgScore(d), st=STG_STATUS[d.status]||STG_STATUS.brouillon;
    const done=d.chantiers.filter(c=>c.pct>=100).length;
    return '<div class="card stg-card" onclick="stgOpenDir(\''+d.id+'\')">'
     +'<div class="stg-card-head"><div class="stg-sigle" style="background:'+T.bg+';color:'+T.c+'">'+stgEsc(d.sigle)+'</div>'
     +'<div class="stg-card-id"><div class="stg-card-name">'+stgEsc(d.name)+'</div><div class="stg-card-sub">'+stgEsc(d.dir)+' · '+stgEsc(d.parent)+'</div></div>'
     +'<div class="stg-ring">'+stgSvgRing(sc,T.c)+'<div class="stg-ring-v" style="color:'+T.c+'">'+sc+'</div></div></div>'
     +'<p class="stg-card-scope">'+stgEsc(d.scope)+'</p>'
     +'<div class="stg-mgrid">'
     +'<div class="stg-mcell"><div class="l">Horizon</div><div class="v">'+stgEsc(d.horizon)+'</div></div>'
     +'<div class="stg-mcell"><div class="l">Chantiers</div><div class="v">'+d.chantiers.length+' <span style="font-weight:600;color:var(--neutral-500);font-size:11.5px">dont '+done+' livré'+(done>1?'s':'')+'</span></div></div>'
     +'<div class="stg-mcell"><div class="l">Effectif</div><div class="v">'+d.fte+' ETP</div></div>'
     +'<div class="stg-mcell"><div class="l">Budget</div><div class="v">'+stgEur(d.budget)+'</div></div>'
     +'</div>'
     +'<div class="stg-card-foot"><span class="badge '+st.cls+'">'+st.lbl+' · '+stgEsc(d.version)+'</span>'
     +'<span class="stg-meta">Revue '+stgDate(d.review)+'</span></div></div>';
  }).join('')
   +'<button class="stg-add" onclick="stgOpenDirModal()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>Ajouter une direction</button>';
}
function stgSearch(v){ STG_Q=v; stgRenderDirs(); }
/* ─── Détail : schéma directeur ─── */
function stgOpenDir(id){
  STG_CUR=id; STG_DTAB='axes';
  const d=stgDir(id); if(!d) return;
  stgRenderDetail();
  if(typeof showView==='function') showView('dirstrat');
  const bc=document.getElementById('ds-bc'); if(bc) bc.textContent=d.sigle;
}
function stgBackDirs(){ if(typeof showView==='function') showView('vision'); stgTab('directions'); }
const STG_DTABS=[['axes','Axes stratégiques'],['objectifs','Objectifs'],['alignement','Alignement'],['alertes','Alertes'],['historique','Historique']];
let STG_DTAB='axes';
function stgDetTab(n){ STG_DTAB=n; stgRenderDetail(); }
/* ─── Alertes calculées du schéma directeur ─── */
function stgAlerts(d){
  const A=[], add=(lvl,t,b)=>A.push({lvl,t,b});
  stgGAxes().forEach(a=>{
    const n=d.chantiers.filter(c=>(c.ga||[]).includes(a.id)).length;
    const v=d.align[a.id]||0;
    if(!n) add(v>0?'warning':'danger','Axe groupe non couvert — '+a.name, v>0?'Contribution déclarée à '+v+' % mais aucun chantier rattaché à cet axe.':'Aucune contribution déclarée et aucun chantier rattaché.');
    else if(v<45) add('warning','Contribution faible — '+a.name, v+' % déclarés pour '+n+' chantier'+(n>1?'s':'')+' rattaché'+(n>1?'s':'')+'.');
  });
  d.chantiers.forEach(c=>{
    if(c.e<=STG_NOW&&c.pct<100) add('danger','Chantier en retard — '+c.n,'Fin prévue '+stgQlbl(Math.max(0,c.e-1))+', avancement '+c.pct+' %. Pilote '+c.own+'.');
    else if(c.s<=STG_NOW&&c.pct===0) add('warning','Chantier non démarré — '+c.n,'Fenêtre ouverte depuis '+stgQlbl(c.s)+' sans avancement déclaré.');
    if(!(c.ga||[]).length) add('warning','Chantier non aligné — '+c.n,'Aucun rattachement à un axe du groupe : il ne remonte pas dans la consolidation.');
  });
  d.axes.forEach((x,i)=>{ if(!d.chantiers.filter(c=>c.lane===i).length) add('info','Axe propre sans chantier — '+x.n,'Axe déclaré mais aucune ligne du schéma directeur ne le porte.'); });
  const bTot=Object.values(d.budgets).reduce((x,y)=>x+y,0), cTot=d.chantiers.reduce((x,c)=>x+c.bud,0);
  if(cTot>bTot) add('danger','Budget non couvert', stgEur(cTot)+' de charge chantiers pour '+stgEur(bTot)+' budgétés sur l’horizon — écart de '+stgEur(cTot-bTot)+'.');
  const days=d.review?Math.round((new Date(2026,8,13)-new Date(d.review))/864e5):999;
  if(days>180) add('warning','Revue stratégique périmée','Dernière revue le '+stgDate(d.review)+' — '+days+' jours. Le cycle attendu est semestriel.');
  if(!d.okr.length) add('danger','Aucun objectif mesurable','Le schéma directeur n’a pas d’OKR : l’avancement ne peut pas être évalué.');
  if(!d.risks.length) add('info','Aucun risque déclaré','La dimension Risques de la maturité reste à 0 %.');
  const order={danger:0,warning:1,info:2};
  return A.sort((x,y)=>order[x.lvl]-order[y.lvl]);
}
function stgRenderDetail(){
  const d=stgCur(), root=document.getElementById('ds-root'); if(!d||!root) return;
  const T=stgTone(d.tone), sc=stgScore(d), st=STG_STATUS[d.status]||STG_STATUS.brouillon;
  const cTot=d.chantiers.reduce((s,c)=>s+c.bud,0);
  const AL=stgAlerts(d), nCrit=AL.filter(x=>x.lvl==='danger').length;
  const ico=p=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round">'+p+'</svg>';
  const secT=(p,t,sub)=>'<div class="stg-sec-t">'+ico(p)+t+'</div>'+(sub?'<div class="stg-sec-sub">'+sub+'</div>':'');
  let pane='';
  if(STG_DTAB==='axes'){
    pane=
     '<div class="stg-sec"><div class="stg-sec-head"><div>'+secT('<rect x="3" y="4" width="18" height="17" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="9" y1="10" x2="9" y2="21"/>','Schéma directeur '+stgEsc(d.horizon), d.chantiers.length+' chantiers · '+stgEur(cTot)+' de charge projet · jalons structurants en losange')+'</div>'
     +'<button class="btn btn-secondary" onclick="stgOpenChantier()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>Ajouter un chantier</button></div>'
     +'<div class="card stg-tl">'+stgTimeline(d)+'</div></div>'
     +'<div class="stg-sec"><div class="stg-sec-t" style="margin-bottom:12px">Axes propres de la direction</div><div class="card stg-contrib">'
     + d.axes.map((a,i)=>{ const cs=d.chantiers.filter(c=>c.lane===i); const p=cs.length?Math.round(cs.reduce((s,c)=>s+c.pct,0)/cs.length):0; const t=stgTone(a.t);
         return '<div class="stg-contrib-row"><div class="l" title="'+stgEsc(a.n)+'">'+stgEsc(a.n)+'</div><div class="t"><i style="width:'+p+'%;background:'+t.c+'"></i></div><div class="p">'+p+'%</div></div>'
          +'<div style="font-size:11px;color:var(--neutral-500);font-weight:600;margin:-6px 0 2px 0">'+(cs.length?cs.length+' chantier'+(cs.length>1?'s':''):'aucun chantier')+'</div>'; }).join('')
     +'</div></div>'
     +'<div class="stg-sec"><div class="stg-sec-head"><div>'+secT('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>','Notes &amp; pièces du schéma directeur','Textes de cadrage, principes, schémas d’architecture — libre à la direction.')+'</div>'
     +'<div style="display:flex;gap:8px"><button class="btn btn-secondary" onclick="stgOpenBlock(\'text\')">Ajouter un texte</button><button class="btn btn-secondary" onclick="stgOpenBlock(\'image\')">Ajouter une image</button></div></div>'
     +'<div class="stg-blocks">'+stgBlocks(d)+'</div></div>';
  }
  if(STG_DTAB==='objectifs'){
    pane=
     '<div class="stg-sec"><div class="stg-sec-head"><div>'+secT('<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>','Objectifs &amp; résultats mesurables', d.okr.length+' objectif'+(d.okr.length>1?'s':'')+' suivi'+(d.okr.length>1?'s':'')+' par la direction')+'</div>'
     +'<button class="btn btn-secondary" onclick="stgOpenOkr()">Ajouter un objectif</button></div>'
     +'<div class="card tablecard"><div class="table-wrap"><table class="dt"><thead><tr><th>Objectif</th><th>Responsable</th><th>Indicateur cible</th><th>Actuel</th><th>Avancement</th><th class="right"></th></tr></thead><tbody>'
     +(d.okr.length?d.okr.map((o,i)=>'<tr><td class="cell-strong">'+stgEsc(o.t)+'</td><td>'+stgEsc(o.who)+'</td><td>'+stgEsc(o.kpi)+'</td><td style="font-variant-numeric:tabular-nums;font-weight:700">'+stgEsc(o.cur)+'</td>'
       +'<td><div class="prog"><div class="prog-track"><div class="prog-fill" style="width:'+o.pct+'%;background:'+(o.pct>=70?'var(--state-success)':o.pct>=40?'var(--brand-gold)':'var(--state-danger)')+'"></div></div><span class="prog-pct">'+o.pct+'%</span></div></td>'
       +'<td class="right"><button class="dots-btn" title="Supprimer" onclick="stgDelOkr('+i+')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg></button></td></tr>').join('')
       :'<tr><td colspan="6"><div class="stg-empty">Aucun objectif renseigné pour cette direction.</div></td></tr>')
     +'</tbody></table></div></div></div>'
     +'<div class="stg-sec"><div class="stg-sec-t" style="margin-bottom:12px">Budget prévisionnel par horizon</div><div class="card stg-contrib">'
     + Object.keys(d.budgets).sort().map(y=>{ const mx=Math.max.apply(null,Object.values(d.budgets))||1;
         return '<div class="stg-contrib-row" style="grid-template-columns:60px 1fr 70px"><div class="l">'+y+'</div><div class="t"><i style="width:'+Math.round(d.budgets[y]/mx*100)+'%;background:'+T.c+'"></i></div><div class="p">'+stgEur(d.budgets[y])+'</div></div>'; }).join('')
     +'<div style="display:flex;justify-content:space-between;font-size:12px;font-weight:700;color:var(--neutral-600);padding-top:10px;border-top:1px solid var(--neutral-100)"><span>Total horizon</span><span>'+stgEur(Object.values(d.budgets).reduce((a,b)=>a+b,0))+'</span></div>'
     +'<div style="display:flex;justify-content:space-between;font-size:12px;font-weight:600;color:var(--neutral-500);padding-top:8px"><span>Charge des chantiers</span><span>'+stgEur(cTot)+'</span></div>'
     +'</div></div>';
  }
  if(STG_DTAB==='alignement'){
    const M=stgMaturity(d);
    pane=
     '<div class="stg-sec"><div>'+secT('<circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 0 20"/><path d="M2 12h20"/>','Contribution aux axes du groupe','Score global d’alignement : '+sc+' %. La contribution déclarée est confrontée aux chantiers réellement rattachés.')+'</div>'
     +'<div class="card stg-contrib" style="margin-top:12px">'
     + stgGAxes().map(a=>{ const v=d.align[a.id]||0; const cs=d.chantiers.filter(c=>(c.ga||[]).includes(a.id));
         return '<div class="stg-contrib-row"><div class="l" title="'+stgEsc(a.name)+'">'+stgEsc(a.name)+'</div><div class="t"><i style="width:'+v+'%;background:'+(v>=70?'var(--state-success)':v>=45?'var(--brand-gold)':'var(--state-danger)')+'"></i></div><div class="p">'+v+'%</div></div>'
          +'<div style="font-size:11px;color:var(--neutral-500);font-weight:600;margin:-6px 0 2px 0">'+(cs.length?cs.map(c=>stgEsc(c.n)).join(' · '):'aucun chantier rattaché')+'</div>'; }).join('')
     +'</div></div>'
     +'<div class="stg-sec"><div class="stg-sec-t" style="margin-bottom:12px">Maturité du schéma directeur</div><div class="card stg-contrib">'
     + Object.keys(M).map(k=>'<div class="stg-contrib-row"><div class="l">'+k+'</div><div class="t"><i style="width:'+M[k]+'%;background:'+(M[k]>=70?'var(--state-success)':M[k]>=40?'var(--brand-gold)':'var(--state-danger)')+'"></i></div><div class="p">'+M[k]+'%</div></div>').join('')
     +'</div></div>';
  }
  if(STG_DTAB==='alertes'){
    const cls={danger:'bdg-danger',warning:'bdg-warn',info:'bdg-info'}, lbl={danger:'Critique',warning:'À surveiller',info:'Information'};
    pane=
     '<div class="stg-sec"><div>'+secT('<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>','Alertes de désalignement &amp; d’exécution', AL.length?AL.length+' alerte'+(AL.length>1?'s':'')+' dont '+nCrit+' critique'+(nCrit>1?'s':'')+' — calculées à partir des chantiers, du budget et des revues.':'Aucune alerte : le schéma directeur est complet et à jour.')+'</div>'
     +'<div class="card tablecard" style="margin-top:12px"><div class="table-wrap"><table class="dt"><thead><tr><th style="width:130px">Niveau</th><th>Alerte</th><th>Détail</th></tr></thead><tbody>'
     +(AL.length?AL.map(x=>'<tr><td><span class="badge '+cls[x.lvl]+'">'+lbl[x.lvl]+'</span></td><td class="cell-strong">'+stgEsc(x.t)+'</td><td style="color:var(--neutral-600)">'+stgEsc(x.b)+'</td></tr>').join('')
       :'<tr><td colspan="3"><div class="stg-empty">Aucune alerte détectée sur ce schéma directeur.</div></td></tr>')
     +'</tbody></table></div></div></div>'
     +'<div class="stg-sec"><div class="stg-sec-t" style="margin-bottom:12px">Risques stratégiques déclarés</div>'
     +'<div class="card tablecard"><div class="table-wrap"><table class="dt"><thead><tr><th>Risque</th><th>Prob.</th><th>Impact</th><th class="right">Propriétaire</th></tr></thead><tbody>'
     +(d.risks.length?d.risks.map(r=>'<tr><td><span class="badge '+(r.lvl==='danger'?'bdg-danger':r.lvl==='warning'?'bdg-warn':'bdg-info')+'">'+stgEsc(r.n)+'</span></td><td>'+stgEsc(r.p)+'</td><td>'+stgEsc(r.i)+'</td><td class="right"><span class="stg-chip">'+stgEsc(r.own)+'</span></td></tr>').join('')
       :'<tr><td colspan="4"><div class="stg-empty">Aucun risque stratégique déclaré.</div></td></tr>')
     +'</tbody></table></div></div></div>';
  }
  if(STG_DTAB==='historique'){
    pane=
     '<div class="stg-sec"><div class="stg-sec-head"><div>'+secT('<path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><polyline points="12 7 12 12 15 14"/>','Revues stratégiques &amp; versions', d.reviews.length+' version'+(d.reviews.length>1?'s':'')+' · version courante '+stgEsc(d.version)+' ('+st.lbl.toLowerCase()+')')+'</div>'
     +'<button class="btn btn-secondary" onclick="stgOpenReview()">Nouvelle revue</button></div>'
     +'<div class="card stg-rev">'+d.reviews.map(r=>{ const s=STG_STATUS[r.st]||STG_STATUS.valide;
         return '<div class="stg-rev-item"><div><div class="stg-rev-v">'+stgEsc(r.v)+'</div><div class="stg-rev-d">'+stgDate(r.d)+'</div></div>'
          +'<div><div class="stg-rev-n">'+stgEsc(r.n)+'</div><div class="stg-rev-w">'+stgEsc(r.by)+'</div></div>'
          +'<span class="badge '+s.cls+'">'+s.lbl+'</span></div>'; }).join('')+'</div></div>';
  }
  root.innerHTML=
   '<div class="pg-head"><div><h1>'+stgEsc(d.sigle)+' — Schéma directeur</h1><p class="np-sub">'+stgEsc(d.name)+' · '+stgEsc(d.horizon)+' · '+stgEsc(d.version)+'</p></div>'
   +'<div class="head-actions">'
   +'<button class="btn btn-secondary" onclick="stgBackDirs()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>Toutes les directions</button>'
   +'<button class="btn btn-secondary" onclick="stgExportPdf(\''+d.id+'\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>Export PDF 1 page</button>'
   +'<button class="btn btn-secondary" onclick="stgOpenReview()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>Nouvelle revue</button>'
   +'<button class="btn btn-modifier" onclick="stgOpenDirModal(\''+d.id+'\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>Modifier la direction</button>'
   +'</div></div>'
   /* hero */
   +'<div class="card stg-hero"><div class="stg-hero-sigle" style="background:'+T.bg+';color:'+T.c+'">'+stgEsc(d.sigle)+'</div>'
   +'<div class="stg-hero-id"><h2>'+stgEsc(d.name)+'</h2>'
   +'<div class="stg-hero-meta"><span class="badge '+st.cls+'">'+st.lbl+'</span><span class="stg-hero-sep"></span>'
   +'<span class="stg-meta">'+stgEsc(d.dir)+' · directeur·rice</span><span class="stg-hero-sep"></span>'
   +'<span class="stg-meta">Rattachée à '+stgEsc(d.parent)+'</span><span class="stg-hero-sep"></span>'
   +'<span class="stg-meta">'+d.fte+' ETP · '+stgEur(d.budget)+'</span><span class="stg-hero-sep"></span>'
   +'<span class="stg-meta">Dernière revue '+stgDate(d.review)+'</span></div>'
   +'<p class="stg-ambition" style="margin-top:16px">'+d.ambition+'</p>'
   +'<p class="stg-sec-sub" style="margin-top:10px">'+stgEsc(d.scope)+'</p></div>'
   +'<div class="stg-ring" style="width:72px;height:72px"><svg width="72" height="72" viewBox="0 0 52 52" style="width:72px;height:72px">'+stgSvgRing(sc,T.c).replace(/^<svg[^>]*>/,'').replace(/<\/svg>$/,'')+'</svg>'
   +'<div class="stg-ring-v" style="color:'+T.c+';font-size:17px;flex-direction:column"><div>'+sc+'</div><div style="font-size:8.5px;font-weight:700;color:var(--neutral-500);text-transform:uppercase;letter-spacing:.06em">align.</div></div></div></div>'
   /* kpis */
   +'<div class="stg-kpis">'+d.kpis.map(k=>'<div class="stg-kpi"><div class="l">'+stgEsc(k.l)+'</div><div class="v">'+stgEsc(k.v)+'</div><div class="d">'+stgEsc(k.d)+'</div></div>').join('')+'</div>'
   /* sous-onglets, calqués sur la Vision groupe */
   +'<div class="bud-subtabs" id="ds-subtabs">'+STG_DTABS.map(t=>'<button class="bud-subtab'+(STG_DTAB===t[0]?' active':'')+'" onclick="stgDetTab(\''+t[0]+'\')">'+t[1]
     +(t[0]==='alertes'&&AL.length?'<span class="stg-tabn'+(nCrit?' crit':'')+'">'+AL.length+'</span>':'')
     +(t[0]==='objectifs'&&d.okr.length?'<span class="stg-tabn">'+d.okr.length+'</span>':'')+'</button>').join('')+'</div>'
   +'<div class="ds-pane">'+pane+'</div>';
}
/* ─── Timeline du schéma directeur ─── */
function stgTimeline(d){
  const pc=m=>(m/STG_NM*100);
  let h='<div class="stg-tl-row" style="--stg-ny:'+STG_NY+'"><div></div><div class="stg-tl-years" style="--stg-ny:'+STG_NY+'">'
   +Array.from({length:STG_NY},(_,i)=>'<div class="stg-tl-year">'+(STG_Y0+i)+'</div>').join('')+'</div></div>';
  d.axes.forEach((a,i)=>{
    const cs=d.chantiers.filter(c=>c.lane===i);
    if(!cs.length) return;
    const t=stgTone(a.t);
    h+='<div class="stg-tl-lane-h"><i style="background:'+t.c+'"></i>'+stgEsc(a.n)+'</div>';
    cs.sort((x,y)=>x.s-y.s).forEach(c=>{
      h+='<div class="stg-tl-row stg-tl-lane" style="--stg-nq:12"><div><div class="stg-tl-name" onclick="stgOpenChantier(\''+c.id+'\')">'+stgEsc(c.n)+'</div><div class="stg-tl-nsub">'+stgEsc(c.own)+' · '+stgEur(c.bud)+'</div></div>'
       +'<div class="stg-tl-track" style="--stg-nq:12">'
       +'<div class="stg-tl-bar" style="left:'+pc(c.s).toFixed(2)+'%;width:'+pc(Math.max(1,c.e-c.s)).toFixed(2)+'%;background:'+t.c+'" onclick="stgOpenChantier(\''+c.id+'\')" title="'+stgEsc(c.n)+' — '+stgQlbl(c.s)+' → '+stgQlbl(c.e)+' · '+c.pct+'%">'
       +'<i style="width:'+c.pct+'%"></i><span>'+c.pct+'%</span></div>'
       +(c.ms||[]).map(m=>'<div class="stg-tl-ms" style="left:'+pc(m.m).toFixed(2)+'%" title="'+stgEsc(m.l)+' — '+stgQlbl(m.m)+'"></div>').join('')
       +'<div class="stg-tl-now" style="left:'+pc(STG_NOW).toFixed(2)+'%"></div>'
       +'</div></div>';
    });
  });
  h+='<div class="stg-tl-legend">'+d.axes.map(a=>'<span class="k"><i style="background:'+stgTone(a.t).c+'"></i>'+stgEsc(a.n)+'</span>').join('')
   +'<span class="k"><span class="dia"></span>Jalon structurant</span><span class="k"><i style="background:var(--state-danger);width:2px;height:12px;border-radius:0"></i>Aujourd’hui</span></div>';
  return h;
}
/* ─── Blocs texte / image ─── */
function stgBlocks(d){
  if(!d.blocks.length) return '<div class="card"><div class="stg-empty">Aucune note. Ajoutez un texte de cadrage ou un schéma.</div></div>';
  return d.blocks.map((b,i)=>{
    const acts='<div class="stg-block-acts"><button title="Modifier" onclick="stgOpenBlock(\''+b.k+'\','+i+')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/></svg></button>'
     +'<button title="Supprimer" onclick="stgDelBlock('+i+')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg></button></div>';
    if(b.k==='image'){
      return '<div class="card stg-block">'+acts+'<div class="stg-block-t">'+stgEsc(b.t)+'</div>'
       +(b.src?'<img src="'+b.src+'" alt="'+stgEsc(b.t)+'">'
        :'<div class="stg-drop" onclick="stgPickImage('+i+')" ondragover="event.preventDefault();this.classList.add(\'over\')" ondragleave="this.classList.remove(\'over\')" ondrop="stgDropImage(event,'+i+')">'
         +'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>'
         +stgEsc(b.b||'Déposer une image')+'<span style="font-weight:600;color:var(--neutral-400)">Glisser-déposer ou cliquer</span></div>')
       +'</div>';
    }
    return '<div class="card stg-block">'+acts+'<div class="stg-block-t">'+stgEsc(b.t)+'</div><div class="stg-block-b">'+stgEsc(b.b)+'</div></div>';
  }).join('');
}
function stgPickImage(i){
  const inp=document.createElement('input'); inp.type='file'; inp.accept='image/*';
  inp.onchange=()=>{ const f=inp.files[0]; if(f) stgReadImage(f,i); };
  inp.click();
}
function stgDropImage(ev,i){ ev.preventDefault(); const f=ev.dataTransfer.files[0]; if(f) stgReadImage(f,i); }
function stgReadImage(f,i){
  const r=new FileReader();
  r.onload=()=>{ const d=stgCur(); if(!d) return; d.blocks[i].src=r.result; stgSave(); stgRenderDetail(); stgToast('Image ajoutée au schéma directeur'); };
  r.readAsDataURL(f);
}
function stgDelBlock(i){ const d=stgCur(); if(!d) return; d.blocks.splice(i,1); stgSave(); stgRenderDetail(); stgToast('Bloc supprimé'); }
function stgDelOkr(i){ const d=stgCur(); if(!d) return; d.okr.splice(i,1); stgSave(); stgRenderDetail(); stgToast('Objectif supprimé'); }
/* ─── Modales ─── */
function stgOpen(id){ const m=document.getElementById(id); if(m) m.classList.add('open'); }
function stgClose(id){ const m=document.getElementById(id); if(m) m.classList.remove('open'); }
function stgOpenDirModal(id){
  const d=id?stgDir(id):null;
  document.getElementById('sdm-title').textContent=d?'Modifier la direction':'Nouvelle direction';
  document.getElementById('sdm-id').value=d?d.id:'';
  const set=(k,v)=>{ document.getElementById('sdm-'+k).value=v; };
  set('sigle',d?d.sigle:''); set('name',d?d.name:''); set('dir',d?d.dir:''); set('parent',d?d.parent:'Direction Générale');
  set('scope',d?d.scope:''); set('fte',d?d.fte:''); set('budget',d?Math.round(d.budget/1000):'');
  set('horizon',d?d.horizon:'2026 → 2028'); set('status',d?d.status:'brouillon'); set('review',d?d.review:'');
  set('ambition',d?d.ambition.replace(/<[^>]+>/g,''):'');
  document.querySelectorAll('#sdm-tone .type-pill').forEach(p=>p.classList.toggle('sel', p.dataset.tone===(d?d.tone:'info')));
  stgOpen('sdirModal');
}
function stgPickTone(el){ el.parentElement.querySelectorAll('.type-pill').forEach(p=>p.classList.remove('sel')); el.classList.add('sel'); }
function stgSaveDir(){
  const g=k=>document.getElementById('sdm-'+k).value.trim();
  const sigle=g('sigle'), name=g('name');
  if(!sigle||!name){ stgToast('Sigle et nom sont requis'); return; }
  const tone=(document.querySelector('#sdm-tone .type-pill.sel')||{dataset:{}}).dataset.tone||'info';
  const id=g('id'), d=id?stgDir(id):null;
  const p={sigle,name,dir:g('dir')||'—',parent:g('parent')||'Direction Générale',scope:g('scope'),
    fte:parseInt(g('fte'),10)||0, budget:(parseInt(g('budget'),10)||0)*1000, horizon:g('horizon')||'2026 → 2028',
    status:g('status'), review:g('review')||'', tone, ambition:g('ambition')||'Ambition à formuler.'};
  if(d){ Object.assign(d,p); stgToast('Direction mise à jour'); }
  else{
    const nid=sigle.toLowerCase().replace(/[^a-z0-9]/g,'')+'-'+Date.now().toString(36).slice(-4);
    STG_DIRS.push(Object.assign({id:nid,version:'v0.1',
      axes:[{n:'Axe 1 — à nommer',t:'info'},{n:'Axe 2 — à nommer',t:'gold'},{n:'Axe 3 — à nommer',t:'teal'}],
      align:{ax1:0,ax2:0,ax3:0,ax4:0}, budgets:{2026:0,2027:0,2028:0},
      chantiers:[], okr:[], risks:[], kpis:[{l:'Indicateur clé',v:'—',d:'à renseigner'}],
      blocks:[{k:'text',t:'Principes directeurs',b:'À rédiger par la direction.'}],
      reviews:[{v:'v0.1',d:new Date().toISOString().slice(0,10),by:'Création',st:'brouillon',n:'Création du schéma directeur.'}]},p));
    stgToast('Direction « '+sigle+' » créée');
  }
  stgSave(); stgClose('sdirModal');
  if(d && STG_CUR===d.id) stgRenderDetail(); else stgRenderDirs();
}
function stgDeleteDir(){
  const id=document.getElementById('sdm-id').value; if(!id) return;
  const d=stgDir(id); if(!d) return;
  if(!confirm('Supprimer la direction « '+d.sigle+' » et son schéma directeur ?')) return;
  STG_DIRS=STG_DIRS.filter(x=>x.id!==id); stgSave(); stgClose('sdirModal');
  stgToast('Direction supprimée'); stgBackDirs();
}
function stgOpenChantier(cid){
  const d=stgCur(); if(!d) return;
  STG_CH=cid||null;
  const c=cid?d.chantiers.find(x=>x.id===cid):null;
  document.getElementById('scm-title').textContent=c?'Modifier le chantier':'Nouveau chantier';
  document.getElementById('scm-name').value=c?c.n:'';
  document.getElementById('scm-own').value=c?c.own:'';
  document.getElementById('scm-bud').value=c?Math.round(c.bud/1000):'';
  document.getElementById('scm-pct').value=c?c.pct:0;
  document.getElementById('scm-pctv').textContent=(c?c.pct:0)+'%';
  document.getElementById('scm-lane').innerHTML=d.axes.map((a,i)=>'<option value="'+i+'"'+(c&&c.lane===i?' selected':'')+'>'+stgEsc(a.n)+'</option>').join('');
  const opts=Array.from({length:STG_NM+1},(_,m)=>'<option value="'+m+'">'+stgQlbl(Math.min(m,STG_NM-1))+'</option>').join('');
  document.getElementById('scm-s').innerHTML=opts; document.getElementById('scm-e').innerHTML=opts;
  document.getElementById('scm-s').value=c?c.s:0; document.getElementById('scm-e').value=c?c.e:11;
  document.getElementById('scm-ga').innerHTML=stgGAxes().map(a=>'<label class="stg-chip" style="cursor:pointer;padding:6px 11px"><input type="checkbox" value="'+a.id+'" '+(c&&(c.ga||[]).includes(a.id)?'checked':'')+' style="margin-right:6px">'+stgEsc(a.name)+'</label>').join('');
  document.getElementById('scm-ms').value=c?(c.ms||[]).map(m=>stgQlbl(m.m).replace(' ',' ')+' : '+m.l).join('\n'):'';
  document.getElementById('scm-del').style.display=c?'inline-flex':'none';
  stgOpen('schantModal');
}
function stgSaveChantier(){
  const d=stgCur(); if(!d) return;
  const n=document.getElementById('scm-name').value.trim();
  if(!n){ stgToast('Nom du chantier requis'); return; }
  let s=parseInt(document.getElementById('scm-s').value,10)||0;
  let e=parseInt(document.getElementById('scm-e').value,10)||0;
  if(e<=s) e=Math.min(STG_NM, s+3);
  const ga=Array.from(document.querySelectorAll('#scm-ga input:checked')).map(i=>i.value);
  const ms=document.getElementById('scm-ms').value.split('\n').map(l=>l.trim()).filter(Boolean).map(l=>{
    const mm=l.match(/^T([1-4])\s*(\d{4})\s*[:\-–]\s*(.+)$/i);
    if(!mm) return null;
    const m=(parseInt(mm[2],10)-STG_Y0)*12+(parseInt(mm[1],10)-1)*3;
    return (m>=0&&m<=STG_NM)?{m,l:mm[3]}:null;
  }).filter(Boolean);
  const p={n,own:document.getElementById('scm-own').value.trim()||'—',
    bud:(parseInt(document.getElementById('scm-bud').value,10)||0)*1000,
    pct:parseInt(document.getElementById('scm-pct').value,10)||0,
    lane:parseInt(document.getElementById('scm-lane').value,10)||0, s, e, ga, ms};
  const c=STG_CH?d.chantiers.find(x=>x.id===STG_CH):null;
  if(c) Object.assign(c,p); else d.chantiers.push(Object.assign({id:'c'+Date.now().toString(36),prj:[]},p));
  stgSave(); stgClose('schantModal'); stgRenderDetail();
  stgToast(c?'Chantier mis à jour':'Chantier ajouté au schéma directeur');
}
function stgDelChantier(){
  const d=stgCur(); if(!d||!STG_CH) return;
  d.chantiers=d.chantiers.filter(x=>x.id!==STG_CH); stgSave(); stgClose('schantModal'); stgRenderDetail(); stgToast('Chantier supprimé');
}
function stgOpenBlock(kind,i){
  STG_BLK=(i==null?null:i);
  const d=stgCur(); if(!d) return;
  const b=(i==null)?null:d.blocks[i];
  document.getElementById('sbm-kind').value=kind;
  document.getElementById('sbm-title').textContent=(b?'Modifier':'Ajouter')+(kind==='image'?' une image':' un texte');
  document.getElementById('sbm-t').value=b?b.t:'';
  document.getElementById('sbm-b').value=b?b.b:'';
  document.getElementById('sbm-b-label').textContent=kind==='image'?'Légende du schéma':'Contenu';
  stgOpen('sblockModal');
}
function stgSaveBlock(){
  const d=stgCur(); if(!d) return;
  const k=document.getElementById('sbm-kind').value;
  const t=document.getElementById('sbm-t').value.trim(), b=document.getElementById('sbm-b').value;
  if(!t){ stgToast('Titre requis'); return; }
  if(STG_BLK==null) d.blocks.push({k,t,b,src:''}); else { d.blocks[STG_BLK].t=t; d.blocks[STG_BLK].b=b; }
  stgSave(); stgClose('sblockModal'); stgRenderDetail(); stgToast('Bloc enregistré');
}
function stgOpenOkr(){
  ['som-t','som-who','som-kpi','som-cur'].forEach(k=>document.getElementById(k).value='');
  document.getElementById('som-pct').value=0; document.getElementById('som-pctv').textContent='0%';
  stgOpen('sokrModal');
}
function stgSaveOkr(){
  const d=stgCur(); if(!d) return;
  const t=document.getElementById('som-t').value.trim();
  if(!t){ stgToast('Titre de l’objectif requis'); return; }
  d.okr.push({t,who:document.getElementById('som-who').value.trim()||'—',kpi:document.getElementById('som-kpi').value.trim()||'—',
    cur:document.getElementById('som-cur').value.trim()||'—',pct:parseInt(document.getElementById('som-pct').value,10)||0});
  stgSave(); stgClose('sokrModal'); stgRenderDetail(); stgToast('Objectif ajouté');
}
function stgOpenReview(){
  const d=stgCur(); if(!d) return;
  const cur=(d.version.match(/v(\d+)\.(\d+)/)||[0,1,0]);
  document.getElementById('srm-v').value='v'+cur[1]+'.'+(parseInt(cur[2],10)+1);
  document.getElementById('srm-d').value=new Date().toISOString().slice(0,10);
  document.getElementById('srm-by').value='CODIR';
  document.getElementById('srm-n').value='';
  document.getElementById('srm-st').value='valide';
  stgOpen('srevModal');
}
function stgSaveReview(){
  const d=stgCur(); if(!d) return;
  const v=document.getElementById('srm-v').value.trim();
  if(!v){ stgToast('Numéro de version requis'); return; }
  const st=document.getElementById('srm-st').value;
  d.reviews.unshift({v,d:document.getElementById('srm-d').value,by:document.getElementById('srm-by').value.trim()||'—',st,
    n:document.getElementById('srm-n').value.trim()||'Revue sans commentaire.'});
  d.version=v; d.status=st; d.review=document.getElementById('srm-d').value;
  stgSave(); stgClose('srevModal'); stgRenderDetail(); stgToast('Revue '+v+' enregistrée');
}
