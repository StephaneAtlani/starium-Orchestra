'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import {
  changeMyPassword,
  disableTwoFactor,
  enrollTwoFactor,
  getTwoFactorStatus,
  verifyTwoFactorEnrollment,
  type EnrollTwoFactorResult,
  type TwoFactorStatus,
} from '@/services/me';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export function AccountSecuritySection() {
  const router = useRouter();
  const { accessToken, logout, user } = useAuth();
  const canChangePassword = user?.passwordLoginEnabled !== false;
  const [status, setStatus] = useState<TwoFactorStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const s = await getTwoFactorStatus(accessToken);
      setStatus(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur 2FA');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  return (
    <Card>
      <CardHeader>
        <h2 className="text-base font-semibold">Sécurité</h2>
        <p className="text-sm text-muted-foreground">
          Mot de passe et double authentification (TOTP + secours email à la
          connexion). Si vous vous connectez uniquement avec Microsoft, le mot de
          passe local est désactivé.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="text-sm text-green-600" role="status">
            {message}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          {canChangePassword ? (
            <ChangePasswordDialog
              accessToken={accessToken}
              onSuccess={async () => {
                setMessage('Mot de passe modifié. Déconnexion…');
                await logout();
                router.replace('/login');
              }}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Connexion par mot de passe désactivée — utilisez Microsoft pour vous
              connecter.
            </p>
          )}
        </div>

        <div className="rounded-lg border p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-medium">Double authentification (2FA)</p>
              <p className="text-sm text-muted-foreground">
                {loading
                  ? 'Chargement…'
                  : status?.enabled
                    ? 'Activée (application + codes de secours).'
                    : status?.pendingEnrollment
                      ? 'Configuration en cours — terminez avec le code TOTP.'
                      : 'Désactivée.'}
              </p>
            </div>
            {!loading && accessToken && (
              <div className="flex flex-wrap gap-2">
                {!status?.enabled && (
                  <EnrollTwoFactorFlow
                    accessToken={accessToken}
                    onDone={() => {
                      setMessage('2FA activée. Conservez vos codes de secours.');
                      void loadStatus();
                    }}
                  />
                )}
                {status?.enabled && (
                  <DisableTwoFactorDialog
                    accessToken={accessToken}
                    onDone={() => {
                      setMessage('2FA désactivée.');
                      void loadStatus();
                    }}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ChangePasswordDialog({
  accessToken,
  onSuccess,
}: {
  accessToken: string | null;
  onSuccess: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    setErr(null);
    if (next.length < 8) {
      setErr('Le nouveau mot de passe doit faire au moins 8 caractères.');
      return;
    }
    if (next !== confirm) {
      setErr('La confirmation ne correspond pas.');
      return;
    }
    setPending(true);
    try {
      await changeMyPassword(accessToken, current, next);
      setOpen(false);
      setCurrent('');
      setNext('');
      setConfirm('');
      await onSuccess();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Erreur');
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline">Changer le mot de passe</Button>} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Changer le mot de passe</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => void submit(e)} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="cur-pw">Mot de passe actuel</Label>
            <Input
              id="cur-pw"
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-pw">Nouveau mot de passe</Label>
            <Input
              id="new-pw"
              type="password"
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cf-pw">Confirmer</Label>
            <Input
              id="cf-pw"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>
          {err && (
            <p className="text-sm text-destructive" role="alert">
              {err}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={pending || !accessToken}>
              {pending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EnrollTwoFactorFlow({
  accessToken,
  onDone,
}: {
  accessToken: string;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'qr' | 'codes'>('qr');
  const [enroll, setEnroll] = useState<EnrollTwoFactorResult | null>(null);
  const [otp, setOtp] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function start() {
    setErr(null);
    setPending(true);
    try {
      const data = await enrollTwoFactor(accessToken);
      setEnroll(data);
      setStep('qr');
      setOtp('');
      setRecoveryCodes(null);
      setOpen(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setPending(false);
    }
  }

  async function confirmEnroll(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setPending(true);
    try {
      const { recoveryCodes: codes } = await verifyTwoFactorEnrollment(
        accessToken,
        otp.replace(/\s/g, ''),
      );
      setRecoveryCodes(codes);
      setStep('codes');
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Code invalide');
    } finally {
      setPending(false);
    }
  }

  function finishAndClose() {
    setOpen(false);
    setEnroll(null);
    setStep('qr');
    setOtp('');
    setRecoveryCodes(null);
    onDone();
  }

  return (
    <>
      {err && !open && <p className="text-sm text-destructive">{err}</p>}
      <Button onClick={() => void start()} disabled={pending}>
        {pending ? 'Préparation…' : 'Activer la 2FA'}
      </Button>
      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (!o) {
            setOpen(false);
            setEnroll(null);
            setStep('qr');
            setOtp('');
            setRecoveryCodes(null);
          } else {
            setOpen(o);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {step === 'codes'
                ? 'Codes de secours'
                : 'Scanner le QR code (Google Authenticator, etc.)'}
            </DialogTitle>
          </DialogHeader>
          {step === 'qr' && enroll && (
            <form onSubmit={(e) => void confirmEnroll(e)} className="space-y-4">
              <div className="flex justify-center rounded-lg border bg-white p-2">
                {/* eslint-disable-next-line @next/next/no-img-element -- data URL from API */}
                <img
                  src={enroll.qrCodeDataUrl}
                  alt="QR code 2FA"
                  width={200}
                  height={200}
                  className="h-auto w-[200px]"
                />
              </div>
              <p className="text-center text-xs text-muted-foreground">
                Secret masqué : {enroll.secretMasked}
              </p>
              <div className="space-y-2">
                <Label htmlFor="enroll-otp">Code à 6 chiffres</Label>
                <Input
                  id="enroll-otp"
                  inputMode="numeric"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="123456"
                  required
                  maxLength={6}
                />
              </div>
              {err && (
                <p className="text-sm text-destructive" role="alert">
                  {err}
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setOpen(false)}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending ? 'Vérification…' : 'Activer'}
                </Button>
              </div>
            </form>
          )}
          {step === 'codes' && recoveryCodes && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Conservez ces codes en lieu sûr ; chaque code ne fonctionne
                qu’une fois.
              </p>
              <ul className="rounded-md border bg-muted/40 p-3 font-mono text-sm">
                {recoveryCodes.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
              <Button className="w-full" onClick={() => finishAndClose()}>
                J’ai noté les codes
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function DisableTwoFactorDialog({
  accessToken,
  onDone,
}: {
  accessToken: string;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setPending(true);
    try {
      await disableTwoFactor(accessToken, password, otp.replace(/\s/g, ''));
      setOpen(false);
      setPassword('');
      setOtp('');
      onDone();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Erreur');
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant="outline">Désactiver la 2FA</Button>}
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Désactiver la 2FA</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => void submit(e)} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="dis-pw">Mot de passe actuel</Label>
            <Input
              id="dis-pw"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dis-otp">Code TOTP ou code de secours</Label>
            <Input
              id="dis-otp"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
            />
          </div>
          {err && (
            <p className="text-sm text-destructive" role="alert">
              {err}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? 'Désactivation…' : 'Désactiver'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
