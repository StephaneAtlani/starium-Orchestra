'use client';

import { cn } from '@/lib/utils';
import {
  PROJECT_PRIORITY_LABEL,
  PROJECT_STATUS_LABEL,
} from '../constants/project-enum-labels';

/** Légende du Gantt portefeuille — alignée sur `portfolio-gantt-bar-styles.ts`. */
export function PortfolioGanttLegend({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'border-border/50 bg-muted/20 text-muted-foreground rounded-lg border px-3 py-3 text-xs',
        className,
      )}
    >
      <p className="text-foreground mb-2.5 text-[0.7rem] font-semibold uppercase tracking-wide">
        Légende des couleurs
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <section className="space-y-2">
          <h4 className="text-foreground/90 font-medium">Corps de barre (priorité)</h4>
          <ul className="space-y-1.5">
            <LegendRow
              swatchClass="border border-sky-600/42 bg-sky-500/[0.22] dark:border-sky-500/35 dark:bg-sky-500/14"
              label={PROJECT_PRIORITY_LABEL.LOW}
            />
            <LegendRow
              swatchClass="border border-violet-600/48 bg-violet-500/[0.2] dark:border-violet-500/40 dark:bg-violet-500/13"
              label={PROJECT_PRIORITY_LABEL.MEDIUM}
            />
            <LegendRow
              swatchClass="border border-orange-600/52 bg-orange-500/[0.24] dark:border-orange-500/45 dark:bg-orange-500/16"
              label={PROJECT_PRIORITY_LABEL.HIGH}
            />
            <LegendRow
              swatchClass="border border-slate-500/45 bg-slate-500/[0.16] grayscale-[0.35] dark:border-slate-500/38 dark:bg-slate-500/12"
              label={`${PROJECT_STATUS_LABEL.COMPLETED} / ${PROJECT_STATUS_LABEL.CANCELLED} / ${PROJECT_STATUS_LABEL.ARCHIVED}`}
            />
          </ul>
        </section>

        <section className="space-y-2">
          <h4 className="text-foreground/90 font-medium">Avancement (% dans la barre)</h4>
          <p className="text-[0.65rem] leading-snug opacity-90">
            La partie remplie indique le % d’avancement ; sa couleur reflète la{' '}
            <strong className="text-foreground/95">santé calculée</strong>.
          </p>
          <ul className="space-y-1.5">
            <LegendRow
              swatchClass="bg-emerald-600/60 dark:bg-emerald-400/45"
              label="Santé bon"
            />
            <LegendRow
              swatchClass="bg-amber-600/55 dark:bg-amber-400/42"
              label="Santé attention"
            />
            <LegendRow
              swatchClass="bg-red-600/65 dark:bg-red-400/48"
              label="Santé critique"
            />
          </ul>
        </section>

        <section className="space-y-2 sm:col-span-2 lg:col-span-1">
          <h4 className="text-foreground/90 font-medium">Modificateurs & frise</h4>
          <ul className="space-y-2">
            <li className="flex gap-2">
              <span
                className="border-border/50 mt-0.5 h-4 w-12 shrink-0 rounded border border-dashed bg-sky-500/10"
                aria-hidden
              />
              <span>
                <strong className="text-foreground/95">{PROJECT_STATUS_LABEL.ON_HOLD}</strong> : bordure
                en pointillés (priorité conservée).
              </span>
            </li>
            <li className="flex gap-2">
              <span
                className="border-border/50 mt-0.5 h-4 w-12 shrink-0 rounded border bg-sky-500/15 opacity-80"
                aria-hidden
              />
              <span>
                <strong className="text-foreground/95">{PROJECT_STATUS_LABEL.DRAFT}</strong> : barre un peu
                atténuée.
              </span>
            </li>
            <li className="flex gap-2">
              <span
                className="mt-0.5 h-4 w-12 shrink-0 rounded border border-orange-600/40 ring-1 ring-amber-500/45 dark:ring-amber-400/40"
                aria-hidden
              />
              <span>Criticité moyenne : fin anneau ambre.</span>
            </li>
            <li className="flex gap-2">
              <span
                className="mt-0.5 h-4 w-12 shrink-0 rounded border ring-2 ring-red-500/40 ring-offset-1 ring-offset-background dark:ring-red-400/35"
                aria-hidden
              />
              <span>Criticité haute : anneau rouge plus marqué.</span>
            </li>
            <li className="flex gap-2">
              <span
                className="border-border/40 mt-0.5 h-4 w-12 shrink-0 rounded border border-l-[3px] border-l-teal-500 bg-muted/30 dark:border-l-teal-400"
                aria-hidden
              />
              <span>Activité de suivi : liseré gauche teal (vs projet structuré).</span>
            </li>
            <li className="flex gap-2">
              <span
                className="mt-0.5 h-4 w-12 shrink-0 rounded border ring-2 ring-amber-500/90 ring-offset-1 ring-offset-background dark:ring-amber-400/80"
                aria-hidden
              />
              <span>Retard : anneau ambre sur la barre.</span>
            </li>
            <li className="flex gap-2">
              <span
                className="bg-sky-500/80 mt-0.5 h-5 w-1 shrink-0 rounded-full shadow-sm dark:bg-sky-400/70"
                aria-hidden
              />
              <span>Ligne verticale « aujourd’hui » sur la frise.</span>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}

function LegendRow({ swatchClass, label }: { swatchClass: string; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <span
        className={cn('h-4 w-12 shrink-0 rounded border shadow-sm', swatchClass)}
        aria-hidden
      />
      <span className="leading-tight">{label}</span>
    </li>
  );
}
