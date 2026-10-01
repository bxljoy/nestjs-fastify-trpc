# Budget Review Lesson 01 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task in the current session. Steps use checkbox (`- [x]`) syntax for tracking. The user has chosen assistant implementation followed by explanation and an explicit continuation gate. Do not automatically proceed to another lesson.

**Goal:** Build a small pnpm workspace containing a NestJS application running on Fastify, with a tested `GET /health` endpoint, then teach its complete request and dependency flow.

**Architecture:** A single API application with an AppModule importing a HealthModule. A controller delegates to a Nest-injected provider; a shared application factory keeps runtime and request tests on the same Fastify setup. This is a liveness demonstration, not a database readiness check.

**Tech Stack:** pnpm, TypeScript, NestJS, Fastify, Jest, ts-jest. No database, tRPC, or frontend dependencies in this lesson.

**Spec:** `docs/superpowers/specs/2026-09-24-budget-review-v1-design.md` (approved).

## Execution record — 2026-09-24

Implementation and fresh read-only review completed. The code blocks below preserve the original plan; actual configuration differs in these verified ways:

- The initial Node requirement was `>=24.9.0 <25` for Jest interoperability. After adding Nest CLI, the project minimum was corrected to `>=24.15.0 <25` to cover its locked development dependencies. Verification used Node 24.21.0, installed and made the nvm default with explicit user approval.
- Jest's test command additionally uses `--experimental-vm-modules`. Its experimental warning remains visible; production startup requires no flag.
- ts-jest is pinned to 29.4.12 instead of 29.4.13 to avoid bypassing release-age protection. @types/node is pinned to 24.13.6.
- Native install scripts for @parcel/watcher and unrs-resolver are explicitly denied; their packaged binaries were verified on this host.
- No Git repository was initialized and no commit was made; the conditional commit step is not applicable. Local execution evidence is retained in ignored `.superpowers/` scratch storage.

Verification: five Jest tests, strict typecheck, build, frozen install, open-handle detection, and compiled HTTP/startup/shutdown check passed. The package-manager audit reported zero known advisories. Independent read-only review found no issues; reviewer relied on parent execution evidence. Teaching notes are in `docs/lessons/01-nestjs-fastify-foundation.md`. Pause here for the learner's questions; later lessons remain unauthorized.

## Global Constraints

- “The assistant implements one small, tested increment at a time, explains its purpose, code flow, alternatives, failure modes, and verification, answers questions, then waits for explicit permission before starting the next increment.”
- “Learning and comprehension take priority over feature count.”
- “Local development only, with one demo workspace and no authentication or multi-tenancy.”
- “Approval must not change the campaign budget.”
- “The UI says \"Approved — awaiting execution,\" never \"Applied.\"”
- “Avoid generic repositories and unnecessary abstraction layers.”
- “Start with a conventional NestJS health controller to learn bootstrap, modules, providers, dependency injection, and the Fastify adapter.”
- “Version compatibility and exact package APIs must be checked against official documentation before installation or implementation.”

This is an independently runnable foundation plan, not a complete implementation plan for V1. Product acceptance remains governed by the spec. The coverage map below explicitly allocates the remaining work to subsequent lessons, which require their own plans and permission.

## Review Focus

1. Tests accidentally use Express while runtime uses Fastify: assert adapter type and reuse the application factory.
2. A success response conceals missing DI wiring: override the actual service provider and prove its response reaches HTTP.
3. Unknown routes return a misleading success: assert a nonexistent path returns 404.
4. Health accidentally accepts a state-changing request: assert POST /health returns 404.
5. Jest transformation passes while compiled startup is broken: build and run a real loopback HTTP smoke check, then confirm shutdown.

## Environment and source checks

Read-only planning inspection found Node `v22.15.0` and pnpm `11.22.0`; nothing was installed. Propose Node 24 LTS for this project, with engine `>=24 <25` and `.node-version` containing `24`. This is a new project tooling choice, not an assertion that NestJS itself requires Node 24. Do not change global Node configuration. Before implementation, select a compatible runtime using the user's existing version manager; if unavailable, stop and ask before installing one. Do not silence engine warnings.

Registry metadata checked during planning:

- Nest common/core/platform-fastify/testing: `12.1.0`, same version across the group.
- The Fastify adapter depends on Fastify `5.12.5`; no direct Fastify dependency is necessary until code imports from it directly.
- TypeScript `5.9.3`; deliberately not latest TypeScript 7, because ts-jest `29.4.13` declares TypeScript `<7`.
- Jest `30.5.2`, ts-jest `29.4.13`, @types/jest `30.0.0`, @types/node `24` major.
- reflect-metadata `0.2.2`, rxjs `7.8.2`, pnpm `11.22.0`.

