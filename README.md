# Budget Review

An independent, AI-assisted learning project for NestJS + Fastify and, in later lessons, tRPC/Zod, Prisma/PostgreSQL, and React. It uses a fictional campaign recommendation → customer decision → pending execution workflow to explore the stack.

## Current scope: Lesson 01

The NestJS/Fastify foundation and a cross-module dependency-injection exercise are implemented:

- `GET /health` returns `{"status":"ok"}`. This is **liveness**, not a database or external-service readiness check.
- `GET /hello` combines the health status with a greeting from a separate service.

There is no database, frontend, tRPC API, recommendation generation, or execution processor yet.

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
pnpm dev
```

Keep this command running while editing `apps/api/src/`. Nest CLI watches the TypeScript source, recompiles it, and restarts the backend automatically. Refresh your browser or repeat your request to see the change. Stop with Ctrl+C. This is a server restart, not frontend hot-module replacement.

`pnpm dev` forwards to the API workspace's `nest start --watch`. The CLI is a pinned **local development dependency**, not a global installation. `apps/api/nest-cli.json` explicitly selects the same `tsconfig.build.json` used by our build command. This pnpm workspace is not Nest CLI's separate monorepo mode.

## Verify and run compiled code

From the project root:

```bash
pnpm install --frozen-lockfile
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
| `pnpm audit` | Check known dependency advisories |

### Tooling notes

- NestJS packages are pinned to 12.1.0. The backend compiles to CommonJS; Nest 12 exposes ES modules. Node supports this synchronous interoperability, while Jest additionally needs its **test-only** `--experimental-vm-modules` flag and Node >=24.9. The project minimum is higher—24.15.0—because the locked Nest CLI schematics and Angular DevKit packages require it. Expect Node's VM Modules experimental warning during tests; it is not suppressed. Production startup does not use that flag.
- TypeScript is pinned to 5.9.3 and ts-jest to 29.4.12. Choosing every package's latest major independently would not give a compatible test toolchain.
- `pnpm-workspace.yaml` explicitly denies install scripts for `@parcel/watcher` and `unrs-resolver`; their packaged native binaries worked on the verified macOS arm64 host. Other platforms must verify their own prebuilt binary support rather than blanket-approving scripts.
- Initial installation reported a deprecated transitive `glob@10.5.0`. The native audit reported no known vulnerabilities at verification time; that is not a guarantee against unknown vulnerabilities.

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

Start the explanation at [Lesson 01](docs/lessons/01-nestjs-fastify-foundation.md).

- [Approved V1 design](docs/superpowers/specs/2026-09-24-budget-review-v1-design.md)
- [Lesson 01 implementation plan](docs/superpowers/plans/2026-09-24-budget-review-lesson-01.md)

The assistant implements one small lesson, explains it, answers questions, and waits for explicit permission before continuing. Async execution, verification of external changes, and retries are V2 scope.
