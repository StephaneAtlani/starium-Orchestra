/* orchestra-pages.js — Starium Orchestra SPA page renders
   Requires: orchestra.html (defines go(), switchTab()) */

/* ── ICONS ─────────────────────────────────────────────── */
const _ico = (d,vb='0 0 24 24') => `<svg viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const I = {
  'grid':          _ico('<rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/>'),
  'target':        _ico('<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>'),
  'refresh-cw':    _ico('<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>'),
  'shield-check':  _ico('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>'),
  'briefcase':     _ico('<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>'),
  'inbox':         _ico('<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>'),
  'alert-triangle':_ico('<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>'),
  'wallet':        _ico('<rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/>'),
  'truck':         _ico('<rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>'),
  'file-text':     _ico('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>'),
  'users':         _ico('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'),
  'book-open':     _ico('<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>'),
  'settings':      _ico('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>'),
  'plus':          _ico('<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>'),
  'download':      _ico('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>'),
  'chevron-right': _ico('<polyline points="9 18 15 12 9 6"/>'),
  'chevron-down':  _ico('<polyline points="6 9 12 15 18 9"/>'),
  'arrow-up':      _ico('<line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>'),
  'arrow-down':    _ico('<line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>'),
  'edit':          _ico('<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>'),
  'external':      _ico('<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>'),
};

/* ── HELPERS ─────────────────────────────────────────────── */
const bc = (parts) => parts.map((p,i) => i<parts.length-1 ? `<span>${p}</span>${I['chevron-right']}` : `<span>${p}</span>`).join('');
const kpi = (ico, label, val, foot='', fc='neu') =>
  `<div class="kcard"><div class="kico">${I[ico]||''}</div><div class="kb"><div class="kl">${label}</div><div class="kv">${val}</div>${foot?`<div class="kf ${fc}">${foot}</div>`:''}</div></div>`;
const badge = (txt,cls='bn') => `<span class="b ${cls}">${txt}</span>`;
const prog = (pct, cls='ok') => `<div class="pt"><div class="pf ${cls}" style="width:${Math.min(pct,100)}%"></div></div>`;
const btn = (txt,cls='btn-s',ico='') => `<button class="btn ${cls}">${ico?I[ico]:''} ${txt}</button>`;
const phdr = (title,sub,breadcrumb,actions='') =>
  `<div class="ph"><div class="ph-left"><div class="breadcrumb">${bc(breadcrumb)}</div><h1 class="pt">${title}</h1>${sub?`<div class="psub">${sub}</div>`:''}</div><div class="pa">${actions}</div></div>`;

/* ── PAGES ─────────────────────────────────────────────── */
const PAGES = {

/* 1 ── DASHBOARD ──────────────────────────────────────── */
dashboard: { title:"Vue d'ensemble", render() { return `<div class="pw">
${phdr("Vue d'ensemble", "Innovatech SA · T2 2026", ["Accueil"],
  btn("Préparer le CODIR","btn-p","briefcase"))}
<div class="kgrid">
  ${kpi('briefcase',"Projets actifs","12",'↑ 2 ce trimestre','ok')}
  ${kpi('wallet',"Budget engagé","3,1 M€",'sur 4,2 M€ prévu','neu')}
  ${kpi('alert-triangle',"Risques critiques","3",'1 sans plan d\'action','bad')}
  ${kpi('inbox',"Alertes ouvertes","7",'dont 2 critiques','warn')}
</div>
<div class="ms">
  <div class="vstack">
    <div class="card"><div class="ct">Alertes récentes <a class="cl">Voir toutes</a></div>
      <div class="ali"><div class="alid crit"></div><div class="alib"><div class="alit">Budget « Transformation digitale » dépassé de 12 %</div><div class="alim">Budgets · il y a 2 h</div></div></div>
      <div class="ali"><div class="alid warn"></div><div class="alib"><div class="alit">Contrat Microsoft Azure expire dans 30 jours</div><div class="alim">Contrats · il y a 5 h</div></div></div>
      <div class="ali"><div class="alid crit"></div><div class="alib"><div class="alit">Risque critique « Sécurité SI » sans plan d'action</div><div class="alim">Risques · hier</div></div></div>
      <div class="ali"><div class="alid warn"></div><div class="alib"><div class="alit">Projet « Refonte intranet » en retard de 3 semaines</div><div class="alim">Projets · il y a 2 j</div></div></div>
      <div class="ali"><div class="alid info"></div><div class="alib"><div class="alit">Nouvelle demande projet soumise : ERP Finance</div><div class="alim">Demandes · il y a 3 j</div></div></div>
    </div>
    <div class="card"><div class="ct">Projets récents <a class="cl" onclick="go('projects')">Portefeuille →</a></div>
      <div class="tw"><table class="dt"><thead><tr><th>Projet</th><th>Statut</th><th>Avancement</th><th>Responsable</th></tr></thead><tbody>
        <tr><td class="n">Remplacement SI RH</td><td>${badge('En cours','ba')}</td><td><div style="display:flex;align-items:center;gap:8px">${prog(74)}<span style="font-size:11.5px;color:var(--fg-2)">74 %</span></div></td><td>S. Martin</td></tr>
        <tr><td class="n">Migration Cloud Azure</td><td>${badge('En cours','ba')}</td><td><div style="display:flex;align-items:center;gap:8px">${prog(45,'warn')}<span style="font-size:11.5px;color:var(--fg-2)">45 %</span></div></td><td>P. Dupont</td></tr>
        <tr><td class="n">Conformité DORA</td><td>${badge('En cours','br')}</td><td><div style="display:flex;align-items:center;gap:8px">${prog(33,'bad')}<span style="font-size:11.5px;color:var(--fg-2)">33 %</span></div></td><td>S. Martin</td></tr>
        <tr><td class="n">Projet CRM</td><td>${badge('En cours','ba')}</td><td><div style="display:flex;align-items:center;gap:8px">${prog(62)}<span style="font-size:11.5px;color:var(--fg-2)">62 %</span></div></td><td>J. Lambert</td></tr>
      </tbody></table></div>
    </div>
  </div>
  <div class="vstack">
    <div class="card"><div class="ct">Jalons à venir</div>
      <div class="mili"><div class="mild">15 juin</div><div><div class="miln">Lancement CRM</div><div class="milp">Projet CRM</div></div></div>
      <div class="mili"><div class="mild">30 juin</div><div><div class="miln">Revue budgétaire T2</div><div class="milp">Budget 2026</div></div></div>
      <div class="mili"><div class="mild">1er juil.</div><div><div class="miln">Audit conformité DORA</div><div class="milp">Conformité</div></div></div>
      <div class="mili"><div class="mild">15 juil.</div><div><div class="miln">CODIR T3 — Arbitrage</div><div class="milp">Cycles de pilotage</div></div></div>
    </div>
    <div class="card"><div class="ct">Accès rapides</div>
      <div class="ql">
        <div class="ql-item" onclick="go('projects')">${I['plus']}<span>Nouveau projet</span></div>
        <div class="ql-item" onclick="go('teams')">${I['users']}<span>Saisir le temps</span></div>
        <div class="ql-item" onclick="go('requests')">${I['inbox']}<span>Demandes en attente</span></div>
        <div class="ql-item" onclick="go('cycles')">${I['briefcase']}<span>Préparer le CODIR</span></div>
      </div>
    </div>
  </div>
