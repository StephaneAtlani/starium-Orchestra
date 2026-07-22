import { ConflictException } from '@nestjs/common';
import { EmailReservationService } from './email-reservation.service';

describe('EmailReservationService', () => {
  const service = new EmailReservationService();

  it('normalizeCandidates sorts alphabetically', () => {
    expect(service.normalizeCandidates(['z@a.fr', 'a@b.fr', 'a@b.fr'])).toEqual([
      'a@b.fr',
      'z@a.fr',
    ]);
  });

  it('assertEmailAvailableForUser rejects other user login email', async () => {
    const tx = {
      user: {
        findFirst: jest.fn().mockResolvedValue({ id: 'other' }),
      },
      userEmailIdentity: { findFirst: jest.fn() },
    } as any;
    await expect(
      service.assertEmailAvailableForUser(tx, 'user-1', 'a@b.fr'),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
