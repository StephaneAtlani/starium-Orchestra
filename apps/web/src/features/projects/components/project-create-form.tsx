'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type FormEvent,
  type ReactNode,
} from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';
import { useCreateProject } from '../hooks/use-create-project';
import { projectsList, projectsOptions } from '../constants/project-routes';
import {
  PROJECT_KIND_LABEL,
  PROJECT_TYPE_LABEL,
  PROJECT_STATUS_LABEL,
  PROJECT_PRIORITY_LABEL,
  PROJECT_CRITICALITY_LABEL,
} from '../constants/project-enum-labels';
import { formatResourceDisplayName } from '@/lib/resource-labels';
import type { ResourceListItem } from '@/services/resources';
import { PersonCatalogPickerDialog } from './person-catalog-picker-dialog';
import {
  AppWindow,
  Building2,
  CalendarRange,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Diamond,
  FolderKanban,
  Landmark,
  Layers,
  Plus,
  ScrollText,
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  UserCog,
} from 'lucide-react';
import { useActiveClient } from '@/hooks/use-active-client';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { listProjectPortfolioCategories, listProjectTags } from '../api/projects.api';
import { projectQueryKeys } from '../lib/project-query-keys';
import { RegistryBadge } from '@/lib/ui/registry-badge';
import { projectTagBadgeStyle } from '../lib/project-tag-badge-style';
import { ProjectParentCombobox } from './project-parent-combobox';
import {
  cloneDefaultRetroplanMacroSteps,
  formatRetroplanComputedTargetDate,
  parseRetroplanMacroSteps,
  type RetroplanMacroStepRow,
} from '../lib/project-retroplan-macro-form';
import { getMicrosoftTeamsProvisioningSettings } from '../options/api/microsoft-teams-provisioning-settings.api';
import { projectOptionsKeys } from '../options/lib/project-options-query-keys';
import { readApiErrorMessageFromResponse } from '@/lib/read-api-error-message';

const textareaClass = cn(
  'min-h-[100px] w-full resize-y rounded-lg border border-input bg-background px-2.5 py-2 text-sm transition-colors outline-none',
  'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
  'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
);

const field = 'flex min-w-0 flex-col gap-1.5';

/** Métadonnées d’affichage des types (icône + accroche) — libellé métier, jamais l’ID. */
const TYPE_META: Record<string, { icon: ComponentType<{ className?: string }>; hint: string }> = {
  TRANSFORMATION: { icon: Sparkles, hint: 'Refonte, digitalisation métier' },
  INFRASTRUCTURE: { icon: Cloud, hint: 'Cloud, réseau, résilience' },
  APPLICATION: { icon: AppWindow, hint: 'Applicatif, intégration' },
  CYBERSECURITY: { icon: ShieldCheck, hint: 'Sécurité, protection des données' },
  COMPLIANCE: { icon: ScrollText, hint: 'RGPD, DORA, réglementaire' },
  ORGANIZATION: { icon: Building2, hint: 'Organisation, processus' },
  PROCUREMENT: { icon: ShoppingCart, hint: 'Achats, fournisseurs' },
  GOVERNANCE: { icon: Landmark, hint: 'Pilotage, gouvernance' },
};

type StepDef = {
  n: number;
  title: string;
  subtitle: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
};

const STEPS: StepDef[] = [
  {
    n: 1,
    title: 'Type & informations',
    subtitle: 'Cadrage du projet',
    description: 'Choisissez la nature et le type du projet, puis renseignez ses informations clés.',
    icon: FolderKanban,
  },
  {
    n: 2,
    title: 'Cadrage & responsable',
    subtitle: 'Priorités, portefeuille, pilote',
    description: 'Définissez les niveaux de suivi, le rattachement portefeuille et le responsable.',
    icon: Layers,
  },
  {
    n: 3,
    title: 'Planification',
    subtitle: 'Dates & avancement',
    description: 'Définissez le calendrier, l’avancement initial et les jalons macro (rétroplanning par défaut).',
    icon: CalendarRange,
  },
  {
    n: 4,
    title: 'Confirmation',
    subtitle: 'Récapitulatif & création',
    description: 'Vérifiez les informations avant de créer le projet.',
    icon: CheckCircle2,
  },
];

const TOTAL_STEPS = STEPS.length;

function Req() {
  return (
    <span className="text-destructive" aria-hidden>
      *
    </span>
  );
}

/** Code unique côté client si l’utilisateur ne le renseigne pas (unicité par client côté API). */
function generateAutoProjectCode(kind: 'PROJECT' | 'ACTIVITY'): string {
  const prefix = kind === 'ACTIVITY' ? 'ACT' : 'PROJ';
  const y = new Date().getFullYear();
  const buf = new Uint8Array(4);
  crypto.getRandomValues(buf);
  const suffix = Array.from(buf, (b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
  return `${prefix}-${y}-${suffix}`;
}

/** Date `yyyy-mm-dd` → libellé fr lisible, sans décalage de fuseau. */
function formatDateFr(value: string): string {
  if (!value) return '—';
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return value;
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function initials(label: string): string {
  return label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

/** Ligne clé/valeur de la carte Aperçu. */
function PreviewRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-t border-border/60 py-2 first:border-t-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate text-right text-sm font-medium text-foreground">{children}</dd>
    </div>
  );
}

/** Ligne du récapitulatif final (étape 4). */
function SummaryItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-foreground">{children}</dd>
    </div>
  );
}

