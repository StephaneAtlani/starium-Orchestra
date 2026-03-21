'use client';

import React, { useMemo } from 'react';
import { usePermissions } from '@/hooks/use-permissions';

interface PermissionGateProps {
  /** Code de permission requis (ex. budgets.create, budgets.update). */
  permission?: string;
  /** Toutes les permissions listées doivent être présentes (ET logique). */
  permissions?: string[];
  /** Contenu affiché uniquement si l'utilisateur a la/les permission(s). */
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
  permissions,
  children,
  showWhileLoading = false,
}: PermissionGateProps) {
  const { has, isLoading, isSuccess } = usePermissions();

  const requiredCodes = useMemo(() => {
    if (permissions?.length) return permissions;
    if (permission) return [permission];
    return [];
  }, [permission, permissions]);

  if (requiredCodes.length === 0) {
    return <>{children}</>;
  }

  if (!isSuccess) {
    if (showWhileLoading && isLoading) {
      return <>{children}</>;
    }
    return null;
  }
  for (const code of requiredCodes) {
    if (!has(code)) {
      return null;
    }
  }
  return <>{children}</>;
}
