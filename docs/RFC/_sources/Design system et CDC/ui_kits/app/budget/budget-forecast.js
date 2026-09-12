/* Budget — scénarios, versions & prévisionnel
   Extrait de « Refonte Portail Client.html ».
   Script classique : chargé AVANT le script principal, partage la portée globale.
   Dépend des helpers globaux : fmtEur(), showToast(). */

/* ---- Scénarios prévisionnels & versions budgétaires ---- */
const BSC_SC=[
 {id:'bas',name:'Bas',k:'Hypothèse prudente',f:0.94,color:'var(--state-success)',m:'Report de 2 projets non critiques, gel des recrutements externes.'},
 {id:'central',name:'Central',k:'Scénario de référence',f:1.0,color:'var(--state-info)',m:'Portefeuille tenu tel que planifié, inflation fournisseurs à 3 %.'},
 {id:'haut',name:'Haut',k:'Hypothèse de tension',f:1.11,color:'var(--state-danger)',m:'Dérive Migration ERP, audit cybersécurité élargi, renforts prestataires.'}
];
const BSC_VERS=[
 {id:'v1',n:'Budget initial 2026',m:'Voté en CODIR du 12/12/2025',lock:1,ico:'🔒'},
 {id:'v2',n:'Budget révisé S1',m:'Arbitrage du 25/06/2026 · +85 k€',lock:1,ico:'🔒'},
 {id:'v3',n:'Budget révisé S2 (en cours)',m:'Version de travail — modifiable',lock:0,ico:'✎'}
];
let bscSel='central';
function bscOpen(){bscSel='central';bscRender();document.getElementById('bscModal').classList.add('open');}
function bscClose(){document.getElementById('bscModal').classList.remove('open');}
function bscPick(id){bscSel=id;bscRender();}
function bscRender(){
 const b=MBUDGETS.find(x=>x.id===mbCurrentId)||MBUDGETS[0];
 const t=mbTot(b),budget=mbf(t.budget),base=mbf(t.prev);
 document.getElementById('bscSub').textContent=b.name+' · atterrissage projeté à fin d\'exercice';
 const cards=BSC_SC.map(s=>{const v=Math.round(base*s.f),gap=v-budget;
  return '<div class="bsc-card'+(s.id===bscSel?' sel':'')+'" onclick="bscPick(\''+s.id+'\')">'
   +'<div class="bsc-k" style="color:'+s.color+'">Scénario '+s.name+'</div>'
   +'<div class="bsc-v">'+fmtEur(v)+'</div>'
   +'<div class="bsc-d" style="color:'+(gap>0?'var(--state-danger)':'var(--state-success)')+'">'+(gap>0?'+':'')+fmtEur(gap)+' vs budget'+(gap>0?' · dépassement':' · sous budget')+'</div>'
   +'<div class="bsc-m">'+s.m+'</div></div>';}).join('');
 const rows=mbFlatLines(b).slice(0,8).map(f=>{const p=mbf(f.l.prev);
  return '<tr><td>'+f.l.name+'</td><td>'+fmtEur(mbf(f.l.budget))+'</td>'
   +BSC_SC.map(s=>{const v=Math.round(p*s.f),over=v>mbf(f.l.budget);
     return '<td style="font-weight:'+(s.id===bscSel?'800':'600')+';color:'+(over?'var(--state-danger)':(s.id===bscSel?'var(--brand-ink)':'var(--neutral-500)'))+'">'+fmtEur(v)+'</td>';}).join('')+'</tr>';}).join('');
 const vers=BSC_VERS.map(v=>'<div class="bsc-ver"><div class="bsc-vl" style="background:'+(v.lock?'var(--neutral-100)':'color-mix(in srgb,var(--brand-gold) 18%,#fff)')+'">'+v.ico+'</div>'
  +'<div style="flex:1;min-width:0"><div class="bsc-vn">'+v.n+'</div><div class="bsc-vm">'+v.m+'</div></div>'
  +'<span class="bsc-lock'+(v.lock?'':' act')+'">'+(v.lock?'Verrouillée':'Active')+'</span></div>').join('');
 document.getElementById('bscBody').innerHTML=
  '<div style="font-size:12.5px;color:var(--neutral-500);font-weight:600;margin-bottom:14px;line-height:1.55">Trois hypothèses d\'atterrissage comparées au budget alloué de <b>'+fmtEur(budget)+'</b>. Sélectionnez le scénario retenu pour l\'appliquer au prévisionnel.</div>'
  +'<div class="bsc-grid">'+cards+'</div>'
  +'<div class="mtg-dsec" style="margin-top:6px">Comparaison par ligne</div>'
  +'<table class="bs-prev"><thead><tr><th>Ligne budgétaire</th><th>Budget</th>'+BSC_SC.map(s=>'<th style="color:'+(s.id===bscSel?'var(--brand-ink)':'')+'">'+s.name+'</th>').join('')+'</tr></thead><tbody>'+rows+'</tbody></table>'
  +'<div class="mtg-dsec">Versions budgétaires</div>'+vers
  +'<div class="cap-note" style="margin-top:14px"><b>Verrouillage.</b> Une version verrouillée est figée et sert de référence de comparaison. Seule la version active accepte les saisies, imports et réaffectations.</div>';
}
function bscApply(){
 const b=MBUDGETS.find(x=>x.id===mbCurrentId); if(!b){bscClose();return;}
 const s=BSC_SC.find(x=>x.id===bscSel);
 mbFlatLines(b).forEach(f=>{f.l.prev=Math.round(f.l.prev*s.f); delete f.l.mth;});
 bscClose(); renderBudgetDetail(mbCurrentId);
 showToast('Scénario '+s.name+' appliqué au prévisionnel');
}

