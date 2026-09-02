'use client';

import { cn } from '@/lib/utils';

export type BudgetImportWizardStepId = 'upload' | 'mapping' | 'preview' | 'execute';

export interface BudgetImportWizardStepperProps {
  activeStep: BudgetImportWizardStepId;
  canGoToMapping: boolean;
  canGoToPreview: boolean;
  canGoToExecute: boolean;
  onStepChange: (step: BudgetImportWizardStepId) => void;
}

const STEPS: { id: BudgetImportWizardStepId; label: string }[] = [
  { id: 'upload', label: 'Fichier' },
  { id: 'mapping', label: 'Configuration' },
  { id: 'preview', label: 'Aperçu' },
  { id: 'execute', label: 'Exécution' },
];

function stepIndex(id: BudgetImportWizardStepId): number {
  return STEPS.findIndex((s) => s.id === id);
}

function canNavigateTo(
  id: BudgetImportWizardStepId,
  canGoToMapping: boolean,
  canGoToPreview: boolean,
  canGoToExecute: boolean,
): boolean {
  if (id === 'upload') return true;
  if (id === 'mapping') return canGoToMapping;
  if (id === 'preview') return canGoToPreview;
  return canGoToExecute;
}

export function BudgetImportWizardStepper({
  activeStep,
  canGoToMapping,
  canGoToPreview,
  canGoToExecute,
  onStepChange,
}: BudgetImportWizardStepperProps) {
  const activeIdx = stepIndex(activeStep);

  return (
    <nav
      className="starium-tab-group w-full max-w-2xl self-start"
      aria-label="Étapes de l’import"
    >
      {STEPS.map((step, index) => {
        const reachable = canNavigateTo(
          step.id,
          canGoToMapping,
          canGoToPreview,
          canGoToExecute,
        );
        const isActive = step.id === activeStep;
        const isDone = index < activeIdx;

        return (
          <button
            key={step.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-current={isActive ? 'step' : undefined}
            disabled={!reachable}
            className={cn(
              'starium-tab-btn min-h-11 flex-1 gap-1.5 px-3 text-sm sm:min-h-9 sm:flex-none sm:px-4',
              isActive && 'starium-tab-btn--active',
              !reachable && 'opacity-45 cursor-not-allowed',
              isDone && !isActive && reachable && 'text-foreground',
            )}
            onClick={() => {
              if (reachable) onStepChange(step.id);
            }}
          >
            <span
              className={cn(
                'inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold tabular-nums',
                isActive
                  ? 'bg-primary-foreground/20 text-primary-foreground'
                  : 'bg-muted text-muted-foreground',
              )}
              aria-hidden
            >
              {index + 1}
            </span>
            <span className="truncate">{step.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
