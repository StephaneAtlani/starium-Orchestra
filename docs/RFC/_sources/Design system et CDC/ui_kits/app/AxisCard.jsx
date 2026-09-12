/* global React, Icon */

const tones = {
  success: { color: 'var(--state-success)', label: 'En bonne trajectoire' },
  warning: { color: 'var(--state-warning)', label: 'Attention requise' },
  danger:  { color: 'var(--state-danger)',  label: 'En retard' },
};

const AxisCard = ({ index, icon, title, pct, status }) => {
  const t = tones[status] || tones.success;
  return (
    <div className="axis">
      <div className="axis-head">
        <div className="axis-icon"><Icon name={icon} size={18}/></div>
        <div className="axis-title">{index}. {title}</div>
        <div className="axis-pct">{pct}%</div>
      </div>
      <div className="progress-track"><div className="progress-fill" style={{width: pct + '%', background: t.color}}/></div>
      <div className="axis-status">
        <span className="dot" style={{background: t.color}}/>
        <span>{t.label}</span>
      </div>
      <a className="axis-link" href="#">Voir le détail ›</a>
    </div>
  );
};

window.AxisCard = AxisCard;
