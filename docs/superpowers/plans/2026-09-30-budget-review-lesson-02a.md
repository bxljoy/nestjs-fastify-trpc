# Budget Review Lesson 02A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans inline, with test-first verification. Steps use checkbox syntax. Implement only this lesson, explain it, and wait for the learner before moving on.

**Goal:** Persist and retrieve a Campaign in real PostgreSQL through a Nest-managed Prisma client, with a versioned SQL migration file and an isolated database integration test.

**Architecture:** Add a non-global PrismaModule exporting PrismaService. Test that module against a separate PostgreSQL instance. Do not import it into AppModule until a database-backed feature actually needs it; existing Health and Hello requests remain independent of database availability.

**Tech Stack:** Existing NestJS 12/CommonJS/TypeScript 5.9/Jest stack; Prisma 7.10.0 CLI/client/PostgreSQL adapter; local PostgreSQL 17 in Docker Compose.

**Spec:** `docs/superpowers/specs/2026-09-24-budget-review-v1-design.md`.

Status: Awaiting user review; no dependencies installed, containers created, or code implemented for this lesson.

## Global Constraints

- “Learning and comprehension take priority over feature count.”
- “The assistant implements one small, tested increment at a time, explains its purpose, code flow, alternatives, failure modes, and verification, answers questions, then waits for explicit permission before starting the next increment.”
- “Local development only, with one demo workspace and no authentication or multi-tenancy.”
- “Avoid generic repositories and unnecessary abstraction layers.”
- “No floating-point money arithmetic.”
- “PostgreSQL integration tests against a separate test database.”
- “Version compatibility and exact package APIs must be checked against official documentation before installation or implementation.”
- Preserve the learner's HelloModule and tests; do not refactor them incidentally.
- Do not modify or stop containers belonging to other projects.
- No resets, volume deletion, broad database cleanup, cloud resources, or exposure beyond loopback.

## Review Focus

1. Tests accidentally connect to development data: the test runner explicitly selects the dedicated local test URL, overriding inherited DATABASE_URL.
2. Compiling works but a real query fails: verify create/read through actual PostgreSQL, not a mocked client or SQLite.
3. Invalid negative money is persisted: put a CHECK constraint in the migration and prove PostgreSQL rejects a negative budget.
4. A global Prisma registration makes health tests depend on PostgreSQL: keep the module out of AppModule and the DB tests outside the normal Jest test patterns.
5. Prisma connection pools leak: initialize/close the Nest testing module and run integration Jest with open-handle detection, without forceExit.

## Boundaries and decisions

This is the first slice of the approved persistence milestone, not the entire milestone. Later slices introduce CampaignsService, fixed seed fixtures, reporting-period performance, uniqueness and bounded listing; then tRPC exposes the business API. Do not scaffold those now.

We intentionally do not add a CampaignController. HTTP business features will use tRPC, so no throwaway REST interface is needed. The executable artifact here is a real DB integration test using PrismaService.

Prisma is a schema/client/migration tool, not a replacement for PostgreSQL. Unlike JPA, its generated records are plain data, not managed entities with automatic dirty checking or lazy-loaded relations. Demonstrate that distinction in the walkthrough.

### Verified preflight (2026-09-30)

- Docker daemon and Compose were available during preflight. Proposed services use loopback ports 55432 and 55433; check that both are free before starting them, without interfering with other local services.
- Node 24.21.0 is installed. Existing app uses CommonJS, TS 5.9.3, Nest 12.1.0, Jest 30.5.2 and ts-jest 29.4.12.
- Pin Prisma CLI, @prisma/client and @prisma/adapter-pg to the same stable version, 7.10.0. Registry `prisma` latest currently points at a Prisma 8 release candidate; do NOT use unqualified latest.
- Prisma 7 supports explicit `moduleFormat = "cjs"` in the new generator. Keep our module format rather than migrating the project.
- Prisma 7 PostgreSQL connections use a driver adapter, and CLI connection configuration belongs in prisma.config.ts. Do not copy a Prisma 5/6 tutorial blindly.
- Installation is not yet verified. Inspect pending install scripts; do not blanket-enable them or weaken release-age protections.

Sources checked:

- https://www.prisma.io/docs/orm/prisma-schema/overview/generators — output directory, CommonJS generation, generated import extensions.
- https://www.prisma.io/docs/orm/overview/databases/postgresql — PrismaPg, explicit connection string, pool configuration.
- https://www.prisma.io/docs/orm/prisma-migrate/workflows/development-and-production — migration generation versus deployment.

## Files

