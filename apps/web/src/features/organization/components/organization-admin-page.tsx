'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { usePermissions } from '@/hooks/use-permissions';
import { toast } from '@/lib/toast';
import {
  deleteMember,
  fetchGroupMembers,
  fetchHumanResources,
  fetchOrgGroups,
  fetchOrganizationAudit,
  fetchOrgUnitsTree,
  fetchUnitMembers,
  postJson,
  type OrgGroupRow,
  type OrgMembershipRow,
  type OrgUnitTreeNode,
  type AuditLogRow,
} from '../api/organization-api';
import { resourcePickerLabel } from '../lib/resource-label';
import { OrganizationOwnershipPolicyCard } from './organization-ownership-policy-card';
import { OwnershipTransferWizard } from './ownership-transfer-wizard';

function flattenOrgUnits(nodes: OrgUnitTreeNode[], depth = 0): { id: string; label: string; status: string }[] {
  const out: { id: string; label: string; status: string }[] = [];
  for (const n of nodes) {
    const pad = '\u00a0\u00a0'.repeat(depth);
    const code = n.code ? ` (${n.code})` : '';
    const arch = n.status === 'ARCHIVED' ? ' [archivé]' : '';
    out.push({ id: n.id, label: `${pad}${n.name}${code}${arch}`, status: n.status });
    if (n.children?.length) out.push(...flattenOrgUnits(n.children, depth + 1));
  }
  return out;
}

function OrgUnitTreeRows({
  nodes,
  depth,
  canUpdate,
  onArchive,
}: {
  nodes: OrgUnitTreeNode[];
  depth: number;
  canUpdate: boolean;
  onArchive: (id: string) => void;
}) {
  return (
    <>
      {nodes.map((n) => (
        <React.Fragment key={n.id}>
          <TableRow>
            <TableCell style={{ paddingLeft: 8 + depth * 16 }}>
              <span className="font-medium">{n.name}</span>
              {n.code ? <span className="text-muted-foreground text-sm ml-2">{n.code}</span> : null}
            </TableCell>
            <TableCell className="text-muted-foreground text-sm">{n.type}</TableCell>
            <TableCell className="text-sm">{n.status}</TableCell>
            <TableCell>
              {canUpdate && n.status === 'ACTIVE' ? (
                <Button type="button" variant="outline" size="sm" onClick={() => onArchive(n.id)}>
                  Archiver
                </Button>
              ) : null}
            </TableCell>
          </TableRow>
          {n.children?.length ? (
            <OrgUnitTreeRows nodes={n.children} depth={depth + 1} canUpdate={canUpdate} onArchive={onArchive} />
          ) : null}
        </React.Fragment>
      ))}
    </>
  );
}

