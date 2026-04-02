import * as fs from 'fs';
import * as path from 'path';

describe('teams seed permissions', () => {
  it('déclare le module teams et les permissions teams.* dans seed.ts', () => {
    const seedPath = path.resolve(__dirname, '../../../../prisma/seed.ts');
    const content = fs.readFileSync(seedPath, 'utf-8');
    expect(content).toContain('code: "teams"');
    expect(content).toContain('teams.read');
    expect(content).toContain('teams.update');
    expect(content).toContain('teams.manage_scopes');
    expect(content).toContain('ensureClientAdminTeamsModuleRole');
  });
});