These are proposed reproducible choices, not a claim that installation or runtime tests already passed. Recheck engine/peer requirements at execution, pin direct dependencies, and retain the generated lockfile. Stop on compatibility problems rather than silently changing framework majors. These versions are project-specific learning choices.

Official sources:

- Nest testing: https://docs.nestjs.com/fundamentals/testing
- Official Markdown source consulted: https://github.com/nestjs/docs.nestjs.com/blob/master/content/fundamentals/unit-testing.md — Fastify initialization, `ready()`, `inject()`, provider overrides, and teardown.
- Nest providers: https://docs.nestjs.com/providers
- Nest modules: https://docs.nestjs.com/modules
- Nest Fastify: https://docs.nestjs.com/techniques/performance
- pnpm workspaces: https://pnpm.io/pnpm-workspace_yaml

The Nest website pages could not be extracted during planning; the official testing Markdown source was readable. Recheck relevant Nest 12 APIs before implementing; do not blindly copy its latest starter, which currently uses a different test runner from our agreed Jest stack.

## File map

Create only these application/configuration files in this lesson:

| Path | Responsibility |
|---|---|
| `package.json` | Private workspace and root commands |
| `pnpm-workspace.yaml` | Workspace membership |
| `pnpm-lock.yaml` | Installation resolution, generated by pnpm |
| `.node-version` | Node major selection |
| `.gitignore` | Exclude dependencies, build outputs, secrets |
| `apps/api/package.json` | API dependencies and commands |
| `apps/api/tsconfig.json` | Strict typechecking, decorator metadata, test types |
| `apps/api/tsconfig.build.json` | Source-only compilation |
| `apps/api/jest.config.cjs` | Jest TypeScript transformation |
| `apps/api/src/app.module.ts` | Root module composition |
| `apps/api/src/create-application.ts` | Shared Nest/Fastify creation |
| `apps/api/src/main.ts` | Initialize, listen on loopback, enable shutdown |
| `apps/api/src/health/health.service.ts` | Typed liveness result |
| `apps/api/src/health/health.controller.ts` | GET /health boundary |
| `apps/api/src/health/health.module.ts` | Register controller and provider |
| `apps/api/test/health.e2e-spec.ts` | Real Nest/Fastify routing assertions |
| `apps/api/test/health-di.spec.ts` | Provider replacement through HTTP |
| `README.md` | Setup and verified commands |
| `docs/lessons/01-nestjs-fastify-foundation.md` | Walkthrough and learning checkpoint |

No empty frontend or domain modules. No tRPC contracts package yet. Use `tsc` directly to make compilation and decorator metadata visible; Nest CLI is not required for this lesson. CommonJS is a deliberate backend-only simplification for Jest; it does not force the future Vite frontend to use CommonJS.

## Task 1: Deliver a tested NestJS/Fastify health endpoint

**Consumes:** Empty application workspace plus the approved spec; a compatible Node runtime and pnpm.

**Produces:**

- `createApplication(options?: NestApplicationOptions): Promise<NestFastifyApplication>` returns a constructed, not-yet-initialized Nest application, without opening a port.
- `HealthService.getStatus(): HealthResponse`, with `HealthResponse = { status: 'ok' }`.
- `GET /health` → 200 JSON `{ "status": "ok" }`.
- Root `pnpm test`, `pnpm typecheck`, `pnpm build`, and `pnpm start` commands.

### Step 1: Establish reproducible tooling

- [x] Confirm the runtime choice and inspect available version-manager configuration without modifying the user's global environment. Run `node --version`, `pnpm --version`, and package metadata checks. Resolve any engine mismatch before installation.
- [x] Create root configuration:

`package.json`:

```json
{
  "name": "budget-review",
  "private": true,
  "packageManager": "pnpm@11.22.0",
  "engines": { "node": ">=24 <25" },
  "scripts": {
    "test": "pnpm --filter @budget-review/api test",
    "typecheck": "pnpm --filter @budget-review/api typecheck",
    "build": "pnpm --filter @budget-review/api build",
    "start": "pnpm --filter @budget-review/api start"
  }
}
```

`pnpm-workspace.yaml`:

```yaml
packages:
  - apps/*
```

`.node-version`:

```text
24
```

`.gitignore`:

```gitignore
node_modules/
dist/
coverage/
.env
.env.*
!.env.example
.DS_Store
```

- [x] Create `apps/api/package.json`:

```json
{
  "name": "@budget-review/api",
  "version": "0.0.0",
  "private": true,
  "type": "commonjs",
  "scripts": {
    "test": "jest --runInBand",
    "typecheck": "tsc --noEmit -p tsconfig.json",
    "build": "tsc -p tsconfig.build.json",
    "start": "node dist/main.js"
  }
}
```

- [x] Install dependencies only at this execution step, not while reviewing the plan:

