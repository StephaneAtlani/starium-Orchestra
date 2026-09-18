/* Procédures — liste, éditeur de blocs (H1/H2/…, gras/italique/souligné, image/vidéo), éditeur de schéma.
   Préfixes : pr* (procédures/éditeur), dg* (schéma). Dépend de showToast(). */

const PR_STATUS={draft:['Brouillon','bdg-neutral'],review:['En revue','bdg-warn'],pub:['Publiée','bdg-success']};
const PR_ICO={
  h1:'<i>H1</i>',h2:'<i>H2</i>',h3:'<i>H3</i>',p:'<i>¶</i>',ul:'<i>•</i>',ol:'<i>1.</i>',
  step:'<i><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><polyline points="9 12 11.5 14.5 15.5 10"/></svg></i>',
  callout:'<i><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></i>',
  img:'<i><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></i>',
  video:'<i><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="5" width="15" height="14" rx="2"/><polygon points="17 10 22 7 22 17 17 14"/></svg></i>',
  diag:'<i><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="7" height="6" rx="1"/><rect x="14" y="15" width="7" height="6" rx="1"/><path d="M10 6h5v9"/></svg></i>'
};
const PR_LABELS={h1:'Titre 1',h2:'Titre 2',h3:'Titre 3',p:'Paragraphe',ul:'Liste à puces',ol:'Liste numérotée',step:'Étape',callout:'Encadré',img:'Image',video:'Vidéo',diag:'Schéma'};

const PR_DIAG_DEMO={
  nodes:[
    {id:'n1',k:'start',x:60,y:150,label:'Demande reçue'},
    {id:'n2',k:'step',x:230,y:150,label:'Qualification PMO'},
    {id:'n3',k:'dec',x:430,y:150,label:'Budget > 50 k€ ?'},
    {id:'n4',k:'step',x:630,y:70,label:'Passage COPIL'},
    {id:'n5',k:'step',x:630,y:230,label:'Validation N+1'},
    {id:'n6',k:'end',x:830,y:150,label:'Projet créé'}
  ],
  edges:[{from:'n1',to:'n2'},{from:'n2',to:'n3'},{from:'n3',to:'n4',label:'Oui'},{from:'n3',to:'n5',label:'Non'},{from:'n4',to:'n6'},{from:'n5',to:'n6'}]
};

const PROCS=[
  {id:'p1',title:'Instruction d\'une demande de projet',cat:'Pilotage',ver:'2.1',st:'pub',owner:'MB',upd:'12 sept. 2026',sum:'Du dépôt de la demande à la création du projet : qualification PMO, passage en instance, décision.',
   blocks:[
    {t:'h1',html:'Objet et périmètre'},
    {t:'p',html:'Cette procédure décrit le <b>circuit d\'instruction</b> d\'une demande de projet, depuis son dépôt dans le portail jusqu\'à la <u>décision de l\'instance</u> compétente. Elle s\'applique à toutes les entités du groupe.'},
    {t:'callout',kind:'warn',html:'Les demandes de catégorie <b>Réglementaire</b> suivent un circuit accéléré : elles ne passent pas en comité et sont validées directement par le N+1.'},
    {t:'h1',html:'Déroulé'},
    {t:'h2',html:'1. Dépôt de la demande'},
    {t:'step',html:'Le demandeur renseigne les 4 sections du formulaire : <i>Votre demande</i>, <i>Pourquoi maintenant ?</i>, <i>Première estimation</i>, <i>Gouvernance</i>.'},
    {t:'step',html:'La demande peut rester en <b>brouillon</b> ; seuls les champs obligatoires sont contrôlés à la soumission.'},
    {t:'step',html:'À la soumission, le N+1 du demandeur reçoit une notification de validation.'},
    {t:'h2',html:'2. Qualification PMO'},
    {t:'p',html:'Le PMO vérifie la complétude, rattache la demande à un axe stratégique et estime la charge. Il propose l\'instance de décision selon les seuils budgétaires définis dans les Cycles de pilotage.'},
    {t:'diag',title:'Circuit de décision',nodes:JSON.parse(JSON.stringify(PR_DIAG_DEMO.nodes)),edges:JSON.parse(JSON.stringify(PR_DIAG_DEMO.edges)),cap:'Schéma 1 — Circuit de décision d\'une demande'},
    {t:'h2',html:'3. Décision'},
    {t:'ul',html:'<li><b>Acceptée</b> : le projet est créé automatiquement dans le portefeuille avec l\'équipe COPROJ.</li><li><b>Ajournée</b> : la demande revient au demandeur avec les remarques du comité.</li><li><b>Refusée</b> : la demande est archivée, motif obligatoire.</li>'},
    {t:'img',src:'',cap:'Capture — écran de décision en séance'},
    {t:'h1',html:'Rôles et responsabilités'},
    {t:'ol',html:'<li><b>Demandeur</b> — rédige et soumet.</li><li><b>N+1</b> — valide l\'opportunité.</li><li><b>PMO</b> — qualifie et instruit.</li><li><b>Instance</b> — décide.</li>'}
   ]},
  {id:'p2',title:'Revue de conformité trimestrielle',cat:'Conformité',ver:'1.0',st:'review',owner:'CL',upd:'3 sept. 2026',sum:'Campagne de réévaluation des exigences par domaine, consolidation des écarts et plan de remédiation.',
   blocks:[{t:'h1',html:'Objet'},{t:'p',html:'Organiser la revue trimestrielle des référentiels actifs.'},{t:'h2',html:'Préparation'},{t:'step',html:'Sélectionner les domaines à revoir dans <b>Conformité › Lancer une revue</b>.'},{t:'step',html:'Notifier les responsables d\'exigence.'},{t:'video',src:'Tutoriel — Lancer une revue (3 min)',cap:''}]},
  {id:'p3',title:'Réaffectation budgétaire entre lignes',cat:'Finance',ver:'3.4',st:'pub',owner:'AB',upd:'28 août 2026',sum:'Demande, validation et journalisation d\'un transfert entre lignes budgétaires d\'un même budget.',blocks:[{t:'h1',html:'Objet'},{t:'p',html:'Encadrer les transferts de crédits entre lignes.'}]},
  {id:'p4',title:'Onboarding d\'un chef de projet',cat:'Organisation',ver:'0.3',st:'draft',owner:'MB',upd:'hier',sum:'Accès, équipes, rituels et premiers livrables attendus le premier mois.',blocks:[{t:'h1',html:'Semaine 1'},{t:'ul',html:'<li>Accès au portail</li><li>Présentation des cycles</li>'}]}
];
let PR_FILTER='all', PR_CUR=null, PR_SEL=null, PR_DRAG=null, PR_INSERT_AT=null;

