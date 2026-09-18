/* Droits & partage par page.
   Deux boutons contextuels dans la barre supérieure : « Droits » (qui peut quoi
   sur cette page) et « Partagé » (liens et invitations). Les droits sont définis
   par page, avec héritage du niveau organisation.
   Dépendances : avBadge()/avIni() (annuaire), showToast(), VIEW_META. */

const ACL_PERMS=[
  {k:'view',l:'Consulter',m:'Accès en lecture à la page et à ses données'},
  {k:'edit',l:'Modifier',m:'Créer et modifier les éléments de la page'},
  {k:'validate',l:'Valider',m:'Approuver, arbitrer, clôturer'},
  {k:'admin',l:'Administrer',m:'Gérer les droits et la configuration'}
];
const ACL_ROLES=[
  {k:'pmo',l:'PMO',m:'Pilotage du portefeuille',def:{view:1,edit:1,validate:1,admin:1}},
  {k:'dir',l:'Direction',m:'Membres du comité de direction',def:{view:1,edit:0,validate:1,admin:0}},
  {k:'cp',l:'Chefs de projet',m:'Responsables de projets actifs',def:{view:1,edit:1,validate:0,admin:0}},
  {k:'metier',l:'Référents métier',m:'Correspondants des directions',def:{view:1,edit:1,validate:0,admin:0}},
  {k:'lecteur',l:'Lecteurs',m:'Consultation seule, tous collaborateurs',def:{view:1,edit:0,validate:0,admin:0}}
];
const ACL_LINK=[
  {k:'prive',l:'Restreint',m:'Seules les personnes autorisées ci-dessous y accèdent',ico:'<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>'},
  {k:'org',l:'Toute l\'organisation',m:'Tout collaborateur connecté peut consulter la page',ico:'<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>'},
  {k:'lien',l:'Lien de partage',m:'Toute personne disposant du lien peut consulter, sans connexion',ico:'<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>'}
];
/* droits et partages mémorisés par page — la page hérite de l'organisation tant qu'elle n'est pas personnalisée */
const ACL={};
let ACL_PAGE='list', ACL_DRAFT=null;

