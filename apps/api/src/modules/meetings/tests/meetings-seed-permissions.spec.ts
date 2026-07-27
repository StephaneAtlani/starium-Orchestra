import * as fs from 'fs';
import * as path from 'path';
import { SYSTEM_MEETING_TEMPLATE_CODES } from '../lib/system-meeting-templates';

/**
 * RFC-MEET-001 §4.11 — conformité du seed.
 *
 * Ces tests lisent `seed.ts` et `default-profiles.json` en texte : ils
 * garantissent qu'on ne peut pas livrer le module sans déclarer son catalogue
 * de permissions ni ses modèles système.
 */
describe('meetings — seed, permissions et modèles système', () => {
  const seedPath = path.resolve(__dirname, '../../../../prisma/seed.ts');
  const profilesPath = path.resolve(
    __dirname,
    '../../../../prisma/default-profiles.json',
  );

  const readSeed = () => fs.readFileSync(seedPath, 'utf-8');
  const readProfiles = () =>
    JSON.parse(fs.readFileSync(profilesPath, 'utf-8')) as Array<{
      name: string;
      permissionCodes: string[];
    }>;

  it('déclare le module meetings et ses 5 permissions dans seed.ts', () => {
    const content = readSeed();
    expect(content).toContain('ensureMeetingsModuleAndPermissions');
    expect(content).toContain('code: "meetings"');
    expect(content).toContain('meetings.read');
    expect(content).toContain('meetings.create');
    expect(content).toContain('meetings.update');
    expect(content).toContain('meetings.conduct');
    expect(content).toContain('meetings.templates.manage');
  });

  it('appelle ensureMeetingsModuleAndPermissions et ensureSystemMeetingTemplates', () => {
    const content = readSeed();
    expect(content).toContain('await ensureMeetingsModuleAndPermissions();');
    expect(content).toContain('await ensureSystemMeetingTemplates();');
  });

  it('instancie les modèles système après la création des clients', () => {
    const content = readSeed();
    const modules = content.indexOf(
      'await ensureEnabledClientModulesForAllClients();',
    );
    const templates = content.indexOf('await ensureSystemMeetingTemplates();');
    expect(modules).toBeGreaterThan(-1);
    expect(templates).toBeGreaterThan(modules);
  });

  it('dote les profils par défaut de meetings.*', () => {
    const profiles = readProfiles();
    const directeur = profiles.find((p) => p.name === 'Directeur');
    const chefDeProjet = profiles.find((p) => p.name === 'Chef de projet');
    const lecteurCycles = profiles.find(
      (p) => p.name === 'Lecteur cycles de pilotage',
    );

    expect(directeur?.permissionCodes).toEqual(
      expect.arrayContaining([
        'meetings.read',
        'meetings.create',
        'meetings.update',
        'meetings.conduct',
        'meetings.templates.manage',
      ]),
    );
    expect(chefDeProjet?.permissionCodes).toEqual(
      expect.arrayContaining([
        'meetings.read',
        'meetings.create',
        'meetings.update',
        'meetings.conduct',
      ]),
    );
    // Un profil de lecture ne doit jamais recevoir de droit de conduite.
    expect(lecteurCycles?.permissionCodes).toContain('meetings.read');
    expect(lecteurCycles?.permissionCodes).not.toContain('meetings.conduct');
    expect(lecteurCycles?.permissionCodes).not.toContain(
      'meetings.templates.manage',
    );
  });

  it('livre les 9 modèles système attendus, dont CODIR, COPIL et COPRO', () => {
    expect(SYSTEM_MEETING_TEMPLATE_CODES).toHaveLength(9);
    expect(SYSTEM_MEETING_TEMPLATE_CODES).toEqual(
      expect.arrayContaining(['CODIR', 'COPIL', 'COPRO']),
    );
    // Les codes sont uniques : ils servent de clé d'upsert par client.
    expect(new Set(SYSTEM_MEETING_TEMPLATE_CODES).size).toBe(
      SYSTEM_MEETING_TEMPLATE_CODES.length,
    );
  });
});