</div></div>`;}},

/* 2 ── PORTEFEUILLE PROJETS ──────────────────────────── */
projects: { title:"Portefeuille projets", render() { return `<div class="pw">
${phdr("Portefeuille projets","12 projets · 5 en cours · 2 en retard",["Projets"],
  btn("Nouveau projet","btn-p","plus"))}
<div class="fb">
  <select class="fsel"><option>Tous les statuts</option><option>En cours</option><option>En retard</option><option>Terminé</option></select>
  <select class="fsel"><option>Toutes priorités</option><option>Critique</option><option>Vital</option><option>Normal</option></select>
  <select class="fsel"><option>Tous responsables</option><option>S. Martin</option><option>P. Dupont</option><option>J. Lambert</option></select>
  <input class="finput" placeholder="Rechercher un projet…">
  <div class="fsp"></div>
  <a class="cl" href="scenario.html">Vue Scénario →</a>
</div>
<div class="stat-strip">
  <span class="chip">12 projets</span>
  <span class="chip" style="color:var(--brand-gold-700)">5 en cours</span>
  <span class="chip" style="color:var(--state-danger)">2 en retard</span>
  <span class="chip" style="color:var(--state-success)">3 terminés</span>
</div>
<div class="card"><div class="tw"><table class="dt"><thead><tr>
  <th>Projet</th><th>Statut</th><th>Priorité</th><th>Budget</th><th>Avancement</th><th>Responsable</th><th>Échéance</th>
</tr></thead><tbody>
  <tr><td class="n">Remplacement SI RH</td><td>${badge('En cours','ba')}</td><td>${badge('Vital','br')}</td><td>206 j</td><td><div style="display:flex;align-items:center;gap:8px">${prog(74)}<span>74 %</span></div></td><td>S. Martin</td><td>31 juil. 2026</td></tr>
  <tr><td class="n">Migration Cloud Azure</td><td>${badge('En cours','ba')}</td><td>${badge('Normal','bn')}</td><td>120 j</td><td><div style="display:flex;align-items:center;gap:8px">${prog(45,'warn')}<span>45 %</span></div></td><td>P. Dupont</td><td>30 sep. 2026</td></tr>
  <tr><td class="n">Conformité DORA</td><td>${badge('En retard','br')}</td><td>${badge('Critique','br')}</td><td>85 j</td><td><div style="display:flex;align-items:center;gap:8px">${prog(33,'bad')}<span>33 %</span></div></td><td>S. Martin</td><td>30 juin 2026</td></tr>
  <tr><td class="n">Projet CRM</td><td>${badge('En cours','ba')}</td><td>${badge('Élevé','bw')}</td><td>90 j</td><td><div style="display:flex;align-items:center;gap:8px">${prog(62)}<span>62 %</span></div></td><td>J. Lambert</td><td>15 juin 2026</td></tr>
  <tr><td class="n">Refonte Intranet</td><td>${badge('En retard','br')}</td><td>${badge('Normal','bn')}</td><td>60 j</td><td><div style="display:flex;align-items:center;gap:8px">${prog(18,'bad')}<span>18 %</span></div></td><td>M. Clermont</td><td>28 fév. 2026</td></tr>
  <tr><td class="n">Modernisation réseau</td><td>${badge('Terminé','bs')}</td><td>${badge('Normal','bn')}</td><td>75 j</td><td><div style="display:flex;align-items:center;gap:8px">${prog(100)}<span>100 %</span></div></td><td>P. Dupont</td><td>31 mars 2026</td></tr>
  <tr><td class="n">ERP Finance</td><td>${badge('En réflexion','bi')}</td><td>${badge('Vital','br')}</td><td>—</td><td><div style="display:flex;align-items:center;gap:8px">${prog(0,'warn')}<span>0 %</span></div></td><td>—</td><td>À définir</td></tr>
  <tr><td class="n">Cybersécurité SOC</td><td>${badge('En cours','ba')}</td><td>${badge('Élevé','bw')}</td><td>130 j</td><td><div style="display:flex;align-items:center;gap:8px">${prog(55)}<span>55 %</span></div></td><td>S. Martin</td><td>31 oct. 2026</td></tr>
</tbody></table></div></div></div>`;}},

/* 3 ── BUDGETS ───────────────────────────────────────── */
budget: { title:"Budgets & finances", render() { return `<div class="pw">
${phdr("Budgets & finances","Exercice 2026 · Innovatech SA",["Finances","Budgets"],
  btn("Exporter","btn-s","download") + btn("Nouvel exercice","btn-p","plus"))}
<div class="kgrid">
  ${kpi('wallet',"Budget prévu","4 200 000 €","Exercice 2026",'neu')}
  ${kpi('briefcase',"Engagé","3 100 000 €","74 % du prévu",'warn')}
  ${kpi('arrow-up',"Consommé","2 340 000 €","56 % du prévu",'ok')}
  ${kpi('alert-triangle',"Écart prévisionnel","+158 000 €","Dépassement estimé",'bad')}
