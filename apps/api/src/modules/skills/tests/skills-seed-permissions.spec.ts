import * as fs from 'fs';
import * as path from 'path';

describe('skills seed permissions', () => {
  it('déclare le module skills et les permissions skills.* dans seed.ts', () => {
    const seedPath = path.resolve(__dirname, '../../../../prisma/seed.ts');
    const content = fs.readFileSync(seedPath, 'utf-8');
    expect(content).toContain('code: "skills"');
    expect(content).toContain('skills.read');
    expect(content).toContain('skills.create');
    expect(content).toContain('skills.update');
    expect(content).toContain('skills.delete');
  });
});
