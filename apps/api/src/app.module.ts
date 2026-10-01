import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { HelloModule } from './hello/hello.module';

@Module({ imports: [HealthModule, HelloModule] })
export class AppModule {}
