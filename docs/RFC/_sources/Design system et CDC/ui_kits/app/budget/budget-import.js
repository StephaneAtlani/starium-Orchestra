/* Budget — sources & assistant d'import
   Extrait de « Refonte Portail Client.html ».
   Script classique : chargé AVANT le script principal, partage la portée globale.
   Dépend des helpers globaux : fmtEur(), showToast(). */

/* ---- Réaffecter ---- */
const BS_SOURCES=[
 {id:'erp',name:'ERP Sage X3',type:'Connecteur ERP',kind:'erp',color:'var(--state-info)',freq:'Quotidien · 04h00',last:'27/07/2026 04h12',rows:1284,rej:0,st:'ok'},
 {id:'api',name:'API Finance Groupe',type:'API REST · OAuth2',kind:'api',color:'var(--purple)',freq:'Toutes les 6 h',last:'27/07/2026 06h00',rows:412,rej:3,st:'ok'},
 {id:'xls',name:'Budget prévisionnel DSI.xlsx',type:'Fichier XLS déposé',kind:'xls',color:'var(--state-success)',freq:'Manuel',last:'12/07/2026 09h34',rows:96,rej:2,st:'old'},
 {id:'sirh',name:'SIRH — coûts chargés',type:'Connecteur SIRH',kind:'api',color:'var(--brand-gold)',freq:'Mensuel',last:'01/07/2026 02h00',rows:218,rej:0,st:'ok'},
 {id:'cegid',name:'Cegid — factures fournisseurs',type:'Connecteur ERP',kind:'erp',color:'var(--teal)',freq:'Quotidien · 05h00',last:'24/07/2026 05h04',rows:0,rej:47,st:'err'}
];
const BS_FIELDS=[['','— Ignorer cette colonne —'],['env','Enveloppe'],['line','Ligne budgétaire'],['type','Type CAPEX / OPEX'],['budget','Budget alloué'],['engage','Engagé'],['conso','Consommé'],['prev','Prévisionnel'],['date','Date d\'imputation'],['cc','Centre de coût'],['nat','Nature']];
const BS_COLS=[
 {c:'CODE_ENV',s:'INFRA-2026',f:'env'},{c:'LIBELLE_POSTE',s:'Hébergement cloud',f:'line'},
 {c:'TYPE_IMMO',s:'CAPEX',f:'type'},{c:'MT_BUDGET',s:'145 000,00',f:'budget'},
 {c:'MT_ENGAGE',s:'132 400,00',f:'engage'},{c:'MT_REALISE',s:'118 250,00',f:'conso'},
 {c:'DT_IMPUT',s:'2026-07-15',f:'date'},{c:'CENTRE_CC',s:'CC-4180',f:'cc'},
 {c:'REF_INTERNE',s:'X3-88421',f:''}
];
const BS_CHECKS=[
 {ok:1,t:'Structure du fichier conforme',m:'9 colonnes reconnues, 96 lignes de données',n:'96'},
 {ok:1,t:'Enveloppes rapprochées',m:'Toutes les enveloppes existent dans le budget cible',n:'5/5'},
 {ok:0,t:'Lignes budgétaires inconnues',m:'« Licences Copilot » et « Audit RGPD externe » seront créées',n:'2'},
 {ok:0,t:'Doublons détectés',m:'2 lignes en double sur la même période — la dernière valeur est retenue',n:'2'},
 {ok:2,t:'Montants hors exercice',m:'1 ligne datée de 2025 — elle sera rejetée',n:'1'},
 {ok:1,t:'Contrôle d\'équilibre',m:'Total importé cohérent avec le total source (écart 0,00 €)',n:'✓'}
];
let bsWizStep=1,bsWizSrc='xls',bsWizMap=null;
function bsOpenSources(){bsRenderSources();document.getElementById('bsSrcModal').classList.add('open');}
function bsCloseSrc(){document.getElementById('bsSrcModal').classList.remove('open');}
function bsIco(kind){return kind==='erp'?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><rect x="3" y="3" width="18" height="7" rx="1.5"/><rect x="3" y="14" width="18" height="7" rx="1.5"/><line x1="7" y1="6.5" x2="7.01" y2="6.5"/><line x1="7" y1="17.5" x2="7.01" y2="17.5"/></svg>':kind==='api'?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.5 1.5"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7L12 19"/></svg>':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';}
function bsRenderSources(){
 const tot=BS_SOURCES.reduce((s,x)=>s+x.rows,0),rej=BS_SOURCES.reduce((s,x)=>s+x.rej,0),err=BS_SOURCES.filter(x=>x.st==='err').length;
 const cards=BS_SOURCES.map(s=>'<div class="bs-card" onclick="bsOpenWizard(\''+s.id+'\')">'
  +'<div class="bs-h"><div class="bs-ic" style="background:'+s.color+'">'+bsIco(s.kind)+'</div>'
  +'<div style="min-width:0"><div class="bs-n">'+s.name+'</div><div class="bs-t">'+s.type+'</div></div>'
  +'<span class="bs-st '+s.st+'"><i></i>'+(s.st==='ok'?'À jour':s.st==='err'?'En erreur':'Obsolète')+'</span></div>'
  +'<div class="bs-r"><span class="k">Fréquence</span><span class="v">'+s.freq+'</span></div>'
  +'<div class="bs-r"><span class="k">Dernier import</span><span class="v">'+s.last+'</span></div>'
  +'<div class="bs-r"><span class="k">Lignes intégrées</span><span class="v">'+s.rows.toLocaleString('fr-FR')+'</span></div>'
  +'<div class="bs-r"><span class="k">Rejets</span><span class="v" style="color:'+(s.rej?'var(--state-danger)':'var(--state-success)')+'">'+s.rej+'</span></div>'
  +'<div class="bs-foot"><button class="bs-btn" onclick="event.stopPropagation();showToast(\'Synchronisation lancée · '+s.name.replace(/'/g,"")+'\')">Synchroniser</button><button class="bs-btn dark" onclick="event.stopPropagation();bsOpenWizard(\''+s.id+'\')">Importer</button></div></div>').join('');
 document.getElementById('bsSrcBody').innerHTML=
  '<div class="mtg-kpis" style="margin-bottom:18px"><div class="mtg-kpi"><div class="l">Sources actives</div><div class="v">'+BS_SOURCES.length+'</div><div class="d">XLS, API, ERP, SIRH</div></div>'
  +'<div class="mtg-kpi"><div class="l">Lignes intégrées</div><div class="v">'+tot.toLocaleString('fr-FR')+'</div><div class="d">Sur l\'exercice en cours</div></div>'
  +'<div class="mtg-kpi"><div class="l">Rejets à traiter</div><div class="v" style="color:'+(rej?'var(--state-danger)':'var(--state-success)')+'">'+rej+'</div><div class="d">Lignes non intégrées</div></div>'
  +'<div class="mtg-kpi"><div class="l">Connecteurs en erreur</div><div class="v" style="color:'+(err?'var(--state-danger)':'var(--state-success)')+'">'+err+'</div><div class="d">'+(err?'Intervention requise':'Tous opérationnels')+'</div></div></div>'
  +'<div class="bs-grid">'+cards+'</div>';
}
function bsOpenWizard(sid){
 bsWizSrc=sid;bsWizStep=1;bsWizMap=BS_COLS.map(c=>c.f);
 bsCloseSrc();bsRenderWizard();document.getElementById('bsWizModal').classList.add('open');
}
function bsCloseWizard(){document.getElementById('bsWizModal').classList.remove('open');}
function bsWizGo(n){if(n<1||n>4)return;bsWizStep=n;bsRenderWizard();}
function bsMapSet(i,v){bsWizMap[i]=v;bsRenderWizard();}
function bsRenderWizard(){
 const src=BS_SOURCES.find(x=>x.id===bsWizSrc)||BS_SOURCES[2];
 document.getElementById('bsWizSub').textContent=src.name+' → '+((MBUDGETS.find(x=>x.id===mbCurrentId)||MBUDGETS[0]).name);
 const labels=['Source','Mapping','Contrôles','Aperçu'];
 let steps='<div class="bs-steps">';
 labels.forEach((l,n)=>{const i=n+1;steps+='<div class="bs-step'+(i===bsWizStep?' on':'')+(i<bsWizStep?' past':'')+'"><span class="bs-sn">'+(i<bsWizStep?'✓':i)+'</span><span class="bs-sl">'+l+'</span>'+(i<4?'<span class="bs-sbar"></span>':'')+'</div>';});
 steps+='</div>';
 let body='';
 if(bsWizStep===1){
  body='<div class="bs-drop"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>'
   +'<div class="bs-dt">Déposez un fichier XLS / XLSX / CSV</div><div class="bs-dm">ou sélectionnez un connecteur déjà configuré</div></div>'
   +'<div class="bs-file"><div class="bs-fic">'+(src.kind==='xls'?'XLS':src.kind==='api'?'API':'ERP')+'</div><div style="flex:1;min-width:0"><div class="bs-dt" style="font-size:12.5px">'+src.name+'</div><div class="bs-dm" style="margin-top:2px">'+src.type+' · '+src.rows+' lignes · mapping mémorisé</div></div><span class="bs-st ok"><i></i>Prêt</span></div>'
   +'<div class="mtg-fld" style="margin-top:16px"><label class="mtg-lbl">Budget cible</label><select class="mtg-sel">'+MBUDGETS.map(b=>'<option'+(b.id===mbCurrentId?' selected':'')+'>'+b.name+'</option>').join('')+'</select></div>'
   +'<div class="mtg-fld"><label class="mtg-lbl">Mode d\'intégration</label><div class="mtg-pills"><button class="mtg-pill sel">Mise à jour incrémentale</button><button class="mtg-pill">Remplacement complet</button><button class="mtg-pill">Simulation seule</button></div></div>';
 }else if(bsWizStep===2){
  const rows=BS_COLS.map((c,i)=>'<tr><td class="src">'+c.c+'</td><td class="smp">'+c.s+'</td><td><select class="bs-sel" onchange="bsMapSet('+i+',this.value)">'+BS_FIELDS.map(f=>'<option value="'+f[0]+'"'+(bsWizMap[i]===f[0]?' selected':'')+'>'+f[1]+'</option>').join('')+'</select></td></tr>').join('');
  const mapped=bsWizMap.filter(x=>x).length;
  body='<div style="font-size:12.5px;color:var(--neutral-500);font-weight:600;margin-bottom:14px;line-height:1.55">Associez chaque colonne du fichier à un champ Starium. Le mapping est mémorisé pour cette source : les imports suivants se feront en un clic.</div>'
   +'<table class="bs-map"><thead><tr><th style="width:26%">Colonne source</th><th style="width:28%">Exemple</th><th>Champ Starium</th></tr></thead><tbody>'+rows+'</tbody></table>'
   +'<div class="cap-note" style="margin-top:16px"><b>'+mapped+' colonnes sur '+BS_COLS.length+' associées.</b> Les champs Enveloppe, Ligne et au moins un montant sont requis pour poursuivre.</div>';
 }else if(bsWizStep===3){
  const rows=BS_CHECKS.map(c=>'<div class="bs-chk"><span class="bs-ci" style="background:'+(c.ok===1?'var(--state-success)':c.ok===0?'var(--brand-gold)':'var(--state-danger)')+'">'+(c.ok===1?'✓':'!')+'</span><div style="flex:1;min-width:0"><div class="bs-ct">'+c.t+'</div><div class="bs-cm">'+c.m+'</div></div><span class="bs-cn" style="color:'+(c.ok===1?'var(--state-success)':c.ok===0?'var(--brand-gold-700)':'var(--state-danger)')+'">'+c.n+'</span></div>').join('');
  body='<div style="font-size:12.5px;color:var(--neutral-500);font-weight:600;margin-bottom:14px;line-height:1.55">Contrôles de cohérence exécutés avant intégration. Les anomalies bloquantes empêchent l\'import ; les avertissements sont intégrés avec la règle indiquée.</div>'+rows
   +'<div class="cap-note" style="margin-top:16px"><b>93 lignes seront intégrées, 1 rejetée, 2 lignes créées.</b> Aucune anomalie bloquante — l\'import peut être validé.</div>';
 }else{
  const b=MBUDGETS.find(x=>x.id===mbCurrentId)||MBUDGETS[0];
  const flat=mbFlatLines(b).slice(0,7);
  const rows=flat.map((f,n)=>{const delta=[8400,-2200,15600,0,4300,-1150,9200][n]||0;const nv=f.l.budget+delta;
   return '<tr><td>'+f.l.name+'</td><td>'+fmtEur(mbf(f.l.budget))+'</td><td class="bs-arrow">→</td><td style="font-weight:700">'+fmtEur(mbf(nv))+'</td><td style="color:'+(delta>0?'var(--state-info)':delta<0?'var(--state-danger)':'var(--neutral-400)')+';font-weight:700">'+(delta?(delta>0?'+':'')+fmtEur(mbf(delta)):'—')+'</td></tr>';}).join('')
   +'<tr><td>Licences Copilot<span class="bs-new">Nouveau</span></td><td class="bs-arrow">—</td><td class="bs-arrow">→</td><td style="font-weight:700">'+fmtEur(mbf(28000))+'</td><td style="color:var(--state-info);font-weight:700">+'+fmtEur(mbf(28000))+'</td></tr>'
   +'<tr><td>Audit RGPD externe<span class="bs-new">Nouveau</span></td><td class="bs-arrow">—</td><td class="bs-arrow">→</td><td style="font-weight:700">'+fmtEur(mbf(16500))+'</td><td style="color:var(--state-info);font-weight:700">+'+fmtEur(mbf(16500))+'</td></tr>';
  body='<div style="font-size:12.5px;color:var(--neutral-500);font-weight:600;margin-bottom:14px;line-height:1.55">Impact ligne à ligne avant validation. Rien n\'est écrit tant que vous n\'avez pas confirmé.</div>'
   +'<table class="bs-prev"><thead><tr><th>Ligne budgétaire</th><th>Actuel</th><th></th><th>Après import</th><th>Écart</th></tr></thead><tbody>'+rows+'</tbody></table>'
   +'<div class="cap-note" style="margin-top:16px"><b>Piste d\'audit.</b> Chaque montant importé conserve sa provenance (source, date, auteur) et sa valeur précédente, consultables dans le détail de ligne.</div>';
 }
 document.getElementById('bsWizBody').innerHTML=steps+body;
 document.getElementById('bsWizFoot').innerHTML=
  '<button class="btn btn-secondary" onclick="'+(bsWizStep===1?'bsCloseWizard()':'bsWizGo('+(bsWizStep-1)+')')+'">'+(bsWizStep===1?'Annuler':'‹ Précédent')+'</button>'
  +(bsWizStep<4?'<button class="btn btn-primary" onclick="bsWizGo('+(bsWizStep+1)+')">Continuer ›</button>':'<button class="btn btn-primary" onclick="bsWizConfirm()">Valider l\'import</button>');
}
function bsWizConfirm(){
 const src=BS_SOURCES.find(x=>x.id===bsWizSrc)||BS_SOURCES[2];
 src.last=new Date().toLocaleDateString('fr-FR')+' '+new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}).replace(':','h');
 src.rows=93;src.rej=1;src.st='ok';
 bsCloseWizard();showToast('Import validé · 93 lignes intégrées depuis '+src.name);
 if(mbCurrentId)renderBudgetDetail(mbCurrentId);
}