</div>
<div class="card mb14"><div class="ct">Enveloppes budgétaires <a class="cl">Voir le détail</a></div>
<div class="tw"><table class="dt"><thead><tr><th>Enveloppe</th><th>Prévu</th><th>Engagé</th><th>Consommé</th><th>Avancement</th><th>Statut</th></tr></thead><tbody>
  <tr><td class="n">Infrastructure Cloud</td><td>1 200 000 €</td><td>890 000 €</td><td>740 000 €</td><td><div style="display:flex;align-items:center;gap:8px">${prog(62)}<span>62 %</span></div></td><td>${badge('OK','bs')}</td></tr>
  <tr><td class="n">Licences logicielles</td><td>650 000 €</td><td>612 000 €</td><td>590 000 €</td><td><div style="display:flex;align-items:center;gap:8px">${prog(91,'warn')}<span>91 %</span></div></td><td>${badge('Attention','bw')}</td></tr>
  <tr><td class="n">Projets de transformation</td><td>1 800 000 €</td><td>1 398 000 €</td><td>840 000 €</td><td><div style="display:flex;align-items:center;gap:8px">${prog(47)}<span>47 %</span></div></td><td>${badge('OK','bs')}</td></tr>
  <tr><td class="n">Formation & RH</td><td>350 000 €</td><td>200 000 €</td><td>170 000 €</td><td><div style="display:flex;align-items:center;gap:8px">${prog(49)}<span>49 %</span></div></td><td>${badge('OK','bs')}</td></tr>
  <tr><td class="n">Sécurité & conformité</td><td>200 000 €</td><td>0 €</td><td>0 €</td><td><div style="display:flex;align-items:center;gap:8px">${prog(0,'warn')}<span>0 %</span></div></td><td>${badge('Non démarré','bn')}</td></tr>
</tbody></table></div></div>
<div class="g2">
  <div class="card"><div class="ct">Instantanés (snapshots)</div>
    <div class="ali"><div class="alib"><div class="alit">Budget initial 2026</div><div class="alim">3 janv. 2026 · Figé</div></div>${badge('Référence','bi')}</div>
    <div class="ali"><div class="alib"><div class="alit">Révision T1 2026</div><div class="alim">31 mars 2026 · Figé</div></div>${badge('Archivé','bn')}</div>
    <div class="ali"><div class="alib"><div class="alit">Révision T2 2026</div><div class="alim">En cours</div></div>${badge('En cours','ba')}</div>
  </div>
  <div class="card"><div class="ct">Dernières transactions</div>
    <div class="ali"><div class="alib"><div class="alit">Facture Microsoft #INV-20241</div><div class="alim">48 000 € · Licences · 2 juin 2026</div></div></div>
    <div class="ali"><div class="alib"><div class="alit">Bon de commande Capgemini</div><div class="alim">120 000 € · Projets · 28 mai 2026</div></div></div>
    <div class="ali"><div class="alib"><div class="alit">Facture Orange Business</div><div class="alim">12 400 € · Infrastructure · 25 mai 2026</div></div></div>
  </div>
</div></div>`;}},

/* 4 ── FOURNISSEURS ──────────────────────────────────── */
suppliers: { title:"Achats & fournisseurs", render() { return `<div class="pw">
${phdr("Achats & fournisseurs","6 fournisseurs actifs · 18 commandes en cours",["Finances","Achats & fournisseurs"],
  btn("Nouveau fournisseur","btn-p","plus"))}
<div id="supwrap">
<div class="ptabs">
  <div class="ptab active" data-tab="sup" onclick="switchTab('supwrap','sup')">Fournisseurs</div>
  <div class="ptab" data-tab="cmd" onclick="switchTab('supwrap','cmd')">Commandes (18)</div>
  <div class="ptab" data-tab="fac" onclick="switchTab('supwrap','fac')">Factures (34)</div>
</div>
<div class="tab-pane" data-pane="sup">
<div class="sg">
  <div class="sc"><div class="slog">MSFT</div><div class="sn">Microsoft</div><div class="scat">Éditeur logiciel · Cloud</div><div class="sm"><span>6 contrats actifs</span><span>4 commandes</span></div></div>
  <div class="sc"><div class="slog">AWS</div><div class="sn">Amazon Web Services</div><div class="scat">Hébergement cloud</div><div class="sm"><span>2 contrats actifs</span><span>1 commande</span></div></div>
  <div class="sc"><div class="slog">SFSF</div><div class="sn">Salesforce</div><div class="scat">CRM · Éditeur</div><div class="sm"><span>1 contrat actif</span><span>2 commandes</span></div></div>
  <div class="sc"><div class="slog">OBS</div><div class="sn">Orange Business Services</div><div class="scat">Télécoms · Réseau</div><div class="sm"><span>3 contrats actifs</span><span>5 commandes</span></div></div>
  <div class="sc"><div class="slog">CAP</div><div class="sn">Capgemini</div><div class="scat">SSII · Conseil IT</div><div class="sm"><span>1 contrat actif</span><span>3 commandes</span></div></div>
  <div class="sc"><div class="slog">DEV</div><div class="sn">Devoteam</div><div class="scat">Conseil IT · Intégration</div><div class="sm"><span>2 contrats actifs</span><span>3 commandes</span></div></div>
</div></div>
<div class="tab-pane" data-pane="cmd" style="display:none"><div class="card"><div class="tw"><table class="dt"><thead><tr><th>Référence</th><th>Fournisseur</th><th>Objet</th><th>Montant HT</th><th>Statut</th><th>Date</th></tr></thead><tbody>
  <tr><td class="n">BC-2026-042</td><td>Capgemini</td><td>TMA SI RH — T2</td><td>120 000 €</td><td>${badge('Approuvé','bs')}</td><td>28 mai 2026</td></tr>
  <tr><td class="n">BC-2026-039</td><td>Microsoft</td><td>Licences Microsoft 365</td><td>48 000 €</td><td>${badge('Approuvé','bs')}</td><td>2 juin 2026</td></tr>
  <tr><td class="n">BC-2026-035</td><td>Devoteam</td><td>Audit sécurité SI</td><td>32 000 €</td><td>${badge('En attente','bw')}</td><td>20 mai 2026</td></tr>
  <tr><td class="n">BC-2026-031</td><td>AWS</td><td>Infra Cloud — batch migration</td><td>18 500 €</td><td>${badge('En cours','ba')}</td><td>15 mai 2026</td></tr>
