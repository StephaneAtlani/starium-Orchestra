import * as fs from 'fs';
import * as path from 'path';

describe('strategic vision seed permissions', () => {
  it('déclare le module strategic_vision et ses permissions dans seed.ts', () => {
    const seedPath = path.resolve(__dirname, '../../../../prisma/seed.ts');
    const content = fs.readFileSync(seedPath, 'utf-8');
    expect(content).toContain('code: "strategic_vision"');
    expect(content).toContain('strategic_vision.read');
    expect(content).toContain('strategic_vision.create');
    expect(content).toContain('strategic_vision.update');
    expect(content).toContain('strategic_vision.manage_links');
    expect(content).toContain('ensureStrategicVisionModuleAndPermissions');
  });
});
