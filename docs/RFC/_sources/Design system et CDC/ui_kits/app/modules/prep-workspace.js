/* ═══ ATELIER DE PRÉPARATION — modèles par type, ODJ par sections, sources à reprendre ═══ */
const TPL_DEFAULTS={
  COPROJ:{label:'Comité projet',cadence:'Hebdomadaire',jour:'Mardi',heure:'09:30',duree:45,lieu:'Salle Cadence / Teams',parts:['MD','SL','JT','AB','PD'],up:'COPIL',auto:true,sections:[
    {id:'suivi',title:'Suivi des actions et décisions précédentes',dur:10,nature:'info',pull:['actions','decisions']},
    {id:'avancement',title:'Avancement des chantiers',dur:15,nature:'info',pull:['jalons','taches'],legacy:true},
    {id:'blocages',title:'Points bloquants et arbitrages',dur:10,nature:'arbitrage',pull:['arbs','risks']},
    {id:'remontee',title:'Sujets à remonter au COPIL',dur:5,nature:'decision',pull:[]},
    {id:'divers',title:'Questions diverses',dur:5,nature:'info',pull:[]}]},
  COPIL:{label:'Comité de pilotage',cadence:'Mensuel',jour:'Vendredi',heure:'14:00',duree:90,lieu:'Salle Horizon / Teams',parts:['MD','SL','JT','PD','AB','CL'],up:'CODIR',auto:true,sections:[
    {id:'synthese',title:'Synthèse des COPROJ depuis le dernier COPIL',dur:15,nature:'info',pull:['remontes']},
    {id:'suivi',title:'Décisions précédentes et actions',dur:10,nature:'info',pull:['decisions','actions']},
    {id:'avancement',title:'Avancement, budget, jalons',dur:20,nature:'info',pull:['jalons'],legacy:true},
    {id:'arbitrages',title:'Décisions et arbitrages attendus',dur:25,nature:'arbitrage',pull:['arbs']},
    {id:'risques',title:'Risques et plan de maîtrise',dur:10,nature:'decision',pull:['risks']},
    {id:'divers',title:'Points divers',dur:10,nature:'info',pull:[]}]},
  COTECH:{label:'Comité technique',cadence:'Bimensuel',jour:'Jeudi',heure:'11:00',duree:60,lieu:'Salle Atelier / Teams',parts:['JT','PD','AB'],up:'COPROJ',auto:true,sections:[
    {id:'archi',title:'Architecture et dette technique',dur:20,nature:'info',pull:['taches'],legacy:true},
    {id:'ssi',title:'Sécurité et conformité',dur:15,nature:'info',pull:['risks']},
    {id:'arbit',title:'Arbitrages techniques',dur:20,nature:'arbitrage',pull:['arbs']},
    {id:'divers',title:'Questions diverses',dur:5,nature:'info',pull:[]}]},
  CODIR:{label:'Comité de direction',cadence:'Trimestriel',jour:'Lundi',heure:'09:00',duree:120,lieu:'Salle du Conseil',parts:['CL','MD','SL'],up:null,auto:false,sections:[
    {id:'portefeuille',title:'Revue du portefeuille',dur:40,nature:'info',pull:['remontes'],legacy:true},
    {id:'arbit',title:'Arbitrages stratégiques',dur:50,nature:'arbitrage',pull:['arbs','decisions']},
    {id:'risques',title:'Risques majeurs',dur:20,nature:'decision',pull:['risks']},
    {id:'divers',title:'Points divers',dur:10,nature:'info',pull:[]}]},
  CRA:{label:'Revue de portefeuille',cadence:'Mensuel',jour:'Mercredi',heure:'10:00',duree:60,lieu:'Teams',parts:['MD','AB','SL','PD'],up:'CODIR',auto:true,sections:[
    {id:'avancement',title:'Avancement des projets',dur:30,nature:'info',pull:['jalons'],legacy:true},
    {id:'alertes',title:'Projets en alerte — remédiation',dur:15,nature:'decision',pull:['risks']},
    {id:'arbit',title:'Arbitrages ressources',dur:15,nature:'arbitrage',pull:['arbs']}]},
  COMEX:{label:'Comité exécutif',cadence:'Trimestriel',jour:'Mercredi',heure:'09:00',duree:90,lieu:'Salle du Conseil',parts:['CL','MD'],up:null,auto:false,sections:[
    {id:'arbit',title:'Arbitrages budgétaires',dur:60,nature:'arbitrage',pull:['arbs','decisions'],legacy:true},
    {id:'risques',title:'Risques majeurs',dur:20,nature:'decision',pull:['risks']},
    {id:'divers',title:'Points divers',dur:10,nature:'info',pull:[]}]},
  ADH:{label:'Point ad hoc',cadence:'Ponctuel',jour:'—',heure:'16:00',duree:30,lieu:'Teams',parts:['MD','SL'],up:'COPROJ',auto:false,sections:[
    {id:'sujet',title:'Sujet du point',dur:20,nature:'info',pull:[],legacy:true},
    {id:'decision',title:'Décision',dur:10,nature:'decision',pull:['arbs']}]}
};
/* ═══ ÉQUIPES DU PROJET — COPIL, COPROJ, COTECH… créées sur le projet, reprises dans les points ═══ */
const TEAMS_KEY='starium.teams.v1', DIR_KEY='starium.dir.v1';
/* personnes ajoutées à la main — fusionnées dans l'annuaire au chargement */
(function(){ try{ const s=JSON.parse(localStorage.getItem(DIR_KEY)||'{}'); Object.keys(s).forEach(k=>{ if(!DIR[k]) DIR[k]=s[k]; }); }catch(e){} })();
function dirSaveExtra(ini){ try{ const s=JSON.parse(localStorage.getItem(DIR_KEY)||'{}'); s[ini]=DIR[ini]; localStorage.setItem(DIR_KEY,JSON.stringify(s)); }catch(e){} }
const TEAM_COLORS=['var(--brand-gold-700)','var(--state-info)','var(--purple)','var(--teal)','var(--state-success)','var(--state-danger)'];
let TEAMS=(function(){ try{ const s=JSON.parse(localStorage.getItem(TEAMS_KEY)||'null'); if(Array.isArray(s)&&s.length) return s; }catch(e){} return ['COPROJ','COPIL','COTECH'].map((k,i)=>({id:k.toLowerCase(),name:k,label:TPL_DEFAULTS[k].label,members:TPL_DEFAULTS[k].parts.slice(),color:TEAM_COLORS[i]})); })();
function teamsSave(){ try{ localStorage.setItem(TEAMS_KEY,JSON.stringify(TEAMS)); }catch(e){} }
function teamById(id){ return TEAMS.find(t=>t.id===id); }
function teamForType(type){ return TEAMS.find(t=>t.name.toUpperCase()===String(type||'').toUpperCase()); }
function teamAvs(t,max){ const m=t.members.slice(0,max||5); return '<span class="pw-avs">'+m.map(k=>avHtml(k,(DIR[k]&&DIR[k][3])||'av-1')).join('')+'</span>'+(t.members.length>m.length?'<span class="pw-avs-more">+'+(t.members.length-m.length)+'</span>':''); }
/* vue Équipes (onglet projet) */
function teamUsage(t){ const n=Object.keys(INST_PREP||{}).filter(k=>INST_PREP[k].team===t.id||String(INST_PREP[k].type||'').toUpperCase()===t.name.toUpperCase()).length; return n?n+' point'+(n>1?'s':'')+' projet':'Aucun point rattaché'; }
window.pwRenderTeamsPane=function(){ const el=document.getElementById('tmp-grid'); if(!el) return;
  el.innerHTML=TEAMS.map(t=>{ const lead=t.members[0];
    return '<div class="card tmp-card" onclick="pwOpenTeams(\''+t.id+'\')"><div class="tmp-bar" style="background:'+t.color+'"></div>'
     +'<div class="tmp-b"><div class="tmp-n">'+t.name+'</div><div class="tmp-l">'+(t.label||'Équipe projet')+'</div>'
     +'<div class="tmp-avs">'+t.members.map(k=>'<span class="tmp-av" title="'+dirName(k)+'">'+avHtml(k,(DIR[k]&&DIR[k][3])||'av-1')+'</span>').join('')+(t.members.length?'':'<span class="tmp-empty">Aucun membre</span>')+'</div>'
     +'<div class="tmp-f"><span>'+t.members.length+' membre'+(t.members.length>1?'s':'')+'</span><span>'+teamUsage(t)+'</span>'+(lead?'<span>Pilote : '+dirName(lead)+'</span>':'')+'</div></div></div>'; }).join('')
   +'<div class="tmp-card tmp-add" onclick="tmNewFromPane()"><span>+ Nouvelle équipe</span><small>COPIL, COTECH, comité risques…</small></div>';
};
window.tmNewFromPane=function(){ pwOpenTeams(); tmNew(); };
/* convoquer une équipe entière dans la préparation courante */
function pwConvokeTeam(id){ if(!id) return; const t=teamById(id), x=INST_PREP[curPrepKey]; if(!t||!x) return; let n=0; t.members.forEach(k=>{ if(!x.parts.some(p=>p[0]===k)){ x.parts.push([k,(DIR[k]&&DIR[k][3])||'av-'+(1+x.parts.length%6)]); n++; } }); x.partsN=Math.max(x.partsN||0,x.parts.length); x.team=t.id; prepRerender(); showToast(n?t.name+' · '+n+' participant'+(n>1?'s':'')+' convoqué'+(n>1?'s':''):'Toute l\'équipe '+t.name+' est déjà convoquée'); }
function pwTeamsPicker(x){ const cur=x.team&&teamById(x.team); const opts=TEAMS.map(t=>'<option value="'+t.id+'"'+(cur&&cur.id===t.id?' selected':'')+'>'+t.name+' — '+t.members.length+' membre'+(t.members.length>1?'s':'')+'</option>').join('');
  const hint=cur?(cur.members.every(k=>x.parts.some(p=>p[0]===k))?'Équipe '+cur.name+' au complet':'<span class="pw-link" style="margin:0" onclick="pwConvokeTeam(\''+cur.id+'\')">Compléter l\'équipe '+cur.name+'</span>'):'Choisir une équipe du projet convoque tous ses membres';
  return '<div class="pw-team-row"><select class="selectbox pw-team-sel" onchange="pwConvokeTeam(this.value)"><option value="">Convoquer une équipe…</option>'+opts+'</select><span class="pw-link" onclick="pwOpenTeams(\''+(cur?cur.id:(TEAMS[0]||{}).id||'')+'\')">Gérer</span></div><div class="pw-team-hint">'+hint+'</div>'; }
