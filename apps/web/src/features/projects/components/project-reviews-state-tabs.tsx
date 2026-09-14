'use client';

import type { Ref } from 'react';
import { LayoutTemplate } from 'lucide-react';
import {
  OverflowTabsMoreMeasureProbe,
  OverflowTabsMoreMenu,
} from '@/components/layout/overflow-tabs-more-menu';
import {
  OVERFLOW_TABS_MEASURE_ROW_CLASS,
  useOverflowTabs,
} from '@/hooks/use-overflow-tabs';
import { cn } from '@/lib/utils';
import {
  PROJECT_REVIEWS_TAB_LABEL,
  PROJECT_REVIEWS_TAB_ORDER,
  type ProjectReviewsTabState,
  type ProjectReviewUiState,
} from '../lib/project-review-ui-state';

function CountBadge({ count, active }: { count: number; active: boolean }) {
  return (
    <span
      className={cn(
        'ml-1.5 inline-flex min-w-5 items-center justify-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums',
        active
          ? 'bg-[color:var(--control-active-fg)]/20 text-[color:var(--control-active-fg)]'
          : 'bg-muted text-muted-foreground',
      )}
      aria-label={`${count} élément${count > 1 ? 's' : ''}`}
    >
      {count}
    </span>
  );
}

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
  const tabItems = PROJECT_REVIEWS_TAB_ORDER.map((key) => {
    const count =
      key === 'series'
        ? (counts.series ?? 0)
        : key === 'all'
          ? (counts.all ?? 0)
          : (counts[key as ProjectReviewUiState] ?? 0);
    return {
      id: key,
      label: PROJECT_REVIEWS_TAB_LABEL[key],
      count,
    };
  });

  const overflow = useOverflowTabs(tabItems.length, {
    gapPx: 2,
    deps: [
      tabItems.map((t) => `${t.label}:${t.count}`).join('|'),
      modelsOpen,
      Boolean(onOpenModels),
    ],
  });
  const visibleItems = tabItems.slice(0, overflow.visibleCount);
  const overflowItems = tabItems.slice(overflow.visibleCount);
  const activeInOverflow = overflowItems.some((item) => item.id === active);

  return (
    <div
      ref={overflow.containerRef as Ref<HTMLDivElement>}
      className="starium-tab-group relative z-20 w-full max-w-full overflow-visible"
    >
      <div
        aria-hidden
        className={cn(OVERFLOW_TABS_MEASURE_ROW_CLASS, 'gap-0.5')}
      >
        {onOpenModels ? (
          <span
            ref={overflow.leadingRef as Ref<HTMLSpanElement>}
            className="starium-tab-btn min-h-11 shrink-0"
          >
            <LayoutTemplate aria-hidden />
            Modèles
          </span>
        ) : null}
        <div
          ref={overflow.measureRef}
          className="flex w-max flex-nowrap items-center gap-0.5"
        >
          {tabItems.map((item) => (
            <span
              key={`m-${item.id}`}
              className="starium-tab-btn min-h-11 shrink-0"
            >
              {item.label}
              <CountBadge count={item.count} active={false} />
            </span>
          ))}
        </div>
        <OverflowTabsMoreMeasureProbe
          ref={overflow.moreMeasureRef as Ref<HTMLSpanElement>}
          className="starium-tab-btn shrink-0"
        />
      </div>

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
        {visibleItems.map((item) => {
          const selected = active === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              id={`points-tab-${item.id}`}
              className={cn(
                'starium-tab-btn min-h-11 shrink-0 whitespace-nowrap',
                selected && 'starium-tab-btn--active',
              )}
              onClick={() => onChange(item.id)}
            >
              {item.label}
              <CountBadge count={item.count} active={selected} />
            </button>
          );
        })}
      </div>

      {overflowItems.length > 0 ? (
        <OverflowTabsMoreMenu
          items={overflowItems.map((item) => ({
            id: item.id,
            label: item.label,
            onSelect: () => onChange(item.id),
            trailing: (
              <CountBadge count={item.count} active={item.id === active} />
            ),
          }))}
          activeOverflowId={activeInOverflow ? active : null}
          triggerClassName={cn(
            'starium-tab-btn !size-auto min-h-11 min-w-11',
            activeInOverflow && 'starium-tab-btn--active',
          )}
          align="start"
        />
      ) : null}
    </div>
  );
}
