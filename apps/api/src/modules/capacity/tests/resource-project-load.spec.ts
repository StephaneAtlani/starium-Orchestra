import { CapacityAllocationSourceType, Prisma, WorkTeamStatus } from '@prisma/client';
import { CapacityAggregateService } from '../capacity-aggregate.service';

/**
 * Plan de charge ressource × projet — matrice `/resources`.
 * Les dépendances Prisma / résolution de capacité sont simulées : on vérifie
 * l'agrégation (colonnes projet, hors-projet, taux de charge) et les exclusions.
 */
describe('CapacityAggregateService.dashboardResourceProjectLoad', () => {
  let prisma: any;
  let resolve: any;
  let consumption: any;
  let service: CapacityAggregateService;

  const QUERY = { from: '2026-06', to: '2026-06' } as any;

  function allocationMonth(over: {
    allocationId: string;
    resourceId: string | null;
    days: number;
    sourceType?: CapacityAllocationSourceType;
    sourceId?: string | null;
    workTeamId?: string | null;
    workTeamStatus?: WorkTeamStatus | null;
    yearMonth?: string;
  }) {
    return {
      yearMonth: over.yearMonth ?? '2026-06',
      days: new Prisma.Decimal(over.days),
      allocation: {
        id: over.allocationId,
        resourceId: over.resourceId,
        workTeamId: over.workTeamId ?? null,
        sourceType: over.sourceType ?? CapacityAllocationSourceType.PROJECT,
        sourceId: over.sourceId ?? 'proj-1',
        workTeam: over.workTeamStatus ? { status: over.workTeamStatus } : null,
      },
    };
  }

  beforeEach(() => {
    prisma = {
      resource: { findMany: jest.fn().mockResolvedValue([]) },
      capacityAllocationMonth: { findMany: jest.fn().mockResolvedValue([]) },
      project: { findMany: jest.fn().mockResolvedValue([]) },
      projectRisk: { findFirst: jest.fn() },
      actionPlan: { findFirst: jest.fn() },
    };
    resolve = {
      resolveResourceMonthly: jest.fn().mockResolvedValue({ days: 20 }),
    };
    consumption = {
      assertSourceCanEmit: jest.fn().mockResolvedValue(true),
    };
    // Toute source projet est active par défaut.
    prisma.project.findFirst = jest.fn().mockResolvedValue({ status: 'IN_PROGRESS' });
    service = new CapacityAggregateService(prisma, resolve, consumption);
  });

  it('ventile les jours alloués en colonnes projet', async () => {
    prisma.resource.findMany.mockResolvedValue([
      { id: 'res-1', name: 'Marc Dupont', resourceRole: { name: 'Chef de projet' } },
    ]);
    prisma.capacityAllocationMonth.findMany.mockResolvedValue([
      allocationMonth({ allocationId: 'a1', resourceId: 'res-1', days: 10, sourceId: 'proj-1' }),
      allocationMonth({ allocationId: 'a2', resourceId: 'res-1', days: 5, sourceId: 'proj-2' }),
    ]);
    prisma.project.findMany.mockResolvedValue([
      { id: 'proj-1', name: 'Portail Client', code: 'PC' },
      { id: 'proj-2', name: 'Migration Cloud', code: 'MC' },
    ]);

    const result = await service.dashboardResourceProjectLoad('c1', QUERY);

    expect(result.projects.map((p) => p.id)).toEqual(['proj-1', 'proj-2']);
    const [row] = result.items;
    expect(row.label).toBe('Marc Dupont');
    expect(row.roleName).toBe('Chef de projet');
    expect(row.byProject).toEqual({ 'proj-1': 10, 'proj-2': 5 });
    expect(row.allocatedDays).toBe(15);
    expect(row.capacityDays).toBe(20);
    expect(row.availableDays).toBe(5);
    expect(row.loadPercent).toBe(75);
  });

  it('regroupe le manuel et les autres sources dans otherDays', async () => {
    prisma.resource.findMany.mockResolvedValue([
      { id: 'res-1', name: 'Sophie Leroy', resourceRole: null },
    ]);
    prisma.capacityAllocationMonth.findMany.mockResolvedValue([
      allocationMonth({ allocationId: 'a1', resourceId: 'res-1', days: 8, sourceId: 'proj-1' }),
      allocationMonth({
        allocationId: 'a2',
        resourceId: 'res-1',
        days: 4,
        sourceType: CapacityAllocationSourceType.MANUAL,
        sourceId: null,
      }),
    ]);
    prisma.project.findMany.mockResolvedValue([
      { id: 'proj-1', name: 'Portail Client', code: 'PC' },
    ]);

    const [row] = (await service.dashboardResourceProjectLoad('c1', QUERY)).items;

    expect(row.byProject).toEqual({ 'proj-1': 8 });
    expect(row.otherDays).toBe(4);
    // otherDays reste compté dans la charge totale.
    expect(row.allocatedDays).toBe(12);
    expect(row.loadPercent).toBe(60);
  });

  it('exclut les allocations portées par une équipe archivée', async () => {
    prisma.resource.findMany.mockResolvedValue([
      { id: 'res-1', name: 'Julien Thomas', resourceRole: null },
    ]);
    prisma.capacityAllocationMonth.findMany.mockResolvedValue([
      allocationMonth({
        allocationId: 'a1',
        resourceId: 'res-1',
        days: 10,
        workTeamId: 'wt-1',
        workTeamStatus: WorkTeamStatus.ARCHIVED,
      }),
    ]);

    const result = await service.dashboardResourceProjectLoad('c1', QUERY);

    expect(result.projects).toEqual([]);
    expect(result.items[0].allocatedDays).toBe(0);
    expect(result.items[0].loadPercent).toBe(0);
  });

  it('exclut les sources qui n’émettent plus', async () => {
    prisma.resource.findMany.mockResolvedValue([
      { id: 'res-1', name: 'Paul Dubois', resourceRole: null },
    ]);
    prisma.capacityAllocationMonth.findMany.mockResolvedValue([
      allocationMonth({ allocationId: 'a1', resourceId: 'res-1', days: 10 }),
    ]);
    consumption.assertSourceCanEmit.mockResolvedValue(false);

    const result = await service.dashboardResourceProjectLoad('c1', QUERY);

    expect(result.items[0].allocatedDays).toBe(0);
  });

  it('signale une surcharge au-delà de 100 %', async () => {
    prisma.resource.findMany.mockResolvedValue([
      { id: 'res-1', name: 'Sophie Leroy', resourceRole: null },
    ]);
    prisma.capacityAllocationMonth.findMany.mockResolvedValue([
      allocationMonth({ allocationId: 'a1', resourceId: 'res-1', days: 22 }),
    ]);
    prisma.project.findMany.mockResolvedValue([
      { id: 'proj-1', name: 'Portail Client', code: 'PC' },
    ]);

    const [row] = (await service.dashboardResourceProjectLoad('c1', QUERY)).items;

    expect(row.loadPercent).toBe(110);
    expect(row.availableDays).toBe(-2);
  });

  it('renvoie un taux null quand aucune capacité n’est résolue', async () => {
    prisma.resource.findMany.mockResolvedValue([
      { id: 'res-1', name: 'Alice Bernard', resourceRole: null },
    ]);
    resolve.resolveResourceMonthly.mockResolvedValue({ days: 0 });

    const [row] = (await service.dashboardResourceProjectLoad('c1', QUERY)).items;

    expect(row.capacityDays).toBe(0);
    expect(row.loadPercent).toBeNull();
  });

  it('n’évalue l’inclusion qu’une fois par allocation multi-mois', async () => {
    prisma.resource.findMany.mockResolvedValue([
      { id: 'res-1', name: 'Marc Dupont', resourceRole: null },
    ]);
    prisma.capacityAllocationMonth.findMany.mockResolvedValue([
      allocationMonth({ allocationId: 'a1', resourceId: 'res-1', days: 5, yearMonth: '2026-06' }),
      allocationMonth({ allocationId: 'a1', resourceId: 'res-1', days: 5, yearMonth: '2026-07' }),
    ]);
    prisma.project.findMany.mockResolvedValue([
      { id: 'proj-1', name: 'Portail Client', code: 'PC' },
    ]);

    const result = await service.dashboardResourceProjectLoad('c1', {
      from: '2026-06',
      to: '2026-07',
    } as any);

    expect(consumption.assertSourceCanEmit).toHaveBeenCalledTimes(1);
    expect(result.items[0].byProject).toEqual({ 'proj-1': 10 });
    expect(result.months).toEqual(['2026-06', '2026-07']);
  });

  it('filtre les allocations sur le client et les mois demandés', async () => {
    await service.dashboardResourceProjectLoad('c1', QUERY);

    expect(prisma.capacityAllocationMonth.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          clientId: 'c1',
          yearMonth: { in: ['2026-06'] },
        }),
      }),
    );
  });

  describe('dashboardWorkTeamLoad', () => {
    function teamAllocationMonth(over: {
      allocationId: string;
      workTeamId: string;
      days: number;
      sourceType?: CapacityAllocationSourceType;
      sourceId?: string | null;
      workTeamStatus?: WorkTeamStatus | null;
    }) {
      return {
        yearMonth: '2026-06',
        days: new Prisma.Decimal(over.days),
        allocation: {
          id: over.allocationId,
          resourceId: null,
          workTeamId: over.workTeamId,
          sourceType: over.sourceType ?? CapacityAllocationSourceType.PROJECT,
          sourceId: over.sourceId ?? 'proj-1',
          workTeam: over.workTeamStatus ? { status: over.workTeamStatus } : null,
        },
      };
    }

    beforeEach(() => {
      prisma.workTeam = { findMany: jest.fn().mockResolvedValue([]) };
      resolve.resolveWorkTeamMonthly = jest.fn().mockResolvedValue({ days: 40 });
    });

    it('renvoie une liste vide sans équipe active, sans requête inutile', async () => {
      const result = await service.dashboardWorkTeamLoad('c1', QUERY);

      expect(result.items).toEqual([]);
      expect(prisma.capacityAllocationMonth.findMany).not.toHaveBeenCalled();
    });

    it('totalise la charge et compte les projets distincts', async () => {
      prisma.workTeam.findMany.mockResolvedValue([{ id: 'wt-1', name: 'Développement' }]);
      prisma.capacityAllocationMonth.findMany.mockResolvedValue([
        teamAllocationMonth({ allocationId: 'a1', workTeamId: 'wt-1', days: 20, sourceId: 'p1' }),
        teamAllocationMonth({ allocationId: 'a2', workTeamId: 'wt-1', days: 10, sourceId: 'p2' }),
        // Même projet : ne double pas le compte.
        teamAllocationMonth({ allocationId: 'a3', workTeamId: 'wt-1', days: 4, sourceId: 'p1' }),
      ]);

      const [team] = (await service.dashboardWorkTeamLoad('c1', QUERY)).items;

      expect(team.allocatedDays).toBe(34);
      expect(team.capacityDays).toBe(40);
      expect(team.availableDays).toBe(6);
      expect(team.loadPercent).toBe(85);
      expect(team.projectCount).toBe(2);
    });

    it('ne compte pas les allocations manuelles comme des projets', async () => {
      prisma.workTeam.findMany.mockResolvedValue([{ id: 'wt-1', name: 'Support' }]);
      prisma.capacityAllocationMonth.findMany.mockResolvedValue([
        teamAllocationMonth({
          allocationId: 'a1',
          workTeamId: 'wt-1',
          days: 8,
          sourceType: CapacityAllocationSourceType.MANUAL,
          sourceId: null,
        }),
      ]);

      const [team] = (await service.dashboardWorkTeamLoad('c1', QUERY)).items;

      expect(team.allocatedDays).toBe(8);
      expect(team.projectCount).toBe(0);
    });

    it('renvoie un taux null sans capacité résolue', async () => {
      prisma.workTeam.findMany.mockResolvedValue([{ id: 'wt-1', name: 'Nouvelle' }]);
      resolve.resolveWorkTeamMonthly.mockResolvedValue({ days: 0 });

      const [team] = (await service.dashboardWorkTeamLoad('c1', QUERY)).items;

      expect(team.capacityDays).toBe(0);
      expect(team.loadPercent).toBeNull();
    });

    it('exclut les allocations d’équipe archivée', async () => {
      prisma.workTeam.findMany.mockResolvedValue([{ id: 'wt-1', name: 'Ancienne' }]);
      prisma.capacityAllocationMonth.findMany.mockResolvedValue([
        teamAllocationMonth({
          allocationId: 'a1',
          workTeamId: 'wt-1',
          days: 20,
          workTeamStatus: WorkTeamStatus.ARCHIVED,
        }),
      ]);

      const [team] = (await service.dashboardWorkTeamLoad('c1', QUERY)).items;

      expect(team.allocatedDays).toBe(0);
      expect(team.projectCount).toBe(0);
    });
  });
});
