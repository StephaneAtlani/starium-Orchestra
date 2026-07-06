'use client';

import type { ComponentType, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function ReviewEditorSection({
  sectionId,
  title,
  description,
  icon: Icon,
  headerAction,
  className,
  children,
}: {
  sectionId: string;
  title: string;
  description?: string;
  icon: ComponentType<{ className?: string }>;
  headerAction?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={cn('starium-form-section border-border/60', className)}
      aria-labelledby={sectionId}
    >
      <div
        className={cn(
          headerAction
            ? 'mb-3 flex flex-wrap items-start justify-between gap-2'
            : 'mb-3',
        )}
      >
        <div className="min-w-0 flex-1">
          <h3 id={sectionId} className="starium-form-section-title mb-0">
            <Icon aria-hidden />
            {title}
          </h3>
          {description ? (
            <p className="starium-form-hint mb-0 mt-2">{description}</p>
          ) : null}
        </div>
        {headerAction ? <div className="shrink-0">{headerAction}</div> : null}
      </div>
      {children}
    </section>
  );
}
