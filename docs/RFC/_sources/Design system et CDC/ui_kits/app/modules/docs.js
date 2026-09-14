/* ═══ DOCUMENTS DU PROJET — recherche, filtres, tri, ajout, actions de ligne, activité ═══ */
const DOC_KINDS={
  pdf :{ext:'PDF', lbl:'PDF',   ico:'di-pdf', badge:'bdg-danger',  dot:'var(--state-danger)'},
  xlsx:{ext:'XLSX',lbl:'Excel', ico:'di-xls', badge:'bdg-success', dot:'var(--state-success)'},
  docx:{ext:'DOCX',lbl:'Word',  ico:'di-doc', badge:'bdg-info',    dot:'var(--state-info)'},
  fig :{ext:'FIG', lbl:'Figma', ico:'di-fig', badge:'',            dot:'var(--purple)', style:'background:var(--purple-bg);color:var(--purple)'}
};
let DOCS=[
  {id:1,name:'Cahier des charges v3.pdf',   k:'pdf', d:'2025-04-28T14:32', by:'MD', size:2516582},
  {id:2,name:'Planning détaillé.xlsx',      k:'xlsx',d:'2025-04-24T09:18', by:'SL', size:1153434},
  {id:3,name:'Compte-rendu COPIL.docx',     k:'docx',d:'2025-04-18T16:05', by:'JT', size:876544},
  {id:4,name:'Maquette espace client.fig',  k:'fig', d:'2025-04-16T11:47', by:'AB', size:12897484}
];
let DOC_ACTS=[
  {k:'pdf', who:'Marc D.',  verb:'a ajouté',      f:'Cahier des charges v3.pdf',  t:'Il y a 1 h'},
  {k:'xlsx',who:'Sophie L.',verb:'a mis à jour',  f:'Planning détaillé.xlsx',     t:'Il y a 4 h'},
  {k:'docx',who:'Julien T.',verb:'a ajouté',      f:'Compte-rendu COPIL.docx',    t:'Hier à 16:05'},
  {k:'fig', who:'Alice B.', verb:'a ajouté',      f:'Maquette espace client.fig', t:'16 avr. à 11:47'},
  {k:'folder',who:'Marc D.',verb:'a créé le dossier',f:'Documents projet',        t:'15 avr. à 10:12'}
];
let DOC_Q='', DOC_TYPE='', DOC_SORT='date', DOC_DIR=-1, DOC_VIEW='docs', DOC_SEQ=100, DOC_MENU=null;

function docSize(b){ return b>=1048576 ? (b/1048576).toFixed(1).replace('.',',')+' Mo' : Math.round(b/1024)+' Ko'; }
function docDate(iso){ const d=new Date(iso); const m=d.toLocaleDateString('fr-FR',{month:'short'}).replace('.',''); return d.getDate()+' '+m+'. '+d.getFullYear()+' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'); }
function docAvCls(ini){ return (typeof DIR!=='undefined'&&DIR[ini]&&DIR[ini][3])||'av-1'; }
function docWho(ini){ return typeof dirName==='function'?dirName(ini):ini; }
function docKindFromName(n){ const e=(n.split('.').pop()||'').toLowerCase(); if(e==='pdf')return'pdf'; if(e==='xls'||e==='xlsx'||e==='csv')return'xlsx'; if(e==='doc'||e==='docx')return'docx'; if(e==='fig')return'fig'; return 'pdf'; }

