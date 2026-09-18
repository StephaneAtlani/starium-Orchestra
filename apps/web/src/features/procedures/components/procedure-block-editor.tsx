'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GripVertical, Link, Plus, Trash2 } from 'lucide-react';
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
  procedureStatusLabel,
} from '../lib/procedure-labels';
import type { ProcedureCategoryApi, ProcedureStatusApi } from '../types/procedure.types';
import { EMPTY_PROCEDURE_DOC } from '../lib/procedure-content';
import { sanitizeProcedureHtml } from '../lib/sanitize-procedure-html';

export type TextBlock =
  | { t: 'h1' | 'h2' | 'h3' | 'p' | 'ul' | 'ol' | 'step'; html: string }
  | { t: 'callout'; html: string; kind: 'warn' | 'info' };

export type ProcedureBlocksDoc = {
  schemaVersion: 2;
  blocks: TextBlock[];
};

const TEXT_INSERT: { t: TextBlock['t']; label: string }[] = [
  { t: 'h1', label: 'Titre 1' },
  { t: 'h2', label: 'Titre 2' },
  { t: 'h3', label: 'Titre 3' },
  { t: 'p', label: 'Paragraphe' },
  { t: 'ul', label: 'Liste à puces' },
  { t: 'ol', label: 'Liste numérotée' },
  { t: 'step', label: 'Étape' },
  { t: 'callout', label: 'Encadré' },
];

function emptyBlock(t: TextBlock['t']): TextBlock {
  if (t === 'callout') return { t: 'callout', html: '', kind: 'warn' };
  return { t, html: '' } as TextBlock;
}

function parseDoc(raw: unknown): ProcedureBlocksDoc {
  if (
    raw &&
    typeof raw === 'object' &&
    (raw as { schemaVersion?: number }).schemaVersion === 2 &&
    Array.isArray((raw as { blocks?: unknown }).blocks)
  ) {
    return {
      schemaVersion: 2,
      blocks: (raw as ProcedureBlocksDoc).blocks.filter((b) =>
        TEXT_INSERT.some((x) => x.t === b.t),
      ),
    };
  }
  return {
    schemaVersion: 2,
    blocks: [...EMPTY_PROCEDURE_DOC.blocks] as TextBlock[],
  };
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').trim();
}

function applyInlineCommand(cmd: string, value?: string) {
  try {
    document.execCommand(cmd, false, value);
  } catch {
    /* ignore */
  }
}

