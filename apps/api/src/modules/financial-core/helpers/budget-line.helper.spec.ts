import { NotFoundException } from '@nestjs/common';
import { assertBudgetLineExistsForClient } from './budget-line.helper';

describe('assertBudgetLineExistsForClient', () => {
  const clientId = 'client-1';
  const budgetLineId = 'line-1';
  const line = { id: budgetLineId, clientId, name: 'Line' };

  it('retourne la ligne si elle existe pour le client', async () => {
    const prisma = {
      budgetLine: {
        findFirst: jest.fn().mockResolvedValue(line),
      },
    };
    const result = await assertBudgetLineExistsForClient(
      prisma as any,
      budgetLineId,
      clientId,
    );
    expect(result).toEqual(line);
    expect(prisma.budgetLine.findFirst).toHaveBeenCalledWith({
      where: { id: budgetLineId, clientId },
    });
  });

  it('lance NotFoundException si la ligne n\'existe pas', async () => {
    const prisma = {
      budgetLine: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    await expect(
      assertBudgetLineExistsForClient(prisma as any, budgetLineId, clientId),
    ).rejects.toThrow(NotFoundException);
  });

  it('lance NotFoundException si la ligne appartient à un autre client', async () => {
    const prisma = {
      budgetLine: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    await expect(
      assertBudgetLineExistsForClient(prisma as any, budgetLineId, 'other-client'),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.budgetLine.findFirst).toHaveBeenCalledWith({
      where: { id: budgetLineId, clientId: 'other-client' },
    });
  });
});
