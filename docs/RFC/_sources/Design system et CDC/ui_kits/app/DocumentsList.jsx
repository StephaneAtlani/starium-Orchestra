/* global React, Icon */

const DocumentsList = () => {
  const docs = [
    { name: 'Plan stratégique 2026.pdf', size: '2.4 Mo', date: '02/05/2024' },
    { name: 'Carte stratégique 2026.pdf', size: '1.8 Mo', date: '02/05/2024' },
    { name: 'Synthèse exécutive — Vision 2026.pdf', size: '1.2 Mo', date: '02/05/2024' },
  ];
  return (
    <div>
      {docs.map((d, i) => (
        <div key={i} className="doc">
          <div className="doc-icon">PDF</div>
          <div className="doc-body">
            <div className="doc-name">{d.name}</div>
            <div className="doc-meta">PDF · {d.size} · Mis à jour le {d.date}</div>
          </div>
          <div className="doc-action"><Icon name="download" size={18}/></div>
        </div>
      ))}
    </div>
  );
};

window.DocumentsList = DocumentsList;
