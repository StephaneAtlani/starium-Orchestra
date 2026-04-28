import { RiskTaxonomyService } from './risk-taxonomy.service';

describe('RiskTaxonomyService.getCatalog', () => {
  it('retourne seulement les domaines V1 par défaut, enrichis avec famille UI', async () => {
    const prisma = {
      riskDomain: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'rd_general',
            code: 'GENERAL',
            name: 'Général',
            description: null,
            isActive: true,
            isVisibleInCatalog: true,
            types: [
              {
                id: 'rt_general',
                code: 'UNCLASSIFIED',
                name: 'Non classé',
                isActive: true,
                isRecommended: true,
                isVisibleInCatalog: true,
              },
            ],
          },
          {
            id: 'rd_legal',
            code: 'LEGAL',
            name: 'Juridique',
            description: null,
            isActive: true,
            isVisibleInCatalog: false,
            types: [
              {
                id: 'rt_legal',
                code: 'CONTRACT_BREACH',
                name: 'Violation de contrat',
                isActive: true,
                isRecommended: false,
                isVisibleInCatalog: false,
              },
            ],
          },
          {
            id: 'rd_lc',
            code: 'LEGAL_COMPLIANCE',
            name: 'Juridique & conformité',
            description: null,
            isActive: true,
            isVisibleInCatalog: true,
            types: [
              {
                id: 'rt_lc',
                code: 'OTHER_LEGAL_COMPLIANCE_RISK',
                name: 'Autre risque',
                isActive: true,
                isRecommended: true,
                isVisibleInCatalog: true,
              },
            ],
          },
        ]),
      },
    } as any;

    const service = new RiskTaxonomyService(prisma);
    jest.spyOn(service, 'ensureForClient').mockResolvedValue(undefined);

    const result = await service.getCatalog('c1');
    expect(result.domains.map((d) => d.code)).toEqual(['GENERAL', 'LEGAL_COMPLIANCE']);
    expect(result.domains[1]).toMatchObject({
      code: 'LEGAL_COMPLIANCE',
      familyCode: 'JURIDIQUE_CONFORMITE',
      familyLabel: 'Juridique & conformité',
      isVisibleInCatalog: true,
    });
  });

  it('inclut les domaines legacy quand includeLegacy=true', async () => {
    const prisma = {
      riskDomain: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'rd_legal',
            code: 'LEGAL',
            name: 'Juridique',
            description: null,
            isActive: true,
            isVisibleInCatalog: false,
            types: [
              {
                id: 'rt_legal',
                code: 'CONTRACT_BREACH',
                name: 'Violation de contrat',
                isActive: true,
                isRecommended: false,
                isVisibleInCatalog: false,
              },
            ],
          },
        ]),
      },
    } as any;

    const service = new RiskTaxonomyService(prisma);
    jest.spyOn(service, 'ensureForClient').mockResolvedValue(undefined);

    const result = await service.getCatalog('c1', true);
    expect(result.domains).toHaveLength(1);
    expect(result.domains[0]).toMatchObject({
      code: 'LEGAL',
      isVisibleInCatalog: false,
    });
  });
});
