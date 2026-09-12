/* Budget — réaffectation, validation & journal
   Extrait de « Refonte Portail Client.html ».
   Script classique : chargé AVANT le script principal, partage la portée globale.
   Dépend des helpers globaux : fmtEur(), showToast(). */

/* ---- Réaffecter ---- */
function mbFlatLines(b){ const arr=[]; b.env.forEach((e,ei)=>e.lines.forEach((l,li)=>arr.push({ei,li,label:e.name+' › '+l.name,l}))); return arr; }
function mbOpenReaffect(){
  const b=MBUDGETS.find(x=>x.id===mbCurrentId); if(!b) return;
  document.getElementById('mbReafSub').textContent=b.name;
  const flat=mbFlatLines(b);
  const opts=flat.map((f,i)=>'<option value="'+i+'">'+f.label+' ('+fmtEur(f.l.budget)+')</option>').join('');
  const from=document.getElementById('mbReafFrom'), to=document.getElementById('mbReafTo');
  from.innerHTML=opts; to.innerHTML=opts; to.value=1;
  mbReafCalc();
  document.getElementById('mbReafModal').classList.add('open');
}
function mbCloseReaffect(){ document.getElementById('mbReafModal').classList.remove('open'); }
function mbReafCalc(){
  const b=MBUDGETS.find(x=>x.id===mbCurrentId); if(!b) return;
  const flat=mbFlatLines(b);
  const fi=+document.getElementById('mbReafFrom').value, ti=+document.getElementById('mbReafTo').value;
  const amt=Math.max(0,+document.getElementById('mbReafAmt').value||0);
  const F=flat[fi], T=flat[ti];
  if(!F||!T){ return; }
  const el=document.getElementById('mbReafImpact');
  if(fi===ti){ el.innerHTML='<span style="color:var(--state-danger);font-weight:700">Sélectionnez deux lignes différentes.</span>'; return; }
  const fRest=F.l.budget-F.l.engage;
  const warn=amt>fRest?'<span style="color:var(--state-danger);font-weight:800">⚠ '+F.l.name+' n\'a que '+fmtEur(fRest)+' non engagés.</span>':'';
  el.innerHTML='<b>'+F.l.name+'</b> : '+fmtEur(F.l.budget)+' → '+fmtEur(F.l.budget-amt)+'<br><b>'+T.l.name+'</b> : '+fmtEur(T.l.budget)+' → '+fmtEur(T.l.budget+amt)+'<br>'+warn
    +'<div style="margin-top:9px;padding-top:9px;border-top:1px solid var(--neutral-200);font-weight:700;color:'+(amt>=25000?'var(--brand-gold-700)':'var(--state-success)')+'">'+(amt>=25000?'⚠ Montant ≥ '+fmtEur(25000)+' — soumis à validation avant application.':'✓ Sous le seuil de '+fmtEur(25000)+' — application immédiate, tracée au journal.')+'</div>';
}
function mbSaveReaffect(){
  const b=MBUDGETS.find(x=>x.id===mbCurrentId); if(!b) return;
  const flat=mbFlatLines(b);
  const fi=+document.getElementById('mbReafFrom').value, ti=+document.getElementById('mbReafTo').value;
  const amt=Math.max(0,+document.getElementById('mbReafAmt').value||0);
  if(fi===ti||!amt){ showToast('Réaffectation impossible'); return; }
  const seuil=25000, needsVal=amt>=seuil;
  BR_LOG.unshift({id:'r'+Date.now(),bud:b.id,budName:b.name,from:flat[fi].label,to:flat[ti].label,fi,ti,amt,
    st:needsVal?'att':'val',by:'Sophie Marchand',date:new Date().toLocaleDateString('fr-FR'),
    motif:document.getElementById('mbReafMotif')?document.getElementById('mbReafMotif').value.trim():'',
    val:needsVal?null:'Application directe (sous seuil)'});
  if(!needsVal){ flat[fi].l.budget-=amt; flat[ti].l.budget+=amt; }
  mbCloseReaffect();
  renderBudgetDetail(mbCurrentId);
  showToast(needsVal?fmtEur(amt)+' · demande soumise à validation (seuil '+fmtEur(seuil)+')':fmtEur(amt)+' réaffectés vers '+flat[ti].l.name);
}

