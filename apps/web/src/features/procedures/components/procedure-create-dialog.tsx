'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ClientMember } from '@/features/client-rbac/api/user-roles';
import { displayLabel, firstDisplayLabel } from '@/lib/display-label';
import { procedureCategoryLabel } from '../lib/procedure-labels';
import type {
  CreateProcedureInput,
  ProcedureCategoryRef,
} from '../types/procedure.types';

const schema = z.object({
  code: z.string().trim().min(1, 'Code obligatoire').max(64),
  title: z.string().trim().min(1, 'Titre obligatoire').max(300),
  description: z.string().max(2000).optional(),
  categoryId: z.string().min(1, 'Catégorie obligatoire'),
  ownerUserId: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function memberLabel(m: ClientMember): string {
  const name = [m.firstName, m.lastName].filter(Boolean).join(' ').trim();
  return firstDisplayLabel([name, m.email], 'Membre');
}

export function ProcedureCreateDialog({
  open,
  onOpenChange,
  members,
  membersLoading,
  categories,
  categoriesLoading,
  onSubmit,
  isSubmitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: ClientMember[];
  membersLoading: boolean;
  categories: ProcedureCategoryRef[];
  categoriesLoading: boolean;
  onSubmit: (values: CreateProcedureInput) => void;
  isSubmitting: boolean;
}) {
  const defaultCategoryId = categories[0]?.id ?? '';
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: '',
      title: '',
      description: '',
      categoryId: defaultCategoryId,
      ownerUserId: '',
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      code: '',
      title: '',
      description: '',
      categoryId: categories[0]?.id ?? '',
      ownerUserId: '',
    });
  }, [open, form, categories]);

  const formId = 'procedure-create-form';
  const selectedCat = categories.find(
    (c) => c.id === form.watch('categoryId'),
  );

  return (
    <StariumModal
      open={open}
      onOpenChange={onOpenChange}
      title="Nouvelle procédure"
      description="Crée un brouillon version 1 pour le client actif."
      size="md"
      contentClassName="sm:max-w-lg"
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            type="submit"
            form={formId}
            disabled={isSubmitting || categoriesLoading || !categories.length}
          >
            {isSubmitting ? 'Création…' : 'Créer'}
          </Button>
        </>
      }
    >
      <form
        id={formId}
        className="space-y-4"
        onSubmit={form.handleSubmit((values) => {
          onSubmit({
            code: values.code,
            title: values.title,
            description: values.description?.trim() || undefined,
            categoryId: values.categoryId,
            ownerUserId: values.ownerUserId || undefined,
          });
        })}
      >
        <div className="space-y-2">
          <Label htmlFor="procedure-code">
            Code <span className="text-[var(--state-danger)]">*</span>
          </Label>
          <Input
            id="procedure-code"
            autoComplete="off"
            className="min-h-11"
            required
            aria-required
            {...form.register('code')}
            aria-invalid={Boolean(form.formState.errors.code)}
            aria-describedby={
              form.formState.errors.code ? 'procedure-code-error' : undefined
            }
          />
          {form.formState.errors.code ? (
            <p id="procedure-code-error" className="text-sm text-destructive">
              {form.formState.errors.code.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="procedure-title">
            Titre <span className="text-[var(--state-danger)]">*</span>
          </Label>
          <Input
            id="procedure-title"
            className="min-h-11"
            required
            aria-required
            {...form.register('title')}
            aria-invalid={Boolean(form.formState.errors.title)}
          />
          {form.formState.errors.title ? (
            <p className="text-sm text-destructive">
              {form.formState.errors.title.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="procedure-description">Description</Label>
          <Textarea
            id="procedure-description"
            rows={3}
            {...form.register('description')}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="procedure-category">
            Catégorie <span className="text-[var(--state-danger)]">*</span>
          </Label>
          <Select
            value={form.watch('categoryId') || undefined}
            onValueChange={(v) => {
              if (!v) return;
              form.setValue('categoryId', v, { shouldValidate: true });
            }}
            disabled={categoriesLoading || categories.length === 0}
          >
            <SelectTrigger
              id="procedure-category"
              className="min-h-11 w-full"
              aria-required
            >
              <SelectValue placeholder="Choisir une catégorie">
                {selectedCat
                  ? procedureCategoryLabel(selectedCat)
                  : categoriesLoading
                    ? 'Chargement…'
                    : 'Choisir une catégorie'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {procedureCategoryLabel(c)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="procedure-owner">Propriétaire</Label>
          <Select
            value={form.watch('ownerUserId') || '__none__'}
            onValueChange={(v) => {
              const next = !v || v === '__none__' ? '' : v;
              form.setValue('ownerUserId', next, { shouldValidate: true });
            }}
            disabled={membersLoading}
          >
            <SelectTrigger id="procedure-owner" className="min-h-11 w-full">
              <SelectValue
                placeholder={
                  membersLoading ? 'Chargement…' : 'Aucun propriétaire'
                }
              >
                {(() => {
                  const ownerId = form.watch('ownerUserId');
                  if (!ownerId) return 'Aucun propriétaire';
                  const member = members.find((m) => m.id === ownerId);
                  return member
                    ? displayLabel(memberLabel(member), 'Membre')
                    : 'Membre';
                })()}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Aucun propriétaire</SelectItem>
              {members.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {displayLabel(memberLabel(m), 'Membre')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </form>
    </StariumModal>
  );
}
