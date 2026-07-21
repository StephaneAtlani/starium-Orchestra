'use client';

import Link from 'next/link';
import { AlertTriangle, ChevronRight, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ActionPlanApi } from '../types/project.types';
import {
  ACTION_PLAN_STATUS_LABELS,
  actionPlanOwnerLabel,
  fmtActionPlanShortDate,
} from '../lib/action-plan-display';

const ICO_TONES = [
  'starium-mb-card-ico--info',
  'starium-mb-card-ico--gold',
  'starium-mb-card-ico--teal',
  'starium-mb-card-ico--purple',
  'starium-mb-card-ico--success',
  'starium-mb-card-ico--neutral',
] as const;

function planIcoTone(plan: ActionPlanApi, index: number): string {
  if (plan.priority === 'HIGH') return 'starium-mb-card-ico--danger';
  if (plan.status === 'COMPLETED') return 'starium-mb-card-ico--success';
  if (plan.status === 'ON_HOLD') return 'starium-mb-card-ico--gold';
  return ICO_TONES[index % ICO_TONES.length]!;
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
      className="starium-mb-cardgrid"
      role="list"
      aria-label="Choisir un plan d'action"
    >
      {items.map((plan, index) => {
        const progress = Math.min(100, Math.max(0, plan.progressPercent ?? 0));
        const overdue = isPlanOverdue(plan);
        const owner = actionPlanOwnerLabel(plan);
        const statusLabel = ACTION_PLAN_STATUS_LABELS[plan.status] ?? plan.status;
        const subtitle = [plan.code, owner !== 'Non assigné' ? owner : null]
          .filter(Boolean)
          .join(' · ');

        return (
          <Link
            key={plan.id}
            href={`/action-plans/${plan.id}`}
            role="listitem"
            className="starium-mb-card min-h-[44px]"
            aria-label={`Ouvrir le plan ${plan.title}`}
          >
            <div className="starium-mb-card-top">
              <div
                className={cn('starium-mb-card-ico', planIcoTone(plan, index))}
                aria-hidden
              >
                <ClipboardList />
              </div>
              <div className="starium-mb-card-tt">
                <div className="starium-mb-card-name">{plan.title}</div>
                <div className="starium-mb-card-dir">{subtitle}</div>
              </div>
            </div>

            <div className="starium-mb-card-total">
              Avancement
              <br />
              <b>{progress}%</b>{' '}
              <span className="text-[12px] font-semibold text-[color:var(--neutral-500)]">
                · {statusLabel}
              </span>
            </div>

            <div className="starium-mb-card-track" aria-hidden>
              <span
                className="starium-mb-card-track-fill"
                style={{
                  width: `${progress}%`,
                  background:
                    progress >= 100
                      ? 'var(--state-success)'
                      : progress >= 40
                        ? 'var(--brand-gold)'
                        : 'var(--state-info)',
                }}
              />
            </div>

            <div className="starium-mb-card-meta">
              <span>Réalisé {progress}%</span>
              <span>Échéance {fmtActionPlanShortDate(plan.targetDate)}</span>
            </div>

            <div className="starium-mb-card-foot">
              <div>
                {overdue ? (
                  <span className="starium-mb-card-alert">
                    <AlertTriangle aria-hidden />
                    En retard
                  </span>
                ) : (
                  <span className="starium-mb-card-ok">À jour</span>
                )}
              </div>
              <span className="starium-mb-card-arrow">
                Ouvrir
                <ChevronRight aria-hidden />
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
