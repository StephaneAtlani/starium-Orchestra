/* Démo « Cycles de pilotage » — composition continue (animations-v3) */
const { useComposition, Shot, Captions, Easing, interpolate, animate, clamp } = window;

const IMG = 'screenshots/vid/';
const GOLD = '#E8A317';
const INK = '#0E0E10';
const PAPER = '#F6F4EF';

const STAGE_W = 1920, STAGE_H = 1080;
const PL = { x: 96, y: 54, w: 1728, h: 972, r: 20 };
const IMG_W = 2766;

const MOTION = {
  cam: Easing.easeInOutSine,
  fade: Easing.easeInOutQuad,
  pop: Easing.easeOutBack,
};

function fit(imgH) {
  const s = Math.min(PL.w / IMG_W, PL.h / imgH);
  const w = IMG_W * s, h = imgH * s;
  return { s, w, h, x: (PL.w - w) / 2, y: (PL.h - h) / 2 };
}
/* image-normalized (u,v) -> plate-normalized */
function toPlate(u, v, imgH) {
  const f = fit(imgH);
  return [(f.x + u * f.w) / PL.w, (f.y + v * f.h) / PL.h];
}

/* ── Plans : une image par section, chacune avec sa propre caméra ── */
const SHOTS = [
  { at: 'Intro',    img: '01-cycles.png',       h: 1548, a: [0.50, 0.42, 1.30], b: [0.50, 0.40, 1.16] },
  { at: 'Vue',      img: '01-cycles.png',       h: 1548, a: [0.50, 0.42, 1.14], b: [0.52, 0.46, 1.02] },
  { at: 'Menu',     img: '02-menu.png',         h: 1548, a: [0.82, 0.26, 1.10], b: [0.80, 0.32, 1.34], reveal: 1.15 },
  { at: 'Formulaire', img: '04b-modal-rempli.png', h: 1660, a: [0.46, 0.22, 1.20], b: [0.50, 0.58, 1.38] },
  { at: 'Chainage', img: '05c-chainage.png',    h: 1660, a: [0.45, 0.40, 1.18], b: [0.48, 0.50, 1.52] },
  { at: 'Generation', img: '06-enregistre.png', h: 1548, a: [0.52, 0.60, 1.12], b: [0.50, 0.80, 1.34] },
  { at: 'Grille',   img: '07b-grille.png',      h: 1660, a: [0.28, 0.44, 1.36], b: [0.72, 0.50, 1.30] },
  { at: 'Preparer', img: '08-preparer.png',     h: 1548, a: [0.50, 0.38, 1.34], b: [0.50, 0.50, 1.10] },
  { at: 'Convocation', img: '09b-mail.png',     h: 1660, a: [0.34, 0.50, 1.12], b: [0.62, 0.52, 1.12] },
  { at: 'Contenu',  img: '10b-options.png',     h: 1660, a: [0.28, 0.40, 1.22], b: [0.30, 0.56, 1.30] },
  { at: 'Envoi',    img: '11-convocations.png', h: 1548, a: [0.50, 0.68, 1.14], b: [0.49, 0.82, 1.36], reveal: 0.2 },
  { at: 'Suivi',    img: '13b.png',             h: 1548, a: [0.50, 0.34, 1.18], b: [0.52, 0.60, 1.44] },
  { at: 'Fin',      img: '13b.png',             h: 1548, a: [0.52, 0.60, 1.44], b: [0.52, 0.52, 1.24] },
];

const CAPTIONS = [
  { key: 'Vue',        text: 'Toute la gouvernance du projet dans une seule cadence.' },
  { key: 'Menu',       text: 'COPROJ, COPIL, COTECH, CODIR — chaque type a ses réglages par défaut.', off: 1.4 },
  { key: 'Formulaire', text: 'Nom, cadence, équipe permanente, ordre du jour type.' },
  { key: 'Chainage',   text: 'La reprise : ce que chaque séance récupère automatiquement de l’amont.' },
  { key: 'Generation', text: 'Les séances sont générées sur toute la cadence.' },
  { key: 'Grille',     text: 'Chaque instance sait ce qu’elle reçoit et ce qu’elle transmet.' },
  { key: 'Preparer',   text: 'Préparer la séance : ordre du jour, supports, points à arbitrer.' },
  { key: 'Convocation',text: 'Convoquer — l’aperçu montre exactement ce que reçoit le participant.' },
  { key: 'Contenu',    text: 'Invitation .ics, ordre du jour, confirmation de présence, relance auto.' },
  { key: 'Envoi',      text: 'Chacun reçoit son invitation, l’agenda est déjà rempli.', off: 1.6 },
  { key: 'Suivi',      text: 'Et le suivi des réponses, nominatif, en face de la séance.', off: 0.5, endKey: 'Fin' },
];

