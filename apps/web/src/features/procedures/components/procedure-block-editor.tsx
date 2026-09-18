'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  CircleAlert,
  GripVertical,
  Highlighter,
  ImageIcon,
  Link,
  PanelLeftClose,
  PanelLeft,
  Play,
  Plus,
  RemoveFormatting,
  Video,
  Workflow,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { displayLabel } from '@/lib/display-label';
import {
  PROCEDURE_CATEGORY_LABELS,
  procedureCategoryLabel,
} from '../lib/procedure-labels';
import type { ProcedureCategoryApi } from '../types/procedure.types';
import { EMPTY_PROCEDURE_DOC } from '../lib/procedure-content';
import { toast } from '@/lib/toast';
import type { AuthFetch } from '@/features/budgets/api/budget-management.api';
import {
  downloadProcedureAssetBlob,
  uploadProcedureAsset,
} from '../api/procedures.api';
import { sanitizeProcedureHtml } from '../lib/sanitize-procedure-html';
import { ProcedureDiagramPreview } from './procedure-diagram-preview';
import type { DiagEdge, DiagNode } from './procedure-diagram-editor';

export type TextBlock =
  | { t: 'h1' | 'h2' | 'h3' | 'p' | 'ul' | 'ol' | 'step'; html: string }
  | { t: 'callout'; html: string; kind: 'warn' | 'info' }
  | { t: 'img'; assetId: string; alt: string; cap: string }
  | { t: 'video'; src: string; cap: string }
  | {
      t: 'diag';
      title: string;
      cap: string;
      nodes: Array<{
        id: string;
        k: string;
        x: number;
        y: number;
        label: string;
        desc?: string;
      }>;
      edges: Array<{ from: string; to: string; label?: string }>;
    };

export type ProcedureBlocksDoc = {
  schemaVersion: 2;
  blocks: TextBlock[];
};

type InsertItem = {
  t: TextBlock['t'];
  label: string;
  glyph: ReactNode;
};

const TEXT_INSERT: InsertItem[] = [
  { t: 'h1', label: 'Titre 1', glyph: 'H1' },
  { t: 'h2', label: 'Titre 2', glyph: 'H2' },
  { t: 'h3', label: 'Titre 3', glyph: 'H3' },
  { t: 'p', label: 'Paragraphe', glyph: '¶' },
  { t: 'ul', label: 'Liste à puces', glyph: '•' },
  { t: 'ol', label: 'Liste numérotée', glyph: '1.' },
  {
    t: 'step',
    label: 'Étape',
    glyph: <CheckCircle2 className="size-[15px]" aria-hidden />,
  },
  {
    t: 'callout',
    label: 'Encadré',
    glyph: <CircleAlert className="size-[15px]" aria-hidden />,
  },
];

const MEDIA_INSERT: InsertItem[] = [
  {
    t: 'img',
    label: 'Image',
    glyph: <ImageIcon className="size-[15px]" aria-hidden />,
  },
  {
    t: 'video',
    label: 'Vidéo',
    glyph: <Video className="size-[15px]" aria-hidden />,
  },
  {
    t: 'diag',
    label: 'Schéma / diagramme',
    glyph: <Workflow className="size-[15px]" aria-hidden />,
  },
];

const TEXTUAL_TYPES = [
  'h1',
  'h2',
  'h3',
  'p',
  'ul',
  'ol',
  'step',
  'callout',
] as const;

const BLOCK_TYPE_LABELS: Record<TextBlock['t'], string> = {
  h1: 'Titre 1',
  h2: 'Titre 2',
  h3: 'Titre 3',
  p: 'Paragraphe',
  ul: 'Liste à puces',
  ol: 'Liste numérotée',
  step: 'Étape',
  callout: 'Encadré',
  img: 'Image',
  video: 'Vidéo',
  diag: 'Schéma',
};

function ownerInitials(label: string | null | undefined): string {
  const parts = displayLabel(label, 'NA')
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return 'NA';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
}

function emptyBlock(t: TextBlock['t']): TextBlock {
  if (t === 'callout') return { t: 'callout', html: '', kind: 'warn' };
  if (t === 'img')
    return { t: 'img', assetId: '', alt: 'Image de la procédure', cap: '' };
  if (t === 'video') return { t: 'video', src: '', cap: '' };
  if (t === 'diag')
    return { t: 'diag', title: '', cap: '', nodes: [], edges: [] };
  if (t === 'ul' || t === 'ol') return { t, html: '<li><br></li>' };
  return { t, html: '' } as TextBlock;
}

function parseDoc(raw: unknown): ProcedureBlocksDoc {
  if (
    raw &&
    typeof raw === 'object' &&
    (raw as { schemaVersion?: number }).schemaVersion === 2 &&
    Array.isArray((raw as { blocks?: unknown }).blocks)
  ) {
    const blocks = (raw as ProcedureBlocksDoc).blocks.filter((b) => {
      if (b.t === 'img') return Boolean(b.assetId?.trim());
      if (b.t === 'video') return /^https:\/\//i.test(b.src);
      return true;
    });
    return {
      schemaVersion: 2,
      blocks: blocks.length > 0 ? blocks : [{ t: 'p', html: '' }],
    };
  }
  return {
    schemaVersion: 2,
    blocks: [
      { t: 'h1', html: '' },
      { t: 'p', html: '' },
    ],
  };
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').trim();
}

/** Place le caret dans le corps éditable du bloc (après insert / Entrée). */
function focusBlockBody(index: number) {
  const tryFocus = (left: number) => {
    const el = document.querySelector(
      `#pr-blk-${index} [data-pr-body]`,
    ) as HTMLElement | null;
    if (!el) {
      if (left > 0) window.setTimeout(() => tryFocus(left - 1), 20);
      return;
    }
    el.focus();
    try {
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    } catch {
      /* ignore */
    }
  };
  window.requestAnimationFrame(() => tryFocus(12));
}

function newBlockKey(): string {
  return `bk-${crypto.randomUUID()}`;
}

function applyInlineCommand(cmd: string, value?: string) {
  try {
    document.execCommand(cmd, false, value);
  } catch {
    /* ignore */
  }
}

