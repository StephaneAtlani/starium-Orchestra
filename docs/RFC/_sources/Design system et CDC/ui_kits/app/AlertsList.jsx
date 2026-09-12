/* global React */

const AlertsList = () => {
  const items = [
    { tone: 'critical', title: 'Retard sur l\u2019objectif \u00ab Automatisation des processus \u00bb', meta: 'Axe Transformation digitale', tag: 'Critique', tagCls: 'b-danger' },
    { tone: 'high', title: 'Budget inf\u00e9rieur de 15% aux besoins estim\u00e9s', meta: 'Axe Ma\u00eetrise des risques', tag: '\u00c9lev\u00e9e', tagCls: 'b-info' },
    { tone: 'high', title: 'D\u00e9pendance fournisseur critique non ma\u00eetris\u00e9e', meta: 'Axe Ma\u00eetrise des risques', tag: '\u00c9lev\u00e9e', tagCls: 'b-info' },
  ];
  return (
    <div>
      {items.map((a, i) => (
        <div key={i} className="alert">
          <span className={'dot ' + (a.tone === 'critical' ? 'alert-dot-critical' : 'alert-dot-high')}/>
          <div className="alert-body">
            <div className="alert-title">{a.title}</div>
            <div className="alert-meta">{a.meta}</div>
          </div>
          <span className={'badge ' + a.tagCls}>{a.tag}</span>
        </div>
      ))}
    </div>
  );
};

window.AlertsList = AlertsList;
