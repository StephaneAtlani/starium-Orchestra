'use client';

import { BookOpen, CalendarRange, CheckCircle2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProjectReviewListItem } from '../types/project.types';

export function ProjectReviewsContextBanner({
  postMortemEligible,
  finalizedPostMortem,
  draftPostMortem,
  canEdit,
  onPrimaryAction,
  /** Aperçu projet : libellés orientés synthèse. */
  variant = 'tab',
}: {
  postMortemEligible: boolean;
  finalizedPostMortem: boolean;
  draftPostMortem: ProjectReviewListItem | null;
  canEdit: boolean;
  onPrimaryAction: () => void;
  variant?: 'tab' | 'overview';
}) {
  const showPrimaryCta =
    canEdit && !(postMortemEligible && finalizedPostMortem && !draftPostMortem);

  const primaryLabel = postMortemEligible
    ? draftPostMortem
      ? "Continuer le retour d'expérience"
      : "Créer un retour d'expérience"
    : 'Créer un point projet';

  const accent = postMortemEligible
    ? {
        bar: 'border-l-[3px] border-l-amber-500/70',
        icon: 'bg-amber-500/15 text-amber-950 dark:text-amber-300',
        Icon: BookOpen,
      }
    : {
        bar: 'border-l-[3px] border-l-sky-500/70',
        icon: 'bg-sky-500/10 text-sky-800 dark:text-sky-300',
        Icon: CalendarRange,
      };
  const BannerIcon = accent.Icon;

  let title = 'Points projet';
  let description =
    'Créez un point projet, complétez le compte rendu (arbitrage, synthèse, participants, décisions, actions), enregistrez puis finalisez pour figer le snapshot.';

  if (postMortemEligible) {
    title = "Retour d'expérience";
    if (finalizedPostMortem && !draftPostMortem) {
      title = "Retour d'expérience finalisé";
      description =
        variant === 'overview'
          ? 'Le bilan de clôture est enregistré — retrouvez-le dans l’onglet Points projet.'
          : 'Le bilan de clôture a été enregistré — consultez-le dans le tableau ci-dessous.';
    } else if (draftPostMortem) {
      description =
        'Un brouillon est en cours : complétez le bilan (objectifs, écarts, leçons apprises) puis finalisez pour capitaliser.';
    } else {
      description =
        'Projet clos — documentez le bilan, les écarts et les leçons apprises. Distinct des revues de pilotage en cours de projet.';
    }
  }

  return (
    <section
      className={cn(
        'starium-card flex flex-col gap-4 rounded-xl border border-border/70 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5',
        accent.bar,
        finalizedPostMortem && !draftPostMortem && postMortemEligible && 'border-l-emerald-500/70',
      )}
      aria-labelledby="project-reviews-banner-title"
      role="status"
      aria-live="polite"
    >
      <div className="flex min-w-0 gap-3">
        <div
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-lg',
            finalizedPostMortem && !draftPostMortem && postMortemEligible
              ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300'
              : accent.icon,
          )}
        >
          {finalizedPostMortem && !draftPostMortem && postMortemEligible ? (
            <CheckCircle2 className="size-5" aria-hidden />
          ) : (
            <BannerIcon className="size-5" aria-hidden />
          )}
        </div>
        <div className="min-w-0">
          <h2
            id="project-reviews-banner-title"
            className="text-sm font-semibold tracking-tight text-foreground"
          >
            {title}
          </h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      {showPrimaryCta ? (
        <button
          type="button"
          className="starium-btn starium-btn-primary min-h-11 shrink-0 self-start sm:self-center"
          onClick={onPrimaryAction}
        >
          <Plus strokeWidth={2.5} aria-hidden />
          {primaryLabel}
        </button>
      ) : null}
    </section>
  );
}
