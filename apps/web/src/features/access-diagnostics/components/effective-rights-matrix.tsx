'use client';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import type { EffectiveRightsResponse } from '../api/access-diagnostics';

type MatrixRow = {
  key: string;
  title: string;
  status: 'pass' | 'fail' | 'not_applicable';
  reasonCode: string | null;
  message: string;
};

export function toEffectiveRightsRows(
  response: EffectiveRightsResponse,
): MatrixRow[] {
  return [
    {
      key: 'licenseCheck',
      title: 'Licence',
      ...response.licenseCheck,
    },
    {
      key: 'subscriptionCheck',
      title: 'Abonnement',
      ...response.subscriptionCheck,
    },
    {
      key: 'moduleActivationCheck',
      title: 'Activation module',
      ...response.moduleActivationCheck,
    },
    {
      key: 'moduleVisibilityCheck',
      title: 'Visibilité module',
      ...response.moduleVisibilityCheck,
    },
    {
      key: 'rbacCheck',
      title: 'RBAC',
      ...response.rbacCheck,
    },
    {
      key: 'aclCheck',
      title: 'ACL ressource',
      ...response.aclCheck,
    },
  ];
}

function statusLabel(status: MatrixRow['status']): string {
  if (status === 'pass') return 'PASS';
  if (status === 'fail') return 'FAIL';
  return 'N/A';
}

function statusVariant(
  status: MatrixRow['status'],
): 'default' | 'secondary' | 'destructive' {
  if (status === 'pass') return 'default';
  if (status === 'fail') return 'destructive';
  return 'secondary';
}

export function EffectiveRightsMatrix({
  response,
}: {
  response: EffectiveRightsResponse;
}) {
  const rows = toEffectiveRightsRows(response);
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Matrice des droits effectifs</h3>
        <Badge variant={response.finalDecision === 'allowed' ? 'default' : 'destructive'}>
          {response.finalDecision === 'allowed' ? 'ALLOWED' : 'DENIED'}
        </Badge>
      </div>

      <div className="space-y-2">
        {rows.map((row) => (
          <div
            key={row.key}
            className="rounded-md border p-3 text-sm"
            data-testid={`effective-rights-row-${row.key}`}
          >
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="font-medium">{row.title}</span>
              <Badge variant={statusVariant(row.status)}>{statusLabel(row.status)}</Badge>
            </div>
            <p className="text-muted-foreground">{row.message}</p>
            {row.reasonCode && (
              <p className="mt-1 text-xs text-muted-foreground">Code: {row.reasonCode}</p>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
