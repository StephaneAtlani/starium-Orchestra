import * as fs from 'fs';
import * as path from 'path';

describe('procedures seed permissions', () => {
  it('déclare le module procedures et les permissions procedures.* dans seed.ts', () => {
    const seedPath = path.resolve(__dirname, '../../../../prisma/seed.ts');
    const content = fs.readFileSync(seedPath, 'utf-8');
    expect(content).toContain('code: "procedures"');
    expect(content).toContain('procedures.read');
    expect(content).toContain('procedures.create');
    expect(content).toContain('procedures.update');
    expect(content).toContain('procedures.publish');
    expect(content).toContain('procedures.configure');
    expect(content).toContain('procedures.archive');
    expect(content).toContain('procedures.export');
    expect(content).toContain('ensureClientAdminProceduresModuleRole');
    expect(content).toContain('ensureEnabledClientModulesForAllClients');
  });

  it('expose Lecteur / Contributeur procédures dans default-profiles.json', () => {
    const profilesPath = path.resolve(
      __dirname,
      '../../../../prisma/default-profiles.json',
    );
    const profiles = JSON.parse(fs.readFileSync(profilesPath, 'utf-8')) as Array<{
      name: string;
      permissionCodes: string[];
    }>;
    const lecteur = profiles.find((p) => p.name === 'Lecteur procédures');
    const contributeur = profiles.find((p) => p.name === 'Contributeur procédures');
    expect(lecteur).toBeDefined();
    expect(lecteur!.permissionCodes).toEqual(
      expect.arrayContaining(['procedures.read', 'procedures.export']),
    );
    expect(lecteur!.permissionCodes).not.toContain('procedures.update');
    expect(lecteur!.permissionCodes).not.toContain('procedures.configure');
    expect(contributeur).toBeDefined();
    expect(contributeur!.permissionCodes).toEqual(
      expect.arrayContaining([
        'procedures.read',
        'procedures.create',
        'procedures.update',
        'procedures.archive',
      ]),
    );
    expect(contributeur!.permissionCodes).not.toContain('procedures.publish');
    expect(contributeur!.permissionCodes).not.toContain('procedures.configure');
  });
});