| File | Responsibility |
|---|---|
| `compose.yaml` | Isolated development and test PostgreSQL services |
| `apps/api/.env.example` | Local development connection example |
| `apps/api/prisma.config.ts` | Prisma CLI schema/migration paths and URL |
| `apps/api/prisma/schema.prisma` | Campaign schema and CJS client generator |
| `apps/api/prisma/migrations/<generated timestamp>_init_campaign/migration.sql` | Initial schema plus nonnegative-money check |
| `apps/api/prisma/migrations/migration_lock.toml` | Generated provider lock |
| `apps/api/src/generated/prisma/` | Generated and ignored TypeScript client |
| `apps/api/src/prisma/prisma.service.ts` | One injectable client and connection lifecycle |
| `apps/api/src/prisma/prisma.module.ts` | Explicit provider registration/export |
| `apps/api/jest.integration.config.cjs` | Opt-in integration tests only |
| `apps/api/test/campaign.persistence.integration-spec.ts` | Real DB assertions |
| `apps/api/scripts/test-database.cjs` | Test-only URL and migrate/Jest runner |
| `package.json`, `apps/api/package.json`, `pnpm-lock.yaml` | Commands and pinned dependencies |
| `.gitignore` | Generated-client exclusion |
| `README.md`, `docs/lessons/02a-prisma-postgresql.md` | Setup and teaching notes |

`.env` is local/ignored, not a tracked secret file. Do not overwrite an existing .env. Migration timestamps are generated by Prisma, not invented or hand-edited. Git initialization/commit remains conditional on the user's chosen Git setup.

## Task 1: Add a real, tested persistence boundary

**Consumes:** Existing API tooling and Docker; no dependency on the Hello/Health implementations.

**Produces:**

- `PrismaModule` exports `PrismaService` to importing modules.
- `PrismaService` extends generated PrismaClient and connects/disconnects through Nest lifecycle hooks.
- A `Campaign` table with UUID ID, name, integer daily budget in minor units, EUR currency, and creation timestamp.
- Opt-in `pnpm test:db`; ordinary `pnpm test` remains DB-independent.

### Step 1: Database and tooling setup

- [ ] Verify current tests/typecheck/build before changes. Inspect free ports; if occupied, ask before changing the declared connections or stopping anything.
- [ ] Add compose.yaml:

```yaml
name: budget-review
services:
  postgres:
    image: postgres:17-bookworm
    environment:
      POSTGRES_USER: budget_review
      POSTGRES_PASSWORD: local_dev_only
      POSTGRES_DB: budget_review_dev
    ports:
      - '127.0.0.1:55432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U budget_review -d budget_review_dev']
      interval: 2s
      timeout: 3s
      retries: 30
  postgres-test:
    image: postgres:17-bookworm
    profiles: ['test']
    environment:
      POSTGRES_USER: budget_review_test
      POSTGRES_PASSWORD: local_test_only
      POSTGRES_DB: budget_review_test
    ports:
      - '127.0.0.1:55433:5432'
    tmpfs:
      - /var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U budget_review_test -d budget_review_test']
      interval: 2s
      timeout: 3s
      retries: 30
volumes:
  postgres_data:
```

These are explicitly public local-demo credentials, not reusable real credentials. Verify the pulled PostgreSQL 17 image version/digest and record it. The development volume survives stop/start; test storage is intentionally disposable. Avoid `down -v`.

- [ ] Add pinned packages, inspecting policy warnings before executing dependency scripts:

```bash
pnpm --filter @budget-review/api add --save-exact @prisma/client@7.10.0 @prisma/adapter-pg@7.10.0
pnpm --filter @budget-review/api add -D --save-exact prisma@7.10.0
```

The adapter already depends on pg; do not add a direct pg dependency unless source code imports it. Inspect Prisma's pending preinstall/postinstall source and choose explicit minimal policy entries; record the reasoning rather than allowing all builds. Stop if compatibility or supply-chain policy cannot be satisfied safely.

- [ ] Add `apps/api/.env.example` and create `.env` from it only if absent:

```dotenv
DATABASE_URL=postgresql://budget_review:local_dev_only@127.0.0.1:55432/budget_review_dev
```

- [ ] Add `apps/api/prisma.config.ts`:

```typescript
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: env('DATABASE_URL') },
});
```

CLI scripts use Node's explicit --env-file=.env option, with the API as cwd. Runtime Prisma does not magically load this CLI config or .env. The integration runner supplies its own DATABASE_URL and does not load the development .env.

- [ ] Add schema.prisma:

