import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';

const { fetchSpy, useActiveClientMock, useAuthMock, toastModule } = vi.hoisted(
  () => ({
    fetchSpy: vi.fn(),
    useActiveClientMock: vi.fn(),
    useAuthMock: vi.fn(),
    toastModule: {
      error: vi.fn(),
      success: vi.fn(),
      warning: vi.fn(),
      message: vi.fn(),
    },
  }),
);

vi.mock('@/hooks/use-authenticated-fetch', () => ({
  useAuthenticatedFetch: () => fetchSpy,
}));

vi.mock('@/hooks/use-active-client', () => ({
  useActiveClient: () => useActiveClientMock(),
}));

vi.mock('@/context/auth-context', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('@/lib/toast', () => ({
  toast: Object.assign(
    (title: string) => toastModule.message(title),
    toastModule,
  ),
}));

const useResourceAclMock = vi.hoisted(() => vi.fn());

vi.mock('../hooks/use-resource-acl', () => ({
  useResourceAcl: (...args: unknown[]) => useResourceAclMock(...args),
}));

const useGroupMembershipsMock = vi.hoisted(() => vi.fn());

vi.mock('../hooks/use-group-memberships', () => ({
  useGroupMemberships: (...args: unknown[]) =>
    useGroupMembershipsMock(...args),
}));

const useClientMembersMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/client-rbac/hooks/use-client-members', () => ({
  useClientMembers: () => useClientMembersMock(),
}));

const useAccessGroupsMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/access-groups/hooks/use-access-groups', () => ({
  useAccessGroups: () => useAccessGroupsMock(),
}));

const apiSpies = vi.hoisted(() => ({
  addResourceAclEntry: vi.fn(),
  removeResourceAclEntry: vi.fn(),
}));

vi.mock('../api/resource-acl', async () => {
  const actual = await vi.importActual<
    typeof import('../api/resource-acl')
  >('../api/resource-acl');
  return {
    ...actual,
    addResourceAclEntry: apiSpies.addResourceAclEntry,
    removeResourceAclEntry: apiSpies.removeResourceAclEntry,
  };
});

import { ResourceAclEditor } from './resource-acl-editor';
import type {
  ResourceAclEntry,
  ResourceAclListResponse,
} from '../api/resource-acl.types';

function makeEntry(
  partial: Partial<ResourceAclEntry> & { id: string },
): ResourceAclEntry {
  return {
    id: partial.id,
    subjectType: partial.subjectType ?? 'USER',
    subjectId: partial.subjectId ?? `subj-${partial.id}`,
    permission: partial.permission ?? 'READ',
    subjectLabel: partial.subjectLabel ?? `Label ${partial.id}`,
    createdAt: '2026-05-01T00:00:00Z',
    updatedAt: '2026-05-01T00:00:00Z',
  };
}

function setupHappyMocks(
  initial: ResourceAclListResponse,
  overrides?: { groupMemberships?: { groupId: string; memberUserIds: Set<string> }[] },
) {
  let current: ResourceAclListResponse = initial;
  const refetchSpy = vi.fn(async () => {
    return { data: current };
  });
  useResourceAclMock.mockReturnValue({
    data: current,
    isLoading: false,
    isError: false,
    error: null,
    refetch: refetchSpy,
  });
  useGroupMembershipsMock.mockReturnValue({
    groupMemberships: overrides?.groupMemberships ?? [],
    isLoading: false,
    isError: false,
  });
  useClientMembersMock.mockReturnValue({
    data: [
      {
        id: 'u-current',
        email: 'current@demo.fr',
        firstName: 'Current',
        lastName: 'User',
        status: 'ACTIVE',
      },
      {
        id: 'u-alice',
        email: 'alice@demo.fr',
        firstName: 'Alice',
        lastName: 'Martin',
        status: 'ACTIVE',
      },
    ],
    isLoading: false,
  });
  useAccessGroupsMock.mockReturnValue({
    data: [{ id: 'g-finance', name: 'Direction Finance', memberCount: 3 }],
    isLoading: false,
  });
  return {
    setData: (next: ResourceAclListResponse) => {
      current = next;
      useResourceAclMock.mockReturnValue({
        data: current,
        isLoading: false,
        isError: false,
        error: null,
        refetch: refetchSpy,
      });
    },
    refetchSpy,
  };
}