</tbody></table></div></div></div>
<div class="tab-pane" data-pane="fac" style="display:none"><div class="card"><div class="tw"><table class="dt"><thead><tr><th>N° Facture</th><th>Fournisseur</th><th>Commande</th><th>Montant</th><th>Statut</th><th>Échéance</th></tr></thead><tbody>
  <tr><td class="n">INV-20241</td><td>Microsoft</td><td>BC-2026-039</td><td>48 000 €</td><td>${badge('Reçue','bs')}</td><td>30 juin 2026</td></tr>
  <tr><td class="n">INV-20238</td><td>Capgemini</td><td>BC-2026-042</td><td>60 000 €</td><td>${badge('À valider','bw')}</td><td>15 juin 2026</td></tr>
  <tr><td class="n">INV-20235</td><td>Orange Business</td><td>BC-2026-028</td><td>12 400 €</td><td>${badge('Payée','bn')}</td><td>Clôturée</td></tr>
</tbody></table></div></div></div>
</div></div>`;}},

/* 5 ── CONTRATS ──────────────────────────────────────── */
contracts: { title:"Contrats & licences", render() { return `<div class="pw">
${phdr("Contrats & licences","14 contrats actifs · 3 alertes d'échéance",["Finances","Contrats & licences"],
  btn("Nouveau contrat","btn-p","plus"))}
<div id="contwrap">
<div class="ptabs">
  <div class="ptab active" data-tab="ct" onclick="switchTab('contwrap','ct')">Contrats (14)</div>
  <div class="ptab" data-tab="lic" onclick="switchTab('contwrap','lic')">Licences logicielles (22)</div>
</div>
<div class="tab-pane" data-pane="ct"><div class="card"><div class="tw"><table class="dt"><thead><tr>
  <th>Contrat</th><th>Fournisseur</th><th>Type</th><th>Début</th><th>Fin</th><th>Montant</th><th>Statut</th>
</tr></thead><tbody>
  <tr><td class="n">Microsoft EA 2024–2027</td><td>Microsoft</td><td>Licence</td><td>1 janv. 2024</td><td>31 déc. 2026</td><td>144 000 €/an</td><td>${badge('Actif','bs')}</td></tr>
  <tr><td class="n">Azure — Cloud Services</td><td>Microsoft</td><td>SaaS</td><td>1 janv. 2025</td><td>31 déc. 2025</td><td>18 000 €/an</td><td>${badge('Expire bientôt','br')}</td></tr>
  <tr><td class="n">TMA Capgemini 2026</td><td>Capgemini</td><td>Prestation</td><td>1 janv. 2026</td><td>31 déc. 2026</td><td>480 000 €</td><td>${badge('Actif','bs')}</td></tr>
  <tr><td class="n">Salesforce CRM</td><td>Salesforce</td><td>SaaS</td><td>15 mars 2025</td><td>14 mars 2026</td><td>36 000 €/an</td><td>${badge('Expire bientôt','br')}</td></tr>
  <tr><td class="n">Connexion MPLS OBS</td><td>Orange Business</td><td>Télécom</td><td>1 avr. 2023</td><td>31 mars 2026</td><td>24 000 €/an</td><td>${badge('Expire bientôt','br')}</td></tr>
  <tr><td class="n">Audit sécurité Devoteam</td><td>Devoteam</td><td>Conseil</td><td>1 mai 2026</td><td>31 août 2026</td><td>32 000 €</td><td>${badge('Actif','bs')}</td></tr>
</tbody></table></div></div></div>
<div class="tab-pane" data-pane="lic" style="display:none"><div class="card"><div class="tw"><table class="dt"><thead><tr>
  <th>Logiciel</th><th>Éditeur</th><th>Contrat lié</th><th>Qté</th><th>Renouvellement</th><th>Statut</th>
</tr></thead><tbody>
  <tr><td class="n">Microsoft 365 Business</td><td>Microsoft</td><td>Microsoft EA 2024–2027</td><td>120 sièges</td><td>31 déc. 2026</td><td>${badge('Actif','bs')}</td></tr>
  <tr><td class="n">Azure AD P1</td><td>Microsoft</td><td>Azure Cloud Services</td><td>120 sièges</td><td>31 déc. 2025</td><td>${badge('Expire bientôt','br')}</td></tr>
  <tr><td class="n">Salesforce Sales Cloud</td><td>Salesforce</td><td>Salesforce CRM</td><td>45 sièges</td><td>14 mars 2026</td><td>${badge('Expire bientôt','br')}</td></tr>
  <tr><td class="n">Jira Software</td><td>Atlassian</td><td>—</td><td>30 sièges</td><td>30 sep. 2026</td><td>${badge('Actif','bs')}</td></tr>
</tbody></table></div></div></div>
</div></div>`;}},

/* 6 ── RISQUES ───────────────────────────────────────── */
risks: { title:"Risques & plans d'action", render() { return `<div class="pw">
${phdr("Risques & plans d'action","17 risques identifiés · 3 critiques",["Projets","Risques & plans d'action"],
  btn("Nouveau risque","btn-p","plus"))}
<div class="kgrid">
  ${kpi('alert-triangle',"Risques critiques","3","Sans plan d'action : 1",'bad')}
  ${kpi('alert-triangle',"Risques élevés","7","2 nouveaux ce mois",'warn')}
  ${kpi('shield-check',"Plans d'action","5","En cours",'ok')}
  ${kpi('arrow-down',"Risques résiduels","17","7 réduits ce trimestre",'neu')}
