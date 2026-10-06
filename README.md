# Budget Review

An independent, AI-assisted learning project for NestJS + Fastify and, in later lessons, tRPC/Zod, Prisma/PostgreSQL, and React. It uses a fictional campaign recommendation → customer decision → pending execution workflow to explore the stack.

## Current scope: Lessons 01 and 02A

The NestJS/Fastify foundation and a cross-module dependency-injection exercise are implemented:

- `GET /health` returns `{"status":"ok"}`. This is **liveness**, not a database or external-service readiness check.
- `GET /hello` combines the health status with a greeting from a separate service.

Lesson 02A adds local PostgreSQL, a Campaign schema/migration, and a Nest-managed Prisma client verified by database integration tests. PrismaModule is deliberately not imported by AppModule yet: Health and Hello do not require a database. There is no campaign HTTP API, frontend, tRPC API, recommendation generation, or execution processor yet.

Local learning use only; not production-ready. The server listens on `127.0.0.1:3000`, not the public network.

## Requirements

- Node **24.15.0 or newer within the 24.x line**; verified with 24.21.0. The minimum includes the locked Nest CLI development dependencies.
- pnpm **11.22.0**.

For an existing nvm installation:

```bash
nvm use 24
node --version
pnpm --version
```

`.node-version` records the Node major for compatible version managers; nvm does not automatically read this file, so use the explicit command above. If the only installed Node 24 is older than 24.15, install a current Node 24 patch first. No global tools need to be reinstalled if `pnpm --version` already reports the required version.

## Develop with automatic restart

From the project root:

```bash
nvm use 24
pnpm install --frozen-lockfile
# First checkout only: copy the public local-demo template, without overwriting an existing .env.
cp -n apps/api/.env.example apps/api/.env
pnpm db:generate
pnpm dev
```

Keep this command running while editing `apps/api/src/`. Nest CLI watches the TypeScript source, recompiles it, and restarts the backend automatically. Refresh your browser or repeat your request to see the change. Stop with Ctrl+C. This is a server restart, not frontend hot-module replacement.

`pnpm dev` forwards to the API workspace's `nest start --watch`. The CLI is a pinned **local development dependency**, not a global installation. `apps/api/nest-cli.json` explicitly selects the same `tsconfig.build.json` used by our build command. This pnpm workspace is not Nest CLI's separate monorepo mode.

## Verify and run compiled code

From the project root:

```bash
pnpm install --frozen-lockfile
cp -n apps/api/.env.example apps/api/.env
pnpm db:generate
pnpm test
pnpm typecheck
pnpm build
pnpm start
```

In another terminal:

```bash
curl http://127.0.0.1:3000/health
# {"status":"ok"}
```

Use Ctrl+C to stop the server. In this compiled-code workflow, run `pnpm build` again after editing source; `pnpm start` runs compiled JavaScript, not a watcher. Do not run `pnpm dev` and `pnpm start` simultaneously: both use port 3000. If port 3000 is occupied, stop your own conflicting server or resolve the conflict before starting this application.

| Command | Purpose |
|---|---|
| `pnpm dev` | Compile, watch source changes, and restart the API |
| `pnpm test:dev` | Verify actual watch/restart behavior in a disposable copy (macOS/Linux; port 3000 must be free) |
| `pnpm test` | Jest tests covering Health, Hello, and dependency injection |
| `pnpm typecheck` | Strict TypeScript checks for source and tests, no emitted files |
| `pnpm build` | Compile source only into `apps/api/dist/` |
| `pnpm start` | Run the previously compiled application |
| `pnpm --filter @budget-review/api test --detectOpenHandles` | Check test teardown without forcing Jest to exit |
| `pnpm audit` | Check known dependency advisories; see the current [triage](docs/dependency-audit.md) |
| `pnpm db:generate` | Generate the typed Prisma client; does not create tables |
| `pnpm db:up` / `pnpm db:stop` | Start/stop the local development PostgreSQL service |
| `pnpm db:migrate` | Generate/apply development migrations; inspect prompts and SQL |
| `pnpm db:test:up` / `pnpm db:test:stop` | Start/stop the separate disposable test PostgreSQL service |
| `pnpm test:db` | Apply reviewed migrations to the test DB and run integration tests |

### Tooling notes

