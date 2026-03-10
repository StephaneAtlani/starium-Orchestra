import type { HealthResponse } from '@starium-orchestra/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

async function fetchHealth(): Promise<HealthResponse | null> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
  try {
    const res = await fetch(`${base}/api/health`, {
      next: { revalidate: 10 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function Home() {
  const health = await fetchHealth();
  return (
    <main className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Starium Orchestra
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Plateforme de pilotage opérationnel
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">État de l’API</CardTitle>
          </CardHeader>
          <CardContent>
            {health ? (
              <ul className="space-y-1 text-sm">
                <li>
                  Statut : <span className="text-primary font-medium">{health.status}</span>
                </li>
                {health.database && (
                  <li>
                    Base : <span className="text-primary font-medium">{health.database}</span>
                  </li>
                )}
                {health.timestamp && (
                  <li className="text-muted-foreground">{health.timestamp}</li>
                )}
              </ul>
            ) : (
              <p className="text-sm text-destructive">API non joignable</p>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
