'use client';

import React from 'react';
import Link from 'next/link';
import { Pencil } from 'lucide-react';
import type { BudgetLine } from '../../types/budget-management.types';
import type { FinancialEventForLine } from '../../api/budget-line-financial.api';
import { formatAmount } from '../../lib/budget-formatters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
  const reference = line.code ?? `${line.id.slice(0, 8)}…`;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Synthèse métier</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {line.description ? (
            <div className="text-muted-foreground">{line.description}</div>
          ) : (
            <div className="text-muted-foreground">Aucune description.</div>
          )}

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-md border border-border/60 p-2">
              <div className="text-xs text-muted-foreground">Scope d’allocation</div>
              <div className="mt-0.5 font-medium">{line.allocationScope ?? '—'}</div>
            </div>
            <div className="rounded-md border border-border/60 p-2">
              <div className="text-xs text-muted-foreground">Compte comptable</div>
              <div className="mt-0.5 font-medium">{line.generalLedgerAccountId ?? '—'}</div>
            </div>
            <div className="rounded-md border border-border/60 p-2">
              <div className="text-xs text-muted-foreground">Compte analytique</div>
              <div className="mt-0.5 font-medium">{line.analyticalLedgerAccountId ?? '—'}</div>
            </div>
            <div className="rounded-md border border-border/60 p-2">
              <div className="text-xs text-muted-foreground">Référence</div>
              <div className="mt-0.5 font-medium">{reference}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Contexte</CardTitle>
        </CardHeader>
        <CardContent className="relative space-y-2 text-sm">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-muted-foreground">Code ligne</span>
            <span className="font-medium">{line.code ?? '—'}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-muted-foreground">Statut</span>
            <span className="font-medium">{line.status}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-muted-foreground">Type dépense</span>
            <span className="font-medium">{line.expenseType}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-muted-foreground">Devise</span>
            <span className="font-medium">{line.currency}</span>
          </div>
          {envelopeName && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-muted-foreground">Enveloppe</span>
              <span className="font-medium">{envelopeName}</span>
              <span className="text-muted-foreground">·</span>
              <span className="font-medium">{envelopeCode ?? '—'}</span>
              <span className="text-muted-foreground">·</span>
              <span className="font-medium">{envelopeType ?? '—'}</span>
            </div>
          )}
          {budgetName && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-muted-foreground">Budget</span>
              <span className="font-medium">{budgetName}</span>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-muted-foreground">Créée le</span>
            <span className="font-medium">{new Date(line.createdAt).toLocaleDateString()}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-muted-foreground">Mise à jour</span>
            <span className="font-medium">{new Date(line.updatedAt).toLocaleDateString()}</span>
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

      <Card className="lg:col-span-2 border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Dernier événement</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {!lastEvent ? (
            <p className="text-muted-foreground">Aucun événement.</p>
          ) : (
            <div className="space-y-1">
              <div className="font-medium">{lastEvent.label}</div>
              <div className="text-muted-foreground">
                {new Date(lastEvent.eventDate).toLocaleDateString()} · {lastEvent.eventType}
              </div>
              <div className="tabular-nums">
                {formatAmount(lastEvent.amount, lastEvent.currency ?? line.currency)}
              </div>
              {lastEvent.description && (
                <div className="text-muted-foreground">{lastEvent.description}</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

