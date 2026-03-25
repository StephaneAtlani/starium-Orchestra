'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

type Props = {
  lastSyncAt: string | null;
};

function formatIso(iso: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function SyncStatusCard({ lastSyncAt }: Props) {
  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle className="text-base">Dernière synchronisation</CardTitle>
        <CardDescription>
          Horodatage côté serveur après succès complet d’une synchronisation (tâches ou
          documents).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm font-medium tabular-nums">{formatIso(lastSyncAt)}</p>
      </CardContent>
    </Card>
  );
}
