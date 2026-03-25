import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { UpdateProjectMicrosoftLinkDto } from './update-project-microsoft-link.dto';

describe('UpdateProjectMicrosoftLinkDto', () => {
  it('whitelist + forbidNonWhitelisted : accepte useMicrosoftPlannerBuckets', () => {
    const plain = {
      isEnabled: true,
      teamId: 'team-1',
      channelId: 'ch-1',
      plannerPlanId: 'plan-1',
      useMicrosoftPlannerBuckets: true,
    };
    const inst = plainToInstance(UpdateProjectMicrosoftLinkDto, plain);
    const errors = validateSync(inst, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errors).toHaveLength(0);
    expect(inst.useMicrosoftPlannerBuckets).toBe(true);
  });

  it('whitelist + forbidNonWhitelisted : accepte useMicrosoftPlannerLabels', () => {
    const plain = {
      isEnabled: true,
      teamId: 'team-1',
      channelId: 'ch-1',
      plannerPlanId: 'plan-1',
      useMicrosoftPlannerLabels: true,
    };
    const inst = plainToInstance(UpdateProjectMicrosoftLinkDto, plain);
    const errors = validateSync(inst, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errors).toHaveLength(0);
    expect(inst.useMicrosoftPlannerLabels).toBe(true);
  });

  it('accepte useMicrosoftPlannerLabels: false', () => {
    const inst = plainToInstance(UpdateProjectMicrosoftLinkDto, {
      isEnabled: true,
      teamId: 'team-1',
      channelId: 'ch-1',
      plannerPlanId: 'plan-1',
      useMicrosoftPlannerLabels: false,
    });
    const errors = validateSync(inst, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errors).toHaveLength(0);
    expect(inst.useMicrosoftPlannerLabels).toBe(false);
  });

  it('accepte useMicrosoftPlannerBuckets: false', () => {
    const inst = plainToInstance(UpdateProjectMicrosoftLinkDto, {
      isEnabled: true,
      teamId: 'team-1',
      channelId: 'ch-1',
      plannerPlanId: 'plan-1',
      useMicrosoftPlannerBuckets: false,
    });
    const errors = validateSync(inst, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errors).toHaveLength(0);
    expect(inst.useMicrosoftPlannerBuckets).toBe(false);
  });
});
