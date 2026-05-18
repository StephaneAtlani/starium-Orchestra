'use client';

import Link from 'next/link';
import { CheckCircle2, Circle, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import type { AccessModelChecklistStep } from '../api/access-model.api';

function StatusIcon({ status }: { status: AccessModelChecklistStep['status'] }) {
  if (status === 'ok') {
    return <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden />;
  }
  if (status === 'warning') {
    return <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden />;
  }
  return <Circle className="h-4 w-4 text-muted-foreground" aria-hidden />;
}

const statusLabel: Record<AccessModelChecklistStep['status'], string> = {
  ok: 'OK',
  warning: 'Attention',
  pending: 'À faire',
};

export function AccessModelRolloutChecklist({
  steps,
}: {
  steps: AccessModelChecklistStep[];
}) {
  if (steps.length === 0) return null;

  return (
    <Card className="mb-4 p-4">
      <h3 className="mb-2 text-sm font-medium">Checklist rollout (informative)</h3>
      <p className="mb-3 text-xs text-muted-foreground">
        Étapes calculées automatiquement — aucune validation manuelle en base.
      </p>
      <ul className="space-y-2">
        {steps.map((step) => (
          <li
            key={step.id}
            className="flex items-start gap-2 rounded-md border border-border/60 px-3 py-2 text-sm"
          >
            <StatusIcon status={step.status} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{step.label}</span>
                <span className="text-xs text-muted-foreground">
                  {statusLabel[step.status]}
                </span>
              </div>
              {step.detail ? (
                <p className="mt-0.5 text-xs text-muted-foreground">{step.detail}</p>
              ) : null}
              {step.href ? (
                <Link
                  href={step.href}
                  className="mt-1 inline-block text-xs text-primary underline-offset-4 hover:underline"
                >
                  Ouvrir
                </Link>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
