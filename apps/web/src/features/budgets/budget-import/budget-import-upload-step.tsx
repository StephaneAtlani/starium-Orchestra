'use client';

import React, { useRef, useState } from 'react';
import { FileSpreadsheet, Upload } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

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
  const [dragOver, setDragOver] = useState(false);

  const pickFile = () => inputRef.current?.click();

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    setFileName(file.name);
    if (inputRef.current) {
      const dt = new DataTransfer();
      dt.items.add(file);
      inputRef.current.files = dt.files;
    }
  };

  return (
    <div className="space-y-5">
      {errorMessage ? (
        <Alert variant="destructive">
          <AlertTitle>Analyse impossible</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="budget-import-file">Fichier source</Label>
        <div
          className={cn(
            'rounded-lg border border-dashed border-border/80 bg-muted/20 p-6 sm:p-8 text-center transition-colors',
            dragOver && 'border-[color:var(--brand-gold)] bg-[color:var(--brand-gold-050)]/40',
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFile(e.dataTransfer.files?.[0]);
          }}
        >
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-[color:var(--brand-gold-100)]/60">
            <Upload className="size-6 text-[color:var(--brand-gold-700)]" aria-hidden />
          </div>
          <p className="text-sm font-medium text-foreground">
            Déposez un fichier ou sélectionnez-le
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Formats acceptés : CSV ou Excel (.xlsx), 10 Mo max, 20&nbsp;000 lignes.
          </p>
          {fileName ? (
            <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-sm">
              <FileSpreadsheet className="size-4 text-[color:var(--brand-gold)]" aria-hidden />
              {fileName}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="min-h-11 sm:min-h-9"
              disabled={isLoading}
              onClick={pickFile}
            >
              Parcourir…
            </Button>
            <Button
              type="button"
              className="min-h-11 sm:min-h-9"
              disabled={isLoading || !fileName}
              onClick={() => {
                const f = inputRef.current?.files?.[0];
                if (f) onAnalyzeFile(f);
              }}
            >
              {isLoading ? 'Analyse…' : 'Analyser le fichier'}
            </Button>
          </div>
        </div>
        <input
          id="budget-import-file"
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx"
          className="sr-only"
          disabled={isLoading}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <p className="text-xs text-muted-foreground">
          L’analyse détecte automatiquement les colonnes et propose un mapping initial.
        </p>
      </div>
    </div>
  );
}
