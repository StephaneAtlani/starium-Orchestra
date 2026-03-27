'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { useActiveClient } from '@/hooks/use-active-client';
import { resolveActiveClient } from '@/lib/auth/resolve-active-client';
import type { MeClient } from '@/services/me';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';

const ACTIVE_CLIENT_KEY = 'starium.activeClient';
const BOOTSTRAP_FROM_LOGIN_KEY = 'starium.bootstrapFromLogin';

export default function LoginPage() {
  const router = useRouter();
  const {
    user,
    isAuthenticated,
    isLoading,
    login,
    startMicrosoftSso,
    completeMicrosoftSso,
    completeMfaTotp,
    sendMfaFallbackEmail,
    completeMfaEmail,
  } = useAuth();
  const searchParams = useSearchParams();
  const { setActiveClient } = useActiveClient();
  const didLoginThisSession = useRef(false);
  const didHandleMicrosoftCallback = useRef(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [mfaStep, setMfaStep] = useState<'none' | 'totp' | 'email'>('none');
  const [mfaChallengeId, setMfaChallengeId] = useState<string | null>(null);
  const [mfaOtp, setMfaOtp] = useState('');
  const [mfaEmailCode, setMfaEmailCode] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  /** Enregistrer cet appareil (30 j. sans 2FA sur ce navigateur après mot de passe). */
  const [trustThisDevice, setTrustThisDevice] = useState(true);

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated && user && !didLoginThisSession.current) {
      router.replace('/dashboard');
    }
  }, [isLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (didHandleMicrosoftCallback.current) return;
    const status = searchParams.get('status');
    const reason = searchParams.get('reason');
    if (status === 'error') {
      didHandleMicrosoftCallback.current = true;
      setError(
        reason === 'email_unknown' ||
          reason === 'email_not_verified' ||
          reason === 'email_ambiguous' ||
          reason === 'missing_or_unreliable_email'
          ? 'Aucun compte Starium existant ne correspond à cette identité Microsoft.'
          : 'Connexion Microsoft impossible.',
      );
      return;
    }
    if (status !== 'success' || typeof window === 'undefined') {
      return;
    }

    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const accessToken = hash.get('accessToken');
    const refreshToken = hash.get('refreshToken');
    if (!accessToken || !refreshToken) {
      didHandleMicrosoftCallback.current = true;
      setError('Connexion Microsoft incomplète.');
      return;
    }

    didHandleMicrosoftCallback.current = true;
    setSubmitting(true);
    void completeMicrosoftSso(accessToken, refreshToken)
      .then(async ({ user: loggedInUser, accessToken: token }) => {
        const res = await fetch('/api/me/clients', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          throw new Error('Impossible de récupérer la liste des clients');
        }
        const clients = (await res.json()) as MeClient[];
        let storedActiveClientId: string | null = null;
        const stored = window.localStorage.getItem(ACTIVE_CLIENT_KEY);
        if (stored) {
          try {
            const parsed = JSON.parse(stored) as { id?: string };
            storedActiveClientId = parsed?.id ?? null;
          } catch {
            // ignore
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
        window.sessionStorage.setItem(
          BOOTSTRAP_FROM_LOGIN_KEY,
          JSON.stringify({ client: resolution.client }),
        );
        router.replace(resolution.to);
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error ? err.message : 'Connexion Microsoft impossible.',
        );
      })
      .finally(() => {
        setSubmitting(false);
      });
  }, [completeMicrosoftSso, router, searchParams, setActiveClient]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    didLoginThisSession.current = true;
    try {
      const outcome = await login(email, password);
      if (outcome.status === 'mfa_required') {
        setMfaChallengeId(outcome.challengeId);
        setMfaStep('totp');
        setMfaOtp('');
        setMfaEmailCode('');
        setTrustThisDevice(true);
        setSubmitting(false);
        return;
      }
      const { user: loggedInUser, accessToken } = outcome;
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

  async function handleMicrosoftSsoStart() {
    setError(null);
    setSubmitting(true);
    const result = await startMicrosoftSso();
    if (!result.ok) {
      setError(result.message);
      setSubmitting(false);
    }
  }

  async function handleMfaTotpSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!mfaChallengeId) return;
    setError(null);
    setSubmitting(true);
    try {
      const { user: loggedInUser, accessToken } = await completeMfaTotp(
        mfaChallengeId,
        mfaOtp,
        trustThisDevice,
      );
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
        setMfaStep('none');
        setMfaChallengeId(null);
        router.replace(resolution.to);
        return;
      }
      if (resolution.type === 'blocked') {
        setMfaStep('none');
        setMfaChallengeId(null);
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
      setMfaStep('none');
      setMfaChallengeId(null);
      router.replace(resolution.to);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Code MFA invalide');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSendEmailOtp() {
    if (!mfaChallengeId) return;
    setError(null);
    setEmailSending(true);
    try {
      await sendMfaFallbackEmail(mfaChallengeId);
      setMfaStep('email');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Impossible d’envoyer le code',
      );
    } finally {
      setEmailSending(false);
    }
  }

  async function handleMfaEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!mfaChallengeId) return;
    setError(null);
    setSubmitting(true);
    try {
      const { user: loggedInUser, accessToken } = await completeMfaEmail(
        mfaChallengeId,
        mfaEmailCode.replace(/\s/g, ''),
        trustThisDevice,
      );
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
        setMfaStep('none');
        setMfaChallengeId(null);
        router.replace(resolution.to);
        return;
      }
      if (resolution.type === 'blocked') {
        setMfaStep('none');
        setMfaChallengeId(null);
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
      setMfaStep('none');
      setMfaChallengeId(null);
      router.replace(resolution.to);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Code invalide');
    } finally {
      setSubmitting(false);
    }
  }

  function cancelMfa() {
    setMfaStep('none');
    setMfaChallengeId(null);
    setMfaOtp('');
    setMfaEmailCode('');
    setError(null);
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-primary/32 via-background to-primary/18 px-4">
        <p className="text-muted-foreground">Chargement…</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-primary/30 via-background to-primary/16 px-4 py-8">
      <Card className="w-full max-w-4xl">
        <div className="grid gap-0 md:grid-cols-2">
          <div className="relative hidden flex-col justify-between bg-muted/40 p-8 md:flex">
            <img
              src="/login-hero.svg"
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-45"
            />
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
                {mfaStep === 'none'
                  ? 'Entrez vos identifiants pour accéder à vos clients et à vos espaces.'
                  : mfaStep === 'totp'
                    ? 'Double authentification : saisissez le code à 6 chiffres de votre application (ou un code de secours).'
                    : 'Saisissez le code à 6 chiffres reçu par email.'}
              </CardDescription>
              {mfaStep === 'none' && (
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
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={submitting}
                    onClick={() => void handleMicrosoftSsoStart()}
                  >
                    Se connecter avec Microsoft
                  </Button>
                </form>
              )}
              {mfaStep === 'totp' && (
                <form onSubmit={handleMfaTotpSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="mfa-otp">Code TOTP / secours</Label>
                    <Input
                      id="mfa-otp"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={mfaOtp}
                      onChange={(e) => setMfaOtp(e.target.value)}
                      placeholder="123456"
                      required
                    />
                  </div>
                  <label className="flex cursor-pointer items-start gap-2 text-sm text-muted-foreground">
                    <input
                      type="checkbox"
                      className="mt-1 rounded border-input"
                      checked={trustThisDevice}
                      onChange={(e) => setTrustThisDevice(e.target.checked)}
                    />
                    <span>
                      Faire confiance à cet appareil : ne plus demander la 2FA
                      pendant 30 jours sur ce navigateur (mot de passe toujours
                      requis).
                    </span>
                  </label>
                  {error && (
                    <p className="text-sm text-destructive" role="alert">
                      {error}
                    </p>
                  )}
                  <div className="flex flex-col gap-2">
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={submitting}
                    >
                      {submitting ? 'Vérification…' : 'Valider'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      disabled={emailSending || submitting}
                      onClick={() => void handleSendEmailOtp()}
                    >
                      {emailSending
                        ? 'Envoi…'
                        : 'Recevoir un code par email à la place'}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full"
                      onClick={cancelMfa}
                    >
                      Retour
                    </Button>
                  </div>
                </form>
              )}
              {mfaStep === 'email' && (
                <form onSubmit={handleMfaEmailSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="mfa-email-code">Code email</Label>
                    <Input
                      id="mfa-email-code"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={mfaEmailCode}
                      onChange={(e) => setMfaEmailCode(e.target.value)}
                      placeholder="000000"
                      required
                    />
                  </div>
                  <label className="flex cursor-pointer items-start gap-2 text-sm text-muted-foreground">
                    <input
                      type="checkbox"
                      className="mt-1 rounded border-input"
                      checked={trustThisDevice}
                      onChange={(e) => setTrustThisDevice(e.target.checked)}
                    />
                    <span>
                      Faire confiance à cet appareil : ne plus demander la 2FA
                      pendant 30 jours sur ce navigateur (mot de passe toujours
                      requis).
                    </span>
                  </label>
                  {error && (
                    <p className="text-sm text-destructive" role="alert">
                      {error}
                    </p>
                  )}
                  <div className="flex flex-col gap-2">
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={submitting}
                    >
                      {submitting ? 'Vérification…' : 'Valider le code'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      disabled={emailSending}
                      onClick={() => void handleSendEmailOtp()}
                    >
                      {emailSending ? 'Envoi…' : 'Renvoyer le code'}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full"
                      onClick={() => {
                        setMfaStep('totp');
                        setMfaEmailCode('');
                        setError(null);
                      }}
                    >
                      Retour au code application
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </Card>
    </main>
  );
}