export function ProjectCreateForm() {
  const create = useCreateProject();
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  const [step, setStep] = useState(1);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const stepChangedRef = useRef(false);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [kind, setKind] = useState<'PROJECT' | 'ACTIVITY'>('PROJECT');
  const [type, setType] = useState('TRANSFORMATION');
  const [status, setStatus] = useState('DRAFT');
  const [priority, setPriority] = useState('MEDIUM');
  const [criticality, setCriticality] = useState('MEDIUM');
  const [progressPercent, setProgressPercent] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [targetEndDate, setTargetEndDate] = useState('');
  const [portfolioCategoryId, setPortfolioCategoryId] = useState('');
  const [parentProjectId, setParentProjectId] = useState<string | null>(null);
  const [ownerDialogOpen, setOwnerDialogOpen] = useState(false);
  const [ownerResourceId, setOwnerResourceId] = useState('');
  /** Détails pour libellé / soumission (liste ou ressource tout juste créée). */
  const [ownerResourceDetails, setOwnerResourceDetails] = useState<ResourceListItem | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [tagPickerOpen, setTagPickerOpen] = useState(false);
  const [tagToAdd, setTagToAdd] = useState('');
  const [milestonesEnabled, setMilestonesEnabled] = useState(true);
  const [provisionMicrosoftTeams, setProvisionMicrosoftTeams] = useState(false);
  const [retroplanSteps, setRetroplanSteps] = useState<RetroplanMacroStepRow[]>(
    cloneDefaultRetroplanMacroSteps,
  );

  const ownerName = useMemo(() => {
    if (!ownerResourceId) return '';
    const r = ownerResourceDetails;
    if (!r || r.id !== ownerResourceId) return '';
    return formatResourceDisplayName(r);
  }, [ownerResourceId, ownerResourceDetails]);

  const ownerSummaryLine = useMemo(() => {
    if (!ownerResourceId) {
      return 'Humaine du catalogue — choisissez ou créez dans la modale.';
    }
    const r = ownerResourceDetails;
    if (!r || r.id !== ownerResourceId) {
      return 'Responsable sélectionné — ouvre la modale pour vérifier le détail.';
    }
    const aff = r.affiliation === 'EXTERNAL' ? 'Externe' : 'Interne';
    return `${formatResourceDisplayName(r)} · ${aff} (catalogue ressources)`;
  }, [ownerResourceId, ownerResourceDetails]);

  const year = new Date().getFullYear();
  const categoriesQuery = useQuery({
    queryKey: projectQueryKeys.optionsPortfolioCategories(clientId),
    queryFn: () => listProjectPortfolioCategories(authFetch),
    enabled: Boolean(clientId),
  });
  /** Même découpage que la barre de filtres portefeuille — libellés métier, jamais les UUID. */
  const portfolioCategoryGroups = useMemo(
    () =>
      (categoriesQuery.data ?? []).map((root) => ({
        rootId: root.id,
        rootName: root.name,
        children: (root.children ?? [])
          .filter((child) => child.isActive !== false)
          .map((child) => ({
            id: child.id,
            name: child.name,
            fullLabel: `${root.name} / ${child.name}`,
          })),
      })),
    [categoriesQuery.data],
  );
  const portfolioCategoryOptions = useMemo(
    () =>
      portfolioCategoryGroups.flatMap((group) =>
        group.children.map((child) => ({ id: child.id, label: child.fullLabel })),
      ),
    [portfolioCategoryGroups],
  );
  const selectedPortfolioLabel = useMemo(() => {
    if (!portfolioCategoryId) return '';
    return portfolioCategoryOptions.find((o) => o.id === portfolioCategoryId)?.label ?? '';
  }, [portfolioCategoryId, portfolioCategoryOptions]);

  const activeRetroplanSteps = useMemo(
    () => retroplanSteps.filter((step) => step.name.trim().length > 0),
    [retroplanSteps],
  );

  const tagsOptionsQuery = useQuery({
    queryKey: projectQueryKeys.optionsTags(clientId),
    queryFn: () => listProjectTags(authFetch),
    enabled: Boolean(clientId),
  });
  const tagCatalog = useMemo(() => tagsOptionsQuery.data ?? [], [tagsOptionsQuery.data]);
  const microsoftConnectionQuery = useQuery({
    queryKey: ['microsoft-connection', clientId],
    queryFn: async () => {
      const res = await authFetch('/api/microsoft/connection');
      if (!res.ok) {
        throw new Error(
          (await readApiErrorMessageFromResponse(res)) ||
            'Impossible de charger la connexion Microsoft.',
        );
      }
      return res.json() as Promise<{ connection: { status: string } | null }>;
    },
    enabled: Boolean(clientId),
    retry: false,
  });
  const microsoftTeamsSettingsQuery = useQuery({
    queryKey: projectOptionsKeys.microsoftTeamsProvisioningSettings(clientId),
    queryFn: () => getMicrosoftTeamsProvisioningSettings(authFetch),
    enabled: Boolean(clientId),
    retry: false,
  });
  const availableTagsForCreate = useMemo(
    () => tagCatalog.filter((t) => !selectedTagIds.includes(t.id)),
    [tagCatalog, selectedTagIds],
  );
  const selectedTagsResolved = useMemo(
    () =>
      selectedTagIds
        .map((id) => tagCatalog.find((t) => t.id === id))
        .filter((t): t is (typeof tagCatalog)[number] => t != null),
    [selectedTagIds, tagCatalog],
  );
  const canOfferTeamsProvisioning = Boolean(
    microsoftTeamsSettingsQuery.data?.isEnabled &&
      microsoftTeamsSettingsQuery.data?.offerOnProjectCreate &&
      microsoftConnectionQuery.data?.connection?.status === 'ACTIVE',
  );

  const nameOk = name.trim().length > 0;

  /** Étape 1 = seul verrou (le nom est le seul champ obligatoire). */
  const canGoToStep = (target: number) => target <= 1 || nameOk;

  const goToStep = (target: number) => {
    const clamped = Math.min(TOTAL_STEPS, Math.max(1, target));
    if (clamped > step && !canGoToStep(clamped)) return;
    stepChangedRef.current = true;
    setStep(clamped);
  };

  /** Focus le titre de l’étape après navigation (accessibilité, sans voler le focus initial). */
  useEffect(() => {
    if (!stepChangedRef.current) return;
    stepChangedRef.current = false;
    headingRef.current?.focus();
  }, [step]);

  const doCreate = () => {
    if (!nameOk) return;

    const resolvedCode = code.trim() || generateAutoProjectCode(kind);
    if (!code.trim()) {
      setCode(resolvedCode);
    }

    const body: Record<string, unknown> = {
      name: name.trim(),
      code: resolvedCode,
      type,
      priority,
      criticality,
      status,
    };
    // N’envoyer `kind` que si ≠ PROJECT : évite 400 « property kind should not exist »
    // sur une API déployée sans ce champ dans CreateProjectDto (défaut DB = PROJECT).
    if (kind !== 'PROJECT') {
      body.kind = kind;
    }
    if (description.trim()) body.description = description.trim();
    if (progressPercent !== '') {
      const n = Number(progressPercent);
      if (!Number.isNaN(n)) body.progressPercent = Math.min(100, Math.max(0, Math.round(n)));
    }
    if (startDate) body.startDate = startDate;
    if (targetEndDate) body.targetEndDate = targetEndDate;
    if (portfolioCategoryId) body.portfolioCategoryId = portfolioCategoryId;
    if (parentProjectId) body.parentProjectId = parentProjectId;
    if (ownerResourceId && ownerResourceDetails?.id === ownerResourceId) {
      const r = ownerResourceDetails;
      body.ownerFreeLabel = formatResourceDisplayName(r).slice(0, 200);
      body.ownerAffiliation = r.affiliation === 'EXTERNAL' ? 'EXTERNAL' : 'INTERNAL';
    }
    if (canOfferTeamsProvisioning && provisionMicrosoftTeams) {
      body.provisionMicrosoftTeams = true;
    }

    let retroplanMacro: { anchorEndDate: string; steps: { name: string; daysBeforeEnd: number }[] } | undefined;
    if (milestonesEnabled) {
      try {
        const steps = parseRetroplanMacroSteps(retroplanSteps);
        if (!targetEndDate) {
          toast.error(
            'Renseignez une échéance cible pour créer les jalons par rétroplanning macro.',
          );
          setStep(3);
          return;
        }
        retroplanMacro = { anchorEndDate: targetEndDate, steps };
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Jalons invalides.');
        setStep(3);
        return;
      }
    }

    create.mutate({
      body,
      tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
      retroplanMacro,
    });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (step < TOTAL_STEPS) {
      goToStep(step + 1);
      return;
    }
    doCreate();
  };

  const currentStep = STEPS[step - 1]!;

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,280px)_minmax(0,1fr)] md:items-start xl:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        {/* Colonne gauche : rail d’étapes + aperçu */}
        <div className="space-y-4 md:sticky md:top-6 md:self-start">
          <Card size="sm" className="shadow-sm">
            <CardContent className="p-4">
              <nav aria-label="Étapes de création du projet">
                <ol>
                  {STEPS.map((s, i) => {
                    const state =
                      s.n === step ? 'current' : s.n < step ? 'done' : 'upcoming';
                    const reachable = s.n <= step || canGoToStep(s.n);
                    const isLast = i === STEPS.length - 1;
                    return (
                      <li key={s.n}>
                        <button
                          type="button"
                          onClick={() => goToStep(s.n)}
                          disabled={!reachable}
                          aria-current={state === 'current' ? 'step' : undefined}
                          className={cn(
                            'flex w-full items-stretch gap-3 rounded-lg px-2 py-2 text-left transition-colors',
                            'outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            reachable ? 'hover:bg-muted/50' : 'cursor-not-allowed opacity-55',
                            state === 'current' && 'bg-muted/60',
                          )}
                        >
                          <div className="flex w-9 shrink-0 flex-col items-center">
                            <span
                              className={cn(
                                'relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold',
                                state === 'current' &&
                                  'border-primary bg-primary text-primary-foreground',
                                state === 'done' &&
                                  'border-primary/30 bg-primary/15 text-primary',
                                state === 'upcoming' &&
                                  'border-border bg-muted text-muted-foreground',
                              )}
                            >
                              {state === 'done' ? (
                                <CheckCircle2 className="size-5" aria-hidden />
                              ) : (
                                s.n
                              )}
                            </span>
                            {!isLast ? (
                              <span
                                aria-hidden
                                className={cn(
                                  'mt-1.5 w-px flex-1 min-h-3',
                                  s.n < step ? 'bg-primary/40' : 'bg-border',
                                )}
                              />
                            ) : null}
                          </div>
                          <span className="min-w-0 flex-1 py-0.5">
                            <span
                              className={cn(
                                'block truncate text-sm font-semibold',
                                state === 'upcoming'
                                  ? 'text-muted-foreground'
                                  : 'text-foreground',
                              )}
                            >
                              {s.title}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {s.subtitle}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </nav>
            </CardContent>
          </Card>

          {/* Aperçu — reflète les données réelles saisies */}
          <Card size="sm" className="shadow-sm">
            <CardContent className="p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Aperçu
              </p>
              <div className="mt-3 flex items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <FolderKanban className="size-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {name.trim() || 'Nouveau projet'}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {PROJECT_KIND_LABEL[kind]} · {PROJECT_TYPE_LABEL[type]}
                  </p>
                </div>
              </div>

              <dl className="mt-4">
                <PreviewRow label="Priorité">{PROJECT_PRIORITY_LABEL[priority]}</PreviewRow>
                <PreviewRow label="Criticité">{PROJECT_CRITICALITY_LABEL[criticality]}</PreviewRow>
                <PreviewRow label="Échéance">{formatDateFr(targetEndDate)}</PreviewRow>
                <PreviewRow label="Jalons">
                  {milestonesEnabled ? (
                    `${activeRetroplanSteps.length} jalon${activeRetroplanSteps.length > 1 ? 's' : ''} (rétroplanning)`
                  ) : (
                    <span className="text-muted-foreground">Aucun</span>
                  )}
                </PreviewRow>
                <PreviewRow label="Responsable">
                  {ownerName ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="flex size-5 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary">
                        {initials(ownerName)}
                      </span>
                      <span className="truncate">{ownerName}</span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Aucun</span>
                  )}
                </PreviewRow>
              </dl>

              {selectedTagsResolved.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border/60 pt-3">
                  {selectedTagsResolved.map((tag) => (
                    <RegistryBadge key={tag.id} style={projectTagBadgeStyle(tag.color)}>
                      {tag.name}
                    </RegistryBadge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Colonne droite : contenu de l’étape courante */}
        <Card size="sm" className="shadow-sm">
          <CardContent className="space-y-6 p-5 sm:p-6">
            <div className="border-b border-border/60 pb-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                Étape {step} sur {TOTAL_STEPS}
              </p>
              <h2
                ref={headingRef}
                tabIndex={-1}
                className="mt-1 flex items-center gap-2 text-lg font-semibold text-foreground outline-none"
              >
                <currentStep.icon className="size-5 text-muted-foreground" aria-hidden />
                {currentStep.title}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{currentStep.description}</p>
              <span className="sr-only" aria-live="polite">
                Étape {step} sur {TOTAL_STEPS} : {currentStep.title}
              </span>
            </div>

            {/* ── Étape 1 : Type & informations ─────────────────────────── */}
            {step === 1 && (
              <div className="space-y-6">
                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium text-foreground">Type de projet</legend>
                  <div
                    role="radiogroup"
                    aria-label="Type de projet"
                    className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
                  >
                    {Object.entries(PROJECT_TYPE_LABEL).map(([key, label]) => {
                      const meta = TYPE_META[key];
                      const Icon = meta?.icon ?? Layers;
                      const selected = type === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => setType(key)}
                          className={cn(
                            'flex items-center gap-3 rounded-xl border p-3 text-left transition-colors',
                            'outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            selected
                              ? 'border-primary bg-accent/60 ring-1 ring-primary'
                              : 'border-border hover:border-primary/40 hover:bg-muted/40',
                          )}
                        >
                          <span
                            className={cn(
                              'flex size-9 shrink-0 items-center justify-center rounded-lg',
                              selected
                                ? 'bg-primary/15 text-primary'
                                : 'bg-muted text-muted-foreground',
                            )}
                          >
                            <Icon className="size-5" aria-hidden />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-foreground">
                              {label}
                            </span>
                            {meta?.hint && (
                              <span className="block truncate text-xs text-muted-foreground">
                                {meta.hint}
                              </span>
                            )}
                          </span>
                          <CheckCircle2
                            className={cn(
                              'size-5 shrink-0',
                              selected ? 'text-primary' : 'text-transparent',
                            )}
                            aria-hidden
                          />
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

                <div className={field}>
                  <Label htmlFor="p-kind">Nature</Label>
                  <Select
                    value={kind}
                    onValueChange={(v) => setKind((v as 'PROJECT' | 'ACTIVITY') ?? 'PROJECT')}
                  >
                    <SelectTrigger id="p-kind" size="sm" className="w-full">
                      <SelectValue>{PROJECT_KIND_LABEL[kind]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PROJECT">{PROJECT_KIND_LABEL.PROJECT}</SelectItem>
                      <SelectItem value="ACTIVITY">{PROJECT_KIND_LABEL.ACTIVITY}</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    <strong>Projet</strong> : livrable structuré (jalons, risques).{' '}
                    <strong>Activité</strong> : suivi plus léger (même outillage, périmètre réduit).
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className={cn(field, 'sm:col-span-2')}>
                    <Label htmlFor="p-name">
                      Nom <Req />
                    </Label>
                    <Input
                      id="p-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      autoComplete="off"
                      placeholder="Ex. Migration messagerie"
                      aria-required
                    />
                  </div>
                  <div className={field}>
                    <Label htmlFor="p-code">Code</Label>
                    <Input
                      id="p-code"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      autoComplete="off"
                      placeholder="Ex. PROJ-2026-001 — laisser vide pour génération auto"
                      className="font-mono text-sm"
                      aria-describedby="p-code-hint"
                    />
                    <p id="p-code-hint" className="text-xs text-muted-foreground">
                      Si vide : code du type {kind === 'ACTIVITY' ? 'ACT' : 'PROJ'}-{year}-… (suffixe
                      aléatoire).
                    </p>
                  </div>
                </div>

                <div className={field}>
                  <Label htmlFor="p-desc">Description</Label>
                  <textarea
                    id="p-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className={textareaClass}
                    placeholder="Contexte, périmètre, objectifs…"
                    rows={4}
                  />
                </div>
              </div>
            )}

            {/* ── Étape 2 : Cadrage & responsable ───────────────────────── */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className={field}>
                    <Label htmlFor="p-status">Statut</Label>
                    <Select value={status} onValueChange={(v) => setStatus(v ?? 'DRAFT')}>
                      <SelectTrigger id="p-status" size="sm" className="w-full">
                        <SelectValue>{PROJECT_STATUS_LABEL[status]}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(PROJECT_STATUS_LABEL).map(([k, label]) => (
                          <SelectItem key={k} value={k}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className={field}>
                    <Label htmlFor="p-priority">Priorité</Label>
                    <Select value={priority} onValueChange={(v) => setPriority(v ?? 'MEDIUM')}>
                      <SelectTrigger id="p-priority" size="sm" className="w-full">
                        <SelectValue>{PROJECT_PRIORITY_LABEL[priority]}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(PROJECT_PRIORITY_LABEL).map(([k, label]) => (
                          <SelectItem key={k} value={k}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className={field}>
                    <Label htmlFor="p-criticality">Criticité</Label>
                    <Select value={criticality} onValueChange={(v) => setCriticality(v ?? 'MEDIUM')}>
                      <SelectTrigger id="p-criticality" size="sm" className="w-full">
                        <SelectValue>{PROJECT_CRITICALITY_LABEL[criticality]}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(PROJECT_CRITICALITY_LABEL).map(([k, label]) => (
                          <SelectItem key={k} value={k}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className={field}>
                    <ProjectParentCombobox
                      id="p-parent-project"
                      label="Projet parent"
                      value={parentProjectId}
                      onValueChange={setParentProjectId}
                    />
                  </div>
                  <div className={cn(field, 'sm:col-span-2')}>
                    <Label htmlFor="p-portfolio-category">Sous-catégorie portefeuille</Label>
                    <Select
                      value={portfolioCategoryId || '__none__'}
                      onValueChange={(v) => setPortfolioCategoryId(v && v !== '__none__' ? v : '')}
                      disabled={categoriesQuery.isLoading}
                    >
                      <SelectTrigger id="p-portfolio-category" size="sm" className="w-full">
                        <SelectValue placeholder="Sélectionner une sous-catégorie">
                          {categoriesQuery.isLoading
                            ? 'Chargement…'
                            : portfolioCategoryId
                              ? selectedPortfolioLabel || 'Sous-catégorie sélectionnée'
                              : 'Aucune'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Aucune</SelectItem>
                        {portfolioCategoryOptions.length > 0 ? <SelectSeparator /> : null}
                        {portfolioCategoryGroups.map((group) =>
                          group.children.length === 0 ? null : (
                            <SelectGroup key={group.rootId}>
                              <SelectLabel>{group.rootName}</SelectLabel>
                              {group.children.map((child) => (
                                <SelectItem key={child.id} value={child.id}>
                                  {child.name}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                    {categoriesQuery.isLoading ? (
                      <p className="text-xs text-muted-foreground">
                        Chargement des catégories portefeuille…
                      </p>
                    ) : portfolioCategoryOptions.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Aucune sous-catégorie disponible. Créez l’arborescence (racine + sous-niveau)
                        dans{' '}
                        <Link href={projectsOptions()} className="font-medium text-primary underline">
                          Options projets
                        </Link>
                        .
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Seules les sous-catégories actives (niveau 2) sont assignables à un projet.
                      </p>
                    )}
                  </div>
                </div>

                <div className={field}>
                  <Label htmlFor="p-owner-trigger">Responsable de projet</Label>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-3">
                    <div className="flex min-h-9 min-w-0 flex-1 items-center rounded-lg border border-border/70 bg-muted/25 px-3 py-2">
                      <p
                        id="p-owner-summary"
                        className="truncate text-sm text-foreground"
                        title={ownerSummaryLine}
                      >
                        {ownerSummaryLine}
                      </p>
                    </div>
                    <Button
                      id="p-owner-trigger"
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 shrink-0 gap-1.5 sm:self-center"
                      onClick={() => setOwnerDialogOpen(true)}
                    >
                      <UserCog className="size-3.5 text-muted-foreground" aria-hidden />
                      {ownerResourceId ? 'Modifier' : 'Définir'}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Ressource <strong>Humaine</strong> du catalogue (sélection ou création) — alignée
                    avec la fiche ressource et l’équipe projet.
                  </p>

                  <PersonCatalogPickerDialog
                    open={ownerDialogOpen}
                    onOpenChange={setOwnerDialogOpen}
                    queryKey={['resources', 'human', 'project-owner']}
                    title="Responsable de projet"
                    description={
                      <>
                        Choisis une ressource <strong>Humaine</strong> du catalogue ou crée-en une.
                        Le responsable est enregistré comme nom libre aligné sur la ressource (équipe
                        projet).
                      </>
                    }
                    selectedResourceId={ownerResourceId}
                    selectedResourceDetails={ownerResourceDetails}
                    onSelectionChange={(id, resource) => {
                      setOwnerResourceId(id);
                      setOwnerResourceDetails(resource);
                      setOwnerDialogOpen(false);
                    }}
                    allowEmpty
                    emptySelectionLabel="Aucun responsable"
                    footerVariant="done-only"
                    doneLabel="Fermer"
                    newPersonFormPrefix="project-create-owner-person"
                    newPersonDialogDescription={
                      <>
                        Création dans le catalogue ressources (client actif), puis sélection comme
                        responsable de projet.
                      </>
                    }
                    catalogIntro={
                      <>
                        Liste des ressources de type <strong>Humaine</strong> du client actif — même
                        référentiel que la page Ressources.
                      </>
                    }
                    filterHint={
                      <>
                        Clique une ligne pour définir le responsable, ou{' '}
                        <strong>Aucun responsable</strong> pour ne pas en définir.
                      </>
                    }
                    emptyStateNoFilter={{
                      title: 'Aucune ressource Humaine dans le catalogue',
                      description:
                        'Crée une ressource Humaine ou vérifie les droits de lecture du module Ressources.',
                    }}
                    emptyStateFiltered={{
                      title: 'Aucun résultat',
                      description: 'Aucune ressource Humaine ne correspond à ce filtre.',
                    }}
                    dialogContentClassName="max-h-[min(85vh,800px)] w-full max-w-[calc(100vw-2rem)] sm:max-w-[calc(100vw-2rem)]"
                  />
                </div>

                <div className={field}>
                  <Label className="text-foreground">Étiquettes</Label>
                  <p className="text-xs text-muted-foreground">
                    Optionnel. Même référentiel que sur la fiche projet ; vous pourrez en ajouter ou
                    retirer ensuite.
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {selectedTagsResolved.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {selectedTagsResolved.map((tag) => (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() =>
                              setSelectedTagIds((ids) => ids.filter((id) => id !== tag.id))
                            }
                            title="Retirer cette étiquette"
                            className="rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <RegistryBadge style={projectTagBadgeStyle(tag.color)}>
                              {tag.name} ×
                            </RegistryBadge>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Aucune étiquette sélectionnée.
                      </span>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 shrink-0 p-0"
                      onClick={() => setTagPickerOpen((prev) => !prev)}
                      title="Ajouter une étiquette"
                      disabled={!clientId || availableTagsForCreate.length === 0}
                    >
                      +
                    </Button>
                    {tagPickerOpen && availableTagsForCreate.length > 0 ? (
                      <Select
                        value={tagToAdd}
                        onValueChange={(value) => {
                          if (!value) return;
                          setTagToAdd('');
                          if (selectedTagIds.includes(value)) return;
                          setSelectedTagIds((ids) => [...ids, value]);
                          setTagPickerOpen(false);
                        }}
                      >
                        <SelectTrigger className="h-8 w-[min(100%,220px)] max-w-[220px]">
                          <SelectValue placeholder="Choisir une étiquette" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableTagsForCreate.map((tag) => (
                            <SelectItem key={tag.id} value={tag.id}>
                              {tag.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : null}
                  </div>
                </div>
              </div>
            )}

            {/* ── Étape 3 : Planification ───────────────────────────────── */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className={field}>
                    <Label htmlFor="p-start">Date de début</Label>
                    <Input
                      id="p-start"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className={field}>
                    <Label htmlFor="p-end">Échéance cible</Label>
                    <Input
                      id="p-end"
                      type="date"
                      value={targetEndDate}
                      onChange={(e) => setTargetEndDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className={field}>
                  <Label htmlFor="p-prog" className="flex flex-wrap items-center gap-1">
                    <SlidersHorizontal className="size-3.5 text-muted-foreground" aria-hidden />
                    Avancement initial (%)
                  </Label>
                  <Input
                    id="p-prog"
                    inputMode="numeric"
                    value={progressPercent}
                    onChange={(e) => setProgressPercent(e.target.value)}
                    placeholder="0–100, laisser vide si inconnu"
                    className="max-w-[12rem]"
                  />
                  <p className="text-xs text-muted-foreground">
                    Optionnel. Sinon calculé plus tard à partir des tâches.
                  </p>
                </div>

                <fieldset className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <legend className="text-sm font-medium text-foreground">Jalons clés</legend>
                    <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-accent-foreground">
                      Rétroplanning macro
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Par défaut, trois jalons sont générés à rebours depuis l&apos;échéance cible.
                    Les dates s&apos;ajustent lorsque vous modifiez l&apos;échéance ou les écarts en
                    jours.
                  </p>

                  <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
                    <Switch
                      id="p-milestones-enabled"
                      checked={milestonesEnabled}
                      onCheckedChange={setMilestonesEnabled}
                      aria-label="Créer les jalons par rétroplanning macro"
                    />
                    <Label htmlFor="p-milestones-enabled" className="cursor-pointer text-sm">
                      Créer les jalons à la création du projet
                    </Label>
                  </div>

                  {milestonesEnabled ? (
                    <div className="space-y-3">
                      {!targetEndDate ? (
                        <p className="text-xs text-[color:var(--state-warning)]" role="status">
                          Renseignez une échéance cible pour calculer les dates des jalons.
                        </p>
                      ) : null}

                      <ul className="space-y-2" aria-label="Jalons du rétroplanning macro">
                        {retroplanSteps.map((row, index) => {
                          const computedDate = formatRetroplanComputedTargetDate(
                            targetEndDate,
                            row.daysBeforeEnd,
                          );
                          return (
                            <li
                              key={`retro-step-${index}`}
                              className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-muted/10 p-3"
                            >
                              <Diamond
                                className="size-4 shrink-0 text-primary"
                                aria-hidden
                              />
                              <div className="min-w-0 flex-1 space-y-1">
                                <Label
                                  htmlFor={`p-milestone-name-${index}`}
                                  className="sr-only"
                                >
                                  Libellé du jalon {index + 1}
                                </Label>
                                <Input
                                  id={`p-milestone-name-${index}`}
                                  value={row.name}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    setRetroplanSteps((prev) => {
                                      const next = [...prev];
                                      next[index] = { ...next[index], name: value };
                                      return next;
                                    });
                                  }}
                                  placeholder="Ex. Validation du cadrage"
                                  maxLength={500}
                                />
                              </div>
                              <div className="w-full space-y-1 sm:w-24">
                                <Label
                                  htmlFor={`p-milestone-days-${index}`}
                                  className="text-[10px] uppercase text-muted-foreground"
                                >
                                  J. avant fin
                                </Label>
                                <Input
                                  id={`p-milestone-days-${index}`}
                                  inputMode="numeric"
                                  value={row.daysBeforeEnd}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    setRetroplanSteps((prev) => {
                                      const next = [...prev];
                                      next[index] = { ...next[index], daysBeforeEnd: value };
                                      return next;
                                    });
                                  }}
                                  placeholder="0"
                                />
                              </div>
                              <div className="ml-auto min-w-[7.5rem] text-right text-sm font-medium tabular-nums text-foreground">
                                {computedDate ?? '—'}
                              </div>
                              {retroplanSteps.length > 1 ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="shrink-0 text-muted-foreground hover:text-destructive"
                                  aria-label={`Supprimer le jalon ${index + 1}`}
                                  onClick={() =>
                                    setRetroplanSteps((prev) =>
                                      prev.length <= 1
                                        ? prev
                                        : prev.filter((_, i) => i !== index),
                                    )
                                  }
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              ) : null}
                            </li>
                          );
                        })}
                      </ul>

                      <Button
                        type="button"
                        variant="outline"
                        className="h-10 w-full border-dashed"
                        onClick={() =>
                          setRetroplanSteps((prev) => [
                            ...prev,
                            { name: '', daysBeforeEnd: '14' },
                          ])
                        }
                      >
                        <Plus className="mr-1.5 size-4" aria-hidden />
                        Ajouter un jalon
                      </Button>
                    </div>
                  ) : null}
                </fieldset>
              </div>
            )}

            {/* ── Étape 4 : Confirmation ────────────────────────────────── */}
            {step === 4 && (
              <div className="space-y-5">
                <div className="rounded-xl border border-border/70">
                  <dl className="grid grid-cols-1 gap-x-8 gap-y-4 p-4 sm:grid-cols-2 sm:p-5">
                    <SummaryItem label="Nom du projet">
                      {name.trim() || <span className="text-muted-foreground">—</span>}
                    </SummaryItem>
                    <SummaryItem label="Nature">{PROJECT_KIND_LABEL[kind]}</SummaryItem>
                    <SummaryItem label="Type">{PROJECT_TYPE_LABEL[type]}</SummaryItem>
                    <SummaryItem label="Code">
                      {code.trim() ? (
                        <span className="font-mono">{code.trim()}</span>
                      ) : (
                        <span className="text-muted-foreground">Généré automatiquement</span>
                      )}
                    </SummaryItem>
                    <SummaryItem label="Statut">{PROJECT_STATUS_LABEL[status]}</SummaryItem>
                    <SummaryItem label="Priorité">{PROJECT_PRIORITY_LABEL[priority]}</SummaryItem>
                    <SummaryItem label="Criticité">
                      {PROJECT_CRITICALITY_LABEL[criticality]}
                    </SummaryItem>
                    <SummaryItem label="Responsable">
                      {ownerName || <span className="text-muted-foreground">Aucun</span>}
                    </SummaryItem>
                    <SummaryItem label="Sous-catégorie portefeuille">
                      {selectedPortfolioLabel || (
                        <span className="text-muted-foreground">Aucune</span>
                      )}
                    </SummaryItem>
                    <SummaryItem label="Avancement initial">
                      {progressPercent !== '' ? (
                        `${progressPercent} %`
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </SummaryItem>
                    <SummaryItem label="Date de début">{formatDateFr(startDate)}</SummaryItem>
                    <SummaryItem label="Échéance cible">{formatDateFr(targetEndDate)}</SummaryItem>
                    <SummaryItem label="Jalons">
                      {milestonesEnabled ? (
                        `${activeRetroplanSteps.length} jalon${activeRetroplanSteps.length > 1 ? 's' : ''} (rétroplanning macro)`
                      ) : (
                        <span className="text-muted-foreground">Aucun</span>
                      )}
                    </SummaryItem>
                  </dl>
                  {milestonesEnabled && activeRetroplanSteps.length > 0 ? (
                    <div className="border-t border-border/70 p-4 sm:p-5">
                      <p className="text-xs text-muted-foreground">Jalons clés (rétroplanning)</p>
                      <ul className="mt-2 space-y-2">
                        {retroplanSteps.map((row, index) => {
                          const label = row.name.trim();
                          if (!label) return null;
                          const computedDate = formatRetroplanComputedTargetDate(
                            targetEndDate,
                            row.daysBeforeEnd,
                          );
                          return (
                            <li
                              key={`confirm-milestone-${index}`}
                              className="flex items-center justify-between gap-3 text-sm"
                            >
                              <span className="inline-flex min-w-0 items-center gap-2 font-medium">
                                <Diamond className="size-3.5 shrink-0 text-primary" aria-hidden />
                                <span className="truncate">{label}</span>
                              </span>
                              <span className="shrink-0 tabular-nums text-muted-foreground">
                                {computedDate ?? '—'}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ) : null}
                  {selectedTagsResolved.length > 0 && (
                    <div className="border-t border-border/70 p-4 sm:p-5">
                      <p className="text-xs text-muted-foreground">Étiquettes</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {selectedTagsResolved.map((tag) => (
                          <RegistryBadge key={tag.id} style={projectTagBadgeStyle(tag.color)}>
                            {tag.name}
                          </RegistryBadge>
                        ))}
                      </div>
                    </div>
                  )}
                  {description.trim() && (
                    <div className="border-t border-border/70 p-4 sm:p-5">
                      <p className="text-xs text-muted-foreground">Description</p>
                      <p className="mt-1 text-sm whitespace-pre-line text-foreground">
                        {description.trim()}
                      </p>
                    </div>
                  )}
                </div>

                <div
                  className="flex items-start gap-3 rounded-xl border border-[color:var(--state-success)] bg-[color:var(--state-success-bg)] p-4 text-[color:var(--state-success)]"
                  role="status"
                >
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden />
                  <div className="text-sm">
                    <p className="font-semibold">Prêt à être créé</p>
                    <p>
                      Le projet sera ajouté au portefeuille du client actif
                      {milestonesEnabled && activeRetroplanSteps.length > 0
                        ? ` avec ${activeRetroplanSteps.length} jalon${activeRetroplanSteps.length > 1 ? 's' : ''} planifié${activeRetroplanSteps.length > 1 ? 's' : ''}`
                        : ''}
                      . Vous pourrez ajuster ces paramètres à tout moment depuis la fiche projet.
                    </p>
                  </div>
                </div>

                {canOfferTeamsProvisioning ? (
                  <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                    <div className="flex items-start gap-3">
                      <input
                        id="project-create-provision-teams"
                        type="checkbox"
                        className="mt-1 size-4 rounded border-input accent-primary"
                        checked={provisionMicrosoftTeams}
                        onChange={(e) => setProvisionMicrosoftTeams(e.target.checked)}
                      />
                      <div className="space-y-1">
                        <Label
                          htmlFor="project-create-provision-teams"
                          className="cursor-pointer text-sm font-medium"
                        >
                          Créer l’équipe Microsoft Teams
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Option désactivée par défaut. Le provisioning ne sera lancé qu’après la
                          création du projet si vous cochez explicitement cette case.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {/* ── Barre de navigation ───────────────────────────────────── */}
            <div className="flex flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Link
                  href={projectsList()}
                  className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
                >
                  Annuler
                </Link>
                {step > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => goToStep(step - 1)}
                  >
                    <ChevronLeft className="size-4" aria-hidden />
                    Précédent
                  </Button>
                )}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                {step === 1 && !nameOk && (
                  <p className="text-xs text-muted-foreground">Renseignez le nom pour continuer.</p>
                )}
                {step < TOTAL_STEPS ? (
                  <Button
                    type="submit"
                    size="sm"
                    className="w-full gap-1 sm:w-auto"
                    disabled={!canGoToStep(step + 1)}
                  >
                    Continuer
                    <ChevronRight className="size-4" aria-hidden />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    size="sm"
                    className="w-full gap-1.5 sm:w-auto"
                    disabled={create.isPending || !nameOk}
                  >
                    <CheckCircle2 className="size-4" aria-hidden />
                    {create.isPending ? 'Création…' : 'Créer le projet'}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
