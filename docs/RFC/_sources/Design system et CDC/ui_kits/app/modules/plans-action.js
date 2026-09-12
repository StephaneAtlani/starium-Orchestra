/* Plans d'action — kanban et pilotage
   Extrait de « Refonte Portail Client.html ». Script classique, portée globale partagée.
   Chargé avant le script principal. Dépendances globales : fmtEur(), showToast(), showView(). */

/* ─── Plans d'action · sélection puis pilotage ─── */
const PA_PLANS=[
  {id:'all', name:'Vue consolidée', sub:'Tous les projets', proj:null, ico:'<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>', bg:'var(--neutral-100)', fg:'var(--neutral-600)'},
  {id:'portail', name:'Refonte Portail Client', sub:'Espace client & self-care', proj:'Refonte Portail Client', ico:'<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>', bg:'var(--state-info-bg)', fg:'var(--state-info)'},
  {id:'cloud', name:'Migration Cloud', sub:'Infrastructure & hébergement', proj:'Migration Cloud', ico:'<path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>', bg:'var(--teal-bg)', fg:'var(--teal)'},
  {id:'rgpd', name:'Conformité RGPD', sub:'Protection des données', proj:'Conformité RGPD', ico:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>', bg:'var(--purple-bg)', fg:'var(--purple)'},
  {id:'bi', name:'Data & BI Finance', sub:'Pilotage de la donnée', proj:'Data & BI Finance', ico:'<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>', bg:'var(--brand-gold-050)', fg:'var(--brand-gold-700)'}
];
const PA_OWNERS=[{id:'jt',ini:'JT',av:'av-1',name:'Julien Thomas'},{id:'md',ini:'MD',av:'av-2',name:'Marc Dupont'},{id:'sl',ini:'SL',av:'av-3',name:'Sophie Leroy'},{id:'pd',ini:'PD',av:'av-4',name:'Paul Dubois'},{id:'ab',ini:'AB',av:'av-6',name:'Alice Bernard'}];
const PA_COLS=[
  {key:'afaire',label:'À faire',dot:'var(--neutral-400)'},
  {key:'encours',label:'En cours',dot:'var(--state-info)'},
  {key:'revue',label:'En revue',dot:'var(--purple)'},
  {key:'termine',label:'Terminé',dot:'var(--state-success)'}
];
const PA_PRIO={haute:{label:'Priorité haute',tag:'tg-red',dot:'var(--state-danger)'},moyenne:{label:'Priorité moyenne',tag:'tg-gold',dot:'var(--brand-gold)'},basse:{label:'Priorité basse',tag:'tg-neutral',dot:'var(--state-success)'}};
let PA_ACTIONS=[
  {id:1,title:"Finaliser la matrice de droits d'accès",project:'Refonte Portail Client',prio:'haute',status:'afaire',due:'2026-06-20',dueLabel:'20 juin',owner:'sl',progress:null},
  {id:2,title:'Cadrer le plan de bascule des données',project:'Migration Cloud',prio:'moyenne',status:'afaire',due:'2026-07-22',dueLabel:'22 juil.',owner:'jt',progress:null},
  {id:3,title:'Mettre à jour le registre des traitements',project:'Conformité RGPD',prio:'basse',status:'afaire',due:'2026-08-05',dueLabel:'5 août',owner:'ab',progress:null},
  {id:4,title:'Sécuriser la disponibilité du prestataire',project:'Migration Cloud',prio:'haute',status:'encours',due:'2026-07-16',dueLabel:'16 juil.',owner:'sl',progress:40},
  {id:5,title:'Animer les ateliers UX métiers',project:'Refonte Portail Client',prio:'moyenne',status:'encours',due:'2026-07-23',dueLabel:'23 juil.',owner:'md',progress:65},
  {id:6,title:"Documenter les flux d'intégration API",project:'Data & BI Finance',prio:'basse',status:'encours',due:'2026-08-02',dueLabel:'2 août',owner:'jt',progress:30},
  {id:7,title:"Valider la maquette de l'espace client",project:'Refonte Portail Client',prio:'moyenne',status:'revue',due:'2026-07-15',dueLabel:'15 juil.',owner:'ab',progress:null},
  {id:8,title:'Revue du plan de tests de recette',project:'Refonte Portail Client',prio:'basse',status:'revue',due:'2026-07-28',dueLabel:'28 juil.',owner:'md',progress:null},
  {id:9,title:'Cadrage des exigences fonctionnelles',project:'Refonte Portail Client',prio:'moyenne',status:'termine',due:'2026-06-30',dueLabel:'30 juin',owner:'md',progress:100},
  {id:10,title:'Audit RGPD des sous-traitants',project:'Conformité RGPD',prio:'basse',status:'termine',due:'2026-06-25',dueLabel:'25 juin',owner:'jt',progress:100}
];
let paNextId=11, paCurrentId='all', paEditingId=null, paDragId=null, paLayout='kanban';
const PA_STATUS_META={afaire:{label:'À faire',c:'var(--neutral-600)',bg:'var(--neutral-100)'},encours:{label:'En cours',c:'var(--state-info)',bg:'var(--state-info-bg)'},revue:{label:'En revue',c:'var(--purple)',bg:'var(--purple-bg)'},termine:{label:'Terminé',c:'var(--state-success)',bg:'var(--state-success-bg)'}};
function paIconFor(project){
  const p=PA_PLANS.find(x=>x.proj===project);
  return p?p.ico:'<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>';
}
function paIsLate(a){ if(a.status==='termine') return false; return new Date(a.due) < new Date('2026-07-04'); }
function paFilteredActions(proj){
  const statusF=(document.getElementById('pa-status-filter')||{}).value||'all';
  const ownerF=(document.getElementById('pa-owner-filter')||{}).value||'all';
  const q=((document.getElementById('pa-search')||{}).value||'').trim().toLowerCase();
  return PA_ACTIONS.filter(a=>{
    if(proj && a.project!==proj) return false;
    if(statusF!=='all' && a.status!==statusF) return false;
    if(ownerF!=='all' && a.owner!==ownerF) return false;
    if(q && !a.title.toLowerCase().includes(q)) return false;
    return true;
  });
}
function paStats(proj){
  const items=PA_ACTIONS.filter(a=>!proj||a.project===proj);
  const total=items.length, done=items.filter(a=>a.status==='termine').length;
  const cours=items.filter(a=>a.status==='encours').length;
  const late=items.filter(a=>paIsLate(a)).length;
  const taux=total?Math.round(done/total*100):0;
  return {total,open:total-done,cours,late,taux};
}
function paProgClass(p){ return p<50?'pf-bad':(p<80?'pf-warn':'pf-blue'); }
function paCardHTML(a){
  const pr=PA_PRIO[a.prio], own=PA_OWNERS.find(o=>o.id===a.owner)||PA_OWNERS[0];
  const done=a.status==='termine', late=paIsLate(a);
  const tag=done?'<span class="kcard-tag" style="background:var(--state-success-bg);color:var(--state-success)">Réalisé</span>':'<span class="kcard-tag '+pr.tag+'">'+pr.label+'</span>';
  const titleStyle=done?' style="text-decoration:line-through;text-decoration-color:var(--neutral-300)"':'';
  const wrapStyle=done?'flex:1;opacity:.78':'flex:1';
  const dueIcon=done?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
  const dueClass=done?'kcard-due':('kcard-due'+(late?' late':''));
  const dueColor=done?' style="color:var(--state-success)"':'';
  const prog=(a.status==='encours'&&a.progress!=null)?'<div class="prog-cell" style="margin:0 0 10px"><div class="ptrack"><div class="pfill '+paProgClass(a.progress)+'" style="width:'+a.progress+'%"></div></div><span class="prog-pct">'+a.progress+'%</span></div>':'';
  return '<div class="kcard" draggable="true" ondragstart="paDragStart(event,'+a.id+')" ondragend="paDragEnd(event)" onclick="paEditAction('+a.id+')">'
    +'<div style="display:flex"><div class="kprio" style="background:'+(done?'var(--state-success)':pr.dot)+'"></div><div style="'+wrapStyle+'">'
    +'<div class="kcard-top">'+tag+'</div>'
    +'<div class="kcard-title"'+titleStyle+'>'+a.title+'</div>'
    +'<div class="kcard-proj"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">'+paIconFor(a.project)+'</svg>'+a.project+'</div>'
    +prog
    +'<div class="kcard-foot"><span class="'+dueClass+'"'+dueColor+'>'+dueIcon+a.dueLabel+'</span><div class="kav '+own.av+'">'+own.ini+'</div></div>'
    +'</div></div></div>';
}
function paRenderKanban(proj){
  const wrap=document.getElementById('pa-kanban'); if(!wrap) return;
  const items=paFilteredActions(proj);
  wrap.innerHTML=PA_COLS.map(c=>{
    const colItems=items.filter(a=>a.status===c.key);
    return '<div class="kcol" data-status="'+c.key+'" ondragover="paDragOver(event)" ondragleave="paDragLeave(event)" ondrop="paDrop(event,\''+c.key+'\')">'
      +'<div class="kcol-head"><div class="kcol-title"><span class="kcol-dot" style="background:'+c.dot+'"></span>'+c.label+'</div><span class="kcol-count">'+colItems.length+'</span></div>'
      +(colItems.length?colItems.map(paCardHTML).join(''):'<div class="kcard-empty-hint">Glissez une action ici</div>')
      +'</div>';
  }).join('');
}
function paRowHTML(a){
  const pr=PA_PRIO[a.prio], st=PA_STATUS_META[a.status], own=PA_OWNERS.find(o=>o.id===a.owner)||PA_OWNERS[0];
  const late=paIsLate(a);
  const prog=a.progress!=null?('<div class="prog-cell"><div class="ptrack"><div class="pfill '+paProgClass(a.progress)+'" style="width:'+a.progress+'%"></div></div><span class="prog-pct">'+a.progress+'%</span></div>'):'<span style="color:var(--neutral-300)">—</span>';
  return '<tr class="pa-row" onclick="paEditAction('+a.id+')">'
    +'<td><div class="pa-row-title"><i style="background:'+pr.dot+'"></i>'+a.title+'</div></td>'
    +'<td>'+a.project+'</td>'
    +'<td>'+pr.label.replace('Priorité ','')+'</td>'
    +'<td><span class="pa-status-pill" style="background:'+st.bg+';color:'+st.c+'">'+st.label+'</span></td>'
    +'<td style="'+(late?'color:var(--state-danger);font-weight:700':'')+'">'+a.dueLabel+(late?' · retard':'')+'</td>'
    +'<td><div style="display:flex;align-items:center;gap:8px"><div class="kav '+own.av+'">'+own.ini+'</div>'+own.name+'</div></td>'
    +'<td style="min-width:130px">'+prog+'</td>'
    +'<td class="right"><div class="pa-row-actions"><button class="pa-icon-btn" onclick="event.stopPropagation();paEditAction('+a.id+')" aria-label="Modifier"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button><button class="pa-icon-btn" onclick="event.stopPropagation();paDeleteFromList('+a.id+')" aria-label="Supprimer" style="color:var(--state-danger)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button></div></td>'
    +'</tr>';
}
function paRenderList(proj){
  const tbody=document.getElementById('pa-list-tbody'); if(!tbody) return;
  const items=paFilteredActions(proj).sort((a,b)=>new Date(a.due)-new Date(b.due));
  tbody.innerHTML=items.length?items.map(paRowHTML).join(''):'<tr class="pa-empty-row"><td colspan="8">Aucune action ne correspond aux filtres.</td></tr>';
}
function paDeleteFromList(id){
  const a=PA_ACTIONS.find(x=>x.id===id);
  PA_ACTIONS=PA_ACTIONS.filter(x=>x.id!==id);
  paRefresh();
  if(a) showToast('« '+a.title+' » supprimée');
}
function paSetLayout(layout){
  paLayout=layout;
  document.querySelectorAll('#pa-seg .seg-btn').forEach(b=>b.classList.toggle('active', b.dataset.layout===layout));
  document.getElementById('pa-kanban').style.display=(layout==='kanban')?'':'none';
  document.getElementById('pa-listcard').style.display=(layout==='list')?'':'none';
  paRefresh();
}
function paDragStart(e,id){ paDragId=id; e.dataTransfer.effectAllowed='move'; e.currentTarget.classList.add('dragging'); }
function paDragEnd(e){ e.currentTarget.classList.remove('dragging'); }
function paDragOver(e){ e.preventDefault(); e.currentTarget.classList.add('kcol-over'); }
function paDragLeave(e){ e.currentTarget.classList.remove('kcol-over'); }
function paDrop(e,status){
  e.preventDefault();
  document.querySelectorAll('#pa-kanban .kcol').forEach(c=>c.classList.remove('kcol-over'));
  const a=PA_ACTIONS.find(x=>x.id===paDragId); paDragId=null;
  if(!a || a.status===status) return;
  a.status=status;
  if(status==='encours' && a.progress==null) a.progress=10;
  if(status==='termine') a.progress=100;
  paRefresh();
  showToast('« '+a.title+' » déplacée vers « '+PA_COLS.find(c=>c.key===status).label+' »');
}
function paRefresh(){
  const p=PA_PLANS.find(x=>x.id===paCurrentId)||PA_PLANS[0];
  if(paLayout==='list') paRenderList(p.proj); else paRenderKanban(p.proj);
  const s=paStats(p.proj);
  const nums=document.querySelectorAll('#plans-detail .list-kpi-num');
  if(nums[0]) nums[0].textContent=s.open;
  if(nums[1]) nums[1].textContent=s.cours;
  if(nums[2]) nums[2].textContent=s.late;
  if(nums[3]) nums[3].textContent=s.taux+'%';
}
function paPopulateSelects(){
  const projSel=document.getElementById('am-proj'), ownSel=document.getElementById('am-owner');
  projSel.innerHTML=PA_PLANS.filter(p=>p.proj).map(p=>'<option value="'+p.proj+'">'+p.proj+'</option>').join('');
  ownSel.innerHTML=PA_OWNERS.map(o=>'<option value="'+o.id+'">'+o.name+'</option>').join('');
  const ownerFilter=document.getElementById('pa-owner-filter');
  if(ownerFilter && ownerFilter.options.length<=1){
    ownerFilter.innerHTML='<option value="all">Responsable · tous</option>'+PA_OWNERS.map(o=>'<option value="'+o.id+'">'+o.name+'</option>').join('');
  }
}
function amPickPrio(el){ el.parentElement.querySelectorAll('.type-pill').forEach(p=>p.classList.remove('sel')); el.classList.add('sel'); }
function amStatusChanged(){ document.getElementById('am-prog-field').style.display=(document.getElementById('am-status').value==='encours')?'':'none'; }
function paEditAction(id){
  paEditingId=id;
  const a=PA_ACTIONS.find(x=>x.id===id); if(!a) return;
  paPopulateSelects();
  document.getElementById('am-modaltitle').textContent="Modifier l'action";
  document.getElementById('am-modalsub').textContent=a.project;
  document.getElementById('am-title').value=a.title;
  document.getElementById('am-proj').value=a.project;
  document.getElementById('am-status').value=a.status;
  document.getElementById('am-owner').value=a.owner;
  document.getElementById('am-due').value=a.due;
  document.getElementById('am-prio').querySelectorAll('.type-pill').forEach(p=>p.classList.toggle('sel', p.dataset.prio===a.prio));
  document.getElementById('am-prog').value=a.progress||40;
  document.getElementById('am-prog-val').textContent=(a.progress||40)+'%';
  document.getElementById('am-delete').style.display='';
  amStatusChanged();
  document.getElementById('actionModal').classList.add('open');
}
function paNewAction(){
  paEditingId=null;
  paPopulateSelects();
  document.getElementById('am-modaltitle').textContent='Nouvelle action';
  document.getElementById('am-modalsub').textContent="Créer une action corrective ou d'amélioration";
  document.getElementById('am-title').value='';
  const p=PA_PLANS.find(x=>x.id===paCurrentId);
  document.getElementById('am-proj').value=(p&&p.proj)?p.proj:PA_PLANS[1].proj;
  document.getElementById('am-status').value='afaire';
  document.getElementById('am-owner').value=PA_OWNERS[0].id;
  document.getElementById('am-due').value='2026-07-15';
  document.getElementById('am-prio').querySelectorAll('.type-pill').forEach(p=>p.classList.toggle('sel', p.dataset.prio==='moyenne'));
  document.getElementById('am-prog').value=10;
  document.getElementById('am-prog-val').textContent='10%';
  document.getElementById('am-delete').style.display='none';
  amStatusChanged();
  document.getElementById('actionModal').classList.add('open');
}
function paCloseAction(){ document.getElementById('actionModal').classList.remove('open'); }
function paSaveAction(){
  const title=document.getElementById('am-title').value.trim();
  if(!title){ showToast('Merci de renseigner un titre'); return; }
  const prio=(document.getElementById('am-prio').querySelector('.type-pill.sel')||{}).dataset?.prio||'moyenne';
  const status=document.getElementById('am-status').value;
  const due=document.getElementById('am-due').value || '2026-07-15';
  const dueDate=new Date(due);
  const dueLabel=isNaN(dueDate)?due:dueDate.toLocaleDateString('fr-FR',{day:'numeric',month:'short'});
  const progress=status==='encours'?+document.getElementById('am-prog').value:(status==='termine'?100:null);
  const data={
    title, project:document.getElementById('am-proj').value, prio, status,
    due, dueLabel, owner:document.getElementById('am-owner').value, progress
  };
  if(paEditingId){
    const a=PA_ACTIONS.find(x=>x.id===paEditingId); Object.assign(a,data);
    showToast('Action mise à jour');
  } else {
    PA_ACTIONS.push(Object.assign({id:paNextId++},data));
    showToast('Action créée');
  }
  paCloseAction();
  paRefresh();
}
function paDeleteAction(){
  if(!paEditingId) return;
  const a=PA_ACTIONS.find(x=>x.id===paEditingId);
  PA_ACTIONS=PA_ACTIONS.filter(x=>x.id!==paEditingId);
  paCloseAction();
  paRefresh();
  if(a) showToast('« '+a.title+' » supprimée');
}
function paRenderHome(){
  const grid=document.getElementById('pa-cardgrid'); if(!grid) return;
  grid.innerHTML=PA_PLANS.map(p=>{
    const s=paStats(p.proj);
    return '<div class="mb-card" onclick="paOpen(\''+p.id+'\')">'
      +'<div class="mb-card-top"><div class="mb-card-ico" style="background:'+p.bg+';color:'+p.fg+'"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">'+p.ico+'</svg></div><div class="mb-card-tt"><div class="mb-card-name">'+p.name+'</div><div class="mb-card-dir">'+p.sub+'</div></div></div>'
      +'<div class="mb-card-total">Actions ouvertes<br><b>'+s.open+'</b> <span style="font-size:12px;font-weight:600;color:var(--neutral-500)">/ '+s.total+' au total</span></div>'
      +'<div class="mb-card-track"><i style="width:'+s.taux+'%;background:var(--state-success)"></i></div>'
      +'<div style="display:flex;justify-content:space-between;font-size:11px;font-weight:700"><span style="color:var(--neutral-500)">Réalisé '+s.taux+'%</span><span style="color:var(--neutral-500)">'+s.cours+' en cours</span></div>'
      +'<div class="mb-card-foot"><div>'+(s.late>0?'<span class="mb-card-alert"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/></svg>'+s.late+' en retard</span>':'<span class="mcf-k" style="color:var(--state-success);font-weight:700">À jour</span>')+'</div><span class="mb-card-arrow">Ouvrir<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg></span></div>'
      +'</div>';
  }).join('');
}
function paShowHome(){
  document.getElementById('plans-detail').style.display='none';
  document.getElementById('plans-home').style.display='';
  paRenderHome();
}
function paOpen(id){
  const p=PA_PLANS.find(x=>x.id===id)||PA_PLANS[0];
  paCurrentId=id;
  document.getElementById('plans-home').style.display='none';
  document.getElementById('plans-detail').style.display='';
  document.querySelector('.page-content').scrollTop=0;
  document.getElementById('pa-title').textContent=p.name;
  document.getElementById('pa-sub').textContent=p.proj?('Actions correctives et d\'amélioration du projet '+p.proj+'.'):'Pilotez les actions correctives et d\'amélioration sur l\'ensemble des projets.';
  document.getElementById('breadcrumb').innerHTML='<a onclick="showView(\'list\')">Pilotage</a><span class="bc-sep">/</span><a onclick="paShowHome()">Plans d\'action</a><span class="bc-sep">/</span><span class="bc-current">'+p.name+'</span>';
  paPopulateSelects();
  paRefresh();
}
function showTab(name){
  document.querySelectorAll('#view-detail .dtab').forEach(t=>t.classList.toggle('active', t.dataset.tab===name));
  document.querySelectorAll('#view-detail .tab-pane').forEach(p=>p.classList.toggle('active', p.dataset.pane===name));
  document.querySelector('.page-content').scrollTop=0;
  if(name==='pointsprojet') ppSync();
}

