'use client';

import React, { useRef, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export interface BudgetImportUploadStepProps {
  onAnalyzeFile: (file: File) => void;
  isLoading: boolean;
  errorMessage: string | null;
}

export function BudgetImportUploadStep({
  onAnalyzeFile,
  isLoading,
  errorMessage,
}: BudgetImportUploadStepProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {errorMessage ? (
        <Alert variant="destructive">
          <AlertTitle>Analyse impossible</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="budget-import-file">Fichier (.csv ou .xlsx, max 10 Mo)</Label>
        <input
          id="budget-import-file"
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx"
          className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border file:border-border file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium"
          disabled={isLoading}
          onChange={(e) => {
            const f = e.target.files?.[0];
            setFileName(f?.name ?? null);
          }}
        />
        {fileName ? (
          <p className="text-sm text-muted-foreground">Fichier sélectionné : {fileName}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            L’analyse détecte les colonnes et un extrait de lignes.
          </p>
        )}
      </div>
      <Button
        type="button"
        disabled={isLoading || !fileName}
        onClick={() => {
          const f = inputRef.current?.files?.[0];
          if (f) onAnalyzeFile(f);
        }}
      >
        {isLoading ? 'Analyse…' : 'Analyser le fichier'}
      </Button>
    </div>
  );
}
