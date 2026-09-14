'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, FileText, Info, Send, Upload, X } from 'lucide-react';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { Button, buttonVariants } from '@/components/ui/button';
import { LoadingState } from '@/components/feedback/loading-state';
import { ErrorState } from '@/components/feedback/error-state';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { useAuth } from '@/context/auth-context';
import { toast } from '@/lib/toast';
import { displayLabel } from '@/lib/display-label';
import { cn } from '@/lib/utils';
import {
  createProjectRequest,
  getProjectRequest,
  previewCircuit,
  submitProjectRequest,
  updateProjectRequest,
  type ComputedCircuitDto,
} from '../api/project-requests.api';
import {
  formatBudgetKEuro,
  PROJECT_REQUEST_TYPE_META,
  PROJECT_REQUEST_TYPE_OPTIONS,
  typeLabel,
} from '../lib/project-request-display';
import '../styles/demandes.css';

type SwotState = {
  strengths: string;
  weaknesses: string;
  opportunities: string;
  threats: string;
};

type TowsState = {
  so: string;
  wo: string;
  st: string;
  wt: string;
};

type FormState = {
  portfolioCategoryId: string;
  type: string;
  title: string;
  requestingDirection: string;
  sponsorLabel: string;
  businessContext: string;
  expectedOutcome: string;
  affectedUsersCount: string;
  affectedScope: string;
  expectedBenefits: string;
  riskIfNotDone: string;
  estimatedBudget: string;
  budgetUnknown: boolean;
  estimatedEffortDays: string;
  effortUnknown: boolean;
  desiredDeadline: string;
  deadlineRationale: string;
  knownConstraints: string;
  solutionsTried: string;
  strategicObjectiveLabel: string;
  priorityRequested: 'HIGH' | 'MEDIUM' | 'LOW';
  swot: SwotState;
  tows: TowsState;
};

const EMPTY_SWOT: SwotState = {
  strengths: '',
  weaknesses: '',
  opportunities: '',
  threats: '',
};

const EMPTY_TOWS: TowsState = {
  so: '',
  wo: '',
  st: '',
  wt: '',
};

const EMPTY_FORM: FormState = {
  portfolioCategoryId: '',
  type: 'TRANSFORMATION',
  title: '',
  requestingDirection: '',
  sponsorLabel: '',
  businessContext: '',
  expectedOutcome: '',
  affectedUsersCount: '',
  affectedScope: '',
  expectedBenefits: '',
  riskIfNotDone: '',
  estimatedBudget: '',
  budgetUnknown: false,
  estimatedEffortDays: '',
  effortUnknown: false,
  desiredDeadline: '',
  deadlineRationale: '',
  knownConstraints: '',
  solutionsTried: '',
  strategicObjectiveLabel: '',
  priorityRequested: 'MEDIUM',
  swot: EMPTY_SWOT,
  tows: EMPTY_TOWS,
};

/** Directions mock demForm (DEM_ORG). */
const DEM_ORG = [
  'Direction Achats',
  'Direction Risques',
  'Direction Marketing',
  'Direction RH',
  'Direction Technique',
  'Direction Client',
  'Direction RSE',
  'Direction Financière',
  'Direction Juridique',
] as const;

/** Objectifs stratégiques mock (DEM_OBJ) — libellés métier. */
const DEM_OBJ = [
  'Industrialiser les processus de gestion',
  'Sécuriser la conformité et la maîtrise des risques',
  "Améliorer l'expérience client",
  'Moderniser le socle technique',
  "Développer l'engagement des collaborateurs",
] as const;

const PRIORITY_PILLS: Array<{
  key: FormState['priorityRequested'];
  label: string;
}> = [
  { key: 'HIGH', label: 'Haute' },
  { key: 'MEDIUM', label: 'Moyenne' },
  { key: 'LOW', label: 'Basse' },
];

function DemSecHead({
  n,
  title,
  meta,
}: {
  n: number;
  title: string;
  meta: string;
}) {
  return (
    <div className="dem-sh">
      <div className="dem-sh-n">{n}</div>
      <div>
        <div className="dem-sh-t">{title}</div>
        <div className="dem-sh-m">{meta}</div>
      </div>
    </div>
  );
}

function OptTag() {
  return <span className="dem-opt">facultatif</span>;
}

function parseSwot(raw: unknown): SwotState {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_SWOT };
  const o = raw as Record<string, unknown>;
  return {
    strengths: typeof o.strengths === 'string' ? o.strengths : '',
    weaknesses: typeof o.weaknesses === 'string' ? o.weaknesses : '',
    opportunities: typeof o.opportunities === 'string' ? o.opportunities : '',
    threats: typeof o.threats === 'string' ? o.threats : '',
  };
}

