'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  CloudSun,
  Eye,
  ListTodo,
  Mail,
  RotateCcw,
  ShieldAlert,
  Target,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { KpiCard } from '@/components/ui/kpi-card';
import { displayLabel } from '@/lib/display-label';
import { toast } from '@/lib/toast';
import { PROJECT_REVIEW_TYPE_LABEL } from '../constants/project-enum-labels';
import { projectPointsTab } from '../constants/project-routes';
import { useProjectReviewMutations } from '../hooks/use-project-review-mutations';
import { committeeMoodDisplay } from '../lib/project-committee-mood-display';
import { canPreviewOrSendReviewReport } from '../lib/project-review-status';
import { readPostMortemPayload } from '../lib/project-post-mortem-payload';
import { formatProjectDateLong } from '../lib/projects-list-display';
import type { ProjectReviewDetail, ProjectReviewType } from '../types/project.types';
import { ReviewReportPreviewDialog } from './review-report-preview-dialog';

const SNAPSHOT_UNAVAILABLE = 'Snapshot indisponible — point antérieur à la version 2';

const POST_MORTEM_TEXT: Array<[string, string]> = [
  ['objectifs', 'Objectifs'],
  ['resultats', 'Résultats'],
  ['ecarts', 'Écarts'],
  ['causes', 'Causes'],
  ['leconsApprises', 'Leçons apprises'],
  ['recommandations', 'Recommandations'],
];

const INDICATEUR_LABEL: Record<string, string> = {
  budget: 'Budget',
  delais: 'Délais',
  qualite: 'Qualité',
  communication: 'Communication',
  pilotageRisques: 'Pilotage des risques',
};

const ATTENDANCE_LABEL: Record<string, string> = {
  PRESENT: 'Présent',
  EXPECTED: 'Attendu',
  ABSENT: 'Absent',
};

type SnapshotAgendaItem = {
  title?: string;
  notes?: string | null;
  decisionSummary?: string | null;
  decisions?: Array<{ title?: string }>;
  actionItems?: Array<{ id?: string; title?: string }>;
};

type SnapshotParticipant = {
  displayName?: string | null;
  attendanceStatus?: string | null;
  roleLabel?: string | null;
};

type SnapshotView = {
  schemaVersion: 2;
  review: {
    type?: string;
    title?: string | null;
    objective?: string | null;
    committeeMood?: string | null;
  };
  participants: SnapshotParticipant[];
  agenda: SnapshotAgendaItem[];
  decisions: Array<{ title?: string; agendaItemTitle?: string | null }>;
  actions: Array<{ id?: string; title?: string }>;
  nextSteps?: string | null;
  progress: { globalProgress?: number | null };
  tasks: { open?: number; inProgress?: number; done?: number; late?: number };
  risks: { open?: number; monitored?: number; mitigated?: number; closed?: number };
};

function parseSnapshotV2(raw: unknown): SnapshotView | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  if (row.schemaVersion !== 2) return null;
  const review = row.review;
  if (!review || typeof review !== 'object') return null;
  return {
    schemaVersion: 2,
    review: review as SnapshotView['review'],
    participants: Array.isArray(row.participants) ? row.participants : [],
    agenda: Array.isArray(row.agenda) ? (row.agenda as SnapshotAgendaItem[]) : [],
    decisions: Array.isArray(row.decisions) ? row.decisions : [],
    actions: Array.isArray(row.actions) ? row.actions : [],
    nextSteps: typeof row.nextSteps === 'string' ? row.nextSteps : null,
    progress:
      row.progress && typeof row.progress === 'object'
        ? (row.progress as SnapshotView['progress'])
        : {},
    tasks:
      row.tasks && typeof row.tasks === 'object'
        ? (row.tasks as SnapshotView['tasks'])
        : {},
    risks:
      row.risks && typeof row.risks === 'object'
        ? (row.risks as SnapshotView['risks'])
        : {},
  };
}

function formatWhen(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const label = formatProjectDateLong(iso);
  return label === '—' ? null : label;
}

