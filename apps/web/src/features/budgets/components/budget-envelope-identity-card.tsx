'use client';

import React from 'react';
import type { BudgetEnvelopeDetail } from '../types/budget-envelope-detail.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface BudgetEnvelopeIdentityCardProps {
  envelope: BudgetEnvelopeDetail;
}

export function BudgetEnvelopeIdentityCard({
  envelope,
}: BudgetEnvelopeIdentityCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Identité de l’enveloppe</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 text-sm">
        <div>
          <span className="text-muted-foreground">Nom</span>
          <div>{envelope.name}</div>
        </div>
        {envelope.code && (
          <div>
            <span className="text-muted-foreground">Code</span>
            <div>{envelope.code}</div>
          </div>
        )}
        {envelope.description && (
          <div>
            <span className="text-muted-foreground">Description</span>
            <div>{envelope.description}</div>
          </div>
        )}
        <div>
          <span className="text-muted-foreground">Devise</span>
          <div>{envelope.currency}</div>
        </div>
      </CardContent>
    </Card>
  );
}

