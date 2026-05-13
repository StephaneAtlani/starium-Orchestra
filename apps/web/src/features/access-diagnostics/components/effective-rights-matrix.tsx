'use client';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import type {
  EffectiveRightsCheck,
  EffectiveRightsEvaluationMode,
  EffectiveRightsResponse,
  EnrichedDiagnosticCheck,
} from '../api/access-diagnostics';

type MatrixRow = {
  key: string;
  title: string;
  status: EffectiveRightsCheck['status'];
  reasonCode: string | null;
  message: string;
  evaluationMode?: EffectiveRightsEvaluationMode;
  enforcedForIntent?: boolean;
};

const EVAL_MODE_LABEL_FR: Record<EffectiveRightsEvaluationMode, string> = {
  enforced: 'Contrôle effectif (aligné RFC-018)',
  informational: 'Informatif (non bloquant seul)',
  superseded_by_decision_engine: 'Remplacé par le moteur RFC-018',
};

function rowFromCheck(
  key: string,
  title: string,
  check: EffectiveRightsCheck | EnrichedDiagnosticCheck,
): MatrixRow {
  const base: MatrixRow = {
    key,
    title,
    status: check.status,
    reasonCode: check.reasonCode,
    message: check.message,
  };
  if ('evaluationMode' in check && check.evaluationMode) {
    base.evaluationMode = check.evaluationMode;
  }
  if ('enforcedForIntent' in check) {
    base.enforcedForIntent = check.enforcedForIntent;
  }
  return base;
}

export function toEffectiveRightsRows(
  response: EffectiveRightsResponse,
): MatrixRow[] {
  const rows: MatrixRow[] = [
    rowFromCheck('licenseCheck', 'Licence', response.licenseCheck),
    rowFromCheck('subscriptionCheck', 'Abonnement', response.subscriptionCheck),
    rowFromCheck(
      'moduleActivationCheck',
      'Activation module',
      response.moduleActivationCheck,
    ),
    rowFromCheck(
      'moduleVisibilityCheck',
      'Visibilité module',
      response.moduleVisibilityCheck,
    ),
    rowFromCheck('rbacCheck', 'RBAC', response.rbacCheck),
  ];

  if (response.organizationScopeCheck) {
    rows.push(
      rowFromCheck(
        'organizationScopeCheck',
        'Périmètre organisationnel',
        response.organizationScopeCheck,
      ),
    );
  }
  if (response.resourceOwnershipCheck) {
    rows.push(
      rowFromCheck(
        'resourceOwnershipCheck',
        'Propriété organisationnelle',
        response.resourceOwnershipCheck,
      ),
    );
  }
  if (response.resourceAccessPolicyCheck) {
    rows.push(
      rowFromCheck(
        'resourceAccessPolicyCheck',
        'Politique / ACL (consolidé)',
        response.resourceAccessPolicyCheck,
      ),
    );
  }

  rows.push(rowFromCheck('aclCheck', 'ACL ressource (vue historique)', response.aclCheck));

  return rows;
}

function statusLabel(row: MatrixRow): string {
  if (row.status === 'pass') {
    if (
      row.evaluationMode === 'superseded_by_decision_engine' ||
      row.evaluationMode === 'informational'
    ) {
      return 'OK';
    }
    return 'PASS';
  }
  if (row.status === 'fail') return 'FAIL';
  return 'N/A';
}

function statusVariant(
  row: MatrixRow,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (row.status === 'pass') {
    if (
      row.evaluationMode === 'superseded_by_decision_engine' ||
      row.evaluationMode === 'informational'
    ) {
      return 'secondary';
    }
    return 'default';
  }
  if (row.status === 'fail') return 'destructive';
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
              <div className="flex shrink-0 flex-col items-end gap-1">
                <Badge variant={statusVariant(row)}>{statusLabel(row)}</Badge>
                {row.enforcedForIntent === false && (
                  <span className="text-[10px] text-muted-foreground">Informatif</span>
                )}
              </div>
            </div>
            <p className="text-muted-foreground">{row.message}</p>
            {row.evaluationMode && (
              <p className="mt-1 text-xs text-muted-foreground">
                {EVAL_MODE_LABEL_FR[row.evaluationMode]}
              </p>
            )}
            {row.reasonCode && (
              <p className="mt-1 text-xs text-muted-foreground">Code: {row.reasonCode}</p>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
