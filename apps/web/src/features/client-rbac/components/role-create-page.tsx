'use client';

import React from 'react';
import Link from 'next/link';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { RoleForm } from './role-form';
import { useCreateRole } from '../hooks/use-create-role';
import type { RoleFormValues } from '../schemas/role.schema';

export function RoleCreatePage() {
  const createRole = useCreateRole();

  const handleSubmit = (values: RoleFormValues) => {
    createRole.mutate(
      { name: values.name, description: values.description ?? null },
      {
        onError: (err) => {
          // toast in hook or throw to form
        },
      },
    );
  };

  return (
    <PageContainer>
      <PageHeader
        title="Créer un rôle"
        description="Nom et description du nouveau rôle."
        actions={
          <Link href="/client/roles" className={buttonVariants({ variant: 'outline' })}>
            Retour à la liste
          </Link>
        }
      />
      <Card>
        <CardContent className="pt-4">
          <RoleForm
            defaultValues={{ name: '', description: null }}
            onSubmit={handleSubmit}
            isSubmitting={createRole.isPending}
            submitLabel="Créer"
          />
        </CardContent>
      </Card>
    </PageContainer>
  );
}
