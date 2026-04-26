import { Test } from '@nestjs/testing';
import { UserClientAccessService } from '../chatbot/user-client-access.service';
import type { SearchAdapter, SearchAdapterContext } from './search.adapter';
import {
  SEARCH_MAX_GLOBAL,
  SEARCH_MAX_PER_MODULE,
} from './search.constants';
import { SearchService } from './search.service';
import { SEARCH_ADAPTERS } from './search.tokens';
import type { InternalSearchHit } from './search.types';

function hit(p: Partial<InternalSearchHit> & Pick<InternalSearchHit, 'moduleCode' | 'score'>): InternalSearchHit {
  return {
    moduleLabel: 'L',
    groupType: 'T',
    groupIcon: 'I',
    title: 't',
    route: '/r',
    hitType: 'X',
    subtitle: undefined,
    ...p,
  };
}

describe('SearchService', () => {
  const userAccessMock = {
    resolvePermissionCodes: jest.fn(),
  };

  async function compile(adapters: SearchAdapter[]) {
    const m = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: UserClientAccessService, useValue: userAccessMock },
        { provide: SEARCH_ADAPTERS, useValue: adapters },
      ],
    }).compile();
    return m.get(SearchService);
  }

  beforeEach(() => {
    jest.clearAllMocks();
    userAccessMock.resolvePermissionCodes.mockResolvedValue(
      new Set(['projects.read', 'budgets.read']),
    );
  });

  it('retourne groups vide si q vide', async () => {
    const svc = await compile([]);
    const r = await svc.search('u', 'c', '');
    expect(r.groups).toEqual([]);
    expect(r.total).toBe(0);
  });

  it('regroupe par moduleCode', async () => {
    const adapters: SearchAdapter[] = [
      {
        search: async () => [
          hit({
            moduleCode: 'projects',
            moduleLabel: 'Projets',
            groupType: 'PROJECT',
            groupIcon: 'FolderOpen',
            title: 'Alpha',
            subtitle: 'P-1',
            route: '/projects/a',
            hitType: 'PROJECT',
            score: 10,
          }),
        ],
      },
      {
        search: async () => [
          hit({
            moduleCode: 'budgets',
            moduleLabel: 'Budgets',
            groupType: 'BUDGET',
            groupIcon: 'Wallet',
            title: 'Bud',
            subtitle: 'B-1',
            route: '/budgets/b',
            hitType: 'BUDGET',
            score: 8,
          }),
        ],
      },
    ];
    const svc = await compile(adapters);
    const r = await svc.search('u', 'c', 'x');
    expect(r.groups).toHaveLength(2);
    expect(r.groups.map((g) => g.moduleCode)).toEqual(['projects', 'budgets']);
    expect(r.groups[0].results[0].title).toBe('Alpha');
    expect(r.groups[1].results[0].title).toBe('Bud');
    expect(r.total).toBe(2);
  });

  it('ne retourne pas de groupe pour un adapter vide', async () => {
    const adapters: SearchAdapter[] = [
      {
        search: async () => [
          hit({
            moduleCode: 'projects',
            moduleLabel: 'Projets',
            groupType: 'PROJECT',
            groupIcon: 'FolderOpen',
            title: 'A',
            route: '/projects/a',
            hitType: 'PROJECT',
            score: 1,
          }),
        ],
      },
      { search: async () => [] },
    ];
    const svc = await compile(adapters);
    const r = await svc.search('u', 'c', 'a');
    expect(r.groups).toHaveLength(1);
    expect(r.groups[0].moduleCode).toBe('projects');
  });

  it('tronque à SEARCH_MAX_PER_MODULE par module', async () => {
    const many: InternalSearchHit[] = Array.from({ length: 12 }, (_, i) =>
      hit({
        moduleCode: 'projects',
        moduleLabel: 'Projets',
        groupType: 'PROJECT',
        groupIcon: 'FolderOpen',
        title: `P${i}`,
        route: `/projects/${i}`,
        hitType: 'PROJECT',
        score: 100 - i,
      }),
    );
    const svc = await compile([{ search: async () => many }]);
    const r = await svc.search('u', 'c', 'p');
    expect(r.groups).toHaveLength(1);
    expect(r.groups[0].results.length).toBeLessThanOrEqual(SEARCH_MAX_PER_MODULE);
    expect(r.groups[0].results.length).toBe(SEARCH_MAX_PER_MODULE);
  });

  it('tronque au total global SEARCH_MAX_GLOBAL', async () => {
    const projects = Array.from({ length: SEARCH_MAX_PER_MODULE }, (_, i) =>
      hit({
        moduleCode: 'projects',
        moduleLabel: 'Projets',
        groupType: 'PROJECT',
        groupIcon: 'FolderOpen',
        title: `P${i}`,
        route: `/projects/p${i}`,
        hitType: 'PROJECT',
        score: 200 - i,
      }),
    );
    const budgets = Array.from({ length: SEARCH_MAX_PER_MODULE }, (_, i) =>
      hit({
        moduleCode: 'budgets',
        moduleLabel: 'Budgets',
        groupType: 'BUDGET',
        groupIcon: 'Wallet',
        title: `B${i}`,
        route: `/budgets/b${i}`,
        hitType: 'BUDGET',
        score: 100 - i,
      }),
    );
    const help = Array.from({ length: SEARCH_MAX_PER_MODULE }, (_, i) =>
      hit({
        moduleCode: 'help',
        moduleLabel: 'Aide',
        groupType: 'HELP',
        groupIcon: 'FileText',
        title: `H${i}`,
        route: `/chatbot/h${i}`,
        hitType: 'ARTICLE',
        score: 50 - i,
      }),
    );
    const svc = await compile([
      { search: async () => projects },
      { search: async () => budgets },
      { search: async () => help },
    ]);
    const r = await svc.search('u', 'c', 'q');
    expect(r.total).toBeLessThanOrEqual(SEARCH_MAX_GLOBAL);
    expect(r.total).toBe(SEARCH_MAX_PER_MODULE * 3);
  });

  it('ordonne les groupes par meilleur score puis ordre fonctionnel', async () => {
    const adapters: SearchAdapter[] = [
      {
        search: async () => [
          hit({
            moduleCode: 'budgets',
            moduleLabel: 'Budgets',
            groupType: 'BUDGET',
            groupIcon: 'Wallet',
            title: 'B',
            route: '/b',
            hitType: 'BUDGET',
            score: 50,
          }),
        ],
      },
      {
        search: async () => [
          hit({
            moduleCode: 'projects',
            moduleLabel: 'Projets',
            groupType: 'PROJECT',
            groupIcon: 'FolderOpen',
            title: 'P',
            route: '/p',
            hitType: 'PROJECT',
            score: 100,
          }),
        ],
      },
    ];
    const svc = await compile(adapters);
    const r = await svc.search('u', 'c', 'x');
    expect(r.groups[0].moduleCode).toBe('projects');
    expect(r.groups[1].moduleCode).toBe('budgets');
  });

  it('projet dans groupe projects, budget dans budgets, aide dans help', async () => {
    const adapters: SearchAdapter[] = [
      {
        search: async (ctx: SearchAdapterContext) =>
          ctx.permissionCodes.has('projects.read')
            ? [
                hit({
                  moduleCode: 'projects',
                  moduleLabel: 'Projets',
                  groupType: 'PROJECT',
                  groupIcon: 'FolderOpen',
                  title: 'Projet X',
                  route: '/projects/x',
                  hitType: 'PROJECT',
                  score: 1,
                }),
              ]
            : [],
      },
      {
        search: async (ctx: SearchAdapterContext) =>
          ctx.permissionCodes.has('budgets.read')
            ? [
                hit({
                  moduleCode: 'budgets',
                  moduleLabel: 'Budgets',
                  groupType: 'BUDGET',
                  groupIcon: 'Wallet',
                  title: 'Budget Y',
                  route: '/budgets/y',
                  hitType: 'BUDGET',
                  score: 1,
                }),
              ]
            : [],
      },
      {
        search: async () => [
          hit({
            moduleCode: 'help',
            moduleLabel: 'Aide / Articles',
            groupType: 'HELP',
            groupIcon: 'FileText',
            title: 'Article Z',
            route: '/chatbot/explore/article/z',
            hitType: 'ARTICLE',
            score: 1,
          }),
        ],
      },
    ];
    const svc = await compile(adapters);
    const r = await svc.search('u', 'c', 'z');
    const byCode = Object.fromEntries(r.groups.map((g) => [g.moduleCode, g]));
    expect(byCode.projects?.results[0].title).toBe('Projet X');
    expect(byCode.budgets?.results[0].title).toBe('Budget Y');
    expect(byCode.help?.results[0].title).toBe('Article Z');
  });

  it('sans projects.read aucun groupe projects', async () => {
    userAccessMock.resolvePermissionCodes.mockResolvedValue(new Set(['budgets.read']));
    const adapters: SearchAdapter[] = [
      {
        search: async (ctx: SearchAdapterContext) =>
          ctx.permissionCodes.has('projects.read')
            ? [
                hit({
                  moduleCode: 'projects',
                  moduleLabel: 'Projets',
                  groupType: 'PROJECT',
                  groupIcon: 'FolderOpen',
                  title: 'Hidden',
                  route: '/p',
                  hitType: 'PROJECT',
                  score: 99,
                }),
              ]
            : [],
      },
    ];
    const svc = await compile(adapters);
    const r = await svc.search('u', 'c', 'x');
    expect(r.groups.some((g) => g.moduleCode === 'projects')).toBe(false);
  });

  it('n’expose pas d’UUID dans title/subtitle des hits mockés', async () => {
    const uuid = '019a2b3c-4d5e-6f70-8192-abcdef012345';
    const adapters: SearchAdapter[] = [
      {
        search: async () => [
          hit({
            moduleCode: 'projects',
            moduleLabel: 'Projets',
            groupType: 'PROJECT',
            groupIcon: 'FolderOpen',
            title: 'Mon projet',
            subtitle: 'CODE-1',
            route: `/projects/${uuid}`,
            hitType: 'PROJECT',
            score: 10,
          }),
        ],
      },
    ];
    const svc = await compile(adapters);
    const r = await svc.search('u', 'c', 'mon');
    const t = r.groups[0].results[0].title + (r.groups[0].results[0].subtitle ?? '');
    expect(t).not.toContain(uuid);
    expect(r.groups[0].results[0].route).toContain(uuid);
  });
});