/* gestionnaire d'équipes (niveau projet) */
let TM_SEL=null, TM_DRAFT=null;
window.pwOpenTeams=function(id){ TM_DRAFT=JSON.parse(JSON.stringify(TEAMS)); TM_SEL=(id&&TM_DRAFT.some(t=>t.id===id))?id:(TM_DRAFT[0]||{}).id; let ov=document.getElementById('teamsModal'); if(!ov){ ov=document.createElement('div'); ov.className='modal-overlay'; ov.id='teamsModal'; ov.setAttribute('onclick','if(event.target===this)pwCloseTeams()'); document.body.appendChild(ov); } pwRenderTeams(); ov.classList.add('open'); };
function pwCloseTeams(){ const o=document.getElementById('teamsModal'); if(o) o.classList.remove('open'); }
function tmCur(){ return TM_DRAFT.find(t=>t.id===TM_SEL); }
function tmSelect(id){ TM_SEL=id; pwRenderTeams(); }
function tmSet(k,v){ const t=tmCur(); if(!t) return; t[k]=v; if(k==='name') pwRenderTeams(true); }
function tmToggle(ini){ const t=tmCur(); if(!t) return; const j=t.members.indexOf(ini); if(j<0) t.members.push(ini); else t.members.splice(j,1); pwRenderTeams(); }
function tmAddPerson(){ const el=document.getElementById('tm-add-in'); const v=(el&&el.value||'').trim(); if(!v){ if(el) el.focus(); return; } const hit=Object.keys(DIR).find(k=>k===v.toUpperCase()||DIR[k][0].toLowerCase().indexOf(v.toLowerCase())===0); const w=v.split(/[\s-]+/).filter(Boolean); const ini=hit||((w.length>1?w[0][0]+w[1][0]:v.slice(0,2)).toUpperCase()); if(!DIR[ini]){ DIR[ini]=[v,'',v.toLowerCase().replace(/\s+/g,'.'),'av-'+(1+Object.keys(DIR).length%6)]; dirSaveExtra(ini); } const t=tmCur(); if(t&&t.members.indexOf(ini)<0) t.members.push(ini); pwRenderTeams(); }
function tmNew(){ const n=TM_DRAFT.length; const id='t'+Date.now(); TM_DRAFT.push({id:id,name:'Nouvelle équipe',label:'',members:[],color:TEAM_COLORS[n%TEAM_COLORS.length]}); TM_SEL=id; pwRenderTeams(); setTimeout(()=>{ const i=document.getElementById('tm-name'); if(i){ i.focus(); i.select(); } },30); }
function tmDel(){ const i=TM_DRAFT.findIndex(t=>t.id===TM_SEL); if(i<0) return; TM_DRAFT.splice(i,1); TM_SEL=(TM_DRAFT[0]||{}).id; pwRenderTeams(); }
function tmSave(){ TEAMS=JSON.parse(JSON.stringify(TM_DRAFT)); teamsSave(); pwCloseTeams(); if(document.getElementById('prepModal').classList.contains('open')) prepRerender(); pwRenderTeamsPane(); showToast(TEAMS.length+' équipe'+(TEAMS.length>1?'s':'')+' enregistrée'+(TEAMS.length>1?'s':'')+' sur le projet'); }
function pwRenderTeams(listOnly){
  const t=tmCur(); const ov=document.getElementById('teamsModal');
  const list=TM_DRAFT.map(z=>'<div class="tm-item'+(z.id===TM_SEL?' on':'')+'" onclick="tmSelect(\''+z.id+'\')"><i style="background:'+z.color+'"></i><div class="tm-item-b"><div class="tm-item-n">'+z.name+'</div><div class="tm-item-m">'+z.members.length+' membre'+(z.members.length>1?'s':'')+(z.label?' · '+z.label:'')+'</div></div></div>').join('')+'<button class="tm-new" onclick="tmNew()">+ Nouvelle équipe</button>';
  if(listOnly&&ov.querySelector('.tm-list')){ ov.querySelector('.tm-list').innerHTML=list; return; }
  const mem=t?Object.keys(DIR).map(k=>{ const on=t.members.indexOf(k)>=0; return '<span class="part-chip tpl-part'+(on?' on':'')+'" onclick="tmToggle(\''+k+'\')">'+avHtml(k,DIR[k][3])+'<span class="tm-chip-t">'+DIR[k][0]+(DIR[k][1]?'<small>'+DIR[k][1]+'</small>':'')+'</span></span>'; }).join(''):'';
  const cols=TEAM_COLORS.map(c=>'<span class="tm-col'+(t&&t.color===c?' on':'')+'" style="background:'+c+'" onclick="tmSet(\'color\',\''+c+'\');pwRenderTeams()"></span>').join('');
  const edit=t?'<div class="ni-grid2"><div class="field"><label class="field-label">Nom de l\'équipe</label><input class="input" id="tm-name" value="'+t.name.replace(/"/g,'&quot;')+'" oninput="tmSet(\'name\',this.value)" placeholder="COPIL, COPROJ, COTECH…"></div><div class="field"><label class="field-label">Libellé</label><input class="input" value="'+(t.label||'').replace(/"/g,'&quot;')+'" oninput="tmSet(\'label\',this.value)" placeholder="Comité de pilotage"></div></div>'
    +'<div class="field"><label class="field-label">Couleur</label><div class="tm-cols">'+cols+'</div></div>'
    +'<div class="field"><label class="field-label">Membres ('+t.members.length+')</label><div class="part-grid tm-grid">'+mem+'</div><div class="inst-addrow" style="margin-top:8px"><input class="input" id="tm-add-in" placeholder="Ajouter une personne…" onkeydown="if(event.key===\'Enter\')tmAddPerson()"><button class="meet-mini-btn" onclick="tmAddPerson()">Ajouter</button></div></div>'
    +'<div class="tm-usage">Cette équipe est proposée dans la préparation de chaque point projet : un clic convoque tous ses membres.</div>':'<div class="pw-empty">Aucune équipe. Créez-en une à gauche.</div>';
  ov.innerHTML='<div class="modal modal-tpl modal-teams"><div class="modal-head"><div class="modal-head-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div><div><div class="modal-title">Équipes du projet</div><div class="modal-sub">COPIL, COPROJ, COTECH… Composez les instances du projet une fois ; elles se retrouvent dans la préparation de chaque point.</div></div><button class="modal-close" onclick="pwCloseTeams()">'+PW_ICO.x+'</button></div>'
   +'<div class="modal-body tm-body"><div class="tm-list">'+list+'</div><div class="tm-edit">'+edit+'</div></div>'
   +'<div class="modal-foot">'+(t?'<button class="btn btn-secondary" onclick="tmDel()">Supprimer l\'équipe</button>':'')+'<span style="flex:1"></span><button class="btn btn-secondary" onclick="pwCloseTeams()">Annuler</button><button class="btn btn-primary" onclick="tmSave()">Enregistrer</button></div></div>';
}
const PULL_KINDS={decisions:'Décisions à appliquer',actions:'Actions ouvertes',arbs:'Arbitrages reportés',risks:'Risques ouverts',remontes:'Sujets remontés du niveau inférieur'};
/* blocs planning / tâches posés dans l'ODJ */
const PHASES=[['Cadrage',0,22,'done'],['Conception',18,26,'done'],['Développement',38,34,'cur'],['Recette',66,20,'todo'],['Déploiement',84,16,'todo']];
const JALON_PHASE=[1,1,2,3];
const PLAN_MODES={macro:['Vue macro','Phases et jalons clés'],detail:['Vue détaillée','Phases, jalons et tâches rattachées']};
const TASK_FILTERS={urgent:['Urgentes','en retard ou bloquantes'],major:['Majeures','urgentes + à risque'],all:['Toutes','l\'ensemble des tâches ouvertes']};
const TASK_PRIO={late:'urgent',risk:'major',todo:'normal',done:'normal'};
function tasksFor(filter){ return TACHES.map((t,i)=>({t:t,i:i,p:TASK_PRIO[t[3]]||'normal'})).filter(o=>o.t[3]!=='done').filter(o=>filter==='all'||(filter==='major'?(o.p==='urgent'||o.p==='major'):o.p==='urgent')); }
function pwAddBlock(k){ const x=INST_PREP[curPrepKey], tpl=tplFor(x.type); if(x.agenda.some(a=>a[2]&&a[2].k===k)){ showToast('La revue du projet est déjà à l\'ordre du jour'); return; } const sec=(tpl.sections.find(s=>s.legacy)||tpl.sections[0]).id; x.agenda.push(k==='planning'?['Planning du projet','10 min',{k:'planning',mode:'macro',label:'Planning'},sec,'info']:k==='taches'?['Tâches du projet','10 min',{k:'taches',filter:'urgent',label:'Tâches'},sec,'info']:['Revue du projet — planning, tâches, décisions, alertes','15 min',{k:'revue',label:'Revue du projet'},sec,'info']); prepRerender(); }
function revueAlerts(key){ const p=PREV_OF[key||curPrepKey||MEET_KEY], cr=INST_CR[p]||{}; const A=[]; JALONS.forEach(j=>{ if(j[2]==='late') A.push(['danger','Jalon en retard',j[0],j[1]+' · '+j[3]]); else if(j[2]==='risk') A.push(['warning','Jalon à risque',j[0],j[1]+' · '+j[3]]); }); TACHES.forEach(t=>{ if(t[3]==='late') A.push(['danger','Tâche en retard',t[0],dirName(t[1])+' · échéance '+t[2]]); }); (cr.risks||[]).forEach(r=>{ if(r[1]==='Élevé') A.push(['danger','Risque élevé',r[0],cr.name||'']); }); (cr.decisions||[]).forEach((d,i)=>{ if(!(REP[(key||curPrepKey||MEET_KEY)+'|d'+i]||{}).applied) A.push(['gold','Décision non appliquée',d[0],d[1]+' · '+(cr.name||'')]); }); return A; }
function revueSummary(key){ const A=revueAlerts(key); const open=TACHES.filter(t=>t[3]!=='done').length; const cr=INST_CR[PREV_OF[key||curPrepKey]]||{}; return PHASES.length+' phases · '+JALONS.length+' jalons · '+open+' tâches ouvertes · '+(cr.decisions||[]).length+' décisions'+(A.length?' · <b class="over">'+A.length+' alerte'+(A.length>1?'s':'')+'</b>':''); }
function revueView(key){
  const A=revueAlerts(key); const TONE={danger:['var(--state-danger-bg)','var(--state-danger)'],warning:['var(--state-warning-bg)','var(--state-warning)'],gold:['var(--brand-gold-050)','var(--brand-gold-700)']};
  const alerts=A.length?'<div class="rv-alerts">'+A.map(a=>'<div class="rv-al" style="background:'+TONE[a[0]][0]+'"><span class="rv-al-k" style="color:'+TONE[a[0]][1]+'">'+a[1]+'</span><span class="rv-al-t">'+a[2]+'</span><span class="rv-al-m">'+a[3]+'</span></div>').join('')+'</div>':'<div class="pw-empty">Aucune alerte — projet sous contrôle.</div>';
  const cr=INST_CR[PREV_OF[key||curPrepKey||MEET_KEY]]||{};
  const decs=(cr.decisions||[]).length?'<div class="tkv">'+(cr.decisions||[]).map((d,i)=>{ const ap=(REP[(key||curPrepKey||MEET_KEY)+'|d'+i]||{}).applied; return '<div class="plv-t"><span class="rep-dot" style="background:'+(ap?'var(--state-success)':'var(--brand-gold)')+'"></span><span class="plv-jt">'+d[0]+'</span><span class="plv-jm">'+d[1]+'</span><span class="rep-pill" style="background:'+(ap?'var(--state-success-bg)':'var(--brand-gold-050)')+';color:'+(ap?'var(--state-success)':'var(--brand-gold-700)')+'">'+(ap?'Appliquée':'À appliquer')+'</span></div>'; }).join('')+'</div>':'<div class="pw-empty">Aucune décision précédente.</div>';
  const sec=(t,n,body)=>'<div class="rv-sec"><div class="rv-sec-h">'+t+(n!==undefined?'<span class="rv-n">'+n+'</span>':'')+'</div>'+body+'</div>';
  return '<div class="rv">'+sec('Alertes',A.length,alerts)+sec('Planning',undefined,planView('macro'))+sec('Tâches ouvertes',TACHES.filter(t=>t[3]!=='done').length,taskView('all'))+sec('Décisions précédentes',(cr.decisions||[]).length,decs)+'</div>';
}
function pwBlockSet(i,key,v){ INST_PREP[curPrepKey].agenda[i][2][key]=v; prepRerender(); }
function planSummary(mode){ const late=JALONS.filter(j=>j[2]==='late').length, risk=JALONS.filter(j=>j[2]==='risk').length; return PHASES.length+' phases · '+JALONS.length+' jalons'+(late?' · <b class="over">'+late+' en retard</b>':'')+(risk?' · '+risk+' à risque':'')+(mode==='detail'?' · '+TACHES.filter(t=>t[3]!=='done').length+' tâches':''); }
function taskSummary(f){ const l=tasksFor(f); const late=l.filter(o=>o.p==='urgent').length; return l.length+' tâche'+(l.length>1?'s':'')+(late?' · <b class="over">'+late+' en retard</b>':''); }
function planView(mode){
  const bars=PHASES.map((p,pi)=>{ const c=p[3]==='done'?'var(--state-success)':p[3]==='cur'?'var(--brand-gold)':'var(--neutral-300)'; const js=JALONS.map((j,i)=>({j:j,i:i})).filter(o=>JALON_PHASE[o.i]===pi);
    const dia=js.map(o=>'<span class="plv-dia" style="left:'+(p[1]+p[2]*0.8)+'%;background:'+REP_TONE[o.j[2]][1]+'" title="'+o.j[0]+' · '+o.j[1]+'"></span>').join('');
    const det=mode==='detail'?'<div class="plv-det">'+js.map(o=>'<div class="plv-j"><span class="rep-diamond" style="background:'+REP_TONE[o.j[2]][1]+'"></span><span class="plv-jt">'+o.j[0]+'</span><span class="plv-jm">'+o.j[1]+' · '+o.j[3]+'</span>'+repPill(o.j[2])+'</div>').join('')+TACHES.map((t,i)=>({t:t,i:i})).filter(o=>(JALON_PHASE[o.i]||2)===pi&&o.t[3]!=='done').map(o=>'<div class="plv-t"><span class="av '+avClassFor(o.t[1])+' rep-av">'+o.t[1]+'</span><span class="plv-jt">'+o.t[0]+'</span><span class="plv-jm">'+o.t[2]+'</span>'+repPill(o.t[3])+'</div>').join('')+'</div>':'';
    return '<div class="plv-row"><div class="plv-name">'+p[0]+'</div><div class="plv-track"><div class="plv-bar" style="left:'+p[1]+'%;width:'+p[2]+'%;background:'+c+'"></div>'+dia+'<div class="plv-today" style="left:44%"></div></div></div>'+det; }).join('');
  return '<div class="plv"><div class="plv-h"><span>Mai</span><span>Juin</span><span>Juil.</span></div>'+bars+'<div class="plv-leg"><span><i style="background:var(--state-success)"></i>Terminé</span><span><i style="background:var(--brand-gold)"></i>En cours</span><span><i style="background:var(--neutral-300)"></i>À venir</span><span><i class="plv-leg-dia" style="background:var(--state-danger)"></i>Jalon en retard</span></div></div>';
}
function taskView(f){ const l=tasksFor(f); if(!l.length) return '<div class="pw-empty">Aucune tâche dans ce filtre.</div>'; return '<div class="tkv">'+l.map(o=>'<div class="plv-t"><span class="av '+avClassFor(o.t[1])+' rep-av">'+o.t[1]+'</span><span class="plv-jt">'+o.t[0]+'</span><span class="plv-jm">'+dirName(o.t[1])+' · '+o.t[2]+'</span><span class="tkv-p '+o.p+'">'+(o.p==='urgent'?'Urgente':o.p==='major'?'Majeure':'Normale')+'</span>'+repPill(o.t[3])+'</div>').join('')+'</div>'; }
const NAT={info:['Info','var(--state-info-bg)','var(--state-info)'],decision:['Décision','var(--brand-gold-050)','var(--brand-gold-700)'],arbitrage:['Arbitrage','var(--state-warning-bg)','var(--state-warning)']};
const TPL_KEY='starium.tpl.v1';
let TYPE_TPL=(function(){ const base=JSON.parse(JSON.stringify(TPL_DEFAULTS)); try{ const s=JSON.parse(localStorage.getItem(TPL_KEY)||'{}'); Object.keys(s).forEach(k=>{ base[k]=s[k]; }); }catch(e){} return base; })();
function tplSave(){ try{ localStorage.setItem(TPL_KEY,JSON.stringify(TYPE_TPL)); }catch(e){} }
function tplFor(type){ return TYPE_TPL[type]||TYPE_TPL[{'Revue de portefeuille':'CRA','Point ad hoc':'ADH'}[type]]||TYPE_TPL.COPROJ; }
function pwMins(s){ if(!s) return 0; let m=0; const h=/(\d+)\s*h/i.exec(s); const mi=/(\d+)\s*min/i.exec(s); if(h) m+=parseInt(h[1])*60; if(mi) m+=parseInt(mi[1]); if(!h&&!mi){ const n=parseInt(s); if(!isNaN(n)) m=n; } return m; }
function pwFmt(m){ return m>=60?Math.floor(m/60)+' h'+(m%60?' '+String(m%60).padStart(2,'0'):''):m+' min'; }
const REMONTES=[['Renfort UX 0,5 ETP sur la recette','COPROJ S17 · arbitrage remonté, non tranché'],['Dette technique legacy — investissement de reprise','COTECH · remonté le 6 mai'],['Décalage du lot 2 sur juillet','COPROJ S19 · impact planning à valider']];

