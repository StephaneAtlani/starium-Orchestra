'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EmptyState } from '@/components/feedback/empty-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { StariumTableWrap, useStariumTablePan } from '@/components/ui/starium-table-wrap';
import { usePermissions } from '@/hooks/use-permissions';
import {
  PROJECT_REVIEW_STATUS_LABEL,
  PROJECT_REVIEW_TYPE_LABEL,
} from '../constants/project-enum-labels';
import { useProjectReviewsQuery } from '../hooks/use-project-reviews-query';
import type { ProjectReviewListItem, ProjectReviewType } from '../types/project.types';
import { cn } from '@/lib/utils';
import { BookOpen, Calendar, ClipboardList, Plus } from 'lucide-react';
import {
  findDraftPostMortemReview,
  hasFinalizedPostMortemReview,
  isPostMortemEligibleProjectStatus,
  REVIEW_TYPES_PILOTAGE,
} from '../lib/project-review-post-mortem';
import { formatProjectDateTimeFr } from '../lib/projects-list-display';
import { ProjectReviewCreateDialog } from './project-review-create-dialog';
import { ProjectReviewEditorDialog } from './project-review-editor-dialog';
import { ProjectReviewsContextBanner } from './project-reviews-context-banner';

const REVIEW_ROW_ICON_TONES = [
  'starium-dt-ti-blue',
  'starium-dt-ti-purple',
  'starium-dt-ti-gold',
  'starium-dt-ti-green',
] as const;

function reviewStatusDsBadgeClass(status: string): string {
  if (status === 'FINALIZED') return 'starium-ds-badge--success';
  if (status === 'IN_REVIEW' || status === 'DRAFT') return 'starium-ds-badge--warn';
  if (status === 'PLANNED') return 'starium-ds-badge--info';
  if (status === 'CANCELLED') return 'starium-ds-badge--neutral';
  return 'starium-ds-badge--info';
}

function reviewTypeDsBadgeClass(reviewType: string): string {
  if (reviewType === 'POST_MORTEM') return 'starium-ds-badge--warn';
  return 'starium-ds-badge--info';
}

function reviewRowIcon(reviewType: string) {
  if (reviewType === 'POST_MORTEM') return BookOpen;
  return ClipboardList;
}

function ReviewTableRow({
  row,
  index,
  onOpen,
}: {
  row: ProjectReviewListItem;
  index: number;
  onOpen: (id: string) => void;
}) {
  const { shouldSuppressClick } = useStariumTablePan();
  const RowIcon = reviewRowIcon(row.reviewType);
  const iconTone = REVIEW_ROW_ICON_TONES[index % REVIEW_ROW_ICON_TONES.length];
  const typeLabel = PROJECT_REVIEW_TYPE_LABEL[row.reviewType] ?? row.reviewType;
  const statusLabel = PROJECT_REVIEW_STATUS_LABEL[row.status] ?? row.status;
  const title = row.title?.trim() || typeLabel;
  const actionLabel =
    row.status === 'IN_REVIEW' || row.status === 'DRAFT'
      ? 'Continuer'
      : row.status === 'PLANNED'
        ? 'Ouvrir'
        : 'Voir';

  return (
    <tr
      className="cursor-pointer"
      onClick={() => {
        if (shouldSuppressClick()) return;
        onOpen(row.id);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen(row.id);
        }
      }}
      tabIndex={0}
    >
      <td>
        <div className="starium-dt-date min-w-[10rem]">
          <Calendar strokeWidth={1.75} aria-hidden />
          <time dateTime={row.reviewDate}>{formatProjectDateTimeFr(row.reviewDate)}</time>
        </div>
      </td>
      <td>
        <span className={cn('starium-ds-badge', reviewTypeDsBadgeClass(row.reviewType))}>
          {typeLabel}
        </span>
      </td>
      <td>
        <span className={cn('starium-ds-badge', reviewStatusDsBadgeClass(row.status))}>
          {statusLabel}
        </span>
      </td>
      <td>
        <div className="starium-dt-tname min-w-[12rem] max-w-[24rem]">
          <div className={cn('starium-dt-tname-ico', iconTone)} aria-hidden>
            <RowIcon strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <div className="starium-dt-cell-strong truncate">{title}</div>
            {row.title?.trim() ? (
              <div className="starium-dt-cell-sub truncate">{typeLabel}</div>
            ) : null}
          </div>
        </div>
      </td>
      <td className="starium-dt__right">
        <button
          type="button"
          className="starium-btn starium-btn-secondary starium-btn-sm"
          onClick={(event) => {
            event.stopPropagation();
            onOpen(row.id);
          }}
        >
          {actionLabel}
        </button>
      </td>
    </tr>
  );
}

