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
import { formatResourceDisplayName } from '@/lib/resource-labels';
import type { ResourceListItem } from '@/services/resources';
import { PersonCatalogPickerDialog } from './person-catalog-picker-dialog';
import {
  CalendarRange,
  FolderKanban,
  Layers,
  SlidersHorizontal,
  UserCog,
} from 'lucide-react';
import { useActiveClient } from '@/hooks/use-active-client';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { listProjectPortfolioCategories, listProjectTags } from '../api/projects.api';
import { projectQueryKeys } from '../lib/project-query-keys';
import { RegistryBadge } from '@/lib/ui/registry-badge';
import { projectTagBadgeStyle } from '../lib/project-tag-badge-style';

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
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
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
  const [ownerDialogOpen, setOwnerDialogOpen] = useState(false);
  const [ownerResourceId, setOwnerResourceId] = useState('');
  /** Détails pour libellé / soumission (liste ou ressource tout juste créée). */
  const [ownerResourceDetails, setOwnerResourceDetails] = useState<ResourceListItem | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [tagPickerOpen, setTagPickerOpen] = useState(false);
  const [tagToAdd, setTagToAdd] = useState('');
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
  const selectableSubCategories = useMemo(
    () =>
      (categoriesQuery.data ?? [])
        .filter((root) => root.isActive)
        .flatMap((root) =>
          (root.children ?? [])
            .filter((child) => child.isActive)
            .map((child) => ({
              id: child.id,
              name: child.name,
              rootName: root.name,
            })),
        ),
    [categoriesQuery.data],
  );

  const tagsOptionsQuery = useQuery({
    queryKey: projectQueryKeys.optionsTags(clientId),
    queryFn: () => listProjectTags(authFetch),
    enabled: Boolean(clientId),
  });
  const tagCatalog = useMemo(
    () => tagsOptionsQuery.data ?? [],
    [tagsOptionsQuery.data],
  );
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
    if (portfolioCategoryId) body.portfolioCategoryId = portfolioCategoryId;
    if (ownerResourceId && ownerResourceDetails?.id === ownerResourceId) {
      const r = ownerResourceDetails;
      body.ownerFreeLabel = formatResourceDisplayName(r).slice(0, 200);
      body.ownerAffiliation = r.affiliation === 'EXTERNAL' ? 'EXTERNAL' : 'INTERNAL';
    }

    create.mutate({
      body,
      tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
    });
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
                Ressource <strong>Humaine</strong> du catalogue (sélection ou création) — alignée
                avec la fiche ressource et l’équipe projet.
              </p>

              <PersonCatalogPickerDialog
                open={ownerDialogOpen}
                onOpenChange={setOwnerDialogOpen}
                queryKey={['resources', 'human', 'project-owner']}
                title="Responsable de projets"
                description={
                  <>
                    Choisis une ressource <strong>Humaine</strong> du catalogue ou crée-en une. Le
                    responsable est enregistré comme nom libre aligné sur la ressource (équipe
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
              <div className={cn(field, 'sm:col-span-2')}>
                <Label htmlFor="p-portfolio-category">Sous-categorie portefeuille</Label>
                <Select
                  value={portfolioCategoryId || '__none__'}
                  onValueChange={(v) => setPortfolioCategoryId(v && v !== '__none__' ? v : '')}
                >
                  <SelectTrigger id="p-portfolio-category" size="sm" className="w-full">
                    <SelectValue placeholder="Selectionner une sous-categorie active" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Aucune</SelectItem>
                    {selectableSubCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.rootName} / {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Seules les sous-categories actives (niveau 2) sont disponibles.
                </p>
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
                  <span className="text-xs text-muted-foreground">Aucune étiquette sélectionnée.</span>
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
