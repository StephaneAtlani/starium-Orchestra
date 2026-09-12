'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/feedback/loading-state';
import { displayLabel, firstDisplayLabel } from '@/lib/display-label';
import { useProjectMilestonesQuery } from '../hooks/use-project-milestones-query';
import { useProjectRisksQuery } from '../hooks/use-project-risks-query';
import type {
  ProjectReviewActionItemApi,
  ProjectReviewDecisionApi,
  ProjectReviewDetail,
} from '../types/project.types';

export type RepriseTab = 'decisions' | 'actions' | 'risks' | 'jalons';

type Props = {
  projectId: string;
  previousDetail: ProjectReviewDetail | null | undefined;
  previousLoading: boolean;
  previousError: boolean;
  canEdit: boolean;
  agendaLocked: boolean;
  resumedTitles: string[];
  onAddToOdj: (input: {
    title: string;
    itemType: string;
    description?: string | null;
  }) => Promise<void>;
};

const TABS: Array<{ id: RepriseTab; label: string }> = [
  { id: 'decisions', label: 'Décisions' },
  { id: 'actions', label: 'Actions' },
  { id: 'risks', label: 'Risques' },
  { id: 'jalons', label: 'Jalons' },
];

function isOpenAction(a: ProjectReviewActionItemApi): boolean {
  const s = (a.status ?? '').toUpperCase();
  return s !== 'DONE' && s !== 'CANCELLED' && s !== 'CLOSED';
}

function isOpenDecision(d: ProjectReviewDecisionApi): boolean {
  const s = (d.status ?? '').toUpperCase();
  return s !== 'REJECTED' && s !== 'SUPERSEDED';
}

