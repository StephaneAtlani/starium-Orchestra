'use client';

import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  message = 'Une erreur est survenue.',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <Alert variant="destructive" className={className} data-testid="error-state">
      <AlertTitle>Erreur</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
      {onRetry && (
        <div className="mt-3">
          <Button variant="outline" size="sm" onClick={onRetry}>
            Réessayer
          </Button>
        </div>
      )}
    </Alert>
  );
}
