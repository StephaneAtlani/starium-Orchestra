'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { useFullscreenPortalContainer } from '@/hooks/use-fullscreen-portal-container';
import { formatCurrency } from '@/features/budgets/lib/budget-formatters';

const GRID = 'var(--border)';

const CHART_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Animation de tracé (stroke-dashoffset) pour les courbes — relancée quand `animateKey` ou les paths changent. */
function useLinePathsDraw(svgRef: React.RefObject<SVGSVGElement | null>, pathSignature: string, animateKey: string) {
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    if (prefersReducedMotion()) return;
    const paths = [...svg.querySelectorAll<SVGPathElement>('.chart-svg-path-draw')];
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    paths.forEach((el) => {
      el.style.transition = 'none';
      const len = el.getTotalLength();
      if (!Number.isFinite(len) || len < 0.5) return;
      el.style.strokeDasharray = String(len);
      el.style.strokeDashoffset = String(len);
    });
    const raf = requestAnimationFrame(() => {
      paths.forEach((el, idx) => {
        const len = el.getTotalLength();
        if (!Number.isFinite(len) || len < 0.5) return;
        timeouts.push(
          setTimeout(() => {
            el.style.transition = `stroke-dashoffset 0.88s ${CHART_EASE}`;
            el.style.strokeDashoffset = '0';
          }, 45 + idx * 95),
        );
      });
    });
    return () => {
      cancelAnimationFrame(raf);
      timeouts.forEach(clearTimeout);
    };
  }, [animateKey, pathSignature, svgRef]);
}

/**
 * Croissance des barres au mount / changement de données (scale depuis la base).
 * Les transitions CSS sur y/height SVG sont peu fiables au mount — transform l’est.
 */
function useBarsGrow(
  svgRef: React.RefObject<SVGSVGElement | null>,
  signature: string,
  animateKey: string,
  axis: 'vertical' | 'horizontal' = 'vertical',
  animate = true,
) {
  useEffect(() => {
    if (!animate) return;
    const svg = svgRef.current;
    if (!svg) return;
    if (prefersReducedMotion()) return;
    const bars = [...svg.querySelectorAll<SVGRectElement>('.chart-svg-bar')];
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    bars.forEach((el) => {
      const growFromRight = el.dataset.chartGrowFromRight != null;
      el.style.transition = 'none';
      el.style.transformBox = 'fill-box';
      el.style.transformOrigin =
        axis === 'vertical'
          ? 'center bottom'
          : growFromRight
            ? 'right center'
            : 'left center';
      el.style.transform = axis === 'vertical' ? 'scaleY(0)' : 'scaleX(0)';
    });

    const raf = requestAnimationFrame(() => {
      bars.forEach((el, idx) => {
        timeouts.push(
          setTimeout(() => {
            el.style.transition = `transform 0.55s ${CHART_EASE}`;
            el.style.transform = 'scale(1)';
          }, 35 + idx * 28),
        );
      });
    });

    return () => {
      cancelAnimationFrame(raf);
      timeouts.forEach(clearTimeout);
    };
  }, [animateKey, signature, svgRef, axis, animate]);
}

/** Point sur le cercle : angle 0° = midi, sens horaire. */
function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function donutSlicePath(
  cx: number,
  cy: number,
  rInner: number,
  rOuter: number,
  a0: number,
  a1: number,
): string {
  const large = a1 - a0 > 180 ? 1 : 0;
  const p0o = polar(cx, cy, rOuter, a0);
  const p1o = polar(cx, cy, rOuter, a1);
  const p1i = polar(cx, cy, rInner, a1);
  const p0i = polar(cx, cy, rInner, a0);
  return `M ${p0o.x} ${p0o.y} A ${rOuter} ${rOuter} 0 ${large} 1 ${p1o.x} ${p1o.y} L ${p1i.x} ${p1i.y} A ${rInner} ${rInner} 0 ${large} 0 ${p0i.x} ${p0i.y} Z`;
}

export type DonutSlice = { name: string; value: number; fill: string };

