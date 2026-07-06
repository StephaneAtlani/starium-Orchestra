import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { InviteProjectReviewDto } from './invite-project-review.dto';

describe('InviteProjectReviewDto (Phase 3)', () => {
  it('refuse channels contenant teams', async () => {
    const dto = plainToInstance(InviteProjectReviewDto, {
      channels: ['teams'],
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('accepte channels in_app et email', async () => {
    const dto = plainToInstance(InviteProjectReviewDto, {
      channels: ['in_app', 'email'],
      createTeamsMeeting: true,
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});
