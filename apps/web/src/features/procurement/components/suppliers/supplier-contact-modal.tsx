'use client';

import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { UserPlus } from 'lucide-react';
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

const SUPPLIER_CONTACT_DEFAULT_ROLES: string[] = [
  'Commercial',
  'Support',
  'Comptabilite',
  'Finance',
  'Direction',
  'Technique',
  'Achats',
];

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
  const roleOptions = useMemo(() => {
    const base = [...SUPPLIER_CONTACT_DEFAULT_ROLES];
    const current = form.role.trim();
    if (!current) return base;
    return base.includes(current) ? base : [...base, current];
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
    <StariumModal
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? 'Modifier un contact' : 'Ajouter un contact'}
      icon={UserPlus}
      size="full"
      overlayClassName="!z-[130] bg-black/40 dark:bg-black/55 backdrop-blur-[2px]"
      contentClassName="!z-[140] flex max-h-[90vh] flex-col gap-4"
      bodyClassName="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1"
      footer={
        <div className="flex w-full items-center justify-between gap-3">
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
      }
    >
          <section className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
            <h3 className="starium-modal-seg-title mb-3">Identité</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
              <div className="starium-form-field md:col-span-3 md:flex md:flex-col md:items-center md:justify-center">
                <Label className="starium-form-label md:text-center">Photo</Label>
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
                <div className="starium-form-field">
                  <Label className="starium-form-label">Prénom</Label>
                  <Input
                    className="starium-form-input"
                    value={form.firstName}
                    onChange={(e) => onChange('firstName', e.target.value)}
                  />
                  {errors.firstName ? <p className="text-xs text-destructive">{errors.firstName}</p> : null}
                </div>
                <div className="starium-form-field">
                  <Label className="starium-form-label">Nom</Label>
                  <Input
                    className="starium-form-input"
                    value={form.lastName}
                    onChange={(e) => onChange('lastName', e.target.value)}
                  />
                  {errors.lastName ? <p className="text-xs text-destructive">{errors.lastName}</p> : null}
                </div>
                <div className="starium-form-field md:col-span-2">
                  <Label className="starium-form-label">Nom complet</Label>
                  <Input
                    className="starium-form-input"
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
            <h3 className="starium-modal-seg-title mb-3">Coordonnées</h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="starium-form-field md:col-span-2">
                <Label className="starium-form-label">Rôle</Label>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto]">
                  <select
                    value={form.role}
                    onChange={(e) => onChange('role', e.target.value)}
                    className="starium-form-select"
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
                      className="starium-form-input"
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
              <div className="starium-form-field">
                <Label className="starium-form-label">Email</Label>
                <Input
                  className="starium-form-input"
                  value={form.email}
                  onChange={(e) => onChange('email', e.target.value)}
                  placeholder="contact@exemple.com"
                />
                {errors.email ? <p className="text-xs text-destructive">{errors.email}</p> : null}
              </div>
              <div className="starium-form-field">
                <Label className="starium-form-label">Téléphone</Label>
                <PhoneInput
                  value={form.phone}
                  onChange={(value) => onChange('phone', value)}
                  placeholder="+33612345678"
                  invalid={!!errors.phone}
                />
                <p className="text-xs text-muted-foreground">Format attendu : +33... (ex: +33612345678)</p>
                {errors.phone ? <p className="text-xs text-destructive">{errors.phone}</p> : null}
              </div>
              <div className="starium-form-field">
                <Label className="starium-form-label">Mobile</Label>
                <PhoneInput
                  value={form.mobile}
                  onChange={(value) => onChange('mobile', value)}
                  placeholder="+33612345678"
                  invalid={!!errors.mobile}
                />
                <p className="text-xs text-muted-foreground">Format attendu : +33... (ex: +33612345678)</p>
                {errors.mobile ? <p className="text-xs text-destructive">{errors.mobile}</p> : null}
              </div>
              <div className="starium-form-field md:col-span-2">
                <Label className="starium-form-label">Notes</Label>
                <Input
                  className="starium-form-input"
                  value={form.notes}
                  onChange={(e) => onChange('notes', e.target.value)}
                  placeholder="Informations complémentaires"
                />
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
            <h3 className="starium-modal-seg-title mb-3">Fournisseur et statut</h3>
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
    </StariumModal>
  );
}
