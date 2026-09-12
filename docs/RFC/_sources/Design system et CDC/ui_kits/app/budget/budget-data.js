/* Budget — données & helpers de calcul
   Extrait de « Refonte Portail Client.html ».
   Script classique : chargé AVANT le script principal, partage la portée globale.
   Dépend des helpers globaux : fmtEur(), showToast(). */

const MB_ACCENT={
  blue:['var(--state-info-bg)','var(--state-info)'],
  gold:['var(--brand-gold-050)','var(--brand-gold-700)'],
  purple:['var(--purple-bg)','var(--purple)'],
  green:['var(--state-success-bg)','var(--state-success)'],
  slate:['var(--neutral-100)','var(--neutral-600)'],
  red:['var(--state-danger-bg)','var(--state-danger)']
};
const MB_ICO={
  server:'<rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/>',
  euro:'<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  users:'<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/>',
  mega:'<path d="M3 11l18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
  building:'<path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/>',
  trend:'<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
  folder:'<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>'
};
function L(name,budget,engage,conso,prev){ return {name,budget,engage,conso,prev}; }
const MBUDGETS=[
  {id:'dsi',name:'Budget DSI',dir:'Direction des Systèmes d\'Information',color:'blue',ico:'server',env:[
    {name:'Infrastructure & Cloud',type:'CAPEX',lines:[L('Hébergement cloud',420000,380000,355000,415000),L('Datacenter & réseau',260000,240000,230000,258000),L('Postes & terminaux',180000,150000,140000,175000)]},
    {name:'Applications & Licences',type:'OPEX',lines:[L('Licences éditeurs',340000,335000,325000,348000),L('SaaS métiers',220000,210000,205000,225000),L('Maintenance applicative',190000,180000,175000,195000)]},
    {name:'Cybersécurité',type:'OPEX',lines:[L('SOC & supervision',210000,205000,190000,215000),L('Audits & pentests',90000,98000,88000,99000),L('Outils sécurité',130000,120000,118000,128000)]},
    {name:'Support & TMA',type:'OPEX',lines:[L('Support N1 / N2',240000,235000,230000,242000),L('TMA applicative',300000,290000,285000,305000)]},
    {name:'Projets & Innovation',type:'CAPEX',lines:[L('Refonte SI cœur',350000,300000,240000,362000),L('Data & IA',200000,160000,120000,205000),L('POC innovation',80000,50000,40000,78000)]}
  ]},
  {id:'daf',name:'Budget DAF',dir:'Direction Administrative & Financière',color:'gold',ico:'euro',env:[
    {name:'ERP & Outils finance',type:'OPEX',lines:[L('Licence ERP',180000,175000,170000,182000),L('Modules reporting',90000,85000,82000,92000)]},
    {name:'Audit & Conseil',type:'OPEX',lines:[L('Commissariat aux comptes',120000,120000,118000,121000),L('Conseil fiscal & juridique',70000,60000,55000,72000)]},
    {name:'Trésorerie & Assurances',type:'OPEX',lines:[L('Assurances Groupe',150000,150000,148000,152000),L('Frais bancaires',60000,58000,57000,61000)]}
  ]},
  {id:'rh',name:'Budget RH',dir:'Direction des Ressources Humaines',color:'purple',ico:'users',env:[
    {name:'SIRH & Paie',type:'CAPEX',lines:[L('Licence SIRH',110000,100000,95000,112000),L('Paie externalisée',130000,128000,125000,131000)]},
    {name:'Formation',type:'OPEX',lines:[L('Plan de formation',220000,180000,150000,210000),L('Certifications',60000,50000,45000,58000)]},
    {name:'Recrutement',type:'OPEX',lines:[L('Cabinets & annonces',140000,120000,110000,145000),L('Marque employeur',50000,40000,35000,52000)]}
  ]},
  {id:'mkt',name:'Budget Marketing',dir:'Direction Marketing & Communication',color:'green',ico:'mega',env:[
    {name:'Campagnes digitales',type:'OPEX',lines:[L('SEA / SEO',180000,170000,165000,185000),L('Social & contenu',120000,110000,105000,122000)]},
    {name:'Événementiel',type:'OPEX',lines:[L('Salons professionnels',160000,150000,145000,168000),L('Séminaires',90000,80000,78000,95000)]},
    {name:'Agence & Création',type:'OPEX',lines:[L('Agence créative',200000,190000,185000,205000),L('Production vidéo',70000,60000,58000,72000)]}
  ]},
  {id:'fonc',name:'Fonctionnement',dir:'Charges de fonctionnement — OPEX récurrent',color:'slate',ico:'building',env:[
    {name:'Locaux & Énergie',type:'OPEX',lines:[L('Loyers & charges',480000,480000,475000,482000),L('Énergie & fluides',120000,130000,128000,138000)]},
    {name:'Télécoms',type:'OPEX',lines:[L('Téléphonie & réseau',90000,88000,86000,91000)]},
    {name:'Services généraux',type:'OPEX',lines:[L('Fournitures & services',70000,65000,63000,71000)]}
  ]},
  {id:'invest',name:'Investissement',dir:'Enveloppe d\'investissement — CAPEX',color:'gold',ico:'trend',env:[
    {name:'Matériel',type:'CAPEX',lines:[L('Serveurs & stockage',260000,240000,210000,258000),L('Postes de travail',180000,170000,160000,182000)]},
    {name:'Aménagements',type:'CAPEX',lines:[L('Travaux locaux',220000,180000,150000,225000)]},
    {name:'Développements immobilisés',type:'CAPEX',lines:[L('Développements internes',300000,260000,220000,305000)]}
  ]},
  {id:'proj',name:'Budgets de projet',dir:'Portefeuille projets — 7 projets financés',color:'red',ico:'folder',env:[
    {name:'Refonte Portail Client',type:'CAPEX',lines:[L('Refonte Portail Client',120000,98000,78500,120000)]},
    {name:'Migration Cloud',type:'CAPEX',lines:[L('Migration Cloud',80000,76000,70400,83000)]},
    {name:'Conformité RGPD',type:'OPEX',lines:[L('Conformité RGPD',45000,42000,40500,45000)]},
    {name:'Application Mobile',type:'CAPEX',lines:[L('Application Mobile',60000,12000,7200,59000)]},
    {name:'Data & BI Finance',type:'CAPEX',lines:[L('Data & BI Finance',55000,31000,27500,54000)]},
    {name:'Programme SSO',type:'CAPEX',lines:[L('Programme SSO',25000,8000,5000,25000)]},
    {name:'Archivage Légal',type:'OPEX',lines:[L('Archivage Légal',20000,12000,6400,21000)]}
  ]}
];
const MB_MONTHS=['J','F','M','A','M','J','J','A','S','O','N','D'];
const MB_CURVE=[0.7,0.8,0.95,0.9,1.0,1.1,0.75,0.7,1.05,1.15,1.2,1.3];
let mbYear='2025';
let mbCurMonth=9;           // mois "réalisé" jusqu'à septembre pour 2025
let mbCurrentId=null;
let mbFilter='all';         // all | CAPEX | OPEX
let mbHomeView='cards';     // cards | table
function mbFactor(){ return mbYear==='2024'?0.9:1; }
function mbf(n){ return Math.round(n*mbFactor()); }
function mbSumLines(lines,key){ return lines.reduce((s,l)=>s+l[key],0); }
function mbEnvTot(env){ return {budget:mbSumLines(env.lines,'budget'),engage:mbSumLines(env.lines,'engage'),conso:mbSumLines(env.lines,'conso'),prev:mbSumLines(env.lines,'prev'),dep:env.lines.reduce((s,l)=>s+Math.max(0,l.prev-l.budget),0)}; }
function mbTot(b){
  let t={budget:0,engage:0,conso:0,prev:0,dep:0,capex:0,opex:0};
  b.env.forEach(e=>{const et=mbEnvTot(e);t.budget+=et.budget;t.engage+=et.engage;t.conso+=et.conso;t.prev+=et.prev;t.dep+=et.dep;if(e.type==='CAPEX')t.capex+=et.budget;else t.opex+=et.budget;});
  return t;
}
function mbPfClass(pct){ return pct>=90?'pf-bad':(pct>=75?'pf-warn':'pf-ok'); }
function mbBarColor(pct){ return pct>=90?'var(--state-danger)':(pct>=75?'var(--brand-gold)':'var(--state-info)'); }