```prisma
generator client {
  provider = "prisma-client"
  output = "../src/generated/prisma"
  moduleFormat = "cjs"
  generatedFileExtension = "ts"
  importFileExtension = ""
}

datasource db {
  provider = "postgresql"
}

enum Currency {
  EUR
}

model Campaign {
  id               String   @id @default(uuid()) @db.Uuid
  name             String   @db.VarChar(200)
  dailyBudgetMinor Int
  currency         Currency @default(EUR)
  createdAt        DateTime @default(now()) @db.Timestamptz(3)
}
```

Use the explicit empty generated import extension to match the current CJS source transform and emitted files. Verify with actual tests/build, not assumptions. PostgreSQL Int bounds the budget to a signed 32-bit integer; add the nonnegative constraint below. Explain EUR 100 = 10000 and why IEEE-754 decimal arithmetic is avoided.

- [ ] Add generated directory to `.gitignore`. Add API scripts:

```json
{
  "db:generate": "node --env-file=.env node_modules/prisma/build/index.js generate",
  "db:migrate": "node --env-file=.env node_modules/prisma/build/index.js migrate dev",
  "test:db": "node scripts/test-database.cjs"
}
```

Add root forwarding commands `db:generate`, `db:migrate`, `test:db` using the existing pnpm --filter pattern, plus:

```json
{
  "db:up": "docker compose up -d --wait postgres",
  "db:stop": "docker compose stop postgres",
  "db:test:up": "docker compose --profile test up -d --wait postgres-test",
  "db:test:stop": "docker compose --profile test stop postgres-test"
}
```

Do not auto-start Docker inside pnpm test or the application. Do not add implicit destructive reset commands.

### Step 2: Write the failing database test

- [ ] Add the opt-in configuration:

```javascript
// apps/api/jest.integration.config.cjs
module.exports = {
  ...require('./jest.config.cjs'),
  testMatch: ['<rootDir>/test/**/*.integration-spec.ts'],
};
```

Verify the existing default patterns do not discover `.integration-spec.ts`. Generated client generation is a setup prerequisite, not a database migration.

- [ ] Write the test before adding the Nest provider/module:

```typescript
import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { Test, type TestingModule } from '@nestjs/testing';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Campaign persistence in PostgreSQL', () => {
  let moduleRef: TestingModule | undefined;
  let prisma: PrismaService;
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

  it('persists and retrieves a EUR budget as integer cents', async () => {
    const id = randomUUID();
    createdIds.push(id);
    await prisma.campaign.create({
      data: { id, name: 'Campaign A', dailyBudgetMinor: 10000 },
    });
    const campaign = await prisma.campaign.findUniqueOrThrow({ where: { id } });
    expect(campaign).toMatchObject({
      id, name: 'Campaign A', dailyBudgetMinor: 10000, currency: 'EUR',
    });
    expect(campaign.createdAt).toBeInstanceOf(Date);
  });

  it('rejects negative budgets at the database boundary', async () => {
    const id = randomUUID();
    createdIds.push(id);
    await expect(prisma.campaign.create({
      data: { id, name: 'Invalid budget', dailyBudgetMinor: -1 },
    })).rejects.toThrow();
    expect(await prisma.campaign.findUnique({ where: { id } })).toBeNull();
  });
});
```

No table-wide deletion. The test chooses its own IDs before inserts and cleans up only those IDs. Strengthen the negative assertion with the stable database-constraint error shape verified for the actual adapter version if needed; the successful read/write test rules out a generally unavailable database.

### Step 3: Wire Prisma into a Nest module

- [ ] Generate the client, then create the minimal PrismaService:

```typescript
import { Injectable, type OnModuleInit, type OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error('DATABASE_URL is required');
    super({
      adapter: new PrismaPg({ connectionString, connectionTimeoutMillis: 5000, max: 5 }),
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
```

And PrismaModule:

```typescript
import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Module({ providers: [PrismaService], exports: [PrismaService] })
export class PrismaModule {}
```

Do not use @Global or add this module to AppModule. Loading the exported class in some file is not the same as importing the Nest module into the graph.

- [ ] Start only the new Compose services with the declared commands. Before applying the schema on a fresh test DB, run the integration Jest command with the test URL and observe the missing-Campaign-table error. A missing generated import is only an intermediate setup failure, not the intended persistence RED evidence. Run from the root:

```bash
DATABASE_URL='postgresql://budget_review_test:local_test_only@127.0.0.1:55433/budget_review_test' pnpm --filter @budget-review/api exec node --experimental-vm-modules node_modules/jest/bin/jest.js --config jest.integration.config.cjs --runInBand
```

Expected on the fresh unmigrated test database: tests fail because the Campaign table does not exist; not because of module-resolution or authentication errors.