/* ── Liste ── */
function prRenderList(){
  const el=document.getElementById('pr-list'); if(!el) return;
  const list=PROCS.filter(p=>PR_FILTER==='all'||p.st===PR_FILTER);
  el.innerHTML=list.map(p=>`<div class="card pr-card" onclick="prOpen('${p.id}')">
    <div class="pr-card-top"><div><div class="pr-cat">${p.cat}</div><h3>${p.title}</h3></div><span class="badge ${PR_STATUS[p.st][1]}">${PR_STATUS[p.st][0]}</span></div>
    <p>${p.sum}</p>
    <div class="pr-card-foot"><span class="pr-av">${p.owner}</span><span>v${p.ver}</span><span class="sp"></span><span>${p.blocks.length} blocs · ${p.upd}</span></div>
  </div>`).join('')+`<div class="card pr-card pr-new" onclick="prNew()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg><b>Nouvelle procédure</b><span style="font-size:12px">Page vierge ou à partir d'un modèle</span></div>`;
  document.querySelectorAll('#pr-filter button').forEach(b=>b.classList.toggle('on',b.dataset.f===PR_FILTER));
}
function prFilter(f){PR_FILTER=f;prRenderList();}
function prNew(){
  const p={id:'p'+Date.now(),title:'',cat:'Pilotage',ver:'0.1',st:'draft',owner:'AB',upd:'à l\'instant',sum:'',blocks:[{t:'h1',html:''},{t:'p',html:''}]};
  PROCS.unshift(p); prOpen(p.id);
}
function prOpen(id){
  PR_CUR=PROCS.find(p=>p.id===id); PR_SEL=null;
  document.getElementById('pr-home').style.display='none';
  document.getElementById('pr-editor').style.display='block';
  document.getElementById('pr-title').innerHTML=PR_CUR.title;
  document.getElementById('pr-ed-status').innerHTML=`<span class="badge ${PR_STATUS[PR_CUR.st][1]}">${PR_STATUS[PR_CUR.st][0]}</span>`;
  document.getElementById('pr-meta-cat').value=PR_CUR.cat;
  document.getElementById('pr-meta-ver').textContent='v'+PR_CUR.ver;
  document.getElementById('pr-meta-owner').innerHTML=`<span class="pr-av">${PR_CUR.owner}</span> ${({AB:'Alice Bernard',MB:'Marc Blanchet',CL:'Claire Lopez'})[PR_CUR.owner]||''}`;
  prRender();
  document.querySelector('.page-content').scrollTop=0;
}
function prBack(){
  prSyncTitle();
  document.getElementById('pr-editor').style.display='none';
  document.getElementById('pr-home').style.display='block';
  prRenderList();
}
function prSyncTitle(){ if(PR_CUR) PR_CUR.title=document.getElementById('pr-title').textContent.trim(); }

