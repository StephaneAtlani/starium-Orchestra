'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { RoleForm } from './role-form';
import { RolePermissionsEditor } from './role-permissions-editor';
import { useRole } from '../hooks/use-role';
import { useUpdateRole } from '../hooks/use-update-role';
import { useDeleteRole } from '../hooks/use-delete-role';
import type { RoleFormValues } from '../schemas/role.schema';
import { Trash2 } from 'lucide-react';

export function RoleDetailPage() {
  const p = useParams();
  const roleId = typeof p?.id === 'string' ? p.id : '';
  const { data: role, isLoading, error } = useRole(roleId);
  const updateRole = useUpdateRole(roleId);
  const deleteRole = useDeleteRole(roleId);

  const handleSubmit = (values: RoleFormValues) => {
    updateRole.mutate({
      name: values.name,
      description: values.description ?? null,
    });
  };

  if (isLoading) {
    return (
      <PageContainer>
        <p className="text-sm text-muted-foreground py-8 text-center">
          Chargement…
        </p>
      </PageContainer>
    );
  }

  if (error || !role) {
    return (
      <PageContainer>
        <div className="py-8 text-center space-y-2">
          <p className="text-sm text-destructive">Rôle introuvable.</p>
          <Link href="/client/roles" className={buttonVariants({ variant: 'outline' })}>
            Retour à la liste
          </Link>
        </div>
      </PageContainer>
    );
  }

  const isReadOnly =
    role.isReadOnly || role.isInherited || role.scope === 'GLOBAL';
  const canDelete = !isReadOnly;
  const deleteTooltip = isReadOnly
    ? 'Rôle global hérité : suppression impossible depuis le client.'
    : 'Impossible de supprimer : rôle encore assigné à au moins un utilisateur.';

  return (
    <PageContainer>
      <PageHeader
        title={role.name}
        description={
          isReadOnly
            ? 'Rôle global hérité. Lecture seule dans le contexte client.'
            : 'Modifier le nom, la description et les permissions.'
        }
        actions={
          <div className="flex items-center gap-2">
            {role.scope === 'GLOBAL' && (
              <Badge variant="secondary">Global</Badge>
            )}
            <Link href="/client/roles" className={buttonVariants({ variant: 'outline' })}>
              Retour à la liste
            </Link>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger render={<span className="inline-block" />}>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={!canDelete}
                    onClick={() => deleteRole.mutate(undefined)}
                  >
                    <Trash2 className="size-4" />
                    Supprimer
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{deleteTooltip}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        }
      />
      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Nom et description</CardTitle>
          </CardHeader>
          <CardContent>
            <RoleForm
              defaultValues={{
                name: role.name,
                description: role.description ?? null,
              }}
              onSubmit={handleSubmit}
              isSubmitting={updateRole.isPending}
              readOnly={isReadOnly}
            />
          </CardContent>
        </Card>
        <RolePermissionsEditor
          roleId={role.id}
          permissionIds={role.permissionIds}
          isSystem={isReadOnly}
        />
      </div>
    </PageContainer>
  );
}
