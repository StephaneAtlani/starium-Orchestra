/* Scénario — quarterplan, Gantt, charge des équipes
   Extrait de « Refonte Portail Client.html ». Script classique, portée globale partagée.
   Chargé avant le script principal. Dépendances globales : fmtEur(), showToast(), showView(). */

/* ═══════════ SCÉNARIO — planificateur quarterplan ═══════════ */
const SCN_COLS=8; // 2025 Q1 → 2026 Q4
const SCN_QLBL=['Q1','Q2','Q3','Q4','Q1','Q2','Q3','Q4'];
const SCN_QYR=['2025','2025','2025','2025','2026','2026','2026','2026'];
const SCN_TEAMS=[
  {id:'it',name:'IT',color:'var(--state-info)',cap:[20,20,20,20,20,20,20,20]},
  {id:'mkt',name:'Marketing',color:'var(--purple)',cap:[15,15,15,15,15,15,15,15]},
  {id:'fin',name:'Finance',color:'var(--brand-gold)',cap:[12,12,12,12,12,12,12,12]},
  {id:'log',name:'Logistique',color:'var(--teal)',cap:[14,14,14,14,14,14,14,14]}
];
// start = trimestre de début (0-7), span = nb trimestres, load = charge/trim par équipe
let SCN_PROJECTS=[
  {id:'p1',name:'Harmonisation des data cross-canal',on:true,start:0,span:3,load:{it:6,mkt:4}},
  {id:'p2',name:'Connexion du CRM avec le SI',on:true,start:1,span:5,load:{it:7,mkt:6}},
  {id:'p3',name:'POC de data lake sur les données',on:false,start:0,span:3,load:{it:6}},
  {id:'p4',name:"Mise en place d'un outil de reporting",on:true,start:1,span:4,load:{fin:7,it:3}},
  {id:'p5',name:'Intégration du module de livraison',on:true,start:2,span:5,load:{log:9,it:4}},
  {id:'p6',name:'Amélioration de la Présence web',on:true,start:0,span:4,load:{mkt:8}},
  {id:'p7',name:"Mise à jour de l'outil ATS",on:true,start:2,span:6,load:{it:4,fin:3}},
  {id:'p8',name:'Retour au bureau - gestion des espaces',on:false,start:0,span:5,load:{log:5}}
];
const scnOpenTeams={};
function scnTeamLoad(teamId,q){let s=0;SCN_PROJECTS.forEach(p=>{if(p.on&&p.load[teamId]!=null&&q>=p.start&&q<p.start+p.span)s+=p.load[teamId];});return s;}
function scnRender(){scnRenderGantt();scnRenderTeams();}
function scnRenderGantt(){
  const g=document.getElementById('scnGantt');if(!g)return;
  let yrs='<div class="scn-grow scn-yrs"><div style="grid-row:1"></div>';
  yrs+='<div class="scn-yr" style="grid-column:2 / 6">2025</div><div class="scn-yr" style="grid-column:6 / 10">2026</div></div>';
  let qs='<div class="scn-grow scn-qs"><div class="scn-lblh"><span>Nom du projet</span><span class="scn-collapse" title="Réduire">‹</span></div>';
  for(let q=0;q<SCN_COLS;q++)qs+='<div class="scn-q">'+SCN_QLBL[q]+'</div>';
  qs+='</div>';
  let rows='';
  SCN_PROJECTS.forEach(p=>{
    const left=p.start/SCN_COLS*100,width=p.span/SCN_COLS*100;
    let dots='';for(let i=0;i<p.span;i++)dots+='<span class="scn-ms"></span>';
    rows+='<div class="scn-grow scn-prow" data-pid="'+p.id+'">'
      +'<div class="scn-lbl"><span class="scn-tog'+(p.on?' on':'')+'" onclick="scnToggle(\''+p.id+'\')"></span><span class="scn-pname" title="'+p.name+'">'+p.name+'</span></div>'
      +'<div class="scn-track"><div class="scn-ghost"></div>'
      +'<div class="scn-bar'+(p.on?'':' off')+'" style="left:'+left+'%;width:'+width+'%" data-pid="'+p.id+'" onpointerdown="scnDragStart(event,\''+p.id+'\')">'+dots+'</div>'
      +'</div></div>';
  });
  g.innerHTML=yrs+qs+rows;
}
function scnRenderTeams(){
  const el=document.getElementById('scnTeams');if(!el)return;
  let head='<tr><th>Équipe</th>';for(let q=0;q<SCN_COLS;q++)head+='<th>'+SCN_QLBL[q]+'<span class="yr">'+SCN_QYR[q]+'</span></th>';head+='</tr>';
  let body='';
  SCN_TEAMS.forEach(t=>{
    const open=scnOpenTeams[t.id];
    body+='<tr class="scn-trow'+(open?' open':'')+'"><td><div class="scn-tteam" onclick="scnToggleTeam(\''+t.id+'\')"><svg class="scn-tchev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"/></svg><span class="scn-tdot" style="background:'+t.color+'"></span>'+t.name+'</div></td>';
    for(let q=0;q<SCN_COLS;q++){const load=scnTeamLoad(t.id,q),cap=t.cap[q],over=load>cap;body+='<td class="scn-cell'+(over?' warn':'')+'"><span class="'+(over?'scn-over':'')+'">'+load+'/'+cap+'</span></td>';}
    body+='</tr>';
    // sous-lignes : projets contributeurs
    const contrib=SCN_PROJECTS.filter(p=>p.on&&p.load[t.id]!=null);
    contrib.forEach(p=>{
      body+='<tr class="scn-subrow'+(open?' open':'')+'"><td class="scn-sub">'+p.name+'</td>';
      for(let q=0;q<SCN_COLS;q++){const v=(q>=p.start&&q<p.start+p.span)?p.load[t.id]:0;body+='<td class="scn-sub">'+(v?v:'·')+'</td>';}
      body+='</tr>';
    });
    if(open&&!contrib.length)body+='<tr class="scn-subrow open"><td class="scn-sub" colspan="'+(SCN_COLS+1)+'">Aucun projet actif sur cette équipe.</td></tr>';
  });
  el.innerHTML='<table class="scn-tbl"><thead>'+head+'</thead><tbody>'+body+'</tbody></table>';
}
function scnToggle(id){const p=SCN_PROJECTS.find(x=>x.id===id);if(p){p.on=!p.on;scnRender();}}
function scnToggleTeam(id){scnOpenTeams[id]=!scnOpenTeams[id];scnRenderTeams();}
let scnDrag=null;
function scnDragStart(e,id){
  const p=SCN_PROJECTS.find(x=>x.id===id);if(!p||!p.on)return;
  const bar=e.currentTarget,track=bar.parentElement,tw=track.getBoundingClientRect().width,qw=tw/SCN_COLS;
  const ghost=track.querySelector('.scn-ghost');
  ghost.style.left=(p.start/SCN_COLS*100)+'%';ghost.style.width=(p.span/SCN_COLS*100)+'%';ghost.style.display='block';
  bar.classList.add('dragging');bar.setPointerCapture(e.pointerId);
  scnDrag={p,bar,track,qw,startX:e.clientX,origStart:p.start,newStart:p.start};
  const tip=document.getElementById('scnDragTip');tip.classList.add('on');
  scnDragMove(e);
  window.addEventListener('pointermove',scnDragMove);
  window.addEventListener('pointerup',scnDragEnd);
}
function scnDragMove(e){
  if(!scnDrag)return;const{p,bar,track,qw,startX,origStart}=scnDrag;
  let dq=Math.round((e.clientX-startX)/qw);
  let ns=Math.max(0,Math.min(SCN_COLS-p.span,origStart+dq));
  scnDrag.newStart=ns;
  bar.style.left=(ns/SCN_COLS*100)+'%';
  const tip=document.getElementById('scnDragTip'),card=document.querySelector('.scn-gantt-card').getBoundingClientRect(),br=bar.getBoundingClientRect();
  tip.style.left=(br.left+br.width/2-card.left)+'px';tip.style.top=(br.top-card.top)+'px';
  tip.textContent='Déplacer · '+SCN_QLBL[ns]+' '+SCN_QYR[ns];
}
function scnDragEnd(){
  if(!scnDrag)return;const{p,bar,newStart}=scnDrag;
  p.start=newStart;bar.classList.remove('dragging');
  document.getElementById('scnDragTip').classList.remove('on');
  window.removeEventListener('pointermove',scnDragMove);window.removeEventListener('pointerup',scnDragEnd);
  scnDrag=null;scnRender();
}
function scnCreate(){const t=document.getElementById('scnDragTip');t.textContent='Scénario dupliqué ✓';t.style.left='50%';t.style.top='60px';t.classList.add('on');setTimeout(()=>t.classList.remove('on'),1400);}
function scnExport(){const t=document.getElementById('scnDragTip');t.textContent='Export du scénario ✓';t.style.left='50%';t.style.top='60px';t.classList.add('on');setTimeout(()=>t.classList.remove('on'),1400);}

