/* ═══ STRATÉGIE — vue consolidée groupe, comparateur, export PDF 1 page ═══ */
function stgHeat(v){
  if(!v) return {bg:'',c:'',cls:' empty',t:'—'};
  if(v>=75) return {bg:'var(--state-success-bg)',c:'var(--state-success)',cls:'',t:v+'%'};
  if(v>=50) return {bg:'var(--brand-gold-050)',c:'var(--brand-gold-700)',cls:'',t:v+'%'};
  if(v>=25) return {bg:'var(--state-warning-bg)',c:'var(--state-warning)',cls:'',t:v+'%'};
  return {bg:'var(--state-danger-bg)',c:'var(--state-danger)',cls:'',t:v+'%'};
}
function stgCell(v){ const h=stgHeat(v); return '<td><div class="stg-heat'+h.cls+'"'+(h.bg?' style="background:'+h.bg+';color:'+h.c+'"':'')+'>'+h.t+'</div></td>'; }
const STG_STOP=['refonte','pilotage','strategique','interne','projet','projets','gestion','nouvelle','nouveau','cycle','direction','plan','mise','tous','pour','avec','dans','leur'];
function stgTok(s){
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,' ')
   .split(/\s+/).filter(w=>w.length>3 && !STG_STOP.includes(w));
}
function stgDups(){
  const all=[]; STG_DIRS.forEach(d=>d.chantiers.forEach(c=>all.push({d,c,tk:stgTok(c.n)})));
  const out=[];
  for(let i=0;i<all.length;i++) for(let j=i+1;j<all.length;j++){
    if(all[i].d.id===all[j].d.id) continue;
    const shared=all[i].tk.filter(t=>all[j].tk.includes(t));
    if(shared.length) out.push({a:all[i],b:all[j],shared});
  }
  return out.sort((x,y)=>y.shared.length-x.shared.length).slice(0,6);
}
function stgRenderConsol(){
  const host=document.getElementById('vs-consol'); if(!host) return;
  const ax=stgGAxes();
  const chAll=[]; STG_DIRS.forEach(d=>d.chantiers.forEach(c=>chAll.push({d,c})));
  const budTot=STG_DIRS.reduce((s,d)=>s+Object.values(d.budgets).reduce((a,b)=>a+b,0),0);
  const scAvg=STG_DIRS.length?Math.round(STG_DIRS.reduce((s,d)=>s+stgScore(d),0)/STG_DIRS.length):0;
  const dims=['Ambition','Objectifs','Chantiers','Budget','Risques','Revue'];
  const dups=stgDups();
  const pc=m=>(m/STG_NM*100);
  host.innerHTML=
   '<div class="stg-kpis">'
   +'<div class="stg-kpi"><div class="l">Directions</div><div class="v">'+STG_DIRS.length+'</div><div class="d">'+STG_DIRS.filter(d=>d.status==='valide').length+' schéma(s) validé(s)</div></div>'
   +'<div class="stg-kpi"><div class="l">Chantiers consolidés</div><div class="v">'+chAll.length+'</div><div class="d">'+chAll.filter(x=>x.c.pct>0&&x.c.pct<100).length+' en cours</div></div>'
   +'<div class="stg-kpi"><div class="l">Budget horizon '+STG_Y0+'–'+(STG_Y0+STG_NY-1)+'</div><div class="v">'+stgEur(budTot)+'</div><div class="d">toutes directions</div></div>'
   +'<div class="stg-kpi"><div class="l">Alignement moyen</div><div class="v">'+scAvg+'%</div><div class="d">'+(dups.length?dups.length+' recouvrement(s) détecté(s)':'aucun recouvrement')+'</div></div>'
   +'</div>'
   /* matrice */
   +'<div class="stg-sec"><div class="stg-sec-head"><div><div class="stg-sec-t">Matrice directions × axes du groupe</div>'
   +'<div class="stg-sec-sub">Contribution déclarée de chaque direction aux axes de la vision groupe. Le nombre de chantiers rattachés est indiqué sous chaque valeur.</div></div>'
   +'<button class="btn btn-secondary" onclick="stgOpenCompare()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><line x1="12" y1="3" x2="12" y2="21"/><polyline points="7 8 4 11 7 14"/><polyline points="17 8 20 11 17 14"/></svg>Comparer deux directions</button></div>'
   +'<div class="card card-pad"><div class="table-wrap"><table class="stg-mx"><thead><tr><th class="rowh">Direction</th>'
   +ax.map(a=>'<th>'+stgEsc(a.name)+'</th>').join('')+'<th>Score</th></tr></thead><tbody>'
   +STG_DIRS.map(d=>{ const T=stgTone(d.tone);
      return '<tr><td class="rowh"><span class="stg-chip" style="background:'+T.bg+';color:'+T.c+';margin-right:7px">'+stgEsc(d.sigle)+'</span>'+stgEsc(d.name)+'<div class="s">'+stgEsc(d.dir)+'</div></td>'
       +ax.map(a=>{ const v=d.align[a.id]||0, n=d.chantiers.filter(c=>(c.ga||[]).includes(a.id)).length, h=stgHeat(v);
          return '<td><div class="stg-heat'+h.cls+'"'+(h.bg?' style="background:'+h.bg+';color:'+h.c+'"':'')+' title="'+n+' chantier(s) rattaché(s)">'+h.t+'</div>'
           +'<div style="text-align:center;font-size:10.5px;font-weight:700;color:var(--neutral-400);margin-top:2px">'+(n?n+' ch.':'—')+'</div></td>'; }).join('')
       +stgCell(stgScore(d))+'</tr>'; }).join('')
   +'</tbody></table></div></div></div>'
   /* heatmap maturité */
   +'<div class="stg-sec"><div><div class="stg-sec-t">Maturité des schémas directeurs</div>'
   +'<div class="stg-sec-sub" style="margin-bottom:12px">Complétude calculée sur six dimensions : ambition formulée, objectifs mesurables, chantiers planifiés, budget couvert, risques déclarés, fraîcheur de la dernière revue.</div></div>'
   +'<div class="card card-pad"><div class="table-wrap"><table class="stg-mx"><thead><tr><th class="rowh">Direction</th>'
   +dims.map(x=>'<th>'+x+'</th>').join('')+'</tr></thead><tbody>'
   +STG_DIRS.map(d=>{ const m=stgMaturity(d), T=stgTone(d.tone);
      return '<tr><td class="rowh"><span class="stg-chip" style="background:'+T.bg+';color:'+T.c+';margin-right:7px">'+stgEsc(d.sigle)+'</span>'+stgEsc(d.name)+'</td>'
       +dims.map(x=>stgCell(m[x])).join('')+'</tr>'; }).join('')
   +'</tbody></table></div></div></div>'
   /* timeline groupe */
   +'<div class="stg-sec"><div><div class="stg-sec-t">Timeline groupe — tous les schémas directeurs superposés</div>'
   +'<div class="stg-sec-sub" style="margin-bottom:12px">Une ligne par chantier, regroupée par direction. Permet de repérer les pics de charge simultanés entre directions.</div></div>'
   +'<div class="card stg-tl">'
   +'<div class="stg-tl-row" style="--stg-ny:'+STG_NY+'"><div></div><div class="stg-tl-years" style="--stg-ny:'+STG_NY+'">'
   +Array.from({length:STG_NY},(_,i)=>'<div class="stg-tl-year">'+(STG_Y0+i)+'</div>').join('')+'</div></div>'
   +STG_DIRS.map(d=>{ const T=stgTone(d.tone);
      return '<div class="stg-tl-lane-h"><i style="background:'+T.c+'"></i>'+stgEsc(d.sigle)+' — '+stgEsc(d.name)+'</div>'
       +d.chantiers.slice().sort((a,b)=>a.s-b.s).map(c=>
         '<div class="stg-tl-row stg-tl-lane"><div><div class="stg-tl-name" onclick="stgOpenDir(\''+d.id+'\')">'+stgEsc(c.n)+'</div><div class="stg-tl-nsub">'+stgEsc(c.own)+' · '+stgEur(c.bud)+'</div></div>'
         +'<div class="stg-tl-track" style="--stg-nq:12">'
         +'<div class="stg-tl-bar" style="left:'+pc(c.s).toFixed(2)+'%;width:'+pc(Math.max(1,c.e-c.s)).toFixed(2)+'%;background:'+T.c+'" onclick="stgOpenDir(\''+d.id+'\')" title="'+stgEsc(d.sigle)+' — '+stgEsc(c.n)+' · '+stgQlbl(c.s)+' → '+stgQlbl(c.e)+'"><i style="width:'+c.pct+'%"></i><span>'+c.pct+'%</span></div>'
         +(c.ms||[]).map(m=>'<div class="stg-tl-ms" style="left:'+pc(m.m).toFixed(2)+'%" title="'+stgEsc(m.l)+' — '+stgQlbl(m.m)+'"></div>').join('')
         +'<div class="stg-tl-now" style="left:'+pc(STG_NOW).toFixed(2)+'%"></div></div></div>').join(''); }).join('')
   +'<div class="stg-tl-legend">'+STG_DIRS.map(d=>'<span class="k"><i style="background:'+stgTone(d.tone).c+'"></i>'+stgEsc(d.sigle)+'</span>').join('')
   +'<span class="k"><span class="dia"></span>Jalon structurant</span></div></div></div>'
   /* portefeuille consolidé */
   +'<div class="stg-sec"><div><div class="stg-sec-t">Portefeuille consolidé de chantiers</div>'
   +'<div class="stg-sec-sub" style="margin-bottom:12px">'+chAll.length+' chantiers issus des schémas directeurs, avec leur rattachement aux axes du groupe.</div></div>'
   +'<div class="card tablecard"><div class="table-wrap"><table class="dt"><thead><tr><th>Chantier</th><th>Direction</th><th>Fenêtre</th><th>Pilote</th><th>Budget</th><th>Axes groupe</th><th class="right">Avancement</th></tr></thead><tbody>'
   +chAll.sort((a,b)=>a.c.s-b.c.s).map(x=>{ const T=stgTone(x.d.tone);
      return '<tr style="cursor:pointer" onclick="stgOpenDir(\''+x.d.id+'\')"><td class="cell-strong">'+stgEsc(x.c.n)+'</td>'
       +'<td><span class="stg-chip" style="background:'+T.bg+';color:'+T.c+'">'+stgEsc(x.d.sigle)+'</span></td>'
       +'<td style="font-variant-numeric:tabular-nums;color:var(--neutral-600)">'+stgQlbl(x.c.s)+' → '+stgQlbl(Math.min(x.c.e,STG_NM-1))+'</td>'
       +'<td>'+stgEsc(x.c.own)+'</td><td style="font-variant-numeric:tabular-nums">'+stgEur(x.c.bud)+'</td>'
       +'<td><div class="stg-chips">'+((x.c.ga||[]).map(id=>{ const a=ax.find(z=>z.id===id); return a?'<span class="stg-chip">'+stgEsc(a.name)+'</span>':''; }).join('')||'<span style="color:var(--neutral-300);font-weight:700">non rattaché</span>')+'</div></td>'
       +'<td class="right"><div class="prog" style="justify-content:flex-end"><div class="prog-track" style="width:80px"><div class="prog-fill" style="width:'+x.c.pct+'%;background:'+(x.c.pct>=70?'var(--state-success)':x.c.pct>=30?'var(--brand-gold)':'var(--state-danger)')+'"></div></div><span class="prog-pct">'+x.c.pct+'%</span></div></td></tr>'; }).join('')
   +'</tbody></table></div></div></div>'
   /* doublons */
   +'<div class="stg-sec"><div><div class="stg-sec-t"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>Recouvrements entre directions</div>'
   +'<div class="stg-sec-sub" style="margin-bottom:12px">Chantiers de directions différentes partageant un même objet — à arbitrer en revue croisée avant lancement.</div></div>'
   +'<div class="stg-dup">'+(dups.length?dups.map(p=>{
      const TA=stgTone(p.a.d.tone), TB=stgTone(p.b.d.tone);
      const os=Math.max(p.a.c.s,p.b.c.s), oe=Math.min(p.a.c.e,p.b.c.e);
      const ov=Math.max(0,oe-os), sev=ov>=12?'high':ov>=6?'mid':'low';
      const sevL={high:'Recouvrement fort',mid:'Recouvrement notable',low:'Recouvrement limité'}[sev];
      const bar=(c,col)=>'<div class="tr"><i style="left:'+(c.s/STG_NM*100).toFixed(2)+'%;width:'+(Math.max(1,c.e-c.s)/STG_NM*100).toFixed(2)+'%;background:'+col+'"></i>'
       +(ov>0?'<b style="left:'+(os/STG_NM*100).toFixed(2)+'%;width:'+(ov/STG_NM*100).toFixed(2)+'%"></b>':'')+'</div>';
      const side=(x,T,al)=>'<div class="sd '+al+'"><div class="sd-h"><span class="sg" style="background:'+T.bg+';color:'+T.c+'">'+stgEsc(x.d.sigle)+'</span>'
       +'<span class="sd-m">'+stgQlbl(x.c.s)+' → '+stgQlbl(Math.min(x.c.e,STG_NM-1))+'</span></div>'
       +'<div class="sd-n">'+stgEsc(x.c.n)+'</div>'
       +'<div class="sd-f"><span>'+stgEsc(x.c.own)+'</span><span class="dot"></span><span>'+stgEur(x.c.bud)+'</span><span class="dot"></span><span>'+x.c.pct+' %</span></div></div>';
      return '<div class="card stg-dup-c sev-'+sev+'">'
       +'<div class="stg-dup-top"><span class="sev">'+sevL+'</span>'
       +'<span class="stg-dup-q">'+(ov>0?'Chevauchement '+stgQlbl(os)+' → '+stgQlbl(Math.max(os,oe-1)):'Fenêtres disjointes')+'</span>'
       +'<span class="stg-dup-b">'+stgEur(p.a.c.bud+p.b.c.bud)+' cumulés</span></div>'
       +'<div class="stg-dup-body">'+side(p.a,TA,'l')
       +'<div class="mid"><i style="background:'+TA.c+'"></i><span class="x"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></span><i style="background:'+TB.c+'"></i></div>'
       +side(p.b,TB,'r')+'</div>'
       +'<div class="stg-dup-tl"><div class="yl">'+Array.from({length:STG_NY},(_,i)=>'<span>'+(STG_Y0+i)+'</span>').join('')+'</div>'
       +bar(p.a.c,TA.c)+bar(p.b.c,TB.c)+'</div>'
       +'<div class="stg-dup-foot"><span class="lb">Objets partagés</span><div class="stg-chips">'+p.shared.map(t=>'<span class="stg-chip">'+stgEsc(t)+'</span>').join('')+'</div>'
       +'<button class="btn btn-secondary" onclick="stgToast(\'Recouvrement inscrit à l’ordre du jour de la revue croisée\')">Inscrire en revue croisée</button></div></div>'; }).join('')
      :'<div class="card"><div class="stg-empty">Aucun recouvrement détecté entre les schémas directeurs.</div></div>')+'</div></div>';
}
/* ─── Comparateur ─── */
function stgOpenCompare(){
  const sel=(id,i)=>{ const e=document.getElementById(id); e.innerHTML=STG_DIRS.map(d=>'<option value="'+d.id+'">'+stgEsc(d.sigle)+' — '+stgEsc(d.name)+'</option>').join(''); e.value=(STG_DIRS[i]||STG_DIRS[0]||{}).id; };
  sel('scmp-a',0); sel('scmp-b',1);
  stgRenderCompare(); stgOpen('scmpModal');
}
function stgRenderCompare(){
  const host=document.getElementById('scmp-body'); if(!host) return;
  const ids=[document.getElementById('scmp-a').value, document.getElementById('scmp-b').value];
  const ax=stgGAxes();
  host.innerHTML='<div class="stg-cmp">'+ids.map(id=>{
    const d=stgDir(id); if(!d) return '<div class="stg-cmp-col"></div>';
    const T=stgTone(d.tone), m=stgMaturity(d);
    const bud=Object.values(d.budgets).reduce((a,b)=>a+b,0);
    const chAvg=d.chantiers.length?Math.round(d.chantiers.reduce((s,c)=>s+c.pct,0)/d.chantiers.length):0;
    const row=(k,v)=>'<div class="stg-cmp-row"><span class="k">'+k+'</span><span class="v">'+v+'</span></div>';
    return '<div class="stg-cmp-col"><div class="stg-cmp-h" style="background:'+T.bg+'">'
     +'<div class="stg-sigle" style="width:38px;height:38px;font-size:12px;background:var(--neutral-0);color:'+T.c+'">'+stgEsc(d.sigle)+'</div>'
     +'<div><div class="n">'+stgEsc(d.name)+'</div><div class="s">'+stgEsc(d.dir)+' · '+stgEsc(d.version)+'</div></div></div>'
     +'<div style="padding:14px 16px;font-size:12.5px;line-height:1.55;color:var(--neutral-700);border-bottom:1px solid var(--neutral-100);min-height:88px">'+d.ambition+'</div>'
     +row('Score d’alignement','<span style="color:'+T.c+'">'+stgScore(d)+'%</span>')
     +row('Statut',(STG_STATUS[d.status]||{lbl:'—'}).lbl)
     +row('Horizon',stgEsc(d.horizon))
     +row('Effectif',d.fte+' ETP')
     +row('Budget de fonctionnement',stgEur(d.budget))
     +row('Budget schéma directeur',stgEur(bud))
     +row('Axes propres',d.axes.length)
     +row('Chantiers',d.chantiers.length+' · '+chAvg+'% moyen')
     +row('Objectifs mesurables',d.okr.length)
     +row('Risques déclarés',d.risks.length)
     +row('Dernière revue',stgDate(d.review))
     +'<div style="padding:12px 16px;border-top:1px solid var(--neutral-100)"><div style="font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:var(--neutral-500);margin-bottom:9px">Contribution aux axes groupe</div>'
     + ax.map(a=>{ const v=d.align[a.id]||0;
        return '<div class="stg-contrib-row" style="grid-template-columns:1fr 90px 38px;margin-bottom:7px"><div class="l">'+stgEsc(a.name)+'</div><div class="t" style="height:14px"><i style="width:'+v+'%;background:'+T.c+'"></i></div><div class="p">'+v+'%</div></div>'; }).join('')
     +'</div>'
     +'<div style="padding:12px 16px;border-top:1px solid var(--neutral-100)"><div style="font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:var(--neutral-500);margin-bottom:9px">Maturité</div>'
     +'<div class="stg-chips">'+Object.keys(m).map(k=>{ const h=stgHeat(m[k]); return '<span class="stg-chip"'+(h.bg?' style="background:'+h.bg+';color:'+h.c+'"':'')+'>'+k+' '+h.t+'</span>'; }).join('')+'</div></div>'
     +'</div>';
  }).join('')+'</div>';
}
/* ─── Export PDF 1 page ─── */
function stgExportPdf(id){
  const d=stgDir(id||STG_CUR); if(!d) return;
  const T=stgTone(d.tone), ax=stgGAxes(), pc=m=>(m/STG_NM*100);
  let n=document.getElementById('stg-print');
  if(!n){ n=document.createElement('div'); n.id='stg-print'; document.body.appendChild(n); }
  const line=(k,v)=>'<div><span>'+k+'</span><b>'+v+'</b></div>';
  n.innerHTML='<div class="stg-p-h"><div style="width:34px;height:34px;border-radius:6px;background:'+T.bg+';color:'+T.c+';display:flex;align-items:center;justify-content:center;font-weight:800;font-size:11pt">'+stgEsc(d.sigle)+'</div>'
   +'<div style="flex:1"><h1>'+stgEsc(d.name)+' — schéma directeur '+stgEsc(d.horizon)+'</h1>'
   +'<div class="s">'+stgEsc(d.dir)+' · '+stgEsc(d.version)+' · '+(STG_STATUS[d.status]||{lbl:''}).lbl+' · revue du '+stgDate(d.review)+' · alignement '+stgScore(d)+'%</div></div></div>'
   +'<div class="stg-p-amb">'+d.ambition+'</div>'
   +'<div class="stg-p-tl">'+d.axes.map((a,i)=>{ const cs=d.chantiers.filter(c=>c.lane===i); if(!cs.length) return '';
      return '<div class="stg-p-t" style="margin-top:6px">'+stgEsc(a.n)+'</div>'
       +cs.sort((x,y)=>x.s-y.s).map(c=>'<div class="r"><span>'+stgEsc(c.n)+'</span><div class="tr"><i style="left:'+pc(c.s).toFixed(1)+'%;width:'+pc(Math.max(1,c.e-c.s)).toFixed(1)+'%;background:'+stgTone(a.t).c+'"></i></div></div>').join(''); }).join('')
   +'<div style="display:grid;grid-template-columns:40mm 1fr;gap:6px"><span></span><div style="display:grid;grid-template-columns:repeat('+STG_NY+',1fr);font-size:7pt;color:#5F5A52;font-weight:700">'
   +Array.from({length:STG_NY},(_,i)=>'<span>'+(STG_Y0+i)+'</span>').join('')+'</div></div></div>'
   +'<div class="stg-p-cols"><div><div class="stg-p-t">Objectifs mesurables</div><div class="stg-p-l">'
   +(d.okr.map(o=>line(stgEsc(o.t),o.pct+'%')).join('')||'<div><span>—</span></div>')+'</div>'
   +'<div class="stg-p-t" style="margin-top:9px">Contribution aux axes groupe</div><div class="stg-p-l">'
   +ax.map(a=>line(stgEsc(a.name),(d.align[a.id]||0)+'%')).join('')+'</div></div>'
   +'<div><div class="stg-p-t">Budget par horizon</div><div class="stg-p-l">'
   +Object.keys(d.budgets).sort().map(y=>line(y,stgEur(d.budgets[y]))).join('')
   +line('<b>Total</b>',stgEur(Object.values(d.budgets).reduce((a,b)=>a+b,0)))+'</div>'
   +'<div class="stg-p-t" style="margin-top:9px">Risques stratégiques</div><div class="stg-p-l">'
   +(d.risks.map(r=>line(stgEsc(r.n),stgEsc(r.p)+' / '+stgEsc(r.i))).join('')||'<div><span>—</span></div>')+'</div>'
   +'<div class="stg-p-t" style="margin-top:9px">Indicateurs</div><div class="stg-p-l">'
   +d.kpis.map(k=>line(stgEsc(k.l),stgEsc(k.v))).join('')+'</div></div></div>'
   +'<div style="margin-top:9px;font-size:7.5pt;color:#8C8579">Starium · '+stgEsc(d.sigle)+' · document généré le '+stgDate(new Date().toISOString().slice(0,10))+' — '+d.chantiers.length+' chantiers, '+stgEur(d.chantiers.reduce((s,c)=>s+c.bud,0))+' de charge projet.</div>';
  stgToast('Ouverture de l’aperçu d’impression…');
  setTimeout(()=>window.print(), 260);
}
/* ─── Modales injectées ─── */
(function stgMountModals(){
  const x='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  const head=(id,ico,t,s,sub)=>'<div class="modal-head"><div class="modal-head-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round">'+ico+'</svg></div>'
   +'<div><div class="modal-title" id="'+t+'">'+s+'</div><div class="modal-sub">'+(sub||'')+'</div></div>'
   +'<button class="modal-close" onclick="stgClose(\''+id+'\')">'+x+'</button></div>';
  const wrap=(id,cls,inner)=>'<div class="modal-overlay" id="'+id+'" onclick="if(event.target===this)stgClose(\''+id+'\')"><div class="modal'+(cls?' '+cls:'')+'">'+inner+'</div></div>';
  const ICO_D='<path d="M3 21V7l9-4 9 4v14"/><path d="M9 21v-8h6v8"/>';
  const ICO_C='<rect x="3" y="4" width="18" height="17" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="9" y1="10" x2="9" y2="21"/>';
  const ICO_T='<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>';
  const ICO_O='<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>';
  const ICO_R='<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>';
  const ICO_X='<line x1="12" y1="3" x2="12" y2="21"/><polyline points="7 8 4 11 7 14"/><polyline points="17 8 20 11 17 14"/>';
  const html=
  wrap('sdirModal','modal-plan',
    head('sdirModal',ICO_D,'sdm-title','Nouvelle direction','Identité, périmètre et cadre de la stratégie')
   +'<div class="modal-body"><input type="hidden" id="sdm-id">'
   +'<div class="field-row"><div class="field"><label class="field-label">Sigle <span class="req">*</span></label><input class="input" id="sdm-sigle" placeholder="Ex : DRH"></div>'
   +'<div class="field"><label class="field-label">Nom complet <span class="req">*</span></label><input class="input" id="sdm-name" placeholder="Ex : Direction des Ressources Humaines"></div></div>'
   +'<div class="field-row"><div class="field"><label class="field-label">Directeur·rice / sponsor</label><input class="input" id="sdm-dir" placeholder="Ex : Claire Dubois"></div>'
   +'<div class="field"><label class="field-label">Rattachement</label><input class="input" id="sdm-parent" placeholder="Direction Générale"></div></div>'
   +'<div class="field"><label class="field-label">Périmètre &amp; missions</label><textarea class="textarea" id="sdm-scope" rows="2" placeholder="Ce que la direction porte au quotidien."></textarea></div>'
   +'<div class="field"><label class="field-label">Ambition stratégique</label><textarea class="textarea" id="sdm-ambition" rows="3" placeholder="En une phrase : où la direction veut être à la fin de l’horizon."></textarea></div>'
   +'<div class="field-row"><div class="field"><label class="field-label">Effectif (ETP)</label><input class="input" type="number" min="0" id="sdm-fte" placeholder="Ex : 34"></div>'
   +'<div class="field"><label class="field-label">Budget annuel (k€)</label><input class="input" type="number" min="0" id="sdm-budget" placeholder="Ex : 4100"></div></div>'
   +'<div class="field-row"><div class="field"><label class="field-label">Horizon de la stratégie</label><input class="input" id="sdm-horizon" placeholder="2026 → 2028"></div>'
   +'<div class="field"><label class="field-label">Date de dernière revue</label><input class="input" type="date" id="sdm-review"></div></div>'
   +'<div class="field-row"><div class="field"><label class="field-label">Statut</label><select class="nselect" id="sdm-status"><option value="brouillon">Brouillon</option><option value="revue">En revue</option><option value="valide">Validé</option></select></div>'
   +'<div class="field"><label class="field-label">Couleur / thème</label><div class="type-pills" id="sdm-tone">'
   +[['info','Bleu'],['teal','Émeraude'],['gold','Or'],['purple','Violet'],['success','Vert']].map(t=>'<button class="type-pill" data-tone="'+t[0]+'" onclick="stgPickTone(this)"><div class="type-pill-name">'+t[1]+'</div></button>').join('')
   +'</div></div></div></div>'
   +'<div class="modal-foot"><button class="btn btn-secondary" style="margin-right:auto;color:var(--state-danger)" onclick="stgDeleteDir()" id="sdm-del-dir">Supprimer</button>'
   +'<button class="btn btn-secondary" onclick="stgClose(\'sdirModal\')">Annuler</button>'
   +'<button class="btn btn-primary" onclick="stgSaveDir()">Enregistrer</button></div>')
  +wrap('schantModal','',
    head('schantModal',ICO_C,'scm-title','Nouveau chantier','Une ligne du schéma directeur')
   +'<div class="modal-body">'
   +'<div class="field"><label class="field-label">Intitulé du chantier <span class="req">*</span></label><input class="input" id="scm-name" placeholder="Ex : Dématérialisation des notes de frais"></div>'
   +'<div class="field"><label class="field-label">Axe propre de rattachement</label><select class="nselect" id="scm-lane"></select></div>'
   +'<div class="field-row"><div class="field"><label class="field-label">Début</label><select class="nselect" id="scm-s"></select></div>'
   +'<div class="field"><label class="field-label">Fin</label><select class="nselect" id="scm-e"></select></div></div>'
   +'<div class="field-row"><div class="field"><label class="field-label">Pilote</label><input class="input" id="scm-own" placeholder="Ex : Nadia Cherif"></div>'
   +'<div class="field"><label class="field-label">Budget (k€)</label><input class="input" type="number" min="0" id="scm-bud" placeholder="Ex : 350"></div></div>'
   +'<div class="field"><label class="field-label">Avancement — <span id="scm-pctv">0%</span></label><input type="range" min="0" max="100" step="5" value="0" id="scm-pct" oninput="document.getElementById(\'scm-pctv\').textContent=this.value+\'%\'" style="width:100%"></div>'
   +'<div class="field"><label class="field-label">Contribution aux axes du groupe</label><div class="stg-chips" id="scm-ga"></div></div>'
   +'<div class="field"><label class="field-label">Jalons structurants</label><textarea class="textarea" id="scm-ms" rows="3" placeholder="Une ligne par jalon, au format : T2 2027 : Bascule entité pilote"></textarea></div>'
   +'</div><div class="modal-foot"><button class="btn btn-secondary" id="scm-del" style="margin-right:auto;color:var(--state-danger)" onclick="stgDelChantier()">Supprimer</button>'
   +'<button class="btn btn-secondary" onclick="stgClose(\'schantModal\')">Annuler</button>'
   +'<button class="btn btn-primary" onclick="stgSaveChantier()">Enregistrer</button></div>')
  +wrap('sblockModal','',
    head('sblockModal',ICO_T,'sbm-title','Ajouter un texte','Note ou pièce du schéma directeur')
   +'<div class="modal-body"><input type="hidden" id="sbm-kind">'
   +'<div class="field"><label class="field-label">Titre <span class="req">*</span></label><input class="input" id="sbm-t" placeholder="Ex : Principes directeurs"></div>'
   +'<div class="field"><label class="field-label" id="sbm-b-label">Contenu</label><textarea class="textarea" id="sbm-b" rows="7" placeholder="Texte libre. Pour une image, cette zone sert de légende — le visuel se dépose ensuite sur la carte."></textarea></div>'
   +'</div><div class="modal-foot"><button class="btn btn-secondary" onclick="stgClose(\'sblockModal\')">Annuler</button>'
   +'<button class="btn btn-primary" onclick="stgSaveBlock()">Enregistrer</button></div>')
  +wrap('sokrModal','',
    head('sokrModal',ICO_O,'som-title','Nouvel objectif mesurable','Résultat attendu et indicateur de suivi')
   +'<div class="modal-body">'
   +'<div class="field"><label class="field-label">Objectif <span class="req">*</span></label><input class="input" id="som-t" placeholder="Ex : Clôture mensuelle en 5 jours ouvrés"></div>'
   +'<div class="field-row"><div class="field"><label class="field-label">Responsable</label><input class="input" id="som-who" placeholder="Ex : Pierre Moreau"></div>'
   +'<div class="field"><label class="field-label">Indicateur cible</label><input class="input" id="som-kpi" placeholder="Ex : 5 jours"></div></div>'
   +'<div class="field"><label class="field-label">Valeur actuelle</label><input class="input" id="som-cur" placeholder="Ex : 9 jours"></div>'
   +'<div class="field"><label class="field-label">Avancement — <span id="som-pctv">0%</span></label><input type="range" min="0" max="100" step="5" value="0" id="som-pct" oninput="document.getElementById(\'som-pctv\').textContent=this.value+\'%\'" style="width:100%"></div>'
   +'</div><div class="modal-foot"><button class="btn btn-secondary" onclick="stgClose(\'sokrModal\')">Annuler</button>'
   +'<button class="btn btn-primary" onclick="stgSaveOkr()">Ajouter</button></div>')
  +wrap('srevModal','',
    head('srevModal',ICO_R,'srm-title','Nouvelle revue stratégique','Versionner le schéma directeur')
   +'<div class="modal-body">'
   +'<div class="field-row"><div class="field"><label class="field-label">Version <span class="req">*</span></label><input class="input" id="srm-v" placeholder="v3.2"></div>'
   +'<div class="field"><label class="field-label">Date</label><input class="input" type="date" id="srm-d"></div></div>'
   +'<div class="field-row"><div class="field"><label class="field-label">Instance</label><input class="input" id="srm-by" placeholder="CODIR"></div>'
   +'<div class="field"><label class="field-label">Issue de la revue</label><select class="nselect" id="srm-st"><option value="valide">Validé</option><option value="revue">En revue</option><option value="brouillon">Renvoyé en brouillon</option></select></div></div>'
   +'<div class="field"><label class="field-label">Décisions &amp; commentaires</label><textarea class="textarea" id="srm-n" rows="4" placeholder="Ce qui a été arbitré, ce qui reste ouvert."></textarea></div>'
   +'</div><div class="modal-foot"><button class="btn btn-secondary" onclick="stgClose(\'srevModal\')">Annuler</button>'
   +'<button class="btn btn-primary" onclick="stgSaveReview()">Enregistrer la revue</button></div>')
  +wrap('scmpModal','modal-plan',
    head('scmpModal',ICO_X,'scmp-title','Comparer deux directions','Ambition, moyens, alignement et maturité côte à côte')
   +'<div class="modal-body"><div class="field-row" style="margin-bottom:18px">'
   +'<div class="field" style="margin-bottom:0"><label class="field-label">Direction A</label><select class="nselect" id="scmp-a" onchange="stgRenderCompare()"></select></div>'
   +'<div class="field" style="margin-bottom:0"><label class="field-label">Direction B</label><select class="nselect" id="scmp-b" onchange="stgRenderCompare()"></select></div></div>'
   +'<div id="scmp-body"></div></div>'
   +'<div class="modal-foot"><button class="btn btn-secondary" onclick="stgClose(\'scmpModal\')">Fermer</button></div>');
  const host=document.createElement('div'); host.id='stg-modals'; host.innerHTML=html;
  document.body.appendChild(host);
  const dd=document.getElementById('sdm-del-dir');
  const om=window.stgOpenDirModal;
  window.stgOpenDirModal=function(id){ om(id); if(dd) dd.style.display=id?'inline-flex':'none'; };
})();
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', stgRenderDirs); else stgRenderDirs();
