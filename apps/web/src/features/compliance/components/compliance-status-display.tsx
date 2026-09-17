'use client';

import { AlertCircle, CheckCircle2, Clock3, HelpCircle, MinusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ComplianceAssessmentStatusApi } from '../api/compliance.api';

/** Statut d’évaluation côté UI, y compris « jamais évalué ». */
export type ComplianceUiStatus = ComplianceAssessmentStatusApi | 'NOT_ASSESSED';

const STATUS_META: Record<
  ComplianceUiStatus,
  { label: string; className: string; icon: typeof CheckCircle2 }
> = {
  COMPLIANT: {
    label: 'Conforme',
    className: 'text-[color:var(--state-success)]',
    icon: CheckCircle2,
  },
  PARTIALLY_COMPLIANT: {
    label: 'Partiel',
    className: 'text-[color:var(--brand-gold-700)]',
    icon: Clock3,
  },
  NON_COMPLIANT: {
    label: 'Écart',
    className: 'text-destructive',
    icon: AlertCircle,
  },
  NOT_APPLICABLE: {
    label: 'Non applicable',
    className: 'text-muted-foreground',
    icon: MinusCircle,
  },
  NOT_ASSESSED: {
    label: 'À évaluer',
    className: 'text-muted-foreground',
    icon: HelpCircle,
  },
};

export const COMPLIANCE_STATUS_FILTER_OPTIONS: Array<{
  value: ComplianceUiStatus;
  label: string;
}> = [
  { value: 'NOT_ASSESSED', label: STATUS_META.NOT_ASSESSED.label },
  { value: 'NON_COMPLIANT', label: STATUS_META.NON_COMPLIANT.label },
  { value: 'PARTIALLY_COMPLIANT', label: STATUS_META.PARTIALLY_COMPLIANT.label },
  { value: 'COMPLIANT', label: STATUS_META.COMPLIANT.label },
  { value: 'NOT_APPLICABLE', label: STATUS_META.NOT_APPLICABLE.label },
];

export function complianceStatusLabel(status: ComplianceUiStatus): string {
  return STATUS_META[status]?.label ?? 'Statut inconnu';
}

export function ComplianceStatusDisplay({
  status,
}: {
  status: ComplianceUiStatus | null | undefined;
}) {
  const key: ComplianceUiStatus = status ?? 'NOT_ASSESSED';
  const meta = STATUS_META[key] ?? STATUS_META.NOT_ASSESSED;
  const Icon = meta.icon;
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-sm font-semibold', meta.className)}>
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {meta.label}
    </span>
  );
}
