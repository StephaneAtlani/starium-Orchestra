import * as fs from 'fs';
import * as path from 'path';

describe('capacity seed permissions', () => {
  const seedPath = path.resolve(__dirname, '../../../../prisma/seed.ts');
  const profilesPath = path.resolve(
    __dirname,
    '../../../../prisma/default-profiles.json',
  );

  it('déclare le module capacity et les 4 permissions capacity.* dans seed.ts', () => {
    const content = fs.readFileSync(seedPath, 'utf-8');
    expect(content).toContain('ensureCapacityModuleAndPermissions');
    expect(content).toContain('code: "capacity"');
    expect(content).toContain('capacity.read');
    expect(content).toContain('capacity.settings.manage');
    expect(content).toContain('capacity.members.manage');
    expect(content).toContain('capacity.allocations.manage');
  });

  it('profils Équipes incluent capacity.* (manage ⇒ read)', () => {
    const profiles = JSON.parse(
      fs.readFileSync(profilesPath, 'utf-8'),
    ) as Array<{
      name: string;
      permissionCodes: string[];
    }>;
    const lecteur = profiles.find((p) => p.name === 'Lecteur Équipes');
    const gestionnaire = profiles.find(
      (p) => p.name === 'Gestionnaire Équipes',
    );
    expect(lecteur?.permissionCodes).toContain('capacity.read');
    expect(gestionnaire?.permissionCodes).toEqual(
      expect.arrayContaining([
        'capacity.read',
        'capacity.settings.manage',
        'capacity.members.manage',
        'capacity.allocations.manage',
      ]),
    );
  });
});
