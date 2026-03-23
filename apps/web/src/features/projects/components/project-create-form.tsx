'use client';

import {
  useMemo,
  useState,
  type ComponentType,
  type FormEvent,
  type ReactNode,
} from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useCreateProject } from '../hooks/use-create-project';
import { projectsList } from '../constants/project-routes';
import {
  PROJECT_KIND_LABEL,
  PROJECT_TYPE_LABEL,
  PROJECT_STATUS_LABEL,
  PROJECT_PRIORITY_LABEL,
  PROJECT_CRITICALITY_LABEL,
} from '../constants/project-enum-labels';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { formatResourceDisplayName } from '@/lib/resource-labels';
import { tryListResources, type ResourceListItem } from '@/services/resources';
import { NewResourceForm } from '@/app/(protected)/resources/_components/new-resource-form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertCircle,
  CalendarRange,
  FolderKanban,
  Info,
  Layers,
  SlidersHorizontal,
  UserCog,
  UserPlus,
} from 'lucide-react';

const textareaClass = cn(
  'min-h-[100px] w-full resize-y rounded-lg border border-input bg-background px-2.5 py-2 text-sm transition-colors outline-none',
  'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
  'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
);

function Section({
  id,
  title,
  description,
  icon: Icon,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
}) {
  return (
    <section className="space-y-6" aria-labelledby={id}>
      <div className="border-b border-border/70 pb-3">
        <h2 id={id} className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Icon className="size-4 text-muted-foreground" aria-hidden />
          {title}
        </h2>
        {description && (
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

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

export function ProjectCreateForm() {
  const create = useCreateProject();
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
  const [ownerDialogOpen, setOwnerDialogOpen] = useState(false);
  const [newPersonDialogOpen, setNewPersonDialogOpen] = useState(false);
  const [ownerResourceId, setOwnerResourceId] = useState('');
  /** Détails pour libellé / soumission (liste ou ressource tout juste créée). */
  const [ownerResourceDetails, setOwnerResourceDetails] = useState<ResourceListItem | null>(null);
  const [resourceSearch, setResourceSearch] = useState('');

  const authFetch = useAuthenticatedFetch();

  const {
    data: resourcesOutcome,
    isLoading: resourcesLoading,
    refetch: refetchHumanResources,
  } = useQuery({
    queryKey: ['resources', 'human', 'project-owner'],
    queryFn: () => tryListResources(authFetch, { type: 'HUMAN', limit: 100, offset: 0 }),
    enabled: ownerDialogOpen,
  });

  const humanResources = resourcesOutcome?.ok ? resourcesOutcome.data.items : [];
  const resourcesBlock =
    resourcesOutcome && !resourcesOutcome.ok ? resourcesOutcome : null;
  /** Liste ou création impossible (HTTP en erreur) — pas seulement « chargement ». */
  const resourceCatalogDenied = Boolean(resourcesBlock);

  const filteredHumanResources = useMemo(() => {
    const q = resourceSearch.trim().toLowerCase();
    if (!q) return humanResources;
    return humanResources.filter((r) => {
      const label = formatResourceDisplayName(r).toLowerCase();
      const hay = [label, r.email ?? '', r.code ?? '', r.companyName ?? ''].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [humanResources, resourceSearch]);

  const ownerTriggerLabel = useMemo(() => {
    if (!ownerResourceId) return null;
    const r =
      ownerResourceDetails ?? humanResources.find((x) => x.id === ownerResourceId);
    return r ? formatResourceDisplayName(r) : ownerResourceId;
  }, [ownerResourceId, ownerResourceDetails, humanResources]);

  const ownerSummaryLine = useMemo(() => {
    if (resourcesLoading && ownerDialogOpen) {
      return 'Chargement du catalogue personnes…';
    }
    if (resourcesBlock && !ownerResourceId) {
      if (resourcesBlock.status === 403) {
        return 'Catalogue personnes : accès refusé — droit lecture ressources ou module désactivé.';
      }
      return 'Catalogue personnes indisponible — voir la modale (détail).';
    }
    if (!ownerResourceId) {
      return 'Personne du catalogue — choisissez ou créez dans la modale.';
    }
    const r =
      ownerResourceDetails ?? humanResources.find((x) => x.id === ownerResourceId);
    if (!r) return ownerResourceId;
    const aff = r.affiliation === 'EXTERNAL' ? 'Externe' : 'Interne';
    return `${formatResourceDisplayName(r)} · ${aff} (catalogue ressources)`;
  }, [
    ownerResourceId,
    ownerResourceDetails,
    humanResources,
    resourcesLoading,
    ownerDialogOpen,
    resourcesBlock,
  ]);

  const year = new Date().getFullYear();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

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
    if (ownerResourceId) {
      const r =
        ownerResourceDetails ?? humanResources.find((x) => x.id === ownerResourceId);
      if (r) {
        body.ownerFreeLabel = formatResourceDisplayName(r).slice(0, 200);
        body.ownerAffiliation = r.affiliation === 'EXTERNAL' ? 'EXTERNAL' : 'INTERNAL';
      }
    }

    create.mutate(body);
  };

  const field = 'flex min-w-0 flex-col gap-1.5';

  return (
    <form onSubmit={submit} className="w-full">
      <Card size="sm" className="shadow-sm">
        <CardHeader className="border-b border-border/60 pb-3">
          <CardTitle className="text-base">Informations du projet</CardTitle>
          <CardDescription>
            Renseignez l’identité et les paramètres par défaut. Vous pourrez les ajuster ensuite
            depuis la fiche projet.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-start lg:gap-x-10 lg:gap-y-0 xl:gap-x-12">
            {/* Colonne gauche : identité — en dessous sur mobile / petit écran */}
            <div className="min-w-0 space-y-10">
          <Section
            id="project-create-identity"
            title="Identité"
            description="Indiquez s’il s’agit d’un projet structuré ou d’une activité de suivi, puis le nom. Le code peut être laissé vide : il sera généré automatiquement."
            icon={FolderKanban}
          >
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
              <Label htmlFor="p-owner-trigger">Responsable de projets</Label>
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
                Ressource <strong>Personne</strong> du catalogue (sélection ou création) — alignée
                avec la fiche ressource et l’équipe projet.
              </p>

              <Dialog
                open={ownerDialogOpen}
                onOpenChange={(open) => {
                  setOwnerDialogOpen(open);
                  if (!open) setResourceSearch('');
                }}
              >
                <DialogContent
                  className="max-h-[min(85vh,640px)] w-full max-w-lg overflow-y-auto sm:max-w-lg"
                  showCloseButton
                >
                  <DialogHeader className="space-y-2 text-left">
                    <DialogTitle className="text-lg font-semibold tracking-tight">
                      Responsable de projets
                    </DialogTitle>
                    <DialogDescription className="text-sm leading-relaxed">
                      Choisissez une ressource <strong>Personne</strong> du catalogue ou créez-en une.
                      Le responsable est enregistré comme nom libre aligné sur la ressource (équipe
                      projet).
                    </DialogDescription>
                  </DialogHeader>

                  <div className="w-full min-w-0 space-y-3">
                      {resourcesBlock ? (
                        <Alert
                          variant={
                            resourcesBlock.status === 404 || resourcesBlock.status >= 500
                              ? 'destructive'
                              : 'default'
                          }
                          className={
                            resourcesBlock.status === 403
                              ? 'border-amber-500/45 bg-amber-500/[0.07] text-foreground [&_[data-slot=alert-description]]:text-muted-foreground'
                              : resourcesBlock.status === 401
                                ? 'border-border'
                                : resourcesBlock.status === 404 || resourcesBlock.status >= 500
                                  ? 'border-destructive/35'
                                  : 'border-border'
                          }
                        >
                          {resourcesBlock.status === 403 || resourcesBlock.status === 401 ? (
                            <Info
                              className="size-4 text-amber-700 dark:text-amber-400"
                              aria-hidden
                            />
                          ) : (
                            <AlertCircle className="size-4" aria-hidden />
                          )}
                          <AlertTitle>
                            {resourcesBlock.status === 403
                              ? 'Accès au catalogue restreint'
                              : resourcesBlock.status === 401
                                ? 'Authentification requise'
                                : resourcesBlock.status === 404
                                  ? 'API ressources introuvable'
                                  : 'Catalogue indisponible'}
                          </AlertTitle>
                          <AlertDescription>
                            {resourcesBlock.message}
                            {resourcesBlock.status === 403 ? (
                              <span className="mt-2 block text-xs text-muted-foreground">
                                Demandez la permission{' '}
                                <strong className="font-medium">resources.read</strong> ou vérifiez
                                que le module Ressources est activé pour ce client. Vous pourrez
                                définir le responsable plus tard depuis la fiche projet.
                              </span>
                            ) : null}
                          </AlertDescription>
                        </Alert>
                      ) : null}

                      <p className="text-xs text-muted-foreground">
                        Liste des ressources de type <strong>Personne</strong> du client actif.
                      </p>

                      <div className={cn(field, 'w-full')}>
                        <Label htmlFor="p-owner-resource-search">Filtrer</Label>
                        <Input
                          id="p-owner-resource-search"
                          value={resourceSearch}
                          onChange={(e) => setResourceSearch(e.target.value)}
                          placeholder="Nom, email, code…"
                          autoComplete="off"
                          className="w-full"
                          disabled={resourcesLoading || resourceCatalogDenied}
                        />
                      </div>

                      <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0 flex-1 space-y-2">
                            <Label htmlFor="p-owner-resource" className="text-sm font-medium">
                              Personne
                            </Label>
                            <Select
                              value={ownerResourceId || '__none__'}
                              onValueChange={(v) => {
                                if (v === '__none__' || v == null) {
                                  setOwnerResourceId('');
                                  setOwnerResourceDetails(null);
                                  return;
                                }
                                const picked =
                                  filteredHumanResources.find((x) => x.id === v) ??
                                  humanResources.find((x) => x.id === v);
                                setOwnerResourceId(v);
                                setOwnerResourceDetails(picked ?? null);
                              }}
                              disabled={resourcesLoading || resourceCatalogDenied}
                            >
                              <SelectTrigger id="p-owner-resource" size="sm" className="w-full">
                                <SelectValue placeholder="Choisir une personne…">
                                  {resourcesLoading
                                    ? 'Chargement…'
                                    : ownerTriggerLabel ?? 'Aucune'}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">Aucune</SelectItem>
                                {filteredHumanResources.map((r) => (
                                  <SelectItem key={r.id} value={r.id}>
                                    {formatResourceDisplayName(r)}
                                    {r.email ? ` · ${r.email}` : ''}
                                    {r.affiliation
                                      ? ` · ${r.affiliation === 'EXTERNAL' ? 'Externe' : 'Interne'}`
                                      : ''}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                              Même référentiel que la page Ressources — le projet enregistre le nom
                              affiché comme responsable hors compte.
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="h-9 shrink-0 gap-1.5 sm:mt-6"
                            disabled={resourceCatalogDenied}
                            onClick={() => setNewPersonDialogOpen(true)}
                          >
                            <UserPlus className="size-3.5" aria-hidden />
                            Créer une personne
                          </Button>
                        </div>
                      </div>
                  </div>

                  <DialogFooter showCloseButton={false}>
                    <Button
                      type="button"
                      variant="default"
                      onClick={() => setOwnerDialogOpen(false)}
                    >
                      Terminé
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={newPersonDialogOpen} onOpenChange={setNewPersonDialogOpen}>
                <DialogContent
                  className="max-h-[min(90vh,720px)] w-full max-w-lg overflow-y-auto sm:max-w-lg"
                  showCloseButton
                >
                  <DialogHeader className="space-y-2 text-left">
                    <DialogTitle className="text-lg font-semibold tracking-tight">
                      Nouvelle personne
                    </DialogTitle>
                    <DialogDescription className="text-sm leading-relaxed">
                      Création dans le catalogue ressources (client actif), puis sélection comme
                      responsable de projet.
                    </DialogDescription>
                  </DialogHeader>
                  {newPersonDialogOpen ? (
                    <NewResourceForm
                      formIdPrefix="project-create-owner-person"
                      forceType="HUMAN"
                      className="w-full max-w-full space-y-4"
                      onSuccess={(created) => {
                        setOwnerResourceId(created.id);
                        setOwnerResourceDetails(created);
                        void refetchHumanResources();
                        setNewPersonDialogOpen(false);
                      }}
                    />
                  ) : null}
                </DialogContent>
              </Dialog>
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
          </Section>
            </div>

            {/* Colonne droite : classification + planning — empilées en dessous sur mobile */}
            <div className="min-w-0 space-y-10 lg:border-l lg:border-border/60 lg:pl-8 xl:pl-10">
          <Section
            id="project-create-classification"
            title="Classification"
            description="Type et niveaux de suivi — cohérents avec le pilotage portefeuille."
            icon={Layers}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className={field}>
                <Label htmlFor="p-type">Type</Label>
                <Select value={type} onValueChange={(v) => setType(v ?? 'TRANSFORMATION')}>
                  <SelectTrigger id="p-type" size="sm" className="w-full">
                    <SelectValue>{PROJECT_TYPE_LABEL[type]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PROJECT_TYPE_LABEL).map(([k, label]) => (
                      <SelectItem key={k} value={k}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
                <Select
                  value={criticality}
                  onValueChange={(v) => setCriticality(v ?? 'MEDIUM')}
                >
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
            </div>
          </Section>

          <Section
            id="project-create-planning"
            title="Planning & suivi"
            description="Dates et avancement initial optionnels."
            icon={CalendarRange}
          >
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
          </Section>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 border-t border-border/60 bg-muted/20 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Seul le nom est obligatoire. Le code est généré automatiquement s’il est vide.
          </p>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:justify-end">
            <Link
              href={projectsList()}
              className={cn(
                buttonVariants({ variant: 'outline', size: 'sm' }),
                'w-full sm:w-auto',
              )}
            >
              Annuler
            </Link>
            <Button
              type="submit"
              size="sm"
              className="w-full sm:w-auto"
              disabled={create.isPending || !name.trim()}
            >
              {create.isPending ? 'Création…' : 'Créer le projet'}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </form>
  );
}