export function ProjectReviewsTab({
  projectId,
  projectStatus,
}: {
  projectId: string;
  projectStatus: string;
}) {
  const { has } = usePermissions();
  const canEdit = has('projects.update');
  const postMortemEligible = isPostMortemEligibleProjectStatus(projectStatus);
  const createTypeOptions: ProjectReviewType[] = postMortemEligible
    ? ['POST_MORTEM']
    : REVIEW_TYPES_PILOTAGE;

  const [createOpen, setCreateOpen] = useState(false);
  const [editorReviewId, setEditorReviewId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  const list = useProjectReviewsQuery(projectId);
  const draftPostMortem = useMemo(
    () => findDraftPostMortemReview(list.data),
    [list.data],
  );
  const finalizedPostMortem = useMemo(
    () => hasFinalizedPostMortemReview(list.data),
    [list.data],
  );

  const openedPostMortemFromQueryRef = useRef(false);
  const openedOpenReviewRef = useRef<string | null>(null);
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const openEditor = useCallback((id: string) => {
    setEditorReviewId(id);
    setEditorOpen(true);
  }, []);

  /** Synthèse projet : `?createRetourExperience=1` ouvre la création ; si un brouillon REX existe, l’éditeur. */
  useEffect(() => {
    if (searchParams.get('createRetourExperience') !== '1') {
      openedPostMortemFromQueryRef.current = false;
      return;
    }
    if (!postMortemEligible || !canEdit) return;
    if (list.isLoading) return;
    if (openedPostMortemFromQueryRef.current) return;

    const stripCreateParam = () => {
      const next = new URLSearchParams(searchParams.toString());
      next.delete('createRetourExperience');
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    };

    const draft = findDraftPostMortemReview(list.data);
    if (draft) {
      openedPostMortemFromQueryRef.current = true;
      openEditor(draft.id);
      stripCreateParam();
      return;
    }

    if (
      hasFinalizedPostMortemReview(list.data) &&
      !findDraftPostMortemReview(list.data)
    ) {
      openedPostMortemFromQueryRef.current = true;
      stripCreateParam();
      return;
    }

    openedPostMortemFromQueryRef.current = true;
    setCreateOpen(true);
    stripCreateParam();
  }, [
    searchParams,
    pathname,
    router,
    postMortemEligible,
    canEdit,
    list.isLoading,
    list.data,
    openEditor,
  ]);

  /** Lien « Continuer » depuis la synthèse : `?openReview=<id>`. */
  useEffect(() => {
    const id = searchParams.get('openReview');
    if (!id?.trim()) {
      openedOpenReviewRef.current = null;
      return;
    }
    if (openedOpenReviewRef.current === id) return;
    openedOpenReviewRef.current = id;
    openEditor(id);
    const next = new URLSearchParams(searchParams.toString());
    next.delete('openReview');
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [searchParams, pathname, router, openEditor]);

  const onPrimaryReviewAction = () => {
    if (postMortemEligible && draftPostMortem) {
      openEditor(draftPostMortem.id);
    } else {
      setCreateOpen(true);
    }
  };

  const primaryReviewLabel = postMortemEligible
    ? draftPostMortem
      ? "Continuer le retour d'expérience"
      : "Créer un retour d'expérience"
    : 'Nouveau point projet';

  const showPrimaryCta =
    canEdit && !(postMortemEligible && finalizedPostMortem && !draftPostMortem);

  const hasReviews = (list.data?.length ?? 0) > 0;

  return (
    <div className="flex flex-col gap-4">
      {!postMortemEligible ? (
        <ProjectReviewsContextBanner
          postMortemEligible={false}
          finalizedPostMortem={false}
          draftPostMortem={null}
          canEdit={canEdit}
          onPrimaryAction={onPrimaryReviewAction}
          variant="tab"
        />
      ) : null}

      {/* Le bandeau ci-dessus porte le CTA quand le projet n'est pas clos ; ce header
          garantit un bouton de création persistant pour les projets terminés (REX). */}
      {postMortemEligible && showPrimaryCta && hasReviews ? (
        <div className="flex items-center justify-end">
          <button
            type="button"
            className="starium-btn starium-btn-primary min-h-11"
            onClick={onPrimaryReviewAction}
          >
            <Plus strokeWidth={2.5} aria-hidden />
            {primaryReviewLabel}
          </button>
        </div>
      ) : null}

      <div className="starium-tablecard">
        {list.isLoading ? (
          <div className="p-6">
            <LoadingState rows={4} />
          </div>
        ) : list.error ? (
          <div className="p-6" role="alert">
            <p className="text-sm text-destructive">Impossible de charger les points projet.</p>
          </div>
        ) : !list.data?.length ? (
          <EmptyState
            title={postMortemEligible ? "Aucun retour d'expérience" : 'Aucun point projet'}
            description={
              postMortemEligible
                ? 'Créez le bilan de clôture pour capitaliser objectifs, écarts et leçons apprises.'
                : 'Planifiez un COPIL, COPRO ou une revue pour documenter arbitrages et décisions.'
            }
            action={
              canEdit ? (
                <button
                  type="button"
                  className="starium-btn starium-btn-primary"
                  onClick={onPrimaryReviewAction}
                >
                  <Plus strokeWidth={2.5} aria-hidden />
                  {postMortemEligible ? "Créer un retour d'expérience" : 'Créer un point projet'}
                </button>
              ) : undefined
            }
            className="py-14"
          />
        ) : (
          <StariumTableWrap scrollLabel="Historique des points projet — glisser pour faire défiler">
            <table className="starium-dt starium-dt--wide">
              <caption className="sr-only">Historique des points projet</caption>
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Type</th>
                  <th scope="col">Statut</th>
                  <th scope="col">Titre</th>
                  <th scope="col" className="starium-dt__right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.data.map((row, index) => (
                  <ReviewTableRow key={row.id} row={row} index={index} onOpen={openEditor} />
                ))}
              </tbody>
            </table>
          </StariumTableWrap>
        )}
      </div>

      <ProjectReviewCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        projectId={projectId}
        postMortemEligible={postMortemEligible}
        createTypeOptions={createTypeOptions}
        onCreated={(reviewId, openEditorAfterCreate) => {
          if (openEditorAfterCreate) openEditor(reviewId);
        }}
      />

      <ProjectReviewEditorDialog
        projectId={projectId}
        reviewId={editorReviewId}
        open={editorOpen}
        onOpenChange={(o) => {
          setEditorOpen(o);
          if (!o) setEditorReviewId(null);
        }}
        canEdit={canEdit}
      />
    </div>
  );
}
