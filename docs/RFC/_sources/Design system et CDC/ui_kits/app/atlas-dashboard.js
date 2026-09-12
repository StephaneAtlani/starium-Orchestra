/* ============================================================
   STARIUM ATLAS — Dashboard
   ============================================================ */

function atShowDashboard(){
  state.view='dashboard';
  document.getElementById('dashboard').classList.add('open');
  document.getElementById('btn-dashboard').classList.add('on');
  renderDashboard();
}
function atShowGraph(){
  state.view='graph';
  document.getElementById('dashboard').classList.remove('open');
  document.getElementById('btn-dashboard').classList.remove('on');
}

function dbPill(label,color,bg){ return `<span class="db-row-pill" style="background:${bg};color:${color}">${label}</span>`; }

function renderDashboard(){
  const apps = NODES.filter(n=>n.type==='application');
  const procs = NODES.filter(n=>n.type==='processus');
  const fournisseurs = NODES.filter(n=>n.type==='fournisseur');
  const criticalFlows = EDGES.filter(e=>e.crit==='critique' || !e.secure);
  const insecureFlows = EDGES.filter(e=>!e.secure);
  const exposedApps = NODES.filter(n=>(n.badges||[]).includes('internet'));
  const orphanOwners = NODES.filter(n=>!n.ownerBiz && !n.ownerTech);
  const criticalRisks = Object.entries(RISKS).flatMap(([id,rs])=>rs.filter(r=>r.niveau==='critique').map(r=>({id,...r})));
  const ssiGaps = Object.entries(COMPLIANCE).flatMap(([id,cs])=>cs.filter(c=>c.type==='ssi').map(c=>({id,...c})));
  const rgpdGaps = Object.entries(COMPLIANCE).flatMap(([id,cs])=>cs.filter(c=>c.type==='rgpd').map(c=>({id,...c})));
  const lateActions = Object.entries(ACTIONS).flatMap(([id,as])=>as.filter(a=>a.statut==='En retard').map(a=>({id,...a})));
  const expectedDecisions = Object.entries(ACTIONS).flatMap(([id,as])=>as.filter(a=>a.type==='decision').map(a=>({id,...a})));

  const kpis = [
    {label:'Objets cartographiés', val:NODES.length, sub:'toutes catégories'},
    {label:'Applications', val:apps.length, sub:apps.filter(a=>a.crit==='critique').length+' critiques'},
    {label:'Processus', val:procs.length, sub:procs.filter(p=>p.crit==='elevee'||p.crit==='critique').length+' à forte criticité'},
    {label:'Flux cartographiés', val:EDGES.length, sub:criticalFlows.length+' critiques'},
    {label:'Flux non sécurisés', val:insecureFlows.length, sub:'à traiter en priorité', color:DANGER},
    {label:'Applications exposées internet', val:exposedApps.length, sub:'accès public', color:DANGER},
    {label:'Objets sans propriétaire', val:orphanOwners.length, sub:'fiche à compléter'},
    {label:'Risques critiques', val:criticalRisks.length, sub:'ouverts', color:DANGER},
    {label:'Écarts SSI', val:ssiGaps.length, sub:'contrôles en écart'},
    {label:'Écarts RGPD', val:rgpdGaps.length, sub:'traitements à documenter'},
    {label:'Actions en retard', val:lateActions.length, sub:'à traiter', color:DANGER},
    {label:'Décisions CODIR attendues', val:expectedDecisions.length, sub:'arbitrage requis', color:'var(--gold)'}
  ];

  const topApps = [...apps].sort((a,b)=>critRank(b.crit)-critRank(a.crit)).slice(0,10);
  const obsoleteOnCritical = apps.filter(a=>a.completeness<60 && EDGES.some(e=>e.t===a.id && e.flow==='metier' && ['critique','elevee'].includes((NODE_BY_ID[e.s]||{}).crit)));

  document.getElementById('dashboard').innerHTML = `
    <div class="db-maxw">
      <button class="tb-back" style="margin-bottom:18px" onclick="atShowGraph()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg></button>
      <div class="db-head"><div class="db-h1">Dashboard Atlas</div><div class="db-sub">Vue consolidée de la cartographie — ce qui est critique, fragile ou non conforme.</div></div>
      <div class="db-kpis">${kpis.map(k=>`<div class="db-kpi"><div class="db-kpi-label">${k.label}</div><div class="db-kpi-val mono" style="${k.color?'color:'+k.color:''}">${k.val}</div><div class="db-kpi-sub">${k.sub}</div></div>`).join('')}</div>

      <div class="db-grid2">
        <div class="db-block">
          <div class="db-block-h"><span class="db-block-title">Top applications critiques</span><span class="db-block-count">${topApps.length}</span></div>
          ${topApps.map(a=>dbRow(a, CRIT_META[a.crit])).join('') || '<div class="db-empty-row">Aucune application.</div>'}
        </div>
        <div class="db-block">
          <div class="db-block-h"><span class="db-block-title">Flux critiques non sécurisés</span><span class="db-block-count">${insecureFlows.length}</span></div>
          ${insecureFlows.map(e=>{
            const s=NODE_BY_ID[e.s], t=NODE_BY_ID[e.t];
            return `<div class="db-row"><div class="db-row-ico" style="background:rgba(229,86,74,.16)"><svg viewBox="0 0 24 24" fill="none" stroke="${DANGER}" stroke-width="2" stroke-linecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/></svg></div><div class="db-row-name">${s.name} → ${t.name}</div><div class="db-row-meta">${e.mode}</div>${dbPill('Non sécurisé',DANGER,'rgba(229,86,74,.16)')}</div>`;
          }).join('') || '<div class="db-empty-row">Aucun flux non sécurisé détecté.</div>'}
        </div>
      </div>

      <div class="db-grid2">
        <div class="db-block">
          <div class="db-block-h"><span class="db-block-title">Applications fragiles sur un processus critique</span><span class="db-block-count">${obsoleteOnCritical.length}</span></div>
          ${obsoleteOnCritical.map(a=>dbRow(a, {label:'Fiche '+a.completeness+'%', color:'var(--gold)'})).join('') || '<div class="db-empty-row">Aucune application concernée.</div>'}
        </div>
        <div class="db-block">
          <div class="db-block-h"><span class="db-block-title">Fournisseurs critiques</span><span class="db-block-count">${fournisseurs.filter(f=>['critique','elevee'].includes(f.crit)).length}</span></div>
          ${fournisseurs.filter(f=>['critique','elevee'].includes(f.crit)).map(f=>dbRow(f, CRIT_META[f.crit])).join('') || '<div class="db-empty-row">Aucun fournisseur critique.</div>'}
        </div>
      </div>

      <div class="db-grid2">
        <div class="db-block">
          <div class="db-block-h"><span class="db-block-title">Écarts SSI / RGPD sans action corrective</span><span class="db-block-count">${[...ssiGaps,...rgpdGaps].filter(g=>!g.action).length}</span></div>
          ${[...ssiGaps,...rgpdGaps].filter(g=>!g.action).map(g=>`<div class="db-row"><div class="db-row-name">${NODE_BY_ID[g.id].name}</div><div class="db-row-meta">${g.exigence}</div></div>`).join('') || '<div class="db-empty-row">Tous les écarts ont une action corrective associée.</div>'}
        </div>
        <div class="db-block">
          <div class="db-block-h"><span class="db-block-title">Décisions CODIR attendues</span><span class="db-block-count">${expectedDecisions.length}</span></div>
          ${expectedDecisions.map(d=>`<div class="db-row"><div class="db-row-ico" style="background:rgba(63,190,132,.16)"><svg viewBox="0 0 24 24" fill="none" stroke="#3FBE84" stroke-width="2" stroke-linecap="round"><polyline points="22 4 12 14.01 9 11.01"/></svg></div><div><div class="db-row-name">${d.title}</div><div class="db-row-meta">${NODE_BY_ID[d.id].name} · échéance ${fmt(d.echeance)}</div></div>${dbPill('Arbitrage CODIR','var(--gold)','rgba(232,163,23,.16)')}</div>`).join('') || '<div class="db-empty-row">Aucune décision en attente.</div>'}
        </div>
      </div>
    </div>
  `;
}
function critRank(c){ return {critique:4,elevee:3,moyenne:2,faible:1}[c]||0; }
function dbRow(n, pill){
  const tm = TYPE_META[n.type];
  return `<div class="db-row" onclick="atShowGraph();atSelect('${n.id}')" style="cursor:pointer">
    <div class="db-row-ico" style="background:${tm.bg}"><svg viewBox="0 0 24 24" fill="none" stroke="${tm.color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${tm.icon}</svg></div>
    <div class="db-row-name">${n.name}</div>
    <div class="db-row-meta">${n.ownerTech||n.ownerBiz||''}</div>
    ${dbPill(pill.label, pill.color, pill.bg||'rgba(255,255,255,.06)')}
  </div>`;
}
