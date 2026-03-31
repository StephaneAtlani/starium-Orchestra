'use client';

import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhoneInput } from '@/components/ui/phone-input';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';

export type SupplierContactFormState = {
  firstName: string;
  lastName: string;
  fullName: string;
  role: string;
  email: string;
  phone: string;
  mobile: string;
  notes: string;
  isPrimary: boolean;
};

export type SupplierContactFormErrors = Partial<Record<keyof SupplierContactFormState, string>>;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEditing: boolean;
  supplierName?: string | null;
  supplierSection?: ReactNode;
  disablePrimary?: boolean;
  photoUrl?: string | null;
  onPhotoChange?: (file: File | null) => void;
  form: SupplierContactFormState;
  errors: SupplierContactFormErrors;
  onChange: <K extends keyof SupplierContactFormState>(
    key: K,
    value: SupplierContactFormState[K],
  ) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  isSubmitDisabled?: boolean;
};

export function SupplierContactModal({
  open,
  onOpenChange,
  isEditing,
  supplierName,
  supplierSection,
  disablePrimary = false,
  photoUrl,
  onPhotoChange,
  form,
  errors,
  onChange,
  onSubmit,
  isSubmitting,
  isSubmitDisabled = false,
}: Props) {
  const authFetch = useAuthenticatedFetch();
  const [customRole, setCustomRole] = useState('');
  const defaultRoles = [
    'Commercial',
    'Support',
    'Comptabilite',
    'Finance',
    'Direction',
    'Technique',
    'Achats',
  ];
  const roleOptions = useMemo(() => {
    const current = form.role.trim();
    if (!current) return defaultRoles;
    return defaultRoles.includes(current) ? defaultRoles : [...defaultRoles, current];
  }, [form.role]);
  const [photoPreview, setPhotoPreview] = useState<string | null>(photoUrl ?? null);
  const [photoObjectUrl, setPhotoObjectUrl] = useState<string | null>(null);
  const [remotePhotoObjectUrl, setRemotePhotoObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    let revokedUrl: string | null = null;
    let isCancelled = false;

    async function loadProtectedPhoto() {
      if (!open || !photoUrl) {
        setRemotePhotoObjectUrl(null);
        return;
      }
      try {
        const response = await authFetch(photoUrl);
        if (!response.ok) {
          setRemotePhotoObjectUrl(null);
          return;
        }
        const blob = await response.blob();
        if (isCancelled) return;
        revokedUrl = URL.createObjectURL(blob);
        setRemotePhotoObjectUrl(revokedUrl);
      } catch {
        if (!isCancelled) {
          setRemotePhotoObjectUrl(null);
        }
      }
    }

    void loadProtectedPhoto();

    return () => {
      isCancelled = true;
      if (revokedUrl) {
        URL.revokeObjectURL(revokedUrl);
      }
    };
  }, [authFetch, open, photoUrl]);

  useEffect(() => {
    if (photoObjectUrl) {
      setPhotoPreview(photoObjectUrl);
      return;
    }
    if (remotePhotoObjectUrl) {
      setPhotoPreview(remotePhotoObjectUrl);
      return;
    }
    setPhotoPreview(null);
  }, [photoObjectUrl, remotePhotoObjectUrl]);

  useEffect(() => {
    return () => {
      if (photoObjectUrl) URL.revokeObjectURL(photoObjectUrl);
    };
  }, [photoObjectUrl]);

  const hasNameParts = !!form.firstName.trim() || !!form.lastName.trim();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="!z-[130] bg-black/20 supports-backdrop-filter:backdrop-blur-sm"
        className="!z-[140] flex max-h-[90vh] w-full sm:w-[80vw] sm:max-w-[80vw] flex-col gap-4 p-6"
      >
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold tracking-tight">
            {isEditing ? 'Modifier un contact' : 'Ajouter un contact'}
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
          <section className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Identité</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
              <div className="space-y-2 md:col-span-3 md:flex md:flex-col md:items-center md:justify-center">
                <Label className="md:text-center">Photo</Label>
                <div className="flex flex-col items-start gap-3 md:items-center">
                  <label className="flex h-24 w-24 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-dashed border-border/80 bg-muted/30 text-xs text-muted-foreground">
                    {photoPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element -- preview local image
                      <img src={photoPreview} alt="Aperçu photo contact" className="h-full w-full object-cover" />
                    ) : (
                      <span>Ajouter</span>
                    )}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      onChange={(event) => {
                        const next = event.target.files?.[0] ?? null;
                        if (!next) return;
                        const objectUrl = URL.createObjectURL(next);
                        if (photoObjectUrl) URL.revokeObjectURL(photoObjectUrl);
                        setPhotoObjectUrl(objectUrl);
                        setPhotoPreview(objectUrl);
                        onPhotoChange?.(next);
                        event.target.value = '';
                      }}
                    />
                  </label>
                  <p className="text-xs text-muted-foreground md:text-center">JPG, PNG, WebP ou GIF</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (photoObjectUrl) {
                        URL.revokeObjectURL(photoObjectUrl);
                        setPhotoObjectUrl(null);
                      }
                      setPhotoPreview(null);
                      onPhotoChange?.(null);
                    }}
                  >
                    Supprimer la photo
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 md:col-span-9 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Prénom</Label>
                  <Input
                    value={form.firstName}
                    onChange={(e) => onChange('firstName', e.target.value)}
                  />
                  {errors.firstName ? <p className="text-xs text-destructive">{errors.firstName}</p> : null}
                </div>
                <div className="space-y-2">
                  <Label>Nom</Label>
                  <Input
                    value={form.lastName}
                    onChange={(e) => onChange('lastName', e.target.value)}
                  />
                  {errors.lastName ? <p className="text-xs text-destructive">{errors.lastName}</p> : null}
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Nom complet</Label>
                  <Input
                    value={form.fullName}
                    disabled={hasNameParts}
                    onChange={(e) => onChange('fullName', e.target.value)}
                  />
                  {errors.fullName ? <p className="text-xs text-destructive">{errors.fullName}</p> : null}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Coordonnées</h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label>Rôle</Label>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto]">
                  <select
                    value={form.role}
                    onChange={(e) => onChange('role', e.target.value)}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Selectionner un role</option>
                    {roleOptions.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center gap-2">
                    <Input
                      value={customRole}
                      onChange={(e) => setCustomRole(e.target.value)}
                      placeholder="Nouveau role"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const nextRole = customRole.trim();
                        if (!nextRole) return;
                        onChange('role', nextRole);
                        setCustomRole('');
                      }}
                    >
                      Ajouter
                    </Button>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  value={form.email}
                  onChange={(e) => onChange('email', e.target.value)}
                  placeholder="contact@exemple.com"
                />
                {errors.email ? <p className="text-xs text-destructive">{errors.email}</p> : null}
              </div>
              <div className="space-y-2">
                <Label>Téléphone</Label>
                <PhoneInput
                  value={form.phone}
                  onChange={(value) => onChange('phone', value)}
                  placeholder="+33612345678"
                  invalid={!!errors.phone}
                />
                <p className="text-xs text-muted-foreground">Format attendu : +33... (ex: +33612345678)</p>
                {errors.phone ? <p className="text-xs text-destructive">{errors.phone}</p> : null}
              </div>
              <div className="space-y-2">
                <Label>Mobile</Label>
                <PhoneInput
                  value={form.mobile}
                  onChange={(value) => onChange('mobile', value)}
                  placeholder="+33612345678"
                  invalid={!!errors.mobile}
                />
                <p className="text-xs text-muted-foreground">Format attendu : +33... (ex: +33612345678)</p>
                {errors.mobile ? <p className="text-xs text-destructive">{errors.mobile}</p> : null}
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Notes</Label>
                <Input
                  value={form.notes}
                  onChange={(e) => onChange('notes', e.target.value)}
                  placeholder="Informations complémentaires"
                />
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Fournisseur et statut</h3>
            {supplierSection ?? (
              <div className="space-y-3">
                <div className="pt-1">
                  <p className="text-xs text-muted-foreground">Fournisseur</p>
                  <p className="font-medium">{supplierName ?? '—'}</p>
                </div>
                <label className={`flex items-center gap-2 text-sm ${disablePrimary ? 'opacity-60' : ''}`}>
                  <input
                    type="checkbox"
                    checked={form.isPrimary}
                    disabled={disablePrimary}
                    onChange={(e) => onChange('isPrimary', e.target.checked)}
                  />
                  Marquer comme contact principal
                </label>
              </div>
            )}
          </section>
        </div>

        <div className="-mx-6 -mb-6 mt-auto flex items-center justify-between gap-3 border-t border-border/60 bg-background px-6 py-4">
          <p className="text-xs text-muted-foreground">
            Le brouillon n&apos;est pas sauvegarde. Clique sur Annuler pour abandonner les modifications.
          </p>
          <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting || isSubmitDisabled}
          >
            {isEditing ? 'Mettre a jour' : 'Ajouter'}
          </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
