'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Link2, MousePointer2, X } from 'lucide-react';
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

const KINDS: {
  k: DiagNode['k'];
  label: string;
  w: number;
  h: number;
}[] = [
  { k: 'start', label: 'Début', w: 120, h: 44 },
  { k: 'step', label: 'Étape', w: 150, h: 56 },
  { k: 'dec', label: 'Décision', w: 150, h: 80 },
  { k: 'doc', label: 'Document', w: 140, h: 56 },
  { k: 'actor', label: 'Acteur / rôle', w: 130, h: 50 },
  { k: 'end', label: 'Fin', w: 120, h: 44 },
];

const DEMO: { nodes: DiagNode[]; edges: DiagEdge[] } = {
  nodes: [
    { id: 'n1', k: 'start', x: 40, y: 120, label: 'Demande reçue' },
    { id: 'n2', k: 'step', x: 220, y: 112, label: 'Qualification PMO' },
    { id: 'n3', k: 'dec', x: 430, y: 100, label: 'Budget > 50 k€ ?' },
    { id: 'n4', k: 'step', x: 660, y: 40, label: 'Passage COPIL' },
    { id: 'n5', k: 'step', x: 660, y: 180, label: 'Validation N+1' },
    { id: 'n6', k: 'end', x: 880, y: 112, label: 'Projet créé' },
  ],
  edges: [
    { from: 'n1', to: 'n2' },
    { from: 'n2', to: 'n3' },
    { from: 'n3', to: 'n4', label: 'Oui' },
    { from: 'n3', to: 'n5', label: 'Non' },
    { from: 'n4', to: 'n6' },
    { from: 'n5', to: 'n6' },
  ],
};

type Port = 'n' | 'e' | 's' | 'w';

function uid() {
  return `n${Math.random().toString(36).slice(2, 9)}`;
}

function kindMeta(k: DiagNode['k']) {
  return KINDS.find((x) => x.k === k) ?? KINDS[1]!;
}

function snap(v: number) {
  return Math.max(0, Math.round(v / 10) * 10);
}

function centerOf(n: DiagNode) {
  const m = kindMeta(n.k);
  return { x: n.x + m.w / 2, y: n.y + m.h / 2, w: m.w, h: m.h };
}

function portPoint(n: DiagNode, port: Port) {
  const m = kindMeta(n.k);
  switch (port) {
    case 'n':
      return { x: n.x + m.w / 2, y: n.y };
    case 'e':
      return { x: n.x + m.w, y: n.y + m.h / 2 };
    case 's':
      return { x: n.x + m.w / 2, y: n.y + m.h };
    case 'w':
      return { x: n.x, y: n.y + m.h / 2 };
  }
}

/** Point on the border of `a` in the direction of `b`. */
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

function clientToSvg(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) {
    const r = svg.getBoundingClientRect();
    return { x: clientX - r.left, y: clientY - r.top };
  }
  const p = pt.matrixTransform(ctm.inverse());
  return { x: p.x, y: p.y };
}

