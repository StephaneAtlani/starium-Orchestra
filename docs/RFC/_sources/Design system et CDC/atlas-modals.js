/* ============================================================
   STARIUM ATLAS — modales de création
   ============================================================ */

let omType='application', omCrit='moyenne', fmCrit='moyenne';
let objSeq=1, edgeSeq=100;

function omRenderTypes(){
  document.getElementById('om-types').innerHTML = Object.entries(TYPE_META).map(([k,v])=>
    `<div class="type-opt ${omType===k?'sel':''}" onclick="omPickType('${k}')">${v.label}</div>`).join('');
}
function omPickType(k){ omType=k; omRenderTypes(); }
function omRenderCrit(){
  document.getElementById('om-crit').innerHTML = Object.entries(CRIT_META).map(([k,v])=>
    `<div class="type-opt ${omCrit===k?'sel':''}" onclick="omPickCrit('${k}')">${v.label}</div>`).join('');
}
function omPickCrit(k){ omCrit=k; omRenderCrit(); }

function omOpen(){
  document.getElementById('create-menu').classList.remove('open');
  omType='application'; omCrit='moyenne';
  document.getElementById('om-name').value='';
  document.getElementById('om-desc').value='';
  document.getElementById('om-ownerb').value='';
  document.getElementById('om-ownert').value='';
  omRenderTypes(); omRenderCrit();
  document.getElementById('om-overlay').classList.add('open');
}
function omClose(){ document.getElementById('om-overlay').classList.remove('open'); }
function omSave(){
  const name = document.getElementById('om-name').value.trim();
  if(!name){ showToast('Merci de renseigner un nom'); return; }
  const rect = svgRoot.getBoundingClientRect();
  // place new node near current viewport center, in canvas coordinates
  const cx = (rect.width/2 - state.tx)/state.scale;
  const cy = (rect.height/2 - state.ty)/state.scale;
  const id = 'new'+(objSeq++);
  NODES.push({
    id, type:omType, name, x:cx+(Math.random()*60-30), y:cy+(Math.random()*60-30),
    crit:omCrit, status:'Production', ownerBiz:document.getElementById('om-ownerb').value.trim(),
    ownerTech:document.getElementById('om-ownert').value.trim(), lastReview:new Date().toISOString().slice(0,10),
    completeness:35, desc:document.getElementById('om-desc').value.trim(), badges:['fiche']
  });
  NODE_BY_ID[id]=NODES[NODES.length-1];
  state.layers[LAYER_KEY_FOR_TYPE[omType]] = true;
  state.filters.crit.add(omCrit);
  omClose();
  renderCalquesPane(); renderFiltresPane(); renderGraph();
  showToast('« '+name+' » ajouté à la cartographie');
  atSelect(id);
}

function fmPopulateSelects(){
  const opts = NODES.map(n=>`<option value="${n.id}">${n.name}</option>`).join('');
  document.getElementById('fm-source').innerHTML = opts;
  document.getElementById('fm-target').innerHTML = opts;
}
function fmRenderCrit(){
  document.getElementById('fm-crit').innerHTML = Object.entries(CRIT_META).map(([k,v])=>
    `<div class="type-opt ${fmCrit===k?'sel':''}" onclick="fmPickCrit('${k}')">${v.label}</div>`).join('');
}
function fmPickCrit(k){ fmCrit=k; fmRenderCrit(); }
function fmOpen(){
  document.getElementById('create-menu').classList.remove('open');
  fmCrit='moyenne';
  fmPopulateSelects();
  if(state.selected){ document.getElementById('fm-source').value = state.selected; }
  document.getElementById('fm-freq').value='';
  document.getElementById('fm-secure').classList.add('on');
  document.getElementById('fm-manual').classList.remove('on');
  fmRenderCrit();
  document.getElementById('fm-overlay').classList.add('open');
}
function fmClose(){ document.getElementById('fm-overlay').classList.remove('open'); }
function fmSave(){
  const s = document.getElementById('fm-source').value, t = document.getElementById('fm-target').value;
  if(!s||!t||s===t){ showToast('Choisissez deux objets distincts'); return; }
  const id = 'enew'+(edgeSeq++);
  EDGES.push({
    id, s, t, flow:document.getElementById('fm-flowtype').value, mode:document.getElementById('fm-mode').value,
    freq:document.getElementById('fm-freq').value.trim()||'Non précisée', crit:fmCrit,
    dir:document.getElementById('fm-dir').value, secure:document.getElementById('fm-secure').classList.contains('on'),
    manual:document.getElementById('fm-manual').classList.contains('on')
  });
  fmClose();
  renderGraph();
  showToast('Flux « '+NODE_BY_ID[s].name+' → '+NODE_BY_ID[t].name+' » créé');
}