export function PrepareWorkspaceReprise({
  projectId,
  previousDetail,
  previousLoading,
  previousError,
  canEdit,
  agendaLocked,
  resumedTitles,
  onAddToOdj,
}: Props) {
  const [tab, setTab] = useState<RepriseTab>('decisions');
  const [busyId, setBusyId] = useState<string | null>(null);

  const risksQuery = useProjectRisksQuery(projectId, {
    enabled: tab === 'risks',
  });
  const milestonesQuery = useProjectMilestonesQuery(projectId, {
    enabled: tab === 'jalons',
  });

  const resumed = useMemo(
    () => new Set(resumedTitles.map((t) => t.trim().toLowerCase())),
    [resumedTitles],
  );

  const decisions = (previousDetail?.decisions ?? []).filter(isOpenDecision);
  const actions = (previousDetail?.actionItems ?? []).filter(isOpenAction);
  const risks = (risksQuery.data ?? []).filter((r) => {
    const s = (r.status ?? '').toUpperCase();
    return s !== 'CLOSED' && s !== 'MITIGATED';
  });
  const jalons = (milestonesQuery.data?.items ?? []).filter((m) => {
    const s = (m.status ?? '').toUpperCase();
    return s !== 'DONE' && s !== 'CANCELLED' && s !== 'COMPLETED';
  });

  const counts: Record<RepriseTab, number> = {
    decisions: decisions.length,
    actions: actions.length,
    risks: risks.length,
    jalons: jalons.length,
  };
  const openTotal =
    counts.decisions + counts.actions + counts.risks + counts.jalons;

  const editable = canEdit && !agendaLocked;

  const add = async (
    id: string,
    title: string,
    itemType: string,
    description?: string | null,
  ) => {
    if (!editable || resumed.has(title.trim().toLowerCase())) return;
    setBusyId(id);
    try {
      await onAddToOdj({ title, itemType, description });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-extrabold text-foreground">À reprendre</h3>
        <span className="text-[11.5px] font-semibold text-muted-foreground">
          {openTotal} élément{openTotal > 1 ? 's' : ''} en attente
        </span>
      </div>

      <div
        className="prepare-workspace__tabs"
        role="tablist"
        aria-label="Sources à reprendre"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className="prepare-workspace__tab"
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {counts[t.id] > 0 ? (
              <span className="tabular-nums opacity-80">{counts[t.id]}</span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto" role="tabpanel">
        {tab === 'decisions' || tab === 'actions' ? (
          previousLoading ? (
            <LoadingState rows={3} />
          ) : previousError ? (
            <div className="prepare-workspace__empty" role="alert">
              Impossible de charger la séance précédente
            </div>
          ) : !previousDetail ? (
            <div className="prepare-workspace__empty">
              Première séance — rien à reprendre
            </div>
          ) : tab === 'decisions' ? (
            decisions.length === 0 ? (
              <div className="prepare-workspace__empty">Aucune décision ouverte</div>
            ) : (
              decisions.map((d) => (
                <SrcRow
                  key={d.id}
                  title={displayLabel(d.title, 'Décision')}
                  meta={firstDisplayLabel(
                    [d.impact, d.description],
                    'Décision précédente',
                  )}
                  already={resumed.has(
                    displayLabel(d.title, 'Décision').trim().toLowerCase(),
                  )}
                  busy={busyId === d.id}
                  editable={editable}
                  onAdd={() =>
                    void add(
                      d.id,
                      `Décision — ${displayLabel(d.title, 'Décision')}`,
                      'DECISION',
                      d.description,
                    )
                  }
                />
              ))
            )
          ) : actions.length === 0 ? (
            <div className="prepare-workspace__empty">Aucune action ouverte</div>
          ) : (
            actions.map((a) => (
              <SrcRow
                key={a.id}
                title={displayLabel(a.title, 'Action')}
                meta={firstDisplayLabel(
                  [a.description],
                  'Action précédente',
                )}
                already={resumed.has(
                  displayLabel(a.title, 'Action').trim().toLowerCase(),
                )}
                busy={busyId === a.id}
                editable={editable}
                onAdd={() =>
                  void add(
                    a.id,
                    displayLabel(a.title, 'Action'),
                    'ACTION_REVIEW',
                    a.description,
                  )
                }
              />
            ))
          )
        ) : null}

        {tab === 'risks' ? (
          risksQuery.isLoading ? (
            <LoadingState rows={3} />
          ) : risksQuery.isError ? (
            <div className="prepare-workspace__empty" role="alert">
              Impossible de charger les risques
            </div>
          ) : risks.length === 0 ? (
            <div className="prepare-workspace__empty">Aucun risque ouvert</div>
          ) : (
            risks.map((r) => (
              <SrcRow
                key={r.id}
                title={displayLabel(r.title, 'Risque')}
                meta={firstDisplayLabel(
                  [r.criticalityLevel, r.code],
                  'Risque projet',
                )}
                already={resumed.has(
                  displayLabel(r.title, 'Risque').trim().toLowerCase(),
                )}
                busy={busyId === r.id}
                editable={editable}
                onAdd={() =>
                  void add(
                    r.id,
                    `Risque — ${displayLabel(r.title, 'Risque')}`,
                    'RISK',
                    r.description,
                  )
                }
              />
            ))
          )
        ) : null}

        {tab === 'jalons' ? (
          milestonesQuery.isLoading ? (
            <LoadingState rows={3} />
          ) : milestonesQuery.isError ? (
            <div className="prepare-workspace__empty" role="alert">
              Impossible de charger les jalons
            </div>
          ) : jalons.length === 0 ? (
            <div className="prepare-workspace__empty">Aucun jalon ouvert</div>
          ) : (
            jalons.map((m) => (
              <SrcRow
                key={m.id}
                title={displayLabel(m.name, 'Jalon')}
                meta={firstDisplayLabel(
                  [m.status, m.targetDate],
                  'Jalon projet',
                )}
                already={resumed.has(
                  displayLabel(m.name, 'Jalon').trim().toLowerCase(),
                )}
                busy={busyId === m.id}
                editable={editable}
                onAdd={() =>
                  void add(
                    m.id,
                    `Jalon — ${displayLabel(m.name, 'Jalon')}`,
                    'MILESTONE',
                    null,
                  )
                }
              />
            ))
          )
        ) : null}
      </div>
    </div>
  );
}

function SrcRow({
  title,
  meta,
  already,
  busy,
  editable,
  onAdd,
}: {
  title: string;
  meta: string;
  already: boolean;
  busy: boolean;
  editable: boolean;
  onAdd: () => void;
}) {
  return (
    <div className="prepare-workspace__src">
      <div className="min-w-0 flex-1">
        <div className="text-[12.5px] font-bold text-foreground">{title}</div>
        <div className="truncate text-[11.5px] text-muted-foreground">{meta}</div>
      </div>
      {already ? (
        <span className="shrink-0 text-[11px] font-bold text-[color:var(--state-success)]">
          À l&apos;ODJ
        </span>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="min-h-11 shrink-0 px-3 text-xs font-bold"
          disabled={!editable || busy}
          onClick={onAdd}
        >
          → ODJ
        </Button>
      )}
    </div>
  );
}
