/* global React, Icon */

const KpiCard = ({ icon, label, value, denom, foot, footTone }) => (
  <div className="kpi">
    <div className="kpi-icon">
      <Icon name={icon} size={38}/>
    </div>
    <div className="kpi-body">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">
        {value}
        {denom && <span className="denom"> / {denom}</span>}
      </div>
      {foot && (
        <div className={'kpi-foot' + (footTone ? ' ' + footTone : '')}>{foot}</div>
      )}
    </div>
  </div>
);

window.KpiCard = KpiCard;