/* ── Rendu des blocs ── */
function prRender(){
  const wrap=document.getElementById('pr-blocks');
  let step=0;
  wrap.innerHTML=PR_CUR.blocks.map((b,i)=>{
    if(b.t==='step') step++; else if(['h1','h2','h3'].includes(b.t)) step=0;
    return prBlockHTML(b,i,step);
  }).join('')+`<div class="pr-add" onclick="prOpenMenu(event,${PR_CUR.blocks.length})"><span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span>Ajouter un bloc<hr></div>`;
  prOutline();
  document.querySelectorAll('.pr-blk').forEach(prBindDrag);
}
const PR_CTL=(i)=>`<div class="pr-ctl">
  <button title="Ajouter un bloc" onclick="prOpenMenu(event,${i})"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button>
  <button class="hd" title="Déplacer (glisser)" draggable="true"><svg viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.7"/><circle cx="15" cy="6" r="1.7"/><circle cx="9" cy="12" r="1.7"/><circle cx="15" cy="12" r="1.7"/><circle cx="9" cy="18" r="1.7"/><circle cx="15" cy="18" r="1.7"/></svg></button>
</div>`;
function prBlockHTML(b,i,step){
  const ed=(cls,ph,tag='div')=>`<${tag} class="pr-body ${cls}" contenteditable="true" data-ph="${ph}" oninput="prInput(${i},this)" onfocus="prSelect(${i})" onkeydown="prKey(event,${i})">${b.html||''}</${tag}>`;
  let inner='';
  switch(b.t){
    case 'h1': inner=ed('h1','Titre 1'); break;
    case 'h2': inner=ed('h2','Titre 2'); break;
    case 'h3': inner=ed('h3','Titre 3'); break;
    case 'p': inner=ed('p','Rédigez un paragraphe… Sélectionnez du texte pour le mettre en forme.'); break;
    case 'ul': inner=ed('ul','Élément de liste','ul'); break;
    case 'ol': inner=ed('ol','Élément de liste','ol'); break;
    case 'step': inner=`<div class="pr-step"><div class="pr-step-n">${step}</div>${ed('','Décrivez cette étape…')}</div>`; break;
    case 'callout': inner=`<div class="pr-callout ${b.kind||'warn'}" onclick="prSelect(${i})"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>${ed('','Point d\'attention…')}</div>`; break;
    case 'img': inner=`<div class="pr-media" onclick="prSelect(${i})">${b.src?`<div class="pr-media-box filled"><img src="${b.src}" alt=""></div>`:`<div class="pr-media-box" onclick="prPickImage(${i})"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><b>Déposer une image</b><span>ou cliquer pour parcourir · PNG, JPG, SVG · 10 Mo max</span></div>`}<div class="pr-cap" contenteditable="true" oninput="prCap(${i},this)">${b.cap||''}</div></div>`; break;
    case 'video': inner=`<div class="pr-media" onclick="prSelect(${i})">${b.src?`<div class="pr-video"><div class="play"><svg viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20"/></svg></div><span class="src">${b.src}</span></div>`:`<div class="pr-media-box" onclick="prPickVideo(${i})"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><rect x="2" y="5" width="15" height="14" rx="2"/><polygon points="17 10 22 7 22 17 17 14"/></svg><b>Ajouter une vidéo</b><span>Coller un lien (Stream, YouTube, Vimeo) ou importer un fichier MP4</span></div>`}<div class="pr-cap" contenteditable="true" oninput="prCap(${i},this)">${b.cap||''}</div></div>`; break;
    case 'diag': inner=`<div class="pr-media" onclick="prSelect(${i})"><div class="pr-diag">${b.nodes&&b.nodes.length?dgSVG(b,true):`<div class="pr-diag-empty"><b>Schéma vide</b><button class="btn btn-secondary" onclick="dgOpen(${i})">Ouvrir l'éditeur de schéma</button></div>`}<div class="pr-diag-edit"><button class="btn btn-secondary" onclick="dgOpen(${i})"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>Modifier le schéma</button></div></div><div class="pr-cap" contenteditable="true" oninput="prCap(${i},this)">${b.cap||''}</div></div>`; break;
  }
  return `<div class="pr-blk ${PR_SEL===i?'sel':''}" data-i="${i}">${PR_CTL(i)}${inner}</div>`;
}
function prInput(i,el){PR_CUR.blocks[i].html=el.innerHTML; if(/^h[123]$/.test(PR_CUR.blocks[i].t)) prOutline(); prSavedPulse();}
function prCap(i,el){PR_CUR.blocks[i].cap=el.textContent;}
function prSelect(i){PR_SEL=i;document.querySelectorAll('.pr-blk').forEach(b=>b.classList.toggle('sel',+b.dataset.i===i));prProps(i);}
function prKey(e,i){
  const b=PR_CUR.blocks[i];
  if(e.key==='Enter'&&!e.shiftKey&&!['ul','ol'].includes(b.t)){e.preventDefault();prInsert(i+1,['h1','h2','h3'].includes(b.t)?'p':b.t);}
  if(e.key==='Backspace'&&e.target.textContent===''&&PR_CUR.blocks.length>1){e.preventDefault();prDelete(i);prFocus(Math.max(0,i-1),true);}
  if((e.metaKey||e.ctrlKey)&&e.key==='b'){e.preventDefault();prFmt('bold');}
  if((e.metaKey||e.ctrlKey)&&e.key==='i'){e.preventDefault();prFmt('italic');}
  if((e.metaKey||e.ctrlKey)&&e.key==='u'){e.preventDefault();prFmt('underline');}
}
function prFocus(i,end){
  const el=document.querySelector(`.pr-blk[data-i="${i}"] .pr-body`); if(!el) return; el.focus();
  if(end){const r=document.createRange();r.selectNodeContents(el);r.collapse(false);const s=getSelection();s.removeAllRanges();s.addRange(r);}
}
function prInsert(at,t){
  const b={t,html:''}; if(t==='ul'||t==='ol') b.html='<li></li>'; if(t==='diag'){b.nodes=[];b.edges=[];b.title='Nouveau schéma';}
  PR_CUR.blocks.splice(at,0,b); PR_SEL=at; prRender(); prCloseMenu();
  if(t==='diag') dgOpen(at); else prFocus(at);
  prSavedPulse();
}
function prDelete(i){PR_CUR.blocks.splice(i,1);PR_SEL=null;prRender();prSavedPulse();}
function prChangeType(i,t){const b=PR_CUR.blocks[i];b.t=t;if((t==='ul'||t==='ol')&&!/<li/.test(b.html||''))b.html='<li>'+(b.html||'')+'</li>';prRender();prSelect(i);}
function prDup(i){PR_CUR.blocks.splice(i+1,0,JSON.parse(JSON.stringify(PR_CUR.blocks[i])));prRender();}
function prMove(i,d){const j=i+d;if(j<0||j>=PR_CUR.blocks.length)return;const a=PR_CUR.blocks;[a[i],a[j]]=[a[j],a[i]];PR_SEL=j;prRender();}