- NestJS packages are pinned to 12.1.0. The backend compiles to CommonJS; Nest 12 exposes ES modules. Node supports this synchronous interoperability, while Jest additionally needs its **test-only** `--experimental-vm-modules` flag and Node >=24.9. The project minimum is higher—24.15.0—because the locked Nest CLI schematics and Angular DevKit packages require it. Expect Node's VM Modules experimental warning during tests; it is not suppressed. Production startup does not use that flag.
- TypeScript is pinned to 5.9.3 and ts-jest to 29.4.12. Choosing every package's latest major independently would not give a compatible test toolchain.
- `pnpm-workspace.yaml` explicitly denies install scripts for `@parcel/watcher` and `unrs-resolver`; their packaged native binaries worked on the verified macOS arm64 host. Other platforms must verify their own prebuilt binary support rather than blanket-approving scripts.
- Prisma CLI/client/adapter are pinned to 7.10.0. Only its reviewed engine download and Node-version install check are allowed, in addition to the explicitly denied fallback scripts above. Prisma 8 prereleases are not used.
- The current audit reports **two high and two moderate transitive tooling advisories**. See [dependency audit and exposure limits](docs/dependency-audit.md); do not assume a green application test suite means dependencies are vulnerability-free. A deprecated transitive `glob@10.5.0` warning also remains.

## Structure

```text
apps/api/
  src/
    main.ts                    Process entry point and network listener
    create-application.ts      Nest application + Fastify adapter
    app.module.ts              Root module
    health/
      health.module.ts         Controller/provider registration
      health.controller.ts     HTTP routing
      health.service.ts        Liveness response
    hello/
      hello.module.ts          Imports HealthModule; registers Hello components
      hello.controller.ts      Combines the health status and greeting
      hello.service.ts         Greeting response
  test/
    health.e2e-spec.ts          Real request handling without TCP ports
    health-di.spec.ts           Provider override through the HTTP boundary
    hello.e2e-spec.ts           Combined response through the real application
```

Additional persistence files:

```text
compose.yaml                              Separate dev/test PostgreSQL services
apps/api/prisma.config.ts                 Prisma CLI configuration
apps/api/prisma/schema.prisma             Model and generated-client configuration
apps/api/prisma/migrations/                Versioned SQL history
apps/api/src/prisma/                       PrismaModule and client lifecycle
apps/api/src/generated/prisma/             Ignored generated client; regenerate, don't edit
apps/api/test/campaign.persistence.integration-spec.ts
```

## Local database lesson

Requires Docker with Compose. All passwords below are **public demo-only values**, never production credentials.

```bash
pnpm db:up
pnpm db:migrate
pnpm db:test:up
pnpm test:db
```

- Development: `127.0.0.1:55432`, database/user `budget_review_dev` / `budget_review`, password `local_dev_only`. Data lives in a named volume and survives stop/start.
- Tests: `127.0.0.1:55433`, database/user `budget_review_test`, password `local_test_only`. Uses disposable tmpfs storage and loses data when stopped; `test:db` reapplies migration files when needed.
- The integration runner fixes its own test URL and does not load the development `.env` or use an inherited `DATABASE_URL`. It deletes only rows whose UUIDs the test created.
- Development CLI commands use `apps/api/.env`. An already exported `DATABASE_URL` takes precedence over Node's env file, so check the CLI's displayed database/host before applying a migration. Do not point `db:migrate` at shared or production databases.
- `db:migrate` uses `migrate dev`; `test:db` uses `migrate deploy`. Neither script automatically resets a database. Stop and investigate any reset/drift prompt.
- `db:generate` needs the configuration URL, but not a running database. Run it after schema changes and after installing on a fresh checkout, before typechecking/building the generated-client imports.
- Stop only these services with `pnpm db:stop` and `pnpm db:test:stop`. Do not use `docker compose down -v` unless you deliberately intend to delete development data.
- No campaign endpoint or seed dataset is added in this slice. The integration tests create their own short-lived example rows.

Start the explanations at [Lesson 01](docs/lessons/01-nestjs-fastify-foundation.md) and [Lesson 02A](docs/lessons/02a-prisma-postgresql.md).

- [Approved V1 design](docs/superpowers/specs/2026-09-24-budget-review-v1-design.md)
- [Lesson 01 implementation plan](docs/superpowers/plans/2026-09-24-budget-review-lesson-01.md)

The assistant implements one small lesson, explains it, answers questions, and waits for explicit permission before continuing. Async execution, verification of external changes, and retries are V2 scope.
