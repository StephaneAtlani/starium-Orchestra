'use client';

import React from 'react';
import type { BudgetLine } from '../../types/budget-management.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function BudgetLineDsiInfoTab({ line }: { line: BudgetLine }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Informations DSI</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground space-y-2">
        <p>
          MVP : onglet placeholder (lecture seule). Les enrichissements (criticité, récurrence,
          renouvellement, dépendances) viendront en extension.
        </p>
        <p>
          Ligne : <span className="text-foreground font-medium">{line.name}</span>
        </p>
      </CardContent>
    </Card>
  );
}