```bash
pnpm --filter @budget-review/api add --save-exact @nestjs/common@12.1.0 @nestjs/core@12.1.0 @nestjs/platform-fastify@12.1.0 reflect-metadata@0.2.2 rxjs@7.8.2
pnpm --filter @budget-review/api add -D --save-exact @nestjs/testing@12.1.0 typescript@5.9.3 jest@30.5.2 ts-jest@29.4.13 @types/jest@30.0.0 @types/node@24
```

Record the exact resolved @types/node patch. Review dependency/engine/build-script warnings; do not indiscriminately approve dependency lifecycle scripts or run forced audit fixes.

- [x] Create `apps/api/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "Node",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "types": ["node", "jest"],
    "sourceMap": true
  },
  "include": ["src/**/*.ts", "test/**/*.ts"]
}
```

`apps/api/tsconfig.build.json`:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist",
    "types": ["node"],
    "declaration": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["test", "dist", "node_modules"]
}
```

`apps/api/jest.config.cjs`:

```javascript
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/test/**/*.spec.ts', '<rootDir>/test/**/*.e2e-spec.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
  clearMocks: true,
};
```

### Step 2: Establish the real routing failure

- [x] Create the initial empty `apps/api/src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';

@Module({})
export class AppModule {}
```

- [x] Create `apps/api/src/create-application.ts`:

```typescript
import 'reflect-metadata';
import type { NestApplicationOptions } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';

export function createApplication(
  options: NestApplicationOptions = {},
): Promise<NestFastifyApplication> {
  return NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { ...options, abortOnError: false },
  );
}
```

- [x] Create `apps/api/test/health.e2e-spec.ts` before implementing the health route:

```typescript
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
```

- [x] Run `pnpm --filter @budget-review/api test --runTestsByPath test/health.e2e-spec.ts`. Expected: the health GET assertion fails with actual 404 versus expected 200; other routing assertions pass. Fix harness failures first; a missing dependency or compiler crash is not the intended red result.

### Step 3: Implement the smallest controller/provider/module

- [x] Create `apps/api/src/health/health.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';

export type HealthResponse = { status: 'ok' };

@Injectable()
export class HealthService {
  getStatus(): HealthResponse {
    return { status: 'ok' };
  }
}
```

- [x] Create `apps/api/src/health/health.controller.ts`:

```typescript
import { Controller, Get } from '@nestjs/common';
import { HealthService, type HealthResponse } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  getHealth(): HealthResponse {
    return this.healthService.getStatus();
  }
}
```

The HealthService import must be a runtime value, not `import type`, because constructor injection uses its class token and emitted metadata.

- [x] Create `apps/api/src/health/health.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({ controllers: [HealthController], providers: [HealthService] })
export class HealthModule {}
```

- [x] Replace the empty AppModule metadata:

```typescript
import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';

@Module({ imports: [HealthModule] })
export class AppModule {}
```

- [x] Rerun the request tests, then `pnpm typecheck`. Expected: all assertions and typechecking pass.

### Step 4: Prove the provider wiring, not just the JSON

- [x] Create `apps/api/test/health-di.spec.ts`:

```typescript
import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
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
    const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
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
```

- [x] Demonstrate the test's discriminating power: temporarily return `{ status: 'ok' }` directly from the controller, run this test and observe failure, then restore delegation and rerun to green. Do not leave the temporary change behind. The extra field exists only in the test override to distinguish provider output; the real endpoint test still requires the exact public response.

### Step 5: Verify compiled startup and shutdown

- [x] Create `apps/api/src/main.ts`:

```typescript
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
```

Port 3000 is an explicit temporary local convention; defer environment configuration until it is needed. Do not bind publicly to `0.0.0.0` for this unauthenticated lesson.

- [x] Run the checks:

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm typecheck
pnpm build
pnpm --filter @budget-review/api exec jest --runInBand --detectOpenHandles
```

Expected: successful installation, all tests green, no type errors, successful source-only compilation, and Jest exits without leaked application handles. Do not use `--forceExit` to hide leaks.

- [x] From the root, execute a bounded real HTTP smoke check using Node 24, without opening a terminal pane or leaving a server running:

