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
    expect(content).toContain('procedures.archive');
    expect(content).toContain('procedures.export');
  });
});
