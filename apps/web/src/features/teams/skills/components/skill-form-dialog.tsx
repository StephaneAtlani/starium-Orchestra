'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { skillFormSchema, type SkillFormValues } from '../schemas/skill-form.schema';
import type { SkillCategoryOption, SkillListItem } from '../types/skill.types';
import { skillReferenceLevelLabel } from '../lib/skill-label-mappers';

type SkillFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  skill?: SkillListItem | null;
  categoryOptions: SkillCategoryOption[];
  onSubmit: (values: SkillFormValues) => void;
  isSubmitting: boolean;
};

const defaultValues: SkillFormValues = {
  name: '',
  description: '',
  categoryId: '',
  referenceLevel: 'INTERMEDIATE',
  status: 'DRAFT',
};

export function SkillFormDialog({
  open,
  onOpenChange,
  mode,
  skill,
  categoryOptions,
  onSubmit,
  isSubmitting,
}: SkillFormDialogProps) {
  const form = useForm<SkillFormValues>({
    resolver: zodResolver(skillFormSchema),
    defaultValues,
  });

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && skill) {
      form.reset({
        name: skill.name,
        description: skill.description ?? '',
        categoryId: skill.categoryId,
        referenceLevel: skill.referenceLevel,
        status: skill.status === 'DRAFT' ? 'DRAFT' : 'ACTIVE',
      });
    } else {
      form.reset(defaultValues);
    }
  }, [open, mode, skill, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Nouvelle compétence' : 'Modifier la compétence'}
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit((values) => {
            onSubmit(values);
          })}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="skill-name">Nom</Label>
            <Input id="skill-name" {...form.register('name')} />
            {form.formState.errors.name ? (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="skill-desc">Description</Label>
            <Input id="skill-desc" {...form.register('description')} />
          </div>
          <div className="space-y-2">
            <Label>Catégorie</Label>
            <Select
              value={form.watch('categoryId') ?? ''}
              onValueChange={(v) =>
                form.setValue('categoryId', v ?? '', { shouldValidate: true })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Choisir une catégorie" />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.categoryId ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.categoryId.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label>Niveau de référence attendu</Label>
            <Select
              value={form.watch('referenceLevel')}
              onValueChange={(v) =>
                form.setValue('referenceLevel', v as SkillFormValues['referenceLevel'], {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'] as const).map((l) => (
                  <SelectItem key={l} value={l}>
                    {skillReferenceLevelLabel(l)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {mode === 'create' ? (
            <div className="space-y-2">
              <Label>Statut initial</Label>
              <Select
                value={form.watch('status')}
                onValueChange={(v) =>
                  form.setValue('status', v as SkillFormValues['status'], { shouldValidate: true })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Brouillon</SelectItem>
                  <SelectItem value="ACTIVE">Actif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
