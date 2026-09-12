/* Équipes — planning éditable
   Extrait de « Refonte Portail Client.html ». Script classique, portée globale partagée.
   Chargé avant le script principal. Dépendances globales : fmtEur(), showToast(), showView(). */

/* ═══════════ ÉQUIPES · planning éditable ═══════════ */
const EQ_MEMBERS=[
  {id:'jt',ini:'JT',av:'av-1',name:'Julien Thomas',role:'Lead technique',team:'Développement',lead:true},
  {id:'md',ini:'MD',av:'av-2',name:'Marc Dupont',role:'Chef de projet',team:'Développement'},
  {id:'cn',ini:'CN',av:'av-5',name:'Camille Noël',role:'Développeuse',team:'Développement'},
  {id:'ab',ini:'AB',av:'av-6',name:'Alice Bernard',role:'Lead UX & Design',team:'Design & UX',lead:true},
  {id:'sl',ini:'SL',av:'av-3',name:'Sophie Leroy',role:'Architecte système',team:'Infrastructure',lead:true},
  {id:'pd',ini:'PD',av:'av-4',name:'Paul Dubois',role:'Data Engineer',team:'Infrastructure'}
];
const EQ_ASSIGN={
  portail:{label:'Portail Client',sub:'7h',c:'var(--state-info)',bg:'var(--state-info-bg)'},
  cloud:{label:'Migration Cloud',sub:'7h',c:'var(--teal)',bg:'var(--teal-bg)'},
  sirh:{label:'SI RH',sub:'7h',c:'var(--purple)',bg:'var(--purple-bg)'},
  dora:{label:'Conformité DORA',sub:'7h',c:'var(--brand-gold-700)',bg:'var(--brand-gold-050)'},
  teletravail:{label:'Télétravail',sub:'',c:'var(--state-success)',bg:'var(--state-success-bg)'},
  formation:{label:'Formation',sub:'',c:'#A02A52',bg:'#F6D7E3'},
  conge:{label:'Congé',sub:'',c:'var(--neutral-500)',bg:'var(--neutral-100)'}
};
const EQ_BASE={
  jt:['portail','portail','cloud','portail','formation'],
  md:['portail','portail','portail','teletravail','portail'],
  cn:['portail','cloud','cloud','portail','teletravail'],
  ab:['portail','portail','sirh','teletravail','portail'],
  sl:['cloud','cloud','dora','cloud','teletravail'],
  pd:['sirh','sirh','conge','conge','sirh']
};
const EQ_MONTHS=['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];
const EQ_DAYNAMES=['Lun','Mar','Mer','Jeu','Ven'];
function eqBuildWeeks(){
  const base=new Date(2025,4,12); // lundi 12 mai (semaine courante = index 1)
  const arr=[];
  for(let i=0;i<5;i++){
    const mon=new Date(base); mon.setDate(base.getDate()+(i-1)*7);
    const days=[];
    for(let d=0;d<5;d++){ const dt=new Date(mon); dt.setDate(mon.getDate()+d);
      const dm=dt.getDate()+' '+EQ_MONTHS[dt.getMonth()];
      days.push({n:EQ_DAYNAMES[d], d:dm, full:EQ_DAYNAMES[d]+' '+dm}); }
    const fri=new Date(mon); fri.setDate(mon.getDate()+4);
    arr.push({label:mon.getDate()+' – '+fri.getDate()+' '+EQ_MONTHS[fri.getMonth()]+' 2025', short:'Semaine '+(19+i), days});
  }
  return arr;
}
const EQ_WEEKS=eqBuildWeeks();
const EQ_TODAY={w:1,d:2};
let eqWeekIdx=1, eqTeamFilter='all', eqEdit={mid:null,day:null,val:null};
let eqPlan={}; try{ eqPlan=JSON.parse(localStorage.getItem('starium_eq_plan'))||{}; }catch(e){ eqPlan={}; }
function eqPersist(){ try{ localStorage.setItem('starium_eq_plan', JSON.stringify(eqPlan)); }catch(e){} }
function eqGetRow(mid){
  eqPlan[mid]=eqPlan[mid]||{};
  if(!eqPlan[mid][eqWeekIdx]) eqPlan[mid][eqWeekIdx]=(EQ_BASE[mid]||[null,null,null,null,null]).slice();
  return eqPlan[mid][eqWeekIdx];
}
function eqBlockHtml(key){
  if(!key) return '<div class="pg-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></div>';
  const a=EQ_ASSIGN[key]; if(!a) return '';
  return '<div class="pg-block" style="background:'+a.bg+';border-color:'+a.c+';color:'+a.c+'"><span class="pg-block-t">'+a.label+'</span>'+(a.sub?'<span class="pg-block-s">'+a.sub+'</span>':'')+'</div>';
}
function renderPlan(){
  const wrap=document.getElementById('planGridWrap'); if(!wrap) return;
  const wk=EQ_WEEKS[eqWeekIdx];
  const lbl=document.getElementById('planWeekLabel'); if(lbl) lbl.textContent=wk.label;
  let html='<table class="plangrid"><thead><tr><th class="pg-mcol">Membre</th>';
  wk.days.forEach((d,i)=>{ const t=(eqWeekIdx===EQ_TODAY.w && i===EQ_TODAY.d); html+='<th class="pg-day'+(t?' today':'')+'">'+d.n+'<div class="pg-day-d">'+d.d+'</div></th>'; });
  html+='</tr></thead><tbody>';
  const rows=EQ_MEMBERS.filter(m=>eqTeamFilter==='all'||m.team===eqTeamFilter);
  rows.forEach(m=>{
    html+='<tr><td><div class="pg-member"><div class="av '+m.av+'">'+m.ini+'</div><div><div class="pg-member-name">'+m.name+'</div><div class="pg-member-role">'+(m.lead?'<span class="lead-dot">● </span>':'')+m.role+'</div></div></div></td>';
    const row=eqGetRow(m.id);
    for(let i=0;i<5;i++){ const t=(eqWeekIdx===EQ_TODAY.w && i===EQ_TODAY.d);
      html+='<td class="pg-cell'+(t?' today':'')+'" onclick="eqEditCell(event,\''+m.id+'\','+i+')">'+eqBlockHtml(row[i])+'</td>'; }
    html+='</tr>';
  });
  html+='</tbody></table>';
  wrap.innerHTML=html;
}
function eqWeek(dir){ eqWeekIdx=Math.max(0,Math.min(EQ_WEEKS.length-1,eqWeekIdx+dir)); eqCloseEdit(); renderPlan(); }
function eqToday(){ eqWeekIdx=EQ_TODAY.w; eqCloseEdit(); renderPlan(); }
function eqSetFilter(v){ eqTeamFilter=v; eqCloseEdit(); renderPlan(); }
function eqSwitch(tab){
  document.querySelectorAll('.eq-switch button').forEach(b=>b.classList.toggle('active', b.dataset.eqtab===tab));
  const eq=document.getElementById('eq-sub-equipes'), pl=document.getElementById('eq-sub-planning');
  if(eq) eq.hidden=(tab!=='equipes');
  if(pl) pl.hidden=(tab!=='planning');
  if(tab==='planning') renderPlan(); else eqCloseEdit();
}
function eqOpenPlanning(team){
  eqTeamFilter=team||'all';
  const sel=document.getElementById('eqTeamFilter'); if(sel) sel.value=eqTeamFilter;
  eqSwitch('planning');
}
function eqRenderOpts(){
  const box=document.getElementById('peOpts'); if(!box) return; let h='';
  Object.keys(EQ_ASSIGN).forEach(k=>{ const a=EQ_ASSIGN[k]; h+='<button class="pe-opt'+(eqEdit.val===k?' sel':'')+'" onclick="eqPick(\''+k+'\')"><i style="background:'+a.c+'"></i>'+a.label+'</button>'; });
  box.innerHTML=h;
}
function eqPick(k){ eqEdit.val=(eqEdit.val===k?null:k); eqRenderOpts(); }
function eqEditCell(e,mid,day){
  e.stopPropagation();
  eqEdit={mid:mid,day:day,val:eqGetRow(mid)[day]};
  const m=EQ_MEMBERS.find(x=>x.id===mid), wk=EQ_WEEKS[eqWeekIdx];
  document.getElementById('peTitle').textContent=m.name;
  document.getElementById('peSub').textContent=wk.days[day].full+' · '+wk.short;
  eqRenderOpts();
  const pop=document.getElementById('pePop'), bd=document.getElementById('peBackdrop');
  bd.classList.add('open'); pop.classList.add('open');
  const r=e.currentTarget.getBoundingClientRect();
  const pw=280, ph=pop.offsetHeight||320;
  let left=r.left, top=r.bottom+8;
  if(left+pw>window.innerWidth-12) left=window.innerWidth-pw-12;
  if(top+ph>window.innerHeight-12) top=r.top-ph-8;
  pop.style.left=Math.max(12,left)+'px'; pop.style.top=Math.max(12,top)+'px';
}
function eqSaveCell(){ if(eqEdit.mid){ eqGetRow(eqEdit.mid)[eqEdit.day]=eqEdit.val; eqPersist(); renderPlan(); } eqCloseEdit(); }
function eqClearCell(){ if(eqEdit.mid){ eqGetRow(eqEdit.mid)[eqEdit.day]=null; eqPersist(); renderPlan(); } eqCloseEdit(); }
function eqCloseEdit(){ const p=document.getElementById('pePop'), b=document.getElementById('peBackdrop'); if(p)p.classList.remove('open'); if(b)b.classList.remove('open'); }
renderPlan();