export function ProcedureBlockEditor({
  procedureId,
  authFetch,
  initialContent,
  initialTitle,
  category,
  ownerLabel,
  versionNumber,
  editable,
  onChange,
  onTitleChange,
  onCategoryChange,
  onOpenDiagram,
}: {
  procedureId: string;
  authFetch: AuthFetch;
  initialContent: unknown;
  initialTitle: string;
  category: ProcedureCategoryApi;
  ownerLabel: string | null;
  versionNumber: number | null;
  editable: boolean;
  onChange: (doc: ProcedureBlocksDoc) => void;
  onTitleChange: (title: string) => void;
  onCategoryChange: (cat: ProcedureCategoryApi) => void;
  onOpenDiagram?: (blockIndex: number) => void;
}) {
  const [doc, setDoc] = useState(() => parseDoc(initialContent));
  const [blockKeys, setBlockKeys] = useState(() =>
    parseDoc(initialContent).blocks.map(() => newBlockKey()),
  );
  const [title, setTitle] = useState(initialTitle);
  const [sel, setSel] = useState<number | null>(null);
  const [planOpen, setPlanOpen] = useState(true);
  const [menuAt, setMenuAt] = useState<{
    at: number;
    top: number;
    left: number;
  } | null>(null);

  const openInsertMenu = (
    at: number,
    e: React.MouseEvent<HTMLButtonElement>,
  ) => {
    if (menuAt?.at === at) {
      setMenuAt(null);
      return;
    }
    const r = e.currentTarget.getBoundingClientRect();
    const menuH = 360;
    let top = r.bottom + 6;
    if (top + menuH > window.innerHeight - 12) {
      top = Math.max(12, r.top - menuH - 6);
    }
    setMenuAt({
      at,
      top,
      left: Math.min(r.left, window.innerWidth - 312),
    });
  };
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('https://');
  const [videoUrl, setVideoUrl] = useState('https://');
  const [videoModal, setVideoModal] = useState<{
    mode: 'insert' | 'replace';
    at: number;
  } | null>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dropHint, setDropHint] = useState<{
    i: number;
    edge: 'top' | 'bot';
  } | null>(null);
  const [fmt, setFmt] = useState<{
    left: number;
    top: number;
    bold: boolean;
    italic: boolean;
    underline: boolean;
    strike: boolean;
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  /** Insert image only after upload — empty assetId triggers API toast. */
  const pendingImg = useRef<{
    mode: 'insert' | 'replace';
    at: number;
  } | null>(null);
  const docRef = useRef(doc);
  docRef.current = doc;
  const blockKeysRef = useRef(blockKeys);
  blockKeysRef.current = blockKeys;
  const emitRef = useRef(onChange);
  emitRef.current = onChange;
  /** Contenu qu’on vient d’émettre — évite de reset les keys sur l’écho parent. */
  const lastEmittedRef = useRef<unknown>(null);
  const editorRootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editable) {
      setFmt(null);
      return;
    }
    const syncFmt = () => {
      const selApi = window.getSelection();
      if (!selApi || selApi.isCollapsed || selApi.rangeCount === 0) {
        setFmt(null);
        return;
      }
      const anchor = selApi.anchorNode;
      const el =
        anchor instanceof Element
          ? anchor
          : anchor?.parentElement ?? null;
      const body = el?.closest('[data-pr-body]');
      if (!body || !editorRootRef.current?.contains(body)) {
        setFmt(null);
        return;
      }
      const r = selApi.getRangeAt(0).getBoundingClientRect();
      if (r.width === 0 && r.height === 0) {
        setFmt(null);
        return;
      }
      setFmt({
        left: r.left + r.width / 2,
        top: r.top,
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        strike: document.queryCommandState('strikeThrough'),
      });
    };
    document.addEventListener('selectionchange', syncFmt);
    return () => document.removeEventListener('selectionchange', syncFmt);
  }, [editable]);

  const runFmt = (cmd: string, val?: string) => {
    applyInlineCommand(cmd, val);
    const selApi = window.getSelection();
    if (selApi && selApi.rangeCount > 0) {
      const r = selApi.getRangeAt(0).getBoundingClientRect();
      setFmt({
        left: r.left + r.width / 2,
        top: r.top,
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        strike: document.queryCommandState('strikeThrough'),
      });
    }
  };

  useEffect(() => {
    // Écho du onChange parent (même référence) → ne pas remount / defocus.
    if (initialContent === lastEmittedRef.current) return;
    const d = parseDoc(initialContent);
    setDoc(d);
    setBlockKeys((prev) => {
      if (prev.length === d.blocks.length) return prev;
      if (prev.length < d.blocks.length) {
        return [
          ...prev,
          ...Array.from(
            { length: d.blocks.length - prev.length },
            () => newBlockKey(),
          ),
        ];
      }
      return prev.slice(0, d.blocks.length);
    });
    lastEmittedRef.current = d;
  }, [initialContent]);

  useEffect(() => {
    setTitle(initialTitle);
  }, [initialTitle]);

  const updateBlocks = useCallback((blocks: TextBlock[], keys?: string[]) => {
    const srcKeys = keys ?? blockKeysRef.current;
    const pairs = blocks.map((b, i) => ({
      b,
      k: srcKeys[i] ?? newBlockKey(),
    }));
    const kept = pairs.filter(({ b }) => {
      if (b.t === 'img') return Boolean(b.assetId?.trim());
      if (b.t === 'video') return /^https:\/\//i.test(b.src ?? '');
      return true;
    });
    const nextBlocks =
      kept.length > 0
        ? kept.map((p) => p.b)
        : ([{ t: 'p', html: '' }] as TextBlock[]);
    const nextKeys =
      kept.length > 0 ? kept.map((p) => p.k) : [newBlockKey()];
    const next = { schemaVersion: 2 as const, blocks: nextBlocks };
    setBlockKeys((prev) =>
      prev.length === nextKeys.length &&
      prev.every((k, i) => k === nextKeys[i])
        ? prev
        : nextKeys,
    );
    setDoc(next);
    lastEmittedRef.current = next;
    emitRef.current(next);
  }, []);

  const outline = useMemo(() => {
    return doc.blocks
      .map((b, i) => ({ b, i }))
      .filter(({ b }) => b.t === 'h1' || b.t === 'h2' || b.t === 'h3');
  }, [doc.blocks]);

  const blockKeyDown = (
    e: ReactKeyboardEvent<HTMLElement>,
    index: number,
    type: TextBlock['t'],
  ) => {
    if (!editable) return;
    if (e.key === 'Enter') {
      if (type === 'ul' || type === 'ol') return;
      // Paragraphe : Entrée = saut de ligne ; ⇧Entrée = nouveau bloc.
      if (type === 'p' && !e.shiftKey) {
        e.preventDefault();
        try {
          document.execCommand('insertLineBreak');
        } catch {
          document.execCommand('insertHTML', false, '<br>');
        }
        const el = e.currentTarget;
        setHtml(index, el.innerHTML);
        return;
      }
      if (type === 'p' && e.shiftKey) {
        e.preventDefault();
        insertAt(index + 1, 'p');
        return;
      }
      if (e.shiftKey) return;
      e.preventDefault();
      const nextType: TextBlock['t'] =
        type === 'h1' || type === 'h2' || type === 'h3'
          ? 'p'
          : type === 'step'
            ? 'step'
            : type === 'callout'
              ? 'callout'
              : 'p';
      insertAt(index + 1, nextType);
      return;
    }
    if (e.key === 'Backspace') {
      const el = e.currentTarget;
      const text = (el.textContent ?? '').replace(/\u00a0/g, '').trim();
      const selApi = window.getSelection();
      const atStart =
        !!selApi?.isCollapsed &&
        (selApi.anchorOffset === 0 || text === '');
      if (text === '' && atStart) {
        e.preventDefault();
        remove(index);
        const prev = Math.max(0, index - 1);
        window.setTimeout(() => {
          document
            .querySelector<HTMLElement>(`#pr-blk-${prev} [data-pr-body]`)
            ?.focus();
        }, 0);
        return;
      }
    }
    if ((e.key === 'b' || e.key === 'B') && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      applyInlineCommand('bold');
    }
    if ((e.key === 'i' || e.key === 'I') && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      applyInlineCommand('italic');
    }
    if ((e.key === 'u' || e.key === 'U') && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      applyInlineCommand('underline');
    }
  };

  let stepCounter = 0;

  const insertAt = (index: number, t: TextBlock['t']) => {
    setMenuAt(null);
    if (t === 'img') {
      pendingImg.current = { mode: 'insert', at: index };
      window.setTimeout(() => fileRef.current?.click(), 0);
      return;
    }
    if (t === 'video') {
      setVideoUrl('https://');
      setVideoModal({ mode: 'insert', at: index });
      return;
    }
    const blocks = [...doc.blocks];
    const keys = [...blockKeysRef.current];
    blocks.splice(index, 0, emptyBlock(t));
    keys.splice(index, 0, newBlockKey());
    updateBlocks(blocks, keys);
    setSel(index);
    if (t === 'diag') {
      window.setTimeout(() => onOpenDiagram?.(index), 0);
      return;
    }
    focusBlockBody(index);
  };

  const clearDrag = () => {
    setDragFrom(null);
    setDropHint(null);
  };

  const move = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= doc.blocks.length) return;
    const blocks = [...doc.blocks];
    const keys = [...blockKeysRef.current];
    const [item] = blocks.splice(index, 1);
    const [k] = keys.splice(index, 1);
    blocks.splice(j, 0, item!);
    keys.splice(j, 0, k!);
    updateBlocks(blocks, keys);
    setSel(j);
  };

  const remove = (index: number) => {
    if (index < 0 || index >= doc.blocks.length) return;
    let blocks = doc.blocks.filter((_, i) => i !== index);
    let keys = blockKeysRef.current.filter((_, i) => i !== index);
    if (blocks.length === 0) {
      blocks = [{ t: 'p', html: '' }];
      keys = [newBlockKey()];
    }
    updateBlocks(blocks, keys);
    setSel(null);
  };

  const duplicate = (index: number) => {
    const blocks = [...doc.blocks];
    const keys = [...blockKeysRef.current];
    blocks.splice(index + 1, 0, structuredClone(doc.blocks[index]!));
    keys.splice(index + 1, 0, newBlockKey());
    updateBlocks(blocks, keys);
    setSel(index + 1);
    focusBlockBody(index + 1);
  };

  const changeType = (index: number, t: (typeof TEXTUAL_TYPES)[number]) => {
    const cur = doc.blocks[index];
    if (!cur) return;
    const html = 'html' in cur ? cur.html : '';
    let nextHtml = html;
    if ((t === 'ul' || t === 'ol') && !/<li/i.test(html)) {
      nextHtml = `<li>${html}</li>`;
    }
    const next: TextBlock =
      t === 'callout'
        ? {
            t: 'callout',
            html: nextHtml,
            kind: cur.t === 'callout' ? cur.kind : 'warn',
          }
        : ({ t, html: nextHtml } as TextBlock);
    const blocks = doc.blocks.map((b, i) => (i === index ? next : b));
    updateBlocks(blocks);
    setSel(index);
    focusBlockBody(index);
  };

  const setHtml = (index: number, html: string) => {
    const clean = sanitizeProcedureHtml(html);
    const blocks = doc.blocks.map((b, i) =>
      i === index ? ({ ...b, html: clean } as TextBlock) : b,
    );
    updateBlocks(blocks);
  };

  return (
    <div ref={editorRootRef} className="flex flex-col gap-5">
      <div
        className={cn(
          'grid gap-5',
          planOpen
            ? 'lg:grid-cols-[230px_minmax(0,1fr)_260px]'
            : 'lg:grid-cols-[minmax(0,1fr)_260px]',
        )}
      >
        {planOpen ? (
          <aside className="hidden lg:block">
            <div className="starium-section sticky top-4 p-4">
              <div className="mb-2.5 flex items-center justify-between gap-2">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.07em] text-muted-foreground">
                  Plan
                </p>
                <button
                  type="button"
                  className="inline-flex size-9 items-center justify-center rounded-[var(--radius-md)] text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Masquer le plan"
                  aria-expanded={true}
                  onClick={() => setPlanOpen(false)}
                >
                  <PanelLeftClose className="size-4" aria-hidden />
                </button>
              </div>
              <nav
                className="flex flex-col gap-0.5"
                aria-label="Plan du document"
              >
                {outline.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Ajoutez des titres pour construire le plan.
                  </p>
                ) : (
                  outline.map(({ b, i }) => (
                    <button
                      key={i}
                      type="button"
                      className={cn(
                        'rounded-[6px] px-2 py-[5px] text-left text-[12.5px] text-foreground hover:bg-muted',
                        b.t === 'h2' && 'pl-5 text-muted-foreground',
                        b.t === 'h3' &&
                          'pl-8 text-[12px] text-muted-foreground',
                      )}
                      onClick={() => {
                        setSel(i);
                        document
                          .getElementById(`pr-blk-${i}`)
                          ?.scrollIntoView({
                            behavior: 'smooth',
                            block: 'center',
                          });
                      }}
                    >
                      {displayLabel(
                        'html' in b ? stripHtml(b.html) : '',
                        'Sans titre',
                      )}
                    </button>
                  ))
                )}
              </nav>
            </div>
          </aside>
        ) : null}

        <div className="relative min-w-0">
          {!planOpen ? (
            <button
              type="button"
              className="absolute left-0 top-4 z-[2] hidden size-9 -translate-x-1/2 items-center justify-center rounded-[var(--radius-md)] border border-border/70 bg-card text-muted-foreground shadow-[var(--shadow-1)] hover:bg-muted hover:text-foreground lg:inline-flex"
              aria-label="Afficher le plan"
              aria-expanded={false}
              onClick={() => setPlanOpen(true)}
            >
              <PanelLeft className="size-4" aria-hidden />
            </button>
          ) : null}
          <div className="rounded-[var(--radius-lg)] border border-border/70 bg-card px-6 py-8 shadow-[var(--shadow-1)] sm:px-12 sm:py-12">
            <div
              className={cn(
                'text-[32px] font-extrabold tracking-[-0.02em] outline-none',
                !title && 'text-muted-foreground/40',
              )}
              contentEditable={editable}
              suppressContentEditableWarning
              data-placeholder="Titre de la procédure"
              onBlur={(e) => {
                const next = e.currentTarget.textContent?.trim() ?? '';
                setTitle(next);
                onTitleChange(next);
              }}
              role="textbox"
              aria-label="Titre de la procédure"
            >
              {title}
            </div>
            <p className="mt-2 mb-7 border-b border-border/60 pb-3 text-[12.5px] text-muted-foreground">
              {procedureCategoryLabel(category)}
              {versionNumber != null ? ` · v${versionNumber}` : ''}
              {ownerLabel
                ? ` · ${displayLabel(ownerLabel, 'Non assigné')}`
                : ''}
            </p>

            <div className="flex flex-col gap-1">
              {doc.blocks.map((b, i) => {
                if (b.t === 'step') stepCounter += 1;
                else if (b.t === 'h1' || b.t === 'h2' || b.t === 'h3')
                  stepCounter = 0;
                const stepN = stepCounter;
                return (
                  <div
                    key={blockKeys[i] ?? `blk-${i}`}
                    id={`pr-blk-${i}`}
                    className={cn(
                      'group relative -ml-7 py-1 pl-7 sm:-ml-9 sm:pl-9',
                      sel === i && 'z-[1]',
                      dragFrom === i && 'opacity-[0.35]',
                      dropHint?.i === i &&
                        dropHint.edge === 'top' &&
                        'before:pointer-events-none before:absolute before:left-7 before:right-0 before:top-0 before:z-[2] before:h-0.5 before:rounded-full before:bg-[var(--brand-gold)] before:content-[""] sm:before:left-9',
                      dropHint?.i === i &&
                        dropHint.edge === 'bot' &&
                        'after:pointer-events-none after:absolute after:bottom-0 after:left-7 after:right-0 after:z-[2] after:h-0.5 after:rounded-full after:bg-[var(--brand-gold)] after:content-[""] sm:after:left-9',
                    )}
                    onMouseDown={() => setSel(i)}
                    onDragOver={(e) => {
                      if (!editable || dragFrom == null) return;
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      const r = e.currentTarget.getBoundingClientRect();
                      const edge: 'top' | 'bot' =
                        e.clientY < r.top + r.height / 2 ? 'top' : 'bot';
                      setDropHint((prev) =>
                        prev?.i === i && prev.edge === edge
                          ? prev
                          : { i, edge },
                      );
                    }}
                    onDragLeave={(e) => {
                      if (
                        e.currentTarget.contains(e.relatedTarget as Node | null)
                      ) {
                        return;
                      }
                      setDropHint((prev) => (prev?.i === i ? null : prev));
                    }}
                    onDrop={(e) => {
                      if (!editable) return;
                      e.preventDefault();
                      const from = Number(
                        e.dataTransfer.getData('text/plain') || dragFrom,
                      );
                      const edge =
                        dropHint?.i === i
                          ? dropHint.edge
                          : e.clientY <
                              e.currentTarget.getBoundingClientRect().top +
                                e.currentTarget.getBoundingClientRect().height /
                                  2
                            ? 'top'
                            : 'bot';
                      clearDrag();
                      if (!Number.isFinite(from) || from === i) return;
                      const blocks = [...doc.blocks];
                      const keys = [...blockKeysRef.current];
                      const [item] = blocks.splice(from, 1);
                      const [k] = keys.splice(from, 1);
                      if (!item) return;
                      let dest = edge === 'top' ? i : i + 1;
                      if (from < dest) dest -= 1;
                      blocks.splice(dest, 0, item);
                      keys.splice(dest, 0, k!);
                      updateBlocks(blocks, keys);
                      setSel(dest);
                    }}
                  >
                    {editable ? (
                      <div className="absolute left-0 top-1/2 flex -translate-y-1/2 items-center gap-px opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                        <button
                          type="button"
                          className="inline-flex size-5 items-center justify-center rounded text-[var(--neutral-400)] hover:bg-muted hover:text-foreground"
                          aria-label="Ajouter un bloc"
                          aria-expanded={menuAt?.at === i}
                          onClick={(e) => openInsertMenu(i, e)}
                        >
                          <Plus className="size-3.5" strokeWidth={1.75} aria-hidden />
                        </button>
                        <button
                          type="button"
                          className="inline-flex size-5 cursor-grab items-center justify-center rounded text-[var(--neutral-400)] hover:bg-muted hover:text-foreground active:cursor-grabbing"
                          aria-label="Déplacer le bloc"
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.effectAllowed = 'move';
                            e.dataTransfer.setData('text/plain', String(i));
                            setDragFrom(i);
                            setSel(i);
                            setDropHint(null);
                          }}
                          onDragEnd={clearDrag}
                          onClick={() => setSel(i)}
                        >
                          <GripVertical
                            className="size-3.5"
                            strokeWidth={1.75}
                            aria-hidden
                          />
                        </button>
                      </div>
                    ) : null}
                    <div
                      className={cn(
                        'min-w-0 rounded-[var(--radius-md)] focus-within:shadow-[0_0_0_2px_var(--brand-gold-100)]',
                      )}
                      onFocus={() => setSel(i)}
                    >
                      {b.t === 'step' ? (
                        <div className="flex gap-3">
                          <span className="inline-flex size-[30px] shrink-0 items-center justify-center rounded-full bg-[var(--brand-ink)] text-[13px] font-extrabold text-[var(--brand-gold)]">
                            {stepN}
                          </span>
                          <BlockBody
                            editable={editable}
                            html={b.html}
                            placeholder="Décrivez cette étape…"
                            className="flex-1 text-[14.5px] leading-[1.65] text-foreground"
                            onInput={(html) => setHtml(i, html)}
                            onKeyDown={(e) => blockKeyDown(e, i, 'step')}
                          />
                        </div>
                      ) : b.t === 'callout' ? (
                        <div
                          className={cn(
                            'flex gap-3 rounded-[var(--radius-md)] border p-3 text-[13.5px]',
                            b.kind === 'info'
                              ? 'border-[var(--brand-info-border,#C5DBF5)] bg-[var(--brand-info-bg,#E6F0FB)] text-[var(--brand-info-fg,#1F4E8C)]'
                              : 'border-[var(--brand-gold-100)] bg-[var(--brand-gold-050)] text-[var(--brand-gold-700)]',
                          )}
                        >
                          <BlockBody
                            editable={editable}
                            html={b.html}
                            placeholder="Point d’attention…"
                            className="flex-1"
                            onInput={(html) => setHtml(i, html)}
                            onKeyDown={(e) => blockKeyDown(e, i, 'callout')}
                          />
                        </div>
                      ) : b.t === 'img' ? (
                        <MediaImageBlock
                          block={b}
                          editable={editable}
                          procedureId={procedureId}
                          authFetch={authFetch}
                          onPick={() => {
                            pendingImg.current = { mode: 'replace', at: i };
                            fileRef.current?.click();
                          }}
                          onCap={(cap) => {
                            const blocks = doc.blocks.map((x, j) =>
                              j === i && x.t === 'img'
                                ? { ...x, cap: sanitizeProcedureHtml(cap) }
                                : x,
                            );
                            updateBlocks(blocks);
                          }}
                        />
                      ) : b.t === 'video' ? (
                        <MediaVideoBlock
                          block={b}
                          editable={editable}
                          onPick={() => {
                            setVideoUrl(b.src || 'https://');
                            setVideoModal({ mode: 'replace', at: i });
                          }}
                          onCap={(cap) => {
                            const blocks = doc.blocks.map((x, j) =>
                              j === i && x.t === 'video'
                                ? { ...x, cap: sanitizeProcedureHtml(cap) }
                                : x,
                            );
                            updateBlocks(blocks);
                          }}
                        />
                      ) : b.t === 'diag' ? (
                        <div>
                          <ProcedureDiagramPreview
                            title={b.title}
                            nodes={b.nodes as DiagNode[]}
                            edges={b.edges as DiagEdge[]}
                            editable={editable}
                            onEdit={() => onOpenDiagram?.(i)}
                          />
                          {editable ? (
                            <div
                              className="mt-2 text-center text-xs text-muted-foreground outline-none empty:before:text-muted-foreground/50 empty:before:content-[attr(data-ph)]"
                              contentEditable
                              suppressContentEditableWarning
                              data-ph="Ajouter une légende…"
                              onBlur={(e) => {
                                const cap = sanitizeProcedureHtml(
                                  e.currentTarget.innerHTML,
                                );
                                const blocks = doc.blocks.map((x, j) =>
                                  j === i && x.t === 'diag'
                                    ? { ...x, cap }
                                    : x,
                                );
                                updateBlocks(blocks);
                              }}
                              dangerouslySetInnerHTML={{
                                __html: b.cap || '',
                              }}
                            />
                          ) : b.cap ? (
                            <p
                              className="mt-2 text-center text-xs text-muted-foreground"
                              dangerouslySetInnerHTML={{
                                __html: sanitizeProcedureHtml(b.cap),
                              }}
                            />
                          ) : null}
                        </div>
                      ) : (
                        <BlockBody
                          editable={editable}
                          html={b.html}
                          tag={
                            b.t === 'ul' ? 'ul' : b.t === 'ol' ? 'ol' : 'div'
                          }
                          placeholder={
                            b.t === 'h1'
                              ? 'Titre 1'
                              : b.t === 'h2'
                                ? 'Titre 2'
                                : b.t === 'h3'
                                  ? 'Titre 3'
                                  : b.t === 'ul' || b.t === 'ol'
                                    ? 'Élément de liste'
                                    : 'Rédigez un paragraphe…'
                          }
                          className={cn(
                            b.t === 'h1' &&
                              'mt-4 text-2xl font-extrabold text-foreground',
                            b.t === 'h2' &&
                              'mt-3 text-lg font-extrabold text-foreground',
                            b.t === 'h3' &&
                              'mt-2 text-[15px] font-extrabold text-muted-foreground',
                            (b.t === 'p' ||
                              b.t === 'ul' ||
                              b.t === 'ol') &&
                              'text-[14.5px] leading-[1.65] text-foreground',
                            (b.t === 'ul' || b.t === 'ol') &&
                              'list-inside pl-1',
                            b.t === 'ul' && 'list-disc',
                            b.t === 'ol' && 'list-decimal',
                          )}
                          onInput={(html) => setHtml(i, html)}
                          onKeyDown={(e) => blockKeyDown(e, i, b.t)}
                        />
                      )}
                    </div>
                    {menuAt?.at === i && editable ? (
                      <InsertMenu
                        top={menuAt.top}
                        left={menuAt.left}
                        onPick={(t) => insertAt(i, t)}
                        onClose={() => setMenuAt(null)}
                      />
                    ) : null}
                  </div>
                );
              })}
              {editable ? (
                <button
                  type="button"
                  className="mt-4 flex items-center gap-2 text-[12.5px] text-muted-foreground hover:text-foreground"
                  aria-expanded={menuAt?.at === doc.blocks.length}
                  onClick={(e) => openInsertMenu(doc.blocks.length, e)}
                >
                  <span className="inline-flex size-6 items-center justify-center rounded-full border border-dashed border-border">
                    <Plus className="size-3.5" aria-hidden />
                  </span>
                  Ajouter un bloc
                </button>
              ) : null}
              {menuAt?.at === doc.blocks.length && editable ? (
                <InsertMenu
                  top={menuAt.top}
                  left={menuAt.left}
                  onPick={(t) => insertAt(doc.blocks.length, t)}
                  onClose={() => setMenuAt(null)}
                />
              ) : null}
            </div>
          </div>
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-4 flex flex-col gap-3.5">
            <div className="starium-section p-4">
              <p className="mb-2.5 text-[11px] font-extrabold uppercase tracking-[0.07em] text-muted-foreground">
                Bloc
              </p>
              {sel == null || !doc.blocks[sel] ? (
                <p className="text-[12.5px] text-muted-foreground">
                  Sélectionnez un bloc pour voir ses options.
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  <div>
                    <Label htmlFor="pr-blk-type" className="text-[11.5px]">
                      Type de bloc
                    </Label>
                    {TEXTUAL_TYPES.includes(
                      doc.blocks[sel]!.t as (typeof TEXTUAL_TYPES)[number],
                    ) ? (
                      <Select
                        value={doc.blocks[sel]!.t}
                        disabled={!editable}
                        onValueChange={(v) => {
                          if (
                            v &&
                            TEXTUAL_TYPES.includes(
                              v as (typeof TEXTUAL_TYPES)[number],
                            )
                          ) {
                            changeType(
                              sel,
                              v as (typeof TEXTUAL_TYPES)[number],
                            );
                          }
                        }}
                      >
                        <SelectTrigger
                          id="pr-blk-type"
                          className="mt-1 h-9 min-h-9 text-[13px]"
                        >
                          <SelectValue>
                            {BLOCK_TYPE_LABELS[doc.blocks[sel]!.t]}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {TEXTUAL_TYPES.map((t) => (
                            <SelectItem key={t} value={t}>
                              {BLOCK_TYPE_LABELS[t]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="mt-1 text-[13px] font-semibold">
                        {BLOCK_TYPE_LABELS[doc.blocks[sel]!.t]}
                      </p>
                    )}
                  </div>
                  {doc.blocks[sel]!.t === 'callout' ? (
                    <div>
                      <Label htmlFor="pr-callout-ton" className="text-[11.5px]">
                        Ton
                      </Label>
                      <Select
                        value={
                          (doc.blocks[sel] as Extract<TextBlock, { t: 'callout' }>)
                            .kind
                        }
                        disabled={!editable}
                        onValueChange={(v) => {
                          if (v !== 'warn' && v !== 'info') return;
                          const blocks = doc.blocks.map((b, j) =>
                            j === sel && b.t === 'callout'
                              ? { ...b, kind: v }
                              : b,
                          );
                          updateBlocks(blocks);
                        }}
                      >
                        <SelectTrigger
                          id="pr-callout-ton"
                          className="mt-1 h-9 min-h-9 text-[13px]"
                        >
                          <SelectValue>
                            {(doc.blocks[sel] as Extract<
                              TextBlock,
                              { t: 'callout' }
                            >).kind === 'info'
                              ? 'Information (bleu)'
                              : 'Attention (ambre)'}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="warn">Attention (ambre)</SelectItem>
                          <SelectItem value="info">Information (bleu)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}
                  {editable ? (
                    <div className="grid grid-cols-2 gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="min-h-9 justify-center gap-1 px-2 text-xs"
                        onClick={() => move(sel, -1)}
                      >
                        <ArrowUp className="size-3.5" aria-hidden />
                        Monter
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="min-h-9 justify-center gap-1 px-2 text-xs"
                        onClick={() => move(sel, 1)}
                      >
                        <ArrowDown className="size-3.5" aria-hidden />
                        Descendre
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="min-h-9 justify-center px-2 text-xs"
                        onClick={() => duplicate(sel)}
                      >
                        Dupliquer
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="min-h-9 justify-center px-2 text-xs text-[var(--state-danger)]"
                        onClick={() => remove(sel)}
                      >
                        Supprimer
                      </Button>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            <div className="starium-section p-4">
              <p className="mb-2.5 text-[11px] font-extrabold uppercase tracking-[0.07em] text-muted-foreground">
                Procédure
              </p>
              <div className="flex flex-col gap-3">
                <div>
                  <Label htmlFor="pr-cat" className="text-[11.5px]">
                    Catégorie
                  </Label>
                  <Select
                    value={category}
                    disabled={!editable}
                    onValueChange={(v) =>
                      onCategoryChange((v ?? category) as ProcedureCategoryApi)
                    }
                  >
                    <SelectTrigger
                      id="pr-cat"
                      className="mt-1 h-9 min-h-9 text-[13px]"
                    >
                      <SelectValue>
                        {PROCEDURE_CATEGORY_LABELS[category]}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {(
                        Object.keys(
                          PROCEDURE_CATEGORY_LABELS,
                        ) as ProcedureCategoryApi[]
                      ).map((c) => (
                        <SelectItem key={c} value={c}>
                          {PROCEDURE_CATEGORY_LABELS[c]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="text-[11.5px] font-bold text-muted-foreground">
                    Rattachée à
                  </p>
                  <p className="mt-1 text-[13px] font-semibold text-muted-foreground">
                    —
                  </p>
                </div>
                <div>
                  <p className="text-[11.5px] font-bold text-muted-foreground">
                    Relecteurs
                  </p>
                  <div className="mt-1.5 flex items-center gap-1">
                    <span
                      className="inline-flex size-6 items-center justify-center rounded-full bg-[var(--brand-ink)] text-[9px] font-extrabold text-[var(--brand-gold)]"
                      title={displayLabel(ownerLabel, 'Non assigné')}
                      aria-label={displayLabel(ownerLabel, 'Non assigné')}
                    >
                      {ownerInitials(ownerLabel)}
                    </span>
                    <button
                      type="button"
                      className="inline-flex size-6 items-center justify-center rounded-full bg-muted text-muted-foreground"
                      aria-label="Ajouter un relecteur"
                      disabled={!editable}
                      onClick={() =>
                        toast.message('Relecteurs — bientôt disponible')
                      }
                    >
                      <Plus className="size-3.5" aria-hidden />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div id="pr-hist" className="starium-section p-4">
              <p className="mb-2.5 text-[11px] font-extrabold uppercase tracking-[0.07em] text-muted-foreground">
                Historique
              </p>
              {versionNumber != null ? (
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    <b className="min-w-9 font-bold text-foreground tabular-nums">
                      v{versionNumber}
                    </b>
                    <span>Version courante</span>
                  </div>
                </div>
              ) : (
                <p className="text-[12.5px] text-muted-foreground">
                  Aucune version publiée.
                </p>
              )}
            </div>
          </div>
        </aside>
      </div>

      <StariumModal
        open={linkOpen}
        onOpenChange={setLinkOpen}
        title="Insérer un lien"
        description="URL https uniquement."
        icon={Link}
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setLinkOpen(false)}
            >
              Annuler
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!/^https:\/\//i.test(linkUrl.trim())) return;
                applyInlineCommand('createLink', linkUrl.trim());
                setLinkOpen(false);
              }}
            >
              Insérer
            </Button>
          </>
        }
      >
        <div className="starium-form-field">
          <Label htmlFor="pr-link-url">URL</Label>
          <Input
            id="pr-link-url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://"
            className="min-h-11"
          />
        </div>
      </StariumModal>

      <StariumModal
        open={videoModal != null}
        onOpenChange={(o) => {
          if (!o) setVideoModal(null);
        }}
        title="Ajouter une vidéo"
        description="Collez un lien https (Stream, YouTube, Vimeo)."
        icon={Play}
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setVideoModal(null)}
            >
              Annuler
            </Button>
            <Button
              type="button"
              onClick={() => {
                const src = videoUrl.trim();
                if (!/^https:\/\//i.test(src) || videoModal == null) return;
                const { mode, at } = videoModal;
                if (mode === 'insert') {
                  const blocks = [...docRef.current.blocks];
                  const keys = [...blockKeysRef.current];
                  blocks.splice(at, 0, { t: 'video', src, cap: '' });
                  keys.splice(at, 0, newBlockKey());
                  updateBlocks(blocks, keys);
                  setSel(at);
                } else {
                  const blocks = docRef.current.blocks.map((x, j) =>
                    j === at && x.t === 'video' ? { ...x, src } : x,
                  );
                  updateBlocks(blocks);
                }
                setVideoModal(null);
              }}
            >
              Ajouter
            </Button>
          </>
        }
      >
        <div className="starium-form-field">
          <Label htmlFor="pr-video-url">URL vidéo</Label>
          <Input
            id="pr-video-url"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://"
            className="min-h-11"
          />
        </div>
      </StariumModal>

      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,image/svg+xml"
        className="sr-only"
        aria-hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          const pending = pendingImg.current;
          pendingImg.current = null;
          if (!file || !pending) return;
          void uploadProcedureAsset(authFetch, procedureId, file)
            .then((asset) => {
              const imgBlock: TextBlock = {
                t: 'img',
                assetId: asset.id,
                alt: displayLabel(asset.label, 'Image de la procédure'),
                cap: '',
              };
              if (pending.mode === 'insert') {
                const blocks = [...docRef.current.blocks];
                const keys = [...blockKeysRef.current];
                blocks.splice(pending.at, 0, imgBlock);
                keys.splice(pending.at, 0, newBlockKey());
                updateBlocks(blocks, keys);
                setSel(pending.at);
              } else {
                const blocks = docRef.current.blocks.map((x, j) =>
                  j === pending.at && x.t === 'img'
                    ? {
                        ...x,
                        assetId: asset.id,
                        alt: displayLabel(
                          asset.label,
                          'Image de la procédure',
                        ),
                      }
                    : x,
                );
                updateBlocks(blocks);
              }
              toast.success('Image ajoutée');
            })
            .catch((err: Error) => toast.error(err.message));
        }}
      />

      {editable && fmt
        ? createPortal(
            <div
              className="pointer-events-auto fixed z-[650] flex items-center gap-0.5 rounded-[10px] bg-[var(--brand-ink)] p-1 shadow-[var(--shadow-3)] after:absolute after:bottom-[-5px] after:left-1/2 after:size-2.5 after:-translate-x-1/2 after:rotate-45 after:rounded-[2px] after:bg-[var(--brand-ink)] after:content-['']"
              style={{
                left: fmt.left,
                top: fmt.top,
                transform: 'translate(-50%, calc(-100% - 10px))',
              }}
              role="toolbar"
              aria-label="Formatage"
            >
              {(
                [
                  ['bold', 'B', fmt.bold, 'Gras'],
                  ['italic', 'I', fmt.italic, 'Italique'],
                  ['underline', 'U', fmt.underline, 'Souligné'],
                  ['strikeThrough', 'S', fmt.strike, 'Barré'],
                ] as const
              ).map(([cmd, label, on, title]) => (
                <button
                  key={cmd}
                  type="button"
                  title={title}
                  aria-pressed={on}
                  className={cn(
                    'inline-flex size-[30px] items-center justify-center rounded-[7px] text-[13px] font-bold text-white hover:bg-white/12',
                    on &&
                      'bg-[var(--brand-gold)] text-[var(--brand-ink)] hover:bg-[var(--brand-gold)]',
                    cmd === 'italic' && 'font-serif italic',
                    cmd === 'underline' && 'underline',
                    cmd === 'strikeThrough' && 'line-through',
                  )}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    runFmt(cmd);
                  }}
                >
                  {label}
                </button>
              ))}
              <span
                className="mx-[3px] h-[18px] w-px bg-white/20"
                aria-hidden
              />
              <button
                type="button"
                title="Lien"
                className="inline-flex size-[30px] items-center justify-center rounded-[7px] text-white hover:bg-white/12"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setLinkUrl('https://');
                  setLinkOpen(true);
                }}
              >
                <Link className="size-[15px]" aria-hidden />
                <span className="sr-only">Lien</span>
              </button>
              <button
                type="button"
                title="Surligner"
                className="inline-flex size-[30px] items-center justify-center rounded-[7px] text-white hover:bg-white/12"
                onMouseDown={(e) => {
                  e.preventDefault();
                  runFmt('hiliteColor', '#FBEAB5');
                }}
              >
                <Highlighter className="size-[15px]" aria-hidden />
                <span className="sr-only">Surligner</span>
              </button>
              <button
                type="button"
                title="Effacer la mise en forme"
                className="inline-flex size-[30px] items-center justify-center rounded-[7px] text-white hover:bg-white/12"
                onMouseDown={(e) => {
                  e.preventDefault();
                  runFmt('removeFormat');
                }}
              >
                <RemoveFormatting className="size-[15px]" aria-hidden />
                <span className="sr-only">Effacer la mise en forme</span>
              </button>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function BlockBody({
  html,
  editable,
  placeholder,
  className,
  tag = 'div',
  onInput,
  onKeyDown,
}: {
  html: string;
  editable: boolean;
  placeholder: string;
  className?: string;
  tag?: 'div' | 'ul' | 'ol';
  onInput: (html: string) => void;
  onKeyDown?: (e: ReactKeyboardEvent<HTMLElement>) => void;
}) {
  const Tag = tag;
  const ref = useRef<HTMLElement | null>(null);
  const primed = useRef(false);

  useEffect(() => {
    if (primed.current || !ref.current) return;
    ref.current.innerHTML = html || '';
    primed.current = true;
  }, [html]);

  return (
    <Tag
      ref={ref as never}
      className={cn(
        'min-h-[1.5em] outline-none empty:before:text-muted-foreground/50 empty:before:content-[attr(data-ph)]',
        className,
      )}
      contentEditable={editable}
      suppressContentEditableWarning
      data-pr-body=""
      data-ph={placeholder}
      onInput={(e) => onInput(e.currentTarget.innerHTML)}
      onKeyDown={onKeyDown}
    />
  );
}

function InsertMenu({
  top,
  left,
  onPick,
  onClose,
}: {
  top: number;
  left: number;
  onPick: (t: TextBlock['t']) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const t = e.target;
      if (t instanceof Element && t.closest('[data-pr-insert-menu]')) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const id = window.setTimeout(() => {
      document.addEventListener('mousedown', onDoc);
      document.addEventListener('keydown', onKey);
    }, 0);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return createPortal(
    <div
      data-pr-insert-menu=""
      role="menu"
      aria-label="Insérer un bloc"
      className="fixed z-[600] w-[300px] rounded-[var(--radius-lg)] border border-border bg-card p-2 shadow-[var(--shadow-3)]"
      style={{ top, left }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <p className="px-2.5 pb-1 pt-1.5 text-[10.5px] font-extrabold uppercase tracking-[0.07em] text-muted-foreground">
        Texte
      </p>
      <div className="grid grid-cols-2 gap-0.5">
        {TEXT_INSERT.map((item) => (
          <button
            key={item.t}
            type="button"
            role="menuitem"
            className="group flex min-h-11 items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12.5px] font-semibold text-foreground hover:bg-muted sm:min-h-0"
            onClick={() => onPick(item.t)}
          >
            <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-[7px] bg-muted text-[12px] font-extrabold text-foreground group-hover:bg-[var(--brand-gold-050)]">
              {item.glyph}
            </span>
            {item.label}
          </button>
        ))}
      </div>
      <p className="mt-1 px-2.5 pb-1 pt-1.5 text-[10.5px] font-extrabold uppercase tracking-[0.07em] text-muted-foreground">
        Média & schémas
      </p>
      <div className="grid grid-cols-2 gap-0.5">
        {MEDIA_INSERT.map((item) => (
          <button
            key={item.t}
            type="button"
            role="menuitem"
            className="group flex min-h-11 items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12.5px] font-semibold text-foreground hover:bg-muted sm:min-h-0"
            onClick={() => onPick(item.t)}
          >
            <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-[7px] bg-muted text-[12px] font-extrabold text-foreground group-hover:bg-[var(--brand-gold-050)]">
              {item.glyph}
            </span>
            {item.label}
          </button>
        ))}
      </div>
    </div>,
    document.body,
  );
}

function MediaImageBlock({
  block,
  editable,
  procedureId,
  authFetch,
  onPick,
  onCap,
}: {
  block: Extract<TextBlock, { t: 'img' }>;
  editable: boolean;
  procedureId: string;
  authFetch: AuthFetch;
  onPick: () => void;
  onCap: (cap: string) => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!block.assetId) {
      setUrl(null);
      return;
    }
    let revoked: string | null = null;
    void downloadProcedureAssetBlob(authFetch, procedureId, block.assetId)
      .then((blob) => {
        const u = URL.createObjectURL(blob);
        revoked = u;
        setUrl(u);
      })
      .catch(() => setUrl(null));
    return () => {
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [block.assetId, authFetch, procedureId]);

  return (
    <div className="pr-media">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={displayLabel(block.alt, 'Image de la procédure')}
          className="max-h-[360px] w-full rounded-[var(--radius-md)] object-contain"
        />
      ) : (
        <button
          type="button"
          disabled={!editable}
          onClick={onPick}
          className="flex min-h-[180px] w-full flex-col items-center justify-center gap-2 rounded-[var(--radius-md)] border border-dashed border-border bg-muted/40 px-4 text-center"
        >
          <ImageIcon className="size-7 text-muted-foreground" aria-hidden />
          <span className="font-bold">Déposer une image</span>
          <span className="text-xs text-muted-foreground">
            PNG, JPG, SVG · 10 Mo max
          </span>
        </button>
      )}
      {editable ? (
        <div
          className="mt-2 text-center text-xs text-muted-foreground outline-none"
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => onCap(e.currentTarget.innerHTML)}
          dangerouslySetInnerHTML={{ __html: block.cap || '' }}
        />
      ) : null}
    </div>
  );
}

function MediaVideoBlock({
  block,
  editable,
  onPick,
  onCap,
}: {
  block: Extract<TextBlock, { t: 'video' }>;
  editable: boolean;
  onPick: () => void;
  onCap: (cap: string) => void;
}) {
  return (
    <div>
      {block.src ? (
        <a
          href={block.src}
          target="_blank"
          rel="noopener noreferrer"
          className="relative flex aspect-video items-center justify-center rounded-[var(--radius-md)] bg-[var(--brand-ink)] text-white"
        >
          <span className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent rounded-[var(--radius-md)]" />
          <span className="relative inline-flex size-[58px] items-center justify-center rounded-full bg-[var(--brand-gold)] text-[var(--brand-ink)]">
            <Play className="size-6 fill-current" aria-hidden />
          </span>
          <span className="absolute bottom-3 left-3 right-3 truncate text-xs">
            Ouvrir la vidéo
          </span>
        </a>
      ) : (
        <button
          type="button"
          disabled={!editable}
          onClick={onPick}
          className="flex min-h-[180px] w-full flex-col items-center justify-center gap-2 rounded-[var(--radius-md)] border border-dashed border-border bg-muted/40 px-4"
        >
          <Play className="size-7 text-muted-foreground" aria-hidden />
          <span className="font-bold">Ajouter une vidéo</span>
          <span className="text-xs text-muted-foreground">
            Lien Stream, YouTube, Vimeo (https)
          </span>
        </button>
      )}
      {editable ? (
        <div
          className="mt-2 text-center text-xs text-muted-foreground outline-none"
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => onCap(e.currentTarget.innerHTML)}
          dangerouslySetInnerHTML={{ __html: block.cap || '' }}
        />
      ) : null}
    </div>
  );
}
