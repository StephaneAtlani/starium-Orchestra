/* Réunions & instances de gouvernance
   Extrait de « Refonte Portail Client.html ». Script classique, portée globale partagée.
   Chargé avant le script principal. Dépendances globales : fmtEur(), showToast(), showView(). */

/* ═══════════ RÉUNIONS & INSTANCES DE GOUVERNANCE ═══════════ */
const MTG_TODAY='2026-07-27';
const MTG_INST=[
 {id:'codir',name:'CODIR',full:'Comité de Direction',color:'var(--purple)',cad:'Mensuel',chair:'Isabelle Fournier — DG',quorum:5,members:['Isabelle Fournier','Marc Delaunay','Sophie Marchand','Claire Dubois','Antoine Roy','Farida Haddad','Paul Mercier'],scope:'Arbitrages stratégiques, portefeuille, budget'},
 {id:'copil',name:'COPIL',full:'Comité de Pilotage Transformation',color:'var(--state-info)',cad:'Bi-mensuel',chair:'Marc Delaunay — DSI',quorum:4,members:['Marc Delaunay','Sophie Marchand','Julie Fontaine','Karim Bensaïd','Claire Dubois','Nicolas Blanc'],scope:'Avancement programmes, jalons, risques projets'},
 {id:'coproj',name:'COPROJ',full:'Comité Projet — Portail Client',color:'var(--brand-gold)',cad:'Hebdomadaire',chair:'Sophie Marchand — Cheffe de projet',quorum:3,members:['Sophie Marchand','Julie Fontaine','Marc Lefèvre','Nadia Cherif','Paul Mercier'],scope:'Sprint, blocages, livrables, recette'},
 {id:'crisk',name:'Comité Risques',full:'Comité des Risques & Sécurité',color:'var(--state-danger)',cad:'Trimestriel',chair:'Amélie Rousseau — RSSI adj.',quorum:4,members:['Amélie Rousseau','Marc Delaunay','Hugo Petit','Karim Bensaïd','Isabelle Fournier'],scope:'Cartographie risques, incidents, plans de traitement'},
 {id:'cconf',name:'Revue Conformité',full:'Revue de Conformité RGPD / ISO',color:'var(--state-success)',cad:'Trimestriel',chair:'Hugo Petit — Juriste',quorum:3,members:['Hugo Petit','Amélie Rousseau','Farida Haddad','Claire Dubois'],scope:'Écarts référentiels, preuves, remédiation'}
];
let MTG_LIST=[
 {id:'m1',t:'codir',title:'CODIR de juillet — arbitrage budgétaire S2',date:'2026-07-30',time:'09:00',dur:120,loc:'Salle Everest + Teams',st:'plan',pres:[],exc:['Antoine Roy'],
  ag:[{t:'Revue portefeuille et avancement T2',d:25,o:'Marc Delaunay',k:'info',links:[{k:'doc',n:'Support CODIR juillet 2026.pdf'},{k:'doc',n:'Quarterplan S2 2026.xlsx'}]},{t:'Arbitrage enveloppe S2 — Migration ERP',d:35,o:'Claire Dubois',k:'arb',links:[{k:'doc',n:'Budget S2 — arbitrage.xlsx'},{k:'projet',n:'Migration ERP'},{k:'risque',n:'R-021 · Dépassement budgétaire ERP'}]},{t:'Validation du plan de remédiation RGPD',d:25,o:'Hugo Petit',k:'deci',links:[{k:'plan',n:'PA-2026-03 · Remédiation RGPD'},{k:'ecart',n:'RGPD art.30 · Registre incomplet'}]},{t:'Point capacité équipes IT',d:20,o:'Sophie Marchand',k:'info'},{t:'Questions diverses',d:15,o:'—',k:'info'}],dec:[],act:[]},
 {id:'m2',t:'coproj',title:'COPROJ Portail Client — semaine 31',date:'2026-07-29',time:'14:00',dur:45,loc:'Teams',st:'plan',pres:[],exc:[],
  ag:[{t:'Avancement sprint 14',d:15,o:'Julie Fontaine',k:'info'},{t:'Blocage API facturation',d:15,o:'Marc Lefèvre',k:'arb'},{t:'Préparation recette utilisateurs',d:15,o:'Nadia Cherif',k:'deci'}],dec:[],act:[]},
 {id:'m3',t:'copil',title:'COPIL Transformation — jalon Migration Cloud',date:'2026-07-16',time:'10:00',dur:90,loc:'Salle Mont-Blanc',st:'crv',pres:['Marc Delaunay','Sophie Marchand','Julie Fontaine','Karim Bensaïd','Claire Dubois'],exc:['Nicolas Blanc'],
  ag:[{t:'Bilan phase 2 Migration Cloud',d:30,o:'Karim Bensaïd',k:'info',links:[{k:'projet',n:'Migration Infrastructure Cloud'},{k:'tache',n:'Bascule production Migration Cloud'}]},{t:'Go / No-go bascule production',d:35,o:'Marc Delaunay',k:'deci',links:[{k:'risque',n:'R-014 · Retard bascule production'},{k:'plan',n:"PA-2026-11 · Continuité d'activité"}]},{t:'Impacts budget et planning',d:25,o:'Claire Dubois',k:'arb',links:[{k:'doc',n:'CR COPIL du 16 juillet.pdf'}]}],
  dec:[{txt:'Go pour la bascule production le 12 septembre, sous réserve du PRA validé.',o:'Marc Delaunay',pt:1,link:{k:'risque',n:'R-014 · Retard bascule production'}},{txt:'Enveloppe complémentaire de 40 k€ accordée pour la reprise de données.',o:'Claire Dubois',pt:2,link:{k:'doc',n:'CR COPIL du 16 juillet.pdf'}}],
  act:[{txt:'Finaliser et faire valider le plan de reprise d\'activité (PRA)',o:'Karim Bensaïd',due:'2026-08-29',st:'wip',pt:1,link:{k:'plan',n:"PA-2026-11 · Continuité d'activité"}},{txt:'Réviser le planning de bascule et communiquer aux métiers',o:'Sophie Marchand',due:'2026-08-07',st:'done',pt:1,link:{k:'tache',n:'Bascule production Migration Cloud'}},{txt:'Ouvrir la ligne budgétaire complémentaire reprise de données',o:'Claire Dubois',due:'2026-07-24',st:'late',pt:2}]},
 {id:'m4',t:'codir',title:'CODIR de juin — revue semestrielle',date:'2026-06-25',time:'09:00',dur:120,loc:'Salle Everest',st:'tenu',pres:['Isabelle Fournier','Marc Delaunay','Sophie Marchand','Claire Dubois','Farida Haddad','Paul Mercier'],exc:['Antoine Roy'],
  ag:[{t:'Résultats S1 et atterrissage budgétaire',d:35,o:'Claire Dubois',k:'info',links:[{k:'doc',n:'Budget S2 — arbitrage.xlsx'}]},{t:'Priorisation du portefeuille S2',d:40,o:'Isabelle Fournier',k:'arb',links:[{k:'doc',n:'Quarterplan S2 2026.xlsx'},{k:'projet',n:'Déploiement CRM'}]},{t:'Certification ISO 27001 — point d\'étape',d:25,o:'Farida Haddad',k:'info',links:[{k:'plan',n:'PA-2026-08 · Certification ISO 27001'},{k:'ecart',n:"ISO A.5.15 · Contrôle d'accès"}]},{t:'Questions diverses',d:20,o:'—',k:'info'}],
  dec:[{txt:'Le POC Data Lake est reporté au T1 2027 au profit du CRM.',o:'Isabelle Fournier',pt:1,link:{k:'projet',n:'Déploiement CRM'}},{txt:'Objectif de certification ISO 27001 confirmé pour décembre 2026.',o:'Farida Haddad',pt:2,link:{k:'plan',n:'PA-2026-08 · Certification ISO 27001'}}],
  act:[{txt:'Reprioriser le quarterplan S2 dans l\'outil et le présenter au COPIL',o:'Sophie Marchand',due:'2026-07-10',st:'done',pt:1,link:{k:'doc',n:'Quarterplan S2 2026.xlsx'}},{txt:'Constituer le dossier de preuves ISO 27001 (domaines A.5 à A.8)',o:'Farida Haddad',due:'2026-09-30',st:'wip',pt:2,link:{k:'tache',n:'Collecte des preuves ISO 27001'}}]},
 {id:'m5',t:'crisk',title:'Comité Risques T2 2026',date:'2026-06-18',time:'14:30',dur:90,loc:'Salle Mont-Blanc + Teams',st:'tenu',pres:['Amélie Rousseau','Marc Delaunay','Hugo Petit','Karim Bensaïd'],exc:['Isabelle Fournier'],
  ag:[{t:'Cartographie des risques — évolution trimestre',d:30,o:'Amélie Rousseau',k:'info',links:[{k:'risque',n:'R-007 · Fuite de données clients'},{k:'risque',n:'R-032 · Dépendance prestataire cloud'}]},{t:'Incident phishing de mai — retour d\'expérience',d:25,o:'Karim Bensaïd',k:'info',links:[{k:'doc',n:'Rapport d\'audit cybersécurité.pdf'}]},{t:'Validation des plans de traitement',d:35,o:'Marc Delaunay',k:'deci',links:[{k:'plan',n:'PA-2026-05 · Renforcement authentification'},{k:'tache',n:'Déploiement MFA — 220 comptes'}]}],
  dec:[{txt:'Déploiement du MFA généralisé validé pour l\'ensemble des collaborateurs avant fin T3.',o:'Marc Delaunay',pt:2,link:{k:'plan',n:'PA-2026-05 · Renforcement authentification'}}],
  act:[{txt:'Déployer le MFA sur les 220 comptes restants',o:'Karim Bensaïd',due:'2026-09-30',st:'wip',pt:2,link:{k:'tache',n:'Déploiement MFA — 220 comptes'}},{txt:'Organiser une campagne de sensibilisation phishing',o:'Amélie Rousseau',due:'2026-07-18',st:'late',pt:1}]},
 {id:'m6',t:'cconf',title:'Revue Conformité T3 — RGPD & ISO 27001',date:'2026-09-10',time:'10:00',dur:90,loc:'Teams',st:'plan',pres:[],exc:[],
  ag:[{t:'Écarts RGPD ouverts et preuves collectées',d:30,o:'Hugo Petit',k:'info'},{t:'Avancement remédiation ISO 27001',d:30,o:'Farida Haddad',k:'info'},{t:'Validation du registre des traitements',d:30,o:'Hugo Petit',k:'deci'}],dec:[],act:[]},
 {id:'m7',t:'coproj',title:'COPROJ Portail Client — semaine 30',date:'2026-07-22',time:'14:00',dur:45,loc:'Teams',st:'tenu',pres:['Sophie Marchand','Julie Fontaine','Marc Lefèvre','Nadia Cherif'],exc:['Paul Mercier'],
  ag:[{t:'Avancement sprint 13',d:15,o:'Julie Fontaine',k:'info',links:[{k:'projet',n:'Refonte Portail Client'}]},{t:'Arbitrage périmètre module notifications',d:20,o:'Sophie Marchand',k:'arb'},{t:'Planning recette',d:10,o:'Nadia Cherif',k:'info',links:[{k:'tache',n:'Recette utilisateurs Portail Client'}]}],
  dec:[{txt:'Le module notifications push est décalé en V2 pour tenir la date de mise en production.',o:'Sophie Marchand',pt:1,link:{k:'projet',n:'Refonte Portail Client'}}],
  act:[{txt:'Mettre à jour le backlog et informer les métiers du décalage V2',o:'Julie Fontaine',due:'2026-07-31',st:'wip',pt:1}]},
 {id:'m8',t:'copil',title:'COPIL Transformation — juin',date:'2026-06-04',time:'10:00',dur:90,loc:'Salle Mont-Blanc',st:'ann',pres:[],exc:[],ag:[{t:'Séance annulée — reportée au 16 juillet',d:0,o:'—',k:'info'}],dec:[],act:[]}
];
const MTG_ST={plan:'Planifiée',tenu:'Tenue',crv:'CR à valider',ann:'Annulée'};
const MTG_ACTST={wip:'En cours',done:'Terminée',late:'En retard'};
function mtgInst(id){return MTG_INST.find(x=>x.id===id);}
function mtgIni(n){return n.split(' ').map(x=>x[0]).join('').slice(0,2).toUpperCase();}
function mtgFDate(d){const[y,m,dd]=d.split('-');return dd+' '+['jan','fév','mar','avr','mai','juin','juil','août','sep','oct','nov','déc'][+m-1]+' '+y;}
function mtgDur(m){return m>=60?(m/60===Math.floor(m/60)?m/60+'h':Math.floor(m/60)+'h'+(m%60)):m+' min';}
function mtgSorted(){return MTG_LIST.slice().sort((a,b)=>b.date.localeCompare(a.date)||b.time.localeCompare(a.time));}
function mtgNextOf(id){const up=MTG_LIST.filter(m=>m.t===id&&m.st==='plan'&&m.date>=MTG_TODAY).sort((a,b)=>a.date.localeCompare(b.date));return up[0]||null;}
function mtgAllActions(){const out=[];MTG_LIST.forEach(m=>(m.act||[]).forEach(a=>out.push({...a,m})));return out;}
function mtgAllDecisions(){const out=[];MTG_LIST.forEach(m=>(m.dec||[]).forEach(d=>out.push({...d,m})));return out;}
function mtgRender(){mtgTab('instances');}
function mtgTab(t){document.querySelectorAll('#view-reunions .mtg-tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===t));['instances','reunions','suivi'].forEach(x=>{document.getElementById('mtg-'+x).style.display=x===t?'':'none';});if(t==='instances')mtgRenderInst();else if(t==='reunions')mtgRenderList();else mtgRenderSuivi();}
function mtgRenderInst(){
 const acts=mtgAllActions(),late=acts.filter(a=>a.st==='late').length,open=acts.filter(a=>a.st!=='done').length;
 const held=MTG_LIST.filter(m=>m.st==='tenu'||m.st==='crv');
 const rates=held.map(m=>{const inst=mtgInst(m.t);return m.pres.length/inst.members.length;});
 const avg=rates.length?Math.round(rates.reduce((a,b)=>a+b,0)/rates.length*100):0;
 const upcoming=MTG_LIST.filter(m=>m.st==='plan'&&m.date>=MTG_TODAY).length;
 const kpis='<div class="mtg-kpis">'
  +'<div class="mtg-kpi"><div class="l">Instances actives</div><div class="v">'+MTG_INST.length+'</div><div class="d">CODIR, COPIL, COPROJ, comités</div></div>'
  +'<div class="mtg-kpi"><div class="l">Réunions à venir</div><div class="v" style="color:var(--state-info)">'+upcoming+'</div><div class="d">Prochaine : '+(mtgSorted().filter(m=>m.st==='plan'&&m.date>=MTG_TODAY).sort((a,b)=>a.date.localeCompare(b.date))[0]?mtgFDate(mtgSorted().filter(m=>m.st==='plan'&&m.date>=MTG_TODAY).sort((a,b)=>a.date.localeCompare(b.date))[0].date):'—')+'</div></div>'
  +'<div class="mtg-kpi"><div class="l">Taux de présence</div><div class="v" style="color:'+(avg>=80?'var(--state-success)':'var(--brand-gold-700)')+'">'+avg+'<small>%</small></div><div class="d">Moyenne sur les séances tenues</div></div>'
  +'<div class="mtg-kpi"><div class="l">Actions ouvertes</div><div class="v" style="color:'+(late?'var(--state-danger)':'var(--brand-ink)')+'">'+open+'</div><div class="d">'+(late?late+' en retard':'Aucun retard')+'</div></div>'
  +'</div>';
 const cards=MTG_INST.map(i=>{const nx=mtgNextOf(i.id),n=MTG_LIST.filter(m=>m.t===i.id).length;
  return '<div class="mtg-icard" onclick="mtgTab(\'reunions\');mtgFilterInst=\''+i.id+'\';mtgRenderList()">'
   +'<div class="mtg-ihead"><div class="mtg-iav" style="background:'+i.color+'">'+i.name.slice(0,2).toUpperCase()+'</div><div style="min-width:0"><div class="mtg-in">'+i.name+'</div><div class="mtg-if">'+i.full+'</div></div><span class="mtg-cad">'+i.cad+'</span></div>'
   +'<div class="mtg-irow"><span class="k">Président</span><span class="v">'+i.chair+'</span></div>'
   +'<div class="mtg-irow"><span class="k">Membres · quorum</span><span class="v">'+i.members.length+' · '+i.quorum+' min.</span></div>'
   +'<div class="mtg-irow"><span class="k">Séances enregistrées</span><span class="v">'+n+'</span></div>'
   +'<div class="mtg-next'+(nx?'':' none')+'">'+(nx?'Prochaine séance : '+mtgFDate(nx.date)+' à '+nx.time:'Aucune séance planifiée')+'</div>'
   +'</div>';}).join('');
 document.getElementById('mtg-instances').innerHTML=kpis+'<div class="mtg-igrid">'+cards+'</div>';
}
let mtgFilterInst='all';
function mtgRenderList(){
 const pills='<div class="mtg-pills" style="margin-bottom:16px"><button class="mtg-pill'+(mtgFilterInst==='all'?' sel':'')+'" onclick="mtgFilterInst=\'all\';mtgRenderList()">Toutes</button>'+MTG_INST.map(i=>'<button class="mtg-pill'+(mtgFilterInst===i.id?' sel':'')+'" onclick="mtgFilterInst=\''+i.id+'\';mtgRenderList()">'+i.name+'</button>').join('')+'</div>';
 const rows=mtgSorted().filter(m=>mtgFilterInst==='all'||m.t===mtgFilterInst).map(m=>{
  const i=mtgInst(m.t),tot=i.members.length,p=m.pres.length,pct=tot?Math.round(p/tot*100):0,held=m.st==='tenu'||m.st==='crv';
  return '<tr onclick="mtgOpen(\''+m.id+'\')">'
   +'<td><div class="mtg-mt">'+m.title+'</div><div class="mtg-ms">'+m.loc+' · '+mtgDur(m.dur)+'</div></td>'
   +'<td><span class="mtg-tag"><i style="background:'+i.color+'"></i>'+i.name+'</span></td>'
   +'<td><div style="font-weight:700">'+mtgFDate(m.date)+'</div><div class="mtg-ms">'+m.time+'</div></td>'
   +'<td><span class="mtg-badge '+m.st+'"><i></i>'+MTG_ST[m.st]+'</span></td>'
   +'<td>'+(held?'<div class="mtg-att"><div class="mtg-attb"><div class="mtg-attf" style="width:'+pct+'%;background:'+(pct>=80?'var(--state-success)':'var(--brand-gold)')+'"></div></div><span class="mtg-attn">'+p+'/'+tot+'</span></div>':'<span class="mtg-ms">—</span>')+'</td>'
   +'<td class="r">'+((m.dec||[]).length||'–')+'</td><td class="r">'+((m.act||[]).length||'–')+'</td>'
   +'<td class="r">'+(m.st==='plan'?'<button class="liv-btn dark" style="padding:6px 13px;font-size:11.5px" onclick="event.stopPropagation();livStart(\''+m.id+'\')">Lancer</button>':'')+'</td></tr>';}).join('');
 document.getElementById('mtg-reunions').innerHTML=pills+'<div class="card" style="padding:20px 22px"><table class="mtg-tbl"><thead><tr><th>Réunion</th><th>Instance</th><th>Date</th><th>Statut</th><th>Présence</th><th class="r">Déc.</th><th class="r">Act.</th><th></th></tr></thead><tbody>'+(rows||'<tr><td colspan="8"><div class="mtg-empty">Aucune réunion pour cette instance.</div></td></tr>')+'</tbody></table></div>';
}
function mtgRenderSuivi(){
 const decs=mtgAllDecisions(),acts=mtgAllActions();
 const dr=decs.map(d=>{const i=mtgInst(d.m.t);return '<tr onclick="mtgOpen(\''+d.m.id+'\')"><td><div class="mtg-mt" style="font-weight:600;line-height:1.45">'+d.txt+'</div>'+(d.pt!=null&&(d.m.ag||[])[d.pt]?'<div class="mtg-ms">Point '+(d.pt+1)+' — '+d.m.ag[d.pt].t+'</div>':'')+'</td><td class="c-lk">'+(d.link?livChip(d.link,1):'<span class="mtg-ms">—</span>')+'</td><td class="c-inst"><span class="mtg-tag"><i style="background:'+i.color+'"></i>'+i.name+'</span></td><td class="c-who">'+d.o+'</td><td class="c-when"><div class="mtg-ms" style="margin:0">'+mtgFDate(d.m.date)+'</div></td></tr>';}).join('');
 const ar=acts.sort((a,b)=>a.due.localeCompare(b.due)).map(a=>{const i=mtgInst(a.m.t);return '<tr onclick="mtgOpen(\''+a.m.id+'\')"><td><div class="mtg-mt" style="font-weight:600;line-height:1.45">'+a.txt+'</div><div class="mtg-ms">'+a.m.title+(a.pt!=null&&(a.m.ag||[])[a.pt]?' · point '+(a.pt+1):'')+'</div></td><td class="c-lk">'+(a.link?livChip(a.link,1):'<span class="mtg-ms">—</span>')+'</td><td class="c-inst"><span class="mtg-tag"><i style="background:'+i.color+'"></i>'+i.name+'</span></td><td class="c-who">'+a.o+'</td><td class="c-when"><div style="font-weight:700;color:'+(a.st==='late'?'var(--state-danger)':'var(--brand-ink)')+'">'+mtgFDate(a.due)+'</div></td><td class="c-st"><span class="mtg-badge '+a.st+'"><i></i>'+MTG_ACTST[a.st]+'</span></td></tr>';}).join('');
 const late=acts.filter(a=>a.st==='late').length;
 document.getElementById('mtg-suivi').innerHTML=
  '<div class="card" style="padding:20px 22px;margin-bottom:16px"><div class="cap-cardh" style="margin-bottom:16px"><div><h3 style="font-size:14px;font-weight:800;color:var(--brand-ink);margin:0 0 3px">Actions issues des réunions</h3><p style="font-size:11.5px;color:var(--neutral-500);margin:0">'+acts.length+' action'+(acts.length>1?'s':'')+' suivie'+(acts.length>1?'s':'')+(late?' · <b style="color:var(--state-danger)">'+late+' en retard</b>':'')+'</p></div></div><table class="mtg-tbl"><thead><tr><th>Action</th><th class="c-lk">Élément rattaché</th><th class="c-inst">Instance</th><th class="c-who">Responsable</th><th class="c-when">Échéance</th><th class="c-st">Statut</th></tr></thead><tbody>'+ar+'</tbody></table></div>'
  +'<div class="card" style="padding:20px 22px"><div class="cap-cardh" style="margin-bottom:16px"><div><h3 style="font-size:14px;font-weight:800;color:var(--brand-ink);margin:0 0 3px">Registre des décisions</h3><p style="font-size:11.5px;color:var(--neutral-500);margin:0">Décisions actées en séance, tracées et opposables.</p></div></div><table class="mtg-tbl"><thead><tr><th>Décision</th><th class="c-lk">Élément rattaché</th><th class="c-inst">Instance</th><th class="c-who">Décideur</th><th class="c-when">Séance</th></tr></thead><tbody>'+dr+'</tbody></table></div>';
}
function mtgOpen(id){
 const m=MTG_LIST.find(x=>x.id===id);if(!m)return;const i=mtgInst(m.t);
 const held=m.st==='tenu'||m.st==='crv';
 const ag=(m.ag||[]).map((a,n)=>{
  const pd=(m.dec||[]).filter(d=>d.pt===n),pa=(m.act||[]).filter(x=>x.pt===n);
  const sub=(pd.length||pa.length)?'<div style="margin-top:9px;padding-left:11px;border-left:2px solid var(--neutral-200);display:flex;flex-direction:column;gap:7px">'
   +pd.map(d=>'<div style="font-size:11.5px;line-height:1.45"><span class="mtg-agk deci" style="margin-right:7px">Décision</span><span style="font-weight:600;color:var(--brand-ink)">'+d.txt+'</span>'+(d.link?' '+livChip(d.link,1):'')+'</div>').join('')
   +pa.map(x=>'<div style="font-size:11.5px;line-height:1.45"><span class="mtg-badge '+x.st+'" style="margin-right:7px"><i></i>'+MTG_ACTST[x.st]+'</span><span style="font-weight:600;color:var(--brand-ink)">'+x.txt+'</span><span style="color:var(--neutral-500);font-weight:600"> · '+x.o+' · '+mtgFDate(x.due)+'</span>'+(x.link?' '+livChip(x.link,1):'')+'</div>').join('')
   +'</div>':'';
  return '<div class="mtg-ag"><span class="mtg-agn">'+(n+1)+'</span><div class="mtg-agb"><div class="mtg-agt">'+a.t+'</div><div class="mtg-agm">'+a.o+(a.d?' · '+a.d+' min':'')+'</div>'+((a.links||[]).length?'<div class="liv-lk" style="margin-top:8px">'+a.links.map(l=>livChip(l)).join('')+'</div>':'')+sub+'</div><span class="mtg-agk '+a.k+'">'+(a.k==='deci'?'Décision':a.k==='arb'?'Arbitrage':'Information')+'</span></div>';}).join('');
 const parts=i.members.map(n=>{const absent=held&&!m.pres.includes(n);return '<span class="mtg-pc'+(absent?' abs':'')+'"><span class="av" style="background:'+(absent?'var(--neutral-300)':i.color)+'">'+mtgIni(n)+'</span>'+n+'</span>';}).join('');
 const dec=(m.dec||[]).length?m.dec.map(d=>'<div class="mtg-li"><span class="mtg-lic" style="background:var(--purple)">✓</span><div class="mtg-lib"><div class="mtg-lit">'+d.txt+'</div><div class="mtg-lim">Décideur : '+d.o+(d.pt!=null&&(m.ag||[])[d.pt]?' · point '+(d.pt+1)+' — '+m.ag[d.pt].t:'')+'</div>'+(d.link?'<div class="liv-lk" style="margin-top:7px">'+livChip(d.link,1)+'</div>':'')+'</div></div>').join(''):'<div class="mtg-empty">Aucune décision enregistrée.</div>';
 const act=(m.act||[]).length?m.act.map(a=>'<div class="mtg-li"><span class="mtg-lic" style="background:'+(a.st==='done'?'var(--state-success)':a.st==='late'?'var(--state-danger)':'var(--state-info)')+'">'+(a.st==='done'?'✓':'!')+'</span><div class="mtg-lib"><div class="mtg-lit">'+a.txt+'</div><div class="mtg-lim">'+a.o+' · échéance '+mtgFDate(a.due)+(a.pt!=null&&(m.ag||[])[a.pt]?' · point '+(a.pt+1):'')+'</div>'+(a.link?'<div class="liv-lk" style="margin-top:7px">'+livChip(a.link,1)+'</div>':'')+'</div><span class="mtg-badge '+a.st+'"><i></i>'+MTG_ACTST[a.st]+'</span></div>').join(''):'<div class="mtg-empty">Aucune action ouverte.</div>';
 const quorumOk=m.pres.length>=i.quorum;
 document.getElementById('mtgDrawer').innerHTML=
  '<div class="mtg-dclose" onclick="mtgCloseDrawer()">✕</div>'
  +'<div class="mtg-dh"><div class="mtg-iav" style="background:'+i.color+'">'+i.name.slice(0,2).toUpperCase()+'</div><div><div class="mtg-dt">'+m.title+'</div><div class="mtg-ds">'+i.full+' · '+i.chair+'</div></div></div>'
  +'<div style="margin-bottom:16px;display:flex;align-items:center;gap:10px;flex-wrap:wrap"><span class="mtg-badge '+m.st+'"><i></i>'+MTG_ST[m.st]+'</span>'
  +(m.st==='plan'?'<button class="liv-btn dark" onclick="livStart(\''+m.id+'\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="6 3 20 12 6 21 6 3" fill="currentColor"/></svg>Lancer la réunion</button>':'')
  +(m.st==='crv'?'<button class="liv-btn ok" onclick="mtgValidate(\''+m.id+'\')">Valider le compte-rendu</button>':'')+'</div>'
  +'<div class="mtg-dmeta"><div><div class="k">Date</div><div class="v" style="font-size:12.5px">'+mtgFDate(m.date)+'</div></div><div><div class="k">Heure</div><div class="v">'+m.time+'</div></div><div><div class="k">Durée</div><div class="v">'+mtgDur(m.dur)+'</div></div><div><div class="k">Présents</div><div class="v" style="color:'+(held?(quorumOk?'var(--state-success)':'var(--state-danger)'):'var(--neutral-400)')+'">'+(held?m.pres.length+'/'+i.members.length:'—')+'</div></div></div>'
  +'<div style="font-size:11.5px;color:var(--neutral-500);font-weight:600;margin-top:10px">'+m.loc+(held?' · Quorum '+i.quorum+' requis — '+(quorumOk?'atteint ✓':'non atteint'):'')+'</div>'
  +'<div class="mtg-dsec">Ordre du jour<span style="font-weight:700;text-transform:none;letter-spacing:0;color:var(--neutral-400)">'+(m.ag||[]).reduce((s,a)=>s+a.d,0)+' min</span></div>'+ag
  +'<div class="mtg-dsec">Participants<span style="font-weight:700;text-transform:none;letter-spacing:0;color:var(--neutral-400)">'+i.members.length+' membres'+(m.exc.length?' · '+m.exc.length+' excusé'+(m.exc.length>1?'s':''):'')+'</span></div><div class="mtg-pgrid">'+parts+'</div>'
  +'<div class="mtg-dsec">Décisions</div>'+dec
  +'<div class="mtg-dsec">Actions</div>'+act
  +((m.notes&&m.notes.length)?'<div class="mtg-dsec">Notes de séance</div>'+m.notes.map(n=>'<div class="mtg-li"><span class="mtg-lic" style="background:var(--neutral-400)">●</span><div class="mtg-lib"><div class="mtg-lit">'+n.txt+'</div><div class="mtg-lim">'+(n.pt||'')+'</div></div></div>').join(''):'');
 document.getElementById('mtgDrawerOv').classList.add('open');
}
function mtgCloseDrawer(){document.getElementById('mtgDrawerOv').classList.remove('open');}
function mtgValidate(id){const m=MTG_LIST.find(x=>x.id===id);if(!m)return;m.st='tenu';mtgOpen(id);mtgRenderList();}

