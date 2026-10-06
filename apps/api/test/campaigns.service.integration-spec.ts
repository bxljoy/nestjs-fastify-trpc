import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { Test, type TestingModule } from '@nestjs/testing';
import { CampaignsModule } from '../src/campaigns/campaigns.module';
import { CampaignsService } from '../src/campaigns/campaigns.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Campaign listing', () => {
  let moduleRef: TestingModule | undefined;
  let prisma: PrismaService;
  let campaigns: CampaignsService;
  const createdIds: string[] = [];

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [CampaignsModule],
      // A parent-module consumer proves CampaignsModule exports the service.
      providers: [{
        provide: 'CAMPAIGNS_CONSUMER',
        useFactory: (service: CampaignsService) => service,
        inject: [CampaignsService],
      }],
    }).compile();
    await moduleRef.init();
    prisma = moduleRef.get(PrismaService);
    campaigns = moduleRef.get<CampaignsService>('CAMPAIGNS_CONSUMER');
  });

  beforeEach(async () => {
    // Fail rather than delete unfamiliar data. Run this disposable DB suite serially.
    expect(await prisma.campaign.count()).toBe(0);
  });

  afterEach(async () => {
    if (prisma && createdIds.length > 0) {
      await prisma.campaign.deleteMany({ where: { id: { in: createdIds } } });
      createdIds.length = 0;
    }
  });

  afterAll(async () => {
    await moduleRef?.close();
  });

  async function insertCampaigns(count: number): Promise<void> {
    const prefix = randomUUID().slice(0, 24);
    const rows = Array.from({ length: count }, (_, index) => ({
      id: `${prefix}${index.toString(16).padStart(12, '0')}`,
      name: `Campaign ${index}`,
      dailyBudgetMinor: 10000,
      // Every pair ties on time. Insert in reverse to challenge the ID tie-breaker.
      createdAt: new Date(Date.UTC(2026, 0, 1) + Math.floor(index / 2) * 1000),
    }));
    createdIds.push(...rows.map((row) => row.id));
    await prisma.campaign.createMany({ data: rows.reverse() });
  }

  it('returns an empty array when no campaigns exist', async () => {
    expect(await campaigns.list()).toEqual([]);
  });

  it('defaults to the first 20 campaigns in stable ascending order', async () => {
    await insertCampaigns(21);
    const rows = await campaigns.list();
    expect(rows.map((row) => row.id)).toEqual(createdIds.slice(0, 20));
    expect(rows[0]).toMatchObject({ name: 'Campaign 0', dailyBudgetMinor: 10000, currency: 'EUR' });
  });

  it('applies limit and offset across equal timestamps', async () => {
    await insertCampaigns(5);
    expect((await campaigns.list({ limit: 2, offset: 1 })).map((row) => row.id))
      .toEqual([createdIds[1], createdIds[2]]);
    expect((await campaigns.list({ limit: 2, offset: 3 })).map((row) => row.id))
      .toEqual([createdIds[3], createdIds[4]]);
  });

  it('accepts the maximum page size without returning a 101st row', async () => {
    await insertCampaigns(101);
    expect((await campaigns.list({ limit: 100 })).map((row) => row.id))
      .toEqual(createdIds.slice(0, 100));
  });

  it('returns an empty page beyond the last campaign', async () => {
    await insertCampaigns(1);
    expect(await campaigns.list({ limit: 1, offset: 1 })).toEqual([]);
    expect(await campaigns.list({ offset: 2147483647 })).toEqual([]);
  });

  it.each([0, -1, 101, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
    'rejects invalid limit %s with a RangeError', async (limit) => {
      await expect(campaigns.list({ limit })).rejects.toBeInstanceOf(RangeError);
    },
  );

  it.each([-1, 0.5, NaN, Infinity, 2147483648, Number.MAX_SAFE_INTEGER + 1])(
    'rejects invalid offset %s with a RangeError', async (offset) => {
      await expect(campaigns.list({ offset })).rejects.toBeInstanceOf(RangeError);
    },
  );
});
