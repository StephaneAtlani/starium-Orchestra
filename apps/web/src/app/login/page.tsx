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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';

const ACTIVE_CLIENT_KEY = 'starium.activeClient';
const BOOTSTRAP_FROM_LOGIN_KEY = 'starium.bootstrapFromLogin';

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
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(
          BOOTSTRAP_FROM_LOGIN_KEY,
          JSON.stringify({ client: resolution.client }),
        );
      }
      router.replace(resolution.to);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Identifiants invalides');
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <p className="text-muted-foreground">Chargement…</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-4xl">
        <div className="grid gap-0 md:grid-cols-2">
          <div className="relative hidden flex-col justify-between bg-muted/40 p-8 md:flex">
            <div className="text-sm font-medium tracking-tight text-muted-foreground">
              Starium Orchestra
            </div>
            <div className="mt-8 text-xs text-muted-foreground">
              <p className="font-medium">
                « Votre cockpit de gouvernance IT, finance et opérations. »
              </p>
            </div>
          </div>
          <div className="flex items-center justify-center p-6 md:p-8">
            <div className="w-full max-w-sm">
              <div className="mb-6 flex items-center justify-between text-xs text-muted-foreground">
                <span>Accès cockpit</span>
                <span className="font-medium">Connexion</span>
              </div>
              <CardTitle className="mb-1 text-2xl font-semibold tracking-tight">
                Se connecter
              </CardTitle>
              <CardDescription className="mb-6">
                Entrez vos identifiants pour accéder à vos clients et à vos
                espaces.
              </CardDescription>
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
                <Button
                  type="submit"
                  className="mt-2 w-full"
                  disabled={submitting}
                >
                  {submitting ? 'Connexion…' : 'Se connecter'}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </Card>
    </main>
  );
}
