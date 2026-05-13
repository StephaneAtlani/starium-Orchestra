'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { GlobeIcon, LockIcon, Share2Icon, TriangleAlertIcon } from 'lucide-react';
import type {
  EffectiveResourceAccessMode,
  ResourceAccessPolicyMode,
} from '../api/resource-acl.types';

interface Props {
  resourceLabel: string;
  accessPolicy: ResourceAccessPolicyMode;
  effectiveAccessMode: EffectiveResourceAccessMode;
}

export function ResourceAclPublicBanner({
  resourceLabel,
  accessPolicy,
  effectiveAccessMode,
}: Props) {
  if (effectiveAccessMode === 'RESTRICTIVE_EMPTY_DENY') {
    return (
      <Alert variant="destructive" role="status" data-testid="resource-acl-restrictive-empty">
        <TriangleAlertIcon aria-hidden="true" />
        <AlertTitle>Mode restrictif sans entrée ACL</AlertTitle>
        <AlertDescription>
          La politique «&nbsp;Restrictif&nbsp;» est active sur «&nbsp;{resourceLabel}&nbsp;» mais la
          liste est vide : aucun accès n’est accordé via cette couche tant qu’aucun sujet n’est
          explicitement autorisé.
        </AlertDescription>
      </Alert>
    );
  }

  if (
    effectiveAccessMode === 'SHARING_FLOOR_ALLOW' ||
    effectiveAccessMode === 'SHARING_FLOOR_DENY'
  ) {
    const ok = effectiveAccessMode === 'SHARING_FLOOR_ALLOW';
    return (
      <Alert
        variant={ok ? 'default' : 'destructive'}
        role="status"
        data-testid="resource-acl-sharing-floor-banner"
      >
        <Share2Icon aria-hidden="true" />
        <AlertTitle>Mode partage (SHARING)</AlertTitle>
        <AlertDescription>
          {ok ? (
            <>
              Aucune entrée ACL sur «&nbsp;{resourceLabel}&nbsp;» : le plancher RBAC de la route
              s’applique ; les entrées ACL à venir ajouteront des sujets sans bloquer ce plancher.
            </>
          ) : (
            <>
              Aucune entrée ACL sur «&nbsp;{resourceLabel}&nbsp;» en mode partage : sans validation
              RBAC explicite sur cette opération, l’accès via cette couche est refusé.
            </>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  if (effectiveAccessMode === 'PUBLIC_DEFAULT' && accessPolicy === 'DEFAULT') {
    return (
      <Alert role="status" data-testid="resource-acl-public-banner">
        <GlobeIcon aria-hidden="true" />
        <AlertTitle>Mode RBAC public</AlertTitle>
        <AlertDescription>
          Aucune restriction ACL n&apos;est posée sur «&nbsp;{resourceLabel}&nbsp;». Tous les
          utilisateurs ayant le rôle requis (RBAC) peuvent y accéder selon leurs permissions
          habituelles. Ajoutez une première entrée pour passer en liste ACL stricte (mode par
          défaut).
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert role="status" data-testid="resource-acl-access-context-banner">
      <LockIcon aria-hidden="true" />
      <AlertTitle>Contrôle d&apos;accès ressource</AlertTitle>
      <AlertDescription>
        Politique {accessPolicy.replace(/_/g, ' ')} — état{' '}
        {effectiveAccessMode.replace(/_/g, ' ')}
        pour «&nbsp;{resourceLabel}&nbsp;». Les entrées ACL ci-dessous complètent le RBAC.
      </AlertDescription>
    </Alert>
  );
}
