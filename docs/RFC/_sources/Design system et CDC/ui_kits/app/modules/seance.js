/* Séance en cours — déroulé live, décisions, actions
   Extrait de « Refonte Portail Client.html ». Script classique, portée globale partagée.
   Chargé avant le script principal. Dépendances globales : fmtEur(), showToast(), showView(). */

/* ═══════════ SÉANCE EN COURS ═══════════ */
const LIV_KINDS=[
 {k:'doc',lbl:'Document',ico:'▤',color:'var(--state-info)',items:['Support CODIR juillet 2026.pdf','Budget S2 — arbitrage.xlsx','Plan de remédiation RGPD.docx','Rapport d\'audit cybersécurité.pdf','CR COPIL du 16 juillet.pdf','Quarterplan S2 2026.xlsx','Registre des traitements.xlsx']},
 {k:'tache',lbl:'Tâche',ico:'✓',color:'var(--purple)',items:['Recette utilisateurs Portail Client','Bascule production Migration Cloud','Reprise de données ERP','Déploiement MFA — 220 comptes','Collecte des preuves ISO 27001','Intégration API facturation']},
 {k:'risque',lbl:'Risque',ico:'!',color:'var(--state-danger)',items:['R-014 · Retard bascule production','R-021 · Dépassement budgétaire ERP','R-007 · Fuite de données clients','R-032 · Dépendance prestataire cloud','R-018 · Non-conformité RGPD registre']},
 {k:'plan',lbl:"Plan d'action",ico:'◈',color:'var(--brand-gold)',items:['PA-2026-03 · Remédiation RGPD','PA-2026-05 · Renforcement authentification','PA-2026-08 · Certification ISO 27001','PA-2026-11 · Continuité d\'activité']},
 {k:'projet',lbl:'Projet',ico:'▸',color:'var(--teal)',items:['Refonte Portail Client','Migration Infrastructure Cloud','Sécurité & Conformité RGPD','Migration ERP','Application Mobile','Déploiement CRM']},
 {k:'ecart',lbl:'Écart conformité',ico:'◎',color:'var(--state-success)',items:['RGPD art.30 · Registre incomplet','ISO A.5.15 · Contrôle d\'accès','ISO A.8.16 · Supervision','NIST PR.AC-1 · Gestion identités','DORA art.11 · Plan de continuité']}
];
function livKind(k){return LIV_KINDS.find(x=>x.k===k)||LIV_KINDS[0];}
let LIV=null,livTick=null,livPickK='doc';
function livStart(id){
 const m=MTG_LIST.find(x=>x.id===id);if(!m)return;const i=mtgInst(m.t);
 LIV={id,cur:0,t0:Date.now(),pres:i.members.slice(),notes:{},dec:(m.dec||[]).slice(),act:(m.act||[]).slice(),done:{},links:{}};
 (m.ag||[]).forEach((a,n)=>{LIV.links[n]=(a.links||[]).slice();});
 mtgCloseDrawer();showView('seance');
 clearInterval(livTick);livTick=setInterval(livClock,1000);
}
function livClock(){
 if(!LIV){clearInterval(livTick);return;}
 const el=document.getElementById('livElapsed');if(!el)return;
 const s=Math.floor((Date.now()-LIV.t0)/1000);
 el.textContent=String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');
}
function livRender(){
 const root=document.getElementById('livRoot');if(!root)return;
 if(!LIV){root.innerHTML='<div class="liv-card"><div class="liv-empty">Aucune séance en cours. Lancez une réunion depuis le module Réunions.</div><div class="liv-nav"><button class="liv-btn dark" onclick="showView(\'reunions\')">Aller aux réunions</button></div></div>';return;}
 const m=MTG_LIST.find(x=>x.id===LIV.id),i=mtgInst(m.t),ag=m.ag||[];
 const quorumOk=LIV.pres.length>=i.quorum;
 const planned=ag.reduce((s,a)=>s+a.d,0);
 const doneN=Object.keys(LIV.done).filter(k=>LIV.done[k]).length;
 const bar='<div class="liv-bar"><div class="liv-iav" style="background:'+i.color+'">'+i.name.slice(0,2).toUpperCase()+'</div>'
  +'<div><div class="liv-bt">'+m.title+'</div><div class="liv-bs">'+i.full+' · '+m.loc+' · présidée par '+i.chair.split(' — ')[0]+'</div></div>'
  +'<span class="liv-live"><i></i>EN COURS</span>'
  +'<div class="liv-clock"><div><div class="liv-cv" id="livElapsed">00:00</div><div class="liv-ck">Écoulé</div></div>'
  +'<div><div class="liv-cv">'+planned+'<span style="font-size:12px;color:var(--neutral-400)"> min</span></div><div class="liv-ck">Prévu</div></div>'
  +'<div><div class="liv-cv">'+doneN+'/'+ag.length+'</div><div class="liv-ck">Points traités</div></div></div></div>';
 const pts=ag.map((a,n)=>'<div class="liv-pt'+(n===LIV.cur?' cur':'')+(LIV.done[n]?' done':'')+'" onclick="livGo('+n+')"><span class="liv-ptn">'+(LIV.done[n]?'✓':n+1)+'</span><div class="liv-ptb"><div class="liv-ptt">'+a.t+'</div><div class="liv-ptm">'+a.o+(a.d?' · '+a.d+' min':'')+' · '+(a.k==='deci'?'Décision':a.k==='arb'?'Arbitrage':'Information')+((LIV.links[n]||[]).length?' · ◇ '+LIV.links[n].length+' rattaché'+(LIV.links[n].length>1?'s':''):'')+'</div></div></div>').join('');
 const a=ag[LIV.cur]||{t:'—',o:'—',d:0,k:'info'};
 const lks=LIV.links[LIV.cur]||[];
 const lkH=lks.length?'<div class="liv-lk">'+lks.map((l,n)=>{const kd=livKind(l.k);return '<span class="liv-chip"><span class="ci" style="background:'+kd.color+'">'+kd.ico+'</span><span class="cn" title="'+kd.lbl+' · '+l.n+'">'+l.n+'</span><span class="cx" onclick="livUnlink('+n+')">✕</span></span>';}).join('')+'</div>':'<div class="liv-empty">Aucun document ni élément rattaché à ce point.</div>';
 const kd=livKind(livPickK);
 const avail=kd.items.filter(x=>!lks.some(l=>l.k===livPickK&&l.n===x));
 const pick='<div class="liv-pick"><div class="liv-pickh">Rattacher un élément à ce point</div>'
  +'<div class="liv-tp">'+LIV_KINDS.map(x=>'<button class="liv-tpb'+(x.k===livPickK?' sel':'')+'" onclick="livPickK=\''+x.k+'\';livRender()">'+x.lbl+'</button>').join('')+'</div>'
  +(avail.length?'<select class="liv-in" id="livLkSel">'+avail.map(x=>'<option>'+x+'</option>').join('')+'</select>'
   +'<div class="liv-nav"><button class="liv-btn dark" onclick="livLink()">Rattacher</button></div>'
   :'<div class="liv-empty">Tous les éléments de ce type sont déjà rattachés.</div>')+'</div>';
 const cur='<div class="liv-cur"><div class="liv-curk">Point '+(LIV.cur+1)+' sur '+ag.length+' · '+(a.k==='deci'?'Décision attendue':a.k==='arb'?'Arbitrage attendu':'Information')+'</div>'
  +'<div class="liv-curt">'+a.t+'</div><div class="liv-curm">Rapporteur : '+a.o+(a.d?' · '+a.d+' min allouées':'')+'</div>'
  +'<textarea class="liv-ta" id="livNote" placeholder="Notes de séance sur ce point…" oninput="LIV.notes['+LIV.cur+']=this.value">'+(LIV.notes[LIV.cur]||'')+'</textarea>'
  +'<div class="liv-h" style="margin-top:18px;margin-bottom:0">Documents &amp; éléments rattachés<span style="text-transform:none;letter-spacing:0;color:var(--neutral-400)">'+lks.length+'</span></div>'
  +lkH+pick
  +'<div class="liv-nav"><button class="liv-btn'+(LIV.cur===0?' dis':'')+'" onclick="livGo('+(LIV.cur-1)+')">‹ Point précédent</button>'
  +'<button class="liv-btn ok" onclick="livDone()">'+(LIV.done[LIV.cur]?'✓ Point traité':'Marquer traité et suivant ›')+'</button>'
  +'<button class="liv-btn'+(LIV.cur>=ag.length-1?' dis':'')+'" onclick="livGo('+(LIV.cur+1)+')">Point suivant ›</button></div></div>';
 const decL=LIV.dec.length?LIV.dec.map((d,n)=>'<div class="liv-item"><span class="liv-ic" style="background:var(--purple)">✓</span><div style="flex:1;min-width:0"><div class="liv-it">'+d.txt+'</div><div class="liv-im">Décideur : '+d.o+(d.pt!=null&&ag[d.pt]?' · point '+(d.pt+1):'')+'</div>'+(d.link?'<div class="liv-lk" style="margin-top:6px">'+livChip(d.link,1)+'</div>':'')+'</div><span class="liv-x" onclick="LIV.dec.splice('+n+',1);livRender()">✕</span></div>').join(''):'<div class="liv-empty">Aucune décision actée.</div>';
 const actL=LIV.act.length?LIV.act.map((x,n)=>'<div class="liv-item"><span class="liv-ic" style="background:'+(x.st==='done'?'var(--state-success)':x.st==='late'?'var(--state-danger)':'var(--state-info)')+'">!</span><div style="flex:1;min-width:0"><div class="liv-it">'+x.txt+'</div><div class="liv-im">'+x.o+' · '+mtgFDate(x.due)+(x.pt!=null&&ag[x.pt]?' · point '+(x.pt+1):'')+'</div>'+(x.link?'<div class="liv-lk" style="margin-top:6px">'+livChip(x.link,1)+'</div>':'')+'</div><span class="liv-x" onclick="LIV.act.splice('+n+',1);livRender()">✕</span></div>').join(''):'<div class="liv-empty">Aucune action ouverte.</div>';
 const opts=i.members.map(n=>'<option>'+n+'</option>').join('');
 const side='<div class="liv-card" style="margin-bottom:16px"><div class="liv-h">Présence<span style="text-transform:none;letter-spacing:0;color:var(--neutral-400)">'+LIV.pres.length+'/'+i.members.length+'</span></div>'
  +i.members.map(n=>{const on=LIV.pres.includes(n);return '<div class="liv-pp'+(on?' on':'')+'" onclick="livTogglePres(\''+n.replace(/'/g,"\\'")+'\')"><span class="liv-box">'+(on?'✓':'')+'</span><span class="liv-pav" style="background:'+(on?i.color:'var(--neutral-300)')+'">'+mtgIni(n)+'</span><span class="liv-pn">'+n+'</span></div>';}).join('')
  +'<div class="liv-quo '+(quorumOk?'ok':'no')+'">Quorum '+i.quorum+' requis — '+(quorumOk?'atteint ✓ la séance peut délibérer':'non atteint, pas de décision opposable')+'</div></div>'
  +'<div class="liv-card" style="margin-bottom:16px"><div class="liv-h">Décisions<span style="text-transform:none;letter-spacing:0;color:var(--neutral-400)">point '+(LIV.cur+1)+'</span></div>'+decL
  +'<input class="liv-in" id="livDecT" placeholder="Formuler la décision actée…" style="margin-top:10px">'
  +'<select class="liv-in" id="livDecO" style="margin-top:8px">'+opts+'</select>'
  +livLinkOpts().replace('__ID__','livDecL')
  +'<div class="liv-nav"><button class="liv-btn dark" onclick="livAddDec()">Acter la décision</button></div></div>'
  +'<div class="liv-card"><div class="liv-h">Actions<span style="text-transform:none;letter-spacing:0;color:var(--neutral-400)">point '+(LIV.cur+1)+'</span></div>'+actL
  +'<input class="liv-in" id="livActT" placeholder="Action à confier…" style="margin-top:10px">'
  +'<select class="liv-in" id="livActO" style="margin-top:8px">'+opts+'</select>'
  +'<input class="liv-in" id="livActD" type="date" value="2026-09-30" style="margin-top:8px">'
  +livLinkOpts().replace('__ID__','livActL')
  +'<div class="liv-nav"><button class="liv-btn dark" onclick="livAddAct()">Ajouter l\'action</button></div></div>';
 root.innerHTML=bar+'<div class="liv-wrap"><div>'+cur+'<div class="liv-card"><div class="liv-h">Ordre du jour</div>'+pts
  +'<div class="liv-nav" style="margin-top:16px"><button class="liv-btn ok" onclick="livClose()">Clôturer la séance et générer le CR</button><button class="liv-btn" onclick="livAbort()">Interrompre</button></div></div></div>'
  +'<div>'+side+'</div></div>';
 livClock();
}
function livGo(n){const m=MTG_LIST.find(x=>x.id===LIV.id),ag=m.ag||[];if(n<0||n>=ag.length)return;LIV.cur=n;livRender();}
function livDone(){const m=MTG_LIST.find(x=>x.id===LIV.id),ag=m.ag||[];LIV.done[LIV.cur]=true;if(LIV.cur<ag.length-1)LIV.cur++;livRender();}
function livTogglePres(n){const k=LIV.pres.indexOf(n);if(k>=0)LIV.pres.splice(k,1);else LIV.pres.push(n);livRender();}
function livLink(){const s=document.getElementById('livLkSel');if(!s)return;if(!LIV.links[LIV.cur])LIV.links[LIV.cur]=[];LIV.links[LIV.cur].push({k:livPickK,n:s.value});livRender();}
function livUnlink(n){(LIV.links[LIV.cur]||[]).splice(n,1);livRender();}
function livAddDec(){const t=document.getElementById('livDecT').value.trim();if(!t)return;const l=livPickedLink('livDecL');LIV.dec.push({txt:t,o:document.getElementById('livDecO').value,pt:LIV.cur,link:l});livRender();}
function livAddAct(){const t=document.getElementById('livActT').value.trim();if(!t)return;const l=livPickedLink('livActL');LIV.act.push({txt:t,o:document.getElementById('livActO').value,due:document.getElementById('livActD').value||'2026-09-30',st:'wip',pt:LIV.cur,link:l});livRender();}
function livPickedLink(id){const s=document.getElementById(id);if(!s||!s.value)return null;const lks=LIV.links[LIV.cur]||[];return lks[+s.value]||null;}
function livLinkOpts(){const lks=LIV.links[LIV.cur]||[];if(!lks.length)return '';return '<select class="liv-in" id="__ID__" style="margin-top:8px"><option value="">— Aucun élément rattaché —</option>'+lks.map((l,n)=>'<option value="'+n+'">'+livKind(l.k).lbl+' · '+l.n+'</option>').join('')+'</select>';}
function livChip(l,small){const kd=livKind(l.k);return '<span class="liv-chip"'+(small?' style="font-size:10.5px;padding:4px 8px 4px 5px"':'')+'><span class="ci" style="background:'+kd.color+(small?';width:15px;height:15px;font-size:8px':'')+'">'+kd.ico+'</span><span class="cn" title="'+kd.lbl+' · '+l.n+'">'+l.n+'</span></span>';}
function livAbort(){clearInterval(livTick);LIV=null;showView('reunions');}
function livClose(){
 const m=MTG_LIST.find(x=>x.id===LIV.id),i=mtgInst(m.t);
 m.pres=LIV.pres.slice();m.exc=i.members.filter(n=>!LIV.pres.includes(n));
 m.dec=LIV.dec.slice();m.act=LIV.act.slice();m.st='crv';
 (m.ag||[]).forEach((a,n)=>{a.links=(LIV.links[n]||[]).slice();});
 const notes=Object.keys(LIV.notes).filter(k=>(LIV.notes[k]||'').trim());
 if(notes.length)m.notes=notes.map(k=>({pt:(m.ag[k]||{}).t,txt:LIV.notes[k].trim()}));
 clearInterval(livTick);const id=m.id;LIV=null;
 mtgFilterInst=m.t;showView('reunions');mtgTab('reunions');mtgOpen(id);
}
let mtgNewInst='codir',mtgNewAg=[];
function mtgOpenNew(){mtgNewInst='codir';mtgNewAg=[{t:'',d:20,k:'info'}];mtgRenderNew();document.getElementById('mtgNewModal').classList.add('open');}
function mtgCloseNew(){document.getElementById('mtgNewModal').classList.remove('open');}
function mtgPickInst(id){mtgNewInst=id;mtgRenderNew();}
function mtgAddAg(){mtgNewAg.push({t:'',d:20,k:'info'});mtgRenderNew();}
function mtgDelAg(n){mtgNewAg.splice(n,1);if(!mtgNewAg.length)mtgNewAg.push({t:'',d:20,k:'info'});mtgRenderNew();}
function mtgSyncAg(){document.querySelectorAll('#mtgNewBody .mtg-agrow').forEach((r,n)=>{if(!mtgNewAg[n])return;mtgNewAg[n].t=r.querySelector('.ag-t').value;mtgNewAg[n].d=+r.querySelector('.ag-d').value||0;mtgNewAg[n].k=r.querySelector('.ag-k').value;});}
function mtgRenderNew(){
 const i=mtgInst(mtgNewInst);
 const pills=MTG_INST.map(x=>'<button class="mtg-pill'+(x.id===mtgNewInst?' sel':'')+'" onclick="mtgSyncAg();mtgPickInst(\''+x.id+'\')">'+x.name+'</button>').join('');
 const rows=mtgNewAg.map((a,n)=>'<div class="mtg-agrow"><input class="mtg-in-t ag-t" placeholder="Point à l\'ordre du jour" value="'+(a.t||'').replace(/"/g,'&quot;')+'"><input class="mtg-in-t ag-d" type="number" min="5" step="5" value="'+a.d+'"><select class="mtg-sel ag-k"><option value="info"'+(a.k==='info'?' selected':'')+'>Information</option><option value="deci"'+(a.k==='deci'?' selected':'')+'>Décision</option><option value="arb"'+(a.k==='arb'?' selected':'')+'>Arbitrage</option></select><div class="mtg-del" onclick="mtgSyncAg();mtgDelAg('+n+')">✕</div></div>').join('');
 document.getElementById('mtgNewBody').innerHTML=
  '<div class="mtg-fld"><label class="mtg-lbl">Instance</label><div class="mtg-pills">'+pills+'</div><div style="font-size:11.5px;color:var(--neutral-500);font-weight:600;margin-top:9px">'+i.full+' · '+i.cad+' · '+i.members.length+' membres · quorum '+i.quorum+'</div></div>'
  +'<div class="mtg-fld"><label class="mtg-lbl">Titre de la séance</label><input class="mtg-in-t" id="mtgNTitle" placeholder="ex. '+i.name+' de septembre — revue de portefeuille"></div>'
  +'<div class="mtg-fld"><div class="mtg-r3"><div><label class="mtg-lbl">Date</label><input class="mtg-in-t" id="mtgNDate" type="date" value="2026-09-15"></div><div><label class="mtg-lbl">Heure</label><input class="mtg-in-t" id="mtgNTime" type="time" value="09:00"></div><div><label class="mtg-lbl">Durée (min)</label><input class="mtg-in-t" id="mtgNDur" type="number" min="15" step="15" value="90"></div></div></div>'
  +'<div class="mtg-fld"><label class="mtg-lbl">Lieu / visio</label><input class="mtg-in-t" id="mtgNLoc" value="Teams" placeholder="Salle ou lien visio"></div>'
  +'<div class="mtg-fld"><label class="mtg-lbl">Ordre du jour</label>'+rows+'<div class="mtg-add" onclick="mtgSyncAg();mtgAddAg()">＋ Ajouter un point</div></div>';
}
function mtgSaveNew(){
 mtgSyncAg();
 const i=mtgInst(mtgNewInst);
 const title=document.getElementById('mtgNTitle').value.trim()||i.name+' — nouvelle séance';
 const date=document.getElementById('mtgNDate').value||'2026-09-15';
 const time=document.getElementById('mtgNTime').value||'09:00';
 const dur=+document.getElementById('mtgNDur').value||90;
 const loc=document.getElementById('mtgNLoc').value.trim()||'Teams';
 const ag=mtgNewAg.filter(a=>a.t.trim()).map(a=>({t:a.t.trim(),d:a.d,o:i.chair.split(' — ')[0],k:a.k}));
 MTG_LIST.push({id:'m'+(MTG_LIST.length+1)+'_'+Date.now(),t:mtgNewInst,title,date,time,dur,loc,st:'plan',pres:[],exc:[],ag:ag.length?ag:[{t:'Ordre du jour à préciser',d:0,o:'—',k:'info'}],dec:[],act:[]});
 mtgCloseNew();mtgFilterInst=mtgNewInst;mtgTab('reunions');
}
function capRenderPortfolio(){
 const tot=capPortfolioTotals();
 const cap=capSum(tot.cap),eng=capSum(tot.eng),prev=capSum(tot.prev),dispo=cap-eng-prev,occ=Math.round((eng+prev)/cap*100);
 let over=0;CAP_CENTERS.forEach(c=>{const m=capCenterMonthly(c.id);for(let i=0;i<12;i++){if(m.eng[i]+m.prev[i]>m.cap[i]){over++;break;}}});
 const maxV=Math.max.apply(null,tot.cap.map((v,i)=>Math.max(v,tot.eng[i]+tot.prev[i])));
 let cols='';for(let i=0;i<12;i++){const cons=tot.eng[i]+tot.prev[i],mo=Math.round(cons/tot.cap[i]*100);cols+='<div class="cap-col"><div class="cap-colbars"><div class="cap-bg" style="height:'+(tot.cap[i]/maxV*100)+'%"></div><div class="cap-stk" style="height:'+((tot.eng[i]+tot.prev[i])/maxV*100)+'%"><div class="cap-prev" style="height:'+(tot.prev[i]/(tot.eng[i]+tot.prev[i])*100)+'%"></div><div class="cap-eng" style="flex:1"></div></div></div><div class="cap-cm">'+CAP_MONTHS[i]+'</div><div class="cap-cp" style="color:'+capTone(mo)+'">'+mo+'%</div></div>';}
 const ranked=CAP_CENTERS.map(c=>{const m=capCenterMonthly(c.id);const a=capSum(m.cap),b=capSum(m.eng)+capSum(m.prev);return{name:c.name,occ:Math.round(b/a*100)};}).sort((x,y)=>y.occ-x.occ).slice(0,6);
 let rk=ranked.map(r=>'<div class="cap-rk"><div class="cap-rk-n">'+r.name+'</div><div class="cap-rk-t"><div class="cap-rk-f" style="width:'+Math.min(r.occ,100)+'%;background:'+capBg(r.occ)+'"></div></div><div class="cap-rk-p" style="color:'+capTone(r.occ)+'">'+r.occ+'%</div></div>').join('');
 const heads=CAP_CENTERS.reduce((s,c)=>s+c.head,0);
 document.getElementById('cap-portefeuille').innerHTML=
 '<div class="cap-kpis">'
 +'<div class="cap-kpi"><div class="l">Capacité annuelle</div><div class="v">'+capNb(cap)+'<small>j·h</small></div><div class="d">'+heads+' collaborateurs · '+CAP_CENTERS.length+' centres</div></div>'
 +'<div class="cap-kpi"><div class="l">Engagé</div><div class="v" style="color:var(--state-info)">'+capNb(eng)+'<small>j·h</small></div><div class="d">Projets validés</div></div>'
 +'<div class="cap-kpi"><div class="l">Prévisionnel</div><div class="v" style="color:var(--brand-gold-700)">'+capNb(prev)+'<small>j·h</small></div><div class="d">Brouillon / à valider</div></div>'
 +'<div class="cap-kpi"><div class="l">Disponible</div><div class="v" style="color:'+(dispo<0?'var(--state-danger)':'var(--state-success)')+'">'+capNb(dispo)+'<small>j·h</small></div><div class="d">Marge de pilotage</div></div>'
 +'</div>'
 +'<div class="cap-2col">'
 +'<div class="card cap-chart-card"><div class="cap-cardh"><div><h3>Capacité vs consommation — mensuel</h3><p>Charge répartie automatiquement sur les 12 mois. Barre = engagé + prévisionnel ; fond = capacité disponible.</p></div><div class="cap-gauge" style="--p:'+Math.min(occ,100)+';--gc:'+capBg(occ)+'"><span>'+occ+'%</span></div></div><div class="cap-chart">'+cols+'</div><div class="cap-lg"><span class="cap-lgi"><i class="e"></i>Engagé</span><span class="cap-lgi"><i class="p"></i>Prévisionnel</span><span class="cap-lgi"><i class="c"></i>Capacité</span></div></div>'
 +'<div class="card cap-rk-card"><div class="cap-cardh"><div><h3>Centres les plus sollicités</h3><p>Taux d\'occupation annuel.</p></div></div>'+rk+'<div class="cap-alert '+(over>0?'warn':'')+'">'+(over>0?'<b>'+over+' centre'+(over>1?'s':'')+'</b> en surcharge sur au moins un mois de l\'année.':'Aucune surcharge détectée sur l\'année.')+'</div></div>'
 +'</div>';
}
function capRenderCentres(){
 let head='<div class="cap-hm-h nm">Centre de capacité</div>'+CAP_MONTHS.map(mo=>'<div class="cap-hm-h">'+mo+'</div>').join('');
 let rows='';
 CAP_GROUPS.forEach(g=>{rows+='<div class="cap-hm-grp">'+g.name+'</div>';CAP_CENTERS.filter(c=>c.g===g.id).forEach(c=>{const m=capCenterMonthly(c.id);const cc=capSum(m.cap),ce=capSum(m.eng)+capSum(m.prev),yo=Math.round(ce/cc*100);rows+='<div class="cap-hm-name" onclick="capOpenCenter(\''+c.id+'\')"><div><div class="cap-hm-cn">'+c.name+'</div><div class="cap-hm-cm">'+c.head+' pers · <b style="color:'+capTone(yo)+'">'+yo+'%</b></div></div><span class="cap-dot" style="background:'+g.color+'"></span></div>';for(let i=0;i<12;i++){const cons=m.eng[i]+m.prev[i],occ=Math.round(cons/m.cap[i]*100),dispo=Math.round(m.cap[i]-cons);rows+='<div class="cap-hm-cell" onclick="capOpenCenter(\''+c.id+'\')" style="background:'+capCellBg(occ)+';color:'+(occ>100?'#fff':'var(--brand-ink)')+'">'+occ+'<span class="cap-hm-tip">'+c.name+' · '+CAP_MONTHS[i]+'<br>Cap. '+Math.round(m.cap[i])+' · Conso '+Math.round(cons)+' j·h<br>Dispo '+dispo+' j·h</span></div>';}});});
 document.getElementById('cap-centres').innerHTML='<div class="card cap-hm-card"><div class="cap-hm" style="grid-template-columns:210px repeat(12,1fr)">'+head+rows+'</div><div class="cap-hm-lg">Occupation <span class="sw" style="background:'+capCellBg(30)+'"></span><span class="sw" style="background:'+capCellBg(60)+'"></span><span class="sw" style="background:'+capCellBg(80)+'"></span><span class="sw" style="background:'+capCellBg(95)+'"></span><span class="sw" style="background:'+capCellBg(120)+'"></span> &nbsp;faible → surcharge · cliquez un centre pour le détail mensuel</div></div>';
}
function capRenderCollabs(){
 let rows=CAP_PEOPLE.map((p,idx)=>{const m=capPersonMonthly(p);const cc=capSum(m.cap),ce=capSum(m.eng),cp=capSum(m.prev),cd=cc-ce-cp,occ=Math.round((ce+cp)/cc*100);const c=CAP_CENTERS.find(x=>x.id===p.c),g=CAP_GROUPS.find(x=>x.id===c.g);return '<tr onclick="capOpenPerson('+idx+')"><td><div class="cap-pn">'+p.n+'</div><div class="cap-pr">'+p.role+'</div></td><td><span class="cap-cbadge" style="background:'+g.color+'"></span>'+c.name+'</td><td>'+capNb(cc)+'</td><td style="color:var(--state-info)">'+capNb(ce)+'</td><td style="color:var(--brand-gold-700)">'+(cp?capNb(cp):'–')+'</td><td style="font-weight:700;color:'+(cd<0?'var(--state-danger)':'var(--brand-ink)')+'">'+capNb(cd)+'</td><td><span style="font-weight:800;color:'+capTone(occ)+'">'+occ+'%</span></td><td><span class="cap-srcb '+(p.exc?'exc':'cal')+'">'+(p.exc?'Exception':'Calendrier')+'</span></td></tr>';}).join('');
 document.getElementById('cap-collabs').innerHTML='<div class="card cap-tbl-card"><table class="cap-tbl"><thead><tr><th>Collaborateur</th><th>Centre</th><th>Cap. an.</th><th>Engagé</th><th>Prév.</th><th>Dispo</th><th>Occ.</th><th>Source</th></tr></thead><tbody>'+rows+'</tbody></table></div><div class="cap-hint">La capacité individuelle hérite automatiquement du calendrier français (jours ouvrés). Une <b>exception</b> remplace la valeur d\'un mois (temps partiel, congés…). Ordre de priorité : <b>SIRH → Exception collaborateur → Paramètre client → Calendrier</b>.</div>';
}
function capOpenCenter(cid){const m=capCenterMonthly(cid);const c=m.c,g=CAP_GROUPS.find(x=>x.id===c.g);const cc=capSum(m.cap),ce=capSum(m.eng),cp=capSum(m.prev),cd=cc-ce-cp;const loads=CAP_LOADS.filter(l=>l.c===cid);const loadRows=loads.length?loads.map(l=>'<div class="cap-load"><span class="cap-load-pill '+(l.s==='E'?'e':'p')+'">'+(l.s==='E'?'Engagé':'Prév.')+'</span><div class="cap-load-b"><div class="cap-load-n">'+l.p+'</div><div class="cap-load-m">'+CAP_MONTHS[l.a]+' → '+CAP_MONTHS[l.b]+' · réparti auto.</div></div><div class="cap-load-jh">'+l.jh+'<small>j·h</small></div></div>').join(''):'<div class="cap-empty">Aucune charge affectée.</div>';
 document.getElementById('capDrawer').innerHTML='<div class="cap-dclose" onclick="capCloseDrawer()">✕</div><div class="cap-dh"><div class="cap-dh-ico" style="background:'+g.color+'">'+c.name.slice(0,2).toUpperCase()+'</div><div><div class="cap-dh-t">'+c.name+'</div><div class="cap-dh-s">'+g.name+' · '+c.head+' collaborateurs</div></div></div><div class="cap-dgrid"><div><div class="k">Capacité</div><div class="v">'+capNb(cc)+'</div></div><div><div class="k">Engagé</div><div class="v" style="color:var(--state-info)">'+capNb(ce)+'</div></div><div><div class="k">Prév.</div><div class="v" style="color:var(--brand-gold-700)">'+capNb(cp)+'</div></div><div><div class="k">Dispo</div><div class="v" style="color:'+(cd<0?'var(--state-danger)':'var(--state-success)')+'">'+capNb(cd)+'</div></div></div><div class="cap-dsec">Charge affectée<span class="cap-toggle">☑ Porte sa capacité</span></div>'+loadRows+'<div class="cap-note"><b>Anti double comptage.</b> Seule la charge portée directement par ce centre est comptabilisée. Les activités, risques et plans d\'action rattachés à un projet consommateur sont suivis, mais n\'ajoutent aucune capacité supplémentaire.</div><div class="cap-dsec">Détail mensuel</div><table class="cap-mtbl"><thead><tr><th>Mois</th><th>Cap.</th><th>Eng.</th><th>Prév.</th><th>Dispo</th><th>Occ.</th></tr></thead><tbody>'+capMonthTable(m)+'</tbody></table>';
 document.getElementById('capDrawerOv').classList.add('open');
}
function capOpenPerson(idx){const p=CAP_PEOPLE[idx];const m=capPersonMonthly(p);const c=CAP_CENTERS.find(x=>x.id===p.c),g=CAP_GROUPS.find(x=>x.id===c.g);const cc=capSum(m.cap),ce=capSum(m.eng),cp=capSum(m.prev),cd=cc-ce-cp;const src=CAP_JH.map((j,i)=>p.exc&&p.exc[i]!=null?'<span class="cap-srcb exc">Except.</span>':'<span class="cap-srcb cal">Calend.</span>');const ini=p.n.split(' ').map(x=>x[0]).join('').slice(0,2);
 document.getElementById('capDrawer').innerHTML='<div class="cap-dclose" onclick="capCloseDrawer()">✕</div><div class="cap-dh"><div class="cap-dh-ico" style="background:'+g.color+'">'+ini+'</div><div><div class="cap-dh-t">'+p.n+'</div><div class="cap-dh-s">'+p.role+' · '+c.name+'</div></div></div><div class="cap-dgrid"><div><div class="k">Capacité</div><div class="v">'+capNb(cc)+'</div></div><div><div class="k">Engagé</div><div class="v" style="color:var(--state-info)">'+capNb(ce)+'</div></div><div><div class="k">Prév.</div><div class="v" style="color:var(--brand-gold-700)">'+capNb(cp)+'</div></div><div><div class="k">Dispo</div><div class="v" style="color:'+(cd<0?'var(--state-danger)':'var(--state-success)')+'">'+capNb(cd)+'</div></div></div>'+(p.exc?'<div class="cap-note"><b>Exception de capacité.</b> Une ou plusieurs valeurs mensuelles ont été ajustées manuellement (temps partiel, congés) et remplacent le calendrier.</div>':'')+'<div class="cap-dsec">Capacité mensuelle &amp; source</div><table class="cap-mtbl"><thead><tr><th>Mois</th><th>Cap.</th><th>Eng.</th><th>Prév.</th><th>Dispo</th><th>Occ.</th><th>Source</th></tr></thead><tbody>'+capMonthTable(m,src)+'</tbody></table>';
 document.getElementById('capDrawerOv').classList.add('open');
}
function capCloseDrawer(){document.getElementById('capDrawerOv').classList.remove('open');}