/* ---- Journal & validation des réaffectations ---- */
let BR_LOG=[
 {id:'r1',bud:'b1',budName:'Budget Infrastructure 2026',from:'Infrastructure › Licences logicielles',to:'Infrastructure › Hébergement cloud',amt:32000,st:'att',by:'Karim Bensaïd',date:'24/07/2026',motif:'Surcoût de stockage lié à la reprise de données ERP.',val:null},
 {id:'r2',bud:'b1',budName:'Budget Infrastructure 2026',from:'Support › Prestations externes',to:'Cybersécurité › Audit & conformité',amt:28500,st:'att',by:'Amélie Rousseau',date:'22/07/2026',motif:'Audit cybersécurité complémentaire décidé en Comité Risques.',val:null},
 {id:'r3',bud:'b1',budName:'Budget Infrastructure 2026',from:'Projets › Refonte Portail Client',to:'Projets › Application Mobile',amt:45000,st:'val',by:'Sophie Marchand',date:'12/07/2026',motif:'Décalage du module notifications en V2.',val:'Validé par Marc Delaunay le 15/07/2026'},
 {id:'r4',bud:'b1',budName:'Budget Infrastructure 2026',from:'Infrastructure › Matériel serveurs',to:'Exploitation › Maintenance',amt:12000,st:'val',by:'Thomas Girard',date:'28/06/2026',motif:'Prolongation du contrat de maintenance.',val:'Application directe (sous seuil)'},
 {id:'r5',bud:'b1',budName:'Budget Infrastructure 2026',from:'Data & BI › Licences BI',to:'Projets › POC Data Lake',amt:60000,st:'ref',by:'Claire Dubois',date:'25/06/2026',motif:'Financement du POC Data Lake.',val:'Refusé par Isabelle Fournier — POC reporté au T1 2027'}
];
const BR_SEUIL=25000;
function brOpen(){brRender();document.getElementById('brModal').classList.add('open');}
function brClose(){document.getElementById('brModal').classList.remove('open');}
function brRender(){
 const b=MBUDGETS.find(x=>x.id===mbCurrentId);
 document.getElementById('brSub').textContent=(b?b.name+' · ':'')+'seuil de validation '+fmtEur(BR_SEUIL);
 const att=BR_LOG.filter(x=>x.st==='att'),hist=BR_LOG.filter(x=>x.st!=='att');
 const attTot=att.reduce((s,x)=>s+x.amt,0);
 const row=(x,pending)=>'<tr><td><div class="br-mv">'+x.from+'</div><div class="br-mm">→ '+x.to+'</div></td>'
  +'<td class="br-amt">'+fmtEur(mbf(x.amt))+'</td>'
  +'<td><div class="br-mv" style="font-weight:600">'+x.by+'</div><div class="br-mm">'+x.date+'</div></td>'
  +'<td><span class="br-st '+x.st+'"><i></i>'+(x.st==='att'?'À valider':x.st==='val'?'Validée':'Refusée')+'</span>'+(x.val?'<div class="br-mm">'+x.val+'</div>':'')+'</td>'
  +'<td>'+(pending?'<div class="br-act"><button class="br-b ok" onclick="brDecide(\''+x.id+'\',1)">Valider</button><button class="br-b no" onclick="brDecide(\''+x.id+'\',0)">Refuser</button></div>':'')+'</td></tr>';
 const head='<thead><tr><th style="width:34%">Mouvement</th><th style="width:15%;text-align:right">Montant</th><th style="width:17%">Demandeur</th><th style="width:20%">Statut</th><th style="width:14%"></th></tr></thead>';
 document.getElementById('brBody').innerHTML=
  '<div class="mtg-kpis" style="grid-template-columns:repeat(3,1fr);margin-bottom:18px">'
  +'<div class="mtg-kpi"><div class="l">En attente</div><div class="v" style="color:'+(att.length?'var(--brand-gold-700)':'var(--state-success)')+'">'+att.length+'</div><div class="d">'+fmtEur(mbf(attTot))+' à arbitrer</div></div>'
  +'<div class="mtg-kpi"><div class="l">Validées</div><div class="v" style="color:var(--state-success)">'+BR_LOG.filter(x=>x.st==='val').length+'</div><div class="d">Sur l\'exercice</div></div>'
  +'<div class="mtg-kpi"><div class="l">Refusées</div><div class="v">'+BR_LOG.filter(x=>x.st==='ref').length+'</div><div class="d">Tracées et motivées</div></div></div>'
  +'<div class="mtg-dsec" style="margin-top:0">Demandes en attente d\'arbitrage</div>'
  +(att.length?'<table class="br-tbl">'+head+'<tbody>'+att.map(x=>row(x,1)).join('')+'</tbody></table>':'<div class="mtg-empty">Aucune demande en attente.</div>')
  +'<div class="mtg-dsec">Journal des mouvements</div>'
  +'<table class="br-tbl">'+head+'<tbody>'+hist.map(x=>row(x,0)).join('')+'</tbody></table>'
  +'<div class="cap-note" style="margin-top:16px"><b>Règle de gouvernance.</b> Toute réaffectation d\'un montant supérieur à '+fmtEur(BR_SEUIL)+' est soumise à validation avant application. En dessous du seuil, le mouvement est appliqué immédiatement mais reste tracé au journal.</div>';
}
function brDecide(id,ok){
 const x=BR_LOG.find(r=>r.id===id); if(!x) return;
 x.st=ok?'val':'ref';
 x.val=(ok?'Validé par Marc Delaunay le ':'Refusé par Marc Delaunay le ')+new Date().toLocaleDateString('fr-FR');
 if(ok){
  const b=MBUDGETS.find(y=>y.id===mbCurrentId);
  if(b&&x.fi!=null&&x.ti!=null){const flat=mbFlatLines(b);if(flat[x.fi]&&flat[x.ti]){flat[x.fi].l.budget-=x.amt;flat[x.ti].l.budget+=x.amt;}}
 }
 brRender(); if(mbCurrentId) renderBudgetDetail(mbCurrentId);
 showToast(ok?'Réaffectation validée · '+fmtEur(mbf(x.amt)):'Réaffectation refusée');
}