</div>
<div class="ms">
  <div class="card"><div class="ct">Registre des risques</div>
  <div class="fb" style="margin-bottom:10px">
    <select class="fsel"><option>Tous statuts</option><option>Ouvert</option><option>En traitement</option></select>
    <select class="fsel"><option>Toute criticité</option><option>Critique</option><option>Élevé</option><option>Moyen</option></select>
  </div>
  <div class="tw"><table class="dt"><thead><tr><th>Risque</th><th>Domaine</th><th>Probabilité</th><th>Impact</th><th>Score</th><th>Propriétaire</th><th>Statut</th></tr></thead><tbody>
    <tr><td class="n">Cyberattaque / ransomware</td><td>Sécurité</td><td>${badge('Élevé','br')}</td><td>${badge('Critique','br')}</td><td style="font-weight:700;color:var(--state-danger)">20</td><td>S. Martin</td><td>${badge('Ouvert','br')}</td></tr>
    <tr><td class="n">Perte de données RH</td><td>Données</td><td>${badge('Moyen','bw')}</td><td>${badge('Critique','br')}</td><td style="font-weight:700;color:var(--state-danger)">15</td><td>M. Clermont</td><td>${badge('En traitement','ba')}</td></tr>
    <tr><td class="n">Non-conformité DORA</td><td>Conformité</td><td>${badge('Moyen','bw')}</td><td>${badge('Critique','br')}</td><td style="font-weight:700;color:var(--state-danger)">15</td><td>S. Martin</td><td>${badge('En traitement','ba')}</td></tr>
    <tr><td class="n">Dépassement budget SI RH</td><td>Financier</td><td>${badge('Élevé','br')}</td><td>${badge('Élevé','bw')}</td><td style="font-weight:700;color:var(--state-warning)">12</td><td>J. Lambert</td><td>${badge('En traitement','ba')}</td></tr>
    <tr><td class="n">Défaillance fournisseur cloud</td><td>Infrastructure</td><td>${badge('Faible','bs')}</td><td>${badge('Élevé','bw')}</td><td style="font-weight:700;color:var(--state-warning)">8</td><td>P. Dupont</td><td>${badge('Ouvert','bn')}</td></tr>
    <tr><td class="n">Retard projet CRM</td><td>Projets</td><td>${badge('Élevé','br')}</td><td>${badge('Moyen','bw')}</td><td style="font-weight:700;color:var(--brand-gold-700)">9</td><td>J. Lambert</td><td>${badge('En traitement','ba')}</td></tr>
  </tbody></table></div></div>
  <div class="vstack">
    <div class="card"><div class="ct">Plans d'action actifs</div>
      <div class="ali"><div class="alid crit"></div><div class="alib"><div class="alit">Plan de réponse cyber</div><div class="alim">Risque : Cyberattaque · 3 tâches · 0 % complété</div></div></div>
      <div class="ali"><div class="alid warn"></div><div class="alib"><div class="alit">Remédiation DORA</div><div class="alim">Risque : Non-conformité DORA · 8 tâches · 33 %</div></div></div>
      <div class="ali"><div class="alid warn"></div><div class="alib"><div class="alit">Sauvegarde données RH</td><div class="alim">Risque : Perte données · 4 tâches · 75 %</div></div></div>
    </div>
    <div class="card"><div class="ct">Matrice de criticité</div>
      <div style="display:grid;grid-template-columns:auto repeat(4,1fr);gap:3px;font-size:10.5px">
        <div style="color:var(--fg-4);padding:4px 0"></div>
        <div style="text-align:center;color:var(--fg-3);padding:4px;font-weight:600">Faible</div>
        <div style="text-align:center;color:var(--fg-3);padding:4px;font-weight:600">Moyen</div>
        <div style="text-align:center;color:var(--fg-3);padding:4px;font-weight:600">Élevé</div>
        <div style="text-align:center;color:var(--fg-3);padding:4px;font-weight:600">Critique</div>
        ${[['Élevé','2','4','9','20'],['Moyen','1','3','6','15'],['Faible','1','2','4','8']].map(([lbl,...vals])=>
          `<div style="color:var(--fg-3);padding:4px 6px 4px 0;text-align:right;font-weight:600">${lbl}</div>`+
          vals.map((v,i)=>{const bg=i===0?'var(--neutral-100)':i===1?'var(--state-warning-bg)':i===2?'var(--state-danger-bg)':'var(--state-danger)';const c=i===3?'#fff':'';return `<div style="background:${bg};color:${c};border-radius:5px;padding:8px;text-align:center;font-weight:700">${v}</div>`}).join('')
        ).join('')}
      </div>
    </div>
  </div>
</div></div>`;}},

/* 7 ── ÉQUIPES ───────────────────────────────────────── */
teams: { title:"Équipes & ressources", render() { return `<div class="pw">
${phdr("Équipes & ressources","68 collaborateurs · 9 équipes",["Ressources","Équipes & ressources"],
  btn("Exporter","btn-s","download") + btn("Nouvelle équipe","btn-p","plus"))}
<div id="teamwrap">
<div class="ptabs">
  <div class="ptab active" data-tab="eq" onclick="switchTab('teamwrap','eq')">Équipes (9)</div>
  <div class="ptab" data-tab="col" onclick="switchTab('teamwrap','col')">Collaborateurs (68)</div>
  <div class="ptab" data-tab="temps" onclick="switchTab('teamwrap','temps')">Feuilles de temps</div>
</div>
<div class="tab-pane" data-pane="eq">
<div class="card"><div class="tw"><table class="dt"><thead><tr><th>Équipe</th><th>Responsable</th><th>Membres</th><th>Capacité / trim.</th><th>Chargée</th><th>Statut</th></tr></thead><tbody>
  <tr><td class="n">Direction opération</td><td>S. Martin</td><td>12</td><td>60 j</td><td><div style="display:flex;align-items:center;gap:8px">${prog(83,'warn')}<span>83 %</span></div></td><td>${badge('Chargée','bw')}</td></tr>
  <tr><td class="n">Études & développement</td><td>P. Dupont</td><td>7</td><td>35 j</td><td><div style="display:flex;align-items:center;gap:8px">${prog(60)}<span>60 %</span></div></td><td>${badge('Disponible','bs')}</td></tr>
  <tr><td class="n">Infrastructure & exploitation</td><td>L. Petit</td><td>5</td><td>25 j</td><td><div style="display:flex;align-items:center;gap:8px">${prog(100,'bad')}<span>100 %</span></div></td><td>${badge('Saturée','br')}</td></tr>
  <tr><td class="n">Direction Transformation</td><td>S. Martin</td><td>11</td><td>55 j</td><td><div style="display:flex;align-items:center;gap:8px">${prog(55)}<span>55 %</span></div></td><td>${badge('Disponible','bs')}</td></tr>
  <tr><td class="n">PMO / Portefeuille</td><td>J. Lambert</td><td>6</td><td>30 j</td><td><div style="display:flex;align-items:center;gap:8px">${prog(100,'bad')}<span>100 %</span></div></td><td>${badge('Saturée','br')}</td></tr>
  <tr><td class="n">IT Sécurité</td><td>A. Roux</td><td>15</td><td>75 j</td><td><div style="display:flex;align-items:center;gap:8px">${prog(92,'warn')}<span>92 %</span></div></td><td>${badge('Chargée','bw')}</td></tr>
  <tr><td class="n">Marketing - data</td><td>M. Clermont</td><td>9</td><td>45 j</td><td><div style="display:flex;align-items:center;gap:8px">${prog(44)}<span>44 %</span></div></td><td>${badge('Disponible','bs')}</td></tr>
