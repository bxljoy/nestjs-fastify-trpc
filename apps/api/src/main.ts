import { createApplication } from './create-application';

async function bootstrap(): Promise<void> {
  const app = await createApplication();
  app.enableShutdownHooks();
  try {
    await app.listen(3000, '127.0.0.1');
  } catch (error) {
    await app.close();
    throw error;
  }
}

bootstrap().catch((error: unknown) => {
  console.error('API startup failed', error);
  process.exitCode = 1;
});
