'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  FileText,
  Flag,
  ListChecks,
  Paperclip,
  Scale,
  TriangleAlert,
} from 'lucide-react';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingState } from '@/components/feedback/loading-state';
import { displayLabel, firstDisplayLabel } from '@/lib/display-label';
import { toast } from '@/lib/toast';
import { PROJECT_REVIEW_AGENDA_ITEM_TYPE_LABEL } from '../constants/project-enum-labels';
import { useProjectAssignableUsers } from '../hooks/use-project-assignable-users';
import { useProjectMilestonesQuery } from '../hooks/use-project-milestones-query';
import { useProjectRisksQuery } from '../hooks/use-project-risks-query';
import { useProjectReviewMutations } from '../hooks/use-project-review-mutations';
import type {
  ProjectReviewAgendaItemApi,
  ProjectReviewAgendaItemType,
  ProjectReviewAttachmentApi,
  ProjectReviewDetail,
} from '../types/project.types';
import { ReviewAgendaAddAttachmentModal } from './review-agenda-point-modals';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  detail: ProjectReviewDetail;
  agendaItem: ProjectReviewAgendaItemApi | null;
  canEdit: boolean;
  pointIndex: number | null;
};

function appendLine(base: string, line: string): string {
  const t = base.trim();
  return t ? `${t}\n${line}` : line;
}

