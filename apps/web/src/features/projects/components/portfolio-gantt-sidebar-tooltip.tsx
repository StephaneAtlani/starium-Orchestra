'use client';

import type { ReactNode } from 'react';
import type { PortfolioGanttRow } from '../types/project.types';
import {
  labelArbGlobal,
  labelArbLevel,
} from '../lib/portfolio-gantt-tooltip-labels';
import { projectTagBadgeStyle } from '../lib/project-tag-badge-style';

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-background/65">
      {children}
    </p>
  );
}

export function PortfolioGanttSidebarTooltipContent({
  row,
}: {
  row: PortfolioGanttRow;
}) {
  const tags = row.tags ?? [];
  const stakeholderLines = row.stakeholderLines ?? [];
  const global = labelArbGlobal(row.arbitrationStatus);
  const metier = labelArbLevel(row.arbitrationMetierStatus);
  const comite = labelArbLevel(row.arbitrationComiteStatus);
  const codir = labelArbLevel(row.arbitrationCodirStatus);
  const hasArb =
    global != null ||
    metier != null ||
    comite != null ||
    codir != null;

  return (
    <div className="max-w-[min(20rem,calc(100vw-2rem))] space-y-2.5 text-left">
      <div>
        <SectionTitle>Validation & arbitrage</SectionTitle>
        {hasArb ? (
          <ul className="mt-1.5 list-none space-y-1 text-[0.8125rem] leading-snug text-background/95">
            {global != null && (
              <li>
                <span className="text-background/75">Décision globale · </span>
                {global}
              </li>
            )}
            {metier != null && (
              <li>
                <span className="text-background/75">Métier · </span>
                {metier}
              </li>
            )}
            {comite != null && (
              <li>
                <span className="text-background/75">Comité · </span>
                {comite}
              </li>
            )}
            {codir != null && (
              <li>
                <span className="text-background/75">Sponsor / CODIR · </span>
                {codir}
              </li>
            )}
          </ul>
        ) : (
          <p className="mt-1 text-[0.8125rem] text-background/80">Non renseigné</p>
        )}
      </div>

      <div>
        <SectionTitle>Étiquettes</SectionTitle>
        {tags.length > 0 ? (
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <li
                key={t.id}
                className="rounded-md border px-1.5 py-0.5 text-[0.75rem] font-medium shadow-sm"
                style={projectTagBadgeStyle(t.color)}
              >
                {t.name}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-[0.8125rem] text-background/80">Aucune étiquette</p>
        )}
      </div>

      <div>
        <SectionTitle>Parties prenantes</SectionTitle>
        {stakeholderLines.length > 0 ? (
          <ul className="mt-1.5 list-none space-y-1 text-[0.8125rem] leading-snug text-background/95">
            {stakeholderLines.map((line, i) => (
              <li key={`${row.id}-st-${i}`}>{line}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-[0.8125rem] text-background/80">Non renseigné</p>
        )}
      </div>
    </div>
  );
}
