import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CampaignsService } from './campaigns.service';

@Module({
  imports: [PrismaModule],
  providers: [CampaignsService],
  exports: [CampaignsService],
})
export class CampaignsModule {}