```bash
node <<'NODE'
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { createServer } = require('node:net');
const { setTimeout: delay } = require('node:timers/promises');
(async () => {
  await new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once('error', reject);
    probe.listen(3000, '127.0.0.1', () => probe.close(error => error ? reject(error) : resolve()));
  });
  const child = spawn(process.execPath, ['apps/api/dist/main.js'], { stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  child.stdout.on('data', chunk => { output += chunk; });
  child.stderr.on('data', chunk => { output += chunk; });
  const exited = new Promise(resolve => child.once('exit', (code, signal) => resolve({ code, signal })));
  try {
    let ready = false;
    for (let attempt = 0; attempt < 50; attempt++) {
      if (child.exitCode !== null || child.signalCode !== null) throw new Error(output);
      if (output.includes('Nest application successfully started')) {
        try {
          const response = await fetch('http://127.0.0.1:3000/health', { signal: AbortSignal.timeout(500) });
          assert.equal(response.status, 200);
          assert.deepEqual(await response.json(), { status: 'ok' });
          await delay(100);
          if (child.exitCode !== null || child.signalCode !== null) throw new Error(output);
          ready = true;
          break;
        } catch (error) {
          if (attempt === 49) throw error;
        }
      }
      await delay(100);
    }
    assert.ok(ready, `API did not become ready: ${output}`);
    child.kill('SIGTERM');
    const result = await Promise.race([exited, delay(3000).then(() => null)]);
    assert.ok(result, 'API did not shut down within 3 seconds');
    console.log('Compiled startup, HTTP response, and shutdown verified');
  } finally {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill('SIGKILL');
      await exited;
    }
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
NODE
```

If port 3000 is occupied, stop and report it; do not kill the occupying process. Resolve before rerunning. Do not claim the application is ready just because a build succeeded.

### Step 6: Explain the lesson and stop

- [x] Write README setup commands: select Node 24 using the existing version manager, `pnpm install --frozen-lockfile`, `pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm start`, and `curl http://127.0.0.1:3000/health`. State that build precedes start, the endpoint is liveness only, and no database or frontend exists yet.
- [x] Write `docs/lessons/01-nestjs-fastify-foundation.md` with this exact teaching sequence, adapting examples to the verified implementation:
  1. Why DI exists: separate object construction from use; substitutability and lifecycle management. A container is a mechanism, not the definition of DI.
  2. Why this tiny health service exists: a small teaching seam for DI, not a claim that every constant response needs a service.
  3. Module graph: AppModule imports HealthModule; controller and service are registered within it; no exports needed yet. Contrast explicit Nest module visibility with Spring component scanning.
  4. Request trace: Fastify → Nest route handler → controller → provider → JSON response.
  5. `NestFactory.create<NestFastifyApplication>`: the generic informs TypeScript; `new FastifyAdapter()` selects actual runtime behavior.
  6. Decorators, emitted metadata, and why a class injection token must exist at runtime whereas a type alias disappears.
  7. Constructor parameter properties and `private readonly`: TypeScript syntax, not Java-style runtime enforcement or deep immutability.
  8. Lifecycle: create versus init/ready versus listen versus close; tests use injection without opening TCP ports, while the smoke check verifies real sockets and compiled output.
  9. Literal `'ok'` versus arbitrary string, structural typing, and the test provider's extra property; TypeScript does not serialize or strip fields.
  10. Trade-offs: manual small setup versus CLI scaffolding, CommonJS versus ESM, provider split for teaching, and what the health endpoint does not prove.
- [x] Show command outcomes accurately, including any unresolved warnings. Review the diff for generated clutter or accidental future features.
- [x] Git was not initialized at planning time. At execution, follow the user's chosen Git/worktree setup; do not silently create a global identity, remote, or nested repository. Once a repository and commit permission exist, stage only the listed lesson files and commit with `feat(api): add tested NestJS Fastify health endpoint`.
- [x] Explain the implementation in the chat, invite questions, and stop. Ask whether the learner is ready to plan campaign persistence; do not start it merely because tests pass.

## V1 coverage map — subsequent lessons, not authorized by this plan

| Spec responsibility | Next independently reviewed lesson |
|---|---|
| PostgreSQL, Prisma, migrations, EUR minor units, UTC periods, seed uniqueness | Campaign persistence |
| tRPC/Fastify wiring, Zod, paginated campaign API, safe error mapping, inferred frontend types | Typed API boundary |
| React/Vite, TanStack Query, shadcn/Tailwind, browser loading/empty/error states | First frontend slice |
| Versioned deterministic rule, money-safe arithmetic, evidence snapshot, concurrent generation deduplication | Recommendation generation |
| Recommendation list/detail and evidence review | Review UI |
| Atomic decisions/intents, idempotency, rollback, concurrent approve/reject, budgets unchanged | Decision workflow |
| End-to-end V1 verification and clear pending-execution presentation | V1 consolidation |

Execution workers, retries, verification of external effects, and actual budget changes are V2 scope, not missing V1 tasks.

## Plan self-review

- Scope: covers only spec teaching milestone 1; all remaining V1 capabilities are explicitly mapped above.
- Interfaces: application factory is shared by main and request tests; HealthService names and response types match across implementation and override tests.
- Review Focus: all five conditions have concrete checks in Steps 2, 4, and 5.
- No implementation or dependency installation has been performed while writing this document. Code blocks are planned content and require runtime verification during execution.
- User must review this lesson plan before execution. Preserve native, conversational implementation with an explanation-and-pause gate.