/* ─── sources à reprendre ─── */
function pwSources(key){
  const p=PREV_OF[key], cr=INST_CR[p]||{};
  const S={};
  S.decisions=(cr.decisions||[]).map((d,i)=>({id:'d'+i,i:i,title:d[0],meta:d[1]+' · '+(cr.name||''),open:!repFlag('d'+i).applied,pill:repFlag('d'+i).applied?['Appliquée','var(--state-success-bg)','var(--state-success)']:['À appliquer','var(--brand-gold-050)','var(--brand-gold-700)'],origin:{k:'dec',i:i,key:key,label:d[0]},tag:'Décision à appliquer',dur:10,nature:'info',extra:'<span class="rep-btn ghost" onclick="repDecApply('+i+')">'+(repFlag('d'+i).applied?'Rouvrir':'Marquer appliquée')+'</span>'}));
  S.actions=(cr.actions||[]).map((a,i)=>({id:'ac'+i,i:i,title:a[0],meta:a[1],open:!a[2],pill:a[2]?['Terminée','var(--state-success-bg)','var(--state-success)']:['Ouverte','var(--state-info-bg)','var(--state-info)'],origin:{k:'action',i:i,prev:p,label:a[0]},tag:'Action à suivre',dur:5,nature:'info'}));
  S.arbs=(PREV_ARBS[p]||[]).map((a,i)=>{const v=VERD[a[1]];return {id:'a'+i,i:i,title:a[0],meta:a[2],open:a[1]==='reporte',pill:[v.label,v.bg,v.c],origin:{k:'arb',i:i,prev:p,label:a[0]},tag:'Arbitrage à reprendre',dur:15,nature:'arbitrage'};});
  S.jalons=JALONS.map((j,i)=>({id:'j'+i,i:i,title:j[0],meta:j[1]+' · '+j[3],open:j[2]!=='done',pill:[REP_TONE[j[2]][2],REP_TONE[j[2]][0],REP_TONE[j[2]][1]],origin:{k:'jalon',i:i,label:j[0]},tag:'Jalon',dur:10,nature:'info',diamond:REP_TONE[j[2]][1]}));
  S.taches=TACHES.map((t,i)=>({id:'t'+i,i:i,title:t[0],meta:dirName(t[1])+' · échéance '+t[2],open:t[3]!=='done',pill:[REP_TONE[t[3]][2],REP_TONE[t[3]][0],REP_TONE[t[3]][1]],origin:{k:'tache',i:i,label:t[0]},tag:'Tâche',dur:5,nature:'info',av:t[1]}));
  S.risks=(cr.risks||[]).map((r,i)=>({id:'r'+i,i:i,title:r[0],meta:'Niveau '+r[1].toLowerCase()+' · '+(cr.name||''),open:true,pill:[r[1],r[1]==='Élevé'?'var(--state-danger-bg)':'var(--state-warning-bg)',r[1]==='Élevé'?'var(--state-danger)':'var(--state-warning)'],origin:{k:'risk',i:i,prev:p,label:r[0]},tag:'Risque',dur:10,nature:'decision'}));
  S.remontes=REMONTES.map((r,i)=>({id:'m'+i,i:i,title:r[0],meta:r[1],open:true,pill:['Remonté','var(--purple-bg)','var(--purple)'],origin:{k:'remonte',i:i,label:r[0]},tag:'Remonté',dur:10,nature:'arbitrage'}));
  return S;
}
function pwOpenCount(S){ const c={}; Object.keys(S).forEach(k=>c[k]=S[k].filter(x=>x.open&&!repFlag(x.id).odj).length); return c; }

