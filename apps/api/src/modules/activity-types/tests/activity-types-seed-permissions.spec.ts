import * as fs from 'fs';
import * as path from 'path';

describe('activity_types seed permissions', () => {
  it('déclare le module activity_types et les permissions activity_types.* dans seed.ts', () => {
    const seedPath = path.resolve(__dirname, '../../../../prisma/seed.ts');
    const content = fs.readFileSync(seedPath, 'utf-8');
    expect(content).toContain('code: "activity_types"');
    expect(content).toContain('activity_types.read');
    expect(content).toContain('activity_types.manage');
  });
});
