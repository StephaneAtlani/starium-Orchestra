import { NotFoundException } from '@nestjs/common';
import { BudgetLine, PrismaClient } from '@prisma/client';

type PrismaLike = Pick<PrismaClient, 'budgetLine'>;

/**
 * Vérifie que la ligne budgétaire existe et appartient au client.
 * Utilisable avec PrismaService ou le client de transaction ($transaction).
 * @throws NotFoundException si la ligne n'existe pas ou n'appartient pas au client
 */
export async function assertBudgetLineExistsForClient(
  prisma: PrismaLike,
  budgetLineId: string,
  clientId: string,
): Promise<BudgetLine> {
  const line = await prisma.budgetLine.findFirst({
    where: { id: budgetLineId, clientId },
  });
  if (!line) {
    throw new NotFoundException(
      `Budget line "${budgetLineId}" not found or does not belong to client`,
    );
  }
  return line;
}