/* ─── ajouter à l'ODJ dans une section ─── */
function pwAdd(kind,i,secId){
  const S=pwSources(curPrepKey); const it=S[kind][i]; if(!it||repFlag(it.id).odj) return;
  const tpl=tplFor(INST_PREP[curPrepKey].type);
  const sec=secId||(tpl.sections.find(s=>(s.pull||[]).indexOf(kind)>=0)||tpl.sections.find(s=>s.legacy)||tpl.sections[0]).id;
  INST_PREP[curPrepKey].agenda.push([it.tag+' — '+it.title,it.dur+' min',it.origin,sec,it.nature]);
  repSet(it.id,{odj:true}); prepRerender(); showToast('« '+it.title+' » mis à l\'ordre du jour');
}
function pwAutoFill(){
  const x=INST_PREP[curPrepKey], tpl=tplFor(x.type), S=pwSources(curPrepKey); let n=0;
  tpl.sections.forEach(sec=>(sec.pull||[]).filter(k=>k!=='remontes').forEach(kind=>(S[kind]||[]).forEach(it=>{ if(it.open&&!repFlag(it.id).odj){ x.agenda.push([it.tag+' — '+it.title,it.dur+' min',it.origin,sec.id,it.nature]); repSet(it.id,{odj:true}); n++; } })));
  prepRerender(); showToast(n?n+' élément'+(n>1?'s':'')+' repris selon le modèle '+x.type:'Rien de nouveau à reprendre — l\'ordre du jour est déjà complet');
}
function pwAddTo(secId){ const el=document.getElementById('pw-in-'+secId); const v=(el&&el.value||'').trim(); if(!v){ if(el) el.focus(); return; } const tEl=document.getElementById('pw-min-'+secId); const t=parseInt(tEl&&tEl.value)||10; const tpl=tplFor(INST_PREP[curPrepKey].type); const sec=tpl.sections.find(s=>s.id===secId); INST_PREP[curPrepKey].agenda.push([v,t+' min',null,secId,sec?sec.nature:'info']); prepRerender(); const n=document.getElementById('pw-in-'+secId); if(n) n.focus(); }
function pwSetNature(i,v){ INST_PREP[curPrepKey].agenda[i][4]=v; prepRerender(); }
function pwSetDur(i,v){ const n=parseInt(v); if(!isNaN(n)) INST_PREP[curPrepKey].agenda[i][1]=n+' min'; prepRerender(); }
/* drag & drop */
let PW_DRAG=null;
function pwDragStart(e,i){ PW_DRAG=i; e.dataTransfer.effectAllowed='move'; e.currentTarget.classList.add('dragging'); }
function pwDragEnd(e){ e.currentTarget.classList.remove('dragging'); document.querySelectorAll('.pw-sec.over').forEach(s=>s.classList.remove('over')); }
function pwDragOver(e){ e.preventDefault(); const s=e.currentTarget.closest('.pw-sec'); if(s) s.classList.add('over'); }
function pwDropItem(e,j){ e.preventDefault(); e.stopPropagation(); if(PW_DRAG===null) return; const ag=INST_PREP[curPrepKey].agenda; const it=ag.splice(PW_DRAG,1)[0]; const tgt=ag[j>PW_DRAG?j-1:j]; if(tgt) it[3]=tgt[3]; ag.splice(j>PW_DRAG?j-1:j,0,it); PW_DRAG=null; prepRerender(); }
function pwDropSec(e,secId){ e.preventDefault(); if(PW_DRAG===null) return; const ag=INST_PREP[curPrepKey].agenda; const it=ag.splice(PW_DRAG,1)[0]; it[3]=secId; ag.push(it); PW_DRAG=null; prepRerender(); }

/* ─── rendu ─── */
let PW_TAB='decisions', PW_SIMPLE=true;
function pwTab(t){ PW_TAB=t; prepRerender(); }
function pwMode(s){ PW_SIMPLE=s; prepRerender(); }
const PW_STD=[['presents','Présents',5],['objectif','Objectif',5],['tour','Tour de table',10],['actions','Suivi des actions',15],['avancement','Avancement du projet',15],['planning','Le planning',10],['arbitrage','Arbitrages',15]];
function pwBlocks(x){ if(!x.blocks){ x.blocks={}; PW_STD.forEach(b=>x.blocks[b[0]]={on:true,dur:b[2]}); const re=/tour de table|suivi des actions|avancement|planning|arbitrage|blocage|pr[ée]sents|objectif|revue du projet/i; x.agenda=x.agenda.filter(a=>!re.test(a[0])&&!(a[2]&&(a[2].k==='planning'||a[2].k==='taches'||a[2].k==='revue'))); } return x.blocks; }
function pwBlkToggle(id){ const b=pwBlocks(INST_PREP[curPrepKey])[id]; b.on=!b.on; prepRerender(); }
function pwBlkDur(id,v){ const n=parseInt(v); if(!isNaN(n)) pwBlocks(INST_PREP[curPrepKey])[id].dur=n; prepRerender(); }
function pwSetGoal(v){ INST_PREP[curPrepKey].goal=v; }
/* ordre unifié (mode simple) : 'b:<id>' pour un bloc standard, 'a:<i>' pour un point spécifique */
function pwOrder(x){ let c=0; x.agenda.forEach(a=>{ if(!a[5]) a[5]='p'+Date.now().toString(36)+(c++); }); const ids=PW_STD.map(b=>'b:'+b[0]).concat(x.agenda.map(a=>'a:'+a[5])); if(!x.order) x.order=ids.slice(); x.order=x.order.filter(k=>ids.indexOf(k)>=0); ids.forEach(k=>{ if(x.order.indexOf(k)<0) x.order.push(k); }); return x.order; }
function pwIdx(k){ const id=k.slice(2); return INST_PREP[curPrepKey].agenda.findIndex(a=>a[5]===id); }
/* ── contenu par point : note, fichiers, liens, éléments projet — sauvegarde automatique ── */
const PW_OPEN={}; let PW_SAVED_AT=null, PW_PICK=null;
function pwAttKey(){ return 'starium.prep.att.'+curPrepKey; }
function pwAtt(x){ if(!x.att){ try{ x.att=JSON.parse(localStorage.getItem(pwAttKey())||'{}'); }catch(e){ x.att={}; } } return x.att; }
function pwAttOf(k){ const A=pwAtt(INST_PREP[curPrepKey]); return A[k]||(A[k]={note:'',items:[]}); }
function pwAttSave(){ try{ localStorage.setItem(pwAttKey(),JSON.stringify(pwAtt(INST_PREP[curPrepKey]))); }catch(e){} PW_SAVED_AT=new Date(); const el=document.getElementById('pw-saved'); if(el){ el.textContent='Enregistré à '+PW_SAVED_AT.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}); el.classList.add('flash'); setTimeout(()=>el.classList.remove('flash'),600); } }
function pwToggleOpen(k){ PW_OPEN.k=k; PW_PICK=null; pwPointRender(); const m=document.getElementById('pwPointModal'); if(m) m.classList.add('open'); }
function pwPointClose(){ const m=document.getElementById('pwPointModal'); if(m) m.classList.remove('open'); PW_OPEN.k=null; PW_PICK=null; prepRerender(); }
function pwPointTitle(k){ const x=INST_PREP[curPrepKey]; if(k[0]==='b'){ const b=PW_STD.find(z=>z[0]===k.slice(2)); return b?b[1]:''; } const a=x.agenda[pwIdx(k)]; return a?a[0]:''; }
function pwPointRender(){ const k=PW_OPEN.k; if(!k) return; const kk=k.replace(':','_'), A=pwAttOf(k), pk=PW_PICK&&PW_PICK.k===k?PW_PICK.cat:null;
  const t=document.getElementById('pwPointTitle'); if(t) t.textContent=pwPointTitle(k);
  if(k==='b:planning'){ pwPlanRender(k,A); return; }
  const s=document.getElementById('pwPointSub'); if(s) s.textContent=(A.items.length?A.items.length+' élément'+(A.items.length>1?'s':'')+' lié'+(A.items.length>1?'s':'')+' · ':'')+(PW_SAVED_AT?'Enregistré à '+PW_SAVED_AT.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):'Enregistrement automatique');
  const items=A.items.map((it,i)=>'<div class="pw-att-it"><span class="pw-att-ic '+it.t+'">'+(it.t==='file'?PW_ICO.file:it.t==='link'?PW_ICO.link:PW_ICO.hist)+'</span><div class="pw-att-b"><div class="pw-att-t">'+(it.url?'<a href="'+it.url+'" target="_blank" rel="noopener">'+it.label+'</a>':it.label)+(it.pill?' <span class="pw-pill" style="background:'+it.pill[1]+';color:'+it.pill[2]+'">'+it.pill[0]+'</span>':'')+'</div>'+(it.sub?'<div class="pw-att-s">'+it.sub+'</div>':'')+'</div><span class="agenda-x" onclick="pwAttDel(\''+k+'\','+i+')">'+PW_ICO.x+'</span></div>').join('');
  const picker=pk?'<div class="pw-pick">'+(pwRefs(pk).map((it,i)=>'<div class="pw-pick-it" onclick="pwAttRef(\''+k+'\',\''+pk+'\','+i+')"><div class="pw-att-b"><div class="pw-att-t">'+it.title+'</div><div class="pw-att-s">'+(it.meta||'')+'</div></div>'+(it.pill?'<span class="pw-pill" style="background:'+it.pill[1]+';color:'+it.pill[2]+'">'+it.pill[0]+'</span>':'')+'</div>').join('')||'<div class="pw-att-s" style="padding:8px">Rien à lier dans cette catégorie</div>')+'</div>':'';
  const b=document.getElementById('pwPointBody'); if(!b) return;
  b.innerHTML='<div class="pw-att pw-att-modal"><div class="pw-grp">Informations</div><textarea class="input pw-att-note" placeholder="Contexte, ce qu’il faut dire ou montrer…" oninput="pwNote(\''+k+'\',this.value)">'+(A.note||'').replace(/</g,'&lt;')+'</textarea>'
    +'<div class="pw-grp" style="margin-top:6px">Pièces jointes</div><div class="pw-att-bar"><label class="pw-att-btn">'+PW_ICO.file+'Ajouter un fichier<input type="file" multiple hidden onchange="pwAttFile(\''+k+'\',this)"></label><span class="pw-att-lnk">'+PW_ICO.link+'<input class="input" id="pw-lnk-'+kk+'" placeholder="Coller un lien…" onkeydown="if(event.key===\'Enter\')pwAttLink(\''+k+'\')"><button class="meet-mini-btn" onclick="pwAttLink(\''+k+'\')">Lier</button></span></div>'
    +'<div class="pw-grp" style="margin-top:6px">Éléments du projet</div><div class="pw-att-bar">'+PW_REFCATS.map(c=>'<button class="pw-att-btn'+(pk===c[0]?' on':'')+'" onclick="pwPick(\''+k+'\',\''+c[0]+'\')">'+c[1]+'</button>').join('')+'</div>'+picker
    +(items?'<div class="pw-grp" style="margin-top:6px">Lié à ce point</div><div class="pw-att-list">'+items+'</div>':'')+'</div>'; }
