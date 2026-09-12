'use client';

import { useMemo, useState, type ReactNode, type Ref } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  GripVertical,
  ListOrdered,
  Pencil,
  Plus,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StariumScrollArea } from '@/components/layout/starium-scroll-area';
import { displayLabel } from '@/lib/display-label';
import {
  formatDurationMinutesFr,
  sumAgendaPlannedMinutes,
} from '../lib/project-review-prepare-guards';
import type { PrepStdBlock } from '../lib/prepare-workspace-blocks';
import {
  parsePwBlockIdFromNotes,
  type PrepWorkspaceMode,
} from '../lib/prepare-workspace-types';
import type { ProjectReviewAgendaItemApi } from '../types/project.types';

export type PrepareOdjPointTarget =
  | { kind: 'block'; blockId: string; index: number }
  | { kind: 'agenda'; agendaItemId: string; index: number };

export type PrepareOdjMeta = {
  participantCount: number;
  openActionsCount: number;
  openArbitrationCount: number;
  openRisksCount: number;
  goal: string;
  onGoalChange: (goal: string) => void;
  /** Meta dynamique bloc « Le planning » (frise + résumé). */
  planningMeta?: ReactNode;
};

type Props = {
  mode: PrepWorkspaceMode;
  onModeChange: (mode: PrepWorkspaceMode) => void;
  blocks: PrepStdBlock[];
  selectedBlockIds: string[];
  onToggleBlock: (blockId: string) => void;
  onReorderSelectedBlocks: (orderedIds: string[]) => void;
  onReorderAgendaItems: (orderedIds: string[]) => Promise<void>;
  onOpenPoint: (target: PrepareOdjPointTarget) => void;
  onBlockDurationChange: (blockId: string, minutes: number) => void;
  blockDurations: Record<string, number>;
  agendaItems: ProjectReviewAgendaItemApi[];
  sessionDurationMinutes: number | null;
  canEdit: boolean;
  agendaLocked: boolean;
  meta: PrepareOdjMeta;
  onAddAgendaItem: (title: string, minutes: number) => Promise<void>;
  onUpdateDuration: (itemId: string, minutes: number) => Promise<void>;
  onDeleteAgendaItem: (itemId: string) => Promise<void>;
  agendaListRef?: Ref<HTMLElement>;
  durationCounterRef?: Ref<HTMLElement>;
};

function isPwItem(item: ProjectReviewAgendaItemApi): boolean {
  return Boolean(parsePwBlockIdFromNotes(item.notes));
}

function blockMeta(
  blockId: string,
  meta: PrepareOdjMeta,
): ReactNode {
  switch (blockId) {
    case 'presents':
      return (
        <span>
          {meta.participantCount} participant
          {meta.participantCount > 1 ? 's' : ''} convoqué
          {meta.participantCount > 1 ? 's' : ''}
        </span>
      );
    case 'objectif':
      return null;
    case 'tour':
      return <span>Chaque participant, 1 minute</span>;
    case 'actions':
      return (
        <span>
          {meta.openActionsCount} action
          {meta.openActionsCount > 1 ? 's' : ''} en cours · historique des
          séances précédentes
        </span>
      );
    case 'avancement':
      return <span>Revue d’avancement du projet</span>;
    case 'planning':
      return meta.planningMeta ?? (
        <span>Jalons et macro-planning à présenter</span>
      );
    case 'arbitrage':
      return meta.openArbitrationCount > 0 ? (
        <span>
          {meta.openArbitrationCount} point
          {meta.openArbitrationCount > 1 ? 's' : ''} à trancher
        </span>
      ) : (
        <span>Rien en attente</span>
      );
    default:
      return null;
  }
}

