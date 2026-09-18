'use client';

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Lock,
  LockOpen,
  Minus,
  Pencil,
  Plus,
  Scan,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { displayLabel } from '@/lib/display-label';
import type { DiagEdge, DiagNode } from './procedure-diagram-editor';

const KINDS: Record<DiagNode['k'], { w: number; h: number }> = {
  start: { w: 120, h: 44 },
  step: { w: 150, h: 56 },
  dec: { w: 150, h: 80 },
  doc: { w: 140, h: 56 },
  actor: { w: 130, h: 50 },
  end: { w: 120, h: 44 },
};

const PAD = 40;
const MIN_ZOOM = 0.35;
const MAX_ZOOM = 2.5;

function meta(k: DiagNode['k']) {
  return KINDS[k] ?? KINDS.step;
}

function centerOf(n: DiagNode) {
  const m = meta(n.k);
  return { x: n.x + m.w / 2, y: n.y + m.h / 2, w: m.w, h: m.h };
}

function borderAnchor(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number },
) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (!dx && !dy) return { x: a.x, y: a.y };
  const sx = a.w / 2 / Math.abs(dx || 1e-6);
  const sy = a.h / 2 / Math.abs(dy || 1e-6);
  const s = Math.min(sx, sy);
  return { x: a.x + dx * s, y: a.y + dy * s };
}

function edgePath(from: DiagNode, to: DiagNode) {
  const a = centerOf(from);
  const b = centerOf(to);
  const p = borderAnchor(a, b);
  const q = borderAnchor(b, a);
  const horiz = Math.abs(b.x - a.x) > Math.abs(b.y - a.y);
  const d = horiz
    ? `M${p.x} ${p.y} C${(p.x + q.x) / 2} ${p.y}, ${(p.x + q.x) / 2} ${q.y}, ${q.x} ${q.y}`
    : `M${p.x} ${p.y} C${p.x} ${(p.y + q.y) / 2}, ${q.x} ${(p.y + q.y) / 2}, ${q.x} ${q.y}`;
  return { d, mx: (p.x + q.x) / 2, my: (p.y + q.y) / 2 };
}

function wrapLabel(text: string, maxChars: number): string[] {
  const words = (text || '').split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length > maxChars && cur) {
      out.push(cur);
      cur = w;
    } else {
      cur = next;
    }
  }
  if (cur) out.push(cur);
  return out.length ? out : [''];
}

function contentBounds(nodes: DiagNode[]) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of nodes) {
    const m = meta(n.k);
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + m.w);
    maxY = Math.max(maxY, n.y + m.h);
  }
  if (!Number.isFinite(minX)) {
    return { minX: 0, minY: 0, w: 320, h: 200 };
  }
  return {
    minX,
    minY,
    w: Math.max(maxX - minX, 80),
    h: Math.max(maxY - minY, 80),
  };
}

