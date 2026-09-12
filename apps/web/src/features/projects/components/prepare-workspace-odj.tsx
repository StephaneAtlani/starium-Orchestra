'use client';

import { useState, type Ref } from 'react';
import { Check, GripVertical, ListOrdered, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { displayLabel } from '@/lib/display-label';
import {
  formatDurationMinutesFr,
  sumAgendaPlannedMinutes,
} from '../lib/project-review-prepare-guards';
import type { PrepStdBlock } from '../lib/prepare-workspace-blocks';
import type { PrepWorkspaceMode } from '../lib/prepare-workspace-types';
import type { ProjectReviewAgendaItemApi } from '../types/project.types';

type Props = {
  mode: PrepWorkspaceMode;
  onModeChange: (mode: PrepWorkspaceMode) => void;
  blocks: PrepStdBlock[];
  selectedBlockIds: string[];
  onToggleBlock: (blockId: string) => void;
  agendaItems: ProjectReviewAgendaItemApi[];
  sessionDurationMinutes: number | null;
  canEdit: boolean;
  agendaLocked: boolean;
  onAddAgendaItem: (title: string, minutes: number) => Promise<void>;
  onUpdateDuration: (itemId: string, minutes: number) => Promise<void>;
  onDeleteAgendaItem: (itemId: string) => Promise<void>;
  agendaListRef?: Ref<HTMLElement>;
  durationCounterRef?: Ref<HTMLElement>;
};

export function PrepareWorkspaceOdj({
  mode,
  onModeChange,
  blocks,
  selectedBlockIds,
  onToggleBlock,
  agendaItems,
  sessionDurationMinutes,
  canEdit,
  agendaLocked,
  onAddAgendaItem,
  onUpdateDuration,
  onDeleteAgendaItem,
  agendaListRef,
  durationCounterRef,
}: Props) {
  const [draftTitle, setDraftTitle] = useState('');
  const [adding, setAdding] = useState(false);
  const editable = canEdit && !agendaLocked;

  const selected = new Set(selectedBlockIds);
  const blockMinutes = blocks
    .filter((b) => selected.has(b.id))
    .reduce((s, b) => s + b.defaultMin, 0);
  const agendaMinutes = sumAgendaPlannedMinutes(agendaItems);
  const total =
    mode === 'simple'
      ? blockMinutes +
        agendaItems
          .filter((i) => !/^\[pw:/.test((i.notes ?? '').trim()))
          .reduce(
            (s, i) =>
              s +
              (typeof i.plannedDurationMinutes === 'number' &&
              i.plannedDurationMinutes > 0
                ? i.plannedDurationMinutes
                : 0),
            0,
          )
      : agendaMinutes;
  const session = sessionDurationMinutes ?? 0;
  const overrun = session > 0 && total > session;
  const pointCount =
    mode === 'simple'
      ? selected.size +
        agendaItems.filter((i) => !/^\[pw:/.test((i.notes ?? '').trim())).length
      : agendaItems.length;

  const submitAdd = async () => {
    const title = draftTitle.trim();
    if (!title || !editable) return;
    setAdding(true);
    try {
      await onAddAgendaItem(title, 10);
      setDraftTitle('');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div ref={agendaListRef as Ref<HTMLDivElement>}>
      <div className="prepare-workspace__mid-h">
        <div>
          <div className="flex items-center gap-2 text-[17px] font-extrabold tracking-tight text-foreground">
            <ListOrdered className="size-4 text-muted-foreground" aria-hidden />
            Ordre du jour
          </div>
          <p
            ref={durationCounterRef as Ref<HTMLParagraphElement>}
            className="mt-1 text-xs font-semibold text-muted-foreground"
          >
            {pointCount} point{pointCount > 1 ? 's' : ''} ·{' '}
            <b className={overrun ? 'text-[color:var(--state-warning)]' : 'text-foreground'}>
              {formatDurationMinutesFr(total)}
            </b>
            {session > 0 ? ` / ${formatDurationMinutesFr(session)}` : null}
            {overrun ? (
              <span className="text-[color:var(--state-warning)]">
                {' '}
                · {formatDurationMinutesFr(total - session)} de trop
              </span>
            ) : null}
          </p>
        </div>
        <button
          type="button"
          className="min-h-11 shrink-0 text-xs font-bold text-[color:var(--brand-gold-700)] underline-offset-2 hover:underline"
          onClick={() =>
            onModeChange(mode === 'simple' ? 'sections' : 'simple')
          }
        >
          {mode === 'simple' ? 'Organiser par sections' : 'Vue simple'}
        </button>
      </div>

      {mode === 'simple' ? (
        <div className="flex flex-col gap-1.5" role="list" aria-label="Blocs standards">
          {blocks.map((b, idx) => {
            const on = selected.has(b.id);
            return (
              <div
                key={b.id}
                role="listitem"
                className={`prepare-workspace__blk${on ? '' : ' prepare-workspace__blk--off'}`}
              >
                <button
                  type="button"
                  className="inline-flex size-11 items-center justify-center"
                  aria-pressed={on}
                  aria-label={`${on ? 'Retirer' : 'Inclure'} ${b.title}`}
                  disabled={!editable}
                  onClick={() => onToggleBlock(b.id)}
                >
                  <span
                    className={`inline-flex size-[18px] items-center justify-center rounded-[5px] border-[1.5px] ${
                      on
                        ? 'border-[color:var(--brand-ink)] bg-[color:var(--brand-ink)] text-white'
                        : 'border-border bg-card'
                    }`}
                  >
                    {on ? <Check className="size-2.5" aria-hidden /> : null}
                  </span>
                </button>
                <span className="w-5 shrink-0 text-center text-xs font-bold text-muted-foreground tabular-nums">
                  {on ? idx + 1 : '–'}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="prepare-workspace__blk-title text-[13.5px] font-bold text-foreground">
                    {b.title}
                  </div>
                </div>
                {on ? (
                  <span className="shrink-0 text-xs font-extrabold tabular-nums text-foreground">
                    {b.defaultMin}{' '}
                    <span className="font-bold text-muted-foreground">min</span>
                  </span>
                ) : (
                  <span className="text-[11.5px] font-bold text-muted-foreground">
                    retiré
                  </span>
                )}
              </div>
            );
          })}

          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <Input
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              placeholder="Ajouter un point spécifique…"
              className="min-h-11 flex-1"
              disabled={!editable || adding}
              aria-label="Titre du point spécifique"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void submitAdd();
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              className="min-h-11 gap-1.5"
              disabled={!editable || adding || !draftTitle.trim()}
              onClick={() => void submitAdd()}
            >
              <Plus className="size-4" aria-hidden />
              Ajouter
            </Button>
          </div>

          {agendaItems.filter((i) => !/^\[pw:/.test((i.notes ?? '').trim()))
            .length > 0 ? (
            <ul className="mt-3 space-y-1" aria-label="Points spécifiques">
              {agendaItems
                .filter((i) => !/^\[pw:/.test((i.notes ?? '').trim()))
                .map((item, i) => (
                  <AgendaRow
                    key={item.id}
                    index={i + 1}
                    item={item}
                    editable={editable}
                    onUpdateDuration={onUpdateDuration}
                    onDelete={onDeleteAgendaItem}
                  />
                ))}
            </ul>
          ) : null}
        </div>
      ) : (
        <div className="space-y-2">
          {agendaItems.length === 0 ? (
            <div className="prepare-workspace__empty">
              Aucun point — cochez des blocs en vue simple ou ajoutez un sujet
            </div>
          ) : (
            <ul className="space-y-1" aria-label="Ordre du jour">
              {agendaItems.map((item, i) => (
                <AgendaRow
                  key={item.id}
                  index={i + 1}
                  item={item}
                  editable={editable}
                  onUpdateDuration={onUpdateDuration}
                  onDelete={onDeleteAgendaItem}
                />
              ))}
            </ul>
          )}
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <Input
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              placeholder="Ajouter un point…"
              className="min-h-11 flex-1"
              disabled={!editable || adding}
              aria-label="Titre du point"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void submitAdd();
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              className="min-h-11 gap-1.5"
              disabled={!editable || adding || !draftTitle.trim()}
              onClick={() => void submitAdd()}
            >
              <Plus className="size-4" aria-hidden />
              Ajouter
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function AgendaRow({
  index,
  item,
  editable,
  onUpdateDuration,
  onDelete,
}: {
  index: number;
  item: ProjectReviewAgendaItemApi;
  editable: boolean;
  onUpdateDuration: (itemId: string, minutes: number) => Promise<void>;
  onDelete: (itemId: string) => Promise<void>;
}) {
  const [dur, setDur] = useState(
    String(item.plannedDurationMinutes ?? 10),
  );

  return (
    <li className="prepare-workspace__odj-row">
      <GripVertical
        className="size-3.5 shrink-0 text-muted-foreground/50"
        aria-hidden
      />
      <span className="w-5 shrink-0 text-center text-xs font-bold tabular-nums text-muted-foreground">
        {index}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-bold text-foreground">
          {displayLabel(item.title, 'Point sans titre')}
        </div>
      </div>
      <Input
        type="number"
        min={0}
        value={dur}
        disabled={!editable}
        aria-label={`Durée de ${displayLabel(item.title, 'ce point')} en minutes`}
        className="h-9 w-14 px-1 text-right text-xs font-extrabold tabular-nums"
        onChange={(e) => setDur(e.target.value)}
        onBlur={() => {
          const n = Number.parseInt(dur, 10);
          if (!Number.isFinite(n) || n < 0) return;
          if (n === (item.plannedDurationMinutes ?? 0)) return;
          void onUpdateDuration(item.id, n);
        }}
      />
      <span className="text-[11px] font-bold text-muted-foreground">min</span>
      {editable ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9 shrink-0"
          aria-label={`Supprimer ${displayLabel(item.title, 'le point')}`}
          onClick={() => void onDelete(item.id)}
        >
          <X className="size-3.5" aria-hidden />
        </Button>
      ) : null}
    </li>
  );
}
