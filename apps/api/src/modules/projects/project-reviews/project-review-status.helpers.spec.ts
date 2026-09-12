import { BadRequestException } from '@nestjs/common';
import {
  assertScheduledUpdatePayloadAllowed,
} from './project-review-status.helpers';

describe('assertScheduledUpdatePayloadAllowed', () => {
  it('autorise contentPayload (atelier prepWorkspace) en préparation', () => {
    expect(() =>
      assertScheduledUpdatePayloadAllowed({
        contentPayload: { prepWorkspace: { mode: 'simple', selectedBlockIds: [] } },
        title: 'Point',
      }),
    ).not.toThrow();
  });

  it('refuse decisions / actionItems / participants', () => {
    expect(() =>
      assertScheduledUpdatePayloadAllowed({ decisions: [] }),
    ).toThrow(BadRequestException);
    expect(() =>
      assertScheduledUpdatePayloadAllowed({ actionItems: [] }),
    ).toThrow(BadRequestException);
    expect(() =>
      assertScheduledUpdatePayloadAllowed({ participants: [] }),
    ).toThrow(BadRequestException);
  });
});
