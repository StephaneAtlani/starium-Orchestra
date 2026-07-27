'use client';

import Link from 'next/link';
import { CalendarDays } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { RegistryBadge } from '@/lib/ui/registry-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { ComplianceGaugeRing, complianceTone } from './compliance-gauge-ring';
import type { ComplianceFrameworkSummaryApi } from '../api/compliance.api';

/** Libellé + teinte du badge d'état, dérivés du taux et du reste à évaluer. */
function frameworkBadge(summary: ComplianceFrameworkSummaryApi): {
  label: string;
  className: string;
} {
  if (summary.evaluatedCount === 0) {
    return {
      label: 'À évaluer',
      className: 'border-border/70 bg-muted/40 text-foreground',
    };
  }
  switch (complianceTone(summary.compliancePercent)) {
    case 'success':
      return {
        label: 'Conforme',
        className: 'border-emerald-600/45 bg-emerald-500/10 text-emerald-950 dark:text-emerald-500',
      };
    case 'progress':
      return {
        label: 'En progression',
        className: 'border-amber-500/50 bg-amber-500/10 text-amber-950 dark:text-amber-600',
      };
    default:
      return {
        label: 'À risque',
        className: 'border-red-500/50 bg-red-500/10 text-red-800 dark:text-red-300',
      };
  }
}

/** Sigle court affiché dans la pastille (initiales du référentiel). */
function frameworkInitials(name: string): string {
  const compact = name.replace(/[^A-Za-z0-9À-ÿ]/g, '');
  if (compact.length <= 5) return compact.toUpperCase();
  const words = name.split(/[\s/-]+/).filter(Boolean);
  if (words.length > 1) {
    return words
      .map((w) => w[0])
      .join('')
      .slice(0, 5)
      .toUpperCase();
  }
  return compact.slice(0, 5).toUpperCase();
}

function formatAuditDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
}

function StatRow({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('font-bold tabular-nums', className)}>{value}</span>
    </div>
  );
}

function FrameworkCard({ summary }: { summary: ComplianceFrameworkSummaryApi }) {
  const badge = frameworkBadge(summary);
  const audit = formatAuditDate(summary.nextAuditAt);

  return (
    <Card size="sm" className="starium-panel overflow-hidden border border-border shadow-sm">
      <CardContent className="space-y-3 pt-3">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg bg-[color:var(--brand-gold-050)] px-1 text-[11px] font-extrabold tracking-tight text-[color:var(--brand-gold-700)]"
          >
            {frameworkInitials(summary.name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-foreground" title={summary.name}>
              {summary.name}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              Version {summary.version}
              {!summary.isActive ? ' · inactif' : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <ComplianceGaugeRing
            percent={summary.compliancePercent}
            label={`Taux de conformité ${summary.name}`}
          />
          <div className="min-w-0 flex-1 space-y-1">
            <StatRow
              label="Conformes"
              value={summary.compliantCount}
              className="text-[color:var(--state-success)]"
            />
            <StatRow
              label="Partiels"
              value={summary.partiallyCompliantCount}
              className="text-[color:var(--brand-gold-700)]"
            />
            <StatRow
              label="Écarts"
              value={summary.nonCompliantCount}
              className="text-destructive"
            />
            <StatRow label="Non évaluées" value={summary.notAssessedCount} />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-2.5">
          <span className="inline-flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{audit ? `Audit : ${audit}` : 'Audit non planifié'}</span>
          </span>
          <RegistryBadge className={badge.className}>{badge.label}</RegistryBadge>
        </div>
      </CardContent>
    </Card>
  );
}

export function ComplianceFrameworkCards({
  summaries,
  isLoading,
}: {
  summaries: ComplianceFrameworkSummaryApi[] | undefined;
  isLoading: boolean;
}) {
  return (
    <section className="space-y-2" aria-labelledby="compliance-frameworks-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div>
          <h2
            id="compliance-frameworks-heading"
            className="text-sm font-semibold text-foreground"
          >
            Référentiels réglementaires
          </h2>
          <p className="text-xs text-muted-foreground">
            Avancement des contrôles par référentiel.
          </p>
        </div>
        <Link
          href="/compliance/frameworks"
          className="text-xs font-semibold text-[color:var(--brand-gold-700)] underline-offset-4 hover:underline"
        >
          Gérer les référentiels
        </Link>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-52 rounded-xl" />
          ))}
        </div>
      ) : !summaries || summaries.length === 0 ? (
        <Card size="sm" className="border border-dashed border-border/80 shadow-sm">
          <CardContent className="py-8 text-center">
            <p className="text-sm font-medium text-foreground">Aucun référentiel</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Ajoutez un référentiel pour suivre vos contrôles de conformité.
            </p>
            <Link
              href="/compliance/frameworks"
              className="mt-3 inline-block text-sm font-semibold text-[color:var(--brand-gold-700)] underline-offset-4 hover:underline"
            >
              Ajouter un référentiel
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {summaries.map((summary) => (
            <FrameworkCard key={summary.id} summary={summary} />
          ))}
        </div>
      )}
    </section>
  );
}