/* ── Plan (outline) & propriétés ── */
function prOutline(){
  const el=document.getElementById('pr-outline'); if(!el) return;
  const hs=PR_CUR.blocks.map((b,i)=>({b,i})).filter(x=>/^h[123]$/.test(x.b.t));
  el.innerHTML=hs.length?hs.map(x=>`<a class="l${x.b.t[1]}" onclick="prFocus(${x.i})">${x.b.html.replace(/<[^>]+>/g,'')||'<i style="color:var(--neutral-300)">Sans titre</i>'}</a>`).join(''):'<div class="dg-empty">Ajoutez des titres pour construire le plan.</div>';
}
function prProps(i){
  const el=document.getElementById('pr-props'); const b=PR_CUR.blocks[i];
  if(!b){el.innerHTML='<div class="dg-empty">Sélectionnez un bloc pour voir ses options.</div>';return;}
  const textual=['h1','h2','h3','p','ul','ol','step','callout'];
  el.innerHTML=`<div class="pr-meta">
    <div><label>Type de bloc</label>${textual.includes(b.t)?`<select onchange="prChangeType(${i},this.value)">${textual.map(t=>`<option value="${t}" ${t===b.t?'selected':''}>${PR_LABELS[t]}</option>`).join('')}</select>`:`<div class="v">${PR_LABELS[b.t]}</div>`}</div>
    ${b.t==='callout'?`<div><label>Ton</label><select onchange="PR_CUR.blocks[${i}].kind=this.value;prRender();prSelect(${i})"><option value="warn" ${b.kind!=='info'?'selected':''}>Attention (ambre)</option><option value="info" ${b.kind==='info'?'selected':''}>Information (bleu)</option></select></div>`:''}
    ${b.t==='img'||b.t==='video'?`<div><label>Source</label><input value="${b.src||''}" placeholder="URL ou fichier…" onchange="PR_CUR.blocks[${i}].src=this.value;prRender()"></div>`:''}
    ${b.t==='diag'?`<div><label>Titre du schéma</label><input value="${b.title||''}" onchange="PR_CUR.blocks[${i}].title=this.value"></div><div><div class="v" style="font-weight:600;color:var(--neutral-500);font-size:12.5px">${(b.nodes||[]).length} formes · ${(b.edges||[]).length} liens</div></div>`:''}
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px">
      <button class="btn btn-secondary" style="padding:6px 10px;font-size:12px" onclick="prMove(${i},-1)">↑ Monter</button>
      <button class="btn btn-secondary" style="padding:6px 10px;font-size:12px" onclick="prMove(${i},1)">↓ Descendre</button>
      <button class="btn btn-secondary" style="padding:6px 10px;font-size:12px" onclick="prDup(${i})">Dupliquer</button>
      <button class="btn btn-secondary" style="padding:6px 10px;font-size:12px;color:var(--state-danger)" onclick="prDelete(${i})">Supprimer</button>
    </div></div>`;
}
let PR_SAVE_T;
function prSavedPulse(){const el=document.getElementById('pr-saved');if(!el)return;el.innerHTML='<i style="background:var(--brand-gold)"></i>Enregistrement…';clearTimeout(PR_SAVE_T);PR_SAVE_T=setTimeout(()=>el.innerHTML='<i></i>Enregistré à l\'instant',900);}
function prPublish(){prSyncTitle();PR_CUR.st=PR_CUR.st==='pub'?'pub':(PR_CUR.st==='review'?'pub':'review');const [l,c]=PR_STATUS[PR_CUR.st];document.getElementById('pr-ed-status').innerHTML=`<span class="badge ${c}">${l}</span>`;showToast(PR_CUR.st==='pub'?'Procédure publiée — version '+PR_CUR.ver:'Procédure envoyée en revue');}
function prPickImage(i){PR_CUR.blocks[i].src='assets/product-mock-vision-strategique.png';prRender();showToast('Image importée');}
function prPickVideo(i){PR_CUR.blocks[i].src='stream.starium.io/onboarding-demande.mp4 · 4:12';prRender();showToast('Vidéo ajoutée');}