</tbody></table></div></div>
<div style="margin-top:10px"><a class="btn btn-s" href="scenario.html">Voir la vue Scénario de capacité →</a></div>
</div>
<div class="tab-pane" data-pane="col" style="display:none"><div class="fb">
  <select class="fsel"><option>Toutes équipes</option><option>Direction opération</option><option>IT Sécurité</option></select>
  <input class="finput" placeholder="Rechercher un collaborateur…">
</div>
<div class="card"><div class="tw"><table class="dt"><thead><tr><th>Collaborateur</th><th>Équipe</th><th>Rôle</th><th>Compétences</th><th>Disponibilité</th></tr></thead><tbody>
  <tr><td class="n">Sophie Martin</td><td>Direction opération</td><td>DSI</td><td>${badge('Architecture','bi')} ${badge('Gouvernance','bp')}</td><td>${badge('80 %','bs')}</td></tr>
  <tr><td class="n">Paul Dupont</td><td>Études & développement</td><td>Dev lead</td><td>${badge('Java','bi')} ${badge('Cloud','bp')}</td><td>${badge('60 %','bw')}</td></tr>
  <tr><td class="n">Jean Lambert</td><td>PMO / Portefeuille</td><td>Chef de projet</td><td>${badge('PRINCE2','bi')} ${badge('Agile','bp')}</td><td>${badge('20 %','br')}</td></tr>
  <tr><td class="n">Marie Clermont</td><td>Marketing - data</td><td>Data analyst</td><td>${badge('SQL','bi')} ${badge('Power BI','bp')}</td><td>${badge('100 %','bs')}</td></tr>
</tbody></table></div></div></div>
<div class="tab-pane" data-pane="temps" style="display:none"><div class="card"><div class="ct">Feuilles de temps — Juin 2026</div>
<div class="tw"><table class="dt"><thead><tr><th>Collaborateur</th><th>Jours saisis</th><th>Jours validés</th><th>Statut</th><th>Action</th></tr></thead><tbody>
  <tr><td class="n">Sophie Martin</td><td>18 j</td><td>18 j</td><td>${badge('Validé','bs')}</td><td><button class="btn btn-sm btn-s">Voir</button></td></tr>
  <tr><td class="n">Paul Dupont</td><td>20 j</td><td>0 j</td><td>${badge('À valider','bw')}</td><td><button class="btn btn-sm btn-p">Valider</button></td></tr>
  <tr><td class="n">Jean Lambert</td><td>15 j</td><td>0 j</td><td>${badge('Soumis','bi')}</td><td><button class="btn btn-sm btn-p">Valider</button></td></tr>
  <tr><td class="n">Marie Clermont</td><td>0 j</td><td>0 j</td><td>${badge('Brouillon','bn')}</td><td><button class="btn btn-sm btn-s">Rappeler</button></td></tr>
</tbody></table></div></div></div>
</div></div>`;}},

/* 8 ── CONFORMITÉ ────────────────────────────────────── */
compliance: { title:"Conformité", render() { return `<div class="pw">
${phdr("Conformité","3 référentiels actifs · 24 écarts à traiter",["Gouvernance","Conformité"],
  btn("Rapport comité","btn-s","download") + btn("Évaluer","btn-p","edit"))}
<div class="g3 mb14">
  <div class="fwcard"><div class="fwh"><div><div class="fwn">ISO 27001</div><div class="fwm" style="margin-top:2px">42 / 58 exigences</div></div><div class="fwp">72 %</div></div><div class="fwt"><div class="fwf" style="width:72%"></div></div><div class="fwm">16 écarts · 4 critiques</div></div>
  <div class="fwcard"><div class="fwh"><div><div class="fwn">DORA</div><div class="fwm" style="margin-top:2px">18 / 40 exigences</div></div><div class="fwp" style="color:var(--state-danger)">45 %</div></div><div class="fwt"><div class="fwf" style="width:45%;background:var(--state-danger)"></div></div><div class="fwm">22 écarts · 8 critiques</div></div>
  <div class="fwcard"><div class="fwh"><div><div class="fwn">NIS 2</div><div class="fwm" style="margin-top:2px">31 / 52 exigences</div></div><div class="fwp" style="color:var(--brand-gold-700)">60 %</div></div><div class="fwt"><div class="fwf" style="width:60%;background:var(--brand-gold)"></div></div><div class="fwm">21 écarts · 5 critiques</div></div>
</div>
<div class="card"><div class="ct">Écarts critiques à traiter <a class="cl">Voir tous les écarts</a></div>
<div class="tw"><table class="dt"><thead><tr><th>Exigence</th><th>Référentiel</th><th>Statut</th><th>Plan d'action</th><th>Priorité</th></tr></thead><tbody>
  <tr><td class="n">Art. 9 — Tests de résilience opérationnelle</td><td>DORA</td><td>${badge('Non conforme','br')}</td><td>${badge('À créer','bn')}</td><td>${badge('Critique','br')}</td></tr>
  <tr><td class="n">Art. 17 — Registre incidents ICT</td><td>DORA</td><td>${badge('Non conforme','br')}</td><td>${badge('En cours','ba')}</td><td>${badge('Critique','br')}</td></tr>
  <tr><td class="n">A.12.3 — Sauvegarde données</td><td>ISO 27001</td><td>${badge('Partiel','bw')}</td><td>${badge('En cours','ba')}</td><td>${badge('Élevé','bw')}</td></tr>
  <tr><td class="n">Mesure 8 — Sécurité chaîne d'approvisionnement</td><td>NIS 2</td><td>${badge('Non conforme','br')}</td><td>${badge('À créer','bn')}</td><td>${badge('Critique','br')}</td></tr>
  <tr><td class="n">A.18.1 — Exigences légales</td><td>ISO 27001</td><td>${badge('Partiel','bw')}</td><td>${badge('Planifié','bi')}</td><td>${badge('Moyen','bn')}</td></tr>
