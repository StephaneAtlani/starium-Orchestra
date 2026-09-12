/* global React, Icon */

const goTo = (page) => {
  sessionStorage.setItem('orch-page', page);
  window.location.href = 'orchestra.html';
};

const Sidebar = () => {
  const items = [
    { icon: 'home',      label: "Vue d'ensemble",         page: 'dashboard' },
    { icon: 'target',    label: 'Vision stratégique',      active: true },
    { icon: 'projects',  label: 'Projets & risques',       page: 'projects' },
    { icon: 'budget',    label: 'Budgets & finances',      page: 'budget' },
    { icon: 'vendors',   label: 'Fournisseurs & contrats', page: 'suppliers' },
    { icon: 'apps',      label: 'Licences & actifs IT',    page: 'contracts' },
    { icon: 'people',    label: 'Équipes & ressources',    page: 'teams' },
    { icon: 'docs',      label: 'Documentation',           page: 'docs' },
    { icon: 'settings',  label: 'Paramètres',              page: 'settings' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <img src="../../assets/logo-horizontal-white.png" alt="Starium" />
      </div>
      <nav className="sidebar-nav">
        {items.map((item, i) => (
          <div
            key={i}
            className={'nav-item' + (item.active ? ' active' : '')}
            style={item.page ? { cursor: 'pointer' } : {}}
            onClick={item.page ? () => goTo(item.page) : undefined}
          >
            <Icon name={item.icon} size={17}/>
            <span>{item.label}</span>
          </div>
        ))}
        <div style={{ height: 8 }}/>
        <div
          className="nav-item"
          style={{ cursor: 'pointer', opacity: 0.7, fontSize: 12 }}
          onClick={() => { window.location.href = 'scenario.html'; }}
        >
          <Icon name="cycle" size={16}/>
          <span>Scénarios de capacité</span>
        </div>
      </nav>
      <div className="sidebar-user">
        <div className="av">SM</div>
        <div className="meta">
          <div className="meta-name">Sophie Martin</div>
          <div className="meta-role">DSI</div>
        </div>
        <Icon name="chevron-right" size={14}/>
      </div>
    </aside>
  );
};

window.Sidebar = Sidebar;