function docRows(){
  const q=DOC_Q.trim().toLowerCase();
  let r=DOCS.filter(d=>(!q||d.name.toLowerCase().includes(q))&&(!DOC_TYPE||d.k===DOC_TYPE));
  const cmp={name:(a,b)=>a.name.localeCompare(b.name,'fr'),date:(a,b)=>a.d<b.d?-1:a.d>b.d?1:0,size:(a,b)=>a.size-b.size}[DOC_SORT];
  return r.sort((a,b)=>cmp(a,b)*DOC_DIR);
}
function docRender(){
  const tb=document.getElementById('doc-tbody'); if(!tb) return;
  const rows=docRows();
  tb.innerHTML=rows.length?rows.map(d=>{ const K=DOC_KINDS[d.k];
    return '<tr>'
     +'<td><div class="tname"><div class="doc-ico '+K.ico+'">'+K.ext+'</div><span class="cell-strong">'+d.name+'</span></div></td>'
     +'<td><span class="badge '+(K.badge||'')+' nodot"'+(K.style?' style="'+K.style+'"':'')+'>'+K.lbl+'</span></td>'
     +'<td style="font-variant-numeric:tabular-nums;color:var(--neutral-600)">'+docDate(d.d)+'</td>'
     +'<td><div class="assignee"><div class="av '+docAvCls(d.by)+'">'+d.by+'</div><span>'+docWho(d.by)+'</span></div></td>'
     +'<td style="font-variant-numeric:tabular-nums">'+docSize(d.size)+'</td>'
     +'<td class="right"><div class="doc-act"><button class="dots-btn" onclick="docMenu(event,'+d.id+')"><svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg></button></div></td>'
     +'</tr>'; }).join('')
   :'<tr><td colspan="6"><div class="doc-empty">Aucun document ne correspond'+(DOC_Q?' à « '+DOC_Q+' »':'')+(DOC_TYPE?' pour le type '+DOC_KINDS[DOC_TYPE].lbl:'')+'.<button class="ov-btn" onclick="docReset()">Réinitialiser les filtres</button></div></td></tr>';
  const pg=document.getElementById('doc-pg');
  if(pg) pg.textContent=rows.length?('1 à '+rows.length+' sur '+DOCS.length+' document'+(DOCS.length>1?'s':'')):('0 sur '+DOCS.length+' document'+(DOCS.length>1?'s':''));
  const tl=document.getElementById('doc-type-lbl'); if(tl) tl.textContent=DOC_TYPE?DOC_KINDS[DOC_TYPE].lbl:'Type';
  const sl=document.getElementById('doc-sort-lbl'); if(sl) sl.textContent=({name:'Nom',date:'Modifié le',size:'Taille'}[DOC_SORT])+(DOC_DIR<0?' (récent)':' (croissant)').replace('(récent)',DOC_SORT==='date'?'(récent)':'(décroissant)');
  const act=document.getElementById('doc-acts');
  if(act) act.innerHTML=DOC_ACTS.map(a=>{ const K=DOC_KINDS[a.k];
    const ico=K?'<div class="act-ico '+K.ico+'">'+K.ext.slice(0,3)+'</div>':'<div class="act-ico di-folder"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" width="16" height="16"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg></div>';
    return '<div class="act-item">'+ico+'<div class="act-body"><div class="act-line1"><b>'+a.who+'</b> '+a.verb+'</div><div class="act-file">'+a.f+'</div><div class="act-time">'+a.t+'</div></div><div class="act-dot" style="background:'+(K?K.dot:'var(--brand-gold)')+'"></div></div>'; }).join('');
}
function docSearch(v){ DOC_Q=v; docRender(); }
function docReset(){ DOC_Q=''; DOC_TYPE=''; const s=document.getElementById('doc-search'); if(s) s.value=''; docRender(); }
function docSetType(k){ DOC_TYPE=k; docClosePop(); docRender(); }
function docSetSort(k){ if(DOC_SORT===k) DOC_DIR*=-1; else { DOC_SORT=k; DOC_DIR=(k==='name'?1:-1); } docClosePop(); docRender(); }
function docView(v,el){ DOC_VIEW=v; document.querySelectorAll('#doc-seg .seg-btn').forEach(b=>b.classList.toggle('active',b===el)); const g=document.getElementById('doc-grid'); if(g) g.classList.toggle('doc-actonly',v==='acts'); }

