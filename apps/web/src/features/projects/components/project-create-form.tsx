'use client';

import {
  useMemo,
  useState,
  type ComponentType,
  type FormEvent,
  type ReactNode,
} from 'react';
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { useProjectAssignableUsers } from '../hooks/use-project-assignable-users';
import type { ProjectAssignableUser } from '../types/project.types';
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
  Layers,
  SlidersHorizontal,
  UserCog,
  Users,
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

function formatAssignableUserLabel(m: ProjectAssignableUser): string {
  const n = [m.firstName, m.lastName].filter(Boolean).join(' ').trim();
  return n || m.email;
}

/** Même distinction que la matrice équipe : comptes plateforme vs nom libre (fiche → Équipe). */
type OwnerAssignMode = 'user' | 'free';

function groupAssignableMembers(members: ProjectAssignableUser[]) {
  const sorted = [...members].sort((a, b) =>
    formatAssignableUserLabel(a).localeCompare(formatAssignableUserLabel(b), 'fr'),
  );
  return {
    clientUsers: sorted.filter((m) => m.role === 'CLIENT_USER'),
    clientAdmins: sorted.filter((m) => m.role === 'CLIENT_ADMIN'),
    other: sorted.filter(
      (m) => m.role !== 'CLIENT_USER' && m.role !== 'CLIENT_ADMIN',
    ),
  };
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
  const [ownerUserId, setOwnerUserId] = useState('');
  const [ownerMode, setOwnerMode] = useState<OwnerAssignMode>('user');
  const [ownerDialogOpen, setOwnerDialogOpen] = useState(false);
  const [ownerFreeLabel, setOwnerFreeLabel] = useState('');
  const [ownerAffiliation, setOwnerAffiliation] = useState<'INTERNAL' | 'EXTERNAL'>('INTERNAL');
  /** Sélection catalogue équipe (`identityKey`) ou saisie libre (`custom`). */
  const [freePick, setFreePick] = useState<string>('');

  const {
    data: assignablePayload,
    isLoading: membersLoading,
    isError: membersError,
  } = useProjectAssignableUsers();

  const members = assignablePayload?.users ?? [];
  const freePersons = assignablePayload?.freePersons ?? [];

  const groupedMembers = useMemo(() => groupAssignableMembers(members), [members]);

  const ownerTriggerLabel = useMemo(() => {
    if (ownerMode === 'free') {
      const t = ownerFreeLabel.trim();
      return t || null;
    }
    if (!ownerUserId) return null;
    const m = members.find((x) => x.id === ownerUserId);
    return m ? formatAssignableUserLabel(m) : ownerUserId;
  }, [ownerMode, ownerUserId, members, ownerFreeLabel]);

  const ownerSummaryLine = useMemo(() => {
    if (ownerMode === 'free') {
      const t = ownerFreeLabel.trim();
      if (!t) {
        return 'Personne nom libre — choisissez ou saisissez dans la modale.';
      }
      const aff = ownerAffiliation === 'EXTERNAL' ? 'Externe' : 'Interne';
      return `${t} · ${aff} (nom libre)`;
    }
    if (membersLoading) return 'Chargement des membres…';
    if (membersError) return 'Liste indisponible — vous pourrez définir le responsable plus tard.';
    if (ownerUserId) {
      const m = members.find((x) => x.id === ownerUserId);
      return m
        ? `${formatAssignableUserLabel(m)} · ${m.email}`
        : ownerUserId;
    }
    return 'Aucun responsable désigné.';
  }, [
    membersLoading,
    membersError,
    ownerUserId,
    ownerMode,
    members,
    ownerFreeLabel,
    ownerAffiliation,
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
    if (ownerMode === 'user' && ownerUserId) {
      body.ownerUserId = ownerUserId;
    }
    if (ownerMode === 'free') {
      const t = ownerFreeLabel.trim();
      if (t) {
        body.ownerFreeLabel = t;
        body.ownerAffiliation = ownerAffiliation;
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
                  {ownerUserId || (ownerMode === 'free' && ownerFreeLabel.trim())
                    ? 'Modifier'
                    : 'Définir'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Pilotage du projet ou de l’activité : compte client, ou personne nom libre issue du
                répertoire équipe (projets du client).
              </p>
              {membersError ? (
                <p className="text-xs text-destructive">
                  Impossible de charger les membres du client — création sans responsable, ou
                  réessayez plus tard.
                </p>
              ) : null}

              <Dialog open={ownerDialogOpen} onOpenChange={setOwnerDialogOpen}>
                <DialogContent
                  className="max-h-[min(85vh,640px)] w-full max-w-lg overflow-y-auto sm:max-w-lg"
                  showCloseButton
                >
                  <DialogHeader className="space-y-2 text-left">
                    <DialogTitle className="text-lg font-semibold tracking-tight">
                      Responsable de projets
                    </DialogTitle>
                    <DialogDescription className="text-sm leading-relaxed">
                      Choisissez un membre du client avec compte, ou indiquez que vous compléterez
                      depuis la fiche projet (équipe, nom libre interne / externe).
                    </DialogDescription>
                  </DialogHeader>

                  <Tabs
                    orientation="horizontal"
                    value={ownerMode}
                    onValueChange={(v) => {
                      const next = v as OwnerAssignMode;
                      setOwnerMode(next);
                      if (next === 'free') setOwnerUserId('');
                      if (next === 'user') {
                        setOwnerFreeLabel('');
                        setOwnerAffiliation('INTERNAL');
                        setFreePick('');
                      }
                    }}
                    className="w-full items-start gap-0"
                  >
                    <TabsList
                      variant="line"
                      className="mb-3 inline-flex h-9 w-full shrink-0 flex-row items-center justify-start gap-6 rounded-none border-0 border-b border-border/70 bg-transparent p-0"
                    >
                      <TabsTrigger
                        value="user"
                        className="!h-9 min-h-9 max-h-9 flex-none px-0.5 py-0 text-sm"
                      >
                        Compte client
                      </TabsTrigger>
                      <TabsTrigger
                        value="free"
                        className="!h-9 min-h-9 max-h-9 flex-none px-0.5 py-0 text-sm"
                      >
                        Nom libre
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="user" className="mt-0 space-y-3">
                      {membersError ? (
                        <Alert variant="destructive" className="border-destructive/35">
                          <AlertCircle className="size-4" aria-hidden />
                          <AlertTitle>Membres indisponibles</AlertTitle>
                          <AlertDescription>
                            Impossible de charger la liste. Vous pouvez fermer et créer le projet
                            sans responsable, puis l’assigner plus tard.
                          </AlertDescription>
                        </Alert>
                      ) : null}

                      <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
                        <Label htmlFor="p-owner" className="text-sm font-medium">
                          Membre du client
                        </Label>
                        <Select
                          value={ownerUserId || '__none__'}
                          onValueChange={(v) =>
                            setOwnerUserId(v == null || v === '__none__' ? '' : v)
                          }
                          disabled={membersLoading || membersError}
                        >
                          <SelectTrigger
                            id="p-owner"
                            size="sm"
                            className="mt-2 w-full"
                            aria-describedby="p-owner-hint"
                          >
                            <SelectValue placeholder="Choisir un responsable…">
                              {membersLoading
                                ? 'Chargement des membres…'
                                : ownerTriggerLabel ?? 'Aucun'}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Aucun</SelectItem>
                            {groupedMembers.clientUsers.length > 0 && (
                              <SelectGroup>
                                <SelectLabel>Utilisateurs client</SelectLabel>
                                {groupedMembers.clientUsers.map((m) => (
                                  <SelectItem key={m.id} value={m.id}>
                                    {`${formatAssignableUserLabel(m)} · ${m.email}`}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            )}
                            {groupedMembers.clientAdmins.length > 0 && (
                              <SelectGroup>
                                <SelectLabel>Administrateurs client</SelectLabel>
                                {groupedMembers.clientAdmins.map((m) => (
                                  <SelectItem key={m.id} value={m.id}>
                                    {`${formatAssignableUserLabel(m)} · ${m.email}`}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            )}
                            {groupedMembers.other.length > 0 && (
                              <SelectGroup>
                                <SelectLabel>Autres rattachements</SelectLabel>
                                {groupedMembers.other.map((m) => (
                                  <SelectItem key={m.id} value={m.id}>
                                    {`${formatAssignableUserLabel(m)} · ${m.email}`}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            )}
                          </SelectContent>
                        </Select>
                        <p id="p-owner-hint" className="mt-2 text-xs text-muted-foreground">
                          Liste identique à la fiche projet → Équipe (comptes actifs du client).
                        </p>
                      </div>
                    </TabsContent>

                    <TabsContent value="free" className="mt-0 w-full min-w-0 space-y-3">
                      {membersLoading ? (
                        <p className="text-xs text-muted-foreground">Chargement du répertoire…</p>
                      ) : null}

                      {freePersons.length > 0 ? (
                        <div className={cn(field, 'w-full')}>
                          <Label htmlFor="p-owner-free-pick">Personne (répertoire équipe)</Label>
                          <Select
                            value={freePick || undefined}
                            onValueChange={(v) => {
                              const next = v ?? '';
                              setFreePick(next);
                              if (next === 'custom') {
                                setOwnerFreeLabel('');
                                setOwnerAffiliation('INTERNAL');
                                return;
                              }
                              const p = freePersons.find((x) => x.identityKey === next);
                              if (p) {
                                setOwnerFreeLabel(p.label);
                                setOwnerAffiliation(p.affiliation);
                              }
                            }}
                          >
                            <SelectTrigger id="p-owner-free-pick" size="sm" className="w-full">
                              <SelectValue placeholder="Choisir une personne connue, ou saisie libre…" />
                            </SelectTrigger>
                            <SelectContent>
                              {freePersons.map((p) => (
                                <SelectItem key={p.identityKey} value={p.identityKey}>
                                  {p.label} · {p.affiliation === 'INTERNAL' ? 'Interne' : 'Externe'}
                                </SelectItem>
                              ))}
                              <SelectItem value="custom">Autre personne (saisie libre)</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            Liste déduite des noms libres déjà utilisés en équipe projet sur ce
                            client.
                          </p>
                        </div>
                      ) : null}

                      {(freePick === 'custom' || freePersons.length === 0) && !membersLoading ? (
                        <div className="w-full min-w-0 rounded-xl border border-border/70 border-l-[3px] border-l-sky-500/55 bg-white p-4 shadow-sm dark:bg-card">
                          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-start">
                            <div
                              className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-sky-500/10 text-sky-800 dark:text-sky-300 sm:mt-0.5"
                              aria-hidden
                            >
                              <Users className="size-5" />
                            </div>
                            <div className="min-w-0 w-full flex-1 space-y-3 sm:min-w-0">
                              <p className="text-sm font-medium text-foreground">
                                {freePersons.length === 0
                                  ? 'Saisie libre'
                                  : 'Nouvelle personne (hors liste)'}
                              </p>
                              <div className={field}>
                                <Label htmlFor="p-owner-free-name">Nom affiché</Label>
                                <Input
                                  id="p-owner-free-name"
                                  value={ownerFreeLabel}
                                  onChange={(e) => setOwnerFreeLabel(e.target.value)}
                                  autoComplete="off"
                                  maxLength={200}
                                  placeholder="Ex. Marie Durand (prestataire)"
                                  className="w-full"
                                />
                              </div>
                              <div className={field}>
                                <Label htmlFor="p-owner-free-aff">Portée</Label>
                                <Select
                                  value={ownerAffiliation}
                                  onValueChange={(v) =>
                                    setOwnerAffiliation((v as 'INTERNAL' | 'EXTERNAL') ?? 'INTERNAL')
                                  }
                                >
                                  <SelectTrigger id="p-owner-free-aff" size="sm" className="w-full">
                                    <SelectValue>
                                      {ownerAffiliation === 'EXTERNAL' ? 'Externe' : 'Interne'}
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="INTERNAL">Interne</SelectItem>
                                    <SelectItem value="EXTERNAL">Externe</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </TabsContent>
                  </Tabs>

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