/* ---- Réviser le prévisionnel + calculette ---- */
let mbFcOrig=null;
let mbCalcState={lineIdx:0,base:'prev',growth:0,gran:'trimestre',method:'lineaire',step:5};
function mbOpenForecast(){
  const b=MBUDGETS.find(x=>x.id===mbCurrentId); if(!b) return;
  document.getElementById('mbFcSub').textContent=b.name+' · prévisions de fin d\'exercice '+mbYear;
  mbFcOrig=mbFlatLines(b).map(f=>f.l.prev);
  mbCalcState={lineIdx:0,base:'prev',growth:0,gran:'trimestre',method:'lineaire',step:5};
  const lineSel=document.getElementById('mbCalcLine');
  lineSel.innerHTML=mbFlatLines(b).map((f,i)=>'<option value="'+i+'">'+f.label+'</option>').join('');
  lineSel.value='0';
  document.getElementById('mbCalcBase').value='prev';
  document.getElementById('mbCalcGrowth').value='0';
  document.getElementById('mbCalcStep').value='5';
  document.getElementById('mbCalcStepWrap').style.display='none';
  mbFcRenderAll();
  document.getElementById('mbFcModal').classList.add('open');
}
function mbCloseForecast(){ document.getElementById('mbFcModal').classList.remove('open'); if(mbCurrentId) renderBudgetDetail(mbCurrentId); }
function mbFcReset(){
  const b=MBUDGETS.find(x=>x.id===mbCurrentId); if(!b||!mbFcOrig) return;
  mbFlatLines(b).forEach((f,i)=>{ f.l.prev=mbFcOrig[i]; delete f.l.mth; delete f.l.sched; });
  mbFcRenderAll();
}
function mbFcRenderAll(){ mbFcRenderSummary(); mbFcRenderList(); mbCalcRegen(); }
function mbFcTotals(){
  const b=MBUDGETS.find(x=>x.id===mbCurrentId); const t=mbTot(b); return {b,budget:t.budget,prev:t.prev,conso:t.conso};
}
function mbFcRenderSummary(){
  const T=mbFcTotals(); const gap=T.prev-T.budget;
  const cell=(k,v,col)=>'<div style="border:1px solid var(--neutral-200);border-radius:10px;padding:11px 13px;text-align:center"><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--neutral-500);margin-bottom:5px">'+k+'</div><div style="font-size:16px;font-weight:800;font-variant-numeric:tabular-nums'+(col?';color:'+col:'')+'">'+v+'</div></div>';
  document.getElementById('mbFcSummary').innerHTML=cell('Budget alloué',fmtEur(mbf(T.budget)))+cell('Prévision totale',fmtEur(mbf(T.prev)),'var(--state-info)')+cell('Écart projeté',(gap>0?'+':'')+fmtEur(mbf(gap)),gap>0?'var(--state-danger)':'var(--state-success)');
}
function mbFcRenderList(){
  const b=MBUDGETS.find(x=>x.id===mbCurrentId);
  const flat=mbFlatLines(b); flat.forEach(f=>mbEnsureMonthly(f.l));
  const M=['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Aoû','Sep','Oct','Nov','Déc'];
  let head='<tr><th>Ligne</th>'+M.map(m=>'<th>'+m+'</th>').join('')+'<th>Total</th><th>Écart</th></tr>';
  const rows=flat.map(f=>{
    const l=f.l, sum=l.mth.reduce((s,v)=>s+(+v||0),0), gap=sum-l.budget;
    const cells=l.mth.map((v,m)=>'<td><input class="mb-mth-in" type="number" inputmode="decimal" value="'+Math.round(v)+'" oninput="mbFcEditMonth('+f.ei+','+f.li+','+m+',this.value)"></td>').join('');
    return '<tr><td class="mb-mth-name" title="'+f.label+'">'+l.name+'</td>'+cells+'<td class="mb-mth-tot" id="mbrt-'+f.ei+'-'+f.li+'">'+fmtEur(mbf(sum))+'</td><td class="mb-mth-ec" id="mbre-'+f.ei+'-'+f.li+'" style="color:'+(gap>0?'var(--state-danger)':(gap<0?'var(--state-success)':'var(--neutral-400)'))+'">'+(gap>0?'+'+fmtEur(mbf(gap)):(gap<0?fmtEur(mbf(gap)):'—'))+'</td></tr>';
  }).join('');
  document.getElementById('mbFcList').innerHTML='<table class="mb-mth-table"><thead>'+head+'</thead><tbody>'+rows+'</tbody></table>';
}
function mbEnsureMonthly(l){
  if(l.mth && l.mth.length===12) return;
  const sum=MB_CURVE.reduce((a,c)=>a+c,0); let arr=[];
  for(let m=0;m<12;m++) arr.push(Math.round(l.prev*MB_CURVE[m]/sum));
  arr[11]+=l.prev-arr.reduce((a,c)=>a+c,0);
  l.mth=arr;
}
function mbFcEditMonth(ei,li,m,val){
  const b=MBUDGETS.find(x=>x.id===mbCurrentId); const l=b.env[ei].lines[li];
  l.mth[m]=Math.max(0,+val||0);
  const sum=l.mth.reduce((s,v)=>s+(+v||0),0); l.prev=sum;
  const gap=sum-l.budget;
  const rt=document.getElementById('mbrt-'+ei+'-'+li); if(rt) rt.textContent=fmtEur(mbf(sum));
  const re=document.getElementById('mbre-'+ei+'-'+li); if(re){ re.textContent=gap>0?'+'+fmtEur(mbf(gap)):(gap<0?fmtEur(mbf(gap)):'—'); re.style.color=gap>0?'var(--state-danger)':(gap<0?'var(--state-success)':'var(--neutral-400)'); }
  mbFcRenderSummary();
}
function mbCalcSet(key,val,el){
  mbCalcState[key]=(key==='growth'||key==='step'||key==='lineIdx')?(+val||0):val;
  if(el){ el.parentElement.querySelectorAll('.seg-btn').forEach(b=>b.classList.remove('active')); el.classList.add('active'); }
  if(key==='method'){ document.getElementById('mbCalcStepWrap').style.display = val==='croissance'?'':'none'; }
  mbCalcRegen();
}
function mbCalcLineRef(){
  const b=MBUDGETS.find(x=>x.id===mbCurrentId); const flat=mbFlatLines(b);
  return flat[Math.min(mbCalcState.lineIdx,flat.length-1)]||flat[0];
}
function mbCalcNb(){ return {mois:12,trimestre:4,semestre:2}[mbCalcState.gran]||4; }
function mbCalcGenerate(){
  const f=mbCalcLineRef(); const l=f.l;
  const baseVal = mbCalcState.base==='budget'?l.budget:l.prev;
  const total = Math.round(baseVal*(1+mbCalcState.growth/100));
  const n=mbCalcNb(); let parts=[];
  if(mbCalcState.method==='croissance' && mbCalcState.step!==0){
    const r=1+mbCalcState.step/100; let denom=0; for(let k=0;k<n;k++) denom+=Math.pow(r,k);
    const p0=total/denom; for(let k=0;k<n;k++) parts.push(Math.round(p0*Math.pow(r,k)));
  } else { const p=Math.round(total/n); for(let k=0;k<n;k++) parts.push(p); }
  mbCalcState.parts=parts;
}
function mbCalcRegen(){ mbCalcGenerate(); mbCalcRenderBars(); mbCalcRenderGrid(); mbCalcRenderTotal(); }
function mbCalcSum(){ return (mbCalcState.parts||[]).reduce((s,p)=>s+(+p||0),0); }
function mbCalcRenderBars(){
  const parts=mbCalcState.parts||[], labels=mbCalcLabels(parts.length), maxP=Math.max(...parts,1);
  document.getElementById('mbCalcBars').innerHTML=parts.map((p,i)=>
    '<div class="mb-fc-bcol"><div class="mb-fc-bval">'+fmtEur(mbf(Math.round(p)))+'</div><div class="mb-fc-bar" style="height:'+Math.max(4,p/maxP*100)+'%"></div><div class="mb-fc-blbl">'+labels[i]+'</div></div>'
  ).join('');
}
function mbCalcRenderGrid(){
  const parts=mbCalcState.parts||[], labels=mbCalcLabels(parts.length);
  document.getElementById('mbCalcGrid').innerHTML=parts.map((p,i)=>
    '<div class="mb-fc-cell"><div class="mb-fc-cell-l">'+labels[i]+'</div><input type="number" inputmode="decimal" value="'+Math.round(p)+'" oninput="mbCalcEditCell('+i+',this.value)"></div>'
  ).join('');
}
function mbCalcRenderTotal(){
  const f=mbCalcLineRef(), sum=mbCalcSum(), l=f.l, gap=sum-l.budget;
  const gapTxt=gap>0?'<span style="color:var(--state-danger);font-weight:800">dépassement +'+fmtEur(mbf(gap))+'</span>':(gap<0?'<span style="color:var(--state-success);font-weight:700">marge '+fmtEur(mbf(-gap))+'</span>':'équilibré');
  document.getElementById('mbCalcTotal').innerHTML='<span>Total réparti · <span style="color:var(--neutral-500);font-weight:600">budget '+fmtEur(mbf(l.budget))+' · '+gapTxt+'</span></span><span class="tt-v">'+fmtEur(mbf(sum))+'</span>';
}
function mbCalcEditCell(i,val){ mbCalcState.parts[i]=Math.max(0,+val||0); mbCalcRenderBars(); mbCalcRenderTotal(); }
function mbCalcLabels(n){
  if(n===12) return ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Aoû','Sep','Oct','Nov','Déc'];
  if(n===4) return ['T1','T2','T3','T4'];
  return ['S1','S2'];
}
function mbCalcApply(){
  const b=MBUDGETS.find(x=>x.id===mbCurrentId); if(!b) return;
  const f=mbCalcLineRef(), sum=mbCalcSum();
  const l=b.env[f.ei].lines[f.li];
  l.prev=sum;
  l.sched={gran:mbCalcState.gran,parts:mbCalcState.parts.slice()};
  l.mth=mbToMonthly(mbCalcState.parts, mbCalcNb());
  mbFcRenderSummary(); mbFcRenderList(); mbCalcRenderTotal();
  showToast('Prévisionnel appliqué · '+f.label+' → '+fmtEur(mbf(sum)));
}
function mbToMonthly(parts,n){
  if(n===12) return parts.map(p=>Math.round(p));
  const per=12/n, out=[];
  parts.forEach(p=>{ const each=Math.round(p/per); for(let k=0;k<per;k++) out.push(each); });
  return out;
}