function PreviewShape({ n }: { n: DiagNode }) {
  const m = meta(n.k);
  if (n.k === 'start') {
    return (
      <rect
        width={m.w}
        height={m.h}
        rx={m.h / 2}
        fill="var(--brand-ink)"
        stroke="var(--brand-ink)"
        strokeWidth={1.75}
      />
    );
  }
  if (n.k === 'end') {
    return (
      <g>
        <rect
          width={m.w}
          height={m.h}
          rx={m.h / 2}
          fill="var(--brand-ink)"
          stroke="var(--brand-ink)"
          strokeWidth={1.75}
        />
        <rect
          x={8}
          y={8}
          width={m.w - 16}
          height={m.h - 16}
          rx={(m.h - 16) / 2}
          fill="none"
          stroke="var(--brand-gold)"
          strokeWidth={1.5}
        />
      </g>
    );
  }
  if (n.k === 'dec') {
    return (
      <polygon
        points={`${m.w / 2},0 ${m.w},${m.h / 2} ${m.w / 2},${m.h} 0,${m.h / 2}`}
        fill="var(--brand-gold-050)"
        stroke="var(--brand-gold-600)"
        strokeWidth={1.75}
      />
    );
  }
  if (n.k === 'doc') {
    const w = m.w;
    const h = m.h;
    return (
      <path
        d={`M0 0h${w}v${h - 10}q${-w / 4} 10 ${-w / 2} 0t${-w / 2} 0z`}
        fill="var(--neutral-50, #FAF9F7)"
        stroke="var(--brand-ink)"
        strokeWidth={1.75}
      />
    );
  }
  if (n.k === 'actor') {
    return (
      <g>
        <rect
          width={m.w}
          height={m.h}
          rx={6}
          fill="#E6F0FB"
          stroke="#1F4E8C"
          strokeWidth={1.75}
        />
        <circle
          cx={18}
          cy={m.h / 2 - 4}
          r={5}
          fill="none"
          stroke="#1F4E8C"
          strokeWidth={1.5}
        />
        <path
          d={`M10 ${m.h / 2 + 12}a8 8 0 0 1 16 0`}
          fill="none"
          stroke="#1F4E8C"
          strokeWidth={1.5}
        />
      </g>
    );
  }
  return (
    <rect
      width={m.w}
      height={m.h}
      rx={8}
      fill="white"
      stroke="var(--brand-ink)"
      strokeWidth={1.75}
    />
  );
}

type ViewBox = { x: number; y: number; w: number; h: number };

function fitViewBox(
  bounds: { minX: number; minY: number; w: number; h: number },
  viewportRatio: number,
): ViewBox {
  const contentW = bounds.w + PAD * 2;
  const contentH = bounds.h + PAD * 2;
  let w = contentW;
  let h = contentH;
  if (w / h > viewportRatio) {
    h = w / viewportRatio;
  } else {
    w = h * viewportRatio;
  }
  const cx = bounds.minX + bounds.w / 2;
  const cy = bounds.minY + bounds.h / 2;
  return { x: cx - w / 2, y: cy - h / 2, w, h };
}

