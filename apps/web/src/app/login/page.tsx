'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { useActiveClient } from '@/hooks/use-active-client';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { resolveActiveClient } from '@/lib/auth/resolve-active-client';
import type { MeClient } from '@/services/me';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ACTIVE_CLIENT_KEY = 'starium.activeClient';

export default function LoginPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, login } = useAuth();
  const { setActiveClient } = useActiveClient();
  const authenticatedFetch = useAuthenticatedFetch();
  const didLoginThisSession = useRef(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated && user && !didLoginThisSession.current) {
      router.replace('/dashboard');
    }
  }, [isLoading, isAuthenticated, user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    didLoginThisSession.current = true;
    try {
      const { user: loggedInUser, accessToken } = await login(email, password);
      // Important : après login(), le state accessToken est async.
      // On utilise donc le token retourné pour éviter un appel sans Authorization.
      const res = await fetch('/api/me/clients', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        throw new Error('Impossible de récupérer la liste des clients');
      }
      const clients = (await res.json()) as MeClient[];

      let storedActiveClientId: string | null = null;
      if (typeof window !== 'undefined') {
        const stored = window.localStorage.getItem(ACTIVE_CLIENT_KEY);
        if (stored) {
          try {
            const parsed = JSON.parse(stored) as { id?: string };
            storedActiveClientId = parsed?.id ?? null;
          } catch {
            // ignore
          }
        }
      }

      const resolution = resolveActiveClient(
        clients,
        loggedInUser.platformRole,
        storedActiveClientId,
      );

      if (resolution.type === 'redirect') {
        router.replace(resolution.to);
        return;
      }
      if (resolution.type === 'blocked') {
        router.replace('/no-client');
        return;
      }
      setActiveClient(resolution.client);
      router.replace(resolution.to);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Identifiants invalides');
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background p-4">
        <p className="text-muted-foreground">Chargement…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Connexion</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Connexion…' : 'Se connecter'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