function parseTows(raw: unknown): TowsState {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_TOWS };
  const o = raw as Record<string, unknown>;
  return {
    so: typeof o.so === 'string' ? o.so : '',
    wo: typeof o.wo === 'string' ? o.wo : '',
    st: typeof o.st === 'string' ? o.st : '',
    wt: typeof o.wt === 'string' ? o.wt : '',
  };
}

function buildPayload(form: FormState) {
  const budgetRaw = form.estimatedBudget
    .trim()
    .replace(/\s/g, '')
    .replace(',', '.');
  const budget = form.budgetUnknown
    ? 0
    : budgetRaw
      ? Number.parseFloat(budgetRaw)
      : 0;
  const effortRaw = form.estimatedEffortDays
    .trim()
    .replace(/\s/g, '')
    .replace(',', '.');
  const effort =
    form.effortUnknown || !effortRaw
      ? undefined
      : Number.parseFloat(effortRaw);
  const usersRaw = form.affectedUsersCount.trim().replace(/\s/g, '');
  const users = usersRaw ? Number.parseInt(usersRaw, 10) : undefined;

  const swotHasContent = Object.values(form.swot).some((v) => v.trim());
  const towsHasContent = Object.values(form.tows).some((v) => v.trim());

  return {
    title: form.title.trim(),
    portfolioCategoryId: form.portfolioCategoryId || undefined,
    type: form.type || undefined,
    requestingDirection: form.requestingDirection.trim(),
    sponsorLabel: form.sponsorLabel.trim() || undefined,
    businessContext: form.businessContext.trim() || undefined,
    expectedOutcome: form.expectedOutcome.trim() || undefined,
    affectedScope: form.affectedScope.trim() || undefined,
    affectedUsersCount:
      users != null && Number.isFinite(users) ? users : undefined,
    expectedBenefits: form.expectedBenefits.trim() || undefined,
    riskIfNotDone: form.riskIfNotDone.trim() || undefined,
    estimatedBudget: Number.isFinite(budget) ? budget : 0,
    budgetUnknown: form.budgetUnknown,
    estimatedEffortDays:
      effort != null && Number.isFinite(effort) ? effort : undefined,
    effortUnknown: form.effortUnknown,
    desiredDeadline: form.desiredDeadline || undefined,
    deadlineRationale: form.deadlineRationale.trim() || undefined,
    knownConstraints: form.knownConstraints.trim() || undefined,
    solutionsTried: form.solutionsTried.trim() || undefined,
    strategicObjectiveLabel: form.strategicObjectiveLabel.trim() || undefined,
    priorityRequested: form.priorityRequested,
    swot: swotHasContent
      ? {
          strengths: form.swot.strengths.trim() || undefined,
          weaknesses: form.swot.weaknesses.trim() || undefined,
          opportunities: form.swot.opportunities.trim() || undefined,
          threats: form.swot.threats.trim() || undefined,
        }
      : undefined,
    tows: towsHasContent
      ? {
          so: form.tows.so.trim() || undefined,
          wo: form.tows.wo.trim() || undefined,
          st: form.tows.st.trim() || undefined,
          wt: form.tows.wt.trim() || undefined,
        }
      : undefined,
  };
}

/** Champs exigés à la soumission (mock DEM_REQ). */
function missingForSubmit(form: FormState): string[] {
  const checks: Array<[boolean, string]> = [
    [!form.title.trim(), 'Titre de la demande'],
    [!form.businessContext.trim(), 'Besoin / problème à résoudre'],
    [!form.expectedOutcome.trim(), 'Résultat attendu'],
    [!form.requestingDirection.trim(), 'Direction / service demandeur'],
    [!form.expectedBenefits.trim(), 'Bénéfices attendus'],
    [!form.riskIfNotDone.trim(), 'Risques si on ne fait rien'],
    [!form.priorityRequested, 'Urgence'],
  ];
  return checks.filter(([miss]) => miss).map(([, label]) => label);
}

