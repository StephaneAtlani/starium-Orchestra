/* global React, Icon */

const Sidebar = () => {
  const sections = [
  { type: 'item', icon: 'home', label: 'Accueil' },
  { type: 'item', icon: 'dashboard', label: 'Tableau de bord' },
  { type: 'item', icon: 'building', label: 'Clients' },
  { type: 'item', icon: 'users', label: 'Utilisateurs' },
  { type: 'item', icon: 'modules', label: 'Modules' },
  { type: 'item', icon: 'logs', label: 'Audit logs' },
  { type: 'section', label: 'Gouvernance' },
  { type: 'item', icon: 'target', label: 'Vision stratégique', active: true },
  { type: 'item', icon: 'cycle', label: 'Cycles de pilotage' },
  { type: 'item', icon: 'check-target', label: 'Objectifs stratégiques' },
  { type: 'item', icon: 'risk', label: 'Risques' },
  { type: 'item', icon: 'decision', label: 'Décisions' },
  { type: 'section', label: 'Pilotage' },
  { type: 'item', icon: 'projects', label: 'Projets' },
  { type: 'item', icon: 'budget', label: 'Budgets' },
  { type: 'item', icon: 'capacity', label: 'Capacité' },
  { type: 'item', icon: 'people', label: 'Ressources' },
  { type: 'section', label: 'Référentiel' },
  { type: 'item', icon: 'vendors', label: 'Fournisseurs' },
  { type: 'item', icon: 'contracts', label: 'Contrats' },
  { type: 'item', icon: 'apps', label: 'Applications' },
  { type: 'item', icon: 'docs', label: 'Documents' }];


  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <img src={window.__resources && window.__resources.logoHorizontal ? window.__resources.logoHorizontal : "../../assets/logo-horizontal.png"} alt="Starium" />
      </div>
      <nav className="sidebar-nav">
        {sections.map((s, i) =>
        s.type === 'section' ?
        <div key={i} className="sidebar-section">{s.label}</div> :
        <div key={i} className={'nav-item' + (s.active ? ' active' : '')}>
                <Icon name={s.icon} size={18} />
                <span style={{ color: "rgba(255, 255, 255, 0.933)" }}>{s.label}</span>
              </div>
        )}
      </nav>
      <div className="sidebar-footer">
        <Icon name="chevron-right" size={16} style={{ transform: 'rotate(180deg)' }} />
        Réduire le menu
      </div>
    </aside>);

};

window.Sidebar = Sidebar;