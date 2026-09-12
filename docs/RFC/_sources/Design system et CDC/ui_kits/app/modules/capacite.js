/* Capacité — centres, collaborateurs, portefeuille
   Extrait de « Refonte Portail Client.html ». Script classique, portée globale partagée.
   Chargé avant le script principal. Dépendances globales : fmtEur(), showToast(), showView(). */

/* ═══════════ CAPACITÉ — module Core (RFC-CAPA-001) ═══════════ */
const CAP_MONTHS=['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
const CAP_JH=[21,20,22,21,17,21,23,21,22,23,20,22]; // jours ouvrés / mois — calendrier FR 2025
const CAP_GROUPS=[{id:'it',name:'IT',color:'var(--state-info)'},{id:'support',name:'Fonctions support',color:'var(--purple)'},{id:'metiers',name:'Métiers',color:'var(--teal)'}];
const CAP_CENTERS=[
 {id:'cdp',g:'it',name:'Chefs de projet',head:3},{id:'infra',g:'it',name:'Infrastructure',head:5},{id:'expl',g:'it',name:'Exploitation',head:4},{id:'supp',g:'it',name:'Support',head:6},{id:'cyber',g:'it',name:'Cybersécurité',head:3},{id:'dev',g:'it',name:'Développement',head:8},
 {id:'rh',g:'support',name:'RH',head:3},{id:'compta',g:'support',name:'Comptabilité',head:3},{id:'fin',g:'support',name:'Finance',head:2},{id:'jur',g:'support',name:'Juridique',head:2},{id:'ach',g:'support',name:'Achats',head:2},{id:'com',g:'support',name:'Communication',head:2},
 {id:'prod',g:'metiers',name:'Production',head:10},{id:'maint',g:'metiers',name:'Maintenance',head:5},{id:'comm',g:'metiers',name:'Commerce',head:6},{id:'mkt',g:'metiers',name:'Marketing',head:3},{id:'qual',g:'metiers',name:'Qualité',head:3}
];
// charge affectée : c=centre, p=projet, s=E(ngagé)|P(révisionnel), a→b mois (0-11), jh total réparti automatiquement
const CAP_LOADS=[
 {c:'cdp',p:'Refonte Portail Client',s:'E',a:0,b:3,jh:250},{c:'cdp',p:'Migration Cloud',s:'P',a:2,b:6,jh:120},
 {c:'dev',p:'Refonte Portail Client',s:'E',a:0,b:8,jh:340},{c:'dev',p:'Application Mobile',s:'P',a:5,b:11,jh:200},
 {c:'infra',p:'Migration Cloud',s:'E',a:1,b:4,jh:520},{c:'infra',p:'Migration ERP',s:'P',a:8,b:11,jh:140},
 {c:'expl',p:'Migration Cloud',s:'E',a:3,b:9,jh:150},
 {c:'cyber',p:'Sécurité & RGPD',s:'E',a:2,b:4,jh:200},{c:'cyber',p:'Audit cybersécurité',s:'P',a:9,b:11,jh:150},
 {c:'supp',p:'Support self-care N2',s:'E',a:0,b:11,jh:230},
 {c:'rh',p:'Refonte Portail Client',s:'E',a:2,b:6,jh:40},{c:'rh',p:'Programme SSO',s:'P',a:7,b:10,jh:26},
 {c:'fin',p:'Data & BI Finance',s:'E',a:1,b:8,jh:72},
 {c:'jur',p:'Sécurité & RGPD',s:'E',a:0,b:4,jh:30},{c:'jur',p:'Archivage légal',s:'P',a:6,b:11,jh:24},
 {c:'compta',p:'Migration ERP',s:'P',a:8,b:11,jh:52},
 {c:'ach',p:'Migration Cloud',s:'E',a:0,b:3,jh:20},
 {c:'com',p:'Refonte Portail Client',s:'E',a:5,b:8,jh:24},
 {c:'prod',p:'Modernisation ligne',s:'E',a:0,b:11,jh:1150},
 {c:'maint',p:'Maintenance préventive',s:'E',a:0,b:11,jh:520},
 {c:'comm',p:'Déploiement CRM',s:'P',a:3,b:9,jh:180},
 {c:'mkt',p:'Refonte Portail Client',s:'P',a:4,b:8,jh:64},
 {c:'qual',p:'Certification ISO 27001',s:'E',a:0,b:7,jh:118}
];
const CAP_PEOPLE=[
 {n:'Sophie Marchand',c:'cdp',role:'Cheffe de projet',exc:null,loads:[{p:'Refonte Portail Client',s:'E',a:0,b:8,jh:112}]},
 {n:'Karim Bensaïd',c:'infra',role:'Ingénieur infrastructure',exc:{9:15},loads:[{p:'Migration Cloud',s:'E',a:0,b:6,jh:98}]},
 {n:'Julie Fontaine',c:'dev',role:'Lead développeuse',exc:null,loads:[{p:'Refonte Portail Client',s:'E',a:0,b:8,jh:140},{p:'Application Mobile',s:'P',a:6,b:11,jh:64}]},
 {n:'Marc Lefèvre',c:'dev',role:'Développeur',exc:null,loads:[{p:'Refonte Portail Client',s:'E',a:0,b:8,jh:126}]},
 {n:'Amélie Rousseau',c:'cyber',role:'RSSI adjointe',exc:null,loads:[{p:'Sécurité & RGPD',s:'E',a:0,b:5,jh:74},{p:'Audit cybersécurité',s:'P',a:9,b:11,jh:32}]},
 {n:'Thomas Girard',c:'expl',role:"Chargé d'exploitation",exc:{6:12,7:0},loads:[{p:'Migration Cloud',s:'E',a:3,b:9,jh:82}]},
 {n:'Nadia Cherif',c:'supp',role:'Support N2',exc:null,loads:[{p:'Support self-care N2',s:'E',a:0,b:11,jh:150}]},
 {n:'Paul Mercier',c:'rh',role:'Chargé RH',exc:null,loads:[{p:'Refonte Portail Client',s:'E',a:2,b:6,jh:32}]},
 {n:'Claire Dubois',c:'fin',role:'Contrôleuse de gestion',exc:null,loads:[{p:'Data & BI Finance',s:'E',a:1,b:8,jh:56}]},
 {n:'Hugo Petit',c:'jur',role:'Juriste',exc:null,loads:[{p:'Sécurité & RGPD',s:'E',a:0,b:4,jh:22},{p:'Archivage légal',s:'P',a:6,b:11,jh:20}]},
 {n:'Léa Moreau',c:'compta',role:'Comptable',exc:null,loads:[{p:'Migration ERP',s:'P',a:8,b:11,jh:42}]},
 {n:'Antoine Roy',c:'prod',role:'Responsable production',exc:null,loads:[{p:'Modernisation ligne',s:'E',a:0,b:11,jh:190}]},
 {n:'Farida Haddad',c:'qual',role:'Responsable qualité',exc:null,loads:[{p:'Certification ISO 27001',s:'E',a:0,b:7,jh:96}]},
 {n:'Nicolas Blanc',c:'comm',role:'Ingénieur commercial',exc:null,loads:[{p:'Déploiement CRM',s:'P',a:3,b:9,jh:74}]}
];
function capNb(n){return Math.round(n).toLocaleString('fr-FR');}
function capSum(a){return a.reduce((x,y)=>x+y,0);}
function capTone(o){return o>100?'var(--state-danger)':(o>=85?'var(--brand-gold-700)':'var(--state-success)');}
function capBg(o){return o>100?'var(--state-danger)':(o>=85?'var(--brand-gold)':'var(--state-success)');}
function capCellBg(o){if(o>100)return 'var(--state-danger)';if(o>=90)return 'color-mix(in srgb,var(--brand-gold) 55%,#fff)';if(o>=70)return 'color-mix(in srgb,var(--brand-gold) 30%,#fff)';if(o>=45)return 'color-mix(in srgb,var(--state-success) 30%,#fff)';return 'color-mix(in srgb,var(--state-success) 14%,#fff)';}
function capGcol(id){return CAP_GROUPS.find(g=>g.id===id).color;}
function capDist(a,b,jh){const arr=Array(12).fill(0),n=b-a+1;for(let m=a;m<=b;m++)arr[m]=jh/n;return arr;}
function capCenterMonthly(cid){const c=CAP_CENTERS.find(x=>x.id===cid);const cap=CAP_JH.map(j=>j*c.head),eng=Array(12).fill(0),prev=Array(12).fill(0);CAP_LOADS.filter(l=>l.c===cid).forEach(l=>{capDist(l.a,l.b,l.jh).forEach((v,m)=>{if(l.s==='E')eng[m]+=v;else prev[m]+=v;});});return{cap,eng,prev,c};}
function capPersonMonthly(p){const cap=CAP_JH.map((j,m)=>p.exc&&p.exc[m]!=null?p.exc[m]:j),eng=Array(12).fill(0),prev=Array(12).fill(0);(p.loads||[]).forEach(l=>{capDist(l.a,l.b,l.jh).forEach((v,m)=>{if(l.s==='E')eng[m]+=v;else prev[m]+=v;});});return{cap,eng,prev};}
function capPortfolioTotals(){const cap=Array(12).fill(0),eng=Array(12).fill(0),prev=Array(12).fill(0);CAP_CENTERS.forEach(c=>{const m=capCenterMonthly(c.id);for(let i=0;i<12;i++){cap[i]+=m.cap[i];eng[i]+=m.eng[i];prev[i]+=m.prev[i];}});return{cap,eng,prev};}
function capMonthTable(mm,src){let r='';for(let i=0;i<12;i++){const cons=mm.eng[i]+mm.prev[i],dispo=mm.cap[i]-cons,occ=Math.round(cons/mm.cap[i]*100);r+='<tr><td>'+CAP_MONTHS[i]+'</td><td>'+capNb(mm.cap[i])+'</td><td>'+(mm.eng[i]?capNb(mm.eng[i]):'–')+'</td><td>'+(mm.prev[i]?'<span style="color:var(--brand-gold-700)">'+capNb(mm.prev[i])+'</span>':'–')+'</td><td style="font-weight:700;color:'+(dispo<0?'var(--state-danger)':'var(--brand-ink)')+'">'+capNb(dispo)+'</td><td><span style="font-weight:800;color:'+capTone(occ)+'">'+occ+'%</span></td>'+(src?'<td>'+src[i]+'</td>':'')+'</tr>';}return r;}
function capTab(t){document.querySelectorAll('#view-capacity .cap-tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===t));['portefeuille','centres','collabs'].forEach(x=>{document.getElementById('cap-'+x).style.display=x===t?'':'none';});if(t==='portefeuille')capRenderPortfolio();else if(t==='centres')capRenderCentres();else capRenderCollabs();}
function capRender(){scnRender();}

