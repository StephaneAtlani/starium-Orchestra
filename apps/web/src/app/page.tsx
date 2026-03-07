import type { HealthResponse } from '@starium-orchestra/types';

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
    <main className="min-h-screen p-8">
      <h1 className="text-2xl font-semibold">Starium Orchestra</h1>
      <p className="mt-2 text-neutral-400">Plateforme de pilotage opérationnel</p>
      <section className="mt-8 rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
        <h2 className="text-sm font-medium text-neutral-300">État de l’API</h2>
        {health ? (
          <ul className="mt-2 space-y-1 text-sm">
            <li>
              Statut : <span className="text-emerald-400">{health.status}</span>
            </li>
            {health.database && (
              <li>
                Base : <span className="text-emerald-400">{health.database}</span>
              </li>
            )}
            {health.timestamp && (
              <li className="text-neutral-500">{health.timestamp}</li>
            )}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-amber-500">API non joignable</p>
        )}
      </section>
    </main>
  );
}
