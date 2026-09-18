'use client';

import { FileText, Link2, Pencil, Plus, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { displayLabel } from '@/lib/display-label';
import { cn } from '@/lib/utils';
import type { ClientMember } from '@/features/client-rbac/api/user-roles';
import type {
  ComplianceEvidenceKindApi,
  ComplianceRequirementDetailApi,
} from '../api/compliance.api';
import type { ComplianceUiStatus } from './compliance-status-display';
import {
  ComplianceMaturityPicker,
  ComplianceStatusCards,
  EVIDENCE_ADD_OPTIONS,
  defaultMaturityForStatus,
} from './compliance-assess-ui';

function memberLabel(m: ClientMember): string {
  const name = [m.firstName, m.lastName].filter(Boolean).join(' ').trim();
  const base = name || m.email;
  const job = m.jobTitle?.trim();
  return job ? `${base} — ${job}` : base;
}

function evidenceKindMeta(kind?: ComplianceEvidenceKindApi | string) {
  if (kind === 'URL') {
    return {
      label: 'Lien',
      className:
        'bg-[color:var(--state-info-bg)] text-[color:var(--state-info)]',
      Icon: Link2,
    };
  }
  if (kind === 'FILE') {
    return {
      label: 'PDF',
      className:
        'bg-[color:var(--state-danger-bg)] text-[color:var(--state-danger)]',
      Icon: FileText,
    };
  }
  return {
    label: 'Note',
    className:
      'bg-[color:var(--brand-gold-050)] text-[color:var(--brand-gold-700)]',
    Icon: Pencil,
  };
}

/** Corps évaluation — 2 colonnes (md+), ordre mock. */
export function ComplianceAssessDrawerBody({
  data,
  canUpdate,
  status,
  onStatusChange,
  maturity,
  onMaturityChange,
  ownerUserId,
  onOwnerChange,
  members,
  reviewDate,
  onReviewDateChange,
  comment,
  onCommentChange,
  formError,
  evidences,
  addEvidenceMenuOpen,
  onToggleAddEvidenceMenu,
  addEvidenceMenuRef,
  evidenceDraftOpen,
  onPickEvidenceKind,
  onCancelEvidenceDraft,
  evidenceKind,
  evidenceName,
  onEvidenceNameChange,
  evidenceUrl,
  onEvidenceUrlChange,
  evidenceDescription,
  onEvidenceDescriptionChange,
  onSubmitEvidence,
  evidencePending,
  showGapPlan,
  gapTitle,
  onGapTitleChange,
  gapFinding,
  onGapFindingChange,
  onCreateGap,
  gapPending,
  onOpenRemediationPlan,
  advancedSlot,
}: {
  data: ComplianceRequirementDetailApi;
  canUpdate: boolean;
  status: ComplianceUiStatus;
  onStatusChange: (s: ComplianceUiStatus) => void;
  maturity: number | null;
  onMaturityChange: (n: number) => void;
  ownerUserId: string;
  onOwnerChange: (id: string) => void;
  members: ClientMember[];
  reviewDate: string;
  onReviewDateChange: (v: string) => void;
  comment: string;
  onCommentChange: (v: string) => void;
  formError: string | null;
  evidences: ComplianceRequirementDetailApi['evidences'];
  addEvidenceMenuOpen: boolean;
  onToggleAddEvidenceMenu: () => void;
  addEvidenceMenuRef: React.RefObject<HTMLDivElement | null>;
  evidenceDraftOpen: boolean;
  onPickEvidenceKind: (kind: 'FILE' | 'URL' | 'REFERENCE' | 'NOTE') => void;
  onCancelEvidenceDraft: () => void;
  evidenceKind: ComplianceEvidenceKindApi;
  evidenceName: string;
  onEvidenceNameChange: (v: string) => void;
  evidenceUrl: string;
  onEvidenceUrlChange: (v: string) => void;
  evidenceDescription: string;
  onEvidenceDescriptionChange: (v: string) => void;
  onSubmitEvidence: () => void;
  evidencePending: boolean;
  showGapPlan: boolean;
  gapTitle: string;
  onGapTitleChange: (v: string) => void;
  gapFinding: string;
  onGapFindingChange: (v: string) => void;
  onCreateGap: () => void;
  gapPending: boolean;
  onOpenRemediationPlan?: () => void;
  /** Slot colonne droite (actions avancées) — évite bandeau blanc hors grille. */
  advancedSlot?: React.ReactNode;
}) {
  const ownerMember = members.find((m) => m.id === ownerUserId);
  const historyDate =
    data.status?.updatedAt ?? data.status?.lastAssessmentDate ?? null;

  return (
    <div className="grid gap-6 px-5 py-5 sm:px-6 md:grid-cols-2 md:gap-8 md:items-start">
      <div className="flex min-w-0 flex-col gap-5">
        <section>
          <h3 className="starium-modal-seg-title mb-[11px]">
            Statut de conformité
          </h3>
          {canUpdate ? (
            <ComplianceStatusCards
              value={status}
              onChange={(next) => {
                onStatusChange(next);
                if (
                  next !== 'NOT_APPLICABLE' &&
                  next !== 'NOT_ASSESSED' &&
                  maturity == null
                ) {
                  const def = defaultMaturityForStatus(next);
                  if (def != null) onMaturityChange(def);
                }
              }}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Lecture seule — permission compliance.update requise.
            </p>
          )}
        </section>

        <section>
          <h3 className="starium-modal-seg-title mb-[11px]">
            Niveau de maturité
          </h3>
          <ComplianceMaturityPicker
            value={maturity}
            onChange={onMaturityChange}
            disabled={
              !canUpdate ||
              status === 'NOT_ASSESSED' ||
              status === 'NOT_APPLICABLE'
            }
          />
        </section>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="comp-eval-owner">Responsable</Label>
            <Select
              value={ownerUserId || undefined}
              onValueChange={(v) => onOwnerChange(v ?? '')}
              disabled={!canUpdate}
            >
              <SelectTrigger id="comp-eval-owner" className="w-full">
                <SelectValue placeholder="Choisir un responsable">
                  {ownerUserId
                    ? memberLabel(
                        ownerMember ?? {
                          id: ownerUserId,
                          email: 'Membre',
                          firstName: null,
                          lastName: null,
                          role: 'CLIENT_USER',
                          status: 'ACTIVE',
                        },
                      )
                    : null}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {memberLabel(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="comp-eval-date">Prochaine revue</Label>
            <Input
              id="comp-eval-date"
              type="date"
              value={reviewDate}
              onChange={(e) => onReviewDateChange(e.target.value)}
              className="text-foreground"
              disabled={!canUpdate}
            />
          </div>
        </div>

        <section>
          <h3 className="starium-modal-seg-title mb-[11px]">
            Justification / mise en œuvre
          </h3>
          <Textarea
            id="comp-eval-comment"
            value={comment}
            onChange={(e) => onCommentChange(e.target.value)}
            rows={3}
            className="min-h-0 resize-y text-foreground"
            placeholder={
              status === 'NOT_APPLICABLE'
                ? 'Justification de la non-applicabilité (obligatoire)…'
                : 'Décrivez les mesures en place, les procédures et le contexte d’application…'
            }
            disabled={!canUpdate}
          />
          {formError ? (
            <p className="mt-2 text-sm text-destructive" role="alert">
              {formError}
            </p>
          ) : null}
        </section>
      </div>

      <div className="flex min-w-0 flex-col gap-5">
        <section>
          <h3 className="starium-modal-seg-title mb-[11px]">
            Preuves & documents
          </h3>
          {evidences.length === 0 ? (
            <p className="py-0.5 text-xs font-semibold text-muted-foreground">
              Aucune preuve jointe.
            </p>
          ) : (
            <ul className="mb-2 flex flex-col gap-2">
              {evidences.map((e) => {
                const meta = evidenceKindMeta(e.kind);
                const Icon = meta.Icon;
                return (
                  <li
                    key={e.id}
                    className="flex items-center gap-2.5 rounded-[var(--radius-md)] border border-border/70 bg-muted/30 px-3 py-2.5"
                  >
                    <span
                      className={cn(
                        'inline-flex size-[30px] shrink-0 items-center justify-center rounded-[7px] text-[9px] font-extrabold',
                        meta.className,
                      )}
                      aria-hidden
                    >
                      {e.kind === 'FILE' ? (
                        meta.label
                      ) : (
                        <Icon className="size-3.5" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-bold text-foreground">
                        {e.url ? (
                          <a
                            href={e.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[color:var(--state-info)] underline-offset-2 hover:underline"
                          >
                            {displayLabel(e.name, 'Preuve')}
                          </a>
                        ) : (
                          displayLabel(e.name, 'Preuve')
                        )}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {e.kind === 'URL'
                          ? 'Lien externe'
                          : e.kind === 'FILE'
                            ? 'Fichier'
                            : 'Note / constat'}
                        {e.version ? ` · v${e.version}` : ''}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {canUpdate ? (
            <div className="relative" ref={addEvidenceMenuRef}>
              {addEvidenceMenuOpen ? (
                <div
                  className="absolute bottom-[calc(100%+6px)] left-0 right-0 z-10 rounded-[var(--radius-md)] border border-border bg-card p-1 shadow-[var(--shadow-3)]"
                  role="menu"
                  aria-label="Type de preuve"
                >
                  {EVIDENCE_ADD_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.kind}
                        type="button"
                        role="menuitem"
                        className="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[12.5px] font-semibold text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:min-h-9"
                        onClick={() => onPickEvidenceKind(opt.kind)}
                      >
                        <Icon
                          className="size-4 shrink-0 text-muted-foreground"
                          aria-hidden
                        />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              ) : null}
              <button
                type="button"
                className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] border-[1.5px] border-dashed border-border/80 bg-transparent px-3 py-3 text-[12.5px] font-semibold text-muted-foreground transition-colors hover:border-[color:var(--brand-gold)] hover:bg-[color:var(--brand-gold-050)] hover:text-[color:var(--brand-gold-700)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                aria-expanded={addEvidenceMenuOpen}
                aria-haspopup="menu"
                onClick={onToggleAddEvidenceMenu}
              >
                <Plus className="size-4" aria-hidden />
                Ajouter une preuve
              </button>
              {evidenceDraftOpen ? (
                <div className="mt-3 space-y-3 rounded-lg border border-border/70 bg-muted/20 p-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="comp-ev-name">
                      {evidenceKind === 'URL'
                        ? 'Libellé du lien'
                        : evidenceKind === 'FILE'
                          ? 'Nom du fichier'
                          : 'Titre'}
                    </Label>
                    <Input
                      id="comp-ev-name"
                      value={evidenceName}
                      onChange={(e) => onEvidenceNameChange(e.target.value)}
                      className="text-foreground"
                    />
                  </div>
                  {evidenceKind === 'URL' ? (
                    <div className="space-y-1.5">
                      <Label htmlFor="comp-ev-url">URL</Label>
                      <Input
                        id="comp-ev-url"
                        type="url"
                        value={evidenceUrl}
                        onChange={(e) => onEvidenceUrlChange(e.target.value)}
                        className="text-foreground"
                        placeholder="https://…"
                      />
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Label htmlFor="comp-ev-desc">Détail</Label>
                      <Textarea
                        id="comp-ev-desc"
                        value={evidenceDescription}
                        onChange={(e) =>
                          onEvidenceDescriptionChange(e.target.value)
                        }
                        rows={2}
                        className="min-h-0 text-foreground"
                      />
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-11 sm:min-h-9"
                      onClick={onCancelEvidenceDraft}
                    >
                      Annuler
                    </Button>
                    <Button
                      type="button"
                      className="min-h-11 sm:min-h-9"
                      disabled={
                        evidencePending ||
                        !evidenceName.trim() ||
                        (evidenceKind === 'URL' && !evidenceUrl.trim())
                      }
                      onClick={onSubmitEvidence}
                    >
                      {evidencePending ? 'Ajout…' : 'Ajouter'}
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>

        {showGapPlan ? (
          <section
            className="rounded-[var(--radius-md)] border border-[color:var(--state-danger)] bg-[color:var(--state-danger-bg)] p-3.5"
            aria-labelledby="comp-gap-plan-heading"
          >
            <h3
              id="comp-gap-plan-heading"
              className="mb-2.5 flex items-center gap-2 text-[12.5px] font-extrabold text-[color:var(--state-danger)]"
            >
              <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
              Plan d’action requis
            </h3>
            {canUpdate ? (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="comp-gap-title">Action corrective</Label>
                  <Input
                    id="comp-gap-title"
                    value={gapTitle}
                    onChange={(e) => onGapTitleChange(e.target.value)}
                    className="bg-card text-foreground"
                    placeholder="Ex : formaliser et déployer la procédure manquante"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="comp-gap-finding">Constat</Label>
                  <Textarea
                    id="comp-gap-finding"
                    value={gapFinding}
                    onChange={(e) => onGapFindingChange(e.target.value)}
                    rows={2}
                    className="min-h-0 bg-card text-foreground"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 border-[color:var(--state-danger)] bg-card text-[color:var(--state-danger)] sm:min-h-9"
                  disabled={
                    gapPending ||
                    gapTitle.trim().length < 3 ||
                    gapFinding.trim().length < 3
                  }
                  onClick={onCreateGap}
                >
                  Créer l’écart
                </Button>
                {onOpenRemediationPlan ? (
                  <Button
                    type="button"
                    className="min-h-11 sm:min-h-9"
                    onClick={onOpenRemediationPlan}
                  >
                    Plan d’actions
                  </Button>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-[color:var(--state-danger)]">
                Un plan d’action est requis pour ce statut.
              </p>
            )}
          </section>
        ) : null}

        <section>
          <h3 className="starium-modal-seg-title mb-[11px]">Historique</h3>
          {historyDate || data.status ? (
            <div className="flex gap-2.5 py-2 text-xs text-muted-foreground">
              <span
                className="mt-1 size-2 shrink-0 rounded-full bg-border"
                aria-hidden
              />
              <div>
                <p>
                  <span className="font-bold text-foreground">
                    Évaluation enregistrée
                  </span>
                  {data.status?.ownerLabel
                    ? ` · ${displayLabel(data.status.ownerLabel, 'Responsable')}`
                    : ''}
                  {historyDate
                    ? ` · ${new Date(historyDate).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}`
                    : ''}
                </p>
                <p className="text-muted-foreground/80">
                  Statut défini
                  {data.status?.maturityLevel
                    ? ` · maturité ${data.status.maturityLevel}`
                    : ''}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs font-semibold text-muted-foreground">
              Aucun historique d’évaluation.
            </p>
          )}
        </section>

        {advancedSlot ? (
          <div className="border-t border-border/70 pt-4">{advancedSlot}</div>
        ) : null}
      </div>
    </div>
  );
}