function pwAttRerender(){ pwPointRender(); }
/* vue spécifique du point « Le planning » : frise des phases + jalons à présenter */
function pwPlanJal(k){ const A=pwAttOf(k); if(!A.jal) A.jal=JALONS.map((j,i)=>j[2]!=='done'?i:-1).filter(i=>i>=0); return A.jal; }
function pwPlanTog(k,i){ const L=pwPlanJal(k), p=L.indexOf(i); if(p>=0) L.splice(p,1); else L.push(i); pwAttSave(); pwPointRender(); }
function pwPlanMode(k,m){ pwAttOf(k).mode=m; pwAttSave(); pwPointRender(); }
function pwPlanRender(k,A){ const L=pwPlanJal(k), mode=A.mode||'macro';
  const s=document.getElementById('pwPointSub'); if(s) s.textContent=L.length+' jalon'+(L.length>1?'s':'')+' présenté'+(L.length>1?'s':'')+' en séance · '+(PW_SAVED_AT?'Enregistré à '+PW_SAVED_AT.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):'Enregistrement automatique');
  const seg='<div class="pw-segs">'+Object.keys(PLAN_MODES).map(m=>'<button class="pw-seg'+(m===mode?' on':'')+'" onclick="pwPlanMode(\''+k+'\',\''+m+'\')">'+PLAN_MODES[m][0]+'</button>').join('')+'</div>';
  const jal=JALONS.map((j,i)=>{ const on=L.indexOf(i)>=0; return '<div class="pw-jal'+(on?' on':'')+'" onclick="pwPlanTog(\''+k+'\','+i+')"><span class="pw-chk'+(on?' on':'')+'">'+(on?PW_ICO.chk:'')+'</span><span class="rep-diamond" style="background:'+REP_TONE[j[2]][1]+'"></span><div class="pw-att-b"><div class="pw-att-t">'+j[0]+'</div><div class="pw-att-s">'+j[1]+' · '+j[3]+' · '+PHASES[JALON_PHASE[i]][0]+'</div></div>'+repPill(j[2])+'</div>'; }).join('');
  const b=document.getElementById('pwPointBody'); if(!b) return;
  b.innerHTML='<div class="pw-att pw-att-modal"><div class="pw-plan-h"><div class="pw-grp">Planning du projet</div>'+seg+'</div>'+planView(mode)
    +'<div class="pw-grp" style="margin-top:6px">Jalons à présenter</div><div class="pw-att-s" style="margin-top:-4px">Cochez les jalons à passer en revue — chacun recevra un verdict en séance.</div><div class="pw-jals">'+jal+'</div>'
    +'<div class="pw-grp" style="margin-top:6px">Commentaire</div><textarea class="input pw-att-note" placeholder="Points d’attention sur le planning, glissements à annoncer…" oninput="pwNote(\''+k+'\',this.value)">'+(A.note||'').replace(/</g,'&lt;')+'</textarea></div>'; }
