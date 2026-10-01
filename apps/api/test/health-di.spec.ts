import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from '../src/app.module';
import { HealthService, type HealthResponse } from '../src/health/health.service';

describe('Health dependency injection', () => {
  it('routes HTTP through the injected provider', async () => {
    const sentinel = { status: 'ok', source: 'test-provider' };
    const getStatus = jest.fn((): HealthResponse => ({ ...sentinel, status: 'ok' }));
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(HealthService)
      .useValue({ getStatus })
      .compile();
    const app = moduleRef.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    try {
      await app.init();
      await app.getHttpAdapter().getInstance().ready();
      const response = await app.inject({ method: 'GET', url: '/health' });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual(sentinel);
      expect(getStatus).toHaveBeenCalledTimes(1);
    } finally {
      await app.close();
    }
  });
});
