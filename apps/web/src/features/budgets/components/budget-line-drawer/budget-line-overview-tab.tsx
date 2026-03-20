'use client';

import React from 'react';
import Link from 'next/link';
import { Pencil } from 'lucide-react';
import type { BudgetLine } from '../../types/budget-management.types';
import type { FinancialEventForLine } from '../../api/budget-line-financial.api';
import { formatAmount } from '../../lib/budget-formatters';
import { formatFinancialEventType } from '../../lib/financial-event-labels';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** Découpe une description type import (segments séparés par « · ») en lignes lisibles. */
function DescriptionDetailList({ text }: { text: string | null }) {
  if (!text?.trim()) {
    return (
      <p className="text-sm text-muted-foreground">Aucune description détaillée.</p>
    );
  }

  const segments = text
    .split(' · ')
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <ul className="divide-y divide-border/60 overflow-hidden rounded-lg border border-border/50 bg-background">
      {segments.map((seg, i) => {
        const colon = seg.indexOf(':');
        const hasLabel =
          colon > 0 && colon < seg.length - 1 && colon < 48;
        const label = hasLabel ? seg.slice(0, colon).trim() : null;
        const value = hasLabel ? seg.slice(colon + 1).trim() : seg;

        return (
          <li
            key={i}
            className="flex flex-col gap-1 px-3 py-2.5 sm:flex-row sm:items-start sm:gap-4"
          >
            {label ? (
              <>
                <span className="w-full shrink-0 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sm:w-36">
                  {label}
                </span>
                <span className="min-w-0 flex-1 text-sm leading-snug text-foreground">
                  {value}
                </span>
              </>
            ) : (
              <span className="text-sm leading-snug text-foreground">{value}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function formatLedgerLine(line: BudgetLine): string {
  const code = line.generalLedgerAccountCode?.trim();
  const name = line.generalLedgerAccountName?.trim();
  if (code && name) return `${code} — ${name}`;
  if (name) return name;
  if (code) return code;
  if (line.generalLedgerAccountId) {
    return `Réf. interne ${line.generalLedgerAccountId.slice(0, 8)}…`;
  }
  return '—';
}

function formatAnalyticalLine(line: BudgetLine): string {
  const code = line.analyticalLedgerAccountCode?.trim();
  const name = line.analyticalLedgerAccountName?.trim();
  if (code && name) return `${code} — ${name}`;
  if (name) return name;
  if (code) return code;
  if (line.analyticalLedgerAccountId) {
    return `Réf. interne ${line.analyticalLedgerAccountId.slice(0, 8)}…`;
  }
  return '—';
}

export function BudgetLineOverviewTab({
  line,
  budgetName,
  envelopeName,
  envelopeCode,
  envelopeType,
  lastEvent,
}: {
  line: BudgetLine;
  budgetName?: string | null;
  envelopeName?: string | null;
  envelopeCode?: string | null;
  envelopeType?: string | null;
  lastEvent?: FinancialEventForLine | null;
}) {
  const currency = line.currency;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="border-border/60 lg:col-span-2">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-base">Synthèse métier</CardTitle>
              <p className="mt-1 text-sm font-medium text-foreground">{line.name}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-border/60 bg-card px-3 py-2.5">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Montant facture
              </div>
              <div className="mt-1 text-base font-semibold tabular-nums text-foreground">
                {formatAmount(line.committedAmount, currency)}
              </div>
            </div>
            <div className="rounded-lg border border-border/60 bg-card px-3 py-2.5">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Consommé
              </div>
              <div className="mt-1 text-base font-semibold tabular-nums text-foreground">
                {formatAmount(line.consumedAmount, currency)}
              </div>
            </div>
            <div className="rounded-lg border border-border/60 bg-card px-3 py-2.5">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Révisé
              </div>
              <div className="mt-1 text-base font-semibold tabular-nums text-foreground">
                {formatAmount(line.revisedAmount, currency)}
              </div>
            </div>
            <div className="rounded-lg border border-border/60 bg-card px-3 py-2.5">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Restant
              </div>
              <div className="mt-1 text-base font-semibold tabular-nums text-foreground">
                {formatAmount(line.remainingAmount, currency)}
              </div>
            </div>
          </div>

          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Détail &amp; pièces
            </h4>
            <DescriptionDetailList text={line.description} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Comptes &amp; périmètre</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <div className="text-xs font-medium text-muted-foreground">Code ligne</div>
            <div className="mt-0.5 font-mono text-sm">{line.code ?? '—'}</div>
          </div>
          <div>
            <div className="text-xs font-medium text-muted-foreground">Scope d’allocation</div>
            <div className="mt-0.5">{line.allocationScope ?? '—'}</div>
          </div>
          <div>
            <div className="text-xs font-medium text-muted-foreground">Compte général</div>
            <div className="mt-0.5 leading-snug">{formatLedgerLine(line)}</div>
          </div>
          <div>
            <div className="text-xs font-medium text-muted-foreground">Compte analytique</div>
            <div className="mt-0.5 leading-snug">{formatAnalyticalLine(line)}</div>
          </div>
          {line.costCenterSplits && line.costCenterSplits.length > 0 && (
            <div>
              <div className="text-xs font-medium text-muted-foreground">Ventilation centres de coûts</div>
              <ul className="mt-1.5 space-y-1">
                {line.costCenterSplits.map((s) => (
                  <li key={s.id} className="flex justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate">
                      {s.costCenterCode ? `${s.costCenterCode} — ` : ''}
                      {s.costCenterName}
                    </span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {s.percentage}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Contexte</CardTitle>
        </CardHeader>
        <CardContent className="relative space-y-2.5 text-sm">
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <div className="text-xs text-muted-foreground">Statut</div>
              <div className="mt-0.5 font-medium">{line.status}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Type dépense</div>
              <div className="mt-0.5 font-medium">{line.expenseType}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Devise</div>
              <div className="mt-0.5 font-medium">{line.currency}</div>
            </div>
          </div>

          {envelopeName && (
            <div>
              <div className="text-xs text-muted-foreground">Enveloppe</div>
              <div className="mt-0.5 font-medium">
                {envelopeName}
                {envelopeCode ? ` · ${envelopeCode}` : ''}
                {envelopeType ? ` · ${envelopeType}` : ''}
              </div>
            </div>
          )}
          {budgetName && (
            <div>
              <div className="text-xs text-muted-foreground">Budget</div>
              <div className="mt-0.5 font-medium">{budgetName}</div>
            </div>
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <div className="text-xs text-muted-foreground">Créée le</div>
              <div className="mt-0.5 font-medium">
                {new Date(line.createdAt).toLocaleDateString('fr-FR')}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Mise à jour</div>
              <div className="mt-0.5 font-medium">
                {new Date(line.updatedAt).toLocaleDateString('fr-FR')}
              </div>
            </div>
          </div>

          <Link
            href={`/budget-lines/${line.id}/edit`}
            aria-label="Éditer la ligne"
            title="Éditer la ligne"
            className={cn(
              buttonVariants({ variant: 'outline', size: 'icon-sm' }),
              'absolute bottom-3 right-3 h-7 w-7',
            )}
          >
            <Pencil className="size-4" />
          </Link>
        </CardContent>
      </Card>

      <Card className="border-border/60 lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Dernier événement</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {!lastEvent ? (
            <p className="text-muted-foreground">Aucun événement.</p>
          ) : (
            <div className="rounded-lg border border-border/60 bg-card px-3 py-3">
              <div className="font-medium">{lastEvent.label}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {new Date(lastEvent.eventDate).toLocaleDateString('fr-FR')} ·{' '}
                {formatFinancialEventType(lastEvent.eventType)}
              </div>
              <div className="mt-2 tabular-nums font-semibold">
                {formatAmount(lastEvent.amount, lastEvent.currency ?? line.currency)}
              </div>
              {lastEvent.description && (
                <div className="mt-2 text-muted-foreground">{lastEvent.description}</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
