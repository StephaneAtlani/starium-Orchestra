'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import {
  deleteMyAvatar,
  getMe,
  type MeProfile,
  updateMyProfile,
  uploadMyAvatar,
} from '@/services/me';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type FormState = {
  firstName: string;
  lastName: string;
  department: string;
  jobTitle: string;
  company: string;
  office: string;
};

const emptyForm: FormState = {
  firstName: '',
  lastName: '',
  department: '',
  jobTitle: '',
  company: '',
  office: '',
};

export function AccountProfileSection() {
  const { accessToken, refreshProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<MeProfile | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarKey, setAvatarKey] = useState(0);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const p = await getMe(accessToken);
      setProfile(p);
      setForm({
        firstName: p.firstName ?? '',
        lastName: p.lastName ?? '',
        department: p.department ?? '',
        jobTitle: p.jobTitle ?? '',
        company: p.company ?? '',
        office: p.office ?? '',
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur chargement profil');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!accessToken || !profile?.hasAvatar) {
      setAvatarPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }
    let cancelled = false;
    let objectUrl: string | null = null;
    (async () => {
      const res = await fetch('/api/me/avatar', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok || cancelled) return;
      const blob = await res.blob();
      objectUrl = URL.createObjectURL(blob);
      if (!cancelled) {
        setAvatarPreview((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return objectUrl;
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accessToken, profile?.hasAvatar, avatarKey]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken || !profile) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const trim = (s: string) => (s.trim() === '' ? null : s.trim());
      const updated = await updateMyProfile(accessToken, {
        firstName: trim(form.firstName),
        lastName: trim(form.lastName),
        department: trim(form.department),
        jobTitle: trim(form.jobTitle),
        company: trim(form.company),
        office: trim(form.office),
      });
      setProfile(updated);
      setForm({
        firstName: updated.firstName ?? '',
        lastName: updated.lastName ?? '',
        department: updated.department ?? '',
        jobTitle: updated.jobTitle ?? '',
        company: updated.company ?? '',
        office: updated.office ?? '',
      });
      await refreshProfile();
      setSuccess('Profil enregistré.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  }

  async function onPickPhoto(file: File | null) {
    if (!file || !accessToken) return;
    setError(null);
    setSuccess(null);
    try {
      await uploadMyAvatar(accessToken, file);
      const p = await getMe(accessToken);
      setProfile(p);
      setAvatarKey((k) => k + 1);
      await refreshProfile();
      setSuccess('Photo mise à jour.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur envoi photo');
    }
  }

  async function onRemovePhoto() {
    if (!accessToken) return;
    setError(null);
    setSuccess(null);
    try {
      await deleteMyAvatar(accessToken);
      const p = await getMe(accessToken);
      setProfile(p);
      setAvatarKey((k) => k + 1);
      await refreshProfile();
      setSuccess('Photo supprimée.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    }
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-base font-semibold">Profil</h2>
        <p className="text-sm text-muted-foreground">
          Identité et informations affichées (tous rôles).
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        {success && (
          <p className="text-sm text-green-600" role="status">
            {success}
          </p>
        )}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex flex-col items-center gap-2">
            <div className="flex size-24 items-center justify-center overflow-hidden rounded-full border bg-muted text-muted-foreground">
              {avatarPreview ? (
                // eslint-disable-next-line @next/next/no-img-element -- blob URL
                <img
                  src={avatarPreview}
                  alt=""
                  className="size-full object-cover"
                />
              ) : (
                <span className="text-xs">Photo</span>
              )}
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(ev) => {
                  const f = ev.target.files?.[0];
                  void onPickPhoto(f ?? null);
                  ev.target.value = '';
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                Changer la photo
              </Button>
              {profile?.hasAvatar && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => void onRemovePhoto()}
                >
                  Supprimer
                </Button>
              )}
            </div>
            <p className="max-w-[220px] text-center text-xs text-muted-foreground">
              JPEG, PNG, WebP ou GIF — max 2 Mo.
            </p>
          </div>

          {loading || !profile ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : (
            <form onSubmit={handleSave} className="min-w-0 flex-1 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Prénom</Label>
                  <Input
                    id="firstName"
                    value={form.firstName}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, firstName: e.target.value }))
                    }
                    maxLength={120}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Nom</Label>
                  <Input
                    id="lastName"
                    value={form.lastName}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, lastName: e.target.value }))
                    }
                    maxLength={120}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Service / département</Label>
                <Input
                  id="department"
                  value={form.department}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, department: e.target.value }))
                  }
                  maxLength={200}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="jobTitle">Poste</Label>
                <Input
                  id="jobTitle"
                  value={form.jobTitle}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, jobTitle: e.target.value }))
                  }
                  maxLength={200}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Société</Label>
                <Input
                  id="company"
                  value={form.company}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, company: e.target.value }))
                  }
                  maxLength={200}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="office">Bureau</Label>
                <Input
                  id="office"
                  value={form.office}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, office: e.target.value }))
                  }
                  maxLength={200}
                />
              </div>
              <div className="text-xs text-muted-foreground">
                Email : <span className="font-medium">{profile.email}</span>{' '}
                (non modifiable ici)
              </div>
              <Button type="submit" disabled={saving}>
                {saving ? 'Enregistrement…' : 'Enregistrer le profil'}
              </Button>
            </form>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
