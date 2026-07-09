'use client';

import React from 'react';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { ListPlus } from 'lucide-react';
import { BudgetLineFormPage } from './pages/budget-line-form-page';

export interface NewBudgetLineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budgetId: string;
}

/**
 * Création de ligne budgétaire en modale (sans navigation vers /lines/new).
 */
export function NewBudgetLineDialog({
  open,
  onOpenChange,
  budgetId,
}: NewBudgetLineDialogProps) {
  return (
    <StariumModal
      open={open}
      onOpenChange={onOpenChange}
      title="Nouvelle ligne budgétaire"
      description="La ligne apparaît dans le tableau du budget après enregistrement."
      icon={ListPlus}
      size="xl"
      contentClassName="max-h-[min(90vh,920px)] gap-0 overflow-y-auto p-0"
      bodyClassName="px-4 py-4 sm:px-6"
    >
          {open ? (
            <BudgetLineFormPage
              key={budgetId}
              mode="create"
              budgetId={budgetId}
              variant="embedded"
              skipRedirectAfterCreate
              onCreateSuccess={() => onOpenChange(false)}
              onCloseEmbedded={() => onOpenChange(false)}
            />
          ) : null}
    </StariumModal>
  );
}