function Plate({ shot, span, T, tw }) {
  const [start, end] = span;
  const fade = 0.4;
  const reveal = start + (shot.reveal || 0);
  const inO = clamp((T - (reveal - fade)) / fade, 0, 1);
  const outO = 1 - clamp((T - end) / fade, 0, 1);
  const o = inO * outO;
  if (o <= 0.001) return null;
  const p = clamp((T - start) / Math.max(0.001, end - start), 0, 1);
  const e = MOTION.cam(p);
  const u = shot.a[0] + (shot.b[0] - shot.a[0]) * e;
  const v = shot.a[1] + (shot.b[1] - shot.a[1]) * e;
  const z = shot.a[2] + (shot.b[2] - shot.a[2]) * e;
  const [cx, cy] = toPlate(u, v, shot.h);
  const f = fit(shot.h);
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: o }}>
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${z})`, transformOrigin: `${cx * 100}% ${cy * 100}%` }}>
        <img src={IMG + shot.img} alt="" style={{ position: 'absolute', left: f.x, top: f.y, width: f.w, height: f.h }} />
      </div>
    </div>
  );
}

function Cursor({ T, CUES }) {
  /* deux gestes : ouvrir le menu de type, puis envoyer les convocations */
  const legs = [
    { t0: CUES.Menu - 0.25, t1: CUES.Menu + 1.05, from: [0.46, 0.70], to: [0.899, 0.135], h: 1548, click: CUES.Menu + 1.1, out: CUES.Menu + 2.1 },
    { t0: CUES.Envoi - 1.5, t1: CUES.Envoi - 0.25, from: [0.35, 0.55], to: [0.712, 0.812], h: 1660, click: CUES.Envoi - 0.2, out: CUES.Envoi + 0.7 },
  ];
  const leg = legs.filter(l => T >= l.t0 - 0.3 && T <= l.out).pop();
  if (!leg) return null;
  const p = clamp((T - leg.t0) / (leg.t1 - leg.t0), 0, 1);
  const e = Easing.easeInOutCubic(p);
  const u = leg.from[0] + (leg.to[0] - leg.from[0]) * e;
  const v = leg.from[1] + (leg.to[1] - leg.from[1]) * e;
  const [cx, cy] = toPlate(u, v, leg.h);
  const x = PL.x + cx * PL.w, y = PL.y + cy * PL.h;
  const appear = clamp((T - (leg.t0 - 0.25)) / 0.25, 0, 1);
  const vanish = 1 - clamp((T - (leg.out - 0.35)) / 0.35, 0, 1);
  const ck = clamp((T - leg.click) / 0.55, 0, 1);
  const ringOn = T >= leg.click && ck < 1;
  const press = T >= leg.click && T < leg.click + 0.12 ? 0.88 : 1;
  return (
    <div style={{ position: 'absolute', left: x, top: y, opacity: appear * vanish, pointerEvents: 'none' }}>
      {ringOn ? (
        <div style={{ position: 'absolute', left: -6, top: -6, width: 12 + 96 * ck, height: 12 + 96 * ck, marginLeft: -48 * ck, marginTop: -48 * ck, borderRadius: 999, border: `3px solid ${GOLD}`, opacity: 0.75 * (1 - ck) }} />
      ) : null}
      <svg width="46" height="46" viewBox="0 0 24 24" style={{ transform: `scale(${press})`, transformOrigin: '3px 3px', filter: 'drop-shadow(0 6px 14px rgba(0,0,0,.45))' }}>
        <path d="M4 2.5 L4 19 L8.4 14.9 L11.2 21 L14.2 19.6 L11.4 13.7 L17.4 13.5 Z" fill="#fff" stroke={INK} strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function TitleCard({ T, CUES, total }) {
  const inO = 1 - clamp((T - (CUES.Vue - 1.0)) / 0.8, 0, 1);
  const outO = clamp((T - (CUES.Fin + 0.15)) / 0.7, 0, 1);
  const o = Math.max(inO, outO);
  if (o <= 0.001) return null;
  const isEnd = outO > inO;
  const rise = isEnd ? animate({ from: 26, to: 0, start: CUES.Fin + 0.15, end: CUES.Fin + 1.0, ease: Easing.easeOutCubic })(T)
                     : animate({ from: 0, to: -18, start: CUES.Vue - 1.0, end: CUES.Vue, ease: Easing.easeInQuad })(T);
  return (
    <div style={{ position: 'absolute', inset: 0, background: `rgba(14,14,16,${(isEnd ? 0.9 : 0.76) * o})`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18 }}>
      <div style={{ opacity: o, transform: `translateY(${rise}px)`, textAlign: 'center' }}>
        <div style={{ font: '800 20px Manrope, system-ui, sans-serif', letterSpacing: '0.22em', textTransform: 'uppercase', color: GOLD, marginBottom: 22 }}>Starium · Portail client</div>
        <div style={{ font: '800 82px Manrope, system-ui, sans-serif', color: PAPER, letterSpacing: '-0.02em' }}>Cycles de pilotage</div>
        <div style={{ font: '500 30px Manrope, system-ui, sans-serif', color: 'rgba(246,244,239,.66)', marginTop: 20 }}>
          {isEnd ? 'Créer une instance, la chaîner, convoquer — en une minute.' : 'Créer une instance de gouvernance et convoquer son équipe.'}
        </div>
      </div>
    </div>
  );
}

function Piece(props) {
  const { T, CUES, authoredTotal } = useComposition();
  const light = props.plateStyle === 'clair';
  const spans = SHOTS.map((s, i) => {
    const start = CUES[s.at];
    const end = i + 1 < SHOTS.length ? CUES[SHOTS[i + 1].at] : authoredTotal;
    return [start, end];
  });
  const caps = CAPTIONS.map(c => {
    const it = { at: CUES[c.key] + (c.off || 0.5), text: c.text };
    if (c.endKey) it.until = CUES[c.endKey] - 0.2;
    return it;
  });
  const vignette = 'radial-gradient(120% 90% at 50% 42%, rgba(0,0,0,0) 52%, rgba(0,0,0,.45) 100%)';
  return (
    <div style={{ position: 'absolute', inset: 0, background: light ? '#EFEBE3' : INK, overflow: 'hidden', fontFamily: 'Manrope, system-ui, sans-serif' }}>
      <div style={{ position: 'absolute', left: -240, top: -300, width: 1100, height: 1100, borderRadius: 999, background: `radial-gradient(circle, rgba(232,163,23,.20), rgba(232,163,23,0) 62%)` }} />
      <div style={{ position: 'absolute', right: -300, bottom: -360, width: 1200, height: 1200, borderRadius: 999, background: `radial-gradient(circle, rgba(232,163,23,.12), rgba(232,163,23,0) 62%)` }} />
      <div style={{ position: 'absolute', left: PL.x, top: PL.y, width: PL.w, height: PL.h, borderRadius: PL.r, overflow: 'hidden', background: '#141416', boxShadow: '0 40px 90px rgba(0,0,0,.55), 0 0 0 1px rgba(255,255,255,.06)' }}>
        {SHOTS.map((s, i) => <Plate key={i} shot={s} span={spans[i]} T={T} />)}
        <div style={{ position: 'absolute', inset: 0, background: vignette, pointerEvents: 'none' }} />
      </div>
      {props.cursor === false ? null : <Cursor T={T} CUES={CUES} />}
      <TitleCard T={T} CUES={CUES} total={authoredTotal} />
      <Captions items={props.captions === false ? [] : caps} style={{ bottom: 24, left: '10%', right: '10%', font: '600 30px Manrope, system-ui, sans-serif', color: PAPER, textShadow: light ? '0 2px 14px rgba(255,255,255,.9)' : '0 2px 18px rgba(0,0,0,.8)', color: light ? INK : PAPER }} />
    </div>
  );
}

Object.assign(window, { Piece });
