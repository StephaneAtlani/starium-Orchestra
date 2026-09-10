'use client';

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
}: {
  active: ProjectReviewsTabState;
  counts: Partial<Record<ProjectReviewUiState, number>> & { series?: number };
  onChange: (next: ProjectReviewsTabState) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="États des points projet"
      className="starium-tab-group w-full max-w-full overflow-x-auto"
    >
      {PROJECT_REVIEWS_TAB_ORDER.map((key) => {
        const selected = active === key;
        const count =
          key === 'series' ? counts.series : (counts[key as ProjectReviewUiState] ?? 0);
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={selected}
            id={`points-tab-${key}`}
            className={cn('starium-tab-btn min-h-11 shrink-0 whitespace-nowrap')}
            onClick={() => onChange(key)}
          >
            {PROJECT_REVIEWS_TAB_LABEL[key]}
            <span className="ml-1.5 tabular-nums text-muted-foreground">({count})</span>
          </button>
        );
      })}
    </div>
  );
}