/* popovers légers (type, tri, actions de ligne) */
function docClosePop(){ document.querySelectorAll('.doc-pop').forEach(p=>p.remove()); DOC_MENU=null; }
function docPop(ev,items){
  ev.stopPropagation(); const open=DOC_MENU; docClosePop(); if(open===ev.currentTarget) return;
  DOC_MENU=ev.currentTarget;
  const p=document.createElement('div'); p.className='doc-pop';
  p.innerHTML=items.map(it=>it.sep?'<div class="doc-pop-sep"></div>':'<button class="doc-pop-i'+(it.danger?' danger':'')+(it.on?' on':'')+'" onclick="'+it.act+'">'+it.t+'</button>').join('');
  document.body.appendChild(p);
  const r=ev.currentTarget.getBoundingClientRect();
  p.style.top=(r.bottom+6)+'px';
  p.style.left=Math.min(r.left, window.innerWidth-p.offsetWidth-12)+'px';
  p.addEventListener('click',e=>e.stopPropagation());
}
function docTypePop(ev){ docPop(ev,[{t:'Tous les types',act:"docSetType('')",on:!DOC_TYPE}].concat(Object.keys(DOC_KINDS).map(k=>({t:DOC_KINDS[k].lbl,act:"docSetType('"+k+"')",on:DOC_TYPE===k})))); }
function docSortPop(ev){ docPop(ev,[{t:'Nom',act:"docSetSort('name')",on:DOC_SORT==='name'},{t:'Modifié le',act:"docSetSort('date')",on:DOC_SORT==='date'},{t:'Taille',act:"docSetSort('size')",on:DOC_SORT==='size'}]); }
function docMenu(ev,id){ docPop(ev,[
  {t:'Ouvrir',act:"docOpen("+id+")"},
  {t:'Télécharger',act:"docDownload("+id+")"},
  {t:'Renommer',act:"docRename("+id+")"},
  {sep:true},
  {t:'Supprimer',act:"docDelete("+id+")",danger:true}
]); }
document.addEventListener('click',docClosePop);

function docById(id){ return DOCS.find(d=>d.id===id); }
function docOpen(id){ const d=docById(id); docClosePop(); showToast('Ouverture de '+d.name); }
function docDownload(id){ const d=docById(id); docClosePop(); showToast(d.name+' · téléchargement lancé ('+docSize(d.size)+')'); }
function docRename(id){ const d=docById(id); docClosePop(); const n=prompt('Nouveau nom du document', d.name); if(!n||!n.trim()||n===d.name) return;
  const old=d.name; d.name=n.trim(); d.k=docKindFromName(d.name); d.d=new Date().toISOString().slice(0,16);
  DOC_ACTS.unshift({k:d.k,who:docWho('MD'),verb:'a renommé',f:old+' → '+d.name,t:'À l\'instant'});
  docRender(); showToast('Document renommé · '+d.name); }
function docDelete(id){ const d=docById(id); docClosePop(); if(!confirm('Supprimer « '+d.name+' » ? Cette action retire le document du projet.')) return;
  DOCS=DOCS.filter(x=>x.id!==id);
  DOC_ACTS.unshift({k:d.k,who:docWho('MD'),verb:'a supprimé',f:d.name,t:'À l\'instant'});
  docRender(); showToast('« '+d.name+' » supprimé'); }

/* ajout d'un document */
function docAddOpen(){
  const m=document.getElementById('docModal'); if(!m) return;
  document.getElementById('dm-name').value='';
  document.getElementById('dm-by').innerHTML=['MD','SL','JT','AB','PD','CM'].map(k=>'<option value="'+k+'">'+docWho(k)+'</option>').join('');
  document.getElementById('dm-size').value='1,2';
  m.classList.add('open');
  setTimeout(()=>document.getElementById('dm-name').focus(),60);
}
function docAddClose(){ document.getElementById('docModal').classList.remove('open'); }
function docAddSubmit(){
  const nEl=document.getElementById('dm-name'); let name=(nEl.value||'').trim();
  if(!name){ nEl.focus(); showToast('Donnez un nom au document'); return; }
  const k=document.getElementById('dm-kind').value;
  const ext={pdf:'pdf',xlsx:'xlsx',docx:'docx',fig:'fig'}[k];
  if(!name.toLowerCase().endsWith('.'+ext)) name+='.'+ext;
  const by=document.getElementById('dm-by').value;
  const mo=parseFloat((document.getElementById('dm-size').value||'1').replace(',','.'))||1;
  DOCS.unshift({id:++DOC_SEQ,name:name,k:k,d:new Date().toISOString().slice(0,16),by:by,size:Math.round(mo*1048576)});
  DOC_ACTS.unshift({k:k,who:docWho(by),verb:'a ajouté',f:name,t:'À l\'instant'});
  docAddClose(); docRender(); showToast(name+' ajouté au projet');
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',docRender); else docRender();
