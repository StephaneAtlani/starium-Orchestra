'use client';

import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { AnalyzeResult } from '../types/budget-imports.types';

export interface BudgetImportConfigFileSheetBlockProps {
  analyzeResult: AnalyzeResult;
  excelSheetValue: string | undefined;
  sheetChangeLoading: boolean;
  sheetChangeError: string | null;
  onExcelSheetChange: (sheetName: string) => void;
  onChangeFile: () => void;
}

export function BudgetImportConfigFileSheetBlock({
  analyzeResult,
  excelSheetValue,
  sheetChangeLoading,
  sheetChangeError,
  onExcelSheetChange,
  onChangeFile,
}: BudgetImportConfigFileSheetBlockProps) {
  const isXlsx = analyzeResult.sourceType === 'XLSX';
  const sheetNames = analyzeResult.sheetNames ?? [];
  const columns = analyzeResult.columns;
  const rowCount = analyzeResult.rowCount;

  return (
    <section className="space-y-4 rounded-lg border border-border bg-card p-4 shadow-sm" aria-labelledby="config-file-sheet-heading">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 id="config-file-sheet-heading" className="text-base font-semibold tracking-tight">
          Fichier et feuille
        </h2>
        <button
          type="button"
          className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
          onClick={onChangeFile}
        >
          Changer de fichier
        </button>
      </div>
      <p className="text-sm text-muted-foreground">
        {rowCount} ligne{rowCount > 1 ? 's' : ''} de données détectée{rowCount > 1 ? 's' : ''} · {columns.length}{' '}
        colonne{columns.length > 1 ? 's' : ''}
      </p>

      {isXlsx && sheetNames.length > 0 ? (
        <div className="space-y-2">
          <Label htmlFor="excel-sheet-select-config">Onglet Excel à importer</Label>
          <Select
            value={excelSheetValue ?? sheetNames[0]!}
            onValueChange={(v) => {
              if (v == null || v === '') return;
              onExcelSheetChange(v);
            }}
            disabled={sheetChangeLoading}
          >
            <SelectTrigger id="excel-sheet-select-config" className="w-full max-w-md">
              <SelectValue>{excelSheetValue ?? sheetNames[0]!}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {sheetNames.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Les colonnes ci-dessous correspondent à l’onglet choisi. Changer d’onglet relit le fichier (sans le
            renvoyer).
          </p>
          {sheetChangeError ? (
            <Alert variant="destructive">
              <AlertDescription>{sheetChangeError}</AlertDescription>
            </Alert>
          ) : null}
          {sheetChangeLoading ? <p className="text-xs text-muted-foreground">Lecture de l’onglet…</p> : null}
        </div>
      ) : !isXlsx ? (
        <p className="text-sm text-muted-foreground">
          Fichier CSV : il n’y a pas de feuilles / onglets. Les colonnes listées ci-dessous proviennent directement du
          fichier.
        </p>
      ) : null}

      {columns.length === 0 ? (
        <Alert variant="destructive">
          <AlertDescription>Aucune colonne détectée : vérifiez le fichier ou la ligne d’en-têtes.</AlertDescription>
        </Alert>
      ) : (
        <ul className="flex flex-wrap gap-2" aria-label="Liste des en-têtes de colonnes">
          {columns.map((c, i) => (
            <li key={`${c}-${i}`}>
              <Badge variant="secondary" className="max-w-full font-normal">
                <span className="truncate" title={c}>
                  {c}
                </span>
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
