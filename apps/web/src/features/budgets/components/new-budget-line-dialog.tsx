'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[min(90vh,920px)] w-full gap-0 overflow-y-auto p-0 sm:max-w-4xl lg:max-w-5xl"
        showCloseButton
      >
        <div className="border-b border-border/60 px-4 py-3 pr-12 sm:px-6 sm:pr-14">
          <DialogHeader className="gap-1 text-left">
            <DialogTitle>Nouvelle ligne budgétaire</DialogTitle>
            <DialogDescription>
              La ligne apparaît dans le tableau du budget après enregistrement.
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="px-4 py-4 sm:px-6">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
