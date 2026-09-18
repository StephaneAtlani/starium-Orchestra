import type { ComplianceGapStatusApi } from '../api/compliance.api';

export const COMPLIANCE_GAP_STATUS_LABELS: Record<
  ComplianceGapStatusApi,
  string
> = {
  OPEN: 'Ouvert',
  IN_PROGRESS: 'En traitement',
  TO_VERIFY: 'À vérifier',
  CLOSED: 'Clôturé',
  CANCELLED: 'Annulé',
};

export function complianceGapStatusLabel(
  status: string | null | undefined,
): string {
  if (!status) return 'Statut inconnu';
  return (
    COMPLIANCE_GAP_STATUS_LABELS[status as ComplianceGapStatusApi] ??
    'Statut inconnu'
  );
}

export function canSubmitGapToVerify(status: string): boolean {
  return status === 'OPEN' || status === 'IN_PROGRESS';
}

export function canCloseOrRejectGap(status: string): boolean {
  return status === 'TO_VERIFY';
}

export function isGapTerminal(status: string): boolean {
  return status === 'CLOSED' || status === 'CANCELLED';
}