export function SvgDonutChart({
  slices,
  currency,
  formatSliceTitle,
  innerRatio = 0.58,
  className,
  animateKey = '',
}: {
  slices: DonutSlice[];
  /** Si défini, remplace le libellé `<title>` des segments (ex. effectifs au lieu de montants). */
  formatSliceTitle?: (slice: DonutSlice, pct: number) => string;
  currency?: string | null;
  innerRatio?: number;
  className?: string;
  /** Change quand les données comparaison changent — ré-anime l’entrée des segments. */
  animateKey?: string;
}) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  if (total <= 0) return null;

  const vb = 200;
  const cx = vb / 2;
  const cy = vb / 2;
  const rOuter = 78;
  const rInner = rOuter * innerRatio;
  let angle = 0;

  return (
    <svg
      viewBox={`0 0 ${vb} ${vb}`}
      className={className}
      role="img"
      aria-label="Graphique en anneau"
    >
      {slices.map((sl, i) => {
        const sweep = (sl.value / total) * 360;
        const a0 = angle;
        const a1 = angle + sweep;
        angle = a1;
        const mid = (a0 + a1) / 2;
        const pct = (sl.value / total) * 100;
        const titleText = formatSliceTitle
          ? formatSliceTitle(sl, pct)
          : `${sl.name}: ${formatCurrency(sl.value, currency ?? null)} (${pct.toFixed(1)} %)`;
        const lx = cx + (rInner + (rOuter - rInner) / 2) * Math.cos(((mid - 90) * Math.PI) / 180);
        const ly = cy + (rInner + (rOuter - rInner) / 2) * Math.sin(((mid - 90) * Math.PI) / 180);
        return (
          <g
            key={`${animateKey}-${i}-${sl.name}`}
            className="chart-donut-slice"
            style={{ animationDelay: `${i * 55}ms` }}
          >
            <path
              d={donutSlicePath(cx, cy, rInner, rOuter, a0, a1)}
              fill={sl.fill}
              stroke="var(--background)"
              strokeWidth={1}
            >
              <title>{titleText}</title>
            </path>
            {pct >= 7 ? (
              <text
                x={lx}
                y={ly}
                textAnchor="middle"
                dominantBaseline="middle"
                className="pointer-events-none fill-foreground text-[9px] font-medium"
              >
                {pct.toFixed(0)}%
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

export type GroupedBarRow = { label: string; left: number; right: number; title?: string };

type GroupedBarHover = {
  rowIndex: number;
  side: 'left' | 'right';
  clientX: number;
  clientY: number;
};

const MIN_BAR_HIT_PX = 10;

export function SvgGroupedBarChart({
  rows,
  leftName,
  rightName,
  leftColor,
  rightColor,
  formatY,
  formatTooltip,
  className,
  animateKey = '',
  animate = true,
  selectedRowIndex = null,
  onRowClick,
  maxValue,
  showBarValueLabels = false,
  showTooltips = true,
}: {
  rows: GroupedBarRow[];
  leftName: string;
  rightName: string;
  leftColor: string;
  rightColor: string;
  formatY: (n: number) => string;
  /** Libellé complet dans l’infobulle (ex. montant HT lisible). */
  formatTooltip?: (n: number) => string;
  className?: string;
  animateKey?: string;
  /** Désactive l’animation d’entrée (cockpit temps réel). */
  animate?: boolean;
  selectedRowIndex?: number | null;
  onRowClick?: (rowIndex: number) => void;
  /** Plafond axe Y explicite (ex. zoom sur le mois sélectionné). */
  maxValue?: number;
  /** Affiche le montant au-dessus des barres non nulles. */
  showBarValueLabels?: boolean;
  /** Infobulles au survol / focus clavier (défaut : activé). */
  showTooltips?: boolean;
}) {
  const w = 400;
  const h = 220;
  const padL = 56;
  const padR = 12;
  const padT = showBarValueLabels ? 28 : 16;
  const padB = 52;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const dataMax = Math.max(
    1,
    ...rows.flatMap((r) => [Math.abs(r.left), Math.abs(r.right)]),
  );
  const maxV = Math.max(1, maxValue ?? dataMax * 1.1);
  const n = Math.max(1, rows.length);
  const groupW = innerW / n;
  const barW = (groupW * 0.28) / 1;
  const gap = groupW * 0.12;
  const barSig = rows.map((r) => `${r.label}:${r.left}:${r.right}`).join('|');
  const fmtTip = formatTooltip ?? formatY;

  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<GroupedBarHover | null>(null);
  const [portalReady, setPortalReady] = useState(false);
  const portalContainer = useFullscreenPortalContainer();
  useBarsGrow(svgRef, barSig, animateKey, 'vertical', animate);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  const hoveredRow = hover != null ? rows[hover.rowIndex] : null;
  const hoveredLabel = hoveredRow?.title ?? hoveredRow?.label ?? '';
  const hoveredSideName = hover?.side === 'left' ? leftName : rightName;
  const hoveredValue =
    hover?.side === 'left' ? (hoveredRow?.left ?? 0) : (hoveredRow?.right ?? 0);
  const hoveredColor = hover?.side === 'left' ? leftColor : rightColor;

  const setBarHover = (
    rowIndex: number,
    side: 'left' | 'right',
    event: React.MouseEvent<SVGRectElement>,
  ) => {
    if (!showTooltips) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setHover({
      rowIndex,
      side,
      clientX: rect.left + rect.width / 2,
      clientY: rect.top,
    });
  };

  const clearBarHover = () => setHover(null);

  const tooltipNode =
    showTooltips && hover && hoveredRow && portalReady ? (
      <div
        role="tooltip"
        className="pointer-events-none fixed z-[80] max-w-[14rem] -translate-x-1/2 -translate-y-[calc(100%+8px)] rounded-md bg-foreground px-3 py-2 text-xs text-background shadow-md motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95"
        style={{
          left: hover.clientX,
          top: hover.clientY,
        }}
      >
        <p className="font-semibold leading-tight">{hoveredLabel}</p>
        <p className="mt-1 flex items-center gap-1.5 tabular-nums">
          <span
            className="size-2 shrink-0 rounded-sm"
            style={{ backgroundColor: hoveredColor }}
            aria-hidden
          />
          <span>
            {hoveredSideName} : {fmtTip(hoveredValue)}
          </span>
        </p>
      </div>
    ) : null;

  return (
    <div className={cn('relative h-full w-full', className)}>
      {tooltipNode && portalReady
        ? createPortal(tooltipNode, portalContainer ?? document.body)
        : null}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${w} ${h}`}
        className="h-full w-full"
        role="img"
        aria-label="Histogramme comparé"
      >
      <rect x={padL} y={6} width={8} height={8} rx={1.5} fill={leftColor} />
      <text x={padL + 12} y={14} className="fill-muted-foreground text-[10px]">
        {leftName}
      </text>
      <rect x={padL + 88} y={6} width={8} height={8} rx={1.5} fill={rightColor} />
      <text x={padL + 100} y={14} className="fill-muted-foreground text-[10px]">
        {rightName}
      </text>
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const y = padT + innerH * (1 - t);
        return (
          <g key={t}>
            <line
              x1={padL}
              y1={y}
              x2={w - padR}
              y2={y}
              stroke={GRID}
              strokeDasharray="4 4"
              strokeOpacity={0.85}
            />
            <text x={4} y={y + 4} className="fill-muted-foreground text-[9px]">
              {formatY(maxV * t)}
            </text>
          </g>
        );
      })}
      {rows.map((row, i) => {
        const gx = padL + i * groupW + gap / 2;
        const hL = (Math.abs(row.left) / maxV) * innerH;
        const hR = (Math.abs(row.right) / maxV) * innerH;
        const y0 = padT + innerH;
        const xL = gx;
        const xR = gx + barW + gap * 0.35;
        const hitHL = Math.max(hL, MIN_BAR_HIT_PX);
        const hitHR = Math.max(hR, MIN_BAR_HIT_PX);
        const opacity =
          selectedRowIndex == null || selectedRowIndex === i ? 1 : 0.72;
        const interactive = onRowClick != null;
        return (
          <g
            key={`${i}-${row.label}`}
            opacity={opacity}
            className={interactive ? 'cursor-pointer' : undefined}
            role={interactive ? 'button' : undefined}
            tabIndex={interactive ? 0 : undefined}
            aria-label={
              interactive
                ? `${row.title ?? row.label} — ${leftName} ${fmtTip(row.left)}, ${rightName} ${fmtTip(row.right)}`
                : undefined
            }
            onClick={interactive ? () => onRowClick(i) : undefined}
            onKeyDown={
              interactive
                ? (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onRowClick(i);
                    }
                  }
                : undefined
            }
          >
            <rect
              className="chart-svg-bar"
              x={xL}
              y={y0 - hL}
              width={barW}
              height={Math.max(hL, 0)}
              rx={3}
              fill={leftColor}
              pointerEvents="none"
            >
              <title>
                {row.title ?? row.label} — {leftName}: {fmtTip(row.left)}
              </title>
            </rect>
            <rect
              className="chart-svg-bar"
              x={xR}
              y={y0 - hR}
              width={barW}
              height={Math.max(hR, 0)}
              rx={3}
              fill={rightColor}
              pointerEvents="none"
            >
              <title>
                {row.title ?? row.label} — {rightName}: {fmtTip(row.right)}
              </title>
            </rect>
            {showTooltips ? (
              <>
                <rect
                  x={xL}
                  y={y0 - hitHL}
                  width={barW}
                  height={hitHL}
                  fill="transparent"
                  className={cn(interactive && 'cursor-pointer')}
                  onMouseEnter={(event) => setBarHover(i, 'left', event)}
                  onMouseLeave={clearBarHover}
                />
                <rect
                  x={xR}
                  y={y0 - hitHR}
                  width={barW}
                  height={hitHR}
                  fill="transparent"
                  className={cn(interactive && 'cursor-pointer')}
                  onMouseEnter={(event) => setBarHover(i, 'right', event)}
                  onMouseLeave={clearBarHover}
                />
              </>
            ) : null}
            {showBarValueLabels && row.left > 0 ? (
              <text
                x={xL + barW / 2}
                y={Math.max(padT + 2, y0 - hL - 4)}
                textAnchor="middle"
                className="fill-muted-foreground text-[8px] font-medium tabular-nums"
              >
                {formatY(row.left)}
              </text>
            ) : null}
            {showBarValueLabels && row.right > 0 ? (
              <text
                x={xR + barW / 2}
                y={Math.max(padT + 2, y0 - hR - 4)}
                textAnchor="middle"
                className="fill-foreground text-[8px] font-semibold tabular-nums"
              >
                {formatY(row.right)}
              </text>
            ) : null}
            <text
              x={gx + groupW / 2 - gap}
              y={h - 8}
              textAnchor="middle"
              className="fill-foreground text-[10px] font-medium"
            >
              {row.label}
            </text>
          </g>
        );
      })}
      </svg>
    </div>
  );
}

export type LinePoint = { x: number; label: string; a: number; b: number };

export function SvgDualLineChart({
  points,
  colorA,
  colorB,
  nameA,
  nameB,
  formatY,
  className,
  animateKey = '',
}: {
  points: LinePoint[];
  colorA: string;
  colorB: string;
  nameA: string;
  nameB: string;
  formatY: (n: number) => string;
  className?: string;
  animateKey?: string;
}) {
  const w = 400;
  const h = 220;
  const padL = 52;
  const padR = 12;
  const padT = 20;
  const padB = 28;
  const iw = w - padL - padR;
  const ih = h - padT - padB;
  const maxY = Math.max(1, ...points.flatMap((p) => [p.a, p.b]));
  const n = points.length;
  const step = n <= 1 ? iw / 2 : iw / (n - 1);

  const xa = (i: number) => padL + i * step;
  const ya = (v: number) => padT + ih - (v / maxY) * ih;

  const pathA = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xa(i)} ${ya(p.a)}`).join(' ');
  const pathB = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xa(i)} ${ya(p.b)}`).join(' ');
  const pathSig = `${pathA}|${pathB}`;

  const svgRef = useRef<SVGSVGElement>(null);
  useLinePathsDraw(svgRef, pathSig, animateKey);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${w} ${h}`}
      className={className}
      role="img"
      aria-label="Courbes comparées"
    >
      <text x={padL} y={14} className="fill-muted-foreground text-[10px]">
        — {nameA}
      </text>
      <text x={padL + 120} y={14} className="fill-muted-foreground text-[10px]">
        — {nameB}
      </text>
      {[0, 0.5, 1].map((t) => {
        const y = padT + ih * (1 - t);
        return (
          <g key={t}>
            <line x1={padL} y1={y} x2={w - padR} y2={y} stroke={GRID} strokeDasharray="4 4" />
            <text x={4} y={y + 3} className="fill-muted-foreground text-[9px]">
              {formatY(maxY * t)}
            </text>
          </g>
        );
      })}
      <path
        className="chart-svg-path-draw"
        d={pathA}
        fill="none"
        stroke={colorA}
        strokeWidth={2.2}
        strokeLinejoin="round"
      />
      <path
        className="chart-svg-path-draw"
        d={pathB}
        fill="none"
        stroke={colorB}
        strokeWidth={2.2}
        strokeLinejoin="round"
      />
      {points.map((p, i) => (
        <g key={i}>
          <circle className="chart-svg-dot" cx={xa(i)} cy={ya(p.a)} r={3} fill={colorA}>
            <title>
              #{p.x} {p.label} — {nameA}: {formatY(p.a)}
            </title>
          </circle>
          <circle className="chart-svg-dot" cx={xa(i)} cy={ya(p.b)} r={3} fill={colorB}>
            <title>
              #{p.x} {p.label} — {nameB}: {formatY(p.b)}
            </title>
          </circle>
        </g>
      ))}
      <text
        x={w / 2}
        y={h - 6}
        textAnchor="middle"
        className="fill-muted-foreground text-[10px]"
      >
        Rang (volume décroissant)
      </text>
    </svg>
  );
}

export type HBarRow = { name: string; value: number };

export function SvgHorizontalDiffBars({
  rows,
  formatX,
  posColor,
  negColor,
  className,
  animateKey = '',
}: {
  rows: HBarRow[];
  formatX: (n: number) => string;
  posColor: string;
  negColor: string;
  className?: string;
  animateKey?: string;
}) {
  const w = 400;
  const rowH = 26;
  const padL = 108;
  const padR = 8;
  const padT = 8;
  const h = padT + rows.length * rowH + 8;
  const mid = padL + (w - padL - padR) / 2;
  const half = (w - padL - padR) / 2 - 4;
  const maxAbs = Math.max(1, ...rows.map((r) => Math.abs(r.value)));
  const barSig = rows.map((r) => `${r.name}:${r.value}`).join('|');

  const svgRef = useRef<SVGSVGElement>(null);
  useBarsGrow(svgRef, barSig, animateKey, 'horizontal');

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${w} ${h}`}
      className={className}
      role="img"
      aria-label="Écarts par ligne"
    >
      <line
        x1={mid}
        y1={padT}
        x2={mid}
        y2={h - 8}
        stroke={GRID}
        strokeDasharray="3 3"
      />
      {rows.map((row, i) => {
        const y = padT + i * rowH + 4;
        const bw = (Math.abs(row.value) / maxAbs) * half;
        const pos = row.value >= 0;
        const x = pos ? mid : mid - bw;
        return (
          <g key={row.name}>
            <text
              x={padL - 6}
              y={y + 14}
              textAnchor="end"
              className="fill-foreground text-[10px] leading-tight"
            >
              {row.name}
            </text>
            <rect
              className="chart-svg-bar"
              x={x}
              y={y}
              width={Math.max(bw, 1)}
              height={18}
              rx={3}
              fill={pos ? posColor : negColor}
              {...(!pos ? { 'data-chart-grow-from-right': '1' } : {})}
            >
              <title>
                {row.name}: {formatX(row.value)} (droite − gauche)
              </title>
            </rect>
          </g>
        );
      })}
    </svg>
  );
}

export function SvgTotalsBarChart({
  labels,
  values,
  colors,
  formatY,
  className,
}: {
  labels: string[];
  values: number[];
  colors: string[];
  formatY: (n: number) => string;
  className?: string;
}) {
  const w = 400;
  const h = 240;
  const padL = 48;
  const padR = 8;
  const padT = 12;
  const padB = 64;
  const iw = w - padL - padR;
  const ih = h - padT - padB;
  const maxV = Math.max(1, ...values.map(Math.abs));
  const n = labels.length;
  const bw = (iw / n) * 0.55;
  const gap = (iw / n) * 0.45;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={className} role="img" aria-label="Totaux par colonne">
      {[0, 0.5, 1].map((t) => {
        const y = padT + ih * (1 - t);
        return (
          <g key={t}>
            <line x1={padL} y1={y} x2={w - padR} y2={y} stroke={GRID} strokeDasharray="4 4" />
            <text x={2} y={y + 3} className="fill-muted-foreground text-[9px]">
              {formatY(maxV * t)}
            </text>
          </g>
        );
      })}
      {labels.map((lbl, i) => {
        const x = padL + i * (bw + gap) + gap / 2;
        const vh = (Math.abs(values[i] ?? 0) / maxV) * ih;
        const y0 = padT + ih;
        return (
          <g key={lbl}>
            <rect
              className="chart-svg-bar"
              x={x}
              y={y0 - vh}
              width={bw}
              height={vh}
              rx={4}
              fill={colors[i % colors.length]}
            >
              <title>
                {lbl}: {formatY(values[i] ?? 0)}
              </title>
            </rect>
            <text
              x={x + bw / 2}
              y={h - 36}
              textAnchor="middle"
              className="fill-foreground text-[9px] font-medium"
              transform={`rotate(-24 ${x + bw / 2} ${h - 36})`}
            >
              {lbl.length > 18 ? `${lbl.slice(0, 17)}…` : lbl}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export type MultiLineSeries = { key: string; name: string; color: string; values: number[] };

export function SvgMultiLineChart({
  series,
  formatY,
  className,
  animateKey = '',
}: {
  series: MultiLineSeries[];
  formatY: (n: number) => string;
  className?: string;
  animateKey?: string;
}) {
  const w = 400;
  const h = 260;
  const padL = 48;
  const padR = 8;
  const padT = 28;
  const padB = 28;
  const iw = w - padL - padR;
  const ih = h - padT - padB;
  const len = series[0]?.values.length ?? 0;
  const maxY =
    len < 1 ? 1 : Math.max(1, ...series.flatMap((s) => s.values));
  const step = len < 1 ? iw / 2 : len <= 1 ? iw / 2 : iw / (len - 1);
  const xa = (i: number) => padL + i * step;
  const ya = (v: number) => padT + ih - (v / maxY) * ih;

  const pathSig =
    len < 1
      ? ''
      : series
          .map((s) => s.values.map((v, i) => `${xa(i)},${ya(v)}`).join(';'))
          .join('|');

  const svgRef = useRef<SVGSVGElement>(null);
  useLinePathsDraw(svgRef, pathSig, animateKey);

  if (len < 1) return null;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${w} ${h}`}
      className={className}
      role="img"
      aria-label="Courbes multiples"
    >
      <g transform={`translate(${padL}, 12)`}>
        {series.map((s, i) => (
          <text key={s.key} x={i * 92} y={0} fill={s.color} className="text-[9px]">
            — {s.name.length > 14 ? `${s.name.slice(0, 13)}…` : s.name}
          </text>
        ))}
      </g>
      {[0, 0.5, 1].map((t) => {
        const y = padT + ih * (1 - t);
        return (
          <g key={t}>
            <line x1={padL} y1={y} x2={w - padR} y2={y} stroke={GRID} strokeDasharray="4 4" />
            <text x={2} y={y + 3} className="fill-muted-foreground text-[9px]">
              {formatY(maxY * t)}
            </text>
          </g>
        );
      })}
      {series.map((s) => {
        const path = s.values
          .map((v, i) => `${i === 0 ? 'M' : 'L'} ${xa(i)} ${ya(v)}`)
          .join(' ');
        return (
          <path
            key={s.key}
            className="chart-svg-path-draw"
            d={path}
            fill="none"
            stroke={s.color}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        );
      })}
      {series.map((s) =>
        s.values.map((v, i) => (
          <circle
            key={`${s.key}-${i}`}
            className="chart-svg-dot"
            cx={xa(i)}
            cy={ya(v)}
            r={2.5}
            fill={s.color}
          >
            <title>
              {s.name} — rang {i + 1}: {formatY(v)}
            </title>
          </circle>
        )),
      )}
      <text x={w / 2} y={h - 6} textAnchor="middle" className="fill-muted-foreground text-[10px]">
        Rang (volume décroissant)
      </text>
    </svg>
  );
}
