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
  skillCategoryFormSchema,
  type SkillCategoryFormValues,
} from '../schemas/skill-form.schema';
import type { SkillCategoryListItem } from '../types/skill.types';

type SkillCategoryFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  category?: SkillCategoryListItem | null;
  onSubmit: (values: SkillCategoryFormValues) => void;
  isSubmitting: boolean;
};

const defaultValues: SkillCategoryFormValues = {
  name: '',
  description: '',
  sortOrder: 0,
};

export function SkillCategoryFormDialog({
  open,
  onOpenChange,
  mode,
  category,
  onSubmit,
  isSubmitting,
}: SkillCategoryFormDialogProps) {
  const form = useForm<SkillCategoryFormValues>({
    resolver: zodResolver(skillCategoryFormSchema),
    defaultValues,
  });

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && category) {
      form.reset({
        name: category.name,
        description: category.description ?? '',
        sortOrder: category.sortOrder,
      });
    } else {
      form.reset(defaultValues);
    }
  }, [open, mode, category, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Nouvelle catégorie' : 'Modifier la catégorie'}
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit((values) => onSubmit(values))}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="cat-name">Nom</Label>
            <Input id="cat-name" {...form.register('name')} />
            {form.formState.errors.name ? (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="cat-desc">Description</Label>
            <Input id="cat-desc" {...form.register('description')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cat-order">Ordre d’affichage</Label>
            <Input
              id="cat-order"
              type="number"
              min={0}
              {...form.register('sortOrder', { valueAsNumber: true })}
            />
          </div>
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
