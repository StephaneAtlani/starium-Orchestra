/* global React, Icon */

const VisionCard = () => (
  <div className="vision">
    <div className="vision-head">
      <div className="kpi-ring"><Icon name="eye" size={20}/></div>
      <div style={{fontWeight:600, color:'var(--fg-1)'}}>Notre vision</div>
    </div>
    <div className="vision-quote">
      Être la référence de confiance de nos clients en délivrant des solutions innovantes et durables, grâce à l'excellence opérationnelle et à l'engagement de nos talents.
    </div>
  </div>
);

window.VisionCard = VisionCard;
