/* Budget — saisie de dépense
   Extrait de « Refonte Portail Client.html ».
   Script classique : chargé AVANT le script principal, partage la portée globale.
   Dépend des helpers globaux : fmtEur(), showToast(). */

/* ---- Saisir une dépense ---- */
let mbDepNature='engage', mbDepPre=null;
function mbFillEnvSelect(sel,b){ sel.innerHTML=b.env.map((e,i)=>'<option value="'+i+'">'+e.name+'</option>').join(''); }
function mbFillLineSelect(sel,b,ei){ sel.innerHTML=b.env[ei].lines.map((l,i)=>'<option value="'+i+'">'+l.name+'</option>').join(''); }
function mbOpenDepense(ei,li){
  const b=MBUDGETS.find(x=>x.id===mbCurrentId); if(!b) return;
  mbDepNature='engage';
  document.querySelectorAll('#mbDepModal .type-pill').forEach(p=>p.classList.toggle('sel',p.dataset.nat==='engage'));
  document.getElementById('mbDepSub').textContent=b.name+' · '+b.dir;
  const eSel=document.getElementById('mbDepEnv'); mbFillEnvSelect(eSel,b);
  if(typeof ei==='number'){ eSel.value=ei; }
  mbDepEnvChange();
  if(typeof li==='number'){ document.getElementById('mbDepLine').value=li; }
  document.getElementById('mbDepLabel').value='';
  mbDepUpdateImpact();
  document.getElementById('mbDepModal').classList.add('open');
}
function mbCloseDepense(){ document.getElementById('mbDepModal').classList.remove('open'); }
function mbOpenLineDetail(ei,li){
  const b=MBUDGETS.find(x=>x.id===mbCurrentId); if(!b) return;
  const e=b.env[ei], l=e.lines[li]; if(!l) return;
  const reste=l.budget-l.engage, dispo=l.budget-l.conso, pctE=Math.round(l.engage/l.budget*100), pctC=Math.round(l.conso/l.budget*100);
  const leng=l.engage>l.budget, dep=Math.max(0,l.prev-l.budget);
  document.getElementById('mbLineTitle').textContent=l.name;
  document.getElementById('mbLineSub').textContent=b.name+' · '+e.name;
  const row=(lbl,val,col)=>'<div style="display:flex;justify-content:space-between;align-items:center;padding:11px 0;border-bottom:1px solid var(--neutral-100)"><span style="font-size:12.5px;color:var(--neutral-600);font-weight:600">'+lbl+'</span><span style="font-size:13.5px;font-weight:700;color:'+(col||'var(--brand-ink)')+'">'+val+'</span></div>';
  document.getElementById('mbLineBody').innerHTML=
    '<div style="background:var(--neutral-50);border-radius:12px;padding:14px 16px;margin-bottom:16px">'
    +'<div style="display:flex;justify-content:space-between;font-size:11px;font-weight:700;color:var(--neutral-500);margin-bottom:6px"><span>Consommé '+pctC+'%</span><span>Engagé '+pctE+'%</span></div>'
    +'<div class="ptrack" style="height:9px"><div class="pfill '+mbPfClass(pctC)+'" style="width:'+Math.min(pctC,100)+'%"></div></div></div>'
    +row('Budget alloué',fmtEur(l.budget))
    +row('Engagé',fmtEur(l.engage),leng?'var(--state-danger)':'var(--brand-gold-700)')
    +row('Consommé',fmtEur(l.conso),'var(--state-info)')
    +row('Prévisionnel',fmtEur(l.prev),'var(--neutral-600)')
    +row('Reste à engager',fmtEur(reste),reste<0?'var(--state-danger)':'var(--state-success)')
    +row('Disponible (non consommé)',fmtEur(dispo),dispo<0?'var(--state-danger)':'var(--brand-ink)')
    +(dep>0?'<div style="margin-top:14px;font-size:12.5px;font-weight:600;color:var(--state-danger);background:color-mix(in srgb,var(--state-danger) 8%,white);border-radius:10px;padding:11px 13px">⚠ Dépassement prévisionnel de '+fmtEur(dep)+' au-delà du budget alloué.</div>':'<div style="margin-top:14px;font-size:12.5px;font-weight:600;color:var(--state-success);background:color-mix(in srgb,var(--state-success) 8%,white);border-radius:10px;padding:11px 13px">✓ Ligne dans l\'enveloppe budgétaire.</div>');
  document.getElementById('mbLineDepBtn').onclick=function(){ mbCloseLineDetail(); mbOpenDepense(ei,li); };
  document.getElementById('mbLineModal').classList.add('open');
}
function mbCloseLineDetail(){ document.getElementById('mbLineModal').classList.remove('open'); }
function mbDepNat(el){ mbDepNature=el.dataset.nat; el.parentElement.querySelectorAll('.type-pill').forEach(p=>p.classList.remove('sel')); el.classList.add('sel'); mbDepUpdateImpact(); }
function mbDepEnvChange(){ const b=MBUDGETS.find(x=>x.id===mbCurrentId); mbFillLineSelect(document.getElementById('mbDepLine'),b,+document.getElementById('mbDepEnv').value); mbDepUpdateImpact(); }
function mbDepUpdateImpact(){
  const b=MBUDGETS.find(x=>x.id===mbCurrentId); if(!b) return;
  const ei=+document.getElementById('mbDepEnv').value, li=+document.getElementById('mbDepLine').value;
  const l=b.env[ei].lines[li]; if(!l) return;
  const amt=Math.max(0,+document.getElementById('mbDepAmt').value||0);
  const nEng=mbDepNature==='engage'?l.engage+amt:Math.max(l.engage,l.conso+amt);
  const nCon=mbDepNature==='conso'?l.conso+amt:l.conso;
  const over=nEng>l.budget;
  document.getElementById('mbDepImpact').innerHTML='Ligne <b>'+l.name+'</b> — budget '+fmtEur(l.budget)+'. Après saisie : engagé '+fmtEur(nEng)+' · consommé '+fmtEur(nCon)+'. '+(over?'<span style="color:var(--state-danger);font-weight:800">⚠ Dépassement de '+fmtEur(nEng-l.budget)+'</span>':'<span style="color:var(--state-success);font-weight:700">Dans l\'enveloppe.</span>');
}
document.addEventListener('input',e=>{ if(e.target&&e.target.id==='mbDepAmt') mbDepUpdateImpact(); });
document.addEventListener('change',e=>{ if(e.target&&e.target.id==='mbDepLine') mbDepUpdateImpact(); });
function mbSaveDepense(){
  const b=MBUDGETS.find(x=>x.id===mbCurrentId); if(!b) return;
  const ei=+document.getElementById('mbDepEnv').value, li=+document.getElementById('mbDepLine').value;
  const l=b.env[ei].lines[li];
  const amt=Math.max(0,+document.getElementById('mbDepAmt').value||0);
  if(!amt){ showToast('Renseignez un montant'); return; }
  if(mbDepNature==='engage'){ l.engage+=amt; }
  else { l.conso+=amt; if(l.conso>l.engage) l.engage=l.conso; }
  mbCloseDepense();
  renderBudgetDetail(mbCurrentId);
  showToast('Dépense enregistrée · '+fmtEur(amt)+' sur '+l.name);
}
