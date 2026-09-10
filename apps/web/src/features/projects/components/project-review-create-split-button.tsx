'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  PROJECT_REVIEW_CREATE_DEFAULTS,
  type ProjectReviewCreateMenuType,
} from '../lib/project-review-create-defaults';

export function ProjectReviewCreateSplitButton({
  disabled,
  onCreateType,
}: {
  disabled?: boolean;
  onCreateType: (reviewType: ProjectReviewCreateMenuType) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative inline-flex items-stretch">
      <button
        type="button"
        className="starium-btn starium-btn-primary min-h-11 rounded-r-none"
        disabled={disabled}
        onClick={() => onCreateType('COPRO')}
      >
        <Plus strokeWidth={2.5} aria-hidden />
        Créer un COPROJ
      </button>
      <button
        type="button"
        className={cn(
          'starium-btn starium-btn-primary min-h-11 min-w-11 rounded-l-none border-l border-l-white/20 px-2',
        )}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Choisir le type de point"
        onClick={() => setOpen((v) => !v)}
      >
        <ChevronDown strokeWidth={2} aria-hidden />
      </button>
      {open ? (
        <ul
          role="menu"
          className="absolute right-0 top-full z-30 mt-1 min-w-[16rem] rounded-[var(--radius-lg)] border border-border bg-card p-1 shadow-md"
        >
          {PROJECT_REVIEW_CREATE_DEFAULTS.map((entry) => (
            <li key={entry.reviewType} role="none">
              <button
                type="button"
                role="menuitem"
                className="flex w-full flex-col items-start gap-0.5 rounded-[var(--control-radius)] px-3 py-2.5 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-11"
                onClick={() => {
                  setOpen(false);
                  onCreateType(entry.reviewType);
                }}
              >
                <span className="text-sm font-medium text-foreground">
                  {entry.menuLabel}
                </span>
                <span className="text-xs text-muted-foreground">{entry.menuHint}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
