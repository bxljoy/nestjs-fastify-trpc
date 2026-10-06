import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { Test, type TestingModule } from '@nestjs/testing';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Campaign persistence in PostgreSQL', () => {
  let moduleRef: TestingModule | undefined;
  let prisma: PrismaService | undefined;
  const createdIds: string[] = [];

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({ imports: [PrismaModule] }).compile();
    await moduleRef.init();
    prisma = moduleRef.get(PrismaService);
  });

  afterAll(async () => {
    try {
      if (prisma && createdIds.length > 0) {
        await prisma.campaign.deleteMany({ where: { id: { in: createdIds } } });
      }
    } finally {
      await moduleRef?.close();
    }
  });

  function getPrisma(): PrismaService {
    if (!prisma) throw new Error('Test database was not initialized');
    return prisma;
  }

  it('persists and retrieves a EUR budget as integer cents', async () => {
    const id = randomUUID();
    createdIds.push(id);
    await getPrisma().campaign.create({
      data: { id, name: 'Campaign A', dailyBudgetMinor: 10000 },
    });
    const campaign = await getPrisma().campaign.findUniqueOrThrow({ where: { id } });
    expect(campaign).toMatchObject({
      id, name: 'Campaign A', dailyBudgetMinor: 10000, currency: 'EUR',
    });
    expect(campaign.createdAt).toBeInstanceOf(Date);
  });

  it('rejects negative budgets at the database boundary', async () => {
    const id = randomUUID();
    createdIds.push(id);
    await expect(getPrisma().campaign.create({
      data: { id, name: 'Invalid budget', dailyBudgetMinor: -1 },
    })).rejects.toMatchObject({
      meta: {
        driverAdapterError: {
          cause: {
            // PostgreSQL SQLSTATE: check_violation, not a connection error.
            originalCode: '23514',
            originalMessage: expect.stringContaining('Campaign_dailyBudgetMinor_nonnegative'),
          },
        },
      },
    });
    expect(await getPrisma().campaign.findUnique({ where: { id } })).toBeNull();
  });
});
