'use client';

import { Sparkles } from 'lucide-react';
import type { StrategicVisionDto } from '../types/strategic-vision.types';
import { formatVisionReviewDate } from '../lib/strategic-overview-view';
import { cn } from '@/lib/utils';

function renderVisionStatement(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  if (parts.length === 1) {
    return text;
  }
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <span key={index} className="text-[color:var(--brand-gold-700)]">
          {part.slice(2, -2)}
        </span>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

function MetaItem({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={cn('min-w-0', className)}>
      <dt className="starium-overline text-muted-foreground">{label}</dt>
      <dd className="mt-2 text-sm font-semibold tracking-tight text-foreground sm:text-[15px]">
        {value}
      </dd>
    </div>
  );
}

export function StrategicVisionHero({ vision }: { vision: StrategicVisionDto }) {
  return (
    <section
      className="starium-vision-hero rounded-2xl border border-border/70 bg-card shadow-[var(--shadow-2)]"
      aria-labelledby="sv-vision-heading"
    >
      <div className="px-6 py-9 sm:px-10 sm:py-11">
        <div className="flex flex-wrap items-center gap-3">
          <div className="starium-vision-hero__badge inline-flex items-center gap-2 rounded-full border px-3 py-1.5">
            <Sparkles className="size-3.5 shrink-0 text-[color:var(--brand-gold-700)]" aria-hidden />
            <span className="starium-overline text-[color:var(--brand-gold-700)]">
              Notre vision
            </span>
          </div>
        </div>

        <blockquote
          id="sv-vision-heading"
          className="relative mt-7 max-w-[44rem] pl-12 text-[clamp(1.375rem,2.6vw,1.875rem)] font-bold leading-[1.32] tracking-[-0.025em] text-foreground sm:pl-16"
        >
          <span
            aria-hidden
            className="pointer-events-none absolute -left-0.5 top-0 select-none font-serif text-7xl leading-none text-[color:var(--brand-gold)]/35 sm:-left-1 sm:text-8xl"
          >
            &ldquo;
          </span>
          <span className="relative block pl-1 sm:pl-0.5">{renderVisionStatement(vision.statement)}</span>
        </blockquote>

        <dl className="mt-10 grid grid-cols-1 gap-6 border-t border-border/70 pt-8 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-border/70">
          <MetaItem
            label="Horizon"
            value={vision.horizonLabel || '—'}
            className="sm:pr-8"
          />
          <MetaItem
            label="Intitulé"
            value={vision.title || '—'}
            className="sm:px-8"
          />
          <MetaItem
            label="Dernière mise à jour"
            value={formatVisionReviewDate(vision.updatedAt)}
            className="sm:pl-8"
          />
        </dl>
      </div>
    </section>
  );
}