/* ── Menu d'insertion ── */
function prOpenMenu(e,at){
  e.stopPropagation(); PR_INSERT_AT=at;
  const m=document.getElementById('pr-menu'); m.classList.add('open');
  const r=e.currentTarget.getBoundingClientRect();
  let top=r.bottom+6, left=r.left; const H=m.offsetHeight||360;
  if(top+H>innerHeight-12) top=Math.max(12,r.top-H-6);
  m.style.top=top+'px'; m.style.left=Math.min(left,innerWidth-312)+'px';
}
function prCloseMenu(){document.getElementById('pr-menu').classList.remove('open');}
function prMenuPick(t){prInsert(PR_INSERT_AT,t);}
document.addEventListener('click',e=>{if(!e.target.closest('#pr-menu'))prCloseMenu();});

/* ── Formatage inline ── */
function prFmt(cmd,val){document.execCommand(cmd,false,val||null);prFmtState();const s=getSelection();if(s.anchorNode){const body=s.anchorNode.parentElement.closest('.pr-body');if(body){const blk=body.closest('.pr-blk');prInput(+blk.dataset.i,body);}}}
function prLink(){const u=prompt('Adresse du lien');if(u)prFmt('createLink',u);}
function prFmtState(){['bold','italic','underline','strikeThrough'].forEach(c=>{const b=document.querySelector(`#pr-fmt [data-c="${c}"]`);if(b)b.classList.toggle('on',document.queryCommandState(c));});}
document.addEventListener('selectionchange',()=>{
  const bar=document.getElementById('pr-fmt'); if(!bar) return;
  const s=getSelection();
  if(!s.rangeCount||s.isCollapsed||!s.anchorNode||!(s.anchorNode.parentElement||s.anchorNode).closest?.('.pr-body')){bar.classList.remove('open');return;}
  const r=s.getRangeAt(0).getBoundingClientRect(); if(!r.width){bar.classList.remove('open');return;}
  bar.style.left=(r.left+r.width/2)+'px'; bar.style.top=r.top+'px'; bar.classList.add('open'); prFmtState();
});

/* ── Glisser-déposer des blocs ── */
function prBindDrag(blk){
  const hd=blk.querySelector('.hd'); if(!hd) return;
  hd.addEventListener('dragstart',e=>{PR_DRAG=+blk.dataset.i;blk.classList.add('drag');e.dataTransfer.effectAllowed='move';e.dataTransfer.setDragImage(blk,20,20);});
  hd.addEventListener('dragend',()=>{PR_DRAG=null;document.querySelectorAll('.pr-blk').forEach(b=>b.classList.remove('drag','over-top','over-bot'));});
  blk.addEventListener('dragover',e=>{if(PR_DRAG===null)return;e.preventDefault();const r=blk.getBoundingClientRect();const top=e.clientY<r.top+r.height/2;document.querySelectorAll('.pr-blk').forEach(b=>b.classList.remove('over-top','over-bot'));blk.classList.add(top?'over-top':'over-bot');});
  blk.addEventListener('drop',e=>{
    e.preventDefault(); if(PR_DRAG===null) return;
    const to=+blk.dataset.i; const r=blk.getBoundingClientRect(); const top=e.clientY<r.top+r.height/2;
    let dest=top?to:to+1; const [b]=PR_CUR.blocks.splice(PR_DRAG,1); if(PR_DRAG<dest) dest--; PR_CUR.blocks.splice(dest,0,b);
    PR_DRAG=null; PR_SEL=dest; prRender(); prSavedPulse();
  });
}