export function ProjectRequestFormPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const { user } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [createdId, setCreatedId] = useState<string | null>(editId);

  const editQuery = useQuery({
    queryKey: ['project-request', clientId, editId],
    queryFn: () => getProjectRequest(authFetch, editId!),
    enabled: !!clientId && !!editId,
  });

  useEffect(() => {
    if (!editQuery.data) return;
    const d = editQuery.data;
    setCreatedId(d.id);
    const catId = d.portfolioCategoryId ?? d.portfolioCategory?.id ?? '';
    setForm({
      portfolioCategoryId: catId,
      type: d.type ?? 'TRANSFORMATION',
      title: d.title ?? '',
      requestingDirection: d.requestingDirection ?? '',
      sponsorLabel: d.sponsorLabel ?? '',
      businessContext: d.businessContext ?? d.description ?? '',
      expectedOutcome: d.expectedOutcome ?? '',
      affectedUsersCount:
        d.affectedUsersCount != null ? String(d.affectedUsersCount) : '',
      affectedScope: d.affectedScope ?? '',
      expectedBenefits: d.expectedBenefits ?? '',
      riskIfNotDone: d.riskIfNotDone ?? '',
      estimatedBudget:
        d.estimatedBudget != null && !d.budgetUnknown
          ? String(d.estimatedBudget)
          : '',
      budgetUnknown: Boolean(d.budgetUnknown),
      estimatedEffortDays:
        d.estimatedEffortDays != null && !d.effortUnknown
          ? String(d.estimatedEffortDays)
          : '',
      effortUnknown: Boolean(d.effortUnknown),
      desiredDeadline: d.desiredDeadline ? d.desiredDeadline.slice(0, 10) : '',
      deadlineRationale: d.deadlineRationale ?? '',
      knownConstraints: d.knownConstraints ?? '',
      solutionsTried: d.solutionsTried ?? '',
      strategicObjectiveLabel: d.strategicObjectiveLabel ?? '',
      priorityRequested:
        (d.priorityRequested as FormState['priorityRequested']) ?? 'MEDIUM',
      swot: parseSwot(d.swot),
      tows: parseTows(d.tows),
    });
  }, [editQuery.data]);

  const requesterName = useMemo(() => {
    if (!user) return 'Vous';
    const full = [user.firstName, user.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();
    return displayLabel(full || user.email, 'Vous');
  }, [user]);

  const budgetNum = useMemo(() => {
    if (form.budgetUnknown) return 0;
    const raw = form.estimatedBudget
      .trim()
      .replace(/\s/g, '')
      .replace(',', '.');
    if (!raw) return 0;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : 0;
  }, [form.estimatedBudget, form.budgetUnknown]);

  const miss = useMemo(() => missingForSubmit(form), [form]);

  const circuitQuery = useQuery({
    queryKey: [
      'project-request-preview-circuit',
      clientId,
      form.type,
      budgetNum,
    ],
    queryFn: () =>
      previewCircuit(authFetch, {
        type: form.type || undefined,
        budget: budgetNum,
      }),
    enabled: !!clientId,
  });

  const circuit: ComputedCircuitDto | undefined = circuitQuery.data;

  const saveMutation = useMutation({
    mutationFn: async (submit: boolean) => {
      const payload = buildPayload(form);
      let row;
      if (createdId) {
        row = await updateProjectRequest(authFetch, createdId, payload);
      } else {
        row = await createProjectRequest(authFetch, payload);
        setCreatedId(row.id);
      }
      if (submit) {
        row = await submitProjectRequest(authFetch, row.id);
      }
      return { row, submit };
    },
    onSuccess: async ({ row, submit }) => {
      await qc.invalidateQueries({ queryKey: ['project-requests', clientId] });
      await qc.invalidateQueries({
        queryKey: ['project-requests-summary', clientId],
      });
      await qc.invalidateQueries({
        queryKey: ['project-request', clientId, row.id],
      });
      if (submit) {
        toast.success(`Demande « ${row.title} » soumise`);
      } else {
        toast.success(`Demande « ${row.title} » enregistrée en brouillon`);
      }
      router.push(`/projects/requests/${row.id}`);
    },
    onError: (err: { message?: string }) => {
      toast.error(err.message ?? 'Enregistrement impossible.');
    },
  });

  const validate = (submit: boolean): boolean => {
    if (!form.title.trim()) {
      toast.error('Donnez un titre à la demande');
      return false;
    }
    if (!form.requestingDirection.trim()) {
      toast.error('Indiquez la direction demandeuse');
      return false;
    }
    if (!form.type) {
      toast.error('Choisissez une catégorie de demande');
      return false;
    }
    if (!submit) return true;
    const missing = missingForSubmit(form);
    if (missing.length) {
      toast.error(
        `${missing.length} information${missing.length > 1 ? 's' : ''} obligatoire${missing.length > 1 ? 's' : ''} manquante${missing.length > 1 ? 's' : ''} pour soumettre`,
      );
      return false;
    }
    return true;
  };

  const handleSave = (submit: boolean) => {
    if (!validate(submit)) return;
    saveMutation.mutate(submit);
  };

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const directionOptions = useMemo(() => {
    const current = form.requestingDirection.trim();
    if (current && !(DEM_ORG as readonly string[]).includes(current)) {
      return [current, ...DEM_ORG];
    }
    return [...DEM_ORG];
  }, [form.requestingDirection]);

  const objectiveOptions = useMemo(() => {
    const current = form.strategicObjectiveLabel.trim();
    if (current && !(DEM_OBJ as readonly string[]).includes(current)) {
      return [current, ...DEM_OBJ];
    }
    return [...DEM_OBJ];
  }, [form.strategicObjectiveLabel]);

  if (editId && editQuery.isLoading) {
    return (
      <RequireActiveClient>
        <PageContainer>
          <LoadingState rows={8} />
        </PageContainer>
      </RequireActiveClient>
    );
  }

  if (editId && editQuery.error) {
    return (
      <RequireActiveClient>
        <PageContainer>
          <ErrorState
            message="Impossible de charger la demande à modifier."
            onRetry={() => void editQuery.refetch()}
          />
        </PageContainer>
      </RequireActiveClient>
    );
  }

  return (
    <RequireActiveClient>
      <PageContainer>
        <div className="dem-root">
          {/* Mock pg-head : titre sur fond papier, pas de carte blanche */}
          <div className="dem-pg-head">
            <div>
              <h1>
                {editId ? 'Modifier la demande' : 'Nouvelle demande de projet'}
              </h1>
              <p className="dem-np-sub">
                {editId
                  ? `${displayLabel(editQuery.data?.referenceCode, 'Brouillon')} · les informations obligatoires sont demandées à la soumission, pas à l'enregistrement du brouillon.`
                  : "Décrivez le besoin en langage métier. Le circuit de validation est déduit du type et du budget estimé — vous n'avez pas à le choisir."}
              </p>
            </div>
            <div className="dem-head-actions">
              <Link
                href={
                  editId ? `/projects/requests/${editId}` : '/projects/requests'
                }
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'sm' }),
                  'min-h-11 sm:min-h-9',
                )}
              >
                <X className="mr-2 size-4" aria-hidden />
                Annuler
              </Link>
            </div>
          </div>

          <div className="dem-form-grid">
            <div className="card dem-card">
              {/* 1. Votre demande — mock demForm */}
              <div className="dem-sec" style={{ marginTop: 0 }}>
                <DemSecHead
                  n={1}
                  title="Votre demande"
                  meta="Ce que vous constatez et ce que vous attendez, sans vocabulaire projet."
                />

                <div className="field">
                  <label className="field-label" htmlFor="df-t">
                    Titre de la demande <span className="req">*</span>
                  </label>
                  <input
                    className="input"
                    id="df-t"
                    value={form.title}
                    onChange={(e) => setField('title', e.target.value)}
                    placeholder="Ex. : Portail fournisseurs self-care"
                    required
                  />
                </div>

                <div className="field">
                  <label className="field-label" htmlFor="df-type">
                    Catégorie de la demande <span className="req">*</span>
                  </label>
                  <select
                    className="input"
                    id="df-type"
                    value={form.type}
                    onChange={(e) => setField('type', e.target.value)}
                    required
                  >
                    {PROJECT_REQUEST_TYPE_OPTIONS.map((key) => {
                      const meta = PROJECT_REQUEST_TYPE_META[key];
                      return (
                        <option key={key} value={key}>
                          {meta.label} — {meta.description}
                        </option>
                      );
                    })}
                  </select>
                  <div className="dem-help">
                    La catégorie détermine les exemptions de passage en comité.
                  </div>
                </div>

                <div className="field">
                  <label className="field-label" htmlFor="df-need">
                    Besoin / problème à résoudre <span className="req">*</span>
                  </label>
                  <textarea
                    className="textarea"
                    id="df-need"
                    rows={4}
                    value={form.businessContext}
                    onChange={(e) =>
                      setField('businessContext', e.target.value)
                    }
                    placeholder="Décrivez la situation actuelle, ce qui ne fonctionne pas et depuis quand."
                  />
                  <div className="dem-help">
                    Ce que vous vivez aujourd&apos;hui : le constat, ses impacts
                    concrets, son origine.
                  </div>
                </div>

                <div className="field">
                  <label className="field-label" htmlFor="df-outcome">
                    Résultat attendu <span className="req">*</span>
                  </label>
                  <textarea
                    className="textarea"
                    id="df-outcome"
                    rows={3}
                    value={form.expectedOutcome}
                    onChange={(e) =>
                      setField('expectedOutcome', e.target.value)
                    }
                    placeholder="Ce qui doit être obtenu concrètement si la demande est réalisée."
                  />
                  <div className="dem-help">
                    Formulez-le comme une situation atteinte, pas comme une
                    solution technique.
                  </div>
                </div>

                <div className="field-row-2">
                  <div className="field">
                    <label className="field-label" htmlFor="df-org">
                      Direction / service demandeur{' '}
                      <span className="req">*</span>
                    </label>
                    <select
                      className="input"
                      id="df-org"
                      value={form.requestingDirection}
                      onChange={(e) =>
                        setField('requestingDirection', e.target.value)
                      }
                      required
                    >
                      <option value="">Sélectionner une direction</option>
                      {directionOptions.map((org) => (
                        <option key={org} value={org}>
                          {org}
                        </option>
                      ))}
                    </select>
                    <div className="dem-help">
                      Prérempli d&apos;après votre rattachement.
                    </div>
                  </div>
                  <div className="field">
                    <label className="field-label" htmlFor="df-users">
                      Nombre d&apos;utilisateurs concernés
                      <OptTag />
                    </label>
                    <input
                      className="input"
                      id="df-users"
                      type="number"
                      min={0}
                      value={form.affectedUsersCount}
                      onChange={(e) =>
                        setField('affectedUsersCount', e.target.value)
                      }
                      placeholder="Ex. : 120"
                    />
                  </div>
                </div>

                <div className="field">
                  <label className="field-label" htmlFor="df-scope">
                    Périmètre concerné
                    <OptTag />
                  </label>
                  <textarea
                    className="textarea"
                    id="df-scope"
                    rows={2}
                    value={form.affectedScope}
                    onChange={(e) => setField('affectedScope', e.target.value)}
                    placeholder="Service, sites, utilisateurs, processus concernés."
                  />
                </div>
              </div>

              {/* 2. Pourquoi maintenant ? */}
              <div className="dem-sec">
                <DemSecHead
                  n={2}
                  title="Pourquoi maintenant ?"
                  meta="Ce que la demande apporte, et ce qu'il en coûte de ne rien faire."
                />

                <div className="field">
                  <label className="field-label" htmlFor="df-benef">
                    Bénéfices attendus <span className="req">*</span>
                  </label>
                  <textarea
                    className="textarea"
                    id="df-benef"
                    rows={3}
                    value={form.expectedBenefits}
                    onChange={(e) =>
                      setField('expectedBenefits', e.target.value)
                    }
                    placeholder="Ce que l'organisation y gagne, si possible chiffré."
                  />
                  <div className="dem-help">
                    Gain de temps, réduction de coûts, chiffre d&apos;affaires,
                    qualité, conformité, sécurité…
                  </div>
                </div>

                <div className="field">
                  <label className="field-label" htmlFor="df-risk">
                    Risques si on ne fait rien <span className="req">*</span>
                  </label>
                  <textarea
                    className="textarea"
                    id="df-risk"
                    rows={3}
                    value={form.riskIfNotDone}
                    onChange={(e) => setField('riskIfNotDone', e.target.value)}
                    placeholder="Ce qui se passe si la demande n'est pas retenue."
                  />
                  <div className="dem-help">
                    Impact métier, financier, réglementaire, sécurité, continuité
                    d&apos;activité…
                  </div>
                </div>

                <label
                  className="field-label"
                  style={{ display: 'block', marginBottom: 10 }}
                  id="df-prio-label"
                >
                  Urgence <span className="req">*</span>
                </label>
                <div
                  className="type-pills"
                  id="df-prio"
                  style={{ marginBottom: 18 }}
                  role="group"
                  aria-labelledby="df-prio-label"
                >
                  {PRIORITY_PILLS.map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      className={cn(
                        'type-pill',
                        form.priorityRequested === p.key && 'sel',
                      )}
                      onClick={() => setField('priorityRequested', p.key)}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                <div className="field-row-deadline">
                  <div className="field">
                    <label className="field-label" htmlFor="df-deadline">
                      Échéance souhaitée
                      <OptTag />
                    </label>
                    <input
                      className="input"
                      id="df-deadline"
                      type="date"
                      value={form.desiredDeadline}
                      onChange={(e) =>
                        setField('desiredDeadline', e.target.value)
                      }
                    />
                  </div>
                  <div className="field">
                    <label className="field-label" htmlFor="df-deadlineWhy">
                      Pourquoi cette échéance ?
                      <OptTag />
                    </label>
                    <input
                      className="input"
                      id="df-deadlineWhy"
                      value={form.deadlineRationale}
                      onChange={(e) =>
                        setField('deadlineRationale', e.target.value)
                      }
                      placeholder="Contrainte réglementaire, saisonnalité, fin de support…"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Première estimation */}
              <div className="dem-sec">
                <DemSecHead
                  n={3}
                  title="Première estimation"
                  meta="Un ordre de grandeur suffit. Le chiffrage sera repris à l'instruction."
                />

                <div className="field-row-2">
                  <div className="field">
                    <label className="field-label" htmlFor="df-budget">
                      Budget estimé (€)
                      <OptTag />
                    </label>
                    <input
                      className="input"
                      id="df-budget"
                      type="number"
                      step={5000}
                      value={form.estimatedBudget}
                      disabled={form.budgetUnknown}
                      onChange={(e) =>
                        setField('estimatedBudget', e.target.value)
                      }
                      placeholder="120000"
                    />
                    <label className="dem-chk">
                      <input
                        type="checkbox"
                        checked={form.budgetUnknown}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setForm((f) => ({
                            ...f,
                            budgetUnknown: checked,
                            estimatedBudget: checked ? '' : f.estimatedBudget,
                          }));
                        }}
                      />
                      Budget inconnu à ce stade
                    </label>
                  </div>
                  <div className="field">
                    <label className="field-label" htmlFor="df-charge">
                      Charge interne estimée (J/H)
                      <OptTag />
                    </label>
                    <input
                      className="input"
                      id="df-charge"
                      type="number"
                      step={0.5}
                      min={0}
                      value={form.estimatedEffortDays}
                      disabled={form.effortUnknown}
                      onChange={(e) =>
                        setField('estimatedEffortDays', e.target.value)
                      }
                      placeholder="120"
                    />
                    <label className="dem-chk">
                      <input
                        type="checkbox"
                        checked={form.effortUnknown}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setForm((f) => ({
                            ...f,
                            effortUnknown: checked,
                            estimatedEffortDays: checked
                              ? ''
                              : f.estimatedEffortDays,
                          }));
                        }}
                      />
                      Charge inconnue à ce stade
                    </label>
                  </div>
                </div>

                <div className="field">
                  <label className="field-label" htmlFor="df-constraints">
                    Contraintes connues
                    <OptTag />
                  </label>
                  <textarea
                    className="textarea"
                    id="df-constraints"
                    rows={2}
                    value={form.knownConstraints}
                    onChange={(e) =>
                      setField('knownConstraints', e.target.value)
                    }
                    placeholder="Sécurité, réglementaire, contractuel, technique, calendrier, organisation."
                  />
                </div>

                <div className="field">
                  <label className="field-label" htmlFor="df-solutions">
                    Solutions déjà envisagées
                    <OptTag />
                  </label>
                  <textarea
                    className="textarea"
                    id="df-solutions"
                    rows={2}
                    value={form.solutionsTried}
                    onChange={(e) => setField('solutionsTried', e.target.value)}
                    placeholder="Ce qui a déjà été tenté ou étudié, et pourquoi cela n'a pas suffi."
                  />
                </div>

                <label
                  className="field-label"
                  style={{ display: 'block', marginBottom: 8 }}
                >
                  Pièces jointes
                  <OptTag />
                </label>
                <button
                  type="button"
                  className="dem-drop"
                  onClick={() =>
                    toast.message('Pièces jointes : prochain lot')
                  }
                >
                  <Upload aria-hidden />
                  <div className="dem-drop-t">
                    Déposer un document ou parcourir
                  </div>
                  <div className="dem-drop-m">
                    Cartographie de processus, chiffrage fournisseur, note de
                    cadrage… PDF, Office, images.
                  </div>
                </button>
              </div>

              {/* 4. SWOT / TOWS */}
              <div className="dem-sec">
                <DemSecHead
                  n={4}
                  title="Analyse SWOT / TOWS"
                  meta="Facultatif, mais très utile en comité : ce qui joue pour la demande, ce qui joue contre, et ce qu'on en déduit."
                />

                <div className="dem-swot">
                  {(
                    [
                      [
                        'strengths',
                        's',
                        'S',
                        'Forces',
                        'Atouts internes',
                        'Équipe mobilisée, processus connu, brique technique déjà en place…',
                      ],
                      [
                        'weaknesses',
                        'w',
                        'W',
                        'Faiblesses',
                        'Limites internes',
                        'Compétence manquante, dette technique, disponibilité des équipes…',
                      ],
                      [
                        'opportunities',
                        'o',
                        'O',
                        'Opportunités',
                        'Facteurs externes favorables',
                        'Fenêtre réglementaire, socle mutualisé, financement disponible…',
                      ],
                      [
                        'threats',
                        't',
                        'T',
                        'Menaces',
                        'Facteurs externes défavorables',
                        'Échéance contrainte, dépendance fournisseur, résistance au changement…',
                      ],
                    ] as const
                  ).map(([key, cls, badge, title, meta, ph]) => (
                    <div key={key} className={cn('dem-q', cls)}>
                      <div className="dem-q-h">
                        <span className="dem-q-b">{badge}</span>
                        <span className="dem-q-t">{title}</span>
                        <span className="dem-q-m">{meta}</span>
                      </div>
                      <textarea
                        className="textarea"
                        id={`df-sw-${cls}`}
                        rows={3}
                        value={form.swot[key]}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            swot: { ...f.swot, [key]: e.target.value },
                          }))
                        }
                        placeholder={ph}
                        aria-label={`${title} — ${meta}`}
                      />
                    </div>
                  ))}
                </div>

                <div className="dem-help" style={{ marginTop: 12 }}>
                  Croisé TOWS — ce que l&apos;on fait de cette analyse. Une ligne
                  par case suffit.
                </div>

                <div className="dem-tows">
                  {(
                    [
                      [
                        'so',
                        'SO',
                        'Forces × Opportunités · attaquer',
                        "Sur quoi s'appuyer pour aller vite",
                      ],
                      [
                        'wo',
                        'WO',
                        'Faiblesses × Opportunités · renforcer',
                        'Quelle faiblesse combler grâce à une opportunité',
                      ],
                      [
                        'st',
                        'ST',
                        'Forces × Menaces · défendre',
                        'Comment neutraliser une menace avec un atout',
                      ],
                      [
                        'wt',
                        'WT',
                        'Faiblesses × Menaces · éviter',
                        "Ce que l'on retire du périmètre pour limiter le risque",
                      ],
                    ] as const
                  ).map(([key, badge, title, ph]) => (
                    <div key={key} className="dem-tw">
                      <div className="dem-tw-k">{badge}</div>
                      <div className="dem-tw-t">{title}</div>
                      <textarea
                        className="textarea"
                        id={`df-tw-${key}`}
                        rows={2}
                        value={form.tows[key]}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            tows: { ...f.tows, [key]: e.target.value },
                          }))
                        }
                        placeholder={ph}
                        aria-label={title}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* 5. Gouvernance */}
              <div className="dem-sec">
                <DemSecHead
                  n={5}
                  title="Gouvernance"
                  meta="Qui porte la demande et à quel objectif elle contribue."
                />

                <div className="field-row-2">
                  <div className="field">
                    <span className="field-label" id="df-who-label">
                      Demandeur
                    </span>
                    <div className="dem-ro" aria-labelledby="df-who-label">
                      <span>{requesterName}</span>
                      <span className="dem-ro-m">Vous · lecture seule</span>
                    </div>
                  </div>
                  <div className="field">
                    <label className="field-label" htmlFor="df-sponsor">
                      Sponsor métier
                      <OptTag />
                    </label>
                    <input
                      className="input"
                      id="df-sponsor"
                      value={form.sponsorLabel}
                      onChange={(e) => setField('sponsorLabel', e.target.value)}
                      placeholder="Sélectionner un sponsor"
                    />
                  </div>
                </div>

                <div className="field-row-2">
                  <div className="field">
                    <label className="field-label" htmlFor="df-objective">
                      Objectif stratégique
                      <OptTag />
                    </label>
                    <select
                      className="input"
                      id="df-objective"
                      value={form.strategicObjectiveLabel}
                      onChange={(e) =>
                        setField('strategicObjectiveLabel', e.target.value)
                      }
                    >
                      <option value="">Aucun objectif rattaché</option>
                      {objectiveOptions.map((obj) => (
                        <option key={obj} value={obj}>
                          {obj}
                        </option>
                      ))}
                    </select>
                    <div className="dem-help">
                      Rattacher la demande à un objectif facilite son arbitrage.
                    </div>
                  </div>
                  <div className="field">
                    <label className="field-label" htmlFor="df-val">
                      Validateur
                    </label>
                    <select
                      className="input"
                      id="df-val"
                      disabled
                      defaultValue=""
                      aria-disabled
                    >
                      <option value="">
                        Défini par le circuit de validation
                      </option>
                    </select>
                    <div className="dem-help">
                      Proposé par le circuit ; seul le validateur désigné pourra
                      décider.
                    </div>
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 12,
                  marginTop: 22,
                  flexWrap: 'wrap',
                }}
              >
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 sm:min-h-9"
                  disabled={saveMutation.isPending}
                  onClick={() => handleSave(false)}
                >
                  <FileText className="mr-2 size-4" aria-hidden />
                  Enregistrer en brouillon
                </Button>
                <Button
                  type="button"
                  className="min-h-11 sm:min-h-9"
                  disabled={saveMutation.isPending}
                  onClick={() => handleSave(true)}
                >
                  <Send className="mr-2 size-4" aria-hidden />
                  Soumettre la demande
                </Button>
              </div>
            </div>

            <aside className="card dem-prev" aria-live="polite">
              <div className="dem-prev-k">Circuit qui sera appliqué</div>
              {circuitQuery.isLoading && !circuit ? (
                <LoadingState rows={3} />
              ) : circuit ? (
                <>
                  <div className="dem-jrn">
                    {circuit.steps.map((step, i) => (
                      <div key={step.key} className="dem-jrn-i">
                        <div
                          className={cn('dem-jrn-d', i === 0 && 'is-head')}
                          aria-hidden
                        />
                        <div className="dem-jrn-b">
                          <div className="dem-jrn-t">{step.label}</div>
                          <div className="dem-jrn-m">{step.actorHint}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="dem-prev-row">
                    <span className="k">Catégorie</span>
                    <span className="v">{typeLabel(form.type)}</span>
                  </div>
                  <div className="dem-prev-row">
                    <span className="k">Direction</span>
                    <span className="v">
                      {form.requestingDirection.trim() || '—'}
                    </span>
                  </div>
                  <div className="dem-prev-row">
                    <span className="k">Budget estimé</span>
                    <span className="v">
                      {form.budgetUnknown || !budgetNum
                        ? 'Non renseigné'
                        : formatBudgetKEuro(budgetNum)}
                    </span>
                  </div>
                  <div className="dem-prev-row">
                    <span className="k">Cycle de pilotage</span>
                    <span
                      className={cn(
                        'v',
                        circuit.needsCycle
                          ? 'text-[color:var(--brand-gold-700)]'
                          : undefined,
                      )}
                    >
                      {circuit.needsCycle
                        ? `Requis · ${circuit.instance ?? 'COPIL'}`
                        : 'Non requis'}
                    </span>
                  </div>
                  <div className="dem-note">
                    <Info aria-hidden />
                    <span>
                      {form.budgetUnknown || !budgetNum
                        ? "Sans budget renseigné, le routage sera déterminé à l'instruction par le PMO."
                        : circuit.needsCycle
                          ? `Au-delà de ${formatBudgetKEuro(circuit.copilThresholdAmount)}, la demande est arbitrée en ${circuit.instance ?? 'COPIL'} avant création du projet.`
                          : `En dessous du seuil${circuit.exemptRequestTypes.includes(form.type) ? ' ou pour un type exempté' : ''}, le PMO valide sans passer en comité.`}
                    </span>
                  </div>

                  <div className="dem-prev-k" style={{ marginTop: 18 }}>
                    Prêt à soumettre
                  </div>
                  {miss.length > 0 ? (
                    <>
                      <div className="dem-jrn">
                        {miss.map((label) => (
                          <div
                            key={label}
                            className="dem-jrn-i"
                            style={{ paddingBottom: 9 }}
                          >
                            <div
                              className="dem-jrn-d is-warn"
                              aria-hidden
                            />
                            <div className="dem-jrn-b">
                              <div
                                className="dem-jrn-m"
                                style={{ marginTop: 1 }}
                              >
                                {label}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="dem-note">
                        <span>
                          {miss.length} information
                          {miss.length > 1 ? 's' : ''} à compléter avant
                          soumission. L&apos;enregistrement en brouillon reste
                          possible.
                        </span>
                      </div>
                    </>
                  ) : (
                    <div
                      className="dem-note"
                      style={{ color: 'var(--state-success)' }}
                    >
                      <Check aria-hidden />
                      <span style={{ color: 'var(--neutral-600)' }}>
                        Toutes les informations obligatoires sont renseignées.
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <p className="dem-body is-muted">
                  Aperçu indisponible pour le moment.
                </p>
              )}
            </aside>
          </div>
        </div>
      </PageContainer>
    </RequireActiveClient>
  );
}
