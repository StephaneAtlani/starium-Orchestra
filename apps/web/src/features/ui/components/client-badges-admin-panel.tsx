'use client';

import { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Globe2, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/context/auth-context';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import {
  BADGE_PALETTE_GROUPS,
  BADGE_SURFACE_LABELS,
  BADGE_SURFACES,
  BADGE_TEXT_PRESET_LABELS,
  BADGE_TEXT_PRESETS,
  badgeClassForStyle,
  type BadgePalette,
  type BadgeSurface,
  type BadgeTextPreset,
  mergeUiBadgeConfig,
  parseUiBadgeConfig,
  PROJECT_TASK_PRIORITIES,
  PROJECT_TASK_STATUSES,
  type UiBadgeConfig,
} from '@/lib/ui/badge-registry';
import { projectQueryKeys } from '@/features/projects/lib/project-query-keys';

function PaletteSelectItems() {
  return (
    <>
      {BADGE_PALETTE_GROUPS.map((g) => (
        <SelectGroup key={g.label}>
          <SelectLabel>{g.label}</SelectLabel>
          {g.palettes.map((p) => (
            <SelectItem key={p} value={p}>
              {p}
            </SelectItem>
          ))}
        </SelectGroup>
      ))}
    </>
  );
}

function SurfaceSelectItems() {
  return (
    <>
      {BADGE_SURFACES.map((s) => (
        <SelectItem key={s} value={s}>
          {BADGE_SURFACE_LABELS[s]}
        </SelectItem>
      ))}
    </>
  );
}

function TextPresetSelectItems() {
  return (
    <>
      {BADGE_TEXT_PRESETS.map((t) => (
        <SelectItem key={t} value={t}>
          {BADGE_TEXT_PRESET_LABELS[t]}
        </SelectItem>
      ))}
    </>
  );
}

type Row = {
  label: string;
  palette: BadgePalette;
  surface: BadgeSurface;
  textColor: BadgeTextPreset;
};

type CustomRow = { key: string; label: string } & Row;

function buildPayload(
  status: Record<string, Row>,
  priority: Record<string, Row>,
  custom: CustomRow[],
): UiBadgeConfig {
  return {
    projectTaskStatus: Object.fromEntries(
      PROJECT_TASK_STATUSES.map((k) => [
        k,
        {
          label: status[k].label,
          palette: status[k].palette,
          surface: status[k].surface,
          textColor: status[k].textColor,
        },
      ]),
    ) as UiBadgeConfig['projectTaskStatus'],
    projectTaskPriority: Object.fromEntries(
      PROJECT_TASK_PRIORITIES.map((k) => [
        k,
        {
          label: priority[k].label,
          palette: priority[k].palette,
          surface: priority[k].surface,
          textColor: priority[k].textColor,
        },
      ]),
    ) as UiBadgeConfig['projectTaskPriority'],
    custom: custom.map((c) => ({
      key: c.key,
      label: c.label,
      palette: c.palette,
      surface: c.surface,
      textColor: c.textColor,
    })),
  };
}

export type BadgesAdminPanelProps = {
  /** `client` = surcharges par organisation ; `platform` = défauts globaux (admin plateforme). */
  scope: 'client' | 'platform';
};