/* ══════════ ÉDITEUR DE SCHÉMA ══════════ */
const DG_KINDS={start:{w:120,h:44,l:'Début'},step:{w:150,h:56,l:'Étape'},dec:{w:150,h:80,l:'Décision'},doc:{w:140,h:56,l:'Document'},actor:{w:130,h:50,l:'Acteur / rôle'},end:{w:120,h:44,l:'Fin'}};
let DG={blk:null,nodes:[],edges:[],tool:'select',sel:null,selEdge:null,from:null,drag:null,hov:null};
function dgOpen(i){
  const b=PR_CUR.blocks[i];
  DG={blk:i,nodes:JSON.parse(JSON.stringify(b.nodes||[])),edges:JSON.parse(JSON.stringify(b.edges||[])),tool:'select',sel:null,selEdge:null,from:null,drag:null,hov:null};
  document.getElementById('dg-title').value=b.title||'Schéma';
  document.getElementById('dg-wrap').classList.add('open');
  dgTool('select'); dgRender();
}
function dgClose(){document.getElementById('dg-wrap').classList.remove('open');}
function dgSave(){
  const b=PR_CUR.blocks[DG.blk]; b.nodes=DG.nodes; b.edges=DG.edges; b.title=document.getElementById('dg-title').value;
  dgClose(); prRender(); prSelect(DG.blk); showToast('Schéma inséré dans la procédure'); prSavedPulse();
}
function dgTool(t){DG.tool=t;DG.from=null;document.querySelectorAll('#dg-tools button').forEach(b=>b.classList.toggle('on',b.dataset.t===t));document.getElementById('dg-canvas').classList.toggle('connect',t==='connect');document.getElementById('dg-hint').textContent=t==='connect'?'Cliquez une forme de départ, puis une forme d\'arrivée':'Glissez les formes · double-clic pour renommer · Suppr pour effacer';dgRender();}
function dgAdd(k){
  const c=document.getElementById('dg-canvas').getBoundingClientRect();
  const n={id:'n'+Date.now(),k,x:Math.round((c.width/2-DG_KINDS[k].w/2+(DG.nodes.length%5)*24)/20)*20,y:Math.round((c.height/2-DG_KINDS[k].h/2+(DG.nodes.length%5)*20)/20)*20,label:DG_KINDS[k].l};
  DG.nodes.push(n); DG.sel=n.id; DG.selEdge=null; dgRender(); setTimeout(()=>document.getElementById('dg-lbl')?.select(),0);
}
function dgDemo(){DG.nodes=JSON.parse(JSON.stringify(PR_DIAG_DEMO.nodes));DG.edges=JSON.parse(JSON.stringify(PR_DIAG_DEMO.edges));DG.sel=null;dgRender();}
function dgDel(){
  if(DG.sel){DG.nodes=DG.nodes.filter(n=>n.id!==DG.sel);DG.edges=DG.edges.filter(e=>e.from!==DG.sel&&e.to!==DG.sel);DG.sel=null;}
  else if(DG.selEdge!==null){DG.edges.splice(DG.selEdge,1);DG.selEdge=null;}
  dgRender();
}
function dgShape(n,k){
  const d=DG_KINDS[k]; const x=n.x,y=n.y,w=d.w,h=d.h;
  if(k==='start'||k==='end') return `<rect class="shape" x="${x}" y="${y}" width="${w}" height="${h}" rx="${h/2}"/>`;
  if(k==='dec') return `<polygon class="shape" points="${x+w/2},${y} ${x+w},${y+h/2} ${x+w/2},${y+h} ${x},${y+h/2}"/>`;
  if(k==='doc') return `<path class="shape" d="M${x} ${y}h${w}v${h-10}q-${w/4} -10 -${w/2} 0t-${w/2} 0z"/>`;
  if(k==='actor') return `<rect class="shape" x="${x}" y="${y}" width="${w}" height="${h}" rx="6"/><circle cx="${x+18}" cy="${y+h/2-4}" r="5" fill="none" stroke="#1F4E8C" stroke-width="1.5"/><path d="M${x+10} ${y+h/2+12}a8 8 0 0 1 16 0" fill="none" stroke="#1F4E8C" stroke-width="1.5"/>`;
  return `<rect class="shape" x="${x}" y="${y}" width="${w}" height="${h}" rx="8"/>`;
}
function dgCenter(n){const d=DG_KINDS[n.k];return {x:n.x+d.w/2,y:n.y+d.h/2,w:d.w,h:d.h};}
function dgAnchor(a,b){ // point sur le bord de a en direction de b
  const dx=b.x-a.x,dy=b.y-a.y; if(!dx&&!dy) return a;
  const sx=(a.w/2)/Math.abs(dx||1e-6), sy=(a.h/2)/Math.abs(dy||1e-6); const s=Math.min(sx,sy);
  return {x:a.x+dx*s,y:a.y+dy*s};
}
function dgEdgePath(e){
  const A=DG_N(e.from),B=DG_N(e.to); if(!A||!B) return null;
  const a=dgCenter(A),b=dgCenter(B); const p=dgAnchor(a,b),q=dgAnchor(b,a);
  const horiz=Math.abs(b.x-a.x)>Math.abs(b.y-a.y);
  const d=horiz?`M${p.x} ${p.y} C${(p.x+q.x)/2} ${p.y}, ${(p.x+q.x)/2} ${q.y}, ${q.x} ${q.y}`:`M${p.x} ${p.y} C${p.x} ${(p.y+q.y)/2}, ${q.x} ${(p.y+q.y)/2}, ${q.x} ${q.y}`;
  return {d,mx:(p.x+q.x)/2,my:(p.y+q.y)/2};
}
let DG_N=(id)=>DG.nodes.find(n=>n.id===id);
function dgSVG(model,preview){
  const nodes=model.nodes,edges=model.edges; const saved=DG_N; DG_N=(id)=>nodes.find(n=>n.id===id);
  let maxX=0,maxY=0; nodes.forEach(n=>{const d=DG_KINDS[n.k];maxX=Math.max(maxX,n.x+d.w);maxY=Math.max(maxY,n.y+d.h);});
  const defs=`<defs><marker id="dg-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--neutral-600)"/></marker><marker id="dg-arr-sel" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--brand-gold)"/></marker></defs>`;
  const E=edges.map((e,i)=>{const p=dgEdgePath(e);if(!p)return'';const sel=!preview&&DG.selEdge===i;return `<g><path class="dg-edge ${sel?'sel':''}" d="${p.d}" marker-end="url(#${sel?'dg-arr-sel':'dg-arr'})"/>${preview?'':`<path class="dg-edge-hit" d="${p.d}" onclick="dgSelEdge(${i},event)"/>`}${e.label?`<text class="dg-edge-lbl" x="${p.mx}" y="${p.my-8}">${e.label}</text>`:''}</g>`;}).join('');
  const N=nodes.map(n=>{const c=dgCenter(n);const lines=dgWrap(n.label,c.w-24);const y0=c.y-(lines.length-1)*7.5;return `<g class="dg-node ${n.k} ${!preview&&DG.sel===n.id?'sel':''} ${!preview&&DG.hov===n.id?'hov':''}" data-id="${n.id}" ${preview?'':`onmousedown="dgDown(event,'${n.id}')" ondblclick="dgRename('${n.id}')" onmouseenter="dgHov('${n.id}',true)" onmouseleave="dgHov('${n.id}',false)"`}>${dgShape(n,n.k)}<text x="${c.x+(n.k==='actor'?12:0)}" y="${y0}">${lines.map((l,i)=>`<tspan x="${c.x+(n.k==='actor'?12:0)}" dy="${i?15:0}">${l}</tspan>`).join('')}</text></g>`;}).join('');
  DG_N=saved;
  return preview?`<svg viewBox="0 0 ${Math.max(maxX+60,400)} ${Math.max(maxY+60,200)}">${defs}${E}${N}</svg>`:`${defs}${E}${N}`;
}
function dgWrap(t,w){const words=(t||'').split(' ');const out=[];let cur='';const max=Math.max(8,Math.floor(w/7));words.forEach(x=>{if((cur+' '+x).trim().length>max&&cur){out.push(cur);cur=x;}else cur=(cur+' '+x).trim();});if(cur)out.push(cur);return out.length?out:[''];}
function dgRender(){
  const svg=document.getElementById('dg-svg'); if(!svg) return;
  let mx=0,my=0; DG.nodes.forEach(n=>{const d=DG_KINDS[n.k];mx=Math.max(mx,n.x+d.w);my=Math.max(my,n.y+d.h);});
  const c=document.getElementById('dg-canvas'); svg.style.width=Math.max(c.clientWidth,mx+120)+'px'; svg.style.height=Math.max(c.clientHeight,my+120)+'px';
  svg.innerHTML=dgSVG(DG,false); dgProps();
}
function dgHov(id,on){if(DG.tool==='connect'||DG.drag){DG.hov=on?id:null;dgRender();}}
function dgDown(e,id){
  e.stopPropagation();
  if(DG.tool==='connect'){
    if(!DG.from){DG.from=id;DG.sel=id;DG.selEdge=null;dgRender();document.getElementById('dg-hint').textContent='Cliquez la forme d\'arrivée';}
    else if(DG.from!==id){if(!DG.edges.some(x=>x.from===DG.from&&x.to===id))DG.edges.push({from:DG.from,to:id});DG.selEdge=DG.edges.length-1;DG.sel=null;DG.from=null;dgRender();document.getElementById('dg-hint').textContent='Lien créé — cliquez une nouvelle forme de départ';}
    return;
  }
  const n=DG_N(id); DG.sel=id; DG.selEdge=null;
  const c=document.getElementById('dg-svg').getBoundingClientRect();
  DG.drag={id,ox:e.clientX-c.left-n.x,oy:e.clientY-c.top-n.y,moved:false}; dgRender();
}
function dgMove(e){
  if(!DG.drag) return; const n=DG_N(DG.drag.id); const c=document.getElementById('dg-svg').getBoundingClientRect();
  n.x=Math.max(0,Math.round((e.clientX-c.left-DG.drag.ox)/10)*10); n.y=Math.max(0,Math.round((e.clientY-c.top-DG.drag.oy)/10)*10); DG.drag.moved=true; dgRender();
}
function dgUp(){DG.drag=null;}
function dgBg(){if(DG.tool==='connect'&&DG.from){DG.from=null;dgTool('connect');return;}DG.sel=null;DG.selEdge=null;dgRender();}
function dgSelEdge(i,e){e.stopPropagation();DG.selEdge=i;DG.sel=null;dgRender();}
function dgRename(id){DG.sel=id;dgRender();document.getElementById('dg-lbl')?.select();}
function dgProps(){
  const el=document.getElementById('dg-props-body'); if(!el) return;
  if(DG.sel){const n=DG_N(DG.sel);el.innerHTML=`<div class="field"><label class="field-label">Libellé</label><input id="dg-lbl" value="${n.label.replace(/"/g,'&quot;')}" oninput="DG_N('${n.id}').label=this.value;document.getElementById('dg-svg').innerHTML=dgSVG(DG,false)"></div>
    <div class="field"><label class="field-label">Type</label><select onchange="DG_N('${n.id}').k=this.value;dgRender()">${Object.keys(DG_KINDS).map(k=>`<option value="${k}" ${k===n.k?'selected':''}>${DG_KINDS[k].l}</option>`).join('')}</select></div>
    <div class="field"><label class="field-label">Description (info-bulle)</label><textarea placeholder="Précision affichée au survol dans la procédure publiée…">${n.desc||''}</textarea></div>
    <button class="btn btn-secondary" style="color:var(--state-danger);width:100%;justify-content:center" onclick="dgDel()">Supprimer la forme</button>`;}
  else if(DG.selEdge!==null){const e=DG.edges[DG.selEdge];if(!e){DG.selEdge=null;return dgProps();}el.innerHTML=`<div class="field"><label class="field-label">Libellé du lien</label><input value="${e.label||''}" placeholder="Oui / Non / Si validé…" oninput="DG.edges[${DG.selEdge}].label=this.value;document.getElementById('dg-svg').innerHTML=dgSVG(DG,false)"></div>
    <div class="field"><label class="field-label">Sens</label><button class="btn btn-secondary" style="width:100%;justify-content:center" onclick="const e=DG.edges[${DG.selEdge}];[e.from,e.to]=[e.to,e.from];dgRender()">Inverser la flèche</button></div>
    <button class="btn btn-secondary" style="color:var(--state-danger);width:100%;justify-content:center" onclick="dgDel()">Supprimer le lien</button>`;}
  else el.innerHTML=`<div class="dg-empty">Cliquez une forme ou un lien pour modifier son libellé, son type ou le supprimer.<br><br><b>${DG.nodes.length}</b> formes · <b>${DG.edges.length}</b> liens</div>`;
}
document.addEventListener('mousemove',dgMove);
document.addEventListener('mouseup',dgUp);
document.addEventListener('keydown',e=>{
  if(!document.getElementById('dg-wrap')?.classList.contains('open')) return;
  if(e.target.matches('input,textarea')) return;
  if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();dgDel();}
  if(e.key==='Escape') dgClose();
  if(e.key==='c') dgTool('connect'); if(e.key==='v') dgTool('select');
});
/* palette : glisser vers le canevas */
function dgPalDrag(e,k){e.dataTransfer.setData('text/plain',k);}
function dgCanvasDrop(e){e.preventDefault();const k=e.dataTransfer.getData('text/plain');if(!DG_KINDS[k])return;const c=document.getElementById('dg-svg').getBoundingClientRect();const n={id:'n'+Date.now(),k,x:Math.round((e.clientX-c.left-DG_KINDS[k].w/2)/10)*10,y:Math.round((e.clientY-c.top-DG_KINDS[k].h/2)/10)*10,label:DG_KINDS[k].l};DG.nodes.push(n);DG.sel=n.id;DG.selEdge=null;dgRender();}

document.addEventListener('DOMContentLoaded',prRenderList);
