import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateProjectMicrosoftLinkDto } from './update-project-microsoft-link.dto';

describe('UpdateProjectMicrosoftLinkDto — plannerPlanId', () => {
  async function validateDto(payload: Record<string, unknown>) {
    const dto = plainToInstance(UpdateProjectMicrosoftLinkDto, payload);
    return validate(dto);
  }

  it('isEnabled=true sans plannerPlanId → rejet', async () => {
    const errors = await validateDto({
      isEnabled: true,
      teamId: 'team-1',
      channelId: 'ch-1',
    });
    expect(errors.some((e) => e.property === 'plannerPlanId')).toBe(true);
  });

  it('isEnabled=true plannerPlanId vide → rejet', async () => {
    for (const plannerPlanId of ['', ' ', null]) {
      const errors = await validateDto({
        isEnabled: true,
        teamId: 'team-1',
        channelId: 'ch-1',
        plannerPlanId,
      });
      expect(errors.some((e) => e.property === 'plannerPlanId')).toBe(true);
    }
  });

  it('isEnabled=true plannerPlanId valide → OK', async () => {
    const errors = await validateDto({
      isEnabled: true,
      teamId: 'team-1',
      channelId: 'ch-1',
      plannerPlanId: 'plan-abc',
    });
    expect(errors).toHaveLength(0);
  });
});
