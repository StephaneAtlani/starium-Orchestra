'use client';

import { useCallback, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { displayLabel } from '@/lib/display-label';

export type DiagNode = {
  id: string;
  k: 'start' | 'step' | 'dec' | 'doc' | 'actor' | 'end';
  x: number;
  y: number;
  label: string;
  desc?: string;
};

export type DiagEdge = { from: string; to: string; label?: string };

const KINDS: { k: DiagNode['k']; label: string; w: number; h: number }[] = [
  { k: 'start', label: 'Début', w: 120, h: 44 },
  { k: 'step', label: 'Étape', w: 150, h: 56 },
  { k: 'dec', label: 'Décision', w: 150, h: 80 },
  { k: 'doc', label: 'Document', w: 140, h: 56 },
  { k: 'actor', label: 'Acteur', w: 130, h: 50 },
  { k: 'end', label: 'Fin', w: 120, h: 44 },
];

function uid() {
  return `n${Math.random().toString(36).slice(2, 9)}`;
}

function kindMeta(k: DiagNode['k']) {
  return KINDS.find((x) => x.k === k) ?? KINDS[1]!;
}

export function ProcedureDiagramEditor({
  open,
  title: initialTitle,
  nodes: initialNodes,
  edges: initialEdges,
  onClose,
  onCommit,
}: {
  open: boolean;
  title: string;
  nodes: DiagNode[];
  edges: DiagEdge[];
  onClose: () => void;
  onCommit: (data: {
    title: string;
    nodes: DiagNode[];
    edges: DiagEdge[];
  }) => void;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [nodes, setNodes] = useState<DiagNode[]>(initialNodes);
  const [edges, setEdges] = useState<DiagEdge[]>(initialEdges);
  const [tool, setTool] = useState<'select' | 'link'>('select');
  const [sel, setSel] = useState<string | null>(null);
  const [selEdge, setSelEdge] = useState<number | null>(null);
  const [linkFrom, setLinkFrom] = useState<string | null>(null);
  const [drag, setDrag] = useState<{
    id: string;
    ox: number;
    oy: number;
  } | null>(null);

  const selected = nodes.find((n) => n.id === sel) ?? null;

  const addKind = (k: DiagNode['k']) => {
    const offset = nodes.length * 16;
    setNodes((prev) => [
      ...prev,
      {
        id: uid(),
        k,
        x: 80 + offset,
        y: 80 + offset,
        label: kindMeta(k).label,
      },
    ]);
  };

  const onCanvasMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!drag) return;
      const svg = e.currentTarget;
      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const ctm = svg.getScreenCTM();
      if (!ctm) return;
      const p = pt.matrixTransform(ctm.inverse());
      const x = Math.max(0, Math.round((p.x - drag.ox) / 10) * 10);
      const y = Math.max(0, Math.round((p.y - drag.oy) / 10) * 10);
      setNodes((prev) =>
        prev.map((n) => (n.id === drag.id ? { ...n, x, y } : n)),
      );
    },
    [drag],
  );

  const bbox = useMemo(() => {
    if (nodes.length === 0) return { w: 800, h: 480 };
    let maxX = 400;
    let maxY = 300;
    for (const n of nodes) {
      const m = kindMeta(n.k);
      maxX = Math.max(maxX, n.x + m.w + 60);
      maxY = Math.max(maxY, n.y + m.h + 60);
    }
    return { w: maxX, h: maxY };
  }, [nodes]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-[var(--neutral-50,#FAF9F7)]"
      role="dialog"
      aria-modal="true"
      aria-label="Éditeur de schéma"
    >
      <header className="flex h-[58px] shrink-0 items-center gap-3 border-b border-border bg-card px-4">
        <Button type="button" variant="outline" size="sm" onClick={onClose}>
          Retour
        </Button>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titre du schéma"
          className="max-w-md border-0 text-[15px] font-extrabold shadow-none focus-visible:ring-0"
          aria-label="Titre du schéma"
        />
        <div
          className="ml-2 inline-flex rounded-[var(--radius-pill)] border border-border p-0.5"
          role="group"
          aria-label="Outil"
        >
          <button
            type="button"
            className={cn(
              'min-h-9 rounded-[var(--radius-pill)] px-3 text-xs font-bold',
              tool === 'select' && 'bg-[var(--brand-ink)] text-white',
            )}
            aria-pressed={tool === 'select'}
            onClick={() => {
              setTool('select');
              setLinkFrom(null);
            }}
          >
            Sélection (V)
          </button>
          <button
            type="button"
            className={cn(
              'min-h-9 rounded-[var(--radius-pill)] px-3 text-xs font-bold',
              tool === 'link' && 'bg-[var(--brand-ink)] text-white',
            )}
            aria-pressed={tool === 'link'}
            onClick={() => setTool('link')}
          >
            Relier (C)
          </button>
        </div>
        <div className="ml-auto flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled
            title="Bientôt disponible"
          >
            Exporter
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => onCommit({ title, nodes, edges })}
          >
            Insérer dans la procédure
          </Button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)_260px]">
        <aside className="hidden overflow-auto border-r border-border p-3 lg:block">
          <p className="text-[11px] font-extrabold uppercase text-muted-foreground">
            Formes
          </p>
          <ul className="mt-2 flex flex-col gap-1">
            {KINDS.map((k) => (
              <li key={k.k}>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-[var(--radius-md)] border border-transparent px-2 py-2 text-left text-[13px] font-semibold hover:border-border hover:bg-muted/50"
                  onClick={() => addKind(k.k)}
                >
                  {k.label}
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[11px] text-muted-foreground">
            C · Relier · V · Sélection · Suppr · Échap
          </p>
        </aside>

        <div className="min-h-0 overflow-auto bg-card">
          <svg
            width={bbox.w}
            height={bbox.h}
            className="min-h-full min-w-full cursor-default"
            style={{
              backgroundImage:
                'radial-gradient(circle, var(--neutral-300, #D6D2CA) 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }}
            onMouseMove={onCanvasMouseMove}
            onMouseUp={() => setDrag(null)}
            onMouseLeave={() => setDrag(null)}
            onClick={() => {
              if (tool === 'link') setLinkFrom(null);
              else {
                setSel(null);
                setSelEdge(null);
              }
            }}
          >
            <defs>
              <marker
                id="pr-arrow"
                markerWidth="8"
                markerHeight="8"
                refX="6"
                refY="3"
                orient="auto"
              >
                <path d="M0,0 L6,3 L0,6 Z" fill="var(--neutral-600, #5F5A52)" />
              </marker>
            </defs>
            {edges.map((e, i) => {
              const a = nodes.find((n) => n.id === e.from);
              const b = nodes.find((n) => n.id === e.to);
              if (!a || !b) return null;
              const am = kindMeta(a.k);
              const bm = kindMeta(b.k);
              const x1 = a.x + am.w / 2;
              const y1 = a.y + am.h / 2;
              const x2 = b.x + bm.w / 2;
              const y2 = b.y + bm.h / 2;
              return (
                <g key={`${e.from}-${e.to}-${i}`}>
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={
                      selEdge === i
                        ? 'var(--brand-gold)'
                        : 'var(--neutral-600, #5F5A52)'
                    }
                    strokeWidth={selEdge === i ? 2.5 : 1.75}
                    markerEnd="url(#pr-arrow)"
                    className="cursor-pointer"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      setSelEdge(i);
                      setSel(null);
                    }}
                  />
                  {e.label ? (
                    <text
                      x={(x1 + x2) / 2}
                      y={(y1 + y2) / 2 - 8}
                      textAnchor="middle"
                      className="fill-foreground text-[11px] font-bold"
                      style={{ paintOrder: 'stroke', stroke: 'white', strokeWidth: 4 }}
                    >
                      {e.label}
                    </text>
                  ) : null}
                </g>
              );
            })}
            {nodes.map((n) => {
              const m = kindMeta(n.k);
              const active = sel === n.id || linkFrom === n.id;
              return (
                <g
                  key={n.id}
                  transform={`translate(${n.x},${n.y})`}
                  className="cursor-grab"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    if (tool === 'link') {
                      if (!linkFrom) setLinkFrom(n.id);
                      else if (linkFrom !== n.id) {
                        const exists = edges.some(
                          (ed) => ed.from === linkFrom && ed.to === n.id,
                        );
                        if (!exists) {
                          setEdges((prev) => [
                            ...prev,
                            { from: linkFrom, to: n.id },
                          ]);
                        }
                        setLinkFrom(null);
                      }
                      return;
                    }
                    setSel(n.id);
                    setSelEdge(null);
                    const svg = e.currentTarget.ownerSVGElement!;
                    const pt = svg.createSVGPoint();
                    pt.x = e.clientX;
                    pt.y = e.clientY;
                    const ctm = svg.getScreenCTM();
                    if (!ctm) return;
                    const p = pt.matrixTransform(ctm.inverse());
                    setDrag({ id: n.id, ox: p.x - n.x, oy: p.y - n.y });
                  }}
                  aria-label={displayLabel(n.label, 'Forme')}
                >
                  <rect
                    width={m.w}
                    height={m.h}
                    rx={n.k === 'start' || n.k === 'end' ? m.h / 2 : 8}
                    fill={
                      n.k === 'start' || n.k === 'end'
                        ? 'var(--brand-ink)'
                        : n.k === 'dec'
                          ? 'var(--brand-gold-050)'
                          : n.k === 'actor'
                            ? '#E6F0FB'
                            : 'white'
                    }
                    stroke={
                      active
                        ? 'var(--brand-gold)'
                        : n.k === 'dec'
                          ? 'var(--brand-gold-600)'
                          : 'var(--brand-ink)'
                    }
                    strokeWidth={active ? 2.5 : 1.75}
                  />
                  <text
                    x={m.w / 2}
                    y={m.h / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="pointer-events-none text-[12.5px] font-bold"
                    fill={
                      n.k === 'start' || n.k === 'end'
                        ? 'var(--brand-gold)'
                        : 'var(--brand-ink)'
                    }
                  >
                    {n.label.slice(0, 18)}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <aside className="hidden overflow-auto border-l border-border p-4 lg:block">
          {selected ? (
            <div className="flex flex-col gap-3">
              <p className="text-[11px] font-extrabold uppercase text-muted-foreground">
                Forme
              </p>
              <div>
                <Label htmlFor="dg-label">Libellé</Label>
                <Input
                  id="dg-label"
                  className="mt-1 min-h-11"
                  value={selected.label}
                  onChange={(e) =>
                    setNodes((prev) =>
                      prev.map((n) =>
                        n.id === selected.id
                          ? { ...n, label: e.target.value }
                          : n,
                      ),
                    )
                  }
                />
              </div>
              <div>
                <Label htmlFor="dg-desc">Description</Label>
                <Textarea
                  id="dg-desc"
                  className="mt-1"
                  value={selected.desc ?? ''}
                  onChange={(e) =>
                    setNodes((prev) =>
                      prev.map((n) =>
                        n.id === selected.id
                          ? { ...n, desc: e.target.value }
                          : n,
                      ),
                    )
                  }
                />
              </div>
              <Button
                type="button"
                variant="outline"
                className="min-h-11 text-[var(--state-danger)]"
                onClick={() => {
                  setNodes((prev) => prev.filter((n) => n.id !== selected.id));
                  setEdges((prev) =>
                    prev.filter(
                      (e) => e.from !== selected.id && e.to !== selected.id,
                    ),
                  );
                  setSel(null);
                }}
              >
                Supprimer la forme
              </Button>
            </div>
          ) : selEdge != null && edges[selEdge] ? (
            <div className="flex flex-col gap-3">
              <p className="text-[11px] font-extrabold uppercase text-muted-foreground">
                Lien
              </p>
              <div>
                <Label htmlFor="dg-elabel">Libellé du lien</Label>
                <Input
                  id="dg-elabel"
                  className="mt-1 min-h-11"
                  value={edges[selEdge]!.label ?? ''}
                  onChange={(e) =>
                    setEdges((prev) =>
                      prev.map((ed, i) =>
                        i === selEdge ? { ...ed, label: e.target.value } : ed,
                      ),
                    )
                  }
                />
              </div>
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                onClick={() =>
                  setEdges((prev) =>
                    prev.map((ed, i) =>
                      i === selEdge
                        ? { ...ed, from: ed.to, to: ed.from }
                        : ed,
                    ),
                  )
                }
              >
                Inverser la flèche
              </Button>
              <Button
                type="button"
                variant="outline"
                className="min-h-11 text-[var(--state-danger)]"
                onClick={() => {
                  setEdges((prev) => prev.filter((_, i) => i !== selEdge));
                  setSelEdge(null);
                }}
              >
                Supprimer le lien
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {nodes.length} formes · {edges.length} liens
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