export function ProjectReviewDocumentView({
  projectId,
  review,
  canEdit,
}: {
  projectId: string;
  review: ProjectReviewDetail;
  canEdit: boolean;
}) {
  const router = useRouter();
  const { reportPreview, sendReport, reopen } = useProjectReviewMutations(projectId);
  const snapshot = parseSnapshotV2(review.snapshotPayload);
  const typeLabel =
    PROJECT_REVIEW_TYPE_LABEL[review.reviewType as ProjectReviewType] ?? 'Point projet';
  const title = review.title?.trim() || typeLabel;
  const frozenOn = formatWhen(review.finalizedAt);
  const cancelledOn = formatWhen(review.cancelledAt);
  const banner = frozenOn
    ? `Figé le ${frozenOn} — données au moment du point`
    : cancelledOn
      ? `Annulé le ${cancelledOn}`
      : null;
  const datedSuffix = frozenOn
    ? `au ${frozenOn}`
    : cancelledOn
      ? `au ${cancelledOn}`
      : null;

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<{
    subject: string;
    title: string;
    text: string;
    html: string;
  } | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const canReport = canPreviewOrSendReviewReport(review.status);

  const onPreview = async () => {
    setPreviewOpen(true);
    setPreviewData(null);
    setPreviewError(null);
    try {
      const preview = await reportPreview.mutateAsync(review.id);
      setPreviewData(preview);
    } catch {
      setPreviewError('Impossible de générer la prévisualisation du compte rendu.');
    }
  };

  const onSend = async () => {
    try {
      const result = await sendReport.mutateAsync(review.id);
      toast.success(
        result.emailed > 0
          ? `Compte rendu envoyé — ${result.emailed} e-mail(s) envoyé(s).`
          : 'Compte rendu envoyé.',
      );
    } catch {
      toast.error('Impossible d’envoyer le compte rendu.');
    }
  };

  const onReopen = async () => {
    try {
      await reopen.mutateAsync(review.id);
      toast.success('Point rouvert — vous pouvez reprendre la préparation.');
    } catch {
      toast.error('Impossible de rouvrir le point.');
    }
  };

  return (
    <article className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-border/70 px-4 py-3">
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          onClick={() => router.push(projectPointsTab(projectId))}
        >
          Retour aux points
        </Button>
        {canReport ? (
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            onClick={() => void onPreview()}
            disabled={reportPreview.isPending}
          >
            <Eye aria-hidden />
            {reportPreview.isPending ? 'Aperçu…' : 'Prévisualiser'}
          </Button>
        ) : null}
        {canReport && canEdit ? (
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            onClick={() => void onSend()}
            disabled={sendReport.isPending}
          >
            <Mail aria-hidden />
            {sendReport.isPending ? 'Envoi…' : 'Envoyer le compte rendu'}
          </Button>
        ) : null}
        {review.status === 'CANCELLED' && canEdit ? (
          <Button
            type="button"
            className="min-h-11"
            onClick={() => void onReopen()}
            disabled={reopen.isPending}
          >
            <RotateCcw aria-hidden />
            {reopen.isPending ? 'Réouverture…' : 'Réouvrir'}
          </Button>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
        <p className="starium-overline">{typeLabel}</p>
        <h1 className="mt-1 text-xl font-semibold text-foreground sm:text-2xl">{title}</h1>
        {banner ? (
          <p className="mt-3 text-sm text-muted-foreground" aria-live="polite">
            {banner}
          </p>
        ) : null}

        {!snapshot ? (
          <Alert variant="destructive" className="mt-6">
            <AlertTriangle aria-hidden />
            <AlertDescription>{SNAPSHOT_UNAVAILABLE}</AlertDescription>
          </Alert>
        ) : (
          <DocumentBody
            review={review}
            snapshot={snapshot}
            datedSuffix={datedSuffix}
          />
        )}
      </div>

      <ReviewReportPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        loading={reportPreview.isPending}
        error={previewError}
        preview={previewData}
      />
    </article>
  );
}

function DocumentBody({
  review,
  snapshot,
  datedSuffix,
}: {
  review: ProjectReviewDetail;
  snapshot: SnapshotView;
  datedSuffix: string | null;
}) {
  const moodKey = snapshot.review.committeeMood;
  const moodDisplay = committeeMoodDisplay(
    moodKey === 'GREEN' || moodKey === 'ORANGE' || moodKey === 'RED'
      ? moodKey
      : null,
  );
  const moodLabel = moodDisplay?.label ?? 'Non renseignée';
  const progress = snapshot.progress.globalProgress;
  const horsDecisions = snapshot.decisions.filter((d) => !d.agendaItemTitle);
  const agendaActionIds = new Set(
    snapshot.agenda.flatMap((item) => (item.actionItems ?? []).map((a) => a.id).filter(Boolean)),
  );
  const horsActions = snapshot.actions.filter((a) => !a.id || !agendaActionIds.has(a.id));
  const postMortem =
    review.reviewType === 'POST_MORTEM' ? readPostMortemPayload(review.contentPayload) : null;
  const postMortemLines = postMortem
    ? POST_MORTEM_TEXT.filter(([key]) => {
        const value = postMortem[key as keyof typeof postMortem];
        return typeof value === 'string' && value.trim();
      })
    : [];
  const indicateurLines = postMortem
    ? Object.entries(postMortem.indicateurs).filter(([, score]) => score != null)
    : [];

  let presentCount = 0;
  let expectedCount = 0;
  let absentCount = 0;
  for (const p of snapshot.participants) {
    const status = p.attendanceStatus ?? 'EXPECTED';
    if (status === 'PRESENT') presentCount += 1;
    else if (status === 'ABSENT') absentCount += 1;
    else expectedCount += 1;
  }

  return (
    <div className="mt-6 space-y-8">
      <section className="starium-module" aria-labelledby="doc-indicateurs">
        <h2 id="doc-indicateurs" className="text-base font-semibold text-foreground">
          Indicateurs
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            variant="dense"
            title="Avancement"
            value={progress != null ? `${progress} %` : '—'}
            footer={datedSuffix ?? undefined}
            icon={<Target className="size-4" aria-hidden />}
          />
          <KpiCard
            variant="dense"
            title="Tâches ouvertes"
            value={String(snapshot.tasks.open ?? 0)}
            footer={`${snapshot.tasks.inProgress ?? 0} en cours · ${snapshot.tasks.done ?? 0} terminées`}
            icon={<ListTodo className="size-4" aria-hidden />}
          />
          <KpiCard
            variant="dense"
            title="Risques ouverts"
            value={String(snapshot.risks.open ?? 0)}
            footer={`${snapshot.risks.monitored ?? 0} surveillés · ${snapshot.risks.closed ?? 0} clôturés`}
            icon={<ShieldAlert className="size-4" aria-hidden />}
          />
          <KpiCard
            variant="dense"
            title="Météo du comité"
            value={moodLabel}
            icon={<CloudSun className="size-4" aria-hidden />}
          />
        </div>
      </section>

      <section aria-labelledby="doc-presence">
        <h2 id="doc-presence" className="text-base font-semibold text-foreground">
          Présence
        </h2>
        {snapshot.participants.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Aucun participant enregistré</p>
        ) : (
          <>
            <p className="mt-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground tabular-nums">{presentCount}</span>{' '}
              présents ·{' '}
              <span className="font-medium text-foreground tabular-nums">{expectedCount}</span>{' '}
              attendus ·{' '}
              <span className="font-medium text-foreground tabular-nums">{absentCount}</span>{' '}
              absents
            </p>
            <ul className="mt-3 space-y-2">
              {snapshot.participants.map((p, i) => {
                const name = displayLabel(p.displayName, 'Participant');
                const status = p.attendanceStatus ?? 'EXPECTED';
                const statusLabel =
                  ATTENDANCE_LABEL[status] ?? ATTENDANCE_LABEL.EXPECTED;
                return (
                  <li
                    key={`${name}-${i}`}
                    className="flex min-h-11 flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm"
                  >
                    <span className="font-medium text-foreground">{name}</span>
                    <span className="text-muted-foreground">
                      {p.roleLabel?.trim()
                        ? `${displayLabel(p.roleLabel, 'Rôle')} · ${statusLabel}`
                        : statusLabel}
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>

      {snapshot.review.objective?.trim() ? (
        <section aria-labelledby="doc-objectif">
          <h2 id="doc-objectif" className="text-base font-semibold text-foreground">
            Objectif du point
          </h2>
          <p className="mt-2 text-sm text-foreground">{snapshot.review.objective.trim()}</p>
        </section>
      ) : null}

      <section aria-labelledby="doc-odj">
        <h2 id="doc-odj" className="text-base font-semibold text-foreground">
          Ordre du jour
        </h2>
        {snapshot.agenda.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Aucun sujet à l’ordre du jour</p>
        ) : (
          <ol className="mt-2 space-y-3 text-sm text-foreground">
            {snapshot.agenda.map((item, index) => (
              <li key={`${item.title ?? 'sujet'}-${index}`}>
                <p className="font-medium">{item.title?.trim() || 'Sujet'}</p>
                {item.notes?.trim() ? <p className="mt-1">Notes : {item.notes.trim()}</p> : null}
                {item.decisionSummary?.trim() ? (
                  <p className="mt-1">Synthèse : {item.decisionSummary.trim()}</p>
                ) : null}
                {(item.decisions?.length ?? 0) > 0 ? (
                  <p className="mt-1">
                    Décisions : {item.decisions!.map((d) => d.title?.trim() || 'Décision').join(' · ')}
                  </p>
                ) : null}
                {(item.actionItems?.length ?? 0) > 0 ? (
                  <p className="mt-1">
                    Actions : {item.actionItems!.map((a) => a.title?.trim() || 'Action').join(' · ')}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </section>

      <section aria-labelledby="doc-decisions">
        <h2 id="doc-decisions" className="text-base font-semibold text-foreground">
          Décisions hors ordre du jour
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {horsDecisions.length === 0
            ? snapshot.agenda.some((item) => (item.decisions?.length ?? 0) > 0)
              ? 'Aucune décision hors ordre du jour'
              : 'Aucune décision enregistrée'
            : horsDecisions.map((d) => d.title?.trim() || 'Décision').join(' · ')}
        </p>
      </section>

      <section aria-labelledby="doc-actions">
        <h2 id="doc-actions" className="text-base font-semibold text-foreground">
          Actions hors ordre du jour
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {horsActions.length === 0
            ? snapshot.agenda.some((item) => (item.actionItems?.length ?? 0) > 0)
              ? 'Aucune action hors ordre du jour'
              : 'Aucune action enregistrée'
            : horsActions.map((a) => a.title?.trim() || 'Action').join(' · ')}
        </p>
      </section>

      {snapshot.nextSteps ? (
        <section aria-labelledby="doc-next">
          <h2 id="doc-next" className="text-base font-semibold text-foreground">
            Prochain point
          </h2>
          <p className="mt-2 text-sm text-foreground">{formatProjectDateLong(snapshot.nextSteps)}</p>
        </section>
      ) : null}

      {postMortem && (postMortemLines.length > 0 || indicateurLines.length > 0) ? (
        <section aria-labelledby="doc-retex">
          <h2 id="doc-retex" className="text-base font-semibold text-foreground">
            Retour d’expérience
          </h2>
          <dl className="mt-2 space-y-2 text-sm text-foreground">
            {postMortemLines.map(([key, label]) => (
              <div key={key}>
                <dt className="font-medium">{label}</dt>
                <dd>{String(postMortem[key as keyof typeof postMortem])}</dd>
              </div>
            ))}
            {indicateurLines.map(([key, score]) => (
              <div key={key}>
                <dt className="font-medium">{INDICATEUR_LABEL[key] ?? 'Indicateur'}</dt>
                <dd>{score} / 5</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}
    </div>
  );
}
