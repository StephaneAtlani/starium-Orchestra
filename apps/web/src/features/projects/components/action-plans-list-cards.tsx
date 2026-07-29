'use client';

import { AlertTriangle, ClipboardList } from 'lucide-react';
import {
  PortfolioEntityCard,
  PortfolioProgressBar,
  TableToneBadge,
  type StatusTone,
} from '@/components/portfolio';
import type { ActionPlanApi } from '../types/project.types';
import {
  ACTION_PLAN_STATUS_LABELS,
  actionPlanOwnerLabel,
  fmtActionPlanShortDate,
} from '../lib/action-plan-display';

function planTone(plan: ActionPlanApi, overdue: boolean): StatusTone {
  if (overdue) return 'danger';
  if (plan.priority === 'HIGH') return 'warn';
  if (plan.status === 'COMPLETED') return 'ok';
  if (plan.status === 'ON_HOLD' || plan.status === 'CANCELLED') return 'muted';
  if (plan.status === 'DRAFT') return 'info';
  return 'brand';
}

function statusTone(status: ActionPlanApi['status']): StatusTone {
  switch (status) {
    case 'COMPLETED':
      return 'ok';
    case 'ACTIVE':
      return 'brand';
    case 'DRAFT':
      return 'info';
    case 'ON_HOLD':
      return 'warn';
    case 'CANCELLED':
      return 'muted';
    default:
      return 'muted';
  }
}

function isPlanOverdue(plan: ActionPlanApi): boolean {
  if (!plan.targetDate) return false;
  if (plan.status === 'COMPLETED' || plan.status === 'CANCELLED') return false;
  const ts = new Date(plan.targetDate).getTime();
  if (!Number.isFinite(ts)) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return ts < today.getTime();
}

export function ActionPlansListCards({ items }: { items: ActionPlanApi[] }) {
  return (
    <div
      className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3"
      data-testid="action-plans-portfolio-cards"
    >
      {items.map((plan) => {
        const progress = Math.min(100, Math.max(0, plan.progressPercent ?? 0));
        const overdue = isPlanOverdue(plan);
        const owner = actionPlanOwnerLabel(plan);
        const statusLabel = ACTION_PLAN_STATUS_LABELS[plan.status] ?? plan.status;
        const tone = planTone(plan, overdue);
        const barTone: StatusTone =
          progress >= 100 ? 'ok' : overdue ? 'danger' : progress >= 40 ? 'brand' : 'info';

        return (
          <PortfolioEntityCard
            key={plan.id}
            href={`/action-plans/${plan.id}`}
            ariaLabel={`Ouvrir le plan ${plan.title}`}
            tone={tone}
            icon={<ClipboardList className="size-5" aria-hidden />}
            title={<span className="line-clamp-2">{plan.title}</span>}
            badges={
              <>
                <TableToneBadge tone={statusTone(plan.status)}>{statusLabel}</TableToneBadge>
                {plan.priority === 'HIGH' ? (
                  <TableToneBadge tone="danger">Priorité haute</TableToneBadge>
                ) : null}
              </>
            }
            subtitle={[plan.code, owner !== 'Non assigné' ? owner : null]
              .filter(Boolean)
              .join(' · ')}
            progress={
              <PortfolioProgressBar
                value={progress}
                tone={barTone}
                showPercent
                label={`Avancement ${plan.title}`}
              />
            }
            footer={
              <div className="flex items-center justify-between gap-2 text-xs">
                <span>
                  {overdue ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-destructive">
                      <AlertTriangle className="size-3.5" aria-hidden />
                      En retard · {fmtActionPlanShortDate(plan.targetDate)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      Échéance {fmtActionPlanShortDate(plan.targetDate)}
                    </span>
                  )}
                </span>
                <span className="font-semibold text-[color:var(--brand-gold-700)]">Ouvrir</span>
              </div>
            }
          />
        );
      })}
    </div>
  );
}
