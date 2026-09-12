/* global React */

const AlignmentChart = () => {
  const months = ['Juin 23','Juil. 23','Août 23','Sept. 23','Oct. 23','Nov. 23','Déc. 23','Janv. 24','Fév. 24','Mars 24','Avr. 24','Mai 24'];
  const values = [42, 48, 52, 55, 60, 64, 68, 70, 73, 76, 79, 82];
  const W = 540, H = 180, pad = { l: 32, r: 16, t: 12, b: 24 };
  const x = i => pad.l + (i/(values.length-1)) * (W - pad.l - pad.r);
  const y = v => pad.t + (1 - v/100) * (H - pad.t - pad.b);

  const linePath = values.map((v,i) => `${i===0?'M':'L'}${x(i)},${y(v)}`).join(' ');
  const areaPath = linePath + ` L${x(values.length-1)},${H-pad.b} L${x(0)},${H-pad.b} Z`;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%', height:'auto'}}>
        <defs>
          <linearGradient id="alignFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand-gold)" stopOpacity="0.16"/>
            <stop offset="100%" stopColor="var(--brand-gold)" stopOpacity="0"/>
          </linearGradient>
        </defs>
        {/* gridlines */}
        {[0,25,50,75,100].map(g => (
          <g key={g}>
            <line x1={pad.l} x2={W-pad.r} y1={y(g)} y2={y(g)} stroke="var(--neutral-200)" strokeDasharray={g===85?'3 3':'0'} />
            <text x={pad.l-8} y={y(g)+3} textAnchor="end" fontSize="10" fill="var(--fg-3)" fontFamily="var(--font-sans)">{g}%</text>
          </g>
        ))}
        {/* target line */}
        <line x1={pad.l} x2={W-pad.r} y1={y(85)} y2={y(85)} stroke="var(--neutral-400)" strokeDasharray="4 4"/>
        {/* area + line */}
        <path d={areaPath} fill="url(#alignFill)"/>
        <path d={linePath} fill="none" stroke="var(--brand-gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        {values.map((v,i) => (
          <circle key={i} cx={x(i)} cy={y(v)} r={i===values.length-1?3.5:2.25} fill="var(--brand-gold)"/>
        ))}
        {/* end label */}
        <g transform={`translate(${x(values.length-1)-22},${y(values[values.length-1])-22})`}>
          <rect width="36" height="18" rx="4" fill="var(--brand-gold)"/>
          <text x="18" y="12" textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--brand-ink)" fontFamily="var(--font-mono)">82%</text>
        </g>
        {/* x labels */}
        {months.map((m,i) => (i%1===0) && (
          <text key={i} x={x(i)} y={H-6} textAnchor="middle" fontSize="9" fill="var(--fg-3)" fontFamily="var(--font-sans)">{m}</text>
        ))}
      </svg>
      <div className="chart-legend">
        <div className="leg"><span className="swatch" style={{background:'var(--brand-gold)'}}/>Score d'alignement global</div>
        <div className="leg"><span className="swatch" style={{background:'var(--neutral-400)', borderTop:'1px dashed var(--neutral-400)'}}/>Objectif 2026 (85%)</div>
      </div>
    </div>
  );
};

window.AlignmentChart = AlignmentChart;
