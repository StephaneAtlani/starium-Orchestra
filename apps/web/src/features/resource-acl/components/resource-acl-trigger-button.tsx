'use client';

import { useState } from 'react';
import { ShieldIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useActiveClient } from '@/hooks/use-active-client';
import { canEditResourceAcl } from '../lib/policy';
import type { ResourceAclResourceType } from '../api/resource-acl.types';
import { ResourceAclDialog } from './resource-acl-dialog';

interface ResourceAclTriggerButtonProps {
  resourceType: ResourceAclResourceType;
  resourceId: string;
  resourceLabel: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default';
  /** Texte du bouton (défaut : « Permissions »). */
  label?: string;
  className?: string;
}

/**
 * Bouton « Permissions » des barres d'actions / headers des fiches métier.
 *
 * Visibilité **strictement** réservée au `CLIENT_ADMIN` du client actif :
 * - early return `null` **avant** tout `useQuery` ou fetch ACL ;
 * - aucune requête `/api/resource-acl/*` n'est jamais émise pour un non-`CLIENT_ADMIN`
 *   (le `ClientAdminGuard` backend renverrait `403`).
 *
 * Encapsule l'état `open` du Dialog en interne ; le `useResourceAcl` du Dialog ne
 * commence à fetch qu'à l'ouverture (le composant Dialog est monté/démonté).
 */
export function ResourceAclTriggerButton({
  resourceType,
  resourceId,
  resourceLabel,
  variant = 'outline',
  size = 'default',
  label = 'Permissions',
  className,
}: ResourceAclTriggerButtonProps) {
  const { activeClient } = useActiveClient();
  const [open, setOpen] = useState(false);

  if (!canEditResourceAcl({ activeClientRole: activeClient?.role })) {
    return null;
  }

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
        data-testid="resource-acl-trigger-button"
      >
        <ShieldIcon className="size-4" aria-hidden="true" />
        <span className="ml-2">{label}</span>
      </Button>
      {open && (
        <ResourceAclDialog
          open={open}
          onOpenChange={setOpen}
          resourceType={resourceType}
          resourceId={resourceId}
          resourceLabel={resourceLabel}
        />
      )}
    </>
  );
}
