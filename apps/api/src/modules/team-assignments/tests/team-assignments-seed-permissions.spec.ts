import * as fs from 'fs';
import * as path from 'path';

describe('team_assignments seed permissions', () => {
  it('déclare le module team_assignments et les permissions team_assignments.* dans seed.ts', () => {
    const seedPath = path.resolve(__dirname, '../../../../prisma/seed.ts');
    const content = fs.readFileSync(seedPath, 'utf-8');
    expect(content).toContain('code: "team_assignments"');
    expect(content).toContain('team_assignments.read');
    expect(content).toContain('team_assignments.manage');
  });
});
