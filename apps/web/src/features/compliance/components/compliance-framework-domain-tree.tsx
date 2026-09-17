'use client';

import { ChevronRight } from 'lucide-react';
import type {
  ComplianceFrameworkDomainApi,
  ComplianceFrameworkOverviewRequirementApi,
} from '../api/compliance.api';
import { ComplianceStatusDisplay } from './compliance-status-display';
import { displayLabel } from '@/lib/display-label';
import { cn } from '@/lib/utils';

export function ComplianceFrameworkDomainTree({
  domains,
  requirements,
  onSelectRequirement,
  openKeys,
  onOpenKeysChange,
}: {
  domains: ComplianceFrameworkDomainApi[];
  requirements: ComplianceFrameworkOverviewRequirementApi[];
  onSelectRequirement: (id: string) => void;
  /** Domaines ouverts (contrôlé). */
  openKeys: ReadonlySet<string>;
  onOpenKeysChange: (next: Set<string>) => void;
}) {
  if (domains.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Aucune exigence à afficher.</p>
    );
  }

  const byDomain = new Map<string, ComplianceFrameworkOverviewRequirementApi[]>();
  for (const req of requirements) {
    const key = req.category?.trim() || '__uncategorized__';
    const list = byDomain.get(key);
    if (list) list.push(req);
    else byDomain.set(key, [req]);
  }

  return (
    <div className="space-y-2">
      {domains.map((domain) => {
        const rows = byDomain.get(domain.key) ?? [];
        const isOpen = openKeys.has(domain.key);
        return (
          <details
            key={domain.key}
            className="group rounded-xl border border-border/70 bg-card open:shadow-sm"
            open={isOpen}
            onToggle={(e) => {
              const nextOpen = (e.currentTarget as HTMLDetailsElement).open;
              const next = new Set(openKeys);
              if (nextOpen) next.add(domain.key);
              else next.delete(domain.key);
              onOpenKeysChange(next);
            }}
          >
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 px-3 py-2.5 marker:content-none [&::-webkit-details-marker]:hidden">
              <ChevronRight
                className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90"
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {displayLabel(domain.label, 'Domaine')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {domain.requirementCount} exigence
                  {domain.requirementCount > 1 ? 's' : ''}
                </p>
              </div>
              <span
                className={cn(
                  'shrink-0 text-sm font-bold tabular-nums',
                  domain.compliancePercent == null
                    ? 'text-muted-foreground'
                    : 'text-foreground',
                )}
              >
                {domain.compliancePercent == null
                  ? '—'
                  : `${domain.compliancePercent} %`}
              </span>
            </summary>
            <ul className="border-t border-border/60 divide-y divide-border/60">
              {rows.map((req) => (
                <li key={req.id}>
                  <button
                    type="button"
                    className="flex w-full min-h-11 items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => onSelectRequirement(req.id)}
                  >
                    <span className="w-16 shrink-0 font-mono text-xs font-semibold text-muted-foreground">
                      {displayLabel(req.code, 'Code')}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                      {displayLabel(req.title, 'Exigence')}
                    </span>
                    <ComplianceStatusDisplay status={req.status} />
                    <ChevronRight
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                  </button>
                </li>
              ))}
            </ul>
          </details>
        );
      })}
    </div>
  );
}
