'use client';

import { useEffect, useState } from 'react';
import { BookUser } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { toast } from '@/lib/toast';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { inviteProjectTeamDirectoryPerson } from '../../api/project-governance-circles.api';
import type { ProjectTeamMemberRefApi } from '../../types/project.types';

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

type Props = {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Préremplissage éventuel depuis la recherche. */
  initialEmail?: string;
  initialFirstName?: string;
  initialLastName?: string;
  onCreated: (member: ProjectTeamMemberRefApi) => void;
};

export function ProjectTeamDirectoryPersonDialog({
  projectId,
  open,
  onOpenChange,
  initialEmail = '',
  initialFirstName = '',
  initialLastName = '',
  onCreated,
}: Props) {
  const authFetch = useAuthenticatedFetch();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFirstName(initialFirstName);
    setLastName(initialLastName);
    setCompanyName('');
    setEmail(initialEmail);
    setNameError(null);
    setEmailError(null);
    setSaving(false);
  }, [open, initialEmail, initialFirstName, initialLastName]);

  const onSubmit = async () => {
    const fn = firstName.trim();
    const ln = lastName.trim();
    const mail = email.trim().toLowerCase();

    if (!fn || !ln) {
      setNameError('Prénom et nom sont obligatoires.');
      return;
    }
    setNameError(null);

    if (!mail) {
      setEmailError('Indiquez un e-mail pour les convocations.');
      return;
    }
    if (!isValidEmail(mail)) {
      setEmailError('Adresse e-mail invalide.');
      return;
    }
    setEmailError(null);

    setSaving(true);
    try {
      const member = await inviteProjectTeamDirectoryPerson(authFetch, projectId, {
        firstName: fn,
        lastName: ln,
        companyName: companyName.trim() || null,
        email: mail,
      });
      toast.success(
        `${member.displayName} ajouté·e à l’annuaire RH (externe).`,
      );
      onCreated(member);
      onOpenChange(false);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : 'Impossible d’ajouter à l’annuaire.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <StariumModal
      open={open}
      onOpenChange={onOpenChange}
      title="Ajouter à l’annuaire"
      description="Crée une ressource humaine externe dans le catalogue RH du client, puis l’ajoute à l’équipe."
      icon={BookUser}
      size="md"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 sm:min-h-9"
            disabled={saving}
            onClick={() => onOpenChange(false)}
          >
            Annuler
          </Button>
          <Button
            type="button"
            className="min-h-11 sm:min-h-9"
            disabled={saving}
            onClick={() => void onSubmit()}
          >
            Ajouter à l’équipe
          </Button>
        </>
      }
    >
      <div className="starium-form">
        <div className="starium-form-grid starium-form-grid--2">
          <div className="starium-form-field">
            <label htmlFor="dir-firstname" className="starium-form-label">
              Prénom
            </label>
            <Input
              id="dir-firstname"
              className="starium-form-input !h-11 !min-h-11"
              value={firstName}
              autoComplete="given-name"
              aria-invalid={nameError ? true : undefined}
              onChange={(e) => {
                setFirstName(e.target.value);
                setNameError(null);
              }}
            />
          </div>
          <div className="starium-form-field">
            <label htmlFor="dir-lastname" className="starium-form-label">
              Nom
            </label>
            <Input
              id="dir-lastname"
              className="starium-form-input !h-11 !min-h-11"
              value={lastName}
              autoComplete="family-name"
              aria-invalid={nameError ? true : undefined}
              onChange={(e) => {
                setLastName(e.target.value);
                setNameError(null);
              }}
            />
          </div>
          <div className="starium-form-field">
            <label htmlFor="dir-company" className="starium-form-label">
              Entreprise
            </label>
            <Input
              id="dir-company"
              className="starium-form-input !h-11 !min-h-11"
              value={companyName}
              autoComplete="organization"
              placeholder="Organisation"
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </div>
          <div className="starium-form-field">
            <label htmlFor="dir-email" className="starium-form-label">
              E-mail
            </label>
            <Input
              id="dir-email"
              type="email"
              className="starium-form-input !h-11 !min-h-11"
              value={email}
              autoComplete="email"
              placeholder="nom@entreprise.com"
              aria-invalid={emailError ? true : undefined}
              aria-describedby={
                emailError ? 'dir-email-error' : 'dir-email-hint'
              }
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void onSubmit();
                }
              }}
            />
          </div>
        </div>
        {nameError ? (
          <p className="text-sm text-destructive" role="alert">
            {nameError}
          </p>
        ) : null}
        {emailError ? (
          <p id="dir-email-error" className="text-sm text-destructive" role="alert">
            {emailError}
          </p>
        ) : (
          <p id="dir-email-hint" className="starium-form-hint">
            Fiche Resource HUMAN · affiliation externe. L’e-mail sert aux
            convocations des points projet.
          </p>
        )}
      </div>
    </StariumModal>
  );
}
