import type { ProjectReviewParticipantApi } from '../types/project.types';

export function allStillExpected(
  participants: Array<Pick<ProjectReviewParticipantApi, 'attendanceStatus'>>,
): boolean {
  return participants.length >= 1 && participants.every((p) => p.attendanceStatus === 'EXPECTED');
}

/** Seul `PRESENT` compte. ABSENT, EXPECTED et EXCUSED ne comptent pas. */
export function presentCount(
  participants: Array<Pick<ProjectReviewParticipantApi, 'attendanceStatus'>>,
): number {
  return participants.filter((p) => p.attendanceStatus === 'PRESENT').length;
}
