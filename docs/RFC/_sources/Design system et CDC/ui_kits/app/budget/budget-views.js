/* Budget — accueil, détail, tableau, export
   Extrait de « Refonte Portail Client.html ».
   Script classique : chargé AVANT le script principal, partage la portée globale.
   Dépend des helpers globaux : fmtEur(), showToast(). */

/* ---- ACCUEIL ---- */
function mbShowHome(){
  mbCurrentId=null;
  document.getElementById('budgets-detail').style.display='none';
  document.getElementById('budgets-home').style.display='';
  renderBudgetsHome();
}
function mbSetYear(y,el){
  mbYear=y; mbCurMonth = y==='2024'?12:9;
  if(el){ el.parentElement.querySelectorAll('.seg-btn').forEach(b=>b.classList.remove('active')); el.classList.add('active'); }
  if(mbCurrentId) renderBudgetDetail(mbCurrentId); else renderBudgetsHome();
}
function mbSetHomeView(v,el){
  mbHomeView=v;
  if(el){ el.parentElement.querySelectorAll('.seg-btn').forEach(b=>b.classList.remove('active')); el.classList.add('active'); }
  document.getElementById('mb-cardgrid').style.display = v==='cards'?'':'none';
  document.getElementById('mb-table').style.display = v==='table'?'':'none';
}
function renderBudgetsHome(){
  let gB=0,gE=0,gC=0,gDep=0,alerts=0;
  MBUDGETS.forEach(b=>{const t=mbTot(b);gB+=t.budget;gE+=t.engage;gC+=t.conso;gDep+=t.dep;if(t.conso/t.budget>=0.85||t.dep>0)alerts++;});
  gB=mbf(gB);gE=mbf(gE);gC=mbf(gC);gDep=mbf(gDep);
  const cons=document.getElementById('mb-consol');
  if(cons) cons.innerHTML=
    '<div class="mb-cons-cell lead"><div class="mb-cons-k" style="opacity:.8">Budget consolidé '+mbYear+'</div><div class="mb-cons-v">'+fmtEur(gB)+'</div><div class="mb-cons-sub">'+MBUDGETS.length+' budgets · '+Math.round(gC/gB*100)+'% consommé</div><div class="mb-cons-bar"><i style="width:'+Math.round(gC/gB*100)+'%"></i></div></div>'
    +'<div class="mb-cons-cell"><div class="mb-cons-k">Engagé</div><div class="mb-cons-v" style="color:var(--brand-gold-700)">'+fmtEur(gE)+'</div><div class="mb-cons-sub">'+Math.round(gE/gB*100)+'% du budget</div></div>'
    +'<div class="mb-cons-cell"><div class="mb-cons-k">Consommé</div><div class="mb-cons-v" style="color:var(--state-info)">'+fmtEur(gC)+'</div><div class="mb-cons-sub">'+Math.round(gC/gB*100)+'% du budget</div></div>'
    +'<div class="mb-cons-cell"><div class="mb-cons-k">Dépassement projeté</div><div class="mb-cons-v" style="color:'+(gDep>0?'var(--state-danger)':'var(--brand-ink)')+'">'+(gDep>0?'+'+fmtEur(gDep):'—')+'</div><div class="mb-cons-sub">tous budgets confondus</div></div>'
    +'<div class="mb-cons-cell"><div class="mb-cons-k">Budgets en alerte</div><div class="mb-cons-v" style="color:'+(alerts>0?'var(--state-danger)':'var(--state-success)')+'">'+alerts+' / '+MBUDGETS.length+'</div><div class="mb-cons-sub">seuil 85% ou dépassement</div></div>';
  const grid=document.getElementById('mb-cardgrid');
  if(!grid) return;
  grid.innerHTML=MBUDGETS.map(b=>{
    const t=mbTot(b), ac=MB_ACCENT[b.color], pct=Math.round(t.conso/t.budget*100);
    const alert=(pct>=85||t.dep>0);
    const kind=t.capex&&t.opex?'Mixte':(t.capex?'CAPEX':'OPEX');
    const kindCol=kind==='CAPEX'?'var(--state-info)':(kind==='OPEX'?'var(--purple)':'var(--brand-gold-700)');
    const kindBg=kind==='CAPEX'?'var(--state-info-bg)':(kind==='OPEX'?'var(--purple-bg)':'var(--brand-gold-050)');
    return '<div class="mb-card" onclick="openBudget(\''+b.id+'\')">'
      +'<div class="mb-card-top"><div class="mb-card-ico" style="background:'+ac[0]+';color:'+ac[1]+'"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">'+MB_ICO[b.ico]+'</svg></div><div class="mb-card-tt"><div class="mb-card-name">'+b.name+'</div><div class="mb-card-dir">'+b.dir+'</div></div><span class="mb-card-type" style="background:'+kindBg+';color:'+kindCol+'">'+kind+'</span></div>'
      +'<div class="mb-card-total">Budget alloué<br><b>'+fmtEur(mbf(t.budget))+'</b></div>'
      +'<div class="mb-card-track"><i style="width:'+Math.min(pct,100)+'%;background:'+mbBarColor(pct)+'"></i></div>'
      +'<div style="display:flex;justify-content:space-between;font-size:11px;font-weight:700"><span style="color:var(--neutral-500)">Consommé '+pct+'%</span><span style="color:var(--neutral-500)">Reste '+fmtEur(mbf(t.budget-t.engage))+'</span></div>'
      +'<div class="mb-card-foot"><div>'+(alert?'<span class="mb-card-alert"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/></svg>'+(t.dep>0?'Dépassement +'+fmtEur(mbf(t.dep)):'Seuil d\'alerte')+'</span>':'<span class="mb-card-foot mcf-k" style="color:var(--state-success);font-weight:700">Sous contrôle</span>')+'</div><span class="mb-card-arrow">Ouvrir<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg></span></div>'
      +'</div>';
  }).join('');
  // ---- vue tableau ----
  document.getElementById('mb-cardgrid').style.display = mbHomeView==='cards'?'':'none';
  document.getElementById('mb-table').style.display = mbHomeView==='table'?'':'none';
  const tbody=document.getElementById('mb-table-body');
  if(tbody){
    let sB=0,sE=0,sC=0;
    tbody.innerHTML=MBUDGETS.map(b=>{
      const t=mbTot(b), ac=MB_ACCENT[b.color], pct=Math.round(t.conso/t.budget*100);
      sB+=mbf(t.budget);sE+=mbf(t.engage);sC+=mbf(t.conso);
      const alert=(pct>=90||t.dep>0), warn=(pct>=85&&pct<90);
      const kind=t.capex&&t.opex?'Mixte':(t.capex?'CAPEX':'OPEX');
      const etat=alert?'<span class="badge bdg-danger">Alerte</span>':(warn?'<span class="badge bdg-warn">À surveiller</span>':'<span class="badge bdg-success">Sain</span>');
      return '<tr class="cat-row" onclick="openBudget(\''+b.id+'\')"><td><div class="bcat"><div class="bcat-ico" style="background:'+ac[0]+';color:'+ac[1]+'"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">'+MB_ICO[b.ico]+'</svg></div><div><div class="cell-strong">'+b.name+'</div><div class="cell-sub">'+b.dir+'</div></div></div></td>'
        +'<td><span class="badge bdg-neutral nodot">'+kind+'</span></td>'
        +'<td class="num">'+fmtEur(mbf(t.budget))+'</td>'
        +'<td class="num" style="color:var(--brand-gold-700);font-weight:600">'+fmtEur(mbf(t.engage))+'</td>'
        +'<td class="num" style="color:var(--state-info);font-weight:700">'+fmtEur(mbf(t.conso))+'</td>'
        +'<td class="num">'+fmtEur(mbf(t.budget-t.engage))+'</td>'
        +'<td><div class="prog-cell" style="min-width:100px"><div class="ptrack"><div class="pfill '+mbPfClass(pct)+'" style="width:'+Math.min(pct,100)+'%"></div></div><span class="prog-pct"'+(pct>=90?' style="color:var(--state-danger)"':'')+'>'+pct+'%</span></div></td>'
        +'<td class="right">'+etat+'</td></tr>';
    }).join('');
    const spct=sB?Math.round(sC/sB*100):0;
    document.getElementById('mb-table-foot').innerHTML='<tr style="border-top:2px solid var(--neutral-200)"><td style="padding:14px 16px;font-weight:800;color:var(--brand-ink)">Total consolidé</td><td></td><td class="num" style="font-weight:800">'+fmtEur(sB)+'</td><td class="num" style="font-weight:800;color:var(--brand-gold-700)">'+fmtEur(sE)+'</td><td class="num" style="font-weight:800;color:var(--state-info)">'+fmtEur(sC)+'</td><td class="num" style="font-weight:800">'+fmtEur(sB-sE)+'</td><td style="font-weight:800">'+spct+'%</td><td></td></tr>';
  }
}

