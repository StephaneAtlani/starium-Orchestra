/* global React */

const initials = name => name.split(' ').map(p => p[0]).join('').slice(0,2).toUpperCase();

const statusBadge = (s) => {
  const map = {
    success: { cls: 'b-success', label: 'En bonne trajectoire' },
    warning: { cls: 'b-warning', label: 'Attention requise' },
    danger:  { cls: 'b-danger',  label: 'En retard' },
  }[s];
  return <span className={'badge ' + map.cls}>{map.label}</span>;
};

const ObjectivesTable = () => {
  const rows = [
    { obj: 'Améliorer la satisfaction client (NPS > 60)', axe: 'Performance opérationnelle', who: 'Claire Dubois', date: '31 déc. 2026', pct: 72, status: 'success' },
    { obj: 'Automatiser 80% des processus clés',          axe: 'Transformation digitale',    who: 'Julien Moreau', date: '30 sept. 2026', pct: 45, status: 'danger' },
    { obj: 'Réduire les incidents critiques de 30%',      axe: 'Maîtrise des risques',       who: 'Nadia Benali',  date: '31 déc. 2026', pct: 60, status: 'warning' },
    { obj: 'Atteindre 40h de formation par collaborateur',axe: 'Développement humain',       who: 'Marc Lemaire',  date: '31 déc. 2026', pct: 80, status: 'success' },
    { obj: 'Diminuer notre empreinte carbone de 20%',     axe: 'Performance opérationnelle', who: 'Claire Dubois', date: '31 déc. 2026', pct: 55, status: 'warning' },
  ];

  const fillColor = (s) => ({success:'var(--state-success)', warning:'var(--state-warning)', danger:'var(--state-danger)'}[s]);

  return (
    <table className="table">
      <thead>
        <tr>
          <th>Objectif</th>
          <th>Axe</th>
          <th>Responsable</th>
          <th>Échéance</th>
          <th style={{width:'18%'}}>Avancement</th>
          <th>Statut</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r,i) => (
          <tr key={i}>
            <td className="cell-name">{r.obj}</td>
            <td>{r.axe}</td>
            <td><div className="cell-user"><div className="av-xs">{initials(r.who)}</div>{r.who}</div></td>
            <td>{r.date}</td>
            <td>
              <div className="cell-progress">
                <div className="progress-track"><div className="progress-fill" style={{width:r.pct+'%', background:fillColor(r.status)}}/></div>
                <span className="pct">{r.pct}%</span>
              </div>
            </td>
            <td>{statusBadge(r.status)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

window.ObjectivesTable = ObjectivesTable;
