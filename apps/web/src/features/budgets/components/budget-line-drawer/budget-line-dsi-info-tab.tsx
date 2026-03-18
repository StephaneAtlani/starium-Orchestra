'use client';

import React from 'react';
import type { BudgetLine } from '../../types/budget-management.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function BudgetLineDsiInfoTab({ line }: { line: BudgetLine }) {
  const na = 'Non disponible (MVP)';

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pilotage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="text-muted-foreground">Criticité</div>
            <div className="font-medium">{na}</div>
          </div>
          <div className="flex items-start justify-between gap-3">
            <div className="text-muted-foreground">Horizon</div>
            <div className="font-medium">{na}</div>
          </div>
          <div className="flex items-start justify-between gap-3">
            <div className="text-muted-foreground">Remarques pilotage</div>
            <div className="font-medium">{na}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dépendances & risques</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="text-muted-foreground">Dépendances</div>
            <div className="font-medium">{na}</div>
          </div>
          <div className="flex items-start justify-between gap-3">
            <div className="text-muted-foreground">Exposition fournisseur</div>
            <div className="font-medium">{na}</div>
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Contexte</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-muted-foreground">Ligne</span>
            <span className="font-medium">{line.name}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-muted-foreground">Code</span>
            <span className="font-medium">{line.code ?? '—'}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-muted-foreground">Dernière mise à jour</span>
            <span className="font-medium">{new Date(line.updatedAt).toLocaleDateString()}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            MVP : cet onglet est une structure de lecture seule. Les champs DSI seront alimentés via
            configuration / intégrations en extension.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

