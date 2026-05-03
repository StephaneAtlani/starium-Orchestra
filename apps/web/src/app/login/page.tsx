'use client';

import React, { Suspense, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { fetchPasswordLoginEligibilityApi } from '@/services/auth';
import { useActiveClient } from '@/hooks/use-active-client';
import { readRememberedClientId } from '@/lib/auth/remembered-client-id';
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

const BOOTSTRAP_FROM_LOGIN_KEY = 'starium.bootstrapFromLogin';

/** Messages alignés sur les `reason` renvoyées par GET /api/auth/microsoft/callback (query). */
function messageForMicrosoftCallbackError(reason: string | null): string {
  switch (reason) {
    case 'email_unknown':
    case 'email_not_verified':
    case 'email_ambiguous':
    case 'missing_or_unreliable_email':
      return 'Aucun compte Starium existant ne correspond à cette identité Microsoft.';
    case 'user_without_valid_access':
      return 'Ce compte n’a pas d’accès actif à un client Starium. Contactez un administrateur.';
    case 'invalid_or_expired_state':
      return 'La session de connexion Microsoft a expiré ou est invalide. Réessayez depuis « Se connecter avec Microsoft ».';
    case 'missing_code_or_state':
      return 'Réponse Microsoft incomplète. Réessayez la connexion.';
    case 'microsoft_oauth_error':
      return 'Microsoft a refusé ou interrompu la connexion. Réessayez.';
    case 'callback_processing_error':
      return 'Erreur lors du traitement de la connexion Microsoft. Réessayez dans quelques instants.';
    case 'microsoft_id_token_invalid':
      return 'Le jeton Microsoft n’a pas pu être validé. Vérifiez que l’ID d’application (client) Entra correspond à la configuration de l’API (audience / client_id).';
    case 'microsoft_sso_misconfigured':
      return 'Configuration SSO Microsoft incomplète (client, secret, URL de redirection). Vérifiez l’environnement de l’API ou l’administration plateforme.';
    case 'database_schema_mismatch':
      return 'La base de données n’est pas à jour : exécutez les migrations (ex. prisma migrate deploy) puis réessayez.';
    case 'microsoft_token_invalid_grant':
      return 'Le code Microsoft a expiré ou a déjà été utilisé, ou l’URL de redirection ne correspond pas à Entra. Réessayez « Se connecter avec Microsoft » depuis le début.';
    case 'microsoft_oauth_unauthorized_client':
      return 'L’application n’est pas autorisée pour ce flux OAuth (client Entra / secret / redirect URI). Vérifiez la configuration.';
    case 'prisma_validation_error':
    case 'prisma_unknown_error':
    case 'prisma_init_error':
      return 'Erreur base de données ou schéma Prisma. Vérifiez les migrations et la connexion à la base.';
    case 'jwt_misconfigured':
      return 'Configuration JWT invalide sur l’API (secret / durées). Contactez un administrateur.';
    default:
      if (reason === 'access_denied' || reason?.includes('access_denied')) {
        return 'Connexion Microsoft annulée.';
      }
      if (reason) {
        return `Connexion Microsoft impossible (code : ${reason}). Si le problème persiste, vérifiez la configuration SSO côté serveur.`;
      }
      return 'Connexion Microsoft impossible. Réessayez ou contactez le support.';
  }
}

/**
 * Erreur après callback OAuth **sync M365** (`GET /api/microsoft/auth/callback`) quand
 * `oauthErrorUrl` / `MICROSOFT_OAUTH_ERROR_URL` pointe vers `/login?status=error` (modèle SSO) :
 * l’API ajoute `microsoft=error&code=…` sans `reason` → sans ce bloc, la page affiche le message SSO générique.
 * Codes alignés sur `MicrosoftOAuthService.buildErrorRedirect`.
 */
function messageForM365SyncOAuthRedirectError(
  code: string | null,
  microsoftError: string | null,
): string {
  switch (code) {
    case 'invalid_state':
    case 'invalid_state_payload':
    case 'state_replay':
      return 'Session de consentement Microsoft 365 expirée ou déjà utilisée. Rouvrez Administration client → Microsoft 365 et cliquez à nouveau sur « Connecter Microsoft 365 ».';
    case 'missing_code_or_state':
      return 'Réponse Microsoft incomplète (consentement M365). Réessayez depuis Administration client → Microsoft 365.';
    case 'oauth_upstream':
      return `Microsoft a renvoyé une erreur lors du consentement${microsoftError ? ` (${microsoftError})` : ''}. Réessayez ou vérifiez les restrictions du tenant.`;
    case 'invalid_client':
      return 'Client Starium introuvable après le retour Microsoft (données internes). Reconnectez-vous ou contactez le support.';
    case 'forbidden_client':
      return 'Vous n’avez plus d’accès actif à ce client Starium. Réactivez votre accès ou choisissez un autre client.';
    case 'missing_credentials':
      return 'Identifiants Entra incomplets pour ce client Starium (ID ou secret manquant). Ouvre Administration client → Microsoft 365, enregistre ID + secret + tenant, puis réessaie.';
    case 'token_exchange_failed':
      return 'Microsoft a refusé l’échange du code (souvent invalid_client dans les logs API : secret expiré ou erroné, mauvais ID d’application, ou repli sur MICROSOFT_CLIENT_SECRET du .env si le secret client en base ne déchiffre pas). Vérifie la même app Entra que dans le formulaire client, régénère le secret dans Azure, recolle-le dans Administration client → Microsoft 365 puis Enregistrer. En second : redirect URI …/api/microsoft/auth/callback identique dans Entra et dans MICROSOFT_M365_SYNC_REDIRECT_URI.';
    case 'invalid_id_token':
    case 'missing_id_token':
      return 'Jeton d’identité Microsoft invalide ou absent après consentement. Vérifie l’app Entra (scopes openid) et que l’ID client correspond au secret enregistré pour ce client Starium.';
    case 'persist_failed':
      return 'Impossible d’enregistrer la connexion Microsoft côté serveur. Réessayez ou contactez le support.';
    case 'rate_limited':
      return 'Trop de tentatives de callback OAuth. Patientez quelques minutes puis réessayez.';
    default:
      if (code) {
        return `Connexion Microsoft 365 impossible (code : ${code}). Vérifie Administration client → Microsoft 365 (ID, secret, tenant), les logs API (erreur token Microsoft), et l’URI de callback sync.`;
      }
      return 'Connexion Microsoft 365 impossible. Vérifie que MICROSOFT_OAUTH_ERROR_URL pointe vers Administration client → Microsoft 365 (pas /login?status=error, réservé au SSO).';
  }
}

function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function LoginPageContent() {
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
    completeMfaRecovery,
  } = useAuth();
  const searchParams = useSearchParams();
  const { setActiveClient } = useActiveClient();
  const didLoginThisSession = useRef(false);
  const didHandleMicrosoftCallback = useRef(false);
  /** Évite la course avec l’effet « déjà connecté → /dashboard » pendant le SSO Microsoft. */
  const ssoFlowInProgress = useRef(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [mfaStep, setMfaStep] = useState<'none' | 'totp' | 'email' | 'recovery'>('none');
  const [mfaChallengeId, setMfaChallengeId] = useState<string | null>(null);
  const [mfaOtp, setMfaOtp] = useState('');
  const [mfaEmailCode, setMfaEmailCode] = useState('');
  const [mfaRecoveryCode, setMfaRecoveryCode] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  /** Enregistrer cet appareil (30 j. sans 2FA sur ce navigateur après mot de passe). */
  const [trustThisDevice, setTrustThisDevice] = useState(true);
  /** null = pas encore vérifié ; false = compte réservé à Microsoft (après SSO). */
  const [passwordLoginAllowed, setPasswordLoginAllowed] = useState<
    boolean | null
  >(null);
  const [checkingPasswordEligibility, setCheckingPasswordEligibility] =
    useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (ssoFlowInProgress.current) return;
    if (isAuthenticated && user && !didLoginThisSession.current) {
      router.replace('/dashboard');
    }
  }, [isLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (didHandleMicrosoftCallback.current) return;
    const status = searchParams.get('status');
    const reason = searchParams.get('reason');
    /** Consentement Graph (M365) : l’API met `microsoft=error` + `code=` (slug métier), pas `reason=` (SSO). */
    if (searchParams.get('microsoft') === 'error') {
      didHandleMicrosoftCallback.current = true;
      setError(
        messageForM365SyncOAuthRedirectError(
          searchParams.get('code'),
          searchParams.get('microsoft_error'),
        ),
      );
      return;
    }
    if (status === 'error') {
      didHandleMicrosoftCallback.current = true;
      setError(messageForMicrosoftCallbackError(reason));
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
    ssoFlowInProgress.current = true;
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
        const storedActiveClientId = readRememberedClientId();
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
        ssoFlowInProgress.current = false;
        setSubmitting(false);
      });
  }, [completeMicrosoftSso, router, searchParams, setActiveClient]);

  async function refreshPasswordEligibility() {
    const trimmed = email.trim();
    if (!looksLikeEmail(trimmed)) {
      setPasswordLoginAllowed(null);
      return;
    }
    setCheckingPasswordEligibility(true);
    try {
      const { passwordLoginAllowed: allowed } =
        await fetchPasswordLoginEligibilityApi(trimmed);
      setPasswordLoginAllowed(allowed);
    } finally {
      setCheckingPasswordEligibility(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    let allowed = passwordLoginAllowed;
    if (looksLikeEmail(email) && allowed === null) {
      setCheckingPasswordEligibility(true);
      try {
        const r = await fetchPasswordLoginEligibilityApi(email.trim());
        allowed = r.passwordLoginAllowed;
        setPasswordLoginAllowed(allowed);
      } finally {
        setCheckingPasswordEligibility(false);
      }
    }
    if (allowed === false) {
      setError(
        'Connexion par mot de passe désactivée pour ce compte. Utilisez « Se connecter avec Microsoft ».',
      );
      return;
    }
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

      const storedActiveClientId =
        typeof window !== 'undefined' ? readRememberedClientId() : null;

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
      const storedActiveClientId =
        typeof window !== 'undefined' ? readRememberedClientId() : null;

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
      const storedActiveClientId =
        typeof window !== 'undefined' ? readRememberedClientId() : null;

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

  async function handleMfaRecoverySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!mfaChallengeId) return;
    setError(null);
    setSubmitting(true);
    try {
      const { user: loggedInUser, accessToken } = await completeMfaRecovery(
        mfaChallengeId,
        mfaRecoveryCode.replace(/[\s-]/g, ''),
        trustThisDevice,
      );
      const res = await fetch('/api/me/clients', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        throw new Error('Impossible de récupérer la liste des clients');
      }
      const clients = (await res.json()) as MeClient[];
      const storedActiveClientId =
        typeof window !== 'undefined' ? readRememberedClientId() : null;

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
      setError(err instanceof Error ? err.message : 'Code de secours invalide');
    } finally {
      setSubmitting(false);
    }
  }

  function cancelMfa() {
    setMfaStep('none');
    setMfaChallengeId(null);
    setMfaOtp('');
    setMfaEmailCode('');
    setMfaRecoveryCode('');
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
            <Image
              src="/login-hero.svg"
              alt=""
              fill
              priority={false}
              unoptimized
              aria-hidden
              className="pointer-events-none object-cover opacity-45"
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
                    ? 'Double authentification : saisissez le code à 6 chiffres de votre application.'
                    : mfaStep === 'email'
                      ? 'Saisissez le code à 6 chiffres reçu par email.'
                      : 'Saisissez un de vos codes de secours à usage unique.'}
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
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setPasswordLoginAllowed(null);
                      }}
                      onBlur={() => void refreshPasswordEligibility()}
                      required
                    />
                  </div>
                  {passwordLoginAllowed === false && (
                    <p className="text-sm text-muted-foreground">
                      Ce compte utilise la connexion Microsoft : le mot de passe
                      Starium n’est plus disponible pour cet email.
                    </p>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="password">Mot de passe</Label>
                    <Input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={passwordLoginAllowed === false}
                      required={passwordLoginAllowed !== false}
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
                    disabled={
                      submitting ||
                      passwordLoginAllowed === false ||
                      checkingPasswordEligibility
                    }
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
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setMfaStep('recovery');
                        setMfaRecoveryCode('');
                        setError(null);
                      }}
                    >
                      Utiliser un code de secours
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
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setMfaStep('recovery');
                        setMfaRecoveryCode('');
                        setError(null);
                      }}
                    >
                      Utiliser un code de secours
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
              {mfaStep === 'recovery' && (
                <form onSubmit={handleMfaRecoverySubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="mfa-recovery">Code de secours</Label>
                    <Input
                      id="mfa-recovery"
                      type="text"
                      autoComplete="off"
                      value={mfaRecoveryCode}
                      onChange={(e) => setMfaRecoveryCode(e.target.value)}
                      placeholder="3F0ADD751C"
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
                      {submitting ? 'Vérification…' : 'Valider le code de secours'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setMfaStep('totp');
                        setMfaRecoveryCode('');
                        setError(null);
                      }}
                    >
                      Retour au code application
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      disabled={emailSending}
                      onClick={() => void handleSendEmailOtp()}
                    >
                      {emailSending ? 'Envoi…' : 'Recevoir un code par email'}
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

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-background p-6">
          <p className="text-sm text-muted-foreground">Chargement…</p>
        </main>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
