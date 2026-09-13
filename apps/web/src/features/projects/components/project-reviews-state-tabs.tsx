'use client';

import { LayoutTemplate } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  PROJECT_REVIEWS_TAB_LABEL,
  PROJECT_REVIEWS_TAB_ORDER,
  type ProjectReviewsTabState,
  type ProjectReviewUiState,
} from '../lib/project-review-ui-state';

export function ProjectReviewsStateTabs({
  active,
  counts,
  onChange,
  modelsOpen = false,
  onOpenModels,
}: {
  active: ProjectReviewsTabState;
  counts: Partial<Record<ProjectReviewUiState, number>> & {
    all?: number;
    series?: number;
  };
  onChange: (next: ProjectReviewsTabState) => void;
  modelsOpen?: boolean;
  onOpenModels?: () => void;
}) {
  return (
    <div className="starium-tab-group w-full max-w-full overflow-x-auto">
      {onOpenModels ? (
        <button
          type="button"
          className={cn(
            'starium-tab-btn min-h-11 shrink-0 whitespace-nowrap',
            modelsOpen && 'starium-tab-btn--active',
          )}
          aria-haspopup="dialog"
          aria-expanded={modelsOpen}
          aria-label="Modèles de préparation"
          onClick={onOpenModels}
        >
          <LayoutTemplate aria-hidden />
          Modèles
        </button>
      ) : null}
      <div
        role="tablist"
        aria-label="États des points projet"
        className="contents"
      >
        {PROJECT_REVIEWS_TAB_ORDER.map((key) => {
          const selected = active === key;
          const count =
            key === 'series'
              ? (counts.series ?? 0)
              : key === 'all'
                ? (counts.all ?? 0)
                : (counts[key as ProjectReviewUiState] ?? 0);
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={selected}
              id={`points-tab-${key}`}
              className={cn(
                'starium-tab-btn min-h-11 shrink-0 whitespace-nowrap',
                selected && 'starium-tab-btn--active',
              )}
              onClick={() => onChange(key)}
            >
              {PROJECT_REVIEWS_TAB_LABEL[key]}
              <span
                className={cn(
                  'ml-1.5 inline-flex min-w-5 items-center justify-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums',
                  selected
                    ? 'bg-[color:var(--control-active-fg)]/20 text-[color:var(--control-active-fg)]'
                    : 'bg-muted text-muted-foreground',
                )}
                aria-label={`${count} élément${count > 1 ? 's' : ''}`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
