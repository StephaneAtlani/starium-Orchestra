import * as fs from 'fs';
import * as path from 'path';

describe('strategic modules seed permissions', () => {
  const seedPath = path.resolve(__dirname, '../../../../prisma/seed.ts');
  const seedContent = fs.readFileSync(seedPath, 'utf-8');

  it('déclare les modules strategic_vision et strategic_direction_strategy dans seed.ts', () => {
    expect(seedContent).toContain('code: "strategic_vision"');
    expect(seedContent).toContain('strategic_vision.read');
    expect(seedContent).toContain('strategic_vision.create');
    expect(seedContent).toContain('strategic_vision.update');
    expect(seedContent).toContain('strategic_vision.delete');
    expect(seedContent).toContain('strategic_vision.manage_directions');
    expect(seedContent).toContain('strategic_vision.manage_links');
    expect(seedContent).toContain('code: "strategic_direction_strategy"');
    expect(seedContent).toContain('strategic_direction_strategy.read');
    expect(seedContent).toContain('strategic_direction_strategy.create');
    expect(seedContent).toContain('strategic_direction_strategy.update');
    expect(seedContent).toContain('strategic_direction_strategy.review');
    expect(seedContent).toContain('ensureStrategicVisionModuleAndPermissions');
    expect(seedContent).toContain('ensureStrategicDirectionStrategyModuleAndPermissions');
  });

  it('ne déclare pas de doublon de permission strategic_vision.* dans le seed', () => {
    const codes = [
      'strategic_vision.read',
      'strategic_vision.create',
      'strategic_vision.update',
      'strategic_vision.delete',
      'strategic_vision.manage_directions',
      'strategic_vision.manage_links',
    ];
    const block = extractStrategicVisionDefsBlock(seedContent);
    for (const code of codes) {
      const occurrences = block.split(`code: "${code}"`).length - 1;
      expect(occurrences).toBe(1);
    }
  });
});

function extractStrategicVisionDefsBlock(content: string): string {
  const start = content.indexOf('async function ensureStrategicVisionModuleAndPermissions');
  if (start === -1) {
    throw new Error('ensureStrategicVisionModuleAndPermissions not found in seed.ts');
  }
  const end = content.indexOf('async function ', start + 1);
  return end === -1 ? content.slice(start) : content.slice(start, end);
}