export function ProcedureBlockEditor({
  initialContent,
  initialTitle,
  category,
  status,
  ownerLabel,
  versionNumber,
  editable,
  saveState,
  onChange,
  onTitleChange,
  onCategoryChange,
  onTransition,
  canPublish,
}: {
  initialContent: unknown;
  initialTitle: string;
  category: ProcedureCategoryApi;
  status: ProcedureStatusApi;
  ownerLabel: string | null;
  versionNumber: number | null;
  editable: boolean;
  saveState: 'idle' | 'saving' | 'saved' | 'error';
  onChange: (doc: ProcedureBlocksDoc) => void;
  onTitleChange: (title: string) => void;
  onCategoryChange: (cat: ProcedureCategoryApi) => void;
  onTransition: (to: 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED') => void;
  canPublish: boolean;
}) {
  const [doc, setDoc] = useState(() => parseDoc(initialContent));
  const [title, setTitle] = useState(initialTitle);
  const [sel, setSel] = useState<number | null>(null);
  const [menuAt, setMenuAt] = useState<number | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('https://');
  const emitRef = useRef(onChange);
  emitRef.current = onChange;

  useEffect(() => {
    setDoc(parseDoc(initialContent));
  }, [initialContent]);

  useEffect(() => {
    setTitle(initialTitle);
  }, [initialTitle]);

  const updateBlocks = useCallback((blocks: TextBlock[]) => {
    const next = { schemaVersion: 2 as const, blocks };
    setDoc(next);
    emitRef.current(next);
  }, []);

  const outline = useMemo(() => {
    return doc.blocks
      .map((b, i) => ({ b, i }))
      .filter(({ b }) => b.t === 'h1' || b.t === 'h2' || b.t === 'h3');
  }, [doc.blocks]);

  let stepCounter = 0;

  const insertAt = (index: number, t: TextBlock['t']) => {
    const blocks = [...doc.blocks];
    blocks.splice(index, 0, emptyBlock(t));
    updateBlocks(blocks);
    setMenuAt(null);
    setSel(index);
  };

  const move = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= doc.blocks.length) return;
    const blocks = [...doc.blocks];
    const [item] = blocks.splice(index, 1);
    blocks.splice(j, 0, item!);
    updateBlocks(blocks);
    setSel(j);
  };

  const remove = (index: number) => {
    if (doc.blocks.length <= 1) return;
    const blocks = doc.blocks.filter((_, i) => i !== index);
    updateBlocks(blocks);
    setSel(null);
  };

  const duplicate = (index: number) => {
    const blocks = [...doc.blocks];
    blocks.splice(index + 1, 0, structuredClone(doc.blocks[index]!));
    updateBlocks(blocks);
    setSel(index + 1);
  };

  const setHtml = (index: number, html: string) => {
    const clean = sanitizeProcedureHtml(html);
    const blocks = doc.blocks.map((b, i) =>
      i === index ? ({ ...b, html: clean } as TextBlock) : b,
    );
    updateBlocks(blocks);
  };

  const transitionLabel =
    status === 'DRAFT'
      ? 'Envoyer en revue'
      : status === 'IN_REVIEW'
        ? 'Publier'
        : 'Envoyer en revue';

  const transitionTarget =
    status === 'DRAFT'
      ? 'IN_REVIEW'
      : status === 'IN_REVIEW'
        ? 'PUBLISHED'
        : 'IN_REVIEW';

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className="rounded-[var(--radius-pill)] bg-muted px-2.5 py-1 text-[11px] font-bold text-muted-foreground"
        >
          {procedureStatusLabel(status)}
        </span>
        <span
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
          aria-live="polite"
        >
          <span
            className={cn(
              'size-1.5 rounded-full',
              saveState === 'saving' && 'bg-[var(--brand-gold)]',
              saveState === 'saved' && 'bg-[var(--state-success)]',
              saveState === 'error' && 'bg-[var(--state-danger)]',
              saveState === 'idle' && 'bg-border',
            )}
            aria-hidden
          />
          {saveState === 'saving'
            ? 'Enregistrement…'
            : saveState === 'saved'
              ? 'Enregistré'
              : saveState === 'error'
                ? 'Erreur d’enregistrement'
                : '—'}
        </span>
        <div className="ml-auto flex flex-wrap gap-2">
          {editable && status !== 'ARCHIVED' ? (
            <Button
              type="button"
              size="sm"
              className="min-h-11 sm:min-h-9"
              disabled={
                transitionTarget === 'PUBLISHED' ? !canPublish : false
              }
              onClick={() => onTransition(transitionTarget)}
            >
              {transitionLabel}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[230px_minmax(0,1fr)_260px]">
        <aside className="hidden lg:block">
          <div className="starium-section sticky top-4 p-4">
            <p className="text-[11px] font-extrabold uppercase tracking-wide text-muted-foreground">
              Plan
            </p>
            <nav className="mt-2 flex flex-col gap-0.5" aria-label="Plan du document">
              {outline.length === 0 ? (
                <p className="text-xs text-muted-foreground">Aucun titre</p>
              ) : (
                outline.map(({ b, i }) => (
                  <button
                    key={i}
                    type="button"
                    className={cn(
                      'rounded-[var(--radius-md)] px-2 py-1.5 text-left text-[12.5px] hover:bg-muted',
                      b.t === 'h2' && 'pl-5',
                      b.t === 'h3' && 'pl-8',
                    )}
                    onClick={() => {
                      setSel(i);
                      document
                        .getElementById(`pr-blk-${i}`)
                        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                  >
                    {displayLabel(stripHtml(b.html), 'Sans titre')}
                  </button>
                ))
              )}
            </nav>
          </div>
        </aside>

        <div className="min-w-0">
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
                    key={i}
                    id={`pr-blk-${i}`}
                    className={cn(
                      'group relative grid grid-cols-[36px_minmax(0,1fr)] gap-2 py-1 lg:grid-cols-[58px_minmax(0,1fr)]',
                      sel === i && 'z-[1]',
                    )}
                  >
                    <div className="flex flex-col items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 lg:opacity-100">
                      {editable ? (
                        <>
                          <button
                            type="button"
                            className="inline-flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted"
                            aria-label="Ajouter un bloc"
                            onClick={() =>
                              setMenuAt(menuAt === i ? null : i)
                            }
                          >
                            <Plus className="size-3.5" aria-hidden />
                          </button>
                          <span
                            className="hidden text-muted-foreground lg:inline"
                            aria-hidden
                          >
                            <GripVertical className="size-4" />
                          </span>
                        </>
                      ) : null}
                    </div>
                    <div
                      className={cn(
                        'min-w-0 rounded-[var(--radius-md)]',
                        sel === i &&
                          'shadow-[0_0_0_2px_var(--brand-gold-100)]',
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
                          />
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
                          onKeyDown={(e) => {
                            if (!editable) return;
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              const nextType =
                                b.t === 'h1' || b.t === 'h2' || b.t === 'h3'
                                  ? 'p'
                                  : b.t;
                              insertAt(i + 1, nextType);
                            }
                            if (
                              (e.key === 'b' || e.key === 'B') &&
                              (e.metaKey || e.ctrlKey)
                            ) {
                              e.preventDefault();
                              applyInlineCommand('bold');
                            }
                            if (
                              (e.key === 'i' || e.key === 'I') &&
                              (e.metaKey || e.ctrlKey)
                            ) {
                              e.preventDefault();
                              applyInlineCommand('italic');
                            }
                            if (
                              (e.key === 'u' || e.key === 'U') &&
                              (e.metaKey || e.ctrlKey)
                            ) {
                              e.preventDefault();
                              applyInlineCommand('underline');
                            }
                          }}
                        />
                      )}
                    </div>
                    {menuAt === i && editable ? (
                      <InsertMenu
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
                  onClick={() => setMenuAt(doc.blocks.length)}
                >
                  <span className="inline-flex size-6 items-center justify-center rounded-full border border-dashed border-border">
                    <Plus className="size-3.5" aria-hidden />
                  </span>
                  Ajouter un bloc
                </button>
              ) : null}
              {menuAt === doc.blocks.length && editable ? (
                <InsertMenu
                  onPick={(t) => insertAt(doc.blocks.length, t)}
                  onClose={() => setMenuAt(null)}
                />
              ) : null}
            </div>
          </div>

          {editable && sel != null ? (
            <div className="sticky bottom-4 z-10 mt-4 flex justify-center">
              <div
                className="flex items-center gap-0.5 rounded-[10px] bg-[var(--brand-ink)] p-1 shadow-[var(--shadow-3)]"
                role="toolbar"
                aria-label="Formatage"
              >
                {(
                  [
                    ['bold', 'B'],
                    ['italic', 'I'],
                    ['underline', 'U'],
                    ['strikeThrough', 'S'],
                  ] as const
                ).map(([cmd, label]) => (
                  <button
                    key={cmd}
                    type="button"
                    className="inline-flex size-[30px] items-center justify-center rounded text-sm font-bold text-white hover:bg-white/12"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      applyInlineCommand(cmd);
                    }}
                  >
                    {label}
                  </button>
                ))}
                <span className="mx-1 h-[18px] w-px bg-white/20" aria-hidden />
                <button
                  type="button"
                  className="inline-flex h-[30px] items-center rounded px-2 text-xs font-semibold text-white hover:bg-white/12"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setLinkOpen(true);
                  }}
                >
                  Lien
                </button>
                <button
                  type="button"
                  className="inline-flex h-[30px] items-center rounded px-2 text-xs font-semibold text-white hover:bg-white/12"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    applyInlineCommand('hiliteColor', '#FBEAB5');
                  }}
                >
                  Surlig.
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <aside className="hidden lg:block">
          <div className="starium-section sticky top-4 flex flex-col gap-4 p-4">
            <div>
              <p className="text-[11px] font-extrabold uppercase text-muted-foreground">
                Procédure
              </p>
              <Label htmlFor="pr-cat" className="mt-2">
                Catégorie
              </Label>
              <Select
                value={category}
                disabled={!editable}
                onValueChange={(v) =>
                  onCategoryChange((v ?? category) as ProcedureCategoryApi)
                }
              >
                <SelectTrigger id="pr-cat" className="mt-1 min-h-11">
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
              <p className="mt-3 text-xs text-muted-foreground">
                Rattachée à — bientôt disponible
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Relecteur :{' '}
                {displayLabel(ownerLabel, 'Non assigné')}
              </p>
            </div>
            {sel != null && editable ? (
              <div>
                <p className="text-[11px] font-extrabold uppercase text-muted-foreground">
                  Bloc
                </p>
                <div className="mt-2 flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-11 justify-start"
                    onClick={() => move(sel, -1)}
                  >
                    Monter
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-11 justify-start"
                    onClick={() => move(sel, 1)}
                  >
                    Descendre
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-11 justify-start"
                    onClick={() => duplicate(sel)}
                  >
                    Dupliquer
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-11 justify-start text-[var(--state-danger)]"
                    onClick={() => remove(sel)}
                  >
                    <Trash2 className="size-4" aria-hidden />
                    Supprimer
                  </Button>
                </div>
              </div>
            ) : null}
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
  onKeyDown?: (e: React.KeyboardEvent<HTMLElement>) => void;
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
      data-ph={placeholder}
      onInput={(e) => onInput(e.currentTarget.innerHTML)}
      onKeyDown={onKeyDown}
    />
  );
}

function InsertMenu({
  onPick,
  onClose,
}: {
  onPick: (t: TextBlock['t']) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!(e.target instanceof Node)) return;
      onClose();
    };
    const t = window.setTimeout(
      () => document.addEventListener('click', onDoc),
      0,
    );
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('click', onDoc);
    };
  }, [onClose]);

  return (
    <div
      className="absolute left-10 z-20 mt-1 w-[300px] rounded-[var(--radius-lg)] border border-border bg-card p-2 shadow-[var(--shadow-3)]"
      onClick={(e) => e.stopPropagation()}
    >
      <p className="px-2 py-1 text-[10.5px] font-bold uppercase text-muted-foreground">
        Texte
      </p>
      <div className="grid grid-cols-2 gap-1">
        {TEXT_INSERT.map((item) => (
          <button
            key={item.t}
            type="button"
            className="rounded-[var(--radius-md)] px-2 py-2 text-left text-[12.5px] font-semibold hover:bg-[var(--brand-gold-050)]"
            onClick={() => onPick(item.t)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