function aclLabel(page){
  const m=(typeof VIEW_META!=='undefined')?VIEW_META[page]:null;
  if(m&&m.bc){ const t=m.bc.replace(/<[^>]*>/g,'|').split('|').filter(s=>s.trim()); if(t.length) return t[t.length-1].trim(); }
  return 'Cette page';
}
function aclState(page){
  if(!ACL[page]) ACL[page]={
    custom:false,
    roles:ACL_ROLES.reduce(function(a,r){ a[r.k]=Object.assign({},r.def); return a; },{}),
    link:'prive',
    people:[]
  };
  return ACL[page];
}
function aclPeople(){
  const out=[];
  try{ if(typeof DIR==='object'&&DIR) Object.keys(DIR).forEach(function(k){ out.push({k:k,n:DIR[k][0],r:DIR[k][1]}); }); }catch(e){}
  if(!out.length) [['MD','Marc Dupont','Chef de projet'],['SL','Sophie Leroy','Architecte']].forEach(p=>out.push({k:p[0],n:p[1],r:p[2]}));
  return out;
}
function aclAv(n,size){ return (typeof avBadge==='function')?avBadge(n,size||'av-sm'):'<span class="av av-1 '+(size||'av-sm')+'">'+String(n||'?').slice(0,2).toUpperCase()+'</span>'; }
function aclIco(p){ return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">'+p+'</svg>'; }
function aclSetPage(name){ ACL_PAGE=name||'list'; aclSyncBtns(); }
function aclSyncBtns(){
  const s=aclState(ACL_PAGE), b=document.getElementById('acl-share-lbl');
  if(b) b.textContent=(s.link==='prive'&&!s.people.length)?'Partager':'Partagé';
  const dot=document.getElementById('acl-share-dot');
  if(dot) dot.style.display=(s.link!=='prive'||s.people.length)?'':'none';
}

/* ─── Modale : droits ─── */
function aclOpenRights(){
  const s=aclState(ACL_PAGE);
  ACL_DRAFT=JSON.parse(JSON.stringify({roles:s.roles,custom:s.custom}));
  aclRenderRights();
  document.getElementById('aclRightsModal').classList.add('open');
}
function aclCloseRights(){ document.getElementById('aclRightsModal').classList.remove('open'); }
function aclRenderRights(){
  const box=document.getElementById('acl-rights-body'); if(!box) return;
  box.innerHTML=
    '<div class="acl-scope">'+aclIco('<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>')
      +'<div><div class="acl-scope-t">'+aclEsc(aclLabel(ACL_PAGE))+'</div><div class="acl-scope-m">'+(ACL_DRAFT.custom?'Droits propres à cette page.':'Droits hérités du niveau organisation. Toute modification les rend propres à cette page.')+'</div></div>'
      +(ACL_DRAFT.custom?'<button class="btn btn-secondary btn-sm" onclick="aclResetRights()">Revenir à l\'héritage</button>':'')
    +'</div>'
    +'<div class="acl-tbl"><div class="acl-tr acl-th"><span class="acl-c1">Profil</span>'
      +ACL_PERMS.map(p=>'<span class="acl-cp" title="'+p.m+'">'+p.l+'</span>').join('')+'</div>'
    +ACL_ROLES.map(function(r){
      const v=ACL_DRAFT.roles[r.k];
      return '<div class="acl-tr"><span class="acl-c1"><span class="acl-rn">'+r.l+'</span><span class="acl-rm">'+r.m+'</span></span>'
        +ACL_PERMS.map(function(p){
          return '<span class="acl-cp"><button class="acl-cb'+(v[p.k]?' on':'')+'" onclick="aclToggle(\''+r.k+'\',\''+p.k+'\')" aria-label="'+r.l+' · '+p.l+'">'+aclIco('<polyline points="20 6 9 17 4 12"/>')+'</button></span>';
        }).join('')
      +'</div>';
    }).join('')+'</div>'
    +'<div class="acl-note">'+aclIco('<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>')
      +'<span>« Administrer » implique les autres droits. Les personnes invitées individuellement dans le partage conservent leur propre niveau d\'accès.</span></div>';
}
function aclEsc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function aclToggle(role,perm){
  const v=ACL_DRAFT.roles[role];
  v[perm]=v[perm]?0:1;
  if(perm==='admin'&&v.admin) ACL_PERMS.forEach(p=>{ v[p.k]=1; });
  if(perm!=='view'&&v[perm]) v.view=1;
  if(perm==='view'&&!v.view) ACL_PERMS.forEach(p=>{ v[p.k]=0; });
  ACL_DRAFT.custom=true;
  aclRenderRights();
}
function aclResetRights(){
  ACL_DRAFT={custom:false,roles:ACL_ROLES.reduce(function(a,r){ a[r.k]=Object.assign({},r.def); return a; },{})};
  aclRenderRights();
}
function aclSaveRights(){
  const s=aclState(ACL_PAGE);
  s.roles=ACL_DRAFT.roles; s.custom=ACL_DRAFT.custom;
  aclCloseRights(); aclSyncBtns();
  showToast('Droits enregistrés · '+aclLabel(ACL_PAGE)+(s.custom?' (droits propres)':' (héritage organisation)'));
}

/* ─── Modale : partage ─── */
function aclOpenShare(){
  const s=aclState(ACL_PAGE);
  ACL_DRAFT={link:s.link,people:s.people.map(p=>Object.assign({},p))};
  aclRenderShare();
  document.getElementById('aclShareModal').classList.add('open');
}
function aclCloseShare(){ document.getElementById('aclShareModal').classList.remove('open'); }
function aclRenderShare(){
  const box=document.getElementById('acl-share-body'); if(!box) return;
  const free=aclPeople().filter(p=>!ACL_DRAFT.people.some(x=>x.k===p.k));
  box.innerHTML=
    '<div class="acl-scope">'+aclIco('<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>')
      +'<div><div class="acl-scope-t">'+aclEsc(aclLabel(ACL_PAGE))+'</div><div class="acl-scope-m">Le partage s\'ajoute aux droits par profil ; il ne les remplace pas.</div></div></div>'
    +'<div class="acl-sec-t">Accès général</div>'
    +'<div class="acl-links">'+ACL_LINK.map(function(o){
      return '<button class="acl-link'+(ACL_DRAFT.link===o.k?' sel':'')+'" onclick="ACL_DRAFT.link=\''+o.k+'\';aclRenderShare()">'
        +'<span class="acl-link-i">'+aclIco(o.ico)+'</span><span><span class="acl-link-t">'+o.l+'</span><span class="acl-link-m">'+o.m+'</span></span>'
        +'<span class="acl-link-c">'+aclIco('<polyline points="20 6 9 17 4 12"/>')+'</span></button>';
    }).join('')+'</div>'
    +(ACL_DRAFT.link==='lien'
      ? '<div class="acl-url"><input class="input" readonly value="https://portail.starium.fr/p/'+ACL_PAGE+'?s=8f2c1a"><button class="btn btn-secondary btn-sm" onclick="showToast(\'Lien de partage copié\')">'+aclIco('<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>')+'Copier</button></div>'
      : '')
    +'<div class="acl-sec-t" style="margin-top:20px">Personnes autorisées'+(ACL_DRAFT.people.length?' <span class="acl-count">'+ACL_DRAFT.people.length+'</span>':'')+'</div>'
    +(ACL_DRAFT.people.length
      ? '<div class="acl-plist">'+ACL_DRAFT.people.map(function(p,i){
          return '<div class="acl-prow">'+aclAv(p.n,'av-sm')+'<span><span class="acl-pn">'+aclEsc(p.n)+'</span><span class="acl-pr">'+aclEsc(p.r)+'</span></span>'
            +'<select class="npt-sel acl-psel" onchange="ACL_DRAFT.people['+i+'].lvl=this.value">'
              +['Consulter','Modifier','Valider','Administrer'].map(l=>'<option'+(p.lvl===l?' selected':'')+'>'+l+'</option>').join('')+'</select>'
            +'<button class="acl-px" onclick="ACL_DRAFT.people.splice('+i+',1);aclRenderShare()" title="Retirer l\'accès">'+aclIco('<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>')+'</button></div>';
        }).join('')+'</div>'
      : '<div class="acl-empty">Personne n\'a d\'accès individuel à cette page. Les profils définis dans les droits s\'appliquent.</div>')
    +'<div class="acl-invite">'
      +'<select class="input" id="acl-invite-who"><option value="">Inviter un collaborateur…</option>'+free.map(p=>'<option value="'+p.k+'">'+aclEsc(p.n)+' — '+aclEsc(p.r)+'</option>').join('')+'</select>'
      +'<select class="input" id="acl-invite-lvl" style="max-width:140px">'+['Consulter','Modifier','Valider','Administrer'].map(l=>'<option>'+l+'</option>').join('')+'</select>'
      +'<button class="btn btn-secondary btn-sm" onclick="aclInvite()">Inviter</button>'
    +'</div>';
}
function aclInvite(){
  const k=document.getElementById('acl-invite-who').value;
  if(!k){ showToast('Sélectionnez un collaborateur à inviter'); return; }
  const p=aclPeople().find(x=>x.k===k);
  ACL_DRAFT.people.push({k:p.k,n:p.n,r:p.r,lvl:document.getElementById('acl-invite-lvl').value});
  aclRenderShare();
}
function aclSaveShare(){
  const s=aclState(ACL_PAGE);
  s.link=ACL_DRAFT.link; s.people=ACL_DRAFT.people;
  aclCloseShare(); aclSyncBtns();
  const lk=ACL_LINK.find(x=>x.k===s.link);
  showToast('Partage mis à jour · '+lk.l.toLowerCase()+(s.people.length?' · '+s.people.length+' personne'+(s.people.length>1?'s':'')+' autorisée'+(s.people.length>1?'s':''):''));
}
