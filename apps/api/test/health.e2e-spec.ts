import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createApplication } from '../src/create-application';

describe('Health HTTP boundary', () => {
  let app: NestFastifyApplication | undefined;

  beforeAll(async () => {
    app = await createApplication({ logger: false });
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app?.close();
  });

  function getApp(): NestFastifyApplication {
    if (!app) throw new Error('Test application was not initialized');
    return app;
  }

  it('uses Fastify', () => {
    expect(getApp().getHttpAdapter().getType()).toBe('fastify');
  });

  it('returns only a liveness status', async () => {
    const response = await getApp().inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('application/json');
    expect(response.json()).toEqual({ status: 'ok' });
  });

  it('does not report unknown routes as healthy', async () => {
    const response = await getApp().inject({ method: 'GET', url: '/missing' });
    expect(response.statusCode).toBe(404);
  });

  it('does not accept POST as a health action', async () => {
    const response = await getApp().inject({ method: 'POST', url: '/health' });
    expect(response.statusCode).toBe(404);
  });
});