function renderEditor(
  props: Partial<React.ComponentProps<typeof ResourceAclEditor>> = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ResourceAclEditor
        resourceType="PROJECT"
        resourceId="cprojabcd00000000000000a"
        resourceLabel="Plan Marketing 2026"
        {...props}
      />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  fetchSpy.mockReset();
  useActiveClientMock.mockReset();
  useAuthMock.mockReset();
  apiSpies.addResourceAclEntry.mockReset();
  apiSpies.removeResourceAclEntry.mockReset();
  toastModule.error.mockReset();
  toastModule.success.mockReset();
  useResourceAclMock.mockReset();
  useGroupMembershipsMock.mockReset();
  useClientMembersMock.mockReset();
  useAccessGroupsMock.mockReset();

  useActiveClientMock.mockReturnValue({
    activeClient: { id: 'client-A', role: 'CLIENT_ADMIN' },
    setActiveClient: () => undefined,
    initialized: true,
  });
  useAuthMock.mockReturnValue({ user: { id: 'u-current' } });
});

describe('ResourceAclEditor — affichage état public/restricted', () => {
  it('affiche le bandeau « Mode public » uniquement après GET vide confirmé', () => {
    setupHappyMocks({ restricted: false, entries: [] });
    renderEditor();
    expect(
      screen.getByTestId('resource-acl-public-banner'),
    ).toBeInTheDocument();
  });

  it('ne montre PAS le bandeau pendant un état de chargement', () => {
    useResourceAclMock.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    useGroupMembershipsMock.mockReturnValue({
      groupMemberships: [],
      isLoading: false,
      isError: false,
    });
    useClientMembersMock.mockReturnValue({ data: [], isLoading: true });
    useAccessGroupsMock.mockReturnValue({ data: [], isLoading: true });
    renderEditor();
    expect(
      screen.queryByTestId('resource-acl-public-banner'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByTestId('resource-acl-editor-loading'),
    ).toBeInTheDocument();
  });

  it('affiche subjectLabel jamais l’UUID brut', () => {
    setupHappyMocks({
      restricted: true,
      entries: [
        makeEntry({
          id: 'e1',
          subjectType: 'USER',
          subjectId: 'cuserabcd0000000000000001',
          subjectLabel: 'Alice Martin (alice@demo.fr)',
          permission: 'READ',
        }),
      ],
    });
    renderEditor();
    expect(
      screen.getByText('Alice Martin (alice@demo.fr)'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('cuserabcd0000000000000001'),
    ).not.toBeInTheDocument();
  });

  it('canEdit=false (override réducteur) → table sans colonne Actions activable', () => {
    setupHappyMocks({
      restricted: true,
      entries: [
        makeEntry({
          id: 'e1',
          subjectType: 'USER',
          subjectId: 'u-alice',
          subjectLabel: 'Alice Martin',
          permission: 'READ',
        }),
      ],
    });
    renderEditor({ canEdit: false });
    const removeBtn = screen.getByLabelText('Supprimer Alice Martin');
    expect(removeBtn).toBeDisabled();
    expect(
      screen.queryByTestId('resource-acl-bulk-delete'),
    ).not.toBeInTheDocument();
  });
});

describe('ResourceAclEditor — self-lockout (test imposé n°4)', () => {
  it('cas A : USER ADMIN unique → DELETE bloqué sans confirmation forte', async () => {
    const user = userEvent.setup();
    const harness = setupHappyMocks({
      restricted: true,
      entries: [
        makeEntry({
          id: 'e-admin',
          subjectType: 'USER',
          subjectId: 'u-current',
          subjectLabel: 'Current User (current@demo.fr)',
          permission: 'ADMIN',
        }),
      ],
    });
    apiSpies.removeResourceAclEntry.mockResolvedValue(undefined);

    renderEditor();

    const removeBtn = screen.getByLabelText(
      'Supprimer Current User (current@demo.fr)',
    );
    expect(removeBtn).toHaveAttribute('data-lockout-risk', 'true');

    await user.click(removeBtn);

    expect(apiSpies.removeResourceAclEntry).not.toHaveBeenCalled();
    expect(
      screen.getByText(/dernière capacité ADMIN/i),
    ).toBeInTheDocument();

    void harness;
  });

  it('cas B : seule capacité ADMIN via GROUP → DELETE du groupe bloqué', async () => {
    const user = userEvent.setup();
    setupHappyMocks(
      {
        restricted: true,
        entries: [
          makeEntry({
            id: 'e-group-admin',
            subjectType: 'GROUP',
            subjectId: 'g-finance',
            subjectLabel: 'Direction Finance',
            permission: 'ADMIN',
          }),
        ],
      },
      {
        groupMemberships: [
          {
            groupId: 'g-finance',
            memberUserIds: new Set(['u-current']),
          },
        ],
      },
    );

    renderEditor();

    const removeBtn = screen.getByLabelText('Supprimer Direction Finance');
    expect(removeBtn).toHaveAttribute('data-lockout-risk', 'true');

    await user.click(removeBtn);

    expect(apiSpies.removeResourceAclEntry).not.toHaveBeenCalled();
    expect(
      screen.getByText(/dernière capacité ADMIN/i),
    ).toBeInTheDocument();
  });

  it('cas C : 2 sources ADMIN distinctes → DELETE de l’une n’exige pas de confirmation', async () => {
    const user = userEvent.setup();
    setupHappyMocks(
      {
        restricted: true,
        entries: [
          makeEntry({
            id: 'e-user-admin',
            subjectType: 'USER',
            subjectId: 'u-current',
            subjectLabel: 'Current User',
            permission: 'ADMIN',
          }),
          makeEntry({
            id: 'e-group-admin',
            subjectType: 'GROUP',
            subjectId: 'g-finance',
            subjectLabel: 'Direction Finance',
            permission: 'ADMIN',
          }),
        ],
      },
      {
        groupMemberships: [
          {
            groupId: 'g-finance',
            memberUserIds: new Set(['u-current']),
          },
        ],
      },
    );
    apiSpies.removeResourceAclEntry.mockResolvedValue(undefined);

    renderEditor();

    const userRemoveBtn = screen.getByLabelText('Supprimer Current User');
    expect(userRemoveBtn).not.toHaveAttribute('data-lockout-risk', 'true');

    await user.click(userRemoveBtn);

    await waitFor(() => {
      expect(apiSpies.removeResourceAclEntry).toHaveBeenCalledTimes(1);
    });
    expect(apiSpies.removeResourceAclEntry).toHaveBeenCalledWith(
      fetchSpy,
      'PROJECT',
      'cprojabcd00000000000000a',
      'e-user-admin',
    );
  });

  it('non-CLIENT_ADMIN → editor reste rendu en lecture seule (cas budget-line readonly avec canEdit=false)', () => {
    setupHappyMocks({
      restricted: true,
      entries: [
        makeEntry({
          id: 'e1',
          subjectLabel: 'Alice Martin',
          permission: 'READ',
        }),
      ],
    });
    renderEditor({ readOnly: true, canEdit: false });
    expect(screen.getByTestId('resource-acl-editor')).toBeInTheDocument();
    expect(
      screen.queryByTestId('resource-acl-bulk-delete'),
    ).not.toBeInTheDocument();
  });
});

describe('ResourceAclEditor — bulk delete erreur partielle (test imposé n°3 partie UI)', () => {
  it('5 entrées, échec à la 3ᵉ → toast erreur, Reprendre visible, banner public NON affiché', async () => {
    const user = userEvent.setup();
    const initialEntries: ResourceAclEntry[] = [
      makeEntry({
        id: 'e1',
        subjectId: 'u-alice',
        subjectLabel: 'Alice Martin',
        permission: 'READ',
      }),
      makeEntry({
        id: 'e2',
        subjectId: 'u-bob',
        subjectLabel: 'Bob Durand',
        permission: 'READ',
      }),
      makeEntry({
        id: 'e3',
        subjectType: 'GROUP',
        subjectId: 'g-finance',
        subjectLabel: 'Direction Finance',
        permission: 'WRITE',
      }),
      makeEntry({
        id: 'e4',
        subjectId: 'u-charlie',
        subjectLabel: 'Charlie Bouvier',
        permission: 'READ',
      }),
      makeEntry({
        id: 'e5',
        subjectId: 'u-eve',
        subjectLabel: 'Eve Leroy',
        permission: 'READ',
      }),
    ];

    let serverEntries = [...initialEntries];

    const refetchSpy = vi.fn(async () => {
      useResourceAclMock.mockReturnValue({
        data: { restricted: serverEntries.length > 0, entries: serverEntries },
        isLoading: false,
        isError: false,
        error: null,
        refetch: refetchSpy,
      });
      return { data: { restricted: true, entries: serverEntries } };
    });

    useResourceAclMock.mockReturnValue({
      data: { restricted: true, entries: serverEntries },
      isLoading: false,
      isError: false,
      error: null,
      refetch: refetchSpy,
    });
    useGroupMembershipsMock.mockReturnValue({
      groupMemberships: [
        { groupId: 'g-finance', memberUserIds: new Set() },
      ],
      isLoading: false,
      isError: false,
    });
    useClientMembersMock.mockReturnValue({ data: [], isLoading: false });
    useAccessGroupsMock.mockReturnValue({ data: [], isLoading: false });

    apiSpies.removeResourceAclEntry.mockImplementation(
      async (_authFetch, _type, _id, entryId: string) => {
        if (entryId === 'e3') {
          throw new Error('boom');
        }
        serverEntries = serverEntries.filter((e) => e.id !== entryId);
      },
    );

    renderEditor();

    const bulkBtn = screen.getByTestId('resource-acl-bulk-delete');
    await user.click(bulkBtn);

    const dialogTitle = await screen.findByText(/Revenir en mode public/i);
    expect(dialogTitle).toBeInTheDocument();

    const phraseInput = screen.getByLabelText(/JE COMPRENDS LE RISQUE/i);
    await user.type(phraseInput, 'JE COMPRENDS LE RISQUE');
    await user.click(screen.getByRole('button', { name: /Tout supprimer$/i }));

    await waitFor(() => {
      expect(toastModule.error).toHaveBeenCalled();
    });

    const status = await screen.findByTestId(
      'resource-acl-bulk-delete-status',
    );
    expect(within(status).getByText(/2 sur 5 supprimées/i)).toBeInTheDocument();
    expect(screen.getByTestId('resource-acl-bulk-resume')).toBeInTheDocument();
    expect(
      screen.queryByTestId('resource-acl-public-banner'),
    ).not.toBeInTheDocument();

    expect(screen.getByText('Direction Finance')).toBeInTheDocument();
    expect(screen.getByText('Charlie Bouvier')).toBeInTheDocument();
    expect(screen.getByText('Eve Leroy')).toBeInTheDocument();
  }, 15000);
});

describe('ResourceAclEditor — first-entry self-admin', () => {
  it('case « M’ajouter en ADMIN » cochée par défaut → double POST séquentiel', async () => {
    const user = userEvent.setup();
    setupHappyMocks({ restricted: false, entries: [] });
    apiSpies.addResourceAclEntry.mockResolvedValue({
      id: 'e-new',
      subjectType: 'USER',
      subjectId: 'u-alice',
      permission: 'READ',
      subjectLabel: 'Alice Martin',
      createdAt: '',
      updatedAt: '',
    });

    renderEditor();

    expect(
      screen.getByTestId('resource-acl-self-admin-option'),
    ).toBeInTheDocument();
    const checkbox = screen.getByRole('checkbox', {
      name: /M'ajouter en ADMIN/i,
    });
    expect(checkbox).toBeChecked();
  });
});
