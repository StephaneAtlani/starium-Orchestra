import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ProjectMicrosoftTeamsProvisioningResolutionType } from '@prisma/client';
import { ResolveProjectMicrosoftTeamsProvisioningDto } from './resolve-project-microsoft-teams-provisioning.dto';

describe('ResolveProjectMicrosoftTeamsProvisioningDto', () => {
  async function validateDto(payload: Record<string, unknown>) {
    const dto = plainToInstance(ResolveProjectMicrosoftTeamsProvisioningDto, payload);
    return validate(dto);
  }

  it('CONFIRMED_NOT_CREATED sans confirmation → rejet', async () => {
    const errors = await validateDto({
      resolutionType:
        ProjectMicrosoftTeamsProvisioningResolutionType.CONFIRMED_NOT_CREATED,
    });
    expect(errors.some((e) => e.property === 'confirmation')).toBe(true);
  });

  it('CONFIRMED_NOT_CREATED avec confirmation=true → OK', async () => {
    const errors = await validateDto({
      resolutionType:
        ProjectMicrosoftTeamsProvisioningResolutionType.CONFIRMED_NOT_CREATED,
      confirmation: true,
    });
    expect(errors).toHaveLength(0);
  });
});
