/* global React, Sidebar, TopBar, KpiCard, VisionCard, AxisCard, ObjectivesTable, AlertsList, AlignmentChart, DocumentsList, Icon */
const { useState } = React;

const App = () => {
  const [tab, setTab] = useState('overview');
  const tabs = [
    { id: 'overview', label: "Vue d'ensemble" },
    { id: 'vision', label: 'Vision entreprise' },
    { id: 'axes', label: 'Axes stratégiques' },
    { id: 'objectives', label: 'Objectifs' },
    { id: 'alignment', label: 'Alignement' },
    { id: 'alerts', label: 'Alertes' },
    { id: 'history', label: 'Historique' },
  ];

  return (
    <div className="app">
      <Sidebar/>
      <main>
        <TopBar/>
        <div className="page" data-screen-label="Vision stratégique 2026">
          <div className="breadcrumb">
            <a>Gouvernance</a>
            <Icon name="chevron-right" size={14}/>
            <a>Vision stratégique</a>
          </div>
          <div className="page-header">
            <div>
              <h1 className="page-title">
                Vision stratégique 2026
                <span className="badge b-active"><span className="dot" style={{background:'var(--brand-gold)'}}/>Active</span>
              </h1>
              <p className="page-subtitle">Définir notre cap, aligner l'organisation et créer de la valeur durable.</p>
            </div>
            <div>
              <div className="page-meta">Dernière mise à jour : 15 mai 2024</div>
              <div className="page-actions">
                <button className="btn btn-secondary"><Icon name="download" size={16}/>Exporter</button>
                <button className="btn btn-primary"><Icon name="edit" size={16}/>Modifier la vision</button>
              </div>
            </div>
          </div>

          <div className="tabs">
            {tabs.map(t => (
              <div key={t.id} className={'tab' + (tab === t.id ? ' active' : '')} onClick={() => setTab(t.id)}>
                {t.label}
              </div>
            ))}
          </div>

          <div className="kpi-grid">
            <KpiCard icon="projects"   label="Projets en cours"      value="24"      foot={<><Icon name="arrow-up" size={12}/> 12% vs mois dernier</>} footTone="positive"/>
            <KpiCard icon="budget"     label="Budget engagé"         value="12,4 M€" foot="72% du budget annuel"/>
            <KpiCard icon="people"     label="Fournisseurs actifs"   value="68"      foot="Évalués ce trimestre : 92%"/>
            <KpiCard icon="risk"       label="Risques ouverts"       value="17"      foot={<><Icon name="arrow-down" size={12}/> 8% vs mois dernier</>} footTone="negative"/>
          </div>

          <div className="main-grid">
            <div className="col-stack">
              <VisionCard/>

              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Axes stratégiques</h3>
                </div>
                <div className="axes-grid">
                  <AxisCard index={1} icon="trending"     title="Performance opérationnelle"  pct={85} status="success"/>
                  <AxisCard index={2} icon="lightbulb"    title="Transformation digitale"     pct={72} status="success"/>
                  <AxisCard index={3} icon="shield-check" title="Maîtrise des risques"        pct={65} status="warning"/>
                  <AxisCard index={4} icon="people"       title="Développement humain"        pct={80} status="success"/>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Objectifs stratégiques</h3>
                  <a className="card-link">Voir tous les objectifs ›</a>
                </div>
                <ObjectivesTable/>
              </div>
            </div>

            <div className="col-stack">
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Alertes de désalignement</h3>
                  <a className="card-link">Voir toutes</a>
                </div>
                <AlertsList/>
              </div>

              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Évolution du score d'alignement</h3>
                  <button className="chart-select">12 derniers mois <Icon name="chevron-down" size={12}/></button>
                </div>
                <AlignmentChart/>
              </div>

              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Documents clés</h3>
                  <a className="card-link">Voir tous</a>
                </div>
                <DocumentsList/>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App/>);
