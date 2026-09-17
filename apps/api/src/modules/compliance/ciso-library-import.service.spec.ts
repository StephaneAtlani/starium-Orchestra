import { BadRequestException } from '@nestjs/common';
import { CisoLibraryImportService } from './ciso-library-import.service';

describe('CisoLibraryImportService', () => {
  const complianceFramework = {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };
  const complianceRequirement = {
    createMany: jest.fn(),
  };
  const prisma = {
    complianceFramework,
    complianceRequirement,
    $transaction: jest.fn(
      async <T>(fn: (tx: {
        complianceFramework: typeof complianceFramework;
        complianceRequirement: typeof complianceRequirement;
      }) => Promise<T>): Promise<T> =>
        fn({ complianceFramework, complianceRequirement }),
    ),
  };
  const auditLogs = { createPlatform: jest.fn() };

  let service: CisoLibraryImportService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CisoLibraryImportService(prisma as never, auditLogs as never);
    jest
      .spyOn(
        service as unknown as { ensureLocalRepo: () => Promise<string> },
        'ensureLocalRepo',
      )
      .mockResolvedValue('/tmp');
  });

  it('refuse un import vide', async () => {
    await expect(service.importLibraries([])).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('importe un framework YAML assessable', async () => {
    const yaml = `
name: ISO Test
version: "1"
locale: fr
objects:
  framework:
    name: ISO Test FW
    version: "2022"
    requirement_nodes:
      - urn: urn:a
        name: Domaine A
        assessable: false
      - urn: urn:a:1
        parent_urn: urn:a
        ref_id: A.1
        name: Contrôle A.1
        description: Desc
        assessable: true
`;
    jest
      .spyOn(
        service as unknown as { readLibraryFile: (p: string) => Promise<string> },
        'readLibraryFile',
      )
      .mockResolvedValue(yaml);

    prisma.complianceFramework.findFirst.mockResolvedValue(null);
    prisma.complianceFramework.create.mockResolvedValue({
      id: 'fw1',
      name: 'ISO Test FW',
      version: '2022',
    });
    prisma.complianceRequirement.createMany.mockResolvedValue({ count: 1 });

    const result = await service.importLibraries([
      'backend/library/libraries/iso-test.yaml',
    ]);

    expect(result.imported).toBe(1);
    expect(result.results[0]?.requirementCount).toBe(1);
    expect(prisma.complianceFramework.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'ISO Test FW',
        version: '2022',
        sourceLibraryPath: 'backend/library/libraries/iso-test.yaml',
      }),
    });
    expect(prisma.complianceRequirement.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          code: 'A.1',
          title: 'Contrôle A.1',
          category: 'Domaine A',
        }),
      ],
    });
    expect(auditLogs.createPlatform).toHaveBeenCalled();
  });

  it('importe en locale FR quand demandée', async () => {
    const yaml = `
name: NIS EN
version: "3"
locale: en
translations:
  fr:
    name: Directive NIS 2
objects:
  framework:
    name: NIS EN
    version: "3"
    translations:
      fr:
        name: Directive NIS 2
    requirement_nodes:
      - urn: urn:a:1
        ref_id: A.1
        name: Control EN
        assessable: true
        translations:
          fr:
            name: Contrôle FR
`;
    jest
      .spyOn(
        service as unknown as { readLibraryFile: (p: string) => Promise<string> },
        'readLibraryFile',
      )
      .mockResolvedValue(yaml);

    prisma.complianceFramework.findFirst.mockResolvedValue(null);
    prisma.complianceFramework.create.mockResolvedValue({
      id: 'fw2',
      name: 'Directive NIS 2',
      version: '3',
    });
    prisma.complianceRequirement.createMany.mockResolvedValue({ count: 1 });

    const result = await service.importLibraries(
      ['backend/library/libraries/nis.yaml'],
      undefined,
      undefined,
      'fr',
    );

    expect(result.imported).toBe(1);
    expect(prisma.complianceFramework.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'Directive NIS 2',
        sourceLibraryPath: 'backend/library/libraries/nis.yaml',
      }),
    });
    expect(prisma.complianceRequirement.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ title: 'Contrôle FR' })],
    });
  });

  it('skippe si sourceLibraryPath déjà connu', async () => {
    const yaml = `
name: ISO Test
version: "1"
locale: fr
objects:
  framework:
    name: ISO Test FW
    version: "2022"
    requirement_nodes:
      - urn: urn:a:1
        ref_id: A.1
        name: Contrôle
        assessable: true
`;
    jest
      .spyOn(
        service as unknown as { readLibraryFile: (p: string) => Promise<string> },
        'readLibraryFile',
      )
      .mockResolvedValue(yaml);

    prisma.complianceFramework.findFirst.mockResolvedValueOnce({
      id: 'fw-existing',
      name: 'Directive NIS 2',
      version: '3',
      sourceLibraryPath: 'backend/library/libraries/iso-test.yaml',
    });

    const result = await service.importLibraries([
      'backend/library/libraries/iso-test.yaml',
    ]);
    expect(result.skipped).toBe(1);
    expect(result.imported).toBe(0);
    expect(prisma.complianceFramework.create).not.toHaveBeenCalled();
  });

  it('skippe un fichier sans framework', async () => {
    const yaml = `
name: Risk matrix only
version: "1"
objects:
  risk_matrix: {}
`;
    jest
      .spyOn(
        service as unknown as { readLibraryFile: (p: string) => Promise<string> },
        'readLibraryFile',
      )
      .mockResolvedValue(yaml);

    const result = await service.importLibraries([
      'backend/library/libraries/risk.yaml',
    ]);
    expect(result.skipped).toBe(1);
    expect(result.imported).toBe(0);
  });

  it('refuse mapping* / workflow*', async () => {
    const result = await service.importLibraries([
      'backend/library/libraries/mapping-foo.yaml',
    ]);
    expect(result.errors).toBe(1);
  });
});
