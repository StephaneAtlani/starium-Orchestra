'use client';

import { ClipboardList } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { Button } from '@/components/ui/button';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { listComplianceRequirements } from '../api/compliance.api';
import { ComplianceRequirementsList } from './compliance-requirements-list';

type ComplianceRequirementsModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Liste des exigences / contrôles en modale large (dashboard conformité).
 */
export function ComplianceRequirementsModal({
  open,
  onOpenChange,
}: ComplianceRequirementsModalProps) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  const q = useQuery({
    queryKey: ['compliance', 'requirements', clientId],
    queryFn: () => listComplianceRequirements(authFetch),
    enabled: open && Boolean(clientId),
  });

  return (
    <StariumModal
      open={open}
      onOpenChange={onOpenChange}
      title="Exigences"
      description="Contrôles à évaluer par référentiel — filtrez les écarts et les exigences à évaluer."
      icon={ClipboardList}
      size="full"
      contentClassName="flex h-[min(90dvh,calc(100dvh-2rem))] max-h-[min(90dvh,calc(100dvh-2rem))] flex-col sm:max-w-6xl"
      bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden px-5 py-5"
      footer={
        <Button
          type="button"
          variant="outline"
          className="min-h-11 sm:min-h-9"
          onClick={() => onOpenChange(false)}
        >
          Fermer
        </Button>
      }
    >
      <ComplianceRequirementsList
        rows={q.data}
        isLoading={q.isLoading}
        error={q.error instanceof Error ? q.error : null}
        onRetry={() => void q.refetch()}
      />
    </StariumModal>
  );
}
