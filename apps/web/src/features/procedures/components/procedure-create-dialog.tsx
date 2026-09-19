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
import { cn } from '@/lib/utils';
import { procedureCategoryLabel } from '../lib/procedure-labels';
import type {
  CreateProcedureInput,
  ProcedureCategoryRef,
  ProcedureTemplate,
} from '../types/procedure.types';

const NONE_TEMPLATE = '__none__';

const schema = z.object({
  code: z.string().trim().max(64).optional(),
  title: z.string().trim().min(1, 'Titre obligatoire').max(300),
  description: z.string().max(2000).optional(),
  categoryId: z.string().min(1, 'Catégorie obligatoire'),
  ownerUserId: z.string().optional(),
  templateId: z.string().optional(),
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
  templates = [],
  templatesLoading = false,
  onSubmit,
  isSubmitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: ClientMember[];
  membersLoading: boolean;
  categories: ProcedureCategoryRef[];
  categoriesLoading: boolean;
  templates?: ProcedureTemplate[];
  templatesLoading?: boolean;
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
      templateId: '',
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
      templateId: '',
    });
  }, [open, form, categories]);

  const formId = 'procedure-create-form';
  const selectedCat = categories.find(
    (c) => c.id === form.watch('categoryId'),
  );
  const selectedTemplateId = form.watch('templateId') || '';
  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  useEffect(() => {
    if (!selectedTemplate?.categoryId) return;
    const exists = categories.some((c) => c.id === selectedTemplate.categoryId);
    if (exists) {
      form.setValue('categoryId', selectedTemplate.categoryId, {
        shouldValidate: true,
      });
    }
  }, [selectedTemplate, categories, form]);

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
          <Button
            type="button"
            variant="outline"
            className="min-h-11 sm:min-h-9"
            onClick={() => onOpenChange(false)}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            form={formId}
            className="min-h-11 sm:min-h-9"
            disabled={isSubmitting || categoriesLoading || !categories.length}
          >
            {isSubmitting ? 'Création…' : 'Créer'}
          </Button>
        </>
      }
    >
      <form
        id={formId}
        className="starium-form space-y-4"
        onSubmit={form.handleSubmit((values) => {
          const code = values.code?.trim();
          onSubmit({
            ...(code ? { code } : {}),
            title: values.title,
            description: values.description?.trim() || undefined,
            categoryId: values.categoryId,
            ownerUserId: values.ownerUserId || undefined,
            templateId: values.templateId || undefined,
          });
        })}
      >
        {!categoriesLoading && categories.length === 0 ? (
          <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
            Aucune catégorie active — créez-en une dans Configuration.
          </p>
        ) : null}

        <div className="starium-form-field space-y-2">
          <Label htmlFor="procedure-template" className="starium-form-label">
            Modèle (optionnel)
          </Label>
          <Select
            value={selectedTemplateId || NONE_TEMPLATE}
            onValueChange={(v) => {
              form.setValue(
                'templateId',
                !v || v === NONE_TEMPLATE ? '' : v,
                { shouldValidate: true },
              );
            }}
            disabled={templatesLoading}
          >
            <SelectTrigger
              id="procedure-template"
              className="starium-form-select min-h-11 w-full"
            >
              <SelectValue placeholder="Document vide">
                {selectedTemplate
                  ? displayLabel(selectedTemplate.name, 'Modèle')
                  : templatesLoading
                    ? 'Chargement…'
                    : 'Document vide'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_TEMPLATE}>Document vide</SelectItem>
              {templates.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {displayLabel(t.name, 'Modèle')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedTemplate && selectedTemplate.outline.length > 0 ? (
            <div
              className="rounded-lg border border-border/70 bg-muted/30 p-3 text-sm"
              aria-live="polite"
            >
              <p className="mb-2 font-medium text-foreground">Aperçu de l’outline</p>
              <ul className="space-y-1 text-muted-foreground">
                {selectedTemplate.outline.map((item, i) => (
                  <li
                    key={`${item.level}-${i}-${item.title}`}
                    className={cn(
                      item.level === 2 && 'pl-3',
                      item.level === 3 && 'pl-6',
                    )}
                  >
                    H{item.level} — {displayLabel(item.title, 'Titre')}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
        <div className="starium-form-field space-y-2">
          <Label htmlFor="procedure-code" className="starium-form-label">
            Code
          </Label>
          <Input
            id="procedure-code"
            autoComplete="off"
            className="starium-form-input min-h-11"
            placeholder="Optionnel"
            {...form.register('code')}
            aria-invalid={Boolean(form.formState.errors.code)}
            aria-describedby={
              form.formState.errors.code
                ? 'procedure-code-error'
                : 'procedure-code-hint'
            }
          />
          {form.formState.errors.code ? (
            <p id="procedure-code-error" className="starium-form-hint text-destructive">
              {form.formState.errors.code.message}
            </p>
          ) : (
            <p id="procedure-code-hint" className="starium-form-hint text-muted-foreground">
              Optionnel — généré automatiquement à la publication s’il est vide.
            </p>
          )}
        </div>

        <div className="starium-form-field space-y-2">
          <Label htmlFor="procedure-title" className="starium-form-label">
            Titre <span className="text-[var(--state-danger)]">*</span>
          </Label>
          <Input
            id="procedure-title"
            className="starium-form-input min-h-11"
            required
            aria-required
            {...form.register('title')}
            aria-invalid={Boolean(form.formState.errors.title)}
            aria-describedby={
              form.formState.errors.title ? 'procedure-title-error' : undefined
            }
          />
          {form.formState.errors.title ? (
            <p id="procedure-title-error" className="starium-form-hint text-destructive">
              {form.formState.errors.title.message}
            </p>
          ) : null}
        </div>

        <div className="starium-form-field space-y-2">
          <Label htmlFor="procedure-description" className="starium-form-label">
            Description
          </Label>
          <Textarea
            id="procedure-description"
            className="starium-form-textarea"
            rows={3}
            {...form.register('description')}
          />
        </div>

        <div className="starium-form-field space-y-2">
          <Label htmlFor="procedure-category" className="starium-form-label">
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
              className="starium-form-select min-h-11 w-full"
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

        <div className="starium-form-field space-y-2">
          <Label htmlFor="procedure-owner" className="starium-form-label">
            Propriétaire
          </Label>
          <Select
            value={form.watch('ownerUserId') || '__none__'}
            onValueChange={(v) => {
              const next = !v || v === '__none__' ? '' : v;
              form.setValue('ownerUserId', next, { shouldValidate: true });
            }}
            disabled={membersLoading}
          >
            <SelectTrigger
              id="procedure-owner"
              className="starium-form-select min-h-11 w-full"
            >
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
