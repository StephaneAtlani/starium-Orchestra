/* ============================================================
   STARIUM ATLAS — moteur du prototype
   ============================================================ */

const FLOW_COLOR = {applicatif:'#2A6FDB', metier:'#6B2FB2', technique:'#6E7685', fournisseur:'#C1660A'};
const DANGER = '#B42318';

const BADGE_META = {
  risque:    {icon:'<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>', color:DANGER, bg:'rgba(229,86,74,.18)', label:'Risque critique', layer:'risques'},
  ssi:       {icon:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>', color:'#E8A317', bg:'rgba(232,163,23,.18)', label:'Écart SSI', layer:'ssi'},
  rgpd:      {icon:'<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/>', color:'#B892F2', bg:'rgba(184,146,242,.18)', label:'Écart RGPD', layer:'rgpd'},
  action:    {icon:'<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>', color:'#E8A317', bg:'rgba(232,163,23,.18)', label:'Action en retard', layer:'actions'},
  projet:    {icon:'<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>', color:'#5B9BF0', bg:'rgba(91,155,240,.18)', label:'Projet lié', layer:'projets'},
  decision:  {icon:'<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>', color:'#3FBE84', bg:'rgba(63,190,132,.18)', label:'Décision attendue', layer:'decisions'},
  sensible:  {icon:'<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>', color:'#B892F2', bg:'rgba(184,146,242,.18)', label:'Donnée sensible', layer:'donnees'},
  internet:  {icon:'<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z"/>', color:DANGER, bg:'rgba(229,86,74,.18)', label:'Exposition internet', layer:'risques'},
  support:   {icon:'<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>', color:'#8A93A3', bg:'rgba(138,147,163,.18)', label:'Fin de support', layer:'infra'},
  fiche:     {icon:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>', color:'#8A93A3', bg:'rgba(138,147,163,.18)', label:'Fiche incomplète', layer:'ssi'}
};

/* ---------- état global ---------- */
const state = {
  tx:0, ty:0, scale:1,
  selected:null, hovered:null,
  preset:'globale',
  drawerLeftOpen:false, drawerLeftTab:'calques',
  impact:{active:false, depth:1, source:null},
  view:'graph', // graph | dashboard
  layers:{processus:true, applications:true, flux_app:true, flux_tech:true, donnees:true, fournisseurs:true,
          risques:true, ssi:true, rgpd:true, projets:true, decisions:true, actions:true,
          infrastructures:false, sites:false},
  filters:{crit:new Set(['critique','elevee']), statut:'all', owner:'all', hasRisk:false, riskLevel:'all',
           ssiGap:false, rgpdGap:false, insecure:false, notReviewed:false, decisionExpected:false},
  special:null // 'conformite' | 'codir' | null
};

const NODE_BY_ID = Object.fromEntries(NODES.map(n=>[n.id,n]));
const LAYER_KEY_FOR_TYPE = {processus:'processus', application:'applications', donnee:'donnees', infrastructure:'infrastructures', fournisseur:'fournisseurs', site:'sites'};

function edgesOf(id){ return EDGES.filter(e=>e.s===id||e.t===id); }
function neighborsOf(id){
  const set=new Set();
  edgesOf(id).forEach(e=>{ set.add(e.s===id?e.t:e.s); });
  return set;
}

/* ============================================================
   VISIBILITÉ (filtres + calques + vues)
   ============================================================ */
function nodeVisible(n){
  const lk = LAYER_KEY_FOR_TYPE[n.type];
  if(!state.layers[lk]) return false;
  const f = state.filters;
  if(!f.crit.has(n.crit)) return false;
  if(f.statut!=='all' && n.status!==f.statut) return false;
  if(f.owner!=='all' && n.ownerBiz!==f.owner && n.ownerTech!==f.owner) return false;
  if(f.hasRisk && !RISKS[n.id]) return false;
  if(f.riskLevel!=='all' && !(RISKS[n.id]||[]).some(r=>r.niveau===f.riskLevel)) return false;
  if(f.ssiGap && !(COMPLIANCE[n.id]||[]).some(c=>c.type==='ssi')) return false;
  if(f.rgpdGap && !(COMPLIANCE[n.id]||[]).some(c=>c.type==='rgpd')) return false;
  if(f.insecure && !edgesOf(n.id).some(e=>!e.secure)) return false;
  if(f.notReviewed && n.lastReview >= '2025-06-01') return false;
  if(f.decisionExpected && !(ACTIONS[n.id]||[]).some(a=>a.type==='decision')) return false;

  if(state.special==='conformite'){
    const hasGap = RISKS[n.id] || (COMPLIANCE[n.id]||[]).length;
    if(!hasGap) return false;
  }
  if(state.special==='codir'){
    const critCore = n.crit==='critique' && ['processus','application','fournisseur'].includes(n.type);
    const critRisk = (RISKS[n.id]||[]).some(r=>r.niveau==='critique');
    const decOrLate = (ACTIONS[n.id]||[]).some(a=>a.type==='decision' || a.statut==='En retard');
    if(!(critCore||critRisk||decOrLate)) return false;
  }
  return true;
}
function edgeVisible(e, visibleIds){
  if(!visibleIds.has(e.s) || !visibleIds.has(e.t)) return false;
  const layerFor = {applicatif:'flux_app', metier:'processus', technique:'flux_tech', fournisseur:'fournisseurs'};
  return !!state.layers[layerFor[e.flow]];
}
function computeVisible(){
  const ids = new Set(NODES.filter(nodeVisible).map(n=>n.id));
  const edges = EDGES.filter(e=>edgeVisible(e, ids));
  return {ids, edges};
}

/* ============================================================
   RENDU DU GRAPHE
   ============================================================ */
const NS='http://www.w3.org/2000/svg';
function svgEl(tag, attrs){ const el=document.createElementNS(NS,tag); for(const k in attrs) el.setAttribute(k, attrs[k]); return el; }

let svgRoot, viewportG, edgesG, nodesG;

function initCanvas(){
  const wrap = document.getElementById('canvas-wrap');
  svgRoot = svgEl('svg',{});
  const defs = svgEl('defs',{});
  [['arrow-danger',DANGER],['arrow-applicatif',FLOW_COLOR.applicatif],['arrow-metier',FLOW_COLOR.metier],['arrow-technique',FLOW_COLOR.technique],['arrow-fournisseur',FLOW_COLOR.fournisseur],['arrow-dim','#4A5160']].forEach(([id,color])=>{
    const marker = svgEl('marker',{id, viewBox:'0 0 10 10', refX:'8', refY:'5', markerWidth:'7', markerHeight:'7', orient:'auto-start-reverse'});
    marker.appendChild(svgEl('path',{d:'M 0 0 L 10 5 L 0 10 z', fill:color}));
    defs.appendChild(marker);
  });
  svgRoot.appendChild(defs);
  viewportG = svgEl('g',{id:'viewport'});
  edgesG = svgEl('g',{id:'edges-layer'});
  nodesG = svgEl('g',{id:'nodes-layer'});
  viewportG.appendChild(edgesG); viewportG.appendChild(nodesG);
  svgRoot.appendChild(viewportG);
  wrap.appendChild(svgRoot);

  // pan
  let dragging=false, lastX=0, lastY=0, moved=false, startX=0, startY=0, panActive=false;
  const DRAG_THRESHOLD = 4;
  svgRoot.addEventListener('mousedown', e=>{ dragging=true; moved=false; panActive=false; lastX=e.clientX; lastY=e.clientY; startX=e.clientX; startY=e.clientY; });
  window.addEventListener('mousemove', e=>{
    if(!dragging) return;
    const totalDx=e.clientX-startX, totalDy=e.clientY-startY;
    if(!panActive){
      if(Math.hypot(totalDx,totalDy) < DRAG_THRESHOLD) return; // ignore tiny jitter — don't pan on a plain click
      panActive=true; moved=true; svgRoot.classList.add('panning');
      lastX=e.clientX; lastY=e.clientY;
      return;
    }
    const dx=e.clientX-lastX, dy=e.clientY-lastY;
    state.tx+=dx; state.ty+=dy; lastX=e.clientX; lastY=e.clientY;
    applyTransform();
  });
  window.addEventListener('mouseup', ()=>{ dragging=false; panActive=false; svgRoot.classList.remove('panning'); });
  svgRoot.addEventListener('click', e=>{ if(e.target===svgRoot && !moved) atDeselect(); });

  // zoom (wheel)
  svgRoot.addEventListener('wheel', e=>{
    e.preventDefault();
    const rect = svgRoot.getBoundingClientRect();
    const cx=e.clientX-rect.left, cy=e.clientY-rect.top;
    const factor = e.deltaY<0?1.1:0.9;
    zoomAt(cx,cy,factor);
  }, {passive:false});
}
function applyTransform(){ viewportG.setAttribute('transform', `translate(${state.tx},${state.ty}) scale(${state.scale})`); }
function zoomAt(cx,cy,factor){
  const newScale = Math.min(2.4, Math.max(0.35, state.scale*factor));
  const ratio = newScale/state.scale;
  state.tx = cx - (cx-state.tx)*ratio;
  state.ty = cy - (cy-state.ty)*ratio;
  state.scale = newScale;
  applyTransform();
}
function atZoom(factor){ const rect=svgRoot.getBoundingClientRect(); zoomAt(rect.width/2, rect.height/2, factor); }
function atRecenter(){
  const rect = svgRoot.getBoundingClientRect();
  if(rect.width<10 || rect.height<10) return; // container not laid out yet — bail, ResizeObserver will retry
  const xs = NODES.map(n=>n.x), ys = NODES.map(n=>n.y);
  const minX=Math.min(...xs)-60, maxX=Math.max(...xs)+60, minY=Math.min(...ys)-60, maxY=Math.max(...ys)+60;
  const w=maxX-minX, h=maxY-minY;
  const scale = Math.min(rect.width/w, rect.height/h, 1.1);
  state.scale = scale;
  state.tx = rect.width/2 - (minX+w/2)*scale;
  state.ty = rect.height/2 - (minY+h/2)*scale + 10;
  applyTransform();
}
function atToggleFullscreen(){
  const target = window.frameElement ? window.top.document.documentElement : document.documentElement;
  const inIframe = !!window.frameElement;
  if(!document.fullscreenElement && !(inIframe && window.top.document.fullscreenElement)){
    (inIframe ? window.top.document.documentElement : document.documentElement).requestFullscreen().catch(()=>{
      document.documentElement.requestFullscreen().catch(()=>{});
    });
  } else {
    (document.fullscreenElement ? document : window.top.document).exitFullscreen();
  }
}
function atGoBack(){
  if(window.frameElement && window.parent && window.parent!==window){
    window.parent.postMessage({type:'starium-atlas-back'}, '*');
  } else {
    location.href = 'Refonte Portail Client.html';
  }
}

function critDotColor(crit){ return CRIT_META[crit].color; }

function renderGraph(){
  edgesG.innerHTML=''; nodesG.innerHTML='';
  const {ids, edges} = computeVisible();

  // highlight set (hover or select)
  const focusId = state.hovered || state.selected;
  let highlightNodes=null, highlightEdges=null;
  if(focusId && ids.has(focusId)){
    highlightNodes = new Set([focusId, ...neighborsOf(focusId)]);
    highlightEdges = new Set(edgesOf(focusId).map(e=>e.id));
  }
  // impact highlighting overrides hover/select dimming
  let impactDepths=null;
  if(state.impact.active){ impactDepths = impactBFS(state.impact.source, state.impact.depth); }

  edges.forEach((e,i)=>{
    const sN=NODE_BY_ID[e.s], tN=NODE_BY_ID[e.t];
    const mx=(sN.x+tN.x)/2, my=(sN.y+tN.y)/2;
    const dx=tN.x-sN.x, dy=tN.y-sN.y, dist=Math.hypot(dx,dy)||1;
    const nx=-dy/dist, ny=dx/dist;
    const bend = 18*((i%3)-1);
    const cx=mx+nx*bend, cy=my+ny*bend;
    const path = `M ${sN.x} ${sN.y} Q ${cx} ${cy} ${tN.x} ${tN.y}`;
    let color = FLOW_COLOR[e.flow];
    if(!e.secure || e.crit==='critique') color = DANGER;
    const arrowId = (!e.secure||e.crit==='critique') ? 'arrow-danger' : ('arrow-'+e.flow);
    const p = svgEl('path',{class:'edge', d:path, stroke:color, 'stroke-width': (e.crit==='critique'?3:2),
      'stroke-dasharray': e.manual?'7 6':'none', 'marker-end':`url(#${arrowId})`, 'data-id':e.id});
    if(e.dir==='bi') p.setAttribute('marker-start', `url(#${arrowId})`);
    let opacityClass='';
    if(impactDepths){
      const inSubgraph = impactDepths.byEdge.has(e.id);
      opacityClass = inSubgraph ? '' : 'dim';
    } else if(highlightEdges){
      opacityClass = highlightEdges.has(e.id) ? '' : 'dim';
    }
    if(opacityClass) p.classList.add(opacityClass);
    edgesG.appendChild(p);
    const hit = svgEl('path',{class:'edge-hit', d:path});
    hit.addEventListener('click', ()=>showToast(`${sN.name} → ${tN.name} · ${e.mode} · ${e.freq}`));
    edgesG.appendChild(hit);
  });

  NODES.filter(n=>ids.has(n.id)).forEach(n=>{
    const tm = TYPE_META[n.type];
    const g = svgEl('g',{class:'node', transform:`translate(${n.x},${n.y})`, 'data-id':n.id});
    if(n.id===state.selected) g.classList.add('selected');

    let opacityClass='';
    if(impactDepths){
      opacityClass = impactDepths.byNode.has(n.id) ? '' : 'dim';
    } else if(highlightNodes){
      opacityClass = highlightNodes.has(n.id) ? '' : 'dim-mid';
    }

    const halo = svgEl('circle',{class:'node-halo', r:29, fill:'none', stroke:'var(--gold, #E8A317)', 'stroke-width':2});
    g.appendChild(halo);
    const circle = svgEl('circle',{class:'node-circle'+(opacityClass?' '+opacityClass:''), r:22, fill:tm.bg, stroke:tm.color});
    g.appendChild(circle);
    const icoWrap = svgEl('g',{class:'node-icon'+(opacityClass?' '+opacityClass:''), transform:'translate(-9,-9) scale(0.75)'});
    icoWrap.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="${tm.color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${tm.icon}</svg>`;
    const fo = svgEl('foreignObject',{x:-11,y:-11,width:22,height:22});
    fo.innerHTML = `<div xmlns="http://www.w3.org/1999/xhtml" style="width:22px;height:22px;display:flex;align-items:center;justify-content:center;pointer-events:none${opacityClass?';opacity:.15':''}"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="${tm.color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${tm.icon}</svg></div>`;
    g.appendChild(fo);

    // crit dot
    const cd = svgEl('circle',{cx:16,cy:-16,r:6.5,fill:critDotColor(n.crit),stroke:'var(--canvas-bg,#EFEBE2)','stroke-width':2,class:opacityClass});
    g.appendChild(cd);

    // badges row
    const badges=(n.badges||[]).filter(b=>state.layers[BADGE_META[b].layer]);
    badges.forEach((b,bi)=>{
      const bm=BADGE_META[b];
      const bx = -16 + bi*13;
      const bcirc = svgEl('circle',{cx:bx,cy:20,r:6,fill:bm.bg,stroke:bm.color,'stroke-width':1.2,class:'badge-dot '+(opacityClass||'')});
      g.appendChild(bcirc);
    });

    const label = svgEl('text',{class:'node-label'+(opacityClass?' '+opacityClass:''), x:0, y:40, 'text-anchor':'middle'});
    label.textContent = n.name;
    g.appendChild(label);
    const sub = svgEl('text',{class:'node-sublabel'+(opacityClass?' '+opacityClass:''), x:0, y:52, 'text-anchor':'middle'});
    sub.textContent = tm.label;
    g.appendChild(sub);

    g.addEventListener('mouseenter', ()=>{ state.hovered=n.id; applyFocus(); });
    g.addEventListener('mouseleave', ()=>{ state.hovered=null; applyFocus(); });
    g.addEventListener('click', (e)=>{ e.stopPropagation(); atSelect(n.id); });

    nodesG.appendChild(g);
  });

  renderLegend();
  applyFocus();
}

/* Applique le surlignage hover/sélection SANS reconstruire le DOM —
   reconstruire au survol détruisait l'élément sous le curseur et empêchait le clic. */
function applyFocus(){
  if(state.impact.active) return; // le dim d'impact est géré par renderGraph
  const focusId = state.hovered || state.selected;
  let highlightNodes=null, highlightEdges=null;
  if(focusId){
    highlightNodes = new Set([focusId, ...neighborsOf(focusId)]);
    highlightEdges = new Set(edgesOf(focusId).map(e=>e.id));
  }
  nodesG.querySelectorAll('.node').forEach(g=>{
    const id=g.getAttribute('data-id');
    g.classList.toggle('dim-mid', !!highlightNodes && !highlightNodes.has(id));
  });
  edgesG.querySelectorAll('.edge').forEach(p=>{
    const id=p.getAttribute('data-id');
    p.classList.toggle('dim', !!highlightEdges && !highlightEdges.has(id));
  });
}

/* ============================================================
   SÉLECTION / DÉTAIL
   ============================================================ */
function atSelect(id){
  state.selected=id;
  renderGraph();
  ficheOpen(id);
}
function atDeselect(){
  if(state.impact.active) return;
  state.selected=null;
  ficheClose();
  renderGraph();
}
function drCloseAll(){ atDeselect(); }

function fmt(d){ if(!d) return '—'; const dt=new Date(d); if(isNaN(dt)) return d; return dt.toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'}); }

/* ============================================================
   FICHE OBJET — plein écran, multi-onglets
   ============================================================ */
const FICHE_TABS = [
  {key:'info', label:'Informations', icon:'<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>'},
  {key:'deps', label:'Dépendances', icon:'<line x1="17" y1="7" x2="7" y2="17"/><polyline points="8 7 17 7 17 16"/>'},
  {key:'risks', label:'Risques', icon:'<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/>'},
  {key:'compliance', label:'SSI / RGPD', icon:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>'},
  {key:'projects', label:'Projets', icon:'<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>'},
  {key:'actions', label:'Actions & décisions', icon:'<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>'}
];
let ficheId=null, ficheTabKey='info';

function ficheOpen(id){
  ficheId=id; ficheTabKey='info';
  const n = NODE_BY_ID[id]; if(!n) return;
  const tm = TYPE_META[n.type], cm = CRIT_META[n.crit];
  document.getElementById('fiche-head-ico').style.background = 'rgba(255,255,255,.1)';
  document.getElementById('fiche-head-ico').innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${tm.icon}</svg>`;
  document.getElementById('fiche-title').textContent = `Fiche ${tm.label.toLowerCase()} — ${n.name}`;
  document.getElementById('fiche-sub').textContent = n.desc || '';
  document.getElementById('fiche-crit').textContent = cm.label;
  document.getElementById('fiche-crit').style.background = cm.bg;
  document.getElementById('fiche-crit').style.color = cm.color;
  document.getElementById('fiche-tabs').innerHTML = FICHE_TABS.map(t=>{
    const count = ficheTabCount(t.key, id);
    return `<button class="fiche-tab ${ficheTabKey===t.key?'active':''}" data-tab="${t.key}" onclick="ficheSetTab('${t.key}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${t.icon}</svg>${t.label}${count!=null?`<span class="fiche-tab-count">${count}</span>`:''}</button>`;
  }).join('');
  document.getElementById('fiche-overlay').classList.add('open');
  ficheRenderTab();
}
function ficheTabCount(key,id){
  if(key==='deps') return edgesOf(id).length;
  if(key==='risks') return (RISKS[id]||[]).length;
  if(key==='compliance') return (COMPLIANCE[id]||[]).length;
  if(key==='projects') return (PROJECTS[id]||[]).length;
  if(key==='actions') return (ACTIONS[id]||[]).length;
  return null;
}
function ficheSetTab(key){ ficheTabKey=key; document.querySelectorAll('.fiche-tab').forEach(b=>b.classList.toggle('active', b.dataset.tab===key)); ficheRenderTab(); }
function ficheClose(){ document.getElementById('fiche-overlay').classList.remove('open'); }

function ficheRenderTab(){
  const id = ficheId, n = NODE_BY_ID[id]; if(!n) return;
  const body = document.getElementById('fiche-body');
  if(ficheTabKey==='info'){
    body.innerHTML = `
      <div class="fiche-grid2">
        <div class="fiche-card">
          <div class="fiche-card-h"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>Informations générales</div>
          <label class="fiche-field-label">Nom</label><div class="fiche-field-val">${n.name}</div>
          <label class="fiche-field-label">Description</label><div class="fiche-field-val area">${n.desc||'—'}</div>
          <div class="fiche-field-row">
            <div><label class="fiche-field-label">Statut</label><div class="fiche-field-val">${n.status||'—'}</div></div>
            <div><label class="fiche-field-label">Dernière revue</label><div class="fiche-field-val">${fmt(n.lastReview)}</div></div>
          </div>
          <label class="fiche-field-label">Complétude de la fiche — ${n.completeness}%</label>
          <div class="fiche-complete-bar"><div class="fiche-complete-fill" style="width:${n.completeness}%"></div></div>
        </div>
        <div class="fiche-card">
          <div class="fiche-card-h"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>Propriétaires</div>
          <label class="fiche-field-label">Propriétaire métier</label><div class="fiche-field-val">${n.ownerBiz||'—'}</div>
          <label class="fiche-field-label">Propriétaire technique</label><div class="fiche-field-val">${n.ownerTech||'—'}</div>
          <label class="fiche-field-label">Badges</label>
          <div style="display:flex;flex-wrap:wrap;gap:6px">${(n.badges||[]).map(b=>{const bm=BADGE_META[b]; return `<span class="dr-badge" style="background:${bm.bg};color:${bm.color}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">${bm.icon}</svg>${bm.label}</span>`;}).join('') || '<span class="fiche-empty">Aucun badge.</span>'}</div>
        </div>
      </div>`;
  } else if(ficheTabKey==='deps'){
    const rels = edgesOf(id).map(e=>{
      const other = e.s===id? NODE_BY_ID[e.t] : NODE_BY_ID[e.s];
      const dir = e.dir==='bi' ? 'Bidirectionnel' : (e.s===id?'Sortant':'Entrant');
      const otm = TYPE_META[other.type];
      return `<div class="dr-rel-row" onclick="ficheOpen('${other.id}')" style="cursor:pointer">
        <div class="dr-rel-ico" style="background:${otm.bg}"><svg viewBox="0 0 24 24" fill="none" stroke="${otm.color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${otm.icon}</svg></div>
        <div><div class="dr-rel-name">${other.name}</div><div class="dr-rel-meta">${e.mode} · ${e.freq}${!e.secure?' · non sécurisé':''}</div></div>
        <div class="dr-rel-dir">${dir}</div>
      </div>`;
    }).join('') || '<div class="fiche-empty">Aucun flux enregistré.</div>';
    body.innerHTML = `<div class="fiche-card"><div class="fiche-card-h"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="17" y1="7" x2="7" y2="17"/><polyline points="8 7 17 7 17 16"/></svg>Relations (${edgesOf(id).length})</div>${rels}
      <button class="dr-impact-btn" onclick="ficheClose();atStartImpact('${id}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>Analyser l'impact</button>
    </div>`;
  } else if(ficheTabKey==='risks'){
    const risks = (RISKS[id]||[]).map(r=>{
      const cm2 = CRIT_META[r.niveau];
      return `<div class="dr-card"><div class="dr-card-top"><span class="dr-card-title">${r.title}</span><span class="dr-pill-sm" style="background:${cm2.bg};color:${cm2.color}">${cm2.label}</span></div>
        <div class="dr-card-meta"><span>Score ${r.score}</span><span>${r.statut}</span><span>${r.responsable}</span><span>Éch. ${fmt(r.echeance)}</span></div></div>`;
    }).join('') || '<div class="fiche-empty">Aucun risque associé.</div>';
    body.innerHTML = `<div class="fiche-card"><div class="fiche-card-h"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/></svg>Risques liés</div>${risks}</div>`;
  } else if(ficheTabKey==='compliance'){
    const gaps = (COMPLIANCE[id]||[]).map(c=>{
      const isS = c.type==='ssi';
      return `<div class="dr-card"><div class="dr-card-top"><span class="dr-card-title">${isS?'SSI':'RGPD'} — ${c.exigence}</span></div>
        <div class="dr-card-meta" style="display:block"><div style="margin-bottom:4px"><b style="color:var(--text-1)">Écart :</b> ${c.ecart}</div><div style="margin-bottom:4px"><b style="color:var(--text-1)">Preuve :</b> ${c.preuve}</div><div><b style="color:var(--text-1)">Action corrective :</b> ${c.action}</div></div></div>`;
    }).join('') || '<div class="fiche-empty">Aucun écart de conformité.</div>';
    body.innerHTML = `<div class="fiche-card"><div class="fiche-card-h"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>Conformité SSI / RGPD</div>${gaps}</div>`;
  } else if(ficheTabKey==='projects'){
    const projs = (PROJECTS[id]||[]).map(p=>`<div class="dr-card"><div class="dr-card-top"><span class="dr-card-title">${p.name}</span></div><div class="dr-card-meta">${p.role}</div></div>`).join('') || '<div class="fiche-empty">Aucun projet lié.</div>';
    body.innerHTML = `<div class="fiche-card"><div class="fiche-card-h"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>Projets liés</div>${projs}</div>`;
  } else if(ficheTabKey==='actions'){
    const acts = (ACTIONS[id]||[]).map(a=>{
      const isDecision = a.type==='decision';
      const pillColor = a.statut==='En retard' ? {bg:'rgba(180,35,24,.12)',c:'#B42318'} : (isDecision?{bg:'rgba(31,138,91,.12)',c:'#1F8A5B'}:{bg:'rgba(42,111,219,.12)',c:'#2A6FDB'});
      return `<div class="dr-card"><div class="dr-card-top"><span class="dr-card-title">${isDecision?'Décision — ':'Action — '}${a.title}</span><span class="dr-pill-sm" style="background:${pillColor.bg};color:${pillColor.c}">${a.statut}</span></div>
        <div class="dr-card-meta"><span>Éch. ${fmt(a.echeance)}</span>${a.codir?'<span style="color:var(--gold)">Arbitrage CODIR</span>':''}</div></div>`;
    }).join('') || '<div class="fiche-empty">Aucune action ni décision en cours.</div>';
    body.innerHTML = `<div class="fiche-card"><div class="fiche-card-h"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>Actions et décisions</div>${acts}</div>`;
  }
}

function renderDetail(id){
  const n = NODE_BY_ID[id]; if(!n) return;
  const tm = TYPE_META[n.type], cm = CRIT_META[n.crit];
  document.getElementById('dr-head').innerHTML = `
    <button class="dr-close" onclick="drCloseAll()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
    <div class="dr-type-row">
      <span class="dr-type-pill" style="background:${tm.bg};color:${tm.color}">${tm.label}</span>
      <span class="dr-crit-pill" style="background:${cm.bg};color:${cm.color}">${cm.label}</span>
    </div>
    <div class="dr-title">${n.name}</div>
    <div class="dr-desc">${n.desc||''}</div>
    <div class="dr-badges">${(n.badges||[]).map(b=>{const bm=BADGE_META[b]; return `<span class="dr-badge" style="background:${bm.bg};color:${bm.color}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">${bm.icon}</svg>${bm.label}</span>`;}).join('')}</div>
  `;

  const rels = edgesOf(id).map(e=>{
    const other = e.s===id? NODE_BY_ID[e.t] : NODE_BY_ID[e.s];
    const dir = e.dir==='bi' ? 'Bidir.' : (e.s===id?'Sortant':'Entrant');
    const otm = TYPE_META[other.type];
    return `<div class="dr-rel-row" onclick="atSelect('${other.id}')">
      <div class="dr-rel-ico" style="background:${otm.bg}"><svg viewBox="0 0 24 24" fill="none" stroke="${otm.color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${otm.icon}</svg></div>
      <div><div class="dr-rel-name">${other.name}</div><div class="dr-rel-meta">${e.mode} · ${e.freq}</div></div>
      <div class="dr-rel-dir">${dir}</div>
    </div>`;
  }).join('') || '<div class="dr-empty">Aucun flux enregistré.</div>';

  const risks = (RISKS[id]||[]).map(r=>{
    const cm2 = CRIT_META[r.niveau];
    return `<div class="dr-card"><div class="dr-card-top"><span class="dr-card-title">${r.title}</span><span class="dr-pill-sm" style="background:${cm2.bg};color:${cm2.color}">${cm2.label}</span></div>
      <div class="dr-card-meta"><span>Score ${r.score}</span><span>${r.statut}</span><span>${r.responsable}</span><span>Éch. ${fmt(r.echeance)}</span></div></div>`;
  }).join('') || '<div class="dr-empty">Aucun risque associé.</div>';

  const gaps = (COMPLIANCE[id]||[]).map(c=>{
    const isS = c.type==='ssi';
    return `<div class="dr-card"><div class="dr-card-top"><span class="dr-card-title">${isS?'SSI':'RGPD'} — ${c.exigence}</span></div>
      <div class="dr-card-meta" style="display:block"><div style="margin-bottom:4px"><b style="color:var(--text-1)">Écart :</b> ${c.ecart}</div><div style="margin-bottom:4px"><b style="color:var(--text-1)">Preuve :</b> ${c.preuve}</div><div><b style="color:var(--text-1)">Action corrective :</b> ${c.action}</div></div></div>`;
  }).join('') || '<div class="dr-empty">Aucun écart de conformité.</div>';

  const projs = (PROJECTS[id]||[]).map(p=>`<div class="dr-card"><div class="dr-card-top"><span class="dr-card-title">${p.name}</span></div><div class="dr-card-meta">${p.role}</div></div>`).join('') || '<div class="dr-empty">Aucun projet lié.</div>';

  const acts = (ACTIONS[id]||[]).map(a=>{
    const isDecision = a.type==='decision';
    const pillColor = a.statut==='En retard' ? {bg:'rgba(229,86,74,.16)',c:DANGER} : (isDecision?{bg:'rgba(63,190,132,.16)',c:'#3FBE84'}:{bg:'rgba(91,155,240,.16)',c:'#5B9BF0'});
    return `<div class="dr-card"><div class="dr-card-top"><span class="dr-card-title">${isDecision?'Décision — ':'Action — '}${a.title}</span><span class="dr-pill-sm" style="background:${pillColor.bg};color:${pillColor.c}">${a.statut}</span></div>
      <div class="dr-card-meta"><span>Éch. ${fmt(a.echeance)}</span>${a.codir?'<span style="color:var(--gold)">Arbitrage CODIR</span>':''}</div></div>`;
  }).join('') || '<div class="dr-empty">Aucune action ni décision en cours.</div>';

  document.getElementById('dr-body').innerHTML = `
    <div class="dr-sec"><div class="dr-sec-h"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>Informations générales</div>
      <dl class="dr-kv">
        <dt>Propriétaire métier</dt><dd>${n.ownerBiz||'—'}</dd>
        <dt>Propriétaire technique</dt><dd>${n.ownerTech||'—'}</dd>
        <dt>Statut</dt><dd>${n.status||'—'}</dd>
        <dt>Dernière revue</dt><dd>${fmt(n.lastReview)}</dd>
      </dl>
      <div style="margin-top:12px"><div class="dr-kv"><dt style="grid-column:1/-1">Complétude de la fiche — ${n.completeness}%</dt></div><div class="dr-complete-bar"><div class="dr-complete-fill" style="width:${n.completeness}%"></div></div></div>
    </div>
    <div class="dr-sec"><div class="dr-sec-h"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="17" y1="7" x2="7" y2="17"/><polyline points="8 7 17 7 17 16"/></svg>Relations (${edgesOf(id).length})</div>${rels}</div>
    <div class="dr-sec"><div class="dr-sec-h"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/></svg>Risques liés</div>${risks}</div>
    <div class="dr-sec"><div class="dr-sec-h"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>Conformité SSI / RGPD</div>${gaps}</div>
    <div class="dr-sec"><div class="dr-sec-h"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>Projets liés</div>${projs}</div>
    <div class="dr-sec"><div class="dr-sec-h"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>Actions et décisions</div>${acts}
      <button class="dr-impact-btn" onclick="atStartImpact('${id}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>Analyser l'impact</button>
    </div>
  `;
}

/* ============================================================
   ANALYSE D'IMPACT
   ============================================================ */
function impactBFS(sourceId, maxDepth){
  const byNode = new Map([[sourceId,0]]);
  const byEdge = new Set();
  let frontier=[sourceId];
  for(let depth=1; depth<=maxDepth; depth++){
    const next=[];
    frontier.forEach(id=>{
      edgesOf(id).forEach(e=>{
        const other = e.s===id?e.t:e.s;
        if(!byNode.has(other)){ byNode.set(other, depth); next.push(other); }
        byEdge.add(e.id);
      });
    });
    frontier=next;
  }
  return {byNode, byEdge};
}
function atStartImpact(id){
  state.impact = {active:true, depth:1, source:id};
  document.getElementById('impact-bar').classList.add('open');
  document.getElementById('impact-obj-name').textContent = NODE_BY_ID[id].name;
  atSetDepth(1);
  renderImpactSynthesis();
}
function atSetDepth(d){
  state.impact.depth=d;
  document.querySelectorAll('#depth-seg button').forEach(b=>b.classList.toggle('active', +b.dataset.d===d));
  renderGraph();
  renderImpactSynthesis();
}
function atExitImpact(){
  state.impact = {active:false, depth:1, source:null};
  document.getElementById('impact-bar').classList.remove('open');
  if(state.selected) renderDetail(state.selected);
  renderGraph();
}
function renderImpactSynthesis(){
  if(!state.impact.active) return;
  const {byNode} = impactBFS(state.impact.source, state.impact.depth);
  const impactedIds = [...byNode.keys()].filter(id=>id!==state.impact.source);
  const direct = impactedIds.filter(id=>byNode.get(id)===1);
  const indirect = impactedIds.filter(id=>byNode.get(id)>1);
  const critCount = impactedIds.filter(id=>['critique','elevee'].includes(NODE_BY_ID[id].crit)).length;
  const riskCount = impactedIds.filter(id=>RISKS[id]).length;
  const actionCount = impactedIds.reduce((s,id)=>s+(ACTIONS[id]||[]).filter(a=>a.type==='action').length,0);
  const decisionCount = impactedIds.reduce((s,id)=>s+(ACTIONS[id]||[]).filter(a=>a.type==='decision').length,0);

  const group = (ids,label) => ids.length ? `<div class="dr-sec-h" style="margin-top:14px">${label} (${ids.length})</div>` + ids.map(id=>{
    const n=NODE_BY_ID[id], tm=TYPE_META[n.type];
    return `<div class="dr-rel-row" onclick="atSelect('${id}')"><div class="dr-rel-ico" style="background:${tm.bg}"><svg viewBox="0 0 24 24" fill="none" stroke="${tm.color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${tm.icon}</svg></div><div><div class="dr-rel-name">${n.name}</div><div class="dr-rel-meta">${tm.label}</div></div></div>`;
  }).join('') : '';

  document.getElementById('dr-head').innerHTML = `
    <div class="dr-type-row"><span class="dr-type-pill" style="background:rgba(232,163,23,.18);color:var(--gold)">Analyse d'impact</span></div>
    <div class="dr-title">${NODE_BY_ID[state.impact.source].name}</div>
    <div class="dr-desc">Si cet objet tombe ou est indisponible, ${impactedIds.length} objet(s) sont impactés en profondeur ${state.impact.depth}.</div>
  `;
  document.getElementById('dr-body').innerHTML = `
    <div class="dr-sec">
      <dl class="dr-kv">
        <dt>Objets impactés</dt><dd>${impactedIds.length}</dd>
        <dt>Dont critiques / élevés</dt><dd>${critCount}</dd>
        <dt>Risques associés</dt><dd>${riskCount}</dd>
        <dt>Actions ouvertes</dt><dd>${actionCount}</dd>
        <dt>Décisions attendues</dt><dd>${decisionCount}</dd>
      </dl>
      ${group(direct,'Impact direct')}
      ${group(indirect,'Impact indirect')}
    </div>
  `;
  document.getElementById('drawer-right').classList.add('open');
}

/* ============================================================
   RECHERCHE
   ============================================================ */
function atSearch(q){
  const box = document.getElementById('search-results');
  q = q.trim().toLowerCase();
  if(!q){ box.classList.remove('open'); box.innerHTML=''; return; }
  const matches = NODES.filter(n=>n.name.toLowerCase().includes(q)).slice(0,8);
  if(!matches.length){ box.innerHTML = '<div class="tb-search-row" style="color:var(--text-3);cursor:default">Aucun résultat</div>'; box.classList.add('open'); return; }
  box.innerHTML = matches.map(n=>{
    const tm=TYPE_META[n.type];
    return `<div class="tb-search-row" onclick="atSearchPick('${n.id}')"><i style="background:${tm.color}"></i>${n.name}<span style="margin-left:auto;color:var(--text-3);font-weight:600;font-size:10.5px">${tm.label}</span></div>`;
  }).join('');
  box.classList.add('open');
}
function atSearchPick(id){
  document.getElementById('search-results').classList.remove('open');
  document.getElementById('atlas-search').value = NODE_BY_ID[id].name;
  // ensure visible: temporarily clear special/filters so node shows
  if(!nodeVisible(NODE_BY_ID[id])){ atResetFilters(false); }
  renderGraph();
  atSelect(id);
  centerOn(id);
}
function centerOn(id){
  const n = NODE_BY_ID[id];
  const rect = svgRoot.getBoundingClientRect();
  state.tx = rect.width/2 - n.x*state.scale;
  state.ty = rect.height/2 - n.y*state.scale;
  applyTransform();
}
document.addEventListener('click', (e)=>{
  if(!e.target.closest('.tb-search-wrap')) { const box=document.getElementById('search-results'); if(box) box.classList.remove('open'); }
  if(!e.target.closest('.tb-createwrap')) { const m=document.getElementById('create-menu'); if(m) m.classList.remove('open'); }
});

/* ============================================================
   DRAWERS : filtres / calques
   ============================================================ */
function atToggleDrawer(tab){
  const dl = document.getElementById('drawer-left');
  if(state.drawerLeftOpen && state.drawerLeftTab===tab){ state.drawerLeftOpen=false; }
  else { state.drawerLeftOpen=true; state.drawerLeftTab=tab; }
  dl.classList.toggle('open', state.drawerLeftOpen);
  atDrawerTab(state.drawerLeftTab);
}
function atDrawerTab(tab){
  state.drawerLeftTab = tab;
  document.querySelectorAll('.dl-tab').forEach(t=>t.classList.toggle('active', t.dataset.tab===tab));
  document.getElementById('pane-calques').classList.toggle('active', tab==='calques');
  document.getElementById('pane-filtres').classList.toggle('active', tab==='filtres');
  document.getElementById('drawer-left').classList.add('open'); state.drawerLeftOpen=true;
}

function layerRow(key,label,colorDot){
  const count = NODES.filter(n=>LAYER_KEY_FOR_TYPE[n.type]===key && nodeVisible(n)).length;
  return `<label class="chk-row"><input type="checkbox" ${state.layers[key]?'checked':''} onchange="atToggleLayer('${key}',this.checked)">${colorDot?`<i style="background:${colorDot}"></i>`:''}${label}</label>`;
}
function renderCalquesPane(){
  document.getElementById('pane-calques').innerHTML = `
    <div class="dl-group"><div class="dl-group-title">Objets</div>
      ${layerRow('processus','Processus',TYPE_META.processus.color)}
      ${layerRow('applications','Applications',TYPE_META.application.color)}
      ${layerRow('donnees','Données',TYPE_META.donnee.color)}
      ${layerRow('fournisseurs','Fournisseurs',TYPE_META.fournisseur.color)}
      ${layerRow('infrastructures','Infrastructures',TYPE_META.infrastructure.color)}
      ${layerRow('sites','Sites',TYPE_META.site.color)}
    </div>
    <div class="dl-group"><div class="dl-group-title">Flux</div>
      ${layerRow('flux_app','Flux applicatifs',FLOW_COLOR.applicatif)}
      ${layerRow('flux_tech','Flux techniques',FLOW_COLOR.technique)}
    </div>
    <div class="dl-group"><div class="dl-group-title">Gouvernance</div>
      ${layerRow('risques','Risques',DANGER)}
      ${layerRow('ssi','Conformité SSI','#E8A317')}
      ${layerRow('rgpd','Conformité RGPD','#B892F2')}
      ${layerRow('projets','Projets',FLOW_COLOR.applicatif)}
      ${layerRow('decisions','Décisions','#3FBE84')}
      ${layerRow('actions','Actions','#E8A317')}
    </div>
  `;
}
function atToggleLayer(key,val){
  state.layers[key]=val; state.special=null;
  syncPresetButtons(null);
  renderCalquesPane(); renderGraph(); renderFiltresPane();
}

function ownerOptions(){
  const owners = new Set();
  NODES.forEach(n=>{ if(n.ownerBiz) owners.add(n.ownerBiz); if(n.ownerTech) owners.add(n.ownerTech); });
  return [...owners].sort();
}
function renderFiltresPane(){
  const f = state.filters;
  document.getElementById('pane-filtres').innerHTML = `
    <div class="dl-group"><div class="dl-group-title">Criticité<button onclick="atResetFilters(true)">Réinitialiser</button></div>
      ${['critique','elevee','moyenne','faible'].map(c=>`<label class="chk-row"><input type="checkbox" ${f.crit.has(c)?'checked':''} onchange="atToggleCrit('${c}',this.checked)"><i style="background:${CRIT_META[c].color}"></i>${CRIT_META[c].label}</label>`).join('')}
    </div>
    <div class="dl-group"><div class="dl-group-title">Statut</div>
      <select class="dl-select" onchange="atSetFilter('statut',this.value)">
        <option value="all" ${f.statut==='all'?'selected':''}>Tous</option>
        ${[...new Set(NODES.map(n=>n.status))].map(s=>`<option value="${s}" ${f.statut===s?'selected':''}>${s}</option>`).join('')}
      </select>
    </div>
    <div class="dl-group"><div class="dl-group-title">Propriétaire</div>
      <select class="dl-select" onchange="atSetFilter('owner',this.value)">
        <option value="all" ${f.owner==='all'?'selected':''}>Tous</option>
        ${ownerOptions().map(o=>`<option value="${o}" ${f.owner===o?'selected':''}>${o}</option>`).join('')}
      </select>
    </div>
    <div class="dl-group"><div class="dl-group-title">Risques &amp; conformité</div>
      <label class="chk-row"><input type="checkbox" ${f.hasRisk?'checked':''} onchange="atSetFilter('hasRisk',this.checked)">Présence de risque</label>
      <select class="dl-select" style="margin:6px 0" onchange="atSetFilter('riskLevel',this.value)">
        <option value="all" ${f.riskLevel==='all'?'selected':''}>Niveau de risque · tous</option>
        ${['critique','elevee','moyenne'].map(c=>`<option value="${c}" ${f.riskLevel===c?'selected':''}>${CRIT_META[c].label}</option>`).join('')}
      </select>
      <label class="chk-row"><input type="checkbox" ${f.ssiGap?'checked':''} onchange="atSetFilter('ssiGap',this.checked)">Écart SSI</label>
      <label class="chk-row"><input type="checkbox" ${f.rgpdGap?'checked':''} onchange="atSetFilter('rgpdGap',this.checked)">Écart RGPD</label>
      <label class="chk-row"><input type="checkbox" ${f.insecure?'checked':''} onchange="atSetFilter('insecure',this.checked)">Flux non sécurisé</label>
      <label class="chk-row"><input type="checkbox" ${f.notReviewed?'checked':''} onchange="atSetFilter('notReviewed',this.checked)">Objet non revu (&gt; 12 mois)</label>
      <label class="chk-row"><input type="checkbox" ${f.decisionExpected?'checked':''} onchange="atSetFilter('decisionExpected',this.checked)">Décision attendue</label>
    </div>
  `;
  const {ids} = computeVisible();
  document.getElementById('filter-count').style.display = ids.size===NODES.length ? 'none':'inline-block';
  document.getElementById('filter-count').textContent = ids.size;
}
function atToggleCrit(c,val){ if(val) state.filters.crit.add(c); else state.filters.crit.delete(c); state.special=null; syncPresetButtons(null); renderFiltresPane(); renderCalquesPane(); renderGraph(); }
function atSetFilter(key,val){ state.filters[key]= (key==='hasRisk'||key==='ssiGap'||key==='rgpdGap'||key==='insecure'||key==='notReviewed'||key==='decisionExpected') ? val : val; state.special=null; syncPresetButtons(null); renderFiltresPane(); renderGraph(); }
function atResetFilters(rerender){
  state.filters = {crit:new Set(['critique','elevee','moyenne','faible']), statut:'all', owner:'all', hasRisk:false, riskLevel:'all', ssiGap:false, rgpdGap:false, insecure:false, notReviewed:false, decisionExpected:false};
  state.special=null;
  if(rerender!==false){ renderFiltresPane(); renderCalquesPane(); renderGraph(); syncPresetButtons(null); }
}

/* ============================================================
   VUES PRÉCONFIGURÉES
   ============================================================ */
function renderPresetBar(){
  document.getElementById('preset-bar').innerHTML = PRESETS.map(p=>`<button class="tb-preset-btn ${state.preset===p.id?'active':''}" data-preset="${p.id}" onclick="atApplyPreset('${p.id}')">${p.label}</button>`).join('');
}
function syncPresetButtons(id){ state.preset=id; document.querySelectorAll('.tb-preset-btn').forEach(b=>b.classList.toggle('active', b.dataset.preset===id)); }

function atApplyPreset(id){
  state.preset=id; state.special=null;
  const allCrit = new Set(['critique','elevee','moyenne','faible']);
  const baseFilters = {crit:allCrit, statut:'all', owner:'all', hasRisk:false, riskLevel:'all', ssiGap:false, rgpdGap:false, insecure:false, notReviewed:false, decisionExpected:false};
  const L = k=>({processus:false,applications:false,flux_app:false,flux_tech:false,donnees:false,fournisseurs:false,infrastructures:false,sites:false,risques:true,ssi:true,rgpd:true,projets:true,decisions:true,actions:true, ...k});

  if(id==='globale'){
    state.filters = {...baseFilters, crit:new Set(['critique','elevee'])};
    state.layers = L({processus:true,applications:true,flux_app:true,flux_tech:true,donnees:true,fournisseurs:true});
  } else if(id==='processus'){
    state.filters = {...baseFilters};
    state.layers = L({processus:true,applications:true,flux_app:false,flux_tech:false,fournisseurs:false});
  } else if(id==='applicative'){
    state.filters = {...baseFilters};
    state.layers = L({applications:true,donnees:true,infrastructures:true,flux_app:true,flux_tech:true});
  } else if(id==='technique'){
    state.filters = {...baseFilters};
    state.layers = L({infrastructures:true,applications:true,donnees:true,fournisseurs:true,flux_tech:true,flux_app:false});
  } else if(id==='conformite'){
    state.filters = {...baseFilters};
    state.special='conformite';
    state.layers = L({applications:true,donnees:true,infrastructures:true,fournisseurs:true,flux_app:true,flux_tech:true});
  } else if(id==='codir'){
    state.filters = {...baseFilters};
    state.special='codir';
    state.layers = L({processus:true,applications:true,fournisseurs:true,flux_app:true});
  }
  renderCalquesPane(); renderFiltresPane(); renderGraph(); syncPresetButtons(id);
  showToast(`Vue « ${PRESETS.find(p=>p.id===id).label} » appliquée`);
}

/* ============================================================
   LÉGENDE
   ============================================================ */
function renderLegend(){
  document.getElementById('legend').innerHTML = `
    <div class="legend-col">
      <div class="legend-item"><i style="background:${TYPE_META.application.color}"></i>Application</div>
      <div class="legend-item"><i style="background:${TYPE_META.processus.color}"></i>Processus</div>
      <div class="legend-item"><i style="background:${TYPE_META.fournisseur.color}"></i>Fournisseur</div>
      <div class="legend-item"><i style="background:${TYPE_META.donnee.color}"></i>Donnée</div>
      <div class="legend-item"><i style="background:${TYPE_META.infrastructure.color}"></i>Infrastructure</div>
    </div>
    <div class="legend-col">
      <div class="legend-item"><span class="ln" style="border-color:${DANGER}"></span>Flux critique / non sécurisé</div>
      <div class="legend-item"><span class="ln" style="border-color:${FLOW_COLOR.applicatif}"></span>Flux applicatif</div>
      <div class="legend-item"><span class="ln" style="border-color:${FLOW_COLOR.metier}"></span>Flux métier</div>
      <div class="legend-item"><span class="ln dashed" style="border-color:${FLOW_COLOR.technique}"></span>Flux manuel (pointillé)</div>
    </div>
  `;
}

/* ============================================================
   MENU CRÉER
   ============================================================ */
function atToggleMenu(e){ e.stopPropagation(); document.getElementById('create-menu').classList.toggle('open'); }

/* ============================================================
   TOAST
   ============================================================ */
let toastTimer=null;
function showToast(msg){
  const t=document.getElementById('toast'); t.textContent=msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.classList.remove('show'),2600);
}

/* ============================================================
   INIT
   ============================================================ */
function boot(){
  initCanvas();
  renderPresetBar();
  renderCalquesPane();
  renderFiltresPane();
  renderGraph();
  atRecenter();
  syncPresetButtons(null);
  document.getElementById('atlas-search').addEventListener('keydown', e=>{
    if(e.key==='Enter'){ const rows=document.querySelectorAll('.tb-search-row'); if(rows[0] && rows[0].onclick) rows[0].click(); }
  });
  window.addEventListener('resize', ()=>atRecenter());
  const ro = new ResizeObserver(()=>atRecenter());
  ro.observe(document.getElementById('canvas-wrap'));
}
document.addEventListener('DOMContentLoaded', boot);
