'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { GlobeIcon } from 'lucide-react';

interface Props {
  resourceLabel: string;
}

export function ResourceAclPublicBanner({ resourceLabel }: Props) {
  return (
    <Alert role="status" data-testid="resource-acl-public-banner">
      <GlobeIcon aria-hidden="true" />
      <AlertTitle>Mode RBAC public</AlertTitle>
      <AlertDescription>
        Aucune restriction ACL n'est posée sur «&nbsp;{resourceLabel}&nbsp;». Tous les
        utilisateurs ayant le rôle requis (RBAC) peuvent y accéder selon leurs
        permissions habituelles. Ajoutez une première entrée pour passer en mode
        restreint.
      </AlertDescription>
    </Alert>
  );
}
