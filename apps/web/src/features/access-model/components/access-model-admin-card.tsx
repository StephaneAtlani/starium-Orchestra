'use client';

import Link from 'next/link';
import { Shield } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { usePermissions } from '@/hooks/use-permissions';

export function AccessModelAdminCard() {
  const { has, isSuccess } = usePermissions();
  if (!isSuccess || !has('access_model.read')) return null;

  return (
    <Link href="/client/administration/access-model">
      <Card className="h-full cursor-pointer transition-colors hover:bg-muted/50">
        <CardContent className="flex items-center gap-4 pt-6">
          <div className="rounded-lg bg-primary/10 p-3">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Modèle d&apos;accès</h3>
            <p className="text-sm text-muted-foreground">
              KPI santé Direction, liens HUMAN, ACL et politiques
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