export function OrganizationAdminPage() {
  const authFetch = useAuthenticatedFetch();
  const { has, isLoading: permsLoading } = usePermissions();
  const qc = useQueryClient();

  const canRead = has('organization.read');
  const canUpdate = has('organization.update');
  const canMembers = has('organization.members.update');
  const canAudit = has('audit_logs.read');
  const canTransfer = has('organization.ownership.transfer');
  const [transferOpen, setTransferOpen] = useState(false);

  const unitsQ = useQuery({
    queryKey: ['organization-units-tree'],
    queryFn: () => fetchOrgUnitsTree(authFetch),
    enabled: canRead && !permsLoading,
  });

  const groupsQ = useQuery({
    queryKey: ['organization-groups'],
    queryFn: () => fetchOrgGroups(authFetch),
    enabled: canRead && !permsLoading,
  });

  const flatUnits = useMemo(() => flattenOrgUnits(unitsQ.data ?? []), [unitsQ.data]);

  const [unitForMembers, setUnitForMembers] = useState<string>('');
  const membersQ = useQuery({
    queryKey: ['organization-unit-members', unitForMembers],
    queryFn: () => fetchUnitMembers(authFetch, unitForMembers),
    enabled: canRead && !!unitForMembers,
  });

  const [groupForMembers, setGroupForMembers] = useState<string>('');
  const groupMembersQ = useQuery({
    queryKey: ['organization-group-members', groupForMembers],
    queryFn: () => fetchGroupMembers(authFetch, groupForMembers),
    enabled: canRead && !!groupForMembers,
  });

  const resourcesQ = useQuery({
    queryKey: ['organization-human-resources'],
    queryFn: () => fetchHumanResources(authFetch),
    enabled: canRead && !permsLoading,
  });

  const auditQ = useQuery({
    queryKey: ['organization-audit-logs'],
    queryFn: () => fetchOrganizationAudit(authFetch),
    enabled: canAudit && !permsLoading,
  });

  const invalidateUnits = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ['organization-units-tree'] });
  }, [qc]);

  const archiveUnitMut = useMutation({
    mutationFn: (id: string) =>
      postJson(authFetch, `/api/organization/units/${encodeURIComponent(id)}/archive`, {}),
    onSuccess: () => {
      toast.success('Unité archivée');
      invalidateUnits();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const archiveGroupMut = useMutation({
    mutationFn: (id: string) =>
      postJson(authFetch, `/api/organization/groups/${encodeURIComponent(id)}/archive`, {}),
    onSuccess: () => {
      toast.success('Groupe archivé');
      void qc.invalidateQueries({ queryKey: ['organization-groups'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [createUnitOpen, setCreateUnitOpen] = useState(false);
  const [newUnitName, setNewUnitName] = useState('');
  const [newUnitCode, setNewUnitCode] = useState('');
  const [newUnitType, setNewUnitType] = useState('DEPARTMENT');
  const [newUnitParent, setNewUnitParent] = useState<string>('__root__');

  const createUnitMut = useMutation({
    mutationFn: () =>
      postJson(authFetch, '/api/organization/units', {
        name: newUnitName.trim(),
        code: newUnitCode.trim() || undefined,
        type: newUnitType,
        parentId: newUnitParent === '__root__' ? null : newUnitParent,
      }),
    onSuccess: () => {
      toast.success('Unité créée');
      setCreateUnitOpen(false);
      setNewUnitName('');
      setNewUnitCode('');
      invalidateUnits();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupCode, setNewGroupCode] = useState('');
  const [newGroupType, setNewGroupType] = useState('BUSINESS');

  const createGroupMut = useMutation({
    mutationFn: () =>
      postJson(authFetch, '/api/organization/groups', {
        name: newGroupName.trim(),
        code: newGroupCode.trim() || undefined,
        type: newGroupType,
      }),
    onSuccess: () => {
      toast.success('Groupe créé');
      setCreateGroupOpen(false);
      setNewGroupName('');
      setNewGroupCode('');
      void qc.invalidateQueries({ queryKey: ['organization-groups'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [addMemberResource, setAddMemberResource] = useState('');
  const addUnitMemberMut = useMutation({
    mutationFn: () =>
      postJson(authFetch, `/api/organization/units/${encodeURIComponent(unitForMembers)}/members`, {
        resourceId: addMemberResource,
      }),
    onSuccess: () => {
      toast.success('Membre ajouté');
      setAddMemberResource('');
      void qc.invalidateQueries({ queryKey: ['organization-unit-members', unitForMembers] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addGroupMemberMut = useMutation({
    mutationFn: () =>
      postJson(authFetch, `/api/organization/groups/${encodeURIComponent(groupForMembers)}/members`, {
        resourceId: addMemberResource,
      }),
    onSuccess: () => {
      toast.success('Membre ajouté au groupe');
      setAddMemberResource('');
      void qc.invalidateQueries({ queryKey: ['organization-group-members', groupForMembers] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeUnitMemberMut = useMutation({
    mutationFn: (membershipId: string) => deleteMember(authFetch, 'units', unitForMembers, membershipId),
    onSuccess: () => {
      toast.success('Membre retiré');
      void qc.invalidateQueries({ queryKey: ['organization-unit-members', unitForMembers] });
      void qc.invalidateQueries({ queryKey: ['organization-audit-logs'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeGroupMemberMut = useMutation({
    mutationFn: (membershipId: string) => deleteMember(authFetch, 'groups', groupForMembers, membershipId),
    onSuccess: () => {
      toast.success('Membre retiré du groupe');
      void qc.invalidateQueries({ queryKey: ['organization-group-members', groupForMembers] });
      void qc.invalidateQueries({ queryKey: ['organization-audit-logs'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!permsLoading && !canRead) {
    return (
      <PageContainer>
        <PageHeader title="Organisation" description="Structure interne du client." />
        <p className="text-muted-foreground text-sm">Permission « organisation.read » requise.</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Organisation"
        description="Unités organisationnelles, rattachements des ressources humaines et groupes métier."
      />

      <Tabs defaultValue="units" className="mt-4">
        <TabsList>
          <TabsTrigger value="units">Organisation</TabsTrigger>
          <TabsTrigger value="members">Membres (unités)</TabsTrigger>
          <TabsTrigger value="groups">Groupes</TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
        </TabsList>

        <TabsContent value="units" className="mt-4 space-y-4">
          {canUpdate ? <OrganizationOwnershipPolicyCard /> : null}
          <div className="flex flex-wrap gap-2">
            {canUpdate ? (
              <Button type="button" onClick={() => setCreateUnitOpen(true)}>
                Nouvelle unité
              </Button>
            ) : null}
            {canTransfer ? (
              <Button type="button" variant="secondary" onClick={() => setTransferOpen(true)}>
                Transfert de propriété
              </Button>
            ) : null}
          </div>
          <OwnershipTransferWizard open={transferOpen} onOpenChange={setTransferOpen} />
          <Card>
            <CardContent className="pt-4">
              {unitsQ.isLoading ? (
                <p className="text-muted-foreground text-sm">Chargement…</p>
              ) : unitsQ.error ? (
                <p className="text-destructive text-sm">{(unitsQ.error as Error).message}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Unité</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="w-[120px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <OrgUnitTreeRows
                      nodes={unitsQ.data ?? []}
                      depth={0}
                      canUpdate={canUpdate}
                      onArchive={(id) => archiveUnitMut.mutate(id)}
                    />
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members" className="mt-4 space-y-4">
          <div className="grid gap-4 max-w-xl">
            <div>
              <Label>Unité</Label>
              <Select value={unitForMembers || undefined} onValueChange={(v) => setUnitForMembers(v ?? '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir une unité" />
                </SelectTrigger>
                <SelectContent>
                  {flatUnits.map((u) => (
                    <SelectItem key={u.id} value={u.id} disabled={u.status === 'ARCHIVED'}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {unitForMembers && canMembers ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <Label>Ressource humaine</Label>
                  <Select value={addMemberResource || undefined} onValueChange={(v) => setAddMemberResource(v ?? '')}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir une ressource" />
                    </SelectTrigger>
                    <SelectContent>
                      {(resourcesQ.data ?? []).map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {resourcePickerLabel(r)}
                          {r.email ? ` — ${r.email}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  disabled={!addMemberResource || addUnitMemberMut.isPending}
                  onClick={() => addUnitMemberMut.mutate()}
                >
                  Ajouter
                </Button>
              </div>
            ) : null}
          </div>
          {unitForMembers ? (
            <Card>
              <CardContent className="pt-4">
                {membersQ.isLoading ? (
                  <p className="text-muted-foreground text-sm">Chargement…</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Collaborateur</TableHead>
                        <TableHead>Email fiche</TableHead>
                        <TableHead>Compte (si lié)</TableHead>
                        {canMembers ? <TableHead className="w-[100px]" /> : null}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(membersQ.data ?? []).map((m: OrgMembershipRow) => (
                        <TableRow key={m.id}>
                          <TableCell>
                            {m.resource.firstName
                              ? `${m.resource.firstName} ${m.resource.name}`
                              : m.resource.name}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {m.resource.email ?? '—'}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {m.linkedUserEmail ?? '—'}
                          </TableCell>
                          {canMembers ? (
                            <TableCell>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeUnitMemberMut.mutate(m.id)}
                              >
                                Retirer
                              </Button>
                            </TableCell>
                          ) : null}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="groups" className="mt-4 space-y-4">
          {canUpdate ? (
            <Button type="button" onClick={() => setCreateGroupOpen(true)}>
              Nouveau groupe
            </Button>
          ) : null}
          <Card>
            <CardContent className="pt-4">
              {groupsQ.isLoading ? (
                <p className="text-muted-foreground text-sm">Chargement…</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Membres</TableHead>
                      {canUpdate ? <TableHead /> : null}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(groupsQ.data ?? []).map((g: OrgGroupRow) => (
                      <TableRow key={g.id}>
                        <TableCell className="font-medium">{g.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{g.type}</TableCell>
                        <TableCell className="text-sm">{g.status}</TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="link"
                            className="h-auto p-0"
                            onClick={() => setGroupForMembers(g.id)}
                          >
                            Gérer
                          </Button>
                        </TableCell>
                        {canUpdate && g.status === 'ACTIVE' ? (
                          <TableCell>
                            <Button type="button" variant="outline" size="sm" onClick={() => archiveGroupMut.mutate(g.id)}>
                              Archiver
                            </Button>
                          </TableCell>
                        ) : (
                          <TableCell />
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {groupForMembers ? (
            <Card>
              <CardContent className="space-y-4 pt-4">
                <p className="text-sm font-medium">Membres du groupe sélectionné</p>
                {canMembers ? (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end max-w-xl">
                    <div className="flex-1">
                      <Label>Ressource humaine</Label>
                      <Select value={addMemberResource || undefined} onValueChange={(v) => setAddMemberResource(v ?? '')}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choisir une ressource" />
                        </SelectTrigger>
                        <SelectContent>
                          {(resourcesQ.data ?? []).map((r) => (
                            <SelectItem key={r.id} value={r.id}>
                              {resourcePickerLabel(r)}
                              {r.email ? ` — ${r.email}` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="button"
                      disabled={!addMemberResource || addGroupMemberMut.isPending}
                      onClick={() => addGroupMemberMut.mutate()}
                    >
                      Ajouter
                    </Button>
                  </div>
                ) : null}
                {groupMembersQ.isLoading ? (
                  <p className="text-muted-foreground text-sm">Chargement…</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Collaborateur</TableHead>
                        <TableHead>Email fiche</TableHead>
                        <TableHead>Compte (si lié)</TableHead>
                        {canMembers ? <TableHead /> : null}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(groupMembersQ.data ?? []).map((m: OrgMembershipRow) => (
                        <TableRow key={m.id}>
                          <TableCell>
                            {m.resource.firstName
                              ? `${m.resource.firstName} ${m.resource.name}`
                              : m.resource.name}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {m.resource.email ?? '—'}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {m.linkedUserEmail ?? '—'}
                          </TableCell>
                          {canMembers ? (
                            <TableCell>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeGroupMemberMut.mutate(m.id)}
                              >
                                Retirer
                              </Button>
                            </TableCell>
                          ) : null}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="audit" className="mt-4">
          {!canAudit ? (
            <p className="text-muted-foreground text-sm">Permission « audit_logs.read » requise pour cet onglet.</p>
          ) : auditQ.isLoading ? (
            <p className="text-muted-foreground text-sm">Chargement…</p>
          ) : auditQ.error ? (
            <p className="text-destructive text-sm">{(auditQ.error as Error).message}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(auditQ.data ?? []).map((log: AuditLogRow) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {new Date(log.createdAt).toLocaleString('fr-FR')}
                    </TableCell>
                    <TableCell className="text-sm">{log.action}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{log.resourceType}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={createUnitOpen} onOpenChange={setCreateUnitOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle unité</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="ou-name">Nom</Label>
              <Input id="ou-name" value={newUnitName} onChange={(e) => setNewUnitName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="ou-code">Code (optionnel)</Label>
              <Input id="ou-code" value={newUnitCode} onChange={(e) => setNewUnitCode(e.target.value)} />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={newUnitType} onValueChange={(v) => setNewUnitType(v ?? '')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['COMPANY', 'DIRECTION', 'DEPARTMENT', 'SERVICE', 'SITE', 'TEAM', 'COMMITTEE', 'OTHER'].map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Parent</Label>
              <Select value={newUnitParent} onValueChange={(v) => setNewUnitParent(v ?? '')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__root__">Racine</SelectItem>
                  {flatUnits
                    .filter((u) => u.status === 'ACTIVE')
                    .map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateUnitOpen(false)}>
              Annuler
            </Button>
            <Button
              type="button"
              disabled={!newUnitName.trim() || createUnitMut.isPending}
              onClick={() => createUnitMut.mutate()}
            >
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createGroupOpen} onOpenChange={setCreateGroupOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau groupe métier</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="og-name">Nom</Label>
              <Input id="og-name" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="og-code">Code (optionnel)</Label>
              <Input id="og-code" value={newGroupCode} onChange={(e) => setNewGroupCode(e.target.value)} />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={newGroupType} onValueChange={(v) => setNewGroupType(v ?? '')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['BUSINESS', 'COMMITTEE', 'FUNCTIONAL', 'SECURITY', 'TRANSVERSE', 'OTHER'].map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateGroupOpen(false)}>
              Annuler
            </Button>
            <Button
              type="button"
              disabled={!newGroupName.trim() || createGroupMut.isPending}
              onClick={() => createGroupMut.mutate()}
            >
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
