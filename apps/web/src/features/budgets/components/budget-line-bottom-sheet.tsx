'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { BudgetLineDetailPanel } from './budget-line-detail-panel';

interface BudgetLineBottomSheetProps {
  budgetId: string;
  lineId: string;
  onClose: () => void;
}

export function BudgetLineBottomSheet({ budgetId, lineId, onClose }: BudgetLineBottomSheetProps) {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-x-0 bottom-0 z-[999]">
      <BudgetLineDetailPanel budgetId={budgetId} lineId={lineId} onClose={onClose} />
    </div>,
    document.body,
  );
}

