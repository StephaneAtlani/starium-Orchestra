'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Flag,
  GanttChart,
  Link2,
  ListChecks,
  Paperclip,
  Scale,
  TriangleAlert,
  Wallet,
  X,
} from 'lucide-react';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { StariumScrollArea } from '@/components/layout/starium-scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { LoadingState } from '@/components/feedback/loading-state';
import { displayLabel, firstDisplayLabel } from '@/lib/display-label';
import { toast } from '@/lib/toast';
import type { ProjectGanttPayload } from '../api/projects.api';
import { useProjectMilestonesQuery } from '../hooks/use-project-milestones-query';
import { useProjectRisksQuery } from '../hooks/use-project-risks-query';
import { useProjectReviewMutations } from '../hooks/use-project-review-mutations';
import {
  parsePwBlockIdFromNotes,
  type PrepPlanningPayload,
} from '../lib/prepare-workspace-types';
import type {
  ProjectReviewAgendaItemApi,
  ProjectReviewAttachmentApi,
  ProjectReviewDetail,
} from '../types/project.types';
import { ReviewAgendaAddAttachmentModal } from './review-agenda-point-modals';
import { PrepareWorkspacePlanningPanel } from './prepare-workspace-planning-panel';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  detail: ProjectReviewDetail;
  agendaItem: ProjectReviewAgendaItemApi | null;
  canEdit: boolean;
  pointIndex: number | null;
  planning?: PrepPlanningPayload;
  onPlanningChange?: (next: PrepPlanningPayload) => void;
  gantt?: ProjectGanttPayload;
  ganttLoading?: boolean;
  ganttError?: boolean;
};

type RefCat =
  | 'actions'
  | 'jalons'
  | 'risks'
  | 'decisions'
  | 'arbs'
  | 'budget';

type LinkedItem = {
  key: string;
  cat: RefCat;
  label: string;
  sub?: string;
};

const REF_CATS: Array<{
  id: RefCat;
  label: string;
  prefix: string;
}> = [
  { id: 'actions', label: 'Action', prefix: 'Action : ' },
  { id: 'jalons', label: 'Jalon', prefix: 'Jalon : ' },
  { id: 'risks', label: 'Risque', prefix: 'Risque : ' },
  { id: 'decisions', label: 'Décision', prefix: 'Décision : ' },
  { id: 'arbs', label: 'Arbitrage', prefix: 'Arbitrage : ' },
  { id: 'budget', label: 'Budget', prefix: 'Budget : ' },
];

function parseLinkedFromDescription(description: string): LinkedItem[] {
  const out: LinkedItem[] = [];
  for (const raw of description.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    for (const cat of REF_CATS) {
      if (!line.toLowerCase().startsWith(cat.prefix.toLowerCase())) continue;
      const label = line.slice(cat.prefix.length).trim();
      if (!label) break;
      out.push({
        key: `${cat.id}:${label.toLowerCase()}`,
        cat: cat.id,
        label,
      });
      break;
    }
  }
  return out;
}

function stripLinkedLines(description: string): string {
  return description
    .split(/\r?\n/)
    .filter((raw) => {
      const line = raw.trim();
      if (!line) return true;
      return !REF_CATS.some((c) =>
        line.toLowerCase().startsWith(c.prefix.toLowerCase()),
      );
    })
    .join('\n')
    .replace(/^\n+|\n+$/g, '');
}

function composeDescription(note: string, linked: LinkedItem[]): string {
  const notePart = note.trim();
  const linkLines = linked.map((it) => {
    const cat = REF_CATS.find((c) => c.id === it.cat)!;
    return `${cat.prefix}${it.label}`;
  });
  return [notePart, ...linkLines].filter(Boolean).join('\n');
}

function catIcon(cat: RefCat) {
  switch (cat) {
    case 'actions':
      return ListChecks;
    case 'jalons':
      return Flag;
    case 'risks':
      return TriangleAlert;
    case 'decisions':
    case 'arbs':
      return Scale;
    case 'budget':
      return Wallet;
    default:
      return Paperclip;
  }
}