export function PrepareWorkspacePointDialog({
  open,
  onOpenChange,
  projectId,
  detail,
  agendaItem,
  canEdit,
  pointIndex,
}: Props) {
  const { updateAgendaItem } = useProjectReviewMutations(projectId);
  const usersQuery = useProjectAssignableUsers({ enabled: open });
  const risksQuery = useProjectRisksQuery(projectId, { enabled: open });
  const milestonesQuery = useProjectMilestonesQuery(projectId, {
    enabled: open,
  });

  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState('10');
  const [itemType, setItemType] =
    useState<ProjectReviewAgendaItemApi['itemType']>('INFORMATION');
  const [ownerUserId, setOwnerUserId] = useState<string | null>(null);
  const [objective, setObjective] = useState('');
  const [expectedDecision, setExpectedDecision] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);

  useEffect(() => {
    if (!open || !agendaItem) return;
    setTitle(agendaItem.title ?? '');
    setDuration(String(agendaItem.plannedDurationMinutes ?? 10));
    setItemType(agendaItem.itemType);
    setOwnerUserId(agendaItem.ownerUserId);
    setObjective(agendaItem.objective ?? '');
    setExpectedDecision(agendaItem.expectedDecision ?? '');
    setDescription(agendaItem.description ?? '');
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

  const typeOptions = Object.entries(PROJECT_REVIEW_AGENDA_ITEM_TYPE_LABEL) as Array<
    [ProjectReviewAgendaItemType, string]
  >;

  const save = async () => {
    if (!agendaItem || !canEdit) return;
    const mins = Number.parseInt(duration, 10);
    setSaving(true);
    try {
      await updateAgendaItem.mutateAsync({
        reviewId: detail.id,
        agendaItemId: agendaItem.id,
        body: {
          title: title.trim() || 'Point sans titre',
          plannedDurationMinutes: Number.isFinite(mins) && mins >= 0 ? mins : 10,
          itemType,
          ownerUserId,
          objective: objective.trim() || null,
          expectedDecision: expectedDecision.trim() || null,
          description: description.trim() || null,
        },
      });
      toast.success('Point mis à jour');
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: unknown }).message)
          : 'Enregistrement impossible',
      );
    } finally {
      setSaving(false);
    }
  };

  const pinToDescription = (line: string) => {
    setDescription((prev) => appendLine(prev, line));
    toast.message('Ajouté au contexte du point');
  };

  if (!agendaItem) return null;

  return (
    <>
      <StariumModal
        open={open}
        onOpenChange={onOpenChange}
        title={
          pointIndex != null
            ? `Point n° ${pointIndex} — préparation`
            : 'Préparation du point'
        }
        description={displayLabel(agendaItem.title, 'Point sans titre')}
        icon={ListChecks}
        size="xl"
        contentClassName="max-h-[min(92dvh,880px)]"
        bodyClassName="overflow-y-auto starium-scroll"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              className="min-h-11 sm:min-h-9"
              onClick={() => onOpenChange(false)}
            >
              Fermer
            </Button>
            {canEdit ? (
              <Button
                type="button"
                className="min-h-11 sm:min-h-9"
                disabled={saving}
                onClick={() => void save()}
              >
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            ) : null}
          </>
        }
      >
        <div className="starium-form space-y-5">
          <section className="space-y-3" aria-labelledby="pw-point-meta">
            <h3 id="pw-point-meta" className="starium-modal-seg-title">
              Conduite du point
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="pw-point-title">Intitulé</Label>
                <Input
                  id="pw-point-title"
                  value={title}
                  disabled={!canEdit}
                  onChange={(e) => setTitle(e.target.value)}
                  className="min-h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pw-point-dur">Durée (min)</Label>
                <Input
                  id="pw-point-dur"
                  type="number"
                  min={0}
                  value={duration}
                  disabled={!canEdit}
                  onChange={(e) => setDuration(e.target.value)}
                  className="min-h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pw-point-type">Type</Label>
                <Select
                  value={itemType}
                  disabled={!canEdit}
                  onValueChange={(v) =>
                    setItemType(v as ProjectReviewAgendaItemApi['itemType'])
                  }
                >
                  <SelectTrigger id="pw-point-type" className="min-h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {typeOptions.map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="pw-point-owner">Responsable du point</Label>
                <Select
                  value={ownerUserId || null}
                  disabled={!canEdit || usersQuery.isLoading}
                  onValueChange={(v) => setOwnerUserId(v || null)}
                >
                  <SelectTrigger id="pw-point-owner" className="min-h-11">
                    <SelectValue placeholder="Choisir un responsable…" />
                  </SelectTrigger>
                  <SelectContent>
                    {(usersQuery.data?.users ?? []).map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {firstDisplayLabel(
                          [
                            [u.firstName, u.lastName].filter(Boolean).join(' '),
                            u.email,
                          ],
                          'Utilisateur',
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="pw-point-obj">Objectif / infos</Label>
                <Textarea
                  id="pw-point-obj"
                  value={objective}
                  disabled={!canEdit}
                  onChange={(e) => setObjective(e.target.value)}
                  rows={3}
                  className="min-h-[5.5rem]"
                />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="pw-point-dec">Question / décision attendue</Label>
                <Textarea
                  id="pw-point-dec"
                  value={expectedDecision}
                  disabled={!canEdit}
                  onChange={(e) => setExpectedDecision(e.target.value)}
                  rows={2}
                  className="min-h-[4.5rem]"
                />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="pw-point-desc">Contexte & notes de préparation</Label>
                <Textarea
                  id="pw-point-desc"
                  value={description}
                  disabled={!canEdit}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="min-h-[6rem]"
                />
              </div>
            </div>
          </section>

          <section className="space-y-3" aria-labelledby="pw-point-files">
            <div className="flex items-center justify-between gap-2">
              <h3 id="pw-point-files" className="starium-modal-seg-title mb-0">
                <FileText className="mr-1.5 inline size-3.5" aria-hidden />
                Supports ({attachments.length})
              </h3>
              {canEdit ? (
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 gap-1.5"
                  onClick={() => setAttachOpen(true)}
                >
                  <Paperclip className="size-4" aria-hidden />
                  Ajouter
                </Button>
              ) : null}
            </div>
            {attachments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun fichier ou lien rattaché à ce point.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {attachments.map((a) => (
                  <AttachmentRow key={a.id} attachment={a} />
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-3" aria-labelledby="pw-point-ctx">
            <h3 id="pw-point-ctx" className="starium-modal-seg-title">
              Éléments Starium à préparer
            </h3>
            <p className="text-sm text-muted-foreground">
              Cliquez pour épingler un élément dans le contexte du point (préparation).
            </p>

            {risksQuery.isLoading || milestonesQuery.isLoading ? (
              <LoadingState rows={3} />
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                <ContextPickList
                  title={`Risques ouverts (${openRisks.length})`}
                  icon={TriangleAlert}
                  empty="Aucun risque ouvert"
                  items={openRisks.map((r) => ({
                    id: r.id,
                    label: displayLabel(r.title, 'Risque'),
                    onPick: () =>
                      pinToDescription(
                        `Risque : ${displayLabel(r.title, 'Risque')}`,
                      ),
                  }))}
                  disabled={!canEdit}
                />
                <ContextPickList
                  title={`Jalons ouverts (${openMilestones.length})`}
                  icon={Flag}
                  empty="Aucun jalon ouvert"
                  items={openMilestones.map((m) => ({
                    id: m.id,
                    label: displayLabel(m.name, 'Jalon'),
                    onPick: () =>
                      pinToDescription(
                        `Jalon : ${displayLabel(m.name, 'Jalon')}`,
                      ),
                  }))}
                  disabled={!canEdit}
                />
                <ContextPickList
                  title={`Actions du point (${openActions.length})`}
                  icon={ListChecks}
                  empty="Aucune action ouverte sur cette instance"
                  items={openActions.map((a) => ({
                    id: a.id,
                    label: displayLabel(a.title, 'Action'),
                    onPick: () =>
                      pinToDescription(
                        `Action : ${displayLabel(a.title, 'Action')}`,
                      ),
                  }))}
                  disabled={!canEdit}
                />
                <ContextPickList
                  title={`Décisions (${openDecisions.length})`}
                  icon={Scale}
                  empty="Aucune décision ouverte sur cette instance"
                  items={openDecisions.map((d) => ({
                    id: d.id,
                    label: displayLabel(d.title, 'Décision'),
                    onPick: () =>
                      pinToDescription(
                        `Décision : ${displayLabel(d.title, 'Décision')}`,
                      ),
                  }))}
                  disabled={!canEdit}
                />
              </div>
            )}
          </section>
        </div>
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
  const label = displayLabel(attachment.title, 'Pièce jointe');
  return (
    <li className="flex min-h-11 items-center gap-2 rounded-lg border border-border/70 bg-muted/15 px-3 text-sm">
      <Paperclip className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="min-w-0 truncate font-medium text-foreground underline-offset-2 hover:underline"
        >
          {label}
        </a>
      ) : (
        <span className="min-w-0 truncate font-medium text-foreground">
          {label}
        </span>
      )}
    </li>
  );
}

function ContextPickList({
  title,
  icon: Icon,
  empty,
  items,
  disabled,
}: {
  title: string;
  icon: typeof TriangleAlert;
  empty: string;
  items: Array<{ id: string; label: string; onPick: () => void }>;
  disabled: boolean;
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-card p-3">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3.5" aria-hidden />
        {title}
      </p>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="max-h-40 space-y-1 overflow-y-auto starium-scroll">
          {items.slice(0, 12).map((item) => (
            <li key={item.id}>
              <button
                type="button"
                disabled={disabled}
                onClick={item.onPick}
                className="flex min-h-11 w-full items-center rounded-md px-2 text-left text-sm font-medium text-foreground hover:bg-muted/40 disabled:opacity-50"
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
