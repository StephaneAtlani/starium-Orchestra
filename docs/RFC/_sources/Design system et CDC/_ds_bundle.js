/* @ds-bundle: {"format":4,"namespace":"StariumDesignSystem_019e02","components":[{"name":"Button","sourcePath":"components/Button/Button.jsx"},{"name":"Modal","sourcePath":"components/Modal/Modal.jsx"}],"sourceHashes":{"Sidebar-standalone.jsx":"3ec0d9894b9a","animations-v3.jsx":"06ae64d470d6","atlas-dashboard.js":"57edf0c9a2a1","atlas-data.js":"e029efa86297","atlas-engine.js":"bcba8b81160b","atlas-modals.js":"497ed4a10d5e","components/Button/Button.jsx":"822bb8cbe7cd","components/Modal/Modal.jsx":"b286606fd569","demo-cycles.jsx":"091171a3070a","doc-page.js":"f52ae9c02fca","tweaks-panel.jsx":"d259e3a86f73","ui_kits/app/AlertsList.jsx":"01d902e3d229","ui_kits/app/AlignmentChart.jsx":"56a6edf4eb05","ui_kits/app/App.jsx":"01e71fd0d090","ui_kits/app/AxisCard.jsx":"2ef8505f6f84","ui_kits/app/DocumentsList.jsx":"bc8a75f83eb0","ui_kits/app/Icons.jsx":"9a6b9da2941e","ui_kits/app/KpiCard.jsx":"eb524c985ec6","ui_kits/app/ObjectivesTable.jsx":"61984cbea734","ui_kits/app/Sidebar-standalone.jsx":"4d21c86ac245","ui_kits/app/Sidebar.jsx":"4d21c86ac245","ui_kits/app/TopBar.jsx":"402ccfc2c589","ui_kits/app/VisionCard.jsx":"4ce5763e7ece","ui_kits/app/atlas-dashboard.js":"57edf0c9a2a1","ui_kits/app/atlas-data.js":"e029efa86297","ui_kits/app/atlas-engine.js":"7fe502095d36","ui_kits/app/atlas-modals.js":"497ed4a10d5e","ui_kits/app/budget/budget-data.js":"a2be65ed1def","ui_kits/app/budget/budget-depense.js":"1e142dc2d3c3","ui_kits/app/budget/budget-forecast.js":"2fd6db829e35","ui_kits/app/budget/budget-import.js":"d9235f65619e","ui_kits/app/budget/budget-reaffect.js":"db1273d79cd3","ui_kits/app/budget/budget-views.js":"6dd89f62f342","ui_kits/app/modules/capacite.js":"fabd2f72d3b6","ui_kits/app/modules/conformite.js":"979c0e56559b","ui_kits/app/modules/equipes.js":"da2af1891633","ui_kits/app/modules/plans-action.js":"a233eda93fbf","ui_kits/app/modules/prep-workspace.js":"b3859add39cc","ui_kits/app/modules/reunions.js":"4274a2463e6d","ui_kits/app/modules/scenario.js":"b2bddea0ccd2","ui_kits/app/modules/seance.js":"759cd046c97b","ui_kits/app/orchestra-pages.js":"eb651202e862"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.StariumDesignSystem_019e02 = window.StariumDesignSystem_019e02 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// Sidebar-standalone.jsx
try { (() => {
/* global React, Icon */

const Sidebar = () => {
  const sections = [{
    type: 'item',
    icon: 'home',
    label: 'Accueil'
  }, {
    type: 'item',
    icon: 'dashboard',
    label: 'Tableau de bord'
  }, {
    type: 'item',
    icon: 'building',
    label: 'Clients'
  }, {
    type: 'item',
    icon: 'users',
    label: 'Utilisateurs'
  }, {
    type: 'item',
    icon: 'modules',
    label: 'Modules'
  }, {
    type: 'item',
    icon: 'logs',
    label: 'Audit logs'
  }, {
    type: 'section',
    label: 'Gouvernance'
  }, {
    type: 'item',
    icon: 'target',
    label: 'Vision stratégique',
    active: true
  }, {
    type: 'item',
    icon: 'cycle',
    label: 'Cycles de pilotage'
  }, {
    type: 'item',
    icon: 'check-target',
    label: 'Objectifs stratégiques'
  }, {
    type: 'item',
    icon: 'risk',
    label: 'Risques'
  }, {
    type: 'item',
    icon: 'decision',
    label: 'Décisions'
  }, {
    type: 'section',
    label: 'Pilotage'
  }, {
    type: 'item',
    icon: 'projects',
    label: 'Projets'
  }, {
    type: 'item',
    icon: 'budget',
    label: 'Budgets'
  }, {
    type: 'item',
    icon: 'capacity',
    label: 'Capacité'
  }, {
    type: 'item',
    icon: 'people',
    label: 'Ressources'
  }, {
    type: 'section',
    label: 'Référentiel'
  }, {
    type: 'item',
    icon: 'vendors',
    label: 'Fournisseurs'
  }, {
    type: 'item',
    icon: 'contracts',
    label: 'Contrats'
  }, {
    type: 'item',
    icon: 'apps',
    label: 'Applications'
  }, {
    type: 'item',
    icon: 'docs',
    label: 'Documents'
  }];
  return /*#__PURE__*/React.createElement("aside", {
    className: "sidebar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sidebar-brand"
  }, /*#__PURE__*/React.createElement("img", {
    src: window.__resources && window.__resources.logoHorizontal ? window.__resources.logoHorizontal : "../../assets/logo-horizontal.png",
    alt: "Starium"
  })), /*#__PURE__*/React.createElement("nav", {
    className: "sidebar-nav"
  }, sections.map((s, i) => s.type === 'section' ? /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "sidebar-section"
  }, s.label) : /*#__PURE__*/React.createElement("div", {
    key: i,
    className: 'nav-item' + (s.active ? ' active' : '')
  }, /*#__PURE__*/React.createElement(Icon, {
    name: s.icon,
    size: 18
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "rgba(255, 255, 255, 0.933)"
    }
  }, s.label)))), /*#__PURE__*/React.createElement("div", {
    className: "sidebar-footer"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "chevron-right",
    size: 16,
    style: {
      transform: 'rotate(180deg)'
    }
  }), "R\xE9duire le menu"));
};
window.Sidebar = Sidebar;
})(); } catch (e) { __ds_ns.__errors.push({ path: "Sidebar-standalone.jsx", error: String((e && e.message) || e) }); }

// animations-v3.jsx
try { (() => {
// @ds-adherence-ignore -- omelette starter scaffold (raw elements/hex/px by design)
// Copied omelette starter. Re-running copy_starter_component with this kind overwrites this file with the latest version (page content is unaffected).

/* BEGIN USAGE */
// animations-v3.jsx — continuous-composition animation engine.
//
// THE MODEL: the animation is ONE element tree rendered as a pure function
// of one authored-time axis. Nothing mounts or unmounts at section
// boundaries, so any element can move, morph, or persist across them by
// ordinary interpolation. The scene list (OM_SCENES) is the user-control
// view — names, order, playback durations — and the engine derives the cue
// table from it, so structure has exactly one source and cannot drift.
//
// API INDEX (every export is a window global):
//   <CompositionStage width height scenes={window.OM_SCENES}
//                     playback={window.OM_PLAYBACK} bg>
//     <Piece />   — ONE component, the whole animation
//   </CompositionStage>
//   useComposition() -> {T, CUES, time, duration, authoredTotal, playing}
//     T: authored seconds (warped per-section by user trims/speeds) —
//        key ALL choreography to T, never to wall-clock time
//     CUES: {SectionName: authoredStart} derived from OM_SCENES; an unknown
//        name returns NaN and raises a preview-only badge (never exports);
//        duplicate section names bind to the first occurrence
//   <Shot from={CUES.Build} to={CUES.Close}> — children visible between two
//     authored times (an authored hard cut in one line); children stay
//     mounted (media keeps its readiness) and are hidden outside the window
//   <Captions items={[{at, until?, text}, ...]} /> — ONE caption element,
//     at most one visible at a time, keyed to T; 'until' defaults to the
//     next item's 'at'; a last item with no 'until' stays to the end
//   WATERCOLOR (only when the Watercolor illustration skill is active —
//   otherwise ignore these entries). A painting is a function(p) written
//   against the paint kit, on a width x height sheet; it needs
//   watercolor_kit.js loaded by a <script> tag before this engine, must
//   be a stable function defined once (module scope, never an inline
//   arrow), and every component below renders <img> elements, so it all
//   exports by construction.
//   <WatercolorPainting painting={fn} from={CUES.X} to={CUES.Y} width height
//     seed scale quality style /> — the painting assembled from its own
//     STROKES: each wash / ink line / splatter is a separate layer
//     stacked over the paper, appearing in painting order between two
//     authored times (washes bloom in, ink draws tip to tail). This is the
//     default way to show a watercolor being painted. It keeps the sheet's
//     aspect ratio (size it with style, e.g. {position:'absolute', left,
//     top, width}). scale is the layers' render resolution over width x
//     height (default 1, a deliberate weight-over-dpi trade — raise it
//     toward the zoom factor if the composition zooms into the painting,
//     or toward the devicePixelRatio for a hero-sized sheet); quality is
//     0..1 layer image quality (default 0.92; 1 is the encoder's maximum).
//   useWatercolorLayers(fn, {width, height, seed, scale, quality}) -> L
//     (null if the kit isn't loaded — load watercolor_kit.js before the
//     engine — or if the painting fails to build) — the painting taken apart into strokes, for
//     choreography beyond in-order painting: L.count strokes, L.kind(i)
//     ('wash' | 'gradedWash' | 'glaze' | 'ink' | 'hatch' | 'splatter' |
//     'dryStroke' | 'reserve' | 'caption'), L.span(i) = the stroke's
//     {from, to} share of the painting's 0..1 timeline; call L.warm()
//     once after load so finished strokes pre-render off the critical
//     path (WatercolorPainting does this itself). Compose with:
//   <WatercolorSheet layers={L} style>children</WatercolorSheet> — the
//     paper the strokes sit on (keeps the sheet's aspect ratio), and
//   <WatercolorStroke index={i} at={0..1} style /> — stroke i as its own
//     element, placed where it was painted; at is its painting progress
//     (0 hidden, 1 finished — drive it from T with animate()); style lets
//     you move, scale, rotate, or fade the stroke (transform / opacity).
//     Strokes are paint, so they multiply: overlapping strokes darken
//     where they cross, as in the still image, within a few 8-bit levels
//     (tighter still at quality 1). The sheet clips to its
//     box — for strokes that fly in from outside it, set
//     style={{overflow: 'visible'}} on the WatercolorSheet. 'reserve' strokes
//     are erasures (lifted paper) — keep them where they were painted and
//     reveal them in order after the strokes they erase; moving an erase
//     around has no sensible meaning.
//   <WatercolorReveal painting={fn} from={CUES.X} to={CUES.Y} width height
//     seed steps scale format quality style />, or <WatercolorReveal
//     frames={[src, ...]} from to /> — the whole painting as ONE flat
//     image that paints on (frames pre-baked in the background, so it is
//     the lightest option and the one to zoom or pan over as a single
//     picture). Prefer WatercolorPainting when the strokes themselves
//     should appear one by one or be individually animated. format is
//     the image MIME type (default image/jpeg), quality 0..1 (default
//     0.88). Frames bake at width x height times scale (default: the
//     device pixel ratio, capped at 2) — if the composition zooms INTO
//     the painting, raise scale toward the maximum zoom so frames stay
//     crisp. The kit caps a sheet at ~12M pixels and the components clamp
//     scale to stay under it; exported video sharpness also depends on
//     the export dialog's own resolution choice.
//   Motion: Easing.{linear, easeIn|Out|InOutQuad/Cubic/Quart/Expo/Sine,
//     easeIn|Out|InOutBack, easeOutElastic}, interpolate(input, output, ease),
//     animate({from, to, start, end, ease}) -> fn(T), clamp(v, min, max)
//   Plumbing (rarely needed): Stage, PlaybackBar, TimelineContext,
//     useTime, useTimeline
//   Seek event (host/export transport): 'data-om-seek-to-time-frame',
//     detail {time, sync, playing} — the stage owns it; never implement it
//     yourself
//
// THE AUTHORING CONTRACT — this is what makes the host timeline's trim and
// speed gestures write back into YOUR file, so follow it exactly:
//   1. Declare the scene list as a JSON string literal in a plain inline
//      <script> of the main document (NOT type="text/babel", NOT a sibling
//      .jsx — only vanilla inline scripts are addressable for write-back):
//        <script>window.OM_SCENES = '[{"name":"Opening","dur":3,"desc":"The logo fades in and the title settles"},{"name":"Build","dur":5,"desc":"Bars grow to their final values"}]';</script>
//      Give every entry a "desc": one short plain-words sentence saying
//      what happens in that section. The user reads it in the timeline's
//      section popover — keep it true whenever you edit the section.
//   2. Pass the string through untouched:
//        <CompositionStage scenes={window.OM_SCENES} ...>
//   3. ALSO declare the playback setting the same way:
//        <script>window.OM_PLAYBACK = '{"mode":"loop"}';</script>
//      and pass it through untouched (values: '{"mode":"loop"}' or
//      '{"mode":"times","count":N}'; omitting keeps loop behavior but
//      leaves the host Repeat control read-only for this document).
//   IMPORTANT — the exportable-video contract: CompositionStage/Stage OWNS
//   it (the data-om-exportable-video-with-duration-secs attribute, the
//   data-om-seek-to-time-frame listener, the svg/foreignObject wrapper,
//   and font inlining). NEVER put the exportable attribute on any other
//   element — a second "exportable root" makes the host timeline and the
//   video exporter bind to the wrong element, and playback control /
//   export silently break.
//
// HOW TIME WORKS: each OM_SCENES entry is a named slice of the authored
// timeline. CUES.Name is that section's authored start (the running sum of
// authored lengths, in literal order). useComposition().T is the authored
// clock: when the user trims or speeds a section on the host timeline, the
// engine replays that section's SAME authored slice over the new playback
// length — your choreography retimes, never cuts off. The optional "nat"
// field on an entry is the engine's authored-length anchor — the host
// timeline stamps it on the first retime; don't set it by hand.
//
// CUE-FIRST DISCIPLINE (what makes a piece read as one continuous video):
//   1. Write the OM_SCENES literal FIRST — it is the piece's outline.
//   2. One helper component per section for readability, but ALL of them
//      render ALL the time inside the one tree, keyed to CUES — never
//      conditionally mounted per section.
//   3. Define exactly three motion helpers up front (e.g.
//      MOTION = {enter, draw, pop} wrapping Easing curves) and use no
//      easing or transform outside them; one caption element, one visible
//      at a time (<Captions> has this built in).
//   A shared element that crosses a boundary is just motion whose start
//   and end straddle a cue: animate({from, to, start: CUES.Build - 0.4,
//   end: CUES.Build + 0.6})(T) glides through the boundary, and a user
//   slowing either section slows the glide without breaking it.
//
// RENDER FROM T ONLY: the exporter seeks each frame with a synchronous
// commit and may serialize the stage the moment the seek event returns —
// anything painted from useEffect or your own requestAnimationFrame lags
// that commit and exports stale. Render everything visible from T and this
// is automatic. A seeked frame is a deterministic render at that time.
//
// HARD CUTS are content now, not structure: wrap a shot's elements in
// <Shot from to> (visibility toggles at the cues; children stay mounted so
// images and videos hold their readiness). Shot also doubles as the
// perf gate for heavy far-away beats.
//
// LOOP SEAMS are the one surviving boundary rule: a looping piece shows
// its last authored frame immediately before its first — make them match
// (settle your choreography by authoredTotal, open it at 0).
//
// DIAGNOSTICS: choreography that references an unknown section name (a
// rename or deletion in OM_SCENES) shows a badge below the stage in the
// preview, outside the exportable svg — visible in preview screenshots,
// never in the exported video. An OM_SCENES section with no choreography
// keyed to it is a valid empty beat, not an error.
/* END USAGE */

// ─────────────────────────────────────────────────────────────────────────────

// ── Easing functions (hand-rolled, Popmotion-style) ─────────────────────────
// All easings take t ∈ [0,1] and return eased t ∈ [0,1] (may overshoot for back/elastic).
const Easing = {
  linear: t => t,
  // Quad
  easeInQuad: t => t * t,
  easeOutQuad: t => t * (2 - t),
  easeInOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  // Cubic
  easeInCubic: t => t * t * t,
  easeOutCubic: t => --t * t * t + 1,
  easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  // Quart
  easeInQuart: t => t * t * t * t,
  easeOutQuart: t => 1 - --t * t * t * t,
  easeInOutQuart: t => t < 0.5 ? 8 * t * t * t * t : 1 - 8 * --t * t * t * t,
  // Expo
  easeInExpo: t => t === 0 ? 0 : Math.pow(2, 10 * (t - 1)),
  easeOutExpo: t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
  easeInOutExpo: t => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    if (t < 0.5) return 0.5 * Math.pow(2, 20 * t - 10);
    return 1 - 0.5 * Math.pow(2, -20 * t + 10);
  },
  // Sine
  easeInSine: t => 1 - Math.cos(t * Math.PI / 2),
  easeOutSine: t => Math.sin(t * Math.PI / 2),
  easeInOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,
  // Back (overshoot)
  easeOutBack: t => {
    const c1 = 1.70158,
      c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  easeInBack: t => {
    const c1 = 1.70158,
      c3 = c1 + 1;
    return c3 * t * t * t - c1 * t * t;
  },
  easeInOutBack: t => {
    const c1 = 1.70158,
      c2 = c1 * 1.525;
    return t < 0.5 ? Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2) / 2 : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
  },
  // Elastic
  easeOutElastic: t => {
    const c4 = 2 * Math.PI / 3;
    if (t === 0) return 0;
    if (t === 1) return 1;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  }
};

// ── Core interpolation helpers ──────────────────────────────────────────────

// Clamp a value to [min, max]
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

// interpolate([0, 0.5, 1], [0, 100, 50], ease?) -> fn(t)
// Popmotion-style: linearly maps t across input keyframes to output values,
// with optional easing per segment (single fn or array of fns).
function interpolate(input, output, ease = Easing.linear) {
  return t => {
    if (t <= input[0]) return output[0];
    if (t >= input[input.length - 1]) return output[output.length - 1];
    for (let i = 0; i < input.length - 1; i++) {
      if (t >= input[i] && t <= input[i + 1]) {
        const span = input[i + 1] - input[i];
        const local = span === 0 ? 0 : (t - input[i]) / span;
        const easeFn = Array.isArray(ease) ? ease[i] || Easing.linear : ease;
        const eased = easeFn(local);
        return output[i] + (output[i + 1] - output[i]) * eased;
      }
    }
    return output[output.length - 1];
  };
}

// animate({from, to, start, end, ease})(t) — simpler single-segment tween.
// Returns `from` before `start`, `to` after `end`.
function animate({
  from = 0,
  to = 1,
  start = 0,
  end = 1,
  ease = Easing.easeInOutCubic
}) {
  return t => {
    if (t <= start) return from;
    if (t >= end) return to;
    const local = (t - start) / (end - start);
    return from + (to - from) * ease(local);
  };
}

// ── Timeline context ────────────────────────────────────────────────────────

const TimelineContext = React.createContext({
  time: 0,
  duration: 10,
  playing: false
});
const useTime = () => React.useContext(TimelineContext).time;
const useTimeline = () => React.useContext(TimelineContext);

// How long a marked (detail.playing === true) host seek keeps the
// external-playback latch alive with no successor. The host play bar's
// seek pump is one-in-flight/latest-wins, so its inter-seek gap is tens
// of milliseconds in the worst case — 400ms is far above that, so a
// marked stream that dies mid-play decays the latch promptly.
var SS_EXT_PLAY_MS = 400;

// ── Font inlining ───────────────────────────────────────────────────────────
// Copy every @font-face rule from the page into a <style> inside the svg's
// foreignObject, with font URLs rewritten to data: URLs. Makes the svg
// self-describing so serializing it alone (video export fast path) still
// renders with the right fonts. Sets data-om-fonts-inlined on the svg when
// done so the exporter can wait for it.

function useInlineFontsInto(svgRef) {
  React.useEffect(() => {
    const svg = svgRef.current;
    const host = svg && svg.querySelector('foreignObject > div');
    if (!svg || !host) return;
    let cancelled = false;
    (async () => {
      const rules = [];
      for (const ss of document.styleSheets) {
        let cssRules;
        try {
          cssRules = ss.cssRules;
        } catch {
          // Cross-origin sheet without crossorigin attr (e.g. the standard
          // fonts.googleapis.com <link>) — fetch the CSS text directly and
          // regex-extract the @font-face blocks.
          if (ss.href) {
            try {
              const txt = await fetch(ss.href).then(r => {
                if (!r.ok) throw 0;
                return r.text();
              });
              for (const ff of txt.match(/@font-face\s*{[^}]*}/g) || []) rules.push({
                css: ff,
                base: ss.href
              });
            } catch {}
          }
          continue;
        }
        if (!cssRules) continue;
        for (const r of cssRules) {
          if (r.type === CSSRule.FONT_FACE_RULE) {
            rules.push({
              css: r.cssText,
              base: ss.href || location.href
            });
          }
        }
      }
      const toDataURL = url => fetch(url).then(r => {
        if (!r.ok) throw 0;
        return r.blob();
      }).then(b => new Promise(res => {
        const fr = new FileReader();
        fr.onload = () => res(fr.result);
        fr.onerror = () => res(url);
        fr.readAsDataURL(b);
      })).catch(() => url);
      const parts = await Promise.all(rules.map(async ({
        css,
        base
      }) => {
        const re = /url\((['"]?)([^'")]+)\1\)/g;
        let out = css,
          m;
        while (m = re.exec(css)) {
          const u = m[2];
          if (u.startsWith('data:')) continue;
          let abs;
          try {
            abs = new URL(u, base).href;
          } catch {
            continue;
          }
          out = out.split(m[0]).join(`url("${await toDataURL(abs)}")`);
        }
        return out;
      }));
      if (cancelled || !parts.length) {
        svg.setAttribute('data-om-fonts-inlined', 'true');
        return;
      }
      const style = document.createElement('style');
      style.textContent = parts.join('\n');
      host.insertBefore(style, host.firstChild);
      svg.setAttribute('data-om-fonts-inlined', 'true');
    })();
    return () => {
      cancelled = true;
    };
  }, []);
}
function Stage({
  width = 1280,
  height = 720,
  duration = 10,
  background = '#f6f4ef',
  fps = 60,
  loop = true,
  autoplay = true,
  // Parsed playback object ({mode:'loop'} | {mode:'times',count:N}) or
  // null. When present it overrides the legacy loop prop — CompositionStage
  // passes the validated value from the OM_PLAYBACK authoring contract.
  playback = null,
  persistKey = 'animstage-v3',
  children
}) {
  // Props arrive as strings when Stage is mounted via <x-import> (DC
  // projects) — coerce so style={{width}} gets a number React can px-ify.
  width = +width || 1280;
  height = +height || 720;
  duration = +duration || 10;
  fps = +fps || 60;
  if (typeof loop === 'string') loop = loop !== 'false';
  if (typeof autoplay === 'string') autoplay = autoplay !== 'false';
  const playTimes = playback && playback.mode === 'times' ? playback.count : null;
  const loopEff = playback ? playback.mode === 'loop' : loop;
  const [time, setTime] = React.useState(() => {
    try {
      const v = parseFloat(localStorage.getItem(persistKey + ':t') || '0');
      return isFinite(v) ? clamp(v, 0, duration) : 0;
    } catch {
      return 0;
    }
  });
  const [playing, setPlaying] = React.useState(autoplay);
  // The external-playback latch: true while the HOST play bar is driving
  // time forward as genuine continuous playback (its play-loop seeks
  // carry detail.playing === true). The engine's own clock stays paused
  // the whole time — exactly one clock ever drives — so this is a
  // separate bit, not a second meaning for `playing`. Set and cleared
  // in the seek handler below; decays via SS_EXT_PLAY_MS when the
  // marked stream stops without a parting unmarked seek.
  const [extPlay, setExtPlay] = React.useState(false);
  const extPlayTimerRef = React.useRef(null);
  const [hoverTime, setHoverTime] = React.useState(null);
  const [scale, setScale] = React.useState(1);
  const stageRef = React.useRef(null);
  const canvasRef = React.useRef(null);
  const rafRef = React.useRef(null);
  const lastTsRef = React.useRef(null);

  // Persist playhead
  React.useEffect(() => {
    try {
      localStorage.setItem(persistKey + ':t', String(time));
    } catch {}
  }, [time, persistKey]);

  // Auto-scale to fit viewport
  React.useEffect(() => {
    if (!stageRef.current) return;
    const el = stageRef.current;
    const measure = () => {
      const barH = 44; // playback bar height
      const s = Math.min(el.clientWidth / width, (el.clientHeight - barH) / height);
      setScale(Math.max(0.05, s));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [width, height]);

  // Passes completed since playback last started. Lives in a ref so the
  // per-frame wrap can count without re-running this effect; reset on
  // every (re)start so a fresh play (or a host restart) gets the full
  // run count again.
  const passesRef = React.useRef(0);

  // Animation loop
  React.useEffect(() => {
    if (!playing) {
      lastTsRef.current = null;
      return;
    }
    passesRef.current = 0;
    const step = ts => {
      if (lastTsRef.current == null) lastTsRef.current = ts;
      const dt = (ts - lastTsRef.current) / 1000;
      lastTsRef.current = ts;
      setTime(t => {
        let next = t + dt;
        if (next >= duration) {
          if (playTimes !== null) {
            // Play N times then hold the last frame — the partial pass a
            // mid-timeline start produces counts as a pass, so the piece
            // never runs longer than N full durations.
            passesRef.current += 1;
            if (passesRef.current >= playTimes) {
              next = duration;
              setPlaying(false);
            } else {
              next = next % duration;
            }
          } else if (loopEff) {
            next = next % duration;
          } else {
            next = duration;
            setPlaying(false);
          }
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastTsRef.current = null;
    };
  }, [playing, duration, loopEff, playTimes]);

  // Keyboard: space = play/pause, ← → = seek
  React.useEffect(() => {
    const onKey = e => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setPlaying(p => !p);
      } else if (e.code === 'ArrowLeft') {
        setTime(t => clamp(t - (e.shiftKey ? 1 : 0.1), 0, duration));
      } else if (e.code === 'ArrowRight') {
        setTime(t => clamp(t + (e.shiftKey ? 1 : 0.1), 0, duration));
      } else if (e.key === '0' || e.code === 'Home') {
        setTime(0);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [duration]);

  // Video-export protocol + the editor's play bar: hosts dispatch this
  // event per frame; pause + sync the playhead so the frame shows exactly
  // that timestamp. The host play bar marks its play-loop seeks with
  // detail.playing === true — the mark latches extPlay (playback is
  // playback even when a host clock drives it), while ANY unmarked seek
  // (scrub, step, export frame, the transport's pause park) clears the
  // latch in the same commit it retimes, so a seeked frame still renders
  // exactly one scene's state. The engine's own clock pauses either way.
  React.useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    // Sync-seek capability: a dispatcher that marks its seek with
    // detail.sync === true gets the commit applied via ReactDOM.flushSync,
    // so the stage DOM reflects the seeked frame the moment dispatchEvent
    // returns. The video exporter keys off the data-om-sync-seek
    // advertisement to drop its two-display-refresh settle (that wait only
    // exists to let React's async commit land — serialization needs the
    // committed DOM, not the paint). Feature-detected: a runtime without
    // ReactDOM.flushSync never advertises and every seek takes the async
    // path. Unmarked seeks (scrubs, the host play bar) stay async — a
    // forced sync render per pointermove would tax the editor for no one.
    const canSyncSeek = typeof ReactDOM !== 'undefined' && typeof ReactDOM.flushSync === 'function';
    const onSeek = e => {
      const apply = () => {
        setPlaying(false);
        const hostPlay = !!(e.detail && e.detail.playing === true);
        if (extPlayTimerRef.current) {
          clearTimeout(extPlayTimerRef.current);
          extPlayTimerRef.current = null;
        }
        if (hostPlay) {
          // Watchdog: the latch is only as alive as its seek stream. If the
          // host stops without a parting seek (tab jank, bar unmount), the
          // latch decays on its own rather than stranding extPlaying true.
          extPlayTimerRef.current = setTimeout(() => {
            extPlayTimerRef.current = null;
            setExtPlay(false);
          }, SS_EXT_PLAY_MS);
        }
        setExtPlay(hostPlay);
        setTime(clamp(e.detail.time, 0, duration));
      };
      // flushSync is safe here: a native DOM listener runs outside React's
      // lifecycle, and the exporter's dispatchEvent is synchronous, so the
      // commit lands in the same JS task — the engine's own rAF loop can
      // never interleave between seek and serialize.
      if (canSyncSeek && e.detail && e.detail.sync === true) {
        ReactDOM.flushSync(apply);
      } else {
        apply();
      }
    };
    el.addEventListener('data-om-seek-to-time-frame', onSeek);
    if (canSyncSeek) el.setAttribute('data-om-sync-seek', 'true');
    return () => {
      el.removeEventListener('data-om-seek-to-time-frame', onSeek);
      el.removeAttribute('data-om-sync-seek');
      if (extPlayTimerRef.current) {
        clearTimeout(extPlayTimerRef.current);
        extPlayTimerRef.current = null;
      }
      // Drop the latch too: this cleanup runs on every duration change
      // (an agent edit can retime mid-host-play, no gesture involved) and
      // the new effect instance arms no watchdog — clearing only the
      // timer could strand extPlay true forever if the marked stream died
      // in the gap. Fail toward cut: the next marked seek re-latches.
      setExtPlay(false);
    };
  }, [duration]);

  // Inline @font-face rules into the svg's foreignObject so the svg is
  // self-describing — serializing it alone (for video export) then renders
  // with the right fonts. Sets data-om-fonts-inlined once done.
  useInlineFontsInto(canvasRef);
  const displayTime = hoverTime != null ? hoverTime : time;
  const ctxValue = React.useMemo(
  // extPlaying is ADDITIVE: "time is advancing under an external
  // driver's continuous playback". `playing` keeps meaning the
  // engine's OWN clock — the hidden PlaybackBar glyph (and through it
  // the host's clock-reporter/adoption channel) reads that — and
  // CompositionClock is the one consumer that widens to either.
  () => ({
    time: displayTime,
    duration,
    playing,
    extPlaying: extPlay,
    setTime,
    setPlaying
  }), [displayTime, duration, playing, extPlay]);
  return (
    /*#__PURE__*/
    // data-om-starter: inert presence marker — Claude Design's starter-usage
    // probe reads it; it renders nothing. Keep it on this root element.
    React.createElement("div", {
      ref: stageRef,
      "data-om-starter": "animations-v3",
      style: {
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: '#0a0a0a',
        fontFamily: 'Inter, system-ui, sans-serif'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        minHeight: 0
      }
    }, /*#__PURE__*/React.createElement("svg", {
      ref: canvasRef,
      width: width,
      height: height,
      "data-om-exportable-video-with-duration-secs": duration,
      style: {
        transform: `scale(${scale})`,
        transformOrigin: 'center',
        flexShrink: 0,
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        display: 'block'
      }
    }, /*#__PURE__*/React.createElement("foreignObject", {
      x: "0",
      y: "0",
      width: "100%",
      height: "100%"
    }, /*#__PURE__*/React.createElement("div", {
      xmlns: "http://www.w3.org/1999/xhtml",
      style: {
        width,
        height,
        background,
        position: 'relative',
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement(TimelineContext.Provider, {
      value: ctxValue
    }, children))))), /*#__PURE__*/React.createElement(PlaybackBar, {
      time: displayTime,
      actualTime: time,
      duration: duration,
      playing: playing,
      onPlayPause: () => setPlaying(p => !p),
      onReset: () => {
        setTime(0);
      },
      onSeek: t => setTime(t),
      onHover: t => setHoverTime(t)
    }))
  );
}

// ── Playback bar ────────────────────────────────────────────────────────────
// Play/pause, return-to-begin, scrub track, time display.
// Uses fixed-width time fields so layout doesn't thrash.

function PlaybackBar({
  time,
  duration,
  playing,
  onPlayPause,
  onReset,
  onSeek,
  onHover
}) {
  const trackRef = React.useRef(null);
  const [dragging, setDragging] = React.useState(false);
  const timeFromEvent = React.useCallback(e => {
    const rect = trackRef.current.getBoundingClientRect();
    const x = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    return x * duration;
  }, [duration]);
  const onTrackMove = e => {
    if (!trackRef.current) return;
    const t = timeFromEvent(e);
    if (dragging) {
      onSeek(t);
    } else {
      onHover(t);
    }
  };
  const onTrackLeave = () => {
    if (!dragging) onHover(null);
  };
  const onTrackDown = e => {
    setDragging(true);
    const t = timeFromEvent(e);
    onSeek(t);
    onHover(null);
  };
  React.useEffect(() => {
    if (!dragging) return;
    const onUp = () => setDragging(false);
    const onMove = e => {
      if (!trackRef.current) return;
      const t = timeFromEvent(e);
      onSeek(t);
    };
    window.addEventListener('mouseup', onUp);
    window.addEventListener('mousemove', onMove);
    return () => {
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('mousemove', onMove);
    };
  }, [dragging, timeFromEvent, onSeek]);
  const pct = duration > 0 ? time / duration * 100 : 0;
  const fmt = t => {
    const total = Math.max(0, t);
    const m = Math.floor(total / 60);
    const s = Math.floor(total % 60);
    const cs = Math.floor(total * 100 % 100);
    return `${String(m).padStart(1, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
  };
  const mono = 'JetBrains Mono, ui-monospace, SFMono-Regular, monospace';
  return /*#__PURE__*/React.createElement("div", {
    "data-omelette-chrome": true,
    style: {
      // Slimmed to visually match the host editor bar's basic row (the
      // single-scrubber look): transport first, tighter metrics, quieter
      // chrome. Shown only outside the app — the host bar suppresses this
      // whenever it is present.
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '6px 12px',
      background: 'rgba(20,20,20,0.92)',
      borderTop: '1px solid rgba(255,255,255,0.08)',
      width: '100%',
      maxWidth: 680,
      alignSelf: 'center',
      borderRadius: 6,
      color: '#f6f4ef',
      fontFamily: 'Inter, system-ui, sans-serif',
      userSelect: 'none',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    onClick: onPlayPause,
    title: "Play/pause (space)"
  }, playing ? /*#__PURE__*/React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 14 14",
    fill: "none"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "2",
    width: "3",
    height: "10",
    fill: "currentColor"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "8",
    y: "2",
    width: "3",
    height: "10",
    fill: "currentColor"
  })) : /*#__PURE__*/React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 14 14",
    fill: "none"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M3 2l9 5-9 5V2z",
    fill: "currentColor"
  }))), /*#__PURE__*/React.createElement(IconButton, {
    onClick: onReset,
    title: "Return to start (0)"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 14 14",
    fill: "none"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M3 2v10M12 2L5 7l7 5V2z",
    stroke: "currentColor",
    strokeWidth: "1.5",
    strokeLinejoin: "round",
    strokeLinecap: "round"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: mono,
      fontSize: 12,
      fontVariantNumeric: 'tabular-nums',
      width: 64,
      textAlign: 'right',
      color: '#f6f4ef'
    }
  }, fmt(time)), /*#__PURE__*/React.createElement("div", {
    ref: trackRef,
    onMouseMove: onTrackMove,
    onMouseLeave: onTrackLeave,
    onMouseDown: onTrackDown,
    style: {
      flex: 1,
      height: 22,
      position: 'relative',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 0,
      right: 0,
      height: 4,
      background: 'rgba(255,255,255,0.12)',
      borderRadius: 2
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 0,
      width: `${pct}%`,
      height: 4,
      background: 'oklch(72% 0.12 250)',
      borderRadius: 2
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: `${pct}%`,
      top: '50%',
      width: 12,
      height: 12,
      marginLeft: -6,
      marginTop: -6,
      background: '#fff',
      borderRadius: 6,
      boxShadow: '0 2px 4px rgba(0,0,0,0.4)'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: mono,
      fontSize: 12,
      fontVariantNumeric: 'tabular-nums',
      width: 64,
      textAlign: 'left',
      color: 'rgba(246,244,239,0.55)'
    }
  }, fmt(duration)), typeof VideoEncoder !== 'undefined' && /*#__PURE__*/React.createElement(IconButton, {
    title: "Export video",
    onClick: () => window.parent.postMessage({
      type: 'omelette:request-video-export'
    }, '*')
  }, /*#__PURE__*/React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 14 14",
    fill: "none"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M7 2v7m0 0L4 6m3 3l3-3M2 12h10",
    stroke: "currentColor",
    strokeWidth: "1.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }))));
}
function IconButton({
  children,
  onClick,
  title
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    title: title,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      width: 24,
      height: 24,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: hover ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 5,
      color: '#f6f4ef',
      cursor: 'pointer',
      padding: 0,
      transition: 'background 120ms'
    }
  }, children);
}

// ── Scene-list plumbing ──────────────────────────────────────────────────
// Guest-side validation of a scene list (the engine's own inputs: the
// authored prop, and host-dispatched updates). Mirrors the host parser's
// shape rules and constants — keep in sync with parseTimelineScenes in
// apps/web/src/shared/timeline.ts (16KB raw cap, 50 entries, dur finite in
// (0, 300]); returns null on any violation.
function ssParse(raw) {
  if (typeof raw !== 'string' || !raw || raw.length > 16 * 1024) return null;
  var parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    return null;
  }
  if (!Array.isArray(parsed) || parsed.length === 0 || parsed.length > 50) return null;
  for (var i = 0; i < parsed.length; i++) {
    var s = parsed[i];
    if (typeof s !== 'object' || s === null) return null;
    if (typeof s.name !== 'string' || typeof s.dur !== 'number') return null;
    if (!isFinite(s.dur) || s.dur <= 0 || s.dur > 300) return null;
  }
  return parsed;
}

// Guest-side validation of the playback value — mirrors the host parser
// (shared/timeline.ts parseTimelinePlayback): {"mode":"loop"} or
// {"mode":"times","count":1..99}, strict all-or-nothing, null otherwise.
// Callers treat null as the loop default.
function ppParse(raw) {
  if (typeof raw !== 'string' || !raw || raw.length > 256) return null;
  var parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
  var keys = Object.keys(parsed);
  if (parsed.mode === 'loop') return keys.length === 1 ? {
    mode: 'loop'
  } : null;
  if (parsed.mode === 'times') {
    if (keys.length !== 2) return null;
    var c = parsed.count;
    if (typeof c !== 'number' || c !== Math.floor(c) || c < 1 || c > 99) return null;
    return {
      mode: 'times',
      count: c
    };
  }
  return null;
}

// Stamps the playback attribute VERBATIM from the authored raw string (the
// host's write-back anchors on that exact value) and listens for the
// host's post-write update event. Same shape as SceneSync; only rendered
// when the document authors a playback literal — an absent contract means
// the attribute stays absent and the document plays its default.
function PlaybackSync(props) {
  var ref = React.useRef(null);
  var raw = props.raw;
  var onUpdate = props.onUpdate;
  React.useEffect(function () {
    var el = ref.current;
    if (!el) return;
    var root = el.closest('[data-om-exportable-video-with-duration-secs]');
    if (!root) return;
    root.setAttribute('data-om-timeline-playback', raw);
    var onEvent = function (e) {
      var next = e && e.detail;
      if (ppParse(next)) onUpdate(next);
    };
    root.addEventListener('data-om-timeline-playback-update', onEvent);
    return function () {
      root.removeEventListener('data-om-timeline-playback-update', onEvent);
      root.removeAttribute('data-om-timeline-playback');
    };
  }, [raw, onUpdate]);
  return /*#__PURE__*/React.createElement("div", {
    ref: ref,
    style: {
      display: 'none'
    }
  });
}

// Renders inside the Stage (so it can reach the exportable root via
// closest()): stamps the scenes attribute VERBATIM from the current raw
// string — the host's write-back anchors on that exact value — and listens
// for the host's post-write update event.
function SceneSync(props) {
  var ref = React.useRef(null);
  var raw = props.raw;
  var onUpdate = props.onUpdate;
  React.useEffect(function () {
    var el = ref.current;
    if (!el) return;
    var root = el.closest('[data-om-exportable-video-with-duration-secs]');
    if (!root) return;
    root.setAttribute('data-om-timeline-scenes', raw);
    var onEvent = function (e) {
      var next = e && e.detail;
      // Ignore anything that doesn't validate — a bad update must not tear
      // down a working composition.
      if (ssParse(next)) onUpdate(next);
    };
    root.addEventListener('data-om-timeline-scenes-update', onEvent);
    return function () {
      root.removeEventListener('data-om-timeline-scenes-update', onEvent);
      root.removeAttribute('data-om-timeline-scenes');
    };
  }, [raw, onUpdate]);
  return /*#__PURE__*/React.createElement("div", {
    ref: ref,
    style: {
      display: 'none'
    }
  });
}

// ── Continuous composition ──────────────────────────────────────────────

var CompositionContext = React.createContext(null);
function useComposition() {
  var ctx = React.useContext(CompositionContext);
  if (!ctx) throw new Error('useComposition() must be called inside <CompositionStage>');
  return ctx;
}
function ccDerive(scenes) {
  var playStart = 0;
  var authStart = 0;
  var sections = [];
  var table = Object.create(null);
  for (var i = 0; i < scenes.length; i++) {
    var s = scenes[i];
    var nat = typeof s.nat === 'number' && isFinite(s.nat) && s.nat > 0 ? s.nat : s.dur;
    sections.push({
      name: s.name,
      playStart: playStart,
      dur: s.dur,
      authStart: authStart,
      nat: nat
    });
    if (!Object.prototype.hasOwnProperty.call(table, s.name)) {
      table[s.name] = Math.round(authStart * 1000) / 1000;
    }
    playStart += s.dur;
    authStart += nat;
  }
  return {
    sections: sections,
    table: table,
    total: Math.round(playStart * 1000) / 1000,
    authoredTotal: Math.round(authStart * 1000) / 1000
  };
}
function ccWarp(d, t) {
  var ss = d.sections;
  if (ss.length === 0) return 0;
  var idx = ss.length - 1;
  for (var i = 0; i < ss.length; i++) {
    if (t < ss[i].playStart + ss[i].dur) {
      idx = i;
      break;
    }
  }
  var s = ss[idx];
  var local = Math.min(Math.max(t - s.playStart, 0), s.dur);
  var T = s.authStart + (s.dur > 0 ? local * (s.nat / s.dur) : 0);
  return Math.min(T, d.authoredTotal);
}
var CC_META = Object.assign(Object.create(null), {
  toString: 1,
  toLocaleString: 1,
  valueOf: 1,
  toJSON: 1,
  then: 1,
  constructor: 1,
  hasOwnProperty: 1,
  isPrototypeOf: 1,
  propertyIsEnumerable: 1,
  default: 1
});
function ccCueProxy(table, unknownRef) {
  if (typeof Proxy !== 'function') return table;
  return new Proxy(table, {
    get: function (target, prop) {
      if (typeof prop !== 'string' || prop in target) return target[prop];
      if (CC_META[prop] || prop.indexOf('@@') === 0) return Object.prototype[prop];
      unknownRef.current[prop] = true;
      return NaN;
    }
  });
}
function CcUnknownWatch(props) {
  var tl = useTimeline();
  React.useEffect(function () {
    var next = Object.keys(props.unknownRef.current).sort().join(', ');
    if (next !== props.badge) props.setBadge(next);
  }, [tl.time]);
  return null;
}
function CompositionClock(props) {
  var tl = useTimeline();
  var d = props.derived;
  var T = ccWarp(d, tl.time);
  var value = React.useMemo(function () {
    return {
      T: T,
      CUES: props.cues,
      time: tl.time,
      duration: tl.duration,
      authoredTotal: d.authoredTotal,
      playing: tl.playing || tl.extPlaying === true
    };
  }, [T, props.cues, tl.time, tl.duration, d, tl.playing, tl.extPlaying]);
  return /*#__PURE__*/React.createElement(CompositionContext.Provider, {
    value: value
  }, props.children);
}
function Shot(props) {
  var c = useComposition();
  var from = +props.from;
  var to = props.to == null ? Infinity : +props.to;
  var on = isFinite(from) && c.T >= from && c.T < to;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      visibility: on ? 'visible' : 'hidden'
    }
  }, props.children);
}
var CAPTION_FADE = 0.18;
function Captions(props) {
  var c = useComposition();
  var t = c.T;
  var items = (props.items || []).filter(function (it) {
    return it && isFinite(+it.at);
  }).sort(function (a, b) {
    return a.at - b.at;
  });
  var active = null;
  var end = Infinity;
  for (var i = 0; i < items.length; i++) {
    if (t < items[i].at) break;
    active = items[i];
    end = typeof active.until === 'number' && isFinite(active.until) ? active.until : i + 1 < items.length ? items[i + 1].at : Infinity;
  }
  if (!active || t >= end) return null;
  var o = Math.min(1, (t - active.at) / CAPTION_FADE);
  if (isFinite(end)) o = Math.min(o, (end - t) / CAPTION_FADE);
  o = Math.max(0, Math.min(1, o));
  return /*#__PURE__*/React.createElement("div", {
    "data-om-caption": true,
    style: Object.assign({
      position: 'absolute',
      left: '8%',
      right: '8%',
      bottom: '7%',
      textAlign: 'center',
      opacity: o,
      pointerEvents: 'none',
      font: '500 30px Inter, system-ui, sans-serif',
      color: '#f6f4ef',
      textShadow: '0 1px 14px rgba(0,0,0,0.45)'
    }, props.style)
  }, active.text);
}
function CompositionStage(props) {
  var width = +props.width || 1280;
  var height = +props.height || 720;
  var bg = props.bg || '#0b0b0e';
  var autoplay = props.autoplay == null ? true : String(props.autoplay) !== 'false';
  var loop = props.loop == null ? true : String(props.loop) !== 'false';
  var state = React.useState(props.scenes);
  var raw = state[0];
  var setRaw = state[1];
  var scenes = React.useMemo(function () {
    return ssParse(raw);
  }, [raw]);
  var pstate = React.useState(props.playback);
  var praw = pstate[0];
  var setPraw = pstate[1];
  var pb = React.useMemo(function () {
    return ppParse(praw);
  }, [praw]);
  var unknownRef = React.useRef({});
  var badgeState = React.useState('');
  var badge = badgeState[0];
  var setBadge = badgeState[1];
  var derived = React.useMemo(function () {
    unknownRef.current = {};
    return scenes ? ccDerive(scenes) : null;
  }, [scenes]);
  var cues = React.useMemo(function () {
    return derived ? ccCueProxy(derived.table, unknownRef) : null;
  }, [derived]);
  React.useEffect(function () {
    var next = Object.keys(unknownRef.current).sort().join(', ');
    if (next !== badge) setBadge(next);
  });
  if (!scenes) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0b0b0e',
        color: '#c96442',
        font: '500 16px Inter, system-ui, sans-serif',
        textAlign: 'center'
      }
    }, "animations-v3: the scenes prop isn't a valid JSON scene list", /*#__PURE__*/React.createElement("br", null), "(expected '[", '{', "\"name\":\"\u2026\",\"dur\":N", '}', ", \u2026]')");
  }
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Stage, {
    width: width,
    height: height,
    duration: derived.total,
    background: bg,
    autoplay: autoplay,
    loop: loop,
    playback: pb
  }, /*#__PURE__*/React.createElement(SceneSync, {
    raw: raw,
    onUpdate: setRaw
  }), typeof praw === 'string' && praw !== '' && /*#__PURE__*/React.createElement(PlaybackSync, {
    raw: praw,
    onUpdate: setPraw
  }), /*#__PURE__*/React.createElement(CompositionClock, {
    derived: derived,
    cues: cues
  }, props.children), /*#__PURE__*/React.createElement(CcUnknownWatch, {
    unknownRef: unknownRef,
    badge: badge,
    setBadge: setBadge
  })), badge !== '' &&
  /*#__PURE__*/
  // Sibling of Stage, outside the exportable <svg>: visible in the
  // preview (and its screenshots), never in the exported video.
  React.createElement("div", {
    "data-om-unknown-cues": true,
    style: {
      position: 'absolute',
      left: 12,
      bottom: 56,
      zIndex: 10,
      padding: '6px 10px',
      borderRadius: 6,
      background: 'rgba(0,0,0,0.72)',
      color: '#e8906a',
      font: '500 12px Inter, system-ui, sans-serif',
      pointerEvents: 'none'
    }
  }, "choreography references unknown section", badge.indexOf(',') >= 0 ? 's' : '', ": ", badge));
}

// Strokes as layers: paint multiplies, so stroke images stacked with
// mix-blend-mode:multiply over the paper reproduce the flat render.

var WC_PIXEL_CAP = 11000000;
function wcLayerOpts(props) {
  var w = +props.width || 900,
    h = +props.height || 1200;
  var askScale = +props.scale || 1;
  return {
    width: w,
    height: h,
    scale: Math.min(askScale, Math.sqrt(WC_PIXEL_CAP / (w * h))),
    seed: props.seed == null ? undefined : +props.seed,
    quality: props.quality == null ? undefined : +props.quality
  };
}
var wcWarned = {};
function wcWarnOnce(key, message, err) {
  if (wcWarned[key]) return;
  wcWarned[key] = true;
  console.warn(message, err);
}
function useWatercolorLayers(painting, opts) {
  var kit = window.WatercolorKit;
  if (typeof painting !== 'function' || !kit || typeof kit.layers !== 'function') return null;
  try {
    return kit.layers(painting, wcLayerOpts(opts || {}));
  } catch (e) {
    wcWarnOnce('layers:' + e, 'watercolor painting failed to build; rendering the fallback sheet', e);
    return null;
  }
}
var WatercolorSheetContext = React.createContext(null);
function WatercolorSheet(props) {
  var L = props.layers || null;
  var style = Object.assign({
    position: 'relative',
    display: 'block',
    width: '100%',
    aspectRatio: L ? L.width + ' / ' + L.height : '3 / 4',
    isolation: 'isolate',
    overflow: 'hidden'
  }, props.style);
  if (!L) {
    return /*#__PURE__*/React.createElement("div", {
      style: Object.assign(style, {
        background: '#f4f1e8',
        color: '#8a8270',
        font: '12px system-ui, sans-serif',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      })
    }, "watercolor-kit.js not loaded (or the painting failed to build)");
  }
  return /*#__PURE__*/React.createElement(WatercolorSheetContext.Provider, {
    value: L
  }, /*#__PURE__*/React.createElement("div", {
    style: style,
    "data-om-watercolor-sheet": true
  }, /*#__PURE__*/React.createElement("img", {
    src: L.paper,
    alt: props.alt || '',
    style: {
      position: 'absolute',
      left: 0,
      top: 0,
      width: '100%',
      height: '100%',
      display: 'block'
    }
  }), props.children));
}
function WatercolorStroke(props) {
  var fromSheet = React.useContext(WatercolorSheetContext);
  var L = props.layers || fromSheet;
  if (!L) return null;
  var i = +props.index;
  if (!(i >= 0) || i >= L.count) return null;
  var at = props.at == null ? 1 : clamp(+props.at, 0, 1);
  if (!(at > 0)) return null;
  var box, src;
  try {
    box = L.box(i);
    src = box ? L.src(i, at) : null;
  } catch (e) {
    wcWarnOnce('stroke:' + i + ':' + e, 'watercolor stroke ' + i + ' failed to render; skipping it', e);
    return null;
  }
  if (!box || !src) return null;
  var style = Object.assign({
    position: 'absolute',
    display: 'block',
    left: box.x * 100 + '%',
    top: box.y * 100 + '%',
    width: box.w * 100 + '%',
    height: box.h * 100 + '%',
    mixBlendMode: L.kind(i) === 'reserve' ? 'normal' : 'multiply',
    pointerEvents: 'none'
  }, props.style);
  return /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: "",
    "data-om-watercolor-stroke": i,
    "data-om-stroke-kind": L.kind(i),
    style: style
  });
}

// The default watercolor moment: the painting assembled from its strokes,
// each appearing in painting order (a pure function of T).
function WatercolorPainting(props) {
  var c = useComposition();
  var from = +props.from || 0;
  var to = props.to == null ? from + 6 : +props.to;
  var u = clamp((c.T - from) / Math.max(to - from, 0.001), 0, 1);
  var eased = Easing.easeInOutQuad(u);
  var L = useWatercolorLayers(props.painting, props);
  var tick = React.useState(0)[1];
  var warmed = React.useRef(null);
  React.useEffect(function () {
    if (!L || typeof L.warm !== 'function') return;
    var p = L.warm();
    if (warmed.current === p) return;
    var live = true;
    p.then(function () {
      warmed.current = p;
      if (live) tick(function (x) {
        return x + 1;
      });
    });
    return function () {
      live = false;
    };
  }, [L && L.paper, props.painting]);
  var strokes = [];
  if (L) {
    for (var i = 0; i < L.count; i++) {
      var sp = L.span(i);
      var at = clamp((eased - sp.from) / Math.max(sp.to - sp.from, 1e-6), 0, 1);
      if (at <= 0) break;
      strokes.push(/*#__PURE__*/React.createElement(WatercolorStroke, {
        key: i,
        layers: L,
        index: i,
        at: at
      }));
    }
  }
  return /*#__PURE__*/React.createElement(WatercolorSheet, {
    layers: L,
    style: props.style,
    alt: props.alt
  }, strokes);
}

// Paint-on watercolor reveal as a pure function of T — an <img> with a data:
// URL (the exporter serializes those as-is; a live canvas would export blank).
function WatercolorReveal(props) {
  var c = useComposition();
  var from = +props.from || 0;
  var to = props.to == null ? from + 6 : +props.to;
  var u = clamp((c.T - from) / Math.max(to - from, 0.001), 0, 1);
  var style = Object.assign({
    display: 'block',
    width: '100%',
    height: '100%',
    objectFit: 'contain'
  }, props.style);
  var frames = Array.isArray(props.frames) && props.frames.length ? props.frames : null;
  var steps = frames ? frames.length - 1 : Math.max(1, Math.round(+props.steps || 36));
  var i = Math.min(steps, Math.round(Easing.easeInOutQuad(u) * steps));
  var painting = typeof props.painting === 'function' ? props.painting : null;
  var kit = window.WatercolorKit;
  var w = +props.width || 900,
    h = +props.height || 1200;
  var askScale = +props.scale || Math.min(2, window.devicePixelRatio || 1);
  var opts = {
    width: w,
    height: h,
    scale: Math.min(askScale, Math.sqrt(11000000 / (w * h))),
    seed: props.seed == null ? undefined : +props.seed,
    steps: steps,
    type: props.format || 'image/jpeg',
    quality: props.quality == null ? 0.88 : +props.quality
  };
  var key = opts.width + 'x' + opts.height + '#' + opts.seed + '@' + opts.scale + '/' + steps + ':' + opts.type + '/' + opts.quality;
  var cache = React.useRef({
    fn: null,
    key: '',
    frames: {},
    baking: false
  }).current;
  var tick = React.useState(0)[1];
  if (cache.fn !== painting && String(cache.fn) !== String(painting) || cache.key !== key) {
    cache.key = key;
    cache.frames = {};
    cache.baking = false;
  }
  cache.fn = painting;
  React.useEffect(function () {
    if (frames || cache.baking || !painting || !kit || typeof kit.bake !== 'function') return;
    cache.baking = true;
    var target = cache.frames;
    try {
      kit.bake(painting, opts, function (n, _t, url) {
        target[n] = url;
      }).then(function (all) {
        if (cache.frames !== target) return;
        for (var n = 0; n < all.length; n++) target[n] = all[n];
        tick(function (x) {
          return x + 1;
        });
      }).catch(function () {
        /* failed bake: the guarded lazy path below still renders */
      });
    } catch (e) {
      /* oversized painting: the guarded lazy path below still renders */
    }
  });
  if (frames) return /*#__PURE__*/React.createElement("img", {
    src: frames[i],
    alt: props.alt || '',
    style: style
  });
  if (!kit || !painting) {
    return /*#__PURE__*/React.createElement("div", {
      style: Object.assign({
        width: '100%',
        height: '100%',
        background: '#f4f1e8',
        color: '#8a8270',
        font: '12px system-ui, sans-serif',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }, props.style)
    }, "watercolor-kit.js not loaded (or no painting function)");
  }
  if (!cache.frames[i]) {
    try {
      cache.frames[i] = kit.frame(painting, Object.assign({}, opts, {
        at: i / steps
      }));
    } catch (e) {
      return /*#__PURE__*/React.createElement("div", {
        style: Object.assign({
          width: '100%',
          height: '100%',
          background: '#f4f1e8',
          color: '#8a8270',
          font: '12px system-ui, sans-serif',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }, props.style)
      }, "painting too large to render (", String(e && e.message).slice(0, 80), ")");
    }
  }
  return /*#__PURE__*/React.createElement("img", {
    src: cache.frames[i],
    alt: props.alt || '',
    style: style
  });
}
Object.assign(window, {
  Easing,
  interpolate,
  animate,
  clamp,
  TimelineContext,
  useTime,
  useTimeline,
  Stage,
  PlaybackBar,
  CompositionStage,
  useComposition,
  Shot,
  Captions,
  WatercolorReveal,
  WatercolorPainting,
  WatercolorSheet,
  WatercolorStroke,
  useWatercolorLayers
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "animations-v3.jsx", error: String((e && e.message) || e) }); }

// atlas-dashboard.js
try { (() => {
/* ============================================================
   STARIUM ATLAS — Dashboard
   ============================================================ */

function atShowDashboard() {
  state.view = 'dashboard';
  document.getElementById('dashboard').classList.add('open');
  document.getElementById('btn-dashboard').classList.add('on');
  renderDashboard();
}
function atShowGraph() {
  state.view = 'graph';
  document.getElementById('dashboard').classList.remove('open');
  document.getElementById('btn-dashboard').classList.remove('on');
}
function dbPill(label, color, bg) {
  return `<span class="db-row-pill" style="background:${bg};color:${color}">${label}</span>`;
}
function renderDashboard() {
  const apps = NODES.filter(n => n.type === 'application');
  const procs = NODES.filter(n => n.type === 'processus');
  const fournisseurs = NODES.filter(n => n.type === 'fournisseur');
  const criticalFlows = EDGES.filter(e => e.crit === 'critique' || !e.secure);
  const insecureFlows = EDGES.filter(e => !e.secure);
  const exposedApps = NODES.filter(n => (n.badges || []).includes('internet'));
  const orphanOwners = NODES.filter(n => !n.ownerBiz && !n.ownerTech);
  const criticalRisks = Object.entries(RISKS).flatMap(([id, rs]) => rs.filter(r => r.niveau === 'critique').map(r => ({
    id,
    ...r
  })));
  const ssiGaps = Object.entries(COMPLIANCE).flatMap(([id, cs]) => cs.filter(c => c.type === 'ssi').map(c => ({
    id,
    ...c
  })));
  const rgpdGaps = Object.entries(COMPLIANCE).flatMap(([id, cs]) => cs.filter(c => c.type === 'rgpd').map(c => ({
    id,
    ...c
  })));
  const lateActions = Object.entries(ACTIONS).flatMap(([id, as]) => as.filter(a => a.statut === 'En retard').map(a => ({
    id,
    ...a
  })));
  const expectedDecisions = Object.entries(ACTIONS).flatMap(([id, as]) => as.filter(a => a.type === 'decision').map(a => ({
    id,
    ...a
  })));
  const kpis = [{
    label: 'Objets cartographiés',
    val: NODES.length,
    sub: 'toutes catégories'
  }, {
    label: 'Applications',
    val: apps.length,
    sub: apps.filter(a => a.crit === 'critique').length + ' critiques'
  }, {
    label: 'Processus',
    val: procs.length,
    sub: procs.filter(p => p.crit === 'elevee' || p.crit === 'critique').length + ' à forte criticité'
  }, {
    label: 'Flux cartographiés',
    val: EDGES.length,
    sub: criticalFlows.length + ' critiques'
  }, {
    label: 'Flux non sécurisés',
    val: insecureFlows.length,
    sub: 'à traiter en priorité',
    color: DANGER
  }, {
    label: 'Applications exposées internet',
    val: exposedApps.length,
    sub: 'accès public',
    color: DANGER
  }, {
    label: 'Objets sans propriétaire',
    val: orphanOwners.length,
    sub: 'fiche à compléter'
  }, {
    label: 'Risques critiques',
    val: criticalRisks.length,
    sub: 'ouverts',
    color: DANGER
  }, {
    label: 'Écarts SSI',
    val: ssiGaps.length,
    sub: 'contrôles en écart'
  }, {
    label: 'Écarts RGPD',
    val: rgpdGaps.length,
    sub: 'traitements à documenter'
  }, {
    label: 'Actions en retard',
    val: lateActions.length,
    sub: 'à traiter',
    color: DANGER
  }, {
    label: 'Décisions CODIR attendues',
    val: expectedDecisions.length,
    sub: 'arbitrage requis',
    color: 'var(--gold)'
  }];
  const topApps = [...apps].sort((a, b) => critRank(b.crit) - critRank(a.crit)).slice(0, 10);
  const obsoleteOnCritical = apps.filter(a => a.completeness < 60 && EDGES.some(e => e.t === a.id && e.flow === 'metier' && ['critique', 'elevee'].includes((NODE_BY_ID[e.s] || {}).crit)));
  document.getElementById('dashboard').innerHTML = `
    <div class="db-maxw">
      <button class="tb-back" style="margin-bottom:18px" onclick="atShowGraph()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg></button>
      <div class="db-head"><div class="db-h1">Dashboard Atlas</div><div class="db-sub">Vue consolidée de la cartographie — ce qui est critique, fragile ou non conforme.</div></div>
      <div class="db-kpis">${kpis.map(k => `<div class="db-kpi"><div class="db-kpi-label">${k.label}</div><div class="db-kpi-val mono" style="${k.color ? 'color:' + k.color : ''}">${k.val}</div><div class="db-kpi-sub">${k.sub}</div></div>`).join('')}</div>

      <div class="db-grid2">
        <div class="db-block">
          <div class="db-block-h"><span class="db-block-title">Top applications critiques</span><span class="db-block-count">${topApps.length}</span></div>
          ${topApps.map(a => dbRow(a, CRIT_META[a.crit])).join('') || '<div class="db-empty-row">Aucune application.</div>'}
        </div>
        <div class="db-block">
          <div class="db-block-h"><span class="db-block-title">Flux critiques non sécurisés</span><span class="db-block-count">${insecureFlows.length}</span></div>
          ${insecureFlows.map(e => {
    const s = NODE_BY_ID[e.s],
      t = NODE_BY_ID[e.t];
    return `<div class="db-row"><div class="db-row-ico" style="background:rgba(229,86,74,.16)"><svg viewBox="0 0 24 24" fill="none" stroke="${DANGER}" stroke-width="2" stroke-linecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/></svg></div><div class="db-row-name">${s.name} → ${t.name}</div><div class="db-row-meta">${e.mode}</div>${dbPill('Non sécurisé', DANGER, 'rgba(229,86,74,.16)')}</div>`;
  }).join('') || '<div class="db-empty-row">Aucun flux non sécurisé détecté.</div>'}
        </div>
      </div>

      <div class="db-grid2">
        <div class="db-block">
          <div class="db-block-h"><span class="db-block-title">Applications fragiles sur un processus critique</span><span class="db-block-count">${obsoleteOnCritical.length}</span></div>
          ${obsoleteOnCritical.map(a => dbRow(a, {
    label: 'Fiche ' + a.completeness + '%',
    color: 'var(--gold)'
  })).join('') || '<div class="db-empty-row">Aucune application concernée.</div>'}
        </div>
        <div class="db-block">
          <div class="db-block-h"><span class="db-block-title">Fournisseurs critiques</span><span class="db-block-count">${fournisseurs.filter(f => ['critique', 'elevee'].includes(f.crit)).length}</span></div>
          ${fournisseurs.filter(f => ['critique', 'elevee'].includes(f.crit)).map(f => dbRow(f, CRIT_META[f.crit])).join('') || '<div class="db-empty-row">Aucun fournisseur critique.</div>'}
        </div>
      </div>

      <div class="db-grid2">
        <div class="db-block">
          <div class="db-block-h"><span class="db-block-title">Écarts SSI / RGPD sans action corrective</span><span class="db-block-count">${[...ssiGaps, ...rgpdGaps].filter(g => !g.action).length}</span></div>
          ${[...ssiGaps, ...rgpdGaps].filter(g => !g.action).map(g => `<div class="db-row"><div class="db-row-name">${NODE_BY_ID[g.id].name}</div><div class="db-row-meta">${g.exigence}</div></div>`).join('') || '<div class="db-empty-row">Tous les écarts ont une action corrective associée.</div>'}
        </div>
        <div class="db-block">
          <div class="db-block-h"><span class="db-block-title">Décisions CODIR attendues</span><span class="db-block-count">${expectedDecisions.length}</span></div>
          ${expectedDecisions.map(d => `<div class="db-row"><div class="db-row-ico" style="background:rgba(63,190,132,.16)"><svg viewBox="0 0 24 24" fill="none" stroke="#3FBE84" stroke-width="2" stroke-linecap="round"><polyline points="22 4 12 14.01 9 11.01"/></svg></div><div><div class="db-row-name">${d.title}</div><div class="db-row-meta">${NODE_BY_ID[d.id].name} · échéance ${fmt(d.echeance)}</div></div>${dbPill('Arbitrage CODIR', 'var(--gold)', 'rgba(232,163,23,.16)')}</div>`).join('') || '<div class="db-empty-row">Aucune décision en attente.</div>'}
        </div>
      </div>
    </div>
  `;
}
function critRank(c) {
  return {
    critique: 4,
    elevee: 3,
    moyenne: 2,
    faible: 1
  }[c] || 0;
}
function dbRow(n, pill) {
  const tm = TYPE_META[n.type];
  return `<div class="db-row" onclick="atShowGraph();atSelect('${n.id}')" style="cursor:pointer">
    <div class="db-row-ico" style="background:${tm.bg}"><svg viewBox="0 0 24 24" fill="none" stroke="${tm.color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${tm.icon}</svg></div>
    <div class="db-row-name">${n.name}</div>
    <div class="db-row-meta">${n.ownerTech || n.ownerBiz || ''}</div>
    ${dbPill(pill.label, pill.color, pill.bg || 'rgba(255,255,255,.06)')}
  </div>`;
}
})(); } catch (e) { __ds_ns.__errors.push({ path: "atlas-dashboard.js", error: String((e && e.message) || e) }); }

// atlas-data.js
try { (() => {
/* ============================================================
   STARIUM ATLAS — jeu de données de démonstration
   Bailleur social / ETI — ~30 objets, flux, risques, conformité
   ============================================================ */

const TYPE_META = {
  application: {
    label: 'Application',
    color: '#5B9BF0',
    bg: 'rgba(91,155,240,.16)',
    icon: '<rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/>'
  },
  processus: {
    label: 'Processus',
    color: '#B892F2',
    bg: 'rgba(184,146,242,.16)',
    icon: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'
  },
  donnee: {
    label: 'Donnée',
    color: '#3FBE84',
    bg: 'rgba(63,190,132,.16)',
    icon: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/>'
  },
  infrastructure: {
    label: 'Infrastructure',
    color: '#8A93A3',
    bg: 'rgba(138,147,163,.16)',
    icon: '<rect x="2" y="3" width="20" height="7" rx="1"/><rect x="2" y="14" width="20" height="7" rx="1"/><line x1="6" y1="6.5" x2="6.01" y2="6.5"/><line x1="6" y1="17.5" x2="6.01" y2="17.5"/>'
  },
  fournisseur: {
    label: 'Fournisseur',
    color: '#F0A05C',
    bg: 'rgba(240,160,92,.16)',
    icon: '<path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>'
  },
  site: {
    label: 'Site',
    color: '#4FC7B8',
    bg: 'rgba(79,199,184,.16)',
    icon: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>'
  }
};
const CRIT_META = {
  critique: {
    label: 'Critique',
    color: '#E5564A',
    bg: 'rgba(229,86,74,.16)'
  },
  elevee: {
    label: 'Élevée',
    color: '#E8A317',
    bg: 'rgba(232,163,23,.16)'
  },
  moyenne: {
    label: 'Moyenne',
    color: '#5B9BF0',
    bg: 'rgba(91,155,240,.14)'
  },
  faible: {
    label: 'Faible',
    color: '#8A93A3',
    bg: 'rgba(138,147,163,.16)'
  }
};
const LAYERS_META = {
  processus: 'Processus',
  applications: 'Applications',
  flux_app: 'Flux applicatifs',
  flux_tech: 'Flux techniques',
  donnees: 'Données',
  fournisseurs: 'Fournisseurs',
  infra: 'Infrastructures',
  sites: 'Sites',
  risques: 'Risques',
  ssi: 'Conformité SSI',
  rgpd: 'Conformité RGPD',
  projets: 'Projets',
  decisions: 'Décisions',
  actions: 'Actions'
};

/* ---------- Nœuds ---------- */
const NODES = [
// Processus
{
  id: 'p1',
  type: 'processus',
  name: 'Quittancement',
  x: 230,
  y: 150,
  crit: 'elevee',
  status: 'Actif',
  ownerBiz: 'Direction Gestion Locative',
  ownerTech: 'DSI',
  lastReview: '2026-03-02',
  completeness: 88,
  desc: "Émission et suivi des quittances de loyer auprès des locataires."
}, {
  id: 'p2',
  type: 'processus',
  name: 'Attribution de logements',
  x: 230,
  y: 260,
  crit: 'moyenne',
  status: 'Actif',
  ownerBiz: 'Direction Gestion Locative',
  ownerTech: 'DSI',
  lastReview: '2025-11-14',
  completeness: 74,
  desc: "Instruction des dossiers et attribution des logements sociaux."
}, {
  id: 'p3',
  type: 'processus',
  name: 'Gestion des réclamations',
  x: 230,
  y: 370,
  crit: 'moyenne',
  status: 'Actif',
  ownerBiz: 'Relation locataires',
  ownerTech: 'DSI',
  lastReview: '2026-01-20',
  completeness: 80,
  desc: "Traitement des réclamations et demandes des locataires."
}, {
  id: 'p4',
  type: 'processus',
  name: 'Gestion des sinistres',
  x: 390,
  y: 430,
  crit: 'moyenne',
  status: 'Actif',
  ownerBiz: 'Direction Technique',
  ownerTech: 'DSI',
  lastReview: '2025-09-05',
  completeness: 62,
  desc: "Déclaration, suivi et clôture des sinistres immobiliers."
}, {
  id: 'p5',
  type: 'processus',
  name: 'Paie',
  x: 400,
  y: 130,
  crit: 'elevee',
  status: 'Actif',
  ownerBiz: 'DRH',
  ownerTech: 'DSI',
  lastReview: '2026-02-18',
  completeness: 95,
  desc: "Établissement et versement de la paie du personnel."
}, {
  id: 'p6',
  type: 'processus',
  name: "Recouvrement des impayés",
  x: 390,
  y: 300,
  crit: 'moyenne',
  status: 'Actif',
  ownerBiz: 'Direction Gestion Locative',
  ownerTech: 'DSI',
  lastReview: '2025-12-01',
  completeness: 70,
  desc: "Suivi et relance des loyers impayés."
},
// Applications
{
  id: 'a1',
  type: 'application',
  name: 'ERP Gestion Locative',
  x: 650,
  y: 200,
  crit: 'critique',
  status: 'Production',
  ownerBiz: 'Direction Gestion Locative',
  ownerTech: 'Julien Thomas',
  lastReview: '2026-02-10',
  completeness: 92,
  badges: ['projet', 'decision'],
  desc: "Socle applicatif central : locataires, patrimoine, quittancement, contentieux."
}, {
  id: 'a2',
  type: 'application',
  name: 'Portail Locataires',
  x: 860,
  y: 150,
  crit: 'critique',
  status: 'Production',
  ownerBiz: 'Relation locataires',
  ownerTech: 'Alice Bernard',
  lastReview: '2025-08-22',
  completeness: 78,
  badges: ['risque', 'internet', 'ssi', 'action'],
  desc: "Espace self-care : consultation de compte, paiement en ligne, réclamations."
}, {
  id: 'a3',
  type: 'application',
  name: 'GED',
  x: 650,
  y: 340,
  crit: 'moyenne',
  status: 'Production',
  ownerBiz: 'Direction Technique',
  ownerTech: 'Sophie Leroy',
  lastReview: '2026-01-05',
  completeness: 83,
  desc: "Gestion électronique des documents contractuels et techniques."
}, {
  id: 'a4',
  type: 'application',
  name: 'CRM Contacts',
  x: 840,
  y: 300,
  crit: 'moyenne',
  status: 'Production',
  ownerBiz: 'Relation locataires',
  ownerTech: 'Alice Bernard',
  lastReview: '2025-10-30',
  completeness: 86,
  desc: "Suivi de la relation locataire multicanal."
}, {
  id: 'a5',
  type: 'application',
  name: 'Logiciel de Paie',
  x: 650,
  y: 460,
  crit: 'elevee',
  status: 'Production',
  ownerBiz: 'DRH',
  ownerTech: 'Paul Dubois',
  lastReview: '2026-02-18',
  completeness: 90,
  desc: "Calcul et édition des bulletins de paie, DSN."
}, {
  id: 'a6',
  type: 'application',
  name: 'Outil de Ticketing Réclamations',
  x: 790,
  y: 430,
  crit: 'faible',
  status: 'Production',
  ownerBiz: 'Relation locataires',
  ownerTech: 'Sophie Leroy',
  lastReview: '2025-07-12',
  completeness: 69,
  desc: "File de traitement des réclamations locataires."
}, {
  id: 'a7',
  type: 'application',
  name: 'Outil décisionnel BI',
  x: 960,
  y: 250,
  crit: 'faible',
  status: 'Production',
  ownerTech: 'Paul Dubois',
  lastReview: '2024-11-02',
  completeness: 41,
  badges: ['fiche'],
  desc: "Restitution des indicateurs de pilotage patrimoine et social."
},
// Données
{
  id: 'd1',
  type: 'donnee',
  name: 'Données locataires',
  x: 700,
  y: 610,
  crit: 'critique',
  status: 'Actif',
  ownerBiz: 'DPO',
  ownerTech: 'Sophie Leroy',
  lastReview: '2025-06-01',
  completeness: 65,
  badges: ['sensible', 'rgpd'],
  desc: "Identité, situation familiale et financière des locataires."
}, {
  id: 'd2',
  type: 'donnee',
  name: 'Données de paie',
  x: 555,
  y: 650,
  crit: 'elevee',
  status: 'Actif',
  ownerBiz: 'DRH',
  ownerTech: 'Paul Dubois',
  lastReview: '2026-02-18',
  completeness: 88,
  badges: ['sensible'],
  desc: "Rémunérations, coordonnées bancaires et données sociales du personnel."
}, {
  id: 'd3',
  type: 'donnee',
  name: 'Référentiel patrimoine',
  x: 840,
  y: 600,
  crit: 'moyenne',
  status: 'Actif',
  ownerBiz: 'Direction Technique',
  ownerTech: 'Sophie Leroy',
  lastReview: '2025-10-11',
  completeness: 79,
  desc: "Référentiel des immeubles, logements et équipements."
},
// Infrastructure
{
  id: 'i1',
  type: 'infrastructure',
  name: 'Serveur applicatif principal',
  x: 650,
  y: 790,
  crit: 'critique',
  status: 'Production',
  ownerTech: 'Julien Thomas',
  lastReview: '2025-05-14',
  completeness: 70,
  badges: ['support'],
  desc: "Cluster hébergeant les applications métier critiques."
}, {
  id: 'i2',
  type: 'infrastructure',
  name: 'Base de données ERP',
  x: 555,
  y: 850,
  crit: 'critique',
  status: 'Production',
  ownerTech: 'Julien Thomas',
  lastReview: '2026-01-15',
  completeness: 84,
  desc: "Instance SQL principale de l'ERP Gestion Locative."
}, {
  id: 'i3',
  type: 'infrastructure',
  name: 'Base de données CRM',
  x: 750,
  y: 880,
  crit: 'moyenne',
  status: 'Production',
  ownerTech: 'Sophie Leroy',
  lastReview: '2025-11-20',
  completeness: 81,
  desc: "Instance dédiée au CRM Contacts."
}, {
  id: 'i4',
  type: 'infrastructure',
  name: 'Sauvegardes',
  x: 455,
  y: 900,
  crit: 'elevee',
  status: 'Production',
  ownerTech: 'Sophie Leroy',
  lastReview: '2026-01-15',
  completeness: 75,
  desc: "Politique de sauvegarde et de restauration des données critiques."
}, {
  id: 'i5',
  type: 'infrastructure',
  name: 'Annuaire Active Directory',
  x: 855,
  y: 800,
  crit: 'elevee',
  status: 'Production',
  ownerTech: 'Julien Thomas',
  lastReview: '2025-09-30',
  completeness: 73,
  desc: "Référentiel d'identités et d'authentification interne."
}, {
  id: 'i6',
  type: 'infrastructure',
  name: 'Pare-feu / VPN',
  x: 970,
  y: 850,
  crit: 'elevee',
  status: 'Production',
  ownerTech: 'Sophie Leroy',
  lastReview: '2024-12-02',
  completeness: 58,
  badges: ['ssi'],
  desc: "Filtrage périmétrique et accès distants sécurisés."
}, {
  id: 'i7',
  type: 'infrastructure',
  name: 'Supervision technique',
  x: 1050,
  y: 770,
  crit: 'faible',
  status: 'Production',
  ownerTech: 'Sophie Leroy',
  lastReview: '2025-11-01',
  completeness: 66,
  desc: "Monitoring de disponibilité et de performance des systèmes."
},
// Fournisseurs
{
  id: 'f1',
  type: 'fournisseur',
  name: 'Éditeur ERP',
  x: 1260,
  y: 190,
  crit: 'critique',
  status: 'Contrat actif',
  ownerBiz: 'Direction Achats',
  lastReview: '2025-04-18',
  completeness: 77,
  desc: "Éditeur et TMA de l'ERP Gestion Locative."
}, {
  id: 'f2',
  type: 'fournisseur',
  name: 'Hébergeur Cloud',
  x: 1310,
  y: 340,
  crit: 'elevee',
  status: 'Contrat actif',
  ownerBiz: 'Direction Achats',
  lastReview: '2025-06-22',
  completeness: 82,
  desc: "Hébergement infogéré du datacenter applicatif."
}, {
  id: 'f3',
  type: 'fournisseur',
  name: 'Infogérant IT',
  x: 1310,
  y: 500,
  crit: 'elevee',
  status: 'Contrat actif',
  ownerBiz: 'Direction Achats',
  lastReview: '2024-10-09',
  completeness: 54,
  badges: ['decision', 'action'],
  desc: "Exploitation et maintien en condition opérationnelle du SI."
}, {
  id: 'f4',
  type: 'fournisseur',
  name: 'Éditeur SaaS Paie',
  x: 1260,
  y: 650,
  crit: 'critique',
  status: 'Contrat actif',
  ownerBiz: 'DRH',
  lastReview: '2025-03-01',
  completeness: 69,
  desc: "Plateforme SaaS de calcul de paie et DSN."
},
// Sites
{
  id: 's1',
  type: 'site',
  name: 'Siège social',
  x: 200,
  y: 760,
  crit: 'faible',
  status: 'Actif',
  lastReview: '2025-01-10',
  completeness: 60,
  desc: "Site principal hébergeant les services support et la DSI."
}, {
  id: 's2',
  type: 'site',
  name: 'Agences territoriales',
  x: 200,
  y: 870,
  crit: 'faible',
  status: 'Actif',
  lastReview: '2025-01-10',
  completeness: 55,
  desc: "Réseau d'agences de proximité (accueil locataires)."
}];

/* ---------- Flux (arêtes) ---------- */
const EDGES = [{
  id: 'e1',
  s: 'p1',
  t: 'a1',
  flow: 'metier',
  mode: 'Intégré',
  freq: 'Temps réel',
  crit: 'elevee',
  dir: 'uni',
  secure: true,
  manual: false
}, {
  id: 'e2',
  s: 'p2',
  t: 'a1',
  flow: 'metier',
  mode: 'Intégré',
  freq: 'Quotidien',
  crit: 'moyenne',
  dir: 'uni',
  secure: true,
  manual: false
}, {
  id: 'e3',
  s: 'p2',
  t: 'a2',
  flow: 'metier',
  mode: 'API',
  freq: 'Temps réel',
  crit: 'moyenne',
  dir: 'uni',
  secure: true,
  manual: false
}, {
  id: 'e4',
  s: 'p3',
  t: 'a6',
  flow: 'metier',
  mode: 'API',
  freq: 'Temps réel',
  crit: 'moyenne',
  dir: 'uni',
  secure: true,
  manual: false
}, {
  id: 'e5',
  s: 'p4',
  t: 'a3',
  flow: 'metier',
  mode: 'Saisie manuelle',
  freq: 'À l\'événement',
  crit: 'moyenne',
  dir: 'uni',
  secure: true,
  manual: true
}, {
  id: 'e6',
  s: 'p5',
  t: 'a5',
  flow: 'metier',
  mode: 'Intégré',
  freq: 'Mensuel',
  crit: 'elevee',
  dir: 'uni',
  secure: true,
  manual: false
}, {
  id: 'e7',
  s: 'p6',
  t: 'a1',
  flow: 'metier',
  mode: 'Intégré',
  freq: 'Quotidien',
  crit: 'moyenne',
  dir: 'uni',
  secure: true,
  manual: false
}, {
  id: 'e8',
  s: 'a1',
  t: 'a2',
  flow: 'applicatif',
  mode: 'API',
  freq: 'Temps réel',
  crit: 'critique',
  dir: 'bi',
  secure: true,
  manual: false
}, {
  id: 'e9',
  s: 'a1',
  t: 'a3',
  flow: 'applicatif',
  mode: 'Fichier plat',
  freq: 'Quotidien',
  crit: 'moyenne',
  dir: 'uni',
  secure: true,
  manual: false
}, {
  id: 'e10',
  s: 'a1',
  t: 'a4',
  flow: 'applicatif',
  mode: 'Batch',
  freq: 'Nocturne',
  crit: 'moyenne',
  dir: 'bi',
  secure: true,
  manual: false
}, {
  id: 'e11',
  s: 'a4',
  t: 'a7',
  flow: 'applicatif',
  mode: 'Batch',
  freq: 'Hebdomadaire',
  crit: 'faible',
  dir: 'uni',
  secure: true,
  manual: false
}, {
  id: 'e12',
  s: 'a5',
  t: 'f4',
  flow: 'fournisseur',
  mode: 'SFTP',
  freq: 'Mensuel',
  crit: 'critique',
  dir: 'bi',
  secure: false,
  manual: true
}, {
  id: 'e13',
  s: 'i5',
  t: 'a1',
  flow: 'technique',
  mode: 'LDAP',
  freq: 'Temps réel',
  crit: 'elevee',
  dir: 'uni',
  secure: true,
  manual: false
}, {
  id: 'e14',
  s: 'i5',
  t: 'a2',
  flow: 'technique',
  mode: 'LDAP',
  freq: 'Temps réel',
  crit: 'elevee',
  dir: 'uni',
  secure: true,
  manual: false
}, {
  id: 'e15',
  s: 'i5',
  t: 'a4',
  flow: 'technique',
  mode: 'LDAP',
  freq: 'Temps réel',
  crit: 'moyenne',
  dir: 'uni',
  secure: true,
  manual: false
}, {
  id: 'e16',
  s: 'd1',
  t: 'i2',
  flow: 'technique',
  mode: 'Stockage',
  freq: 'Continu',
  crit: 'critique',
  dir: 'uni',
  secure: true,
  manual: false
}, {
  id: 'e17',
  s: 'd1',
  t: 'a4',
  flow: 'applicatif',
  mode: 'API',
  freq: 'Temps réel',
  crit: 'moyenne',
  dir: 'uni',
  secure: true,
  manual: false
}, {
  id: 'e18',
  s: 'd2',
  t: 'a5',
  flow: 'applicatif',
  mode: 'Intégré',
  freq: 'Mensuel',
  crit: 'elevee',
  dir: 'uni',
  secure: true,
  manual: false
}, {
  id: 'e19',
  s: 'd3',
  t: 'a1',
  flow: 'applicatif',
  mode: 'Intégré',
  freq: 'Quotidien',
  crit: 'moyenne',
  dir: 'uni',
  secure: true,
  manual: false
}, {
  id: 'e20',
  s: 'a1',
  t: 'i2',
  flow: 'technique',
  mode: 'SQL',
  freq: 'Continu',
  crit: 'critique',
  dir: 'uni',
  secure: true,
  manual: false
}, {
  id: 'e21',
  s: 'a4',
  t: 'i3',
  flow: 'technique',
  mode: 'SQL',
  freq: 'Continu',
  crit: 'moyenne',
  dir: 'uni',
  secure: true,
  manual: false
}, {
  id: 'e22',
  s: 'i2',
  t: 'i4',
  flow: 'technique',
  mode: 'Réplication',
  freq: 'Quotidien',
  crit: 'elevee',
  dir: 'uni',
  secure: true,
  manual: false
}, {
  id: 'e23',
  s: 'i3',
  t: 'i4',
  flow: 'technique',
  mode: 'Réplication',
  freq: 'Quotidien',
  crit: 'moyenne',
  dir: 'uni',
  secure: true,
  manual: false
}, {
  id: 'e24',
  s: 'a1',
  t: 'i1',
  flow: 'technique',
  mode: 'Hébergement',
  freq: 'Continu',
  crit: 'critique',
  dir: 'uni',
  secure: true,
  manual: false
}, {
  id: 'e25',
  s: 'a2',
  t: 'i1',
  flow: 'technique',
  mode: 'Hébergement',
  freq: 'Continu',
  crit: 'critique',
  dir: 'uni',
  secure: true,
  manual: false
}, {
  id: 'e26',
  s: 'i7',
  t: 'i1',
  flow: 'technique',
  mode: 'Monitoring',
  freq: 'Continu',
  crit: 'faible',
  dir: 'uni',
  secure: true,
  manual: false
}, {
  id: 'e27',
  s: 'a2',
  t: 'i6',
  flow: 'technique',
  mode: 'Réseau',
  freq: 'Continu',
  crit: 'elevee',
  dir: 'uni',
  secure: true,
  manual: false
}, {
  id: 'e28',
  s: 'f2',
  t: 'i1',
  flow: 'fournisseur',
  mode: 'Hébergement',
  freq: 'Continu',
  crit: 'elevee',
  dir: 'uni',
  secure: true,
  manual: false
}, {
  id: 'e29',
  s: 'f3',
  t: 'i1',
  flow: 'fournisseur',
  mode: 'Exploitation',
  freq: 'Continu',
  crit: 'elevee',
  dir: 'uni',
  secure: true,
  manual: false
}, {
  id: 'e30',
  s: 'f3',
  t: 'i6',
  flow: 'fournisseur',
  mode: 'Exploitation',
  freq: 'Continu',
  crit: 'elevee',
  dir: 'uni',
  secure: true,
  manual: false
}, {
  id: 'e31',
  s: 'f1',
  t: 'a1',
  flow: 'fournisseur',
  mode: 'TMA',
  freq: 'Continu',
  crit: 'critique',
  dir: 'bi',
  secure: true,
  manual: false
}, {
  id: 'e32',
  s: 's1',
  t: 'i1',
  flow: 'technique',
  mode: 'Hébergement local',
  freq: 'Continu',
  crit: 'faible',
  dir: 'uni',
  secure: true,
  manual: false
}, {
  id: 'e33',
  s: 's2',
  t: 'a1',
  flow: 'applicatif',
  mode: 'API',
  freq: 'Temps réel',
  crit: 'moyenne',
  dir: 'uni',
  secure: true,
  manual: false
}];

/* ---------- Risques ---------- */
const RISKS = {
  a2: [{
    title: "Exposition internet sans authentification forte",
    niveau: 'critique',
    score: '18/25',
    statut: 'Ouvert',
    responsable: 'Alice Bernard',
    echeance: '2026-08-15'
  }],
  f3: [{
    title: "Absence de plan de continuité d'activité formalisé",
    niveau: 'elevee',
    score: '14/25',
    statut: 'En traitement',
    responsable: 'Sophie Leroy',
    echeance: '2026-09-01'
  }],
  a5: [{
    title: "Flux de paie non sécurisé vers l'éditeur SaaS",
    niveau: 'critique',
    score: '16/25',
    statut: 'Ouvert',
    responsable: 'Julien Thomas',
    echeance: '2026-07-20'
  }],
  i1: [{
    title: "Fin de support matériel proche",
    niveau: 'moyenne',
    score: '9/25',
    statut: 'Planifié',
    responsable: 'Julien Thomas',
    echeance: '2026-12-01'
  }],
  i6: [{
    title: "Règles de filtrage obsolètes",
    niveau: 'elevee',
    score: '12/25',
    statut: 'Ouvert',
    responsable: 'Sophie Leroy',
    echeance: '2026-08-01'
  }]
};

/* ---------- Conformité SSI / RGPD ---------- */
const COMPLIANCE = {
  a2: [{
    type: 'ssi',
    exigence: 'Authentification forte (MFA)',
    ecart: "Absente sur l'accès locataire",
    preuve: 'Aucune',
    action: 'Déployer le MFA sur le portail locataires'
  }],
  i6: [{
    type: 'ssi',
    exigence: 'Règles de filtrage à jour',
    ecart: 'Revue de règles > 18 mois',
    preuve: 'Dernière revue 2024-12-02',
    action: 'Planifier une revue des règles de filtrage'
  }],
  d1: [{
    type: 'rgpd',
    exigence: 'Registre des traitements',
    ecart: 'Finalités non documentées pour le module réclamations',
    preuve: 'Registre incomplet',
    action: 'Compléter le registre des traitements'
  }]
};

/* ---------- Projets liés ---------- */
const PROJECTS = {
  a1: [{
    name: 'Refonte Portail Client',
    role: 'Système source'
  }],
  a2: [{
    name: 'Refonte Portail Client',
    role: 'Périmètre applicatif'
  }]
};

/* ---------- Actions & décisions ---------- */
const ACTIONS = {
  a1: [{
    type: 'decision',
    title: "Faut-il migrer l'ERP vers le cloud ?",
    statut: 'Attendue',
    echeance: '2026-09-01',
    codir: true
  }],
  a2: [{
    type: 'action',
    title: 'Déployer le MFA sur le portail locataires',
    statut: 'En cours',
    echeance: '2026-07-25'
  }],
  f3: [{
    type: 'decision',
    title: "Renouveler le contrat d'infogérance ?",
    statut: 'Attendue',
    echeance: '2026-08-01',
    codir: true
  }, {
    type: 'action',
    title: 'Mettre à jour le plan de continuité',
    statut: 'En retard',
    echeance: '2026-06-20'
  }]
};

/* ---------- Vues préconfigurées ---------- */
const PRESETS = [{
  id: 'globale',
  label: 'Globale'
}, {
  id: 'processus',
  label: 'Processus'
}, {
  id: 'applicative',
  label: 'Applicative'
}, {
  id: 'technique',
  label: 'Technique'
}, {
  id: 'conformite',
  label: 'Conformité'
}, {
  id: 'codir',
  label: 'CODIR'
}];
})(); } catch (e) { __ds_ns.__errors.push({ path: "atlas-data.js", error: String((e && e.message) || e) }); }

// atlas-engine.js
try { (() => {
/* ============================================================
   STARIUM ATLAS — moteur du prototype
   ============================================================ */

const FLOW_COLOR = {
  applicatif: '#2A6FDB',
  metier: '#6B2FB2',
  technique: '#6E7685',
  fournisseur: '#C1660A'
};
const DANGER = '#B42318';
const BADGE_META = {
  risque: {
    icon: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    color: DANGER,
    bg: 'rgba(229,86,74,.18)',
    label: 'Risque critique',
    layer: 'risques'
  },
  ssi: {
    icon: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    color: '#E8A317',
    bg: 'rgba(232,163,23,.18)',
    label: 'Écart SSI',
    layer: 'ssi'
  },
  rgpd: {
    icon: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/>',
    color: '#B892F2',
    bg: 'rgba(184,146,242,.18)',
    label: 'Écart RGPD',
    layer: 'rgpd'
  },
  action: {
    icon: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    color: '#E8A317',
    bg: 'rgba(232,163,23,.18)',
    label: 'Action en retard',
    layer: 'actions'
  },
  projet: {
    icon: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
    color: '#5B9BF0',
    bg: 'rgba(91,155,240,.18)',
    label: 'Projet lié',
    layer: 'projets'
  },
  decision: {
    icon: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
    color: '#3FBE84',
    bg: 'rgba(63,190,132,.18)',
    label: 'Décision attendue',
    layer: 'decisions'
  },
  sensible: {
    icon: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    color: '#B892F2',
    bg: 'rgba(184,146,242,.18)',
    label: 'Donnée sensible',
    layer: 'donnees'
  },
  internet: {
    icon: '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z"/>',
    color: DANGER,
    bg: 'rgba(229,86,74,.18)',
    label: 'Exposition internet',
    layer: 'risques'
  },
  support: {
    icon: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
    color: '#8A93A3',
    bg: 'rgba(138,147,163,.18)',
    label: 'Fin de support',
    layer: 'infra'
  },
  fiche: {
    icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
    color: '#8A93A3',
    bg: 'rgba(138,147,163,.18)',
    label: 'Fiche incomplète',
    layer: 'ssi'
  }
};

/* ---------- état global ---------- */
const state = {
  tx: 0,
  ty: 0,
  scale: 1,
  selected: null,
  hovered: null,
  preset: 'globale',
  drawerLeftOpen: false,
  drawerLeftTab: 'calques',
  impact: {
    active: false,
    depth: 1,
    source: null
  },
  view: 'graph',
  // graph | dashboard
  layers: {
    processus: true,
    applications: true,
    flux_app: true,
    flux_tech: true,
    donnees: true,
    fournisseurs: true,
    risques: true,
    ssi: true,
    rgpd: true,
    projets: true,
    decisions: true,
    actions: true,
    infrastructures: false,
    sites: false
  },
  filters: {
    crit: new Set(['critique', 'elevee']),
    statut: 'all',
    owner: 'all',
    hasRisk: false,
    riskLevel: 'all',
    ssiGap: false,
    rgpdGap: false,
    insecure: false,
    notReviewed: false,
    decisionExpected: false
  },
  special: null // 'conformite' | 'codir' | null
};
const NODE_BY_ID = Object.fromEntries(NODES.map(n => [n.id, n]));
const LAYER_KEY_FOR_TYPE = {
  processus: 'processus',
  application: 'applications',
  donnee: 'donnees',
  infrastructure: 'infrastructures',
  fournisseur: 'fournisseurs',
  site: 'sites'
};
function edgesOf(id) {
  return EDGES.filter(e => e.s === id || e.t === id);
}
function neighborsOf(id) {
  const set = new Set();
  edgesOf(id).forEach(e => {
    set.add(e.s === id ? e.t : e.s);
  });
  return set;
}

/* ============================================================
   VISIBILITÉ (filtres + calques + vues)
   ============================================================ */
function nodeVisible(n) {
  const lk = LAYER_KEY_FOR_TYPE[n.type];
  if (!state.layers[lk]) return false;
  const f = state.filters;
  if (!f.crit.has(n.crit)) return false;
  if (f.statut !== 'all' && n.status !== f.statut) return false;
  if (f.owner !== 'all' && n.ownerBiz !== f.owner && n.ownerTech !== f.owner) return false;
  if (f.hasRisk && !RISKS[n.id]) return false;
  if (f.riskLevel !== 'all' && !(RISKS[n.id] || []).some(r => r.niveau === f.riskLevel)) return false;
  if (f.ssiGap && !(COMPLIANCE[n.id] || []).some(c => c.type === 'ssi')) return false;
  if (f.rgpdGap && !(COMPLIANCE[n.id] || []).some(c => c.type === 'rgpd')) return false;
  if (f.insecure && !edgesOf(n.id).some(e => !e.secure)) return false;
  if (f.notReviewed && n.lastReview >= '2025-06-01') return false;
  if (f.decisionExpected && !(ACTIONS[n.id] || []).some(a => a.type === 'decision')) return false;
  if (state.special === 'conformite') {
    const hasGap = RISKS[n.id] || (COMPLIANCE[n.id] || []).length;
    if (!hasGap) return false;
  }
  if (state.special === 'codir') {
    const critCore = n.crit === 'critique' && ['processus', 'application', 'fournisseur'].includes(n.type);
    const critRisk = (RISKS[n.id] || []).some(r => r.niveau === 'critique');
    const decOrLate = (ACTIONS[n.id] || []).some(a => a.type === 'decision' || a.statut === 'En retard');
    if (!(critCore || critRisk || decOrLate)) return false;
  }
  return true;
}
function edgeVisible(e, visibleIds) {
  if (!visibleIds.has(e.s) || !visibleIds.has(e.t)) return false;
  const layerFor = {
    applicatif: 'flux_app',
    metier: 'processus',
    technique: 'flux_tech',
    fournisseur: 'fournisseurs'
  };
  return !!state.layers[layerFor[e.flow]];
}
function computeVisible() {
  const ids = new Set(NODES.filter(nodeVisible).map(n => n.id));
  const edges = EDGES.filter(e => edgeVisible(e, ids));
  return {
    ids,
    edges
  };
}

/* ============================================================
   RENDU DU GRAPHE
   ============================================================ */
const NS = 'http://www.w3.org/2000/svg';
function svgEl(tag, attrs) {
  const el = document.createElementNS(NS, tag);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  return el;
}
let svgRoot, viewportG, edgesG, nodesG;
function initCanvas() {
  const wrap = document.getElementById('canvas-wrap');
  svgRoot = svgEl('svg', {});
  const defs = svgEl('defs', {});
  [['arrow-danger', DANGER], ['arrow-applicatif', FLOW_COLOR.applicatif], ['arrow-metier', FLOW_COLOR.metier], ['arrow-technique', FLOW_COLOR.technique], ['arrow-fournisseur', FLOW_COLOR.fournisseur], ['arrow-dim', '#4A5160']].forEach(([id, color]) => {
    const marker = svgEl('marker', {
      id,
      viewBox: '0 0 10 10',
      refX: '8',
      refY: '5',
      markerWidth: '7',
      markerHeight: '7',
      orient: 'auto-start-reverse'
    });
    marker.appendChild(svgEl('path', {
      d: 'M 0 0 L 10 5 L 0 10 z',
      fill: color
    }));
    defs.appendChild(marker);
  });
  svgRoot.appendChild(defs);

  // fond quadrillé cartographique (points) + ombres/halo des nœuds
  const pat = svgEl('pattern', {
    id: 'atlas-grid',
    width: '48',
    height: '48',
    patternUnits: 'userSpaceOnUse'
  });
  pat.appendChild(svgEl('circle', {
    cx: '2',
    cy: '2',
    r: '1.4',
    fill: '#E4DFD5'
  }));
  defs.appendChild(pat);
  const mkShadow = (id, dy, std, color, op) => {
    const f = svgEl('filter', {
      id,
      x: '-70%',
      y: '-70%',
      width: '240%',
      height: '240%'
    });
    f.appendChild(svgEl('feDropShadow', {
      dx: 0,
      dy,
      stdDeviation: std,
      'flood-color': color,
      'flood-opacity': op
    }));
    defs.appendChild(f);
  };
  mkShadow('atlas-shadow', 3, 4, '#0E0E10', 0.16);
  mkShadow('atlas-glow', 0, 7, '#E8A317', 0.6);
  viewportG = svgEl('g', {
    id: 'viewport'
  });
  const gridG = svgEl('g', {
    id: 'grid-layer'
  });
  gridG.appendChild(svgEl('rect', {
    x: -4000,
    y: -4000,
    width: 10000,
    height: 10000,
    fill: 'url(#atlas-grid)'
  }));
  edgesG = svgEl('g', {
    id: 'edges-layer'
  });
  nodesG = svgEl('g', {
    id: 'nodes-layer'
  });
  viewportG.appendChild(gridG);
  viewportG.appendChild(edgesG);
  viewportG.appendChild(nodesG);
  svgRoot.appendChild(viewportG);
  wrap.appendChild(svgRoot);

  // pan
  let dragging = false,
    lastX = 0,
    lastY = 0,
    moved = false,
    startX = 0,
    startY = 0,
    panActive = false;
  const DRAG_THRESHOLD = 4;
  svgRoot.addEventListener('mousedown', e => {
    dragging = true;
    moved = false;
    panActive = false;
    lastX = e.clientX;
    lastY = e.clientY;
    startX = e.clientX;
    startY = e.clientY;
  });
  window.addEventListener('mousemove', e => {
    if (!dragging) return;
    const totalDx = e.clientX - startX,
      totalDy = e.clientY - startY;
    if (!panActive) {
      if (Math.hypot(totalDx, totalDy) < DRAG_THRESHOLD) return; // ignore tiny jitter — don't pan on a plain click
      panActive = true;
      moved = true;
      svgRoot.classList.add('panning');
      lastX = e.clientX;
      lastY = e.clientY;
      return;
    }
    const dx = e.clientX - lastX,
      dy = e.clientY - lastY;
    state.tx += dx;
    state.ty += dy;
    lastX = e.clientX;
    lastY = e.clientY;
    applyTransform();
  });
  window.addEventListener('mouseup', () => {
    dragging = false;
    panActive = false;
    svgRoot.classList.remove('panning');
  });
  svgRoot.addEventListener('click', e => {
    if (e.target === svgRoot && !moved) atDeselect();
  });

  // zoom (wheel)
  svgRoot.addEventListener('wheel', e => {
    e.preventDefault();
    const rect = svgRoot.getBoundingClientRect();
    const cx = e.clientX - rect.left,
      cy = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    zoomAt(cx, cy, factor);
  }, {
    passive: false
  });
}
function applyTransform() {
  viewportG.setAttribute('transform', `translate(${state.tx},${state.ty}) scale(${state.scale})`);
}
function zoomAt(cx, cy, factor) {
  const newScale = Math.min(2.4, Math.max(0.35, state.scale * factor));
  const ratio = newScale / state.scale;
  state.tx = cx - (cx - state.tx) * ratio;
  state.ty = cy - (cy - state.ty) * ratio;
  state.scale = newScale;
  applyTransform();
}
function atZoom(factor) {
  const rect = svgRoot.getBoundingClientRect();
  zoomAt(rect.width / 2, rect.height / 2, factor);
}
function atRecenter() {
  const rect = svgRoot.getBoundingClientRect();
  if (rect.width < 10 || rect.height < 10) return; // container not laid out yet — bail, ResizeObserver will retry
  const xs = NODES.map(n => n.x),
    ys = NODES.map(n => n.y);
  const minX = Math.min(...xs) - 60,
    maxX = Math.max(...xs) + 60,
    minY = Math.min(...ys) - 60,
    maxY = Math.max(...ys) + 60;
  const w = maxX - minX,
    h = maxY - minY;
  const scale = Math.min(rect.width / w, rect.height / h, 1.1);
  state.scale = scale;
  state.tx = rect.width / 2 - (minX + w / 2) * scale;
  state.ty = rect.height / 2 - (minY + h / 2) * scale + 10;
  applyTransform();
}
function atToggleFullscreen() {
  const target = window.frameElement ? window.top.document.documentElement : document.documentElement;
  const inIframe = !!window.frameElement;
  if (!document.fullscreenElement && !(inIframe && window.top.document.fullscreenElement)) {
    (inIframe ? window.top.document.documentElement : document.documentElement).requestFullscreen().catch(() => {
      document.documentElement.requestFullscreen().catch(() => {});
    });
  } else {
    (document.fullscreenElement ? document : window.top.document).exitFullscreen();
  }
}
function atGoBack() {
  if (window.frameElement && window.parent && window.parent !== window) {
    window.parent.postMessage({
      type: 'starium-atlas-back'
    }, '*');
  } else {
    location.href = 'Refonte Portail Client.html';
  }
}
function critDotColor(crit) {
  return CRIT_META[crit].color;
}
function renderGraph() {
  edgesG.innerHTML = '';
  nodesG.innerHTML = '';
  const {
    ids,
    edges
  } = computeVisible();

  // highlight set (hover or select)
  const focusId = state.hovered || state.selected;
  let highlightNodes = null,
    highlightEdges = null;
  if (focusId && ids.has(focusId)) {
    highlightNodes = new Set([focusId, ...neighborsOf(focusId)]);
    highlightEdges = new Set(edgesOf(focusId).map(e => e.id));
  }
  // impact highlighting overrides hover/select dimming
  let impactDepths = null;
  if (state.impact.active) {
    impactDepths = impactBFS(state.impact.source, state.impact.depth);
  }
  edges.forEach((e, i) => {
    const sN = NODE_BY_ID[e.s],
      tN = NODE_BY_ID[e.t];
    const mx = (sN.x + tN.x) / 2,
      my = (sN.y + tN.y) / 2;
    const dx = tN.x - sN.x,
      dy = tN.y - sN.y,
      dist = Math.hypot(dx, dy) || 1;
    const nx = -dy / dist,
      ny = dx / dist;
    const bend = 18 * (i % 3 - 1);
    const cx = mx + nx * bend,
      cy = my + ny * bend;
    const path = `M ${sN.x} ${sN.y} Q ${cx} ${cy} ${tN.x} ${tN.y}`;
    let color = FLOW_COLOR[e.flow];
    if (!e.secure || e.crit === 'critique') color = DANGER;
    const arrowId = !e.secure || e.crit === 'critique' ? 'arrow-danger' : 'arrow-' + e.flow;
    const p = svgEl('path', {
      class: 'edge',
      d: path,
      stroke: color,
      'stroke-width': e.crit === 'critique' ? 3 : 2,
      'stroke-dasharray': e.manual ? '7 6' : 'none',
      'marker-end': `url(#${arrowId})`,
      'data-id': e.id
    });
    if (e.dir === 'bi') p.setAttribute('marker-start', `url(#${arrowId})`);
    let opacityClass = '';
    if (impactDepths) {
      const inSubgraph = impactDepths.byEdge.has(e.id);
      opacityClass = inSubgraph ? '' : 'dim';
    } else if (highlightEdges) {
      opacityClass = highlightEdges.has(e.id) ? '' : 'dim';
    }
    if (opacityClass) p.classList.add(opacityClass);
    edgesG.appendChild(p);
    const hit = svgEl('path', {
      class: 'edge-hit',
      d: path
    });
    hit.addEventListener('click', ev => {
      ev.stopPropagation();
      atShowEdgeDetail(e.id);
    });
    hit.addEventListener('mouseenter', ev => {
      edgeTooltipShow(e, ev);
    });
    hit.addEventListener('mousemove', ev => {
      edgeTooltipMove(ev);
    });
    hit.addEventListener('mouseleave', () => {
      edgeTooltipHide();
    });
    edgesG.appendChild(hit);
  });
  NODES.filter(n => ids.has(n.id)).forEach(n => {
    const tm = TYPE_META[n.type];
    const g = svgEl('g', {
      class: 'node',
      transform: `translate(${n.x},${n.y})`,
      'data-id': n.id
    });
    if (n.id === state.selected) g.classList.add('selected');
    let opacityClass = '';
    if (impactDepths) {
      opacityClass = impactDepths.byNode.has(n.id) ? '' : 'dim';
    } else if (highlightNodes) {
      opacityClass = highlightNodes.has(n.id) ? '' : 'dim-mid';
    }
    const halo = svgEl('circle', {
      class: 'node-halo',
      r: 30,
      fill: 'none',
      stroke: 'var(--gold, #E8A317)',
      'stroke-width': 2.5
    });
    g.appendChild(halo);
    const circle = svgEl('circle', {
      class: 'node-circle' + (opacityClass ? ' ' + opacityClass : ''),
      r: 23,
      fill: tm.bg,
      stroke: tm.color
    });
    g.appendChild(circle);
    const icoWrap = svgEl('g', {
      class: 'node-icon' + (opacityClass ? ' ' + opacityClass : ''),
      transform: 'translate(-9,-9) scale(0.75)'
    });
    icoWrap.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="${tm.color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${tm.icon}</svg>`;
    const fo = svgEl('foreignObject', {
      x: -11,
      y: -11,
      width: 22,
      height: 22
    });
    fo.innerHTML = `<div xmlns="http://www.w3.org/1999/xhtml" style="width:22px;height:22px;display:flex;align-items:center;justify-content:center;pointer-events:none${opacityClass ? ';opacity:.15' : ''}"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="${tm.color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${tm.icon}</svg></div>`;
    g.appendChild(fo);

    // crit dot
    const cd = svgEl('circle', {
      cx: 16,
      cy: -16,
      r: 6.5,
      fill: critDotColor(n.crit),
      stroke: 'var(--canvas-bg,#EFEBE2)',
      'stroke-width': 2,
      class: opacityClass
    });
    g.appendChild(cd);

    // badges row
    const badges = (n.badges || []).filter(b => state.layers[BADGE_META[b].layer]);
    badges.forEach((b, bi) => {
      const bm = BADGE_META[b];
      const bx = -16 + bi * 13;
      const bcirc = svgEl('circle', {
        cx: bx,
        cy: 20,
        r: 6,
        fill: bm.bg,
        stroke: bm.color,
        'stroke-width': 1.2,
        class: 'badge-dot ' + (opacityClass || '')
      });
      g.appendChild(bcirc);
    });
    const label = svgEl('text', {
      class: 'node-label' + (opacityClass ? ' ' + opacityClass : ''),
      x: 0,
      y: 40,
      'text-anchor': 'middle'
    });
    label.textContent = n.name;
    g.appendChild(label);
    const sub = svgEl('text', {
      class: 'node-sublabel' + (opacityClass ? ' ' + opacityClass : ''),
      x: 0,
      y: 52,
      'text-anchor': 'middle'
    });
    sub.textContent = tm.label;
    g.appendChild(sub);
    g.addEventListener('mouseenter', () => {
      state.hovered = n.id;
      applyFocus();
    });
    g.addEventListener('mouseleave', () => {
      state.hovered = null;
      applyFocus();
    });
    g.addEventListener('click', e => {
      e.stopPropagation();
      atSelect(n.id);
    });
    nodesG.appendChild(g);
  });
  renderLegend();
  applyFocus();
}

/* Applique le surlignage hover/sélection SANS reconstruire le DOM —
   reconstruire au survol détruisait l'élément sous le curseur et empêchait le clic. */
function applyFocus() {
  if (state.impact.active) return; // le dim d'impact est géré par renderGraph
  const focusId = state.hovered || state.selected;
  let highlightNodes = null,
    highlightEdges = null;
  if (focusId) {
    highlightNodes = new Set([focusId, ...neighborsOf(focusId)]);
    highlightEdges = new Set(edgesOf(focusId).map(e => e.id));
  }
  nodesG.querySelectorAll('.node').forEach(g => {
    const id = g.getAttribute('data-id');
    g.classList.toggle('dim-mid', !!highlightNodes && !highlightNodes.has(id));
  });
  edgesG.querySelectorAll('.edge').forEach(p => {
    const id = p.getAttribute('data-id');
    p.classList.toggle('dim', !!highlightEdges && !highlightEdges.has(id));
  });
}

/* ============================================================
   SÉLECTION / DÉTAIL
   ============================================================ */
function atSelect(id) {
  state.selected = id;
  renderGraph();
  ficheOpen(id);
}
function atDeselect() {
  if (state.impact.active) return;
  state.selected = null;
  ficheClose();
  renderGraph();
}
function drCloseAll() {
  atDeselect();
}

/* ============================================================
   DÉTAIL DE FLUX (clic sur un lien du graphe)
   ============================================================ */
const FLOW_LABEL = {
  applicatif: 'Applicatif',
  metier: 'Métier',
  technique: 'Technique',
  fournisseur: 'Fournisseur'
};
function atShowEdgeDetail(edgeId) {
  const e = EDGES.find(x => x.id === edgeId);
  if (!e) return;
  const sN = NODE_BY_ID[e.s],
    tN = NODE_BY_ID[e.t];
  const stm = TYPE_META[sN.type],
    ttm = TYPE_META[tN.type];
  const cm = CRIT_META[e.crit];
  document.getElementById('em-sub').textContent = `${sN.name} ${e.dir === 'bi' ? '⇄' : '→'} ${tN.name}`;
  document.getElementById('em-body').innerHTML = `
    <div class="dr-rel-row" onclick="emClose();atSelect('${sN.id}')" style="cursor:pointer">
      <div class="dr-rel-ico" style="background:${stm.bg}"><svg viewBox="0 0 24 24" fill="none" stroke="${stm.color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${stm.icon}</svg></div>
      <div><div class="dr-rel-name">${sN.name}</div><div class="dr-rel-meta">${stm.label} · source</div></div>
    </div>
    <div class="dr-rel-row" onclick="emClose();atSelect('${tN.id}')" style="cursor:pointer">
      <div class="dr-rel-ico" style="background:${ttm.bg}"><svg viewBox="0 0 24 24" fill="none" stroke="${ttm.color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ttm.icon}</svg></div>
      <div><div class="dr-rel-name">${tN.name}</div><div class="dr-rel-meta">${ttm.label} · cible</div></div>
    </div>
    <dl class="dr-kv" style="margin-top:14px">
      <dt>Type de flux</dt><dd>${FLOW_LABEL[e.flow] || e.flow}</dd>
      <dt>Mode d'échange</dt><dd>${e.mode}</dd>
      <dt>Fréquence</dt><dd>${e.freq}</dd>
      <dt>Sens</dt><dd>${e.dir === 'bi' ? 'Bidirectionnel' : 'Unidirectionnel'}</dd>
      <dt>Criticité</dt><dd><span class="dr-pill-sm" style="background:${cm.bg};color:${cm.color}">${cm.label}</span></dd>
      <dt>Sécurisé</dt><dd>${e.secure ? 'Oui' : 'Non'}</dd>
      <dt>Automatisé</dt><dd>${e.manual ? 'Non (manuel)' : 'Oui'}</dd>
    </dl>`;
  document.getElementById('em-foot').innerHTML = `
    <button class="btn" onclick="emClose()">Fermer</button>
    <button class="btn btn-primary" onclick="emClose();atStartImpact('${sN.id}')">Analyser l'impact</button>`;
  document.getElementById('em-overlay').classList.add('open');
}
function emClose() {
  document.getElementById('em-overlay').classList.remove('open');
}

/* ---- info-bulle au survol d'un lien ---- */
function edgeTooltipShow(e, ev) {
  const sN = NODE_BY_ID[e.s],
    tN = NODE_BY_ID[e.t];
  const cm = CRIT_META[e.crit];
  const tip = document.getElementById('edge-tooltip');
  tip.innerHTML = `
    <div class="et-route">${sN.name} ${e.dir === 'bi' ? '⇄' : '→'} ${tN.name}</div>
    <div class="et-meta">
      <span>${FLOW_LABEL[e.flow] || e.flow}</span><span>·</span>
      <span>${e.mode}</span><span>·</span>
      <span>${e.freq}</span><span>·</span>
      <span style="color:${cm.color}">${cm.label}</span>
      ${!e.secure ? '<span class="et-insecure">· Non sécurisé</span>' : ''}
      ${e.manual ? '<span>· Manuel</span>' : ''}
    </div>`;
  tip.classList.add('show');
  edgeTooltipMove(ev);
}
function edgeTooltipMove(ev) {
  const tip = document.getElementById('edge-tooltip');
  const pad = 16;
  let x = ev.clientX + pad,
    y = ev.clientY + pad;
  const rect = tip.getBoundingClientRect();
  if (x + rect.width > window.innerWidth - 8) x = ev.clientX - rect.width - pad;
  if (y + rect.height > window.innerHeight - 8) y = ev.clientY - rect.height - pad;
  tip.style.left = x + 'px';
  tip.style.top = y + 'px';
}
function edgeTooltipHide() {
  document.getElementById('edge-tooltip').classList.remove('show');
}
function fmt(d) {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt)) return d;
  return dt.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

/* ============================================================
   FICHE OBJET — plein écran, multi-onglets
   ============================================================ */
const FICHE_TABS = [{
  key: 'info',
  label: 'Informations',
  icon: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>'
}, {
  key: 'deps',
  label: 'Dépendances',
  icon: '<line x1="17" y1="7" x2="7" y2="17"/><polyline points="8 7 17 7 17 16"/>'
}, {
  key: 'risks',
  label: 'Risques',
  icon: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/>'
}, {
  key: 'compliance',
  label: 'SSI / RGPD',
  icon: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>'
}, {
  key: 'projects',
  label: 'Projets',
  icon: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>'
}, {
  key: 'actions',
  label: 'Actions & décisions',
  icon: '<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>'
}];
let ficheId = null,
  ficheTabKey = 'info';
function ficheOpen(id) {
  ficheId = id;
  ficheTabKey = 'info';
  const n = NODE_BY_ID[id];
  if (!n) return;
  const tm = TYPE_META[n.type],
    cm = CRIT_META[n.crit];
  document.getElementById('fiche-head-ico').style.background = 'rgba(255,255,255,.1)';
  document.getElementById('fiche-head-ico').innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${tm.icon}</svg>`;
  document.getElementById('fiche-title').textContent = `Fiche ${tm.label.toLowerCase()} — ${n.name}`;
  document.getElementById('fiche-sub').textContent = n.desc || '';
  document.getElementById('fiche-crit').textContent = cm.label;
  document.getElementById('fiche-crit').style.background = cm.bg;
  document.getElementById('fiche-crit').style.color = cm.color;
  document.getElementById('fiche-tabs').innerHTML = FICHE_TABS.map(t => {
    const count = ficheTabCount(t.key, id);
    return `<button class="fiche-tab ${ficheTabKey === t.key ? 'active' : ''}" data-tab="${t.key}" onclick="ficheSetTab('${t.key}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${t.icon}</svg>${t.label}${count != null ? `<span class="fiche-tab-count">${count}</span>` : ''}</button>`;
  }).join('');
  document.getElementById('fiche-overlay').classList.add('open');
  ficheRenderTab();
}
function ficheTabCount(key, id) {
  if (key === 'deps') return edgesOf(id).length;
  if (key === 'risks') return (RISKS[id] || []).length;
  if (key === 'compliance') return (COMPLIANCE[id] || []).length;
  if (key === 'projects') return (PROJECTS[id] || []).length;
  if (key === 'actions') return (ACTIONS[id] || []).length;
  return null;
}
function ficheSetTab(key) {
  ficheTabKey = key;
  document.querySelectorAll('.fiche-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === key));
  ficheRenderTab();
}
function ficheClose() {
  document.getElementById('fiche-overlay').classList.remove('open');
}
function ficheRenderTab() {
  const id = ficheId,
    n = NODE_BY_ID[id];
  if (!n) return;
  const body = document.getElementById('fiche-body');
  if (ficheTabKey === 'info') {
    body.innerHTML = `
      <div class="fiche-grid2">
        <div class="fiche-card">
          <div class="fiche-card-h"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>Informations générales</div>
          <label class="fiche-field-label">Nom</label><div class="fiche-field-val">${n.name}</div>
          <label class="fiche-field-label">Description</label><div class="fiche-field-val area">${n.desc || '—'}</div>
          <div class="fiche-field-row">
            <div><label class="fiche-field-label">Statut</label><div class="fiche-field-val">${n.status || '—'}</div></div>
            <div><label class="fiche-field-label">Dernière revue</label><div class="fiche-field-val">${fmt(n.lastReview)}</div></div>
          </div>
          <label class="fiche-field-label">Complétude de la fiche — ${n.completeness}%</label>
          <div class="fiche-complete-bar"><div class="fiche-complete-fill" style="width:${n.completeness}%"></div></div>
        </div>
        <div class="fiche-card">
          <div class="fiche-card-h"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>Propriétaires</div>
          <label class="fiche-field-label">Propriétaire métier</label><div class="fiche-field-val">${n.ownerBiz || '—'}</div>
          <label class="fiche-field-label">Propriétaire technique</label><div class="fiche-field-val">${n.ownerTech || '—'}</div>
          <label class="fiche-field-label">Badges</label>
          <div style="display:flex;flex-wrap:wrap;gap:6px">${(n.badges || []).map(b => {
      const bm = BADGE_META[b];
      return `<span class="dr-badge" style="background:${bm.bg};color:${bm.color}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">${bm.icon}</svg>${bm.label}</span>`;
    }).join('') || '<span class="fiche-empty">Aucun badge.</span>'}</div>
        </div>
      </div>`;
  } else if (ficheTabKey === 'deps') {
    const rels = edgesOf(id).map(e => {
      const other = e.s === id ? NODE_BY_ID[e.t] : NODE_BY_ID[e.s];
      const dir = e.dir === 'bi' ? 'Bidirectionnel' : e.s === id ? 'Sortant' : 'Entrant';
      const otm = TYPE_META[other.type];
      return `<div class="dr-rel-row" onclick="ficheOpen('${other.id}')" style="cursor:pointer">
        <div class="dr-rel-ico" style="background:${otm.bg}"><svg viewBox="0 0 24 24" fill="none" stroke="${otm.color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${otm.icon}</svg></div>
        <div><div class="dr-rel-name">${other.name}</div><div class="dr-rel-meta">${e.mode} · ${e.freq}${!e.secure ? ' · non sécurisé' : ''}</div></div>
        <div class="dr-rel-dir">${dir}</div>
      </div>`;
    }).join('') || '<div class="fiche-empty">Aucun flux enregistré.</div>';
    body.innerHTML = `<div class="fiche-card"><div class="fiche-card-h"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="17" y1="7" x2="7" y2="17"/><polyline points="8 7 17 7 17 16"/></svg>Relations (${edgesOf(id).length})</div>${rels}
      <button class="dr-impact-btn" onclick="ficheClose();atStartImpact('${id}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>Analyser l'impact</button>
    </div>`;
  } else if (ficheTabKey === 'risks') {
    const risks = (RISKS[id] || []).map(r => {
      const cm2 = CRIT_META[r.niveau];
      return `<div class="dr-card"><div class="dr-card-top"><span class="dr-card-title">${r.title}</span><span class="dr-pill-sm" style="background:${cm2.bg};color:${cm2.color}">${cm2.label}</span></div>
        <div class="dr-card-meta"><span>Score ${r.score}</span><span>${r.statut}</span><span>${r.responsable}</span><span>Éch. ${fmt(r.echeance)}</span></div></div>`;
    }).join('') || '<div class="fiche-empty">Aucun risque associé.</div>';
    body.innerHTML = `<div class="fiche-card"><div class="fiche-card-h"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/></svg>Risques liés</div>${risks}</div>`;
  } else if (ficheTabKey === 'compliance') {
    const gaps = (COMPLIANCE[id] || []).map(c => {
      const isS = c.type === 'ssi';
      return `<div class="dr-card"><div class="dr-card-top"><span class="dr-card-title">${isS ? 'SSI' : 'RGPD'} — ${c.exigence}</span></div>
        <div class="dr-card-meta" style="display:block"><div style="margin-bottom:4px"><b style="color:var(--text-1)">Écart :</b> ${c.ecart}</div><div style="margin-bottom:4px"><b style="color:var(--text-1)">Preuve :</b> ${c.preuve}</div><div><b style="color:var(--text-1)">Action corrective :</b> ${c.action}</div></div></div>`;
    }).join('') || '<div class="fiche-empty">Aucun écart de conformité.</div>';
    body.innerHTML = `<div class="fiche-card"><div class="fiche-card-h"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>Conformité SSI / RGPD</div>${gaps}</div>`;
  } else if (ficheTabKey === 'projects') {
    const projs = (PROJECTS[id] || []).map(p => `<div class="dr-card"><div class="dr-card-top"><span class="dr-card-title">${p.name}</span></div><div class="dr-card-meta">${p.role}</div></div>`).join('') || '<div class="fiche-empty">Aucun projet lié.</div>';
    body.innerHTML = `<div class="fiche-card"><div class="fiche-card-h"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>Projets liés</div>${projs}</div>`;
  } else if (ficheTabKey === 'actions') {
    const acts = (ACTIONS[id] || []).map(a => {
      const isDecision = a.type === 'decision';
      const pillColor = a.statut === 'En retard' ? {
        bg: 'rgba(180,35,24,.12)',
        c: '#B42318'
      } : isDecision ? {
        bg: 'rgba(31,138,91,.12)',
        c: '#1F8A5B'
      } : {
        bg: 'rgba(42,111,219,.12)',
        c: '#2A6FDB'
      };
      return `<div class="dr-card"><div class="dr-card-top"><span class="dr-card-title">${isDecision ? 'Décision — ' : 'Action — '}${a.title}</span><span class="dr-pill-sm" style="background:${pillColor.bg};color:${pillColor.c}">${a.statut}</span></div>
        <div class="dr-card-meta"><span>Éch. ${fmt(a.echeance)}</span>${a.codir ? '<span style="color:var(--gold)">Arbitrage CODIR</span>' : ''}</div></div>`;
    }).join('') || '<div class="fiche-empty">Aucune action ni décision en cours.</div>';
    body.innerHTML = `<div class="fiche-card"><div class="fiche-card-h"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>Actions et décisions</div>${acts}</div>`;
  }
}
function renderDetail(id) {
  const n = NODE_BY_ID[id];
  if (!n) return;
  const tm = TYPE_META[n.type],
    cm = CRIT_META[n.crit];
  document.getElementById('dr-head').innerHTML = `
    <button class="dr-close" onclick="drCloseAll()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
    <div class="dr-type-row">
      <span class="dr-type-pill" style="background:${tm.bg};color:${tm.color}">${tm.label}</span>
      <span class="dr-crit-pill" style="background:${cm.bg};color:${cm.color}">${cm.label}</span>
    </div>
    <div class="dr-title">${n.name}</div>
    <div class="dr-desc">${n.desc || ''}</div>
    <div class="dr-badges">${(n.badges || []).map(b => {
    const bm = BADGE_META[b];
    return `<span class="dr-badge" style="background:${bm.bg};color:${bm.color}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">${bm.icon}</svg>${bm.label}</span>`;
  }).join('')}</div>
  `;
  const rels = edgesOf(id).map(e => {
    const other = e.s === id ? NODE_BY_ID[e.t] : NODE_BY_ID[e.s];
    const dir = e.dir === 'bi' ? 'Bidir.' : e.s === id ? 'Sortant' : 'Entrant';
    const otm = TYPE_META[other.type];
    return `<div class="dr-rel-row" onclick="atSelect('${other.id}')">
      <div class="dr-rel-ico" style="background:${otm.bg}"><svg viewBox="0 0 24 24" fill="none" stroke="${otm.color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${otm.icon}</svg></div>
      <div><div class="dr-rel-name">${other.name}</div><div class="dr-rel-meta">${e.mode} · ${e.freq}</div></div>
      <div class="dr-rel-dir">${dir}</div>
    </div>`;
  }).join('') || '<div class="dr-empty">Aucun flux enregistré.</div>';
  const risks = (RISKS[id] || []).map(r => {
    const cm2 = CRIT_META[r.niveau];
    return `<div class="dr-card"><div class="dr-card-top"><span class="dr-card-title">${r.title}</span><span class="dr-pill-sm" style="background:${cm2.bg};color:${cm2.color}">${cm2.label}</span></div>
      <div class="dr-card-meta"><span>Score ${r.score}</span><span>${r.statut}</span><span>${r.responsable}</span><span>Éch. ${fmt(r.echeance)}</span></div></div>`;
  }).join('') || '<div class="dr-empty">Aucun risque associé.</div>';
  const gaps = (COMPLIANCE[id] || []).map(c => {
    const isS = c.type === 'ssi';
    return `<div class="dr-card"><div class="dr-card-top"><span class="dr-card-title">${isS ? 'SSI' : 'RGPD'} — ${c.exigence}</span></div>
      <div class="dr-card-meta" style="display:block"><div style="margin-bottom:4px"><b style="color:var(--text-1)">Écart :</b> ${c.ecart}</div><div style="margin-bottom:4px"><b style="color:var(--text-1)">Preuve :</b> ${c.preuve}</div><div><b style="color:var(--text-1)">Action corrective :</b> ${c.action}</div></div></div>`;
  }).join('') || '<div class="dr-empty">Aucun écart de conformité.</div>';
  const projs = (PROJECTS[id] || []).map(p => `<div class="dr-card"><div class="dr-card-top"><span class="dr-card-title">${p.name}</span></div><div class="dr-card-meta">${p.role}</div></div>`).join('') || '<div class="dr-empty">Aucun projet lié.</div>';
  const acts = (ACTIONS[id] || []).map(a => {
    const isDecision = a.type === 'decision';
    const pillColor = a.statut === 'En retard' ? {
      bg: 'rgba(229,86,74,.16)',
      c: DANGER
    } : isDecision ? {
      bg: 'rgba(63,190,132,.16)',
      c: '#3FBE84'
    } : {
      bg: 'rgba(91,155,240,.16)',
      c: '#5B9BF0'
    };
    return `<div class="dr-card"><div class="dr-card-top"><span class="dr-card-title">${isDecision ? 'Décision — ' : 'Action — '}${a.title}</span><span class="dr-pill-sm" style="background:${pillColor.bg};color:${pillColor.c}">${a.statut}</span></div>
      <div class="dr-card-meta"><span>Éch. ${fmt(a.echeance)}</span>${a.codir ? '<span style="color:var(--gold)">Arbitrage CODIR</span>' : ''}</div></div>`;
  }).join('') || '<div class="dr-empty">Aucune action ni décision en cours.</div>';
  document.getElementById('dr-body').innerHTML = `
    <div class="dr-sec"><div class="dr-sec-h"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>Informations générales</div>
      <dl class="dr-kv">
        <dt>Propriétaire métier</dt><dd>${n.ownerBiz || '—'}</dd>
        <dt>Propriétaire technique</dt><dd>${n.ownerTech || '—'}</dd>
        <dt>Statut</dt><dd>${n.status || '—'}</dd>
        <dt>Dernière revue</dt><dd>${fmt(n.lastReview)}</dd>
      </dl>
      <div style="margin-top:12px"><div class="dr-kv"><dt style="grid-column:1/-1">Complétude de la fiche — ${n.completeness}%</dt></div><div class="dr-complete-bar"><div class="dr-complete-fill" style="width:${n.completeness}%"></div></div></div>
    </div>
    <div class="dr-sec"><div class="dr-sec-h"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="17" y1="7" x2="7" y2="17"/><polyline points="8 7 17 7 17 16"/></svg>Relations (${edgesOf(id).length})</div>${rels}</div>
    <div class="dr-sec"><div class="dr-sec-h"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/></svg>Risques liés</div>${risks}</div>
    <div class="dr-sec"><div class="dr-sec-h"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>Conformité SSI / RGPD</div>${gaps}</div>
    <div class="dr-sec"><div class="dr-sec-h"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>Projets liés</div>${projs}</div>
    <div class="dr-sec"><div class="dr-sec-h"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>Actions et décisions</div>${acts}
      <button class="dr-impact-btn" onclick="atStartImpact('${id}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>Analyser l'impact</button>
    </div>
  `;
}

/* ============================================================
   ANALYSE D'IMPACT
   ============================================================ */
function impactBFS(sourceId, maxDepth) {
  const byNode = new Map([[sourceId, 0]]);
  const byEdge = new Set();
  let frontier = [sourceId];
  for (let depth = 1; depth <= maxDepth; depth++) {
    const next = [];
    frontier.forEach(id => {
      edgesOf(id).forEach(e => {
        const other = e.s === id ? e.t : e.s;
        if (!byNode.has(other)) {
          byNode.set(other, depth);
          next.push(other);
        }
        byEdge.add(e.id);
      });
    });
    frontier = next;
  }
  return {
    byNode,
    byEdge
  };
}
function atStartImpact(id) {
  state.impact = {
    active: true,
    depth: 1,
    source: id
  };
  document.getElementById('impact-bar').classList.add('open');
  document.getElementById('impact-obj-name').textContent = NODE_BY_ID[id].name;
  atSetDepth(1);
  renderImpactSynthesis();
}
function atSetDepth(d) {
  state.impact.depth = d;
  document.querySelectorAll('#depth-seg button').forEach(b => b.classList.toggle('active', +b.dataset.d === d));
  renderGraph();
  renderImpactSynthesis();
}
function atExitImpact() {
  state.impact = {
    active: false,
    depth: 1,
    source: null
  };
  document.getElementById('impact-bar').classList.remove('open');
  if (state.selected) renderDetail(state.selected);
  renderGraph();
}
function renderImpactSynthesis() {
  if (!state.impact.active) return;
  const {
    byNode
  } = impactBFS(state.impact.source, state.impact.depth);
  const impactedIds = [...byNode.keys()].filter(id => id !== state.impact.source);
  const direct = impactedIds.filter(id => byNode.get(id) === 1);
  const indirect = impactedIds.filter(id => byNode.get(id) > 1);
  const critCount = impactedIds.filter(id => ['critique', 'elevee'].includes(NODE_BY_ID[id].crit)).length;
  const riskCount = impactedIds.filter(id => RISKS[id]).length;
  const actionCount = impactedIds.reduce((s, id) => s + (ACTIONS[id] || []).filter(a => a.type === 'action').length, 0);
  const decisionCount = impactedIds.reduce((s, id) => s + (ACTIONS[id] || []).filter(a => a.type === 'decision').length, 0);
  const group = (ids, label) => ids.length ? `<div class="dr-sec-h" style="margin-top:14px">${label} (${ids.length})</div>` + ids.map(id => {
    const n = NODE_BY_ID[id],
      tm = TYPE_META[n.type];
    return `<div class="dr-rel-row" onclick="atSelect('${id}')"><div class="dr-rel-ico" style="background:${tm.bg}"><svg viewBox="0 0 24 24" fill="none" stroke="${tm.color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${tm.icon}</svg></div><div><div class="dr-rel-name">${n.name}</div><div class="dr-rel-meta">${tm.label}</div></div></div>`;
  }).join('') : '';
  document.getElementById('dr-head').innerHTML = `
    <div class="dr-type-row"><span class="dr-type-pill" style="background:rgba(232,163,23,.18);color:var(--gold)">Analyse d'impact</span></div>
    <div class="dr-title">${NODE_BY_ID[state.impact.source].name}</div>
    <div class="dr-desc">Si cet objet tombe ou est indisponible, ${impactedIds.length} objet(s) sont impactés en profondeur ${state.impact.depth}.</div>
  `;
  document.getElementById('dr-body').innerHTML = `
    <div class="dr-sec">
      <dl class="dr-kv">
        <dt>Objets impactés</dt><dd>${impactedIds.length}</dd>
        <dt>Dont critiques / élevés</dt><dd>${critCount}</dd>
        <dt>Risques associés</dt><dd>${riskCount}</dd>
        <dt>Actions ouvertes</dt><dd>${actionCount}</dd>
        <dt>Décisions attendues</dt><dd>${decisionCount}</dd>
      </dl>
      ${group(direct, 'Impact direct')}
      ${group(indirect, 'Impact indirect')}
    </div>
  `;
  document.getElementById('drawer-right').classList.add('open');
}

/* ============================================================
   RECHERCHE
   ============================================================ */
function atSearch(q) {
  const box = document.getElementById('search-results');
  q = q.trim().toLowerCase();
  if (!q) {
    box.classList.remove('open');
    box.innerHTML = '';
    return;
  }
  const matches = NODES.filter(n => n.name.toLowerCase().includes(q)).slice(0, 8);
  if (!matches.length) {
    box.innerHTML = '<div class="tb-search-row" style="color:var(--text-3);cursor:default">Aucun résultat</div>';
    box.classList.add('open');
    return;
  }
  box.innerHTML = matches.map(n => {
    const tm = TYPE_META[n.type];
    return `<div class="tb-search-row" onclick="atSearchPick('${n.id}')"><i style="background:${tm.color}"></i>${n.name}<span style="margin-left:auto;color:var(--text-3);font-weight:600;font-size:10.5px">${tm.label}</span></div>`;
  }).join('');
  box.classList.add('open');
}
function atSearchPick(id) {
  document.getElementById('search-results').classList.remove('open');
  document.getElementById('atlas-search').value = NODE_BY_ID[id].name;
  // ensure visible: temporarily clear special/filters so node shows
  if (!nodeVisible(NODE_BY_ID[id])) {
    atResetFilters(false);
  }
  renderGraph();
  atSelect(id);
  centerOn(id);
}
function centerOn(id) {
  const n = NODE_BY_ID[id];
  const rect = svgRoot.getBoundingClientRect();
  state.tx = rect.width / 2 - n.x * state.scale;
  state.ty = rect.height / 2 - n.y * state.scale;
  applyTransform();
}
document.addEventListener('click', e => {
  if (!e.target.closest('.tb-search-wrap')) {
    const box = document.getElementById('search-results');
    if (box) box.classList.remove('open');
  }
  if (!e.target.closest('.tb-createwrap')) {
    const m = document.getElementById('create-menu');
    if (m) m.classList.remove('open');
  }
});

/* ============================================================
   DRAWERS : filtres / calques
   ============================================================ */
function atToggleDrawer(tab) {
  const dl = document.getElementById('drawer-left');
  if (state.drawerLeftOpen && state.drawerLeftTab === tab) {
    state.drawerLeftOpen = false;
  } else {
    state.drawerLeftOpen = true;
    state.drawerLeftTab = tab;
  }
  dl.classList.toggle('open', state.drawerLeftOpen);
  atDrawerTab(state.drawerLeftTab);
}
function atDrawerTab(tab) {
  state.drawerLeftTab = tab;
  document.querySelectorAll('.dl-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.getElementById('pane-calques').classList.toggle('active', tab === 'calques');
  document.getElementById('pane-filtres').classList.toggle('active', tab === 'filtres');
  document.getElementById('drawer-left').classList.add('open');
  state.drawerLeftOpen = true;
}
function layerRow(key, label, colorDot) {
  const count = NODES.filter(n => LAYER_KEY_FOR_TYPE[n.type] === key && nodeVisible(n)).length;
  return `<label class="chk-row"><input type="checkbox" ${state.layers[key] ? 'checked' : ''} onchange="atToggleLayer('${key}',this.checked)">${colorDot ? `<i style="background:${colorDot}"></i>` : ''}${label}</label>`;
}
function renderCalquesPane() {
  document.getElementById('pane-calques').innerHTML = `
    <div class="dl-group"><div class="dl-group-title">Objets</div>
      ${layerRow('processus', 'Processus', TYPE_META.processus.color)}
      ${layerRow('applications', 'Applications', TYPE_META.application.color)}
      ${layerRow('donnees', 'Données', TYPE_META.donnee.color)}
      ${layerRow('fournisseurs', 'Fournisseurs', TYPE_META.fournisseur.color)}
      ${layerRow('infrastructures', 'Infrastructures', TYPE_META.infrastructure.color)}
      ${layerRow('sites', 'Sites', TYPE_META.site.color)}
    </div>
    <div class="dl-group"><div class="dl-group-title">Flux</div>
      ${layerRow('flux_app', 'Flux applicatifs', FLOW_COLOR.applicatif)}
      ${layerRow('flux_tech', 'Flux techniques', FLOW_COLOR.technique)}
    </div>
    <div class="dl-group"><div class="dl-group-title">Gouvernance</div>
      ${layerRow('risques', 'Risques', DANGER)}
      ${layerRow('ssi', 'Conformité SSI', '#E8A317')}
      ${layerRow('rgpd', 'Conformité RGPD', '#B892F2')}
      ${layerRow('projets', 'Projets', FLOW_COLOR.applicatif)}
      ${layerRow('decisions', 'Décisions', '#3FBE84')}
      ${layerRow('actions', 'Actions', '#E8A317')}
    </div>
  `;
}
function atToggleLayer(key, val) {
  state.layers[key] = val;
  state.special = null;
  syncPresetButtons(null);
  renderCalquesPane();
  renderGraph();
  renderFiltresPane();
}
function ownerOptions() {
  const owners = new Set();
  NODES.forEach(n => {
    if (n.ownerBiz) owners.add(n.ownerBiz);
    if (n.ownerTech) owners.add(n.ownerTech);
  });
  return [...owners].sort();
}
function renderFiltresPane() {
  const f = state.filters;
  document.getElementById('pane-filtres').innerHTML = `
    <div class="dl-group"><div class="dl-group-title">Criticité<button onclick="atResetFilters(true)">Réinitialiser</button></div>
      ${['critique', 'elevee', 'moyenne', 'faible'].map(c => `<label class="chk-row"><input type="checkbox" ${f.crit.has(c) ? 'checked' : ''} onchange="atToggleCrit('${c}',this.checked)"><i style="background:${CRIT_META[c].color}"></i>${CRIT_META[c].label}</label>`).join('')}
    </div>
    <div class="dl-group"><div class="dl-group-title">Statut</div>
      <select class="dl-select" onchange="atSetFilter('statut',this.value)">
        <option value="all" ${f.statut === 'all' ? 'selected' : ''}>Tous</option>
        ${[...new Set(NODES.map(n => n.status))].map(s => `<option value="${s}" ${f.statut === s ? 'selected' : ''}>${s}</option>`).join('')}
      </select>
    </div>
    <div class="dl-group"><div class="dl-group-title">Propriétaire</div>
      <select class="dl-select" onchange="atSetFilter('owner',this.value)">
        <option value="all" ${f.owner === 'all' ? 'selected' : ''}>Tous</option>
        ${ownerOptions().map(o => `<option value="${o}" ${f.owner === o ? 'selected' : ''}>${o}</option>`).join('')}
      </select>
    </div>
    <div class="dl-group"><div class="dl-group-title">Risques &amp; conformité</div>
      <label class="chk-row"><input type="checkbox" ${f.hasRisk ? 'checked' : ''} onchange="atSetFilter('hasRisk',this.checked)">Présence de risque</label>
      <select class="dl-select" style="margin:6px 0" onchange="atSetFilter('riskLevel',this.value)">
        <option value="all" ${f.riskLevel === 'all' ? 'selected' : ''}>Niveau de risque · tous</option>
        ${['critique', 'elevee', 'moyenne'].map(c => `<option value="${c}" ${f.riskLevel === c ? 'selected' : ''}>${CRIT_META[c].label}</option>`).join('')}
      </select>
      <label class="chk-row"><input type="checkbox" ${f.ssiGap ? 'checked' : ''} onchange="atSetFilter('ssiGap',this.checked)">Écart SSI</label>
      <label class="chk-row"><input type="checkbox" ${f.rgpdGap ? 'checked' : ''} onchange="atSetFilter('rgpdGap',this.checked)">Écart RGPD</label>
      <label class="chk-row"><input type="checkbox" ${f.insecure ? 'checked' : ''} onchange="atSetFilter('insecure',this.checked)">Flux non sécurisé</label>
      <label class="chk-row"><input type="checkbox" ${f.notReviewed ? 'checked' : ''} onchange="atSetFilter('notReviewed',this.checked)">Objet non revu (&gt; 12 mois)</label>
      <label class="chk-row"><input type="checkbox" ${f.decisionExpected ? 'checked' : ''} onchange="atSetFilter('decisionExpected',this.checked)">Décision attendue</label>
    </div>
  `;
  const {
    ids
  } = computeVisible();
  document.getElementById('filter-count').style.display = ids.size === NODES.length ? 'none' : 'inline-block';
  document.getElementById('filter-count').textContent = ids.size;
}
function atToggleCrit(c, val) {
  if (val) state.filters.crit.add(c);else state.filters.crit.delete(c);
  state.special = null;
  syncPresetButtons(null);
  renderFiltresPane();
  renderCalquesPane();
  renderGraph();
}
function atSetFilter(key, val) {
  state.filters[key] = key === 'hasRisk' || key === 'ssiGap' || key === 'rgpdGap' || key === 'insecure' || key === 'notReviewed' || key === 'decisionExpected' ? val : val;
  state.special = null;
  syncPresetButtons(null);
  renderFiltresPane();
  renderGraph();
}
function atResetFilters(rerender) {
  state.filters = {
    crit: new Set(['critique', 'elevee', 'moyenne', 'faible']),
    statut: 'all',
    owner: 'all',
    hasRisk: false,
    riskLevel: 'all',
    ssiGap: false,
    rgpdGap: false,
    insecure: false,
    notReviewed: false,
    decisionExpected: false
  };
  state.special = null;
  if (rerender !== false) {
    renderFiltresPane();
    renderCalquesPane();
    renderGraph();
    syncPresetButtons(null);
  }
}

/* ============================================================
   VUES PRÉCONFIGURÉES
   ============================================================ */
function renderPresetBar() {
  document.getElementById('preset-bar').innerHTML = PRESETS.map(p => `<button class="tb-preset-btn ${state.preset === p.id ? 'active' : ''}" data-preset="${p.id}" onclick="atApplyPreset('${p.id}')">${p.label}</button>`).join('');
}
function syncPresetButtons(id) {
  state.preset = id;
  document.querySelectorAll('.tb-preset-btn').forEach(b => b.classList.toggle('active', b.dataset.preset === id));
}
function atApplyPreset(id) {
  state.preset = id;
  state.special = null;
  const allCrit = new Set(['critique', 'elevee', 'moyenne', 'faible']);
  const baseFilters = {
    crit: allCrit,
    statut: 'all',
    owner: 'all',
    hasRisk: false,
    riskLevel: 'all',
    ssiGap: false,
    rgpdGap: false,
    insecure: false,
    notReviewed: false,
    decisionExpected: false
  };
  const L = k => ({
    processus: false,
    applications: false,
    flux_app: false,
    flux_tech: false,
    donnees: false,
    fournisseurs: false,
    infrastructures: false,
    sites: false,
    risques: true,
    ssi: true,
    rgpd: true,
    projets: true,
    decisions: true,
    actions: true,
    ...k
  });
  if (id === 'globale') {
    state.filters = {
      ...baseFilters,
      crit: new Set(['critique', 'elevee'])
    };
    state.layers = L({
      processus: true,
      applications: true,
      flux_app: true,
      flux_tech: true,
      donnees: true,
      fournisseurs: true
    });
  } else if (id === 'processus') {
    state.filters = {
      ...baseFilters
    };
    state.layers = L({
      processus: true,
      applications: true,
      flux_app: false,
      flux_tech: false,
      fournisseurs: false
    });
  } else if (id === 'applicative') {
    state.filters = {
      ...baseFilters
    };
    state.layers = L({
      applications: true,
      donnees: true,
      infrastructures: true,
      flux_app: true,
      flux_tech: true
    });
  } else if (id === 'technique') {
    state.filters = {
      ...baseFilters
    };
    state.layers = L({
      infrastructures: true,
      applications: true,
      donnees: true,
      fournisseurs: true,
      flux_tech: true,
      flux_app: false
    });
  } else if (id === 'conformite') {
    state.filters = {
      ...baseFilters
    };
    state.special = 'conformite';
    state.layers = L({
      applications: true,
      donnees: true,
      infrastructures: true,
      fournisseurs: true,
      flux_app: true,
      flux_tech: true
    });
  } else if (id === 'codir') {
    state.filters = {
      ...baseFilters
    };
    state.special = 'codir';
    state.layers = L({
      processus: true,
      applications: true,
      fournisseurs: true,
      flux_app: true
    });
  }
  renderCalquesPane();
  renderFiltresPane();
  renderGraph();
  syncPresetButtons(id);
  showToast(`Vue « ${PRESETS.find(p => p.id === id).label} » appliquée`);
}

/* ============================================================
   LÉGENDE
   ============================================================ */
function renderLegend() {
  document.getElementById('legend').innerHTML = `
    <div class="legend-col">
      <div class="legend-item"><i style="background:${TYPE_META.application.color}"></i>Application</div>
      <div class="legend-item"><i style="background:${TYPE_META.processus.color}"></i>Processus</div>
      <div class="legend-item"><i style="background:${TYPE_META.fournisseur.color}"></i>Fournisseur</div>
      <div class="legend-item"><i style="background:${TYPE_META.donnee.color}"></i>Donnée</div>
      <div class="legend-item"><i style="background:${TYPE_META.infrastructure.color}"></i>Infrastructure</div>
    </div>
    <div class="legend-col">
      <div class="legend-item"><span class="ln" style="border-color:${DANGER}"></span>Flux critique / non sécurisé</div>
      <div class="legend-item"><span class="ln" style="border-color:${FLOW_COLOR.applicatif}"></span>Flux applicatif</div>
      <div class="legend-item"><span class="ln" style="border-color:${FLOW_COLOR.metier}"></span>Flux métier</div>
      <div class="legend-item"><span class="ln dashed" style="border-color:${FLOW_COLOR.technique}"></span>Flux manuel (pointillé)</div>
    </div>
  `;
}

/* ============================================================
   MENU CRÉER
   ============================================================ */
function atToggleMenu(e) {
  e.stopPropagation();
  document.getElementById('create-menu').classList.toggle('open');
}

/* ============================================================
   TOAST
   ============================================================ */
let toastTimer = null;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

/* ============================================================
   INIT
   ============================================================ */
function boot() {
  initCanvas();
  renderPresetBar();
  renderCalquesPane();
  renderFiltresPane();
  renderGraph();
  atRecenter();
  syncPresetButtons(null);
  document.getElementById('atlas-search').addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const rows = document.querySelectorAll('.tb-search-row');
      if (rows[0] && rows[0].onclick) rows[0].click();
    }
  });
  window.addEventListener('resize', () => atRecenter());
  const ro = new ResizeObserver(() => atRecenter());
  ro.observe(document.getElementById('canvas-wrap'));
}
document.addEventListener('DOMContentLoaded', boot);
})(); } catch (e) { __ds_ns.__errors.push({ path: "atlas-engine.js", error: String((e && e.message) || e) }); }

// atlas-modals.js
try { (() => {
/* ============================================================
   STARIUM ATLAS — modales de création
   ============================================================ */

let omType = 'application',
  omCrit = 'moyenne',
  fmCrit = 'moyenne';
let objSeq = 1,
  edgeSeq = 100;
function omRenderTypes() {
  document.getElementById('om-types').innerHTML = Object.entries(TYPE_META).map(([k, v]) => `<div class="type-opt ${omType === k ? 'sel' : ''}" onclick="omPickType('${k}')">${v.label}</div>`).join('');
}
function omPickType(k) {
  omType = k;
  omRenderTypes();
}
function omRenderCrit() {
  document.getElementById('om-crit').innerHTML = Object.entries(CRIT_META).map(([k, v]) => `<div class="type-opt ${omCrit === k ? 'sel' : ''}" onclick="omPickCrit('${k}')">${v.label}</div>`).join('');
}
function omPickCrit(k) {
  omCrit = k;
  omRenderCrit();
}
function omOpen() {
  document.getElementById('create-menu').classList.remove('open');
  omType = 'application';
  omCrit = 'moyenne';
  document.getElementById('om-name').value = '';
  document.getElementById('om-desc').value = '';
  document.getElementById('om-ownerb').value = '';
  document.getElementById('om-ownert').value = '';
  omRenderTypes();
  omRenderCrit();
  document.getElementById('om-overlay').classList.add('open');
}
function omClose() {
  document.getElementById('om-overlay').classList.remove('open');
}
function omSave() {
  const name = document.getElementById('om-name').value.trim();
  if (!name) {
    showToast('Merci de renseigner un nom');
    return;
  }
  const rect = svgRoot.getBoundingClientRect();
  // place new node near current viewport center, in canvas coordinates
  const cx = (rect.width / 2 - state.tx) / state.scale;
  const cy = (rect.height / 2 - state.ty) / state.scale;
  const id = 'new' + objSeq++;
  NODES.push({
    id,
    type: omType,
    name,
    x: cx + (Math.random() * 60 - 30),
    y: cy + (Math.random() * 60 - 30),
    crit: omCrit,
    status: 'Production',
    ownerBiz: document.getElementById('om-ownerb').value.trim(),
    ownerTech: document.getElementById('om-ownert').value.trim(),
    lastReview: new Date().toISOString().slice(0, 10),
    completeness: 35,
    desc: document.getElementById('om-desc').value.trim(),
    badges: ['fiche']
  });
  NODE_BY_ID[id] = NODES[NODES.length - 1];
  state.layers[LAYER_KEY_FOR_TYPE[omType]] = true;
  state.filters.crit.add(omCrit);
  omClose();
  renderCalquesPane();
  renderFiltresPane();
  renderGraph();
  showToast('« ' + name + ' » ajouté à la cartographie');
  atSelect(id);
}
function fmPopulateSelects() {
  const opts = NODES.map(n => `<option value="${n.id}">${n.name}</option>`).join('');
  document.getElementById('fm-source').innerHTML = opts;
  document.getElementById('fm-target').innerHTML = opts;
}
function fmRenderCrit() {
  document.getElementById('fm-crit').innerHTML = Object.entries(CRIT_META).map(([k, v]) => `<div class="type-opt ${fmCrit === k ? 'sel' : ''}" onclick="fmPickCrit('${k}')">${v.label}</div>`).join('');
}
function fmPickCrit(k) {
  fmCrit = k;
  fmRenderCrit();
}
function fmOpen() {
  document.getElementById('create-menu').classList.remove('open');
  fmCrit = 'moyenne';
  fmPopulateSelects();
  if (state.selected) {
    document.getElementById('fm-source').value = state.selected;
  }
  document.getElementById('fm-freq').value = '';
  document.getElementById('fm-secure').classList.add('on');
  document.getElementById('fm-manual').classList.remove('on');
  fmRenderCrit();
  document.getElementById('fm-overlay').classList.add('open');
}
function fmClose() {
  document.getElementById('fm-overlay').classList.remove('open');
}
function fmSave() {
  const s = document.getElementById('fm-source').value,
    t = document.getElementById('fm-target').value;
  if (!s || !t || s === t) {
    showToast('Choisissez deux objets distincts');
    return;
  }
  const id = 'enew' + edgeSeq++;
  EDGES.push({
    id,
    s,
    t,
    flow: document.getElementById('fm-flowtype').value,
    mode: document.getElementById('fm-mode').value,
    freq: document.getElementById('fm-freq').value.trim() || 'Non précisée',
    crit: fmCrit,
    dir: document.getElementById('fm-dir').value,
    secure: document.getElementById('fm-secure').classList.contains('on'),
    manual: document.getElementById('fm-manual').classList.contains('on')
  });
  fmClose();
  renderGraph();
  showToast('Flux « ' + NODE_BY_ID[s].name + ' → ' + NODE_BY_ID[t].name + ' » créé');
}
})(); } catch (e) { __ds_ns.__errors.push({ path: "atlas-modals.js", error: String((e && e.message) || e) }); }

// components/Button/Button.jsx
try { (() => {
/* global React */

/**
 * Button — Starium primary action control.
 * Self-contained: styles rely only on design-system tokens (colors_and_type.css),
 * so it renders correctly anywhere the DS stylesheet is loaded.
 */
function Button({
  children,
  variant = 'primary',
  size = 'md',
  iconLeft = null,
  iconRight = null,
  disabled = false,
  onClick
}) {
  const pad = size === 'lg' ? '12px 20px' : size === 'sm' ? '7px 12px' : '9px 15px';
  const fontSize = size === 'lg' ? 14 : size === 'sm' ? 12.5 : 13;
  const variants = {
    primary: {
      background: 'var(--brand-gold)',
      color: 'var(--fg-on-gold)',
      border: '1.5px solid transparent'
    },
    secondary: {
      background: 'var(--bg-surface)',
      color: 'var(--fg-1)',
      border: '1.5px solid var(--border-subtle)'
    },
    modifier: {
      background: 'var(--bg-surface)',
      color: 'var(--brand-gold-700)',
      border: '1.5px solid var(--brand-gold-100)'
    },
    ghost: {
      background: 'transparent',
      color: 'var(--fg-2)',
      border: '1.5px solid transparent'
    },
    danger: {
      background: 'var(--state-danger)',
      color: '#fff',
      border: '1.5px solid transparent'
    }
  };
  const style = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    padding: pad,
    borderRadius: 'var(--radius-md)',
    font: 'var(--font-sans)',
    fontSize,
    fontWeight: 700,
    lineHeight: 1,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    whiteSpace: 'nowrap',
    transition: 'background var(--duration-fast) var(--ease-standard), box-shadow var(--duration-fast) var(--ease-standard)',
    ...variants[variant]
  };
  return React.createElement('button', {
    type: 'button',
    style,
    disabled,
    onClick
  }, iconLeft, children != null ? React.createElement('span', null, children) : null, iconRight);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/Button/Button.jsx", error: String((e && e.message) || e) }); }

// components/Modal/Modal.jsx
try { (() => {
/* global React */

/**
 * Modal — Starium dialog surface.
 * Self-contained: styles rely only on design-system tokens (colors_and_type.css),
 * so it renders correctly anywhere the DS stylesheet is loaded.
 *
 * Composition: <Modal open onClose title subtitle icon footer> ... body content ... </Modal>
 */
function Modal({
  open = false,
  onClose,
  title,
  subtitle,
  icon = null,
  footer = null,
  width = 520,
  children
}) {
  const overlayStyle = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(14,14,16,0.4)',
    zIndex: 500,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    opacity: open ? 1 : 0,
    pointerEvents: open ? 'auto' : 'none',
    transition: 'opacity 200ms var(--ease-standard)'
  };
  const modalStyle = {
    width,
    maxWidth: '100%',
    maxHeight: '86vh',
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-xl)',
    boxShadow: 'var(--shadow-4)',
    display: 'flex',
    flexDirection: 'column',
    transform: open ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.98)',
    transition: 'transform 260ms cubic-bezier(0.2,0,0,1.2), opacity 200ms var(--ease-standard)'
  };
  const headStyle = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 14,
    padding: '20px 22px',
    borderBottom: '1px solid var(--border-subtle)',
    flexShrink: 0
  };
  const iconWrapStyle = {
    width: 38,
    height: 38,
    borderRadius: 10,
    background: 'var(--brand-gold-050)',
    color: 'var(--brand-gold-700)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  };
  const closeBtnStyle = {
    marginLeft: 'auto',
    width: 32,
    height: 32,
    borderRadius: 'var(--radius-md)',
    border: 'none',
    background: 'transparent',
    color: 'var(--fg-3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'background 120ms var(--ease-standard)'
  };
  const bodyStyle = {
    padding: 22,
    overflowY: 'auto',
    color: 'var(--fg-2)',
    font: 'var(--text-body)'
  };
  const footStyle = {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
    padding: '16px 22px',
    borderTop: '1px solid var(--border-subtle)',
    flexShrink: 0
  };
  const closeIcon = React.createElement('svg', {
    viewBox: '0 0 24 24',
    width: 18,
    height: 18,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round'
  }, React.createElement('line', {
    x1: 18,
    y1: 6,
    x2: 6,
    y2: 18
  }), React.createElement('line', {
    x1: 6,
    y1: 6,
    x2: 18,
    y2: 18
  }));
  return React.createElement('div', {
    style: overlayStyle,
    onClick: e => {
      if (e.target === e.currentTarget && onClose) onClose();
    }
  }, React.createElement('div', {
    style: modalStyle,
    role: 'dialog',
    'aria-modal': 'true'
  }, (title || icon) && React.createElement('div', {
    style: headStyle
  }, icon ? React.createElement('div', {
    style: iconWrapStyle
  }, icon) : null, React.createElement('div', null, title ? React.createElement('div', {
    style: {
      font: 'var(--text-h4)',
      color: 'var(--fg-1)'
    }
  }, title) : null, subtitle ? React.createElement('div', {
    style: {
      font: 'var(--text-body-s)',
      color: 'var(--fg-3)',
      marginTop: 2
    }
  }, subtitle) : null), React.createElement('button', {
    type: 'button',
    style: closeBtnStyle,
    onClick: onClose,
    'aria-label': 'Fermer'
  }, closeIcon)), React.createElement('div', {
    style: bodyStyle
  }, children), footer ? React.createElement('div', {
    style: footStyle
  }, footer) : null));
}
Object.assign(__ds_scope, { Modal });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/Modal/Modal.jsx", error: String((e && e.message) || e) }); }

// demo-cycles.jsx
try { (() => {
/* Démo « Cycles de pilotage » — composition continue (animations-v3) */
const {
  useComposition,
  Shot,
  Captions,
  Easing,
  interpolate,
  animate,
  clamp
} = window;
const IMG = 'screenshots/vid/';
const GOLD = '#E8A317';
const INK = '#0E0E10';
const PAPER = '#F6F4EF';
const STAGE_W = 1920,
  STAGE_H = 1080;
const PL = {
  x: 96,
  y: 54,
  w: 1728,
  h: 972,
  r: 20
};
const IMG_W = 2766;
const MOTION = {
  cam: Easing.easeInOutSine,
  fade: Easing.easeInOutQuad,
  pop: Easing.easeOutBack
};
function fit(imgH) {
  const s = Math.min(PL.w / IMG_W, PL.h / imgH);
  const w = IMG_W * s,
    h = imgH * s;
  return {
    s,
    w,
    h,
    x: (PL.w - w) / 2,
    y: (PL.h - h) / 2
  };
}
/* image-normalized (u,v) -> plate-normalized */
function toPlate(u, v, imgH) {
  const f = fit(imgH);
  return [(f.x + u * f.w) / PL.w, (f.y + v * f.h) / PL.h];
}

/* ── Plans : une image par section, chacune avec sa propre caméra ── */
const SHOTS = [{
  at: 'Intro',
  img: '01-cycles.png',
  h: 1548,
  a: [0.50, 0.42, 1.30],
  b: [0.50, 0.40, 1.16]
}, {
  at: 'Vue',
  img: '01-cycles.png',
  h: 1548,
  a: [0.50, 0.42, 1.14],
  b: [0.52, 0.46, 1.02]
}, {
  at: 'Menu',
  img: '02-menu.png',
  h: 1548,
  a: [0.82, 0.26, 1.10],
  b: [0.80, 0.32, 1.34],
  reveal: 1.15
}, {
  at: 'Formulaire',
  img: '04b-modal-rempli.png',
  h: 1660,
  a: [0.46, 0.22, 1.20],
  b: [0.50, 0.58, 1.38]
}, {
  at: 'Chainage',
  img: '05c-chainage.png',
  h: 1660,
  a: [0.45, 0.40, 1.18],
  b: [0.48, 0.50, 1.52]
}, {
  at: 'Generation',
  img: '06-enregistre.png',
  h: 1548,
  a: [0.52, 0.60, 1.12],
  b: [0.50, 0.80, 1.34]
}, {
  at: 'Grille',
  img: '07b-grille.png',
  h: 1660,
  a: [0.28, 0.44, 1.36],
  b: [0.72, 0.50, 1.30]
}, {
  at: 'Preparer',
  img: '08-preparer.png',
  h: 1548,
  a: [0.50, 0.38, 1.34],
  b: [0.50, 0.50, 1.10]
}, {
  at: 'Convocation',
  img: '09b-mail.png',
  h: 1660,
  a: [0.34, 0.50, 1.12],
  b: [0.62, 0.52, 1.12]
}, {
  at: 'Contenu',
  img: '10b-options.png',
  h: 1660,
  a: [0.28, 0.40, 1.22],
  b: [0.30, 0.56, 1.30]
}, {
  at: 'Envoi',
  img: '11-convocations.png',
  h: 1548,
  a: [0.50, 0.68, 1.14],
  b: [0.49, 0.82, 1.36],
  reveal: 0.2
}, {
  at: 'Suivi',
  img: '13b.png',
  h: 1548,
  a: [0.50, 0.34, 1.18],
  b: [0.52, 0.60, 1.44]
}, {
  at: 'Fin',
  img: '13b.png',
  h: 1548,
  a: [0.52, 0.60, 1.44],
  b: [0.52, 0.52, 1.24]
}];
const CAPTIONS = [{
  key: 'Vue',
  text: 'Toute la gouvernance du projet dans une seule cadence.'
}, {
  key: 'Menu',
  text: 'COPROJ, COPIL, COTECH, CODIR — chaque type a ses réglages par défaut.',
  off: 1.4
}, {
  key: 'Formulaire',
  text: 'Nom, cadence, équipe permanente, ordre du jour type.'
}, {
  key: 'Chainage',
  text: 'La reprise : ce que chaque séance récupère automatiquement de l’amont.'
}, {
  key: 'Generation',
  text: 'Les séances sont générées sur toute la cadence.'
}, {
  key: 'Grille',
  text: 'Chaque instance sait ce qu’elle reçoit et ce qu’elle transmet.'
}, {
  key: 'Preparer',
  text: 'Préparer la séance : ordre du jour, supports, points à arbitrer.'
}, {
  key: 'Convocation',
  text: 'Convoquer — l’aperçu montre exactement ce que reçoit le participant.'
}, {
  key: 'Contenu',
  text: 'Invitation .ics, ordre du jour, confirmation de présence, relance auto.'
}, {
  key: 'Envoi',
  text: 'Chacun reçoit son invitation, l’agenda est déjà rempli.',
  off: 1.6
}, {
  key: 'Suivi',
  text: 'Et le suivi des réponses, nominatif, en face de la séance.',
  off: 0.5,
  endKey: 'Fin'
}];
function Plate({
  shot,
  span,
  T,
  tw
}) {
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
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      opacity: o
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      transform: `scale(${z})`,
      transformOrigin: `${cx * 100}% ${cy * 100}%`
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: IMG + shot.img,
    alt: "",
    style: {
      position: 'absolute',
      left: f.x,
      top: f.y,
      width: f.w,
      height: f.h
    }
  })));
}
function Cursor({
  T,
  CUES
}) {
  /* deux gestes : ouvrir le menu de type, puis envoyer les convocations */
  const legs = [{
    t0: CUES.Menu - 0.25,
    t1: CUES.Menu + 1.05,
    from: [0.46, 0.70],
    to: [0.899, 0.135],
    h: 1548,
    click: CUES.Menu + 1.1,
    out: CUES.Menu + 2.1
  }, {
    t0: CUES.Envoi - 1.5,
    t1: CUES.Envoi - 0.25,
    from: [0.35, 0.55],
    to: [0.712, 0.812],
    h: 1660,
    click: CUES.Envoi - 0.2,
    out: CUES.Envoi + 0.7
  }];
  const leg = legs.filter(l => T >= l.t0 - 0.3 && T <= l.out).pop();
  if (!leg) return null;
  const p = clamp((T - leg.t0) / (leg.t1 - leg.t0), 0, 1);
  const e = Easing.easeInOutCubic(p);
  const u = leg.from[0] + (leg.to[0] - leg.from[0]) * e;
  const v = leg.from[1] + (leg.to[1] - leg.from[1]) * e;
  const [cx, cy] = toPlate(u, v, leg.h);
  const x = PL.x + cx * PL.w,
    y = PL.y + cy * PL.h;
  const appear = clamp((T - (leg.t0 - 0.25)) / 0.25, 0, 1);
  const vanish = 1 - clamp((T - (leg.out - 0.35)) / 0.35, 0, 1);
  const ck = clamp((T - leg.click) / 0.55, 0, 1);
  const ringOn = T >= leg.click && ck < 1;
  const press = T >= leg.click && T < leg.click + 0.12 ? 0.88 : 1;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: x,
      top: y,
      opacity: appear * vanish,
      pointerEvents: 'none'
    }
  }, ringOn ? /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: -6,
      top: -6,
      width: 12 + 96 * ck,
      height: 12 + 96 * ck,
      marginLeft: -48 * ck,
      marginTop: -48 * ck,
      borderRadius: 999,
      border: `3px solid ${GOLD}`,
      opacity: 0.75 * (1 - ck)
    }
  }) : null, /*#__PURE__*/React.createElement("svg", {
    width: "46",
    height: "46",
    viewBox: "0 0 24 24",
    style: {
      transform: `scale(${press})`,
      transformOrigin: '3px 3px',
      filter: 'drop-shadow(0 6px 14px rgba(0,0,0,.45))'
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M4 2.5 L4 19 L8.4 14.9 L11.2 21 L14.2 19.6 L11.4 13.7 L17.4 13.5 Z",
    fill: "#fff",
    stroke: INK,
    strokeWidth: "1.2",
    strokeLinejoin: "round"
  })));
}
function TitleCard({
  T,
  CUES,
  total
}) {
  const inO = 1 - clamp((T - (CUES.Vue - 1.0)) / 0.8, 0, 1);
  const outO = clamp((T - (CUES.Fin + 0.15)) / 0.7, 0, 1);
  const o = Math.max(inO, outO);
  if (o <= 0.001) return null;
  const isEnd = outO > inO;
  const rise = isEnd ? animate({
    from: 26,
    to: 0,
    start: CUES.Fin + 0.15,
    end: CUES.Fin + 1.0,
    ease: Easing.easeOutCubic
  })(T) : animate({
    from: 0,
    to: -18,
    start: CUES.Vue - 1.0,
    end: CUES.Vue,
    ease: Easing.easeInQuad
  })(T);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: `rgba(14,14,16,${(isEnd ? 0.9 : 0.76) * o})`,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      opacity: o,
      transform: `translateY(${rise}px)`,
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: '800 20px Manrope, system-ui, sans-serif',
      letterSpacing: '0.22em',
      textTransform: 'uppercase',
      color: GOLD,
      marginBottom: 22
    }
  }, "Starium \xB7 Portail client"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: '800 82px Manrope, system-ui, sans-serif',
      color: PAPER,
      letterSpacing: '-0.02em'
    }
  }, "Cycles de pilotage"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: '500 30px Manrope, system-ui, sans-serif',
      color: 'rgba(246,244,239,.66)',
      marginTop: 20
    }
  }, isEnd ? 'Créer une instance, la chaîner, convoquer — en une minute.' : 'Créer une instance de gouvernance et convoquer son équipe.')));
}
function Piece(props) {
  const {
    T,
    CUES,
    authoredTotal
  } = useComposition();
  const light = props.plateStyle === 'clair';
  const spans = SHOTS.map((s, i) => {
    const start = CUES[s.at];
    const end = i + 1 < SHOTS.length ? CUES[SHOTS[i + 1].at] : authoredTotal;
    return [start, end];
  });
  const caps = CAPTIONS.map(c => {
    const it = {
      at: CUES[c.key] + (c.off || 0.5),
      text: c.text
    };
    if (c.endKey) it.until = CUES[c.endKey] - 0.2;
    return it;
  });
  const vignette = 'radial-gradient(120% 90% at 50% 42%, rgba(0,0,0,0) 52%, rgba(0,0,0,.45) 100%)';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: light ? '#EFEBE3' : INK,
      overflow: 'hidden',
      fontFamily: 'Manrope, system-ui, sans-serif'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: -240,
      top: -300,
      width: 1100,
      height: 1100,
      borderRadius: 999,
      background: `radial-gradient(circle, rgba(232,163,23,.20), rgba(232,163,23,0) 62%)`
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      right: -300,
      bottom: -360,
      width: 1200,
      height: 1200,
      borderRadius: 999,
      background: `radial-gradient(circle, rgba(232,163,23,.12), rgba(232,163,23,0) 62%)`
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: PL.x,
      top: PL.y,
      width: PL.w,
      height: PL.h,
      borderRadius: PL.r,
      overflow: 'hidden',
      background: '#141416',
      boxShadow: '0 40px 90px rgba(0,0,0,.55), 0 0 0 1px rgba(255,255,255,.06)'
    }
  }, SHOTS.map((s, i) => /*#__PURE__*/React.createElement(Plate, {
    key: i,
    shot: s,
    span: spans[i],
    T: T
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: vignette,
      pointerEvents: 'none'
    }
  })), props.cursor === false ? null : /*#__PURE__*/React.createElement(Cursor, {
    T: T,
    CUES: CUES
  }), /*#__PURE__*/React.createElement(TitleCard, {
    T: T,
    CUES: CUES,
    total: authoredTotal
  }), /*#__PURE__*/React.createElement(Captions, {
    items: props.captions === false ? [] : caps,
    style: {
      bottom: 24,
      left: '10%',
      right: '10%',
      font: '600 30px Manrope, system-ui, sans-serif',
      color: PAPER,
      textShadow: light ? '0 2px 14px rgba(255,255,255,.9)' : '0 2px 18px rgba(0,0,0,.8)',
      color: light ? INK : PAPER
    }
  }));
}
Object.assign(window, {
  Piece
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "demo-cycles.jsx", error: String((e && e.message) || e) }); }

// doc-page.js
try { (() => {
// @ds-adherence-ignore -- omelette starter scaffold (raw elements/hex/px by design)
// Copied omelette starter. Re-running copy_starter_component with this kind overwrites this file with the latest version (page content is unaffected).
/* BEGIN USAGE */
/**
 * <doc-page> — paged-document shell for printable HTML.
 *
 * FIRST, decide how the document paginates — up front, before building:
 *
 * - FLOWING document (the default): write the whole document as one
 *   normal HTML flow inside <doc-page>; the browser's print engine
 *   splits it onto pages at export. Use for long-form documents with a
 *   single text flow: reports, memos, letters, essays.
 * - EXPLICIT pagination: a fixed set of pre-paginated pages, one
 *   <section class="page"> child per page. Use when the user asks for a
 *   specific page count, or the design implies one: a one-page resume, a
 *   two-sided flier, a poster, a certificate, a brochure — any richly
 *   laid-out document without a single text flow.
 * - If in doubt, ask the user as part of the build.
 *
 * PAGE SIZING — paper differs by country (letter vs A4), so the printed
 * sheet is not one fixed truth:
 * - FLOWING documents pin NO paper size: the print engine paginates
 *   onto the user's real paper, and the content reflows to it.
 * - EXPLICITLY PAGINATED documents print each page at a FIXED page box
 *   with overflow hidden — letter by default, size="a4" for a clearly
 *   metric user, the user's chosen paper when they export. Design each
 *   page to FILL that box, fitting letter and A4 alike without overlap.
 * - width/height pin an explicit fixed size, ONLY when the user gives
 *   one.
 * Never write your own @page rule or hard-code paper dimensions in the
 * content.
 *
 * Sizing modes (attributes):
 *   (none)                      — portrait: flowing docs use the user's
 *           paper; explicitly paginated pages use the named size box
 *           (letter unless size="a4")
 *   orientation="landscape"     — the same, landscape
 *   width / height              — explicit fixed size, ONLY when the user
 *           gives one (e.g. width="22in" height="30in" for a 22×30
 *           poster): the page IS the design's size, printed at true
 *           dimensions (or scaled onto the user's paper at print time).
 *           Any absolute CSS length: px/in/mm/cm/pt/pc.
 * The component announces the chosen mode to the host app at runtime (a
 * meta tag it injects), so the print path can inject the user's true
 * paper size.
 *
 * On screen the document renders on a desk background: a flowing
 * document as one tall scrolling sheet (Google Docs' pageless view);
 * explicitly paginated documents as one card per page.
 *
 * EXPLICIT pagination usage:
 *   <style>doc-page:not(:defined){visibility:hidden}</style>
 *   <doc-page>
 *     <section class="page" id="p1">…one page's design…</section>
 *     <section class="page" id="p2">…</section>
 *   </doc-page>
 *   <script src="doc-page.js"></script>
 * How the page box works, concretely: each .page prints as ONE full-bleed
 * sheet at a FIXED physical size — letter by default (set size="a4" for
 * a clearly metric user), the user's chosen paper when they export —
 * with overflow hidden. Nothing scrolls and nothing reflows onto a next
 * sheet: content that misses the box is CLIPPED. Design each page to
 * FILL that page box, and to fit it — letter and A4 alike — without
 * overlap. Each page is a size container; don't size anything in
 * viewport units (they track the window, not the page), and never set
 * width or height on the .page section itself (the component sizes the
 * page box; an authored height like 100% is meaningless at print and is
 * overridden). The component owns the page box, the screen card chrome,
 * and the page breaks (never add your own break-before/after). Don't mix
 * .page sections with flowing content or header/footer slots in the same
 * document.
 *
 * FLOWING usage:
 *   <style>doc-page:not(:defined){visibility:hidden}</style>
 *   <doc-page margin="0.75in">
 *     <h1>Title</h1>
 *     <p>…body…</p>
 *   </doc-page>
 *   <script src="doc-page.js"></script>
 * There is no manual page-splitting — the browser's print engine
 * paginates at export. Standard break-hygiene rules (`break-inside:
 * avoid` on figures, code blocks, images and table rows; `orphans/
 * widows: 3`) are applied so paragraphs and groups split cleanly. On
 * screen and at print, headings default to `text-wrap: balance` and
 * body text to `text-wrap: pretty`; the defaults have zero specificity,
 * so any text-wrap you declare wins.
 *
 * Other attributes:
 *   size    — letter | a4 | legal (default letter). Flowing documents:
 *           preview proportion only — it does NOT pin their printed
 *           paper (the print dialog's paper governs); leave it alone
 *           there. Explicitly paginated documents: it sets the page box
 *           the cards and the pinned @page share (the export dialog's
 *           choice overrides both at print) — set size="a4" for a
 *           clearly metric user. Scaled-fit: names the sheet the fit is
 *           computed against, same a4-for-metric-users advice.
 *   content-width / content-height — the design's own fixed dimensions
 *           (CSS lengths), for scaling a fixed-size design ONTO the
 *           named sheet: content lays out at exactly this size, and the
 *           component scales it to fit that sheet's printable area
 *           (centered horizontally, top-aligned; the export dialog
 *           re-fits to the user's actual paper choice where available).
 *           Both must be set; they do not change the page box. For pages
 *           WITHOUT running header/footer slots.
 *   margin  — printable inset on every page of a FLOWING document
 *           (default 0.75in); margin="0" makes pages full-bleed.
 *           Explicitly paginated pages are always full-bleed.
 *
 * Running header/footer (flowing documents only): give an element
 * `slot="header"` or `slot="footer"` and it repeats on every printed
 * page via `position: fixed`. To keep body text from sliding under it,
 * the component prints inside a single-cell table whose <thead>/<tfoot>
 * are spacers sized to the header/footer height — browsers repeat
 * thead/tfoot on every page, so each sheet's content starts below the
 * header and ends above the footer. On screen the header/footer render
 * once at the top/bottom of the sheet.
 *
 * At print the component injects `@page { margin: 0 }` (which leaves
 * Chrome no margin box to draw its date/URL/page-count header in) and
 * moves the visual margin onto the sheet's own padding. It also marks
 * the document as owning its print CSS (a
 * `meta[name="omelette-owns-print"]` it injects at runtime), so the
 * PDF export never injects page-geometry CSS of its own on top.
 *
 * Print best practices for the content you author:
 * - Multi-column text: use CSS columns (`column-count` +
 *   `column-gap`), never side-by-side flex/grid columns — only real
 *   CSS columns flow and break across pages. `column-span: all` lets
 *   a heading span the columns; `hyphens: auto` (needs `lang` on
 *   the html element) keeps narrow columns readable.
 * - Page breaks in flowing documents: `break-before: page` on an
 *   element that must start a new page (a chapter, an appendix). Add
 *   your own kept-together blocks (callouts, stat tiles, cards) to a
 *   `break-inside: avoid` rule, and keep each one shorter than a page.
 * - Extend `orphans: 3; widows: 3` to any custom text blocks you add
 *   (p and li are covered by default).
 * - Give long tables a <thead> — browsers repeat it on every printed
 *   page.
 * - No `position: fixed`/`sticky` and no viewport units in content:
 *   fixed elements stamp every printed page (running headers/footers go
 *   in the component's slots) and `100vh` mis-sizes at print.
 *
 * Author content as static HTML so the user can click-to-edit any text
 * directly. Do not set width/padding/background on the document body —
 * the component owns the sheet box.
 */
/* END USAGE */

(() => {
  const PAPER = {
    letter: ['8.5in', '11in'],
    a4: ['210mm', '297mm'],
    legal: ['8.5in', '14in']
  };
  const CSS_LENGTH = /^\d+(\.\d+)?(px|in|mm|cm|pt|pc)$/;
  // Unitless "0" is a valid CSS length and the natural way to write
  // margin="0"; normalise it to 0px so max()/calc() (which reject a bare
  // number) keep working.
  const safeLen = (v, fb) => {
    v = (v || '').trim();
    return v === '0' ? '0px' : CSS_LENGTH.test(v) ? v : fb;
  };
  // WebKit (Safari and every iOS browser shell) never repeats a table's
  // thead/tfoot on printed pages (WebKit bug 17205), so the spacer-borne
  // vertical margins of a FLOWING document reach only the first page
  // there. Engine check, not browser check: vendor is 'Apple Computer,
  // Inc.' exactly for WebKit and 'Google Inc.' for Blink.
  const WK_PRINT = /apple/i.test(navigator.vendor || '');
  // CSS length → px number (CSS absolute units are exact: 1in = 96px).
  // Returns NaN for anything safeLen would reject — callers gate on it.
  const PX_PER = {
    px: 1,
    in: 96,
    mm: 96 / 25.4,
    cm: 96 / 2.54,
    pt: 96 / 72,
    pc: 16
  };
  const toPx = v => {
    const m = /^(\d+(?:\.\d+)?)(px|in|mm|cm|pt|pc)$/.exec((v || '').trim());
    return m ? parseFloat(m[1]) * PX_PER[m[2]] : NaN;
  };
  const stylesheet = `
    :host {
      position: relative;
      display: block;
      /* When the viewport is narrower than the page, grow to wrap the
       * sheet (plus this padding) instead of staying viewport-width, so
       * the desk background and right margin reach the sheet's far edge
       * in the horizontal scroll. */
      min-width: max-content;
      min-height: 100vh;
      background: #f5f5f4;
      padding: 48px 24px;
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
      --doc-page-w: 8.5in;
      --doc-page-h: 11in;
      --doc-page-margin: 0.75in;
      --doc-hdr-h: 0px;
      --doc-ftr-h: 0px;
      --doc-hdr-pad: 0px;
      --doc-ftr-pad: 0px;
    }
    .sheet {
      width: var(--doc-page-w);
      margin: 0 auto;
      background: #fff;
      box-shadow: 0 2px 10px rgba(20, 20, 19, 0.12);
      border-radius: 7px;
      box-sizing: border-box;
      padding: var(--doc-page-margin);
    }
    .frame { width: 100%; border-collapse: collapse; }
    /* Scaled-fit mode (content-width/content-height): the inner .fit box
     * lays the content out at its authored fixed size and scales it onto
     * the printable area; .fit-box reserves the scaled footprint in flow
     * (transforms don't affect layout) and centers it. Without the mode,
     * both divs are unstyled block pass-throughs. */
    /* Explicit pagination: direct .page children are the pages. The sheet
     * becomes a transparent stack and each page carries the card look on
     * screen; at print each page is exactly one full-bleed sheet. The
     * ::slotted defaults are deliberately weak (document CSS wins), so
     * authored page styling can override any of this. */
    .sheet.paginated {
      background: transparent;
      box-shadow: none;
      border-radius: 0;
      padding: 0;
    }
    .paginated ::slotted(.page) {
      position: relative;
      display: block;
      width: 100%;
      aspect-ratio: var(--doc-page-ar);
      container-type: size;
      overflow: hidden;
      box-sizing: border-box;
      background: #fff;
      border-radius: 7px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.25);
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
      break-inside: avoid;
    }
    .paginated ::slotted(.page:not(:first-child)) { margin-top: 1rem; }
    @media print {
      .sheet.paginated { padding: 0; }
      /* The flowing-document vertical inset lives on the repeating
       * thead/tfoot spacers, not the sheet padding — they must go too,
       * or each full-sheet .page is pushed ~margin down and spills onto
       * a second sheet. Paginated pages are full-bleed by definition
       * (content owns its insets). */
      .sheet.paginated .hdr-space,
      .sheet.paginated .ftr-space { height: 0; }
      .paginated ::slotted(.page) {
        border-radius: 0 !important;
        box-shadow: none !important;
        margin: 0 !important;
        /* Physical page-box sizing, no viewport units: Safari resolves
         * 100vh against the window, not the page box, so a vh-sized card
         * paginates wrong there. --doc-page-w/h are the named size by
         * default and are overridden to the user's chosen paper by the
         * export path, so every card is exactly one sheet either way.
         * Width + height (same source values as @page size) rather than
         * width + aspect-ratio: the ratio is a 6-decimal rounding of the
         * same division, and a few millionths of overflow would spill a
         * blank sheet after every page. The screen-only aspect-ratio
         * (preview proportions) must not leak into print. cqh typography
         * tracks the same box.
         *
         * Every declaration is !important: per CSS Scoping, unimportant
         * shadow ::slotted rules LOSE to the document context, so a page
         * section's authored inline style would silently beat this print
         * geometry. A model-authored height:100% did exactly that — the
         * percentage resolves as auto in the all-auto print ancestry, the
         * base rule's size containment turns auto into ZERO, and
         * overflow:hidden then paints nothing: a blank PDF with perfect
         * page boxes. At print the component's geometry is the design's
         * whole contract, so it must win over any authored sizing. */
        aspect-ratio: auto !important;
        width: var(--doc-page-w) !important;
        height: var(--doc-page-h) !important;
        overflow: hidden !important;
      }
      .paginated ::slotted(.page:not(:first-child)) {
        break-before: page !important;
        margin-top: 0 !important;
      }
    }
    .fit-mode .fit-box {
      width: calc(var(--doc-fit-w) * var(--doc-fit-scale));
      height: calc(var(--doc-fit-h) * var(--doc-fit-scale));
      margin: 0 auto;
      break-inside: avoid;
    }
    /* Monolithic at print: Blink slices a transform-scaled child at
     * fragmentainer boundaries mapped in UNSCALED layout coordinates
     * (transforms are paint-time), so the .fit box (authored size, e.g.
     * 1400x990) gets cut at the page's free block space and spills onto
     * a second sheet even though its SCALED footprint fits the page by
     * construction. overflow:hidden makes .fit-box a scroll container —
     * monolithic under fragmentation (css-break-3) — so the scaled
     * content prints atomically on one sheet. No clipping for content
     * within the authored box: .fit-box is calc-sized to exactly the
     * scaled footprint. (Content that bleeds past content-width/height
     * is clipped at the footprint — fit mode's contract; it previously
     * painted beyond it at print.) Print-only, so the screen rendering
     * keeps visible overflow for editor affordances.
     * The export path injects the same rule into frozen copies
     * (print-eval.ts om-print-fit-contain). The .fit-mode scope is
     * load-bearing: .fit-box wraps slotted content in EVERY mode, and an
     * unscoped overflow:hidden would make whole flowing documents
     * monolithic (one truncated sheet). overflow:hidden, never clip —
     * clip is not a scroll container, so not monolithic. */
    @media print {
      .fit-mode .fit-box { overflow: hidden; }
    }
    .fit-mode .fit {
      width: var(--doc-fit-w);
      height: var(--doc-fit-h);
      transform: scale(var(--doc-fit-scale));
      transform-origin: top left;
    }
    .frame td, .frame th { padding: 0; text-align: left; font-weight: inherit; }
    .hdr-space { height: var(--doc-hdr-h); }
    .ftr-space { height: var(--doc-ftr-h); }
    ::slotted([slot="header"]),
    ::slotted([slot="footer"]) { display: block; box-sizing: border-box; }
    @media print {
      :host { background: none; padding: 0; min-width: 0; min-height: 0; }
      .sheet {
        width: auto; margin: 0; box-shadow: none; border-radius: 0;
        padding: 0 var(--doc-page-margin);
      }
      /* The thead/tfoot spacers repeat on every page, so they carry the
       * vertical page margin (which the sheet's own padding cannot, since
       * that padding is consumed once on the first/last page). The running
       * header/footer are fixed inside that band. */
      /* The 0.35in is breathing room between a running header/footer and
       * the body; without one the spacer is exactly the page margin, so a
       * margin="0" full-bleed document gets truly full-bleed pages. */
      .hdr-space { height: max(var(--doc-page-margin), calc(var(--doc-hdr-h) + var(--doc-hdr-pad))); }
      .ftr-space { height: max(var(--doc-page-margin), calc(var(--doc-ftr-h) + var(--doc-ftr-pad))); }
      /* WebKit flowing documents: @page carries the vertical margin (see
       * _syncPrintPageRule), so the spacers keep only whatever a running
       * header/footer needs BEYOND it — page 1 would otherwise double its
       * top inset. Paginated sheets already zero their spacers above. */
      .sheet.wk-print:not(.paginated) .hdr-space { height: max(0px, calc(max(var(--doc-page-margin), calc(var(--doc-hdr-h) + var(--doc-hdr-pad))) - var(--doc-page-margin))); }
      .sheet.wk-print:not(.paginated) .ftr-space { height: max(0px, calc(max(var(--doc-page-margin), calc(var(--doc-ftr-h) + var(--doc-ftr-pad))) - var(--doc-page-margin))); }
      ::slotted([slot="header"]) {
        position: fixed; top: 0; left: 0; right: 0; margin: 0;
        padding: calc(var(--doc-page-margin) * 0.45) var(--doc-page-margin) 0;
      }
      ::slotted([slot="footer"]) {
        position: fixed; bottom: 0; left: 0; right: 0; margin: 0;
        padding: 0 var(--doc-page-margin) calc(var(--doc-page-margin) * 0.45);
      }
    }
  `;
  class DocPage extends HTMLElement {
    static get observedAttributes() {
      return ['size', 'width', 'height', 'margin', 'orientation', 'content-width', 'content-height'];
    }
    constructor() {
      super();
      this._root = this.attachShadow({
        mode: 'open'
      });
      this._mo = typeof MutationObserver === 'function' ? new MutationObserver(() => this._scheduleMeasure()) : null;
    }

    /** The named paper's [w, h], swapped when orientation="landscape".
     *  Only the named size swaps — explicit width/height are exact values
     *  the author already oriented. */
    _paperSize() {
      const named = PAPER[(this.getAttribute('size') || '').toLowerCase()] || PAPER.letter;
      const landscape = (this.getAttribute('orientation') || '').trim().toLowerCase() === 'landscape';
      return landscape ? [named[1], named[0]] : named;
    }
    get pageWidth() {
      return safeLen(this.getAttribute('width'), this._paperSize()[0]);
    }
    get pageHeight() {
      return safeLen(this.getAttribute('height'), this._paperSize()[1]);
    }
    get pageMargin() {
      return safeLen(this.getAttribute('margin'), '0.75in');
    }

    /** Scaled-fit mode's content box [w, h] as CSS lengths, or null when
     *  the mode is off (either attribute missing/invalid/zero — a partial
     *  declaration falls back to normal flow rather than guessing). */
    _contentFit() {
      const w = safeLen(this.getAttribute('content-width'), null);
      const h = safeLen(this.getAttribute('content-height'), null);
      if (!w || !h) return null;
      const wPx = toPx(w),
        hPx = toPx(h);
      return wPx > 0 && hPx > 0 ? [w, h, wPx, hPx] : null;
    }
    connectedCallback() {
      if (!this._sheet) this._render();
      this._syncSize();
      this._syncPrintPageRule();
      this._ensureTextWrapDefaults();
      this._ensureOwnsPrintMeta();
      this._syncFixedSizeMeta();
      this._syncPrintSizingMeta();
      if (this._mo) this._mo.observe(this, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true
      });
      this._onResize = () => this._scheduleMeasure();
      window.addEventListener('resize', this._onResize);
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => this._scheduleMeasure());
      }
      this._scheduleMeasure();
    }
    disconnectedCallback() {
      window.removeEventListener('resize', this._onResize);
      if (this._mo) this._mo.disconnect();
      if (this._raf) {
        cancelAnimationFrame(this._raf);
        this._raf = null;
      }
      // Drop the head rules when the last doc-page leaves, so a deleted
      // document's @page geometry and text-wrap defaults can't apply to
      // whatever replaces it.
      const survivor = document.querySelector('doc-page');
      if (!survivor) {
        ['doc-page-print', 'doc-page-text-wrap', 'doc-page-owns-print', 'doc-page-fixed-size', 'doc-page-print-sizing'].forEach(id => {
          const tag = document.getElementById(id);
          if (tag) tag.remove();
        });
        // A live deck-stage deferred its own print-sizing meta to ours —
        // hand the page-global meta over so the deck isn't left unmarked.
        const deck = document.querySelector('deck-stage');
        if (deck && typeof deck._ensurePrintSizingMeta === 'function') {
          deck._ensurePrintSizingMeta();
        }
      } else {
        // A departed owner hands each page-global meta to whatever
        // doc-page remains (or it's removed).
        if (typeof survivor._syncFixedSizeMeta === 'function') {
          survivor._syncFixedSizeMeta();
        }
        if (typeof survivor._syncPrintSizingMeta === 'function') {
          survivor._syncPrintSizingMeta();
        }
      }
    }
    attributeChangedCallback() {
      if (!this._sheet) return;
      this._syncSize();
      this._syncPrintPageRule();
      this._syncFixedSizeMeta();
      this._syncPrintSizingMeta();
      this._scheduleMeasure();
    }
    _render() {
      this._root.innerHTML = `
        <style>${stylesheet}</style>
        <style id="vars"></style>
        <div class="sheet" data-screen-label="Document">
          <table class="frame" role="presentation">
            <thead><tr><th><div class="hdr-space"><slot name="header"></slot></div></th></tr></thead>
            <tbody><tr><td class="body"><div class="fit-box"><div class="fit"><slot></slot></div></div></td></tr></tbody>
            <tfoot><tr><td><div class="ftr-space"><slot name="footer"></slot></div></td></tr></tfoot>
          </table>
        </div>`;
      this._sheet = this._root.querySelector('.sheet');
      this._vars = this._root.getElementById('vars');
    }

    /** Runtime sizing lives in a shadow <style> :host rule, never on the
     *  light-DOM host element, so serialize-persist can't write it back. */
    _syncSize(hdrH, ftrH) {
      // Scaled-fit mode: content at its authored size, scaled onto the
      // printable area (page minus margins on both axes). The factor is a
      // plain number var so calc(length * number) stays valid; 4 decimals
      // keeps the shadow style stable across re-measures. Upscaling is
      // allowed — print transforms are vector, so text and CSS stay crisp
      // (raster images soften, which the catalog bullet warns about).
      const fit = this._contentFit();
      let fitVars = '';
      if (fit) {
        const marginPx = toPx(this.pageMargin) || 0;
        const availW = toPx(this.pageWidth) - 2 * marginPx;
        const availH = toPx(this.pageHeight) - 2 * marginPx;
        const scale = Math.min(availW / fit[2], availH / fit[3]);
        if (scale > 0 && Number.isFinite(scale)) {
          fitVars = '--doc-fit-w:' + fit[0] + ';' + '--doc-fit-h:' + fit[1] + ';' + '--doc-fit-scale:' + scale.toFixed(4) + ';';
        }
      }
      this._sheet.classList.toggle('fit-mode', !!fitVars);
      // Numeric w/h ratio for the paginated page cards' aspect-ratio —
      // aspect-ratio takes a number, not a length ratio, so compute it
      // here (CSS length division isn't portable). 6 decimals keeps the
      // shadow style stable across re-syncs.
      const arW = toPx(this.pageWidth);
      const arH = toPx(this.pageHeight);
      const ar = arW > 0 && arH > 0 ? (arW / arH).toFixed(6) : '0.772727';
      this._vars.textContent = ':host{' + fitVars + '--doc-page-ar:' + ar + ';' + '--doc-page-w:' + this.pageWidth + ';' + '--doc-page-h:' + this.pageHeight + ';' + '--doc-page-margin:' + this.pageMargin + ';' + '--doc-hdr-h:' + (hdrH || 0) + 'px;' + '--doc-ftr-h:' + (ftrH || 0) + 'px;' + '--doc-hdr-pad:' + (hdrH ? '0.35in' : '0px') + ';' + '--doc-ftr-pad:' + (ftrH ? '0.35in' : '0px') + '}';
    }

    /** @page is a no-op inside shadow DOM, so the rule lives in <head>.
     *  Re-appended on every sync so it stays last in source order — the
     *  @page cascade is source-order per descriptor, so this rule wins
     *  over any other @page rule in the document.
     *
     *  The @page SIZE is pinned where the page box IS part of the design:
     *  explicit-fixed-size mode (width + height authored), scaled-fit
     *  mode (the named sheet the fit targets), and explicit pagination
     *  (the named size the cards share — so card and sheet agree on
     *  every print path, and the export path's chosen paper overrides
     *  BOTH with one later rule). For FLOWING documents no paper size is
     *  emitted at all — the true size comes from the user's preference,
     *  injected by the export path or chosen in the print dialog — so a
     *  flowing document never fights the paper it lands on.
     *  margin: 0 is emitted in every mode: it leaves Chrome no margin box
     *  to draw its date/URL/page-count header in, and the visual margin
     *  lives on the sheet's own padding. */
    _syncPrintPageRule() {
      const id = 'doc-page-print';
      let tag = document.getElementById(id);
      if (!tag) {
        tag = document.createElement('style');
        tag.id = id;
      }
      document.head.appendChild(tag);
      // Three print-geometry regimes:
      // - true-size: the page IS the design — pin its exact size.
      // - scaled-fit (content-width/height): the fit factor is computed
      //   against the NAMED paper's printable area, so that paper must
      //   stay pinned or the scaled content overflows a smaller sheet
      //   (the export path re-fits and re-pins at print time on top).
      // - default modes: no paper size — but landscape still needs the
      //   paper-agnostic 'size: landscape' keyword, because the size
      //   descriptor is what carries orientation; without it a landscape
      //   document prints portrait whenever nothing injects a size.
      const landscape = (this.getAttribute('orientation') || '').trim().toLowerCase() === 'landscape';
      // Explicit pagination pins the page box to the SAME values that
      // size the cards (the named size by default, the export path's
      // chosen paper when its later rule overrides both) — card and
      // sheet agree on every print path, and a mismatched real paper
      // shrinks-to-fit in the dialog instead of clipping a Letter card
      // on A4. Declared before the paginated read below so both derive
      // from one check.
      const paginatedNow = this.querySelector(':scope > .page') !== null;
      const sizeDescriptor = this._trueSizePx() ? 'size: ' + this.pageWidth + ' ' + this.pageHeight + '; ' : this._contentFit() ? 'size: ' + this.pageWidth + ' ' + this.pageHeight + '; ' : paginatedNow ? 'size: ' + this.pageWidth + ' ' + this.pageHeight + '; ' : landscape ? 'size: landscape; ' : '';
      // WebKit never repeats the thead/tfoot spacers that carry a flowing
      // document's vertical page margins (see WK_PRINT above), so pages
      // after the first print edge-to-edge there. Carry the VERTICAL
      // margins on @page for WebKit instead, and the shadow print CSS
      // trims the first-page spacers by the same amount (.sheet.wk-print
      // rules). Horizontal inset stays on the sheet's own padding in
      // every engine. Blink keeps margin: 0 (a nonzero margin there
      // re-opens the box Chrome draws its header furniture in). One cost,
      // learned in testing: Safari's own date/URL headers are a USER
      // dialog setting ("Print headers and footers") that renders in the
      // margin area when room exists — margin: 0 only suppressed it by
      // leaving no room, and no CSS controls it. The export dialog's
      // Safari guide teaches turning the setting off for flowing
      // documents. Explicitly paginated and fixed-size documents keep
      // margin: 0 everywhere: their pages ARE the sheet.
      const wkFlowing = WK_PRINT && !paginatedNow && !this._trueSizePx() && !this._contentFit();
      const marginDescriptor = wkFlowing ? 'margin: ' + this.pageMargin + ' 0; ' : 'margin: 0; ';
      // Shadow-internal marker (never serialized), kept in lockstep with
      // the @page decision above: the print CSS trims the first-page
      // spacers ONLY while @page actually carries the margins — a
      // true-size or scaled-fit sheet keeps margin: 0 and must keep its
      // spacers too. Re-synced here so attribute changes and pagination
      // flips move both together.
      if (this._sheet) this._sheet.classList.toggle('wk-print', wkFlowing);
      tag.textContent = '@page { ' + sizeDescriptor + marginDescriptor + '} ' + '@media print { html, body { margin: 0 !important; padding: 0 !important; background: none !important; height: auto !important; overflow: visible !important; } ' + 'h1,h2,h3,h4,h5,h6 { break-after: avoid; } ' + 'figure,pre,blockquote,img,svg,tr { break-inside: avoid; } ' + 'p,li { orphans: 3; widows: 3; } ' + '* { -webkit-print-color-adjust: exact; print-color-adjust: exact; ' + 'backdrop-filter: none !important; -webkit-backdrop-filter: none !important; } ' + '*, *::before, *::after { animation-delay: -99s !important; animation-duration: .001s !important; ' + 'animation-iteration-count: 1 !important; animation-fill-mode: both !important; ' + 'animation-play-state: running !important; transition-duration: 0s !important; } }';
    }

    /** Typographic defaults for document text: balance headings, avoid
     *  widowed/orphaned words in body copy (browsers without text-wrap
     *  support drop the declarations). Zero-specificity via :where() so
     *  any text-wrap authored on those elements wins; document-level so the
     *  rules reach the slotted (light DOM) content — shadow styles can't.
     *  data-omelette-injected marks the tag for the host editor to strip
     *  at serialize, so it is never written back as authored source. */
    _ensureTextWrapDefaults() {
      if (document.getElementById('doc-page-text-wrap')) return;
      const tag = document.createElement('style');
      tag.id = 'doc-page-text-wrap';
      tag.setAttribute('data-omelette-injected', '');
      tag.textContent = ':where(h1,h2,h3,h4,h5,h6){text-wrap:balance}' + ':where(p,li,blockquote,figcaption){text-wrap:pretty}';
      document.head.appendChild(tag);
    }

    /** Declares that this document owns its print CSS. The instant-PDF
     *  export checks for the meta by NAME PRESENCE alone (content is
     *  ignored) and skips its automatic print-CSS injections, so the
     *  component's @page geometry is never overridden by a heuristic.
     *  data-omelette-injected keeps it out of serialized source. */
    _ensureOwnsPrintMeta() {
      if (document.getElementById('doc-page-owns-print')) return;
      const tag = document.createElement('meta');
      tag.id = 'doc-page-owns-print';
      tag.name = 'omelette-owns-print';
      tag.content = 'true';
      tag.setAttribute('data-omelette-injected', '');
      document.head.appendChild(tag);
    }

    /** This page's valid true-size page box (explicit width AND height)
     *  as [w, h] px ints, or null when the mode is off. */
    _trueSizePx() {
      if (!safeLen(this.getAttribute('width'), null) || !safeLen(this.getAttribute('height'), null)) return null;
      const w = Math.round(toPx(this.pageWidth));
      const h = Math.round(toPx(this.pageHeight));
      return w > 0 && h > 0 ? [w, h] : null;
    }

    /** True-size pages (explicit width AND height) also declare the page
     *  box as the preview size: the in-app preview reads
     *  meta[name="omelette-fixed-size"] (content "W,H" in px ints) and
     *  scales the sheet into view — without it an 18in poster previews at
     *  true size with scrollbars. Never overrides an author-set meta
     *  (only the component's own id is managed). The meta is page-global
     *  while doc-page instances are not, so every sync recomputes the
     *  page-wide owner — the first connected true-size doc-page — and a
     *  non-true-size sibling's sync can never delete the owner's meta.
     *  Removed when no true-size page remains (the owner's disconnect
     *  re-syncs via any survivor) or when an author-set meta exists. */
    _syncFixedSizeMeta() {
      const id = 'doc-page-fixed-size';
      const own = document.getElementById(id);
      const authored = document.querySelector('meta[name="omelette-fixed-size"]:not([data-omelette-injected])');
      // The page-wide owner, not this instance: an upgraded true-size page
      // anywhere in the document keeps the meta alive and sized.
      let box = null;
      for (const el of document.querySelectorAll('doc-page')) {
        box = typeof el._trueSizePx === 'function' ? el._trueSizePx() : null;
        if (box) break;
      }
      if (!box || authored) {
        if (own) own.remove();
        return;
      }
      const tag = own || document.createElement('meta');
      tag.id = id;
      tag.name = 'omelette-fixed-size';
      tag.content = box[0] + ',' + box[1];
      tag.setAttribute('data-omelette-injected', '');
      if (!own) document.head.appendChild(tag);
    }

    /** This page's print-sizing mode: 'fixed' when an explicit width AND
     *  height are authored (the page is the design's own size), else the
     *  default paper in the authored orientation. */
    _printSizingMode() {
      if (this._trueSizePx()) return 'fixed';
      const landscape = (this.getAttribute('orientation') || '').trim().toLowerCase() === 'landscape';
      return landscape ? 'default-landscape' : 'default-portrait';
    }

    /** Announces the print-sizing mode to the host app:
     *  meta[name="omelette-print-sizing"] with content 'default-portrait',
     *  'default-landscape', or 'fixed' (fixed pages also carry the
     *  omelette-fixed-size meta with the page box in px). The export path
     *  probes it to decide what true paper size to inject at print time —
     *  in the default modes the component emits no paper size of its own.
     *  Same page-global ownership rules as the fixed-size meta above:
     *  first connected doc-page owns it, an authored meta is never
     *  overridden, removed when no doc-page remains. */
    _syncPrintSizingMeta() {
      const id = 'doc-page-print-sizing';
      const own = document.getElementById(id);
      const authored = document.querySelector('meta[name="omelette-print-sizing"]:not([data-omelette-injected])');
      // A fixed page wins outright (mirroring the fixed-size loop above,
      // so the two metas can never contradict each other in a mixed
      // multi-page document); otherwise the first page's mode holds.
      let mode = null;
      for (const el of document.querySelectorAll('doc-page')) {
        if (typeof el._printSizingMode !== 'function') continue;
        const m = el._printSizingMode();
        if (m === 'fixed') {
          mode = m;
          break;
        }
        if (mode === null) mode = m;
      }
      if (!mode || authored) {
        if (own) own.remove();
        return;
      }
      // A deck-stage that connected first injected its own meta and
      // defers to any existing one — take it over, or the document ends
      // up with two conflicting injected metas (a doc-page page is the
      // document; the deck re-ensures its meta if every doc-page leaves).
      const deckMeta = document.getElementById('deck-stage-print-sizing');
      if (deckMeta) deckMeta.remove();
      const tag = own || document.createElement('meta');
      tag.id = id;
      tag.name = 'omelette-print-sizing';
      tag.content = mode;
      tag.setAttribute('data-omelette-injected', '');
      if (!own) document.head.appendChild(tag);
    }
    _scheduleMeasure() {
      if (this._raf) return;
      this._raf = requestAnimationFrame(() => {
        this._raf = null;
        this._measure();
      });
    }

    /** Slot heights feed the print spacers (--doc-hdr-h / --doc-ftr-h), so
     *  they re-measure on content mutation, resize, and font load. The
     *  same pass detects explicit pagination (direct .page children) and
     *  toggles the sheet between the flowing-document card and the
     *  page-per-card stack — content edits can add or remove pages at any
     *  time, so this tracks the same mutations the measurement does. */
    _measure() {
      const hdr = this.querySelector(':scope > [slot="header"]');
      const ftr = this.querySelector(':scope > [slot="footer"]');
      const wasPaginated = this._sheet.classList.contains('paginated');
      this._sheet.classList.toggle('paginated', this.querySelector(':scope > .page') !== null);
      // The WebKit @page margin is flowing-only, so a pagination flip
      // must re-emit the rule (content edits can add or remove .page
      // sections at any time).
      if (this._sheet.classList.contains('paginated') !== wasPaginated) {
        this._syncPrintPageRule();
      }
      this._syncSize(hdr ? hdr.offsetHeight : 0, ftr ? ftr.offsetHeight : 0);
    }
  }
  if (!customElements.get('doc-page')) {
    customElements.define('doc-page', DocPage);
  }
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "doc-page.js", error: String((e && e.message) || e) }); }

// tweaks-panel.jsx
try { (() => {
// @ds-adherence-ignore -- omelette starter scaffold (raw elements/hex/px by design)
// Copied omelette starter. Re-running copy_starter_component with this kind overwrites this file with the latest version (page content is unaffected).

/* BEGIN USAGE */
// tweaks-panel.jsx
// Reusable Tweaks shell + form-control helpers.
// Exports (to window): useTweaks, TweaksPanel, TweakSection, TweakRow, TweakSlider,
//   TweakToggle, TweakRadio, TweakSelect, TweakText, TweakNumber, TweakColor, TweakButton.
//
// Owns the host protocol (listens for __activate_edit_mode / __deactivate_edit_mode,
// posts __edit_mode_available / __edit_mode_set_keys / __edit_mode_dismissed) so
// individual prototypes don't re-roll it. Ships a consistent set of controls so you
// don't hand-draw <input type="range">, segmented radios, steppers, etc.
//
// Usage (in an HTML file that loads React + Babel):
//
//   const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
//     "primaryColor": "#D97757",
//     "palette": ["#D97757", "#29261b", "#f6f4ef"],
//     "fontSize": 16,
//     "density": "regular",
//     "dark": false
//   }/*EDITMODE-END*/;
//
//   function App() {
//     const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
//     return (
//       <div style={{ fontSize: t.fontSize, color: t.primaryColor }}>
//         Hello
//         <TweaksPanel>
//           <TweakSection label="Typography" />
//           <TweakSlider label="Font size" value={t.fontSize} min={10} max={32} unit="px"
//                        onChange={(v) => setTweak('fontSize', v)} />
//           <TweakRadio  label="Density" value={t.density}
//                        options={['compact', 'regular', 'comfy']}
//                        onChange={(v) => setTweak('density', v)} />
//           <TweakSection label="Theme" />
//           <TweakColor  label="Primary" value={t.primaryColor}
//                        options={['#D97757', '#2A6FDB', '#1F8A5B', '#7A5AE0']}
//                        onChange={(v) => setTweak('primaryColor', v)} />
//           <TweakColor  label="Palette" value={t.palette}
//                        options={[['#D97757', '#29261b', '#f6f4ef'],
//                                  ['#475569', '#0f172a', '#f1f5f9']]}
//                        onChange={(v) => setTweak('palette', v)} />
//           <TweakToggle label="Dark mode" value={t.dark}
//                        onChange={(v) => setTweak('dark', v)} />
//         </TweaksPanel>
//       </div>
//     );
//   }
//
// TweakRadio is the segmented control for 2–3 short options (auto-falls-back to
// TweakSelect past ~16/~10 chars per label); reach for TweakSelect directly when
// options are many or long. For color tweaks always curate 3-4 options rather than
// a free picker; an option can also be a whole 2–5 color palette (the stored value
// is the array). The Tweak* controls are a floor, not a ceiling — build custom
// controls inside the panel if a tweak calls for UI they don't cover.
/* END USAGE */
// ─────────────────────────────────────────────────────────────────────────────

const __TWEAKS_STYLE = `
  .twk-panel{position:fixed;right:16px;bottom:16px;z-index:2147483646;width:280px;
    max-height:calc(100vh - 32px);display:flex;flex-direction:column;
    transform:scale(var(--dc-inv-zoom,1));transform-origin:bottom right;
    background:rgba(250,249,247,.78);color:#29261b;
    -webkit-backdrop-filter:blur(24px) saturate(160%);backdrop-filter:blur(24px) saturate(160%);
    border:.5px solid rgba(255,255,255,.6);border-radius:14px;
    box-shadow:0 1px 0 rgba(255,255,255,.5) inset,0 12px 40px rgba(0,0,0,.18);
    font:11.5px/1.4 ui-sans-serif,system-ui,-apple-system,sans-serif;overflow:hidden}
  .twk-hd{display:flex;align-items:center;justify-content:space-between;
    padding:10px 8px 10px 14px;cursor:move;user-select:none}
  .twk-hd b{font-size:12px;font-weight:600;letter-spacing:.01em}
  .twk-x{appearance:none;border:0;background:transparent;color:rgba(41,38,27,.55);
    width:22px;height:22px;border-radius:6px;cursor:default;font-size:13px;line-height:1}
  .twk-x:hover{background:rgba(0,0,0,.06);color:#29261b}
  .twk-body{padding:2px 14px 14px;display:flex;flex-direction:column;gap:10px;
    overflow-y:auto;overflow-x:hidden;min-height:0;
    scrollbar-width:thin;scrollbar-color:rgba(0,0,0,.15) transparent}
  .twk-body::-webkit-scrollbar{width:8px}
  .twk-body::-webkit-scrollbar-track{background:transparent;margin:2px}
  .twk-body::-webkit-scrollbar-thumb{background:rgba(0,0,0,.15);border-radius:4px;
    border:2px solid transparent;background-clip:content-box}
  .twk-body::-webkit-scrollbar-thumb:hover{background:rgba(0,0,0,.25);
    border:2px solid transparent;background-clip:content-box}
  .twk-row{display:flex;flex-direction:column;gap:5px}
  .twk-row-h{flex-direction:row;align-items:center;justify-content:space-between;gap:10px}
  .twk-lbl{display:flex;justify-content:space-between;align-items:baseline;
    color:rgba(41,38,27,.72)}
  .twk-lbl>span:first-child{font-weight:500}
  .twk-val{color:rgba(41,38,27,.5);font-variant-numeric:tabular-nums}

  .twk-sect{font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;
    color:rgba(41,38,27,.45);padding:10px 0 0}
  .twk-sect:first-child{padding-top:0}

  .twk-field{appearance:none;box-sizing:border-box;width:100%;min-width:0;height:26px;padding:0 8px;
    border:.5px solid rgba(0,0,0,.1);border-radius:7px;
    background:rgba(255,255,255,.6);color:inherit;font:inherit;outline:none}
  .twk-field:focus{border-color:rgba(0,0,0,.25);background:rgba(255,255,255,.85)}
  select.twk-field{padding-right:22px;
    background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path fill='rgba(0,0,0,.5)' d='M0 0h10L5 6z'/></svg>");
    background-repeat:no-repeat;background-position:right 8px center}

  .twk-slider{appearance:none;-webkit-appearance:none;width:100%;height:4px;margin:6px 0;
    border-radius:999px;background:rgba(0,0,0,.12);outline:none}
  .twk-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;
    width:14px;height:14px;border-radius:50%;background:#fff;
    border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}
  .twk-slider::-moz-range-thumb{width:14px;height:14px;border-radius:50%;
    background:#fff;border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}

  .twk-seg{position:relative;display:flex;padding:2px;border-radius:8px;
    background:rgba(0,0,0,.06);user-select:none}
  .twk-seg-thumb{position:absolute;top:2px;bottom:2px;border-radius:6px;
    background:rgba(255,255,255,.9);box-shadow:0 1px 2px rgba(0,0,0,.12);
    transition:left .15s cubic-bezier(.3,.7,.4,1),width .15s}
  .twk-seg.dragging .twk-seg-thumb{transition:none}
  .twk-seg button{appearance:none;position:relative;z-index:1;flex:1;border:0;
    background:transparent;color:inherit;font:inherit;font-weight:500;min-height:22px;
    border-radius:6px;cursor:default;padding:4px 6px;line-height:1.2;
    overflow-wrap:anywhere}

  .twk-toggle{position:relative;width:32px;height:18px;border:0;border-radius:999px;
    background:rgba(0,0,0,.15);transition:background .15s;cursor:default;padding:0}
  .twk-toggle[data-on="1"]{background:#34c759}
  .twk-toggle i{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;
    background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .15s}
  .twk-toggle[data-on="1"] i{transform:translateX(14px)}

  .twk-num{display:flex;align-items:center;box-sizing:border-box;min-width:0;height:26px;padding:0 0 0 8px;
    border:.5px solid rgba(0,0,0,.1);border-radius:7px;background:rgba(255,255,255,.6)}
  .twk-num-lbl{font-weight:500;color:rgba(41,38,27,.6);cursor:ew-resize;
    user-select:none;padding-right:8px}
  .twk-num input{flex:1;min-width:0;height:100%;border:0;background:transparent;
    font:inherit;font-variant-numeric:tabular-nums;text-align:right;padding:0 8px 0 0;
    outline:none;color:inherit;-moz-appearance:textfield}
  .twk-num input::-webkit-inner-spin-button,.twk-num input::-webkit-outer-spin-button{
    -webkit-appearance:none;margin:0}
  .twk-num-unit{padding-right:8px;color:rgba(41,38,27,.45)}

  .twk-btn{appearance:none;height:26px;padding:0 12px;border:0;border-radius:7px;
    background:rgba(0,0,0,.78);color:#fff;font:inherit;font-weight:500;cursor:default}
  .twk-btn:hover{background:rgba(0,0,0,.88)}
  .twk-btn.secondary{background:rgba(0,0,0,.06);color:inherit}
  .twk-btn.secondary:hover{background:rgba(0,0,0,.1)}

  .twk-swatch{appearance:none;-webkit-appearance:none;width:56px;height:22px;
    border:.5px solid rgba(0,0,0,.1);border-radius:6px;padding:0;cursor:default;
    background:transparent;flex-shrink:0}
  .twk-swatch::-webkit-color-swatch-wrapper{padding:0}
  .twk-swatch::-webkit-color-swatch{border:0;border-radius:5.5px}
  .twk-swatch::-moz-color-swatch{border:0;border-radius:5.5px}

  .twk-chips{display:flex;gap:6px}
  .twk-chip{position:relative;appearance:none;flex:1;min-width:0;height:46px;
    padding:0;border:0;border-radius:6px;overflow:hidden;cursor:default;
    box-shadow:0 0 0 .5px rgba(0,0,0,.12),0 1px 2px rgba(0,0,0,.06);
    transition:transform .12s cubic-bezier(.3,.7,.4,1),box-shadow .12s}
  .twk-chip:hover{transform:translateY(-1px);
    box-shadow:0 0 0 .5px rgba(0,0,0,.18),0 4px 10px rgba(0,0,0,.12)}
  .twk-chip[data-on="1"]{box-shadow:0 0 0 1.5px rgba(0,0,0,.85),
    0 2px 6px rgba(0,0,0,.15)}
  .twk-chip>span{position:absolute;top:0;bottom:0;right:0;width:34%;
    display:flex;flex-direction:column;box-shadow:-1px 0 0 rgba(0,0,0,.1)}
  .twk-chip>span>i{flex:1;box-shadow:0 -1px 0 rgba(0,0,0,.1)}
  .twk-chip>span>i:first-child{box-shadow:none}
  .twk-chip svg{position:absolute;top:6px;left:6px;width:13px;height:13px;
    filter:drop-shadow(0 1px 1px rgba(0,0,0,.3))}
`;

// ── useTweaks ───────────────────────────────────────────────────────────────
// Single source of truth for tweak values. setTweak persists via the host
// (__edit_mode_set_keys → host rewrites the EDITMODE block on disk).
function useTweaks(defaults) {
  const [values, setValues] = React.useState(defaults);
  // Accepts either setTweak('key', value) or setTweak({ key: value, ... }) so a
  // useState-style call doesn't write a "[object Object]" key into the persisted
  // JSON block.
  const setTweak = React.useCallback((keyOrEdits, val) => {
    const edits = typeof keyOrEdits === 'object' && keyOrEdits !== null ? keyOrEdits : {
      [keyOrEdits]: val
    };
    setValues(prev => ({
      ...prev,
      ...edits
    }));
    window.parent.postMessage({
      type: '__edit_mode_set_keys',
      edits
    }, '*');
    // Same-window signal so in-page listeners (deck-stage rail thumbnails)
    // can react — the parent message only reaches the host, not peers.
    window.dispatchEvent(new CustomEvent('tweakchange', {
      detail: edits
    }));
  }, []);
  return [values, setTweak];
}

// ── TweaksPanel ─────────────────────────────────────────────────────────────
// Floating shell. Registers the protocol listener BEFORE announcing
// availability — if the announce ran first, the host's activate could land
// before our handler exists and the toolbar toggle would silently no-op.
// The close button posts __edit_mode_dismissed so the host's toolbar toggle
// flips off in lockstep; the host echoes __deactivate_edit_mode back which
// is what actually hides the panel.
function TweaksPanel({
  title = 'Tweaks',
  children
}) {
  const [open, setOpen] = React.useState(false);
  const dragRef = React.useRef(null);
  const offsetRef = React.useRef({
    x: 16,
    y: 16
  });
  const PAD = 16;
  const clampToViewport = React.useCallback(() => {
    const panel = dragRef.current;
    if (!panel) return;
    const w = panel.offsetWidth,
      h = panel.offsetHeight;
    const maxRight = Math.max(PAD, window.innerWidth - w - PAD);
    const maxBottom = Math.max(PAD, window.innerHeight - h - PAD);
    offsetRef.current = {
      x: Math.min(maxRight, Math.max(PAD, offsetRef.current.x)),
      y: Math.min(maxBottom, Math.max(PAD, offsetRef.current.y))
    };
    panel.style.right = offsetRef.current.x + 'px';
    panel.style.bottom = offsetRef.current.y + 'px';
  }, []);
  React.useEffect(() => {
    if (!open) return;
    clampToViewport();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', clampToViewport);
      return () => window.removeEventListener('resize', clampToViewport);
    }
    const ro = new ResizeObserver(clampToViewport);
    ro.observe(document.documentElement);
    return () => ro.disconnect();
  }, [open, clampToViewport]);
  React.useEffect(() => {
    const onMsg = e => {
      const t = e?.data?.type;
      if (t === '__activate_edit_mode') setOpen(true);else if (t === '__deactivate_edit_mode') setOpen(false);
    };
    window.addEventListener('message', onMsg);
    window.parent.postMessage({
      type: '__edit_mode_available'
    }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);
  const dismiss = () => {
    setOpen(false);
    window.parent.postMessage({
      type: '__edit_mode_dismissed'
    }, '*');
  };
  const onDragStart = e => {
    const panel = dragRef.current;
    if (!panel) return;
    const r = panel.getBoundingClientRect();
    const sx = e.clientX,
      sy = e.clientY;
    const startRight = window.innerWidth - r.right;
    const startBottom = window.innerHeight - r.bottom;
    const move = ev => {
      offsetRef.current = {
        x: startRight - (ev.clientX - sx),
        y: startBottom - (ev.clientY - sy)
      };
      clampToViewport();
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  // data-om-starter: inert presence marker — Claude Design's starter-usage
  // probe reads it. The closed panel renders nothing, so the marker rides
  // the <html> element as an attribute instead of a rendered node — zero
  // elements added, so page CSS (even structural selectors like
  // :nth-child) can never observe it. It records that the page WIRES a
  // tweaks panel, whether or not the panel is open. Keep this effect.
  React.useEffect(() => {
    document.documentElement.setAttribute('data-om-starter', 'tweaks-panel');
    return () => document.documentElement.removeAttribute('data-om-starter');
  }, []);
  if (!open) return null;
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("style", null, __TWEAKS_STYLE), /*#__PURE__*/React.createElement("div", {
    ref: dragRef,
    className: "twk-panel",
    "data-omelette-chrome": "",
    style: {
      right: offsetRef.current.x,
      bottom: offsetRef.current.y
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-hd",
    onMouseDown: onDragStart
  }, /*#__PURE__*/React.createElement("b", null, title), /*#__PURE__*/React.createElement("button", {
    className: "twk-x",
    "aria-label": "Close tweaks",
    onMouseDown: e => e.stopPropagation(),
    onClick: dismiss
  }, "\u2715")), /*#__PURE__*/React.createElement("div", {
    className: "twk-body"
  }, children)));
}

// ── Layout helpers ──────────────────────────────────────────────────────────

function TweakSection({
  label,
  children
}) {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "twk-sect"
  }, label), children);
}
function TweakRow({
  label,
  value,
  children,
  inline = false
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: inline ? 'twk-row twk-row-h' : 'twk-row'
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-lbl"
  }, /*#__PURE__*/React.createElement("span", null, label), value != null && /*#__PURE__*/React.createElement("span", {
    className: "twk-val"
  }, value)), children);
}

// ── Controls ────────────────────────────────────────────────────────────────

function TweakSlider({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  unit = '',
  onChange
}) {
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label,
    value: `${value}${unit}`
  }, /*#__PURE__*/React.createElement("input", {
    type: "range",
    className: "twk-slider",
    min: min,
    max: max,
    step: step,
    value: value,
    onChange: e => onChange(Number(e.target.value))
  }));
}
function TweakToggle({
  label,
  value,
  onChange
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "twk-row twk-row-h"
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-lbl"
  }, /*#__PURE__*/React.createElement("span", null, label)), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "twk-toggle",
    "data-on": value ? '1' : '0',
    role: "switch",
    "aria-checked": !!value,
    onClick: () => onChange(!value)
  }, /*#__PURE__*/React.createElement("i", null)));
}
function TweakRadio({
  label,
  value,
  options,
  onChange
}) {
  const trackRef = React.useRef(null);
  const [dragging, setDragging] = React.useState(false);
  // The active value is read by pointer-move handlers attached for the lifetime
  // of a drag — ref it so a stale closure doesn't fire onChange for every move.
  const valueRef = React.useRef(value);
  valueRef.current = value;

  // Segments wrap mid-word once per-segment width runs out. The track is
  // ~248px (280 panel − 28 body pad − 4 seg pad), each button loses 12px
  // to its own padding, and 11.5px system-ui averages ~6.3px/char — so 2
  // options fit ~16 chars each, 3 fit ~10. Past that (or >3 options), fall
  // back to a dropdown rather than wrap.
  const labelLen = o => String(typeof o === 'object' ? o.label : o).length;
  const maxLen = options.reduce((m, o) => Math.max(m, labelLen(o)), 0);
  const fitsAsSegments = maxLen <= ({
    2: 16,
    3: 10
  }[options.length] ?? 0);
  if (!fitsAsSegments) {
    // <select> emits strings — map back to the original option value so the
    // fallback stays type-preserving (numbers, booleans) like the segment path.
    const resolve = s => {
      const m = options.find(o => String(typeof o === 'object' ? o.value : o) === s);
      return m === undefined ? s : typeof m === 'object' ? m.value : m;
    };
    return /*#__PURE__*/React.createElement(TweakSelect, {
      label: label,
      value: value,
      options: options,
      onChange: s => onChange(resolve(s))
    });
  }
  const opts = options.map(o => typeof o === 'object' ? o : {
    value: o,
    label: o
  });
  const idx = Math.max(0, opts.findIndex(o => o.value === value));
  const n = opts.length;
  const segAt = clientX => {
    const r = trackRef.current.getBoundingClientRect();
    const inner = r.width - 4;
    const i = Math.floor((clientX - r.left - 2) / inner * n);
    return opts[Math.max(0, Math.min(n - 1, i))].value;
  };
  const onPointerDown = e => {
    setDragging(true);
    const v0 = segAt(e.clientX);
    if (v0 !== valueRef.current) onChange(v0);
    const move = ev => {
      if (!trackRef.current) return;
      const v = segAt(ev.clientX);
      if (v !== valueRef.current) onChange(v);
    };
    const up = () => {
      setDragging(false);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("div", {
    ref: trackRef,
    role: "radiogroup",
    onPointerDown: onPointerDown,
    className: dragging ? 'twk-seg dragging' : 'twk-seg'
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-seg-thumb",
    style: {
      left: `calc(2px + ${idx} * (100% - 4px) / ${n})`,
      width: `calc((100% - 4px) / ${n})`
    }
  }), opts.map(o => /*#__PURE__*/React.createElement("button", {
    key: o.value,
    type: "button",
    role: "radio",
    "aria-checked": o.value === value
  }, o.label))));
}
function TweakSelect({
  label,
  value,
  options,
  onChange
}) {
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("select", {
    className: "twk-field",
    value: value,
    onChange: e => onChange(e.target.value)
  }, options.map(o => {
    const v = typeof o === 'object' ? o.value : o;
    const l = typeof o === 'object' ? o.label : o;
    return /*#__PURE__*/React.createElement("option", {
      key: v,
      value: v
    }, l);
  })));
}
function TweakText({
  label,
  value,
  placeholder,
  onChange
}) {
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("input", {
    className: "twk-field",
    type: "text",
    value: value,
    placeholder: placeholder,
    onChange: e => onChange(e.target.value)
  }));
}
function TweakNumber({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange
}) {
  const clamp = n => {
    if (min != null && n < min) return min;
    if (max != null && n > max) return max;
    return n;
  };
  const startRef = React.useRef({
    x: 0,
    val: 0
  });
  const onScrubStart = e => {
    e.preventDefault();
    startRef.current = {
      x: e.clientX,
      val: value
    };
    const decimals = (String(step).split('.')[1] || '').length;
    const move = ev => {
      const dx = ev.clientX - startRef.current.x;
      const raw = startRef.current.val + dx * step;
      const snapped = Math.round(raw / step) * step;
      onChange(clamp(Number(snapped.toFixed(decimals))));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "twk-num"
  }, /*#__PURE__*/React.createElement("span", {
    className: "twk-num-lbl",
    onPointerDown: onScrubStart
  }, label), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: value,
    min: min,
    max: max,
    step: step,
    onChange: e => onChange(clamp(Number(e.target.value)))
  }), unit && /*#__PURE__*/React.createElement("span", {
    className: "twk-num-unit"
  }, unit));
}

// Relative-luminance contrast pick — checkmarks drawn over a swatch need to
// read on both #111 and #fafafa without per-option configuration. Hex input
// only (#rgb / #rrggbb); named or rgb()/hsl() colors fall through to "light".
function __twkIsLight(hex) {
  const h = String(hex).replace('#', '');
  const x = h.length === 3 ? h.replace(/./g, c => c + c) : h.padEnd(6, '0');
  const n = parseInt(x.slice(0, 6), 16);
  if (Number.isNaN(n)) return true;
  const r = n >> 16 & 255,
    g = n >> 8 & 255,
    b = n & 255;
  return r * 299 + g * 587 + b * 114 > 148000;
}
const __TwkCheck = ({
  light
}) => /*#__PURE__*/React.createElement("svg", {
  viewBox: "0 0 14 14",
  "aria-hidden": "true"
}, /*#__PURE__*/React.createElement("path", {
  d: "M3 7.2 5.8 10 11 4.2",
  fill: "none",
  strokeWidth: "2.2",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  stroke: light ? 'rgba(0,0,0,.78)' : '#fff'
}));

// TweakColor — curated color/palette picker. Each option is either a single
// hex string or an array of 1-5 hex strings; the card adapts — a lone color
// renders solid, a palette renders colors[0] as the hero (left ~2/3) with the
// rest stacked in a sharp column on the right. onChange emits the
// option in the shape it was passed (string stays string, array stays array).
// Without options it falls back to the native color input for back-compat.
function TweakColor({
  label,
  value,
  options,
  onChange
}) {
  if (!options || !options.length) {
    return /*#__PURE__*/React.createElement("div", {
      className: "twk-row twk-row-h"
    }, /*#__PURE__*/React.createElement("div", {
      className: "twk-lbl"
    }, /*#__PURE__*/React.createElement("span", null, label)), /*#__PURE__*/React.createElement("input", {
      type: "color",
      className: "twk-swatch",
      value: value,
      onChange: e => onChange(e.target.value)
    }));
  }
  // Native <input type=color> emits lowercase hex per the HTML spec, so
  // compare case-insensitively. String() guards JSON.stringify(undefined),
  // which returns the primitive undefined (no .toLowerCase).
  const key = o => String(JSON.stringify(o)).toLowerCase();
  const cur = key(value);
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-chips",
    role: "radiogroup"
  }, options.map((o, i) => {
    const colors = Array.isArray(o) ? o : [o];
    const [hero, ...rest] = colors;
    const sup = rest.slice(0, 4);
    const on = key(o) === cur;
    return /*#__PURE__*/React.createElement("button", {
      key: i,
      type: "button",
      className: "twk-chip",
      role: "radio",
      "aria-checked": on,
      "data-on": on ? '1' : '0',
      "aria-label": colors.join(', '),
      title: colors.join(' · '),
      style: {
        background: hero
      },
      onClick: () => onChange(o)
    }, sup.length > 0 && /*#__PURE__*/React.createElement("span", null, sup.map((c, j) => /*#__PURE__*/React.createElement("i", {
      key: j,
      style: {
        background: c
      }
    }))), on && /*#__PURE__*/React.createElement(__TwkCheck, {
      light: __twkIsLight(hero)
    }));
  })));
}
function TweakButton({
  label,
  onClick,
  secondary = false
}) {
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: secondary ? 'twk-btn secondary' : 'twk-btn',
    onClick: onClick
  }, label);
}
Object.assign(window, {
  useTweaks,
  TweaksPanel,
  TweakSection,
  TweakRow,
  TweakSlider,
  TweakToggle,
  TweakRadio,
  TweakSelect,
  TweakText,
  TweakNumber,
  TweakColor,
  TweakButton
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "tweaks-panel.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/AlertsList.jsx
try { (() => {
/* global React */

const AlertsList = () => {
  const items = [{
    tone: 'critical',
    title: 'Retard sur l\u2019objectif \u00ab Automatisation des processus \u00bb',
    meta: 'Axe Transformation digitale',
    tag: 'Critique',
    tagCls: 'b-danger'
  }, {
    tone: 'high',
    title: 'Budget inf\u00e9rieur de 15% aux besoins estim\u00e9s',
    meta: 'Axe Ma\u00eetrise des risques',
    tag: '\u00c9lev\u00e9e',
    tagCls: 'b-info'
  }, {
    tone: 'high',
    title: 'D\u00e9pendance fournisseur critique non ma\u00eetris\u00e9e',
    meta: 'Axe Ma\u00eetrise des risques',
    tag: '\u00c9lev\u00e9e',
    tagCls: 'b-info'
  }];
  return /*#__PURE__*/React.createElement("div", null, items.map((a, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "alert"
  }, /*#__PURE__*/React.createElement("span", {
    className: 'dot ' + (a.tone === 'critical' ? 'alert-dot-critical' : 'alert-dot-high')
  }), /*#__PURE__*/React.createElement("div", {
    className: "alert-body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "alert-title"
  }, a.title), /*#__PURE__*/React.createElement("div", {
    className: "alert-meta"
  }, a.meta)), /*#__PURE__*/React.createElement("span", {
    className: 'badge ' + a.tagCls
  }, a.tag))));
};
window.AlertsList = AlertsList;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/AlertsList.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/AlignmentChart.jsx
try { (() => {
/* global React */

const AlignmentChart = () => {
  const months = ['Juin 23', 'Juil. 23', 'Août 23', 'Sept. 23', 'Oct. 23', 'Nov. 23', 'Déc. 23', 'Janv. 24', 'Fév. 24', 'Mars 24', 'Avr. 24', 'Mai 24'];
  const values = [42, 48, 52, 55, 60, 64, 68, 70, 73, 76, 79, 82];
  const W = 540,
    H = 180,
    pad = {
      l: 32,
      r: 16,
      t: 12,
      b: 24
    };
  const x = i => pad.l + i / (values.length - 1) * (W - pad.l - pad.r);
  const y = v => pad.t + (1 - v / 100) * (H - pad.t - pad.b);
  const linePath = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(v)}`).join(' ');
  const areaPath = linePath + ` L${x(values.length - 1)},${H - pad.b} L${x(0)},${H - pad.b} Z`;
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("svg", {
    viewBox: `0 0 ${W} ${H}`,
    style: {
      width: '100%',
      height: 'auto'
    }
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
    id: "alignFill",
    x1: "0",
    y1: "0",
    x2: "0",
    y2: "1"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0%",
    stopColor: "var(--brand-gold)",
    stopOpacity: "0.16"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "100%",
    stopColor: "var(--brand-gold)",
    stopOpacity: "0"
  }))), [0, 25, 50, 75, 100].map(g => /*#__PURE__*/React.createElement("g", {
    key: g
  }, /*#__PURE__*/React.createElement("line", {
    x1: pad.l,
    x2: W - pad.r,
    y1: y(g),
    y2: y(g),
    stroke: "var(--neutral-200)",
    strokeDasharray: g === 85 ? '3 3' : '0'
  }), /*#__PURE__*/React.createElement("text", {
    x: pad.l - 8,
    y: y(g) + 3,
    textAnchor: "end",
    fontSize: "10",
    fill: "var(--fg-3)",
    fontFamily: "var(--font-sans)"
  }, g, "%"))), /*#__PURE__*/React.createElement("line", {
    x1: pad.l,
    x2: W - pad.r,
    y1: y(85),
    y2: y(85),
    stroke: "var(--neutral-400)",
    strokeDasharray: "4 4"
  }), /*#__PURE__*/React.createElement("path", {
    d: areaPath,
    fill: "url(#alignFill)"
  }), /*#__PURE__*/React.createElement("path", {
    d: linePath,
    fill: "none",
    stroke: "var(--brand-gold)",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }), values.map((v, i) => /*#__PURE__*/React.createElement("circle", {
    key: i,
    cx: x(i),
    cy: y(v),
    r: i === values.length - 1 ? 3.5 : 2.25,
    fill: "var(--brand-gold)"
  })), /*#__PURE__*/React.createElement("g", {
    transform: `translate(${x(values.length - 1) - 22},${y(values[values.length - 1]) - 22})`
  }, /*#__PURE__*/React.createElement("rect", {
    width: "36",
    height: "18",
    rx: "4",
    fill: "var(--brand-gold)"
  }), /*#__PURE__*/React.createElement("text", {
    x: "18",
    y: "12",
    textAnchor: "middle",
    fontSize: "10",
    fontWeight: "700",
    fill: "var(--brand-ink)",
    fontFamily: "var(--font-mono)"
  }, "82%")), months.map((m, i) => i % 1 === 0 && /*#__PURE__*/React.createElement("text", {
    key: i,
    x: x(i),
    y: H - 6,
    textAnchor: "middle",
    fontSize: "9",
    fill: "var(--fg-3)",
    fontFamily: "var(--font-sans)"
  }, m))), /*#__PURE__*/React.createElement("div", {
    className: "chart-legend"
  }, /*#__PURE__*/React.createElement("div", {
    className: "leg"
  }, /*#__PURE__*/React.createElement("span", {
    className: "swatch",
    style: {
      background: 'var(--brand-gold)'
    }
  }), "Score d'alignement global"), /*#__PURE__*/React.createElement("div", {
    className: "leg"
  }, /*#__PURE__*/React.createElement("span", {
    className: "swatch",
    style: {
      background: 'var(--neutral-400)',
      borderTop: '1px dashed var(--neutral-400)'
    }
  }), "Objectif 2026 (85%)")));
};
window.AlignmentChart = AlignmentChart;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/AlignmentChart.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/App.jsx
try { (() => {
/* global React, Sidebar, TopBar, KpiCard, VisionCard, AxisCard, ObjectivesTable, AlertsList, AlignmentChart, DocumentsList, Icon */
const {
  useState
} = React;
const App = () => {
  const [tab, setTab] = useState('overview');
  const tabs = [{
    id: 'overview',
    label: "Vue d'ensemble"
  }, {
    id: 'vision',
    label: 'Vision entreprise'
  }, {
    id: 'axes',
    label: 'Axes stratégiques'
  }, {
    id: 'objectives',
    label: 'Objectifs'
  }, {
    id: 'alignment',
    label: 'Alignement'
  }, {
    id: 'alerts',
    label: 'Alertes'
  }, {
    id: 'history',
    label: 'Historique'
  }];
  return /*#__PURE__*/React.createElement("div", {
    className: "app"
  }, /*#__PURE__*/React.createElement(Sidebar, null), /*#__PURE__*/React.createElement("main", null, /*#__PURE__*/React.createElement(TopBar, null), /*#__PURE__*/React.createElement("div", {
    className: "page",
    "data-screen-label": "Vision strat\xE9gique 2026"
  }, /*#__PURE__*/React.createElement("div", {
    className: "breadcrumb"
  }, /*#__PURE__*/React.createElement("a", null, "Gouvernance"), /*#__PURE__*/React.createElement(Icon, {
    name: "chevron-right",
    size: 14
  }), /*#__PURE__*/React.createElement("a", null, "Vision strat\xE9gique")), /*#__PURE__*/React.createElement("div", {
    className: "page-header"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    className: "page-title"
  }, "Vision strat\xE9gique 2026", /*#__PURE__*/React.createElement("span", {
    className: "badge b-active"
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot",
    style: {
      background: 'var(--brand-gold)'
    }
  }), "Active")), /*#__PURE__*/React.createElement("p", {
    className: "page-subtitle"
  }, "D\xE9finir notre cap, aligner l'organisation et cr\xE9er de la valeur durable.")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "page-meta"
  }, "Derni\xE8re mise \xE0 jour : 15 mai 2024"), /*#__PURE__*/React.createElement("div", {
    className: "page-actions"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-secondary"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "download",
    size: 16
  }), "Exporter"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "edit",
    size: 16
  }), "Modifier la vision")))), /*#__PURE__*/React.createElement("div", {
    className: "tabs"
  }, tabs.map(t => /*#__PURE__*/React.createElement("div", {
    key: t.id,
    className: 'tab' + (tab === t.id ? ' active' : ''),
    onClick: () => setTab(t.id)
  }, t.label))), /*#__PURE__*/React.createElement("div", {
    className: "kpi-grid"
  }, /*#__PURE__*/React.createElement(KpiCard, {
    icon: "projects",
    label: "Projets en cours",
    value: "24",
    foot: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Icon, {
      name: "arrow-up",
      size: 12
    }), " 12% vs mois dernier"),
    footTone: "positive"
  }), /*#__PURE__*/React.createElement(KpiCard, {
    icon: "budget",
    label: "Budget engag\xE9",
    value: "12,4 M\u20AC",
    foot: "72% du budget annuel"
  }), /*#__PURE__*/React.createElement(KpiCard, {
    icon: "people",
    label: "Fournisseurs actifs",
    value: "68",
    foot: "\xC9valu\xE9s ce trimestre : 92%"
  }), /*#__PURE__*/React.createElement(KpiCard, {
    icon: "risk",
    label: "Risques ouverts",
    value: "17",
    foot: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Icon, {
      name: "arrow-down",
      size: 12
    }), " 8% vs mois dernier"),
    footTone: "negative"
  })), /*#__PURE__*/React.createElement("div", {
    className: "main-grid"
  }, /*#__PURE__*/React.createElement("div", {
    className: "col-stack"
  }, /*#__PURE__*/React.createElement(VisionCard, null), /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card-header"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "card-title"
  }, "Axes strat\xE9giques")), /*#__PURE__*/React.createElement("div", {
    className: "axes-grid"
  }, /*#__PURE__*/React.createElement(AxisCard, {
    index: 1,
    icon: "trending",
    title: "Performance op\xE9rationnelle",
    pct: 85,
    status: "success"
  }), /*#__PURE__*/React.createElement(AxisCard, {
    index: 2,
    icon: "lightbulb",
    title: "Transformation digitale",
    pct: 72,
    status: "success"
  }), /*#__PURE__*/React.createElement(AxisCard, {
    index: 3,
    icon: "shield-check",
    title: "Ma\xEEtrise des risques",
    pct: 65,
    status: "warning"
  }), /*#__PURE__*/React.createElement(AxisCard, {
    index: 4,
    icon: "people",
    title: "D\xE9veloppement humain",
    pct: 80,
    status: "success"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card-header"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "card-title"
  }, "Objectifs strat\xE9giques"), /*#__PURE__*/React.createElement("a", {
    className: "card-link"
  }, "Voir tous les objectifs \u203A")), /*#__PURE__*/React.createElement(ObjectivesTable, null))), /*#__PURE__*/React.createElement("div", {
    className: "col-stack"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card-header"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "card-title"
  }, "Alertes de d\xE9salignement"), /*#__PURE__*/React.createElement("a", {
    className: "card-link"
  }, "Voir toutes")), /*#__PURE__*/React.createElement(AlertsList, null)), /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card-header"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "card-title"
  }, "\xC9volution du score d'alignement"), /*#__PURE__*/React.createElement("button", {
    className: "chart-select"
  }, "12 derniers mois ", /*#__PURE__*/React.createElement(Icon, {
    name: "chevron-down",
    size: 12
  }))), /*#__PURE__*/React.createElement(AlignmentChart, null)), /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card-header"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "card-title"
  }, "Documents cl\xE9s"), /*#__PURE__*/React.createElement("a", {
    className: "card-link"
  }, "Voir tous")), /*#__PURE__*/React.createElement(DocumentsList, null)))))));
};
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(/*#__PURE__*/React.createElement(App, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/App.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/AxisCard.jsx
try { (() => {
/* global React, Icon */

const tones = {
  success: {
    color: 'var(--state-success)',
    label: 'En bonne trajectoire'
  },
  warning: {
    color: 'var(--state-warning)',
    label: 'Attention requise'
  },
  danger: {
    color: 'var(--state-danger)',
    label: 'En retard'
  }
};
const AxisCard = ({
  index,
  icon,
  title,
  pct,
  status
}) => {
  const t = tones[status] || tones.success;
  return /*#__PURE__*/React.createElement("div", {
    className: "axis"
  }, /*#__PURE__*/React.createElement("div", {
    className: "axis-head"
  }, /*#__PURE__*/React.createElement("div", {
    className: "axis-icon"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 18
  })), /*#__PURE__*/React.createElement("div", {
    className: "axis-title"
  }, index, ". ", title), /*#__PURE__*/React.createElement("div", {
    className: "axis-pct"
  }, pct, "%")), /*#__PURE__*/React.createElement("div", {
    className: "progress-track"
  }, /*#__PURE__*/React.createElement("div", {
    className: "progress-fill",
    style: {
      width: pct + '%',
      background: t.color
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "axis-status"
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot",
    style: {
      background: t.color
    }
  }), /*#__PURE__*/React.createElement("span", null, t.label)), /*#__PURE__*/React.createElement("a", {
    className: "axis-link",
    href: "#"
  }, "Voir le d\xE9tail \u203A"));
};
window.AxisCard = AxisCard;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/AxisCard.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/DocumentsList.jsx
try { (() => {
/* global React, Icon */

const DocumentsList = () => {
  const docs = [{
    name: 'Plan stratégique 2026.pdf',
    size: '2.4 Mo',
    date: '02/05/2024'
  }, {
    name: 'Carte stratégique 2026.pdf',
    size: '1.8 Mo',
    date: '02/05/2024'
  }, {
    name: 'Synthèse exécutive — Vision 2026.pdf',
    size: '1.2 Mo',
    date: '02/05/2024'
  }];
  return /*#__PURE__*/React.createElement("div", null, docs.map((d, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "doc"
  }, /*#__PURE__*/React.createElement("div", {
    className: "doc-icon"
  }, "PDF"), /*#__PURE__*/React.createElement("div", {
    className: "doc-body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "doc-name"
  }, d.name), /*#__PURE__*/React.createElement("div", {
    className: "doc-meta"
  }, "PDF \xB7 ", d.size, " \xB7 Mis \xE0 jour le ", d.date)), /*#__PURE__*/React.createElement("div", {
    className: "doc-action"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "download",
    size: 18
  })))));
};
window.DocumentsList = DocumentsList;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/DocumentsList.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/Icons.jsx
try { (() => {
/* global React */
const {
  useState
} = React;

// Lucide-style inline icons used across the kit. stroke 1.75, outlined.
const Icon = ({
  name,
  size = 18,
  ...rest
}) => {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    ...rest
  };
  switch (name) {
    case 'home':
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
        d: "M3 12l9-9 9 9"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10"
      }));
    case 'dashboard':
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("rect", {
        x: "3",
        y: "3",
        width: "7",
        height: "9"
      }), /*#__PURE__*/React.createElement("rect", {
        x: "14",
        y: "3",
        width: "7",
        height: "5"
      }), /*#__PURE__*/React.createElement("rect", {
        x: "14",
        y: "12",
        width: "7",
        height: "9"
      }), /*#__PURE__*/React.createElement("rect", {
        x: "3",
        y: "16",
        width: "7",
        height: "5"
      }));
    case 'users':
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
        d: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
      }), /*#__PURE__*/React.createElement("circle", {
        cx: "9",
        cy: "7",
        r: "4"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
      }));
    case 'user':
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
        d: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
      }), /*#__PURE__*/React.createElement("circle", {
        cx: "12",
        cy: "7",
        r: "4"
      }));
    case 'modules':
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("rect", {
        x: "3",
        y: "3",
        width: "7",
        height: "7"
      }), /*#__PURE__*/React.createElement("rect", {
        x: "14",
        y: "3",
        width: "7",
        height: "7"
      }), /*#__PURE__*/React.createElement("rect", {
        x: "3",
        y: "14",
        width: "7",
        height: "7"
      }), /*#__PURE__*/React.createElement("rect", {
        x: "14",
        y: "14",
        width: "7",
        height: "7"
      }));
    case 'logs':
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
        d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
      }), /*#__PURE__*/React.createElement("polyline", {
        points: "14 2 14 8 20 8"
      }), /*#__PURE__*/React.createElement("line", {
        x1: "8",
        y1: "13",
        x2: "16",
        y2: "13"
      }), /*#__PURE__*/React.createElement("line", {
        x1: "8",
        y1: "17",
        x2: "13",
        y2: "17"
      }));
    case 'target':
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("circle", {
        cx: "12",
        cy: "12",
        r: "10"
      }), /*#__PURE__*/React.createElement("circle", {
        cx: "12",
        cy: "12",
        r: "6"
      }), /*#__PURE__*/React.createElement("circle", {
        cx: "12",
        cy: "12",
        r: "2"
      }));
    case 'cycle':
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
        d: "M21 12a9 9 0 1 1-9-9"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M21 3v6h-6"
      }));
    case 'check-target':
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
        d: "M9 11l3 3L22 4"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"
      }));
    case 'shield':
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
        d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
      }));
    case 'shield-check':
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
        d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M9 12l2 2 4-4"
      }));
    case 'lightbulb':
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
        d: "M9 18h6"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M10 22h4"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.3v1h6v-1c0-1 .4-1.8 1-2.3A7 7 0 0 0 12 2z"
      }));
    case 'projects':
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("rect", {
        x: "3",
        y: "3",
        width: "7",
        height: "9"
      }), /*#__PURE__*/React.createElement("rect", {
        x: "14",
        y: "3",
        width: "7",
        height: "5"
      }), /*#__PURE__*/React.createElement("rect", {
        x: "14",
        y: "12",
        width: "7",
        height: "9"
      }), /*#__PURE__*/React.createElement("rect", {
        x: "3",
        y: "16",
        width: "7",
        height: "5"
      }));
    case 'budget':
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("line", {
        x1: "12",
        y1: "1",
        x2: "12",
        y2: "23"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"
      }));
    case 'capacity':
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
        d: "M3 3v18h18"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M7 14l4-4 4 4 6-6"
      }));
    case 'trending':
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("polyline", {
        points: "22 7 13.5 15.5 8.5 10.5 2 17"
      }), /*#__PURE__*/React.createElement("polyline", {
        points: "16 7 22 7 22 13"
      }));
    case 'risk':
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
        d: "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
      }), /*#__PURE__*/React.createElement("line", {
        x1: "12",
        y1: "9",
        x2: "12",
        y2: "13"
      }), /*#__PURE__*/React.createElement("line", {
        x1: "12",
        y1: "17",
        x2: "12.01",
        y2: "17"
      }));
    case 'decision':
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
        d: "M9 12l2 2 4-4"
      }), /*#__PURE__*/React.createElement("circle", {
        cx: "12",
        cy: "12",
        r: "10"
      }));
    case 'eye':
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
        d: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"
      }), /*#__PURE__*/React.createElement("circle", {
        cx: "12",
        cy: "12",
        r: "3"
      }));
    case 'vendors':
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("rect", {
        x: "2",
        y: "7",
        width: "20",
        height: "14",
        rx: "2"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"
      }));
    case 'contracts':
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
        d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
      }), /*#__PURE__*/React.createElement("polyline", {
        points: "14 2 14 8 20 8"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M9 15l2 2 4-4"
      }));
    case 'apps':
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("rect", {
        x: "3",
        y: "3",
        width: "7",
        height: "7"
      }), /*#__PURE__*/React.createElement("rect", {
        x: "14",
        y: "3",
        width: "7",
        height: "7"
      }), /*#__PURE__*/React.createElement("rect", {
        x: "3",
        y: "14",
        width: "7",
        height: "7"
      }), /*#__PURE__*/React.createElement("rect", {
        x: "14",
        y: "14",
        width: "7",
        height: "7"
      }));
    case 'docs':
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
        d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
      }), /*#__PURE__*/React.createElement("polyline", {
        points: "14 2 14 8 20 8"
      }), /*#__PURE__*/React.createElement("line", {
        x1: "8",
        y1: "13",
        x2: "16",
        y2: "13"
      }), /*#__PURE__*/React.createElement("line", {
        x1: "8",
        y1: "17",
        x2: "13",
        y2: "17"
      }));
    case 'people':
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
        d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
      }), /*#__PURE__*/React.createElement("circle", {
        cx: "9",
        cy: "7",
        r: "4"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M22 21v-2a4 4 0 0 0-3-3.87"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M19 3.13a4 4 0 0 1 0 7.75"
      }));
    case 'search':
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("circle", {
        cx: "11",
        cy: "11",
        r: "8"
      }), /*#__PURE__*/React.createElement("line", {
        x1: "21",
        y1: "21",
        x2: "16.65",
        y2: "16.65"
      }));
    case 'bell':
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
        d: "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M13.73 21a2 2 0 0 1-3.46 0"
      }));
    case 'help':
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("circle", {
        cx: "12",
        cy: "12",
        r: "10"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"
      }), /*#__PURE__*/React.createElement("line", {
        x1: "12",
        y1: "17",
        x2: "12.01",
        y2: "17"
      }));
    case 'chevron-down':
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("polyline", {
        points: "6 9 12 15 18 9"
      }));
    case 'chevron-right':
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("polyline", {
        points: "9 6 15 12 9 18"
      }));
    case 'building':
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("rect", {
        x: "4",
        y: "2",
        width: "16",
        height: "20",
        rx: "1"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M9 22v-4h6v4"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M8 6h.01M16 6h.01M12 6h.01M8 10h.01M16 10h.01M12 10h.01M8 14h.01M16 14h.01M12 14h.01"
      }));
    case 'download':
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
        d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
      }), /*#__PURE__*/React.createElement("polyline", {
        points: "7 10 12 15 17 10"
      }), /*#__PURE__*/React.createElement("line", {
        x1: "12",
        y1: "15",
        x2: "12",
        y2: "3"
      }));
    case 'edit':
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
        d: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
      }));
    case 'arrow-up':
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("line", {
        x1: "12",
        y1: "19",
        x2: "12",
        y2: "5"
      }), /*#__PURE__*/React.createElement("polyline", {
        points: "5 12 12 5 19 12"
      }));
    case 'arrow-down':
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("line", {
        x1: "12",
        y1: "5",
        x2: "12",
        y2: "19"
      }), /*#__PURE__*/React.createElement("polyline", {
        points: "19 12 12 19 5 12"
      }));
    case 'settings':
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("circle", {
        cx: "12",
        cy: "12",
        r: "3"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
      }));
    case 'sparkle':
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
        d: "M12 2l2.4 6.4L21 11l-6.6 2.6L12 20l-2.4-6.4L3 11l6.6-2.6z"
      }));
    default:
      return null;
  }
};
window.Icon = Icon;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/Icons.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/KpiCard.jsx
try { (() => {
/* global React, Icon */

const KpiCard = ({
  icon,
  label,
  value,
  denom,
  foot,
  footTone
}) => /*#__PURE__*/React.createElement("div", {
  className: "kpi"
}, /*#__PURE__*/React.createElement("div", {
  className: "kpi-icon"
}, /*#__PURE__*/React.createElement(Icon, {
  name: icon,
  size: 38
})), /*#__PURE__*/React.createElement("div", {
  className: "kpi-body"
}, /*#__PURE__*/React.createElement("div", {
  className: "kpi-label"
}, label), /*#__PURE__*/React.createElement("div", {
  className: "kpi-value"
}, value, denom && /*#__PURE__*/React.createElement("span", {
  className: "denom"
}, " / ", denom)), foot && /*#__PURE__*/React.createElement("div", {
  className: 'kpi-foot' + (footTone ? ' ' + footTone : '')
}, foot)));
window.KpiCard = KpiCard;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/KpiCard.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/ObjectivesTable.jsx
try { (() => {
/* global React */

const initials = name => name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
const statusBadge = s => {
  const map = {
    success: {
      cls: 'b-success',
      label: 'En bonne trajectoire'
    },
    warning: {
      cls: 'b-warning',
      label: 'Attention requise'
    },
    danger: {
      cls: 'b-danger',
      label: 'En retard'
    }
  }[s];
  return /*#__PURE__*/React.createElement("span", {
    className: 'badge ' + map.cls
  }, map.label);
};
const ObjectivesTable = () => {
  const rows = [{
    obj: 'Améliorer la satisfaction client (NPS > 60)',
    axe: 'Performance opérationnelle',
    who: 'Claire Dubois',
    date: '31 déc. 2026',
    pct: 72,
    status: 'success'
  }, {
    obj: 'Automatiser 80% des processus clés',
    axe: 'Transformation digitale',
    who: 'Julien Moreau',
    date: '30 sept. 2026',
    pct: 45,
    status: 'danger'
  }, {
    obj: 'Réduire les incidents critiques de 30%',
    axe: 'Maîtrise des risques',
    who: 'Nadia Benali',
    date: '31 déc. 2026',
    pct: 60,
    status: 'warning'
  }, {
    obj: 'Atteindre 40h de formation par collaborateur',
    axe: 'Développement humain',
    who: 'Marc Lemaire',
    date: '31 déc. 2026',
    pct: 80,
    status: 'success'
  }, {
    obj: 'Diminuer notre empreinte carbone de 20%',
    axe: 'Performance opérationnelle',
    who: 'Claire Dubois',
    date: '31 déc. 2026',
    pct: 55,
    status: 'warning'
  }];
  const fillColor = s => ({
    success: 'var(--state-success)',
    warning: 'var(--state-warning)',
    danger: 'var(--state-danger)'
  })[s];
  return /*#__PURE__*/React.createElement("table", {
    className: "table"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "Objectif"), /*#__PURE__*/React.createElement("th", null, "Axe"), /*#__PURE__*/React.createElement("th", null, "Responsable"), /*#__PURE__*/React.createElement("th", null, "\xC9ch\xE9ance"), /*#__PURE__*/React.createElement("th", {
    style: {
      width: '18%'
    }
  }, "Avancement"), /*#__PURE__*/React.createElement("th", null, "Statut"))), /*#__PURE__*/React.createElement("tbody", null, rows.map((r, i) => /*#__PURE__*/React.createElement("tr", {
    key: i
  }, /*#__PURE__*/React.createElement("td", {
    className: "cell-name"
  }, r.obj), /*#__PURE__*/React.createElement("td", null, r.axe), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("div", {
    className: "cell-user"
  }, /*#__PURE__*/React.createElement("div", {
    className: "av-xs"
  }, initials(r.who)), r.who)), /*#__PURE__*/React.createElement("td", null, r.date), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("div", {
    className: "cell-progress"
  }, /*#__PURE__*/React.createElement("div", {
    className: "progress-track"
  }, /*#__PURE__*/React.createElement("div", {
    className: "progress-fill",
    style: {
      width: r.pct + '%',
      background: fillColor(r.status)
    }
  })), /*#__PURE__*/React.createElement("span", {
    className: "pct"
  }, r.pct, "%"))), /*#__PURE__*/React.createElement("td", null, statusBadge(r.status))))));
};
window.ObjectivesTable = ObjectivesTable;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/ObjectivesTable.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/Sidebar-standalone.jsx
try { (() => {
/* global React, Icon */

const goTo = page => {
  sessionStorage.setItem('orch-page', page);
  window.location.href = 'orchestra.html';
};
const Sidebar = () => {
  const items = [{
    icon: 'home',
    label: "Vue d'ensemble",
    page: 'dashboard'
  }, {
    icon: 'target',
    label: 'Vision stratégique',
    active: true
  }, {
    icon: 'projects',
    label: 'Projets & risques',
    page: 'projects'
  }, {
    icon: 'budget',
    label: 'Budgets & finances',
    page: 'budget'
  }, {
    icon: 'vendors',
    label: 'Fournisseurs & contrats',
    page: 'suppliers'
  }, {
    icon: 'apps',
    label: 'Licences & actifs IT',
    page: 'contracts'
  }, {
    icon: 'people',
    label: 'Équipes & ressources',
    page: 'teams'
  }, {
    icon: 'docs',
    label: 'Documentation',
    page: 'docs'
  }, {
    icon: 'settings',
    label: 'Paramètres',
    page: 'settings'
  }];
  return /*#__PURE__*/React.createElement("aside", {
    className: "sidebar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sidebar-brand"
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo-horizontal-white.png",
    alt: "Starium"
  })), /*#__PURE__*/React.createElement("nav", {
    className: "sidebar-nav"
  }, items.map((item, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: 'nav-item' + (item.active ? ' active' : ''),
    style: item.page ? {
      cursor: 'pointer'
    } : {},
    onClick: item.page ? () => goTo(item.page) : undefined
  }, /*#__PURE__*/React.createElement(Icon, {
    name: item.icon,
    size: 17
  }), /*#__PURE__*/React.createElement("span", null, item.label))), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 8
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "nav-item",
    style: {
      cursor: 'pointer',
      opacity: 0.7,
      fontSize: 12
    },
    onClick: () => {
      window.location.href = 'scenario.html';
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "cycle",
    size: 16
  }), /*#__PURE__*/React.createElement("span", null, "Sc\xE9narios de capacit\xE9"))), /*#__PURE__*/React.createElement("div", {
    className: "sidebar-user"
  }, /*#__PURE__*/React.createElement("div", {
    className: "av"
  }, "SM"), /*#__PURE__*/React.createElement("div", {
    className: "meta"
  }, /*#__PURE__*/React.createElement("div", {
    className: "meta-name"
  }, "Sophie Martin"), /*#__PURE__*/React.createElement("div", {
    className: "meta-role"
  }, "DSI")), /*#__PURE__*/React.createElement(Icon, {
    name: "chevron-right",
    size: 14
  })));
};
window.Sidebar = Sidebar;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/Sidebar-standalone.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/Sidebar.jsx
try { (() => {
/* global React, Icon */

const goTo = page => {
  sessionStorage.setItem('orch-page', page);
  window.location.href = 'orchestra.html';
};
const Sidebar = () => {
  const items = [{
    icon: 'home',
    label: "Vue d'ensemble",
    page: 'dashboard'
  }, {
    icon: 'target',
    label: 'Vision stratégique',
    active: true
  }, {
    icon: 'projects',
    label: 'Projets & risques',
    page: 'projects'
  }, {
    icon: 'budget',
    label: 'Budgets & finances',
    page: 'budget'
  }, {
    icon: 'vendors',
    label: 'Fournisseurs & contrats',
    page: 'suppliers'
  }, {
    icon: 'apps',
    label: 'Licences & actifs IT',
    page: 'contracts'
  }, {
    icon: 'people',
    label: 'Équipes & ressources',
    page: 'teams'
  }, {
    icon: 'docs',
    label: 'Documentation',
    page: 'docs'
  }, {
    icon: 'settings',
    label: 'Paramètres',
    page: 'settings'
  }];
  return /*#__PURE__*/React.createElement("aside", {
    className: "sidebar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sidebar-brand"
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo-horizontal-white.png",
    alt: "Starium"
  })), /*#__PURE__*/React.createElement("nav", {
    className: "sidebar-nav"
  }, items.map((item, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: 'nav-item' + (item.active ? ' active' : ''),
    style: item.page ? {
      cursor: 'pointer'
    } : {},
    onClick: item.page ? () => goTo(item.page) : undefined
  }, /*#__PURE__*/React.createElement(Icon, {
    name: item.icon,
    size: 17
  }), /*#__PURE__*/React.createElement("span", null, item.label))), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 8
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "nav-item",
    style: {
      cursor: 'pointer',
      opacity: 0.7,
      fontSize: 12
    },
    onClick: () => {
      window.location.href = 'scenario.html';
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "cycle",
    size: 16
  }), /*#__PURE__*/React.createElement("span", null, "Sc\xE9narios de capacit\xE9"))), /*#__PURE__*/React.createElement("div", {
    className: "sidebar-user"
  }, /*#__PURE__*/React.createElement("div", {
    className: "av"
  }, "SM"), /*#__PURE__*/React.createElement("div", {
    className: "meta"
  }, /*#__PURE__*/React.createElement("div", {
    className: "meta-name"
  }, "Sophie Martin"), /*#__PURE__*/React.createElement("div", {
    className: "meta-role"
  }, "DSI")), /*#__PURE__*/React.createElement(Icon, {
    name: "chevron-right",
    size: 14
  })));
};
window.Sidebar = Sidebar;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/Sidebar.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/TopBar.jsx
try { (() => {
/* global React, Icon */

const TopBar = () => /*#__PURE__*/React.createElement("header", {
  className: "topbar"
}, /*#__PURE__*/React.createElement("div", {
  className: "client-selector"
}, /*#__PURE__*/React.createElement("div", {
  className: "ring"
}, /*#__PURE__*/React.createElement(Icon, {
  name: "building",
  size: 18
})), /*#__PURE__*/React.createElement("div", {
  className: "meta"
}, /*#__PURE__*/React.createElement("span", {
  className: "meta-label"
}, "Client actif"), /*#__PURE__*/React.createElement("span", {
  className: "meta-name"
}, "Groupe Excellence")), /*#__PURE__*/React.createElement(Icon, {
  name: "chevron-down",
  size: 16,
  style: {
    marginLeft: 'auto',
    color: 'var(--fg-3)'
  }
})), /*#__PURE__*/React.createElement("div", {
  className: "search-bar"
}, /*#__PURE__*/React.createElement(Icon, {
  name: "search",
  size: 18
}), /*#__PURE__*/React.createElement("span", {
  className: "ph"
}, "Rechercher\u2026"), /*#__PURE__*/React.createElement("span", {
  className: "kbd"
}, "\u2318 K")), /*#__PURE__*/React.createElement("div", {
  className: "icon-btn"
}, /*#__PURE__*/React.createElement(Icon, {
  name: "bell",
  size: 20
}), /*#__PURE__*/React.createElement("span", {
  className: "badge-num"
}, "12")), /*#__PURE__*/React.createElement("div", {
  className: "icon-btn"
}, /*#__PURE__*/React.createElement(Icon, {
  name: "help",
  size: 20
})), /*#__PURE__*/React.createElement("div", {
  className: "profile"
}, /*#__PURE__*/React.createElement("div", {
  className: "av"
}, "SM"), /*#__PURE__*/React.createElement("div", {
  className: "meta"
}, /*#__PURE__*/React.createElement("span", {
  className: "meta-name"
}, "Sophie Martin"), /*#__PURE__*/React.createElement("span", {
  className: "meta-role"
}, "Directrice Strat\xE9gie")), /*#__PURE__*/React.createElement(Icon, {
  name: "chevron-down",
  size: 16,
  style: {
    color: 'var(--fg-3)'
  }
})));
window.TopBar = TopBar;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/TopBar.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/VisionCard.jsx
try { (() => {
/* global React, Icon */

const VisionCard = () => /*#__PURE__*/React.createElement("div", {
  className: "vision"
}, /*#__PURE__*/React.createElement("div", {
  className: "vision-head"
}, /*#__PURE__*/React.createElement("div", {
  className: "kpi-ring"
}, /*#__PURE__*/React.createElement(Icon, {
  name: "eye",
  size: 20
})), /*#__PURE__*/React.createElement("div", {
  style: {
    fontWeight: 600,
    color: 'var(--fg-1)'
  }
}, "Notre vision")), /*#__PURE__*/React.createElement("div", {
  className: "vision-quote"
}, "\xCAtre la r\xE9f\xE9rence de confiance de nos clients en d\xE9livrant des solutions innovantes et durables, gr\xE2ce \xE0 l'excellence op\xE9rationnelle et \xE0 l'engagement de nos talents."));
window.VisionCard = VisionCard;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/VisionCard.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/atlas-dashboard.js
try { (() => {
/* ============================================================
   STARIUM ATLAS — Dashboard
   ============================================================ */

function atShowDashboard() {
  state.view = 'dashboard';
  document.getElementById('dashboard').classList.add('open');
  document.getElementById('btn-dashboard').classList.add('on');
  renderDashboard();
}
function atShowGraph() {
  state.view = 'graph';
  document.getElementById('dashboard').classList.remove('open');
  document.getElementById('btn-dashboard').classList.remove('on');
}
function dbPill(label, color, bg) {
  return `<span class="db-row-pill" style="background:${bg};color:${color}">${label}</span>`;
}
function renderDashboard() {
  const apps = NODES.filter(n => n.type === 'application');
  const procs = NODES.filter(n => n.type === 'processus');
  const fournisseurs = NODES.filter(n => n.type === 'fournisseur');
  const criticalFlows = EDGES.filter(e => e.crit === 'critique' || !e.secure);
  const insecureFlows = EDGES.filter(e => !e.secure);
  const exposedApps = NODES.filter(n => (n.badges || []).includes('internet'));
  const orphanOwners = NODES.filter(n => !n.ownerBiz && !n.ownerTech);
  const criticalRisks = Object.entries(RISKS).flatMap(([id, rs]) => rs.filter(r => r.niveau === 'critique').map(r => ({
    id,
    ...r
  })));
  const ssiGaps = Object.entries(COMPLIANCE).flatMap(([id, cs]) => cs.filter(c => c.type === 'ssi').map(c => ({
    id,
    ...c
  })));
  const rgpdGaps = Object.entries(COMPLIANCE).flatMap(([id, cs]) => cs.filter(c => c.type === 'rgpd').map(c => ({
    id,
    ...c
  })));
  const lateActions = Object.entries(ACTIONS).flatMap(([id, as]) => as.filter(a => a.statut === 'En retard').map(a => ({
    id,
    ...a
  })));
  const expectedDecisions = Object.entries(ACTIONS).flatMap(([id, as]) => as.filter(a => a.type === 'decision').map(a => ({
    id,
    ...a
  })));
  const kpis = [{
    label: 'Objets cartographiés',
    val: NODES.length,
    sub: 'toutes catégories'
  }, {
    label: 'Applications',
    val: apps.length,
    sub: apps.filter(a => a.crit === 'critique').length + ' critiques'
  }, {
    label: 'Processus',
    val: procs.length,
    sub: procs.filter(p => p.crit === 'elevee' || p.crit === 'critique').length + ' à forte criticité'
  }, {
    label: 'Flux cartographiés',
    val: EDGES.length,
    sub: criticalFlows.length + ' critiques'
  }, {
    label: 'Flux non sécurisés',
    val: insecureFlows.length,
    sub: 'à traiter en priorité',
    color: DANGER
  }, {
    label: 'Applications exposées internet',
    val: exposedApps.length,
    sub: 'accès public',
    color: DANGER
  }, {
    label: 'Objets sans propriétaire',
    val: orphanOwners.length,
    sub: 'fiche à compléter'
  }, {
    label: 'Risques critiques',
    val: criticalRisks.length,
    sub: 'ouverts',
    color: DANGER
  }, {
    label: 'Écarts SSI',
    val: ssiGaps.length,
    sub: 'contrôles en écart'
  }, {
    label: 'Écarts RGPD',
    val: rgpdGaps.length,
    sub: 'traitements à documenter'
  }, {
    label: 'Actions en retard',
    val: lateActions.length,
    sub: 'à traiter',
    color: DANGER
  }, {
    label: 'Décisions CODIR attendues',
    val: expectedDecisions.length,
    sub: 'arbitrage requis',
    color: 'var(--gold)'
  }];
  const topApps = [...apps].sort((a, b) => critRank(b.crit) - critRank(a.crit)).slice(0, 10);
  const obsoleteOnCritical = apps.filter(a => a.completeness < 60 && EDGES.some(e => e.t === a.id && e.flow === 'metier' && ['critique', 'elevee'].includes((NODE_BY_ID[e.s] || {}).crit)));
  document.getElementById('dashboard').innerHTML = `
    <div class="db-maxw">
      <button class="tb-back" style="margin-bottom:18px" onclick="atShowGraph()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg></button>
      <div class="db-head"><div class="db-h1">Dashboard Atlas</div><div class="db-sub">Vue consolidée de la cartographie — ce qui est critique, fragile ou non conforme.</div></div>
      <div class="db-kpis">${kpis.map(k => `<div class="db-kpi"><div class="db-kpi-label">${k.label}</div><div class="db-kpi-val mono" style="${k.color ? 'color:' + k.color : ''}">${k.val}</div><div class="db-kpi-sub">${k.sub}</div></div>`).join('')}</div>

      <div class="db-grid2">
        <div class="db-block">
          <div class="db-block-h"><span class="db-block-title">Top applications critiques</span><span class="db-block-count">${topApps.length}</span></div>
          ${topApps.map(a => dbRow(a, CRIT_META[a.crit])).join('') || '<div class="db-empty-row">Aucune application.</div>'}
        </div>
        <div class="db-block">
          <div class="db-block-h"><span class="db-block-title">Flux critiques non sécurisés</span><span class="db-block-count">${insecureFlows.length}</span></div>
          ${insecureFlows.map(e => {
    const s = NODE_BY_ID[e.s],
      t = NODE_BY_ID[e.t];
    return `<div class="db-row"><div class="db-row-ico" style="background:rgba(229,86,74,.16)"><svg viewBox="0 0 24 24" fill="none" stroke="${DANGER}" stroke-width="2" stroke-linecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/></svg></div><div class="db-row-name">${s.name} → ${t.name}</div><div class="db-row-meta">${e.mode}</div>${dbPill('Non sécurisé', DANGER, 'rgba(229,86,74,.16)')}</div>`;
  }).join('') || '<div class="db-empty-row">Aucun flux non sécurisé détecté.</div>'}
        </div>
      </div>

      <div class="db-grid2">
        <div class="db-block">
          <div class="db-block-h"><span class="db-block-title">Applications fragiles sur un processus critique</span><span class="db-block-count">${obsoleteOnCritical.length}</span></div>
          ${obsoleteOnCritical.map(a => dbRow(a, {
    label: 'Fiche ' + a.completeness + '%',
    color: 'var(--gold)'
  })).join('') || '<div class="db-empty-row">Aucune application concernée.</div>'}
        </div>
        <div class="db-block">
          <div class="db-block-h"><span class="db-block-title">Fournisseurs critiques</span><span class="db-block-count">${fournisseurs.filter(f => ['critique', 'elevee'].includes(f.crit)).length}</span></div>
          ${fournisseurs.filter(f => ['critique', 'elevee'].includes(f.crit)).map(f => dbRow(f, CRIT_META[f.crit])).join('') || '<div class="db-empty-row">Aucun fournisseur critique.</div>'}
        </div>
      </div>

      <div class="db-grid2">
        <div class="db-block">
          <div class="db-block-h"><span class="db-block-title">Écarts SSI / RGPD sans action corrective</span><span class="db-block-count">${[...ssiGaps, ...rgpdGaps].filter(g => !g.action).length}</span></div>
          ${[...ssiGaps, ...rgpdGaps].filter(g => !g.action).map(g => `<div class="db-row"><div class="db-row-name">${NODE_BY_ID[g.id].name}</div><div class="db-row-meta">${g.exigence}</div></div>`).join('') || '<div class="db-empty-row">Tous les écarts ont une action corrective associée.</div>'}
        </div>
        <div class="db-block">
          <div class="db-block-h"><span class="db-block-title">Décisions CODIR attendues</span><span class="db-block-count">${expectedDecisions.length}</span></div>
          ${expectedDecisions.map(d => `<div class="db-row"><div class="db-row-ico" style="background:rgba(63,190,132,.16)"><svg viewBox="0 0 24 24" fill="none" stroke="#3FBE84" stroke-width="2" stroke-linecap="round"><polyline points="22 4 12 14.01 9 11.01"/></svg></div><div><div class="db-row-name">${d.title}</div><div class="db-row-meta">${NODE_BY_ID[d.id].name} · échéance ${fmt(d.echeance)}</div></div>${dbPill('Arbitrage CODIR', 'var(--gold)', 'rgba(232,163,23,.16)')}</div>`).join('') || '<div class="db-empty-row">Aucune décision en attente.</div>'}
        </div>
      </div>
    </div>
  `;
}
function critRank(c) {
  return {
    critique: 4,
    elevee: 3,
    moyenne: 2,
    faible: 1
  }[c] || 0;
}
function dbRow(n, pill) {
  const tm = TYPE_META[n.type];
  return `<div class="db-row" onclick="atShowGraph();atSelect('${n.id}')" style="cursor:pointer">
    <div class="db-row-ico" style="background:${tm.bg}"><svg viewBox="0 0 24 24" fill="none" stroke="${tm.color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${tm.icon}</svg></div>
    <div class="db-row-name">${n.name}</div>
    <div class="db-row-meta">${n.ownerTech || n.ownerBiz || ''}</div>
    ${dbPill(pill.label, pill.color, pill.bg || 'rgba(255,255,255,.06)')}
  </div>`;
}
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/atlas-dashboard.js", error: String((e && e.message) || e) }); }

// ui_kits/app/atlas-data.js
try { (() => {
/* ============================================================
   STARIUM ATLAS — jeu de données de démonstration
   Bailleur social / ETI — ~30 objets, flux, risques, conformité
   ============================================================ */

const TYPE_META = {
  application: {
    label: 'Application',
    color: '#5B9BF0',
    bg: 'rgba(91,155,240,.16)',
    icon: '<rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/>'
  },
  processus: {
    label: 'Processus',
    color: '#B892F2',
    bg: 'rgba(184,146,242,.16)',
    icon: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'
  },
  donnee: {
    label: 'Donnée',
    color: '#3FBE84',
    bg: 'rgba(63,190,132,.16)',
    icon: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/>'
  },
  infrastructure: {
    label: 'Infrastructure',
    color: '#8A93A3',
    bg: 'rgba(138,147,163,.16)',
    icon: '<rect x="2" y="3" width="20" height="7" rx="1"/><rect x="2" y="14" width="20" height="7" rx="1"/><line x1="6" y1="6.5" x2="6.01" y2="6.5"/><line x1="6" y1="17.5" x2="6.01" y2="17.5"/>'
  },
  fournisseur: {
    label: 'Fournisseur',
    color: '#F0A05C',
    bg: 'rgba(240,160,92,.16)',
    icon: '<path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>'
  },
  site: {
    label: 'Site',
    color: '#4FC7B8',
    bg: 'rgba(79,199,184,.16)',
    icon: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>'
  }
};
const CRIT_META = {
  critique: {
    label: 'Critique',
    color: '#E5564A',
    bg: 'rgba(229,86,74,.16)'
  },
  elevee: {
    label: 'Élevée',
    color: '#E8A317',
    bg: 'rgba(232,163,23,.16)'
  },
  moyenne: {
    label: 'Moyenne',
    color: '#5B9BF0',
    bg: 'rgba(91,155,240,.14)'
  },
  faible: {
    label: 'Faible',
    color: '#8A93A3',
    bg: 'rgba(138,147,163,.16)'
  }
};
const LAYERS_META = {
  processus: 'Processus',
  applications: 'Applications',
  flux_app: 'Flux applicatifs',
  flux_tech: 'Flux techniques',
  donnees: 'Données',
  fournisseurs: 'Fournisseurs',
  infra: 'Infrastructures',
  sites: 'Sites',
  risques: 'Risques',
  ssi: 'Conformité SSI',
  rgpd: 'Conformité RGPD',
  projets: 'Projets',
  decisions: 'Décisions',
  actions: 'Actions'
};

/* ---------- Nœuds ---------- */
const NODES = [
// Processus
{
  id: 'p1',
  type: 'processus',
  name: 'Quittancement',
  x: 230,
  y: 150,
  crit: 'elevee',
  status: 'Actif',
  ownerBiz: 'Direction Gestion Locative',
  ownerTech: 'DSI',
  lastReview: '2026-03-02',
  completeness: 88,
  desc: "Émission et suivi des quittances de loyer auprès des locataires."
}, {
  id: 'p2',
  type: 'processus',
  name: 'Attribution de logements',
  x: 230,
  y: 260,
  crit: 'moyenne',
  status: 'Actif',
  ownerBiz: 'Direction Gestion Locative',
  ownerTech: 'DSI',
  lastReview: '2025-11-14',
  completeness: 74,
  desc: "Instruction des dossiers et attribution des logements sociaux."
}, {
  id: 'p3',
  type: 'processus',
  name: 'Gestion des réclamations',
  x: 230,
  y: 370,
  crit: 'moyenne',
  status: 'Actif',
  ownerBiz: 'Relation locataires',
  ownerTech: 'DSI',
  lastReview: '2026-01-20',
  completeness: 80,
  desc: "Traitement des réclamations et demandes des locataires."
}, {
  id: 'p4',
  type: 'processus',
  name: 'Gestion des sinistres',
  x: 390,
  y: 430,
  crit: 'moyenne',
  status: 'Actif',
  ownerBiz: 'Direction Technique',
  ownerTech: 'DSI',
  lastReview: '2025-09-05',
  completeness: 62,
  desc: "Déclaration, suivi et clôture des sinistres immobiliers."
}, {
  id: 'p5',
  type: 'processus',
  name: 'Paie',
  x: 400,
  y: 130,
  crit: 'elevee',
  status: 'Actif',
  ownerBiz: 'DRH',
  ownerTech: 'DSI',
  lastReview: '2026-02-18',
  completeness: 95,
  desc: "Établissement et versement de la paie du personnel."
}, {
  id: 'p6',
  type: 'processus',
  name: "Recouvrement des impayés",
  x: 390,
  y: 300,
  crit: 'moyenne',
  status: 'Actif',
  ownerBiz: 'Direction Gestion Locative',
  ownerTech: 'DSI',
  lastReview: '2025-12-01',
  completeness: 70,
  desc: "Suivi et relance des loyers impayés."
},
// Applications
{
  id: 'a1',
  type: 'application',
  name: 'ERP Gestion Locative',
  x: 650,
  y: 200,
  crit: 'critique',
  status: 'Production',
  ownerBiz: 'Direction Gestion Locative',
  ownerTech: 'Julien Thomas',
  lastReview: '2026-02-10',
  completeness: 92,
  badges: ['projet', 'decision'],
  desc: "Socle applicatif central : locataires, patrimoine, quittancement, contentieux."
}, {
  id: 'a2',
  type: 'application',
  name: 'Portail Locataires',
  x: 860,
  y: 150,
  crit: 'critique',
  status: 'Production',
  ownerBiz: 'Relation locataires',
  ownerTech: 'Alice Bernard',
  lastReview: '2025-08-22',
  completeness: 78,
  badges: ['risque', 'internet', 'ssi', 'action'],
  desc: "Espace self-care : consultation de compte, paiement en ligne, réclamations."
}, {
  id: 'a3',
  type: 'application',
  name: 'GED',
  x: 650,
  y: 340,
  crit: 'moyenne',
  status: 'Production',
  ownerBiz: 'Direction Technique',
  ownerTech: 'Sophie Leroy',
  lastReview: '2026-01-05',
  completeness: 83,
  desc: "Gestion électronique des documents contractuels et techniques."
}, {
  id: 'a4',
  type: 'application',
  name: 'CRM Contacts',
  x: 840,
  y: 300,
  crit: 'moyenne',
  status: 'Production',
  ownerBiz: 'Relation locataires',
  ownerTech: 'Alice Bernard',
  lastReview: '2025-10-30',
  completeness: 86,
  desc: "Suivi de la relation locataire multicanal."
}, {
  id: 'a5',
  type: 'application',
  name: 'Logiciel de Paie',
  x: 650,
  y: 460,
  crit: 'elevee',
  status: 'Production',
  ownerBiz: 'DRH',
  ownerTech: 'Paul Dubois',
  lastReview: '2026-02-18',
  completeness: 90,
  desc: "Calcul et édition des bulletins de paie, DSN."
}, {
  id: 'a6',
  type: 'application',
  name: 'Outil de Ticketing Réclamations',
  x: 790,
  y: 430,
  crit: 'faible',
  status: 'Production',
  ownerBiz: 'Relation locataires',
  ownerTech: 'Sophie Leroy',
  lastReview: '2025-07-12',
  completeness: 69,
  desc: "File de traitement des réclamations locataires."
}, {
  id: 'a7',
  type: 'application',
  name: 'Outil décisionnel BI',
  x: 960,
  y: 250,
  crit: 'faible',
  status: 'Production',
  ownerTech: 'Paul Dubois',
  lastReview: '2024-11-02',
  completeness: 41,
  badges: ['fiche'],
  desc: "Restitution des indicateurs de pilotage patrimoine et social."
},
// Données
{
  id: 'd1',
  type: 'donnee',
  name: 'Données locataires',
  x: 700,
  y: 610,
  crit: 'critique',
  status: 'Actif',
  ownerBiz: 'DPO',
  ownerTech: 'Sophie Leroy',
  lastReview: '2025-06-01',
  completeness: 65,
  badges: ['sensible', 'rgpd'],
  desc: "Identité, situation familiale et financière des locataires."
}, {
  id: 'd2',
  type: 'donnee',
  name: 'Données de paie',
  x: 555,
  y: 650,
  crit: 'elevee',
  status: 'Actif',
  ownerBiz: 'DRH',
  ownerTech: 'Paul Dubois',
  lastReview: '2026-02-18',
  completeness: 88,
  badges: ['sensible'],
  desc: "Rémunérations, coordonnées bancaires et données sociales du personnel."
}, {
  id: 'd3',
  type: 'donnee',
  name: 'Référentiel patrimoine',
  x: 840,
  y: 600,
  crit: 'moyenne',
  status: 'Actif',
  ownerBiz: 'Direction Technique',
  ownerTech: 'Sophie Leroy',
  lastReview: '2025-10-11',
  completeness: 79,
  desc: "Référentiel des immeubles, logements et équipements."
},
// Infrastructure
{
  id: 'i1',
  type: 'infrastructure',
  name: 'Serveur applicatif principal',
  x: 650,
  y: 790,
  crit: 'critique',
  status: 'Production',
  ownerTech: 'Julien Thomas',
  lastReview: '2025-05-14',
  completeness: 70,
  badges: ['support'],
  desc: "Cluster hébergeant les applications métier critiques."
}, {
  id: 'i2',
  type: 'infrastructure',
  name: 'Base de données ERP',
  x: 555,
  y: 850,
  crit: 'critique',
  status: 'Production',
  ownerTech: 'Julien Thomas',
  lastReview: '2026-01-15',
  completeness: 84,
  desc: "Instance SQL principale de l'ERP Gestion Locative."
}, {
  id: 'i3',
  type: 'infrastructure',
  name: 'Base de données CRM',
  x: 750,
  y: 880,
  crit: 'moyenne',
  status: 'Production',
  ownerTech: 'Sophie Leroy',
  lastReview: '2025-11-20',
  completeness: 81,
  desc: "Instance dédiée au CRM Contacts."
}, {
  id: 'i4',
  type: 'infrastructure',
  name: 'Sauvegardes',
  x: 455,
  y: 900,
  crit: 'elevee',
  status: 'Production',
  ownerTech: 'Sophie Leroy',
  lastReview: '2026-01-15',
  completeness: 75,
  desc: "Politique de sauvegarde et de restauration des données critiques."
}, {
  id: 'i5',
  type: 'infrastructure',
  name: 'Annuaire Active Directory',
  x: 855,
  y: 800,
  crit: 'elevee',
  status: 'Production',
  ownerTech: 'Julien Thomas',
  lastReview: '2025-09-30',
  completeness: 73,
  desc: "Référentiel d'identités et d'authentification interne."
}, {
  id: 'i6',
  type: 'infrastructure',
  name: 'Pare-feu / VPN',
  x: 970,
  y: 850,
  crit: 'elevee',
  status: 'Production',
  ownerTech: 'Sophie Leroy',
  lastReview: '2024-12-02',
  completeness: 58,
  badges: ['ssi'],
  desc: "Filtrage périmétrique et accès distants sécurisés."
}, {
  id: 'i7',
  type: 'infrastructure',
  name: 'Supervision technique',
  x: 1050,
  y: 770,
  crit: 'faible',
  status: 'Production',
  ownerTech: 'Sophie Leroy',
  lastReview: '2025-11-01',
  completeness: 66,
  desc: "Monitoring de disponibilité et de performance des systèmes."
},
// Fournisseurs
{
  id: 'f1',
  type: 'fournisseur',
  name: 'Éditeur ERP',
  x: 1260,
  y: 190,
  crit: 'critique',
  status: 'Contrat actif',
  ownerBiz: 'Direction Achats',
  lastReview: '2025-04-18',
  completeness: 77,
  desc: "Éditeur et TMA de l'ERP Gestion Locative."
}, {
  id: 'f2',
  type: 'fournisseur',
  name: 'Hébergeur Cloud',
  x: 1310,
  y: 340,
  crit: 'elevee',
  status: 'Contrat actif',
  ownerBiz: 'Direction Achats',
  lastReview: '2025-06-22',
  completeness: 82,
  desc: "Hébergement infogéré du datacenter applicatif."
}, {
  id: 'f3',
  type: 'fournisseur',
  name: 'Infogérant IT',
  x: 1310,
  y: 500,
  crit: 'elevee',
  status: 'Contrat actif',
  ownerBiz: 'Direction Achats',
  lastReview: '2024-10-09',
  completeness: 54,
  badges: ['decision', 'action'],
  desc: "Exploitation et maintien en condition opérationnelle du SI."
}, {
  id: 'f4',
  type: 'fournisseur',
  name: 'Éditeur SaaS Paie',
  x: 1260,
  y: 650,
  crit: 'critique',
  status: 'Contrat actif',
  ownerBiz: 'DRH',
  lastReview: '2025-03-01',
  completeness: 69,
  desc: "Plateforme SaaS de calcul de paie et DSN."
},
// Sites
{
  id: 's1',
  type: 'site',
  name: 'Siège social',
  x: 200,
  y: 760,
  crit: 'faible',
  status: 'Actif',
  lastReview: '2025-01-10',
  completeness: 60,
  desc: "Site principal hébergeant les services support et la DSI."
}, {
  id: 's2',
  type: 'site',
  name: 'Agences territoriales',
  x: 200,
  y: 870,
  crit: 'faible',
  status: 'Actif',
  lastReview: '2025-01-10',
  completeness: 55,
  desc: "Réseau d'agences de proximité (accueil locataires)."
}];

/* ---------- Flux (arêtes) ---------- */
const EDGES = [{
  id: 'e1',
  s: 'p1',
  t: 'a1',
  flow: 'metier',
  mode: 'Intégré',
  freq: 'Temps réel',
  crit: 'elevee',
  dir: 'uni',
  secure: true,
  manual: false
}, {
  id: 'e2',
  s: 'p2',
  t: 'a1',
  flow: 'metier',
  mode: 'Intégré',
  freq: 'Quotidien',
  crit: 'moyenne',
  dir: 'uni',
  secure: true,
  manual: false
}, {
  id: 'e3',
  s: 'p2',
  t: 'a2',
  flow: 'metier',
  mode: 'API',
  freq: 'Temps réel',
  crit: 'moyenne',
  dir: 'uni',
  secure: true,
  manual: false
}, {
  id: 'e4',
  s: 'p3',
  t: 'a6',
  flow: 'metier',
  mode: 'API',
  freq: 'Temps réel',
  crit: 'moyenne',
  dir: 'uni',
  secure: true,
  manual: false
}, {
  id: 'e5',
  s: 'p4',
  t: 'a3',
  flow: 'metier',
  mode: 'Saisie manuelle',
  freq: 'À l\'événement',
  crit: 'moyenne',
  dir: 'uni',
  secure: true,
  manual: true
}, {
  id: 'e6',
  s: 'p5',
  t: 'a5',
  flow: 'metier',
  mode: 'Intégré',
  freq: 'Mensuel',
  crit: 'elevee',
  dir: 'uni',
  secure: true,
  manual: false
}, {
  id: 'e7',
  s: 'p6',
  t: 'a1',
  flow: 'metier',
  mode: 'Intégré',
  freq: 'Quotidien',
  crit: 'moyenne',
  dir: 'uni',
  secure: true,
  manual: false
}, {
  id: 'e8',
  s: 'a1',
  t: 'a2',
  flow: 'applicatif',
  mode: 'API',
  freq: 'Temps réel',
  crit: 'critique',
  dir: 'bi',
  secure: true,
  manual: false
}, {
  id: 'e9',
  s: 'a1',
  t: 'a3',
  flow: 'applicatif',
  mode: 'Fichier plat',
  freq: 'Quotidien',
  crit: 'moyenne',
  dir: 'uni',
  secure: true,
  manual: false
}, {
  id: 'e10',
  s: 'a1',
  t: 'a4',
  flow: 'applicatif',
  mode: 'Batch',
  freq: 'Nocturne',
  crit: 'moyenne',
  dir: 'bi',
  secure: true,
  manual: false
}, {
  id: 'e11',
  s: 'a4',
  t: 'a7',
  flow: 'applicatif',
  mode: 'Batch',
  freq: 'Hebdomadaire',
  crit: 'faible',
  dir: 'uni',
  secure: true,
  manual: false
}, {
  id: 'e12',
  s: 'a5',
  t: 'f4',
  flow: 'fournisseur',
  mode: 'SFTP',
  freq: 'Mensuel',
  crit: 'critique',
  dir: 'bi',
  secure: false,
  manual: true
}, {
  id: 'e13',
  s: 'i5',
  t: 'a1',
  flow: 'technique',
  mode: 'LDAP',
  freq: 'Temps réel',
  crit: 'elevee',
  dir: 'uni',
  secure: true,
  manual: false
}, {
  id: 'e14',
  s: 'i5',
  t: 'a2',
  flow: 'technique',
  mode: 'LDAP',
  freq: 'Temps réel',
  crit: 'elevee',
  dir: 'uni',
  secure: true,
  manual: false
}, {
  id: 'e15',
  s: 'i5',
  t: 'a4',
  flow: 'technique',
  mode: 'LDAP',
  freq: 'Temps réel',
  crit: 'moyenne',
  dir: 'uni',
  secure: true,
  manual: false
}, {
  id: 'e16',
  s: 'd1',
  t: 'i2',
  flow: 'technique',
  mode: 'Stockage',
  freq: 'Continu',
  crit: 'critique',
  dir: 'uni',
  secure: true,
  manual: false
}, {
  id: 'e17',
  s: 'd1',
  t: 'a4',
  flow: 'applicatif',
  mode: 'API',
  freq: 'Temps réel',
  crit: 'moyenne',
  dir: 'uni',
  secure: true,
  manual: false
}, {
  id: 'e18',
  s: 'd2',
  t: 'a5',
  flow: 'applicatif',
  mode: 'Intégré',
  freq: 'Mensuel',
  crit: 'elevee',
  dir: 'uni',
  secure: true,
  manual: false
}, {
  id: 'e19',
  s: 'd3',
  t: 'a1',
  flow: 'applicatif',
  mode: 'Intégré',
  freq: 'Quotidien',
  crit: 'moyenne',
  dir: 'uni',
  secure: true,
  manual: false
}, {
  id: 'e20',
  s: 'a1',
  t: 'i2',
  flow: 'technique',
  mode: 'SQL',
  freq: 'Continu',
  crit: 'critique',
  dir: 'uni',
  secure: true,
  manual: false
}, {
  id: 'e21',
  s: 'a4',
  t: 'i3',
  flow: 'technique',
  mode: 'SQL',
  freq: 'Continu',
  crit: 'moyenne',
  dir: 'uni',
  secure: true,
  manual: false
}, {
  id: 'e22',
  s: 'i2',
  t: 'i4',
  flow: 'technique',
  mode: 'Réplication',
  freq: 'Quotidien',
  crit: 'elevee',
  dir: 'uni',
  secure: true,
  manual: false
}, {
  id: 'e23',
  s: 'i3',
  t: 'i4',
  flow: 'technique',
  mode: 'Réplication',
  freq: 'Quotidien',
  crit: 'moyenne',
  dir: 'uni',
  secure: true,
  manual: false
}, {
  id: 'e24',
  s: 'a1',
  t: 'i1',
  flow: 'technique',
  mode: 'Hébergement',
  freq: 'Continu',
  crit: 'critique',
  dir: 'uni',
  secure: true,
  manual: false
}, {
  id: 'e25',
  s: 'a2',
  t: 'i1',
  flow: 'technique',
  mode: 'Hébergement',
  freq: 'Continu',
  crit: 'critique',
  dir: 'uni',
  secure: true,
  manual: false
}, {
  id: 'e26',
  s: 'i7',
  t: 'i1',
  flow: 'technique',
  mode: 'Monitoring',
  freq: 'Continu',
  crit: 'faible',
  dir: 'uni',
  secure: true,
  manual: false
}, {
  id: 'e27',
  s: 'a2',
  t: 'i6',
  flow: 'technique',
  mode: 'Réseau',
  freq: 'Continu',
  crit: 'elevee',
  dir: 'uni',
  secure: true,
  manual: false
}, {
  id: 'e28',
  s: 'f2',
  t: 'i1',
  flow: 'fournisseur',
  mode: 'Hébergement',
  freq: 'Continu',
  crit: 'elevee',
  dir: 'uni',
  secure: true,
  manual: false
}, {
  id: 'e29',
  s: 'f3',
  t: 'i1',
  flow: 'fournisseur',
  mode: 'Exploitation',
  freq: 'Continu',
  crit: 'elevee',
  dir: 'uni',
  secure: true,
  manual: false
}, {
  id: 'e30',
  s: 'f3',
  t: 'i6',
  flow: 'fournisseur',
  mode: 'Exploitation',
  freq: 'Continu',
  crit: 'elevee',
  dir: 'uni',
  secure: true,
  manual: false
}, {
  id: 'e31',
  s: 'f1',
  t: 'a1',
  flow: 'fournisseur',
  mode: 'TMA',
  freq: 'Continu',
  crit: 'critique',
  dir: 'bi',
  secure: true,
  manual: false
}, {
  id: 'e32',
  s: 's1',
  t: 'i1',
  flow: 'technique',
  mode: 'Hébergement local',
  freq: 'Continu',
  crit: 'faible',
  dir: 'uni',
  secure: true,
  manual: false
}, {
  id: 'e33',
  s: 's2',
  t: 'a1',
  flow: 'applicatif',
  mode: 'API',
  freq: 'Temps réel',
  crit: 'moyenne',
  dir: 'uni',
  secure: true,
  manual: false
}];

/* ---------- Risques ---------- */
const RISKS = {
  a2: [{
    title: "Exposition internet sans authentification forte",
    niveau: 'critique',
    score: '18/25',
    statut: 'Ouvert',
    responsable: 'Alice Bernard',
    echeance: '2026-08-15'
  }],
  f3: [{
    title: "Absence de plan de continuité d'activité formalisé",
    niveau: 'elevee',
    score: '14/25',
    statut: 'En traitement',
    responsable: 'Sophie Leroy',
    echeance: '2026-09-01'
  }],
  a5: [{
    title: "Flux de paie non sécurisé vers l'éditeur SaaS",
    niveau: 'critique',
    score: '16/25',
    statut: 'Ouvert',
    responsable: 'Julien Thomas',
    echeance: '2026-07-20'
  }],
  i1: [{
    title: "Fin de support matériel proche",
    niveau: 'moyenne',
    score: '9/25',
    statut: 'Planifié',
    responsable: 'Julien Thomas',
    echeance: '2026-12-01'
  }],
  i6: [{
    title: "Règles de filtrage obsolètes",
    niveau: 'elevee',
    score: '12/25',
    statut: 'Ouvert',
    responsable: 'Sophie Leroy',
    echeance: '2026-08-01'
  }]
};

/* ---------- Conformité SSI / RGPD ---------- */
const COMPLIANCE = {
  a2: [{
    type: 'ssi',
    exigence: 'Authentification forte (MFA)',
    ecart: "Absente sur l'accès locataire",
    preuve: 'Aucune',
    action: 'Déployer le MFA sur le portail locataires'
  }],
  i6: [{
    type: 'ssi',
    exigence: 'Règles de filtrage à jour',
    ecart: 'Revue de règles > 18 mois',
    preuve: 'Dernière revue 2024-12-02',
    action: 'Planifier une revue des règles de filtrage'
  }],
  d1: [{
    type: 'rgpd',
    exigence: 'Registre des traitements',
    ecart: 'Finalités non documentées pour le module réclamations',
    preuve: 'Registre incomplet',
    action: 'Compléter le registre des traitements'
  }]
};

/* ---------- Projets liés ---------- */
const PROJECTS = {
  a1: [{
    name: 'Refonte Portail Client',
    role: 'Système source'
  }],
  a2: [{
    name: 'Refonte Portail Client',
    role: 'Périmètre applicatif'
  }]
};

/* ---------- Actions & décisions ---------- */
const ACTIONS = {
  a1: [{
    type: 'decision',
    title: "Faut-il migrer l'ERP vers le cloud ?",
    statut: 'Attendue',
    echeance: '2026-09-01',
    codir: true
  }],
  a2: [{
    type: 'action',
    title: 'Déployer le MFA sur le portail locataires',
    statut: 'En cours',
    echeance: '2026-07-25'
  }],
  f3: [{
    type: 'decision',
    title: "Renouveler le contrat d'infogérance ?",
    statut: 'Attendue',
    echeance: '2026-08-01',
    codir: true
  }, {
    type: 'action',
    title: 'Mettre à jour le plan de continuité',
    statut: 'En retard',
    echeance: '2026-06-20'
  }]
};

/* ---------- Vues préconfigurées ---------- */
const PRESETS = [{
  id: 'globale',
  label: 'Globale'
}, {
  id: 'processus',
  label: 'Processus'
}, {
  id: 'applicative',
  label: 'Applicative'
}, {
  id: 'technique',
  label: 'Technique'
}, {
  id: 'conformite',
  label: 'Conformité'
}, {
  id: 'codir',
  label: 'CODIR'
}];
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/atlas-data.js", error: String((e && e.message) || e) }); }

// ui_kits/app/atlas-engine.js
try { (() => {
/* ============================================================
   STARIUM ATLAS — moteur du prototype
   ============================================================ */

const FLOW_COLOR = {
  applicatif: '#2A6FDB',
  metier: '#6B2FB2',
  technique: '#6E7685',
  fournisseur: '#C1660A'
};
const DANGER = '#B42318';
const BADGE_META = {
  risque: {
    icon: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    color: DANGER,
    bg: 'rgba(229,86,74,.18)',
    label: 'Risque critique',
    layer: 'risques'
  },
  ssi: {
    icon: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    color: '#E8A317',
    bg: 'rgba(232,163,23,.18)',
    label: 'Écart SSI',
    layer: 'ssi'
  },
  rgpd: {
    icon: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/>',
    color: '#B892F2',
    bg: 'rgba(184,146,242,.18)',
    label: 'Écart RGPD',
    layer: 'rgpd'
  },
  action: {
    icon: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    color: '#E8A317',
    bg: 'rgba(232,163,23,.18)',
    label: 'Action en retard',
    layer: 'actions'
  },
  projet: {
    icon: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
    color: '#5B9BF0',
    bg: 'rgba(91,155,240,.18)',
    label: 'Projet lié',
    layer: 'projets'
  },
  decision: {
    icon: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
    color: '#3FBE84',
    bg: 'rgba(63,190,132,.18)',
    label: 'Décision attendue',
    layer: 'decisions'
  },
  sensible: {
    icon: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    color: '#B892F2',
    bg: 'rgba(184,146,242,.18)',
    label: 'Donnée sensible',
    layer: 'donnees'
  },
  internet: {
    icon: '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z"/>',
    color: DANGER,
    bg: 'rgba(229,86,74,.18)',
    label: 'Exposition internet',
    layer: 'risques'
  },
  support: {
    icon: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
    color: '#8A93A3',
    bg: 'rgba(138,147,163,.18)',
    label: 'Fin de support',
    layer: 'infra'
  },
  fiche: {
    icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
    color: '#8A93A3',
    bg: 'rgba(138,147,163,.18)',
    label: 'Fiche incomplète',
    layer: 'ssi'
  }
};

/* ---------- état global ---------- */
const state = {
  tx: 0,
  ty: 0,
  scale: 1,
  selected: null,
  hovered: null,
  preset: 'globale',
  drawerLeftOpen: false,
  drawerLeftTab: 'calques',
  impact: {
    active: false,
    depth: 1,
    source: null
  },
  view: 'graph',
  // graph | dashboard
  layers: {
    processus: true,
    applications: true,
    flux_app: true,
    flux_tech: true,
    donnees: true,
    fournisseurs: true,
    risques: true,
    ssi: true,
    rgpd: true,
    projets: true,
    decisions: true,
    actions: true,
    infrastructures: false,
    sites: false
  },
  filters: {
    crit: new Set(['critique', 'elevee']),
    statut: 'all',
    owner: 'all',
    hasRisk: false,
    riskLevel: 'all',
    ssiGap: false,
    rgpdGap: false,
    insecure: false,
    notReviewed: false,
    decisionExpected: false
  },
  special: null // 'conformite' | 'codir' | null
};
const NODE_BY_ID = Object.fromEntries(NODES.map(n => [n.id, n]));
const LAYER_KEY_FOR_TYPE = {
  processus: 'processus',
  application: 'applications',
  donnee: 'donnees',
  infrastructure: 'infrastructures',
  fournisseur: 'fournisseurs',
  site: 'sites'
};
function edgesOf(id) {
  return EDGES.filter(e => e.s === id || e.t === id);
}
function neighborsOf(id) {
  const set = new Set();
  edgesOf(id).forEach(e => {
    set.add(e.s === id ? e.t : e.s);
  });
  return set;
}

/* ============================================================
   VISIBILITÉ (filtres + calques + vues)
   ============================================================ */
function nodeVisible(n) {
  const lk = LAYER_KEY_FOR_TYPE[n.type];
  if (!state.layers[lk]) return false;
  const f = state.filters;
  if (!f.crit.has(n.crit)) return false;
  if (f.statut !== 'all' && n.status !== f.statut) return false;
  if (f.owner !== 'all' && n.ownerBiz !== f.owner && n.ownerTech !== f.owner) return false;
  if (f.hasRisk && !RISKS[n.id]) return false;
  if (f.riskLevel !== 'all' && !(RISKS[n.id] || []).some(r => r.niveau === f.riskLevel)) return false;
  if (f.ssiGap && !(COMPLIANCE[n.id] || []).some(c => c.type === 'ssi')) return false;
  if (f.rgpdGap && !(COMPLIANCE[n.id] || []).some(c => c.type === 'rgpd')) return false;
  if (f.insecure && !edgesOf(n.id).some(e => !e.secure)) return false;
  if (f.notReviewed && n.lastReview >= '2025-06-01') return false;
  if (f.decisionExpected && !(ACTIONS[n.id] || []).some(a => a.type === 'decision')) return false;
  if (state.special === 'conformite') {
    const hasGap = RISKS[n.id] || (COMPLIANCE[n.id] || []).length;
    if (!hasGap) return false;
  }
  if (state.special === 'codir') {
    const critCore = n.crit === 'critique' && ['processus', 'application', 'fournisseur'].includes(n.type);
    const critRisk = (RISKS[n.id] || []).some(r => r.niveau === 'critique');
    const decOrLate = (ACTIONS[n.id] || []).some(a => a.type === 'decision' || a.statut === 'En retard');
    if (!(critCore || critRisk || decOrLate)) return false;
  }
  return true;
}
function edgeVisible(e, visibleIds) {
  if (!visibleIds.has(e.s) || !visibleIds.has(e.t)) return false;
  const layerFor = {
    applicatif: 'flux_app',
    metier: 'processus',
    technique: 'flux_tech',
    fournisseur: 'fournisseurs'
  };
  return !!state.layers[layerFor[e.flow]];
}
function computeVisible() {
  const ids = new Set(NODES.filter(nodeVisible).map(n => n.id));
  const edges = EDGES.filter(e => edgeVisible(e, ids));
  return {
    ids,
    edges
  };
}

/* ============================================================
   RENDU DU GRAPHE
   ============================================================ */
const NS = 'http://www.w3.org/2000/svg';
function svgEl(tag, attrs) {
  const el = document.createElementNS(NS, tag);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  return el;
}
let svgRoot, viewportG, edgesG, nodesG;
function initCanvas() {
  const wrap = document.getElementById('canvas-wrap');
  svgRoot = svgEl('svg', {});
  const defs = svgEl('defs', {});
  [['arrow-danger', DANGER], ['arrow-applicatif', FLOW_COLOR.applicatif], ['arrow-metier', FLOW_COLOR.metier], ['arrow-technique', FLOW_COLOR.technique], ['arrow-fournisseur', FLOW_COLOR.fournisseur], ['arrow-dim', '#4A5160']].forEach(([id, color]) => {
    const marker = svgEl('marker', {
      id,
      viewBox: '0 0 10 10',
      refX: '8',
      refY: '5',
      markerWidth: '7',
      markerHeight: '7',
      orient: 'auto-start-reverse'
    });
    marker.appendChild(svgEl('path', {
      d: 'M 0 0 L 10 5 L 0 10 z',
      fill: color
    }));
    defs.appendChild(marker);
  });
  svgRoot.appendChild(defs);
  viewportG = svgEl('g', {
    id: 'viewport'
  });
  edgesG = svgEl('g', {
    id: 'edges-layer'
  });
  nodesG = svgEl('g', {
    id: 'nodes-layer'
  });
  viewportG.appendChild(edgesG);
  viewportG.appendChild(nodesG);
  svgRoot.appendChild(viewportG);
  wrap.appendChild(svgRoot);

  // pan
  let dragging = false,
    lastX = 0,
    lastY = 0,
    moved = false,
    startX = 0,
    startY = 0,
    panActive = false;
  const DRAG_THRESHOLD = 4;
  svgRoot.addEventListener('mousedown', e => {
    dragging = true;
    moved = false;
    panActive = false;
    lastX = e.clientX;
    lastY = e.clientY;
    startX = e.clientX;
    startY = e.clientY;
  });
  window.addEventListener('mousemove', e => {
    if (!dragging) return;
    const totalDx = e.clientX - startX,
      totalDy = e.clientY - startY;
    if (!panActive) {
      if (Math.hypot(totalDx, totalDy) < DRAG_THRESHOLD) return; // ignore tiny jitter — don't pan on a plain click
      panActive = true;
      moved = true;
      svgRoot.classList.add('panning');
      lastX = e.clientX;
      lastY = e.clientY;
      return;
    }
    const dx = e.clientX - lastX,
      dy = e.clientY - lastY;
    state.tx += dx;
    state.ty += dy;
    lastX = e.clientX;
    lastY = e.clientY;
    applyTransform();
  });
  window.addEventListener('mouseup', () => {
    dragging = false;
    panActive = false;
    svgRoot.classList.remove('panning');
  });
  svgRoot.addEventListener('click', e => {
    if (e.target === svgRoot && !moved) atDeselect();
  });

  // zoom (wheel)
  svgRoot.addEventListener('wheel', e => {
    e.preventDefault();
    const rect = svgRoot.getBoundingClientRect();
    const cx = e.clientX - rect.left,
      cy = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    zoomAt(cx, cy, factor);
  }, {
    passive: false
  });
}
function applyTransform() {
  viewportG.setAttribute('transform', `translate(${state.tx},${state.ty}) scale(${state.scale})`);
}
function zoomAt(cx, cy, factor) {
  const newScale = Math.min(2.4, Math.max(0.35, state.scale * factor));
  const ratio = newScale / state.scale;
  state.tx = cx - (cx - state.tx) * ratio;
  state.ty = cy - (cy - state.ty) * ratio;
  state.scale = newScale;
  applyTransform();
}
function atZoom(factor) {
  const rect = svgRoot.getBoundingClientRect();
  zoomAt(rect.width / 2, rect.height / 2, factor);
}
function atRecenter() {
  const rect = svgRoot.getBoundingClientRect();
  if (rect.width < 10 || rect.height < 10) return; // container not laid out yet — bail, ResizeObserver will retry
  const xs = NODES.map(n => n.x),
    ys = NODES.map(n => n.y);
  const minX = Math.min(...xs) - 60,
    maxX = Math.max(...xs) + 60,
    minY = Math.min(...ys) - 60,
    maxY = Math.max(...ys) + 60;
  const w = maxX - minX,
    h = maxY - minY;
  const scale = Math.min(rect.width / w, rect.height / h, 1.1);
  state.scale = scale;
  state.tx = rect.width / 2 - (minX + w / 2) * scale;
  state.ty = rect.height / 2 - (minY + h / 2) * scale + 10;
  applyTransform();
}
function atToggleFullscreen() {
  const target = window.frameElement ? window.top.document.documentElement : document.documentElement;
  const inIframe = !!window.frameElement;
  if (!document.fullscreenElement && !(inIframe && window.top.document.fullscreenElement)) {
    (inIframe ? window.top.document.documentElement : document.documentElement).requestFullscreen().catch(() => {
      document.documentElement.requestFullscreen().catch(() => {});
    });
  } else {
    (document.fullscreenElement ? document : window.top.document).exitFullscreen();
  }
}
function atGoBack() {
  if (window.frameElement && window.parent && window.parent !== window) {
    window.parent.postMessage({
      type: 'starium-atlas-back'
    }, '*');
  } else {
    location.href = 'Refonte Portail Client.html';
  }
}
function critDotColor(crit) {
  return CRIT_META[crit].color;
}
function renderGraph() {
  edgesG.innerHTML = '';
  nodesG.innerHTML = '';
  const {
    ids,
    edges
  } = computeVisible();

  // highlight set (hover or select)
  const focusId = state.hovered || state.selected;
  let highlightNodes = null,
    highlightEdges = null;
  if (focusId && ids.has(focusId)) {
    highlightNodes = new Set([focusId, ...neighborsOf(focusId)]);
    highlightEdges = new Set(edgesOf(focusId).map(e => e.id));
  }
  // impact highlighting overrides hover/select dimming
  let impactDepths = null;
  if (state.impact.active) {
    impactDepths = impactBFS(state.impact.source, state.impact.depth);
  }
  edges.forEach((e, i) => {
    const sN = NODE_BY_ID[e.s],
      tN = NODE_BY_ID[e.t];
    const mx = (sN.x + tN.x) / 2,
      my = (sN.y + tN.y) / 2;
    const dx = tN.x - sN.x,
      dy = tN.y - sN.y,
      dist = Math.hypot(dx, dy) || 1;
    const nx = -dy / dist,
      ny = dx / dist;
    const bend = 18 * (i % 3 - 1);
    const cx = mx + nx * bend,
      cy = my + ny * bend;
    const path = `M ${sN.x} ${sN.y} Q ${cx} ${cy} ${tN.x} ${tN.y}`;
    let color = FLOW_COLOR[e.flow];
    if (!e.secure || e.crit === 'critique') color = DANGER;
    const arrowId = !e.secure || e.crit === 'critique' ? 'arrow-danger' : 'arrow-' + e.flow;
    const p = svgEl('path', {
      class: 'edge',
      d: path,
      stroke: color,
      'stroke-width': e.crit === 'critique' ? 3 : 2,
      'stroke-dasharray': e.manual ? '7 6' : 'none',
      'marker-end': `url(#${arrowId})`,
      'data-id': e.id
    });
    if (e.dir === 'bi') p.setAttribute('marker-start', `url(#${arrowId})`);
    let opacityClass = '';
    if (impactDepths) {
      const inSubgraph = impactDepths.byEdge.has(e.id);
      opacityClass = inSubgraph ? '' : 'dim';
    } else if (highlightEdges) {
      opacityClass = highlightEdges.has(e.id) ? '' : 'dim';
    }
    if (opacityClass) p.classList.add(opacityClass);
    edgesG.appendChild(p);
    const hit = svgEl('path', {
      class: 'edge-hit',
      d: path
    });
    hit.addEventListener('click', () => showToast(`${sN.name} → ${tN.name} · ${e.mode} · ${e.freq}`));
    edgesG.appendChild(hit);
  });
  NODES.filter(n => ids.has(n.id)).forEach(n => {
    const tm = TYPE_META[n.type];
    const g = svgEl('g', {
      class: 'node',
      transform: `translate(${n.x},${n.y})`,
      'data-id': n.id
    });
    if (n.id === state.selected) g.classList.add('selected');
    let opacityClass = '';
    if (impactDepths) {
      opacityClass = impactDepths.byNode.has(n.id) ? '' : 'dim';
    } else if (highlightNodes) {
      opacityClass = highlightNodes.has(n.id) ? '' : 'dim-mid';
    }
    const halo = svgEl('circle', {
      class: 'node-halo',
      r: 29,
      fill: 'none',
      stroke: 'var(--gold, #E8A317)',
      'stroke-width': 2
    });
    g.appendChild(halo);
    const circle = svgEl('circle', {
      class: 'node-circle' + (opacityClass ? ' ' + opacityClass : ''),
      r: 22,
      fill: tm.bg,
      stroke: tm.color
    });
    g.appendChild(circle);
    const icoWrap = svgEl('g', {
      class: 'node-icon' + (opacityClass ? ' ' + opacityClass : ''),
      transform: 'translate(-9,-9) scale(0.75)'
    });
    icoWrap.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="${tm.color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${tm.icon}</svg>`;
    const fo = svgEl('foreignObject', {
      x: -11,
      y: -11,
      width: 22,
      height: 22
    });
    fo.innerHTML = `<div xmlns="http://www.w3.org/1999/xhtml" style="width:22px;height:22px;display:flex;align-items:center;justify-content:center;pointer-events:none${opacityClass ? ';opacity:.15' : ''}"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="${tm.color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${tm.icon}</svg></div>`;
    g.appendChild(fo);

    // crit dot
    const cd = svgEl('circle', {
      cx: 16,
      cy: -16,
      r: 6.5,
      fill: critDotColor(n.crit),
      stroke: 'var(--canvas-bg,#EFEBE2)',
      'stroke-width': 2,
      class: opacityClass
    });
    g.appendChild(cd);

    // badges row
    const badges = (n.badges || []).filter(b => state.layers[BADGE_META[b].layer]);
    badges.forEach((b, bi) => {
      const bm = BADGE_META[b];
      const bx = -16 + bi * 13;
      const bcirc = svgEl('circle', {
        cx: bx,
        cy: 20,
        r: 6,
        fill: bm.bg,
        stroke: bm.color,
        'stroke-width': 1.2,
        class: 'badge-dot ' + (opacityClass || '')
      });
      g.appendChild(bcirc);
    });
    const label = svgEl('text', {
      class: 'node-label' + (opacityClass ? ' ' + opacityClass : ''),
      x: 0,
      y: 40,
      'text-anchor': 'middle'
    });
    label.textContent = n.name;
    g.appendChild(label);
    const sub = svgEl('text', {
      class: 'node-sublabel' + (opacityClass ? ' ' + opacityClass : ''),
      x: 0,
      y: 52,
      'text-anchor': 'middle'
    });
    sub.textContent = tm.label;
    g.appendChild(sub);
    g.addEventListener('mouseenter', () => {
      state.hovered = n.id;
      applyFocus();
    });
    g.addEventListener('mouseleave', () => {
      state.hovered = null;
      applyFocus();
    });
    g.addEventListener('click', e => {
      e.stopPropagation();
      atSelect(n.id);
    });
    nodesG.appendChild(g);
  });
  renderLegend();
  applyFocus();
}

/* Applique le surlignage hover/sélection SANS reconstruire le DOM —
   reconstruire au survol détruisait l'élément sous le curseur et empêchait le clic. */
function applyFocus() {
  if (state.impact.active) return; // le dim d'impact est géré par renderGraph
  const focusId = state.hovered || state.selected;
  let highlightNodes = null,
    highlightEdges = null;
  if (focusId) {
    highlightNodes = new Set([focusId, ...neighborsOf(focusId)]);
    highlightEdges = new Set(edgesOf(focusId).map(e => e.id));
  }
  nodesG.querySelectorAll('.node').forEach(g => {
    const id = g.getAttribute('data-id');
    g.classList.toggle('dim-mid', !!highlightNodes && !highlightNodes.has(id));
  });
  edgesG.querySelectorAll('.edge').forEach(p => {
    const id = p.getAttribute('data-id');
    p.classList.toggle('dim', !!highlightEdges && !highlightEdges.has(id));
  });
}

/* ============================================================
   SÉLECTION / DÉTAIL
   ============================================================ */
function atSelect(id) {
  state.selected = id;
  renderGraph();
  ficheOpen(id);
}
function atDeselect() {
  if (state.impact.active) return;
  state.selected = null;
  ficheClose();
  renderGraph();
}
function drCloseAll() {
  atDeselect();
}
function fmt(d) {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt)) return d;
  return dt.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

/* ============================================================
   FICHE OBJET — plein écran, multi-onglets
   ============================================================ */
const FICHE_TABS = [{
  key: 'info',
  label: 'Informations',
  icon: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>'
}, {
  key: 'deps',
  label: 'Dépendances',
  icon: '<line x1="17" y1="7" x2="7" y2="17"/><polyline points="8 7 17 7 17 16"/>'
}, {
  key: 'risks',
  label: 'Risques',
  icon: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/>'
}, {
  key: 'compliance',
  label: 'SSI / RGPD',
  icon: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>'
}, {
  key: 'projects',
  label: 'Projets',
  icon: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>'
}, {
  key: 'actions',
  label: 'Actions & décisions',
  icon: '<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>'
}];
let ficheId = null,
  ficheTabKey = 'info';
function ficheOpen(id) {
  ficheId = id;
  ficheTabKey = 'info';
  const n = NODE_BY_ID[id];
  if (!n) return;
  const tm = TYPE_META[n.type],
    cm = CRIT_META[n.crit];
  document.getElementById('fiche-head-ico').style.background = 'rgba(255,255,255,.1)';
  document.getElementById('fiche-head-ico').innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${tm.icon}</svg>`;
  document.getElementById('fiche-title').textContent = `Fiche ${tm.label.toLowerCase()} — ${n.name}`;
  document.getElementById('fiche-sub').textContent = n.desc || '';
  document.getElementById('fiche-crit').textContent = cm.label;
  document.getElementById('fiche-crit').style.background = cm.bg;
  document.getElementById('fiche-crit').style.color = cm.color;
  document.getElementById('fiche-tabs').innerHTML = FICHE_TABS.map(t => {
    const count = ficheTabCount(t.key, id);
    return `<button class="fiche-tab ${ficheTabKey === t.key ? 'active' : ''}" data-tab="${t.key}" onclick="ficheSetTab('${t.key}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${t.icon}</svg>${t.label}${count != null ? `<span class="fiche-tab-count">${count}</span>` : ''}</button>`;
  }).join('');
  document.getElementById('fiche-overlay').classList.add('open');
  ficheRenderTab();
}
function ficheTabCount(key, id) {
  if (key === 'deps') return edgesOf(id).length;
  if (key === 'risks') return (RISKS[id] || []).length;
  if (key === 'compliance') return (COMPLIANCE[id] || []).length;
  if (key === 'projects') return (PROJECTS[id] || []).length;
  if (key === 'actions') return (ACTIONS[id] || []).length;
  return null;
}
function ficheSetTab(key) {
  ficheTabKey = key;
  document.querySelectorAll('.fiche-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === key));
  ficheRenderTab();
}
function ficheClose() {
  document.getElementById('fiche-overlay').classList.remove('open');
}
function ficheRenderTab() {
  const id = ficheId,
    n = NODE_BY_ID[id];
  if (!n) return;
  const body = document.getElementById('fiche-body');
  if (ficheTabKey === 'info') {
    body.innerHTML = `
      <div class="fiche-grid2">
        <div class="fiche-card">
          <div class="fiche-card-h"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>Informations générales</div>
          <label class="fiche-field-label">Nom</label><div class="fiche-field-val">${n.name}</div>
          <label class="fiche-field-label">Description</label><div class="fiche-field-val area">${n.desc || '—'}</div>
          <div class="fiche-field-row">
            <div><label class="fiche-field-label">Statut</label><div class="fiche-field-val">${n.status || '—'}</div></div>
            <div><label class="fiche-field-label">Dernière revue</label><div class="fiche-field-val">${fmt(n.lastReview)}</div></div>
          </div>
          <label class="fiche-field-label">Complétude de la fiche — ${n.completeness}%</label>
          <div class="fiche-complete-bar"><div class="fiche-complete-fill" style="width:${n.completeness}%"></div></div>
        </div>
        <div class="fiche-card">
          <div class="fiche-card-h"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>Propriétaires</div>
          <label class="fiche-field-label">Propriétaire métier</label><div class="fiche-field-val">${n.ownerBiz || '—'}</div>
          <label class="fiche-field-label">Propriétaire technique</label><div class="fiche-field-val">${n.ownerTech || '—'}</div>
          <label class="fiche-field-label">Badges</label>
          <div style="display:flex;flex-wrap:wrap;gap:6px">${(n.badges || []).map(b => {
      const bm = BADGE_META[b];
      return `<span class="dr-badge" style="background:${bm.bg};color:${bm.color}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">${bm.icon}</svg>${bm.label}</span>`;
    }).join('') || '<span class="fiche-empty">Aucun badge.</span>'}</div>
        </div>
      </div>`;
  } else if (ficheTabKey === 'deps') {
    const rels = edgesOf(id).map(e => {
      const other = e.s === id ? NODE_BY_ID[e.t] : NODE_BY_ID[e.s];
      const dir = e.dir === 'bi' ? 'Bidirectionnel' : e.s === id ? 'Sortant' : 'Entrant';
      const otm = TYPE_META[other.type];
      return `<div class="dr-rel-row" onclick="ficheOpen('${other.id}')" style="cursor:pointer">
        <div class="dr-rel-ico" style="background:${otm.bg}"><svg viewBox="0 0 24 24" fill="none" stroke="${otm.color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${otm.icon}</svg></div>
        <div><div class="dr-rel-name">${other.name}</div><div class="dr-rel-meta">${e.mode} · ${e.freq}${!e.secure ? ' · non sécurisé' : ''}</div></div>
        <div class="dr-rel-dir">${dir}</div>
      </div>`;
    }).join('') || '<div class="fiche-empty">Aucun flux enregistré.</div>';
    body.innerHTML = `<div class="fiche-card"><div class="fiche-card-h"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="17" y1="7" x2="7" y2="17"/><polyline points="8 7 17 7 17 16"/></svg>Relations (${edgesOf(id).length})</div>${rels}
      <button class="dr-impact-btn" onclick="ficheClose();atStartImpact('${id}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>Analyser l'impact</button>
    </div>`;
  } else if (ficheTabKey === 'risks') {
    const risks = (RISKS[id] || []).map(r => {
      const cm2 = CRIT_META[r.niveau];
      return `<div class="dr-card"><div class="dr-card-top"><span class="dr-card-title">${r.title}</span><span class="dr-pill-sm" style="background:${cm2.bg};color:${cm2.color}">${cm2.label}</span></div>
        <div class="dr-card-meta"><span>Score ${r.score}</span><span>${r.statut}</span><span>${r.responsable}</span><span>Éch. ${fmt(r.echeance)}</span></div></div>`;
    }).join('') || '<div class="fiche-empty">Aucun risque associé.</div>';
    body.innerHTML = `<div class="fiche-card"><div class="fiche-card-h"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/></svg>Risques liés</div>${risks}</div>`;
  } else if (ficheTabKey === 'compliance') {
    const gaps = (COMPLIANCE[id] || []).map(c => {
      const isS = c.type === 'ssi';
      return `<div class="dr-card"><div class="dr-card-top"><span class="dr-card-title">${isS ? 'SSI' : 'RGPD'} — ${c.exigence}</span></div>
        <div class="dr-card-meta" style="display:block"><div style="margin-bottom:4px"><b style="color:var(--text-1)">Écart :</b> ${c.ecart}</div><div style="margin-bottom:4px"><b style="color:var(--text-1)">Preuve :</b> ${c.preuve}</div><div><b style="color:var(--text-1)">Action corrective :</b> ${c.action}</div></div></div>`;
    }).join('') || '<div class="fiche-empty">Aucun écart de conformité.</div>';
    body.innerHTML = `<div class="fiche-card"><div class="fiche-card-h"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>Conformité SSI / RGPD</div>${gaps}</div>`;
  } else if (ficheTabKey === 'projects') {
    const projs = (PROJECTS[id] || []).map(p => `<div class="dr-card"><div class="dr-card-top"><span class="dr-card-title">${p.name}</span></div><div class="dr-card-meta">${p.role}</div></div>`).join('') || '<div class="fiche-empty">Aucun projet lié.</div>';
    body.innerHTML = `<div class="fiche-card"><div class="fiche-card-h"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>Projets liés</div>${projs}</div>`;
  } else if (ficheTabKey === 'actions') {
    const acts = (ACTIONS[id] || []).map(a => {
      const isDecision = a.type === 'decision';
      const pillColor = a.statut === 'En retard' ? {
        bg: 'rgba(180,35,24,.12)',
        c: '#B42318'
      } : isDecision ? {
        bg: 'rgba(31,138,91,.12)',
        c: '#1F8A5B'
      } : {
        bg: 'rgba(42,111,219,.12)',
        c: '#2A6FDB'
      };
      return `<div class="dr-card"><div class="dr-card-top"><span class="dr-card-title">${isDecision ? 'Décision — ' : 'Action — '}${a.title}</span><span class="dr-pill-sm" style="background:${pillColor.bg};color:${pillColor.c}">${a.statut}</span></div>
        <div class="dr-card-meta"><span>Éch. ${fmt(a.echeance)}</span>${a.codir ? '<span style="color:var(--gold)">Arbitrage CODIR</span>' : ''}</div></div>`;
    }).join('') || '<div class="fiche-empty">Aucune action ni décision en cours.</div>';
    body.innerHTML = `<div class="fiche-card"><div class="fiche-card-h"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>Actions et décisions</div>${acts}</div>`;
  }
}
function renderDetail(id) {
  const n = NODE_BY_ID[id];
  if (!n) return;
  const tm = TYPE_META[n.type],
    cm = CRIT_META[n.crit];
  document.getElementById('dr-head').innerHTML = `
    <button class="dr-close" onclick="drCloseAll()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
    <div class="dr-type-row">
      <span class="dr-type-pill" style="background:${tm.bg};color:${tm.color}">${tm.label}</span>
      <span class="dr-crit-pill" style="background:${cm.bg};color:${cm.color}">${cm.label}</span>
    </div>
    <div class="dr-title">${n.name}</div>
    <div class="dr-desc">${n.desc || ''}</div>
    <div class="dr-badges">${(n.badges || []).map(b => {
    const bm = BADGE_META[b];
    return `<span class="dr-badge" style="background:${bm.bg};color:${bm.color}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">${bm.icon}</svg>${bm.label}</span>`;
  }).join('')}</div>
  `;
  const rels = edgesOf(id).map(e => {
    const other = e.s === id ? NODE_BY_ID[e.t] : NODE_BY_ID[e.s];
    const dir = e.dir === 'bi' ? 'Bidir.' : e.s === id ? 'Sortant' : 'Entrant';
    const otm = TYPE_META[other.type];
    return `<div class="dr-rel-row" onclick="atSelect('${other.id}')">
      <div class="dr-rel-ico" style="background:${otm.bg}"><svg viewBox="0 0 24 24" fill="none" stroke="${otm.color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${otm.icon}</svg></div>
      <div><div class="dr-rel-name">${other.name}</div><div class="dr-rel-meta">${e.mode} · ${e.freq}</div></div>
      <div class="dr-rel-dir">${dir}</div>
    </div>`;
  }).join('') || '<div class="dr-empty">Aucun flux enregistré.</div>';
  const risks = (RISKS[id] || []).map(r => {
    const cm2 = CRIT_META[r.niveau];
    return `<div class="dr-card"><div class="dr-card-top"><span class="dr-card-title">${r.title}</span><span class="dr-pill-sm" style="background:${cm2.bg};color:${cm2.color}">${cm2.label}</span></div>
      <div class="dr-card-meta"><span>Score ${r.score}</span><span>${r.statut}</span><span>${r.responsable}</span><span>Éch. ${fmt(r.echeance)}</span></div></div>`;
  }).join('') || '<div class="dr-empty">Aucun risque associé.</div>';
  const gaps = (COMPLIANCE[id] || []).map(c => {
    const isS = c.type === 'ssi';
    return `<div class="dr-card"><div class="dr-card-top"><span class="dr-card-title">${isS ? 'SSI' : 'RGPD'} — ${c.exigence}</span></div>
      <div class="dr-card-meta" style="display:block"><div style="margin-bottom:4px"><b style="color:var(--text-1)">Écart :</b> ${c.ecart}</div><div style="margin-bottom:4px"><b style="color:var(--text-1)">Preuve :</b> ${c.preuve}</div><div><b style="color:var(--text-1)">Action corrective :</b> ${c.action}</div></div></div>`;
  }).join('') || '<div class="dr-empty">Aucun écart de conformité.</div>';
  const projs = (PROJECTS[id] || []).map(p => `<div class="dr-card"><div class="dr-card-top"><span class="dr-card-title">${p.name}</span></div><div class="dr-card-meta">${p.role}</div></div>`).join('') || '<div class="dr-empty">Aucun projet lié.</div>';
  const acts = (ACTIONS[id] || []).map(a => {
    const isDecision = a.type === 'decision';
    const pillColor = a.statut === 'En retard' ? {
      bg: 'rgba(229,86,74,.16)',
      c: DANGER
    } : isDecision ? {
      bg: 'rgba(63,190,132,.16)',
      c: '#3FBE84'
    } : {
      bg: 'rgba(91,155,240,.16)',
      c: '#5B9BF0'
    };
    return `<div class="dr-card"><div class="dr-card-top"><span class="dr-card-title">${isDecision ? 'Décision — ' : 'Action — '}${a.title}</span><span class="dr-pill-sm" style="background:${pillColor.bg};color:${pillColor.c}">${a.statut}</span></div>
      <div class="dr-card-meta"><span>Éch. ${fmt(a.echeance)}</span>${a.codir ? '<span style="color:var(--gold)">Arbitrage CODIR</span>' : ''}</div></div>`;
  }).join('') || '<div class="dr-empty">Aucune action ni décision en cours.</div>';
  document.getElementById('dr-body').innerHTML = `
    <div class="dr-sec"><div class="dr-sec-h"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>Informations générales</div>
      <dl class="dr-kv">
        <dt>Propriétaire métier</dt><dd>${n.ownerBiz || '—'}</dd>
        <dt>Propriétaire technique</dt><dd>${n.ownerTech || '—'}</dd>
        <dt>Statut</dt><dd>${n.status || '—'}</dd>
        <dt>Dernière revue</dt><dd>${fmt(n.lastReview)}</dd>
      </dl>
      <div style="margin-top:12px"><div class="dr-kv"><dt style="grid-column:1/-1">Complétude de la fiche — ${n.completeness}%</dt></div><div class="dr-complete-bar"><div class="dr-complete-fill" style="width:${n.completeness}%"></div></div></div>
    </div>
    <div class="dr-sec"><div class="dr-sec-h"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="17" y1="7" x2="7" y2="17"/><polyline points="8 7 17 7 17 16"/></svg>Relations (${edgesOf(id).length})</div>${rels}</div>
    <div class="dr-sec"><div class="dr-sec-h"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/></svg>Risques liés</div>${risks}</div>
    <div class="dr-sec"><div class="dr-sec-h"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>Conformité SSI / RGPD</div>${gaps}</div>
    <div class="dr-sec"><div class="dr-sec-h"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>Projets liés</div>${projs}</div>
    <div class="dr-sec"><div class="dr-sec-h"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>Actions et décisions</div>${acts}
      <button class="dr-impact-btn" onclick="atStartImpact('${id}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>Analyser l'impact</button>
    </div>
  `;
}

/* ============================================================
   ANALYSE D'IMPACT
   ============================================================ */
function impactBFS(sourceId, maxDepth) {
  const byNode = new Map([[sourceId, 0]]);
  const byEdge = new Set();
  let frontier = [sourceId];
  for (let depth = 1; depth <= maxDepth; depth++) {
    const next = [];
    frontier.forEach(id => {
      edgesOf(id).forEach(e => {
        const other = e.s === id ? e.t : e.s;
        if (!byNode.has(other)) {
          byNode.set(other, depth);
          next.push(other);
        }
        byEdge.add(e.id);
      });
    });
    frontier = next;
  }
  return {
    byNode,
    byEdge
  };
}
function atStartImpact(id) {
  state.impact = {
    active: true,
    depth: 1,
    source: id
  };
  document.getElementById('impact-bar').classList.add('open');
  document.getElementById('impact-obj-name').textContent = NODE_BY_ID[id].name;
  atSetDepth(1);
  renderImpactSynthesis();
}
function atSetDepth(d) {
  state.impact.depth = d;
  document.querySelectorAll('#depth-seg button').forEach(b => b.classList.toggle('active', +b.dataset.d === d));
  renderGraph();
  renderImpactSynthesis();
}
function atExitImpact() {
  state.impact = {
    active: false,
    depth: 1,
    source: null
  };
  document.getElementById('impact-bar').classList.remove('open');
  if (state.selected) renderDetail(state.selected);
  renderGraph();
}
function renderImpactSynthesis() {
  if (!state.impact.active) return;
  const {
    byNode
  } = impactBFS(state.impact.source, state.impact.depth);
  const impactedIds = [...byNode.keys()].filter(id => id !== state.impact.source);
  const direct = impactedIds.filter(id => byNode.get(id) === 1);
  const indirect = impactedIds.filter(id => byNode.get(id) > 1);
  const critCount = impactedIds.filter(id => ['critique', 'elevee'].includes(NODE_BY_ID[id].crit)).length;
  const riskCount = impactedIds.filter(id => RISKS[id]).length;
  const actionCount = impactedIds.reduce((s, id) => s + (ACTIONS[id] || []).filter(a => a.type === 'action').length, 0);
  const decisionCount = impactedIds.reduce((s, id) => s + (ACTIONS[id] || []).filter(a => a.type === 'decision').length, 0);
  const group = (ids, label) => ids.length ? `<div class="dr-sec-h" style="margin-top:14px">${label} (${ids.length})</div>` + ids.map(id => {
    const n = NODE_BY_ID[id],
      tm = TYPE_META[n.type];
    return `<div class="dr-rel-row" onclick="atSelect('${id}')"><div class="dr-rel-ico" style="background:${tm.bg}"><svg viewBox="0 0 24 24" fill="none" stroke="${tm.color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${tm.icon}</svg></div><div><div class="dr-rel-name">${n.name}</div><div class="dr-rel-meta">${tm.label}</div></div></div>`;
  }).join('') : '';
  document.getElementById('dr-head').innerHTML = `
    <div class="dr-type-row"><span class="dr-type-pill" style="background:rgba(232,163,23,.18);color:var(--gold)">Analyse d'impact</span></div>
    <div class="dr-title">${NODE_BY_ID[state.impact.source].name}</div>
    <div class="dr-desc">Si cet objet tombe ou est indisponible, ${impactedIds.length} objet(s) sont impactés en profondeur ${state.impact.depth}.</div>
  `;
  document.getElementById('dr-body').innerHTML = `
    <div class="dr-sec">
      <dl class="dr-kv">
        <dt>Objets impactés</dt><dd>${impactedIds.length}</dd>
        <dt>Dont critiques / élevés</dt><dd>${critCount}</dd>
        <dt>Risques associés</dt><dd>${riskCount}</dd>
        <dt>Actions ouvertes</dt><dd>${actionCount}</dd>
        <dt>Décisions attendues</dt><dd>${decisionCount}</dd>
      </dl>
      ${group(direct, 'Impact direct')}
      ${group(indirect, 'Impact indirect')}
    </div>
  `;
  document.getElementById('drawer-right').classList.add('open');
}

/* ============================================================
   RECHERCHE
   ============================================================ */
function atSearch(q) {
  const box = document.getElementById('search-results');
  q = q.trim().toLowerCase();
  if (!q) {
    box.classList.remove('open');
    box.innerHTML = '';
    return;
  }
  const matches = NODES.filter(n => n.name.toLowerCase().includes(q)).slice(0, 8);
  if (!matches.length) {
    box.innerHTML = '<div class="tb-search-row" style="color:var(--text-3);cursor:default">Aucun résultat</div>';
    box.classList.add('open');
    return;
  }
  box.innerHTML = matches.map(n => {
    const tm = TYPE_META[n.type];
    return `<div class="tb-search-row" onclick="atSearchPick('${n.id}')"><i style="background:${tm.color}"></i>${n.name}<span style="margin-left:auto;color:var(--text-3);font-weight:600;font-size:10.5px">${tm.label}</span></div>`;
  }).join('');
  box.classList.add('open');
}
function atSearchPick(id) {
  document.getElementById('search-results').classList.remove('open');
  document.getElementById('atlas-search').value = NODE_BY_ID[id].name;
  // ensure visible: temporarily clear special/filters so node shows
  if (!nodeVisible(NODE_BY_ID[id])) {
    atResetFilters(false);
  }
  renderGraph();
  atSelect(id);
  centerOn(id);
}
function centerOn(id) {
  const n = NODE_BY_ID[id];
  const rect = svgRoot.getBoundingClientRect();
  state.tx = rect.width / 2 - n.x * state.scale;
  state.ty = rect.height / 2 - n.y * state.scale;
  applyTransform();
}
document.addEventListener('click', e => {
  if (!e.target.closest('.tb-search-wrap')) {
    const box = document.getElementById('search-results');
    if (box) box.classList.remove('open');
  }
  if (!e.target.closest('.tb-createwrap')) {
    const m = document.getElementById('create-menu');
    if (m) m.classList.remove('open');
  }
});

/* ============================================================
   DRAWERS : filtres / calques
   ============================================================ */
function atToggleDrawer(tab) {
  const dl = document.getElementById('drawer-left');
  if (state.drawerLeftOpen && state.drawerLeftTab === tab) {
    state.drawerLeftOpen = false;
  } else {
    state.drawerLeftOpen = true;
    state.drawerLeftTab = tab;
  }
  dl.classList.toggle('open', state.drawerLeftOpen);
  atDrawerTab(state.drawerLeftTab);
}
function atDrawerTab(tab) {
  state.drawerLeftTab = tab;
  document.querySelectorAll('.dl-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.getElementById('pane-calques').classList.toggle('active', tab === 'calques');
  document.getElementById('pane-filtres').classList.toggle('active', tab === 'filtres');
  document.getElementById('drawer-left').classList.add('open');
  state.drawerLeftOpen = true;
}
function layerRow(key, label, colorDot) {
  const count = NODES.filter(n => LAYER_KEY_FOR_TYPE[n.type] === key && nodeVisible(n)).length;
  return `<label class="chk-row"><input type="checkbox" ${state.layers[key] ? 'checked' : ''} onchange="atToggleLayer('${key}',this.checked)">${colorDot ? `<i style="background:${colorDot}"></i>` : ''}${label}</label>`;
}
function renderCalquesPane() {
  document.getElementById('pane-calques').innerHTML = `
    <div class="dl-group"><div class="dl-group-title">Objets</div>
      ${layerRow('processus', 'Processus', TYPE_META.processus.color)}
      ${layerRow('applications', 'Applications', TYPE_META.application.color)}
      ${layerRow('donnees', 'Données', TYPE_META.donnee.color)}
      ${layerRow('fournisseurs', 'Fournisseurs', TYPE_META.fournisseur.color)}
      ${layerRow('infrastructures', 'Infrastructures', TYPE_META.infrastructure.color)}
      ${layerRow('sites', 'Sites', TYPE_META.site.color)}
    </div>
    <div class="dl-group"><div class="dl-group-title">Flux</div>
      ${layerRow('flux_app', 'Flux applicatifs', FLOW_COLOR.applicatif)}
      ${layerRow('flux_tech', 'Flux techniques', FLOW_COLOR.technique)}
    </div>
    <div class="dl-group"><div class="dl-group-title">Gouvernance</div>
      ${layerRow('risques', 'Risques', DANGER)}
      ${layerRow('ssi', 'Conformité SSI', '#E8A317')}
      ${layerRow('rgpd', 'Conformité RGPD', '#B892F2')}
      ${layerRow('projets', 'Projets', FLOW_COLOR.applicatif)}
      ${layerRow('decisions', 'Décisions', '#3FBE84')}
      ${layerRow('actions', 'Actions', '#E8A317')}
    </div>
  `;
}
function atToggleLayer(key, val) {
  state.layers[key] = val;
  state.special = null;
  syncPresetButtons(null);
  renderCalquesPane();
  renderGraph();
  renderFiltresPane();
}
function ownerOptions() {
  const owners = new Set();
  NODES.forEach(n => {
    if (n.ownerBiz) owners.add(n.ownerBiz);
    if (n.ownerTech) owners.add(n.ownerTech);
  });
  return [...owners].sort();
}
function renderFiltresPane() {
  const f = state.filters;
  document.getElementById('pane-filtres').innerHTML = `
    <div class="dl-group"><div class="dl-group-title">Criticité<button onclick="atResetFilters(true)">Réinitialiser</button></div>
      ${['critique', 'elevee', 'moyenne', 'faible'].map(c => `<label class="chk-row"><input type="checkbox" ${f.crit.has(c) ? 'checked' : ''} onchange="atToggleCrit('${c}',this.checked)"><i style="background:${CRIT_META[c].color}"></i>${CRIT_META[c].label}</label>`).join('')}
    </div>
    <div class="dl-group"><div class="dl-group-title">Statut</div>
      <select class="dl-select" onchange="atSetFilter('statut',this.value)">
        <option value="all" ${f.statut === 'all' ? 'selected' : ''}>Tous</option>
        ${[...new Set(NODES.map(n => n.status))].map(s => `<option value="${s}" ${f.statut === s ? 'selected' : ''}>${s}</option>`).join('')}
      </select>
    </div>
    <div class="dl-group"><div class="dl-group-title">Propriétaire</div>
      <select class="dl-select" onchange="atSetFilter('owner',this.value)">
        <option value="all" ${f.owner === 'all' ? 'selected' : ''}>Tous</option>
        ${ownerOptions().map(o => `<option value="${o}" ${f.owner === o ? 'selected' : ''}>${o}</option>`).join('')}
      </select>
    </div>
    <div class="dl-group"><div class="dl-group-title">Risques &amp; conformité</div>
      <label class="chk-row"><input type="checkbox" ${f.hasRisk ? 'checked' : ''} onchange="atSetFilter('hasRisk',this.checked)">Présence de risque</label>
      <select class="dl-select" style="margin:6px 0" onchange="atSetFilter('riskLevel',this.value)">
        <option value="all" ${f.riskLevel === 'all' ? 'selected' : ''}>Niveau de risque · tous</option>
        ${['critique', 'elevee', 'moyenne'].map(c => `<option value="${c}" ${f.riskLevel === c ? 'selected' : ''}>${CRIT_META[c].label}</option>`).join('')}
      </select>
      <label class="chk-row"><input type="checkbox" ${f.ssiGap ? 'checked' : ''} onchange="atSetFilter('ssiGap',this.checked)">Écart SSI</label>
      <label class="chk-row"><input type="checkbox" ${f.rgpdGap ? 'checked' : ''} onchange="atSetFilter('rgpdGap',this.checked)">Écart RGPD</label>
      <label class="chk-row"><input type="checkbox" ${f.insecure ? 'checked' : ''} onchange="atSetFilter('insecure',this.checked)">Flux non sécurisé</label>
      <label class="chk-row"><input type="checkbox" ${f.notReviewed ? 'checked' : ''} onchange="atSetFilter('notReviewed',this.checked)">Objet non revu (&gt; 12 mois)</label>
      <label class="chk-row"><input type="checkbox" ${f.decisionExpected ? 'checked' : ''} onchange="atSetFilter('decisionExpected',this.checked)">Décision attendue</label>
    </div>
  `;
  const {
    ids
  } = computeVisible();
  document.getElementById('filter-count').style.display = ids.size === NODES.length ? 'none' : 'inline-block';
  document.getElementById('filter-count').textContent = ids.size;
}
function atToggleCrit(c, val) {
  if (val) state.filters.crit.add(c);else state.filters.crit.delete(c);
  state.special = null;
  syncPresetButtons(null);
  renderFiltresPane();
  renderCalquesPane();
  renderGraph();
}
function atSetFilter(key, val) {
  state.filters[key] = key === 'hasRisk' || key === 'ssiGap' || key === 'rgpdGap' || key === 'insecure' || key === 'notReviewed' || key === 'decisionExpected' ? val : val;
  state.special = null;
  syncPresetButtons(null);
  renderFiltresPane();
  renderGraph();
}
function atResetFilters(rerender) {
  state.filters = {
    crit: new Set(['critique', 'elevee', 'moyenne', 'faible']),
    statut: 'all',
    owner: 'all',
    hasRisk: false,
    riskLevel: 'all',
    ssiGap: false,
    rgpdGap: false,
    insecure: false,
    notReviewed: false,
    decisionExpected: false
  };
  state.special = null;
  if (rerender !== false) {
    renderFiltresPane();
    renderCalquesPane();
    renderGraph();
    syncPresetButtons(null);
  }
}

/* ============================================================
   VUES PRÉCONFIGURÉES
   ============================================================ */
function renderPresetBar() {
  document.getElementById('preset-bar').innerHTML = PRESETS.map(p => `<button class="tb-preset-btn ${state.preset === p.id ? 'active' : ''}" data-preset="${p.id}" onclick="atApplyPreset('${p.id}')">${p.label}</button>`).join('');
}
function syncPresetButtons(id) {
  state.preset = id;
  document.querySelectorAll('.tb-preset-btn').forEach(b => b.classList.toggle('active', b.dataset.preset === id));
}
function atApplyPreset(id) {
  state.preset = id;
  state.special = null;
  const allCrit = new Set(['critique', 'elevee', 'moyenne', 'faible']);
  const baseFilters = {
    crit: allCrit,
    statut: 'all',
    owner: 'all',
    hasRisk: false,
    riskLevel: 'all',
    ssiGap: false,
    rgpdGap: false,
    insecure: false,
    notReviewed: false,
    decisionExpected: false
  };
  const L = k => ({
    processus: false,
    applications: false,
    flux_app: false,
    flux_tech: false,
    donnees: false,
    fournisseurs: false,
    infrastructures: false,
    sites: false,
    risques: true,
    ssi: true,
    rgpd: true,
    projets: true,
    decisions: true,
    actions: true,
    ...k
  });
  if (id === 'globale') {
    state.filters = {
      ...baseFilters,
      crit: new Set(['critique', 'elevee'])
    };
    state.layers = L({
      processus: true,
      applications: true,
      flux_app: true,
      flux_tech: true,
      donnees: true,
      fournisseurs: true
    });
  } else if (id === 'processus') {
    state.filters = {
      ...baseFilters
    };
    state.layers = L({
      processus: true,
      applications: true,
      flux_app: false,
      flux_tech: false,
      fournisseurs: false
    });
  } else if (id === 'applicative') {
    state.filters = {
      ...baseFilters
    };
    state.layers = L({
      applications: true,
      donnees: true,
      infrastructures: true,
      flux_app: true,
      flux_tech: true
    });
  } else if (id === 'technique') {
    state.filters = {
      ...baseFilters
    };
    state.layers = L({
      infrastructures: true,
      applications: true,
      donnees: true,
      fournisseurs: true,
      flux_tech: true,
      flux_app: false
    });
  } else if (id === 'conformite') {
    state.filters = {
      ...baseFilters
    };
    state.special = 'conformite';
    state.layers = L({
      applications: true,
      donnees: true,
      infrastructures: true,
      fournisseurs: true,
      flux_app: true,
      flux_tech: true
    });
  } else if (id === 'codir') {
    state.filters = {
      ...baseFilters
    };
    state.special = 'codir';
    state.layers = L({
      processus: true,
      applications: true,
      fournisseurs: true,
      flux_app: true
    });
  }
  renderCalquesPane();
  renderFiltresPane();
  renderGraph();
  syncPresetButtons(id);
  showToast(`Vue « ${PRESETS.find(p => p.id === id).label} » appliquée`);
}

/* ============================================================
   LÉGENDE
   ============================================================ */
function renderLegend() {
  document.getElementById('legend').innerHTML = `
    <div class="legend-col">
      <div class="legend-item"><i style="background:${TYPE_META.application.color}"></i>Application</div>
      <div class="legend-item"><i style="background:${TYPE_META.processus.color}"></i>Processus</div>
      <div class="legend-item"><i style="background:${TYPE_META.fournisseur.color}"></i>Fournisseur</div>
      <div class="legend-item"><i style="background:${TYPE_META.donnee.color}"></i>Donnée</div>
      <div class="legend-item"><i style="background:${TYPE_META.infrastructure.color}"></i>Infrastructure</div>
    </div>
    <div class="legend-col">
      <div class="legend-item"><span class="ln" style="border-color:${DANGER}"></span>Flux critique / non sécurisé</div>
      <div class="legend-item"><span class="ln" style="border-color:${FLOW_COLOR.applicatif}"></span>Flux applicatif</div>
      <div class="legend-item"><span class="ln" style="border-color:${FLOW_COLOR.metier}"></span>Flux métier</div>
      <div class="legend-item"><span class="ln dashed" style="border-color:${FLOW_COLOR.technique}"></span>Flux manuel (pointillé)</div>
    </div>
  `;
}

/* ============================================================
   MENU CRÉER
   ============================================================ */
function atToggleMenu(e) {
  e.stopPropagation();
  document.getElementById('create-menu').classList.toggle('open');
}

/* ============================================================
   TOAST
   ============================================================ */
let toastTimer = null;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

/* ============================================================
   INIT
   ============================================================ */
function boot() {
  initCanvas();
  renderPresetBar();
  renderCalquesPane();
  renderFiltresPane();
  renderGraph();
  atRecenter();
  syncPresetButtons(null);
  document.getElementById('atlas-search').addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const rows = document.querySelectorAll('.tb-search-row');
      if (rows[0] && rows[0].onclick) rows[0].click();
    }
  });
  window.addEventListener('resize', () => atRecenter());
  const ro = new ResizeObserver(() => atRecenter());
  ro.observe(document.getElementById('canvas-wrap'));
}
document.addEventListener('DOMContentLoaded', boot);
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/atlas-engine.js", error: String((e && e.message) || e) }); }

// ui_kits/app/atlas-modals.js
try { (() => {
/* ============================================================
   STARIUM ATLAS — modales de création
   ============================================================ */

let omType = 'application',
  omCrit = 'moyenne',
  fmCrit = 'moyenne';
let objSeq = 1,
  edgeSeq = 100;
function omRenderTypes() {
  document.getElementById('om-types').innerHTML = Object.entries(TYPE_META).map(([k, v]) => `<div class="type-opt ${omType === k ? 'sel' : ''}" onclick="omPickType('${k}')">${v.label}</div>`).join('');
}
function omPickType(k) {
  omType = k;
  omRenderTypes();
}
function omRenderCrit() {
  document.getElementById('om-crit').innerHTML = Object.entries(CRIT_META).map(([k, v]) => `<div class="type-opt ${omCrit === k ? 'sel' : ''}" onclick="omPickCrit('${k}')">${v.label}</div>`).join('');
}
function omPickCrit(k) {
  omCrit = k;
  omRenderCrit();
}
function omOpen() {
  document.getElementById('create-menu').classList.remove('open');
  omType = 'application';
  omCrit = 'moyenne';
  document.getElementById('om-name').value = '';
  document.getElementById('om-desc').value = '';
  document.getElementById('om-ownerb').value = '';
  document.getElementById('om-ownert').value = '';
  omRenderTypes();
  omRenderCrit();
  document.getElementById('om-overlay').classList.add('open');
}
function omClose() {
  document.getElementById('om-overlay').classList.remove('open');
}
function omSave() {
  const name = document.getElementById('om-name').value.trim();
  if (!name) {
    showToast('Merci de renseigner un nom');
    return;
  }
  const rect = svgRoot.getBoundingClientRect();
  // place new node near current viewport center, in canvas coordinates
  const cx = (rect.width / 2 - state.tx) / state.scale;
  const cy = (rect.height / 2 - state.ty) / state.scale;
  const id = 'new' + objSeq++;
  NODES.push({
    id,
    type: omType,
    name,
    x: cx + (Math.random() * 60 - 30),
    y: cy + (Math.random() * 60 - 30),
    crit: omCrit,
    status: 'Production',
    ownerBiz: document.getElementById('om-ownerb').value.trim(),
    ownerTech: document.getElementById('om-ownert').value.trim(),
    lastReview: new Date().toISOString().slice(0, 10),
    completeness: 35,
    desc: document.getElementById('om-desc').value.trim(),
    badges: ['fiche']
  });
  NODE_BY_ID[id] = NODES[NODES.length - 1];
  state.layers[LAYER_KEY_FOR_TYPE[omType]] = true;
  state.filters.crit.add(omCrit);
  omClose();
  renderCalquesPane();
  renderFiltresPane();
  renderGraph();
  showToast('« ' + name + ' » ajouté à la cartographie');
  atSelect(id);
}
function fmPopulateSelects() {
  const opts = NODES.map(n => `<option value="${n.id}">${n.name}</option>`).join('');
  document.getElementById('fm-source').innerHTML = opts;
  document.getElementById('fm-target').innerHTML = opts;
}
function fmRenderCrit() {
  document.getElementById('fm-crit').innerHTML = Object.entries(CRIT_META).map(([k, v]) => `<div class="type-opt ${fmCrit === k ? 'sel' : ''}" onclick="fmPickCrit('${k}')">${v.label}</div>`).join('');
}
function fmPickCrit(k) {
  fmCrit = k;
  fmRenderCrit();
}
function fmOpen() {
  document.getElementById('create-menu').classList.remove('open');
  fmCrit = 'moyenne';
  fmPopulateSelects();
  if (state.selected) {
    document.getElementById('fm-source').value = state.selected;
  }
  document.getElementById('fm-freq').value = '';
  document.getElementById('fm-secure').classList.add('on');
  document.getElementById('fm-manual').classList.remove('on');
  fmRenderCrit();
  document.getElementById('fm-overlay').classList.add('open');
}
function fmClose() {
  document.getElementById('fm-overlay').classList.remove('open');
}
function fmSave() {
  const s = document.getElementById('fm-source').value,
    t = document.getElementById('fm-target').value;
  if (!s || !t || s === t) {
    showToast('Choisissez deux objets distincts');
    return;
  }
  const id = 'enew' + edgeSeq++;
  EDGES.push({
    id,
    s,
    t,
    flow: document.getElementById('fm-flowtype').value,
    mode: document.getElementById('fm-mode').value,
    freq: document.getElementById('fm-freq').value.trim() || 'Non précisée',
    crit: fmCrit,
    dir: document.getElementById('fm-dir').value,
    secure: document.getElementById('fm-secure').classList.contains('on'),
    manual: document.getElementById('fm-manual').classList.contains('on')
  });
  fmClose();
  renderGraph();
  showToast('Flux « ' + NODE_BY_ID[s].name + ' → ' + NODE_BY_ID[t].name + ' » créé');
}
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/atlas-modals.js", error: String((e && e.message) || e) }); }

// ui_kits/app/budget/budget-data.js
try { (() => {
/* Budget — données & helpers de calcul
   Extrait de « Refonte Portail Client.html ».
   Script classique : chargé AVANT le script principal, partage la portée globale.
   Dépend des helpers globaux : fmtEur(), showToast(). */

const MB_ACCENT = {
  blue: ['var(--state-info-bg)', 'var(--state-info)'],
  gold: ['var(--brand-gold-050)', 'var(--brand-gold-700)'],
  purple: ['var(--purple-bg)', 'var(--purple)'],
  green: ['var(--state-success-bg)', 'var(--state-success)'],
  slate: ['var(--neutral-100)', 'var(--neutral-600)'],
  red: ['var(--state-danger-bg)', 'var(--state-danger)']
};
const MB_ICO = {
  server: '<rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/>',
  euro: '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/>',
  mega: '<path d="M3 11l18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
  building: '<path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/>',
  trend: '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
  folder: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>'
};
function L(name, budget, engage, conso, prev) {
  return {
    name,
    budget,
    engage,
    conso,
    prev
  };
}
const MBUDGETS = [{
  id: 'dsi',
  name: 'Budget DSI',
  dir: 'Direction des Systèmes d\'Information',
  color: 'blue',
  ico: 'server',
  env: [{
    name: 'Infrastructure & Cloud',
    type: 'CAPEX',
    lines: [L('Hébergement cloud', 420000, 380000, 355000, 415000), L('Datacenter & réseau', 260000, 240000, 230000, 258000), L('Postes & terminaux', 180000, 150000, 140000, 175000)]
  }, {
    name: 'Applications & Licences',
    type: 'OPEX',
    lines: [L('Licences éditeurs', 340000, 335000, 325000, 348000), L('SaaS métiers', 220000, 210000, 205000, 225000), L('Maintenance applicative', 190000, 180000, 175000, 195000)]
  }, {
    name: 'Cybersécurité',
    type: 'OPEX',
    lines: [L('SOC & supervision', 210000, 205000, 190000, 215000), L('Audits & pentests', 90000, 98000, 88000, 99000), L('Outils sécurité', 130000, 120000, 118000, 128000)]
  }, {
    name: 'Support & TMA',
    type: 'OPEX',
    lines: [L('Support N1 / N2', 240000, 235000, 230000, 242000), L('TMA applicative', 300000, 290000, 285000, 305000)]
  }, {
    name: 'Projets & Innovation',
    type: 'CAPEX',
    lines: [L('Refonte SI cœur', 350000, 300000, 240000, 362000), L('Data & IA', 200000, 160000, 120000, 205000), L('POC innovation', 80000, 50000, 40000, 78000)]
  }]
}, {
  id: 'daf',
  name: 'Budget DAF',
  dir: 'Direction Administrative & Financière',
  color: 'gold',
  ico: 'euro',
  env: [{
    name: 'ERP & Outils finance',
    type: 'OPEX',
    lines: [L('Licence ERP', 180000, 175000, 170000, 182000), L('Modules reporting', 90000, 85000, 82000, 92000)]
  }, {
    name: 'Audit & Conseil',
    type: 'OPEX',
    lines: [L('Commissariat aux comptes', 120000, 120000, 118000, 121000), L('Conseil fiscal & juridique', 70000, 60000, 55000, 72000)]
  }, {
    name: 'Trésorerie & Assurances',
    type: 'OPEX',
    lines: [L('Assurances Groupe', 150000, 150000, 148000, 152000), L('Frais bancaires', 60000, 58000, 57000, 61000)]
  }]
}, {
  id: 'rh',
  name: 'Budget RH',
  dir: 'Direction des Ressources Humaines',
  color: 'purple',
  ico: 'users',
  env: [{
    name: 'SIRH & Paie',
    type: 'CAPEX',
    lines: [L('Licence SIRH', 110000, 100000, 95000, 112000), L('Paie externalisée', 130000, 128000, 125000, 131000)]
  }, {
    name: 'Formation',
    type: 'OPEX',
    lines: [L('Plan de formation', 220000, 180000, 150000, 210000), L('Certifications', 60000, 50000, 45000, 58000)]
  }, {
    name: 'Recrutement',
    type: 'OPEX',
    lines: [L('Cabinets & annonces', 140000, 120000, 110000, 145000), L('Marque employeur', 50000, 40000, 35000, 52000)]
  }]
}, {
  id: 'mkt',
  name: 'Budget Marketing',
  dir: 'Direction Marketing & Communication',
  color: 'green',
  ico: 'mega',
  env: [{
    name: 'Campagnes digitales',
    type: 'OPEX',
    lines: [L('SEA / SEO', 180000, 170000, 165000, 185000), L('Social & contenu', 120000, 110000, 105000, 122000)]
  }, {
    name: 'Événementiel',
    type: 'OPEX',
    lines: [L('Salons professionnels', 160000, 150000, 145000, 168000), L('Séminaires', 90000, 80000, 78000, 95000)]
  }, {
    name: 'Agence & Création',
    type: 'OPEX',
    lines: [L('Agence créative', 200000, 190000, 185000, 205000), L('Production vidéo', 70000, 60000, 58000, 72000)]
  }]
}, {
  id: 'fonc',
  name: 'Fonctionnement',
  dir: 'Charges de fonctionnement — OPEX récurrent',
  color: 'slate',
  ico: 'building',
  env: [{
    name: 'Locaux & Énergie',
    type: 'OPEX',
    lines: [L('Loyers & charges', 480000, 480000, 475000, 482000), L('Énergie & fluides', 120000, 130000, 128000, 138000)]
  }, {
    name: 'Télécoms',
    type: 'OPEX',
    lines: [L('Téléphonie & réseau', 90000, 88000, 86000, 91000)]
  }, {
    name: 'Services généraux',
    type: 'OPEX',
    lines: [L('Fournitures & services', 70000, 65000, 63000, 71000)]
  }]
}, {
  id: 'invest',
  name: 'Investissement',
  dir: 'Enveloppe d\'investissement — CAPEX',
  color: 'gold',
  ico: 'trend',
  env: [{
    name: 'Matériel',
    type: 'CAPEX',
    lines: [L('Serveurs & stockage', 260000, 240000, 210000, 258000), L('Postes de travail', 180000, 170000, 160000, 182000)]
  }, {
    name: 'Aménagements',
    type: 'CAPEX',
    lines: [L('Travaux locaux', 220000, 180000, 150000, 225000)]
  }, {
    name: 'Développements immobilisés',
    type: 'CAPEX',
    lines: [L('Développements internes', 300000, 260000, 220000, 305000)]
  }]
}, {
  id: 'proj',
  name: 'Budgets de projet',
  dir: 'Portefeuille projets — 7 projets financés',
  color: 'red',
  ico: 'folder',
  env: [{
    name: 'Refonte Portail Client',
    type: 'CAPEX',
    lines: [L('Refonte Portail Client', 120000, 98000, 78500, 120000)]
  }, {
    name: 'Migration Cloud',
    type: 'CAPEX',
    lines: [L('Migration Cloud', 80000, 76000, 70400, 83000)]
  }, {
    name: 'Conformité RGPD',
    type: 'OPEX',
    lines: [L('Conformité RGPD', 45000, 42000, 40500, 45000)]
  }, {
    name: 'Application Mobile',
    type: 'CAPEX',
    lines: [L('Application Mobile', 60000, 12000, 7200, 59000)]
  }, {
    name: 'Data & BI Finance',
    type: 'CAPEX',
    lines: [L('Data & BI Finance', 55000, 31000, 27500, 54000)]
  }, {
    name: 'Programme SSO',
    type: 'CAPEX',
    lines: [L('Programme SSO', 25000, 8000, 5000, 25000)]
  }, {
    name: 'Archivage Légal',
    type: 'OPEX',
    lines: [L('Archivage Légal', 20000, 12000, 6400, 21000)]
  }]
}];
const MB_MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const MB_CURVE = [0.7, 0.8, 0.95, 0.9, 1.0, 1.1, 0.75, 0.7, 1.05, 1.15, 1.2, 1.3];
let mbYear = '2025';
let mbCurMonth = 9; // mois "réalisé" jusqu'à septembre pour 2025
let mbCurrentId = null;
let mbFilter = 'all'; // all | CAPEX | OPEX
let mbHomeView = 'cards'; // cards | table
function mbFactor() {
  return mbYear === '2024' ? 0.9 : 1;
}
function mbf(n) {
  return Math.round(n * mbFactor());
}
function mbSumLines(lines, key) {
  return lines.reduce((s, l) => s + l[key], 0);
}
function mbEnvTot(env) {
  return {
    budget: mbSumLines(env.lines, 'budget'),
    engage: mbSumLines(env.lines, 'engage'),
    conso: mbSumLines(env.lines, 'conso'),
    prev: mbSumLines(env.lines, 'prev'),
    dep: env.lines.reduce((s, l) => s + Math.max(0, l.prev - l.budget), 0)
  };
}
function mbTot(b) {
  let t = {
    budget: 0,
    engage: 0,
    conso: 0,
    prev: 0,
    dep: 0,
    capex: 0,
    opex: 0
  };
  b.env.forEach(e => {
    const et = mbEnvTot(e);
    t.budget += et.budget;
    t.engage += et.engage;
    t.conso += et.conso;
    t.prev += et.prev;
    t.dep += et.dep;
    if (e.type === 'CAPEX') t.capex += et.budget;else t.opex += et.budget;
  });
  return t;
}
function mbPfClass(pct) {
  return pct >= 90 ? 'pf-bad' : pct >= 75 ? 'pf-warn' : 'pf-ok';
}
function mbBarColor(pct) {
  return pct >= 90 ? 'var(--state-danger)' : pct >= 75 ? 'var(--brand-gold)' : 'var(--state-info)';
}
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/budget/budget-data.js", error: String((e && e.message) || e) }); }

// ui_kits/app/budget/budget-depense.js
try { (() => {
/* Budget — saisie de dépense
   Extrait de « Refonte Portail Client.html ».
   Script classique : chargé AVANT le script principal, partage la portée globale.
   Dépend des helpers globaux : fmtEur(), showToast(). */

/* ---- Saisir une dépense ---- */
let mbDepNature = 'engage',
  mbDepPre = null;
function mbFillEnvSelect(sel, b) {
  sel.innerHTML = b.env.map((e, i) => '<option value="' + i + '">' + e.name + '</option>').join('');
}
function mbFillLineSelect(sel, b, ei) {
  sel.innerHTML = b.env[ei].lines.map((l, i) => '<option value="' + i + '">' + l.name + '</option>').join('');
}
function mbOpenDepense(ei, li) {
  const b = MBUDGETS.find(x => x.id === mbCurrentId);
  if (!b) return;
  mbDepNature = 'engage';
  document.querySelectorAll('#mbDepModal .type-pill').forEach(p => p.classList.toggle('sel', p.dataset.nat === 'engage'));
  document.getElementById('mbDepSub').textContent = b.name + ' · ' + b.dir;
  const eSel = document.getElementById('mbDepEnv');
  mbFillEnvSelect(eSel, b);
  if (typeof ei === 'number') {
    eSel.value = ei;
  }
  mbDepEnvChange();
  if (typeof li === 'number') {
    document.getElementById('mbDepLine').value = li;
  }
  document.getElementById('mbDepLabel').value = '';
  mbDepUpdateImpact();
  document.getElementById('mbDepModal').classList.add('open');
}
function mbCloseDepense() {
  document.getElementById('mbDepModal').classList.remove('open');
}
function mbOpenLineDetail(ei, li) {
  const b = MBUDGETS.find(x => x.id === mbCurrentId);
  if (!b) return;
  const e = b.env[ei],
    l = e.lines[li];
  if (!l) return;
  const reste = l.budget - l.engage,
    dispo = l.budget - l.conso,
    pctE = Math.round(l.engage / l.budget * 100),
    pctC = Math.round(l.conso / l.budget * 100);
  const leng = l.engage > l.budget,
    dep = Math.max(0, l.prev - l.budget);
  document.getElementById('mbLineTitle').textContent = l.name;
  document.getElementById('mbLineSub').textContent = b.name + ' · ' + e.name;
  const row = (lbl, val, col) => '<div style="display:flex;justify-content:space-between;align-items:center;padding:11px 0;border-bottom:1px solid var(--neutral-100)"><span style="font-size:12.5px;color:var(--neutral-600);font-weight:600">' + lbl + '</span><span style="font-size:13.5px;font-weight:700;color:' + (col || 'var(--brand-ink)') + '">' + val + '</span></div>';
  document.getElementById('mbLineBody').innerHTML = '<div style="background:var(--neutral-50);border-radius:12px;padding:14px 16px;margin-bottom:16px">' + '<div style="display:flex;justify-content:space-between;font-size:11px;font-weight:700;color:var(--neutral-500);margin-bottom:6px"><span>Consommé ' + pctC + '%</span><span>Engagé ' + pctE + '%</span></div>' + '<div class="ptrack" style="height:9px"><div class="pfill ' + mbPfClass(pctC) + '" style="width:' + Math.min(pctC, 100) + '%"></div></div></div>' + row('Budget alloué', fmtEur(l.budget)) + row('Engagé', fmtEur(l.engage), leng ? 'var(--state-danger)' : 'var(--brand-gold-700)') + row('Consommé', fmtEur(l.conso), 'var(--state-info)') + row('Prévisionnel', fmtEur(l.prev), 'var(--neutral-600)') + row('Reste à engager', fmtEur(reste), reste < 0 ? 'var(--state-danger)' : 'var(--state-success)') + row('Disponible (non consommé)', fmtEur(dispo), dispo < 0 ? 'var(--state-danger)' : 'var(--brand-ink)') + (dep > 0 ? '<div style="margin-top:14px;font-size:12.5px;font-weight:600;color:var(--state-danger);background:color-mix(in srgb,var(--state-danger) 8%,white);border-radius:10px;padding:11px 13px">⚠ Dépassement prévisionnel de ' + fmtEur(dep) + ' au-delà du budget alloué.</div>' : '<div style="margin-top:14px;font-size:12.5px;font-weight:600;color:var(--state-success);background:color-mix(in srgb,var(--state-success) 8%,white);border-radius:10px;padding:11px 13px">✓ Ligne dans l\'enveloppe budgétaire.</div>');
  document.getElementById('mbLineDepBtn').onclick = function () {
    mbCloseLineDetail();
    mbOpenDepense(ei, li);
  };
  document.getElementById('mbLineModal').classList.add('open');
}
function mbCloseLineDetail() {
  document.getElementById('mbLineModal').classList.remove('open');
}
function mbDepNat(el) {
  mbDepNature = el.dataset.nat;
  el.parentElement.querySelectorAll('.type-pill').forEach(p => p.classList.remove('sel'));
  el.classList.add('sel');
  mbDepUpdateImpact();
}
function mbDepEnvChange() {
  const b = MBUDGETS.find(x => x.id === mbCurrentId);
  mbFillLineSelect(document.getElementById('mbDepLine'), b, +document.getElementById('mbDepEnv').value);
  mbDepUpdateImpact();
}
function mbDepUpdateImpact() {
  const b = MBUDGETS.find(x => x.id === mbCurrentId);
  if (!b) return;
  const ei = +document.getElementById('mbDepEnv').value,
    li = +document.getElementById('mbDepLine').value;
  const l = b.env[ei].lines[li];
  if (!l) return;
  const amt = Math.max(0, +document.getElementById('mbDepAmt').value || 0);
  const nEng = mbDepNature === 'engage' ? l.engage + amt : Math.max(l.engage, l.conso + amt);
  const nCon = mbDepNature === 'conso' ? l.conso + amt : l.conso;
  const over = nEng > l.budget;
  document.getElementById('mbDepImpact').innerHTML = 'Ligne <b>' + l.name + '</b> — budget ' + fmtEur(l.budget) + '. Après saisie : engagé ' + fmtEur(nEng) + ' · consommé ' + fmtEur(nCon) + '. ' + (over ? '<span style="color:var(--state-danger);font-weight:800">⚠ Dépassement de ' + fmtEur(nEng - l.budget) + '</span>' : '<span style="color:var(--state-success);font-weight:700">Dans l\'enveloppe.</span>');
}
document.addEventListener('input', e => {
  if (e.target && e.target.id === 'mbDepAmt') mbDepUpdateImpact();
});
document.addEventListener('change', e => {
  if (e.target && e.target.id === 'mbDepLine') mbDepUpdateImpact();
});
function mbSaveDepense() {
  const b = MBUDGETS.find(x => x.id === mbCurrentId);
  if (!b) return;
  const ei = +document.getElementById('mbDepEnv').value,
    li = +document.getElementById('mbDepLine').value;
  const l = b.env[ei].lines[li];
  const amt = Math.max(0, +document.getElementById('mbDepAmt').value || 0);
  if (!amt) {
    showToast('Renseignez un montant');
    return;
  }
  if (mbDepNature === 'engage') {
    l.engage += amt;
  } else {
    l.conso += amt;
    if (l.conso > l.engage) l.engage = l.conso;
  }
  mbCloseDepense();
  renderBudgetDetail(mbCurrentId);
  showToast('Dépense enregistrée · ' + fmtEur(amt) + ' sur ' + l.name);
}
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/budget/budget-depense.js", error: String((e && e.message) || e) }); }

// ui_kits/app/budget/budget-forecast.js
try { (() => {
/* Budget — scénarios, versions & prévisionnel
   Extrait de « Refonte Portail Client.html ».
   Script classique : chargé AVANT le script principal, partage la portée globale.
   Dépend des helpers globaux : fmtEur(), showToast(). */

/* ---- Scénarios prévisionnels & versions budgétaires ---- */
const BSC_SC = [{
  id: 'bas',
  name: 'Bas',
  k: 'Hypothèse prudente',
  f: 0.94,
  color: 'var(--state-success)',
  m: 'Report de 2 projets non critiques, gel des recrutements externes.'
}, {
  id: 'central',
  name: 'Central',
  k: 'Scénario de référence',
  f: 1.0,
  color: 'var(--state-info)',
  m: 'Portefeuille tenu tel que planifié, inflation fournisseurs à 3 %.'
}, {
  id: 'haut',
  name: 'Haut',
  k: 'Hypothèse de tension',
  f: 1.11,
  color: 'var(--state-danger)',
  m: 'Dérive Migration ERP, audit cybersécurité élargi, renforts prestataires.'
}];
const BSC_VERS = [{
  id: 'v1',
  n: 'Budget initial 2026',
  m: 'Voté en CODIR du 12/12/2025',
  lock: 1,
  ico: '🔒'
}, {
  id: 'v2',
  n: 'Budget révisé S1',
  m: 'Arbitrage du 25/06/2026 · +85 k€',
  lock: 1,
  ico: '🔒'
}, {
  id: 'v3',
  n: 'Budget révisé S2 (en cours)',
  m: 'Version de travail — modifiable',
  lock: 0,
  ico: '✎'
}];
let bscSel = 'central';
function bscOpen() {
  bscSel = 'central';
  bscRender();
  document.getElementById('bscModal').classList.add('open');
}
function bscClose() {
  document.getElementById('bscModal').classList.remove('open');
}
function bscPick(id) {
  bscSel = id;
  bscRender();
}
function bscRender() {
  const b = MBUDGETS.find(x => x.id === mbCurrentId) || MBUDGETS[0];
  const t = mbTot(b),
    budget = mbf(t.budget),
    base = mbf(t.prev);
  document.getElementById('bscSub').textContent = b.name + ' · atterrissage projeté à fin d\'exercice';
  const cards = BSC_SC.map(s => {
    const v = Math.round(base * s.f),
      gap = v - budget;
    return '<div class="bsc-card' + (s.id === bscSel ? ' sel' : '') + '" onclick="bscPick(\'' + s.id + '\')">' + '<div class="bsc-k" style="color:' + s.color + '">Scénario ' + s.name + '</div>' + '<div class="bsc-v">' + fmtEur(v) + '</div>' + '<div class="bsc-d" style="color:' + (gap > 0 ? 'var(--state-danger)' : 'var(--state-success)') + '">' + (gap > 0 ? '+' : '') + fmtEur(gap) + ' vs budget' + (gap > 0 ? ' · dépassement' : ' · sous budget') + '</div>' + '<div class="bsc-m">' + s.m + '</div></div>';
  }).join('');
  const rows = mbFlatLines(b).slice(0, 8).map(f => {
    const p = mbf(f.l.prev);
    return '<tr><td>' + f.l.name + '</td><td>' + fmtEur(mbf(f.l.budget)) + '</td>' + BSC_SC.map(s => {
      const v = Math.round(p * s.f),
        over = v > mbf(f.l.budget);
      return '<td style="font-weight:' + (s.id === bscSel ? '800' : '600') + ';color:' + (over ? 'var(--state-danger)' : s.id === bscSel ? 'var(--brand-ink)' : 'var(--neutral-500)') + '">' + fmtEur(v) + '</td>';
    }).join('') + '</tr>';
  }).join('');
  const vers = BSC_VERS.map(v => '<div class="bsc-ver"><div class="bsc-vl" style="background:' + (v.lock ? 'var(--neutral-100)' : 'color-mix(in srgb,var(--brand-gold) 18%,#fff)') + '">' + v.ico + '</div>' + '<div style="flex:1;min-width:0"><div class="bsc-vn">' + v.n + '</div><div class="bsc-vm">' + v.m + '</div></div>' + '<span class="bsc-lock' + (v.lock ? '' : ' act') + '">' + (v.lock ? 'Verrouillée' : 'Active') + '</span></div>').join('');
  document.getElementById('bscBody').innerHTML = '<div style="font-size:12.5px;color:var(--neutral-500);font-weight:600;margin-bottom:14px;line-height:1.55">Trois hypothèses d\'atterrissage comparées au budget alloué de <b>' + fmtEur(budget) + '</b>. Sélectionnez le scénario retenu pour l\'appliquer au prévisionnel.</div>' + '<div class="bsc-grid">' + cards + '</div>' + '<div class="mtg-dsec" style="margin-top:6px">Comparaison par ligne</div>' + '<table class="bs-prev"><thead><tr><th>Ligne budgétaire</th><th>Budget</th>' + BSC_SC.map(s => '<th style="color:' + (s.id === bscSel ? 'var(--brand-ink)' : '') + '">' + s.name + '</th>').join('') + '</tr></thead><tbody>' + rows + '</tbody></table>' + '<div class="mtg-dsec">Versions budgétaires</div>' + vers + '<div class="cap-note" style="margin-top:14px"><b>Verrouillage.</b> Une version verrouillée est figée et sert de référence de comparaison. Seule la version active accepte les saisies, imports et réaffectations.</div>';
}
function bscApply() {
  const b = MBUDGETS.find(x => x.id === mbCurrentId);
  if (!b) {
    bscClose();
    return;
  }
  const s = BSC_SC.find(x => x.id === bscSel);
  mbFlatLines(b).forEach(f => {
    f.l.prev = Math.round(f.l.prev * s.f);
    delete f.l.mth;
  });
  bscClose();
  renderBudgetDetail(mbCurrentId);
  showToast('Scénario ' + s.name + ' appliqué au prévisionnel');
}

/* ---- Réviser le prévisionnel + calculette ---- */
let mbFcOrig = null;
let mbCalcState = {
  lineIdx: 0,
  base: 'prev',
  growth: 0,
  gran: 'trimestre',
  method: 'lineaire',
  step: 5
};
function mbOpenForecast() {
  const b = MBUDGETS.find(x => x.id === mbCurrentId);
  if (!b) return;
  document.getElementById('mbFcSub').textContent = b.name + ' · prévisions de fin d\'exercice ' + mbYear;
  mbFcOrig = mbFlatLines(b).map(f => f.l.prev);
  mbCalcState = {
    lineIdx: 0,
    base: 'prev',
    growth: 0,
    gran: 'trimestre',
    method: 'lineaire',
    step: 5
  };
  const lineSel = document.getElementById('mbCalcLine');
  lineSel.innerHTML = mbFlatLines(b).map((f, i) => '<option value="' + i + '">' + f.label + '</option>').join('');
  lineSel.value = '0';
  document.getElementById('mbCalcBase').value = 'prev';
  document.getElementById('mbCalcGrowth').value = '0';
  document.getElementById('mbCalcStep').value = '5';
  document.getElementById('mbCalcStepWrap').style.display = 'none';
  mbFcRenderAll();
  document.getElementById('mbFcModal').classList.add('open');
}
function mbCloseForecast() {
  document.getElementById('mbFcModal').classList.remove('open');
  if (mbCurrentId) renderBudgetDetail(mbCurrentId);
}
function mbFcReset() {
  const b = MBUDGETS.find(x => x.id === mbCurrentId);
  if (!b || !mbFcOrig) return;
  mbFlatLines(b).forEach((f, i) => {
    f.l.prev = mbFcOrig[i];
    delete f.l.mth;
    delete f.l.sched;
  });
  mbFcRenderAll();
}
function mbFcRenderAll() {
  mbFcRenderSummary();
  mbFcRenderList();
  mbCalcRegen();
}
function mbFcTotals() {
  const b = MBUDGETS.find(x => x.id === mbCurrentId);
  const t = mbTot(b);
  return {
    b,
    budget: t.budget,
    prev: t.prev,
    conso: t.conso
  };
}
function mbFcRenderSummary() {
  const T = mbFcTotals();
  const gap = T.prev - T.budget;
  const cell = (k, v, col) => '<div style="border:1px solid var(--neutral-200);border-radius:10px;padding:11px 13px;text-align:center"><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--neutral-500);margin-bottom:5px">' + k + '</div><div style="font-size:16px;font-weight:800;font-variant-numeric:tabular-nums' + (col ? ';color:' + col : '') + '">' + v + '</div></div>';
  document.getElementById('mbFcSummary').innerHTML = cell('Budget alloué', fmtEur(mbf(T.budget))) + cell('Prévision totale', fmtEur(mbf(T.prev)), 'var(--state-info)') + cell('Écart projeté', (gap > 0 ? '+' : '') + fmtEur(mbf(gap)), gap > 0 ? 'var(--state-danger)' : 'var(--state-success)');
}
function mbFcRenderList() {
  const b = MBUDGETS.find(x => x.id === mbCurrentId);
  const flat = mbFlatLines(b);
  flat.forEach(f => mbEnsureMonthly(f.l));
  const M = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  let head = '<tr><th>Ligne</th>' + M.map(m => '<th>' + m + '</th>').join('') + '<th>Total</th><th>Écart</th></tr>';
  const rows = flat.map(f => {
    const l = f.l,
      sum = l.mth.reduce((s, v) => s + (+v || 0), 0),
      gap = sum - l.budget;
    const cells = l.mth.map((v, m) => '<td><input class="mb-mth-in" type="number" inputmode="decimal" value="' + Math.round(v) + '" oninput="mbFcEditMonth(' + f.ei + ',' + f.li + ',' + m + ',this.value)"></td>').join('');
    return '<tr><td class="mb-mth-name" title="' + f.label + '">' + l.name + '</td>' + cells + '<td class="mb-mth-tot" id="mbrt-' + f.ei + '-' + f.li + '">' + fmtEur(mbf(sum)) + '</td><td class="mb-mth-ec" id="mbre-' + f.ei + '-' + f.li + '" style="color:' + (gap > 0 ? 'var(--state-danger)' : gap < 0 ? 'var(--state-success)' : 'var(--neutral-400)') + '">' + (gap > 0 ? '+' + fmtEur(mbf(gap)) : gap < 0 ? fmtEur(mbf(gap)) : '—') + '</td></tr>';
  }).join('');
  document.getElementById('mbFcList').innerHTML = '<table class="mb-mth-table"><thead>' + head + '</thead><tbody>' + rows + '</tbody></table>';
}
function mbEnsureMonthly(l) {
  if (l.mth && l.mth.length === 12) return;
  const sum = MB_CURVE.reduce((a, c) => a + c, 0);
  let arr = [];
  for (let m = 0; m < 12; m++) arr.push(Math.round(l.prev * MB_CURVE[m] / sum));
  arr[11] += l.prev - arr.reduce((a, c) => a + c, 0);
  l.mth = arr;
}
function mbFcEditMonth(ei, li, m, val) {
  const b = MBUDGETS.find(x => x.id === mbCurrentId);
  const l = b.env[ei].lines[li];
  l.mth[m] = Math.max(0, +val || 0);
  const sum = l.mth.reduce((s, v) => s + (+v || 0), 0);
  l.prev = sum;
  const gap = sum - l.budget;
  const rt = document.getElementById('mbrt-' + ei + '-' + li);
  if (rt) rt.textContent = fmtEur(mbf(sum));
  const re = document.getElementById('mbre-' + ei + '-' + li);
  if (re) {
    re.textContent = gap > 0 ? '+' + fmtEur(mbf(gap)) : gap < 0 ? fmtEur(mbf(gap)) : '—';
    re.style.color = gap > 0 ? 'var(--state-danger)' : gap < 0 ? 'var(--state-success)' : 'var(--neutral-400)';
  }
  mbFcRenderSummary();
}
function mbCalcSet(key, val, el) {
  mbCalcState[key] = key === 'growth' || key === 'step' || key === 'lineIdx' ? +val || 0 : val;
  if (el) {
    el.parentElement.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
  }
  if (key === 'method') {
    document.getElementById('mbCalcStepWrap').style.display = val === 'croissance' ? '' : 'none';
  }
  mbCalcRegen();
}
function mbCalcLineRef() {
  const b = MBUDGETS.find(x => x.id === mbCurrentId);
  const flat = mbFlatLines(b);
  return flat[Math.min(mbCalcState.lineIdx, flat.length - 1)] || flat[0];
}
function mbCalcNb() {
  return {
    mois: 12,
    trimestre: 4,
    semestre: 2
  }[mbCalcState.gran] || 4;
}
function mbCalcGenerate() {
  const f = mbCalcLineRef();
  const l = f.l;
  const baseVal = mbCalcState.base === 'budget' ? l.budget : l.prev;
  const total = Math.round(baseVal * (1 + mbCalcState.growth / 100));
  const n = mbCalcNb();
  let parts = [];
  if (mbCalcState.method === 'croissance' && mbCalcState.step !== 0) {
    const r = 1 + mbCalcState.step / 100;
    let denom = 0;
    for (let k = 0; k < n; k++) denom += Math.pow(r, k);
    const p0 = total / denom;
    for (let k = 0; k < n; k++) parts.push(Math.round(p0 * Math.pow(r, k)));
  } else {
    const p = Math.round(total / n);
    for (let k = 0; k < n; k++) parts.push(p);
  }
  mbCalcState.parts = parts;
}
function mbCalcRegen() {
  mbCalcGenerate();
  mbCalcRenderBars();
  mbCalcRenderGrid();
  mbCalcRenderTotal();
}
function mbCalcSum() {
  return (mbCalcState.parts || []).reduce((s, p) => s + (+p || 0), 0);
}
function mbCalcRenderBars() {
  const parts = mbCalcState.parts || [],
    labels = mbCalcLabels(parts.length),
    maxP = Math.max(...parts, 1);
  document.getElementById('mbCalcBars').innerHTML = parts.map((p, i) => '<div class="mb-fc-bcol"><div class="mb-fc-bval">' + fmtEur(mbf(Math.round(p))) + '</div><div class="mb-fc-bar" style="height:' + Math.max(4, p / maxP * 100) + '%"></div><div class="mb-fc-blbl">' + labels[i] + '</div></div>').join('');
}
function mbCalcRenderGrid() {
  const parts = mbCalcState.parts || [],
    labels = mbCalcLabels(parts.length);
  document.getElementById('mbCalcGrid').innerHTML = parts.map((p, i) => '<div class="mb-fc-cell"><div class="mb-fc-cell-l">' + labels[i] + '</div><input type="number" inputmode="decimal" value="' + Math.round(p) + '" oninput="mbCalcEditCell(' + i + ',this.value)"></div>').join('');
}
function mbCalcRenderTotal() {
  const f = mbCalcLineRef(),
    sum = mbCalcSum(),
    l = f.l,
    gap = sum - l.budget;
  const gapTxt = gap > 0 ? '<span style="color:var(--state-danger);font-weight:800">dépassement +' + fmtEur(mbf(gap)) + '</span>' : gap < 0 ? '<span style="color:var(--state-success);font-weight:700">marge ' + fmtEur(mbf(-gap)) + '</span>' : 'équilibré';
  document.getElementById('mbCalcTotal').innerHTML = '<span>Total réparti · <span style="color:var(--neutral-500);font-weight:600">budget ' + fmtEur(mbf(l.budget)) + ' · ' + gapTxt + '</span></span><span class="tt-v">' + fmtEur(mbf(sum)) + '</span>';
}
function mbCalcEditCell(i, val) {
  mbCalcState.parts[i] = Math.max(0, +val || 0);
  mbCalcRenderBars();
  mbCalcRenderTotal();
}
function mbCalcLabels(n) {
  if (n === 12) return ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  if (n === 4) return ['T1', 'T2', 'T3', 'T4'];
  return ['S1', 'S2'];
}
function mbCalcApply() {
  const b = MBUDGETS.find(x => x.id === mbCurrentId);
  if (!b) return;
  const f = mbCalcLineRef(),
    sum = mbCalcSum();
  const l = b.env[f.ei].lines[f.li];
  l.prev = sum;
  l.sched = {
    gran: mbCalcState.gran,
    parts: mbCalcState.parts.slice()
  };
  l.mth = mbToMonthly(mbCalcState.parts, mbCalcNb());
  mbFcRenderSummary();
  mbFcRenderList();
  mbCalcRenderTotal();
  showToast('Prévisionnel appliqué · ' + f.label + ' → ' + fmtEur(mbf(sum)));
}
function mbToMonthly(parts, n) {
  if (n === 12) return parts.map(p => Math.round(p));
  const per = 12 / n,
    out = [];
  parts.forEach(p => {
    const each = Math.round(p / per);
    for (let k = 0; k < per; k++) out.push(each);
  });
  return out;
}
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/budget/budget-forecast.js", error: String((e && e.message) || e) }); }

// ui_kits/app/budget/budget-import.js
try { (() => {
/* Budget — sources & assistant d'import
   Extrait de « Refonte Portail Client.html ».
   Script classique : chargé AVANT le script principal, partage la portée globale.
   Dépend des helpers globaux : fmtEur(), showToast(). */

/* ---- Réaffecter ---- */
const BS_SOURCES = [{
  id: 'erp',
  name: 'ERP Sage X3',
  type: 'Connecteur ERP',
  kind: 'erp',
  color: 'var(--state-info)',
  freq: 'Quotidien · 04h00',
  last: '27/07/2026 04h12',
  rows: 1284,
  rej: 0,
  st: 'ok'
}, {
  id: 'api',
  name: 'API Finance Groupe',
  type: 'API REST · OAuth2',
  kind: 'api',
  color: 'var(--purple)',
  freq: 'Toutes les 6 h',
  last: '27/07/2026 06h00',
  rows: 412,
  rej: 3,
  st: 'ok'
}, {
  id: 'xls',
  name: 'Budget prévisionnel DSI.xlsx',
  type: 'Fichier XLS déposé',
  kind: 'xls',
  color: 'var(--state-success)',
  freq: 'Manuel',
  last: '12/07/2026 09h34',
  rows: 96,
  rej: 2,
  st: 'old'
}, {
  id: 'sirh',
  name: 'SIRH — coûts chargés',
  type: 'Connecteur SIRH',
  kind: 'api',
  color: 'var(--brand-gold)',
  freq: 'Mensuel',
  last: '01/07/2026 02h00',
  rows: 218,
  rej: 0,
  st: 'ok'
}, {
  id: 'cegid',
  name: 'Cegid — factures fournisseurs',
  type: 'Connecteur ERP',
  kind: 'erp',
  color: 'var(--teal)',
  freq: 'Quotidien · 05h00',
  last: '24/07/2026 05h04',
  rows: 0,
  rej: 47,
  st: 'err'
}];
const BS_FIELDS = [['', '— Ignorer cette colonne —'], ['env', 'Enveloppe'], ['line', 'Ligne budgétaire'], ['type', 'Type CAPEX / OPEX'], ['budget', 'Budget alloué'], ['engage', 'Engagé'], ['conso', 'Consommé'], ['prev', 'Prévisionnel'], ['date', 'Date d\'imputation'], ['cc', 'Centre de coût'], ['nat', 'Nature']];
const BS_COLS = [{
  c: 'CODE_ENV',
  s: 'INFRA-2026',
  f: 'env'
}, {
  c: 'LIBELLE_POSTE',
  s: 'Hébergement cloud',
  f: 'line'
}, {
  c: 'TYPE_IMMO',
  s: 'CAPEX',
  f: 'type'
}, {
  c: 'MT_BUDGET',
  s: '145 000,00',
  f: 'budget'
}, {
  c: 'MT_ENGAGE',
  s: '132 400,00',
  f: 'engage'
}, {
  c: 'MT_REALISE',
  s: '118 250,00',
  f: 'conso'
}, {
  c: 'DT_IMPUT',
  s: '2026-07-15',
  f: 'date'
}, {
  c: 'CENTRE_CC',
  s: 'CC-4180',
  f: 'cc'
}, {
  c: 'REF_INTERNE',
  s: 'X3-88421',
  f: ''
}];
const BS_CHECKS = [{
  ok: 1,
  t: 'Structure du fichier conforme',
  m: '9 colonnes reconnues, 96 lignes de données',
  n: '96'
}, {
  ok: 1,
  t: 'Enveloppes rapprochées',
  m: 'Toutes les enveloppes existent dans le budget cible',
  n: '5/5'
}, {
  ok: 0,
  t: 'Lignes budgétaires inconnues',
  m: '« Licences Copilot » et « Audit RGPD externe » seront créées',
  n: '2'
}, {
  ok: 0,
  t: 'Doublons détectés',
  m: '2 lignes en double sur la même période — la dernière valeur est retenue',
  n: '2'
}, {
  ok: 2,
  t: 'Montants hors exercice',
  m: '1 ligne datée de 2025 — elle sera rejetée',
  n: '1'
}, {
  ok: 1,
  t: 'Contrôle d\'équilibre',
  m: 'Total importé cohérent avec le total source (écart 0,00 €)',
  n: '✓'
}];
let bsWizStep = 1,
  bsWizSrc = 'xls',
  bsWizMap = null;
function bsOpenSources() {
  bsRenderSources();
  document.getElementById('bsSrcModal').classList.add('open');
}
function bsCloseSrc() {
  document.getElementById('bsSrcModal').classList.remove('open');
}
function bsIco(kind) {
  return kind === 'erp' ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><rect x="3" y="3" width="18" height="7" rx="1.5"/><rect x="3" y="14" width="18" height="7" rx="1.5"/><line x1="7" y1="6.5" x2="7.01" y2="6.5"/><line x1="7" y1="17.5" x2="7.01" y2="17.5"/></svg>' : kind === 'api' ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.5 1.5"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7L12 19"/></svg>' : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
}
function bsRenderSources() {
  const tot = BS_SOURCES.reduce((s, x) => s + x.rows, 0),
    rej = BS_SOURCES.reduce((s, x) => s + x.rej, 0),
    err = BS_SOURCES.filter(x => x.st === 'err').length;
  const cards = BS_SOURCES.map(s => '<div class="bs-card" onclick="bsOpenWizard(\'' + s.id + '\')">' + '<div class="bs-h"><div class="bs-ic" style="background:' + s.color + '">' + bsIco(s.kind) + '</div>' + '<div style="min-width:0"><div class="bs-n">' + s.name + '</div><div class="bs-t">' + s.type + '</div></div>' + '<span class="bs-st ' + s.st + '"><i></i>' + (s.st === 'ok' ? 'À jour' : s.st === 'err' ? 'En erreur' : 'Obsolète') + '</span></div>' + '<div class="bs-r"><span class="k">Fréquence</span><span class="v">' + s.freq + '</span></div>' + '<div class="bs-r"><span class="k">Dernier import</span><span class="v">' + s.last + '</span></div>' + '<div class="bs-r"><span class="k">Lignes intégrées</span><span class="v">' + s.rows.toLocaleString('fr-FR') + '</span></div>' + '<div class="bs-r"><span class="k">Rejets</span><span class="v" style="color:' + (s.rej ? 'var(--state-danger)' : 'var(--state-success)') + '">' + s.rej + '</span></div>' + '<div class="bs-foot"><button class="bs-btn" onclick="event.stopPropagation();showToast(\'Synchronisation lancée · ' + s.name.replace(/'/g, "") + '\')">Synchroniser</button><button class="bs-btn dark" onclick="event.stopPropagation();bsOpenWizard(\'' + s.id + '\')">Importer</button></div></div>').join('');
  document.getElementById('bsSrcBody').innerHTML = '<div class="mtg-kpis" style="margin-bottom:18px"><div class="mtg-kpi"><div class="l">Sources actives</div><div class="v">' + BS_SOURCES.length + '</div><div class="d">XLS, API, ERP, SIRH</div></div>' + '<div class="mtg-kpi"><div class="l">Lignes intégrées</div><div class="v">' + tot.toLocaleString('fr-FR') + '</div><div class="d">Sur l\'exercice en cours</div></div>' + '<div class="mtg-kpi"><div class="l">Rejets à traiter</div><div class="v" style="color:' + (rej ? 'var(--state-danger)' : 'var(--state-success)') + '">' + rej + '</div><div class="d">Lignes non intégrées</div></div>' + '<div class="mtg-kpi"><div class="l">Connecteurs en erreur</div><div class="v" style="color:' + (err ? 'var(--state-danger)' : 'var(--state-success)') + '">' + err + '</div><div class="d">' + (err ? 'Intervention requise' : 'Tous opérationnels') + '</div></div></div>' + '<div class="bs-grid">' + cards + '</div>';
}
function bsOpenWizard(sid) {
  bsWizSrc = sid;
  bsWizStep = 1;
  bsWizMap = BS_COLS.map(c => c.f);
  bsCloseSrc();
  bsRenderWizard();
  document.getElementById('bsWizModal').classList.add('open');
}
function bsCloseWizard() {
  document.getElementById('bsWizModal').classList.remove('open');
}
function bsWizGo(n) {
  if (n < 1 || n > 4) return;
  bsWizStep = n;
  bsRenderWizard();
}
function bsMapSet(i, v) {
  bsWizMap[i] = v;
  bsRenderWizard();
}
function bsRenderWizard() {
  const src = BS_SOURCES.find(x => x.id === bsWizSrc) || BS_SOURCES[2];
  document.getElementById('bsWizSub').textContent = src.name + ' → ' + (MBUDGETS.find(x => x.id === mbCurrentId) || MBUDGETS[0]).name;
  const labels = ['Source', 'Mapping', 'Contrôles', 'Aperçu'];
  let steps = '<div class="bs-steps">';
  labels.forEach((l, n) => {
    const i = n + 1;
    steps += '<div class="bs-step' + (i === bsWizStep ? ' on' : '') + (i < bsWizStep ? ' past' : '') + '"><span class="bs-sn">' + (i < bsWizStep ? '✓' : i) + '</span><span class="bs-sl">' + l + '</span>' + (i < 4 ? '<span class="bs-sbar"></span>' : '') + '</div>';
  });
  steps += '</div>';
  let body = '';
  if (bsWizStep === 1) {
    body = '<div class="bs-drop"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>' + '<div class="bs-dt">Déposez un fichier XLS / XLSX / CSV</div><div class="bs-dm">ou sélectionnez un connecteur déjà configuré</div></div>' + '<div class="bs-file"><div class="bs-fic">' + (src.kind === 'xls' ? 'XLS' : src.kind === 'api' ? 'API' : 'ERP') + '</div><div style="flex:1;min-width:0"><div class="bs-dt" style="font-size:12.5px">' + src.name + '</div><div class="bs-dm" style="margin-top:2px">' + src.type + ' · ' + src.rows + ' lignes · mapping mémorisé</div></div><span class="bs-st ok"><i></i>Prêt</span></div>' + '<div class="mtg-fld" style="margin-top:16px"><label class="mtg-lbl">Budget cible</label><select class="mtg-sel">' + MBUDGETS.map(b => '<option' + (b.id === mbCurrentId ? ' selected' : '') + '>' + b.name + '</option>').join('') + '</select></div>' + '<div class="mtg-fld"><label class="mtg-lbl">Mode d\'intégration</label><div class="mtg-pills"><button class="mtg-pill sel">Mise à jour incrémentale</button><button class="mtg-pill">Remplacement complet</button><button class="mtg-pill">Simulation seule</button></div></div>';
  } else if (bsWizStep === 2) {
    const rows = BS_COLS.map((c, i) => '<tr><td class="src">' + c.c + '</td><td class="smp">' + c.s + '</td><td><select class="bs-sel" onchange="bsMapSet(' + i + ',this.value)">' + BS_FIELDS.map(f => '<option value="' + f[0] + '"' + (bsWizMap[i] === f[0] ? ' selected' : '') + '>' + f[1] + '</option>').join('') + '</select></td></tr>').join('');
    const mapped = bsWizMap.filter(x => x).length;
    body = '<div style="font-size:12.5px;color:var(--neutral-500);font-weight:600;margin-bottom:14px;line-height:1.55">Associez chaque colonne du fichier à un champ Starium. Le mapping est mémorisé pour cette source : les imports suivants se feront en un clic.</div>' + '<table class="bs-map"><thead><tr><th style="width:26%">Colonne source</th><th style="width:28%">Exemple</th><th>Champ Starium</th></tr></thead><tbody>' + rows + '</tbody></table>' + '<div class="cap-note" style="margin-top:16px"><b>' + mapped + ' colonnes sur ' + BS_COLS.length + ' associées.</b> Les champs Enveloppe, Ligne et au moins un montant sont requis pour poursuivre.</div>';
  } else if (bsWizStep === 3) {
    const rows = BS_CHECKS.map(c => '<div class="bs-chk"><span class="bs-ci" style="background:' + (c.ok === 1 ? 'var(--state-success)' : c.ok === 0 ? 'var(--brand-gold)' : 'var(--state-danger)') + '">' + (c.ok === 1 ? '✓' : '!') + '</span><div style="flex:1;min-width:0"><div class="bs-ct">' + c.t + '</div><div class="bs-cm">' + c.m + '</div></div><span class="bs-cn" style="color:' + (c.ok === 1 ? 'var(--state-success)' : c.ok === 0 ? 'var(--brand-gold-700)' : 'var(--state-danger)') + '">' + c.n + '</span></div>').join('');
    body = '<div style="font-size:12.5px;color:var(--neutral-500);font-weight:600;margin-bottom:14px;line-height:1.55">Contrôles de cohérence exécutés avant intégration. Les anomalies bloquantes empêchent l\'import ; les avertissements sont intégrés avec la règle indiquée.</div>' + rows + '<div class="cap-note" style="margin-top:16px"><b>93 lignes seront intégrées, 1 rejetée, 2 lignes créées.</b> Aucune anomalie bloquante — l\'import peut être validé.</div>';
  } else {
    const b = MBUDGETS.find(x => x.id === mbCurrentId) || MBUDGETS[0];
    const flat = mbFlatLines(b).slice(0, 7);
    const rows = flat.map((f, n) => {
      const delta = [8400, -2200, 15600, 0, 4300, -1150, 9200][n] || 0;
      const nv = f.l.budget + delta;
      return '<tr><td>' + f.l.name + '</td><td>' + fmtEur(mbf(f.l.budget)) + '</td><td class="bs-arrow">→</td><td style="font-weight:700">' + fmtEur(mbf(nv)) + '</td><td style="color:' + (delta > 0 ? 'var(--state-info)' : delta < 0 ? 'var(--state-danger)' : 'var(--neutral-400)') + ';font-weight:700">' + (delta ? (delta > 0 ? '+' : '') + fmtEur(mbf(delta)) : '—') + '</td></tr>';
    }).join('') + '<tr><td>Licences Copilot<span class="bs-new">Nouveau</span></td><td class="bs-arrow">—</td><td class="bs-arrow">→</td><td style="font-weight:700">' + fmtEur(mbf(28000)) + '</td><td style="color:var(--state-info);font-weight:700">+' + fmtEur(mbf(28000)) + '</td></tr>' + '<tr><td>Audit RGPD externe<span class="bs-new">Nouveau</span></td><td class="bs-arrow">—</td><td class="bs-arrow">→</td><td style="font-weight:700">' + fmtEur(mbf(16500)) + '</td><td style="color:var(--state-info);font-weight:700">+' + fmtEur(mbf(16500)) + '</td></tr>';
    body = '<div style="font-size:12.5px;color:var(--neutral-500);font-weight:600;margin-bottom:14px;line-height:1.55">Impact ligne à ligne avant validation. Rien n\'est écrit tant que vous n\'avez pas confirmé.</div>' + '<table class="bs-prev"><thead><tr><th>Ligne budgétaire</th><th>Actuel</th><th></th><th>Après import</th><th>Écart</th></tr></thead><tbody>' + rows + '</tbody></table>' + '<div class="cap-note" style="margin-top:16px"><b>Piste d\'audit.</b> Chaque montant importé conserve sa provenance (source, date, auteur) et sa valeur précédente, consultables dans le détail de ligne.</div>';
  }
  document.getElementById('bsWizBody').innerHTML = steps + body;
  document.getElementById('bsWizFoot').innerHTML = '<button class="btn btn-secondary" onclick="' + (bsWizStep === 1 ? 'bsCloseWizard()' : 'bsWizGo(' + (bsWizStep - 1) + ')') + '">' + (bsWizStep === 1 ? 'Annuler' : '‹ Précédent') + '</button>' + (bsWizStep < 4 ? '<button class="btn btn-primary" onclick="bsWizGo(' + (bsWizStep + 1) + ')">Continuer ›</button>' : '<button class="btn btn-primary" onclick="bsWizConfirm()">Valider l\'import</button>');
}
function bsWizConfirm() {
  const src = BS_SOURCES.find(x => x.id === bsWizSrc) || BS_SOURCES[2];
  src.last = new Date().toLocaleDateString('fr-FR') + ' ' + new Date().toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  }).replace(':', 'h');
  src.rows = 93;
  src.rej = 1;
  src.st = 'ok';
  bsCloseWizard();
  showToast('Import validé · 93 lignes intégrées depuis ' + src.name);
  if (mbCurrentId) renderBudgetDetail(mbCurrentId);
}
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/budget/budget-import.js", error: String((e && e.message) || e) }); }

// ui_kits/app/budget/budget-reaffect.js
try { (() => {
/* Budget — réaffectation, validation & journal
   Extrait de « Refonte Portail Client.html ».
   Script classique : chargé AVANT le script principal, partage la portée globale.
   Dépend des helpers globaux : fmtEur(), showToast(). */

/* ---- Réaffecter ---- */
function mbFlatLines(b) {
  const arr = [];
  b.env.forEach((e, ei) => e.lines.forEach((l, li) => arr.push({
    ei,
    li,
    label: e.name + ' › ' + l.name,
    l
  })));
  return arr;
}
function mbOpenReaffect() {
  const b = MBUDGETS.find(x => x.id === mbCurrentId);
  if (!b) return;
  document.getElementById('mbReafSub').textContent = b.name;
  const flat = mbFlatLines(b);
  const opts = flat.map((f, i) => '<option value="' + i + '">' + f.label + ' (' + fmtEur(f.l.budget) + ')</option>').join('');
  const from = document.getElementById('mbReafFrom'),
    to = document.getElementById('mbReafTo');
  from.innerHTML = opts;
  to.innerHTML = opts;
  to.value = 1;
  mbReafCalc();
  document.getElementById('mbReafModal').classList.add('open');
}
function mbCloseReaffect() {
  document.getElementById('mbReafModal').classList.remove('open');
}
function mbReafCalc() {
  const b = MBUDGETS.find(x => x.id === mbCurrentId);
  if (!b) return;
  const flat = mbFlatLines(b);
  const fi = +document.getElementById('mbReafFrom').value,
    ti = +document.getElementById('mbReafTo').value;
  const amt = Math.max(0, +document.getElementById('mbReafAmt').value || 0);
  const F = flat[fi],
    T = flat[ti];
  if (!F || !T) {
    return;
  }
  const el = document.getElementById('mbReafImpact');
  if (fi === ti) {
    el.innerHTML = '<span style="color:var(--state-danger);font-weight:700">Sélectionnez deux lignes différentes.</span>';
    return;
  }
  const fRest = F.l.budget - F.l.engage;
  const warn = amt > fRest ? '<span style="color:var(--state-danger);font-weight:800">⚠ ' + F.l.name + ' n\'a que ' + fmtEur(fRest) + ' non engagés.</span>' : '';
  el.innerHTML = '<b>' + F.l.name + '</b> : ' + fmtEur(F.l.budget) + ' → ' + fmtEur(F.l.budget - amt) + '<br><b>' + T.l.name + '</b> : ' + fmtEur(T.l.budget) + ' → ' + fmtEur(T.l.budget + amt) + '<br>' + warn + '<div style="margin-top:9px;padding-top:9px;border-top:1px solid var(--neutral-200);font-weight:700;color:' + (amt >= 25000 ? 'var(--brand-gold-700)' : 'var(--state-success)') + '">' + (amt >= 25000 ? '⚠ Montant ≥ ' + fmtEur(25000) + ' — soumis à validation avant application.' : '✓ Sous le seuil de ' + fmtEur(25000) + ' — application immédiate, tracée au journal.') + '</div>';
}
function mbSaveReaffect() {
  const b = MBUDGETS.find(x => x.id === mbCurrentId);
  if (!b) return;
  const flat = mbFlatLines(b);
  const fi = +document.getElementById('mbReafFrom').value,
    ti = +document.getElementById('mbReafTo').value;
  const amt = Math.max(0, +document.getElementById('mbReafAmt').value || 0);
  if (fi === ti || !amt) {
    showToast('Réaffectation impossible');
    return;
  }
  const seuil = 25000,
    needsVal = amt >= seuil;
  BR_LOG.unshift({
    id: 'r' + Date.now(),
    bud: b.id,
    budName: b.name,
    from: flat[fi].label,
    to: flat[ti].label,
    fi,
    ti,
    amt,
    st: needsVal ? 'att' : 'val',
    by: 'Sophie Marchand',
    date: new Date().toLocaleDateString('fr-FR'),
    motif: document.getElementById('mbReafMotif') ? document.getElementById('mbReafMotif').value.trim() : '',
    val: needsVal ? null : 'Application directe (sous seuil)'
  });
  if (!needsVal) {
    flat[fi].l.budget -= amt;
    flat[ti].l.budget += amt;
  }
  mbCloseReaffect();
  renderBudgetDetail(mbCurrentId);
  showToast(needsVal ? fmtEur(amt) + ' · demande soumise à validation (seuil ' + fmtEur(seuil) + ')' : fmtEur(amt) + ' réaffectés vers ' + flat[ti].l.name);
}

/* ---- Journal & validation des réaffectations ---- */
let BR_LOG = [{
  id: 'r1',
  bud: 'b1',
  budName: 'Budget Infrastructure 2026',
  from: 'Infrastructure › Licences logicielles',
  to: 'Infrastructure › Hébergement cloud',
  amt: 32000,
  st: 'att',
  by: 'Karim Bensaïd',
  date: '24/07/2026',
  motif: 'Surcoût de stockage lié à la reprise de données ERP.',
  val: null
}, {
  id: 'r2',
  bud: 'b1',
  budName: 'Budget Infrastructure 2026',
  from: 'Support › Prestations externes',
  to: 'Cybersécurité › Audit & conformité',
  amt: 28500,
  st: 'att',
  by: 'Amélie Rousseau',
  date: '22/07/2026',
  motif: 'Audit cybersécurité complémentaire décidé en Comité Risques.',
  val: null
}, {
  id: 'r3',
  bud: 'b1',
  budName: 'Budget Infrastructure 2026',
  from: 'Projets › Refonte Portail Client',
  to: 'Projets › Application Mobile',
  amt: 45000,
  st: 'val',
  by: 'Sophie Marchand',
  date: '12/07/2026',
  motif: 'Décalage du module notifications en V2.',
  val: 'Validé par Marc Delaunay le 15/07/2026'
}, {
  id: 'r4',
  bud: 'b1',
  budName: 'Budget Infrastructure 2026',
  from: 'Infrastructure › Matériel serveurs',
  to: 'Exploitation › Maintenance',
  amt: 12000,
  st: 'val',
  by: 'Thomas Girard',
  date: '28/06/2026',
  motif: 'Prolongation du contrat de maintenance.',
  val: 'Application directe (sous seuil)'
}, {
  id: 'r5',
  bud: 'b1',
  budName: 'Budget Infrastructure 2026',
  from: 'Data & BI › Licences BI',
  to: 'Projets › POC Data Lake',
  amt: 60000,
  st: 'ref',
  by: 'Claire Dubois',
  date: '25/06/2026',
  motif: 'Financement du POC Data Lake.',
  val: 'Refusé par Isabelle Fournier — POC reporté au T1 2027'
}];
const BR_SEUIL = 25000;
function brOpen() {
  brRender();
  document.getElementById('brModal').classList.add('open');
}
function brClose() {
  document.getElementById('brModal').classList.remove('open');
}
function brRender() {
  const b = MBUDGETS.find(x => x.id === mbCurrentId);
  document.getElementById('brSub').textContent = (b ? b.name + ' · ' : '') + 'seuil de validation ' + fmtEur(BR_SEUIL);
  const att = BR_LOG.filter(x => x.st === 'att'),
    hist = BR_LOG.filter(x => x.st !== 'att');
  const attTot = att.reduce((s, x) => s + x.amt, 0);
  const row = (x, pending) => '<tr><td><div class="br-mv">' + x.from + '</div><div class="br-mm">→ ' + x.to + '</div></td>' + '<td class="br-amt">' + fmtEur(mbf(x.amt)) + '</td>' + '<td><div class="br-mv" style="font-weight:600">' + x.by + '</div><div class="br-mm">' + x.date + '</div></td>' + '<td><span class="br-st ' + x.st + '"><i></i>' + (x.st === 'att' ? 'À valider' : x.st === 'val' ? 'Validée' : 'Refusée') + '</span>' + (x.val ? '<div class="br-mm">' + x.val + '</div>' : '') + '</td>' + '<td>' + (pending ? '<div class="br-act"><button class="br-b ok" onclick="brDecide(\'' + x.id + '\',1)">Valider</button><button class="br-b no" onclick="brDecide(\'' + x.id + '\',0)">Refuser</button></div>' : '') + '</td></tr>';
  const head = '<thead><tr><th style="width:34%">Mouvement</th><th style="width:15%;text-align:right">Montant</th><th style="width:17%">Demandeur</th><th style="width:20%">Statut</th><th style="width:14%"></th></tr></thead>';
  document.getElementById('brBody').innerHTML = '<div class="mtg-kpis" style="grid-template-columns:repeat(3,1fr);margin-bottom:18px">' + '<div class="mtg-kpi"><div class="l">En attente</div><div class="v" style="color:' + (att.length ? 'var(--brand-gold-700)' : 'var(--state-success)') + '">' + att.length + '</div><div class="d">' + fmtEur(mbf(attTot)) + ' à arbitrer</div></div>' + '<div class="mtg-kpi"><div class="l">Validées</div><div class="v" style="color:var(--state-success)">' + BR_LOG.filter(x => x.st === 'val').length + '</div><div class="d">Sur l\'exercice</div></div>' + '<div class="mtg-kpi"><div class="l">Refusées</div><div class="v">' + BR_LOG.filter(x => x.st === 'ref').length + '</div><div class="d">Tracées et motivées</div></div></div>' + '<div class="mtg-dsec" style="margin-top:0">Demandes en attente d\'arbitrage</div>' + (att.length ? '<table class="br-tbl">' + head + '<tbody>' + att.map(x => row(x, 1)).join('') + '</tbody></table>' : '<div class="mtg-empty">Aucune demande en attente.</div>') + '<div class="mtg-dsec">Journal des mouvements</div>' + '<table class="br-tbl">' + head + '<tbody>' + hist.map(x => row(x, 0)).join('') + '</tbody></table>' + '<div class="cap-note" style="margin-top:16px"><b>Règle de gouvernance.</b> Toute réaffectation d\'un montant supérieur à ' + fmtEur(BR_SEUIL) + ' est soumise à validation avant application. En dessous du seuil, le mouvement est appliqué immédiatement mais reste tracé au journal.</div>';
}
function brDecide(id, ok) {
  const x = BR_LOG.find(r => r.id === id);
  if (!x) return;
  x.st = ok ? 'val' : 'ref';
  x.val = (ok ? 'Validé par Marc Delaunay le ' : 'Refusé par Marc Delaunay le ') + new Date().toLocaleDateString('fr-FR');
  if (ok) {
    const b = MBUDGETS.find(y => y.id === mbCurrentId);
    if (b && x.fi != null && x.ti != null) {
      const flat = mbFlatLines(b);
      if (flat[x.fi] && flat[x.ti]) {
        flat[x.fi].l.budget -= x.amt;
        flat[x.ti].l.budget += x.amt;
      }
    }
  }
  brRender();
  if (mbCurrentId) renderBudgetDetail(mbCurrentId);
  showToast(ok ? 'Réaffectation validée · ' + fmtEur(mbf(x.amt)) : 'Réaffectation refusée');
}
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/budget/budget-reaffect.js", error: String((e && e.message) || e) }); }

// ui_kits/app/budget/budget-views.js
try { (() => {
/* Budget — accueil, détail, tableau, export
   Extrait de « Refonte Portail Client.html ».
   Script classique : chargé AVANT le script principal, partage la portée globale.
   Dépend des helpers globaux : fmtEur(), showToast(). */

/* ---- ACCUEIL ---- */
function mbShowHome() {
  mbCurrentId = null;
  document.getElementById('budgets-detail').style.display = 'none';
  document.getElementById('budgets-home').style.display = '';
  renderBudgetsHome();
}
function mbSetYear(y, el) {
  mbYear = y;
  mbCurMonth = y === '2024' ? 12 : 9;
  if (el) {
    el.parentElement.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
  }
  if (mbCurrentId) renderBudgetDetail(mbCurrentId);else renderBudgetsHome();
}
function mbSetHomeView(v, el) {
  mbHomeView = v;
  if (el) {
    el.parentElement.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
  }
  document.getElementById('mb-cardgrid').style.display = v === 'cards' ? '' : 'none';
  document.getElementById('mb-table').style.display = v === 'table' ? '' : 'none';
}
function renderBudgetsHome() {
  let gB = 0,
    gE = 0,
    gC = 0,
    gDep = 0,
    alerts = 0;
  MBUDGETS.forEach(b => {
    const t = mbTot(b);
    gB += t.budget;
    gE += t.engage;
    gC += t.conso;
    gDep += t.dep;
    if (t.conso / t.budget >= 0.85 || t.dep > 0) alerts++;
  });
  gB = mbf(gB);
  gE = mbf(gE);
  gC = mbf(gC);
  gDep = mbf(gDep);
  const cons = document.getElementById('mb-consol');
  if (cons) cons.innerHTML = '<div class="mb-cons-cell lead"><div class="mb-cons-k" style="opacity:.8">Budget consolidé ' + mbYear + '</div><div class="mb-cons-v">' + fmtEur(gB) + '</div><div class="mb-cons-sub">' + MBUDGETS.length + ' budgets · ' + Math.round(gC / gB * 100) + '% consommé</div><div class="mb-cons-bar"><i style="width:' + Math.round(gC / gB * 100) + '%"></i></div></div>' + '<div class="mb-cons-cell"><div class="mb-cons-k">Engagé</div><div class="mb-cons-v" style="color:var(--brand-gold-700)">' + fmtEur(gE) + '</div><div class="mb-cons-sub">' + Math.round(gE / gB * 100) + '% du budget</div></div>' + '<div class="mb-cons-cell"><div class="mb-cons-k">Consommé</div><div class="mb-cons-v" style="color:var(--state-info)">' + fmtEur(gC) + '</div><div class="mb-cons-sub">' + Math.round(gC / gB * 100) + '% du budget</div></div>' + '<div class="mb-cons-cell"><div class="mb-cons-k">Dépassement projeté</div><div class="mb-cons-v" style="color:' + (gDep > 0 ? 'var(--state-danger)' : 'var(--brand-ink)') + '">' + (gDep > 0 ? '+' + fmtEur(gDep) : '—') + '</div><div class="mb-cons-sub">tous budgets confondus</div></div>' + '<div class="mb-cons-cell"><div class="mb-cons-k">Budgets en alerte</div><div class="mb-cons-v" style="color:' + (alerts > 0 ? 'var(--state-danger)' : 'var(--state-success)') + '">' + alerts + ' / ' + MBUDGETS.length + '</div><div class="mb-cons-sub">seuil 85% ou dépassement</div></div>';
  const grid = document.getElementById('mb-cardgrid');
  if (!grid) return;
  grid.innerHTML = MBUDGETS.map(b => {
    const t = mbTot(b),
      ac = MB_ACCENT[b.color],
      pct = Math.round(t.conso / t.budget * 100);
    const alert = pct >= 85 || t.dep > 0;
    const kind = t.capex && t.opex ? 'Mixte' : t.capex ? 'CAPEX' : 'OPEX';
    const kindCol = kind === 'CAPEX' ? 'var(--state-info)' : kind === 'OPEX' ? 'var(--purple)' : 'var(--brand-gold-700)';
    const kindBg = kind === 'CAPEX' ? 'var(--state-info-bg)' : kind === 'OPEX' ? 'var(--purple-bg)' : 'var(--brand-gold-050)';
    return '<div class="mb-card" onclick="openBudget(\'' + b.id + '\')">' + '<div class="mb-card-top"><div class="mb-card-ico" style="background:' + ac[0] + ';color:' + ac[1] + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">' + MB_ICO[b.ico] + '</svg></div><div class="mb-card-tt"><div class="mb-card-name">' + b.name + '</div><div class="mb-card-dir">' + b.dir + '</div></div><span class="mb-card-type" style="background:' + kindBg + ';color:' + kindCol + '">' + kind + '</span></div>' + '<div class="mb-card-total">Budget alloué<br><b>' + fmtEur(mbf(t.budget)) + '</b></div>' + '<div class="mb-card-track"><i style="width:' + Math.min(pct, 100) + '%;background:' + mbBarColor(pct) + '"></i></div>' + '<div style="display:flex;justify-content:space-between;font-size:11px;font-weight:700"><span style="color:var(--neutral-500)">Consommé ' + pct + '%</span><span style="color:var(--neutral-500)">Reste ' + fmtEur(mbf(t.budget - t.engage)) + '</span></div>' + '<div class="mb-card-foot"><div>' + (alert ? '<span class="mb-card-alert"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/></svg>' + (t.dep > 0 ? 'Dépassement +' + fmtEur(mbf(t.dep)) : 'Seuil d\'alerte') + '</span>' : '<span class="mb-card-foot mcf-k" style="color:var(--state-success);font-weight:700">Sous contrôle</span>') + '</div><span class="mb-card-arrow">Ouvrir<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg></span></div>' + '</div>';
  }).join('');
  // ---- vue tableau ----
  document.getElementById('mb-cardgrid').style.display = mbHomeView === 'cards' ? '' : 'none';
  document.getElementById('mb-table').style.display = mbHomeView === 'table' ? '' : 'none';
  const tbody = document.getElementById('mb-table-body');
  if (tbody) {
    let sB = 0,
      sE = 0,
      sC = 0;
    tbody.innerHTML = MBUDGETS.map(b => {
      const t = mbTot(b),
        ac = MB_ACCENT[b.color],
        pct = Math.round(t.conso / t.budget * 100);
      sB += mbf(t.budget);
      sE += mbf(t.engage);
      sC += mbf(t.conso);
      const alert = pct >= 90 || t.dep > 0,
        warn = pct >= 85 && pct < 90;
      const kind = t.capex && t.opex ? 'Mixte' : t.capex ? 'CAPEX' : 'OPEX';
      const etat = alert ? '<span class="badge bdg-danger">Alerte</span>' : warn ? '<span class="badge bdg-warn">À surveiller</span>' : '<span class="badge bdg-success">Sain</span>';
      return '<tr class="cat-row" onclick="openBudget(\'' + b.id + '\')"><td><div class="bcat"><div class="bcat-ico" style="background:' + ac[0] + ';color:' + ac[1] + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">' + MB_ICO[b.ico] + '</svg></div><div><div class="cell-strong">' + b.name + '</div><div class="cell-sub">' + b.dir + '</div></div></div></td>' + '<td><span class="badge bdg-neutral nodot">' + kind + '</span></td>' + '<td class="num">' + fmtEur(mbf(t.budget)) + '</td>' + '<td class="num" style="color:var(--brand-gold-700);font-weight:600">' + fmtEur(mbf(t.engage)) + '</td>' + '<td class="num" style="color:var(--state-info);font-weight:700">' + fmtEur(mbf(t.conso)) + '</td>' + '<td class="num">' + fmtEur(mbf(t.budget - t.engage)) + '</td>' + '<td><div class="prog-cell" style="min-width:100px"><div class="ptrack"><div class="pfill ' + mbPfClass(pct) + '" style="width:' + Math.min(pct, 100) + '%"></div></div><span class="prog-pct"' + (pct >= 90 ? ' style="color:var(--state-danger)"' : '') + '>' + pct + '%</span></div></td>' + '<td class="right">' + etat + '</td></tr>';
    }).join('');
    const spct = sB ? Math.round(sC / sB * 100) : 0;
    document.getElementById('mb-table-foot').innerHTML = '<tr style="border-top:2px solid var(--neutral-200)"><td style="padding:14px 16px;font-weight:800;color:var(--brand-ink)">Total consolidé</td><td></td><td class="num" style="font-weight:800">' + fmtEur(sB) + '</td><td class="num" style="font-weight:800;color:var(--brand-gold-700)">' + fmtEur(sE) + '</td><td class="num" style="font-weight:800;color:var(--state-info)">' + fmtEur(sC) + '</td><td class="num" style="font-weight:800">' + fmtEur(sB - sE) + '</td><td style="font-weight:800">' + spct + '%</td><td></td></tr>';
  }
}

/* ---- DÉTAIL ---- */
function openBudget(id) {
  mbCurrentId = id;
  mbFilter = 'all';
  document.getElementById('budgets-home').style.display = 'none';
  document.getElementById('budgets-detail').style.display = '';
  document.querySelector('.page-content').scrollTop = 0;
  document.getElementById('breadcrumb').innerHTML = '<a onclick="showView(\'list\')">Pilotage financier</a><span class="bc-sep">/</span><a onclick="mbShowHome()">Budgets</a><span class="bc-sep">/</span><span class="bc-current">' + MBUDGETS.find(b => b.id === id).name + '</span>';
  renderBudgetDetail(id);
}
function mbMonthly(b) {
  const t = mbTot(b),
    sumAll = MB_CURVE.reduce((a, c) => a + c, 0);
  let sumUp = 0;
  for (let m = 0; m < mbCurMonth; m++) sumUp += MB_CURVE[m];
  const prev = MB_CURVE.map(c => mbf(t.budget) * c / sumAll);
  const real = MB_CURVE.map((c, m) => m < mbCurMonth ? mbf(t.conso) * c / sumUp : 0);
  return {
    prev,
    real
  };
}
function mbSetFilter(f, el) {
  mbFilter = f;
  el.parentElement.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  mbRenderTable();
}
function renderBudgetDetail(id) {
  const b = MBUDGETS.find(x => x.id === id);
  if (!b) return;
  const t = mbTot(b),
    ac = MB_ACCENT[b.color];
  const pct = Math.round(t.conso / t.budget * 100),
    engPct = Math.round(t.engage / t.budget * 100);
  const reste = t.budget - t.engage;
  const kind = t.capex && t.opex ? 'Mixte' : t.capex ? 'CAPEX' : 'OPEX';
  const options = MBUDGETS.map(x => '<option value="' + x.id + '"' + (x.id === id ? ' selected' : '') + '>' + x.name + '</option>').join('');
  const kpi = (k, v, sub, col, bar, barcol) => '<div class="mb-kpi"><div class="mb-kpi-k">' + k + '</div><div class="mb-kpi-v"' + (col ? ' style="color:' + col + '"' : '') + '>' + v + '</div>' + (sub ? '<div class="mb-kpi-sub" style="color:' + (col || 'var(--neutral-500)') + '">' + sub + '</div>' : '') + (bar != null ? '<div class="mb-kpi-bar"><i style="width:' + Math.min(bar, 100) + '%;background:' + (barcol || 'var(--state-info)') + '"></i></div>' : '') + '</div>';
  const m = mbMonthly(b),
    maxM = Math.max(...m.prev, ...m.real, 1);
  const chart = MB_MONTHS.map((mo, i) => {
    const over = m.real[i] > m.prev[i] * 1.02;
    return '<div class="mb-mcol"><div class="mb-mbars"><div class="mb-mbar prev" style="height:' + m.prev[i] / maxM * 100 + '%" title="Prévu ' + fmtEur(Math.round(m.prev[i])) + '"></div><div class="mb-mbar real' + (over ? ' over' : '') + '" style="height:' + m.real[i] / maxM * 100 + '%" title="Réalisé ' + fmtEur(Math.round(m.real[i])) + '"></div></div><div class="mb-mlabel">' + mo + '</div></div>';
  }).join('');
  // recommandations
  const recos = mbRecos(b, t);
  const html = '<div><span class="mb-back" onclick="mbShowHome()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><polyline points="15 18 9 12 15 6"/></svg>Tous les budgets</span></div>' + '<div class="mb-detail-head"><div class="mb-title-row"><div class="mb-title-ico" style="background:' + ac[0] + ';color:' + ac[1] + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">' + MB_ICO[b.ico] + '</svg></div><div><div class="mb-title-h">' + b.name + '</div><div class="mb-title-sub">' + b.dir + ' · exercice ' + mbYear + ' · ' + kind + '</div></div></div>' + '<div class="mb-switch"><select class="nselect" onchange="openBudget(this.value)">' + options + '</select>' + '<button class="mb-act-btn" onclick="mbExport()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Exporter</button>' + '<button class="mb-act-btn" onclick="bsOpenSources()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>Sources</button>' + '<button class="mb-act-btn" onclick="bscOpen()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><path d="M3 3v18h18"/><polyline points="7 14 11 10 15 13 20 7"/></svg>Scénarios</button>' + '<button class="mb-act-btn" onclick="mbOpenForecast()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><path d="M3 3v18h18"/><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/><path d="M12 20h9"/></svg>Prévisionnel</button>' + '<button class="mb-act-btn" onclick="brOpen()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>Réaffectations' + (BR_LOG.filter(x => x.st === 'att').length ? ' <span style="background:var(--brand-gold);color:#fff;font-size:9.5px;font-weight:800;padding:2px 6px;border-radius:999px;margin-left:4px">' + BR_LOG.filter(x => x.st === 'att').length + '</span>' : '') + '</button>' + '<button class="mb-act-btn primary" onclick="mbOpenDepense()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Saisir une dépense</button></div></div>' + '<div class="mb-filters"><div class="seg-toggle"><button class="seg-btn active" onclick="mbSetYear(\'2025\',this)"' + (mbYear === '2025' ? '' : '') + '>2025</button><button class="seg-btn' + (mbYear === '2024' ? ' active' : '') + '" onclick="mbSetYear(\'2024\',this)">2024</button></div>' + '<div class="seg-toggle"><button class="seg-btn' + (mbFilter === 'all' ? ' active' : '') + '" onclick="mbSetFilter(\'all\',this)">Tout</button><button class="seg-btn' + (mbFilter === 'CAPEX' ? ' active' : '') + '" onclick="mbSetFilter(\'CAPEX\',this)">CAPEX</button><button class="seg-btn' + (mbFilter === 'OPEX' ? ' active' : '') + '" onclick="mbSetFilter(\'OPEX\',this)">OPEX</button></div></div>' + '<div class="mb-detail-kpis">' + kpi('Alloué', fmtEur(mbf(t.budget)), kind, 'var(--brand-ink)', 100, 'var(--neutral-300)') + kpi('Engagé', fmtEur(mbf(t.engage)), engPct + '%', 'var(--brand-gold-700)', engPct, 'var(--brand-gold)') + kpi('Consommé', fmtEur(mbf(t.conso)), pct + '%', 'var(--state-info)', pct, 'var(--state-info)') + kpi('Reste à engager', fmtEur(mbf(reste)), Math.round(reste / t.budget * 100) + '% dispo', 'var(--state-success)', Math.round(reste / t.budget * 100), 'var(--state-success)') + kpi('Dépassement', t.dep > 0 ? '+' + fmtEur(mbf(t.dep)) : '—', t.dep > 0 ? 'prévision > budget' : 'maîtrisé', t.dep > 0 ? 'var(--state-danger)' : 'var(--state-success)', null) + kpi('Taux d\'exécution', pct + '%', pct >= 90 ? 'tension' : 'nominal', pct >= 90 ? 'var(--state-danger)' : 'var(--brand-ink)', null) + '</div>' + '<div class="mb-grid2"><div class="card" style="padding:18px"><div class="bo-head" style="margin-bottom:4px"><span class="bo-title">Réalisé vs prévu par mois</span><div class="gantt-legend" style="padding:0"><div class="gantt-leg"><span class="gantt-leg-dot" style="background:var(--neutral-200)"></span>Prévu</div><div class="gantt-leg"><span class="gantt-leg-dot" style="background:var(--state-info)"></span>Réalisé</div></div></div><div class="mb-mchart">' + chart + '</div></div>' + '<div class="mb-analysis"><div class="mb-an-h"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15A2.5 2.5 0 0 0 14.5 22"/><path d="M3 7h4M3 12h4M3 17h4"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5"/><path d="M17 7h4M17 12h4M17 17h4"/></svg>Analyse & recommandations</div>' + recos + '</div></div>' + '<div class="card tablecard"><div class="table-wrap"><table class="dt"><thead><tr><th>Enveloppe / ligne budgétaire</th><th>Budget</th><th>Engagé</th><th>Consommé</th><th>Prévision</th><th>Dépassement</th><th>Exécution</th></tr></thead><tbody id="mb-tbody"></tbody><tfoot id="mb-tfoot"></tfoot></table></div><div style="padding:12px 16px;border-top:1px solid var(--neutral-100);font-size:11.5px;color:var(--neutral-400);display:flex;align-items:center;gap:6px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" width="13" height="13"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>Cliquez sur une enveloppe pour déplier ses lignes · une ligne pour y saisir une dépense · « Prévisionnel » pour réviser les prévisions de fin d’exercice.</div></div>';
  document.getElementById('budgets-detail').innerHTML = html;
  mbRenderTable();
}
function mbRecos(b, t) {
  const out = [];
  // lignes en dépassement
  const depLines = [];
  b.env.forEach(e => e.lines.forEach(l => {
    if (l.prev > l.budget) depLines.push({
      env: e.name,
      name: l.name,
      gap: l.prev - l.budget
    });
  }));
  depLines.sort((a, x) => x.gap - a.gap);
  if (depLines.length) {
    const d = depLines[0];
    out.push(['red', '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/>', '<b>' + d.name + '</b> (' + d.env + ') dépasse son budget de ' + fmtEur(mbf(d.gap)) + '. ' + (depLines.length > 1 ? depLines.length + ' lignes en dépassement au total.' : '') + ' Réaffectez depuis une ligne sous-consommée.', 'Réaffecter le budget', 'mbOpenReaffect()']);
  }
  // ligne sous-consommée -> source
  let under = null;
  b.env.forEach(e => e.lines.forEach(l => {
    const r = l.budget - l.engage;
    if (r > 0 && (!under || r > under.r)) under = {
      name: l.name,
      r: r
    };
  }));
  if (under && under.r > 0) {
    out.push(['green', '<polyline points="20 6 9 17 4 12"/>', '<b style="color:var(--state-success)">' + under.name + '</b> dispose de ' + fmtEur(mbf(under.r)) + ' de marge non engagée — mobilisable pour absorber les dépassements ou financer une priorité.', 'Saisir une dépense', 'mbOpenDepense()']);
  }
  // exécution
  const pct = Math.round(t.conso / t.budget * 100);
  if (pct < 55 && mbCurMonth >= 9) {
    out.push(['gold', '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>', 'Taux d\'exécution de seulement <b style="color:var(--brand-gold-700)">' + pct + '%</b> à ' + mbCurMonth + ' mois écoulés — risque de sous-consommation en fin d\'exercice. Anticipez les engagements du T4.', null, null]);
  } else {
    out.push(['blue', '<line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>', 'Exécution à <b style="color:var(--state-info)">' + pct + '%</b>, prévision de fin d\'exercice à ' + fmtEur(mbf(t.prev)) + ' pour ' + fmtEur(mbf(t.budget)) + ' alloués — écart ' + (t.budget - t.prev >= 0 ? 'favorable de ' + fmtEur(mbf(t.budget - t.prev)) : 'défavorable de ' + fmtEur(mbf(t.prev - t.budget))) + '.', null, null]);
  }
  return out.map(r => {
    const ac = MB_ACCENT[r[0]];
    return '<div class="mb-reco"><div class="mb-reco-ico" style="background:' + ac[0] + ';color:' + ac[1] + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' + r[1] + '</svg></div><div class="mb-reco-b"><div class="mb-reco-t">' + r[2] + '</div>' + (r[3] ? '<span class="mb-reco-a" onclick="' + r[4] + '">' + r[3] + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg></span>' : '') + '</div></div>';
  }).join('');
}
function mbRenderTable() {
  const b = MBUDGETS.find(x => x.id === mbCurrentId);
  if (!b) return;
  const tb = document.getElementById('mb-tbody');
  if (!tb) return;
  let html = '',
    tB = 0,
    tE = 0,
    tC = 0,
    tP = 0,
    tDep = 0;
  b.env.forEach((e, ei) => {
    if (mbFilter !== 'all' && e.type !== mbFilter) return;
    const et = mbEnvTot(e),
      pct = Math.round(et.conso / et.budget * 100);
    tB += et.budget;
    tE += et.engage;
    tC += et.conso;
    tP += et.prev;
    tDep += et.dep;
    const tCol = e.type === 'CAPEX' ? ['var(--state-info-bg)', 'var(--state-info)'] : ['var(--purple-bg)', 'var(--purple)'];
    html += '<tr class="cat-row" onclick="mbToggleEnv(' + ei + ')"><td><div class="mb-env-name"><span class="cat-chevron"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg></span>' + e.name + '<span class="mb-env-type" style="background:' + tCol[0] + ';color:' + tCol[1] + '">' + e.type + '</span></div></td>' + '<td class="num">' + fmtEur(mbf(et.budget)) + '</td>' + '<td class="num" style="color:var(--brand-gold-700);font-weight:600">' + fmtEur(mbf(et.engage)) + '</td>' + '<td class="num" style="color:var(--state-info);font-weight:700">' + fmtEur(mbf(et.conso)) + '</td>' + '<td class="num" style="color:var(--neutral-600);font-weight:600">' + fmtEur(mbf(et.prev)) + '</td>' + '<td class="num">' + (et.dep > 0 ? '<span class="dep-pos">+' + fmtEur(mbf(et.dep)) + '</span>' : '<span class="dep-none">—</span>') + '</td>' + '<td><div class="prog-cell" style="min-width:100px"><div class="ptrack"><div class="pfill ' + mbPfClass(pct) + '" style="width:' + Math.min(pct, 100) + '%"></div></div><span class="prog-pct"' + (pct >= 90 ? ' style="color:var(--state-danger)"' : '') + '>' + pct + '%</span></div></td></tr>';
    e.lines.forEach((l, li) => {
      const ldep = Math.max(0, l.prev - l.budget),
        lpct = Math.round(l.conso / l.budget * 100),
        leng = l.engage > l.budget;
      html += '<tr class="mb-line-row" data-env="' + ei + '" style="display:none;cursor:pointer" onclick="mbOpenLineDetail(' + ei + ',' + li + ')"><td><span class="mb-line-name">' + l.name + (leng ? ' <span class="badge bdg-danger" style="margin-left:4px">Engagé &gt; budget</span>' : '') + '</span></td>' + '<td class="num">' + fmtEur(mbf(l.budget)) + '</td>' + '<td class="num" style="font-weight:600;color:' + (leng ? 'var(--state-danger)' : 'var(--brand-gold-700)') + '">' + fmtEur(mbf(l.engage)) + '</td>' + '<td class="num" style="color:var(--state-info)">' + fmtEur(mbf(l.conso)) + '</td>' + '<td class="num" style="color:var(--neutral-600)">' + fmtEur(mbf(l.prev)) + '</td>' + '<td class="num">' + (ldep > 0 ? '<span class="dep-pos">+' + fmtEur(mbf(ldep)) + '</span>' : '<span class="dep-none">—</span>') + '</td>' + '<td><div class="prog-cell" style="min-width:100px"><div class="ptrack"><div class="pfill ' + mbPfClass(lpct) + '" style="width:' + Math.min(lpct, 100) + '%"></div></div><span class="prog-pct"' + (lpct >= 90 ? ' style="color:var(--state-danger)"' : '') + '>' + lpct + '%</span></div></td></tr>';
    });
  });
  tb.innerHTML = html;
  const tpct = tB ? Math.round(tC / tB * 100) : 0;
  document.getElementById('mb-tfoot').innerHTML = '<tr style="border-top:2px solid var(--neutral-200)"><td style="padding:14px 16px;font-weight:800;color:var(--brand-ink)">Total' + (mbFilter !== 'all' ? ' ' + mbFilter : '') + '</td><td class="num" style="font-weight:800">' + fmtEur(mbf(tB)) + '</td><td class="num" style="font-weight:800;color:var(--brand-gold-700)">' + fmtEur(mbf(tE)) + '</td><td class="num" style="font-weight:800;color:var(--state-info)">' + fmtEur(mbf(tC)) + '</td><td class="num" style="font-weight:800;color:var(--neutral-600)">' + fmtEur(mbf(tP)) + '</td><td class="num" style="font-weight:800">' + (tDep > 0 ? '<span class="dep-pos">+' + fmtEur(mbf(tDep)) + '</span>' : '—') + '</td><td style="font-weight:800">' + tpct + '%</td></tr>';
}
function mbToggleEnv(ei) {
  const rows = document.querySelectorAll('#mb-tbody .cat-row');
  let idx = -1,
    target = null;
  document.querySelectorAll('#mb-tbody tr').forEach(r => {});
  // find the cat-row whose onclick matches ei
  rows.forEach(r => {
    if (r.getAttribute('onclick') === 'mbToggleEnv(' + ei + ')') target = r;
  });
  if (!target) return;
  target.classList.toggle('open');
  const open = target.classList.contains('open');
  document.querySelectorAll('#mb-tbody .mb-line-row[data-env="' + ei + '"]').forEach(r => r.style.display = open ? '' : 'none');
}
function mbExport() {
  const b = MBUDGETS.find(x => x.id === mbCurrentId);
  if (!b) return;
  let csv = 'Enveloppe;Ligne;Type;Budget;Engagé;Consommé;Prévision;Dépassement\n';
  b.env.forEach(e => e.lines.forEach(l => {
    csv += [e.name, l.name, e.type, mbf(l.budget), mbf(l.engage), mbf(l.conso), mbf(l.prev), Math.max(0, mbf(l.prev) - mbf(l.budget))].join(';') + '\n';
  }));
  mbDownloadCsv(csv, b.id + '-' + mbYear + '.csv');
  showToast('Budget « ' + b.name + ' » exporté (' + mbYear + ')');
}
function mbExportAll() {
  let csv = 'Budget;Direction;Budget;Engagé;Consommé;Dépassement\n';
  MBUDGETS.forEach(b => {
    const t = mbTot(b);
    csv += [b.name, b.dir, mbf(t.budget), mbf(t.engage), mbf(t.conso), mbf(t.dep)].join(';') + '\n';
  });
  mbDownloadCsv(csv, 'budgets-consolide-' + mbYear + '.csv');
  showToast('Budget consolidé exporté (' + mbYear + ')');
}
function mbDownloadCsv(csv, name) {
  try {
    const blob = new Blob(['\ufeff' + csv], {
      type: 'text/csv;charset=utf-8'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (e) {}
}
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/budget/budget-views.js", error: String((e && e.message) || e) }); }

// ui_kits/app/modules/capacite.js
try { (() => {
/* Capacité — centres, collaborateurs, portefeuille
   Extrait de « Refonte Portail Client.html ». Script classique, portée globale partagée.
   Chargé avant le script principal. Dépendances globales : fmtEur(), showToast(), showView(). */

/* ═══════════ CAPACITÉ — module Core (RFC-CAPA-001) ═══════════ */
const CAP_MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
const CAP_JH = [21, 20, 22, 21, 17, 21, 23, 21, 22, 23, 20, 22]; // jours ouvrés / mois — calendrier FR 2025
const CAP_GROUPS = [{
  id: 'it',
  name: 'IT',
  color: 'var(--state-info)'
}, {
  id: 'support',
  name: 'Fonctions support',
  color: 'var(--purple)'
}, {
  id: 'metiers',
  name: 'Métiers',
  color: 'var(--teal)'
}];
const CAP_CENTERS = [{
  id: 'cdp',
  g: 'it',
  name: 'Chefs de projet',
  head: 3
}, {
  id: 'infra',
  g: 'it',
  name: 'Infrastructure',
  head: 5
}, {
  id: 'expl',
  g: 'it',
  name: 'Exploitation',
  head: 4
}, {
  id: 'supp',
  g: 'it',
  name: 'Support',
  head: 6
}, {
  id: 'cyber',
  g: 'it',
  name: 'Cybersécurité',
  head: 3
}, {
  id: 'dev',
  g: 'it',
  name: 'Développement',
  head: 8
}, {
  id: 'rh',
  g: 'support',
  name: 'RH',
  head: 3
}, {
  id: 'compta',
  g: 'support',
  name: 'Comptabilité',
  head: 3
}, {
  id: 'fin',
  g: 'support',
  name: 'Finance',
  head: 2
}, {
  id: 'jur',
  g: 'support',
  name: 'Juridique',
  head: 2
}, {
  id: 'ach',
  g: 'support',
  name: 'Achats',
  head: 2
}, {
  id: 'com',
  g: 'support',
  name: 'Communication',
  head: 2
}, {
  id: 'prod',
  g: 'metiers',
  name: 'Production',
  head: 10
}, {
  id: 'maint',
  g: 'metiers',
  name: 'Maintenance',
  head: 5
}, {
  id: 'comm',
  g: 'metiers',
  name: 'Commerce',
  head: 6
}, {
  id: 'mkt',
  g: 'metiers',
  name: 'Marketing',
  head: 3
}, {
  id: 'qual',
  g: 'metiers',
  name: 'Qualité',
  head: 3
}];
// charge affectée : c=centre, p=projet, s=E(ngagé)|P(révisionnel), a→b mois (0-11), jh total réparti automatiquement
const CAP_LOADS = [{
  c: 'cdp',
  p: 'Refonte Portail Client',
  s: 'E',
  a: 0,
  b: 3,
  jh: 250
}, {
  c: 'cdp',
  p: 'Migration Cloud',
  s: 'P',
  a: 2,
  b: 6,
  jh: 120
}, {
  c: 'dev',
  p: 'Refonte Portail Client',
  s: 'E',
  a: 0,
  b: 8,
  jh: 340
}, {
  c: 'dev',
  p: 'Application Mobile',
  s: 'P',
  a: 5,
  b: 11,
  jh: 200
}, {
  c: 'infra',
  p: 'Migration Cloud',
  s: 'E',
  a: 1,
  b: 4,
  jh: 520
}, {
  c: 'infra',
  p: 'Migration ERP',
  s: 'P',
  a: 8,
  b: 11,
  jh: 140
}, {
  c: 'expl',
  p: 'Migration Cloud',
  s: 'E',
  a: 3,
  b: 9,
  jh: 150
}, {
  c: 'cyber',
  p: 'Sécurité & RGPD',
  s: 'E',
  a: 2,
  b: 4,
  jh: 200
}, {
  c: 'cyber',
  p: 'Audit cybersécurité',
  s: 'P',
  a: 9,
  b: 11,
  jh: 150
}, {
  c: 'supp',
  p: 'Support self-care N2',
  s: 'E',
  a: 0,
  b: 11,
  jh: 230
}, {
  c: 'rh',
  p: 'Refonte Portail Client',
  s: 'E',
  a: 2,
  b: 6,
  jh: 40
}, {
  c: 'rh',
  p: 'Programme SSO',
  s: 'P',
  a: 7,
  b: 10,
  jh: 26
}, {
  c: 'fin',
  p: 'Data & BI Finance',
  s: 'E',
  a: 1,
  b: 8,
  jh: 72
}, {
  c: 'jur',
  p: 'Sécurité & RGPD',
  s: 'E',
  a: 0,
  b: 4,
  jh: 30
}, {
  c: 'jur',
  p: 'Archivage légal',
  s: 'P',
  a: 6,
  b: 11,
  jh: 24
}, {
  c: 'compta',
  p: 'Migration ERP',
  s: 'P',
  a: 8,
  b: 11,
  jh: 52
}, {
  c: 'ach',
  p: 'Migration Cloud',
  s: 'E',
  a: 0,
  b: 3,
  jh: 20
}, {
  c: 'com',
  p: 'Refonte Portail Client',
  s: 'E',
  a: 5,
  b: 8,
  jh: 24
}, {
  c: 'prod',
  p: 'Modernisation ligne',
  s: 'E',
  a: 0,
  b: 11,
  jh: 1150
}, {
  c: 'maint',
  p: 'Maintenance préventive',
  s: 'E',
  a: 0,
  b: 11,
  jh: 520
}, {
  c: 'comm',
  p: 'Déploiement CRM',
  s: 'P',
  a: 3,
  b: 9,
  jh: 180
}, {
  c: 'mkt',
  p: 'Refonte Portail Client',
  s: 'P',
  a: 4,
  b: 8,
  jh: 64
}, {
  c: 'qual',
  p: 'Certification ISO 27001',
  s: 'E',
  a: 0,
  b: 7,
  jh: 118
}];
const CAP_PEOPLE = [{
  n: 'Sophie Marchand',
  c: 'cdp',
  role: 'Cheffe de projet',
  exc: null,
  loads: [{
    p: 'Refonte Portail Client',
    s: 'E',
    a: 0,
    b: 8,
    jh: 112
  }]
}, {
  n: 'Karim Bensaïd',
  c: 'infra',
  role: 'Ingénieur infrastructure',
  exc: {
    9: 15
  },
  loads: [{
    p: 'Migration Cloud',
    s: 'E',
    a: 0,
    b: 6,
    jh: 98
  }]
}, {
  n: 'Julie Fontaine',
  c: 'dev',
  role: 'Lead développeuse',
  exc: null,
  loads: [{
    p: 'Refonte Portail Client',
    s: 'E',
    a: 0,
    b: 8,
    jh: 140
  }, {
    p: 'Application Mobile',
    s: 'P',
    a: 6,
    b: 11,
    jh: 64
  }]
}, {
  n: 'Marc Lefèvre',
  c: 'dev',
  role: 'Développeur',
  exc: null,
  loads: [{
    p: 'Refonte Portail Client',
    s: 'E',
    a: 0,
    b: 8,
    jh: 126
  }]
}, {
  n: 'Amélie Rousseau',
  c: 'cyber',
  role: 'RSSI adjointe',
  exc: null,
  loads: [{
    p: 'Sécurité & RGPD',
    s: 'E',
    a: 0,
    b: 5,
    jh: 74
  }, {
    p: 'Audit cybersécurité',
    s: 'P',
    a: 9,
    b: 11,
    jh: 32
  }]
}, {
  n: 'Thomas Girard',
  c: 'expl',
  role: "Chargé d'exploitation",
  exc: {
    6: 12,
    7: 0
  },
  loads: [{
    p: 'Migration Cloud',
    s: 'E',
    a: 3,
    b: 9,
    jh: 82
  }]
}, {
  n: 'Nadia Cherif',
  c: 'supp',
  role: 'Support N2',
  exc: null,
  loads: [{
    p: 'Support self-care N2',
    s: 'E',
    a: 0,
    b: 11,
    jh: 150
  }]
}, {
  n: 'Paul Mercier',
  c: 'rh',
  role: 'Chargé RH',
  exc: null,
  loads: [{
    p: 'Refonte Portail Client',
    s: 'E',
    a: 2,
    b: 6,
    jh: 32
  }]
}, {
  n: 'Claire Dubois',
  c: 'fin',
  role: 'Contrôleuse de gestion',
  exc: null,
  loads: [{
    p: 'Data & BI Finance',
    s: 'E',
    a: 1,
    b: 8,
    jh: 56
  }]
}, {
  n: 'Hugo Petit',
  c: 'jur',
  role: 'Juriste',
  exc: null,
  loads: [{
    p: 'Sécurité & RGPD',
    s: 'E',
    a: 0,
    b: 4,
    jh: 22
  }, {
    p: 'Archivage légal',
    s: 'P',
    a: 6,
    b: 11,
    jh: 20
  }]
}, {
  n: 'Léa Moreau',
  c: 'compta',
  role: 'Comptable',
  exc: null,
  loads: [{
    p: 'Migration ERP',
    s: 'P',
    a: 8,
    b: 11,
    jh: 42
  }]
}, {
  n: 'Antoine Roy',
  c: 'prod',
  role: 'Responsable production',
  exc: null,
  loads: [{
    p: 'Modernisation ligne',
    s: 'E',
    a: 0,
    b: 11,
    jh: 190
  }]
}, {
  n: 'Farida Haddad',
  c: 'qual',
  role: 'Responsable qualité',
  exc: null,
  loads: [{
    p: 'Certification ISO 27001',
    s: 'E',
    a: 0,
    b: 7,
    jh: 96
  }]
}, {
  n: 'Nicolas Blanc',
  c: 'comm',
  role: 'Ingénieur commercial',
  exc: null,
  loads: [{
    p: 'Déploiement CRM',
    s: 'P',
    a: 3,
    b: 9,
    jh: 74
  }]
}];
function capNb(n) {
  return Math.round(n).toLocaleString('fr-FR');
}
function capSum(a) {
  return a.reduce((x, y) => x + y, 0);
}
function capTone(o) {
  return o > 100 ? 'var(--state-danger)' : o >= 85 ? 'var(--brand-gold-700)' : 'var(--state-success)';
}
function capBg(o) {
  return o > 100 ? 'var(--state-danger)' : o >= 85 ? 'var(--brand-gold)' : 'var(--state-success)';
}
function capCellBg(o) {
  if (o > 100) return 'var(--state-danger)';
  if (o >= 90) return 'color-mix(in srgb,var(--brand-gold) 55%,#fff)';
  if (o >= 70) return 'color-mix(in srgb,var(--brand-gold) 30%,#fff)';
  if (o >= 45) return 'color-mix(in srgb,var(--state-success) 30%,#fff)';
  return 'color-mix(in srgb,var(--state-success) 14%,#fff)';
}
function capGcol(id) {
  return CAP_GROUPS.find(g => g.id === id).color;
}
function capDist(a, b, jh) {
  const arr = Array(12).fill(0),
    n = b - a + 1;
  for (let m = a; m <= b; m++) arr[m] = jh / n;
  return arr;
}
function capCenterMonthly(cid) {
  const c = CAP_CENTERS.find(x => x.id === cid);
  const cap = CAP_JH.map(j => j * c.head),
    eng = Array(12).fill(0),
    prev = Array(12).fill(0);
  CAP_LOADS.filter(l => l.c === cid).forEach(l => {
    capDist(l.a, l.b, l.jh).forEach((v, m) => {
      if (l.s === 'E') eng[m] += v;else prev[m] += v;
    });
  });
  return {
    cap,
    eng,
    prev,
    c
  };
}
function capPersonMonthly(p) {
  const cap = CAP_JH.map((j, m) => p.exc && p.exc[m] != null ? p.exc[m] : j),
    eng = Array(12).fill(0),
    prev = Array(12).fill(0);
  (p.loads || []).forEach(l => {
    capDist(l.a, l.b, l.jh).forEach((v, m) => {
      if (l.s === 'E') eng[m] += v;else prev[m] += v;
    });
  });
  return {
    cap,
    eng,
    prev
  };
}
function capPortfolioTotals() {
  const cap = Array(12).fill(0),
    eng = Array(12).fill(0),
    prev = Array(12).fill(0);
  CAP_CENTERS.forEach(c => {
    const m = capCenterMonthly(c.id);
    for (let i = 0; i < 12; i++) {
      cap[i] += m.cap[i];
      eng[i] += m.eng[i];
      prev[i] += m.prev[i];
    }
  });
  return {
    cap,
    eng,
    prev
  };
}
function capMonthTable(mm, src) {
  let r = '';
  for (let i = 0; i < 12; i++) {
    const cons = mm.eng[i] + mm.prev[i],
      dispo = mm.cap[i] - cons,
      occ = Math.round(cons / mm.cap[i] * 100);
    r += '<tr><td>' + CAP_MONTHS[i] + '</td><td>' + capNb(mm.cap[i]) + '</td><td>' + (mm.eng[i] ? capNb(mm.eng[i]) : '–') + '</td><td>' + (mm.prev[i] ? '<span style="color:var(--brand-gold-700)">' + capNb(mm.prev[i]) + '</span>' : '–') + '</td><td style="font-weight:700;color:' + (dispo < 0 ? 'var(--state-danger)' : 'var(--brand-ink)') + '">' + capNb(dispo) + '</td><td><span style="font-weight:800;color:' + capTone(occ) + '">' + occ + '%</span></td>' + (src ? '<td>' + src[i] + '</td>' : '') + '</tr>';
  }
  return r;
}
function capTab(t) {
  document.querySelectorAll('#view-capacity .cap-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === t));
  ['portefeuille', 'centres', 'collabs'].forEach(x => {
    document.getElementById('cap-' + x).style.display = x === t ? '' : 'none';
  });
  if (t === 'portefeuille') capRenderPortfolio();else if (t === 'centres') capRenderCentres();else capRenderCollabs();
}
function capRender() {
  scnRender();
}
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/modules/capacite.js", error: String((e && e.message) || e) }); }

// ui_kits/app/modules/conformite.js
try { (() => {
/* Conformité — référentiels, évaluation, remédiation
   Extrait de « Refonte Portail Client.html ». Script classique, portée globale partagée.
   Chargé avant le script principal. Dépendances globales : fmtEur(), showToast(), showView(). */

/* ═══════════ CONFORMITÉ · détail d'un référentiel ═══════════ */
const CD_ST = {
  conf: {
    lbl: 'Conforme',
    cls: 'chip-conf',
    w: 1,
    col: 'var(--state-success)',
    ic: '<polyline points="20 6 9 17 4 12"/>'
  },
  part: {
    lbl: 'Partiel',
    cls: 'chip-part',
    w: 0.5,
    col: 'var(--brand-gold)',
    ic: '<circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 0 20z" fill="currentColor" stroke="none"/>'
  },
  ecart: {
    lbl: 'Écart',
    cls: 'chip-ecart',
    w: 0,
    col: 'var(--state-danger)',
    ic: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>'
  },
  todo: {
    lbl: 'À évaluer',
    cls: 'chip-todo',
    w: null,
    col: 'var(--state-info)',
    ic: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>'
  },
  na: {
    lbl: 'Non applicable',
    cls: 'chip-na',
    w: null,
    col: 'var(--neutral-300)',
    ic: '<circle cx="12" cy="12" r="10"/><line x1="5" y1="12" x2="19" y2="12"/>'
  }
};
const CD_CYCLE = ['conf', 'part', 'ecart', 'todo', 'na'];
function av(cls, ini) {
  return '<div class="assignee"><div class="av ' + cls + '" style="width:24px;height:24px;font-size:9px">' + ini + '</div></div>';
}
const FRAMEWORKS = {
  nist: {
    name: 'NIST CSF 2.0',
    ver: 'Cybersecurity Framework 2.0',
    logoTxt: 'CSF',
    logoBg: 'var(--state-success-bg)',
    logoFg: 'var(--state-success)',
    scope: 'Périmètre SI groupe',
    owner: ['av-4', 'PD'],
    ownerName: 'Paul Dubois — RSSI',
    mode: 'Auto-évaluation',
    audit: 'Octobre 2026',
    maturityLabel: 'Niveau (Tier)',
    fns: [{
      code: 'GV',
      name: 'Gouverner',
      color: 'var(--brand-gold)',
      cats: [{
        code: 'GV.OC',
        name: 'Contexte organisationnel',
        ctrl: 'Mission, attentes des parties prenantes, exigences légales',
        st: 'conf',
        o: ['av-4', 'PD']
      }, {
        code: 'GV.RM',
        name: 'Stratégie de gestion des risques',
        ctrl: 'Appétence, tolérance et priorisation du risque cyber',
        st: 'part',
        o: ['av-2', 'MD']
      }, {
        code: 'GV.RR',
        name: 'Rôles, responsabilités & autorités',
        ctrl: 'RACI cybersécurité, dotation en ressources',
        st: 'conf',
        o: ['av-4', 'PD']
      }, {
        code: 'GV.PO',
        name: 'Politique de cybersécurité',
        ctrl: 'PSSI approuvée, revue et communiquée',
        st: 'part',
        o: ['av-3', 'SL']
      }, {
        code: 'GV.OV',
        name: 'Supervision',
        ctrl: 'Revue de la stratégie et des résultats par la direction',
        st: 'todo',
        o: ['av-4', 'PD']
      }, {
        code: 'GV.SC',
        name: 'Risque de la chaîne d\'approvisionnement',
        ctrl: 'Gestion du risque fournisseurs & tiers TIC',
        st: 'ecart',
        o: ['av-2', 'MD']
      }]
    }, {
      code: 'ID',
      name: 'Identifier',
      color: 'var(--state-info)',
      cats: [{
        code: 'ID.AM',
        name: 'Gestion des actifs',
        ctrl: 'Inventaire matériel, logiciel, données et services',
        st: 'conf',
        o: ['av-1', 'JT']
      }, {
        code: 'ID.RA',
        name: 'Évaluation des risques',
        ctrl: 'Identification des vulnérabilités et menaces',
        st: 'part',
        o: ['av-3', 'SL']
      }, {
        code: 'ID.IM',
        name: 'Amélioration',
        ctrl: 'Enseignements tirés, plans d\'amélioration',
        st: 'todo',
        o: ['av-2', 'MD']
      }]
    }, {
      code: 'PR',
      name: 'Protéger',
      color: 'var(--purple)',
      cats: [{
        code: 'PR.AA',
        name: 'Gestion des identités & des accès',
        ctrl: 'Authentification, autorisation, moindre privilège',
        st: 'part',
        o: ['av-1', 'JT']
      }, {
        code: 'PR.AT',
        name: 'Sensibilisation & formation',
        ctrl: 'Programme de sensibilisation cyber',
        st: 'conf',
        o: ['av-6', 'AB']
      }, {
        code: 'PR.DS',
        name: 'Sécurité des données',
        ctrl: 'Chiffrement, cycle de vie, intégrité',
        st: 'part',
        o: ['av-3', 'SL']
      }, {
        code: 'PR.PS',
        name: 'Sécurité des plateformes',
        ctrl: 'Durcissement, gestion des configurations',
        st: 'ecart',
        o: ['av-1', 'JT']
      }, {
        code: 'PR.IR',
        name: 'Résilience de l\'infrastructure',
        ctrl: 'Architecture résiliente, capacité',
        st: 'todo',
        o: ['av-2', 'MD']
      }]
    }, {
      code: 'DE',
      name: 'Détecter',
      color: 'var(--teal)',
      cats: [{
        code: 'DE.CM',
        name: 'Surveillance continue',
        ctrl: 'Supervision réseaux, actifs et services',
        st: 'part',
        o: ['av-3', 'SL']
      }, {
        code: 'DE.AE',
        name: 'Analyse des événements indésirables',
        ctrl: 'Corrélation, qualification des alertes',
        st: 'ecart',
        o: ['av-1', 'JT']
      }]
    }, {
      code: 'RS',
      name: 'Répondre',
      color: 'var(--state-warning)',
      cats: [{
        code: 'RS.MA',
        name: 'Gestion des incidents',
        ctrl: 'Processus, classification, escalade',
        st: 'part',
        o: ['av-2', 'MD']
      }, {
        code: 'RS.AN',
        name: 'Analyse',
        ctrl: 'Investigation, analyse forensique',
        st: 'todo',
        o: ['av-1', 'JT']
      }, {
        code: 'RS.CO',
        name: 'Communication de la réponse',
        ctrl: 'Coordination interne et parties prenantes',
        st: 'conf',
        o: ['av-6', 'AB']
      }, {
        code: 'RS.MI',
        name: 'Atténuation',
        ctrl: 'Endiguement et éradication',
        st: 'part',
        o: ['av-3', 'SL']
      }]
    }, {
      code: 'RC',
      name: 'Rétablir',
      color: 'var(--state-success)',
      cats: [{
        code: 'RC.RP',
        name: 'Exécution du plan de rétablissement',
        ctrl: 'Restauration des systèmes et services',
        st: 'todo',
        o: ['av-2', 'MD']
      }, {
        code: 'RC.CO',
        name: 'Communication du rétablissement',
        ctrl: 'Information des parties prenantes',
        st: 'na',
        o: ['av-6', 'AB']
      }]
    }]
  },
  iso27001: {
    name: 'ISO/IEC 27001',
    ver: 'Édition 2022 — Annexe A',
    logoTxt: '27001',
    logoBg: 'var(--purple-bg)',
    logoFg: 'var(--purple)',
    scope: 'SMSI — périmètre certifié',
    owner: ['av-4', 'PD'],
    ownerName: 'Paul Dubois — RSSI',
    mode: 'Certification',
    audit: 'Recertif. mars 2027',
    maturityLabel: 'Couverture par thème',
    fns: [{
      code: 'A.5',
      name: 'Contrôles organisationnels',
      color: 'var(--brand-gold)',
      cats: [{
        code: 'A.5.1',
        name: 'Politiques de sécurité de l\'information',
        ctrl: 'Définies, approuvées, publiées',
        st: 'conf',
        o: ['av-4', 'PD']
      }, {
        code: 'A.5.9',
        name: 'Inventaire des actifs',
        ctrl: 'Actifs associés à l\'information',
        st: 'conf',
        o: ['av-1', 'JT']
      }, {
        code: 'A.5.15',
        name: 'Contrôle d\'accès',
        ctrl: 'Règles d\'accès physique et logique',
        st: 'part',
        o: ['av-1', 'JT']
      }, {
        code: 'A.5.23',
        name: 'Sécurité des services cloud',
        ctrl: 'Acquisition, usage et sortie du cloud',
        st: 'ecart',
        o: ['av-3', 'SL']
      }, {
        code: 'A.5.30',
        name: 'Préparation des TIC à la continuité',
        ctrl: 'Continuité d\'activité',
        st: 'part',
        o: ['av-2', 'MD']
      }]
    }, {
      code: 'A.6',
      name: 'Contrôles liés aux personnes',
      color: 'var(--state-info)',
      cats: [{
        code: 'A.6.1',
        name: 'Sélection des candidats',
        ctrl: 'Vérifications préalables à l\'embauche',
        st: 'conf',
        o: ['av-6', 'AB']
      }, {
        code: 'A.6.3',
        name: 'Sensibilisation & formation',
        ctrl: 'Sensibilisation à la sécurité',
        st: 'part',
        o: ['av-6', 'AB']
      }, {
        code: 'A.6.7',
        name: 'Travail à distance',
        ctrl: 'Mesures de sécurité du télétravail',
        st: 'conf',
        o: ['av-3', 'SL']
      }]
    }, {
      code: 'A.7',
      name: 'Contrôles physiques',
      color: 'var(--teal)',
      cats: [{
        code: 'A.7.1',
        name: 'Périmètres de sécurité physique',
        ctrl: 'Zones sécurisées',
        st: 'conf',
        o: ['av-2', 'MD']
      }, {
        code: 'A.7.4',
        name: 'Surveillance de la sécurité physique',
        ctrl: 'Détection d\'accès non autorisé',
        st: 'part',
        o: ['av-2', 'MD']
      }, {
        code: 'A.7.10',
        name: 'Supports de stockage',
        ctrl: 'Gestion du cycle de vie des supports',
        st: 'na',
        o: ['av-1', 'JT']
      }]
    }, {
      code: 'A.8',
      name: 'Contrôles technologiques',
      color: 'var(--purple)',
      cats: [{
        code: 'A.8.1',
        name: 'Terminaux des utilisateurs',
        ctrl: 'Protection des postes de travail',
        st: 'part',
        o: ['av-1', 'JT']
      }, {
        code: 'A.8.5',
        name: 'Authentification sécurisée',
        ctrl: 'MFA, gestion des secrets',
        st: 'conf',
        o: ['av-1', 'JT']
      }, {
        code: 'A.8.8',
        name: 'Gestion des vulnérabilités techniques',
        ctrl: 'Détection et remédiation',
        st: 'ecart',
        o: ['av-3', 'SL']
      }, {
        code: 'A.8.16',
        name: 'Surveillance des activités',
        ctrl: 'Journalisation et supervision',
        st: 'part',
        o: ['av-3', 'SL']
      }, {
        code: 'A.8.24',
        name: 'Utilisation de la cryptographie',
        ctrl: 'Politique de chiffrement',
        st: 'conf',
        o: ['av-4', 'PD']
      }]
    }]
  },
  rgpd: {
    name: 'RGPD',
    ver: 'Règlement (UE) 2016/679',
    logoTxt: 'RGPD',
    logoBg: 'var(--state-info-bg)',
    logoFg: 'var(--state-info)',
    scope: 'Traitements de données personnelles',
    owner: ['av-1', 'JT'],
    ownerName: 'Julien Tran — DPO',
    mode: 'Conformité continue',
    audit: 'Audit nov. 2026',
    maturityLabel: 'Couverture par chapitre',
    fns: [{
      code: 'Ch. II',
      name: 'Principes',
      color: 'var(--state-success)',
      cats: [{
        code: 'Art. 5',
        name: 'Principes relatifs au traitement',
        ctrl: 'Licéité, minimisation, exactitude',
        st: 'conf',
        o: ['av-1', 'JT']
      }, {
        code: 'Art. 6',
        name: 'Licéité du traitement',
        ctrl: 'Base légale documentée',
        st: 'conf',
        o: ['av-1', 'JT']
      }, {
        code: 'Art. 7',
        name: 'Conditions du consentement',
        ctrl: 'Recueil et preuve du consentement',
        st: 'part',
        o: ['av-6', 'AB']
      }, {
        code: 'Art. 9',
        name: 'Catégories particulières de données',
        ctrl: 'Données sensibles',
        st: 'part',
        o: ['av-1', 'JT']
      }]
    }, {
      code: 'Ch. III',
      name: 'Droits des personnes',
      color: 'var(--state-info)',
      cats: [{
        code: 'Art. 13-14',
        name: 'Information des personnes',
        ctrl: 'Mentions et politique de confidentialité',
        st: 'conf',
        o: ['av-6', 'AB']
      }, {
        code: 'Art. 15',
        name: 'Droit d\'accès',
        ctrl: 'Procédure de réponse aux demandes',
        st: 'conf',
        o: ['av-1', 'JT']
      }, {
        code: 'Art. 17',
        name: 'Droit à l\'effacement',
        ctrl: 'Suppression et durées de conservation',
        st: 'part',
        o: ['av-3', 'SL']
      }, {
        code: 'Art. 20',
        name: 'Droit à la portabilité',
        ctrl: 'Export des données dans un format ouvert',
        st: 'todo',
        o: ['av-3', 'SL']
      }]
    }, {
      code: 'Ch. IV',
      name: 'Responsable & sous-traitant',
      color: 'var(--purple)',
      cats: [{
        code: 'Art. 28',
        name: 'Sous-traitant',
        ctrl: 'Contrats et clauses de sous-traitance',
        st: 'part',
        o: ['av-2', 'MD']
      }, {
        code: 'Art. 30',
        name: 'Registre des traitements',
        ctrl: 'Registre tenu à jour',
        st: 'conf',
        o: ['av-1', 'JT']
      }, {
        code: 'Art. 32',
        name: 'Sécurité du traitement',
        ctrl: 'Mesures techniques et organisationnelles',
        st: 'part',
        o: ['av-4', 'PD']
      }, {
        code: 'Art. 33-34',
        name: 'Notification de violation',
        ctrl: 'Procédure CNIL sous 72 h',
        st: 'conf',
        o: ['av-1', 'JT']
      }, {
        code: 'Art. 35',
        name: 'Analyse d\'impact (AIPD)',
        ctrl: 'DPIA pour traitements à risque',
        st: 'part',
        o: ['av-1', 'JT']
      }]
    }, {
      code: 'Ch. V',
      name: 'Transferts internationaux',
      color: 'var(--brand-gold)',
      cats: [{
        code: 'Art. 46',
        name: 'Garanties appropriées',
        ctrl: 'Clauses contractuelles types (CCT)',
        st: 'ecart',
        o: ['av-2', 'MD']
      }, {
        code: 'Art. 49',
        name: 'Dérogations',
        ctrl: 'Situations particulières',
        st: 'na',
        o: ['av-1', 'JT']
      }]
    }]
  },
  dora: {
    name: 'DORA',
    ver: 'Règlement (UE) 2022/2554',
    logoTxt: 'DORA',
    logoBg: 'var(--state-warning-bg)',
    logoFg: 'var(--state-warning)',
    scope: 'Résilience opérationnelle numérique',
    owner: ['av-2', 'MD'],
    ownerName: 'Marc Dubois — Resp. résilience',
    mode: 'Mise en conformité',
    audit: 'Échéance Q3 2026',
    maturityLabel: 'Couverture par pilier',
    fns: [{
      code: 'P1',
      name: 'Gouvernance & gestion du risque TIC',
      color: 'var(--brand-gold)',
      cats: [{
        code: 'Art. 5-6',
        name: 'Cadre de gestion du risque TIC',
        ctrl: 'Stratégie, politiques et procédures',
        st: 'part',
        o: ['av-2', 'MD']
      }, {
        code: 'Art. 5',
        name: 'Rôle de l\'organe de direction',
        ctrl: 'Responsabilité et supervision',
        st: 'conf',
        o: ['av-4', 'PD']
      }]
    }, {
      code: 'P2',
      name: 'Gestion des incidents TIC',
      color: 'var(--state-info)',
      cats: [{
        code: 'Art. 17',
        name: 'Processus de gestion des incidents',
        ctrl: 'Détection, classification, suivi',
        st: 'part',
        o: ['av-2', 'MD']
      }, {
        code: 'Art. 19',
        name: 'Notification des incidents majeurs',
        ctrl: 'Déclaration aux autorités compétentes',
        st: 'ecart',
        o: ['av-3', 'SL']
      }]
    }, {
      code: 'P3',
      name: 'Tests de résilience opérationnelle',
      color: 'var(--purple)',
      cats: [{
        code: 'Art. 24',
        name: 'Programme de tests',
        ctrl: 'Tests réguliers des outils TIC',
        st: 'ecart',
        o: ['av-3', 'SL']
      }, {
        code: 'Art. 26',
        name: 'Tests de pénétration (TLPT)',
        ctrl: 'Tests fondés sur la menace',
        st: 'todo',
        o: ['av-1', 'JT']
      }]
    }, {
      code: 'P4',
      name: 'Risque lié aux prestataires tiers TIC',
      color: 'var(--teal)',
      cats: [{
        code: 'Art. 28',
        name: 'Registre des prestataires',
        ctrl: 'Cartographie des dépendances TIC',
        st: 'part',
        o: ['av-2', 'MD']
      }, {
        code: 'Art. 30',
        name: 'Clauses contractuelles',
        ctrl: 'Dispositions contractuelles clés',
        st: 'part',
        o: ['av-2', 'MD']
      }]
    }, {
      code: 'P5',
      name: 'Partage d\'informations',
      color: 'var(--state-success)',
      cats: [{
        code: 'Art. 45',
        name: 'Partage sur les cybermenaces',
        ctrl: 'Dispositifs d\'échange de renseignement',
        st: 'na',
        o: ['av-4', 'PD']
      }]
    }]
  }
};
let CD_KEY = 'nist';
const CIRC = r => 2 * Math.PI * r;
function cdCompliance(cats) {
  let num = 0,
    den = 0;
  cats.forEach(c => {
    const w = CD_ST[c.st].w;
    if (w !== null) {
      num += w;
      den += 1;
    }
  });
  return den ? Math.round(num / den * 100) : 0;
}
function cdCounts(fw) {
  const c = {
    conf: 0,
    part: 0,
    ecart: 0,
    todo: 0,
    na: 0,
    total: 0
  };
  fw.fns.forEach(f => f.cats.forEach(x => {
    c[x.st]++;
    c.total++;
  }));
  return c;
}
function pctColor(p) {
  return p >= 75 ? 'var(--state-success)' : p >= 50 ? 'var(--brand-gold)' : 'var(--state-danger)';
}
function openConfDetail(key) {
  CD_KEY = key;
  document.getElementById('conformite-library').style.display = 'none';
  document.getElementById('conformite-home').style.display = 'none';
  document.getElementById('conformite-detail').style.display = '';
  document.querySelector('.page-content').scrollTop = 0;
  document.getElementById('breadcrumb').innerHTML = '<a onclick="showView(\'dashboard\')">Gouvernance &amp; conformité</a><span class="bc-sep">/</span><a onclick="confBack()">Conformité</a><span class="bc-sep">/</span><span class="bc-current">' + FRAMEWORKS[key].name + '</span>';
  cdRender();
}
function confBack() {
  const h = document.getElementById('conformite-home'),
    d = document.getElementById('conformite-detail'),
    l = document.getElementById('conformite-library');
  if (h) h.style.display = '';
  if (d) d.style.display = 'none';
  if (l) l.style.display = 'none';
  document.getElementById('breadcrumb').innerHTML = VIEW_META.conformite.bc;
  document.querySelector('.page-content').scrollTop = 0;
}

/* ─── Bibliothèque de référentiels (activation par environnement) ─── */
const CATALOG = [{
  key: 'rgpd',
  txt: 'RGPD',
  bg: 'var(--state-info-bg)',
  fg: 'var(--state-info)',
  name: 'RGPD',
  sub: 'Protection des données personnelles',
  domain: 'Réglementaire',
  origin: 'Règlement (UE) 2016/679',
  req: 46,
  active: true,
  pct: 83,
  ok: 38,
  wip: 6,
  ko: 2,
  ring: 'var(--state-success)',
  pcol: 'var(--state-success)',
  foot: 'Audit : nov. 2026',
  badge: '<span class="badge bdg-success">Conforme</span>'
}, {
  key: 'iso27001',
  txt: '27001',
  bg: 'var(--purple-bg)',
  fg: 'var(--purple)',
  name: 'ISO/IEC 27001',
  sub: 'Sécurité de l’information (SMSI)',
  domain: 'Sécurité & cyber',
  origin: 'Édition 2022 — Annexe A',
  req: 51,
  active: true,
  pct: 74,
  ok: 38,
  wip: 10,
  ko: 3,
  ring: 'var(--purple)',
  pcol: 'var(--purple)',
  foot: 'Recertif. : mars 2027',
  badge: '<span class="badge bdg-info">En cours</span>'
}, {
  key: 'nist',
  txt: 'CSF',
  bg: 'var(--state-success-bg)',
  fg: 'var(--state-success)',
  name: 'NIST CSF 2.0',
  sub: 'Cybersécurité — cadre de gestion',
  domain: 'Sécurité & cyber',
  origin: 'Cybersecurity Framework 2.0',
  req: 22,
  active: true,
  pct: 61,
  ok: 58,
  wip: 26,
  ko: 12,
  ring: 'var(--brand-gold)',
  pcol: 'var(--brand-gold-700)',
  foot: 'Auto-éval. : oct. 2026',
  badge: '<span class="badge bdg-warn">En progression</span>'
}, {
  key: 'dora',
  txt: 'DORA',
  bg: 'var(--state-warning-bg)',
  fg: 'var(--state-warning)',
  name: 'DORA',
  sub: 'Résilience opérationnelle numérique',
  domain: 'Réglementaire',
  origin: 'Règlement (UE) 2022/2554',
  req: 11,
  active: true,
  pct: 45,
  ok: 18,
  wip: 14,
  ko: 8,
  ring: 'var(--brand-gold)',
  pcol: 'var(--brand-gold-700)',
  foot: 'Échéance : Q3 2026',
  badge: '<span class="badge bdg-warn">À risque</span>',
  border: '#F2D9A8'
}, {
  key: 'nis2',
  txt: 'NIS2',
  bg: 'var(--state-info-bg)',
  fg: 'var(--state-info)',
  name: 'NIS2',
  sub: 'Sécurité des réseaux et systèmes',
  domain: 'Réglementaire',
  origin: 'Directive (UE) 2022/2555',
  req: 24,
  active: false
}, {
  key: 'iso27002',
  txt: '27002',
  bg: 'var(--purple-bg)',
  fg: 'var(--purple)',
  name: 'ISO/IEC 27002',
  sub: 'Bonnes pratiques de sécurité',
  domain: 'Sécurité & cyber',
  origin: 'Édition 2022',
  req: 93,
  active: false
}, {
  key: 'cis',
  txt: 'CIS',
  bg: 'var(--teal-bg,var(--state-info-bg))',
  fg: 'var(--teal,var(--state-info))',
  name: 'CIS Controls v8',
  sub: 'Contrôles de sécurité prioritaires',
  domain: 'Sécurité & cyber',
  origin: 'Center for Internet Security',
  req: 18,
  active: false
}, {
  key: 'soc2',
  txt: 'SOC2',
  bg: 'var(--state-success-bg)',
  fg: 'var(--state-success)',
  name: 'SOC 2',
  sub: 'Trust Services Criteria',
  domain: 'Sécurité & cyber',
  origin: 'AICPA',
  req: 64,
  active: false
}, {
  key: 'pcidss',
  txt: 'PCI',
  bg: 'var(--state-warning-bg)',
  fg: 'var(--state-warning)',
  name: 'PCI-DSS v4.0',
  sub: 'Sécurité des données de paiement',
  domain: 'Sectoriel',
  origin: 'PCI SSC',
  req: 12,
  active: false
}, {
  key: 'hds',
  txt: 'HDS',
  bg: 'var(--state-info-bg)',
  fg: 'var(--state-info)',
  name: 'HDS',
  sub: 'Hébergement de données de santé',
  domain: 'Sectoriel',
  origin: 'Référentiel ANS',
  req: 16,
  active: false
}, {
  key: 'anssi',
  txt: 'ANSSI',
  bg: 'var(--purple-bg)',
  fg: 'var(--purple)',
  name: 'Guide d’hygiène ANSSI',
  sub: '42 mesures d’hygiène informatique',
  domain: 'Sécurité & cyber',
  origin: 'ANSSI',
  req: 42,
  active: false
}];
function confRing(color, pct) {
  const off = (188.5 * (100 - pct) / 100).toFixed(1);
  return '<svg width="72" height="72" viewBox="0 0 72 72"><circle cx="36" cy="36" r="30" fill="none" stroke="var(--neutral-200)" stroke-width="9"/><circle cx="36" cy="36" r="30" fill="none" stroke="' + color + '" stroke-width="9" stroke-linecap="round" stroke-dasharray="188.5" stroke-dashoffset="' + off + '"/></svg>';
}
function confCard(it) {
  const clickable = FRAMEWORKS[it.key];
  const onclick = clickable ? 'onclick="openConfDetail(\'' + it.key + '\')"' : 'onclick="showToast(\'Évaluation à démarrer — ' + it.name + '\')"';
  const started = it.pct !== undefined;
  const ringColor = started ? it.ring : 'var(--neutral-300)',
    pcol = started ? it.pcol : 'var(--neutral-400)',
    pct = started ? it.pct : 0;
  const foot = started ? it.foot : 'Évaluation à démarrer',
    badge = started ? it.badge : '<span class="badge bdg-neutral">À démarrer</span>';
  return '<div class="card refcard clickable"' + (it.border ? ' style="border-color:' + it.border + '"' : '') + ' ' + onclick + '>' + '<div class="refcard-head"><div class="refcard-logo" style="background:' + it.bg + ';color:' + it.fg + '">' + it.txt + '</div><div><div class="refcard-name">' + it.name + '</div><div class="refcard-sub">' + it.sub + '</div></div></div>' + '<div class="refcard-gauge"><div class="refcard-ring">' + confRing(ringColor, pct) + '<div class="refcard-ring-c" style="color:' + pcol + '">' + pct + '%</div></div>' + '<div class="refcard-gstat"><div class="gs-row"><span class="gs-lbl">Conformes</span><span class="gs-val" style="color:var(--state-success)">' + (started ? it.ok : 0) + '</span></div><div class="gs-row"><span class="gs-lbl">En cours</span><span class="gs-val" style="color:var(--state-warning)">' + (started ? it.wip : 0) + '</span></div><div class="gs-row"><span class="gs-lbl">Écarts</span><span class="gs-val" style="color:var(--state-danger)">' + (started ? it.ko : 0) + '</span></div></div></div>' + '<div class="refcard-foot"><span class="refcard-due"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/></svg>' + foot + '</span>' + badge + '</div></div>';
}
function renderActiveGrid() {
  const g = document.getElementById('conf-active-grid');
  if (!g) return;
  const act = CATALOG.filter(x => x.active);
  g.innerHTML = act.length ? act.map(confCard).join('') : '<div class="pp-empty" style="grid-column:1/-1">Aucun référentiel actif. Ouvrez la bibliothèque pour en activer un.</div>';
}
function openLibrary() {
  document.getElementById('conformite-home').style.display = 'none';
  document.getElementById('conformite-detail').style.display = 'none';
  document.getElementById('conformite-library').style.display = '';
  document.querySelector('.page-content').scrollTop = 0;
  document.getElementById('breadcrumb').innerHTML = '<a onclick="showView(\'dashboard\')">Gouvernance &amp; conformité</a><span class="bc-sep">/</span><a onclick="confBack()">Conformité</a><span class="bc-sep">/</span><span class="bc-current">Bibliothèque</span>';
  renderLibrary();
}
function toggleFramework(key) {
  const it = CATALOG.find(x => x.key === key);
  if (!it) return;
  it.active = !it.active;
  renderLibrary();
  renderActiveGrid();
  showToast(it.name + (it.active ? ' activé pour votre environnement' : ' désactivé'));
}
function renderLibrary() {
  const nAct = CATALOG.filter(x => x.active).length;
  document.getElementById('lib-count').textContent = nAct + ' référentiel' + (nAct > 1 ? 's' : '') + ' actif' + (nAct > 1 ? 's' : '') + ' sur ' + CATALOG.length + ' disponibles dans le catalogue.';
  const domains = [...new Set(CATALOG.map(x => x.domain))];
  document.getElementById('conf-library-body').innerHTML = domains.map(dom => {
    const items = CATALOG.filter(x => x.domain === dom);
    const cards = items.map(it => '<div class="lib-card' + (it.active ? ' on' : '') + '">' + '<div class="lib-logo" style="background:' + it.bg + ';color:' + it.fg + '">' + it.txt + '</div>' + '<div class="lib-body"><div class="lib-name">' + it.name + (FRAMEWORKS[it.key] ? '' : '  <span class="badge bdg-neutral nodot" style="font-size:10px">Catalogue</span>') + '</div>' + '<div class="lib-sub">' + it.sub + '</div>' + '<div class="lib-meta"><span>' + it.origin + '</span><span>' + it.req + ' exigences</span></div></div>' + '<button class="sw' + (it.active ? ' on' : '') + '" role="switch" aria-checked="' + it.active + '" title="Activer / désactiver" onclick="toggleFramework(\'' + it.key + '\')"></button>' + '</div>').join('');
    return '<div class="lib-group"><div class="sec-title">' + dom + '</div><div class="lib-grid">' + cards + '</div></div>';
  }).join('');
}
function cdSwitch(key) {
  CD_KEY = key;
  document.querySelector('.page-content').scrollTop = 0;
  document.getElementById('breadcrumb').innerHTML = '<a onclick="showView(\'dashboard\')">Gouvernance &amp; conformité</a><span class="bc-sep">/</span><a onclick="confBack()">Conformité</a><span class="bc-sep">/</span><span class="bc-current">' + FRAMEWORKS[key].name + '</span>';
  cdRender();
}
function cdCycle(fi, ci) {
  const c = FRAMEWORKS[CD_KEY].fns[fi].cats[ci];
  const i = CD_CYCLE.indexOf(c.st);
  c.st = CD_CYCLE[(i + 1) % CD_CYCLE.length];
  cdRender();
}
function cdExpandAll(open) {
  document.querySelectorAll('#cd-tree .cd-fn').forEach(el => el.classList.toggle('open', open));
}
function cdToggle(el) {
  el.closest('.cd-fn').classList.toggle('open');
}
function cdRender() {
  const fw = FRAMEWORKS[CD_KEY];
  const overall = cdCompliance(fw.fns.flatMap(f => f.cats));
  const cnt = cdCounts(fw);
  // hero
  document.getElementById('cd-h1').textContent = fw.name;
  document.getElementById('cd-h1sub').textContent = 'Évaluation de conformité — ' + fw.scope + '.';
  const logo = document.getElementById('cd-logo');
  logo.textContent = fw.logoTxt;
  logo.style.background = fw.logoBg;
  logo.style.color = fw.logoFg;
  document.getElementById('cd-title').innerHTML = fw.name + '<span class="cd-hero-ver">' + fw.ver + '</span>';
  document.getElementById('cd-sub').textContent = fw.scope;
  document.getElementById('cd-meta').innerHTML = '<div class="cd-hm"><span class="l">Responsable</span><span class="v">' + av(fw.owner[0], fw.owner[1]) + fw.ownerName + '</span></div>' + '<div class="cd-hm"><span class="l">Modalité</span><span class="v">' + fw.mode + '</span></div>' + '<div class="cd-hm"><span class="l">Exigences</span><span class="v">' + cnt.total + ' évaluées</span></div>' + '<div class="cd-hm"><span class="l">Prochaine échéance</span><span class="v">' + fw.audit + '</span></div>';
  // ring
  const r = document.getElementById('cd-ring');
  const c = CIRC(40);
  r.setAttribute('stroke-dasharray', c.toFixed(1));
  r.setAttribute('stroke-dashoffset', (c * (100 - overall) / 100).toFixed(1));
  r.setAttribute('stroke', pctColor(overall));
  const rp = document.getElementById('cd-ringpct');
  rp.textContent = overall + '%';
  rp.style.color = pctColor(overall);
  // distribution bar + legend
  const order = ['conf', 'part', 'ecart', 'todo', 'na'];
  document.getElementById('cd-dist').innerHTML = order.map(k => cnt[k] ? '<span style="width:' + cnt[k] / cnt.total * 100 + '%;background:' + CD_ST[k].col + '"></span>' : '').join('');
  document.getElementById('cd-legend').innerHTML = order.map(k => '<span class="cd-lg"><i style="background:' + CD_ST[k].col + '"></i>' + CD_ST[k].lbl + ' <b>' + cnt[k] + '</b></span>').join('');
  // framework switch tabs
  document.getElementById('cd-fswitch').innerHTML = Object.keys(FRAMEWORKS).map(k => '<button class="cd-ftab' + (k === CD_KEY ? ' active' : '') + '" onclick="cdSwitch(\'' + k + '\')">' + FRAMEWORKS[k].logoTxt + '</button>').join('');
  // tree
  document.getElementById('cd-tree').innerHTML = fw.fns.map((f, fi) => {
    const p = cdCompliance(f.cats);
    const rows = f.cats.map((x, ci) => {
      const s = CD_ST[x.st];
      return '<div class="cd-req" onclick="openAssess(' + fi + ',' + ci + ')"><div class="cd-req-code">' + x.code + '</div>' + '<div class="cd-req-body"><div class="cd-req-name">' + x.name + '</div><div class="cd-req-sub">' + x.ctrl + '</div></div>' + '<div class="cd-req-owner">' + av(x.o[0], x.o[1]) + '</div>' + '<span class="cd-chip ' + s.cls + '" title="Cliquer pour changer" onclick="event.stopPropagation();cdCycle(' + fi + ',' + ci + ')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4">' + s.ic + '</svg>' + s.lbl + '</span>' + '<svg class="cd-req-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><polyline points="9 18 15 12 9 6"/></svg></div>';
    }).join('');
    return '<div class="cd-fn' + (fi === 0 ? ' open' : '') + '">' + '<div class="cd-fn-head" onclick="cdToggle(this)">' + '<svg class="cd-fn-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>' + '<div class="cd-fn-badge" style="background:color-mix(in srgb,' + f.color + ' 14%,transparent);color:' + f.color + '">' + f.code + '</div>' + '<div class="cd-fn-name"><div class="n">' + f.name + '</div><div class="m">' + f.cats.length + ' exigences · ' + f.code + '</div></div>' + '<div class="cd-fn-prog"><div class="cd-fn-bar"><i style="width:' + p + '%;background:' + pctColor(p) + '"></i></div><div class="cd-fn-pct" style="color:' + pctColor(p) + '">' + p + '%</div></div>' + '</div>' + '<div class="cd-fn-body">' + rows + '</div>' + '</div>';
  }).join('');
  // rail
  const dc = CIRC(54),
    evalTotal = cnt.conf + cnt.part + cnt.ecart + cnt.todo + cnt.na;
  let acc = 0;
  const segs = order.filter(k => cnt[k]).map(k => {
    const frac = cnt[k] / evalTotal,
      len = dc * frac,
      gap = dc - len,
      off = -acc * dc;
    acc += frac;
    return '<circle cx="65" cy="65" r="54" fill="none" stroke="' + CD_ST[k].col + '" stroke-width="18" stroke-dasharray="' + len.toFixed(1) + ' ' + gap.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '"/>';
  }).join('');
  const railList = order.map(k => '<div class="cd-rl"><span class="cd-rl-l"><i style="background:' + CD_ST[k].col + '"></i>' + CD_ST[k].lbl + '</span><span class="cd-rl-v">' + cnt[k] + '</span></div>').join('');
  const mat = fw.fns.map(f => {
    const p = cdCompliance(f.cats);
    return '<div class="cd-mat-row"><div class="top"><span class="n">' + f.code + ' · ' + f.name + '</span><span class="lv">' + p + '%</span></div><div class="cd-mat-bar"><i style="width:' + p + '%;background:' + pctColor(p) + '"></i></div></div>';
  }).join('');
  document.getElementById('cd-rail').innerHTML = '<div class="card" style="padding:18px"><div class="sp-head"><span class="sp-title">Répartition</span></div>' + '<div class="cd-donut"><svg width="130" height="130" viewBox="0 0 130 130"><circle cx="65" cy="65" r="54" fill="none" stroke="var(--neutral-100)" stroke-width="18"/>' + segs + '</svg><div class="cd-donut-c"><span class="n" style="color:' + pctColor(overall) + '">' + overall + '%</span><span class="t">Conforme</span></div></div>' + '<div style="margin-top:14px">' + railList + '</div>' + '</div>' + '<div class="card" style="padding:18px"><div class="sp-head"><span class="sp-title">' + fw.maturityLabel + '</span></div><div class="cd-mat">' + mat + '</div></div>' + '<div class="card" style="padding:18px"><div class="sp-head"><span class="sp-title">Évaluation</span></div>' + '<div class="cd-rl"><span class="cd-rl-l">Modalité</span><span class="cd-rl-v">' + fw.mode + '</span></div>' + '<div class="cd-rl"><span class="cd-rl-l">Responsable</span><span class="cd-rl-v" style="font-weight:600">' + fw.ownerName.split(' — ')[0] + '</span></div>' + '<div class="cd-rl"><span class="cd-rl-l">Prochaine échéance</span><span class="cd-rl-v" style="font-weight:600">' + fw.audit + '</span></div>' + '<button class="sp-btn" style="margin-top:12px" onclick="openRemediation()">Voir le plan de remédiation</button>' + '</div>';
}
try {
  renderActiveGrid();
} catch (e) {}

/* ─── Nouveau contrôle ─── */
function openNewCtrl() {
  const fw = FRAMEWORKS[CD_KEY];
  if (!fw) return;
  document.getElementById('nc-sub').textContent = 'Ajouter une exigence au référentiel — ' + fw.name + '.';
  document.getElementById('nc-fn').innerHTML = fw.fns.map((f, i) => '<option value="' + i + '">' + f.code + ' · ' + f.name + '</option>').join('');
  document.getElementById('nc-code').value = '';
  document.getElementById('nc-name').value = '';
  document.getElementById('nc-ctrl').value = '';
  document.getElementById('nc-status').value = 'todo';
  document.getElementById('ctrlModal').classList.add('open');
}
function closeNewCtrl() {
  document.getElementById('ctrlModal').classList.remove('open');
}
function saveNewCtrl() {
  const fw = FRAMEWORKS[CD_KEY];
  if (!fw) return;
  const fi = +document.getElementById('nc-fn').value;
  const code = document.getElementById('nc-code').value.trim();
  const name = document.getElementById('nc-name').value.trim();
  if (!code || !name) {
    showToast('Renseignez la référence et l\u2019intitulé du contrôle');
    return;
  }
  const ov = document.getElementById('nc-owner').value.split('|');
  fw.fns[fi].cats.push({
    code: code,
    name: name,
    ctrl: document.getElementById('nc-ctrl').value.trim() || 'Contrôle personnalisé ajouté au référentiel',
    st: document.getElementById('nc-status').value,
    o: [ov[0], ov[1]],
    _custom: true
  });
  closeNewCtrl();
  if (document.getElementById('conformite-detail').style.display === 'none') {
    openConfDetail(CD_KEY);
  } else {
    cdRender();
  }
  const fn = document.querySelectorAll('#cd-tree .cd-fn')[fi];
  if (fn) fn.classList.add('open');
  showToast('Contrôle ' + code + ' ajouté à ' + fw.fns[fi].code);
}

/* ─── Panneau d'évaluation d'une exigence ─── */
let ASS_FI = 0,
  ASS_CI = 0,
  ASS_ST = 'todo',
  ASS_MAT = 0;
const MAT_DEFAULT = {
  conf: 4,
  part: 3,
  ecart: 1,
  todo: 0,
  na: 0
};
function openAssess(fi, ci) {
  const fw = FRAMEWORKS[CD_KEY];
  if (!fw) return;
  ASS_FI = fi;
  ASS_CI = ci;
  const f = fw.fns[fi],
    x = f.cats[ci];
  ASS_ST = x.st;
  ASS_MAT = x._mat != null ? x._mat : MAT_DEFAULT[x.st];
  document.getElementById('dw-fw').textContent = fw.name;
  document.getElementById('dw-code').textContent = x.code;
  document.getElementById('dw-title').textContent = x.name;
  document.getElementById('dw-ctrl').textContent = x.ctrl;
  // status buttons
  document.getElementById('dw-status').innerHTML = CD_CYCLE.map(k => {
    const s = CD_ST[k];
    return '<div class="dw-st' + (k === ASS_ST ? ' sel' : '') + '" style="color:' + s.col + '" onclick="assSetStatus(\'' + k + '\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">' + s.ic + '</svg><span class="n">' + s.lbl + '</span></div>';
  }).join('');
  assPaintMat();
  // owner select
  const sel = document.getElementById('dw-owner');
  for (const o of sel.options) {
    if (o.value.split('|')[1] === x.o[1]) {
      sel.value = o.value;
      break;
    }
  }
  document.getElementById('dw-note').value = x._note || '';
  // evidence
  if (!x._evid) x._evid = x.st === 'conf' ? [{
    k: 'file',
    n: 'Politique_' + x.code + '.pdf',
    m: 'PDF · 480 Ko',
    t: 'pdf'
  }] : [];
  assPaintEvid();
  assPaintGap();
  document.getElementById('dw-scrim').classList.add('open');
  document.getElementById('dw-panel').classList.add('open');
}
function closeAssess() {
  document.getElementById('dw-scrim').classList.remove('open');
  document.getElementById('dw-panel').classList.remove('open');
}
function assSetStatus(k) {
  ASS_ST = k;
  document.querySelectorAll('#dw-status .dw-st').forEach((el, i) => el.classList.toggle('sel', CD_CYCLE[i] === k));
  if (MAT_DEFAULT[k] != null && (k === 'na' || k === 'todo')) {
    ASS_MAT = 0;
    assPaintMat();
  }
  assPaintGap();
}
function assSetMat(lv, el) {
  ASS_MAT = lv;
  assPaintMat();
}
function assPaintMat() {
  document.querySelectorAll('#dw-maturity .dw-mat-b').forEach((el, i) => el.classList.toggle('sel', i + 1 === ASS_MAT));
}
const EVID_ICO = {
  pdf: {
    cls: '',
    svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    lbl: 'PDF'
  },
  xls: {
    cls: 'xls',
    svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    lbl: 'XLS'
  },
  link: {
    cls: 'link',
    svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>'
  },
  doc: {
    cls: 'doc',
    svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>'
  },
  note: {
    cls: 'note',
    svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>'
  }
};
function assToggleAddMenu(e) {
  e.stopPropagation();
  document.getElementById('dw-addpop').classList.toggle('open');
}
function assPaintEvid() {
  const x = FRAMEWORKS[CD_KEY].fns[ASS_FI].cats[ASS_CI];
  const wrap = document.getElementById('dw-evid');
  if (!x._evid.length) {
    wrap.innerHTML = '<div style="font-size:12px;color:var(--neutral-400);font-weight:600;padding:2px 0">Aucune preuve jointe.</div>';
    return;
  }
  wrap.innerHTML = x._evid.map((e, i) => {
    const ic = EVID_ICO[e.t] || EVID_ICO.pdf;
    const nameHtml = e.k === 'link' && e.url ? '<a href="' + e.url + '" target="_blank" rel="noopener" onclick="event.stopPropagation()">' + e.n + '</a>' : e.n;
    return '<div class="dw-file"><div class="dw-file-ico ' + ic.cls + '">' + (ic.lbl || ic.svg) + '</div><div class="dw-file-b"><div class="dw-file-n">' + nameHtml + '</div><div class="dw-file-m">' + e.m + '</div></div><button class="dw-file-x" onclick="assDelEvidence(' + i + ')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>';
  }).join('');
}
function assAddEvidence(kind) {
  document.getElementById('dw-addpop').classList.remove('open');
  const x = FRAMEWORKS[CD_KEY].fns[ASS_FI].cats[ASS_CI];
  const n = x._evid.length + 1;
  const today = new Date().toLocaleDateString('fr-FR');
  if (kind === 'link') {
    const url = prompt('URL de la preuve :', 'https://');
    if (!url) return;
    let label = url.replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (label.length > 42) label = label.slice(0, 42) + '…';
    x._evid.push({
      k: 'link',
      t: 'link',
      n: label,
      url: url,
      m: 'Lien externe · ' + today
    });
  } else if (kind === 'doc') {
    const ref = prompt('Référence du document (politique / procédure) :', 'PSSI-' + x.code);
    if (!ref) return;
    x._evid.push({
      k: 'doc',
      t: 'doc',
      n: ref,
      m: 'Référence interne · ' + today
    });
  } else if (kind === 'note') {
    const note = prompt('Note / constat :', '');
    if (!note) return;
    x._evid.push({
      k: 'note',
      t: 'note',
      n: note.length > 48 ? note.slice(0, 48) + '…' : note,
      m: 'Note · ' + today
    });
  } else {
    x._evid.push({
      k: 'file',
      t: 'pdf',
      n: 'Preuve_' + x.code + '_' + n + '.pdf',
      m: 'PDF · ' + (120 + n * 37) + ' Ko · ' + today
    });
  }
  assPaintEvid();
  showToast('Preuve ajoutée à l\'exigence ' + x.code);
}
function assDelEvidence(i) {
  const x = FRAMEWORKS[CD_KEY].fns[ASS_FI].cats[ASS_CI];
  x._evid.splice(i, 1);
  assPaintEvid();
}
function assPaintGap() {
  document.getElementById('dw-gap').classList.toggle('show', ASS_ST === 'ecart' || ASS_ST === 'part');
}
function assNav(dir) {
  saveAssess(true);
  const fw = FRAMEWORKS[CD_KEY];
  let fi = ASS_FI,
    ci = ASS_CI + dir;
  while (fi >= 0 && fi < fw.fns.length) {
    const cats = fw.fns[fi].cats;
    if (ci < 0) {
      fi--;
      if (fi < 0) break;
      ci = fw.fns[fi].cats.length - 1;
      continue;
    }
    if (ci >= cats.length) {
      fi++;
      ci = 0;
      continue;
    }
    openAssess(fi, ci);
    return;
  }
  showToast('Fin de la liste des exigences');
}
function saveAssess(silent) {
  const x = FRAMEWORKS[CD_KEY].fns[ASS_FI].cats[ASS_CI];
  x.st = ASS_ST;
  x._mat = ASS_MAT;
  x._note = document.getElementById('dw-note').value;
  const ov = document.getElementById('dw-owner').value.split('|');
  x.o = [ov[0], ov[1]];
  cdRender();
  if (!silent) {
    closeAssess();
    showToast('Exigence ' + x.code + ' mise à jour');
  }
}
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeAssess();
});

/* ─── Lancer une revue ─── */
let RV_MODE = 'auto';
function openReview() {
  const fw = FRAMEWORKS[CD_KEY];
  if (!fw) return;
  document.getElementById('rv-sub').textContent = 'Campagne d\u2019évaluation — ' + fw.name + '.';
  document.getElementById('rv-name').value = 'Revue ' + fw.name + ' — ' + new Date().getFullYear();
  document.getElementById('rv-scope').innerHTML = fw.fns.map((f, i) => '<div class="rv-dom on" data-fi="' + i + '" onclick="rvToggleDom(this)"><div class="rv-dom-check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></div><div class="rv-dom-b"><div class="rv-dom-n">' + f.code + ' · ' + f.name + '</div><div class="rv-dom-m">' + f.cats.length + ' exigences</div></div><div class="rv-dom-cnt">' + f.cats.length + '</div></div>').join('');
  rvCount();
  document.getElementById('reviewModal').classList.add('open');
}
function closeReview() {
  document.getElementById('reviewModal').classList.remove('open');
}
function rvPickMode(el) {
  document.querySelectorAll('#reviewModal .type-pill').forEach(p => p.classList.remove('sel'));
  el.classList.add('sel');
  RV_MODE = el.dataset.mode;
}
function rvToggleDom(el) {
  el.classList.toggle('on');
  const c = el.querySelector('.rv-dom-check');
  rvCount();
}
function rvCount() {
  const fw = FRAMEWORKS[CD_KEY];
  let n = 0;
  document.querySelectorAll('#rv-scope .rv-dom.on').forEach(el => {
    n += fw.fns[+el.dataset.fi].cats.length;
  });
  document.getElementById('rv-count').textContent = n + ' exigence' + (n > 1 ? 's' : '') + ' sélectionnée' + (n > 1 ? 's' : '');
}
function rvLaunch() {
  const n = document.getElementById('rv-count').textContent;
  closeReview();
  showToast('Revue lancée · ' + n);
}

/* ─── Plan de remédiation ─── */
const OWNER_NAMES = {
  PD: 'Paul Dubois',
  MD: 'Marc Dubois',
  SL: 'Sophie Leroy',
  JT: 'Julien Tran',
  AB: 'Alice Bernard'
};
let REM_FILTER = 'all';
function remGaps() {
  const fw = FRAMEWORKS[CD_KEY];
  const out = [];
  fw.fns.forEach(f => f.cats.forEach(x => {
    if (x.st === 'ecart' || x.st === 'part') out.push({
      fw: fw.name,
      fcode: f.code,
      x: x
    });
  }));
  return out;
}
function openRemediation() {
  const fw = FRAMEWORKS[CD_KEY];
  if (!fw) return;
  document.getElementById('rem-title').textContent = 'Plan de remédiation — ' + fw.name;
  REM_FILTER = 'all';
  document.querySelectorAll('#rem-seg .seg-btn').forEach((b, i) => b.classList.toggle('active', i === 0));
  remRender();
  document.getElementById('remModal').classList.add('open');
}
function closeRemediation() {
  document.getElementById('remModal').classList.remove('open');
}
function remFilter(f, el) {
  REM_FILTER = f;
  document.querySelectorAll('#rem-seg .seg-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  remRender();
}
const REM_PRIO = {
  ecart: 'haute',
  part: 'moyenne'
};
const REM_ACT = {
  ecart: 'Formaliser et déployer le contrôle manquant, puis apporter les preuves.',
  part: 'Compléter la mise en œuvre et documenter les preuves manquantes.'
};
function remRender() {
  const all = remGaps();
  const cntE = all.filter(g => g.x.st === 'ecart').length,
    cntP = all.filter(g => g.x.st === 'part').length;
  const late = Math.min(2, cntE);
  document.getElementById('rem-sub').textContent = cntE + cntP + ' exigence(s) à traiter — ' + cntE + ' écart(s), ' + cntP + ' partiel(s).';
  document.getElementById('rem-kpis').innerHTML = '<div class="rem-kpi"><div class="n" style="color:var(--state-danger)">' + cntE + '</div><div class="l">Écarts à corriger</div></div>' + '<div class="rem-kpi"><div class="n" style="color:var(--brand-gold-700)">' + cntP + '</div><div class="l">Conformités partielles</div></div>' + '<div class="rem-kpi"><div class="n" style="color:var(--state-warning)">' + late + '</div><div class="l">Actions en retard</div></div>' + '<div class="rem-kpi"><div class="n" style="color:var(--brand-ink)">' + (cntE + cntP) + '</div><div class="l">Actions ouvertes</div></div>';
  const rows = all.filter(g => REM_FILTER === 'all' || g.x.st === REM_FILTER);
  const body = document.getElementById('rem-body');
  if (!rows.length) {
    body.innerHTML = '<tr><td colspan="6" class="rem-empty">Aucune action de remédiation dans cette catégorie.</td></tr>';
    return;
  }
  body.innerHTML = rows.map((g, i) => {
    const prio = g.x._prio || REM_PRIO[g.x.st];
    const due = g.x._actiondue || ['30 sept. 2026', '15 oct. 2026', '31 oct. 2026', '20 nov. 2026'][i % 4];
    const act = g.x._action || REM_ACT[g.x.st];
    return '<tr><td><span class="rem-code">' + g.x.code + '</span></td>' + '<td><div class="rem-req">' + g.x.name + '</div><div class="rem-fw">' + g.fcode + '</div></td>' + '<td class="rem-action">' + act + '</td>' + '<td><div style="display:flex;align-items:center;gap:8px">' + av(g.x.o[0], g.x.o[1]) + '<span>' + (OWNER_NAMES[g.x.o[1]] || g.x.o[1]) + '</span></div></td>' + '<td>' + due + '</td>' + '<td><span class="rem-prio rem-p-' + prio + '">' + prio.charAt(0).toUpperCase() + prio.slice(1) + '</span></td></tr>';
  }).join('');
}
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/modules/conformite.js", error: String((e && e.message) || e) }); }

// ui_kits/app/modules/equipes.js
try { (() => {
/* Équipes — planning éditable
   Extrait de « Refonte Portail Client.html ». Script classique, portée globale partagée.
   Chargé avant le script principal. Dépendances globales : fmtEur(), showToast(), showView(). */

/* ═══════════ ÉQUIPES · planning éditable ═══════════ */
const EQ_MEMBERS = [{
  id: 'jt',
  ini: 'JT',
  av: 'av-1',
  name: 'Julien Thomas',
  role: 'Lead technique',
  team: 'Développement',
  lead: true
}, {
  id: 'md',
  ini: 'MD',
  av: 'av-2',
  name: 'Marc Dupont',
  role: 'Chef de projet',
  team: 'Développement'
}, {
  id: 'cn',
  ini: 'CN',
  av: 'av-5',
  name: 'Camille Noël',
  role: 'Développeuse',
  team: 'Développement'
}, {
  id: 'ab',
  ini: 'AB',
  av: 'av-6',
  name: 'Alice Bernard',
  role: 'Lead UX & Design',
  team: 'Design & UX',
  lead: true
}, {
  id: 'sl',
  ini: 'SL',
  av: 'av-3',
  name: 'Sophie Leroy',
  role: 'Architecte système',
  team: 'Infrastructure',
  lead: true
}, {
  id: 'pd',
  ini: 'PD',
  av: 'av-4',
  name: 'Paul Dubois',
  role: 'Data Engineer',
  team: 'Infrastructure'
}];
const EQ_ASSIGN = {
  portail: {
    label: 'Portail Client',
    sub: '7h',
    c: 'var(--state-info)',
    bg: 'var(--state-info-bg)'
  },
  cloud: {
    label: 'Migration Cloud',
    sub: '7h',
    c: 'var(--teal)',
    bg: 'var(--teal-bg)'
  },
  sirh: {
    label: 'SI RH',
    sub: '7h',
    c: 'var(--purple)',
    bg: 'var(--purple-bg)'
  },
  dora: {
    label: 'Conformité DORA',
    sub: '7h',
    c: 'var(--brand-gold-700)',
    bg: 'var(--brand-gold-050)'
  },
  teletravail: {
    label: 'Télétravail',
    sub: '',
    c: 'var(--state-success)',
    bg: 'var(--state-success-bg)'
  },
  formation: {
    label: 'Formation',
    sub: '',
    c: '#A02A52',
    bg: '#F6D7E3'
  },
  conge: {
    label: 'Congé',
    sub: '',
    c: 'var(--neutral-500)',
    bg: 'var(--neutral-100)'
  }
};
const EQ_BASE = {
  jt: ['portail', 'portail', 'cloud', 'portail', 'formation'],
  md: ['portail', 'portail', 'portail', 'teletravail', 'portail'],
  cn: ['portail', 'cloud', 'cloud', 'portail', 'teletravail'],
  ab: ['portail', 'portail', 'sirh', 'teletravail', 'portail'],
  sl: ['cloud', 'cloud', 'dora', 'cloud', 'teletravail'],
  pd: ['sirh', 'sirh', 'conge', 'conge', 'sirh']
};
const EQ_MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const EQ_DAYNAMES = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'];
function eqBuildWeeks() {
  const base = new Date(2025, 4, 12); // lundi 12 mai (semaine courante = index 1)
  const arr = [];
  for (let i = 0; i < 5; i++) {
    const mon = new Date(base);
    mon.setDate(base.getDate() + (i - 1) * 7);
    const days = [];
    for (let d = 0; d < 5; d++) {
      const dt = new Date(mon);
      dt.setDate(mon.getDate() + d);
      const dm = dt.getDate() + ' ' + EQ_MONTHS[dt.getMonth()];
      days.push({
        n: EQ_DAYNAMES[d],
        d: dm,
        full: EQ_DAYNAMES[d] + ' ' + dm
      });
    }
    const fri = new Date(mon);
    fri.setDate(mon.getDate() + 4);
    arr.push({
      label: mon.getDate() + ' – ' + fri.getDate() + ' ' + EQ_MONTHS[fri.getMonth()] + ' 2025',
      short: 'Semaine ' + (19 + i),
      days
    });
  }
  return arr;
}
const EQ_WEEKS = eqBuildWeeks();
const EQ_TODAY = {
  w: 1,
  d: 2
};
let eqWeekIdx = 1,
  eqTeamFilter = 'all',
  eqEdit = {
    mid: null,
    day: null,
    val: null
  };
let eqPlan = {};
try {
  eqPlan = JSON.parse(localStorage.getItem('starium_eq_plan')) || {};
} catch (e) {
  eqPlan = {};
}
function eqPersist() {
  try {
    localStorage.setItem('starium_eq_plan', JSON.stringify(eqPlan));
  } catch (e) {}
}
function eqGetRow(mid) {
  eqPlan[mid] = eqPlan[mid] || {};
  if (!eqPlan[mid][eqWeekIdx]) eqPlan[mid][eqWeekIdx] = (EQ_BASE[mid] || [null, null, null, null, null]).slice();
  return eqPlan[mid][eqWeekIdx];
}
function eqBlockHtml(key) {
  if (!key) return '<div class="pg-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></div>';
  const a = EQ_ASSIGN[key];
  if (!a) return '';
  return '<div class="pg-block" style="background:' + a.bg + ';border-color:' + a.c + ';color:' + a.c + '"><span class="pg-block-t">' + a.label + '</span>' + (a.sub ? '<span class="pg-block-s">' + a.sub + '</span>' : '') + '</div>';
}
function renderPlan() {
  const wrap = document.getElementById('planGridWrap');
  if (!wrap) return;
  const wk = EQ_WEEKS[eqWeekIdx];
  const lbl = document.getElementById('planWeekLabel');
  if (lbl) lbl.textContent = wk.label;
  let html = '<table class="plangrid"><thead><tr><th class="pg-mcol">Membre</th>';
  wk.days.forEach((d, i) => {
    const t = eqWeekIdx === EQ_TODAY.w && i === EQ_TODAY.d;
    html += '<th class="pg-day' + (t ? ' today' : '') + '">' + d.n + '<div class="pg-day-d">' + d.d + '</div></th>';
  });
  html += '</tr></thead><tbody>';
  const rows = EQ_MEMBERS.filter(m => eqTeamFilter === 'all' || m.team === eqTeamFilter);
  rows.forEach(m => {
    html += '<tr><td><div class="pg-member"><div class="av ' + m.av + '">' + m.ini + '</div><div><div class="pg-member-name">' + m.name + '</div><div class="pg-member-role">' + (m.lead ? '<span class="lead-dot">● </span>' : '') + m.role + '</div></div></div></td>';
    const row = eqGetRow(m.id);
    for (let i = 0; i < 5; i++) {
      const t = eqWeekIdx === EQ_TODAY.w && i === EQ_TODAY.d;
      html += '<td class="pg-cell' + (t ? ' today' : '') + '" onclick="eqEditCell(event,\'' + m.id + '\',' + i + ')">' + eqBlockHtml(row[i]) + '</td>';
    }
    html += '</tr>';
  });
  html += '</tbody></table>';
  wrap.innerHTML = html;
}
function eqWeek(dir) {
  eqWeekIdx = Math.max(0, Math.min(EQ_WEEKS.length - 1, eqWeekIdx + dir));
  eqCloseEdit();
  renderPlan();
}
function eqToday() {
  eqWeekIdx = EQ_TODAY.w;
  eqCloseEdit();
  renderPlan();
}
function eqSetFilter(v) {
  eqTeamFilter = v;
  eqCloseEdit();
  renderPlan();
}
function eqSwitch(tab) {
  document.querySelectorAll('.eq-switch button').forEach(b => b.classList.toggle('active', b.dataset.eqtab === tab));
  const eq = document.getElementById('eq-sub-equipes'),
    pl = document.getElementById('eq-sub-planning');
  if (eq) eq.hidden = tab !== 'equipes';
  if (pl) pl.hidden = tab !== 'planning';
  if (tab === 'planning') renderPlan();else eqCloseEdit();
}
function eqOpenPlanning(team) {
  eqTeamFilter = team || 'all';
  const sel = document.getElementById('eqTeamFilter');
  if (sel) sel.value = eqTeamFilter;
  eqSwitch('planning');
}
function eqRenderOpts() {
  const box = document.getElementById('peOpts');
  if (!box) return;
  let h = '';
  Object.keys(EQ_ASSIGN).forEach(k => {
    const a = EQ_ASSIGN[k];
    h += '<button class="pe-opt' + (eqEdit.val === k ? ' sel' : '') + '" onclick="eqPick(\'' + k + '\')"><i style="background:' + a.c + '"></i>' + a.label + '</button>';
  });
  box.innerHTML = h;
}
function eqPick(k) {
  eqEdit.val = eqEdit.val === k ? null : k;
  eqRenderOpts();
}
function eqEditCell(e, mid, day) {
  e.stopPropagation();
  eqEdit = {
    mid: mid,
    day: day,
    val: eqGetRow(mid)[day]
  };
  const m = EQ_MEMBERS.find(x => x.id === mid),
    wk = EQ_WEEKS[eqWeekIdx];
  document.getElementById('peTitle').textContent = m.name;
  document.getElementById('peSub').textContent = wk.days[day].full + ' · ' + wk.short;
  eqRenderOpts();
  const pop = document.getElementById('pePop'),
    bd = document.getElementById('peBackdrop');
  bd.classList.add('open');
  pop.classList.add('open');
  const r = e.currentTarget.getBoundingClientRect();
  const pw = 280,
    ph = pop.offsetHeight || 320;
  let left = r.left,
    top = r.bottom + 8;
  if (left + pw > window.innerWidth - 12) left = window.innerWidth - pw - 12;
  if (top + ph > window.innerHeight - 12) top = r.top - ph - 8;
  pop.style.left = Math.max(12, left) + 'px';
  pop.style.top = Math.max(12, top) + 'px';
}
function eqSaveCell() {
  if (eqEdit.mid) {
    eqGetRow(eqEdit.mid)[eqEdit.day] = eqEdit.val;
    eqPersist();
    renderPlan();
  }
  eqCloseEdit();
}
function eqClearCell() {
  if (eqEdit.mid) {
    eqGetRow(eqEdit.mid)[eqEdit.day] = null;
    eqPersist();
    renderPlan();
  }
  eqCloseEdit();
}
function eqCloseEdit() {
  const p = document.getElementById('pePop'),
    b = document.getElementById('peBackdrop');
  if (p) p.classList.remove('open');
  if (b) b.classList.remove('open');
}
renderPlan();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/modules/equipes.js", error: String((e && e.message) || e) }); }

// ui_kits/app/modules/plans-action.js
try { (() => {
/* Plans d'action — kanban et pilotage
   Extrait de « Refonte Portail Client.html ». Script classique, portée globale partagée.
   Chargé avant le script principal. Dépendances globales : fmtEur(), showToast(), showView(). */

/* ─── Plans d'action · sélection puis pilotage ─── */
const PA_PLANS = [{
  id: 'all',
  name: 'Vue consolidée',
  sub: 'Tous les projets',
  proj: null,
  ico: '<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  bg: 'var(--neutral-100)',
  fg: 'var(--neutral-600)'
}, {
  id: 'portail',
  name: 'Refonte Portail Client',
  sub: 'Espace client & self-care',
  proj: 'Refonte Portail Client',
  ico: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
  bg: 'var(--state-info-bg)',
  fg: 'var(--state-info)'
}, {
  id: 'cloud',
  name: 'Migration Cloud',
  sub: 'Infrastructure & hébergement',
  proj: 'Migration Cloud',
  ico: '<path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>',
  bg: 'var(--teal-bg)',
  fg: 'var(--teal)'
}, {
  id: 'rgpd',
  name: 'Conformité RGPD',
  sub: 'Protection des données',
  proj: 'Conformité RGPD',
  ico: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  bg: 'var(--purple-bg)',
  fg: 'var(--purple)'
}, {
  id: 'bi',
  name: 'Data & BI Finance',
  sub: 'Pilotage de la donnée',
  proj: 'Data & BI Finance',
  ico: '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
  bg: 'var(--brand-gold-050)',
  fg: 'var(--brand-gold-700)'
}];
const PA_OWNERS = [{
  id: 'jt',
  ini: 'JT',
  av: 'av-1',
  name: 'Julien Thomas'
}, {
  id: 'md',
  ini: 'MD',
  av: 'av-2',
  name: 'Marc Dupont'
}, {
  id: 'sl',
  ini: 'SL',
  av: 'av-3',
  name: 'Sophie Leroy'
}, {
  id: 'pd',
  ini: 'PD',
  av: 'av-4',
  name: 'Paul Dubois'
}, {
  id: 'ab',
  ini: 'AB',
  av: 'av-6',
  name: 'Alice Bernard'
}];
const PA_COLS = [{
  key: 'afaire',
  label: 'À faire',
  dot: 'var(--neutral-400)'
}, {
  key: 'encours',
  label: 'En cours',
  dot: 'var(--state-info)'
}, {
  key: 'revue',
  label: 'En revue',
  dot: 'var(--purple)'
}, {
  key: 'termine',
  label: 'Terminé',
  dot: 'var(--state-success)'
}];
const PA_PRIO = {
  haute: {
    label: 'Priorité haute',
    tag: 'tg-red',
    dot: 'var(--state-danger)'
  },
  moyenne: {
    label: 'Priorité moyenne',
    tag: 'tg-gold',
    dot: 'var(--brand-gold)'
  },
  basse: {
    label: 'Priorité basse',
    tag: 'tg-neutral',
    dot: 'var(--state-success)'
  }
};
let PA_ACTIONS = [{
  id: 1,
  title: "Finaliser la matrice de droits d'accès",
  project: 'Refonte Portail Client',
  prio: 'haute',
  status: 'afaire',
  due: '2026-06-20',
  dueLabel: '20 juin',
  owner: 'sl',
  progress: null
}, {
  id: 2,
  title: 'Cadrer le plan de bascule des données',
  project: 'Migration Cloud',
  prio: 'moyenne',
  status: 'afaire',
  due: '2026-07-22',
  dueLabel: '22 juil.',
  owner: 'jt',
  progress: null
}, {
  id: 3,
  title: 'Mettre à jour le registre des traitements',
  project: 'Conformité RGPD',
  prio: 'basse',
  status: 'afaire',
  due: '2026-08-05',
  dueLabel: '5 août',
  owner: 'ab',
  progress: null
}, {
  id: 4,
  title: 'Sécuriser la disponibilité du prestataire',
  project: 'Migration Cloud',
  prio: 'haute',
  status: 'encours',
  due: '2026-07-16',
  dueLabel: '16 juil.',
  owner: 'sl',
  progress: 40
}, {
  id: 5,
  title: 'Animer les ateliers UX métiers',
  project: 'Refonte Portail Client',
  prio: 'moyenne',
  status: 'encours',
  due: '2026-07-23',
  dueLabel: '23 juil.',
  owner: 'md',
  progress: 65
}, {
  id: 6,
  title: "Documenter les flux d'intégration API",
  project: 'Data & BI Finance',
  prio: 'basse',
  status: 'encours',
  due: '2026-08-02',
  dueLabel: '2 août',
  owner: 'jt',
  progress: 30
}, {
  id: 7,
  title: "Valider la maquette de l'espace client",
  project: 'Refonte Portail Client',
  prio: 'moyenne',
  status: 'revue',
  due: '2026-07-15',
  dueLabel: '15 juil.',
  owner: 'ab',
  progress: null
}, {
  id: 8,
  title: 'Revue du plan de tests de recette',
  project: 'Refonte Portail Client',
  prio: 'basse',
  status: 'revue',
  due: '2026-07-28',
  dueLabel: '28 juil.',
  owner: 'md',
  progress: null
}, {
  id: 9,
  title: 'Cadrage des exigences fonctionnelles',
  project: 'Refonte Portail Client',
  prio: 'moyenne',
  status: 'termine',
  due: '2026-06-30',
  dueLabel: '30 juin',
  owner: 'md',
  progress: 100
}, {
  id: 10,
  title: 'Audit RGPD des sous-traitants',
  project: 'Conformité RGPD',
  prio: 'basse',
  status: 'termine',
  due: '2026-06-25',
  dueLabel: '25 juin',
  owner: 'jt',
  progress: 100
}];
let paNextId = 11,
  paCurrentId = 'all',
  paEditingId = null,
  paDragId = null,
  paLayout = 'kanban';
const PA_STATUS_META = {
  afaire: {
    label: 'À faire',
    c: 'var(--neutral-600)',
    bg: 'var(--neutral-100)'
  },
  encours: {
    label: 'En cours',
    c: 'var(--state-info)',
    bg: 'var(--state-info-bg)'
  },
  revue: {
    label: 'En revue',
    c: 'var(--purple)',
    bg: 'var(--purple-bg)'
  },
  termine: {
    label: 'Terminé',
    c: 'var(--state-success)',
    bg: 'var(--state-success-bg)'
  }
};
function paIconFor(project) {
  const p = PA_PLANS.find(x => x.proj === project);
  return p ? p.ico : '<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>';
}
function paIsLate(a) {
  if (a.status === 'termine') return false;
  return new Date(a.due) < new Date('2026-07-04');
}
function paFilteredActions(proj) {
  const statusF = (document.getElementById('pa-status-filter') || {}).value || 'all';
  const ownerF = (document.getElementById('pa-owner-filter') || {}).value || 'all';
  const q = ((document.getElementById('pa-search') || {}).value || '').trim().toLowerCase();
  return PA_ACTIONS.filter(a => {
    if (proj && a.project !== proj) return false;
    if (statusF !== 'all' && a.status !== statusF) return false;
    if (ownerF !== 'all' && a.owner !== ownerF) return false;
    if (q && !a.title.toLowerCase().includes(q)) return false;
    return true;
  });
}
function paStats(proj) {
  const items = PA_ACTIONS.filter(a => !proj || a.project === proj);
  const total = items.length,
    done = items.filter(a => a.status === 'termine').length;
  const cours = items.filter(a => a.status === 'encours').length;
  const late = items.filter(a => paIsLate(a)).length;
  const taux = total ? Math.round(done / total * 100) : 0;
  return {
    total,
    open: total - done,
    cours,
    late,
    taux
  };
}
function paProgClass(p) {
  return p < 50 ? 'pf-bad' : p < 80 ? 'pf-warn' : 'pf-blue';
}
function paCardHTML(a) {
  const pr = PA_PRIO[a.prio],
    own = PA_OWNERS.find(o => o.id === a.owner) || PA_OWNERS[0];
  const done = a.status === 'termine',
    late = paIsLate(a);
  const tag = done ? '<span class="kcard-tag" style="background:var(--state-success-bg);color:var(--state-success)">Réalisé</span>' : '<span class="kcard-tag ' + pr.tag + '">' + pr.label + '</span>';
  const titleStyle = done ? ' style="text-decoration:line-through;text-decoration-color:var(--neutral-300)"' : '';
  const wrapStyle = done ? 'flex:1;opacity:.78' : 'flex:1';
  const dueIcon = done ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>' : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
  const dueClass = done ? 'kcard-due' : 'kcard-due' + (late ? ' late' : '');
  const dueColor = done ? ' style="color:var(--state-success)"' : '';
  const prog = a.status === 'encours' && a.progress != null ? '<div class="prog-cell" style="margin:0 0 10px"><div class="ptrack"><div class="pfill ' + paProgClass(a.progress) + '" style="width:' + a.progress + '%"></div></div><span class="prog-pct">' + a.progress + '%</span></div>' : '';
  return '<div class="kcard" draggable="true" ondragstart="paDragStart(event,' + a.id + ')" ondragend="paDragEnd(event)" onclick="paEditAction(' + a.id + ')">' + '<div style="display:flex"><div class="kprio" style="background:' + (done ? 'var(--state-success)' : pr.dot) + '"></div><div style="' + wrapStyle + '">' + '<div class="kcard-top">' + tag + '</div>' + '<div class="kcard-title"' + titleStyle + '>' + a.title + '</div>' + '<div class="kcard-proj"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">' + paIconFor(a.project) + '</svg>' + a.project + '</div>' + prog + '<div class="kcard-foot"><span class="' + dueClass + '"' + dueColor + '>' + dueIcon + a.dueLabel + '</span><div class="kav ' + own.av + '">' + own.ini + '</div></div>' + '</div></div></div>';
}
function paRenderKanban(proj) {
  const wrap = document.getElementById('pa-kanban');
  if (!wrap) return;
  const items = paFilteredActions(proj);
  wrap.innerHTML = PA_COLS.map(c => {
    const colItems = items.filter(a => a.status === c.key);
    return '<div class="kcol" data-status="' + c.key + '" ondragover="paDragOver(event)" ondragleave="paDragLeave(event)" ondrop="paDrop(event,\'' + c.key + '\')">' + '<div class="kcol-head"><div class="kcol-title"><span class="kcol-dot" style="background:' + c.dot + '"></span>' + c.label + '</div><span class="kcol-count">' + colItems.length + '</span></div>' + (colItems.length ? colItems.map(paCardHTML).join('') : '<div class="kcard-empty-hint">Glissez une action ici</div>') + '</div>';
  }).join('');
}
function paRowHTML(a) {
  const pr = PA_PRIO[a.prio],
    st = PA_STATUS_META[a.status],
    own = PA_OWNERS.find(o => o.id === a.owner) || PA_OWNERS[0];
  const late = paIsLate(a);
  const prog = a.progress != null ? '<div class="prog-cell"><div class="ptrack"><div class="pfill ' + paProgClass(a.progress) + '" style="width:' + a.progress + '%"></div></div><span class="prog-pct">' + a.progress + '%</span></div>' : '<span style="color:var(--neutral-300)">—</span>';
  return '<tr class="pa-row" onclick="paEditAction(' + a.id + ')">' + '<td><div class="pa-row-title"><i style="background:' + pr.dot + '"></i>' + a.title + '</div></td>' + '<td>' + a.project + '</td>' + '<td>' + pr.label.replace('Priorité ', '') + '</td>' + '<td><span class="pa-status-pill" style="background:' + st.bg + ';color:' + st.c + '">' + st.label + '</span></td>' + '<td style="' + (late ? 'color:var(--state-danger);font-weight:700' : '') + '">' + a.dueLabel + (late ? ' · retard' : '') + '</td>' + '<td><div style="display:flex;align-items:center;gap:8px"><div class="kav ' + own.av + '">' + own.ini + '</div>' + own.name + '</div></td>' + '<td style="min-width:130px">' + prog + '</td>' + '<td class="right"><div class="pa-row-actions"><button class="pa-icon-btn" onclick="event.stopPropagation();paEditAction(' + a.id + ')" aria-label="Modifier"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button><button class="pa-icon-btn" onclick="event.stopPropagation();paDeleteFromList(' + a.id + ')" aria-label="Supprimer" style="color:var(--state-danger)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button></div></td>' + '</tr>';
}
function paRenderList(proj) {
  const tbody = document.getElementById('pa-list-tbody');
  if (!tbody) return;
  const items = paFilteredActions(proj).sort((a, b) => new Date(a.due) - new Date(b.due));
  tbody.innerHTML = items.length ? items.map(paRowHTML).join('') : '<tr class="pa-empty-row"><td colspan="8">Aucune action ne correspond aux filtres.</td></tr>';
}
function paDeleteFromList(id) {
  const a = PA_ACTIONS.find(x => x.id === id);
  PA_ACTIONS = PA_ACTIONS.filter(x => x.id !== id);
  paRefresh();
  if (a) showToast('« ' + a.title + ' » supprimée');
}
function paSetLayout(layout) {
  paLayout = layout;
  document.querySelectorAll('#pa-seg .seg-btn').forEach(b => b.classList.toggle('active', b.dataset.layout === layout));
  document.getElementById('pa-kanban').style.display = layout === 'kanban' ? '' : 'none';
  document.getElementById('pa-listcard').style.display = layout === 'list' ? '' : 'none';
  paRefresh();
}
function paDragStart(e, id) {
  paDragId = id;
  e.dataTransfer.effectAllowed = 'move';
  e.currentTarget.classList.add('dragging');
}
function paDragEnd(e) {
  e.currentTarget.classList.remove('dragging');
}
function paDragOver(e) {
  e.preventDefault();
  e.currentTarget.classList.add('kcol-over');
}
function paDragLeave(e) {
  e.currentTarget.classList.remove('kcol-over');
}
function paDrop(e, status) {
  e.preventDefault();
  document.querySelectorAll('#pa-kanban .kcol').forEach(c => c.classList.remove('kcol-over'));
  const a = PA_ACTIONS.find(x => x.id === paDragId);
  paDragId = null;
  if (!a || a.status === status) return;
  a.status = status;
  if (status === 'encours' && a.progress == null) a.progress = 10;
  if (status === 'termine') a.progress = 100;
  paRefresh();
  showToast('« ' + a.title + ' » déplacée vers « ' + PA_COLS.find(c => c.key === status).label + ' »');
}
function paRefresh() {
  const p = PA_PLANS.find(x => x.id === paCurrentId) || PA_PLANS[0];
  if (paLayout === 'list') paRenderList(p.proj);else paRenderKanban(p.proj);
  const s = paStats(p.proj);
  const nums = document.querySelectorAll('#plans-detail .list-kpi-num');
  if (nums[0]) nums[0].textContent = s.open;
  if (nums[1]) nums[1].textContent = s.cours;
  if (nums[2]) nums[2].textContent = s.late;
  if (nums[3]) nums[3].textContent = s.taux + '%';
}
function paPopulateSelects() {
  const projSel = document.getElementById('am-proj'),
    ownSel = document.getElementById('am-owner');
  projSel.innerHTML = PA_PLANS.filter(p => p.proj).map(p => '<option value="' + p.proj + '">' + p.proj + '</option>').join('');
  ownSel.innerHTML = PA_OWNERS.map(o => '<option value="' + o.id + '">' + o.name + '</option>').join('');
  const ownerFilter = document.getElementById('pa-owner-filter');
  if (ownerFilter && ownerFilter.options.length <= 1) {
    ownerFilter.innerHTML = '<option value="all">Responsable · tous</option>' + PA_OWNERS.map(o => '<option value="' + o.id + '">' + o.name + '</option>').join('');
  }
}
function amPickPrio(el) {
  el.parentElement.querySelectorAll('.type-pill').forEach(p => p.classList.remove('sel'));
  el.classList.add('sel');
}
function amStatusChanged() {
  document.getElementById('am-prog-field').style.display = document.getElementById('am-status').value === 'encours' ? '' : 'none';
}
function paEditAction(id) {
  paEditingId = id;
  const a = PA_ACTIONS.find(x => x.id === id);
  if (!a) return;
  paPopulateSelects();
  document.getElementById('am-modaltitle').textContent = "Modifier l'action";
  document.getElementById('am-modalsub').textContent = a.project;
  document.getElementById('am-title').value = a.title;
  document.getElementById('am-proj').value = a.project;
  document.getElementById('am-status').value = a.status;
  document.getElementById('am-owner').value = a.owner;
  document.getElementById('am-due').value = a.due;
  document.getElementById('am-prio').querySelectorAll('.type-pill').forEach(p => p.classList.toggle('sel', p.dataset.prio === a.prio));
  document.getElementById('am-prog').value = a.progress || 40;
  document.getElementById('am-prog-val').textContent = (a.progress || 40) + '%';
  document.getElementById('am-delete').style.display = '';
  amStatusChanged();
  document.getElementById('actionModal').classList.add('open');
}
function paNewAction() {
  paEditingId = null;
  paPopulateSelects();
  document.getElementById('am-modaltitle').textContent = 'Nouvelle action';
  document.getElementById('am-modalsub').textContent = "Créer une action corrective ou d'amélioration";
  document.getElementById('am-title').value = '';
  const p = PA_PLANS.find(x => x.id === paCurrentId);
  document.getElementById('am-proj').value = p && p.proj ? p.proj : PA_PLANS[1].proj;
  document.getElementById('am-status').value = 'afaire';
  document.getElementById('am-owner').value = PA_OWNERS[0].id;
  document.getElementById('am-due').value = '2026-07-15';
  document.getElementById('am-prio').querySelectorAll('.type-pill').forEach(p => p.classList.toggle('sel', p.dataset.prio === 'moyenne'));
  document.getElementById('am-prog').value = 10;
  document.getElementById('am-prog-val').textContent = '10%';
  document.getElementById('am-delete').style.display = 'none';
  amStatusChanged();
  document.getElementById('actionModal').classList.add('open');
}
function paCloseAction() {
  document.getElementById('actionModal').classList.remove('open');
}
function paSaveAction() {
  const title = document.getElementById('am-title').value.trim();
  if (!title) {
    showToast('Merci de renseigner un titre');
    return;
  }
  const prio = (document.getElementById('am-prio').querySelector('.type-pill.sel') || {}).dataset?.prio || 'moyenne';
  const status = document.getElementById('am-status').value;
  const due = document.getElementById('am-due').value || '2026-07-15';
  const dueDate = new Date(due);
  const dueLabel = isNaN(dueDate) ? due : dueDate.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short'
  });
  const progress = status === 'encours' ? +document.getElementById('am-prog').value : status === 'termine' ? 100 : null;
  const data = {
    title,
    project: document.getElementById('am-proj').value,
    prio,
    status,
    due,
    dueLabel,
    owner: document.getElementById('am-owner').value,
    progress
  };
  if (paEditingId) {
    const a = PA_ACTIONS.find(x => x.id === paEditingId);
    Object.assign(a, data);
    showToast('Action mise à jour');
  } else {
    PA_ACTIONS.push(Object.assign({
      id: paNextId++
    }, data));
    showToast('Action créée');
  }
  paCloseAction();
  paRefresh();
}
function paDeleteAction() {
  if (!paEditingId) return;
  const a = PA_ACTIONS.find(x => x.id === paEditingId);
  PA_ACTIONS = PA_ACTIONS.filter(x => x.id !== paEditingId);
  paCloseAction();
  paRefresh();
  if (a) showToast('« ' + a.title + ' » supprimée');
}
function paRenderHome() {
  const grid = document.getElementById('pa-cardgrid');
  if (!grid) return;
  grid.innerHTML = PA_PLANS.map(p => {
    const s = paStats(p.proj);
    return '<div class="mb-card" onclick="paOpen(\'' + p.id + '\')">' + '<div class="mb-card-top"><div class="mb-card-ico" style="background:' + p.bg + ';color:' + p.fg + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">' + p.ico + '</svg></div><div class="mb-card-tt"><div class="mb-card-name">' + p.name + '</div><div class="mb-card-dir">' + p.sub + '</div></div></div>' + '<div class="mb-card-total">Actions ouvertes<br><b>' + s.open + '</b> <span style="font-size:12px;font-weight:600;color:var(--neutral-500)">/ ' + s.total + ' au total</span></div>' + '<div class="mb-card-track"><i style="width:' + s.taux + '%;background:var(--state-success)"></i></div>' + '<div style="display:flex;justify-content:space-between;font-size:11px;font-weight:700"><span style="color:var(--neutral-500)">Réalisé ' + s.taux + '%</span><span style="color:var(--neutral-500)">' + s.cours + ' en cours</span></div>' + '<div class="mb-card-foot"><div>' + (s.late > 0 ? '<span class="mb-card-alert"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/></svg>' + s.late + ' en retard</span>' : '<span class="mcf-k" style="color:var(--state-success);font-weight:700">À jour</span>') + '</div><span class="mb-card-arrow">Ouvrir<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg></span></div>' + '</div>';
  }).join('');
}
function paShowHome() {
  document.getElementById('plans-detail').style.display = 'none';
  document.getElementById('plans-home').style.display = '';
  paRenderHome();
}
function paOpen(id) {
  const p = PA_PLANS.find(x => x.id === id) || PA_PLANS[0];
  paCurrentId = id;
  document.getElementById('plans-home').style.display = 'none';
  document.getElementById('plans-detail').style.display = '';
  document.querySelector('.page-content').scrollTop = 0;
  document.getElementById('pa-title').textContent = p.name;
  document.getElementById('pa-sub').textContent = p.proj ? 'Actions correctives et d\'amélioration du projet ' + p.proj + '.' : 'Pilotez les actions correctives et d\'amélioration sur l\'ensemble des projets.';
  document.getElementById('breadcrumb').innerHTML = '<a onclick="showView(\'list\')">Pilotage</a><span class="bc-sep">/</span><a onclick="paShowHome()">Plans d\'action</a><span class="bc-sep">/</span><span class="bc-current">' + p.name + '</span>';
  paPopulateSelects();
  paRefresh();
}
function showTab(name) {
  document.querySelectorAll('#view-detail .dtab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  document.querySelectorAll('#view-detail .tab-pane').forEach(p => p.classList.toggle('active', p.dataset.pane === name));
  document.querySelector('.page-content').scrollTop = 0;
  if (name === 'pointsprojet') ppSync();
}
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/modules/plans-action.js", error: String((e && e.message) || e) }); }

// ui_kits/app/modules/prep-workspace.js
try { (() => {
/* ═══ ATELIER DE PRÉPARATION — modèles par type, ODJ par sections, sources à reprendre ═══ */
const TPL_DEFAULTS = {
  COPROJ: {
    label: 'Comité projet',
    cadence: 'Hebdomadaire',
    jour: 'Mardi',
    heure: '09:30',
    duree: 45,
    lieu: 'Salle Cadence / Teams',
    parts: ['MD', 'SL', 'JT', 'AB', 'PD'],
    up: 'COPIL',
    auto: true,
    sections: [{
      id: 'suivi',
      title: 'Suivi des actions et décisions précédentes',
      dur: 10,
      nature: 'info',
      pull: ['actions', 'decisions']
    }, {
      id: 'avancement',
      title: 'Avancement des chantiers',
      dur: 15,
      nature: 'info',
      pull: ['jalons', 'taches'],
      legacy: true
    }, {
      id: 'blocages',
      title: 'Points bloquants et arbitrages',
      dur: 10,
      nature: 'arbitrage',
      pull: ['arbs', 'risks']
    }, {
      id: 'remontee',
      title: 'Sujets à remonter au COPIL',
      dur: 5,
      nature: 'decision',
      pull: []
    }, {
      id: 'divers',
      title: 'Questions diverses',
      dur: 5,
      nature: 'info',
      pull: []
    }]
  },
  COPIL: {
    label: 'Comité de pilotage',
    cadence: 'Mensuel',
    jour: 'Vendredi',
    heure: '14:00',
    duree: 90,
    lieu: 'Salle Horizon / Teams',
    parts: ['MD', 'SL', 'JT', 'PD', 'AB', 'CL'],
    up: 'CODIR',
    auto: true,
    sections: [{
      id: 'synthese',
      title: 'Synthèse des COPROJ depuis le dernier COPIL',
      dur: 15,
      nature: 'info',
      pull: ['remontes']
    }, {
      id: 'suivi',
      title: 'Décisions précédentes et actions',
      dur: 10,
      nature: 'info',
      pull: ['decisions', 'actions']
    }, {
      id: 'avancement',
      title: 'Avancement, budget, jalons',
      dur: 20,
      nature: 'info',
      pull: ['jalons'],
      legacy: true
    }, {
      id: 'arbitrages',
      title: 'Décisions et arbitrages attendus',
      dur: 25,
      nature: 'arbitrage',
      pull: ['arbs']
    }, {
      id: 'risques',
      title: 'Risques et plan de maîtrise',
      dur: 10,
      nature: 'decision',
      pull: ['risks']
    }, {
      id: 'divers',
      title: 'Points divers',
      dur: 10,
      nature: 'info',
      pull: []
    }]
  },
  COTECH: {
    label: 'Comité technique',
    cadence: 'Bimensuel',
    jour: 'Jeudi',
    heure: '11:00',
    duree: 60,
    lieu: 'Salle Atelier / Teams',
    parts: ['JT', 'PD', 'AB'],
    up: 'COPROJ',
    auto: true,
    sections: [{
      id: 'archi',
      title: 'Architecture et dette technique',
      dur: 20,
      nature: 'info',
      pull: ['taches'],
      legacy: true
    }, {
      id: 'ssi',
      title: 'Sécurité et conformité',
      dur: 15,
      nature: 'info',
      pull: ['risks']
    }, {
      id: 'arbit',
      title: 'Arbitrages techniques',
      dur: 20,
      nature: 'arbitrage',
      pull: ['arbs']
    }, {
      id: 'divers',
      title: 'Questions diverses',
      dur: 5,
      nature: 'info',
      pull: []
    }]
  },
  CODIR: {
    label: 'Comité de direction',
    cadence: 'Trimestriel',
    jour: 'Lundi',
    heure: '09:00',
    duree: 120,
    lieu: 'Salle du Conseil',
    parts: ['CL', 'MD', 'SL'],
    up: null,
    auto: false,
    sections: [{
      id: 'portefeuille',
      title: 'Revue du portefeuille',
      dur: 40,
      nature: 'info',
      pull: ['remontes'],
      legacy: true
    }, {
      id: 'arbit',
      title: 'Arbitrages stratégiques',
      dur: 50,
      nature: 'arbitrage',
      pull: ['arbs', 'decisions']
    }, {
      id: 'risques',
      title: 'Risques majeurs',
      dur: 20,
      nature: 'decision',
      pull: ['risks']
    }, {
      id: 'divers',
      title: 'Points divers',
      dur: 10,
      nature: 'info',
      pull: []
    }]
  },
  CRA: {
    label: 'Revue de portefeuille',
    cadence: 'Mensuel',
    jour: 'Mercredi',
    heure: '10:00',
    duree: 60,
    lieu: 'Teams',
    parts: ['MD', 'AB', 'SL', 'PD'],
    up: 'CODIR',
    auto: true,
    sections: [{
      id: 'avancement',
      title: 'Avancement des projets',
      dur: 30,
      nature: 'info',
      pull: ['jalons'],
      legacy: true
    }, {
      id: 'alertes',
      title: 'Projets en alerte — remédiation',
      dur: 15,
      nature: 'decision',
      pull: ['risks']
    }, {
      id: 'arbit',
      title: 'Arbitrages ressources',
      dur: 15,
      nature: 'arbitrage',
      pull: ['arbs']
    }]
  },
  COMEX: {
    label: 'Comité exécutif',
    cadence: 'Trimestriel',
    jour: 'Mercredi',
    heure: '09:00',
    duree: 90,
    lieu: 'Salle du Conseil',
    parts: ['CL', 'MD'],
    up: null,
    auto: false,
    sections: [{
      id: 'arbit',
      title: 'Arbitrages budgétaires',
      dur: 60,
      nature: 'arbitrage',
      pull: ['arbs', 'decisions'],
      legacy: true
    }, {
      id: 'risques',
      title: 'Risques majeurs',
      dur: 20,
      nature: 'decision',
      pull: ['risks']
    }, {
      id: 'divers',
      title: 'Points divers',
      dur: 10,
      nature: 'info',
      pull: []
    }]
  },
  ADH: {
    label: 'Point ad hoc',
    cadence: 'Ponctuel',
    jour: '—',
    heure: '16:00',
    duree: 30,
    lieu: 'Teams',
    parts: ['MD', 'SL'],
    up: 'COPROJ',
    auto: false,
    sections: [{
      id: 'sujet',
      title: 'Sujet du point',
      dur: 20,
      nature: 'info',
      pull: [],
      legacy: true
    }, {
      id: 'decision',
      title: 'Décision',
      dur: 10,
      nature: 'decision',
      pull: ['arbs']
    }]
  }
};
/* ═══ ÉQUIPES DU PROJET — COPIL, COPROJ, COTECH… créées sur le projet, reprises dans les points ═══ */
const TEAMS_KEY = 'starium.teams.v1',
  DIR_KEY = 'starium.dir.v1';
/* personnes ajoutées à la main — fusionnées dans l'annuaire au chargement */
(function () {
  try {
    const s = JSON.parse(localStorage.getItem(DIR_KEY) || '{}');
    Object.keys(s).forEach(k => {
      if (!DIR[k]) DIR[k] = s[k];
    });
  } catch (e) {}
})();
function dirSaveExtra(ini) {
  try {
    const s = JSON.parse(localStorage.getItem(DIR_KEY) || '{}');
    s[ini] = DIR[ini];
    localStorage.setItem(DIR_KEY, JSON.stringify(s));
  } catch (e) {}
}
const TEAM_COLORS = ['var(--brand-gold-700)', 'var(--state-info)', 'var(--purple)', 'var(--teal)', 'var(--state-success)', 'var(--state-danger)'];
let TEAMS = function () {
  try {
    const s = JSON.parse(localStorage.getItem(TEAMS_KEY) || 'null');
    if (Array.isArray(s) && s.length) return s;
  } catch (e) {}
  return ['COPROJ', 'COPIL', 'COTECH'].map((k, i) => ({
    id: k.toLowerCase(),
    name: k,
    label: TPL_DEFAULTS[k].label,
    members: TPL_DEFAULTS[k].parts.slice(),
    color: TEAM_COLORS[i]
  }));
}();
function teamsSave() {
  try {
    localStorage.setItem(TEAMS_KEY, JSON.stringify(TEAMS));
  } catch (e) {}
}
function teamById(id) {
  return TEAMS.find(t => t.id === id);
}
function teamForType(type) {
  return TEAMS.find(t => t.name.toUpperCase() === String(type || '').toUpperCase());
}
function teamAvs(t, max) {
  const m = t.members.slice(0, max || 5);
  return '<span class="pw-avs">' + m.map(k => avHtml(k, DIR[k] && DIR[k][3] || 'av-1')).join('') + '</span>' + (t.members.length > m.length ? '<span class="pw-avs-more">+' + (t.members.length - m.length) + '</span>' : '');
}
/* vue Équipes (onglet projet) */
function teamUsage(t) {
  const n = Object.keys(INST_PREP || {}).filter(k => INST_PREP[k].team === t.id || String(INST_PREP[k].type || '').toUpperCase() === t.name.toUpperCase()).length;
  return n ? n + ' point' + (n > 1 ? 's' : '') + ' projet' : 'Aucun point rattaché';
}
window.pwRenderTeamsPane = function () {
  const el = document.getElementById('tmp-grid');
  if (!el) return;
  el.innerHTML = TEAMS.map(t => {
    const lead = t.members[0];
    return '<div class="card tmp-card" onclick="pwOpenTeams(\'' + t.id + '\')"><div class="tmp-bar" style="background:' + t.color + '"></div>' + '<div class="tmp-b"><div class="tmp-n">' + t.name + '</div><div class="tmp-l">' + (t.label || 'Équipe projet') + '</div>' + '<div class="tmp-avs">' + t.members.map(k => '<span class="tmp-av" title="' + dirName(k) + '">' + avHtml(k, DIR[k] && DIR[k][3] || 'av-1') + '</span>').join('') + (t.members.length ? '' : '<span class="tmp-empty">Aucun membre</span>') + '</div>' + '<div class="tmp-f"><span>' + t.members.length + ' membre' + (t.members.length > 1 ? 's' : '') + '</span><span>' + teamUsage(t) + '</span>' + (lead ? '<span>Pilote : ' + dirName(lead) + '</span>' : '') + '</div></div></div>';
  }).join('') + '<div class="tmp-card tmp-add" onclick="tmNewFromPane()"><span>+ Nouvelle équipe</span><small>COPIL, COTECH, comité risques…</small></div>';
};
window.tmNewFromPane = function () {
  pwOpenTeams();
  tmNew();
};
/* convoquer une équipe entière dans la préparation courante */
function pwConvokeTeam(id) {
  if (!id) return;
  const t = teamById(id),
    x = INST_PREP[curPrepKey];
  if (!t || !x) return;
  let n = 0;
  t.members.forEach(k => {
    if (!x.parts.some(p => p[0] === k)) {
      x.parts.push([k, DIR[k] && DIR[k][3] || 'av-' + (1 + x.parts.length % 6)]);
      n++;
    }
  });
  x.partsN = Math.max(x.partsN || 0, x.parts.length);
  x.team = t.id;
  prepRerender();
  showToast(n ? t.name + ' · ' + n + ' participant' + (n > 1 ? 's' : '') + ' convoqué' + (n > 1 ? 's' : '') : 'Toute l\'équipe ' + t.name + ' est déjà convoquée');
}
function pwTeamsPicker(x) {
  const cur = x.team && teamById(x.team);
  const opts = TEAMS.map(t => '<option value="' + t.id + '"' + (cur && cur.id === t.id ? ' selected' : '') + '>' + t.name + ' — ' + t.members.length + ' membre' + (t.members.length > 1 ? 's' : '') + '</option>').join('');
  const hint = cur ? cur.members.every(k => x.parts.some(p => p[0] === k)) ? 'Équipe ' + cur.name + ' au complet' : '<span class="pw-link" style="margin:0" onclick="pwConvokeTeam(\'' + cur.id + '\')">Compléter l\'équipe ' + cur.name + '</span>' : 'Choisir une équipe du projet convoque tous ses membres';
  return '<div class="pw-team-row"><select class="selectbox pw-team-sel" onchange="pwConvokeTeam(this.value)"><option value="">Convoquer une équipe…</option>' + opts + '</select><span class="pw-link" onclick="pwOpenTeams(\'' + (cur ? cur.id : (TEAMS[0] || {}).id || '') + '\')">Gérer</span></div><div class="pw-team-hint">' + hint + '</div>';
}
/* gestionnaire d'équipes (niveau projet) */
let TM_SEL = null,
  TM_DRAFT = null;
window.pwOpenTeams = function (id) {
  TM_DRAFT = JSON.parse(JSON.stringify(TEAMS));
  TM_SEL = id && TM_DRAFT.some(t => t.id === id) ? id : (TM_DRAFT[0] || {}).id;
  let ov = document.getElementById('teamsModal');
  if (!ov) {
    ov = document.createElement('div');
    ov.className = 'modal-overlay';
    ov.id = 'teamsModal';
    ov.setAttribute('onclick', 'if(event.target===this)pwCloseTeams()');
    document.body.appendChild(ov);
  }
  pwRenderTeams();
  ov.classList.add('open');
};
function pwCloseTeams() {
  const o = document.getElementById('teamsModal');
  if (o) o.classList.remove('open');
}
function tmCur() {
  return TM_DRAFT.find(t => t.id === TM_SEL);
}
function tmSelect(id) {
  TM_SEL = id;
  pwRenderTeams();
}
function tmSet(k, v) {
  const t = tmCur();
  if (!t) return;
  t[k] = v;
  if (k === 'name') pwRenderTeams(true);
}
function tmToggle(ini) {
  const t = tmCur();
  if (!t) return;
  const j = t.members.indexOf(ini);
  if (j < 0) t.members.push(ini);else t.members.splice(j, 1);
  pwRenderTeams();
}
function tmAddPerson() {
  const el = document.getElementById('tm-add-in');
  const v = (el && el.value || '').trim();
  if (!v) {
    if (el) el.focus();
    return;
  }
  const hit = Object.keys(DIR).find(k => k === v.toUpperCase() || DIR[k][0].toLowerCase().indexOf(v.toLowerCase()) === 0);
  const w = v.split(/[\s-]+/).filter(Boolean);
  const ini = hit || (w.length > 1 ? w[0][0] + w[1][0] : v.slice(0, 2)).toUpperCase();
  if (!DIR[ini]) {
    DIR[ini] = [v, '', v.toLowerCase().replace(/\s+/g, '.'), 'av-' + (1 + Object.keys(DIR).length % 6)];
    dirSaveExtra(ini);
  }
  const t = tmCur();
  if (t && t.members.indexOf(ini) < 0) t.members.push(ini);
  pwRenderTeams();
}
function tmNew() {
  const n = TM_DRAFT.length;
  const id = 't' + Date.now();
  TM_DRAFT.push({
    id: id,
    name: 'Nouvelle équipe',
    label: '',
    members: [],
    color: TEAM_COLORS[n % TEAM_COLORS.length]
  });
  TM_SEL = id;
  pwRenderTeams();
  setTimeout(() => {
    const i = document.getElementById('tm-name');
    if (i) {
      i.focus();
      i.select();
    }
  }, 30);
}
function tmDel() {
  const i = TM_DRAFT.findIndex(t => t.id === TM_SEL);
  if (i < 0) return;
  TM_DRAFT.splice(i, 1);
  TM_SEL = (TM_DRAFT[0] || {}).id;
  pwRenderTeams();
}
function tmSave() {
  TEAMS = JSON.parse(JSON.stringify(TM_DRAFT));
  teamsSave();
  pwCloseTeams();
  if (document.getElementById('prepModal').classList.contains('open')) prepRerender();
  pwRenderTeamsPane();
  showToast(TEAMS.length + ' équipe' + (TEAMS.length > 1 ? 's' : '') + ' enregistrée' + (TEAMS.length > 1 ? 's' : '') + ' sur le projet');
}
function pwRenderTeams(listOnly) {
  const t = tmCur();
  const ov = document.getElementById('teamsModal');
  const list = TM_DRAFT.map(z => '<div class="tm-item' + (z.id === TM_SEL ? ' on' : '') + '" onclick="tmSelect(\'' + z.id + '\')"><i style="background:' + z.color + '"></i><div class="tm-item-b"><div class="tm-item-n">' + z.name + '</div><div class="tm-item-m">' + z.members.length + ' membre' + (z.members.length > 1 ? 's' : '') + (z.label ? ' · ' + z.label : '') + '</div></div></div>').join('') + '<button class="tm-new" onclick="tmNew()">+ Nouvelle équipe</button>';
  if (listOnly && ov.querySelector('.tm-list')) {
    ov.querySelector('.tm-list').innerHTML = list;
    return;
  }
  const mem = t ? Object.keys(DIR).map(k => {
    const on = t.members.indexOf(k) >= 0;
    return '<span class="part-chip tpl-part' + (on ? ' on' : '') + '" onclick="tmToggle(\'' + k + '\')">' + avHtml(k, DIR[k][3]) + '<span class="tm-chip-t">' + DIR[k][0] + (DIR[k][1] ? '<small>' + DIR[k][1] + '</small>' : '') + '</span></span>';
  }).join('') : '';
  const cols = TEAM_COLORS.map(c => '<span class="tm-col' + (t && t.color === c ? ' on' : '') + '" style="background:' + c + '" onclick="tmSet(\'color\',\'' + c + '\');pwRenderTeams()"></span>').join('');
  const edit = t ? '<div class="ni-grid2"><div class="field"><label class="field-label">Nom de l\'équipe</label><input class="input" id="tm-name" value="' + t.name.replace(/"/g, '&quot;') + '" oninput="tmSet(\'name\',this.value)" placeholder="COPIL, COPROJ, COTECH…"></div><div class="field"><label class="field-label">Libellé</label><input class="input" value="' + (t.label || '').replace(/"/g, '&quot;') + '" oninput="tmSet(\'label\',this.value)" placeholder="Comité de pilotage"></div></div>' + '<div class="field"><label class="field-label">Couleur</label><div class="tm-cols">' + cols + '</div></div>' + '<div class="field"><label class="field-label">Membres (' + t.members.length + ')</label><div class="part-grid tm-grid">' + mem + '</div><div class="inst-addrow" style="margin-top:8px"><input class="input" id="tm-add-in" placeholder="Ajouter une personne…" onkeydown="if(event.key===\'Enter\')tmAddPerson()"><button class="meet-mini-btn" onclick="tmAddPerson()">Ajouter</button></div></div>' + '<div class="tm-usage">Cette équipe est proposée dans la préparation de chaque point projet : un clic convoque tous ses membres.</div>' : '<div class="pw-empty">Aucune équipe. Créez-en une à gauche.</div>';
  ov.innerHTML = '<div class="modal modal-tpl modal-teams"><div class="modal-head"><div class="modal-head-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div><div><div class="modal-title">Équipes du projet</div><div class="modal-sub">COPIL, COPROJ, COTECH… Composez les instances du projet une fois ; elles se retrouvent dans la préparation de chaque point.</div></div><button class="modal-close" onclick="pwCloseTeams()">' + PW_ICO.x + '</button></div>' + '<div class="modal-body tm-body"><div class="tm-list">' + list + '</div><div class="tm-edit">' + edit + '</div></div>' + '<div class="modal-foot">' + (t ? '<button class="btn btn-secondary" onclick="tmDel()">Supprimer l\'équipe</button>' : '') + '<span style="flex:1"></span><button class="btn btn-secondary" onclick="pwCloseTeams()">Annuler</button><button class="btn btn-primary" onclick="tmSave()">Enregistrer</button></div></div>';
}
const PULL_KINDS = {
  decisions: 'Décisions à appliquer',
  actions: 'Actions ouvertes',
  arbs: 'Arbitrages reportés',
  risks: 'Risques ouverts',
  remontes: 'Sujets remontés du niveau inférieur'
};
/* blocs planning / tâches posés dans l'ODJ */
const PHASES = [['Cadrage', 0, 22, 'done'], ['Conception', 18, 26, 'done'], ['Développement', 38, 34, 'cur'], ['Recette', 66, 20, 'todo'], ['Déploiement', 84, 16, 'todo']];
const JALON_PHASE = [1, 1, 2, 3];
const PLAN_MODES = {
  macro: ['Vue macro', 'Phases et jalons clés'],
  detail: ['Vue détaillée', 'Phases, jalons et tâches rattachées']
};
const TASK_FILTERS = {
  urgent: ['Urgentes', 'en retard ou bloquantes'],
  major: ['Majeures', 'urgentes + à risque'],
  all: ['Toutes', 'l\'ensemble des tâches ouvertes']
};
const TASK_PRIO = {
  late: 'urgent',
  risk: 'major',
  todo: 'normal',
  done: 'normal'
};
function tasksFor(filter) {
  return TACHES.map((t, i) => ({
    t: t,
    i: i,
    p: TASK_PRIO[t[3]] || 'normal'
  })).filter(o => o.t[3] !== 'done').filter(o => filter === 'all' || (filter === 'major' ? o.p === 'urgent' || o.p === 'major' : o.p === 'urgent'));
}
function pwAddBlock(k) {
  const x = INST_PREP[curPrepKey],
    tpl = tplFor(x.type);
  if (x.agenda.some(a => a[2] && a[2].k === k)) {
    showToast('La revue du projet est déjà à l\'ordre du jour');
    return;
  }
  const sec = (tpl.sections.find(s => s.legacy) || tpl.sections[0]).id;
  x.agenda.push(k === 'planning' ? ['Planning du projet', '10 min', {
    k: 'planning',
    mode: 'macro',
    label: 'Planning'
  }, sec, 'info'] : k === 'taches' ? ['Tâches du projet', '10 min', {
    k: 'taches',
    filter: 'urgent',
    label: 'Tâches'
  }, sec, 'info'] : ['Revue du projet — planning, tâches, décisions, alertes', '15 min', {
    k: 'revue',
    label: 'Revue du projet'
  }, sec, 'info']);
  prepRerender();
}
function revueAlerts(key) {
  const p = PREV_OF[key || curPrepKey || MEET_KEY],
    cr = INST_CR[p] || {};
  const A = [];
  JALONS.forEach(j => {
    if (j[2] === 'late') A.push(['danger', 'Jalon en retard', j[0], j[1] + ' · ' + j[3]]);else if (j[2] === 'risk') A.push(['warning', 'Jalon à risque', j[0], j[1] + ' · ' + j[3]]);
  });
  TACHES.forEach(t => {
    if (t[3] === 'late') A.push(['danger', 'Tâche en retard', t[0], dirName(t[1]) + ' · échéance ' + t[2]]);
  });
  (cr.risks || []).forEach(r => {
    if (r[1] === 'Élevé') A.push(['danger', 'Risque élevé', r[0], cr.name || '']);
  });
  (cr.decisions || []).forEach((d, i) => {
    if (!(REP[(key || curPrepKey || MEET_KEY) + '|d' + i] || {}).applied) A.push(['gold', 'Décision non appliquée', d[0], d[1] + ' · ' + (cr.name || '')]);
  });
  return A;
}
function revueSummary(key) {
  const A = revueAlerts(key);
  const open = TACHES.filter(t => t[3] !== 'done').length;
  const cr = INST_CR[PREV_OF[key || curPrepKey]] || {};
  return PHASES.length + ' phases · ' + JALONS.length + ' jalons · ' + open + ' tâches ouvertes · ' + (cr.decisions || []).length + ' décisions' + (A.length ? ' · <b class="over">' + A.length + ' alerte' + (A.length > 1 ? 's' : '') + '</b>' : '');
}
function revueView(key) {
  const A = revueAlerts(key);
  const TONE = {
    danger: ['var(--state-danger-bg)', 'var(--state-danger)'],
    warning: ['var(--state-warning-bg)', 'var(--state-warning)'],
    gold: ['var(--brand-gold-050)', 'var(--brand-gold-700)']
  };
  const alerts = A.length ? '<div class="rv-alerts">' + A.map(a => '<div class="rv-al" style="background:' + TONE[a[0]][0] + '"><span class="rv-al-k" style="color:' + TONE[a[0]][1] + '">' + a[1] + '</span><span class="rv-al-t">' + a[2] + '</span><span class="rv-al-m">' + a[3] + '</span></div>').join('') + '</div>' : '<div class="pw-empty">Aucune alerte — projet sous contrôle.</div>';
  const cr = INST_CR[PREV_OF[key || curPrepKey || MEET_KEY]] || {};
  const decs = (cr.decisions || []).length ? '<div class="tkv">' + (cr.decisions || []).map((d, i) => {
    const ap = (REP[(key || curPrepKey || MEET_KEY) + '|d' + i] || {}).applied;
    return '<div class="plv-t"><span class="rep-dot" style="background:' + (ap ? 'var(--state-success)' : 'var(--brand-gold)') + '"></span><span class="plv-jt">' + d[0] + '</span><span class="plv-jm">' + d[1] + '</span><span class="rep-pill" style="background:' + (ap ? 'var(--state-success-bg)' : 'var(--brand-gold-050)') + ';color:' + (ap ? 'var(--state-success)' : 'var(--brand-gold-700)') + '">' + (ap ? 'Appliquée' : 'À appliquer') + '</span></div>';
  }).join('') + '</div>' : '<div class="pw-empty">Aucune décision précédente.</div>';
  const sec = (t, n, body) => '<div class="rv-sec"><div class="rv-sec-h">' + t + (n !== undefined ? '<span class="rv-n">' + n + '</span>' : '') + '</div>' + body + '</div>';
  return '<div class="rv">' + sec('Alertes', A.length, alerts) + sec('Planning', undefined, planView('macro')) + sec('Tâches ouvertes', TACHES.filter(t => t[3] !== 'done').length, taskView('all')) + sec('Décisions précédentes', (cr.decisions || []).length, decs) + '</div>';
}
function pwBlockSet(i, key, v) {
  INST_PREP[curPrepKey].agenda[i][2][key] = v;
  prepRerender();
}
function planSummary(mode) {
  const late = JALONS.filter(j => j[2] === 'late').length,
    risk = JALONS.filter(j => j[2] === 'risk').length;
  return PHASES.length + ' phases · ' + JALONS.length + ' jalons' + (late ? ' · <b class="over">' + late + ' en retard</b>' : '') + (risk ? ' · ' + risk + ' à risque' : '') + (mode === 'detail' ? ' · ' + TACHES.filter(t => t[3] !== 'done').length + ' tâches' : '');
}
function taskSummary(f) {
  const l = tasksFor(f);
  const late = l.filter(o => o.p === 'urgent').length;
  return l.length + ' tâche' + (l.length > 1 ? 's' : '') + (late ? ' · <b class="over">' + late + ' en retard</b>' : '');
}
function planView(mode) {
  const bars = PHASES.map((p, pi) => {
    const c = p[3] === 'done' ? 'var(--state-success)' : p[3] === 'cur' ? 'var(--brand-gold)' : 'var(--neutral-300)';
    const js = JALONS.map((j, i) => ({
      j: j,
      i: i
    })).filter(o => JALON_PHASE[o.i] === pi);
    const dia = js.map(o => '<span class="plv-dia" style="left:' + (p[1] + p[2] * 0.8) + '%;background:' + REP_TONE[o.j[2]][1] + '" title="' + o.j[0] + ' · ' + o.j[1] + '"></span>').join('');
    const det = mode === 'detail' ? '<div class="plv-det">' + js.map(o => '<div class="plv-j"><span class="rep-diamond" style="background:' + REP_TONE[o.j[2]][1] + '"></span><span class="plv-jt">' + o.j[0] + '</span><span class="plv-jm">' + o.j[1] + ' · ' + o.j[3] + '</span>' + repPill(o.j[2]) + '</div>').join('') + TACHES.map((t, i) => ({
      t: t,
      i: i
    })).filter(o => (JALON_PHASE[o.i] || 2) === pi && o.t[3] !== 'done').map(o => '<div class="plv-t"><span class="av ' + avClassFor(o.t[1]) + ' rep-av">' + o.t[1] + '</span><span class="plv-jt">' + o.t[0] + '</span><span class="plv-jm">' + o.t[2] + '</span>' + repPill(o.t[3]) + '</div>').join('') + '</div>' : '';
    return '<div class="plv-row"><div class="plv-name">' + p[0] + '</div><div class="plv-track"><div class="plv-bar" style="left:' + p[1] + '%;width:' + p[2] + '%;background:' + c + '"></div>' + dia + '<div class="plv-today" style="left:44%"></div></div></div>' + det;
  }).join('');
  return '<div class="plv"><div class="plv-h"><span>Mai</span><span>Juin</span><span>Juil.</span></div>' + bars + '<div class="plv-leg"><span><i style="background:var(--state-success)"></i>Terminé</span><span><i style="background:var(--brand-gold)"></i>En cours</span><span><i style="background:var(--neutral-300)"></i>À venir</span><span><i class="plv-leg-dia" style="background:var(--state-danger)"></i>Jalon en retard</span></div></div>';
}
function taskView(f) {
  const l = tasksFor(f);
  if (!l.length) return '<div class="pw-empty">Aucune tâche dans ce filtre.</div>';
  return '<div class="tkv">' + l.map(o => '<div class="plv-t"><span class="av ' + avClassFor(o.t[1]) + ' rep-av">' + o.t[1] + '</span><span class="plv-jt">' + o.t[0] + '</span><span class="plv-jm">' + dirName(o.t[1]) + ' · ' + o.t[2] + '</span><span class="tkv-p ' + o.p + '">' + (o.p === 'urgent' ? 'Urgente' : o.p === 'major' ? 'Majeure' : 'Normale') + '</span>' + repPill(o.t[3]) + '</div>').join('') + '</div>';
}
const NAT = {
  info: ['Info', 'var(--state-info-bg)', 'var(--state-info)'],
  decision: ['Décision', 'var(--brand-gold-050)', 'var(--brand-gold-700)'],
  arbitrage: ['Arbitrage', 'var(--state-warning-bg)', 'var(--state-warning)']
};
const TPL_KEY = 'starium.tpl.v1';
let TYPE_TPL = function () {
  const base = JSON.parse(JSON.stringify(TPL_DEFAULTS));
  try {
    const s = JSON.parse(localStorage.getItem(TPL_KEY) || '{}');
    Object.keys(s).forEach(k => {
      base[k] = s[k];
    });
  } catch (e) {}
  return base;
}();
function tplSave() {
  try {
    localStorage.setItem(TPL_KEY, JSON.stringify(TYPE_TPL));
  } catch (e) {}
}
function tplFor(type) {
  return TYPE_TPL[type] || TYPE_TPL[{
    'Revue de portefeuille': 'CRA',
    'Point ad hoc': 'ADH'
  }[type]] || TYPE_TPL.COPROJ;
}
function pwMins(s) {
  if (!s) return 0;
  let m = 0;
  const h = /(\d+)\s*h/i.exec(s);
  const mi = /(\d+)\s*min/i.exec(s);
  if (h) m += parseInt(h[1]) * 60;
  if (mi) m += parseInt(mi[1]);
  if (!h && !mi) {
    const n = parseInt(s);
    if (!isNaN(n)) m = n;
  }
  return m;
}
function pwFmt(m) {
  return m >= 60 ? Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + String(m % 60).padStart(2, '0') : '') : m + ' min';
}
const REMONTES = [['Renfort UX 0,5 ETP sur la recette', 'COPROJ S17 · arbitrage remonté, non tranché'], ['Dette technique legacy — investissement de reprise', 'COTECH · remonté le 6 mai'], ['Décalage du lot 2 sur juillet', 'COPROJ S19 · impact planning à valider']];

/* ─── sources à reprendre ─── */
function pwSources(key) {
  const p = PREV_OF[key],
    cr = INST_CR[p] || {};
  const S = {};
  S.decisions = (cr.decisions || []).map((d, i) => ({
    id: 'd' + i,
    i: i,
    title: d[0],
    meta: d[1] + ' · ' + (cr.name || ''),
    open: !repFlag('d' + i).applied,
    pill: repFlag('d' + i).applied ? ['Appliquée', 'var(--state-success-bg)', 'var(--state-success)'] : ['À appliquer', 'var(--brand-gold-050)', 'var(--brand-gold-700)'],
    origin: {
      k: 'dec',
      i: i,
      key: key,
      label: d[0]
    },
    tag: 'Décision à appliquer',
    dur: 10,
    nature: 'info',
    extra: '<span class="rep-btn ghost" onclick="repDecApply(' + i + ')">' + (repFlag('d' + i).applied ? 'Rouvrir' : 'Marquer appliquée') + '</span>'
  }));
  S.actions = (cr.actions || []).map((a, i) => ({
    id: 'ac' + i,
    i: i,
    title: a[0],
    meta: a[1],
    open: !a[2],
    pill: a[2] ? ['Terminée', 'var(--state-success-bg)', 'var(--state-success)'] : ['Ouverte', 'var(--state-info-bg)', 'var(--state-info)'],
    origin: {
      k: 'action',
      i: i,
      prev: p,
      label: a[0]
    },
    tag: 'Action à suivre',
    dur: 5,
    nature: 'info'
  }));
  S.arbs = (PREV_ARBS[p] || []).map((a, i) => {
    const v = VERD[a[1]];
    return {
      id: 'a' + i,
      i: i,
      title: a[0],
      meta: a[2],
      open: a[1] === 'reporte',
      pill: [v.label, v.bg, v.c],
      origin: {
        k: 'arb',
        i: i,
        prev: p,
        label: a[0]
      },
      tag: 'Arbitrage à reprendre',
      dur: 15,
      nature: 'arbitrage'
    };
  });
  S.jalons = JALONS.map((j, i) => ({
    id: 'j' + i,
    i: i,
    title: j[0],
    meta: j[1] + ' · ' + j[3],
    open: j[2] !== 'done',
    pill: [REP_TONE[j[2]][2], REP_TONE[j[2]][0], REP_TONE[j[2]][1]],
    origin: {
      k: 'jalon',
      i: i,
      label: j[0]
    },
    tag: 'Jalon',
    dur: 10,
    nature: 'info',
    diamond: REP_TONE[j[2]][1]
  }));
  S.taches = TACHES.map((t, i) => ({
    id: 't' + i,
    i: i,
    title: t[0],
    meta: dirName(t[1]) + ' · échéance ' + t[2],
    open: t[3] !== 'done',
    pill: [REP_TONE[t[3]][2], REP_TONE[t[3]][0], REP_TONE[t[3]][1]],
    origin: {
      k: 'tache',
      i: i,
      label: t[0]
    },
    tag: 'Tâche',
    dur: 5,
    nature: 'info',
    av: t[1]
  }));
  S.risks = (cr.risks || []).map((r, i) => ({
    id: 'r' + i,
    i: i,
    title: r[0],
    meta: 'Niveau ' + r[1].toLowerCase() + ' · ' + (cr.name || ''),
    open: true,
    pill: [r[1], r[1] === 'Élevé' ? 'var(--state-danger-bg)' : 'var(--state-warning-bg)', r[1] === 'Élevé' ? 'var(--state-danger)' : 'var(--state-warning)'],
    origin: {
      k: 'risk',
      i: i,
      prev: p,
      label: r[0]
    },
    tag: 'Risque',
    dur: 10,
    nature: 'decision'
  }));
  S.remontes = REMONTES.map((r, i) => ({
    id: 'm' + i,
    i: i,
    title: r[0],
    meta: r[1],
    open: true,
    pill: ['Remonté', 'var(--purple-bg)', 'var(--purple)'],
    origin: {
      k: 'remonte',
      i: i,
      label: r[0]
    },
    tag: 'Remonté',
    dur: 10,
    nature: 'arbitrage'
  }));
  return S;
}
function pwOpenCount(S) {
  const c = {};
  Object.keys(S).forEach(k => c[k] = S[k].filter(x => x.open && !repFlag(x.id).odj).length);
  return c;
}

/* ─── ajouter à l'ODJ dans une section ─── */
function pwAdd(kind, i, secId) {
  const S = pwSources(curPrepKey);
  const it = S[kind][i];
  if (!it || repFlag(it.id).odj) return;
  const tpl = tplFor(INST_PREP[curPrepKey].type);
  const sec = secId || (tpl.sections.find(s => (s.pull || []).indexOf(kind) >= 0) || tpl.sections.find(s => s.legacy) || tpl.sections[0]).id;
  INST_PREP[curPrepKey].agenda.push([it.tag + ' — ' + it.title, it.dur + ' min', it.origin, sec, it.nature]);
  repSet(it.id, {
    odj: true
  });
  prepRerender();
  showToast('« ' + it.title + ' » mis à l\'ordre du jour');
}
function pwAutoFill() {
  const x = INST_PREP[curPrepKey],
    tpl = tplFor(x.type),
    S = pwSources(curPrepKey);
  let n = 0;
  tpl.sections.forEach(sec => (sec.pull || []).filter(k => k !== 'remontes').forEach(kind => (S[kind] || []).forEach(it => {
    if (it.open && !repFlag(it.id).odj) {
      x.agenda.push([it.tag + ' — ' + it.title, it.dur + ' min', it.origin, sec.id, it.nature]);
      repSet(it.id, {
        odj: true
      });
      n++;
    }
  })));
  prepRerender();
  showToast(n ? n + ' élément' + (n > 1 ? 's' : '') + ' repris selon le modèle ' + x.type : 'Rien de nouveau à reprendre — l\'ordre du jour est déjà complet');
}
function pwAddTo(secId) {
  const el = document.getElementById('pw-in-' + secId);
  const v = (el && el.value || '').trim();
  if (!v) {
    if (el) el.focus();
    return;
  }
  const tEl = document.getElementById('pw-min-' + secId);
  const t = parseInt(tEl && tEl.value) || 10;
  const tpl = tplFor(INST_PREP[curPrepKey].type);
  const sec = tpl.sections.find(s => s.id === secId);
  INST_PREP[curPrepKey].agenda.push([v, t + ' min', null, secId, sec ? sec.nature : 'info']);
  prepRerender();
  const n = document.getElementById('pw-in-' + secId);
  if (n) n.focus();
}
function pwSetNature(i, v) {
  INST_PREP[curPrepKey].agenda[i][4] = v;
  prepRerender();
}
function pwSetDur(i, v) {
  const n = parseInt(v);
  if (!isNaN(n)) INST_PREP[curPrepKey].agenda[i][1] = n + ' min';
  prepRerender();
}
/* drag & drop */
let PW_DRAG = null;
function pwDragStart(e, i) {
  PW_DRAG = i;
  e.dataTransfer.effectAllowed = 'move';
  e.currentTarget.classList.add('dragging');
}
function pwDragEnd(e) {
  e.currentTarget.classList.remove('dragging');
  document.querySelectorAll('.pw-sec.over').forEach(s => s.classList.remove('over'));
}
function pwDragOver(e) {
  e.preventDefault();
  const s = e.currentTarget.closest('.pw-sec');
  if (s) s.classList.add('over');
}
function pwDropItem(e, j) {
  e.preventDefault();
  e.stopPropagation();
  if (PW_DRAG === null) return;
  const ag = INST_PREP[curPrepKey].agenda;
  const it = ag.splice(PW_DRAG, 1)[0];
  const tgt = ag[j > PW_DRAG ? j - 1 : j];
  if (tgt) it[3] = tgt[3];
  ag.splice(j > PW_DRAG ? j - 1 : j, 0, it);
  PW_DRAG = null;
  prepRerender();
}
function pwDropSec(e, secId) {
  e.preventDefault();
  if (PW_DRAG === null) return;
  const ag = INST_PREP[curPrepKey].agenda;
  const it = ag.splice(PW_DRAG, 1)[0];
  it[3] = secId;
  ag.push(it);
  PW_DRAG = null;
  prepRerender();
}

/* ─── rendu ─── */
let PW_TAB = 'decisions',
  PW_SIMPLE = true;
function pwTab(t) {
  PW_TAB = t;
  prepRerender();
}
function pwMode(s) {
  PW_SIMPLE = s;
  prepRerender();
}
const PW_STD = [['presents', 'Présents', 5], ['objectif', 'Objectif', 5], ['tour', 'Tour de table', 10], ['actions', 'Suivi des actions', 15], ['avancement', 'Avancement du projet', 15], ['planning', 'Le planning', 10], ['arbitrage', 'Arbitrages', 15]];
function pwBlocks(x) {
  if (!x.blocks) {
    x.blocks = {};
    PW_STD.forEach(b => x.blocks[b[0]] = {
      on: true,
      dur: b[2]
    });
    const re = /tour de table|suivi des actions|avancement|planning|arbitrage|blocage|pr[ée]sents|objectif|revue du projet/i;
    x.agenda = x.agenda.filter(a => !re.test(a[0]) && !(a[2] && (a[2].k === 'planning' || a[2].k === 'taches' || a[2].k === 'revue')));
  }
  return x.blocks;
}
function pwBlkToggle(id) {
  const b = pwBlocks(INST_PREP[curPrepKey])[id];
  b.on = !b.on;
  prepRerender();
}
function pwBlkDur(id, v) {
  const n = parseInt(v);
  if (!isNaN(n)) pwBlocks(INST_PREP[curPrepKey])[id].dur = n;
  prepRerender();
}
function pwSetGoal(v) {
  INST_PREP[curPrepKey].goal = v;
}
/* ordre unifié (mode simple) : 'b:<id>' pour un bloc standard, 'a:<i>' pour un point spécifique */
function pwOrder(x) {
  let c = 0;
  x.agenda.forEach(a => {
    if (!a[5]) a[5] = 'p' + Date.now().toString(36) + c++;
  });
  const ids = PW_STD.map(b => 'b:' + b[0]).concat(x.agenda.map(a => 'a:' + a[5]));
  if (!x.order) x.order = ids.slice();
  x.order = x.order.filter(k => ids.indexOf(k) >= 0);
  ids.forEach(k => {
    if (x.order.indexOf(k) < 0) x.order.push(k);
  });
  return x.order;
}
function pwIdx(k) {
  const id = k.slice(2);
  return INST_PREP[curPrepKey].agenda.findIndex(a => a[5] === id);
}
/* ── contenu par point : note, fichiers, liens, éléments projet — sauvegarde automatique ── */
const PW_OPEN = {};
let PW_SAVED_AT = null,
  PW_PICK = null;
function pwAttKey() {
  return 'starium.prep.att.' + curPrepKey;
}
function pwAtt(x) {
  if (!x.att) {
    try {
      x.att = JSON.parse(localStorage.getItem(pwAttKey()) || '{}');
    } catch (e) {
      x.att = {};
    }
  }
  return x.att;
}
function pwAttOf(k) {
  const A = pwAtt(INST_PREP[curPrepKey]);
  return A[k] || (A[k] = {
    note: '',
    items: []
  });
}
function pwAttSave() {
  try {
    localStorage.setItem(pwAttKey(), JSON.stringify(pwAtt(INST_PREP[curPrepKey])));
  } catch (e) {}
  PW_SAVED_AT = new Date();
  const el = document.getElementById('pw-saved');
  if (el) {
    el.textContent = 'Enregistré à ' + PW_SAVED_AT.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
    el.classList.add('flash');
    setTimeout(() => el.classList.remove('flash'), 600);
  }
}
function pwToggleOpen(k) {
  PW_OPEN.k = k;
  PW_PICK = null;
  pwPointRender();
  const m = document.getElementById('pwPointModal');
  if (m) m.classList.add('open');
}
function pwPointClose() {
  const m = document.getElementById('pwPointModal');
  if (m) m.classList.remove('open');
  PW_OPEN.k = null;
  PW_PICK = null;
  prepRerender();
}
function pwPointTitle(k) {
  const x = INST_PREP[curPrepKey];
  if (k[0] === 'b') {
    const b = PW_STD.find(z => z[0] === k.slice(2));
    return b ? b[1] : '';
  }
  const a = x.agenda[pwIdx(k)];
  return a ? a[0] : '';
}
function pwPointRender() {
  const k = PW_OPEN.k;
  if (!k) return;
  const kk = k.replace(':', '_'),
    A = pwAttOf(k),
    pk = PW_PICK && PW_PICK.k === k ? PW_PICK.cat : null;
  const t = document.getElementById('pwPointTitle');
  if (t) t.textContent = pwPointTitle(k);
  if (k === 'b:planning') {
    pwPlanRender(k, A);
    return;
  }
  const s = document.getElementById('pwPointSub');
  if (s) s.textContent = (A.items.length ? A.items.length + ' élément' + (A.items.length > 1 ? 's' : '') + ' lié' + (A.items.length > 1 ? 's' : '') + ' · ' : '') + (PW_SAVED_AT ? 'Enregistré à ' + PW_SAVED_AT.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  }) : 'Enregistrement automatique');
  const items = A.items.map((it, i) => '<div class="pw-att-it"><span class="pw-att-ic ' + it.t + '">' + (it.t === 'file' ? PW_ICO.file : it.t === 'link' ? PW_ICO.link : PW_ICO.hist) + '</span><div class="pw-att-b"><div class="pw-att-t">' + (it.url ? '<a href="' + it.url + '" target="_blank" rel="noopener">' + it.label + '</a>' : it.label) + (it.pill ? ' <span class="pw-pill" style="background:' + it.pill[1] + ';color:' + it.pill[2] + '">' + it.pill[0] + '</span>' : '') + '</div>' + (it.sub ? '<div class="pw-att-s">' + it.sub + '</div>' : '') + '</div><span class="agenda-x" onclick="pwAttDel(\'' + k + '\',' + i + ')">' + PW_ICO.x + '</span></div>').join('');
  const picker = pk ? '<div class="pw-pick">' + (pwRefs(pk).map((it, i) => '<div class="pw-pick-it" onclick="pwAttRef(\'' + k + '\',\'' + pk + '\',' + i + ')"><div class="pw-att-b"><div class="pw-att-t">' + it.title + '</div><div class="pw-att-s">' + (it.meta || '') + '</div></div>' + (it.pill ? '<span class="pw-pill" style="background:' + it.pill[1] + ';color:' + it.pill[2] + '">' + it.pill[0] + '</span>' : '') + '</div>').join('') || '<div class="pw-att-s" style="padding:8px">Rien à lier dans cette catégorie</div>') + '</div>' : '';
  const b = document.getElementById('pwPointBody');
  if (!b) return;
  b.innerHTML = '<div class="pw-att pw-att-modal"><div class="pw-grp">Informations</div><textarea class="input pw-att-note" placeholder="Contexte, ce qu’il faut dire ou montrer…" oninput="pwNote(\'' + k + '\',this.value)">' + (A.note || '').replace(/</g, '&lt;') + '</textarea>' + '<div class="pw-grp" style="margin-top:6px">Pièces jointes</div><div class="pw-att-bar"><label class="pw-att-btn">' + PW_ICO.file + 'Ajouter un fichier<input type="file" multiple hidden onchange="pwAttFile(\'' + k + '\',this)"></label><span class="pw-att-lnk">' + PW_ICO.link + '<input class="input" id="pw-lnk-' + kk + '" placeholder="Coller un lien…" onkeydown="if(event.key===\'Enter\')pwAttLink(\'' + k + '\')"><button class="meet-mini-btn" onclick="pwAttLink(\'' + k + '\')">Lier</button></span></div>' + '<div class="pw-grp" style="margin-top:6px">Éléments du projet</div><div class="pw-att-bar">' + PW_REFCATS.map(c => '<button class="pw-att-btn' + (pk === c[0] ? ' on' : '') + '" onclick="pwPick(\'' + k + '\',\'' + c[0] + '\')">' + c[1] + '</button>').join('') + '</div>' + picker + (items ? '<div class="pw-grp" style="margin-top:6px">Lié à ce point</div><div class="pw-att-list">' + items + '</div>' : '') + '</div>';
}
function pwAttRerender() {
  pwPointRender();
}
/* vue spécifique du point « Le planning » : frise des phases + jalons à présenter */
function pwPlanJal(k) {
  const A = pwAttOf(k);
  if (!A.jal) A.jal = JALONS.map((j, i) => j[2] !== 'done' ? i : -1).filter(i => i >= 0);
  return A.jal;
}
function pwPlanTog(k, i) {
  const L = pwPlanJal(k),
    p = L.indexOf(i);
  if (p >= 0) L.splice(p, 1);else L.push(i);
  pwAttSave();
  pwPointRender();
}
function pwPlanMode(k, m) {
  pwAttOf(k).mode = m;
  pwAttSave();
  pwPointRender();
}
function pwPlanRender(k, A) {
  const L = pwPlanJal(k),
    mode = A.mode || 'macro';
  const s = document.getElementById('pwPointSub');
  if (s) s.textContent = L.length + ' jalon' + (L.length > 1 ? 's' : '') + ' présenté' + (L.length > 1 ? 's' : '') + ' en séance · ' + (PW_SAVED_AT ? 'Enregistré à ' + PW_SAVED_AT.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  }) : 'Enregistrement automatique');
  const seg = '<div class="pw-segs">' + Object.keys(PLAN_MODES).map(m => '<button class="pw-seg' + (m === mode ? ' on' : '') + '" onclick="pwPlanMode(\'' + k + '\',\'' + m + '\')">' + PLAN_MODES[m][0] + '</button>').join('') + '</div>';
  const jal = JALONS.map((j, i) => {
    const on = L.indexOf(i) >= 0;
    return '<div class="pw-jal' + (on ? ' on' : '') + '" onclick="pwPlanTog(\'' + k + '\',' + i + ')"><span class="pw-chk' + (on ? ' on' : '') + '">' + (on ? PW_ICO.chk : '') + '</span><span class="rep-diamond" style="background:' + REP_TONE[j[2]][1] + '"></span><div class="pw-att-b"><div class="pw-att-t">' + j[0] + '</div><div class="pw-att-s">' + j[1] + ' · ' + j[3] + ' · ' + PHASES[JALON_PHASE[i]][0] + '</div></div>' + repPill(j[2]) + '</div>';
  }).join('');
  const b = document.getElementById('pwPointBody');
  if (!b) return;
  b.innerHTML = '<div class="pw-att pw-att-modal"><div class="pw-plan-h"><div class="pw-grp">Planning du projet</div>' + seg + '</div>' + planView(mode) + '<div class="pw-grp" style="margin-top:6px">Jalons à présenter</div><div class="pw-att-s" style="margin-top:-4px">Cochez les jalons à passer en revue — chacun recevra un verdict en séance.</div><div class="pw-jals">' + jal + '</div>' + '<div class="pw-grp" style="margin-top:6px">Commentaire</div><textarea class="input pw-att-note" placeholder="Points d’attention sur le planning, glissements à annoncer…" oninput="pwNote(\'' + k + '\',this.value)">' + (A.note || '').replace(/</g, '&lt;') + '</textarea></div>';
}
function pwNote(k, v) {
  pwAttOf(k).note = v;
  pwAttSave();
}
function pwAttFile(k, inp) {
  const fs = Array.prototype.slice.call(inp.files || []);
  if (!fs.length) return;
  fs.forEach(f => pwAttOf(k).items.push({
    t: 'file',
    label: f.name,
    sub: f.size > 1e6 ? (f.size / 1e6).toFixed(1) + ' Mo' : Math.max(1, Math.round(f.size / 1024)) + ' Ko'
  }));
  pwAttSave();
  pwAttRerender();
}
function pwAttLink(k) {
  const el = document.getElementById('pw-lnk-' + k.replace(':', '_'));
  let v = (el && el.value || '').trim();
  if (!v) {
    if (el) el.focus();
    return;
  }
  if (!/^https?:\/\//i.test(v)) v = 'https://' + v;
  let host = v;
  try {
    host = new URL(v).hostname.replace(/^www\./, '');
  } catch (e) {}
  pwAttOf(k).items.push({
    t: 'link',
    label: host,
    sub: v,
    url: v
  });
  pwAttSave();
  pwAttRerender();
}
function pwAttDel(k, i) {
  pwAttOf(k).items.splice(i, 1);
  pwAttSave();
  pwAttRerender();
}
function pwPick(k, cat) {
  PW_PICK = PW_PICK && PW_PICK.k === k && PW_PICK.cat === cat ? null : {
    k: k,
    cat: cat
  };
  pwAttRerender();
}
function pwAttRef(k, cat, i) {
  const it = pwRefs(cat)[i];
  if (!it) return;
  const A = pwAttOf(k);
  if (A.items.some(z => z.t === 'ref' && z.cat === cat && z.label === it.title)) return;
  A.items.push({
    t: 'ref',
    cat: cat,
    label: it.title,
    sub: it.meta,
    pill: it.pill
  });
  pwAttSave();
  pwAttRerender();
}
const PW_REFCATS = [['actions', 'Action'], ['jalons', 'Jalon'], ['taches', 'Tâche'], ['risks', 'Risque'], ['decisions', 'Décision'], ['arbs', 'Arbitrage'], ['budget', 'Budget']];
function pwRefs(cat) {
  if (cat === 'budget') {
    const B = (typeof BUD_CATS !== 'undefined' ? BUD_CATS : null) || (typeof BUDGET !== 'undefined' ? BUDGET : null);
    if (Array.isArray(B)) return B.map(b => ({
      title: b.name || b.label || b[0],
      meta: b.meta || (b.engage != null ? 'Engagé ' + fmtEur(b.engage) : ''),
      pill: ['Budget', 'var(--brand-gold-050)', 'var(--brand-gold-700)']
    }));
    return [['Prestations externes', 'Engagé 184 000 € · reste 36 000 €'], ['Licences & hébergement', 'Engagé 42 500 €'], ['Charge interne', '312 j/h consommés · 88 restants']].map(b => ({
      title: b[0],
      meta: b[1],
      pill: ['Budget', 'var(--brand-gold-050)', 'var(--brand-gold-700)']
    }));
  }
  return pwSources(curPrepKey)[cat] || [];
}
let PW_SDRAG = null;
function pwSDragStart(e, k) {
  PW_SDRAG = k;
  e.dataTransfer.effectAllowed = 'move';
  e.currentTarget.classList.add('dragging');
}
function pwSDragOver(e) {
  e.preventDefault();
  e.currentTarget.classList.add('over');
}
function pwSDragLeave(e) {
  e.currentTarget.classList.remove('over');
}
function pwSDrop(e, k) {
  e.preventDefault();
  if (PW_SDRAG === null || PW_SDRAG === k) return;
  const o = pwOrder(INST_PREP[curPrepKey]);
  const from = o.indexOf(PW_SDRAG),
    to = o.indexOf(k);
  o.splice(from, 1);
  o.splice(to, 0, PW_SDRAG);
  PW_SDRAG = null;
  prepRerender();
}
function pwSMove(k, d) {
  const o = pwOrder(INST_PREP[curPrepKey]);
  const i = o.indexOf(k),
    j = i + d;
  if (j < 0 || j >= o.length) return;
  o.splice(i, 1);
  o.splice(j, 0, k);
  prepRerender();
}
function pwAddSimple() {
  const el = document.getElementById('pw-in-simple');
  const v = (el && el.value || '').trim();
  if (!v) {
    if (el) el.focus();
    return;
  }
  const x = INST_PREP[curPrepKey],
    tpl = tplFor(x.type);
  const sec = tpl.sections.find(s => s.legacy) || tpl.sections[0];
  x.agenda.push([v, '10 min', null, sec.id, sec.nature || 'info']);
  prepRerender();
  const n = document.getElementById('pw-in-simple');
  if (n) n.focus();
}
const PW_ICO = {
  odj: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
  tpl: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  chk: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>',
  grip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="18" r="1"/></svg>',
  bolt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
  hist: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'
};
const ORIG_SHORT = {
  dec: 'Décision',
  arb: 'Arbitrage',
  jalon: 'Jalon',
  tache: 'Tâche',
  action: 'Action',
  risk: 'Risque',
  remonte: 'Remonté'
};
PW_ICO.clip = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 11.5l-8.5 8.5a5 5 0 0 1-7-7l9-9a3.3 3.3 0 0 1 4.7 4.7l-9 9a1.6 1.6 0 0 1-2.3-2.3L16 7"/></svg>';
PW_ICO.file = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>';
PW_ICO.link = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>';
PW_ICO.edit = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>';
PW_ICO.caret = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>';
PW_ICO.plan = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="7" x2="13" y2="7"/><line x1="8" y1="12" x2="20" y2="12"/><line x1="5" y1="17" x2="15" y2="17"/></svg>';
PW_ICO.task = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>';
function pwHistory(key) {
  const chain = [];
  let k = PREV_OF[key];
  let guard = 0;
  while (k && INST_CR[k] && guard++ < 6) {
    chain.push(k);
    k = PREV_OF[k];
  }
  if (!chain.length) return '<div class="pw-empty">Première séance de la série — aucune mémoire encore.</div>';
  return chain.map((k, ci) => {
    const cr = INST_CR[k];
    const decs = (cr.decisions || []).map((d, i) => '<div class="pw-hrow"><span class="rep-dot" style="background:' + (ci === 0 && repFlag('d' + i).applied ? 'var(--state-success)' : 'var(--brand-gold)') + '"></span><span class="pw-ht">' + d[0] + '</span><span class="pw-hm">' + d[1] + '</span></div>').join('');
    return '<div class="pw-hist"><div class="pw-hist-h"><span class="pw-hist-d">' + cr.d + ' ' + cr.m + '</span><span class="pw-hist-n">' + cr.name + '</span><span class="pw-hist-s">' + (cr.decisions || []).length + ' déc. · ' + (cr.actions || []).length + ' act.</span></div>' + decs + '</div>';
  }).join('');
}
function pwSrcRow(kind, it) {
  const f = repFlag(it.id);
  const lead = it.diamond ? '<span class="rep-diamond" style="background:' + it.diamond + '"></span>' : it.av ? '<span class="av ' + avClassFor(it.av) + ' rep-av">' + it.av + '</span>' : '<span class="rep-dot" style="background:' + it.pill[2] + '"></span>';
  const act = f.odj ? '<span class="rep-btn on">' + PW_ICO.chk + 'À l\'ODJ</span>' : it.open ? '<span class="rep-btn" onclick="pwAdd(\'' + kind + '\',' + it.i + ')">→ ODJ</span>' : '<span class="rep-done">Clos</span>';
  return '<div class="rep-row pw-src' + (it.open ? '' : ' closed') + '">' + lead + '<div class="rep-body"><div class="rep-t">' + it.title + '</div><div class="rep-m">' + it.meta + '</div></div><span class="rep-pill" style="background:' + it.pill[1] + ';color:' + it.pill[2] + '">' + it.pill[0] + '</span><div class="rep-acts">' + (it.extra && it.open ? it.extra : '') + act + '</div></div>';
}
window.openPrepare = function (key, el) {
  curPrepKey = key;
  curPrepEl = el || null;
  const x = INST_PREP[key];
  if (!x) return;
  const tpl = tplFor(x.type);
  const legacy = (tpl.sections.find(s => s.legacy) || tpl.sections[0]).id;
  x.agenda.forEach(a => {
    if (!a[3] || !tpl.sections.some(s => s.id === a[3])) a[3] = legacy;
    if (!a[4]) a[4] = a[2] ? a[2].k === 'arb' || a[2].k === 'remonte' ? 'arbitrage' : a[2].k === 'risk' ? 'decision' : 'info' : (tpl.sections.find(s => s.id === a[3]) || {}).nature || 'info';
  });
  const total = x.agenda.reduce((s, a) => s + pwMins(a[1]), 0);
  const over = total > tpl.duree;
  const S = pwSources(key),
    C = pwOpenCount(S);
  /* colonne centrale — ODJ par sections */
  const secs = tpl.sections.map(sec => {
    const items = x.agenda.map((a, i) => ({
      a: a,
      i: i
    })).filter(o => o.a[3] === sec.id);
    const sum = items.reduce((s, o) => s + pwMins(o.a[1]), 0);
    const rows = items.map(o => {
      const a = o.a,
        i = o.i;
      const n = NAT[a[4]] || NAT.info;
      const blk = a[2] && (a[2].k === 'planning' || a[2].k === 'taches' || a[2].k === 'revue');
      if (blk && a[2].k === 'revue') {
        return '<div class="pw-item pw-block" draggable="true" ondragstart="pwDragStart(event,' + i + ')" ondragend="pwDragEnd(event)" ondragover="pwDragOver(event)" ondrop="pwDropItem(event,' + i + ')"><span class="agenda-grip">' + PW_ICO.grip + '</span><span class="agenda-num">' + (i + 1) + '</span><div class="pw-item-b"><div class="pw-item-t">' + PW_ICO.plan + 'Revue du projet<span class="pw-blk-tag">bloc</span></div><div class="pw-item-m"><span class="pw-blk-sum">' + revueSummary(curPrepKey) + '</span></div><div class="pw-blk-hint">Planning complet, toutes les tâches, décisions précédentes et alertes — affichés en séance</div></div><input class="pw-dur" value="' + pwMins(a[1]) + '" onchange="pwSetDur(' + i + ',this.value)"><span class="pw-dur-u">min</span><span class="agenda-x" onclick="prepDelPoint(' + i + ')">' + PW_ICO.x + '</span></div>';
      }
      if (blk) {
        const isP = a[2].k === 'planning';
        const opts = isP ? PLAN_MODES : TASK_FILTERS;
        const cur = isP ? a[2].mode : a[2].filter;
        const seg = Object.keys(opts).map(k => '<button class="pw-seg' + (k === cur ? ' on' : '') + '" onclick="pwBlockSet(' + i + ',\'' + (isP ? 'mode' : 'filter') + '\',\'' + k + '\')">' + opts[k][0] + '</button>').join('');
        return '<div class="pw-item pw-block" draggable="true" ondragstart="pwDragStart(event,' + i + ')" ondragend="pwDragEnd(event)" ondragover="pwDragOver(event)" ondrop="pwDropItem(event,' + i + ')"><span class="agenda-grip">' + PW_ICO.grip + '</span><span class="agenda-num">' + (i + 1) + '</span><div class="pw-item-b"><div class="pw-item-t">' + (isP ? PW_ICO.plan : PW_ICO.task) + a[0] + '<span class="pw-blk-tag">bloc</span></div><div class="pw-item-m"><div class="pw-segs">' + seg + '</div><span class="pw-blk-sum">' + (isP ? planSummary(cur) : taskSummary(cur)) + '</span></div><div class="pw-blk-hint">' + opts[cur][1] + ' — affiché tel quel en séance</div></div><input class="pw-dur" value="' + pwMins(a[1]) + '" onchange="pwSetDur(' + i + ',this.value)"><span class="pw-dur-u">min</span><span class="agenda-x" onclick="prepDelPoint(' + i + ')">' + PW_ICO.x + '</span></div>';
      }
      const orig = a[2] ? '<span class="pw-orig">' + PW_ICO.hist + ORIG_SHORT[a[2].k] + '</span>' : '';
      return '<div class="pw-item" draggable="true" ondragstart="pwDragStart(event,' + i + ')" ondragend="pwDragEnd(event)" ondragover="pwDragOver(event)" ondrop="pwDropItem(event,' + i + ')"><span class="agenda-grip">' + PW_ICO.grip + '</span><span class="agenda-num">' + (i + 1) + '</span><div class="pw-item-b"><div class="pw-item-t">' + a[0] + '</div><div class="pw-item-m">' + orig + '<select class="pw-nat" onchange="pwSetNature(' + i + ',this.value)">' + Object.keys(NAT).map(k => '<option value="' + k + '"' + (a[4] === k ? ' selected' : '') + '>' + NAT[k][0] + '</option>').join('') + '</select></div></div><input class="pw-dur" value="' + pwMins(a[1]) + '" onchange="pwSetDur(' + i + ',this.value)"><span class="pw-dur-u">min</span><span class="agenda-x" onclick="prepDelPoint(' + i + ')">' + PW_ICO.x + '</span></div>';
    }).join('');
    const n = NAT[sec.nature] || NAT.info;
    return '<div class="pw-sec" ondragover="pwDragOver(event)" ondrop="pwDropSec(event,\'' + sec.id + '\')"><div class="pw-sec-h"><span class="pw-sec-t">' + sec.title + '</span><span class="pw-nat-pill" style="background:' + n[1] + ';color:' + n[2] + '">' + n[0] + '</span><span class="pw-sec-d' + (sum > sec.dur ? ' over' : '') + '">' + sum + ' / ' + sec.dur + ' min</span></div>' + (rows || '<div class="pw-drop">Glissez un point ici, ou ajoutez-en un ci-dessous</div>') + '<div class="inst-addrow pw-addrow"><input class="input" id="pw-in-' + sec.id + '" placeholder="Ajouter un point…" onkeydown="if(event.key===\'Enter\')pwAddTo(\'' + sec.id + '\')"><input class="input prep-min" id="pw-min-' + sec.id + '" placeholder="min" onkeydown="if(event.key===\'Enter\')pwAddTo(\'' + sec.id + '\')"><button class="meet-mini-btn" onclick="pwAddTo(\'' + sec.id + '\')">Ajouter</button></div></div>';
  }).join('');
  const openTotal = ['decisions', 'actions', 'arbs', 'risks'].reduce((a, k) => a + (C[k] || 0), 0);
  /* colonne gauche */
  const docs = x.docs.map((d, i) => {
    const t = DOC_TONE[d[2]];
    return '<div class="doc-row"><span class="doc-ico" style="background:' + t[0] + ';color:' + t[1] + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">' + docIcoSvg(d[2]) + '</svg></span><div class="doc-body"><div class="doc-name">' + d[0] + '</div><div class="doc-meta">' + d[1] + '</div></div><span class="doc-act" onclick="prepViewDoc(' + i + ')">Voir</span><span class="agenda-x" onclick="prepDelDoc(' + i + ')">' + PW_ICO.x + '</span></div>';
  }).join('') || '<div class="pw-empty">Aucun support joint</div>';
  const parts = x.parts.map((p, i) => '<label class="part-chip pw-pc" title="' + (photos()[p[0]] ? 'Changer la photo' : 'Ajouter une photo') + '">' + avHtml(p[0], p[1], ' data-cam="1"') + '<input type="file" accept="image/*" hidden onchange="setPhoto(\'' + p[0] + '\',this)">' + dirName(p[0]) + '<span class="part-x" onclick="event.preventDefault();prepDelPart(' + i + ')">' + PW_ICO.x + '</span></label>').join('') + (x.partsN > x.parts.length ? '<span class="part-chip">+' + (x.partsN - x.parts.length) + ' autres</span>' : '');
  const rules = [...new Set(tpl.sections.flatMap(s => s.pull || []))].filter(k => PULL_KINDS[k]).map(k => PULL_KINDS[k].toLowerCase());
  const left = '<div class="inst-banner" style="background:' + x.bg + ';color:' + x.fg + '"><div class="ib-date" style="color:' + x.fg + '"><span class="d">' + x.d + '</span><span class="m">' + x.m + '</span></div><div class="ib-meta"><div class="ib-title">' + x.name + '<span class="badge ' + x.badge + '">' + x.type + '</span></div><div class="ib-sub">' + x.sub + '</div></div></div>' + '<div class="pw-card pw-tpl"><div class="pw-card-h">' + PW_ICO.tpl + 'Modèle ' + x.type + '<span class="pw-link" onclick="pwOpenTpl(\'' + x.type + '\')">Modifier</span></div><div class="pw-tpl-l">' + tpl.label + '</div><div class="pw-tpl-m">' + tpl.cadence + ' · ' + tpl.jour + ' ' + tpl.heure + ' · ' + pwFmt(tpl.duree) + '</div><div class="pw-tpl-m">' + tpl.sections.length + ' sections · ' + (tpl.up ? 'transmet au <b>' + tpl.up + '</b>' : 'instance terminale') + '</div><div class="pw-tpl-r"><b>Reprise :</b> ' + (rules.length ? rules.join(', ') : 'aucune règle') + '</div></div>' + '<div class="inst-sec"><div class="inst-sec-head"><span class="inst-sec-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/></svg>Participants (' + x.partsN + ')</span></div>' + pwTeamsPicker(x) + '<div class="part-grid">' + parts + '</div><div class="inst-addrow"><input class="input" id="prep-part-in" placeholder="Convoquer…" onkeydown="if(event.key===\'Enter\')prepAddPart()"><button class="meet-mini-btn" onclick="prepAddPart()">Convoquer</button></div></div>' + '<div class="inst-sec"><div class="inst-sec-head"><span class="inst-sec-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>Supports</span><label class="inst-add" style="cursor:pointer">+ Joindre<input type="file" multiple style="display:none" onchange="prepAttach(this)"></label></div>' + docs + '</div>' + convocSec(key);
  /* colonne droite */
  const tabs = [['prev', 'Séance précédente'], ['remontes', 'Remontés'], ['hist', 'Mémoire']];
  const prevN = (C.decisions || 0) + (C.actions || 0) + (C.arbs || 0) + (C.risks || 0);
  const tabBar = tabs.map(t => {
    const n = t[0] === 'prev' ? prevN : C[t[0]] || 0;
    return '<button class="pw-tab' + (PW_TAB === t[0] ? ' on' : '') + '" onclick="pwTab(\'' + t[0] + '\')">' + t[1] + (n ? '<span class="pw-tab-n">' + n + '</span>' : '') + '</button>';
  }).join('');
  const grp = (k, lbl) => {
    const l = S[k] || [];
    if (!l.length) return '';
    return '<div class="pw-grp">' + lbl + '</div>' + l.slice().sort((a, b) => b.open - a.open).map(it => pwSrcRow(k, it)).join('');
  };
  const list = PW_TAB === 'hist' ? pwHistory(key) : PW_TAB === 'prev' ? grp('decisions', 'Décisions') + grp('actions', 'Actions') + grp('arbs', 'Arbitrages') + grp('risks', 'Risques') || '<div class="pw-empty">Première séance de la série.</div>' : (S[PW_TAB] || []).length ? S[PW_TAB].map(it => pwSrcRow(PW_TAB, it)).join('') : '<div class="pw-empty">Rien à reprendre.</div>';
  const right = '<div class="pw-right-h"><span class="pw-right-t">À reprendre</span><span class="pw-right-n">' + openTotal + ' élément' + (openTotal > 1 ? 's' : '') + ' en attente</span></div><div class="pw-tabs">' + tabBar + '</div><div class="pw-list">' + list + '</div>';
  const hasR = x.agenda.some(a => a[2] && a[2].k === 'revue');
  /* mode simple : structure standard, l'utilisateur coche / décoche */
  const B = pwBlocks(x);
  const nAct = (S.actions || []).filter(i => i.open).length,
    nArb = (S.arbs || []).filter(i => i.open).length + (S.decisions || []).filter(i => i.open).length;
  const curTeam = x.team && teamById(x.team);
  const sub = {
    presents: '<span class="pw-avs">' + x.parts.map(p => avHtml(p[0], p[1])).join('') + '</span>' + x.partsN + ' participants convoqués' + (curTeam ? ' · <b style="color:' + curTeam.color + '">' + curTeam.name + '</b>' : ''),
    objectif: '<input class="input pw-goal" placeholder="En une phrase, ce que la séance doit produire…" value="' + (x.goal || '') + '" onclick="pwSetGoal(this.value)" onchange="pwSetGoal(this.value)">',
    tour: 'Chaque participant, 1 minute',
    actions: nAct + ' action' + (nAct > 1 ? 's' : '') + ' en cours · historique des séances précédentes',
    avancement: revueSummary(curPrepKey),
    planning: '<span class="pw-plan-mini">' + PHASES.map(p => '<i style="flex:' + p[2] + ';background:' + (p[3] === 'done' ? 'var(--state-success)' : p[3] === 'cur' ? 'var(--brand-gold)' : 'var(--neutral-300)') + '"></i>').join('') + '</span>' + planSummary(Object.keys(PLAN_MODES)[0]) + ' · ' + pwPlanJal('b:planning').length + ' à présenter',
    arbitrage: nArb ? nArb + ' point' + (nArb > 1 ? 's' : '') + ' à trancher' : 'Rien en attente'
  };
  const order = pwOrder(x);
  let num = 0;
  const row = (k, on, title, meta, right, del) => {
    if (on) num++;
    const A = pwAttOf(k),
      n = A.items.length + (A.note ? 1 : 0);
    const cnt = n ? '<span class="pw-att-n" title="' + n + ' élément' + (n > 1 ? 's' : '') + ' attaché' + (n > 1 ? 's' : '') + '">' + PW_ICO.clip + n + '</span>' : '';
    return '<div class="pw-item pw-lite' + (on ? '' : ' off') + '" draggable="true" ondragstart="pwSDragStart(event,\'' + k + '\')" ondragend="pwDragEnd(event)" ondragover="pwSDragOver(event)" ondragleave="pwSDragLeave(event)" ondrop="pwSDrop(event,\'' + k + '\')"><div class="pw-lite-row"><span class="pw-grip" title="Glisser pour déplacer">' + PW_ICO.grip + '</span>' + (k[0] === 'b' ? '<span class="pw-chk' + (on ? ' on' : '') + '" onclick="pwBlkToggle(\'' + k.slice(2) + '\')">' + (on ? PW_ICO.chk : '') + '</span>' : '<span class="pw-chk on">' + PW_ICO.chk + '</span>') + '<span class="agenda-num">' + (on ? num : '–') + '</span><div class="pw-item-b" onclick="pwToggleOpen(\'' + k + '\')"><div class="pw-item-t">' + title + cnt + '</div>' + (meta ? '<div class="pw-item-m">' + meta + '</div>' : '') + '</div>' + right + '<span class="pw-updn"><button onclick="pwSMove(\'' + k + '\',-1)" title="Monter">▲</button><button onclick="pwSMove(\'' + k + '\',1)" title="Descendre">▼</button></span>' + (del || '') + '<span class="pw-caret" onclick="pwToggleOpen(\'' + k + '\')" title="Compléter ce point">' + PW_ICO.edit + '</span></div></div>';
  };
  const std = order.map(k => {
    if (k[0] === 'b') {
      const b = PW_STD.find(z => z[0] === k.slice(2));
      const s = B[b[0]];
      return row(k, s.on, b[1], sub[b[0]], s.on ? '<input class="pw-dur" value="' + s.dur + '" onchange="pwBlkDur(\'' + b[0] + '\',this.value)"><span class="pw-dur-u">min</span>' : '<span class="pw-off-l">retiré</span>');
    }
    const i = pwIdx(k),
      a = x.agenda[i];
    if (!a) return '';
    const orig = a[2] ? '<span class="pw-orig">' + PW_ICO.hist + ORIG_SHORT[a[2].k] + '</span>' : '';
    return row(k, true, a[0] + ' ' + orig, '', '<input class="pw-dur" value="' + pwMins(a[1]) + '" onchange="pwSetDur(' + i + ',this.value)"><span class="pw-dur-u">min</span>', '<span class="agenda-x" onclick="prepDelPoint(' + i + ')">' + PW_ICO.x + '</span>');
  }).join('');
  const simple = '<div class="pw-simple">' + std + '<div class="inst-addrow pw-addrow"><input class="input" id="pw-in-simple" placeholder="Ajouter un point spécifique…" onkeydown="if(event.key===\'Enter\')pwAddSimple()"><button class="meet-mini-btn" onclick="pwAddSimple()">Ajouter</button></div></div>';
  const stdTotal = PW_STD.reduce((s, b) => s + (B[b[0]].on ? B[b[0]].dur : 0), 0);
  const modeSw = '<span class="pw-saved" id="pw-saved">' + (PW_SAVED_AT ? 'Enregistré à ' + PW_SAVED_AT.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  }) : 'Enregistrement automatique') + '</span><button class="pw-link pw-modesw" onclick="pwMode(' + (PW_SIMPLE ? 'false' : 'true') + ')">' + (PW_SIMPLE ? 'Organiser par sections' : 'Vue simple') + '</button>';
  const midTotal = PW_SIMPLE ? total + stdTotal : total,
    midOver = midTotal > tpl.duree,
    midN = PW_SIMPLE ? num : x.agenda.length;
  const mid = '<div class="pw-mid-h"><div><div class="pw-mid-t">' + PW_ICO.odj + 'Ordre du jour</div><div class="pw-mid-m">' + midN + ' points · <b class="' + (midOver ? 'over' : '') + '">' + pwFmt(midTotal) + '</b> / ' + pwFmt(tpl.duree) + (midOver ? ' · <span class="over">' + pwFmt(midTotal - tpl.duree) + ' de trop</span>' : '') + '</div></div>' + modeSw + '</div>' + (PW_SIMPLE ? simple : '<div class="pw-tools"><span class="pw-tools-l">Ajouter à l\'ordre du jour</span><button class="pw-tool' + (hasR ? ' done' : '') + '" onclick="pwAddBlock(\'revue\')">' + PW_ICO.plan + 'Revue du projet<small>planning, tâches, décisions, alertes — tout</small></button><button class="pw-tool gold" onclick="pwAutoFill()"' + (openTotal ? '' : ' disabled') + '>' + PW_ICO.bolt + 'Points à trancher<small>' + (openTotal ? openTotal + ' décisions, actions, arbitrages en attente' : 'tout est repris') + '</small></button></div>' + secs);
  document.getElementById('prepBody').innerHTML = '<div class="pw"><div class="pw-left">' + left + '</div><div class="pw-mid">' + mid + '</div><div class="pw-right">' + right + '</div></div>';
  const m = document.querySelector('#prepModal .modal');
  if (m) m.classList.add('modal-prep-xl');
  document.getElementById('prepModal').classList.add('open');
};

/* ─── éditeur de modèle ─── */
let TPL_DRAFT = null,
  TPL_TYPE = null;
function pwOpenTpl(type) {
  TPL_TYPE = TYPE_TPL[type] ? type : 'COPROJ';
  TPL_DRAFT = JSON.parse(JSON.stringify(TYPE_TPL[TPL_TYPE]));
  let ov = document.getElementById('tplModal');
  if (!ov) {
    ov = document.createElement('div');
    ov.className = 'modal-overlay';
    ov.id = 'tplModal';
    ov.setAttribute('onclick', 'if(event.target===this)pwCloseTpl()');
    document.body.appendChild(ov);
  }
  pwRenderTpl();
  ov.classList.add('open');
}
function pwCloseTpl() {
  const o = document.getElementById('tplModal');
  if (o) o.classList.remove('open');
}
function pwTplSet(k, v) {
  TPL_DRAFT[k] = v;
}
function pwTplSec(i, k, v) {
  TPL_DRAFT.sections[i][k] = k === 'dur' ? parseInt(v) || 0 : v;
  if (k === 'nature' || k === 'dur') pwRenderTpl();
}
function pwTplPull(i, k) {
  const p = TPL_DRAFT.sections[i].pull || (TPL_DRAFT.sections[i].pull = []);
  const j = p.indexOf(k);
  if (j < 0) p.push(k);else p.splice(j, 1);
  pwRenderTpl();
}
function pwTplAddSec() {
  TPL_DRAFT.sections.push({
    id: 's' + Date.now(),
    title: 'Nouvelle section',
    dur: 10,
    nature: 'info',
    pull: []
  });
  pwRenderTpl();
}
function pwTplDelSec(i) {
  TPL_DRAFT.sections.splice(i, 1);
  pwRenderTpl();
}
function pwTplMove(i, d) {
  const s = TPL_DRAFT.sections;
  const j = i + d;
  if (j < 0 || j >= s.length) return;
  const t = s[i];
  s[i] = s[j];
  s[j] = t;
  pwRenderTpl();
}
function pwTplPart(ini) {
  const p = TPL_DRAFT.parts;
  const j = p.indexOf(ini);
  if (j < 0) p.push(ini);else p.splice(j, 1);
  pwRenderTpl();
}
function pwTplSwitch(t) {
  TPL_TYPE = t;
  TPL_DRAFT = JSON.parse(JSON.stringify(TYPE_TPL[t]));
  pwRenderTpl();
}
function pwTplReset() {
  TPL_DRAFT = JSON.parse(JSON.stringify(TPL_DEFAULTS[TPL_TYPE]));
  pwRenderTpl();
  showToast('Modèle ' + TPL_TYPE + ' rétabli aux valeurs standard (non enregistré)');
}
function pwTplSave() {
  TYPE_TPL[TPL_TYPE] = JSON.parse(JSON.stringify(TPL_DRAFT));
  tplSave();
  pwCloseTpl();
  if (document.getElementById('prepModal').classList.contains('open')) prepRerender();
  showToast('Modèle ' + TPL_TYPE + ' enregistré · ' + TPL_DRAFT.sections.length + ' sections · ' + pwFmt(TPL_DRAFT.sections.reduce((s, x) => s + x.dur, 0)));
}
function pwRenderTpl() {
  const d = TPL_DRAFT;
  const sum = d.sections.reduce((s, x) => s + x.dur, 0);
  const types = Object.keys(TYPE_TPL).map(t => '<button class="pw-tab' + (t === TPL_TYPE ? ' on' : '') + '" onclick="pwTplSwitch(\'' + t + '\')">' + t + '</button>').join('');
  const opt = (arr, v) => arr.map(o => '<option' + (o === v ? ' selected' : '') + '>' + o + '</option>').join('');
  const secs = d.sections.map((s, i) => {
    const n = NAT[s.nature] || NAT.info;
    return '<div class="tpl-sec"><div class="tpl-sec-r1"><span class="tpl-ord"><span onclick="pwTplMove(' + i + ',-1)">▲</span><span onclick="pwTplMove(' + i + ',1)">▼</span></span><input class="input tpl-title" value="' + s.title.replace(/"/g, '&quot;') + '" oninput="pwTplSec(' + i + ',\'title\',this.value)"><input class="input tpl-dur" value="' + s.dur + '" onchange="pwTplSec(' + i + ',\'dur\',this.value)"><span class="pw-dur-u">min</span><select class="nselect tpl-nat" onchange="pwTplSec(' + i + ',\'nature\',this.value)">' + Object.keys(NAT).map(k => '<option value="' + k + '"' + (s.nature === k ? ' selected' : '') + '>' + NAT[k][0] + '</option>').join('') + '</select><span class="agenda-x" onclick="pwTplDelSec(' + i + ')">' + PW_ICO.x + '</span></div><div class="tpl-pulls"><span class="tpl-pulls-l">Reprend automatiquement :</span>' + Object.keys(PULL_KINDS).map(k => '<span class="wchip' + ((s.pull || []).indexOf(k) >= 0 ? ' on' : '') + '" onclick="pwTplPull(' + i + ',\'' + k + '\')">' + PULL_KINDS[k] + '</span>').join('') + '</div></div>';
  }).join('');
  const parts = Object.keys(DIR).map(k => '<span class="part-chip tpl-part' + (d.parts.indexOf(k) >= 0 ? ' on' : '') + '" onclick="pwTplPart(\'' + k + '\')"><span class="av ' + DIR[k][3] + '">' + k + '</span>' + DIR[k][0] + '</span>').join('');
  const ups = ['—', 'COPROJ', 'COPIL', 'COTECH', 'CODIR', 'CRA', 'COMEX'];
  document.getElementById('tplModal').innerHTML = '<div class="modal modal-tpl"><div class="modal-head"><div class="modal-head-ico">' + PW_ICO.tpl + '</div><div><div class="modal-title">Modèles d\'instance</div><div class="modal-sub">Chaque type de réunion a son ordre du jour type, sa cadence, ses participants et ses règles de reprise. Le modèle s\'applique à toute nouvelle séance du type.</div></div><button class="modal-close" onclick="pwCloseTpl()">' + PW_ICO.x + '</button></div>' + '<div class="modal-body tpl-body"><div class="pw-tabs tpl-types">' + types + '</div>' + '<div class="ni-grid2"><div class="field"><label class="field-label">Libellé</label><input class="input" value="' + d.label + '" oninput="pwTplSet(\'label\',this.value)"></div><div class="field"><label class="field-label">Transmet les sujets non tranchés à</label><select class="selectbox" onchange="pwTplSet(\'up\',this.value===\'—\'?null:this.value)">' + opt(ups, d.up || '—') + '</select></div></div>' + '<div class="ni-grid3" style="grid-template-columns:1fr 1fr 1fr 1fr"><div class="field"><label class="field-label">Cadence</label><select class="selectbox" onchange="pwTplSet(\'cadence\',this.value)">' + opt(['Hebdomadaire', 'Bimensuel', 'Mensuel', 'Trimestriel', 'Semestriel', 'Ponctuel'], d.cadence) + '</select></div><div class="field"><label class="field-label">Jour</label><select class="selectbox" onchange="pwTplSet(\'jour\',this.value)">' + opt(['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', '—'], d.jour) + '</select></div><div class="field"><label class="field-label">Heure</label><input class="input" value="' + d.heure + '" oninput="pwTplSet(\'heure\',this.value)"></div><div class="field"><label class="field-label">Durée cible (min)</label><input class="input" value="' + d.duree + '" onchange="pwTplSet(\'duree\',parseInt(this.value)||60)"></div></div>' + '<div class="field"><label class="field-label">Lieu par défaut</label><input class="input" value="' + d.lieu + '" oninput="pwTplSet(\'lieu\',this.value)"></div>' + '<div class="field"><label class="field-label">Équipe permanente (' + d.parts.length + ')</label><div class="part-grid">' + parts + '</div></div>' + '<div class="field"><div class="inst-sec-head"><label class="field-label" style="margin:0">Ordre du jour type — ' + d.sections.length + ' sections · <b class="' + (sum > d.duree ? 'over' : '') + '">' + pwFmt(sum) + '</b> / ' + pwFmt(d.duree) + '</label><span class="inst-add" onclick="pwTplAddSec()">+ Ajouter une section</span></div>' + secs + '</div>' + '<label class="tpl-toggle"><input type="checkbox"' + (d.auto ? ' checked' : '') + ' onchange="pwTplSet(\'auto\',this.checked)"><span>Proposer le remplissage automatique à l\'ouverture de chaque préparation</span></label>' + '</div><div class="modal-foot"><button class="btn btn-secondary" onclick="pwTplReset()">Valeurs standard</button><span style="flex:1"></span><button class="btn btn-secondary" onclick="pwCloseTpl()">Annuler</button><button class="btn btn-primary" onclick="pwTplSave()">Enregistrer le modèle</button></div></div>';
}

/* ─── retour de séance : kinds supplémentaires ─── */
Object.assign(ORIG_META, {
  action: {
    lbl: 'Action du point précédent',
    c: 'var(--state-info)',
    bg: 'var(--state-info-bg)',
    q: 'Où en est cette action ?',
    opts: [['done', 'Terminée'], ['ongoing', 'En cours'], ['late', 'En retard']]
  },
  risk: {
    lbl: 'Risque suivi',
    c: 'var(--state-danger)',
    bg: 'var(--state-danger-bg)',
    q: 'Évolution du risque',
    opts: [['down', 'Maîtrisé'], ['same', 'Inchangé'], ['up', 'Aggravé']]
  },
  remonte: {
    lbl: 'Sujet remonté du niveau inférieur',
    c: 'var(--purple)',
    bg: 'var(--purple-bg)',
    q: 'Verdict de cette instance',
    opts: [['adopte', 'Adopté'], ['rejete', 'Rejeté'], ['reporte', 'Reporté']]
  }
});
Object.assign(ORIG_TXT, {
  down: 'maîtrisé',
  same: 'inchangé',
  up: 'aggravé'
});
const _origSet = origSet;
window.origSet = function (v) {
  const p = MEET.points[MEET.cur],
    o = p.origin;
  _origSet(v);
  if (!o) return;
  if (o.k === 'action' && INST_CR[o.prev] && INST_CR[o.prev].actions[o.i]) INST_CR[o.prev].actions[o.i][2] = v === 'done';
  if (o.k === 'remonte') {
    REMONTES.splice(o.i, 1);
  }
};
/* en séance : le bloc planning / tâches s'affiche tel que réglé en préparation */
const _renderMeet = renderMeet;
window.renderMeet = function () {
  _renderMeet();
  const p = MEET && MEET.points[MEET.cur];
  if (!p || !p.origin) return;
  if (p.origin.k === 'revue') {
    const html = '<div class="meet-cap meet-blk"><div class="meet-cap-h">' + PW_ICO.plan + 'Revue du projet</div>' + revueView(MEET_KEY) + '</div>';
    const sub = document.querySelector('#meetPanel .meet-panel-sub');
    if (sub) sub.insertAdjacentHTML('afterend', html);
    return;
  }
  if (p.origin.k !== 'planning' && p.origin.k !== 'taches') return;
  const isP = p.origin.k === 'planning';
  const opts = isP ? PLAN_MODES : TASK_FILTERS;
  const cur = isP ? p.origin.mode : p.origin.filter;
  const seg = Object.keys(opts).map(k => '<button class="pw-seg' + (k === cur ? ' on' : '') + '" onclick="MEET.points[MEET.cur].origin.' + (isP ? 'mode' : 'filter') + '=\'' + k + '\';renderMeet()">' + opts[k][0] + '</button>').join('');
  const html = '<div class="meet-cap meet-blk"><div class="meet-cap-h">' + (isP ? PW_ICO.plan : PW_ICO.task) + (isP ? 'Planning du projet' : 'Tâches du projet') + '<div class="pw-segs" style="margin-left:auto">' + seg + '</div></div>' + (isP ? planView(cur) : taskView(cur)) + '</div>';
  const sub = document.querySelector('#meetPanel .meet-panel-sub');
  if (sub) sub.insertAdjacentHTML('afterend', html);
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/modules/prep-workspace.js", error: String((e && e.message) || e) }); }

// ui_kits/app/modules/reunions.js
try { (() => {
/* Réunions & instances de gouvernance
   Extrait de « Refonte Portail Client.html ». Script classique, portée globale partagée.
   Chargé avant le script principal. Dépendances globales : fmtEur(), showToast(), showView(). */

/* ═══════════ RÉUNIONS & INSTANCES DE GOUVERNANCE ═══════════ */
const MTG_TODAY = '2026-07-27';
const MTG_INST = [{
  id: 'codir',
  name: 'CODIR',
  full: 'Comité de Direction',
  color: 'var(--purple)',
  cad: 'Mensuel',
  chair: 'Isabelle Fournier — DG',
  quorum: 5,
  members: ['Isabelle Fournier', 'Marc Delaunay', 'Sophie Marchand', 'Claire Dubois', 'Antoine Roy', 'Farida Haddad', 'Paul Mercier'],
  scope: 'Arbitrages stratégiques, portefeuille, budget'
}, {
  id: 'copil',
  name: 'COPIL',
  full: 'Comité de Pilotage Transformation',
  color: 'var(--state-info)',
  cad: 'Bi-mensuel',
  chair: 'Marc Delaunay — DSI',
  quorum: 4,
  members: ['Marc Delaunay', 'Sophie Marchand', 'Julie Fontaine', 'Karim Bensaïd', 'Claire Dubois', 'Nicolas Blanc'],
  scope: 'Avancement programmes, jalons, risques projets'
}, {
  id: 'coproj',
  name: 'COPROJ',
  full: 'Comité Projet — Portail Client',
  color: 'var(--brand-gold)',
  cad: 'Hebdomadaire',
  chair: 'Sophie Marchand — Cheffe de projet',
  quorum: 3,
  members: ['Sophie Marchand', 'Julie Fontaine', 'Marc Lefèvre', 'Nadia Cherif', 'Paul Mercier'],
  scope: 'Sprint, blocages, livrables, recette'
}, {
  id: 'crisk',
  name: 'Comité Risques',
  full: 'Comité des Risques & Sécurité',
  color: 'var(--state-danger)',
  cad: 'Trimestriel',
  chair: 'Amélie Rousseau — RSSI adj.',
  quorum: 4,
  members: ['Amélie Rousseau', 'Marc Delaunay', 'Hugo Petit', 'Karim Bensaïd', 'Isabelle Fournier'],
  scope: 'Cartographie risques, incidents, plans de traitement'
}, {
  id: 'cconf',
  name: 'Revue Conformité',
  full: 'Revue de Conformité RGPD / ISO',
  color: 'var(--state-success)',
  cad: 'Trimestriel',
  chair: 'Hugo Petit — Juriste',
  quorum: 3,
  members: ['Hugo Petit', 'Amélie Rousseau', 'Farida Haddad', 'Claire Dubois'],
  scope: 'Écarts référentiels, preuves, remédiation'
}];
let MTG_LIST = [{
  id: 'm1',
  t: 'codir',
  title: 'CODIR de juillet — arbitrage budgétaire S2',
  date: '2026-07-30',
  time: '09:00',
  dur: 120,
  loc: 'Salle Everest + Teams',
  st: 'plan',
  pres: [],
  exc: ['Antoine Roy'],
  ag: [{
    t: 'Revue portefeuille et avancement T2',
    d: 25,
    o: 'Marc Delaunay',
    k: 'info',
    links: [{
      k: 'doc',
      n: 'Support CODIR juillet 2026.pdf'
    }, {
      k: 'doc',
      n: 'Quarterplan S2 2026.xlsx'
    }]
  }, {
    t: 'Arbitrage enveloppe S2 — Migration ERP',
    d: 35,
    o: 'Claire Dubois',
    k: 'arb',
    links: [{
      k: 'doc',
      n: 'Budget S2 — arbitrage.xlsx'
    }, {
      k: 'projet',
      n: 'Migration ERP'
    }, {
      k: 'risque',
      n: 'R-021 · Dépassement budgétaire ERP'
    }]
  }, {
    t: 'Validation du plan de remédiation RGPD',
    d: 25,
    o: 'Hugo Petit',
    k: 'deci',
    links: [{
      k: 'plan',
      n: 'PA-2026-03 · Remédiation RGPD'
    }, {
      k: 'ecart',
      n: 'RGPD art.30 · Registre incomplet'
    }]
  }, {
    t: 'Point capacité équipes IT',
    d: 20,
    o: 'Sophie Marchand',
    k: 'info'
  }, {
    t: 'Questions diverses',
    d: 15,
    o: '—',
    k: 'info'
  }],
  dec: [],
  act: []
}, {
  id: 'm2',
  t: 'coproj',
  title: 'COPROJ Portail Client — semaine 31',
  date: '2026-07-29',
  time: '14:00',
  dur: 45,
  loc: 'Teams',
  st: 'plan',
  pres: [],
  exc: [],
  ag: [{
    t: 'Avancement sprint 14',
    d: 15,
    o: 'Julie Fontaine',
    k: 'info'
  }, {
    t: 'Blocage API facturation',
    d: 15,
    o: 'Marc Lefèvre',
    k: 'arb'
  }, {
    t: 'Préparation recette utilisateurs',
    d: 15,
    o: 'Nadia Cherif',
    k: 'deci'
  }],
  dec: [],
  act: []
}, {
  id: 'm3',
  t: 'copil',
  title: 'COPIL Transformation — jalon Migration Cloud',
  date: '2026-07-16',
  time: '10:00',
  dur: 90,
  loc: 'Salle Mont-Blanc',
  st: 'crv',
  pres: ['Marc Delaunay', 'Sophie Marchand', 'Julie Fontaine', 'Karim Bensaïd', 'Claire Dubois'],
  exc: ['Nicolas Blanc'],
  ag: [{
    t: 'Bilan phase 2 Migration Cloud',
    d: 30,
    o: 'Karim Bensaïd',
    k: 'info',
    links: [{
      k: 'projet',
      n: 'Migration Infrastructure Cloud'
    }, {
      k: 'tache',
      n: 'Bascule production Migration Cloud'
    }]
  }, {
    t: 'Go / No-go bascule production',
    d: 35,
    o: 'Marc Delaunay',
    k: 'deci',
    links: [{
      k: 'risque',
      n: 'R-014 · Retard bascule production'
    }, {
      k: 'plan',
      n: "PA-2026-11 · Continuité d'activité"
    }]
  }, {
    t: 'Impacts budget et planning',
    d: 25,
    o: 'Claire Dubois',
    k: 'arb',
    links: [{
      k: 'doc',
      n: 'CR COPIL du 16 juillet.pdf'
    }]
  }],
  dec: [{
    txt: 'Go pour la bascule production le 12 septembre, sous réserve du PRA validé.',
    o: 'Marc Delaunay',
    pt: 1,
    link: {
      k: 'risque',
      n: 'R-014 · Retard bascule production'
    }
  }, {
    txt: 'Enveloppe complémentaire de 40 k€ accordée pour la reprise de données.',
    o: 'Claire Dubois',
    pt: 2,
    link: {
      k: 'doc',
      n: 'CR COPIL du 16 juillet.pdf'
    }
  }],
  act: [{
    txt: 'Finaliser et faire valider le plan de reprise d\'activité (PRA)',
    o: 'Karim Bensaïd',
    due: '2026-08-29',
    st: 'wip',
    pt: 1,
    link: {
      k: 'plan',
      n: "PA-2026-11 · Continuité d'activité"
    }
  }, {
    txt: 'Réviser le planning de bascule et communiquer aux métiers',
    o: 'Sophie Marchand',
    due: '2026-08-07',
    st: 'done',
    pt: 1,
    link: {
      k: 'tache',
      n: 'Bascule production Migration Cloud'
    }
  }, {
    txt: 'Ouvrir la ligne budgétaire complémentaire reprise de données',
    o: 'Claire Dubois',
    due: '2026-07-24',
    st: 'late',
    pt: 2
  }]
}, {
  id: 'm4',
  t: 'codir',
  title: 'CODIR de juin — revue semestrielle',
  date: '2026-06-25',
  time: '09:00',
  dur: 120,
  loc: 'Salle Everest',
  st: 'tenu',
  pres: ['Isabelle Fournier', 'Marc Delaunay', 'Sophie Marchand', 'Claire Dubois', 'Farida Haddad', 'Paul Mercier'],
  exc: ['Antoine Roy'],
  ag: [{
    t: 'Résultats S1 et atterrissage budgétaire',
    d: 35,
    o: 'Claire Dubois',
    k: 'info',
    links: [{
      k: 'doc',
      n: 'Budget S2 — arbitrage.xlsx'
    }]
  }, {
    t: 'Priorisation du portefeuille S2',
    d: 40,
    o: 'Isabelle Fournier',
    k: 'arb',
    links: [{
      k: 'doc',
      n: 'Quarterplan S2 2026.xlsx'
    }, {
      k: 'projet',
      n: 'Déploiement CRM'
    }]
  }, {
    t: 'Certification ISO 27001 — point d\'étape',
    d: 25,
    o: 'Farida Haddad',
    k: 'info',
    links: [{
      k: 'plan',
      n: 'PA-2026-08 · Certification ISO 27001'
    }, {
      k: 'ecart',
      n: "ISO A.5.15 · Contrôle d'accès"
    }]
  }, {
    t: 'Questions diverses',
    d: 20,
    o: '—',
    k: 'info'
  }],
  dec: [{
    txt: 'Le POC Data Lake est reporté au T1 2027 au profit du CRM.',
    o: 'Isabelle Fournier',
    pt: 1,
    link: {
      k: 'projet',
      n: 'Déploiement CRM'
    }
  }, {
    txt: 'Objectif de certification ISO 27001 confirmé pour décembre 2026.',
    o: 'Farida Haddad',
    pt: 2,
    link: {
      k: 'plan',
      n: 'PA-2026-08 · Certification ISO 27001'
    }
  }],
  act: [{
    txt: 'Reprioriser le quarterplan S2 dans l\'outil et le présenter au COPIL',
    o: 'Sophie Marchand',
    due: '2026-07-10',
    st: 'done',
    pt: 1,
    link: {
      k: 'doc',
      n: 'Quarterplan S2 2026.xlsx'
    }
  }, {
    txt: 'Constituer le dossier de preuves ISO 27001 (domaines A.5 à A.8)',
    o: 'Farida Haddad',
    due: '2026-09-30',
    st: 'wip',
    pt: 2,
    link: {
      k: 'tache',
      n: 'Collecte des preuves ISO 27001'
    }
  }]
}, {
  id: 'm5',
  t: 'crisk',
  title: 'Comité Risques T2 2026',
  date: '2026-06-18',
  time: '14:30',
  dur: 90,
  loc: 'Salle Mont-Blanc + Teams',
  st: 'tenu',
  pres: ['Amélie Rousseau', 'Marc Delaunay', 'Hugo Petit', 'Karim Bensaïd'],
  exc: ['Isabelle Fournier'],
  ag: [{
    t: 'Cartographie des risques — évolution trimestre',
    d: 30,
    o: 'Amélie Rousseau',
    k: 'info',
    links: [{
      k: 'risque',
      n: 'R-007 · Fuite de données clients'
    }, {
      k: 'risque',
      n: 'R-032 · Dépendance prestataire cloud'
    }]
  }, {
    t: 'Incident phishing de mai — retour d\'expérience',
    d: 25,
    o: 'Karim Bensaïd',
    k: 'info',
    links: [{
      k: 'doc',
      n: 'Rapport d\'audit cybersécurité.pdf'
    }]
  }, {
    t: 'Validation des plans de traitement',
    d: 35,
    o: 'Marc Delaunay',
    k: 'deci',
    links: [{
      k: 'plan',
      n: 'PA-2026-05 · Renforcement authentification'
    }, {
      k: 'tache',
      n: 'Déploiement MFA — 220 comptes'
    }]
  }],
  dec: [{
    txt: 'Déploiement du MFA généralisé validé pour l\'ensemble des collaborateurs avant fin T3.',
    o: 'Marc Delaunay',
    pt: 2,
    link: {
      k: 'plan',
      n: 'PA-2026-05 · Renforcement authentification'
    }
  }],
  act: [{
    txt: 'Déployer le MFA sur les 220 comptes restants',
    o: 'Karim Bensaïd',
    due: '2026-09-30',
    st: 'wip',
    pt: 2,
    link: {
      k: 'tache',
      n: 'Déploiement MFA — 220 comptes'
    }
  }, {
    txt: 'Organiser une campagne de sensibilisation phishing',
    o: 'Amélie Rousseau',
    due: '2026-07-18',
    st: 'late',
    pt: 1
  }]
}, {
  id: 'm6',
  t: 'cconf',
  title: 'Revue Conformité T3 — RGPD & ISO 27001',
  date: '2026-09-10',
  time: '10:00',
  dur: 90,
  loc: 'Teams',
  st: 'plan',
  pres: [],
  exc: [],
  ag: [{
    t: 'Écarts RGPD ouverts et preuves collectées',
    d: 30,
    o: 'Hugo Petit',
    k: 'info'
  }, {
    t: 'Avancement remédiation ISO 27001',
    d: 30,
    o: 'Farida Haddad',
    k: 'info'
  }, {
    t: 'Validation du registre des traitements',
    d: 30,
    o: 'Hugo Petit',
    k: 'deci'
  }],
  dec: [],
  act: []
}, {
  id: 'm7',
  t: 'coproj',
  title: 'COPROJ Portail Client — semaine 30',
  date: '2026-07-22',
  time: '14:00',
  dur: 45,
  loc: 'Teams',
  st: 'tenu',
  pres: ['Sophie Marchand', 'Julie Fontaine', 'Marc Lefèvre', 'Nadia Cherif'],
  exc: ['Paul Mercier'],
  ag: [{
    t: 'Avancement sprint 13',
    d: 15,
    o: 'Julie Fontaine',
    k: 'info',
    links: [{
      k: 'projet',
      n: 'Refonte Portail Client'
    }]
  }, {
    t: 'Arbitrage périmètre module notifications',
    d: 20,
    o: 'Sophie Marchand',
    k: 'arb'
  }, {
    t: 'Planning recette',
    d: 10,
    o: 'Nadia Cherif',
    k: 'info',
    links: [{
      k: 'tache',
      n: 'Recette utilisateurs Portail Client'
    }]
  }],
  dec: [{
    txt: 'Le module notifications push est décalé en V2 pour tenir la date de mise en production.',
    o: 'Sophie Marchand',
    pt: 1,
    link: {
      k: 'projet',
      n: 'Refonte Portail Client'
    }
  }],
  act: [{
    txt: 'Mettre à jour le backlog et informer les métiers du décalage V2',
    o: 'Julie Fontaine',
    due: '2026-07-31',
    st: 'wip',
    pt: 1
  }]
}, {
  id: 'm8',
  t: 'copil',
  title: 'COPIL Transformation — juin',
  date: '2026-06-04',
  time: '10:00',
  dur: 90,
  loc: 'Salle Mont-Blanc',
  st: 'ann',
  pres: [],
  exc: [],
  ag: [{
    t: 'Séance annulée — reportée au 16 juillet',
    d: 0,
    o: '—',
    k: 'info'
  }],
  dec: [],
  act: []
}];
const MTG_ST = {
  plan: 'Planifiée',
  tenu: 'Tenue',
  crv: 'CR à valider',
  ann: 'Annulée'
};
const MTG_ACTST = {
  wip: 'En cours',
  done: 'Terminée',
  late: 'En retard'
};
function mtgInst(id) {
  return MTG_INST.find(x => x.id === id);
}
function mtgIni(n) {
  return n.split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase();
}
function mtgFDate(d) {
  const [y, m, dd] = d.split('-');
  return dd + ' ' + ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'août', 'sep', 'oct', 'nov', 'déc'][+m - 1] + ' ' + y;
}
function mtgDur(m) {
  return m >= 60 ? m / 60 === Math.floor(m / 60) ? m / 60 + 'h' : Math.floor(m / 60) + 'h' + m % 60 : m + ' min';
}
function mtgSorted() {
  return MTG_LIST.slice().sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));
}
function mtgNextOf(id) {
  const up = MTG_LIST.filter(m => m.t === id && m.st === 'plan' && m.date >= MTG_TODAY).sort((a, b) => a.date.localeCompare(b.date));
  return up[0] || null;
}
function mtgAllActions() {
  const out = [];
  MTG_LIST.forEach(m => (m.act || []).forEach(a => out.push({
    ...a,
    m
  })));
  return out;
}
function mtgAllDecisions() {
  const out = [];
  MTG_LIST.forEach(m => (m.dec || []).forEach(d => out.push({
    ...d,
    m
  })));
  return out;
}
function mtgRender() {
  mtgTab('instances');
}
function mtgTab(t) {
  document.querySelectorAll('#view-reunions .mtg-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === t));
  ['instances', 'reunions', 'suivi'].forEach(x => {
    document.getElementById('mtg-' + x).style.display = x === t ? '' : 'none';
  });
  if (t === 'instances') mtgRenderInst();else if (t === 'reunions') mtgRenderList();else mtgRenderSuivi();
}
function mtgRenderInst() {
  const acts = mtgAllActions(),
    late = acts.filter(a => a.st === 'late').length,
    open = acts.filter(a => a.st !== 'done').length;
  const held = MTG_LIST.filter(m => m.st === 'tenu' || m.st === 'crv');
  const rates = held.map(m => {
    const inst = mtgInst(m.t);
    return m.pres.length / inst.members.length;
  });
  const avg = rates.length ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length * 100) : 0;
  const upcoming = MTG_LIST.filter(m => m.st === 'plan' && m.date >= MTG_TODAY).length;
  const kpis = '<div class="mtg-kpis">' + '<div class="mtg-kpi"><div class="l">Instances actives</div><div class="v">' + MTG_INST.length + '</div><div class="d">CODIR, COPIL, COPROJ, comités</div></div>' + '<div class="mtg-kpi"><div class="l">Réunions à venir</div><div class="v" style="color:var(--state-info)">' + upcoming + '</div><div class="d">Prochaine : ' + (mtgSorted().filter(m => m.st === 'plan' && m.date >= MTG_TODAY).sort((a, b) => a.date.localeCompare(b.date))[0] ? mtgFDate(mtgSorted().filter(m => m.st === 'plan' && m.date >= MTG_TODAY).sort((a, b) => a.date.localeCompare(b.date))[0].date) : '—') + '</div></div>' + '<div class="mtg-kpi"><div class="l">Taux de présence</div><div class="v" style="color:' + (avg >= 80 ? 'var(--state-success)' : 'var(--brand-gold-700)') + '">' + avg + '<small>%</small></div><div class="d">Moyenne sur les séances tenues</div></div>' + '<div class="mtg-kpi"><div class="l">Actions ouvertes</div><div class="v" style="color:' + (late ? 'var(--state-danger)' : 'var(--brand-ink)') + '">' + open + '</div><div class="d">' + (late ? late + ' en retard' : 'Aucun retard') + '</div></div>' + '</div>';
  const cards = MTG_INST.map(i => {
    const nx = mtgNextOf(i.id),
      n = MTG_LIST.filter(m => m.t === i.id).length;
    return '<div class="mtg-icard" onclick="mtgTab(\'reunions\');mtgFilterInst=\'' + i.id + '\';mtgRenderList()">' + '<div class="mtg-ihead"><div class="mtg-iav" style="background:' + i.color + '">' + i.name.slice(0, 2).toUpperCase() + '</div><div style="min-width:0"><div class="mtg-in">' + i.name + '</div><div class="mtg-if">' + i.full + '</div></div><span class="mtg-cad">' + i.cad + '</span></div>' + '<div class="mtg-irow"><span class="k">Président</span><span class="v">' + i.chair + '</span></div>' + '<div class="mtg-irow"><span class="k">Membres · quorum</span><span class="v">' + i.members.length + ' · ' + i.quorum + ' min.</span></div>' + '<div class="mtg-irow"><span class="k">Séances enregistrées</span><span class="v">' + n + '</span></div>' + '<div class="mtg-next' + (nx ? '' : ' none') + '">' + (nx ? 'Prochaine séance : ' + mtgFDate(nx.date) + ' à ' + nx.time : 'Aucune séance planifiée') + '</div>' + '</div>';
  }).join('');
  document.getElementById('mtg-instances').innerHTML = kpis + '<div class="mtg-igrid">' + cards + '</div>';
}
let mtgFilterInst = 'all';
function mtgRenderList() {
  const pills = '<div class="mtg-pills" style="margin-bottom:16px"><button class="mtg-pill' + (mtgFilterInst === 'all' ? ' sel' : '') + '" onclick="mtgFilterInst=\'all\';mtgRenderList()">Toutes</button>' + MTG_INST.map(i => '<button class="mtg-pill' + (mtgFilterInst === i.id ? ' sel' : '') + '" onclick="mtgFilterInst=\'' + i.id + '\';mtgRenderList()">' + i.name + '</button>').join('') + '</div>';
  const rows = mtgSorted().filter(m => mtgFilterInst === 'all' || m.t === mtgFilterInst).map(m => {
    const i = mtgInst(m.t),
      tot = i.members.length,
      p = m.pres.length,
      pct = tot ? Math.round(p / tot * 100) : 0,
      held = m.st === 'tenu' || m.st === 'crv';
    return '<tr onclick="mtgOpen(\'' + m.id + '\')">' + '<td><div class="mtg-mt">' + m.title + '</div><div class="mtg-ms">' + m.loc + ' · ' + mtgDur(m.dur) + '</div></td>' + '<td><span class="mtg-tag"><i style="background:' + i.color + '"></i>' + i.name + '</span></td>' + '<td><div style="font-weight:700">' + mtgFDate(m.date) + '</div><div class="mtg-ms">' + m.time + '</div></td>' + '<td><span class="mtg-badge ' + m.st + '"><i></i>' + MTG_ST[m.st] + '</span></td>' + '<td>' + (held ? '<div class="mtg-att"><div class="mtg-attb"><div class="mtg-attf" style="width:' + pct + '%;background:' + (pct >= 80 ? 'var(--state-success)' : 'var(--brand-gold)') + '"></div></div><span class="mtg-attn">' + p + '/' + tot + '</span></div>' : '<span class="mtg-ms">—</span>') + '</td>' + '<td class="r">' + ((m.dec || []).length || '–') + '</td><td class="r">' + ((m.act || []).length || '–') + '</td>' + '<td class="r">' + (m.st === 'plan' ? '<button class="liv-btn dark" style="padding:6px 13px;font-size:11.5px" onclick="event.stopPropagation();livStart(\'' + m.id + '\')">Lancer</button>' : '') + '</td></tr>';
  }).join('');
  document.getElementById('mtg-reunions').innerHTML = pills + '<div class="card" style="padding:20px 22px"><table class="mtg-tbl"><thead><tr><th>Réunion</th><th>Instance</th><th>Date</th><th>Statut</th><th>Présence</th><th class="r">Déc.</th><th class="r">Act.</th><th></th></tr></thead><tbody>' + (rows || '<tr><td colspan="8"><div class="mtg-empty">Aucune réunion pour cette instance.</div></td></tr>') + '</tbody></table></div>';
}
function mtgRenderSuivi() {
  const decs = mtgAllDecisions(),
    acts = mtgAllActions();
  const dr = decs.map(d => {
    const i = mtgInst(d.m.t);
    return '<tr onclick="mtgOpen(\'' + d.m.id + '\')"><td><div class="mtg-mt" style="font-weight:600;line-height:1.45">' + d.txt + '</div>' + (d.pt != null && (d.m.ag || [])[d.pt] ? '<div class="mtg-ms">Point ' + (d.pt + 1) + ' — ' + d.m.ag[d.pt].t + '</div>' : '') + '</td><td class="c-lk">' + (d.link ? livChip(d.link, 1) : '<span class="mtg-ms">—</span>') + '</td><td class="c-inst"><span class="mtg-tag"><i style="background:' + i.color + '"></i>' + i.name + '</span></td><td class="c-who">' + d.o + '</td><td class="c-when"><div class="mtg-ms" style="margin:0">' + mtgFDate(d.m.date) + '</div></td></tr>';
  }).join('');
  const ar = acts.sort((a, b) => a.due.localeCompare(b.due)).map(a => {
    const i = mtgInst(a.m.t);
    return '<tr onclick="mtgOpen(\'' + a.m.id + '\')"><td><div class="mtg-mt" style="font-weight:600;line-height:1.45">' + a.txt + '</div><div class="mtg-ms">' + a.m.title + (a.pt != null && (a.m.ag || [])[a.pt] ? ' · point ' + (a.pt + 1) : '') + '</div></td><td class="c-lk">' + (a.link ? livChip(a.link, 1) : '<span class="mtg-ms">—</span>') + '</td><td class="c-inst"><span class="mtg-tag"><i style="background:' + i.color + '"></i>' + i.name + '</span></td><td class="c-who">' + a.o + '</td><td class="c-when"><div style="font-weight:700;color:' + (a.st === 'late' ? 'var(--state-danger)' : 'var(--brand-ink)') + '">' + mtgFDate(a.due) + '</div></td><td class="c-st"><span class="mtg-badge ' + a.st + '"><i></i>' + MTG_ACTST[a.st] + '</span></td></tr>';
  }).join('');
  const late = acts.filter(a => a.st === 'late').length;
  document.getElementById('mtg-suivi').innerHTML = '<div class="card" style="padding:20px 22px;margin-bottom:16px"><div class="cap-cardh" style="margin-bottom:16px"><div><h3 style="font-size:14px;font-weight:800;color:var(--brand-ink);margin:0 0 3px">Actions issues des réunions</h3><p style="font-size:11.5px;color:var(--neutral-500);margin:0">' + acts.length + ' action' + (acts.length > 1 ? 's' : '') + ' suivie' + (acts.length > 1 ? 's' : '') + (late ? ' · <b style="color:var(--state-danger)">' + late + ' en retard</b>' : '') + '</p></div></div><table class="mtg-tbl"><thead><tr><th>Action</th><th class="c-lk">Élément rattaché</th><th class="c-inst">Instance</th><th class="c-who">Responsable</th><th class="c-when">Échéance</th><th class="c-st">Statut</th></tr></thead><tbody>' + ar + '</tbody></table></div>' + '<div class="card" style="padding:20px 22px"><div class="cap-cardh" style="margin-bottom:16px"><div><h3 style="font-size:14px;font-weight:800;color:var(--brand-ink);margin:0 0 3px">Registre des décisions</h3><p style="font-size:11.5px;color:var(--neutral-500);margin:0">Décisions actées en séance, tracées et opposables.</p></div></div><table class="mtg-tbl"><thead><tr><th>Décision</th><th class="c-lk">Élément rattaché</th><th class="c-inst">Instance</th><th class="c-who">Décideur</th><th class="c-when">Séance</th></tr></thead><tbody>' + dr + '</tbody></table></div>';
}
function mtgOpen(id) {
  const m = MTG_LIST.find(x => x.id === id);
  if (!m) return;
  const i = mtgInst(m.t);
  const held = m.st === 'tenu' || m.st === 'crv';
  const ag = (m.ag || []).map((a, n) => {
    const pd = (m.dec || []).filter(d => d.pt === n),
      pa = (m.act || []).filter(x => x.pt === n);
    const sub = pd.length || pa.length ? '<div style="margin-top:9px;padding-left:11px;border-left:2px solid var(--neutral-200);display:flex;flex-direction:column;gap:7px">' + pd.map(d => '<div style="font-size:11.5px;line-height:1.45"><span class="mtg-agk deci" style="margin-right:7px">Décision</span><span style="font-weight:600;color:var(--brand-ink)">' + d.txt + '</span>' + (d.link ? ' ' + livChip(d.link, 1) : '') + '</div>').join('') + pa.map(x => '<div style="font-size:11.5px;line-height:1.45"><span class="mtg-badge ' + x.st + '" style="margin-right:7px"><i></i>' + MTG_ACTST[x.st] + '</span><span style="font-weight:600;color:var(--brand-ink)">' + x.txt + '</span><span style="color:var(--neutral-500);font-weight:600"> · ' + x.o + ' · ' + mtgFDate(x.due) + '</span>' + (x.link ? ' ' + livChip(x.link, 1) : '') + '</div>').join('') + '</div>' : '';
    return '<div class="mtg-ag"><span class="mtg-agn">' + (n + 1) + '</span><div class="mtg-agb"><div class="mtg-agt">' + a.t + '</div><div class="mtg-agm">' + a.o + (a.d ? ' · ' + a.d + ' min' : '') + '</div>' + ((a.links || []).length ? '<div class="liv-lk" style="margin-top:8px">' + a.links.map(l => livChip(l)).join('') + '</div>' : '') + sub + '</div><span class="mtg-agk ' + a.k + '">' + (a.k === 'deci' ? 'Décision' : a.k === 'arb' ? 'Arbitrage' : 'Information') + '</span></div>';
  }).join('');
  const parts = i.members.map(n => {
    const absent = held && !m.pres.includes(n);
    return '<span class="mtg-pc' + (absent ? ' abs' : '') + '"><span class="av" style="background:' + (absent ? 'var(--neutral-300)' : i.color) + '">' + mtgIni(n) + '</span>' + n + '</span>';
  }).join('');
  const dec = (m.dec || []).length ? m.dec.map(d => '<div class="mtg-li"><span class="mtg-lic" style="background:var(--purple)">✓</span><div class="mtg-lib"><div class="mtg-lit">' + d.txt + '</div><div class="mtg-lim">Décideur : ' + d.o + (d.pt != null && (m.ag || [])[d.pt] ? ' · point ' + (d.pt + 1) + ' — ' + m.ag[d.pt].t : '') + '</div>' + (d.link ? '<div class="liv-lk" style="margin-top:7px">' + livChip(d.link, 1) + '</div>' : '') + '</div></div>').join('') : '<div class="mtg-empty">Aucune décision enregistrée.</div>';
  const act = (m.act || []).length ? m.act.map(a => '<div class="mtg-li"><span class="mtg-lic" style="background:' + (a.st === 'done' ? 'var(--state-success)' : a.st === 'late' ? 'var(--state-danger)' : 'var(--state-info)') + '">' + (a.st === 'done' ? '✓' : '!') + '</span><div class="mtg-lib"><div class="mtg-lit">' + a.txt + '</div><div class="mtg-lim">' + a.o + ' · échéance ' + mtgFDate(a.due) + (a.pt != null && (m.ag || [])[a.pt] ? ' · point ' + (a.pt + 1) : '') + '</div>' + (a.link ? '<div class="liv-lk" style="margin-top:7px">' + livChip(a.link, 1) + '</div>' : '') + '</div><span class="mtg-badge ' + a.st + '"><i></i>' + MTG_ACTST[a.st] + '</span></div>').join('') : '<div class="mtg-empty">Aucune action ouverte.</div>';
  const quorumOk = m.pres.length >= i.quorum;
  document.getElementById('mtgDrawer').innerHTML = '<div class="mtg-dclose" onclick="mtgCloseDrawer()">✕</div>' + '<div class="mtg-dh"><div class="mtg-iav" style="background:' + i.color + '">' + i.name.slice(0, 2).toUpperCase() + '</div><div><div class="mtg-dt">' + m.title + '</div><div class="mtg-ds">' + i.full + ' · ' + i.chair + '</div></div></div>' + '<div style="margin-bottom:16px;display:flex;align-items:center;gap:10px;flex-wrap:wrap"><span class="mtg-badge ' + m.st + '"><i></i>' + MTG_ST[m.st] + '</span>' + (m.st === 'plan' ? '<button class="liv-btn dark" onclick="livStart(\'' + m.id + '\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="6 3 20 12 6 21 6 3" fill="currentColor"/></svg>Lancer la réunion</button>' : '') + (m.st === 'crv' ? '<button class="liv-btn ok" onclick="mtgValidate(\'' + m.id + '\')">Valider le compte-rendu</button>' : '') + '</div>' + '<div class="mtg-dmeta"><div><div class="k">Date</div><div class="v" style="font-size:12.5px">' + mtgFDate(m.date) + '</div></div><div><div class="k">Heure</div><div class="v">' + m.time + '</div></div><div><div class="k">Durée</div><div class="v">' + mtgDur(m.dur) + '</div></div><div><div class="k">Présents</div><div class="v" style="color:' + (held ? quorumOk ? 'var(--state-success)' : 'var(--state-danger)' : 'var(--neutral-400)') + '">' + (held ? m.pres.length + '/' + i.members.length : '—') + '</div></div></div>' + '<div style="font-size:11.5px;color:var(--neutral-500);font-weight:600;margin-top:10px">' + m.loc + (held ? ' · Quorum ' + i.quorum + ' requis — ' + (quorumOk ? 'atteint ✓' : 'non atteint') : '') + '</div>' + '<div class="mtg-dsec">Ordre du jour<span style="font-weight:700;text-transform:none;letter-spacing:0;color:var(--neutral-400)">' + (m.ag || []).reduce((s, a) => s + a.d, 0) + ' min</span></div>' + ag + '<div class="mtg-dsec">Participants<span style="font-weight:700;text-transform:none;letter-spacing:0;color:var(--neutral-400)">' + i.members.length + ' membres' + (m.exc.length ? ' · ' + m.exc.length + ' excusé' + (m.exc.length > 1 ? 's' : '') : '') + '</span></div><div class="mtg-pgrid">' + parts + '</div>' + '<div class="mtg-dsec">Décisions</div>' + dec + '<div class="mtg-dsec">Actions</div>' + act + (m.notes && m.notes.length ? '<div class="mtg-dsec">Notes de séance</div>' + m.notes.map(n => '<div class="mtg-li"><span class="mtg-lic" style="background:var(--neutral-400)">●</span><div class="mtg-lib"><div class="mtg-lit">' + n.txt + '</div><div class="mtg-lim">' + (n.pt || '') + '</div></div></div>').join('') : '');
  document.getElementById('mtgDrawerOv').classList.add('open');
}
function mtgCloseDrawer() {
  document.getElementById('mtgDrawerOv').classList.remove('open');
}
function mtgValidate(id) {
  const m = MTG_LIST.find(x => x.id === id);
  if (!m) return;
  m.st = 'tenu';
  mtgOpen(id);
  mtgRenderList();
}
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/modules/reunions.js", error: String((e && e.message) || e) }); }

// ui_kits/app/modules/scenario.js
try { (() => {
/* Scénario — quarterplan, Gantt, charge des équipes
   Extrait de « Refonte Portail Client.html ». Script classique, portée globale partagée.
   Chargé avant le script principal. Dépendances globales : fmtEur(), showToast(), showView(). */

/* ═══════════ SCÉNARIO — planificateur quarterplan ═══════════ */
const SCN_COLS = 8; // 2025 Q1 → 2026 Q4
const SCN_QLBL = ['Q1', 'Q2', 'Q3', 'Q4', 'Q1', 'Q2', 'Q3', 'Q4'];
const SCN_QYR = ['2025', '2025', '2025', '2025', '2026', '2026', '2026', '2026'];
const SCN_TEAMS = [{
  id: 'it',
  name: 'IT',
  color: 'var(--state-info)',
  cap: [20, 20, 20, 20, 20, 20, 20, 20]
}, {
  id: 'mkt',
  name: 'Marketing',
  color: 'var(--purple)',
  cap: [15, 15, 15, 15, 15, 15, 15, 15]
}, {
  id: 'fin',
  name: 'Finance',
  color: 'var(--brand-gold)',
  cap: [12, 12, 12, 12, 12, 12, 12, 12]
}, {
  id: 'log',
  name: 'Logistique',
  color: 'var(--teal)',
  cap: [14, 14, 14, 14, 14, 14, 14, 14]
}];
// start = trimestre de début (0-7), span = nb trimestres, load = charge/trim par équipe
let SCN_PROJECTS = [{
  id: 'p1',
  name: 'Harmonisation des data cross-canal',
  on: true,
  start: 0,
  span: 3,
  load: {
    it: 6,
    mkt: 4
  }
}, {
  id: 'p2',
  name: 'Connexion du CRM avec le SI',
  on: true,
  start: 1,
  span: 5,
  load: {
    it: 7,
    mkt: 6
  }
}, {
  id: 'p3',
  name: 'POC de data lake sur les données',
  on: false,
  start: 0,
  span: 3,
  load: {
    it: 6
  }
}, {
  id: 'p4',
  name: "Mise en place d'un outil de reporting",
  on: true,
  start: 1,
  span: 4,
  load: {
    fin: 7,
    it: 3
  }
}, {
  id: 'p5',
  name: 'Intégration du module de livraison',
  on: true,
  start: 2,
  span: 5,
  load: {
    log: 9,
    it: 4
  }
}, {
  id: 'p6',
  name: 'Amélioration de la Présence web',
  on: true,
  start: 0,
  span: 4,
  load: {
    mkt: 8
  }
}, {
  id: 'p7',
  name: "Mise à jour de l'outil ATS",
  on: true,
  start: 2,
  span: 6,
  load: {
    it: 4,
    fin: 3
  }
}, {
  id: 'p8',
  name: 'Retour au bureau - gestion des espaces',
  on: false,
  start: 0,
  span: 5,
  load: {
    log: 5
  }
}];
const scnOpenTeams = {};
function scnTeamLoad(teamId, q) {
  let s = 0;
  SCN_PROJECTS.forEach(p => {
    if (p.on && p.load[teamId] != null && q >= p.start && q < p.start + p.span) s += p.load[teamId];
  });
  return s;
}
function scnRender() {
  scnRenderGantt();
  scnRenderTeams();
}
function scnRenderGantt() {
  const g = document.getElementById('scnGantt');
  if (!g) return;
  let yrs = '<div class="scn-grow scn-yrs"><div style="grid-row:1"></div>';
  yrs += '<div class="scn-yr" style="grid-column:2 / 6">2025</div><div class="scn-yr" style="grid-column:6 / 10">2026</div></div>';
  let qs = '<div class="scn-grow scn-qs"><div class="scn-lblh"><span>Nom du projet</span><span class="scn-collapse" title="Réduire">‹</span></div>';
  for (let q = 0; q < SCN_COLS; q++) qs += '<div class="scn-q">' + SCN_QLBL[q] + '</div>';
  qs += '</div>';
  let rows = '';
  SCN_PROJECTS.forEach(p => {
    const left = p.start / SCN_COLS * 100,
      width = p.span / SCN_COLS * 100;
    let dots = '';
    for (let i = 0; i < p.span; i++) dots += '<span class="scn-ms"></span>';
    rows += '<div class="scn-grow scn-prow" data-pid="' + p.id + '">' + '<div class="scn-lbl"><span class="scn-tog' + (p.on ? ' on' : '') + '" onclick="scnToggle(\'' + p.id + '\')"></span><span class="scn-pname" title="' + p.name + '">' + p.name + '</span></div>' + '<div class="scn-track"><div class="scn-ghost"></div>' + '<div class="scn-bar' + (p.on ? '' : ' off') + '" style="left:' + left + '%;width:' + width + '%" data-pid="' + p.id + '" onpointerdown="scnDragStart(event,\'' + p.id + '\')">' + dots + '</div>' + '</div></div>';
  });
  g.innerHTML = yrs + qs + rows;
}
function scnRenderTeams() {
  const el = document.getElementById('scnTeams');
  if (!el) return;
  let head = '<tr><th>Équipe</th>';
  for (let q = 0; q < SCN_COLS; q++) head += '<th>' + SCN_QLBL[q] + '<span class="yr">' + SCN_QYR[q] + '</span></th>';
  head += '</tr>';
  let body = '';
  SCN_TEAMS.forEach(t => {
    const open = scnOpenTeams[t.id];
    body += '<tr class="scn-trow' + (open ? ' open' : '') + '"><td><div class="scn-tteam" onclick="scnToggleTeam(\'' + t.id + '\')"><svg class="scn-tchev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"/></svg><span class="scn-tdot" style="background:' + t.color + '"></span>' + t.name + '</div></td>';
    for (let q = 0; q < SCN_COLS; q++) {
      const load = scnTeamLoad(t.id, q),
        cap = t.cap[q],
        over = load > cap;
      body += '<td class="scn-cell' + (over ? ' warn' : '') + '"><span class="' + (over ? 'scn-over' : '') + '">' + load + '/' + cap + '</span></td>';
    }
    body += '</tr>';
    // sous-lignes : projets contributeurs
    const contrib = SCN_PROJECTS.filter(p => p.on && p.load[t.id] != null);
    contrib.forEach(p => {
      body += '<tr class="scn-subrow' + (open ? ' open' : '') + '"><td class="scn-sub">' + p.name + '</td>';
      for (let q = 0; q < SCN_COLS; q++) {
        const v = q >= p.start && q < p.start + p.span ? p.load[t.id] : 0;
        body += '<td class="scn-sub">' + (v ? v : '·') + '</td>';
      }
      body += '</tr>';
    });
    if (open && !contrib.length) body += '<tr class="scn-subrow open"><td class="scn-sub" colspan="' + (SCN_COLS + 1) + '">Aucun projet actif sur cette équipe.</td></tr>';
  });
  el.innerHTML = '<table class="scn-tbl"><thead>' + head + '</thead><tbody>' + body + '</tbody></table>';
}
function scnToggle(id) {
  const p = SCN_PROJECTS.find(x => x.id === id);
  if (p) {
    p.on = !p.on;
    scnRender();
  }
}
function scnToggleTeam(id) {
  scnOpenTeams[id] = !scnOpenTeams[id];
  scnRenderTeams();
}
let scnDrag = null;
function scnDragStart(e, id) {
  const p = SCN_PROJECTS.find(x => x.id === id);
  if (!p || !p.on) return;
  const bar = e.currentTarget,
    track = bar.parentElement,
    tw = track.getBoundingClientRect().width,
    qw = tw / SCN_COLS;
  const ghost = track.querySelector('.scn-ghost');
  ghost.style.left = p.start / SCN_COLS * 100 + '%';
  ghost.style.width = p.span / SCN_COLS * 100 + '%';
  ghost.style.display = 'block';
  bar.classList.add('dragging');
  bar.setPointerCapture(e.pointerId);
  scnDrag = {
    p,
    bar,
    track,
    qw,
    startX: e.clientX,
    origStart: p.start,
    newStart: p.start
  };
  const tip = document.getElementById('scnDragTip');
  tip.classList.add('on');
  scnDragMove(e);
  window.addEventListener('pointermove', scnDragMove);
  window.addEventListener('pointerup', scnDragEnd);
}
function scnDragMove(e) {
  if (!scnDrag) return;
  const {
    p,
    bar,
    track,
    qw,
    startX,
    origStart
  } = scnDrag;
  let dq = Math.round((e.clientX - startX) / qw);
  let ns = Math.max(0, Math.min(SCN_COLS - p.span, origStart + dq));
  scnDrag.newStart = ns;
  bar.style.left = ns / SCN_COLS * 100 + '%';
  const tip = document.getElementById('scnDragTip'),
    card = document.querySelector('.scn-gantt-card').getBoundingClientRect(),
    br = bar.getBoundingClientRect();
  tip.style.left = br.left + br.width / 2 - card.left + 'px';
  tip.style.top = br.top - card.top + 'px';
  tip.textContent = 'Déplacer · ' + SCN_QLBL[ns] + ' ' + SCN_QYR[ns];
}
function scnDragEnd() {
  if (!scnDrag) return;
  const {
    p,
    bar,
    newStart
  } = scnDrag;
  p.start = newStart;
  bar.classList.remove('dragging');
  document.getElementById('scnDragTip').classList.remove('on');
  window.removeEventListener('pointermove', scnDragMove);
  window.removeEventListener('pointerup', scnDragEnd);
  scnDrag = null;
  scnRender();
}
function scnCreate() {
  const t = document.getElementById('scnDragTip');
  t.textContent = 'Scénario dupliqué ✓';
  t.style.left = '50%';
  t.style.top = '60px';
  t.classList.add('on');
  setTimeout(() => t.classList.remove('on'), 1400);
}
function scnExport() {
  const t = document.getElementById('scnDragTip');
  t.textContent = 'Export du scénario ✓';
  t.style.left = '50%';
  t.style.top = '60px';
  t.classList.add('on');
  setTimeout(() => t.classList.remove('on'), 1400);
}
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/modules/scenario.js", error: String((e && e.message) || e) }); }

// ui_kits/app/modules/seance.js
try { (() => {
/* Séance en cours — déroulé live, décisions, actions
   Extrait de « Refonte Portail Client.html ». Script classique, portée globale partagée.
   Chargé avant le script principal. Dépendances globales : fmtEur(), showToast(), showView(). */

/* ═══════════ SÉANCE EN COURS ═══════════ */
const LIV_KINDS = [{
  k: 'doc',
  lbl: 'Document',
  ico: '▤',
  color: 'var(--state-info)',
  items: ['Support CODIR juillet 2026.pdf', 'Budget S2 — arbitrage.xlsx', 'Plan de remédiation RGPD.docx', 'Rapport d\'audit cybersécurité.pdf', 'CR COPIL du 16 juillet.pdf', 'Quarterplan S2 2026.xlsx', 'Registre des traitements.xlsx']
}, {
  k: 'tache',
  lbl: 'Tâche',
  ico: '✓',
  color: 'var(--purple)',
  items: ['Recette utilisateurs Portail Client', 'Bascule production Migration Cloud', 'Reprise de données ERP', 'Déploiement MFA — 220 comptes', 'Collecte des preuves ISO 27001', 'Intégration API facturation']
}, {
  k: 'risque',
  lbl: 'Risque',
  ico: '!',
  color: 'var(--state-danger)',
  items: ['R-014 · Retard bascule production', 'R-021 · Dépassement budgétaire ERP', 'R-007 · Fuite de données clients', 'R-032 · Dépendance prestataire cloud', 'R-018 · Non-conformité RGPD registre']
}, {
  k: 'plan',
  lbl: "Plan d'action",
  ico: '◈',
  color: 'var(--brand-gold)',
  items: ['PA-2026-03 · Remédiation RGPD', 'PA-2026-05 · Renforcement authentification', 'PA-2026-08 · Certification ISO 27001', 'PA-2026-11 · Continuité d\'activité']
}, {
  k: 'projet',
  lbl: 'Projet',
  ico: '▸',
  color: 'var(--teal)',
  items: ['Refonte Portail Client', 'Migration Infrastructure Cloud', 'Sécurité & Conformité RGPD', 'Migration ERP', 'Application Mobile', 'Déploiement CRM']
}, {
  k: 'ecart',
  lbl: 'Écart conformité',
  ico: '◎',
  color: 'var(--state-success)',
  items: ['RGPD art.30 · Registre incomplet', 'ISO A.5.15 · Contrôle d\'accès', 'ISO A.8.16 · Supervision', 'NIST PR.AC-1 · Gestion identités', 'DORA art.11 · Plan de continuité']
}];
function livKind(k) {
  return LIV_KINDS.find(x => x.k === k) || LIV_KINDS[0];
}
let LIV = null,
  livTick = null,
  livPickK = 'doc';
function livStart(id) {
  const m = MTG_LIST.find(x => x.id === id);
  if (!m) return;
  const i = mtgInst(m.t);
  LIV = {
    id,
    cur: 0,
    t0: Date.now(),
    pres: i.members.slice(),
    notes: {},
    dec: (m.dec || []).slice(),
    act: (m.act || []).slice(),
    done: {},
    links: {}
  };
  (m.ag || []).forEach((a, n) => {
    LIV.links[n] = (a.links || []).slice();
  });
  mtgCloseDrawer();
  showView('seance');
  clearInterval(livTick);
  livTick = setInterval(livClock, 1000);
}
function livClock() {
  if (!LIV) {
    clearInterval(livTick);
    return;
  }
  const el = document.getElementById('livElapsed');
  if (!el) return;
  const s = Math.floor((Date.now() - LIV.t0) / 1000);
  el.textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
}
function livRender() {
  const root = document.getElementById('livRoot');
  if (!root) return;
  if (!LIV) {
    root.innerHTML = '<div class="liv-card"><div class="liv-empty">Aucune séance en cours. Lancez une réunion depuis le module Réunions.</div><div class="liv-nav"><button class="liv-btn dark" onclick="showView(\'reunions\')">Aller aux réunions</button></div></div>';
    return;
  }
  const m = MTG_LIST.find(x => x.id === LIV.id),
    i = mtgInst(m.t),
    ag = m.ag || [];
  const quorumOk = LIV.pres.length >= i.quorum;
  const planned = ag.reduce((s, a) => s + a.d, 0);
  const doneN = Object.keys(LIV.done).filter(k => LIV.done[k]).length;
  const bar = '<div class="liv-bar"><div class="liv-iav" style="background:' + i.color + '">' + i.name.slice(0, 2).toUpperCase() + '</div>' + '<div><div class="liv-bt">' + m.title + '</div><div class="liv-bs">' + i.full + ' · ' + m.loc + ' · présidée par ' + i.chair.split(' — ')[0] + '</div></div>' + '<span class="liv-live"><i></i>EN COURS</span>' + '<div class="liv-clock"><div><div class="liv-cv" id="livElapsed">00:00</div><div class="liv-ck">Écoulé</div></div>' + '<div><div class="liv-cv">' + planned + '<span style="font-size:12px;color:var(--neutral-400)"> min</span></div><div class="liv-ck">Prévu</div></div>' + '<div><div class="liv-cv">' + doneN + '/' + ag.length + '</div><div class="liv-ck">Points traités</div></div></div></div>';
  const pts = ag.map((a, n) => '<div class="liv-pt' + (n === LIV.cur ? ' cur' : '') + (LIV.done[n] ? ' done' : '') + '" onclick="livGo(' + n + ')"><span class="liv-ptn">' + (LIV.done[n] ? '✓' : n + 1) + '</span><div class="liv-ptb"><div class="liv-ptt">' + a.t + '</div><div class="liv-ptm">' + a.o + (a.d ? ' · ' + a.d + ' min' : '') + ' · ' + (a.k === 'deci' ? 'Décision' : a.k === 'arb' ? 'Arbitrage' : 'Information') + ((LIV.links[n] || []).length ? ' · ◇ ' + LIV.links[n].length + ' rattaché' + (LIV.links[n].length > 1 ? 's' : '') : '') + '</div></div></div>').join('');
  const a = ag[LIV.cur] || {
    t: '—',
    o: '—',
    d: 0,
    k: 'info'
  };
  const lks = LIV.links[LIV.cur] || [];
  const lkH = lks.length ? '<div class="liv-lk">' + lks.map((l, n) => {
    const kd = livKind(l.k);
    return '<span class="liv-chip"><span class="ci" style="background:' + kd.color + '">' + kd.ico + '</span><span class="cn" title="' + kd.lbl + ' · ' + l.n + '">' + l.n + '</span><span class="cx" onclick="livUnlink(' + n + ')">✕</span></span>';
  }).join('') + '</div>' : '<div class="liv-empty">Aucun document ni élément rattaché à ce point.</div>';
  const kd = livKind(livPickK);
  const avail = kd.items.filter(x => !lks.some(l => l.k === livPickK && l.n === x));
  const pick = '<div class="liv-pick"><div class="liv-pickh">Rattacher un élément à ce point</div>' + '<div class="liv-tp">' + LIV_KINDS.map(x => '<button class="liv-tpb' + (x.k === livPickK ? ' sel' : '') + '" onclick="livPickK=\'' + x.k + '\';livRender()">' + x.lbl + '</button>').join('') + '</div>' + (avail.length ? '<select class="liv-in" id="livLkSel">' + avail.map(x => '<option>' + x + '</option>').join('') + '</select>' + '<div class="liv-nav"><button class="liv-btn dark" onclick="livLink()">Rattacher</button></div>' : '<div class="liv-empty">Tous les éléments de ce type sont déjà rattachés.</div>') + '</div>';
  const cur = '<div class="liv-cur"><div class="liv-curk">Point ' + (LIV.cur + 1) + ' sur ' + ag.length + ' · ' + (a.k === 'deci' ? 'Décision attendue' : a.k === 'arb' ? 'Arbitrage attendu' : 'Information') + '</div>' + '<div class="liv-curt">' + a.t + '</div><div class="liv-curm">Rapporteur : ' + a.o + (a.d ? ' · ' + a.d + ' min allouées' : '') + '</div>' + '<textarea class="liv-ta" id="livNote" placeholder="Notes de séance sur ce point…" oninput="LIV.notes[' + LIV.cur + ']=this.value">' + (LIV.notes[LIV.cur] || '') + '</textarea>' + '<div class="liv-h" style="margin-top:18px;margin-bottom:0">Documents &amp; éléments rattachés<span style="text-transform:none;letter-spacing:0;color:var(--neutral-400)">' + lks.length + '</span></div>' + lkH + pick + '<div class="liv-nav"><button class="liv-btn' + (LIV.cur === 0 ? ' dis' : '') + '" onclick="livGo(' + (LIV.cur - 1) + ')">‹ Point précédent</button>' + '<button class="liv-btn ok" onclick="livDone()">' + (LIV.done[LIV.cur] ? '✓ Point traité' : 'Marquer traité et suivant ›') + '</button>' + '<button class="liv-btn' + (LIV.cur >= ag.length - 1 ? ' dis' : '') + '" onclick="livGo(' + (LIV.cur + 1) + ')">Point suivant ›</button></div></div>';
  const decL = LIV.dec.length ? LIV.dec.map((d, n) => '<div class="liv-item"><span class="liv-ic" style="background:var(--purple)">✓</span><div style="flex:1;min-width:0"><div class="liv-it">' + d.txt + '</div><div class="liv-im">Décideur : ' + d.o + (d.pt != null && ag[d.pt] ? ' · point ' + (d.pt + 1) : '') + '</div>' + (d.link ? '<div class="liv-lk" style="margin-top:6px">' + livChip(d.link, 1) + '</div>' : '') + '</div><span class="liv-x" onclick="LIV.dec.splice(' + n + ',1);livRender()">✕</span></div>').join('') : '<div class="liv-empty">Aucune décision actée.</div>';
  const actL = LIV.act.length ? LIV.act.map((x, n) => '<div class="liv-item"><span class="liv-ic" style="background:' + (x.st === 'done' ? 'var(--state-success)' : x.st === 'late' ? 'var(--state-danger)' : 'var(--state-info)') + '">!</span><div style="flex:1;min-width:0"><div class="liv-it">' + x.txt + '</div><div class="liv-im">' + x.o + ' · ' + mtgFDate(x.due) + (x.pt != null && ag[x.pt] ? ' · point ' + (x.pt + 1) : '') + '</div>' + (x.link ? '<div class="liv-lk" style="margin-top:6px">' + livChip(x.link, 1) + '</div>' : '') + '</div><span class="liv-x" onclick="LIV.act.splice(' + n + ',1);livRender()">✕</span></div>').join('') : '<div class="liv-empty">Aucune action ouverte.</div>';
  const opts = i.members.map(n => '<option>' + n + '</option>').join('');
  const side = '<div class="liv-card" style="margin-bottom:16px"><div class="liv-h">Présence<span style="text-transform:none;letter-spacing:0;color:var(--neutral-400)">' + LIV.pres.length + '/' + i.members.length + '</span></div>' + i.members.map(n => {
    const on = LIV.pres.includes(n);
    return '<div class="liv-pp' + (on ? ' on' : '') + '" onclick="livTogglePres(\'' + n.replace(/'/g, "\\'") + '\')"><span class="liv-box">' + (on ? '✓' : '') + '</span><span class="liv-pav" style="background:' + (on ? i.color : 'var(--neutral-300)') + '">' + mtgIni(n) + '</span><span class="liv-pn">' + n + '</span></div>';
  }).join('') + '<div class="liv-quo ' + (quorumOk ? 'ok' : 'no') + '">Quorum ' + i.quorum + ' requis — ' + (quorumOk ? 'atteint ✓ la séance peut délibérer' : 'non atteint, pas de décision opposable') + '</div></div>' + '<div class="liv-card" style="margin-bottom:16px"><div class="liv-h">Décisions<span style="text-transform:none;letter-spacing:0;color:var(--neutral-400)">point ' + (LIV.cur + 1) + '</span></div>' + decL + '<input class="liv-in" id="livDecT" placeholder="Formuler la décision actée…" style="margin-top:10px">' + '<select class="liv-in" id="livDecO" style="margin-top:8px">' + opts + '</select>' + livLinkOpts().replace('__ID__', 'livDecL') + '<div class="liv-nav"><button class="liv-btn dark" onclick="livAddDec()">Acter la décision</button></div></div>' + '<div class="liv-card"><div class="liv-h">Actions<span style="text-transform:none;letter-spacing:0;color:var(--neutral-400)">point ' + (LIV.cur + 1) + '</span></div>' + actL + '<input class="liv-in" id="livActT" placeholder="Action à confier…" style="margin-top:10px">' + '<select class="liv-in" id="livActO" style="margin-top:8px">' + opts + '</select>' + '<input class="liv-in" id="livActD" type="date" value="2026-09-30" style="margin-top:8px">' + livLinkOpts().replace('__ID__', 'livActL') + '<div class="liv-nav"><button class="liv-btn dark" onclick="livAddAct()">Ajouter l\'action</button></div></div>';
  root.innerHTML = bar + '<div class="liv-wrap"><div>' + cur + '<div class="liv-card"><div class="liv-h">Ordre du jour</div>' + pts + '<div class="liv-nav" style="margin-top:16px"><button class="liv-btn ok" onclick="livClose()">Clôturer la séance et générer le CR</button><button class="liv-btn" onclick="livAbort()">Interrompre</button></div></div></div>' + '<div>' + side + '</div></div>';
  livClock();
}
function livGo(n) {
  const m = MTG_LIST.find(x => x.id === LIV.id),
    ag = m.ag || [];
  if (n < 0 || n >= ag.length) return;
  LIV.cur = n;
  livRender();
}
function livDone() {
  const m = MTG_LIST.find(x => x.id === LIV.id),
    ag = m.ag || [];
  LIV.done[LIV.cur] = true;
  if (LIV.cur < ag.length - 1) LIV.cur++;
  livRender();
}
function livTogglePres(n) {
  const k = LIV.pres.indexOf(n);
  if (k >= 0) LIV.pres.splice(k, 1);else LIV.pres.push(n);
  livRender();
}
function livLink() {
  const s = document.getElementById('livLkSel');
  if (!s) return;
  if (!LIV.links[LIV.cur]) LIV.links[LIV.cur] = [];
  LIV.links[LIV.cur].push({
    k: livPickK,
    n: s.value
  });
  livRender();
}
function livUnlink(n) {
  (LIV.links[LIV.cur] || []).splice(n, 1);
  livRender();
}
function livAddDec() {
  const t = document.getElementById('livDecT').value.trim();
  if (!t) return;
  const l = livPickedLink('livDecL');
  LIV.dec.push({
    txt: t,
    o: document.getElementById('livDecO').value,
    pt: LIV.cur,
    link: l
  });
  livRender();
}
function livAddAct() {
  const t = document.getElementById('livActT').value.trim();
  if (!t) return;
  const l = livPickedLink('livActL');
  LIV.act.push({
    txt: t,
    o: document.getElementById('livActO').value,
    due: document.getElementById('livActD').value || '2026-09-30',
    st: 'wip',
    pt: LIV.cur,
    link: l
  });
  livRender();
}
function livPickedLink(id) {
  const s = document.getElementById(id);
  if (!s || !s.value) return null;
  const lks = LIV.links[LIV.cur] || [];
  return lks[+s.value] || null;
}
function livLinkOpts() {
  const lks = LIV.links[LIV.cur] || [];
  if (!lks.length) return '';
  return '<select class="liv-in" id="__ID__" style="margin-top:8px"><option value="">— Aucun élément rattaché —</option>' + lks.map((l, n) => '<option value="' + n + '">' + livKind(l.k).lbl + ' · ' + l.n + '</option>').join('') + '</select>';
}
function livChip(l, small) {
  const kd = livKind(l.k);
  return '<span class="liv-chip"' + (small ? ' style="font-size:10.5px;padding:4px 8px 4px 5px"' : '') + '><span class="ci" style="background:' + kd.color + (small ? ';width:15px;height:15px;font-size:8px' : '') + '">' + kd.ico + '</span><span class="cn" title="' + kd.lbl + ' · ' + l.n + '">' + l.n + '</span></span>';
}
function livAbort() {
  clearInterval(livTick);
  LIV = null;
  showView('reunions');
}
function livClose() {
  const m = MTG_LIST.find(x => x.id === LIV.id),
    i = mtgInst(m.t);
  m.pres = LIV.pres.slice();
  m.exc = i.members.filter(n => !LIV.pres.includes(n));
  m.dec = LIV.dec.slice();
  m.act = LIV.act.slice();
  m.st = 'crv';
  (m.ag || []).forEach((a, n) => {
    a.links = (LIV.links[n] || []).slice();
  });
  const notes = Object.keys(LIV.notes).filter(k => (LIV.notes[k] || '').trim());
  if (notes.length) m.notes = notes.map(k => ({
    pt: (m.ag[k] || {}).t,
    txt: LIV.notes[k].trim()
  }));
  clearInterval(livTick);
  const id = m.id;
  LIV = null;
  mtgFilterInst = m.t;
  showView('reunions');
  mtgTab('reunions');
  mtgOpen(id);
}
let mtgNewInst = 'codir',
  mtgNewAg = [];
function mtgOpenNew() {
  mtgNewInst = 'codir';
  mtgNewAg = [{
    t: '',
    d: 20,
    k: 'info'
  }];
  mtgRenderNew();
  document.getElementById('mtgNewModal').classList.add('open');
}
function mtgCloseNew() {
  document.getElementById('mtgNewModal').classList.remove('open');
}
function mtgPickInst(id) {
  mtgNewInst = id;
  mtgRenderNew();
}
function mtgAddAg() {
  mtgNewAg.push({
    t: '',
    d: 20,
    k: 'info'
  });
  mtgRenderNew();
}
function mtgDelAg(n) {
  mtgNewAg.splice(n, 1);
  if (!mtgNewAg.length) mtgNewAg.push({
    t: '',
    d: 20,
    k: 'info'
  });
  mtgRenderNew();
}
function mtgSyncAg() {
  document.querySelectorAll('#mtgNewBody .mtg-agrow').forEach((r, n) => {
    if (!mtgNewAg[n]) return;
    mtgNewAg[n].t = r.querySelector('.ag-t').value;
    mtgNewAg[n].d = +r.querySelector('.ag-d').value || 0;
    mtgNewAg[n].k = r.querySelector('.ag-k').value;
  });
}
function mtgRenderNew() {
  const i = mtgInst(mtgNewInst);
  const pills = MTG_INST.map(x => '<button class="mtg-pill' + (x.id === mtgNewInst ? ' sel' : '') + '" onclick="mtgSyncAg();mtgPickInst(\'' + x.id + '\')">' + x.name + '</button>').join('');
  const rows = mtgNewAg.map((a, n) => '<div class="mtg-agrow"><input class="mtg-in-t ag-t" placeholder="Point à l\'ordre du jour" value="' + (a.t || '').replace(/"/g, '&quot;') + '"><input class="mtg-in-t ag-d" type="number" min="5" step="5" value="' + a.d + '"><select class="mtg-sel ag-k"><option value="info"' + (a.k === 'info' ? ' selected' : '') + '>Information</option><option value="deci"' + (a.k === 'deci' ? ' selected' : '') + '>Décision</option><option value="arb"' + (a.k === 'arb' ? ' selected' : '') + '>Arbitrage</option></select><div class="mtg-del" onclick="mtgSyncAg();mtgDelAg(' + n + ')">✕</div></div>').join('');
  document.getElementById('mtgNewBody').innerHTML = '<div class="mtg-fld"><label class="mtg-lbl">Instance</label><div class="mtg-pills">' + pills + '</div><div style="font-size:11.5px;color:var(--neutral-500);font-weight:600;margin-top:9px">' + i.full + ' · ' + i.cad + ' · ' + i.members.length + ' membres · quorum ' + i.quorum + '</div></div>' + '<div class="mtg-fld"><label class="mtg-lbl">Titre de la séance</label><input class="mtg-in-t" id="mtgNTitle" placeholder="ex. ' + i.name + ' de septembre — revue de portefeuille"></div>' + '<div class="mtg-fld"><div class="mtg-r3"><div><label class="mtg-lbl">Date</label><input class="mtg-in-t" id="mtgNDate" type="date" value="2026-09-15"></div><div><label class="mtg-lbl">Heure</label><input class="mtg-in-t" id="mtgNTime" type="time" value="09:00"></div><div><label class="mtg-lbl">Durée (min)</label><input class="mtg-in-t" id="mtgNDur" type="number" min="15" step="15" value="90"></div></div></div>' + '<div class="mtg-fld"><label class="mtg-lbl">Lieu / visio</label><input class="mtg-in-t" id="mtgNLoc" value="Teams" placeholder="Salle ou lien visio"></div>' + '<div class="mtg-fld"><label class="mtg-lbl">Ordre du jour</label>' + rows + '<div class="mtg-add" onclick="mtgSyncAg();mtgAddAg()">＋ Ajouter un point</div></div>';
}
function mtgSaveNew() {
  mtgSyncAg();
  const i = mtgInst(mtgNewInst);
  const title = document.getElementById('mtgNTitle').value.trim() || i.name + ' — nouvelle séance';
  const date = document.getElementById('mtgNDate').value || '2026-09-15';
  const time = document.getElementById('mtgNTime').value || '09:00';
  const dur = +document.getElementById('mtgNDur').value || 90;
  const loc = document.getElementById('mtgNLoc').value.trim() || 'Teams';
  const ag = mtgNewAg.filter(a => a.t.trim()).map(a => ({
    t: a.t.trim(),
    d: a.d,
    o: i.chair.split(' — ')[0],
    k: a.k
  }));
  MTG_LIST.push({
    id: 'm' + (MTG_LIST.length + 1) + '_' + Date.now(),
    t: mtgNewInst,
    title,
    date,
    time,
    dur,
    loc,
    st: 'plan',
    pres: [],
    exc: [],
    ag: ag.length ? ag : [{
      t: 'Ordre du jour à préciser',
      d: 0,
      o: '—',
      k: 'info'
    }],
    dec: [],
    act: []
  });
  mtgCloseNew();
  mtgFilterInst = mtgNewInst;
  mtgTab('reunions');
}
function capRenderPortfolio() {
  const tot = capPortfolioTotals();
  const cap = capSum(tot.cap),
    eng = capSum(tot.eng),
    prev = capSum(tot.prev),
    dispo = cap - eng - prev,
    occ = Math.round((eng + prev) / cap * 100);
  let over = 0;
  CAP_CENTERS.forEach(c => {
    const m = capCenterMonthly(c.id);
    for (let i = 0; i < 12; i++) {
      if (m.eng[i] + m.prev[i] > m.cap[i]) {
        over++;
        break;
      }
    }
  });
  const maxV = Math.max.apply(null, tot.cap.map((v, i) => Math.max(v, tot.eng[i] + tot.prev[i])));
  let cols = '';
  for (let i = 0; i < 12; i++) {
    const cons = tot.eng[i] + tot.prev[i],
      mo = Math.round(cons / tot.cap[i] * 100);
    cols += '<div class="cap-col"><div class="cap-colbars"><div class="cap-bg" style="height:' + tot.cap[i] / maxV * 100 + '%"></div><div class="cap-stk" style="height:' + (tot.eng[i] + tot.prev[i]) / maxV * 100 + '%"><div class="cap-prev" style="height:' + tot.prev[i] / (tot.eng[i] + tot.prev[i]) * 100 + '%"></div><div class="cap-eng" style="flex:1"></div></div></div><div class="cap-cm">' + CAP_MONTHS[i] + '</div><div class="cap-cp" style="color:' + capTone(mo) + '">' + mo + '%</div></div>';
  }
  const ranked = CAP_CENTERS.map(c => {
    const m = capCenterMonthly(c.id);
    const a = capSum(m.cap),
      b = capSum(m.eng) + capSum(m.prev);
    return {
      name: c.name,
      occ: Math.round(b / a * 100)
    };
  }).sort((x, y) => y.occ - x.occ).slice(0, 6);
  let rk = ranked.map(r => '<div class="cap-rk"><div class="cap-rk-n">' + r.name + '</div><div class="cap-rk-t"><div class="cap-rk-f" style="width:' + Math.min(r.occ, 100) + '%;background:' + capBg(r.occ) + '"></div></div><div class="cap-rk-p" style="color:' + capTone(r.occ) + '">' + r.occ + '%</div></div>').join('');
  const heads = CAP_CENTERS.reduce((s, c) => s + c.head, 0);
  document.getElementById('cap-portefeuille').innerHTML = '<div class="cap-kpis">' + '<div class="cap-kpi"><div class="l">Capacité annuelle</div><div class="v">' + capNb(cap) + '<small>j·h</small></div><div class="d">' + heads + ' collaborateurs · ' + CAP_CENTERS.length + ' centres</div></div>' + '<div class="cap-kpi"><div class="l">Engagé</div><div class="v" style="color:var(--state-info)">' + capNb(eng) + '<small>j·h</small></div><div class="d">Projets validés</div></div>' + '<div class="cap-kpi"><div class="l">Prévisionnel</div><div class="v" style="color:var(--brand-gold-700)">' + capNb(prev) + '<small>j·h</small></div><div class="d">Brouillon / à valider</div></div>' + '<div class="cap-kpi"><div class="l">Disponible</div><div class="v" style="color:' + (dispo < 0 ? 'var(--state-danger)' : 'var(--state-success)') + '">' + capNb(dispo) + '<small>j·h</small></div><div class="d">Marge de pilotage</div></div>' + '</div>' + '<div class="cap-2col">' + '<div class="card cap-chart-card"><div class="cap-cardh"><div><h3>Capacité vs consommation — mensuel</h3><p>Charge répartie automatiquement sur les 12 mois. Barre = engagé + prévisionnel ; fond = capacité disponible.</p></div><div class="cap-gauge" style="--p:' + Math.min(occ, 100) + ';--gc:' + capBg(occ) + '"><span>' + occ + '%</span></div></div><div class="cap-chart">' + cols + '</div><div class="cap-lg"><span class="cap-lgi"><i class="e"></i>Engagé</span><span class="cap-lgi"><i class="p"></i>Prévisionnel</span><span class="cap-lgi"><i class="c"></i>Capacité</span></div></div>' + '<div class="card cap-rk-card"><div class="cap-cardh"><div><h3>Centres les plus sollicités</h3><p>Taux d\'occupation annuel.</p></div></div>' + rk + '<div class="cap-alert ' + (over > 0 ? 'warn' : '') + '">' + (over > 0 ? '<b>' + over + ' centre' + (over > 1 ? 's' : '') + '</b> en surcharge sur au moins un mois de l\'année.' : 'Aucune surcharge détectée sur l\'année.') + '</div></div>' + '</div>';
}
function capRenderCentres() {
  let head = '<div class="cap-hm-h nm">Centre de capacité</div>' + CAP_MONTHS.map(mo => '<div class="cap-hm-h">' + mo + '</div>').join('');
  let rows = '';
  CAP_GROUPS.forEach(g => {
    rows += '<div class="cap-hm-grp">' + g.name + '</div>';
    CAP_CENTERS.filter(c => c.g === g.id).forEach(c => {
      const m = capCenterMonthly(c.id);
      const cc = capSum(m.cap),
        ce = capSum(m.eng) + capSum(m.prev),
        yo = Math.round(ce / cc * 100);
      rows += '<div class="cap-hm-name" onclick="capOpenCenter(\'' + c.id + '\')"><div><div class="cap-hm-cn">' + c.name + '</div><div class="cap-hm-cm">' + c.head + ' pers · <b style="color:' + capTone(yo) + '">' + yo + '%</b></div></div><span class="cap-dot" style="background:' + g.color + '"></span></div>';
      for (let i = 0; i < 12; i++) {
        const cons = m.eng[i] + m.prev[i],
          occ = Math.round(cons / m.cap[i] * 100),
          dispo = Math.round(m.cap[i] - cons);
        rows += '<div class="cap-hm-cell" onclick="capOpenCenter(\'' + c.id + '\')" style="background:' + capCellBg(occ) + ';color:' + (occ > 100 ? '#fff' : 'var(--brand-ink)') + '">' + occ + '<span class="cap-hm-tip">' + c.name + ' · ' + CAP_MONTHS[i] + '<br>Cap. ' + Math.round(m.cap[i]) + ' · Conso ' + Math.round(cons) + ' j·h<br>Dispo ' + dispo + ' j·h</span></div>';
      }
    });
  });
  document.getElementById('cap-centres').innerHTML = '<div class="card cap-hm-card"><div class="cap-hm" style="grid-template-columns:210px repeat(12,1fr)">' + head + rows + '</div><div class="cap-hm-lg">Occupation <span class="sw" style="background:' + capCellBg(30) + '"></span><span class="sw" style="background:' + capCellBg(60) + '"></span><span class="sw" style="background:' + capCellBg(80) + '"></span><span class="sw" style="background:' + capCellBg(95) + '"></span><span class="sw" style="background:' + capCellBg(120) + '"></span> &nbsp;faible → surcharge · cliquez un centre pour le détail mensuel</div></div>';
}
function capRenderCollabs() {
  let rows = CAP_PEOPLE.map((p, idx) => {
    const m = capPersonMonthly(p);
    const cc = capSum(m.cap),
      ce = capSum(m.eng),
      cp = capSum(m.prev),
      cd = cc - ce - cp,
      occ = Math.round((ce + cp) / cc * 100);
    const c = CAP_CENTERS.find(x => x.id === p.c),
      g = CAP_GROUPS.find(x => x.id === c.g);
    return '<tr onclick="capOpenPerson(' + idx + ')"><td><div class="cap-pn">' + p.n + '</div><div class="cap-pr">' + p.role + '</div></td><td><span class="cap-cbadge" style="background:' + g.color + '"></span>' + c.name + '</td><td>' + capNb(cc) + '</td><td style="color:var(--state-info)">' + capNb(ce) + '</td><td style="color:var(--brand-gold-700)">' + (cp ? capNb(cp) : '–') + '</td><td style="font-weight:700;color:' + (cd < 0 ? 'var(--state-danger)' : 'var(--brand-ink)') + '">' + capNb(cd) + '</td><td><span style="font-weight:800;color:' + capTone(occ) + '">' + occ + '%</span></td><td><span class="cap-srcb ' + (p.exc ? 'exc' : 'cal') + '">' + (p.exc ? 'Exception' : 'Calendrier') + '</span></td></tr>';
  }).join('');
  document.getElementById('cap-collabs').innerHTML = '<div class="card cap-tbl-card"><table class="cap-tbl"><thead><tr><th>Collaborateur</th><th>Centre</th><th>Cap. an.</th><th>Engagé</th><th>Prév.</th><th>Dispo</th><th>Occ.</th><th>Source</th></tr></thead><tbody>' + rows + '</tbody></table></div><div class="cap-hint">La capacité individuelle hérite automatiquement du calendrier français (jours ouvrés). Une <b>exception</b> remplace la valeur d\'un mois (temps partiel, congés…). Ordre de priorité : <b>SIRH → Exception collaborateur → Paramètre client → Calendrier</b>.</div>';
}
function capOpenCenter(cid) {
  const m = capCenterMonthly(cid);
  const c = m.c,
    g = CAP_GROUPS.find(x => x.id === c.g);
  const cc = capSum(m.cap),
    ce = capSum(m.eng),
    cp = capSum(m.prev),
    cd = cc - ce - cp;
  const loads = CAP_LOADS.filter(l => l.c === cid);
  const loadRows = loads.length ? loads.map(l => '<div class="cap-load"><span class="cap-load-pill ' + (l.s === 'E' ? 'e' : 'p') + '">' + (l.s === 'E' ? 'Engagé' : 'Prév.') + '</span><div class="cap-load-b"><div class="cap-load-n">' + l.p + '</div><div class="cap-load-m">' + CAP_MONTHS[l.a] + ' → ' + CAP_MONTHS[l.b] + ' · réparti auto.</div></div><div class="cap-load-jh">' + l.jh + '<small>j·h</small></div></div>').join('') : '<div class="cap-empty">Aucune charge affectée.</div>';
  document.getElementById('capDrawer').innerHTML = '<div class="cap-dclose" onclick="capCloseDrawer()">✕</div><div class="cap-dh"><div class="cap-dh-ico" style="background:' + g.color + '">' + c.name.slice(0, 2).toUpperCase() + '</div><div><div class="cap-dh-t">' + c.name + '</div><div class="cap-dh-s">' + g.name + ' · ' + c.head + ' collaborateurs</div></div></div><div class="cap-dgrid"><div><div class="k">Capacité</div><div class="v">' + capNb(cc) + '</div></div><div><div class="k">Engagé</div><div class="v" style="color:var(--state-info)">' + capNb(ce) + '</div></div><div><div class="k">Prév.</div><div class="v" style="color:var(--brand-gold-700)">' + capNb(cp) + '</div></div><div><div class="k">Dispo</div><div class="v" style="color:' + (cd < 0 ? 'var(--state-danger)' : 'var(--state-success)') + '">' + capNb(cd) + '</div></div></div><div class="cap-dsec">Charge affectée<span class="cap-toggle">☑ Porte sa capacité</span></div>' + loadRows + '<div class="cap-note"><b>Anti double comptage.</b> Seule la charge portée directement par ce centre est comptabilisée. Les activités, risques et plans d\'action rattachés à un projet consommateur sont suivis, mais n\'ajoutent aucune capacité supplémentaire.</div><div class="cap-dsec">Détail mensuel</div><table class="cap-mtbl"><thead><tr><th>Mois</th><th>Cap.</th><th>Eng.</th><th>Prév.</th><th>Dispo</th><th>Occ.</th></tr></thead><tbody>' + capMonthTable(m) + '</tbody></table>';
  document.getElementById('capDrawerOv').classList.add('open');
}
function capOpenPerson(idx) {
  const p = CAP_PEOPLE[idx];
  const m = capPersonMonthly(p);
  const c = CAP_CENTERS.find(x => x.id === p.c),
    g = CAP_GROUPS.find(x => x.id === c.g);
  const cc = capSum(m.cap),
    ce = capSum(m.eng),
    cp = capSum(m.prev),
    cd = cc - ce - cp;
  const src = CAP_JH.map((j, i) => p.exc && p.exc[i] != null ? '<span class="cap-srcb exc">Except.</span>' : '<span class="cap-srcb cal">Calend.</span>');
  const ini = p.n.split(' ').map(x => x[0]).join('').slice(0, 2);
  document.getElementById('capDrawer').innerHTML = '<div class="cap-dclose" onclick="capCloseDrawer()">✕</div><div class="cap-dh"><div class="cap-dh-ico" style="background:' + g.color + '">' + ini + '</div><div><div class="cap-dh-t">' + p.n + '</div><div class="cap-dh-s">' + p.role + ' · ' + c.name + '</div></div></div><div class="cap-dgrid"><div><div class="k">Capacité</div><div class="v">' + capNb(cc) + '</div></div><div><div class="k">Engagé</div><div class="v" style="color:var(--state-info)">' + capNb(ce) + '</div></div><div><div class="k">Prév.</div><div class="v" style="color:var(--brand-gold-700)">' + capNb(cp) + '</div></div><div><div class="k">Dispo</div><div class="v" style="color:' + (cd < 0 ? 'var(--state-danger)' : 'var(--state-success)') + '">' + capNb(cd) + '</div></div></div>' + (p.exc ? '<div class="cap-note"><b>Exception de capacité.</b> Une ou plusieurs valeurs mensuelles ont été ajustées manuellement (temps partiel, congés) et remplacent le calendrier.</div>' : '') + '<div class="cap-dsec">Capacité mensuelle &amp; source</div><table class="cap-mtbl"><thead><tr><th>Mois</th><th>Cap.</th><th>Eng.</th><th>Prév.</th><th>Dispo</th><th>Occ.</th><th>Source</th></tr></thead><tbody>' + capMonthTable(m, src) + '</tbody></table>';
  document.getElementById('capDrawerOv').classList.add('open');
}
function capCloseDrawer() {
  document.getElementById('capDrawerOv').classList.remove('open');
}
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/modules/seance.js", error: String((e && e.message) || e) }); }

// ui_kits/app/orchestra-pages.js
try { (() => {
/* orchestra-pages.js — Starium Orchestra SPA page renders
   Requires: orchestra.html (defines go(), switchTab()) */

/* ── ICONS ─────────────────────────────────────────────── */
const _ico = (d, vb = '0 0 24 24') => `<svg viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const I = {
  'grid': _ico('<rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/>'),
  'target': _ico('<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>'),
  'refresh-cw': _ico('<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>'),
  'shield-check': _ico('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>'),
  'briefcase': _ico('<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>'),
  'inbox': _ico('<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>'),
  'alert-triangle': _ico('<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>'),
  'wallet': _ico('<rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/>'),
  'truck': _ico('<rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>'),
  'file-text': _ico('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>'),
  'users': _ico('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'),
  'book-open': _ico('<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>'),
  'settings': _ico('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>'),
  'plus': _ico('<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>'),
  'download': _ico('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>'),
  'chevron-right': _ico('<polyline points="9 18 15 12 9 6"/>'),
  'chevron-down': _ico('<polyline points="6 9 12 15 18 9"/>'),
  'arrow-up': _ico('<line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>'),
  'arrow-down': _ico('<line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>'),
  'edit': _ico('<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>'),
  'external': _ico('<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>')
};

/* ── HELPERS ─────────────────────────────────────────────── */
const bc = parts => parts.map((p, i) => i < parts.length - 1 ? `<span>${p}</span>${I['chevron-right']}` : `<span>${p}</span>`).join('');
const kpi = (ico, label, val, foot = '', fc = 'neu') => `<div class="kcard"><div class="kico">${I[ico] || ''}</div><div class="kb"><div class="kl">${label}</div><div class="kv">${val}</div>${foot ? `<div class="kf ${fc}">${foot}</div>` : ''}</div></div>`;
const badge = (txt, cls = 'bn') => `<span class="b ${cls}">${txt}</span>`;
const prog = (pct, cls = 'ok') => `<div class="pt"><div class="pf ${cls}" style="width:${Math.min(pct, 100)}%"></div></div>`;
const btn = (txt, cls = 'btn-s', ico = '') => `<button class="btn ${cls}">${ico ? I[ico] : ''} ${txt}</button>`;
const phdr = (title, sub, breadcrumb, actions = '') => `<div class="ph"><div class="ph-left"><div class="breadcrumb">${bc(breadcrumb)}</div><h1 class="pt">${title}</h1>${sub ? `<div class="psub">${sub}</div>` : ''}</div><div class="pa">${actions}</div></div>`;

/* ── PAGES ─────────────────────────────────────────────── */
const PAGES = {
  /* 1 ── DASHBOARD ──────────────────────────────────────── */
  dashboard: {
    title: "Vue d'ensemble",
    render() {
      return `<div class="pw">
${phdr("Vue d'ensemble", "Innovatech SA · T2 2026", ["Accueil"], btn("Préparer le CODIR", "btn-p", "briefcase"))}
<div class="kgrid">
  ${kpi('briefcase', "Projets actifs", "12", '↑ 2 ce trimestre', 'ok')}
  ${kpi('wallet', "Budget engagé", "3,1 M€", 'sur 4,2 M€ prévu', 'neu')}
  ${kpi('alert-triangle', "Risques critiques", "3", '1 sans plan d\'action', 'bad')}
  ${kpi('inbox', "Alertes ouvertes", "7", 'dont 2 critiques', 'warn')}
</div>
<div class="ms">
  <div class="vstack">
    <div class="card"><div class="ct">Alertes récentes <a class="cl">Voir toutes</a></div>
      <div class="ali"><div class="alid crit"></div><div class="alib"><div class="alit">Budget « Transformation digitale » dépassé de 12 %</div><div class="alim">Budgets · il y a 2 h</div></div></div>
      <div class="ali"><div class="alid warn"></div><div class="alib"><div class="alit">Contrat Microsoft Azure expire dans 30 jours</div><div class="alim">Contrats · il y a 5 h</div></div></div>
      <div class="ali"><div class="alid crit"></div><div class="alib"><div class="alit">Risque critique « Sécurité SI » sans plan d'action</div><div class="alim">Risques · hier</div></div></div>
      <div class="ali"><div class="alid warn"></div><div class="alib"><div class="alit">Projet « Refonte intranet » en retard de 3 semaines</div><div class="alim">Projets · il y a 2 j</div></div></div>
      <div class="ali"><div class="alid info"></div><div class="alib"><div class="alit">Nouvelle demande projet soumise : ERP Finance</div><div class="alim">Demandes · il y a 3 j</div></div></div>
    </div>
    <div class="card"><div class="ct">Projets récents <a class="cl" onclick="go('projects')">Portefeuille →</a></div>
      <div class="tw"><table class="dt"><thead><tr><th>Projet</th><th>Statut</th><th>Avancement</th><th>Responsable</th></tr></thead><tbody>
        <tr><td class="n">Remplacement SI RH</td><td>${badge('En cours', 'ba')}</td><td><div style="display:flex;align-items:center;gap:8px">${prog(74)}<span style="font-size:11.5px;color:var(--fg-2)">74 %</span></div></td><td>S. Martin</td></tr>
        <tr><td class="n">Migration Cloud Azure</td><td>${badge('En cours', 'ba')}</td><td><div style="display:flex;align-items:center;gap:8px">${prog(45, 'warn')}<span style="font-size:11.5px;color:var(--fg-2)">45 %</span></div></td><td>P. Dupont</td></tr>
        <tr><td class="n">Conformité DORA</td><td>${badge('En cours', 'br')}</td><td><div style="display:flex;align-items:center;gap:8px">${prog(33, 'bad')}<span style="font-size:11.5px;color:var(--fg-2)">33 %</span></div></td><td>S. Martin</td></tr>
        <tr><td class="n">Projet CRM</td><td>${badge('En cours', 'ba')}</td><td><div style="display:flex;align-items:center;gap:8px">${prog(62)}<span style="font-size:11.5px;color:var(--fg-2)">62 %</span></div></td><td>J. Lambert</td></tr>
      </tbody></table></div>
    </div>
  </div>
  <div class="vstack">
    <div class="card"><div class="ct">Jalons à venir</div>
      <div class="mili"><div class="mild">15 juin</div><div><div class="miln">Lancement CRM</div><div class="milp">Projet CRM</div></div></div>
      <div class="mili"><div class="mild">30 juin</div><div><div class="miln">Revue budgétaire T2</div><div class="milp">Budget 2026</div></div></div>
      <div class="mili"><div class="mild">1er juil.</div><div><div class="miln">Audit conformité DORA</div><div class="milp">Conformité</div></div></div>
      <div class="mili"><div class="mild">15 juil.</div><div><div class="miln">CODIR T3 — Arbitrage</div><div class="milp">Cycles de pilotage</div></div></div>
    </div>
    <div class="card"><div class="ct">Accès rapides</div>
      <div class="ql">
        <div class="ql-item" onclick="go('projects')">${I['plus']}<span>Nouveau projet</span></div>
        <div class="ql-item" onclick="go('teams')">${I['users']}<span>Saisir le temps</span></div>
        <div class="ql-item" onclick="go('requests')">${I['inbox']}<span>Demandes en attente</span></div>
        <div class="ql-item" onclick="go('cycles')">${I['briefcase']}<span>Préparer le CODIR</span></div>
      </div>
    </div>
  </div>
</div></div>`;
    }
  },
  /* 2 ── PORTEFEUILLE PROJETS ──────────────────────────── */
  projects: {
    title: "Portefeuille projets",
    render() {
      return `<div class="pw">
${phdr("Portefeuille projets", "12 projets · 5 en cours · 2 en retard", ["Projets"], btn("Nouveau projet", "btn-p", "plus"))}
<div class="fb">
  <select class="fsel"><option>Tous les statuts</option><option>En cours</option><option>En retard</option><option>Terminé</option></select>
  <select class="fsel"><option>Toutes priorités</option><option>Critique</option><option>Vital</option><option>Normal</option></select>
  <select class="fsel"><option>Tous responsables</option><option>S. Martin</option><option>P. Dupont</option><option>J. Lambert</option></select>
  <input class="finput" placeholder="Rechercher un projet…">
  <div class="fsp"></div>
  <a class="cl" href="scenario.html">Vue Scénario →</a>
</div>
<div class="stat-strip">
  <span class="chip">12 projets</span>
  <span class="chip" style="color:var(--brand-gold-700)">5 en cours</span>
  <span class="chip" style="color:var(--state-danger)">2 en retard</span>
  <span class="chip" style="color:var(--state-success)">3 terminés</span>
</div>
<div class="card"><div class="tw"><table class="dt"><thead><tr>
  <th>Projet</th><th>Statut</th><th>Priorité</th><th>Budget</th><th>Avancement</th><th>Responsable</th><th>Échéance</th>
</tr></thead><tbody>
  <tr><td class="n">Remplacement SI RH</td><td>${badge('En cours', 'ba')}</td><td>${badge('Vital', 'br')}</td><td>206 j</td><td><div style="display:flex;align-items:center;gap:8px">${prog(74)}<span>74 %</span></div></td><td>S. Martin</td><td>31 juil. 2026</td></tr>
  <tr><td class="n">Migration Cloud Azure</td><td>${badge('En cours', 'ba')}</td><td>${badge('Normal', 'bn')}</td><td>120 j</td><td><div style="display:flex;align-items:center;gap:8px">${prog(45, 'warn')}<span>45 %</span></div></td><td>P. Dupont</td><td>30 sep. 2026</td></tr>
  <tr><td class="n">Conformité DORA</td><td>${badge('En retard', 'br')}</td><td>${badge('Critique', 'br')}</td><td>85 j</td><td><div style="display:flex;align-items:center;gap:8px">${prog(33, 'bad')}<span>33 %</span></div></td><td>S. Martin</td><td>30 juin 2026</td></tr>
  <tr><td class="n">Projet CRM</td><td>${badge('En cours', 'ba')}</td><td>${badge('Élevé', 'bw')}</td><td>90 j</td><td><div style="display:flex;align-items:center;gap:8px">${prog(62)}<span>62 %</span></div></td><td>J. Lambert</td><td>15 juin 2026</td></tr>
  <tr><td class="n">Refonte Intranet</td><td>${badge('En retard', 'br')}</td><td>${badge('Normal', 'bn')}</td><td>60 j</td><td><div style="display:flex;align-items:center;gap:8px">${prog(18, 'bad')}<span>18 %</span></div></td><td>M. Clermont</td><td>28 fév. 2026</td></tr>
  <tr><td class="n">Modernisation réseau</td><td>${badge('Terminé', 'bs')}</td><td>${badge('Normal', 'bn')}</td><td>75 j</td><td><div style="display:flex;align-items:center;gap:8px">${prog(100)}<span>100 %</span></div></td><td>P. Dupont</td><td>31 mars 2026</td></tr>
  <tr><td class="n">ERP Finance</td><td>${badge('En réflexion', 'bi')}</td><td>${badge('Vital', 'br')}</td><td>—</td><td><div style="display:flex;align-items:center;gap:8px">${prog(0, 'warn')}<span>0 %</span></div></td><td>—</td><td>À définir</td></tr>
  <tr><td class="n">Cybersécurité SOC</td><td>${badge('En cours', 'ba')}</td><td>${badge('Élevé', 'bw')}</td><td>130 j</td><td><div style="display:flex;align-items:center;gap:8px">${prog(55)}<span>55 %</span></div></td><td>S. Martin</td><td>31 oct. 2026</td></tr>
</tbody></table></div></div></div>`;
    }
  },
  /* 3 ── BUDGETS ───────────────────────────────────────── */
  budget: {
    title: "Budgets & finances",
    render() {
      return `<div class="pw">
${phdr("Budgets & finances", "Exercice 2026 · Innovatech SA", ["Finances", "Budgets"], btn("Exporter", "btn-s", "download") + btn("Nouvel exercice", "btn-p", "plus"))}
<div class="kgrid">
  ${kpi('wallet', "Budget prévu", "4 200 000 €", "Exercice 2026", 'neu')}
  ${kpi('briefcase', "Engagé", "3 100 000 €", "74 % du prévu", 'warn')}
  ${kpi('arrow-up', "Consommé", "2 340 000 €", "56 % du prévu", 'ok')}
  ${kpi('alert-triangle', "Écart prévisionnel", "+158 000 €", "Dépassement estimé", 'bad')}
</div>
<div class="card mb14"><div class="ct">Enveloppes budgétaires <a class="cl">Voir le détail</a></div>
<div class="tw"><table class="dt"><thead><tr><th>Enveloppe</th><th>Prévu</th><th>Engagé</th><th>Consommé</th><th>Avancement</th><th>Statut</th></tr></thead><tbody>
  <tr><td class="n">Infrastructure Cloud</td><td>1 200 000 €</td><td>890 000 €</td><td>740 000 €</td><td><div style="display:flex;align-items:center;gap:8px">${prog(62)}<span>62 %</span></div></td><td>${badge('OK', 'bs')}</td></tr>
  <tr><td class="n">Licences logicielles</td><td>650 000 €</td><td>612 000 €</td><td>590 000 €</td><td><div style="display:flex;align-items:center;gap:8px">${prog(91, 'warn')}<span>91 %</span></div></td><td>${badge('Attention', 'bw')}</td></tr>
  <tr><td class="n">Projets de transformation</td><td>1 800 000 €</td><td>1 398 000 €</td><td>840 000 €</td><td><div style="display:flex;align-items:center;gap:8px">${prog(47)}<span>47 %</span></div></td><td>${badge('OK', 'bs')}</td></tr>
  <tr><td class="n">Formation & RH</td><td>350 000 €</td><td>200 000 €</td><td>170 000 €</td><td><div style="display:flex;align-items:center;gap:8px">${prog(49)}<span>49 %</span></div></td><td>${badge('OK', 'bs')}</td></tr>
  <tr><td class="n">Sécurité & conformité</td><td>200 000 €</td><td>0 €</td><td>0 €</td><td><div style="display:flex;align-items:center;gap:8px">${prog(0, 'warn')}<span>0 %</span></div></td><td>${badge('Non démarré', 'bn')}</td></tr>
</tbody></table></div></div>
<div class="g2">
  <div class="card"><div class="ct">Instantanés (snapshots)</div>
    <div class="ali"><div class="alib"><div class="alit">Budget initial 2026</div><div class="alim">3 janv. 2026 · Figé</div></div>${badge('Référence', 'bi')}</div>
    <div class="ali"><div class="alib"><div class="alit">Révision T1 2026</div><div class="alim">31 mars 2026 · Figé</div></div>${badge('Archivé', 'bn')}</div>
    <div class="ali"><div class="alib"><div class="alit">Révision T2 2026</div><div class="alim">En cours</div></div>${badge('En cours', 'ba')}</div>
  </div>
  <div class="card"><div class="ct">Dernières transactions</div>
    <div class="ali"><div class="alib"><div class="alit">Facture Microsoft #INV-20241</div><div class="alim">48 000 € · Licences · 2 juin 2026</div></div></div>
    <div class="ali"><div class="alib"><div class="alit">Bon de commande Capgemini</div><div class="alim">120 000 € · Projets · 28 mai 2026</div></div></div>
    <div class="ali"><div class="alib"><div class="alit">Facture Orange Business</div><div class="alim">12 400 € · Infrastructure · 25 mai 2026</div></div></div>
  </div>
</div></div>`;
    }
  },
  /* 4 ── FOURNISSEURS ──────────────────────────────────── */
  suppliers: {
    title: "Achats & fournisseurs",
    render() {
      return `<div class="pw">
${phdr("Achats & fournisseurs", "6 fournisseurs actifs · 18 commandes en cours", ["Finances", "Achats & fournisseurs"], btn("Nouveau fournisseur", "btn-p", "plus"))}
<div id="supwrap">
<div class="ptabs">
  <div class="ptab active" data-tab="sup" onclick="switchTab('supwrap','sup')">Fournisseurs</div>
  <div class="ptab" data-tab="cmd" onclick="switchTab('supwrap','cmd')">Commandes (18)</div>
  <div class="ptab" data-tab="fac" onclick="switchTab('supwrap','fac')">Factures (34)</div>
</div>
<div class="tab-pane" data-pane="sup">
<div class="sg">
  <div class="sc"><div class="slog">MSFT</div><div class="sn">Microsoft</div><div class="scat">Éditeur logiciel · Cloud</div><div class="sm"><span>6 contrats actifs</span><span>4 commandes</span></div></div>
  <div class="sc"><div class="slog">AWS</div><div class="sn">Amazon Web Services</div><div class="scat">Hébergement cloud</div><div class="sm"><span>2 contrats actifs</span><span>1 commande</span></div></div>
  <div class="sc"><div class="slog">SFSF</div><div class="sn">Salesforce</div><div class="scat">CRM · Éditeur</div><div class="sm"><span>1 contrat actif</span><span>2 commandes</span></div></div>
  <div class="sc"><div class="slog">OBS</div><div class="sn">Orange Business Services</div><div class="scat">Télécoms · Réseau</div><div class="sm"><span>3 contrats actifs</span><span>5 commandes</span></div></div>
  <div class="sc"><div class="slog">CAP</div><div class="sn">Capgemini</div><div class="scat">SSII · Conseil IT</div><div class="sm"><span>1 contrat actif</span><span>3 commandes</span></div></div>
  <div class="sc"><div class="slog">DEV</div><div class="sn">Devoteam</div><div class="scat">Conseil IT · Intégration</div><div class="sm"><span>2 contrats actifs</span><span>3 commandes</span></div></div>
</div></div>
<div class="tab-pane" data-pane="cmd" style="display:none"><div class="card"><div class="tw"><table class="dt"><thead><tr><th>Référence</th><th>Fournisseur</th><th>Objet</th><th>Montant HT</th><th>Statut</th><th>Date</th></tr></thead><tbody>
  <tr><td class="n">BC-2026-042</td><td>Capgemini</td><td>TMA SI RH — T2</td><td>120 000 €</td><td>${badge('Approuvé', 'bs')}</td><td>28 mai 2026</td></tr>
  <tr><td class="n">BC-2026-039</td><td>Microsoft</td><td>Licences Microsoft 365</td><td>48 000 €</td><td>${badge('Approuvé', 'bs')}</td><td>2 juin 2026</td></tr>
  <tr><td class="n">BC-2026-035</td><td>Devoteam</td><td>Audit sécurité SI</td><td>32 000 €</td><td>${badge('En attente', 'bw')}</td><td>20 mai 2026</td></tr>
  <tr><td class="n">BC-2026-031</td><td>AWS</td><td>Infra Cloud — batch migration</td><td>18 500 €</td><td>${badge('En cours', 'ba')}</td><td>15 mai 2026</td></tr>
</tbody></table></div></div></div>
<div class="tab-pane" data-pane="fac" style="display:none"><div class="card"><div class="tw"><table class="dt"><thead><tr><th>N° Facture</th><th>Fournisseur</th><th>Commande</th><th>Montant</th><th>Statut</th><th>Échéance</th></tr></thead><tbody>
  <tr><td class="n">INV-20241</td><td>Microsoft</td><td>BC-2026-039</td><td>48 000 €</td><td>${badge('Reçue', 'bs')}</td><td>30 juin 2026</td></tr>
  <tr><td class="n">INV-20238</td><td>Capgemini</td><td>BC-2026-042</td><td>60 000 €</td><td>${badge('À valider', 'bw')}</td><td>15 juin 2026</td></tr>
  <tr><td class="n">INV-20235</td><td>Orange Business</td><td>BC-2026-028</td><td>12 400 €</td><td>${badge('Payée', 'bn')}</td><td>Clôturée</td></tr>
</tbody></table></div></div></div>
</div></div>`;
    }
  },
  /* 5 ── CONTRATS ──────────────────────────────────────── */
  contracts: {
    title: "Contrats & licences",
    render() {
      return `<div class="pw">
${phdr("Contrats & licences", "14 contrats actifs · 3 alertes d'échéance", ["Finances", "Contrats & licences"], btn("Nouveau contrat", "btn-p", "plus"))}
<div id="contwrap">
<div class="ptabs">
  <div class="ptab active" data-tab="ct" onclick="switchTab('contwrap','ct')">Contrats (14)</div>
  <div class="ptab" data-tab="lic" onclick="switchTab('contwrap','lic')">Licences logicielles (22)</div>
</div>
<div class="tab-pane" data-pane="ct"><div class="card"><div class="tw"><table class="dt"><thead><tr>
  <th>Contrat</th><th>Fournisseur</th><th>Type</th><th>Début</th><th>Fin</th><th>Montant</th><th>Statut</th>
</tr></thead><tbody>
  <tr><td class="n">Microsoft EA 2024–2027</td><td>Microsoft</td><td>Licence</td><td>1 janv. 2024</td><td>31 déc. 2026</td><td>144 000 €/an</td><td>${badge('Actif', 'bs')}</td></tr>
  <tr><td class="n">Azure — Cloud Services</td><td>Microsoft</td><td>SaaS</td><td>1 janv. 2025</td><td>31 déc. 2025</td><td>18 000 €/an</td><td>${badge('Expire bientôt', 'br')}</td></tr>
  <tr><td class="n">TMA Capgemini 2026</td><td>Capgemini</td><td>Prestation</td><td>1 janv. 2026</td><td>31 déc. 2026</td><td>480 000 €</td><td>${badge('Actif', 'bs')}</td></tr>
  <tr><td class="n">Salesforce CRM</td><td>Salesforce</td><td>SaaS</td><td>15 mars 2025</td><td>14 mars 2026</td><td>36 000 €/an</td><td>${badge('Expire bientôt', 'br')}</td></tr>
  <tr><td class="n">Connexion MPLS OBS</td><td>Orange Business</td><td>Télécom</td><td>1 avr. 2023</td><td>31 mars 2026</td><td>24 000 €/an</td><td>${badge('Expire bientôt', 'br')}</td></tr>
  <tr><td class="n">Audit sécurité Devoteam</td><td>Devoteam</td><td>Conseil</td><td>1 mai 2026</td><td>31 août 2026</td><td>32 000 €</td><td>${badge('Actif', 'bs')}</td></tr>
</tbody></table></div></div></div>
<div class="tab-pane" data-pane="lic" style="display:none"><div class="card"><div class="tw"><table class="dt"><thead><tr>
  <th>Logiciel</th><th>Éditeur</th><th>Contrat lié</th><th>Qté</th><th>Renouvellement</th><th>Statut</th>
</tr></thead><tbody>
  <tr><td class="n">Microsoft 365 Business</td><td>Microsoft</td><td>Microsoft EA 2024–2027</td><td>120 sièges</td><td>31 déc. 2026</td><td>${badge('Actif', 'bs')}</td></tr>
  <tr><td class="n">Azure AD P1</td><td>Microsoft</td><td>Azure Cloud Services</td><td>120 sièges</td><td>31 déc. 2025</td><td>${badge('Expire bientôt', 'br')}</td></tr>
  <tr><td class="n">Salesforce Sales Cloud</td><td>Salesforce</td><td>Salesforce CRM</td><td>45 sièges</td><td>14 mars 2026</td><td>${badge('Expire bientôt', 'br')}</td></tr>
  <tr><td class="n">Jira Software</td><td>Atlassian</td><td>—</td><td>30 sièges</td><td>30 sep. 2026</td><td>${badge('Actif', 'bs')}</td></tr>
</tbody></table></div></div></div>
</div></div>`;
    }
  },
  /* 6 ── RISQUES ───────────────────────────────────────── */
  risks: {
    title: "Risques & plans d'action",
    render() {
      return `<div class="pw">
${phdr("Risques & plans d'action", "17 risques identifiés · 3 critiques", ["Projets", "Risques & plans d'action"], btn("Nouveau risque", "btn-p", "plus"))}
<div class="kgrid">
  ${kpi('alert-triangle', "Risques critiques", "3", "Sans plan d'action : 1", 'bad')}
  ${kpi('alert-triangle', "Risques élevés", "7", "2 nouveaux ce mois", 'warn')}
  ${kpi('shield-check', "Plans d'action", "5", "En cours", 'ok')}
  ${kpi('arrow-down', "Risques résiduels", "17", "7 réduits ce trimestre", 'neu')}
</div>
<div class="ms">
  <div class="card"><div class="ct">Registre des risques</div>
  <div class="fb" style="margin-bottom:10px">
    <select class="fsel"><option>Tous statuts</option><option>Ouvert</option><option>En traitement</option></select>
    <select class="fsel"><option>Toute criticité</option><option>Critique</option><option>Élevé</option><option>Moyen</option></select>
  </div>
  <div class="tw"><table class="dt"><thead><tr><th>Risque</th><th>Domaine</th><th>Probabilité</th><th>Impact</th><th>Score</th><th>Propriétaire</th><th>Statut</th></tr></thead><tbody>
    <tr><td class="n">Cyberattaque / ransomware</td><td>Sécurité</td><td>${badge('Élevé', 'br')}</td><td>${badge('Critique', 'br')}</td><td style="font-weight:700;color:var(--state-danger)">20</td><td>S. Martin</td><td>${badge('Ouvert', 'br')}</td></tr>
    <tr><td class="n">Perte de données RH</td><td>Données</td><td>${badge('Moyen', 'bw')}</td><td>${badge('Critique', 'br')}</td><td style="font-weight:700;color:var(--state-danger)">15</td><td>M. Clermont</td><td>${badge('En traitement', 'ba')}</td></tr>
    <tr><td class="n">Non-conformité DORA</td><td>Conformité</td><td>${badge('Moyen', 'bw')}</td><td>${badge('Critique', 'br')}</td><td style="font-weight:700;color:var(--state-danger)">15</td><td>S. Martin</td><td>${badge('En traitement', 'ba')}</td></tr>
    <tr><td class="n">Dépassement budget SI RH</td><td>Financier</td><td>${badge('Élevé', 'br')}</td><td>${badge('Élevé', 'bw')}</td><td style="font-weight:700;color:var(--state-warning)">12</td><td>J. Lambert</td><td>${badge('En traitement', 'ba')}</td></tr>
    <tr><td class="n">Défaillance fournisseur cloud</td><td>Infrastructure</td><td>${badge('Faible', 'bs')}</td><td>${badge('Élevé', 'bw')}</td><td style="font-weight:700;color:var(--state-warning)">8</td><td>P. Dupont</td><td>${badge('Ouvert', 'bn')}</td></tr>
    <tr><td class="n">Retard projet CRM</td><td>Projets</td><td>${badge('Élevé', 'br')}</td><td>${badge('Moyen', 'bw')}</td><td style="font-weight:700;color:var(--brand-gold-700)">9</td><td>J. Lambert</td><td>${badge('En traitement', 'ba')}</td></tr>
  </tbody></table></div></div>
  <div class="vstack">
    <div class="card"><div class="ct">Plans d'action actifs</div>
      <div class="ali"><div class="alid crit"></div><div class="alib"><div class="alit">Plan de réponse cyber</div><div class="alim">Risque : Cyberattaque · 3 tâches · 0 % complété</div></div></div>
      <div class="ali"><div class="alid warn"></div><div class="alib"><div class="alit">Remédiation DORA</div><div class="alim">Risque : Non-conformité DORA · 8 tâches · 33 %</div></div></div>
      <div class="ali"><div class="alid warn"></div><div class="alib"><div class="alit">Sauvegarde données RH</td><div class="alim">Risque : Perte données · 4 tâches · 75 %</div></div></div>
    </div>
    <div class="card"><div class="ct">Matrice de criticité</div>
      <div style="display:grid;grid-template-columns:auto repeat(4,1fr);gap:3px;font-size:10.5px">
        <div style="color:var(--fg-4);padding:4px 0"></div>
        <div style="text-align:center;color:var(--fg-3);padding:4px;font-weight:600">Faible</div>
        <div style="text-align:center;color:var(--fg-3);padding:4px;font-weight:600">Moyen</div>
        <div style="text-align:center;color:var(--fg-3);padding:4px;font-weight:600">Élevé</div>
        <div style="text-align:center;color:var(--fg-3);padding:4px;font-weight:600">Critique</div>
        ${[['Élevé', '2', '4', '9', '20'], ['Moyen', '1', '3', '6', '15'], ['Faible', '1', '2', '4', '8']].map(([lbl, ...vals]) => `<div style="color:var(--fg-3);padding:4px 6px 4px 0;text-align:right;font-weight:600">${lbl}</div>` + vals.map((v, i) => {
        const bg = i === 0 ? 'var(--neutral-100)' : i === 1 ? 'var(--state-warning-bg)' : i === 2 ? 'var(--state-danger-bg)' : 'var(--state-danger)';
        const c = i === 3 ? '#fff' : '';
        return `<div style="background:${bg};color:${c};border-radius:5px;padding:8px;text-align:center;font-weight:700">${v}</div>`;
      }).join('')).join('')}
      </div>
    </div>
  </div>
</div></div>`;
    }
  },
  /* 7 ── ÉQUIPES ───────────────────────────────────────── */
  teams: {
    title: "Équipes & ressources",
    render() {
      return `<div class="pw">
${phdr("Équipes & ressources", "68 collaborateurs · 9 équipes", ["Ressources", "Équipes & ressources"], btn("Exporter", "btn-s", "download") + btn("Nouvelle équipe", "btn-p", "plus"))}
<div id="teamwrap">
<div class="ptabs">
  <div class="ptab active" data-tab="eq" onclick="switchTab('teamwrap','eq')">Équipes (9)</div>
  <div class="ptab" data-tab="col" onclick="switchTab('teamwrap','col')">Collaborateurs (68)</div>
  <div class="ptab" data-tab="temps" onclick="switchTab('teamwrap','temps')">Feuilles de temps</div>
</div>
<div class="tab-pane" data-pane="eq">
<div class="card"><div class="tw"><table class="dt"><thead><tr><th>Équipe</th><th>Responsable</th><th>Membres</th><th>Capacité / trim.</th><th>Chargée</th><th>Statut</th></tr></thead><tbody>
  <tr><td class="n">Direction opération</td><td>S. Martin</td><td>12</td><td>60 j</td><td><div style="display:flex;align-items:center;gap:8px">${prog(83, 'warn')}<span>83 %</span></div></td><td>${badge('Chargée', 'bw')}</td></tr>
  <tr><td class="n">Études & développement</td><td>P. Dupont</td><td>7</td><td>35 j</td><td><div style="display:flex;align-items:center;gap:8px">${prog(60)}<span>60 %</span></div></td><td>${badge('Disponible', 'bs')}</td></tr>
  <tr><td class="n">Infrastructure & exploitation</td><td>L. Petit</td><td>5</td><td>25 j</td><td><div style="display:flex;align-items:center;gap:8px">${prog(100, 'bad')}<span>100 %</span></div></td><td>${badge('Saturée', 'br')}</td></tr>
  <tr><td class="n">Direction Transformation</td><td>S. Martin</td><td>11</td><td>55 j</td><td><div style="display:flex;align-items:center;gap:8px">${prog(55)}<span>55 %</span></div></td><td>${badge('Disponible', 'bs')}</td></tr>
  <tr><td class="n">PMO / Portefeuille</td><td>J. Lambert</td><td>6</td><td>30 j</td><td><div style="display:flex;align-items:center;gap:8px">${prog(100, 'bad')}<span>100 %</span></div></td><td>${badge('Saturée', 'br')}</td></tr>
  <tr><td class="n">IT Sécurité</td><td>A. Roux</td><td>15</td><td>75 j</td><td><div style="display:flex;align-items:center;gap:8px">${prog(92, 'warn')}<span>92 %</span></div></td><td>${badge('Chargée', 'bw')}</td></tr>
  <tr><td class="n">Marketing - data</td><td>M. Clermont</td><td>9</td><td>45 j</td><td><div style="display:flex;align-items:center;gap:8px">${prog(44)}<span>44 %</span></div></td><td>${badge('Disponible', 'bs')}</td></tr>
</tbody></table></div></div>
<div style="margin-top:10px"><a class="btn btn-s" href="scenario.html">Voir la vue Scénario de capacité →</a></div>
</div>
<div class="tab-pane" data-pane="col" style="display:none"><div class="fb">
  <select class="fsel"><option>Toutes équipes</option><option>Direction opération</option><option>IT Sécurité</option></select>
  <input class="finput" placeholder="Rechercher un collaborateur…">
</div>
<div class="card"><div class="tw"><table class="dt"><thead><tr><th>Collaborateur</th><th>Équipe</th><th>Rôle</th><th>Compétences</th><th>Disponibilité</th></tr></thead><tbody>
  <tr><td class="n">Sophie Martin</td><td>Direction opération</td><td>DSI</td><td>${badge('Architecture', 'bi')} ${badge('Gouvernance', 'bp')}</td><td>${badge('80 %', 'bs')}</td></tr>
  <tr><td class="n">Paul Dupont</td><td>Études & développement</td><td>Dev lead</td><td>${badge('Java', 'bi')} ${badge('Cloud', 'bp')}</td><td>${badge('60 %', 'bw')}</td></tr>
  <tr><td class="n">Jean Lambert</td><td>PMO / Portefeuille</td><td>Chef de projet</td><td>${badge('PRINCE2', 'bi')} ${badge('Agile', 'bp')}</td><td>${badge('20 %', 'br')}</td></tr>
  <tr><td class="n">Marie Clermont</td><td>Marketing - data</td><td>Data analyst</td><td>${badge('SQL', 'bi')} ${badge('Power BI', 'bp')}</td><td>${badge('100 %', 'bs')}</td></tr>
</tbody></table></div></div></div>
<div class="tab-pane" data-pane="temps" style="display:none"><div class="card"><div class="ct">Feuilles de temps — Juin 2026</div>
<div class="tw"><table class="dt"><thead><tr><th>Collaborateur</th><th>Jours saisis</th><th>Jours validés</th><th>Statut</th><th>Action</th></tr></thead><tbody>
  <tr><td class="n">Sophie Martin</td><td>18 j</td><td>18 j</td><td>${badge('Validé', 'bs')}</td><td><button class="btn btn-sm btn-s">Voir</button></td></tr>
  <tr><td class="n">Paul Dupont</td><td>20 j</td><td>0 j</td><td>${badge('À valider', 'bw')}</td><td><button class="btn btn-sm btn-p">Valider</button></td></tr>
  <tr><td class="n">Jean Lambert</td><td>15 j</td><td>0 j</td><td>${badge('Soumis', 'bi')}</td><td><button class="btn btn-sm btn-p">Valider</button></td></tr>
  <tr><td class="n">Marie Clermont</td><td>0 j</td><td>0 j</td><td>${badge('Brouillon', 'bn')}</td><td><button class="btn btn-sm btn-s">Rappeler</button></td></tr>
</tbody></table></div></div></div>
</div></div>`;
    }
  },
  /* 8 ── CONFORMITÉ ────────────────────────────────────── */
  compliance: {
    title: "Conformité",
    render() {
      return `<div class="pw">
${phdr("Conformité", "3 référentiels actifs · 24 écarts à traiter", ["Gouvernance", "Conformité"], btn("Rapport comité", "btn-s", "download") + btn("Évaluer", "btn-p", "edit"))}
<div class="g3 mb14">
  <div class="fwcard"><div class="fwh"><div><div class="fwn">ISO 27001</div><div class="fwm" style="margin-top:2px">42 / 58 exigences</div></div><div class="fwp">72 %</div></div><div class="fwt"><div class="fwf" style="width:72%"></div></div><div class="fwm">16 écarts · 4 critiques</div></div>
  <div class="fwcard"><div class="fwh"><div><div class="fwn">DORA</div><div class="fwm" style="margin-top:2px">18 / 40 exigences</div></div><div class="fwp" style="color:var(--state-danger)">45 %</div></div><div class="fwt"><div class="fwf" style="width:45%;background:var(--state-danger)"></div></div><div class="fwm">22 écarts · 8 critiques</div></div>
  <div class="fwcard"><div class="fwh"><div><div class="fwn">NIS 2</div><div class="fwm" style="margin-top:2px">31 / 52 exigences</div></div><div class="fwp" style="color:var(--brand-gold-700)">60 %</div></div><div class="fwt"><div class="fwf" style="width:60%;background:var(--brand-gold)"></div></div><div class="fwm">21 écarts · 5 critiques</div></div>
</div>
<div class="card"><div class="ct">Écarts critiques à traiter <a class="cl">Voir tous les écarts</a></div>
<div class="tw"><table class="dt"><thead><tr><th>Exigence</th><th>Référentiel</th><th>Statut</th><th>Plan d'action</th><th>Priorité</th></tr></thead><tbody>
  <tr><td class="n">Art. 9 — Tests de résilience opérationnelle</td><td>DORA</td><td>${badge('Non conforme', 'br')}</td><td>${badge('À créer', 'bn')}</td><td>${badge('Critique', 'br')}</td></tr>
  <tr><td class="n">Art. 17 — Registre incidents ICT</td><td>DORA</td><td>${badge('Non conforme', 'br')}</td><td>${badge('En cours', 'ba')}</td><td>${badge('Critique', 'br')}</td></tr>
  <tr><td class="n">A.12.3 — Sauvegarde données</td><td>ISO 27001</td><td>${badge('Partiel', 'bw')}</td><td>${badge('En cours', 'ba')}</td><td>${badge('Élevé', 'bw')}</td></tr>
  <tr><td class="n">Mesure 8 — Sécurité chaîne d'approvisionnement</td><td>NIS 2</td><td>${badge('Non conforme', 'br')}</td><td>${badge('À créer', 'bn')}</td><td>${badge('Critique', 'br')}</td></tr>
  <tr><td class="n">A.18.1 — Exigences légales</td><td>ISO 27001</td><td>${badge('Partiel', 'bw')}</td><td>${badge('Planifié', 'bi')}</td><td>${badge('Moyen', 'bn')}</td></tr>
</tbody></table></div></div></div>`;
    }
  },
  /* 9 ── CYCLES DE PILOTAGE ────────────────────────────── */
  cycles: {
    title: "Cycles de pilotage",
    render() {
      return `<div class="pw">
${phdr("Cycles de pilotage", "CODIR T2 2026 en cours · 8 sujets candidats", ["Gouvernance", "Cycles de pilotage"], btn("Nouveau cycle", "btn-p", "plus"))}
<div class="cycle-header">
  <div>${I['refresh-cw']}</div>
  <div style="flex:1"><div style="font-size:15px;font-weight:700;color:var(--fg-1)">CODIR T2 2026</div><div style="font-size:12px;color:var(--fg-3)">Arbitrage trimestriel · Séance prévue le 30 juin 2026</div></div>
  <div class="stat-strip" style="margin:0">
    <span class="chip">8 candidatures</span>
    <span class="chip" style="color:var(--state-success)">3 acceptés</span>
    <span class="chip" style="color:var(--brand-gold-700)">2 différés</span>
    <span class="chip" style="color:var(--state-danger)">1 refusé</span>
  </div>
  <button class="btn btn-p">Ouvrir la séance</button>
</div>
<div class="card"><div class="ct">Matrice d'arbitrage</div>
<div class="tw"><table class="dt"><thead><tr>
  <th>Projet / Sujet</th><th>Valeur métier</th><th>Alignement strat.</th><th>Budget</th><th>Capacité</th><th>Risque</th><th>Score</th><th>Décision</th>
</tr></thead><tbody>
  <tr><td class="n">Migration Cloud Azure</td><td>⬤⬤⬤⬤⬤</td><td>⬤⬤⬤⬤○</td><td>⬤⬤⬤○○</td><td>⬤⬤⬤⬤○</td><td>⬤⬤○○○</td><td style="font-weight:700;color:var(--state-success)">78</td><td>${badge('Accepté', 'bs')}</td></tr>
  <tr><td class="n">Conformité DORA</td><td>⬤⬤⬤⬤○</td><td>⬤⬤⬤⬤⬤</td><td>⬤⬤⬤⬤○</td><td>⬤⬤⬤○○</td><td>⬤⬤⬤⬤⬤</td><td style="font-weight:700;color:var(--state-success)">88</td><td>${badge('Accepté', 'bs')}</td></tr>
  <tr><td class="n">ERP Finance</td><td>⬤⬤⬤⬤○</td><td>⬤⬤⬤○○</td><td>⬤○○○○</td><td>⬤○○○○</td><td>⬤⬤⬤○○</td><td style="font-weight:700;color:var(--brand-gold-700)">52</td><td>${badge('Différé', 'bw')}</td></tr>
  <tr><td class="n">Refonte portail RH</td><td>⬤⬤⬤○○</td><td>⬤⬤⬤○○</td><td>⬤⬤⬤○○</td><td>⬤⬤○○○</td><td>⬤⬤○○○</td><td style="font-weight:700;color:var(--brand-gold-700)">58</td><td>${badge('Différé', 'bw')}</td></tr>
  <tr><td class="n">Extension datacenter</td><td>⬤⬤○○○</td><td>⬤⬤○○○</td><td>⬤○○○○</td><td>⬤○○○○</td><td>⬤⬤⬤⬤○</td><td style="font-weight:700;color:var(--state-danger)">32</td><td>${badge('Refusé', 'br')}</td></tr>
  <tr><td class="n">Cybersécurité SOC</td><td>⬤⬤⬤⬤⬤</td><td>⬤⬤⬤⬤⬤</td><td>⬤⬤⬤○○</td><td>⬤⬤⬤○○</td><td>⬤⬤⬤⬤⬤</td><td style="font-weight:700;color:var(--state-success)">85</td><td>${badge('Accepté', 'bs')}</td></tr>
</tbody></table></div></div></div>`;
    }
  },
  /* 10 ── DEMANDES PROJET ──────────────────────────────── */
  requests: {
    title: "Demandes projet",
    render() {
      return `<div class="pw">
${phdr("Demandes projet", "12 demandes · 5 en attente de validation", ["Projets", "Demandes projet"], btn("Nouvelle demande", "btn-p", "plus"))}
<div class="kanban">
  <div class="kcol"><div class="kch">Brouillon <span class="kcnt">3</span></div>
    <div class="kcard"><div class="kct">Modernisation téléphonie IP</div><div class="kcm"><span>120 j est.</span>${badge('Normal', 'bn')}</div></div>
    <div class="kcard"><div class="kct">Outil de gestion documentaire</div><div class="kcm"><span>60 j est.</span>${badge('Normal', 'bn')}</div></div>
    <div class="kcard"><div class="kct">Automatisation reporting</div><div class="kcm"><span>45 j est.</span>${badge('Normal', 'bn')}</div></div>
  </div>
  <div class="kcol"><div class="kch">Soumis <span class="kcnt">4</span></div>
    <div class="kcard"><div class="kct">ERP Finance — cadrage</div><div class="kcm"><span>200 j est.</span>${badge('Vital', 'br')}</div></div>
    <div class="kcard"><div class="kct">Refonte portail RH</div><div class="kcm"><span>90 j est.</span>${badge('Élevé', 'bw')}</div></div>
    <div class="kcard"><div class="kct">Supervision réseau avancée</div><div class="kcm"><span>30 j est.</span>${badge('Normal', 'bn')}</div></div>
    <div class="kcard"><div class="kct">Chatbot support IT</div><div class="kcm"><span>75 j est.</span>${badge('Normal', 'bn')}</div></div>
  </div>
  <div class="kcol"><div class="kch">En révision <span class="kcnt">2</span></div>
    <div class="kcard"><div class="kct">Migration data warehouse</div><div class="kcm"><span>120 j est.</span>${badge('Vital', 'br')}</div></div>
    <div class="kcard"><div class="kct">Intégration SSO</div><div class="kcm"><span>40 j est.</span>${badge('Normal', 'bn')}</div></div>
  </div>
  <div class="kcol"><div class="kch">Approuvé <span class="kcnt">2</span></div>
    <div class="kcard" style="border-left:3px solid var(--state-success)"><div class="kct">Extension datacenter T3</div><div class="kcm"><span>180 j est.</span>${badge('Vital', 'br')}</div></div>
    <div class="kcard" style="border-left:3px solid var(--state-success)"><div class="kct">Sécurisation accès VPN</div><div class="kcm"><span>25 j est.</span>${badge('Élevé', 'bw')}</div></div>
  </div>
  <div class="kcol"><div class="kch">Refusé <span class="kcnt">1</span></div>
    <div class="kcard" style="opacity:.5"><div class="kct">Application mobile collaborateurs</div><div class="kcm"><span>150 j est.</span>${badge('Normal', 'bn')}</div></div>
  </div>
</div></div>`;
    }
  },
  /* 11 ── VISION STRATÉGIQUE ───────────────────────────── */
  strategy: {
    title: "Vision stratégique",
    render() {
      return `<div class="pw">
${phdr("Vision stratégique", "Horizon 2026–2028 · Innovatech SA", ["Gouvernance", "Vision stratégique"], btn("Voir le tableau de bord complet", "btn-s", "external") + btn("Modifier la vision", "btn-p", "edit"))}
<div class="card mb14"><div class="ct">Vision de l'organisation</div>
  <div class="vision-q">Devenir la DSI de référence pour les ETI de la région, en délivrant une infrastructure IT sécurisée, agile et alignée sur les ambitions de croissance de nos organisations clientes, tout en maîtrisant les risques et les coûts.</div>
  <div style="display:flex;gap:8px;margin-top:14px">
    ${badge('Horizon 2028', 'ba')} ${badge('Validé par le CODIR', 'bs')} ${badge('Version 3.1', 'bn')}
  </div>
</div>
<div class="kgrid" style="grid-template-columns:repeat(4,1fr)">
  ${kpi('target', "Score d'alignement global", "82 %", "↑ 6 pts vs T1 2025", 'ok')}
  ${kpi('briefcase', "Axes stratégiques", "4", "100 % couverts", 'neu')}
  ${kpi('shield-check', "Objectifs en trajectoire", "14 / 18", "78 %", 'ok')}
  ${kpi('alert-triangle', "Alertes désalignement", "3", "Dont 1 critique", 'warn')}
</div>
<div style="margin-bottom:8px;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--fg-3)">4 axes stratégiques</div>
<div class="g4">
  ${[['Performance opérationnelle', 'trending', 85, 'ok'], ['Transformation digitale', 'briefcase', 72, 'ok'], ['Maîtrise des risques', 'shield-check', 65, 'warn'], ['Développement humain', 'users', 80, 'ok']].map(([n, ico, p, c]) => `
  <div class="card"><div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px"><div><div style="font-size:13px;font-weight:700;color:var(--fg-1);margin-bottom:4px">${n}</div>${badge(p > 75 ? 'En trajectoire' : 'Attention requise', p > 75 ? 'bs' : 'bw')}</div><div style="font:700 22px/1 var(--font-display);letter-spacing:-.02em;color:${c === 'ok' ? 'var(--state-success)' : 'var(--brand-gold-700)'}">${p} %</div></div>${prog(p, c)}</div>`).join('')}
</div></div>`;
    }
  },
  /* 12 ── PARAMÈTRES ───────────────────────────────────── */
  settings: {
    title: "Paramètres",
    render() {
      const tiles = [['Organisation', 'settings', 'Nom, logo, informations légales, modules activés'], ['Membres & accès', 'users', 'Ajouter des membres, attribuer des rôles et permissions'], ['Rôles & permissions', 'shield-check', 'Définir les profils d\'accès par domaine fonctionnel'], ['Structure organisationnelle', 'briefcase', 'Directions, services, unités et arborescence'], ['Intégration Microsoft 365', 'external', 'Connexion Azure AD, synchronisation Teams & Planner'], ['Badges & vocabulaire', 'edit', 'Personnaliser statuts, libellés et couleurs affichés'], ['Workflow budgétaire', 'wallet', 'Étapes de validation et délégations pour les budgets'], ['Workflow demandes projet', 'inbox', 'Circuit d\'approbation des demandes et routage'], ['Taxonomie des risques', 'alert-triangle', 'Domaines et types de risques utilisés dans le registre'], ['Notifications & alertes', 'alert-triangle', 'Canaux, fréquences et seuils de déclenchement'], ['Licences & abonnements', 'file-text', 'Sièges, périmètre et dates d\'échéance de votre abonnement'], ['Journal d\'audit', 'book-open', 'Historique des actions sensibles sur l\'organisation']];
      return `<div class="pw">
${phdr("Paramètres", "Hub d'administration de l'organisation", ["Administration", "Paramètres"])}
<div class="stgrid">
  ${tiles.map(([t, ico, d]) => `<div class="sttile"><div class="stico">${I[ico] || ''}</div><div><div class="sttit">${t}</div><div class="stdesc">${d}</div></div></div>`).join('')}
</div></div>`;
    }
  },
  /* 13 ── DOCUMENTATION ────────────────────────────────── */
  docs: {
    title: "Documentation",
    render() {
      return `<div class="pw">
${phdr("Documentation", "Base de connaissances Starium Orchestra", ["Documentation"])}
<div class="fb"><input class="finput" placeholder="Rechercher un article…" style="max-width:480px"><div class="fsp"></div></div>
<div class="ms">
  <div class="vstack">
    <div class="card"><div class="ct">Articles populaires</div>
      ${[['Prise en main de Starium Orchestra', 'Guide de démarrage · 5 min'], ['Comment créer un projet ?', 'Projets · 3 min'], ['Paramétrer un budget et ses enveloppes', 'Budgets · 7 min'], ['Comprendre les rôles et permissions', 'Administration · 4 min'], ['Préparer une séance de CODIR', 'Cycles de pilotage · 6 min'], ['Connecter Microsoft 365', 'Intégrations · 8 min']].map(([t, m]) => `<div class="ali"><div class="alib"><div class="alit">${t}</div><div class="alim">${m}</div></div>${I['chevron-right']}</div>`).join('')}
    </div>
  </div>
  <div class="vstack">
    <div class="card"><div class="ct">Catégories</div>
      ${[['Démarrage rapide', '3 articles'], ['Projets & scénarios', '12 articles'], ['Budgets & finances', '9 articles'], ['Fournisseurs & contrats', '6 articles'], ['Risques & conformité', '8 articles'], ['Administration', '11 articles'], ['Intégrations', '5 articles']].map(([c, n]) => `<div class="ali"><div class="alib"><div class="alit">${c}</div><div class="alim">${n}</div></div></div>`).join('')}
    </div>
    <div class="card"><div class="ct">Besoin d'aide ?</div>
      <p style="font-size:12.5px;color:var(--fg-3);margin-bottom:14px">Vous ne trouvez pas ce que vous cherchez ?</p>
      <button class="btn btn-s" style="width:100%">Contacter le support</button>
    </div>
  </div>
</div></div>`;
    }
  }
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/orchestra-pages.js", error: String((e && e.message) || e) }); }

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Modal = __ds_scope.Modal;

})();