function pwNote(k,v){ pwAttOf(k).note=v; pwAttSave(); }
function pwAttFile(k,inp){ const fs=Array.prototype.slice.call(inp.files||[]); if(!fs.length) return; fs.forEach(f=>pwAttOf(k).items.push({t:'file',label:f.name,sub:(f.size>1e6?(f.size/1e6).toFixed(1)+' Mo':Math.max(1,Math.round(f.size/1024))+' Ko')})); pwAttSave(); pwAttRerender(); }
function pwAttLink(k){ const el=document.getElementById('pw-lnk-'+k.replace(':','_')); let v=(el&&el.value||'').trim(); if(!v){ if(el) el.focus(); return; } if(!/^https?:\/\//i.test(v)) v='https://'+v; let host=v; try{ host=new URL(v).hostname.replace(/^www\./,''); }catch(e){} pwAttOf(k).items.push({t:'link',label:host,sub:v,url:v}); pwAttSave(); pwAttRerender(); }
function pwAttDel(k,i){ pwAttOf(k).items.splice(i,1); pwAttSave(); pwAttRerender(); }
function pwPick(k,cat){ PW_PICK=(PW_PICK&&PW_PICK.k===k&&PW_PICK.cat===cat)?null:{k:k,cat:cat}; pwAttRerender(); }
function pwAttRef(k,cat,i){ const it=pwRefs(cat)[i]; if(!it) return; const A=pwAttOf(k); if(A.items.some(z=>z.t==='ref'&&z.cat===cat&&z.label===it.title)) return; A.items.push({t:'ref',cat:cat,label:it.title,sub:it.meta,pill:it.pill}); pwAttSave(); pwAttRerender(); }
const PW_REFCATS=[['actions','Action'],['jalons','Jalon'],['taches','Tâche'],['risks','Risque'],['decisions','Décision'],['arbs','Arbitrage'],['budget','Budget']];
function pwRefs(cat){ if(cat==='budget'){ const B=(typeof BUD_CATS!=='undefined'?BUD_CATS:null)||(typeof BUDGET!=='undefined'?BUDGET:null); if(Array.isArray(B)) return B.map(b=>({title:b.name||b.label||b[0],meta:b.meta||(b.engage!=null?'Engagé '+fmtEur(b.engage):''),pill:['Budget','var(--brand-gold-050)','var(--brand-gold-700)']})); return [['Prestations externes','Engagé 184 000 € · reste 36 000 €'],['Licences & hébergement','Engagé 42 500 €'],['Charge interne','312 j/h consommés · 88 restants']].map(b=>({title:b[0],meta:b[1],pill:['Budget','var(--brand-gold-050)','var(--brand-gold-700)']})); } return pwSources(curPrepKey)[cat]||[]; }
let PW_SDRAG=null;
function pwSDragStart(e,k){ PW_SDRAG=k; e.dataTransfer.effectAllowed='move'; e.currentTarget.classList.add('dragging'); }
function pwSDragOver(e){ e.preventDefault(); e.currentTarget.classList.add('over'); }
function pwSDragLeave(e){ e.currentTarget.classList.remove('over'); }
function pwSDrop(e,k){ e.preventDefault(); if(PW_SDRAG===null||PW_SDRAG===k) return; const o=pwOrder(INST_PREP[curPrepKey]); const from=o.indexOf(PW_SDRAG), to=o.indexOf(k); o.splice(from,1); o.splice(to,0,PW_SDRAG); PW_SDRAG=null; prepRerender(); }
function pwSMove(k,d){ const o=pwOrder(INST_PREP[curPrepKey]); const i=o.indexOf(k), j=i+d; if(j<0||j>=o.length) return; o.splice(i,1); o.splice(j,0,k); prepRerender(); }
function pwAddSimple(){ const el=document.getElementById('pw-in-simple'); const v=(el&&el.value||'').trim(); if(!v){ if(el) el.focus(); return; } const x=INST_PREP[curPrepKey], tpl=tplFor(x.type); const sec=(tpl.sections.find(s=>s.legacy)||tpl.sections[0]); x.agenda.push([v,'10 min',null,sec.id,sec.nature||'info']); prepRerender(); const n=document.getElementById('pw-in-simple'); if(n) n.focus(); }
const PW_ICO={odj:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',tpl:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>',x:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',chk:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>',grip:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="18" r="1"/></svg>',bolt:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',hist:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'};
const ORIG_SHORT={dec:'Décision',arb:'Arbitrage',jalon:'Jalon',tache:'Tâche',action:'Action',risk:'Risque',remonte:'Remonté'};
PW_ICO.clip='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 11.5l-8.5 8.5a5 5 0 0 1-7-7l9-9a3.3 3.3 0 0 1 4.7 4.7l-9 9a1.6 1.6 0 0 1-2.3-2.3L16 7"/></svg>';
PW_ICO.file='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>';
PW_ICO.link='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>';
PW_ICO.edit='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>';
PW_ICO.caret='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>';
PW_ICO.plan='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="7" x2="13" y2="7"/><line x1="8" y1="12" x2="20" y2="12"/><line x1="5" y1="17" x2="15" y2="17"/></svg>';
PW_ICO.task='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>';

function pwHistory(key){
  const chain=[]; let k=PREV_OF[key]; let guard=0;
  while(k&&INST_CR[k]&&guard++<6){ chain.push(k); k=PREV_OF[k]; }
  if(!chain.length) return '<div class="pw-empty">Première séance de la série — aucune mémoire encore.</div>';
  return chain.map((k,ci)=>{ const cr=INST_CR[k]; const decs=(cr.decisions||[]).map((d,i)=>'<div class="pw-hrow"><span class="rep-dot" style="background:'+(ci===0&&repFlag('d'+i).applied?'var(--state-success)':'var(--brand-gold)')+'"></span><span class="pw-ht">'+d[0]+'</span><span class="pw-hm">'+d[1]+'</span></div>').join('');
    return '<div class="pw-hist"><div class="pw-hist-h"><span class="pw-hist-d">'+cr.d+' '+cr.m+'</span><span class="pw-hist-n">'+cr.name+'</span><span class="pw-hist-s">'+(cr.decisions||[]).length+' déc. · '+(cr.actions||[]).length+' act.</span></div>'+decs+'</div>'; }).join('');
}

function pwSrcRow(kind,it){
  const f=repFlag(it.id);
  const lead=it.diamond?'<span class="rep-diamond" style="background:'+it.diamond+'"></span>':it.av?'<span class="av '+avClassFor(it.av)+' rep-av">'+it.av+'</span>':'<span class="rep-dot" style="background:'+it.pill[2]+'"></span>';
  const act=f.odj?'<span class="rep-btn on">'+PW_ICO.chk+'À l\'ODJ</span>':(it.open?'<span class="rep-btn" onclick="pwAdd(\''+kind+'\','+it.i+')">→ ODJ</span>':'<span class="rep-done">Clos</span>');
  return '<div class="rep-row pw-src'+(it.open?'':' closed')+'">'+lead+'<div class="rep-body"><div class="rep-t">'+it.title+'</div><div class="rep-m">'+it.meta+'</div></div><span class="rep-pill" style="background:'+it.pill[1]+';color:'+it.pill[2]+'">'+it.pill[0]+'</span><div class="rep-acts">'+(it.extra&&it.open?it.extra:'')+act+'</div></div>';
}

window.openPrepare=function(key,el){
  curPrepKey=key; curPrepEl=el||null;
  const x=INST_PREP[key]; if(!x) return;
  const tpl=tplFor(x.type);
  const legacy=(tpl.sections.find(s=>s.legacy)||tpl.sections[0]).id;
  x.agenda.forEach(a=>{ if(!a[3]||!tpl.sections.some(s=>s.id===a[3])) a[3]=legacy; if(!a[4]) a[4]=a[2]?(a[2].k==='arb'||a[2].k==='remonte'?'arbitrage':a[2].k==='risk'?'decision':'info'):(tpl.sections.find(s=>s.id===a[3])||{}).nature||'info'; });
  const total=x.agenda.reduce((s,a)=>s+pwMins(a[1]),0); const over=total>tpl.duree;
  const S=pwSources(key), C=pwOpenCount(S);
  /* colonne centrale — ODJ par sections */
  const secs=tpl.sections.map(sec=>{
    const items=x.agenda.map((a,i)=>({a:a,i:i})).filter(o=>o.a[3]===sec.id);
    const sum=items.reduce((s,o)=>s+pwMins(o.a[1]),0);
    const rows=items.map(o=>{ const a=o.a,i=o.i; const n=NAT[a[4]]||NAT.info; const blk=a[2]&&(a[2].k==='planning'||a[2].k==='taches'||a[2].k==='revue');
      if(blk&&a[2].k==='revue'){ return '<div class="pw-item pw-block" draggable="true" ondragstart="pwDragStart(event,'+i+')" ondragend="pwDragEnd(event)" ondragover="pwDragOver(event)" ondrop="pwDropItem(event,'+i+')"><span class="agenda-grip">'+PW_ICO.grip+'</span><span class="agenda-num">'+(i+1)+'</span><div class="pw-item-b"><div class="pw-item-t">'+PW_ICO.plan+'Revue du projet<span class="pw-blk-tag">bloc</span></div><div class="pw-item-m"><span class="pw-blk-sum">'+revueSummary(curPrepKey)+'</span></div><div class="pw-blk-hint">Planning complet, toutes les tâches, décisions précédentes et alertes — affichés en séance</div></div><input class="pw-dur" value="'+pwMins(a[1])+'" onchange="pwSetDur('+i+',this.value)"><span class="pw-dur-u">min</span><span class="agenda-x" onclick="prepDelPoint('+i+')">'+PW_ICO.x+'</span></div>'; }
      if(blk){ const isP=a[2].k==='planning'; const opts=isP?PLAN_MODES:TASK_FILTERS; const cur=isP?a[2].mode:a[2].filter; const seg=Object.keys(opts).map(k=>'<button class="pw-seg'+(k===cur?' on':'')+'" onclick="pwBlockSet('+i+',\''+(isP?'mode':'filter')+'\',\''+k+'\')">'+opts[k][0]+'</button>').join('');
        return '<div class="pw-item pw-block" draggable="true" ondragstart="pwDragStart(event,'+i+')" ondragend="pwDragEnd(event)" ondragover="pwDragOver(event)" ondrop="pwDropItem(event,'+i+')"><span class="agenda-grip">'+PW_ICO.grip+'</span><span class="agenda-num">'+(i+1)+'</span><div class="pw-item-b"><div class="pw-item-t">'+(isP?PW_ICO.plan:PW_ICO.task)+a[0]+'<span class="pw-blk-tag">bloc</span></div><div class="pw-item-m"><div class="pw-segs">'+seg+'</div><span class="pw-blk-sum">'+(isP?planSummary(cur):taskSummary(cur))+'</span></div><div class="pw-blk-hint">'+opts[cur][1]+' — affiché tel quel en séance</div></div><input class="pw-dur" value="'+pwMins(a[1])+'" onchange="pwSetDur('+i+',this.value)"><span class="pw-dur-u">min</span><span class="agenda-x" onclick="prepDelPoint('+i+')">'+PW_ICO.x+'</span></div>'; }
      const orig=a[2]?'<span class="pw-orig">'+PW_ICO.hist+ORIG_SHORT[a[2].k]+'</span>':'';
      return '<div class="pw-item" draggable="true" ondragstart="pwDragStart(event,'+i+')" ondragend="pwDragEnd(event)" ondragover="pwDragOver(event)" ondrop="pwDropItem(event,'+i+')"><span class="agenda-grip">'+PW_ICO.grip+'</span><span class="agenda-num">'+(i+1)+'</span><div class="pw-item-b"><div class="pw-item-t">'+a[0]+'</div><div class="pw-item-m">'+orig+'<select class="pw-nat" onchange="pwSetNature('+i+',this.value)">'+Object.keys(NAT).map(k=>'<option value="'+k+'"'+(a[4]===k?' selected':'')+'>'+NAT[k][0]+'</option>').join('')+'</select></div></div><input class="pw-dur" value="'+pwMins(a[1])+'" onchange="pwSetDur('+i+',this.value)"><span class="pw-dur-u">min</span><span class="agenda-x" onclick="prepDelPoint('+i+')">'+PW_ICO.x+'</span></div>'; }).join('');
    const n=NAT[sec.nature]||NAT.info;
    return '<div class="pw-sec" ondragover="pwDragOver(event)" ondrop="pwDropSec(event,\''+sec.id+'\')"><div class="pw-sec-h"><span class="pw-sec-t">'+sec.title+'</span><span class="pw-nat-pill" style="background:'+n[1]+';color:'+n[2]+'">'+n[0]+'</span><span class="pw-sec-d'+(sum>sec.dur?' over':'')+'">'+sum+' / '+sec.dur+' min</span></div>'+(rows||'<div class="pw-drop">Glissez un point ici, ou ajoutez-en un ci-dessous</div>')+'<div class="inst-addrow pw-addrow"><input class="input" id="pw-in-'+sec.id+'" placeholder="Ajouter un point…" onkeydown="if(event.key===\'Enter\')pwAddTo(\''+sec.id+'\')"><input class="input prep-min" id="pw-min-'+sec.id+'" placeholder="min" onkeydown="if(event.key===\'Enter\')pwAddTo(\''+sec.id+'\')"><button class="meet-mini-btn" onclick="pwAddTo(\''+sec.id+'\')">Ajouter</button></div></div>'; }).join('');
  const openTotal=['decisions','actions','arbs','risks'].reduce((a,k)=>a+(C[k]||0),0);
  /* colonne gauche */
  const docs=x.docs.map((d,i)=>{const t=DOC_TONE[d[2]];return '<div class="doc-row"><span class="doc-ico" style="background:'+t[0]+';color:'+t[1]+'"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">'+docIcoSvg(d[2])+'</svg></span><div class="doc-body"><div class="doc-name">'+d[0]+'</div><div class="doc-meta">'+d[1]+'</div></div><span class="doc-act" onclick="prepViewDoc('+i+')">Voir</span><span class="agenda-x" onclick="prepDelDoc('+i+')">'+PW_ICO.x+'</span></div>';}).join('')||'<div class="pw-empty">Aucun support joint</div>';
  const parts=x.parts.map((p,i)=>'<label class="part-chip pw-pc" title="'+(photos()[p[0]]?'Changer la photo':'Ajouter une photo')+'">'+avHtml(p[0],p[1],' data-cam="1"')+'<input type="file" accept="image/*" hidden onchange="setPhoto(\''+p[0]+'\',this)">'+dirName(p[0])+'<span class="part-x" onclick="event.preventDefault();prepDelPart('+i+')">'+PW_ICO.x+'</span></label>').join('')+(x.partsN>x.parts.length?'<span class="part-chip">+'+(x.partsN-x.parts.length)+' autres</span>':'');
  const rules=[...new Set(tpl.sections.flatMap(s=>s.pull||[]))].filter(k=>PULL_KINDS[k]).map(k=>PULL_KINDS[k].toLowerCase());
  const left='<div class="inst-banner" style="background:'+x.bg+';color:'+x.fg+'"><div class="ib-date" style="color:'+x.fg+'"><span class="d">'+x.d+'</span><span class="m">'+x.m+'</span></div><div class="ib-meta"><div class="ib-title">'+x.name+'<span class="badge '+x.badge+'">'+x.type+'</span></div><div class="ib-sub">'+x.sub+'</div></div></div>'
    +'<div class="pw-card pw-tpl"><div class="pw-card-h">'+PW_ICO.tpl+'Modèle '+x.type+'<span class="pw-link" onclick="pwOpenTpl(\''+x.type+'\')">Modifier</span></div><div class="pw-tpl-l">'+tpl.label+'</div><div class="pw-tpl-m">'+tpl.cadence+' · '+tpl.jour+' '+tpl.heure+' · '+pwFmt(tpl.duree)+'</div><div class="pw-tpl-m">'+tpl.sections.length+' sections · '+(tpl.up?'transmet au <b>'+tpl.up+'</b>':'instance terminale')+'</div><div class="pw-tpl-r"><b>Reprise :</b> '+(rules.length?rules.join(', '):'aucune règle')+'</div></div>'
    +'<div class="inst-sec"><div class="inst-sec-head"><span class="inst-sec-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/></svg>Participants ('+x.partsN+')</span></div>'+pwTeamsPicker(x)+'<div class="part-grid">'+parts+'</div><div class="inst-addrow"><input class="input" id="prep-part-in" placeholder="Convoquer…" onkeydown="if(event.key===\'Enter\')prepAddPart()"><button class="meet-mini-btn" onclick="prepAddPart()">Convoquer</button></div></div>'
    +'<div class="inst-sec"><div class="inst-sec-head"><span class="inst-sec-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>Supports</span><label class="inst-add" style="cursor:pointer">+ Joindre<input type="file" multiple style="display:none" onchange="prepAttach(this)"></label></div>'+docs+'</div>'
    +convocSec(key);
  /* colonne droite */
  const tabs=[['prev','Séance précédente'],['remontes','Remontés'],['hist','Mémoire']];
  const prevN=(C.decisions||0)+(C.actions||0)+(C.arbs||0)+(C.risks||0);
  const tabBar=tabs.map(t=>{ const n=t[0]==='prev'?prevN:(C[t[0]]||0); return '<button class="pw-tab'+(PW_TAB===t[0]?' on':'')+'" onclick="pwTab(\''+t[0]+'\')">'+t[1]+(n?'<span class="pw-tab-n">'+n+'</span>':'')+'</button>'; }).join('');
  const grp=(k,lbl)=>{ const l=(S[k]||[]); if(!l.length) return ''; return '<div class="pw-grp">'+lbl+'</div>'+l.slice().sort((a,b)=>(b.open-a.open)).map(it=>pwSrcRow(k,it)).join(''); };
  const list=PW_TAB==='hist'?pwHistory(key):PW_TAB==='prev'?((grp('decisions','Décisions')+grp('actions','Actions')+grp('arbs','Arbitrages')+grp('risks','Risques'))||'<div class="pw-empty">Première séance de la série.</div>'):((S[PW_TAB]||[]).length?S[PW_TAB].map(it=>pwSrcRow(PW_TAB,it)).join(''):'<div class="pw-empty">Rien à reprendre.</div>');
  const right='<div class="pw-right-h"><span class="pw-right-t">À reprendre</span><span class="pw-right-n">'+openTotal+' élément'+(openTotal>1?'s':'')+' en attente</span></div><div class="pw-tabs">'+tabBar+'</div><div class="pw-list">'+list+'</div>';
  const hasR=x.agenda.some(a=>a[2]&&a[2].k==='revue');
  /* mode simple : structure standard, l'utilisateur coche / décoche */
  const B=pwBlocks(x); const nAct=(S.actions||[]).filter(i=>i.open).length, nArb=(S.arbs||[]).filter(i=>i.open).length+(S.decisions||[]).filter(i=>i.open).length;
  const curTeam=x.team&&teamById(x.team); const sub={presents:'<span class="pw-avs">'+x.parts.map(p=>avHtml(p[0],p[1])).join('')+'</span>'+x.partsN+' participants convoqués'+(curTeam?' · <b style="color:'+curTeam.color+'">'+curTeam.name+'</b>':''),objectif:'<input class="input pw-goal" placeholder="En une phrase, ce que la séance doit produire…" value="'+(x.goal||'')+'" onclick="pwSetGoal(this.value)" onchange="pwSetGoal(this.value)">',tour:'Chaque participant, 1 minute',actions:nAct+' action'+(nAct>1?'s':'')+' en cours · historique des séances précédentes',avancement:revueSummary(curPrepKey),planning:'<span class="pw-plan-mini">'+PHASES.map(p=>'<i style="flex:'+p[2]+';background:'+(p[3]==='done'?'var(--state-success)':p[3]==='cur'?'var(--brand-gold)':'var(--neutral-300)')+'"></i>').join('')+'</span>'+planSummary(Object.keys(PLAN_MODES)[0])+' · '+pwPlanJal('b:planning').length+' à présenter',arbitrage:nArb?nArb+' point'+(nArb>1?'s':'')+' à trancher':'Rien en attente'};
  const order=pwOrder(x); let num=0;
  const row=(k,on,title,meta,right,del)=>{ if(on) num++; const A=pwAttOf(k), n=A.items.length+(A.note?1:0);
    const cnt=n?'<span class="pw-att-n" title="'+n+' élément'+(n>1?'s':'')+' attaché'+(n>1?'s':'')+'">'+PW_ICO.clip+n+'</span>':'';
    return '<div class="pw-item pw-lite'+(on?'':' off')+'" draggable="true" ondragstart="pwSDragStart(event,\''+k+'\')" ondragend="pwDragEnd(event)" ondragover="pwSDragOver(event)" ondragleave="pwSDragLeave(event)" ondrop="pwSDrop(event,\''+k+'\')"><div class="pw-lite-row"><span class="pw-grip" title="Glisser pour déplacer">'+PW_ICO.grip+'</span>'+(k[0]==='b'?'<span class="pw-chk'+(on?' on':'')+'" onclick="pwBlkToggle(\''+k.slice(2)+'\')">'+(on?PW_ICO.chk:'')+'</span>':'<span class="pw-chk on">'+PW_ICO.chk+'</span>')+'<span class="agenda-num">'+(on?num:'–')+'</span><div class="pw-item-b" onclick="pwToggleOpen(\''+k+'\')"><div class="pw-item-t">'+title+cnt+'</div>'+(meta?'<div class="pw-item-m">'+meta+'</div>':'')+'</div>'+right+'<span class="pw-updn"><button onclick="pwSMove(\''+k+'\',-1)" title="Monter">▲</button><button onclick="pwSMove(\''+k+'\',1)" title="Descendre">▼</button></span>'+(del||'')+'<span class="pw-caret" onclick="pwToggleOpen(\''+k+'\')" title="Compléter ce point">'+PW_ICO.edit+'</span></div></div>'; };
  const std=order.map(k=>{ if(k[0]==='b'){ const b=PW_STD.find(z=>z[0]===k.slice(2)); const s=B[b[0]]; return row(k,s.on,b[1],sub[b[0]],s.on?'<input class="pw-dur" value="'+s.dur+'" onchange="pwBlkDur(\''+b[0]+'\',this.value)"><span class="pw-dur-u">min</span>':'<span class="pw-off-l">retiré</span>'); }
    const i=pwIdx(k), a=x.agenda[i]; if(!a) return ''; const orig=a[2]?'<span class="pw-orig">'+PW_ICO.hist+ORIG_SHORT[a[2].k]+'</span>':''; return row(k,true,a[0]+' '+orig,'','<input class="pw-dur" value="'+pwMins(a[1])+'" onchange="pwSetDur('+i+',this.value)"><span class="pw-dur-u">min</span>','<span class="agenda-x" onclick="prepDelPoint('+i+')">'+PW_ICO.x+'</span>'); }).join('');
  const simple='<div class="pw-simple">'+std
    +'<div class="inst-addrow pw-addrow"><input class="input" id="pw-in-simple" placeholder="Ajouter un point spécifique…" onkeydown="if(event.key===\'Enter\')pwAddSimple()"><button class="meet-mini-btn" onclick="pwAddSimple()">Ajouter</button></div></div>';
  const stdTotal=PW_STD.reduce((s,b)=>s+(B[b[0]].on?B[b[0]].dur:0),0);
  const modeSw='<span class="pw-saved" id="pw-saved">'+(PW_SAVED_AT?'Enregistré à '+PW_SAVED_AT.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):'Enregistrement automatique')+'</span><button class="pw-link pw-modesw" onclick="pwMode('+(PW_SIMPLE?'false':'true')+')">'+(PW_SIMPLE?'Organiser par sections':'Vue simple')+'</button>';
  const midTotal=PW_SIMPLE?total+stdTotal:total, midOver=midTotal>tpl.duree, midN=PW_SIMPLE?num:x.agenda.length;
  const mid='<div class="pw-mid-h"><div><div class="pw-mid-t">'+PW_ICO.odj+'Ordre du jour</div><div class="pw-mid-m">'+midN+' points · <b class="'+(midOver?'over':'')+'">'+pwFmt(midTotal)+'</b> / '+pwFmt(tpl.duree)+(midOver?' · <span class="over">'+pwFmt(midTotal-tpl.duree)+' de trop</span>':'')+'</div></div>'+modeSw+'</div>'
    +(PW_SIMPLE?simple:'<div class="pw-tools"><span class="pw-tools-l">Ajouter à l\'ordre du jour</span><button class="pw-tool'+(hasR?' done':'')+'" onclick="pwAddBlock(\'revue\')">'+PW_ICO.plan+'Revue du projet<small>planning, tâches, décisions, alertes — tout</small></button><button class="pw-tool gold" onclick="pwAutoFill()"'+(openTotal?'':' disabled')+'>'+PW_ICO.bolt+'Points à trancher<small>'+(openTotal?openTotal+' décisions, actions, arbitrages en attente':'tout est repris')+'</small></button></div>'+secs);
  document.getElementById('prepBody').innerHTML='<div class="pw"><div class="pw-left">'+left+'</div><div class="pw-mid">'+mid+'</div><div class="pw-right">'+right+'</div></div>';
  const m=document.querySelector('#prepModal .modal'); if(m) m.classList.add('modal-prep-xl');
  document.getElementById('prepModal').classList.add('open');
};

/* ─── éditeur de modèle ─── */
let TPL_DRAFT=null, TPL_TYPE=null;
function pwOpenTpl(type){
  TPL_TYPE=TYPE_TPL[type]?type:'COPROJ'; TPL_DRAFT=JSON.parse(JSON.stringify(TYPE_TPL[TPL_TYPE]));
  let ov=document.getElementById('tplModal');
  if(!ov){ ov=document.createElement('div'); ov.className='modal-overlay'; ov.id='tplModal'; ov.setAttribute('onclick','if(event.target===this)pwCloseTpl()'); document.body.appendChild(ov); }
  pwRenderTpl(); ov.classList.add('open');
}
function pwCloseTpl(){ const o=document.getElementById('tplModal'); if(o) o.classList.remove('open'); }
function pwTplSet(k,v){ TPL_DRAFT[k]=v; }
function pwTplSec(i,k,v){ TPL_DRAFT.sections[i][k]=k==='dur'?(parseInt(v)||0):v; if(k==='nature'||k==='dur') pwRenderTpl(); }
function pwTplPull(i,k){ const p=TPL_DRAFT.sections[i].pull||(TPL_DRAFT.sections[i].pull=[]); const j=p.indexOf(k); if(j<0) p.push(k); else p.splice(j,1); pwRenderTpl(); }
function pwTplAddSec(){ TPL_DRAFT.sections.push({id:'s'+Date.now(),title:'Nouvelle section',dur:10,nature:'info',pull:[]}); pwRenderTpl(); }
function pwTplDelSec(i){ TPL_DRAFT.sections.splice(i,1); pwRenderTpl(); }
function pwTplMove(i,d){ const s=TPL_DRAFT.sections; const j=i+d; if(j<0||j>=s.length) return; const t=s[i]; s[i]=s[j]; s[j]=t; pwRenderTpl(); }
function pwTplPart(ini){ const p=TPL_DRAFT.parts; const j=p.indexOf(ini); if(j<0) p.push(ini); else p.splice(j,1); pwRenderTpl(); }
function pwTplSwitch(t){ TPL_TYPE=t; TPL_DRAFT=JSON.parse(JSON.stringify(TYPE_TPL[t])); pwRenderTpl(); }
function pwTplReset(){ TPL_DRAFT=JSON.parse(JSON.stringify(TPL_DEFAULTS[TPL_TYPE])); pwRenderTpl(); showToast('Modèle '+TPL_TYPE+' rétabli aux valeurs standard (non enregistré)'); }
function pwTplSave(){ TYPE_TPL[TPL_TYPE]=JSON.parse(JSON.stringify(TPL_DRAFT)); tplSave(); pwCloseTpl(); if(document.getElementById('prepModal').classList.contains('open')) prepRerender(); showToast('Modèle '+TPL_TYPE+' enregistré · '+TPL_DRAFT.sections.length+' sections · '+pwFmt(TPL_DRAFT.sections.reduce((s,x)=>s+x.dur,0))); }
function pwRenderTpl(){
  const d=TPL_DRAFT; const sum=d.sections.reduce((s,x)=>s+x.dur,0);
  const types=Object.keys(TYPE_TPL).map(t=>'<button class="pw-tab'+(t===TPL_TYPE?' on':'')+'" onclick="pwTplSwitch(\''+t+'\')">'+t+'</button>').join('');
  const opt=(arr,v)=>arr.map(o=>'<option'+(o===v?' selected':'')+'>'+o+'</option>').join('');
  const secs=d.sections.map((s,i)=>{ const n=NAT[s.nature]||NAT.info;
    return '<div class="tpl-sec"><div class="tpl-sec-r1"><span class="tpl-ord"><span onclick="pwTplMove('+i+',-1)">▲</span><span onclick="pwTplMove('+i+',1)">▼</span></span><input class="input tpl-title" value="'+s.title.replace(/"/g,'&quot;')+'" oninput="pwTplSec('+i+',\'title\',this.value)"><input class="input tpl-dur" value="'+s.dur+'" onchange="pwTplSec('+i+',\'dur\',this.value)"><span class="pw-dur-u">min</span><select class="nselect tpl-nat" onchange="pwTplSec('+i+',\'nature\',this.value)">'+Object.keys(NAT).map(k=>'<option value="'+k+'"'+(s.nature===k?' selected':'')+'>'+NAT[k][0]+'</option>').join('')+'</select><span class="agenda-x" onclick="pwTplDelSec('+i+')">'+PW_ICO.x+'</span></div><div class="tpl-pulls"><span class="tpl-pulls-l">Reprend automatiquement :</span>'+Object.keys(PULL_KINDS).map(k=>'<span class="wchip'+((s.pull||[]).indexOf(k)>=0?' on':'')+'" onclick="pwTplPull('+i+',\''+k+'\')">'+PULL_KINDS[k]+'</span>').join('')+'</div></div>'; }).join('');
  const parts=Object.keys(DIR).map(k=>'<span class="part-chip tpl-part'+(d.parts.indexOf(k)>=0?' on':'')+'" onclick="pwTplPart(\''+k+'\')"><span class="av '+DIR[k][3]+'">'+k+'</span>'+DIR[k][0]+'</span>').join('');
  const ups=['—','COPROJ','COPIL','COTECH','CODIR','CRA','COMEX'];
  document.getElementById('tplModal').innerHTML='<div class="modal modal-tpl"><div class="modal-head"><div class="modal-head-ico">'+PW_ICO.tpl+'</div><div><div class="modal-title">Modèles d\'instance</div><div class="modal-sub">Chaque type de réunion a son ordre du jour type, sa cadence, ses participants et ses règles de reprise. Le modèle s\'applique à toute nouvelle séance du type.</div></div><button class="modal-close" onclick="pwCloseTpl()">'+PW_ICO.x+'</button></div>'
   +'<div class="modal-body tpl-body"><div class="pw-tabs tpl-types">'+types+'</div>'
   +'<div class="ni-grid2"><div class="field"><label class="field-label">Libellé</label><input class="input" value="'+d.label+'" oninput="pwTplSet(\'label\',this.value)"></div><div class="field"><label class="field-label">Transmet les sujets non tranchés à</label><select class="selectbox" onchange="pwTplSet(\'up\',this.value===\'—\'?null:this.value)">'+opt(ups,d.up||'—')+'</select></div></div>'
   +'<div class="ni-grid3" style="grid-template-columns:1fr 1fr 1fr 1fr"><div class="field"><label class="field-label">Cadence</label><select class="selectbox" onchange="pwTplSet(\'cadence\',this.value)">'+opt(['Hebdomadaire','Bimensuel','Mensuel','Trimestriel','Semestriel','Ponctuel'],d.cadence)+'</select></div><div class="field"><label class="field-label">Jour</label><select class="selectbox" onchange="pwTplSet(\'jour\',this.value)">'+opt(['Lundi','Mardi','Mercredi','Jeudi','Vendredi','—'],d.jour)+'</select></div><div class="field"><label class="field-label">Heure</label><input class="input" value="'+d.heure+'" oninput="pwTplSet(\'heure\',this.value)"></div><div class="field"><label class="field-label">Durée cible (min)</label><input class="input" value="'+d.duree+'" onchange="pwTplSet(\'duree\',parseInt(this.value)||60)"></div></div>'
   +'<div class="field"><label class="field-label">Lieu par défaut</label><input class="input" value="'+d.lieu+'" oninput="pwTplSet(\'lieu\',this.value)"></div>'
   +'<div class="field"><label class="field-label">Équipe permanente ('+d.parts.length+')</label><div class="part-grid">'+parts+'</div></div>'
   +'<div class="field"><div class="inst-sec-head"><label class="field-label" style="margin:0">Ordre du jour type — '+d.sections.length+' sections · <b class="'+(sum>d.duree?'over':'')+'">'+pwFmt(sum)+'</b> / '+pwFmt(d.duree)+'</label><span class="inst-add" onclick="pwTplAddSec()">+ Ajouter une section</span></div>'+secs+'</div>'
   +'<label class="tpl-toggle"><input type="checkbox"'+(d.auto?' checked':'')+' onchange="pwTplSet(\'auto\',this.checked)"><span>Proposer le remplissage automatique à l\'ouverture de chaque préparation</span></label>'
   +'</div><div class="modal-foot"><button class="btn btn-secondary" onclick="pwTplReset()">Valeurs standard</button><span style="flex:1"></span><button class="btn btn-secondary" onclick="pwCloseTpl()">Annuler</button><button class="btn btn-primary" onclick="pwTplSave()">Enregistrer le modèle</button></div></div>';
}

/* ─── retour de séance : kinds supplémentaires ─── */
Object.assign(ORIG_META,{
  action:{lbl:'Action du point précédent',c:'var(--state-info)',bg:'var(--state-info-bg)',q:'Où en est cette action ?',opts:[['done','Terminée'],['ongoing','En cours'],['late','En retard']]},
  risk:{lbl:'Risque suivi',c:'var(--state-danger)',bg:'var(--state-danger-bg)',q:'Évolution du risque',opts:[['down','Maîtrisé'],['same','Inchangé'],['up','Aggravé']]},
  remonte:{lbl:'Sujet remonté du niveau inférieur',c:'var(--purple)',bg:'var(--purple-bg)',q:'Verdict de cette instance',opts:[['adopte','Adopté'],['rejete','Rejeté'],['reporte','Reporté']]}
});
Object.assign(ORIG_TXT,{down:'maîtrisé',same:'inchangé',up:'aggravé'});
const _origSet=origSet;
window.origSet=function(v){ const p=MEET.points[MEET.cur], o=p.origin; _origSet(v); if(!o) return;
  if(o.k==='action'&&INST_CR[o.prev]&&INST_CR[o.prev].actions[o.i]) INST_CR[o.prev].actions[o.i][2]=(v==='done');
  if(o.k==='remonte'){ REMONTES.splice(o.i,1); }
};
/* en séance : le bloc planning / tâches s'affiche tel que réglé en préparation */
const _renderMeet=renderMeet;
window.renderMeet=function(){ _renderMeet(); const p=MEET&&MEET.points[MEET.cur]; if(!p||!p.origin) return;
  if(p.origin.k==='revue'){ const html='<div class="meet-cap meet-blk"><div class="meet-cap-h">'+PW_ICO.plan+'Revue du projet</div>'+revueView(MEET_KEY)+'</div>'; const sub=document.querySelector('#meetPanel .meet-panel-sub'); if(sub) sub.insertAdjacentHTML('afterend',html); return; }
  if(p.origin.k!=='planning'&&p.origin.k!=='taches') return;
  const isP=p.origin.k==='planning'; const opts=isP?PLAN_MODES:TASK_FILTERS; const cur=isP?p.origin.mode:p.origin.filter;
  const seg=Object.keys(opts).map(k=>'<button class="pw-seg'+(k===cur?' on':'')+'" onclick="MEET.points[MEET.cur].origin.'+(isP?'mode':'filter')+'=\''+k+'\';renderMeet()">'+opts[k][0]+'</button>').join('');
  const html='<div class="meet-cap meet-blk"><div class="meet-cap-h">'+(isP?PW_ICO.plan:PW_ICO.task)+(isP?'Planning du projet':'Tâches du projet')+'<div class="pw-segs" style="margin-left:auto">'+seg+'</div></div>'+(isP?planView(cur):taskView(cur))+'</div>';
  const sub=document.querySelector('#meetPanel .meet-panel-sub'); if(sub) sub.insertAdjacentHTML('afterend',html);
};
