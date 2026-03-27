'use client';

import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhoneInput } from '@/components/ui/phone-input';

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
  form,
  errors,
  onChange,
  onSubmit,
  isSubmitting,
  isSubmitDisabled = false,
}: Props) {
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

  const hasNameParts = !!form.firstName.trim() || !!form.lastName.trim();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-full sm:w-[80vw] sm:max-w-[80vw] flex-col gap-4 overflow-y-auto p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold tracking-tight">
            {isEditing ? 'Modifier un contact' : 'Ajouter un contact'}
          </DialogTitle>
          <DialogDescription>
            Le backend recalculera `fullName` depuis prénom/nom si ceux-ci sont fournis.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <section className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Identité</h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
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
                  onChange={(e) => onChange('phone', e.target.value)}
                  placeholder="Numéro"
                  invalid={!!errors.phone}
                />
                {errors.phone ? <p className="text-xs text-destructive">{errors.phone}</p> : null}
              </div>
              <div className="space-y-2">
                <Label>Mobile</Label>
                <PhoneInput
                  value={form.mobile}
                  onChange={(e) => onChange('mobile', e.target.value)}
                  placeholder="Numéro"
                  invalid={!!errors.mobile}
                />
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

        <div className="flex justify-end gap-2 border-t border-border/60 pt-4">
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
      </DialogContent>
    </Dialog>
  );
}
