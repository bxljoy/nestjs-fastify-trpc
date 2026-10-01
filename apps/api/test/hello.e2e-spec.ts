import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createApplication } from '../src/create-application';

describe('Hello HTTP boundary', () => {
  let app: NestFastifyApplication | undefined;

  beforeAll(async () => {
    app = await createApplication({ logger: false });
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('returns the combined health status and greeting', async () => {
    if (!app) throw new Error('Test application was not initialized');

    const response = await app.inject({ method: 'GET', url: '/hello' });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('application/json');
    expect(response.json()).toEqual({
      status: 'ok',
      message: 'Hello, NestJS',
    });
  });
});