export function PrepareWorkspacePointDialog({
  open,
  onOpenChange,
  projectId,
  detail,
  agendaItem,
  canEdit,
  pointIndex,
  planning,
  onPlanningChange,
  gantt,
  ganttLoading = false,
  ganttError = false,
}: Props) {
  const { updateAgendaItem } = useProjectReviewMutations(projectId);
  const risksQuery = useProjectRisksQuery(projectId, { enabled: open });
  const milestonesQuery = useProjectMilestonesQuery(projectId, {
    enabled: open,
  });

  const [note, setNote] = useState('');
  const [linked, setLinked] = useState<LinkedItem[]>([]);
  const [pickCat, setPickCat] = useState<RefCat | null>(null);
  const [linkDraft, setLinkDraft] = useState('');
  const [attachOpen, setAttachOpen] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noteRef = useRef(note);
  const linkedRef = useRef(linked);
  noteRef.current = note;
  linkedRef.current = linked;

  useEffect(() => {
    if (!open || !agendaItem) return;
    const desc = agendaItem.description ?? '';
    setLinked(parseLinkedFromDescription(desc));
    setNote(stripLinkedLines(desc));
    setPickCat(null);
    setLinkDraft('');
    setSavedAt(null);
  }, [open, agendaItem]);

  const attachments = useMemo(
    () =>
      (detail.attachments ?? []).filter(
        (a) => a.agendaItemId && agendaItem && a.agendaItemId === agendaItem.id,
      ),
    [detail.attachments, agendaItem],
  );

  const openRisks = useMemo(
    () =>
      (risksQuery.data ?? []).filter((r) => {
        const s = (r.status ?? '').toUpperCase();
        return s !== 'CLOSED' && s !== 'MITIGATED' && s !== 'ACCEPTED';
      }),
    [risksQuery.data],
  );

  const openMilestones = useMemo(
    () =>
      (milestonesQuery.data?.items ?? []).filter((m) => {
        const s = (m.status ?? '').toUpperCase();
        return s !== 'DONE' && s !== 'CANCELLED' && s !== 'COMPLETED';
      }),
    [milestonesQuery.data],
  );

  const openActions = useMemo(
    () =>
      (detail.actionItems ?? []).filter((a) => {
        const s = (a.status ?? '').toUpperCase();
        return s !== 'DONE' && s !== 'CANCELLED' && s !== 'CLOSED';
      }),
    [detail.actionItems],
  );

  const openDecisions = useMemo(
    () =>
      (detail.decisions ?? []).filter((d) => {
        const s = (d.status ?? '').toUpperCase();
        return s !== 'REJECTED' && s !== 'SUPERSEDED';
      }),
    [detail.decisions],
  );

  const openArbitrations = useMemo(
    () =>
      (detail.agendaItems ?? []).filter(
        (item) =>
          item.itemType === 'ARBITRATION' && !(item.decisionSummary?.trim()),
      ),
    [detail.agendaItems],
  );

  const persist = useCallback(
    async (nextNote: string, nextLinked: LinkedItem[]) => {
      if (!agendaItem || !canEdit) return;
      setSaving(true);
      try {
        await updateAgendaItem.mutateAsync({
          reviewId: detail.id,
          agendaItemId: agendaItem.id,
          body: {
            description: composeDescription(nextNote, nextLinked) || null,
          },
        });
        setSavedAt(new Date());
      } catch (err) {
        toast.error(
          err && typeof err === 'object' && 'message' in err
            ? String((err as { message?: unknown }).message)
            : 'Enregistrement impossible',
        );
      } finally {
        setSaving(false);
      }
    },
    [agendaItem, canEdit, detail.id, updateAgendaItem],
  );

  const schedulePersist = useCallback(
    (nextNote: string, nextLinked: LinkedItem[]) => {
      if (!canEdit) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void persist(nextNote, nextLinked);
      }, 450);
    },
    [canEdit, persist],
  );

  const onNoteChange = (value: string) => {
    setNote(value);
    schedulePersist(value, linkedRef.current);
  };

  const addLinked = useCallback(
    (item: LinkedItem) => {
      if (linkedRef.current.some((l) => l.key === item.key)) {
        setPickCat(null);
        return;
      }
      const next = [...linkedRef.current, item];
      setLinked(next);
      setPickCat(null);
      schedulePersist(noteRef.current, next);
    },
    [schedulePersist],
  );

  const removeLinked = useCallback(
    (key: string) => {
      const next = linkedRef.current.filter((l) => l.key !== key);
      setLinked(next);
      schedulePersist(noteRef.current, next);
    },
    [schedulePersist],
  );

  const addLinkUrl = () => {
    let v = linkDraft.trim();
    if (!v) return;
    if (!/^https?:\/\//i.test(v)) v = `https://${v}`;
    let host = v;
    try {
      host = new URL(v).hostname.replace(/^www\./, '');
    } catch {
      /* keep raw */
    }
    const line = `Lien : ${host} — ${v}`;
    const nextNote = noteRef.current.trim()
      ? `${noteRef.current.trim()}\n${line}`
      : line;
    setNote(nextNote);
    setLinkDraft('');
    schedulePersist(nextNote, linkedRef.current);
  };

  const pickerItems = useMemo(() => {
    if (!pickCat) return [] as Array<{
      key: string;
      label: string;
      sub?: string;
      item: LinkedItem | null;
    }>;
    switch (pickCat) {
      case 'actions':
        return openActions.map((a) => {
          const label = displayLabel(a.title, 'Action');
          return {
            key: `actions:${a.id}`,
            label,
            sub: undefined,
            item: {
              key: `actions:${label.toLowerCase()}`,
              cat: 'actions' as const,
              label,
            },
          };
        });
      case 'jalons':
        return openMilestones.map((m) => {
          const label = displayLabel(m.name, 'Jalon');
          return {
            key: `jalons:${m.id}`,
            label,
            sub: m.targetDate
              ? `Échéance ${m.targetDate.slice(0, 10)}`
              : undefined,
            item: {
              key: `jalons:${label.toLowerCase()}`,
              cat: 'jalons' as const,
              label,
            },
          };
        });
      case 'risks':
        return openRisks.map((r) => {
          const label = displayLabel(r.title, 'Risque');
          return {
            key: `risks:${r.id}`,
            label,
            sub: undefined,
            item: {
              key: `risks:${label.toLowerCase()}`,
              cat: 'risks' as const,
              label,
            },
          };
        });
      case 'decisions':
        return openDecisions.map((d) => {
          const label = displayLabel(d.title, 'Décision');
          return {
            key: `decisions:${d.id}`,
            label,
            sub: undefined as string | undefined,
            item: {
              key: `decisions:${label.toLowerCase()}`,
              cat: 'decisions' as const,
              label,
            },
          };
        });
      case 'arbs':
        return openArbitrations.map((item) => {
          const label = displayLabel(item.title, 'Arbitrage');
          return {
            key: `arbs:${item.id}`,
            label,
            sub: undefined as string | undefined,
            item: {
              key: `arbs:${label.toLowerCase()}`,
              cat: 'arbs' as const,
              label,
            },
          };
        });
      case 'budget':
        return [
          {
            key: 'budget:placeholder',
            label: 'Lignes budget du projet',
            sub: 'À lier depuis le module Budget (prochain lot)',
            item: null,
          },
        ];
      default:
        return [];
    }
  }, [
    pickCat,
    openActions,
    openMilestones,
    openRisks,
    openDecisions,
    openArbitrations,
  ]);

  const linkedCount = linked.length + (note.trim() ? 1 : 0) + attachments.length;
  const subtitleParts: string[] = [];
  if (linkedCount > 0) {
    subtitleParts.push(
      `${linkedCount} élément${linkedCount > 1 ? 's' : ''} lié${linkedCount > 1 ? 's' : ''}`,
    );
  }
  if (savedAt) {
    subtitleParts.push(
      `Enregistré à ${savedAt.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      })}`,
    );
  } else if (saving) {
    subtitleParts.push('Enregistrement…');
  } else {
    subtitleParts.push('Enregistrement automatique');
  }
  if (pointIndex != null) {
    subtitleParts.unshift(`Point n° ${pointIndex}`);
  }

  const close = async () => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
      if (canEdit && agendaItem) {
        await persist(noteRef.current, linkedRef.current);
      }
    }
    onOpenChange(false);
  };

  if (!agendaItem) return null;

  const blockId = parsePwBlockIdFromNotes(agendaItem.notes);
  const isPlanning = blockId === 'planning' && !!planning && !!onPlanningChange;

  const planningSubtitle = (() => {
    if (!isPlanning || !planning) return '';
    const n = planning.selectedMilestoneIds.length;
    const parts = [
      `${n} jalon${n > 1 ? 's' : ''} présenté${n > 1 ? 's' : ''} en séance`,
    ];
    if (pointIndex != null) parts.unshift(`Point n° ${pointIndex}`);
    parts.push('Enregistrement automatique');
    return parts.join(' · ');
  })();

  return (
    <>
      <StariumModal
        open={open}
        onOpenChange={(next) => {
          if (!next) void close();
          else onOpenChange(next);
        }}
        title={displayLabel(agendaItem.title, 'Point sans titre')}
        description={isPlanning ? planningSubtitle : subtitleParts.join(' · ')}
        icon={isPlanning ? GanttChart : Paperclip}
        size={isPlanning ? 'xl' : 'lg'}
        overlayClassName="!z-[100] bg-black/55 dark:bg-black/70"
        contentClassName={`!z-[101] ${isPlanning ? 'sm:max-w-[min(960px,94vw)] max-h-[min(92dvh,860px)] h-[min(92dvh,860px)]' : 'sm:max-w-[620px] max-h-[min(92dvh,720px)]'}`}
        bodyClassName="!overflow-hidden flex min-h-0 flex-1 flex-col !p-0"
        footer={
          <Button
            type="button"
            className="min-h-11 sm:min-h-9"
            onClick={() => void close()}
          >
            Terminé
          </Button>
        }
      >
        <StariumScrollArea
          className="min-h-0 h-full w-full flex-1"
          viewportClassName="px-[var(--ds-modal-pad-x,1.25rem)] py-3 sm:px-5"
          reveal="hover"
        >
        {isPlanning && planning && onPlanningChange ? (
          <PrepareWorkspacePlanningPanel
            gantt={gantt}
            loading={ganttLoading}
            error={ganttError}
            value={planning}
            canEdit={canEdit}
            onChange={onPlanningChange}
          />
        ) : (
        <div className="prepare-point">
          <p className="prepare-point__grp">Informations</p>
          <Textarea
            value={note}
            disabled={!canEdit}
            onChange={(e) => onNoteChange(e.target.value)}
            placeholder="Contexte, ce qu’il faut dire ou montrer…"
            rows={4}
            className="prepare-point__note"
            aria-label="Informations du point"
          />

          <p className="prepare-point__grp">Pièces jointes</p>
          <div className="prepare-point__bar">
            {canEdit ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="prepare-point__chip-btn min-h-9 gap-1.5"
                onClick={() => setAttachOpen(true)}
              >
                <Paperclip className="size-3" aria-hidden />
                Ajouter un fichier
              </Button>
            ) : null}
            <div className="prepare-point__lnk">
              <Link2 className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
              <Input
                value={linkDraft}
                disabled={!canEdit}
                placeholder="Coller un lien…"
                className="min-h-9 h-9 flex-1"
                aria-label="Lien à rattacher"
                onChange={(e) => setLinkDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addLinkUrl();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-9 shrink-0"
                disabled={!canEdit || !linkDraft.trim()}
                onClick={addLinkUrl}
              >
                Lier
              </Button>
            </div>
          </div>
          {attachments.length > 0 ? (
            <ul className="prepare-point__list" aria-label="Fichiers du point">
              {attachments.map((a) => (
                <AttachmentRow key={a.id} attachment={a} />
              ))}
            </ul>
          ) : null}

          <p className="prepare-point__grp">Éléments du projet</p>
          <div className="prepare-point__bar" role="group" aria-label="Catégories">
            {REF_CATS.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`prepare-point__chip${pickCat === c.id ? ' is-on' : ''}`}
                aria-pressed={pickCat === c.id}
                disabled={!canEdit}
                onClick={() =>
                  setPickCat((prev) => (prev === c.id ? null : c.id))
                }
              >
                {c.label}
              </button>
            ))}
          </div>

          {pickCat ? (
            risksQuery.isLoading || milestonesQuery.isLoading ? (
              <LoadingState rows={3} />
            ) : (
              <div className="prepare-point__pick" role="listbox" aria-label="Sélection">
                {pickerItems.length === 0 ? (
                  <p className="prepare-point__empty">
                    Rien à lier dans cette catégorie
                  </p>
                ) : (
                  pickerItems.map((it) => (
                    <button
                      key={it.key}
                      type="button"
                      role="option"
                      className="prepare-point__pick-it"
                      disabled={!canEdit || !it.item}
                      onClick={() => {
                        if (it.item) addLinked(it.item);
                      }}
                    >
                      <span className="prepare-point__pick-t">{it.label}</span>
                      {it.sub ? (
                        <span className="prepare-point__pick-s">{it.sub}</span>
                      ) : null}
                    </button>
                  ))
                )}
              </div>
            )
          ) : null}

          {linked.length > 0 ? (
            <>
              <p className="prepare-point__grp">Lié à ce point</p>
              <ul className="prepare-point__list">
                {linked.map((it) => {
                  const Icon = catIcon(it.cat);
                  return (
                    <li key={it.key} className="prepare-point__it">
                      <span className="prepare-point__ic is-ref" aria-hidden>
                        <Icon className="size-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="prepare-point__it-t">{it.label}</div>
                        {it.sub ? (
                          <div className="prepare-point__it-s">{it.sub}</div>
                        ) : null}
                      </div>
                      {canEdit ? (
                        <button
                          type="button"
                          className="prepare-point__x"
                          aria-label={`Retirer ${it.label}`}
                          onClick={() => removeLinked(it.key)}
                        >
                          <X className="size-3.5" aria-hidden />
                        </button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </>
          ) : null}
        </div>
        )}
        </StariumScrollArea>
      </StariumModal>

      <ReviewAgendaAddAttachmentModal
        open={attachOpen}
        onOpenChange={setAttachOpen}
        projectId={projectId}
        reviewId={detail.id}
        agendaPoint={{
          id: agendaItem.id,
          title: displayLabel(agendaItem.title, 'Point'),
          itemType: agendaItem.itemType,
          expectedDecision: agendaItem.expectedDecision,
          decisionSummary: agendaItem.decisionSummary,
        }}
      />
    </>
  );
}

function AttachmentRow({
  attachment,
}: {
  attachment: ProjectReviewAttachmentApi;
}) {
  const href = attachment.url?.trim() || null;
  const label = firstDisplayLabel(
    [attachment.title, attachment.fileName],
    'Pièce jointe',
  );
  return (
    <li className="prepare-point__it">
      <span className="prepare-point__ic" aria-hidden>
        <Paperclip className="size-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="prepare-point__it-t underline-offset-2 hover:underline"
          >
            {label}
          </a>
        ) : (
          <div className="prepare-point__it-t">{label}</div>
        )}
      </div>
    </li>
  );
}