export function ProcedureDiagramPreview({
  title,
  nodes,
  edges,
  editable,
  onEdit,
}: {
  title: string;
  nodes: DiagNode[];
  edges: DiagEdge[];
  editable: boolean;
  onEdit?: () => void;
}) {
  const markerId = useId().replace(/:/g, '');
  const wrapRef = useRef<HTMLDivElement>(null);
  const [locked, setLocked] = useState(true);
  const [view, setView] = useState<ViewBox | null>(null);
  const [ratio, setRatio] = useState(16 / 9);
  const panRef = useRef<{
    x: number;
    y: number;
    vx: number;
    vy: number;
  } | null>(null);
  const [panning, setPanning] = useState(false);

  const bounds = useMemo(() => contentBounds(nodes), [nodes]);
  const nodesKey = useMemo(
    () => nodes.map((n) => `${n.id}:${n.x}:${n.y}:${n.k}`).join('|'),
    [nodes],
  );

  const resetView = useCallback(() => {
    setView(fitViewBox(bounds, ratio));
  }, [bounds, ratio]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const sync = () => {
      const r = el.clientWidth / Math.max(el.clientHeight, 1);
      setRatio(r);
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    setView(fitViewBox(bounds, ratio));
  }, [nodesKey, bounds, ratio]);

  const zoomAt = useCallback(
    (factor: number, cx?: number, cy?: number) => {
      setView((prev) => {
        if (!prev) return prev;
        const fitted = fitViewBox(bounds, ratio);
        const curScale = fitted.w / prev.w;
        const nextScale = Math.min(
          MAX_ZOOM,
          Math.max(MIN_ZOOM, curScale * factor),
        );
        const w = fitted.w / nextScale;
        const h = fitted.h / nextScale;
        const pivotX = cx ?? prev.x + prev.w / 2;
        const pivotY = cy ?? prev.y + prev.h / 2;
        const rx = (pivotX - prev.x) / prev.w;
        const ry = (pivotY - prev.y) / prev.h;
        return {
          x: pivotX - w * rx,
          y: pivotY - h * ry,
          w,
          h,
        };
      });
    },
    [bounds, ratio],
  );

  useEffect(() => {
    if (locked) return;
    const onMove = (e: MouseEvent) => {
      const start = panRef.current;
      const el = wrapRef.current;
      if (!start || !el) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      setView((prev) => {
        if (!prev) return prev;
        const sx = prev.w / el.clientWidth;
        const sy = prev.h / el.clientHeight;
        return {
          ...prev,
          x: start.vx - dx * sx,
          y: start.vy - dy * sy,
        };
      });
    };
    const onUp = () => {
      panRef.current = null;
      setPanning(false);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [locked]);

  useEffect(() => {
    if (locked) return;
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      setView((prev) => {
        if (!prev) return prev;
        const fitted = fitViewBox(bounds, ratio);
        const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
        const curScale = fitted.w / prev.w;
        const nextScale = Math.min(
          MAX_ZOOM,
          Math.max(MIN_ZOOM, curScale * factor),
        );
        const w = fitted.w / nextScale;
        const h = fitted.h / nextScale;
        const pivotX = prev.x + prev.w * px;
        const pivotY = prev.y + prev.h * py;
        return {
          x: pivotX - w * px,
          y: pivotY - h * py,
          w,
          h,
        };
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [locked, bounds, ratio]);

  if (nodes.length === 0) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-2.5 rounded-[var(--radius-md)] border border-border/70 bg-[var(--neutral-50)] px-4 text-center text-[13px] text-muted-foreground">
        <p className="font-bold text-foreground">Schéma vide</p>
        {editable && onEdit ? (
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            onClick={onEdit}
          >
            Ouvrir l&apos;éditeur de schéma
          </Button>
        ) : null}
      </div>
    );
  }

  const vb = view ?? fitViewBox(bounds, ratio);
  const fitted = fitViewBox(bounds, ratio);
  const zoomPct = Math.round((fitted.w / vb.w) * 100);

  return (
    <div
      ref={wrapRef}
      className={cn(
        'group/diag relative overflow-hidden rounded-[var(--radius-md)] border border-border/70 bg-[var(--neutral-50)]',
        !locked && (panning ? 'cursor-grabbing' : 'cursor-grab'),
        locked && 'cursor-default',
      )}
      style={{ minHeight: 280 }}
      onMouseDown={(e) => {
        if (locked || e.button !== 0) return;
        if ((e.target as Element).closest('button')) return;
        e.preventDefault();
        panRef.current = {
          x: e.clientX,
          y: e.clientY,
          vx: vb.x,
          vy: vb.y,
        };
        setPanning(true);
      }}
    >
      <svg
        viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
        className="block h-[min(52vw,360px)] w-full max-h-[420px] min-h-[280px]"
        role="img"
        aria-label={displayLabel(title, 'Schéma de la procédure')}
      >
        <defs>
          <marker
            id={markerId}
            viewBox="0 0 10 10"
            refX={9}
            refY={5}
            markerWidth={8}
            markerHeight={8}
            orient="auto-start-reverse"
          >
            <path d="M0 0L10 5L0 10z" fill="var(--neutral-600, #5F5A52)" />
          </marker>
        </defs>
        {edges.map((ed, i) => {
          const a = nodes.find((n) => n.id === ed.from);
          const b = nodes.find((n) => n.id === ed.to);
          if (!a || !b) return null;
          const path = edgePath(a, b);
          return (
            <g key={`${ed.from}-${ed.to}-${i}`}>
              <path
                d={path.d}
                fill="none"
                stroke="var(--neutral-600, #5F5A52)"
                strokeWidth={1.75}
                markerEnd={`url(#${markerId})`}
              />
              {ed.label ? (
                <text
                  x={path.mx}
                  y={path.my - 8}
                  textAnchor="middle"
                  className="text-[11px] font-bold"
                  fill="var(--neutral-600, #5F5A52)"
                  style={{
                    paintOrder: 'stroke',
                    stroke: 'white',
                    strokeWidth: 4,
                  }}
                >
                  {ed.label}
                </text>
              ) : null}
            </g>
          );
        })}
        {nodes.map((n) => {
          const m = meta(n.k);
          const lines = wrapLabel(
            n.label,
            Math.max(8, Math.floor((m.w - 24) / 7)),
          );
          const textX = n.k === 'actor' ? m.w / 2 + 12 : m.w / 2;
          const textY = m.h / 2 - (lines.length - 1) * 7.5;
          const fillText =
            n.k === 'start' || n.k === 'end'
              ? 'var(--brand-gold)'
              : 'var(--brand-ink)';
          return (
            <g key={n.id} transform={`translate(${n.x},${n.y})`}>
              <PreviewShape n={n} />
              <text
                x={textX}
                y={textY}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-[12.5px] font-bold"
                fill={fillText}
              >
                {lines.map((line, li) => (
                  <tspan key={li} x={textX} dy={li === 0 ? 0 : 15}>
                    {line}
                  </tspan>
                ))}
              </text>
              {n.desc ? <title>{n.desc}</title> : null}
            </g>
          );
        })}
      </svg>

      <div className="absolute bottom-2.5 left-2.5 z-[1] flex items-center gap-0.5 rounded-[10px] border border-border/70 bg-card/95 p-0.5 shadow-[var(--shadow-1)] backdrop-blur-sm">
        <button
          type="button"
          className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
          aria-label="Zoom arrière"
          disabled={locked || zoomPct <= MIN_ZOOM * 100}
          onClick={() => zoomAt(1 / 1.2)}
        >
          <Minus className="size-3.5" aria-hidden />
        </button>
        <span className="min-w-10 px-1 text-center text-[11px] font-bold tabular-nums text-muted-foreground">
          {zoomPct}%
        </span>
        <button
          type="button"
          className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
          aria-label="Zoom avant"
          disabled={locked || zoomPct >= MAX_ZOOM * 100}
          onClick={() => zoomAt(1.2)}
        >
          <Plus className="size-3.5" aria-hidden />
        </button>
        <button
          type="button"
          className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
          aria-label="Recentrer"
          disabled={locked}
          onClick={resetView}
        >
          <Scan className="size-3.5" aria-hidden />
        </button>
        <button
          type="button"
          className={cn(
            'inline-flex size-9 items-center justify-center rounded-lg hover:bg-muted',
            locked
              ? 'text-[var(--brand-gold-700)]'
              : 'text-muted-foreground hover:text-foreground',
          )}
          aria-label={locked ? 'Déverrouiller le dessin' : 'Verrouiller le dessin'}
          aria-pressed={locked}
          onClick={() => setLocked((v) => !v)}
        >
          {locked ? (
            <Lock className="size-3.5" aria-hidden />
          ) : (
            <LockOpen className="size-3.5" aria-hidden />
          )}
        </button>
      </div>

      {editable && onEdit ? (
        <div className="absolute right-2.5 top-2.5 z-[1] opacity-0 transition-opacity duration-[var(--duration-fast)] group-hover/diag:opacity-100 group-focus-within/diag:opacity-100">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-11 bg-card shadow-[var(--shadow-1)] sm:min-h-9"
            onClick={onEdit}
          >
            <Pencil className="size-3.5" aria-hidden />
            Modifier le schéma
          </Button>
        </div>
      ) : null}

      <p className="sr-only" aria-live="polite">
        {locked
          ? 'Schéma verrouillé. Déverrouillez pour zoomer et déplacer.'
          : 'Schéma déverrouillé. Glissez pour déplacer, molette pour zoomer.'}
      </p>
    </div>
  );
}