/* ---- DÉTAIL ---- */
function openBudget(id){
  mbCurrentId=id; mbFilter='all';
  document.getElementById('budgets-home').style.display='none';
  document.getElementById('budgets-detail').style.display='';
  document.querySelector('.page-content').scrollTop=0;
  document.getElementById('breadcrumb').innerHTML='<a onclick="showView(\'list\')">Pilotage financier</a><span class="bc-sep">/</span><a onclick="mbShowHome()">Budgets</a><span class="bc-sep">/</span><span class="bc-current">'+MBUDGETS.find(b=>b.id===id).name+'</span>';
  renderBudgetDetail(id);
}
function mbMonthly(b){
  const t=mbTot(b), sumAll=MB_CURVE.reduce((a,c)=>a+c,0);
  let sumUp=0; for(let m=0;m<mbCurMonth;m++) sumUp+=MB_CURVE[m];
  const prev=MB_CURVE.map(c=>mbf(t.budget)*c/sumAll);
  const real=MB_CURVE.map((c,m)=>m<mbCurMonth?mbf(t.conso)*c/sumUp:0);
  return {prev,real};
}
function mbSetFilter(f,el){
  mbFilter=f;
  el.parentElement.querySelectorAll('.seg-btn').forEach(b=>b.classList.remove('active')); el.classList.add('active');
  mbRenderTable();
}
function renderBudgetDetail(id){
  const b=MBUDGETS.find(x=>x.id===id); if(!b) return;
  const t=mbTot(b), ac=MB_ACCENT[b.color];
  const pct=Math.round(t.conso/t.budget*100), engPct=Math.round(t.engage/t.budget*100);
  const reste=t.budget-t.engage;
  const kind=t.capex&&t.opex?'Mixte':(t.capex?'CAPEX':'OPEX');
  const options=MBUDGETS.map(x=>'<option value="'+x.id+'"'+(x.id===id?' selected':'')+'>'+x.name+'</option>').join('');
  const kpi=(k,v,sub,col,bar,barcol)=>'<div class="mb-kpi"><div class="mb-kpi-k">'+k+'</div><div class="mb-kpi-v"'+(col?' style="color:'+col+'"':'')+'>'+v+'</div>'+(sub?'<div class="mb-kpi-sub" style="color:'+(col||'var(--neutral-500)')+'">'+sub+'</div>':'')+(bar!=null?'<div class="mb-kpi-bar"><i style="width:'+Math.min(bar,100)+'%;background:'+(barcol||'var(--state-info)')+'"></i></div>':'')+'</div>';
  const m=mbMonthly(b), maxM=Math.max(...m.prev,...m.real,1);
  const chart=MB_MONTHS.map((mo,i)=>{
    const over=m.real[i]>m.prev[i]*1.02;
    return '<div class="mb-mcol"><div class="mb-mbars"><div class="mb-mbar prev" style="height:'+(m.prev[i]/maxM*100)+'%" title="Prévu '+fmtEur(Math.round(m.prev[i]))+'"></div><div class="mb-mbar real'+(over?' over':'')+'" style="height:'+(m.real[i]/maxM*100)+'%" title="Réalisé '+fmtEur(Math.round(m.real[i]))+'"></div></div><div class="mb-mlabel">'+mo+'</div></div>';
  }).join('');
  // recommandations
  const recos=mbRecos(b,t);
  const html=
    '<div><span class="mb-back" onclick="mbShowHome()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><polyline points="15 18 9 12 15 6"/></svg>Tous les budgets</span></div>'
    +'<div class="mb-detail-head"><div class="mb-title-row"><div class="mb-title-ico" style="background:'+ac[0]+';color:'+ac[1]+'"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">'+MB_ICO[b.ico]+'</svg></div><div><div class="mb-title-h">'+b.name+'</div><div class="mb-title-sub">'+b.dir+' · exercice '+mbYear+' · '+kind+'</div></div></div>'
    +'<div class="mb-switch"><select class="nselect" onchange="openBudget(this.value)">'+options+'</select>'
    +'<button class="mb-act-btn" onclick="mbExport()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Exporter</button>'
    +'<button class="mb-act-btn" onclick="bsOpenSources()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>Sources</button>'
    +'<button class="mb-act-btn" onclick="bscOpen()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><path d="M3 3v18h18"/><polyline points="7 14 11 10 15 13 20 7"/></svg>Scénarios</button>'
    +'<button class="mb-act-btn" onclick="mbOpenForecast()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><path d="M3 3v18h18"/><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/><path d="M12 20h9"/></svg>Prévisionnel</button>'
    +'<button class="mb-act-btn" onclick="brOpen()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>Réaffectations'+(BR_LOG.filter(x=>x.st==='att').length?' <span style="background:var(--brand-gold);color:#fff;font-size:9.5px;font-weight:800;padding:2px 6px;border-radius:999px;margin-left:4px">'+BR_LOG.filter(x=>x.st==='att').length+'</span>':'')+'</button>'
    +'<button class="mb-act-btn primary" onclick="mbOpenDepense()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Saisir une dépense</button></div></div>'
    +'<div class="mb-filters"><div class="seg-toggle"><button class="seg-btn active" onclick="mbSetYear(\'2025\',this)"'+(mbYear==='2025'?'':'')+'>2025</button><button class="seg-btn'+(mbYear==='2024'?' active':'')+'" onclick="mbSetYear(\'2024\',this)">2024</button></div>'
    +'<div class="seg-toggle"><button class="seg-btn'+(mbFilter==='all'?' active':'')+'" onclick="mbSetFilter(\'all\',this)">Tout</button><button class="seg-btn'+(mbFilter==='CAPEX'?' active':'')+'" onclick="mbSetFilter(\'CAPEX\',this)">CAPEX</button><button class="seg-btn'+(mbFilter==='OPEX'?' active':'')+'" onclick="mbSetFilter(\'OPEX\',this)">OPEX</button></div></div>'
    +'<div class="mb-detail-kpis">'
    +kpi('Alloué',fmtEur(mbf(t.budget)),kind,'var(--brand-ink)',100,'var(--neutral-300)')
    +kpi('Engagé',fmtEur(mbf(t.engage)),engPct+'%','var(--brand-gold-700)',engPct,'var(--brand-gold)')
    +kpi('Consommé',fmtEur(mbf(t.conso)),pct+'%','var(--state-info)',pct,'var(--state-info)')
    +kpi('Reste à engager',fmtEur(mbf(reste)),Math.round(reste/t.budget*100)+'% dispo','var(--state-success)',Math.round(reste/t.budget*100),'var(--state-success)')
    +kpi('Dépassement',t.dep>0?'+'+fmtEur(mbf(t.dep)):'—',t.dep>0?'prévision > budget':'maîtrisé',t.dep>0?'var(--state-danger)':'var(--state-success)',null)
    +kpi('Taux d\'exécution',pct+'%',pct>=90?'tension':'nominal',pct>=90?'var(--state-danger)':'var(--brand-ink)',null)
    +'</div>'
    +'<div class="mb-grid2"><div class="card" style="padding:18px"><div class="bo-head" style="margin-bottom:4px"><span class="bo-title">Réalisé vs prévu par mois</span><div class="gantt-legend" style="padding:0"><div class="gantt-leg"><span class="gantt-leg-dot" style="background:var(--neutral-200)"></span>Prévu</div><div class="gantt-leg"><span class="gantt-leg-dot" style="background:var(--state-info)"></span>Réalisé</div></div></div><div class="mb-mchart">'+chart+'</div></div>'
    +'<div class="mb-analysis"><div class="mb-an-h"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15A2.5 2.5 0 0 0 14.5 22"/><path d="M3 7h4M3 12h4M3 17h4"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5"/><path d="M17 7h4M17 12h4M17 17h4"/></svg>Analyse & recommandations</div>'+recos+'</div></div>'
    +'<div class="card tablecard"><div class="table-wrap"><table class="dt"><thead><tr><th>Enveloppe / ligne budgétaire</th><th>Budget</th><th>Engagé</th><th>Consommé</th><th>Prévision</th><th>Dépassement</th><th>Exécution</th></tr></thead><tbody id="mb-tbody"></tbody><tfoot id="mb-tfoot"></tfoot></table></div><div style="padding:12px 16px;border-top:1px solid var(--neutral-100);font-size:11.5px;color:var(--neutral-400);display:flex;align-items:center;gap:6px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" width="13" height="13"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>Cliquez sur une enveloppe pour déplier ses lignes · une ligne pour y saisir une dépense · « Prévisionnel » pour réviser les prévisions de fin d’exercice.</div></div>';
  document.getElementById('budgets-detail').innerHTML=html;
  mbRenderTable();
}
function mbRecos(b,t){
  const out=[];
  // lignes en dépassement
  const depLines=[];
  b.env.forEach(e=>e.lines.forEach(l=>{ if(l.prev>l.budget) depLines.push({env:e.name,name:l.name,gap:l.prev-l.budget}); }));
  depLines.sort((a,x)=>x.gap-a.gap);
  if(depLines.length){
    const d=depLines[0];
    out.push(['red','<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/>','<b>'+d.name+'</b> ('+d.env+') dépasse son budget de '+fmtEur(mbf(d.gap))+'. '+(depLines.length>1?depLines.length+' lignes en dépassement au total.':'')+' Réaffectez depuis une ligne sous-consommée.','Réaffecter le budget','mbOpenReaffect()']);
  }
  // ligne sous-consommée -> source
  let under=null; b.env.forEach(e=>e.lines.forEach(l=>{ const r=l.budget-l.engage; if(r>0 && (!under||r>under.r)) under={name:l.name,r:r}; }));
  if(under && under.r>0){
    out.push(['green','<polyline points="20 6 9 17 4 12"/>','<b style="color:var(--state-success)">'+under.name+'</b> dispose de '+fmtEur(mbf(under.r))+' de marge non engagée — mobilisable pour absorber les dépassements ou financer une priorité.','Saisir une dépense','mbOpenDepense()']);
  }
  // exécution
  const pct=Math.round(t.conso/t.budget*100);
  if(pct<55 && mbCurMonth>=9){
    out.push(['gold','<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>','Taux d\'exécution de seulement <b style="color:var(--brand-gold-700)">'+pct+'%</b> à '+mbCurMonth+' mois écoulés — risque de sous-consommation en fin d\'exercice. Anticipez les engagements du T4.',null,null]);
  } else {
    out.push(['blue','<line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>','Exécution à <b style="color:var(--state-info)">'+pct+'%</b>, prévision de fin d\'exercice à '+fmtEur(mbf(t.prev))+' pour '+fmtEur(mbf(t.budget))+' alloués — écart '+(t.budget-t.prev>=0?'favorable de '+fmtEur(mbf(t.budget-t.prev)):'défavorable de '+fmtEur(mbf(t.prev-t.budget)))+'.',null,null]);
  }
  return out.map(r=>{const ac=MB_ACCENT[r[0]];return '<div class="mb-reco"><div class="mb-reco-ico" style="background:'+ac[0]+';color:'+ac[1]+'"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">'+r[1]+'</svg></div><div class="mb-reco-b"><div class="mb-reco-t">'+r[2]+'</div>'+(r[3]?'<span class="mb-reco-a" onclick="'+r[4]+'">'+r[3]+'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg></span>':'')+'</div></div>';}).join('');
}
function mbRenderTable(){
  const b=MBUDGETS.find(x=>x.id===mbCurrentId); if(!b) return;
  const tb=document.getElementById('mb-tbody'); if(!tb) return;
  let html='', tB=0,tE=0,tC=0,tP=0,tDep=0;
  b.env.forEach((e,ei)=>{
    if(mbFilter!=='all' && e.type!==mbFilter) return;
    const et=mbEnvTot(e), pct=Math.round(et.conso/et.budget*100);
    tB+=et.budget;tE+=et.engage;tC+=et.conso;tP+=et.prev;tDep+=et.dep;
    const tCol=e.type==='CAPEX'?['var(--state-info-bg)','var(--state-info)']:['var(--purple-bg)','var(--purple)'];
    html+='<tr class="cat-row" onclick="mbToggleEnv('+ei+')"><td><div class="mb-env-name"><span class="cat-chevron"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg></span>'+e.name+'<span class="mb-env-type" style="background:'+tCol[0]+';color:'+tCol[1]+'">'+e.type+'</span></div></td>'
      +'<td class="num">'+fmtEur(mbf(et.budget))+'</td>'
      +'<td class="num" style="color:var(--brand-gold-700);font-weight:600">'+fmtEur(mbf(et.engage))+'</td>'
      +'<td class="num" style="color:var(--state-info);font-weight:700">'+fmtEur(mbf(et.conso))+'</td>'
      +'<td class="num" style="color:var(--neutral-600);font-weight:600">'+fmtEur(mbf(et.prev))+'</td>'
      +'<td class="num">'+(et.dep>0?'<span class="dep-pos">+'+fmtEur(mbf(et.dep))+'</span>':'<span class="dep-none">—</span>')+'</td>'
      +'<td><div class="prog-cell" style="min-width:100px"><div class="ptrack"><div class="pfill '+mbPfClass(pct)+'" style="width:'+Math.min(pct,100)+'%"></div></div><span class="prog-pct"'+(pct>=90?' style="color:var(--state-danger)"':'')+'>'+pct+'%</span></div></td></tr>';
    e.lines.forEach((l,li)=>{
      const ldep=Math.max(0,l.prev-l.budget), lpct=Math.round(l.conso/l.budget*100), leng=l.engage>l.budget;
      html+='<tr class="mb-line-row" data-env="'+ei+'" style="display:none;cursor:pointer" onclick="mbOpenLineDetail('+ei+','+li+')"><td><span class="mb-line-name">'+l.name+(leng?' <span class="badge bdg-danger" style="margin-left:4px">Engagé &gt; budget</span>':'')+'</span></td>'
        +'<td class="num">'+fmtEur(mbf(l.budget))+'</td>'
        +'<td class="num" style="font-weight:600;color:'+(leng?'var(--state-danger)':'var(--brand-gold-700)')+'">'+fmtEur(mbf(l.engage))+'</td>'
        +'<td class="num" style="color:var(--state-info)">'+fmtEur(mbf(l.conso))+'</td>'
        +'<td class="num" style="color:var(--neutral-600)">'+fmtEur(mbf(l.prev))+'</td>'
        +'<td class="num">'+(ldep>0?'<span class="dep-pos">+'+fmtEur(mbf(ldep))+'</span>':'<span class="dep-none">—</span>')+'</td>'
        +'<td><div class="prog-cell" style="min-width:100px"><div class="ptrack"><div class="pfill '+mbPfClass(lpct)+'" style="width:'+Math.min(lpct,100)+'%"></div></div><span class="prog-pct"'+(lpct>=90?' style="color:var(--state-danger)"':'')+'>'+lpct+'%</span></div></td></tr>';
    });
  });
  tb.innerHTML=html;
  const tpct=tB?Math.round(tC/tB*100):0;
  document.getElementById('mb-tfoot').innerHTML='<tr style="border-top:2px solid var(--neutral-200)"><td style="padding:14px 16px;font-weight:800;color:var(--brand-ink)">Total'+(mbFilter!=='all'?' '+mbFilter:'')+'</td><td class="num" style="font-weight:800">'+fmtEur(mbf(tB))+'</td><td class="num" style="font-weight:800;color:var(--brand-gold-700)">'+fmtEur(mbf(tE))+'</td><td class="num" style="font-weight:800;color:var(--state-info)">'+fmtEur(mbf(tC))+'</td><td class="num" style="font-weight:800;color:var(--neutral-600)">'+fmtEur(mbf(tP))+'</td><td class="num" style="font-weight:800">'+(tDep>0?'<span class="dep-pos">+'+fmtEur(mbf(tDep))+'</span>':'—')+'</td><td style="font-weight:800">'+tpct+'%</td></tr>';
}
function mbToggleEnv(ei){
  const rows=document.querySelectorAll('#mb-tbody .cat-row');
  let idx=-1, target=null;
  document.querySelectorAll('#mb-tbody tr').forEach(r=>{});
  // find the cat-row whose onclick matches ei
  rows.forEach(r=>{ if(r.getAttribute('onclick')==='mbToggleEnv('+ei+')') target=r; });
  if(!target) return;
  target.classList.toggle('open');
  const open=target.classList.contains('open');
  document.querySelectorAll('#mb-tbody .mb-line-row[data-env="'+ei+'"]').forEach(r=>r.style.display=open?'':'none');
}
function mbExport(){
  const b=MBUDGETS.find(x=>x.id===mbCurrentId); if(!b) return;
  let csv='Enveloppe;Ligne;Type;Budget;Engagé;Consommé;Prévision;Dépassement\n';
  b.env.forEach(e=>e.lines.forEach(l=>{csv+=[e.name,l.name,e.type,mbf(l.budget),mbf(l.engage),mbf(l.conso),mbf(l.prev),Math.max(0,mbf(l.prev)-mbf(l.budget))].join(';')+'\n';}));
  mbDownloadCsv(csv, b.id+'-'+mbYear+'.csv');
  showToast('Budget « '+b.name+' » exporté ('+mbYear+')');
}
function mbExportAll(){
  let csv='Budget;Direction;Budget;Engagé;Consommé;Dépassement\n';
  MBUDGETS.forEach(b=>{const t=mbTot(b);csv+=[b.name,b.dir,mbf(t.budget),mbf(t.engage),mbf(t.conso),mbf(t.dep)].join(';')+'\n';});
  mbDownloadCsv(csv,'budgets-consolide-'+mbYear+'.csv');
  showToast('Budget consolidé exporté ('+mbYear+')');
}
function mbDownloadCsv(csv,name){
  try{ const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),1000); }catch(e){}
}
