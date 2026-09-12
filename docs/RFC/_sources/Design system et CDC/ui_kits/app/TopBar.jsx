/* global React, Icon */

const TopBar = () => (
  <header className="topbar">
    <div className="client-selector">
      <div className="ring"><Icon name="building" size={18}/></div>
      <div className="meta">
        <span className="meta-label">Client actif</span>
        <span className="meta-name">Groupe Excellence</span>
      </div>
      <Icon name="chevron-down" size={16} style={{marginLeft:'auto', color:'var(--fg-3)'}}/>
    </div>

    <div className="search-bar">
      <Icon name="search" size={18}/>
      <span className="ph">Rechercher…</span>
      <span className="kbd">⌘ K</span>
    </div>

    <div className="icon-btn"><Icon name="bell" size={20}/><span className="badge-num">12</span></div>
    <div className="icon-btn"><Icon name="help" size={20}/></div>

    <div className="profile">
      <div className="av">SM</div>
      <div className="meta">
        <span className="meta-name">Sophie Martin</span>
        <span className="meta-role">Directrice Stratégie</span>
      </div>
      <Icon name="chevron-down" size={16} style={{color:'var(--fg-3)'}}/>
    </div>
  </header>
);

window.TopBar = TopBar;