export function BadgesAdminPanel({ scope }: BadgesAdminPanelProps) {
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();
  const { activeClient } = useActiveClient();
  const { user } = useAuth();
  const clientId = activeClient?.id ?? '';

  const isClientAdmin = activeClient?.role === 'CLIENT_ADMIN';
  const isPlatformAdmin = user?.platformRole === 'PLATFORM_ADMIN';
  const canEdit =
    scope === 'client' ? isClientAdmin : isPlatformAdmin;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<Record<string, Row> | null>(null);
  const [priority, setPriority] = useState<Record<string, Row> | null>(null);
  const [custom, setCustom] = useState<CustomRow[]>([]);
  const [newKey, setNewKey] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newPalette, setNewPalette] = useState<BadgePalette>('neutral');
  const [newSurface, setNewSurface] = useState<BadgeSurface>('pastel');
  const [newTextColor, setNewTextColor] = useState<BadgeTextPreset>('auto');

  const idPrefix = scope === 'platform' ? 'badge-plat' : 'badge-client';

  const hydrateFromLayers = useCallback(
    (platform: UiBadgeConfig | null, client: UiBadgeConfig | null) => {
      const m = mergeUiBadgeConfig(platform, client);
      const st: Record<string, Row> = {};
      for (const k of PROJECT_TASK_STATUSES) {
        const e = m.projectTaskStatus[k];
        st[k] = {
          label: e.label,
          palette: e.palette,
          surface: e.surface,
          textColor: e.textColor,
        };
      }
      const pr: Record<string, Row> = {};
      for (const k of PROJECT_TASK_PRIORITIES) {
        const e = m.projectTaskPriority[k];
        pr[k] = {
          label: e.label,
          palette: e.palette,
          surface: e.surface,
          textColor: e.textColor,
        };
      }
      setStatus(st);
      setPriority(pr);
      setCustom(
        m.custom.map((c) => ({
          key: c.key,
          label: c.label,
          palette: c.palette,
          surface: c.surface,
          textColor: c.textColor,
        })),
      );
    },
    [],
  );

  useEffect(() => {
    if (scope === 'client' && !clientId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        if (scope === 'platform') {
          const res = await authFetch('/api/platform/ui-badge-defaults');
          if (!res.ok) throw new Error(String(res.status));
          const json = (await res.json()) as { config: unknown };
          if (cancelled) return;
          hydrateFromLayers(parseUiBadgeConfig(json.config), null);
        } else {
          const res = await authFetch('/api/clients/active/ui-badges');
          if (!res.ok) throw new Error(String(res.status));
          const json = (await res.json()) as {
            clientConfig: unknown;
            platformDefaults: unknown;
          };
          if (cancelled) return;
          hydrateFromLayers(
            parseUiBadgeConfig(json.platformDefaults),
            parseUiBadgeConfig(json.clientConfig),
          );
        }
      } catch {
        if (!cancelled) toast.error('Impossible de charger les badges');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authFetch, clientId, hydrateFromLayers, scope]);

  const resetDefaultsPreviewCode = () => {
    if (scope !== 'platform') return;
    hydrateFromLayers(null, null);
    toast.message(
      'Aperçu des défauts du code Starium uniquement — enregistrez pour les appliquer à la plateforme.',
    );
  };

  /** CLIENT_ADMIN : supprime les surcharges en base et recharge (badges = globaux plateforme + code). */
  const restoreGlobalBadges = async () => {
    if (scope !== 'client' || !canEdit || !clientId) return;
    setSaving(true);
    try {
      const res = await authFetch('/api/clients/active/ui-badges', {
        method: 'DELETE',
      });
      if (res.status === 403) {
        toast.error('Réservé aux administrateurs client');
        return;
      }
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || res.statusText);
      }
      const json = (await res.json()) as {
        clientConfig: unknown;
        platformDefaults: unknown;
      };
      hydrateFromLayers(
        parseUiBadgeConfig(json.platformDefaults),
        parseUiBadgeConfig(json.clientConfig),
      );
      await queryClient.invalidateQueries({
        queryKey: projectQueryKeys.clientUiBadges(clientId),
      });
      toast.success('Badges réalignés sur les défauts globaux (plateforme)');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const save = async () => {
    if (!status || !priority || !canEdit) return;
    setSaving(true);
    try {
      const body = buildPayload(status, priority, custom);
      if (scope === 'platform') {
        const res = await authFetch('/api/platform/ui-badge-defaults', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (res.status === 403) {
          toast.error('Réservé aux administrateurs plateforme');
          return;
        }
        if (!res.ok) {
          const t = await res.text();
          throw new Error(t || res.statusText);
        }
        await queryClient.invalidateQueries({ queryKey: projectQueryKeys.all });
        toast.success('Défauts plateforme enregistrés');
      } else {
        const res = await authFetch('/api/clients/active/ui-badges', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (res.status === 403) {
          toast.error('Réservé aux administrateurs client');
          return;
        }
        if (!res.ok) {
          const t = await res.text();
          throw new Error(t || res.statusText);
        }
        await queryClient.invalidateQueries({
          queryKey: projectQueryKeys.clientUiBadges(clientId),
        });
        toast.success('Badges enregistrés pour ce client');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const addCustom = () => {
    const key = newKey.trim().toLowerCase();
    if (!/^[a-z][a-z0-9_-]{0,63}$/.test(key)) {
      toast.error('Clé : minuscules, chiffres, tirets (1–64 car.)');
      return;
    }
    if (custom.some((c) => c.key === key)) {
      toast.error('Cette clé existe déjà');
      return;
    }
    const label = newLabel.trim();
    if (!label) {
      toast.error('Libellé requis');
      return;
    }
    setCustom((prev) => [
      ...prev,
      {
        key,
        label,
        palette: newPalette,
        surface: newSurface,
        textColor: newTextColor,
      },
    ]);
    setNewKey('');
    setNewLabel('');
    setNewPalette('neutral');
    setNewSurface('pastel');
    setNewTextColor('auto');
  };

  const waitClient = scope === 'client' && !clientId;
  if (waitClient || loading || !status || !priority) {
    return (
      <p className="text-sm text-muted-foreground">
        {waitClient ? 'Sélectionnez un client.' : 'Chargement…'}
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {scope === 'platform' && (
        <p className="text-sm text-muted-foreground max-w-3xl">
          <strong>Administrateur plateforme</strong> : définit les badges pour tous les clients (couche
          entre le code Starium et les éventuelles surcharges par organisation).
        </p>
      )}
      {scope === 'client' && (
        <p className="text-sm text-muted-foreground max-w-3xl">
          <strong>Administrateur client</strong> : vous pouvez modifier libellés et couleurs pour cette
          organisation uniquement. <strong>Restaurer les badges globaux</strong> supprime vos
          surcharges et réapplique la configuration définie en administration plateforme (puis le
          code Starium si la plateforme n’a rien fixé).
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {scope === 'platform' && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={resetDefaultsPreviewCode}
          >
            <RotateCcw className="mr-1 size-4" />
            Aperçu défauts code (avant enregistrement)
          </Button>
        )}
        {scope === 'client' && canEdit && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void restoreGlobalBadges()}
            disabled={saving}
          >
            <Globe2 className="mr-1 size-4" />
            Restaurer les badges globaux
          </Button>
        )}
        {canEdit ? (
          <Button type="button" size="sm" onClick={() => void save()} disabled={saving}>
            {saving
              ? 'Enregistrement…'
              : scope === 'platform'
                ? 'Enregistrer (tous les clients)'
                : 'Enregistrer pour ce client'}
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">
            {scope === 'platform'
              ? 'Lecture seule — connectez-vous en administrateur plateforme pour modifier.'
              : 'Lecture seule — connectez-vous en administrateur client pour modifier.'}
          </p>
        )}
      </div>

      <p className="text-xs text-muted-foreground max-w-3xl">
        <span className="font-medium text-foreground">Ordre des choix :</span> 1) ton de surface
        (Pastel, Foncé ou Vif) → 2) palette de couleur → 3) couleur du texte.
      </p>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Statuts de tâche (projets / plans d’action)</h3>
        <div className="rounded-xl border border-border/70 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-28 text-xs uppercase">Code</TableHead>
                <TableHead className="min-w-[8rem] text-xs uppercase">Libellé</TableHead>
                <TableHead className="w-44 text-xs uppercase">1. Ton de surface</TableHead>
                <TableHead className="w-36 text-xs uppercase">2. Palette</TableHead>
                <TableHead className="w-48 text-xs uppercase">3. Couleur du texte</TableHead>
                <TableHead className="w-36 text-xs uppercase">Aperçu</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {PROJECT_TASK_STATUSES.map((k) => (
                <TableRow key={k}>
                  <TableCell className="font-mono text-xs">{k}</TableCell>
                  <TableCell>
                    <Input
                      value={status[k].label}
                      onChange={(e) =>
                        setStatus((s) =>
                          s ? { ...s, [k]: { ...s[k], label: e.target.value } } : s,
                        )
                      }
                      disabled={!canEdit}
                      className="h-8 text-sm"
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={status[k].surface}
                      onValueChange={(v) =>
                        setStatus((s) =>
                          s
                            ? {
                                ...s,
                                [k]: { ...s[k], surface: v as BadgeSurface },
                              }
                            : s,
                        )
                      }
                      disabled={!canEdit}
                    >
                      <SelectTrigger size="sm" className="h-8 min-w-[9rem]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SurfaceSelectItems />
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={status[k].palette}
                      onValueChange={(v) =>
                        setStatus((s) =>
                          s
                            ? {
                                ...s,
                                [k]: { ...s[k], palette: v as BadgePalette },
                              }
                            : s,
                        )
                      }
                      disabled={!canEdit}
                    >
                      <SelectTrigger size="sm" className="h-8 min-w-[7rem]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <PaletteSelectItems />
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={status[k].textColor}
                      onValueChange={(v) =>
                        setStatus((s) =>
                          s
                            ? {
                                ...s,
                                [k]: {
                                  ...s[k],
                                  textColor: v as BadgeTextPreset,
                                },
                              }
                            : s,
                        )
                      }
                      disabled={!canEdit}
                    >
                      <SelectTrigger size="sm" className="h-8 min-w-[10rem]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <TextPresetSelectItems />
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={badgeClassForStyle({
                        palette: status[k].palette,
                        surface: status[k].surface,
                        textColor: status[k].textColor,
                      })}
                    >
                      {status[k].label}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Priorités de tâche</h3>
        <div className="rounded-xl border border-border/70 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-28 text-xs uppercase">Code</TableHead>
                <TableHead className="min-w-[8rem] text-xs uppercase">Libellé</TableHead>
                <TableHead className="w-44 text-xs uppercase">1. Ton de surface</TableHead>
                <TableHead className="w-36 text-xs uppercase">2. Palette</TableHead>
                <TableHead className="w-48 text-xs uppercase">3. Couleur du texte</TableHead>
                <TableHead className="w-36 text-xs uppercase">Aperçu</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {PROJECT_TASK_PRIORITIES.map((k) => (
                <TableRow key={k}>
                  <TableCell className="font-mono text-xs">{k}</TableCell>
                  <TableCell>
                    <Input
                      value={priority[k].label}
                      onChange={(e) =>
                        setPriority((s) =>
                          s ? { ...s, [k]: { ...s[k], label: e.target.value } } : s,
                        )
                      }
                      disabled={!canEdit}
                      className="h-8 text-sm"
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={priority[k].surface}
                      onValueChange={(v) =>
                        setPriority((s) =>
                          s
                            ? {
                                ...s,
                                [k]: { ...s[k], surface: v as BadgeSurface },
                              }
                            : s,
                        )
                      }
                      disabled={!canEdit}
                    >
                      <SelectTrigger size="sm" className="h-8 min-w-[9rem]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SurfaceSelectItems />
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={priority[k].palette}
                      onValueChange={(v) =>
                        setPriority((s) =>
                          s
                            ? {
                                ...s,
                                [k]: { ...s[k], palette: v as BadgePalette },
                              }
                            : s,
                        )
                      }
                      disabled={!canEdit}
                    >
                      <SelectTrigger size="sm" className="h-8 min-w-[7rem]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <PaletteSelectItems />
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={priority[k].textColor}
                      onValueChange={(v) =>
                        setPriority((s) =>
                          s
                            ? {
                                ...s,
                                [k]: {
                                  ...s[k],
                                  textColor: v as BadgeTextPreset,
                                },
                              }
                            : s,
                        )
                      }
                      disabled={!canEdit}
                    >
                      <SelectTrigger size="sm" className="h-8 min-w-[10rem]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <TextPresetSelectItems />
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={badgeClassForStyle({
                        palette: priority[k].palette,
                        surface: priority[k].surface,
                        textColor: priority[k].textColor,
                      })}
                    >
                      {priority[k].label}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Badges libres (bibliothèque)</h3>
        <p className="text-xs text-muted-foreground max-w-2xl">
          Entrées réutilisables (clé stable). Fusion plateforme + client : en cas de même clé, le
          client prévaut. Même ordre : ton de surface → palette → texte.
        </p>
        {custom.length > 0 && (
          <div className="rounded-xl border border-border/70 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-xs uppercase">Clé</TableHead>
                  <TableHead className="text-xs uppercase">Libellé</TableHead>
                  <TableHead className="w-44 text-xs uppercase">1. Ton de surface</TableHead>
                  <TableHead className="w-36 text-xs uppercase">2. Palette</TableHead>
                  <TableHead className="w-48 text-xs uppercase">3. Couleur du texte</TableHead>
                  <TableHead className="w-24 text-xs uppercase" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {custom.map((row, idx) => (
                  <TableRow key={row.key}>
                    <TableCell className="font-mono text-xs">{row.key}</TableCell>
                    <TableCell>
                      <Input
                        value={row.label}
                        onChange={(e) =>
                          setCustom((prev) =>
                            prev.map((r, i) =>
                              i === idx ? { ...r, label: e.target.value } : r,
                            ),
                          )
                        }
                        disabled={!canEdit}
                        className="h-8 text-sm"
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={row.surface}
                        onValueChange={(v) =>
                          setCustom((prev) =>
                            prev.map((r, i) =>
                              i === idx
                                ? { ...r, surface: v as BadgeSurface }
                                : r,
                            ),
                          )
                        }
                        disabled={!canEdit}
                      >
                        <SelectTrigger size="sm" className="h-8 min-w-[9rem]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SurfaceSelectItems />
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={row.palette}
                        onValueChange={(v) =>
                          setCustom((prev) =>
                            prev.map((r, i) =>
                              i === idx
                                ? { ...r, palette: v as BadgePalette }
                                : r,
                            ),
                          )
                        }
                        disabled={!canEdit}
                      >
                        <SelectTrigger size="sm" className="h-8 min-w-[7rem]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <PaletteSelectItems />
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={row.textColor}
                        onValueChange={(v) =>
                          setCustom((prev) =>
                            prev.map((r, i) =>
                              i === idx
                                ? { ...r, textColor: v as BadgeTextPreset }
                                : r,
                            ),
                          )
                        }
                        disabled={!canEdit}
                      >
                        <SelectTrigger size="sm" className="h-8 min-w-[10rem]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <TextPresetSelectItems />
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {canEdit && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label="Supprimer"
                          onClick={() =>
                            setCustom((prev) => prev.filter((_, i) => i !== idx))
                          }
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {canEdit && (
          <div className="flex flex-wrap items-end gap-3 rounded-xl border border-dashed border-border/80 p-4">
            <div className="grid gap-1.5">
              <Label htmlFor={`${idPrefix}-new-key`} className="text-xs">
                Nouvelle clé
              </Label>
              <Input
                id={`${idPrefix}-new-key`}
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="ex. urgent_review"
                className="h-8 w-48 font-mono text-xs"
              />
            </div>
            <div className="grid gap-1.5 min-w-[12rem] flex-1">
              <Label htmlFor={`${idPrefix}-new-label`} className="text-xs">
                Libellé
              </Label>
              <Input
                id={`${idPrefix}-new-label`}
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Libellé affiché"
                className="h-8"
              />
            </div>
            <div className="grid gap-1.5">
              <span className="text-xs text-muted-foreground">1. Ton de surface</span>
              <Select
                value={newSurface}
                onValueChange={(v) => setNewSurface(v as BadgeSurface)}
              >
                <SelectTrigger size="sm" className="h-8 w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SurfaceSelectItems />
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <span className="text-xs text-muted-foreground">2. Palette</span>
              <Select
                value={newPalette}
                onValueChange={(v) => setNewPalette(v as BadgePalette)}
              >
                <SelectTrigger size="sm" className="h-8 w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <PaletteSelectItems />
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <span className="text-xs text-muted-foreground">3. Couleur du texte</span>
              <Select
                value={newTextColor}
                onValueChange={(v) => setNewTextColor(v as BadgeTextPreset)}
              >
                <SelectTrigger size="sm" className="h-8 w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <TextPresetSelectItems />
                </SelectContent>
              </Select>
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={addCustom}>
              <Plus className="mr-1 size-4" />
              Ajouter
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}

/** Administration client — surcharges par organisation. */
export function ClientBadgesAdminPanel() {
  return <BadgesAdminPanel scope="client" />;
}

/** Administration plateforme — défauts globaux. */
export function PlatformBadgesAdminPanel() {
  return <BadgesAdminPanel scope="platform" />;
}
