import { Injectable } from '@nestjs/common';
import type { Campaign } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface ListCampaignsOptions {
  limit?: number;
  offset?: number;
}

@Injectable()
export class CampaignsService {
  constructor(private readonly prisma: PrismaService) {}

  async list({ limit = 20, offset = 0 }: ListCampaignsOptions = {}): Promise<Campaign[]> {
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new RangeError('limit must be an integer between 1 and 100');
    }
    // Prisma's skip input is a signed 32-bit integer; disallow backwards paging.
    if (!Number.isInteger(offset) || offset < 0 || offset > 2147483647) {
      throw new RangeError('offset must be an integer between 0 and 2147483647');
    }

    return this.prisma.campaign.findMany({
      take: limit,
      skip: offset,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
  }
}