export function PrepareWorkspaceOdj({
  mode,
  onModeChange,
  blocks,
  selectedBlockIds,
  onToggleBlock,
  onReorderSelectedBlocks,
  onReorderAgendaItems,
  onOpenPoint,
  onBlockDurationChange,
  blockDurations,
  agendaItems,
  sessionDurationMinutes,
  canEdit,
  agendaLocked,
  meta,
  onAddAgendaItem,
  onUpdateDuration,
  onDeleteAgendaItem,
  agendaListRef,
  durationCounterRef,
}: Props) {
  const [draftTitle, setDraftTitle] = useState('');
  const [adding, setAdding] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const editable = canEdit && !agendaLocked;

  const selected = new Set(selectedBlockIds);
  const orderedSelectedBlocks = useMemo(() => {
    const byId = new Map(blocks.map((b) => [b.id, b]));
    const ordered: PrepStdBlock[] = [];
    for (const id of selectedBlockIds) {
      const b = byId.get(id);
      if (b) ordered.push(b);
    }
    for (const b of blocks) {
      if (!selected.has(b.id)) ordered.push(b);
    }
    return ordered;
  }, [blocks, selected, selectedBlockIds]);

  const customItems = useMemo(
    () => agendaItems.filter((i) => !isPwItem(i)),
    [agendaItems],
  );

  const sortedAgenda = useMemo(
    () => [...agendaItems].sort((a, b) => a.orderIndex - b.orderIndex),
    [agendaItems],
  );

  const blockMinutes = orderedSelectedBlocks
    .filter((b) => selected.has(b.id))
    .reduce(
      (s, b) => s + (blockDurations[b.id] ?? b.defaultMin),
      0,
    );
  const agendaMinutes = sumAgendaPlannedMinutes(agendaItems);
  const total =
    mode === 'simple'
      ? blockMinutes +
        customItems.reduce(
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
      ? selected.size + customItems.length
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

  const moveSelected = (blockId: string, delta: number) => {
    const ids = selectedBlockIds.filter((id) => selected.has(id));
    const index = ids.indexOf(blockId);
    if (index < 0) return;
    const next = index + delta;
    if (next < 0 || next >= ids.length) return;
    const copy = [...ids];
    const [removed] = copy.splice(index, 1);
    copy.splice(next, 0, removed!);
    onReorderSelectedBlocks(copy);
  };

  const moveAgenda = async (itemId: string, delta: number) => {
    const ids = sortedAgenda.map((i) => i.id);
    const index = ids.indexOf(itemId);
    if (index < 0) return;
    const next = index + delta;
    if (next < 0 || next >= ids.length) return;
    const copy = [...ids];
    const [removed] = copy.splice(index, 1);
    copy.splice(next, 0, removed!);
    await onReorderAgendaItems(copy);
  };

  const onDropSelected = (targetId: string) => {
    if (!dragId || dragId === targetId) {
      setDragId(null);
      return;
    }
    if (!selected.has(dragId) || !selected.has(targetId)) {
      setDragId(null);
      return;
    }
    const ids = selectedBlockIds.filter((id) => selected.has(id));
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) {
      setDragId(null);
      return;
    }
    const copy = [...ids];
    const [removed] = copy.splice(from, 1);
    copy.splice(to, 0, removed!);
    onReorderSelectedBlocks(copy);
    setDragId(null);
  };

  const onDropAgenda = async (targetId: string) => {
    if (!dragId || dragId === targetId) {
      setDragId(null);
      return;
    }
    const ids = sortedAgenda.map((i) => i.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) {
      setDragId(null);
      return;
    }
    const copy = [...ids];
    const [removed] = copy.splice(from, 1);
    copy.splice(to, 0, removed!);
    await onReorderAgendaItems(copy);
    setDragId(null);
  };

  let selectedIndex = 0;

  const addRow = (
    <div className="prepare-workspace__addrow prepare-workspace__addrow--dock">
      <Input
        value={draftTitle}
        onChange={(e) => setDraftTitle(e.target.value)}
        placeholder={
          mode === 'simple'
            ? 'Ajouter un point spécifique…'
            : 'Ajouter un point…'
        }
        className="min-h-11 flex-1 sm:min-h-9"
        disabled={!editable || adding}
        aria-label={
          mode === 'simple' ? 'Titre du point spécifique' : 'Titre du point'
        }
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
        className="min-h-11 gap-1.5 sm:min-h-9"
        disabled={!editable || adding || !draftTitle.trim()}
        onClick={() => void submitAdd()}
      >
        <Plus className="size-3.5" aria-hidden />
        Ajouter
      </Button>
    </div>
  );

  return (
    <div
      ref={agendaListRef as Ref<HTMLDivElement>}
      className="prepare-workspace__odj"
    >
      <div className="prepare-workspace__mid-h">
        <div>
          <div className="prepare-workspace__mid-t">
            <ListOrdered className="size-4" aria-hidden />
            Ordre du jour
          </div>
          <p
            ref={durationCounterRef as Ref<HTMLParagraphElement>}
            className="prepare-workspace__mid-m"
          >
            {pointCount} point{pointCount > 1 ? 's' : ''} ·{' '}
            <b className={overrun ? 'is-over' : undefined}>
              {formatDurationMinutesFr(total)}
            </b>
            {session > 0 ? ` / ${formatDurationMinutesFr(session)}` : null}
            {overrun ? (
              <span className="is-over">
                {' '}
                · {formatDurationMinutesFr(total - session)} de trop
              </span>
            ) : null}
          </p>
        </div>
        <button
          type="button"
          className="prepare-workspace__modesw"
          onClick={() =>
            onModeChange(mode === 'simple' ? 'sections' : 'simple')
          }
        >
          {mode === 'simple' ? 'Organiser par sections' : 'Vue simple'}
        </button>
      </div>

      <StariumScrollArea
        className="prepare-workspace__odj-scroll min-h-0 w-full flex-1"
        viewportClassName="prepare-workspace__odj-viewport"
        reveal="hover"
      >
        {mode === 'simple' ? (
          <div
            className="prepare-workspace__simple"
            role="list"
            aria-label="Blocs standards"
          >
            {orderedSelectedBlocks.map((b) => {
              const on = selected.has(b.id);
              const index = on ? ++selectedIndex : null;
              const dur = blockDurations[b.id] ?? b.defaultMin;
              return (
                <div
                  key={b.id}
                  role="listitem"
                  draggable={editable && on}
                  onDragStart={() => {
                    if (editable && on) setDragId(b.id);
                  }}
                  onDragOver={(e) => {
                    if (editable && on) e.preventDefault();
                  }}
                  onDrop={() => onDropSelected(b.id)}
                  className={`prepare-workspace__item${on ? '' : ' is-off'}${dragId === b.id ? ' is-dragging' : ''}`}
                >
                  <div className="prepare-workspace__item-row">
                    <span
                      className="prepare-workspace__grip"
                      aria-hidden
                      title="Glisser pour déplacer"
                    >
                      <GripVertical className="size-3.5" />
                    </span>

                    <button
                      type="button"
                      className={`prepare-workspace__chk${on ? ' is-on' : ''}`}
                      aria-pressed={on}
                      aria-label={`${on ? 'Retirer' : 'Inclure'} ${b.title}`}
                      disabled={!editable}
                      onClick={() => onToggleBlock(b.id)}
                    >
                      {on ? <Check className="size-2.5" aria-hidden /> : null}
                    </button>

                    {on && index != null ? (
                      <button
                        type="button"
                        className="prepare-workspace__num"
                        aria-label={`Préparer le point n° ${index} — ${b.title}`}
                        onClick={() =>
                          onOpenPoint({ kind: 'block', blockId: b.id, index })
                        }
                      >
                        {index}
                      </button>
                    ) : (
                      <span
                        className="prepare-workspace__num is-empty"
                        aria-hidden
                      >
                        –
                      </span>
                    )}

                    <div
                      className="prepare-workspace__item-body"
                      role={on && b.id !== 'objectif' ? 'button' : undefined}
                      tabIndex={on && b.id !== 'objectif' ? 0 : undefined}
                      onClick={() => {
                        if (on && index != null && b.id !== 'objectif') {
                          onOpenPoint({ kind: 'block', blockId: b.id, index });
                        }
                      }}
                      onKeyDown={(e) => {
                        if (
                          on &&
                          index != null &&
                          b.id !== 'objectif' &&
                          (e.key === 'Enter' || e.key === ' ')
                        ) {
                          e.preventDefault();
                          onOpenPoint({ kind: 'block', blockId: b.id, index });
                        }
                      }}
                    >
                      <div className="prepare-workspace__item-t">{b.title}</div>
                      {on && b.id === 'objectif' ? (
                        <div className="prepare-workspace__item-m">
                          <Input
                            value={meta.goal}
                            disabled={!editable}
                            placeholder="En une phrase, ce que la séance doit produire…"
                            className="prepare-workspace__goal"
                            aria-label="Objectif de la séance"
                            onChange={(e) => meta.onGoalChange(e.target.value)}
                          />
                        </div>
                      ) : on ? (
                        <div className="prepare-workspace__item-m">
                          {blockMeta(b.id, meta)}
                        </div>
                      ) : null}
                    </div>

                    {on ? (
                      <div className="prepare-workspace__dur-wrap">
                        <Input
                          type="number"
                          min={0}
                          value={dur}
                          disabled={!editable}
                          aria-label={`Durée de ${b.title} en minutes`}
                          className="prepare-workspace__dur"
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            const n = Number.parseInt(e.target.value, 10);
                            if (!Number.isFinite(n) || n < 0) return;
                            onBlockDurationChange(b.id, n);
                          }}
                        />
                        <span className="prepare-workspace__dur-u">min</span>
                      </div>
                    ) : (
                      <span className="prepare-workspace__off-l">retiré</span>
                    )}

                    {on && editable ? (
                      <span className="prepare-workspace__updn">
                        <button
                          type="button"
                          aria-label={`Monter ${b.title}`}
                          disabled={index === 1}
                          onClick={() => moveSelected(b.id, -1)}
                        >
                          <ChevronUp className="size-2.5" aria-hidden />
                        </button>
                        <button
                          type="button"
                          aria-label={`Descendre ${b.title}`}
                          disabled={index === selected.size}
                          onClick={() => moveSelected(b.id, 1)}
                        >
                          <ChevronDown className="size-2.5" aria-hidden />
                        </button>
                      </span>
                    ) : null}

                    {on ? (
                      <button
                        type="button"
                        className="prepare-workspace__caret"
                        aria-label={`Compléter ${b.title}`}
                        onClick={() => {
                          if (index != null) {
                            onOpenPoint({ kind: 'block', blockId: b.id, index });
                          }
                        }}
                      >
                        <Pencil className="size-3.5" aria-hidden />
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}

            {customItems.length > 0 ? (
              <ul className="mt-2 space-y-0" aria-label="Points spécifiques">
                {customItems.map((item, i) => (
                  <AgendaLiteRow
                    key={item.id}
                    index={selected.size + i + 1}
                    item={item}
                    editable={editable}
                    canMoveUp={i > 0}
                    canMoveDown={i < customItems.length - 1}
                    onMove={(delta) => void moveAgenda(item.id, delta)}
                    onDragStart={() => setDragId(item.id)}
                    onDrop={() => void onDropAgenda(item.id)}
                    dragging={dragId === item.id}
                    onOpenPoint={() =>
                      onOpenPoint({
                        kind: 'agenda',
                        agendaItemId: item.id,
                        index: selected.size + i + 1,
                      })
                    }
                    onUpdateDuration={onUpdateDuration}
                    onDelete={onDeleteAgendaItem}
                  />
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <div className="space-y-2">
            {sortedAgenda.length === 0 ? (
              <div className="prepare-workspace__empty">
                Aucun point — cochez des blocs en vue simple ou ajoutez un sujet
              </div>
            ) : (
              <ul className="space-y-0" aria-label="Ordre du jour">
                {sortedAgenda.map((item, i) => (
                  <AgendaLiteRow
                    key={item.id}
                    index={i + 1}
                    item={item}
                    editable={editable}
                    canMoveUp={i > 0}
                    canMoveDown={i < sortedAgenda.length - 1}
                    onMove={(delta) => void moveAgenda(item.id, delta)}
                    onDragStart={() => setDragId(item.id)}
                    onDrop={() => void onDropAgenda(item.id)}
                    dragging={dragId === item.id}
                    onOpenPoint={() =>
                      onOpenPoint({
                        kind: 'agenda',
                        agendaItemId: item.id,
                        index: i + 1,
                      })
                    }
                    onUpdateDuration={onUpdateDuration}
                    onDelete={onDeleteAgendaItem}
                  />
                ))}
              </ul>
            )}
          </div>
        )}
      </StariumScrollArea>

      {addRow}
    </div>
  );
}

function AgendaLiteRow({
  index,
  item,
  editable,
  canMoveUp,
  canMoveDown,
  onMove,
  onDragStart,
  onDrop,
  dragging,
  onOpenPoint,
  onUpdateDuration,
  onDelete,
}: {
  index: number;
  item: ProjectReviewAgendaItemApi;
  editable: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (delta: number) => void;
  onDragStart: () => void;
  onDrop: () => void;
  dragging: boolean;
  onOpenPoint: () => void;
  onUpdateDuration: (itemId: string, minutes: number) => Promise<void>;
  onDelete: (itemId: string) => Promise<void>;
}) {
  const [dur, setDur] = useState(String(item.plannedDurationMinutes ?? 10));

  return (
    <li
      className={`prepare-workspace__item${dragging ? ' is-dragging' : ''}`}
      draggable={editable}
      onDragStart={onDragStart}
      onDragOver={(e) => {
        if (editable) e.preventDefault();
      }}
      onDrop={onDrop}
    >
      <div className="prepare-workspace__item-row">
        <span className="prepare-workspace__grip" aria-hidden>
          <GripVertical className="size-3.5" />
        </span>
        <span className="prepare-workspace__chk is-on" aria-hidden>
          <Check className="size-2.5" />
        </span>
        <button
          type="button"
          className="prepare-workspace__num"
          aria-label={`Préparer le point n° ${index}`}
          onClick={onOpenPoint}
        >
          {index}
        </button>
        <div
          role={editable ? 'button' : undefined}
          tabIndex={editable ? 0 : undefined}
          className="prepare-workspace__item-body"
          onClick={onOpenPoint}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onOpenPoint();
            }
          }}
        >
          <div className="prepare-workspace__item-t">
            {displayLabel(item.title, 'Point sans titre')}
          </div>
        </div>
        <div className="prepare-workspace__dur-wrap">
          <Input
            type="number"
            min={0}
            value={dur}
            disabled={!editable}
            aria-label={`Durée de ${displayLabel(item.title, 'ce point')} en minutes`}
            className="prepare-workspace__dur"
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setDur(e.target.value)}
            onBlur={() => {
              const n = Number.parseInt(dur, 10);
              if (!Number.isFinite(n) || n < 0) return;
              if (n === (item.plannedDurationMinutes ?? 0)) return;
              void onUpdateDuration(item.id, n);
            }}
          />
          <span className="prepare-workspace__dur-u">min</span>
        </div>
        {editable ? (
          <span className="prepare-workspace__updn">
            <button
              type="button"
              aria-label={`Monter le point ${index}`}
              disabled={!canMoveUp}
              onClick={() => onMove(-1)}
            >
              <ChevronUp className="size-2.5" aria-hidden />
            </button>
            <button
              type="button"
              aria-label={`Descendre le point ${index}`}
              disabled={!canMoveDown}
              onClick={() => onMove(1)}
            >
              <ChevronDown className="size-2.5" aria-hidden />
            </button>
          </span>
        ) : null}
        <button
          type="button"
          className="prepare-workspace__caret"
          aria-label={`Compléter le point ${index}`}
          onClick={onOpenPoint}
        >
          <Pencil className="size-3.5" aria-hidden />
        </button>
        {editable ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 text-muted-foreground"
            aria-label={`Supprimer ${displayLabel(item.title, 'le point')}`}
            onClick={() => void onDelete(item.id)}
          >
            <X className="size-3.5" aria-hidden />
          </Button>
        ) : null}
      </div>
    </li>
  );
}
