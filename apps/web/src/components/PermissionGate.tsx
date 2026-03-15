'use client';

import React from 'react';
import { usePermissions } from '@/hooks/use-permissions';

interface PermissionGateProps {
  /** Code de permission requis (ex. budgets.create, budgets.update). */
  permission: string;
  /** Contenu affiché uniquement si l'utilisateur a la permission. */
  children: React.ReactNode;
  /** Si true, affiche children pendant le chargement ; sinon rien. */
  showWhileLoading?: boolean;
}

/**
 * Composant générique : affiche les children uniquement si l'utilisateur
 * possède la permission donnée pour le client actif.
 */
export function PermissionGate({
  permission,
  children,
  showWhileLoading = false,
}: PermissionGateProps) {
  const { has, isLoading } = usePermissions();

  if (isLoading && !showWhileLoading) {
    return null;
  }
  if (!has(permission)) {
    return null;
  }
  return <>{children}</>;
}