</tbody></table></div></div></div>`;}},

/* 9 ── CYCLES DE PILOTAGE ────────────────────────────── */
cycles: { title:"Cycles de pilotage", render() { return `<div class="pw">
${phdr("Cycles de pilotage","CODIR T2 2026 en cours · 8 sujets candidats",["Gouvernance","Cycles de pilotage"],
  btn("Nouveau cycle","btn-p","plus"))}
<div class="cycle-header">
  <div>${I['refresh-cw']}</div>
  <div style="flex:1"><div style="font-size:15px;font-weight:700;color:var(--fg-1)">CODIR T2 2026</div><div style="font-size:12px;color:var(--fg-3)">Arbitrage trimestriel · Séance prévue le 30 juin 2026</div></div>
  <div class="stat-strip" style="margin:0">
    <span class="chip">8 candidatures</span>
    <span class="chip" style="color:var(--state-success)">3 acceptés</span>
    <span class="chip" style="color:var(--brand-gold-700)">2 différés</span>
    <span class="chip" style="color:var(--state-danger)">1 refusé</span>
  </div>
  <button class="btn btn-p">Ouvrir la séance</button>
</div>
<div class="card"><div class="ct">Matrice d'arbitrage</div>
<div class="tw"><table class="dt"><thead><tr>
  <th>Projet / Sujet</th><th>Valeur métier</th><th>Alignement strat.</th><th>Budget</th><th>Capacité</th><th>Risque</th><th>Score</th><th>Décision</th>
</tr></thead><tbody>
  <tr><td class="n">Migration Cloud Azure</td><td>⬤⬤⬤⬤⬤</td><td>⬤⬤⬤⬤○</td><td>⬤⬤⬤○○</td><td>⬤⬤⬤⬤○</td><td>⬤⬤○○○</td><td style="font-weight:700;color:var(--state-success)">78</td><td>${badge('Accepté','bs')}</td></tr>
  <tr><td class="n">Conformité DORA</td><td>⬤⬤⬤⬤○</td><td>⬤⬤⬤⬤⬤</td><td>⬤⬤⬤⬤○</td><td>⬤⬤⬤○○</td><td>⬤⬤⬤⬤⬤</td><td style="font-weight:700;color:var(--state-success)">88</td><td>${badge('Accepté','bs')}</td></tr>
  <tr><td class="n">ERP Finance</td><td>⬤⬤⬤⬤○</td><td>⬤⬤⬤○○</td><td>⬤○○○○</td><td>⬤○○○○</td><td>⬤⬤⬤○○</td><td style="font-weight:700;color:var(--brand-gold-700)">52</td><td>${badge('Différé','bw')}</td></tr>
  <tr><td class="n">Refonte portail RH</td><td>⬤⬤⬤○○</td><td>⬤⬤⬤○○</td><td>⬤⬤⬤○○</td><td>⬤⬤○○○</td><td>⬤⬤○○○</td><td style="font-weight:700;color:var(--brand-gold-700)">58</td><td>${badge('Différé','bw')}</td></tr>
  <tr><td class="n">Extension datacenter</td><td>⬤⬤○○○</td><td>⬤⬤○○○</td><td>⬤○○○○</td><td>⬤○○○○</td><td>⬤⬤⬤⬤○</td><td style="font-weight:700;color:var(--state-danger)">32</td><td>${badge('Refusé','br')}</td></tr>
  <tr><td class="n">Cybersécurité SOC</td><td>⬤⬤⬤⬤⬤</td><td>⬤⬤⬤⬤⬤</td><td>⬤⬤⬤○○</td><td>⬤⬤⬤○○</td><td>⬤⬤⬤⬤⬤</td><td style="font-weight:700;color:var(--state-success)">85</td><td>${badge('Accepté','bs')}</td></tr>
</tbody></table></div></div></div>`;}},

/* 10 ── DEMANDES PROJET ──────────────────────────────── */
requests: { title:"Demandes projet", render() { return `<div class="pw">
${phdr("Demandes projet","12 demandes · 5 en attente de validation",["Projets","Demandes projet"],
  btn("Nouvelle demande","btn-p","plus"))}
<div class="kanban">
  <div class="kcol"><div class="kch">Brouillon <span class="kcnt">3</span></div>
    <div class="kcard"><div class="kct">Modernisation téléphonie IP</div><div class="kcm"><span>120 j est.</span>${badge('Normal','bn')}</div></div>
    <div class="kcard"><div class="kct">Outil de gestion documentaire</div><div class="kcm"><span>60 j est.</span>${badge('Normal','bn')}</div></div>
    <div class="kcard"><div class="kct">Automatisation reporting</div><div class="kcm"><span>45 j est.</span>${badge('Normal','bn')}</div></div>
  </div>
  <div class="kcol"><div class="kch">Soumis <span class="kcnt">4</span></div>
    <div class="kcard"><div class="kct">ERP Finance — cadrage</div><div class="kcm"><span>200 j est.</span>${badge('Vital','br')}</div></div>
    <div class="kcard"><div class="kct">Refonte portail RH</div><div class="kcm"><span>90 j est.</span>${badge('Élevé','bw')}</div></div>
    <div class="kcard"><div class="kct">Supervision réseau avancée</div><div class="kcm"><span>30 j est.</span>${badge('Normal','bn')}</div></div>
    <div class="kcard"><div class="kct">Chatbot support IT</div><div class="kcm"><span>75 j est.</span>${badge('Normal','bn')}</div></div>
  </div>
  <div class="kcol"><div class="kch">En révision <span class="kcnt">2</span></div>
    <div class="kcard"><div class="kct">Migration data warehouse</div><div class="kcm"><span>120 j est.</span>${badge('Vital','br')}</div></div>
    <div class="kcard"><div class="kct">Intégration SSO</div><div class="kcm"><span>40 j est.</span>${badge('Normal','bn')}</div></div>
  </div>
  <div class="kcol"><div class="kch">Approuvé <span class="kcnt">2</span></div>
    <div class="kcard" style="border-left:3px solid var(--state-success)"><div class="kct">Extension datacenter T3</div><div class="kcm"><span>180 j est.</span>${badge('Vital','br')}</div></div>
    <div class="kcard" style="border-left:3px solid var(--state-success)"><div class="kct">Sécurisation accès VPN</div><div class="kcm"><span>25 j est.</span>${badge('Élevé','bw')}</div></div>
  </div>
  <div class="kcol"><div class="kch">Refusé <span class="kcnt">1</span></div>
    <div class="kcard" style="opacity:.5"><div class="kct">Application mobile collaborateurs</div><div class="kcm"><span>150 j est.</span>${badge('Normal','bn')}</div></div>
  </div>
