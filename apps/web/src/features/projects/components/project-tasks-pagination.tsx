'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DEFAULT_TASK_PAGE_SIZE,
  getVisiblePageNumbers,
  TASK_PAGE_SIZE_OPTIONS,
} from '../lib/project-task-display';

export function ProjectTasksPagination({
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  entityLabel = 'tâches',
  footerLink,
}: {
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  entityLabel?: string;
  footerLink?: { href: string; label: string };
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = total === 0 ? 0 : Math.min(safePage * pageSize, total);
  const pageNumbers = getVisiblePageNumbers(safePage, totalPages);
  const rangeLabel =
    total === 0
      ? `Aucune ${entityLabel} à afficher`
      : total === 1
        ? `1 ${entityLabel.replace(/s$/, '')}`
        : `${start} à ${end} sur ${total} ${entityLabel}`;

  return (
    <div className="starium-dt-pagination" aria-label={`Pagination des ${entityLabel}`}>
      <div className="starium-dt-pagination__start">
        <span className="starium-dt-pg-info" aria-live="polite">
          {rangeLabel}
        </span>
        {footerLink ? (
          <Link href={footerLink.href} className="starium-dt-footer-link">
            {footerLink.label}
          </Link>
        ) : null}
      </div>

      <div className="starium-dt-pg-nums" role="navigation" aria-label="Pages">
        <button
          type="button"
          className="starium-dt-pg-btn"
          disabled={safePage <= 1 || total === 0}
          onClick={() => onPageChange(safePage - 1)}
          aria-label="Page précédente"
        >
          <ChevronLeft strokeWidth={2.5} aria-hidden />
        </button>
        {pageNumbers.map((pageNumber) => (
          <button
            key={pageNumber}
            type="button"
            className={cn(
              'starium-dt-pg-btn',
              pageNumber === safePage && 'starium-dt-pg-btn--active',
            )}
            onClick={() => onPageChange(pageNumber)}
            aria-label={`Page ${pageNumber}`}
            aria-current={pageNumber === safePage ? 'page' : undefined}
          >
            {pageNumber}
          </button>
        ))}
        <button
          type="button"
          className="starium-dt-pg-btn"
          disabled={safePage >= totalPages || total === 0}
          onClick={() => onPageChange(safePage + 1)}
          aria-label="Page suivante"
        >
          <ChevronRight strokeWidth={2.5} aria-hidden />
        </button>
      </div>

      <label className="flex items-center gap-2">
        <span className="sr-only">Nombre d&apos;éléments par page</span>
        <select
          className="starium-dt-pg-select"
          value={pageSize}
          onChange={(event) => {
            onPageChange(1);
            onPageSizeChange(Number(event.target.value));
          }}
          disabled={total === 0}
        >
          {TASK_PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size} par page
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

export { DEFAULT_TASK_PAGE_SIZE };