### Step 4: Generate and apply a reviewed migration

- [ ] Generate the development migration without applying it:

```bash
pnpm db:migrate --name init_campaign --create-only
```

Confirm forwarded CLI arguments. Inspect the generated SQL before applying. Stop if Prisma requests a reset or reports drift in an existing database; never consent automatically.

- [ ] Add this statement to the newly generated migration before applying it anywhere:

```sql
ALTER TABLE "Campaign"
ADD CONSTRAINT "Campaign_dailyBudgetMinor_nonnegative"
CHECK ("dailyBudgetMinor" >= 0);
```

Explain that Prisma's model captures much of the schema, but custom database constraints sometimes belong in migration SQL. Never edit an already-applied migration to change deployed history.

- [ ] Apply the development migration via pnpm db:migrate. Test migrations use migrate deploy, which applies reviewed migrations rather than generating or resetting anything.

- [ ] Add `apps/api/scripts/test-database.cjs`:

```javascript
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const apiRoot = path.resolve(__dirname, '..');
const env = {
  ...process.env,
  DATABASE_URL: 'postgresql://budget_review_test:local_test_only@127.0.0.1:55433/budget_review_test',
};

function run(args) {
  const result = spawnSync(process.execPath, args, {
    cwd: apiRoot, env, stdio: 'inherit', timeout: 120000,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run(['node_modules/prisma/build/index.js', 'migrate', 'deploy']);
run([
  '--experimental-vm-modules', 'node_modules/jest/bin/jest.js',
  '--config', 'jest.integration.config.cjs', '--runInBand', '--detectOpenHandles',
]);
```

The literal connection is limited to the local demo test instance. Production credentials are not accepted by this runner. Do not silently fall back to DATABASE_URL or the development port.

- [ ] Run `pnpm test:db`. Expected: create/read and constraint checks pass; process exits without leaked pools. Rerun it to prove rows do not collide across runs. Verify both tests really ran.
- [ ] Verify regression sensitivity in the disposable test database only: dropping the check constraint should make the negative test fail, and restoring the same constraint should return it to green. Use explicit SQL targeting only budget_review_test/55433; do not alter development data or migration history. If safe test-only targeting cannot be established, stop rather than broadening cleanup.

### Step 5: Verify the application and teach

- [ ] Run frozen install, generate, normal Jest tests, typecheck, build, integration tests, and package-manager audit. Compare generated CJS client output and ensure there are no imports with unresolved .ts extensions in compiled runtime files.
- [ ] Confirm the ordinary six existing tests run without connecting to PostgreSQL and the integration tests are selected only by their dedicated config. Do not skip or delete the learner's Hello test.
- [ ] Explain generated files are regenerated after schema changes and after fresh checkout. Document that build/typecheck require client generation even when running the HTTP app without a database. Do not hand-edit generated Prisma files.
- [ ] Write README commands and `docs/lessons/02a-prisma-postgresql.md` covering:
  1. PostgreSQL versus Prisma versus generated PrismaClient.
  2. schema.prisma versus migration SQL versus the actual database schema.
  3. Why generating types does not create a table.
  4. PrismaModule imports/exports, client lifecycle, and why not global.
  5. Driver adapter and pool ownership; no connection/client per request.
  6. Prisma records versus JPA managed entities; explicit queries and no automatic dirty checking.
  7. Integer cents, PostgreSQL bounds, enum currency, and database constraints.
  8. Module integration testing against a real, separate database; why SQLite/mocks would miss PostgreSQL behavior.
  9. Why AppModule is deliberately unchanged until a real database consumer arrives.
  10. Where later transactions will matter: approval plus execution intent, not wrapping every read by habit.
- [ ] Request a bounded read-only review, address substantive findings with tests, and explain the result to the learner. Leave services stopped with `db:stop` / `db:test:stop` unless the learner requests keeping them running; do not remove the development volume.
- [ ] Pause. Do not add seed performance, CampaignsService, HTTP endpoints, tRPC, or the frontend until the learner is ready for the next slice.

## Self-review and coverage

- Scope: first independently testable part of spec milestone 2; not a claim of full campaign feature completion.
- Future fixed seed data and reporting-period uniqueness remain in subsequent persistence lessons, not dropped requirements.
- Existing API and user-authored Hello code remain untouched.
- CommonJS generator options and adapter use are grounded in current Prisma 7 docs; actual package integration remains an execution verification gate.
- Tests deliberately exercise PostgreSQL storage, a database-level money constraint, module wiring, and cleanup. No broad deletes or migration resets.
- Expected new infrastructure is limited to this Compose project and its two loopback-bound containers.