</div></div>`;}},

/* 11 ── VISION STRATÉGIQUE ───────────────────────────── */
strategy: { title:"Vision stratégique", render() { return `<div class="pw">
${phdr("Vision stratégique","Horizon 2026–2028 · Innovatech SA",["Gouvernance","Vision stratégique"],
  btn("Voir le tableau de bord complet","btn-s","external") + btn("Modifier la vision","btn-p","edit"))}
<div class="card mb14"><div class="ct">Vision de l'organisation</div>
  <div class="vision-q">Devenir la DSI de référence pour les ETI de la région, en délivrant une infrastructure IT sécurisée, agile et alignée sur les ambitions de croissance de nos organisations clientes, tout en maîtrisant les risques et les coûts.</div>
  <div style="display:flex;gap:8px;margin-top:14px">
    ${badge('Horizon 2028','ba')} ${badge('Validé par le CODIR','bs')} ${badge('Version 3.1','bn')}
  </div>
</div>
<div class="kgrid" style="grid-template-columns:repeat(4,1fr)">
  ${kpi('target',"Score d'alignement global","82 %","↑ 6 pts vs T1 2025",'ok')}
  ${kpi('briefcase',"Axes stratégiques","4","100 % couverts",'neu')}
  ${kpi('shield-check',"Objectifs en trajectoire","14 / 18","78 %",'ok')}
  ${kpi('alert-triangle',"Alertes désalignement","3","Dont 1 critique",'warn')}
</div>
<div style="margin-bottom:8px;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--fg-3)">4 axes stratégiques</div>
<div class="g4">
  ${[['Performance opérationnelle','trending',85,'ok'],['Transformation digitale','briefcase',72,'ok'],['Maîtrise des risques','shield-check',65,'warn'],['Développement humain','users',80,'ok']].map(([n,ico,p,c])=>`
  <div class="card"><div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px"><div><div style="font-size:13px;font-weight:700;color:var(--fg-1);margin-bottom:4px">${n}</div>${badge(p>75?'En trajectoire':'Attention requise',p>75?'bs':'bw')}</div><div style="font:700 22px/1 var(--font-display);letter-spacing:-.02em;color:${c==='ok'?'var(--state-success)':'var(--brand-gold-700)'}">${p} %</div></div>${prog(p,c)}</div>`).join('')}
</div></div>`;}},

/* 12 ── PARAMÈTRES ───────────────────────────────────── */
settings: { title:"Paramètres", render() { const tiles = [
  ['Organisation','settings','Nom, logo, informations légales, modules activés'],
  ['Membres & accès','users','Ajouter des membres, attribuer des rôles et permissions'],
  ['Rôles & permissions','shield-check','Définir les profils d\'accès par domaine fonctionnel'],
  ['Structure organisationnelle','briefcase','Directions, services, unités et arborescence'],
  ['Intégration Microsoft 365','external','Connexion Azure AD, synchronisation Teams & Planner'],
  ['Badges & vocabulaire','edit','Personnaliser statuts, libellés et couleurs affichés'],
  ['Workflow budgétaire','wallet','Étapes de validation et délégations pour les budgets'],
  ['Workflow demandes projet','inbox','Circuit d\'approbation des demandes et routage'],
  ['Taxonomie des risques','alert-triangle','Domaines et types de risques utilisés dans le registre'],
  ['Notifications & alertes','alert-triangle','Canaux, fréquences et seuils de déclenchement'],
  ['Licences & abonnements','file-text','Sièges, périmètre et dates d\'échéance de votre abonnement'],
  ['Journal d\'audit','book-open','Historique des actions sensibles sur l\'organisation'],
]; return `<div class="pw">
${phdr("Paramètres","Hub d'administration de l'organisation",["Administration","Paramètres"])}
<div class="stgrid">
  ${tiles.map(([t,ico,d])=>`<div class="sttile"><div class="stico">${I[ico]||''}</div><div><div class="sttit">${t}</div><div class="stdesc">${d}</div></div></div>`).join('')}
</div></div>`;}},

/* 13 ── DOCUMENTATION ────────────────────────────────── */
docs: { title:"Documentation", render() { return `<div class="pw">
${phdr("Documentation","Base de connaissances Starium Orchestra",["Documentation"])}
<div class="fb"><input class="finput" placeholder="Rechercher un article…" style="max-width:480px"><div class="fsp"></div></div>
<div class="ms">
  <div class="vstack">
    <div class="card"><div class="ct">Articles populaires</div>
      ${[['Prise en main de Starium Orchestra','Guide de démarrage · 5 min'],['Comment créer un projet ?','Projets · 3 min'],['Paramétrer un budget et ses enveloppes','Budgets · 7 min'],['Comprendre les rôles et permissions','Administration · 4 min'],['Préparer une séance de CODIR','Cycles de pilotage · 6 min'],['Connecter Microsoft 365','Intégrations · 8 min']].map(([t,m])=>`<div class="ali"><div class="alib"><div class="alit">${t}</div><div class="alim">${m}</div></div>${I['chevron-right']}</div>`).join('')}
    </div>
  </div>
  <div class="vstack">
    <div class="card"><div class="ct">Catégories</div>
      ${[['Démarrage rapide','3 articles'],['Projets & scénarios','12 articles'],['Budgets & finances','9 articles'],['Fournisseurs & contrats','6 articles'],['Risques & conformité','8 articles'],['Administration','11 articles'],['Intégrations','5 articles']].map(([c,n])=>`<div class="ali"><div class="alib"><div class="alit">${c}</div><div class="alim">${n}</div></div></div>`).join('')}
    </div>
    <div class="card"><div class="ct">Besoin d'aide ?</div>
      <p style="font-size:12.5px;color:var(--fg-3);margin-bottom:14px">Vous ne trouvez pas ce que vous cherchez ?</p>
      <button class="btn btn-s" style="width:100%">Contacter le support</button>
    </div>
  </div>
</div></div>`;}},

};
