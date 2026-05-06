import * as fs from 'fs';
import * as path from 'path';

describe('strategic modules seed permissions', () => {
  it('déclare les modules strategic_vision et strategic_direction_strategy dans seed.ts', () => {
    const seedPath = path.resolve(__dirname, '../../../../prisma/seed.ts');
    const content = fs.readFileSync(seedPath, 'utf-8');
    expect(content).toContain('code: "strategic_vision"');
    expect(content).toContain('strategic_vision.read');
    expect(content).toContain('strategic_vision.create');
    expect(content).toContain('strategic_vision.update');
    expect(content).toContain('strategic_vision.manage_directions');
    expect(content).toContain('strategic_vision.manage_links');
    expect(content).toContain('code: "strategic_direction_strategy"');
    expect(content).toContain('strategic_direction_strategy.read');
    expect(content).toContain('strategic_direction_strategy.create');
    expect(content).toContain('strategic_direction_strategy.update');
    expect(content).toContain('strategic_direction_strategy.review');
    expect(content).toContain('ensureStrategicVisionModuleAndPermissions');
    expect(content).toContain('ensureStrategicDirectionStrategyModuleAndPermissions');
  });
});
