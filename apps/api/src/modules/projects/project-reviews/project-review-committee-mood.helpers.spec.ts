import {
  resolveCommitteeMoodFromReviewRecord,
  resolveCommitteeMoodWithPreviousReviews,
} from './project-review-committee-mood.helpers';

describe('project-review-committee-mood.helpers', () => {
  it('priorise contentPayload sur un snapshot figé obsolète', () => {
    expect(
      resolveCommitteeMoodFromReviewRecord({
        contentPayload: { committeeMood: 'ORANGE' },
        snapshotPayload: {
          schemaVersion: 2,
          review: { committeeMood: 'RED' },
        },
      }),
    ).toBe('ORANGE');
  });

  it('priorise la météo du point courant', () => {
    expect(
      resolveCommitteeMoodWithPreviousReviews('GREEN', [
        {
          contentPayload: { committeeMood: 'RED' },
          snapshotPayload: null,
        },
      ]),
    ).toBe('GREEN');
  });

  it('replie sur la météo du dernier point finalisé antérieur', () => {
    expect(
      resolveCommitteeMoodWithPreviousReviews(null, [
        {
          contentPayload: { committeeMood: 'ORANGE' },
          snapshotPayload: null,
        },
        {
          contentPayload: { committeeMood: 'RED' },
          snapshotPayload: null,
        },
      ]),
    ).toBe('ORANGE');
  });

  it('lit la météo depuis le snapshot figé si contentPayload absent', () => {
    expect(
      resolveCommitteeMoodWithPreviousReviews(null, [
        {
          contentPayload: null,
          snapshotPayload: {
            schemaVersion: 2,
            review: { committeeMood: 'RED' },
          },
        },
      ]),
    ).toBe('RED');
  });
});
