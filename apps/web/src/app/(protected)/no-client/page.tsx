'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function NoClientPage() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Aucun client actif disponible</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Vous n&apos;avez accès à aucun client actif. Contactez votre
            administrateur pour obtenir un accès.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
