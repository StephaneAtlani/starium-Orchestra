'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { roleFormSchema, type RoleFormValues } from '../schemas/role.schema';

export interface RoleFormProps {
  defaultValues?: Partial<RoleFormValues>;
  onSubmit: (values: RoleFormValues) => void;
  isSubmitting?: boolean;
  submitLabel?: string;
  readOnly?: boolean;
}

export function RoleForm({
  defaultValues,
  onSubmit,
  isSubmitting = false,
  submitLabel = 'Enregistrer',
  readOnly = false,
}: RoleFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: { name: '', description: null, ...defaultValues },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="role-name">Nom</Label>
        <Input
          id="role-name"
          {...register('name')}
          disabled={readOnly}
          placeholder="Nom du rôle"
          aria-invalid={!!errors.name}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="role-description">Description</Label>
        <Input
          id="role-description"
          {...register('description')}
          disabled={readOnly}
          placeholder="Description (optionnel)"
          aria-invalid={!!errors.description}
        />
        {errors.description && (
          <p className="text-sm text-destructive">{errors.description.message}</p>
        )}
      </div>
      {!readOnly && (
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Enregistrement…' : submitLabel}
        </Button>
      )}
    </form>
  );
}
