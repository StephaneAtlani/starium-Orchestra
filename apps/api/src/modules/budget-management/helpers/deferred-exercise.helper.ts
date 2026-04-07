import { BadRequestException } from '@nestjs/common';
import {
  BudgetEnvelopeStatus,
  BudgetLineStatus,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

export async function resolveDeferredExerciseIdForLine(
  prisma: PrismaService,
  clientId: string,
  dto: { status?: BudgetLineStatus; deferredToExerciseId?: string | null },
  existing: { status: BudgetLineStatus; deferredToExerciseId: string | null },
): Promise<string | null> {
  const nextStatus = dto.status ?? existing.status;

  if (
    dto.deferredToExerciseId !== undefined &&
    dto.deferredToExerciseId !== null &&
    nextStatus !== BudgetLineStatus.DEFERRED
  ) {
    throw new BadRequestException(
      'deferredToExerciseId is only allowed when status is DEFERRED',
    );
  }

  if (nextStatus !== BudgetLineStatus.DEFERRED) {
    return null;
  }

  const raw =
    dto.deferredToExerciseId !== undefined
      ? dto.deferredToExerciseId
      : existing.deferredToExerciseId;

  if (raw == null || String(raw).trim() === '') {
    throw new BadRequestException(
      'deferredToExerciseId is required when status is DEFERRED',
    );
  }

  const ex = await prisma.budgetExercise.findFirst({
    where: { id: raw, clientId },
  });
  if (!ex) {
    throw new BadRequestException(
      'Deferred target exercise not found for this client',
    );
  }
  return raw;
}

export async function resolveDeferredExerciseIdForEnvelope(
  prisma: PrismaService,
  clientId: string,
  dto: { status?: BudgetEnvelopeStatus; deferredToExerciseId?: string | null },
  existing: {
    status: BudgetEnvelopeStatus;
    deferredToExerciseId: string | null;
  },
): Promise<string | null> {
  const nextStatus = dto.status ?? existing.status;

  if (
    dto.deferredToExerciseId !== undefined &&
    dto.deferredToExerciseId !== null &&
    nextStatus !== BudgetEnvelopeStatus.DEFERRED
  ) {
    throw new BadRequestException(
      'deferredToExerciseId is only allowed when status is DEFERRED',
    );
  }

  if (nextStatus !== BudgetEnvelopeStatus.DEFERRED) {
    return null;
  }

  const raw =
    dto.deferredToExerciseId !== undefined
      ? dto.deferredToExerciseId
      : existing.deferredToExerciseId;

  if (raw == null || String(raw).trim() === '') {
    throw new BadRequestException(
      'deferredToExerciseId is required when status is DEFERRED',
    );
  }

  const ex = await prisma.budgetExercise.findFirst({
    where: { id: raw, clientId },
  });
  if (!ex) {
    throw new BadRequestException(
      'Deferred target exercise not found for this client',
    );
  }
  return raw;
}
