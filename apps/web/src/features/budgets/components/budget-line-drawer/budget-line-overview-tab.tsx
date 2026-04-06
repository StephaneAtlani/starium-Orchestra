'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { BudgetLine } from '../../types/budget-management.types';
import type { FinancialEventForLine } from '../../api/budget-line-financial.api';
import { formatAmount } from '../../lib/budget-formatters';
import { formatFinancialEventType } from '../../lib/financial-event-labels';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BudgetStatusBadge } from '../budget-status-badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/hooks/use-permissions';
import { useInlineUpdateBudgetLine } from '../../hooks/use-inline-update-budget-line';
import { usePatchBudgetOwner } from '../../hooks/use-patch-budget-owner';
import type { UpdateLinePayload } from '../../api/budget-management.api';
import { useClientMembers } from '@/features/client-rbac/hooks/use-client-members';
import type { ClientMember } from '@/features/client-rbac/api/user-roles';

const AUTOSAVE_MS = 650;

type EditKey = 'name' | 'description' | 'code' | 'revised' | 'scope' | 'owner' | null;

function memberLabel(m: ClientMember): string {
  const n = [m.firstName, m.lastName].filter(Boolean).join(' ').trim();
  return n || m.email;
}

/** Découpe une description type import (segments séparés par « · ») en lignes lisibles (lecture seule). */
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
  budgetStatus,
  budgetOwnerName,
  budgetOwnerUserId,
  envelopeName,
  envelopeCode,
  envelopeType,
  lastEvent,
}: {
  line: BudgetLine;
  budgetName?: string | null;
  budgetStatus?: string | null;
  budgetOwnerName?: string | null;
  /** Responsable du budget (PATCH budget), pas un champ ligne. */
  budgetOwnerUserId?: string | null;
  envelopeName?: string | null;
  envelopeCode?: string | null;
  envelopeType?: string | null;
  lastEvent?: FinancialEventForLine | null;
}) {
  const currency = line.currency;
  const { has, isLoading: permLoading } = usePermissions();
  const canEdit = !permLoading && has('budgets.update');

  const update = useInlineUpdateBudgetLine(line.id, line.budgetId, {
    silentSuccess: true,
  });
  const patchBudgetOwner = usePatchBudgetOwner(line.budgetId, { silentSuccess: true });
  const membersQuery = useClientMembers();
  const members = membersQuery.data ?? [];

  const [activeEdit, setActiveEdit] = useState<EditKey>(null);
  const closeTimerRef = useRef<number | null>(null);

  const cancelCloseEdit = useCallback(() => {
    if (closeTimerRef.current != null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const scheduleCloseEdit = useCallback(() => {
    cancelCloseEdit();
    closeTimerRef.current = window.setTimeout(() => {
      setActiveEdit(null);
      closeTimerRef.current = null;
    }, 200);
  }, [cancelCloseEdit]);

  const openEdit = useCallback(
    (key: NonNullable<EditKey>) => {
      cancelCloseEdit();
      setActiveEdit(key);
    },
    [cancelCloseEdit],
  );

  const [nameDraft, setNameDraft] = useState(line.name);
  const [descDraft, setDescDraft] = useState(line.description ?? '');
  const [codeDraft, setCodeDraft] = useState(line.code ?? '');
  const [revDraft, setRevDraft] = useState(String(line.revisedAmount ?? 0));
  const [scopeDraft, setScopeDraft] = useState(line.allocationScope ?? 'ENTERPRISE');

  const lineKey = line.id;

  useEffect(() => {
    setNameDraft(line.name);
    setDescDraft(line.description ?? '');
    setCodeDraft(line.code ?? '');
    setRevDraft(String(line.revisedAmount ?? 0));
    setScopeDraft(line.allocationScope ?? 'ENTERPRISE');
  }, [
    lineKey,
    line.name,
    line.description,
    line.code,
    line.revisedAmount,
    line.allocationScope,
  ]);

  const patch = useCallback(
    (payload: UpdateLinePayload) => {
      update.mutate(payload);
    },
    [update],
  );

  useEffect(() => {
    if (!canEdit || activeEdit !== 'name') return;
    const t = nameDraft.trim();
    if (t.length === 0 || t === line.name) return;
    const id = window.setTimeout(() => {
      patch({ name: t });
    }, AUTOSAVE_MS);
    return () => window.clearTimeout(id);
  }, [canEdit, activeEdit, nameDraft, line.name, patch]);

  useEffect(() => {
    if (!canEdit || activeEdit !== 'description') return;
    const id = window.setTimeout(() => {
      const d = descDraft;
      if (d === (line.description ?? '')) return;
      patch({ description: d || undefined });
    }, AUTOSAVE_MS);
    return () => window.clearTimeout(id);
  }, [canEdit, activeEdit, descDraft, line.description, patch]);

  useEffect(() => {
    if (!canEdit || activeEdit !== 'code') return;
    const c = codeDraft.trim();
    if (c === (line.code ?? '')) return;
    const id = window.setTimeout(() => {
      patch({ code: c || undefined });
    }, AUTOSAVE_MS);
    return () => window.clearTimeout(id);
  }, [canEdit, activeEdit, codeDraft, line.code, patch]);

  useEffect(() => {
    if (!canEdit || activeEdit !== 'revised') return;
    const raw = revDraft.replace(',', '.').trim();
    const num = parseFloat(raw);
    if (!Number.isFinite(num) || num < 0) return;
    if (num === line.revisedAmount) return;
    const id = window.setTimeout(() => {
      patch({ revisedAmount: num });
    }, AUTOSAVE_MS);
    return () => window.clearTimeout(id);
  }, [canEdit, activeEdit, revDraft, line.revisedAmount, patch]);

  const onScopeChange = (v: string) => {
    if (!canEdit) return;
    setScopeDraft(v as 'ENTERPRISE' | 'ANALYTICAL');
    if (v === line.allocationScope) {
      setActiveEdit(null);
      return;
    }
    patch({ allocationScope: v as 'ENTERPRISE' | 'ANALYTICAL' });
    setActiveEdit(null);
  };

  const ownerDisplayName = (() => {
    const id = budgetOwnerUserId?.trim();
    if (!id) return budgetOwnerName?.trim() || '—';
    const m = members.find((u) => u.id === id);
    if (m) return memberLabel(m);
    return budgetOwnerName?.trim() || '—';
  })();

  const onOwnerSelect = (userId: string) => {
    if (!canEdit) return;
    const next = userId === '' ? null : userId;
    const cur = budgetOwnerUserId?.trim() || null;
    if (next === cur) {
      setActiveEdit(null);
      return;
    }
    patchBudgetOwner.mutate(next);
    setActiveEdit(null);
  };

  const saving = update.isPending || patchBudgetOwner.isPending;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="border-border/60 lg:col-span-2">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-base">Synthèse métier</CardTitle>
                {saving && (
                  <span className="text-xs font-normal text-muted-foreground">
                    Enregistrement…
                  </span>
                )}
              </div>
              {canEdit && activeEdit === 'name' ? (
                <Input
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onBlur={scheduleCloseEdit}
                  autoFocus
                  className="mt-2 h-auto border-dashed py-1.5 text-sm font-medium"
                  aria-label="Nom de la ligne"
                />
              ) : (
                <div className="mt-1">
                  {canEdit ? (
                    <button
                      type="button"
                      className="w-full rounded-md border border-transparent px-1 py-0.5 text-left text-sm font-medium text-foreground transition-colors hover:border-border/60 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onMouseDown={cancelCloseEdit}
                      onClick={() => openEdit('name')}
                    >
                      {line.name}
                    </button>
                  ) : (
                    <p className="text-sm font-medium text-foreground">{line.name}</p>
                  )}
                </div>
              )}
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
              <p className="mt-1 text-[10px] text-muted-foreground">Calculé (événements)</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-card px-3 py-2.5">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Consommé
              </div>
              <div className="mt-1 text-base font-semibold tabular-nums text-foreground">
                {formatAmount(line.consumedAmount, currency)}
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">Calculé (événements)</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-card px-3 py-2.5">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Révisé
              </div>
              {canEdit && activeEdit === 'revised' ? (
                <Input
                  type="text"
                  inputMode="decimal"
                  value={revDraft}
                  onChange={(e) => setRevDraft(e.target.value)}
                  onBlur={scheduleCloseEdit}
                  autoFocus
                  className="mt-1 h-9 tabular-nums font-semibold"
                  aria-label="Montant révisé"
                />
              ) : (
                <div className="mt-1">
                  {canEdit ? (
                    <button
                      type="button"
                      className="w-full rounded-md border border-dashed border-transparent px-1 py-0.5 text-left tabular-nums text-base font-semibold transition-colors hover:border-border/60 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onMouseDown={cancelCloseEdit}
                      onClick={() => openEdit('revised')}
                    >
                      {formatAmount(line.revisedAmount, currency)}
                    </button>
                  ) : (
                    <div className="text-base font-semibold tabular-nums text-foreground">
                      {formatAmount(line.revisedAmount, currency)}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="rounded-lg border border-border/60 bg-card px-3 py-2.5">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Restant
              </div>
              <div className="mt-1 text-base font-semibold tabular-nums text-foreground">
                {formatAmount(line.remainingAmount, currency)}
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">Calculé</p>
            </div>
          </div>

          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Détail &amp; pièces
            </h4>
            {canEdit && activeEdit === 'description' ? (
              <div className="space-y-2">
                <textarea
                  value={descDraft}
                  onChange={(e) => setDescDraft(e.target.value)}
                  onBlur={scheduleCloseEdit}
                  autoFocus
                  rows={5}
                  className={cn(
                    'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm',
                    'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  )}
                  placeholder="Description, détail des pièces…"
                  aria-label="Description de la ligne"
                />
                {descDraft.includes(' · ') && (
                  <div className="rounded-md border border-border/50 bg-muted/30 p-2">
                    <p className="mb-1 text-[10px] font-medium uppercase text-muted-foreground">
                      Aperçu structuré
                    </p>
                    <DescriptionDetailList text={descDraft} />
                  </div>
                )}
              </div>
            ) : (
              <div>
                {canEdit ? (
                  <button
                    type="button"
                    className="w-full rounded-md border border-transparent p-1 text-left transition-colors hover:border-border/60 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onMouseDown={cancelCloseEdit}
                    onClick={() => openEdit('description')}
                  >
                    <DescriptionDetailList text={line.description} />
                  </button>
                ) : (
                  <DescriptionDetailList text={line.description} />
                )}
              </div>
            )}
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
            {canEdit && activeEdit === 'code' ? (
              <Input
                value={codeDraft}
                onChange={(e) => setCodeDraft(e.target.value)}
                onBlur={scheduleCloseEdit}
                autoFocus
                className="mt-1 font-mono text-sm"
                placeholder="Code"
                aria-label="Code ligne"
              />
            ) : (
              <div className="mt-0.5">
                {canEdit ? (
                  <button
                    type="button"
                    className="w-full rounded-md border border-transparent px-1 py-0.5 text-left font-mono text-sm transition-colors hover:border-border/60 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onMouseDown={cancelCloseEdit}
                    onClick={() => openEdit('code')}
                  >
                    {line.code ?? '—'}
                  </button>
                ) : (
                  <div className="font-mono text-sm">{line.code ?? '—'}</div>
                )}
              </div>
            )}
          </div>
          <div>
            <div className="text-xs font-medium text-muted-foreground">Responsable du budget</div>
            {canEdit && activeEdit === 'owner' ? (
              <select
                value={budgetOwnerUserId ?? ''}
                onChange={(e) => onOwnerSelect(e.target.value)}
                onBlur={scheduleCloseEdit}
                autoFocus
                disabled={membersQuery.isLoading || patchBudgetOwner.isPending}
                className="mt-1 flex h-9 w-full max-w-md rounded-md border border-input bg-background px-2 text-sm"
                aria-label="Responsable du budget"
              >
                <option value="">— Non défini</option>
                {budgetOwnerUserId &&
                  !members.some((u) => u.id === budgetOwnerUserId) && (
                    <option value={budgetOwnerUserId}>
                      {budgetOwnerName?.trim() || budgetOwnerUserId}
                    </option>
                  )}
                {members.map((u) => (
                  <option key={u.id} value={u.id}>
                    {memberLabel(u)}
                  </option>
                ))}
              </select>
            ) : (
              <div className="mt-0.5">
                {canEdit ? (
                  <button
                    type="button"
                    className="w-full rounded-md border border-transparent px-1 py-0.5 text-left leading-snug transition-colors hover:border-border/60 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onMouseDown={cancelCloseEdit}
                    onClick={() => openEdit('owner')}
                  >
                    {ownerDisplayName}
                  </button>
                ) : (
                  <div className="leading-snug">{ownerDisplayName}</div>
                )}
              </div>
            )}
          </div>
          <div>
            <div className="text-xs font-medium text-muted-foreground">Scope d’allocation</div>
            {canEdit && activeEdit === 'scope' ? (
              <select
                value={scopeDraft}
                onChange={(e) => onScopeChange(e.target.value)}
                onBlur={scheduleCloseEdit}
                autoFocus
                className="mt-1 flex h-9 w-full max-w-xs rounded-md border border-input bg-background px-2 text-sm"
                aria-label="Scope d’allocation"
              >
                <option value="ENTERPRISE">ENTERPRISE</option>
                <option value="ANALYTICAL">ANALYTICAL</option>
              </select>
            ) : (
              <div className="mt-0.5">
                {canEdit ? (
                  <button
                    type="button"
                    className="w-full rounded-md border border-transparent px-1 py-0.5 text-left transition-colors hover:border-border/60 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onMouseDown={cancelCloseEdit}
                    onClick={() => openEdit('scope')}
                  >
                    {line.allocationScope ?? '—'}
                  </button>
                ) : (
                  <div>{line.allocationScope ?? '—'}</div>
                )}
              </div>
            )}
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
              <div className="text-xs font-medium text-muted-foreground">
                Ventilation centres de coûts
              </div>
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
        <CardContent className="space-y-2.5 text-sm">
          <div className="grid gap-2 sm:grid-cols-2">
            {budgetStatus && (
              <div>
                <div className="text-xs text-muted-foreground">Statut du budget</div>
                <div className="mt-0.5">
                  <BudgetStatusBadge status={budgetStatus} className="h-5 px-2 text-[10px] uppercase" />
                </div>
              </div>
            )}
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