function NodeShape({
  n,
  active,
  hovered,
}: {
  n: DiagNode;
  active: boolean;
  hovered: boolean;
}) {
  const m = kindMeta(n.k);
  const stroke = active || hovered ? 'var(--brand-gold)' : undefined;
  const strokeW = active ? 2.5 : hovered ? 2 : 1.75;
  const dash = hovered && !active ? '4 3' : undefined;

  if (n.k === 'start') {
    return (
      <rect
        className="shape"
        width={m.w}
        height={m.h}
        rx={m.h / 2}
        fill="var(--brand-ink)"
        stroke={stroke ?? 'var(--brand-ink)'}
        strokeWidth={strokeW}
        strokeDasharray={dash}
      />
    );
  }
  if (n.k === 'end') {
    return (
      <g>
        <rect
          className="shape"
          width={m.w}
          height={m.h}
          rx={m.h / 2}
          fill="var(--brand-ink)"
          stroke={stroke ?? 'var(--brand-ink)'}
          strokeWidth={strokeW}
          strokeDasharray={dash}
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
          className="pointer-events-none"
        />
      </g>
    );
  }
  if (n.k === 'dec') {
    return (
      <polygon
        className="shape"
        points={`${m.w / 2},0 ${m.w},${m.h / 2} ${m.w / 2},${m.h} 0,${m.h / 2}`}
        fill="var(--brand-gold-050)"
        stroke={stroke ?? 'var(--brand-gold-600)'}
        strokeWidth={strokeW}
        strokeDasharray={dash}
      />
    );
  }
  if (n.k === 'doc') {
    const w = m.w;
    const h = m.h;
    return (
      <path
        className="shape"
        d={`M0 0h${w}v${h - 10}q${-w / 4} 10 ${-w / 2} 0t${-w / 2} 0z`}
        fill="var(--neutral-50, #FAF9F7)"
        stroke={stroke ?? 'var(--brand-ink)'}
        strokeWidth={strokeW}
        strokeDasharray={dash}
      />
    );
  }
  if (n.k === 'actor') {
    return (
      <g>
        <rect
          className="shape"
          width={m.w}
          height={m.h}
          rx={6}
          fill="#E6F0FB"
          stroke={stroke ?? '#1F4E8C'}
          strokeWidth={strokeW}
          strokeDasharray={dash}
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
      className="shape"
      width={m.w}
      height={m.h}
      rx={8}
      fill="white"
      stroke={stroke ?? 'var(--brand-ink)'}
      strokeWidth={strokeW}
      strokeDasharray={dash}
    />
  );
}

const PORTS: Port[] = ['n', 'e', 's', 'w'];

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
  const [hov, setHov] = useState<string | null>(null);
  const [hint, setHint] = useState(
    'Glissez une forme depuis la gauche · double-clic pour renommer',
  );
  const [wire, setWire] = useState<{
    fromId: string;
    fromPort: Port;
    x: number;
    y: number;
  } | null>(null);
  const [spawnMenu, setSpawnMenu] = useState<{
    fromId: string;
    svgX: number;
    svgY: number;
    clientX: number;
    clientY: number;
  } | null>(null);
  const dragRef = useRef<{
    id: string;
    ox: number;
    oy: number;
    ready: boolean;
    startX: number;
    startY: number;
  } | null>(null);
  const panRef = useRef<{
    x: number;
    y: number;
    sl: number;
    st: number;
    moved: boolean;
  } | null>(null);
  const spaceHeld = useRef(false);
  const [panning, setPanning] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setTitle(initialTitle);
    setNodes(initialNodes);
    setEdges(initialEdges);
    setSel(null);
    setSelEdge(null);
    setLinkFrom(null);
    setWire(null);
    setSpawnMenu(null);
    setTool('select');
    setHint('Glissez une forme depuis la gauche · double-clic pour renommer');
  }, [open, initialTitle, initialNodes, initialEdges]);

  const selected = nodes.find((n) => n.id === sel) ?? null;

  const addAt = useCallback(
    (k: DiagNode['k'], x: number, y: number, linkFromId?: string) => {
      const m = kindMeta(k);
      const node: DiagNode = {
        id: uid(),
        k,
        x: snap(x - m.w / 2),
        y: snap(y - m.h / 2),
        label: m.label,
      };
      setNodes((prev) => [...prev, node]);
      if (linkFromId) {
        setEdges((prev) => {
          if (prev.some((e) => e.from === linkFromId && e.to === node.id)) {
            return prev;
          }
          return [...prev, { from: linkFromId, to: node.id }];
        });
      }
      setSel(node.id);
      setSelEdge(null);
      setTool('select');
      setSpawnMenu(null);
      setWire(null);
      setLinkFrom(null);
      setHint(
        linkFromId
          ? 'Forme créée et reliée'
          : 'Forme ajoutée — glissez les poignées pour relier',
      );
      return node.id;
    },
    [],
  );

  const connect = useCallback((from: string, to: string) => {
    if (from === to) return;
    setEdges((prev) => {
      if (prev.some((e) => e.from === from && e.to === to)) return prev;
      return [...prev, { from, to }];
    });
    setLinkFrom(null);
    setWire(null);
    setSpawnMenu(null);
    setSelEdge(null);
    setSel(null);
    setHint('Lien créé — glissez une poignée ou utilisez Relier (C)');
  }, []);

  const deleteSel = useCallback(() => {
    if (sel) {
      setNodes((prev) => prev.filter((n) => n.id !== sel));
      setEdges((prev) =>
        prev.filter((e) => e.from !== sel && e.to !== sel),
      );
      setSel(null);
      return;
    }
    if (selEdge != null) {
      setEdges((prev) => prev.filter((_, i) => i !== selEdge));
      setSelEdge(null);
    }
  }, [sel, selEdge]);

  useEffect(() => {
    if (!open) return;
    const onMove = (e: MouseEvent) => {
      if (panRef.current) {
        const canvas = canvasRef.current;
        if (canvas) {
          const dx = e.clientX - panRef.current.x;
          const dy = e.clientY - panRef.current.y;
          if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
            panRef.current.moved = true;
          }
          canvas.scrollLeft = panRef.current.sl - dx;
          canvas.scrollTop = panRef.current.st - dy;
        }
        return;
      }
      const svg = svgRef.current;
      if (!svg) return;
      const p = clientToSvg(svg, e.clientX, e.clientY);
      if (dragRef.current) {
        const d = dragRef.current;
        if (!d.ready) {
          if (
            Math.abs(e.clientX - d.startX) > 4 ||
            Math.abs(e.clientY - d.startY) > 4
          ) {
            d.ready = true;
          } else {
            return;
          }
        }
        setNodes((prev) =>
          prev.map((n) =>
            n.id === d.id ? { ...n, x: snap(p.x - d.ox), y: snap(p.y - d.oy) } : n,
          ),
        );
      }
      if (wire) {
        setWire((w) => (w ? { ...w, x: p.x, y: p.y } : null));
      }
    };
    const onUp = (e: MouseEvent) => {
      if (panRef.current) {
        const wasClick = !panRef.current.moved;
        panRef.current = null;
        setPanning(false);
        if (wasClick && e.button === 0 && !spaceHeld.current) {
          const el = document.elementFromPoint(e.clientX, e.clientY);
          const onNode = el?.closest?.('[data-node-id]');
          const onEdge = el?.closest?.('[data-edge-hit]');
          if (!onNode && !onEdge) {
            if (tool === 'link' && linkFrom) {
              setLinkFrom(null);
              setHint('Cliquez une forme de départ, puis une forme d’arrivée');
            } else {
              setSel(null);
              setSelEdge(null);
            }
          }
        }
        return;
      }
      if (wire) {
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const g = el?.closest('[data-node-id]') as Element | null;
        const toId = g?.getAttribute('data-node-id');
        const svg = svgRef.current;
        const p = svg
          ? clientToSvg(svg, e.clientX, e.clientY)
          : { x: wire.x, y: wire.y };
        if (toId && toId !== wire.fromId) {
          connect(wire.fromId, toId);
        } else if (!toId) {
          setSpawnMenu({
            fromId: wire.fromId,
            svgX: p.x,
            svgY: p.y,
            clientX: e.clientX,
            clientY: e.clientY,
          });
          setWire(null);
          setHint('Choisissez une forme à créer');
        } else {
          setWire(null);
        }
      }
      dragRef.current = null;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [open, wire, connect, tool, linkFrom]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.code === 'Space' &&
        !(e.target as HTMLElement)?.matches?.(
          'input,textarea,select,[contenteditable]',
        )
      ) {
        e.preventDefault();
        spaceHeld.current = true;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') spaceHeld.current = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.matches('input,textarea,select,[contenteditable]')) return;
      if (e.key === 'Escape') {
        if (spawnMenu) {
          setSpawnMenu(null);
          setHint('Sélection');
          return;
        }
        if (wire || linkFrom) {
          setWire(null);
          setLinkFrom(null);
          setHint('Sélection');
          return;
        }
        onClose();
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSel();
      }
      if (e.key === 'c' || e.key === 'C') {
        setTool('link');
        setLinkFrom(null);
        setWire(null);
        setSpawnMenu(null);
        setHint('Cliquez une forme de départ, puis une forme d’arrivée');
      }
      if (e.key === 'v' || e.key === 'V') {
        setTool('select');
        setLinkFrom(null);
        setWire(null);
        setHint('Glissez le fond pour déplacer · Espace + drag · molette');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, wire, linkFrom, spawnMenu, deleteSel, onClose]);

  const startPan = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    e.preventDefault();
    panRef.current = {
      x: e.clientX,
      y: e.clientY,
      sl: canvas.scrollLeft,
      st: canvas.scrollTop,
      moved: false,
    };
    setPanning(true);
  };

  const bbox = useMemo(() => {
    const canvas = canvasRef.current;
    const viewW = canvas?.clientWidth ?? 900;
    const viewH = canvas?.clientHeight ?? 520;
    let maxX = Math.max(viewW + 400, 1200);
    let maxY = Math.max(viewH + 400, 800);
    for (const n of nodes) {
      const m = kindMeta(n.k);
      maxX = Math.max(maxX, n.x + m.w + 400);
      maxY = Math.max(maxY, n.y + m.h + 400);
    }
    return { w: maxX, h: maxY };
  }, [nodes]);

  const onPaletteDragStart = (e: React.DragEvent, k: DiagNode['k']) => {
    e.dataTransfer.setData('application/x-pr-diag-kind', k);
    e.dataTransfer.setData('text/plain', k);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const onCanvasDragOver = (e: React.DragEvent) => {
    if (
      e.dataTransfer.types.includes('application/x-pr-diag-kind') ||
      e.dataTransfer.types.includes('text/plain')
    ) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const onCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const k = (e.dataTransfer.getData('application/x-pr-diag-kind') ||
      e.dataTransfer.getData('text/plain')) as DiagNode['k'];
    if (!KINDS.some((x) => x.k === k)) return;
    const svg = svgRef.current;
    if (!svg) return;
    const p = clientToSvg(svg, e.clientX, e.clientY);
    addAt(k, p.x, p.y);
  };

  const startWire = (nodeId: string, port: Port, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const svg = svgRef.current;
    if (!svg) return;
    const p = clientToSvg(svg, e.clientX, e.clientY);
    setSel(nodeId);
    setSelEdge(null);
    setTool('select');
    setWire({ fromId: nodeId, fromPort: port, x: p.x, y: p.y });
    setHint('Glissez jusqu’à une autre forme pour créer le lien');
  };

  const onNodePointer = (n: DiagNode, e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.button === 1 || spaceHeld.current) {
      startPan(e);
      return;
    }
    if (e.button !== 0) return;
    if (tool === 'link') {
      if (!linkFrom) {
        setLinkFrom(n.id);
        setSel(n.id);
        setSelEdge(null);
        setHint('Cliquez la forme d’arrivée');
      } else {
        connect(linkFrom, n.id);
      }
      return;
    }
    if (wire) return;
    setSel(n.id);
    setSelEdge(null);
    const svg = svgRef.current;
    if (!svg) return;
    const p = clientToSvg(svg, e.clientX, e.clientY);
    dragRef.current = {
      id: n.id,
      ox: p.x - n.x,
      oy: p.y - n.y,
      ready: false,
      startX: e.clientX,
      startY: e.clientY,
    };
  };

  const onCanvasPointerDown = (e: React.MouseEvent) => {
    const t = e.target as Element;
    if (t.closest('[data-node-id]') || t.closest('[data-edge-hit]')) return;
    if (e.button === 1 || spaceHeld.current || e.button === 0) {
      if (tool === 'link' && e.button === 0 && !spaceHeld.current) {
        // clic fond en mode lien : pas de pan, désélection au mouseup via pan click
      }
      startPan(e);
    }
  };

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[700] flex flex-col bg-[var(--neutral-50)]"
      role="dialog"
      aria-modal="true"
      aria-label="Éditeur de schéma"
    >
      <header className="flex h-[58px] shrink-0 items-center gap-3 border-b border-border bg-card px-4">
        <Button type="button" variant="outline" size="sm" onClick={onClose}>
          <X className="size-4" aria-hidden />
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
          className="ml-2 inline-flex rounded-[10px] bg-muted p-[3px]"
          role="group"
          aria-label="Outil"
        >
          <button
            type="button"
            className={cn(
              'inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-[12.5px] font-bold text-muted-foreground',
              tool === 'select' &&
                'bg-card text-foreground shadow-[var(--shadow-1)]',
            )}
            aria-pressed={tool === 'select'}
            onClick={() => {
              setTool('select');
              setLinkFrom(null);
              setHint('Glissez les formes · poignées pour relier');
            }}
          >
            <MousePointer2 className="size-3.5" aria-hidden />
            Sélection <kbd className="opacity-50">V</kbd>
          </button>
          <button
            type="button"
            className={cn(
              'inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-[12.5px] font-bold text-muted-foreground',
              tool === 'link' &&
                'bg-card text-foreground shadow-[var(--shadow-1)]',
            )}
            aria-pressed={tool === 'link'}
            onClick={() => {
              setTool('link');
              setLinkFrom(null);
              setWire(null);
              setHint('Cliquez une forme de départ, puis une forme d’arrivée');
            }}
          >
            <Link2 className="size-3.5" aria-hidden />
            Relier <kbd className="opacity-50">C</kbd>
          </button>
        </div>
        <div className="ml-auto flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setNodes(structuredClone(DEMO.nodes));
              setEdges(structuredClone(DEMO.edges));
              setSel(null);
              setSelEdge(null);
              setHint('Exemple chargé');
            }}
          >
            Exemple
          </Button>
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
            <Check className="size-4" aria-hidden />
            Insérer dans la procédure
          </Button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)_260px]">
        <aside className="hidden overflow-auto border-r border-border bg-card p-4 lg:block">
          <p className="mb-2.5 text-[11px] font-extrabold uppercase tracking-[0.07em] text-muted-foreground">
            Formes
          </p>
          <ul className="flex flex-col gap-1">
            {KINDS.map((k) => (
              <li key={k.k}>
                <button
                  type="button"
                  draggable
                  onDragStart={(e) => onPaletteDragStart(e, k.k)}
                  onClick={() => {
                    const canvas = canvasRef.current;
                    const cx = canvas
                      ? canvas.clientWidth / 2 + canvas.scrollLeft
                      : 200;
                    const cy = canvas
                      ? canvas.clientHeight / 2 + canvas.scrollTop
                      : 160;
                    addAt(k.k, cx, cy);
                  }}
                  className="flex w-full cursor-grab items-center gap-3 rounded-lg border border-transparent px-2.5 py-2 text-left text-[13px] font-semibold text-foreground active:cursor-grabbing hover:border-border hover:bg-[var(--neutral-50)]"
                >
                  <svg
                    width={38}
                    height={26}
                    viewBox="0 0 38 26"
                    aria-hidden
                    className="shrink-0"
                  >
                    {k.k === 'start' ? (
                      <rect
                        x={2}
                        y={4}
                        width={34}
                        height={18}
                        rx={9}
                        fill="var(--brand-ink)"
                      />
                    ) : k.k === 'end' ? (
                      <g>
                        <rect
                          x={2}
                          y={4}
                          width={34}
                          height={18}
                          rx={9}
                          fill="var(--brand-ink)"
                        />
                        <rect
                          x={6}
                          y={8}
                          width={26}
                          height={10}
                          rx={5}
                          fill="none"
                          stroke="var(--brand-gold)"
                          strokeWidth={1.2}
                        />
                      </g>
                    ) : k.k === 'dec' ? (
                      <polygon
                        points="19,2 36,13 19,24 2,13"
                        fill="var(--brand-gold-050)"
                        stroke="var(--brand-gold-600)"
                        strokeWidth={1.5}
                      />
                    ) : k.k === 'doc' ? (
                      <path
                        d="M3 3h32v16q-8-6-16 0t-16 0z"
                        fill="var(--neutral-50, #FAF9F7)"
                        stroke="var(--brand-ink)"
                        strokeWidth={1.5}
                      />
                    ) : k.k === 'actor' ? (
                      <g>
                        <rect
                          x={2}
                          y={4}
                          width={34}
                          height={18}
                          rx={3}
                          fill="#E6F0FB"
                          stroke="#1F4E8C"
                          strokeWidth={1.5}
                        />
                        <circle
                          cx={11}
                          cy={11}
                          r={2.5}
                          fill="none"
                          stroke="#1F4E8C"
                        />
                        <path
                          d="M7 18a4 4 0 0 1 8 0"
                          fill="none"
                          stroke="#1F4E8C"
                        />
                      </g>
                    ) : (
                      <rect
                        x={2}
                        y={4}
                        width={34}
                        height={18}
                        rx={4}
                        fill="white"
                        stroke="var(--brand-ink)"
                        strokeWidth={1.5}
                      />
                    )}
                  </svg>
                  {k.label}
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-4 grid gap-1.5 border-t border-border/60 pt-3.5 text-xs text-muted-foreground">
            <div className="flex justify-between gap-2">
              <span>Relier deux formes</span>
              <kbd className="rounded bg-muted px-1.5 py-0.5 font-bold text-foreground">
                C
              </kbd>
            </div>
            <div className="flex justify-between gap-2">
              <span>Sélection</span>
              <kbd className="rounded bg-muted px-1.5 py-0.5 font-bold text-foreground">
                V
              </kbd>
            </div>
            <div className="flex justify-between gap-2">
              <span>Supprimer</span>
              <kbd className="rounded bg-muted px-1.5 py-0.5 font-bold text-foreground">
                Suppr
              </kbd>
            </div>
            <div className="flex justify-between gap-2">
              <span>Fermer</span>
              <kbd className="rounded bg-muted px-1.5 py-0.5 font-bold text-foreground">
                Échap
              </kbd>
            </div>
          </div>
        </aside>

        <div
          ref={canvasRef}
          className={cn(
            'relative min-h-0 overflow-auto bg-card',
            tool === 'link' && !panning && 'cursor-crosshair',
            panning && 'cursor-grabbing',
            !panning && tool === 'select' && 'cursor-grab',
          )}
          style={{
            backgroundImage:
              'radial-gradient(circle, var(--neutral-300, #D6D2CA) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
          onDragOver={onCanvasDragOver}
          onDrop={onCanvasDrop}
          onMouseDown={onCanvasPointerDown}
        >
          <svg
            ref={svgRef}
            width={bbox.w}
            height={bbox.h}
            className="block min-h-full min-w-full"
          >
            <defs>
              <marker
                id="dg-arr"
                viewBox="0 0 10 10"
                refX={9}
                refY={5}
                markerWidth={8}
                markerHeight={8}
                orient="auto-start-reverse"
              >
                <path d="M0 0L10 5L0 10z" fill="var(--neutral-600, #5F5A52)" />
              </marker>
              <marker
                id="dg-arr-sel"
                viewBox="0 0 10 10"
                refX={9}
                refY={5}
                markerWidth={8}
                markerHeight={8}
                orient="auto-start-reverse"
              >
                <path d="M0 0L10 5L0 10z" fill="var(--brand-gold)" />
              </marker>
            </defs>

            {edges.map((ed, i) => {
              const a = nodes.find((n) => n.id === ed.from);
              const b = nodes.find((n) => n.id === ed.to);
              if (!a || !b) return null;
              const path = edgePath(a, b);
              const active = selEdge === i;
              return (
                <g key={`${ed.from}-${ed.to}-${i}`}>
                  <path
                    data-edge-hit=""
                    d={path.d}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={14}
                    className="cursor-pointer"
                    onMouseDown={(ev) => {
                      ev.stopPropagation();
                    }}
                    onClick={(ev) => {
                      ev.stopPropagation();
                      setSelEdge(i);
                      setSel(null);
                      setLinkFrom(null);
                    }}
                  />
                  <path
                    d={path.d}
                    fill="none"
                    stroke={
                      active ? 'var(--brand-gold)' : 'var(--neutral-600, #5F5A52)'
                    }
                    strokeWidth={active ? 2.5 : 1.75}
                    markerEnd={`url(#${active ? 'dg-arr-sel' : 'dg-arr'})`}
                    className="pointer-events-none"
                  />
                  {ed.label ? (
                    <text
                      x={path.mx}
                      y={path.my - 8}
                      textAnchor="middle"
                      className="pointer-events-none text-[11px] font-bold"
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

            {wire
              ? (() => {
                  const from = nodes.find((n) => n.id === wire.fromId);
                  if (!from) return null;
                  const origin = portPoint(from, wire.fromPort);
                  return (
                    <line
                      x1={origin.x}
                      y1={origin.y}
                      x2={wire.x}
                      y2={wire.y}
                      stroke="var(--brand-gold)"
                      strokeWidth={2}
                      strokeDasharray="6 4"
                      className="pointer-events-none"
                    />
                  );
                })()
              : null}

            {nodes.map((n) => {
              const m = kindMeta(n.k);
              const active =
                sel === n.id || linkFrom === n.id || wire?.fromId === n.id;
              const hovered = hov === n.id;
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
                <g
                  key={n.id}
                  data-node-id={n.id}
                  transform={`translate(${n.x},${n.y})`}
                  className={cn(
                    tool === 'link' ? 'cursor-crosshair' : 'cursor-grab',
                    'active:cursor-grabbing',
                  )}
                  onMouseDown={(e) => onNodePointer(n, e)}
                  onClick={(e) => e.stopPropagation()}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setSel(n.id);
                    window.setTimeout(() => {
                      document.getElementById('dg-lbl')?.focus();
                    }, 0);
                  }}
                  onMouseEnter={() => setHov(n.id)}
                  onMouseLeave={() =>
                    setHov((h) => (h === n.id ? null : h))
                  }
                  aria-label={displayLabel(n.label, 'Forme')}
                >
                  <NodeShape n={n} active={active} hovered={hovered} />
                  <text
                    x={textX}
                    y={textY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="pointer-events-none text-[12.5px] font-bold"
                    fill={fillText}
                  >
                    {lines.map((line, li) => (
                      <tspan
                        key={li}
                        x={textX}
                        dy={li === 0 ? 0 : 15}
                      >
                        {line}
                      </tspan>
                    ))}
                  </text>

                  {(active || hovered) &&
                    PORTS.map((port) => {
                      const pt = portPoint({ ...n, x: 0, y: 0 }, port);
                      return (
                        <circle
                          key={port}
                          cx={pt.x}
                          cy={pt.y}
                          r={6}
                          fill="white"
                          stroke="var(--brand-gold)"
                          strokeWidth={2}
                          className="cursor-crosshair"
                          style={{ pointerEvents: 'all' }}
                          onMouseDown={(e) => startWire(n.id, port, e)}
                        >
                          <title>Glisser pour relier</title>
                        </circle>
                      );
                    })}
                </g>
              );
            })}
          </svg>

          <div
            className="pointer-events-none sticky bottom-4 left-1/2 z-10 w-max max-w-[min(90%,28rem)] -translate-x-1/2 rounded-full bg-[var(--brand-ink)] px-3.5 py-2 text-center text-xs font-semibold text-white"
            aria-live="polite"
          >
            {hint}
          </div>
        </div>

        <aside className="hidden overflow-auto border-l border-border bg-card p-4 lg:block">
          <p className="mb-2.5 text-[11px] font-extrabold uppercase tracking-[0.07em] text-muted-foreground">
            Propriétés
          </p>
          {selected ? (
            <div className="flex flex-col gap-3">
              <div>
                <Label htmlFor="dg-lbl">Libellé</Label>
                <Input
                  id="dg-lbl"
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
                <Label htmlFor="dg-type">Type</Label>
                <select
                  id="dg-type"
                  className="mt-1 flex h-11 w-full rounded-[var(--radius-md)] border border-input bg-card px-3 text-sm"
                  value={selected.k}
                  onChange={(e) => {
                    const k = e.target.value as DiagNode['k'];
                    setNodes((prev) =>
                      prev.map((n) =>
                        n.id === selected.id ? { ...n, k } : n,
                      ),
                    );
                  }}
                >
                  {KINDS.map((k) => (
                    <option key={k.k} value={k.k}>
                      {k.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="dg-desc">Description</Label>
                <Textarea
                  id="dg-desc"
                  className="mt-1"
                  placeholder="Précision affichée au survol…"
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
                onClick={deleteSel}
              >
                Supprimer la forme
              </Button>
            </div>
          ) : selEdge != null && edges[selEdge] ? (
            <div className="flex flex-col gap-3">
              <div>
                <Label htmlFor="dg-elabel">Libellé du lien</Label>
                <Input
                  id="dg-elabel"
                  className="mt-1 min-h-11"
                  placeholder="Oui / Non / Si validé…"
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
                onClick={deleteSel}
              >
                Supprimer le lien
              </Button>
            </div>
          ) : (
            <div className="text-[12.5px] leading-relaxed text-muted-foreground">
              <p>
                Cliquez une forme ou un lien pour modifier son libellé, son type
                ou le supprimer.
              </p>
              <p className="mt-3 font-semibold text-foreground">
                {nodes.length} formes · {edges.length} liens
              </p>
              <p className="mt-3">
                Glissez une forme depuis la palette, puis tirez une{' '}
                <b className="text-foreground">poignée or</b> vers une autre
                forme pour créer un lien.
              </p>
            </div>
          )}
        </aside>
      </div>

      {spawnMenu
        ? createPortal(
            <div
              className="fixed z-[720] w-[200px] rounded-[var(--radius-lg)] border border-border bg-card p-1.5 shadow-[var(--shadow-3)]"
              style={{
                left: Math.min(spawnMenu.clientX, window.innerWidth - 212),
                top: Math.min(spawnMenu.clientY, window.innerHeight - 280),
              }}
              role="menu"
              aria-label="Créer une forme"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <p className="px-2 py-1.5 text-[10.5px] font-extrabold uppercase tracking-[0.07em] text-muted-foreground">
                Créer et relier
              </p>
              {KINDS.map((k) => (
                <button
                  key={k.k}
                  type="button"
                  role="menuitem"
                  className="flex min-h-10 w-full items-center rounded-lg px-2.5 py-1.5 text-left text-[12.5px] font-semibold hover:bg-muted sm:min-h-0 sm:py-2"
                  onClick={() =>
                    addAt(k.k, spawnMenu.svgX, spawnMenu.svgY, spawnMenu.fromId)
                  }
                >
                  {k.label}
                </button>
              ))}
              <button
                type="button"
                className="mt-0.5 flex min-h-10 w-full items-center rounded-lg px-2.5 py-1.5 text-left text-[12.5px] font-semibold text-muted-foreground hover:bg-muted sm:min-h-0"
                onClick={() => {
                  setSpawnMenu(null);
                  setHint('Sélection');
                }}
              >
                Annuler
              </button>
            </div>,
            document.body,
          )
        : null}
    </div>,
    document.body,
  );
}
