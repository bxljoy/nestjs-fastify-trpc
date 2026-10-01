# Lesson 01 — NestJS + Fastify foundation

## What we built

Two real HTTP endpoints: the original health endpoint and the HelloModule learning exercise.

```http
GET /health
200 OK
Content-Type: application/json; charset=utf-8

{"status":"ok"}
```

```http
GET /hello
200 OK
Content-Type: application/json; charset=utf-8

{"status":"ok","message":"Hello, NestJS"}
```

Six tests across three files cover both responses, Fastify selection, unknown routes, unsupported POST, and dependency injection. There is no database or business workflow yet. The implementation was verified with Node 24.21.0, NestJS 12.1.0, and pnpm 11.22.0.

## 1. Why dependency injection exists

Consider a controller that constructs its dependency internally:

```typescript
class HealthController {
  private healthService = new HealthService();
}
```

That controller now decides both **what it needs** and **how to construct it**. This is tolerable for a trivial object, but becomes awkward when a service needs database connections, configuration, or different implementations in tests.

Constructor injection separates the decisions:

```typescript
constructor(private readonly healthService: HealthService) {}
```

The controller declares the dependency. A caller supplies it. You could do that manually with `new HealthController(new HealthService())`; DI does not require a framework. Nest's container automates construction, dependency resolution, scope, and lifecycle.

This corresponds to Spring constructor injection. It does not automatically give us good design: circular dependencies, too many dependencies, and inappropriate sharing remain our responsibility.

**Why use a service for this constant response?** It is an intentionally small learning seam. In a real application a constant endpoint could return directly from a controller. We are not establishing a rule that every endpoint needs an otherwise empty service layer.

## 2. The module graph

Read these files together:

- `apps/api/src/app.module.ts`
- `apps/api/src/health/health.module.ts`
- `apps/api/src/hello/hello.module.ts`
- `apps/api/src/hello/hello.controller.ts`

```text
AppModule
  ├── imports HealthModule
  │     controllers: HealthController
  │     providers:   HealthService
  │     exports:     HealthService
  └── imports HelloModule
        imports:     HealthModule (same static module)
        controllers: HelloController
        providers:   HelloService
```

HealthController injects HealthService. HelloController injects its local HelloService and the HealthService exported by HealthModule.

The arrays are Nest container configuration:

- `imports`: other Nest modules included in this module graph.
- `controllers`: classes with API entry points.
- `providers`: dependencies registered with the container.
- `exports`: providers this module makes injectable in other importing modules.

In the original health-only foundation, HealthController and HealthService belonged to the same module, so exporting the service was unnecessary. **The current Hello exercise changes that:** HealthModule exports HealthService, and HelloModule imports HealthModule so HelloController can inject it. HelloModule must declare this import itself; AppModule's imports are not automatically inherited by sibling modules.

Importing HealthModule through both AppModule and HelloModule shares this static module and its default-scoped provider; it does not register a second HealthService. Do not add HealthService to HelloModule's providers to make it visible—that would create a separate provider registration. Importing HealthModule also makes its routes part of the application without exporting its controller.

**Two meanings of import/export:** JavaScript's `import`/`export` makes a symbol available in a file. Nest's `imports`/`exports` controls container composition and provider visibility. Importing a service class into a TypeScript file alone does not register it in Nest.

Compared with typical Spring component scanning, Nest makes more of this wiring explicit. `@Injectable()` alone does not discover and register a provider everywhere. Default-scoped providers are generally singleton instances within their registration/container context, not a universal process-wide singleton. Registering the same class independently in several modules can create multiple instances.

## 3. Trace an actual request

Read `apps/api/src/health/health.controller.ts`:

```typescript
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  getHealth(): HealthResponse {
    return this.healthService.getStatus();
  }
}
```

1. Node/Fastify accepts the HTTP request.
2. Nest has registered a GET route on Fastify using the controller metadata.
3. The Nest handler invokes `getHealth()` on the constructed controller.
4. The controller calls its injected service.
5. The service returns a plain object.
6. Nest/Fastify sends that object as JSON with status 200.

`@Controller('health')` plus `@Get()` defines `/health`; the TypeScript method name `getHealth` does not define the URL. This is similar to class-level `@RequestMapping` plus method-level `@GetMapping` in Spring MVC.

Nest does not create a fresh default-scoped controller/service pair for each request. Also, Node's concurrency model is not Spring MVC's usual thread-per-request model: asynchronous I/O lets requests overlap, while long synchronous work can block the event loop. Our constant operation is safely tiny; future shared-state operations still need concurrency reasoning.

## 4. NestJS and Fastify have different jobs

Read `apps/api/src/create-application.ts`:

```typescript
NestFactory.create<NestFastifyApplication>(
  AppModule,
  new FastifyAdapter(),
  { ...options, abortOnError: false },
);
```

- `AppModule` supplies the application composition root.
- `new FastifyAdapter()` selects the actual HTTP implementation.
- `<NestFastifyApplication>` tells TypeScript which application API is returned. A generic argument does not instantiate Fastify and is erased from the generated JavaScript.
- `options` lets tests disable normal startup logging without changing HTTP wiring.
- `abortOnError: false` lets bootstrap errors reject rather than having Nest terminate the process inside the factory. The entry point decides how to report failure.

Nest supplies application structure, DI, route orchestration, and lifecycle facilities. Fastify supplies the HTTP server/router machinery beneath the adapter. Roughly compare the HTTP-engine role with the embedded server beneath Spring MVC, but do not treat Fastify as literally a Servlet container.

## 5. Decorators and runtime tokens

The service uses `@Injectable()`; the controller uses `@Controller()` and `@Get()`. These decorators attach framework metadata. Our compiler enables `experimentalDecorators` and `emitDecoratorMetadata`, while the application factory imports `reflect-metadata` before loading the decorated application graph.

In this constructor:

```typescript
constructor(private readonly healthService: HealthService) {}
```

`HealthService` is both a TypeScript type and an actual JavaScript class value. The compiler can emit constructor metadata referencing that class. Nest uses the class value as the provider lookup token.

That is why this import deliberately keeps a runtime class:

```typescript
import { HealthService, type HealthResponse } from './health.service';
```

`HealthResponse` exists only during typechecking. `HealthService` must still exist at runtime for this injection pattern. Turning that class import into `import type` removes the usable class reference from emitted metadata.

An interface or type alias cannot be the automatic runtime token. If we later inject an interface-shaped adapter, we will register a string/symbol token and use explicit `@Inject(token)`. Unlike Java classes/interfaces that can be inspected at runtime, TypeScript interfaces are erased.

## 6. Constructor parameter properties

This short declaration:

```typescript
constructor(private readonly healthService: HealthService) {}
```

combines a parameter, an instance property, and assignment. A longer equivalent is:

```typescript
private readonly healthService: HealthService;

constructor(healthService: HealthService) {
  this.healthService = healthService;
}
```

- `private` restricts access during TypeScript checking. It is not JavaScript `#private` runtime enforcement.
- `readonly` prevents reassignment through this property in checked TypeScript code. It does not freeze the service object or make all its state immutable.
- These modifiers do not perform DI. Nest supplies the constructor argument; TypeScript's parameter-property syntax stores it.

## 7. Construction, initialization, listening, and closing

The files separate two concerns:

- `create-application.ts`: create the Nest container/application with Fastify, without opening a port.
- `main.ts`: configure shutdown hooks and listen on loopback port 3000.

Creating the application resolves the module/provider graph, but is not the same as registering every route and running application initialization hooks. In tests we explicitly call:

```typescript
await app.init();
await app.getHttpAdapter().getInstance().ready();
```

The second line ensures Fastify's plugin/route setup is ready before request injection. In normal startup, `app.listen(...)` performs the necessary initialization before listening; we do not need to manually duplicate all test setup.

Tests use `app.inject(...)` to exercise the actual HTTP routing stack in memory. This is not a mock of the controller, and it does not allocate a TCP port. Always `await app.close()` when finished so application resources are released.

`main.ts` enables Nest shutdown hooks. Its listen failure path closes the app and rethrows; the outer rejection handler records startup failure and sets a nonzero exit code. The compiled-server smoke check separately verified real sockets and SIGTERM shutdown. SIGKILL cannot be handled gracefully.

## 8. Literal types and structural typing

The response type is:

```typescript
export type HealthResponse = { status: 'ok' };
```

`'ok'` is a **literal type**: only that string is accepted for this property. `{ status: string }` would allow arbitrary strings and provide a weaker promise.

TypeScript checks shapes rather than requiring Java-style nominal class identity. A value can have additional fields and still be assignable to a smaller shape. Fresh object literals receive extra-property checks in some contexts, but that is not a general exact-object guarantee.

The DI test deliberately supplies a provider whose result contains an extra `source` marker, and verifies that the marker reaches HTTP. This catches the controller bypassing its dependency and hardcoding the usual result instead. The real-provider `/health` response test independently requires exactly `{"status":"ok"}`; the `/hello` test requires both the status and greeting.

**Type annotations do not remove fields, serialize values, or validate external inputs.** The test marker survives despite the `HealthResponse` annotation. This distinction will be essential when we introduce Zod and later design safe API output contracts.

## 9. How the tests earned their assertions

| Test | Regression it catches |
|---|---|
| Uses Fastify | Accidentally using Nest's default Express adapter |
| Exact liveness response | Missing/wrong route, HTTP status, content type, or payload |
| Unknown path gives 404 | A catch-all accidentally reporting success |
| POST /health gives 404 | Incorrect method registration for the health endpoint |
| Provider override reaches HTTP | Controller bypasses its injected dependency |
| GET /hello returns status and greeting | Missing HelloModule registration, broken dependency wiring, or an incorrect combined response |

The first request test failed with expected 200 versus actual 404 before we created the health controller. After implementation, it passed. We also temporarily replaced controller delegation with a hardcoded response: the DI test failed because its marker disappeared. Restoring delegation made the original five tests pass. The subsequent Hello request test brings the current suite to six tests. In a disposable copy, removing HelloModule from AppModule made that new test fail with expected 200 versus actual 404; the working source was left unchanged.

Typechecking and production compilation are separate gates. A test transformer may compile code differently from the build; passing Jest alone does not prove `node apps/api/dist/main.js` works. We also ran frozen installation, open-handle checks, a real HTTP startup/shutdown check, and the package-manager audit.

## 10. Tooling decisions and limitations

- A manually assembled workspace makes the small set of files visible. We subsequently added the locally installed Nest CLI for `pnpm dev` (`nest start --watch`), without scaffolding additional features. `nest-cli.json` selects our existing build tsconfig; root pnpm scripts delegate to the API package.
- The backend uses CommonJS output for this lesson; the future Vite frontend is independent. Nest 12's ESM dependency and Jest's module sandbox require Node >=24.9 plus the test-only VM-modules flag. The experimental warning is expected and remains visible. Production Node startup needs no such flag.
- The complete project requires Node >=24.15.0 and <25 because the locked Nest CLI schematics and Angular DevKit packages require at least 24.15 within the Node 24 line. This is higher than Jest's 24.9 interoperability threshold. Verification used Node 24.21.0; passing there does not by itself prove every older patch is supported.
- ts-jest uses patch 29.4.12 rather than the plan's original 29.4.13 to avoid a release-age exception. Native dependency install scripts remain explicitly disabled, with packaged binaries verified on this host.
- No global logging, authentication, queues, tRPC, Prisma, or generic repository abstraction was added.
- Health only says this endpoint can answer. It does not prove a future database works or that a business operation is safe.

## Run it yourself, if you want

From the project root:

```bash
nvm use 24
pnpm test
pnpm typecheck
pnpm build
pnpm start
```

Then `curl http://127.0.0.1:3000/health` from another terminal. Ctrl+C stops the server. Nothing here requires you to write the code yourself.

For everyday development, use `pnpm dev` instead of repeated build/start commands. It performs initial compilation, watches TypeScript source, and recompiles/restarts the backend after changes. This does not automatically run Jest or the full source-and-test typecheck. Keep those as verification commands. Run only one server at a time, since dev and start both use port 3000.

`pnpm test:dev` is an optional macOS/Linux integration check: it launches the real root dev command in a temporary copy, changes the health response there, verifies the changed HTTP result and its restoration, and checks shutdown releases the port. It never edits the actual lesson source. Its fixture reuses installed dependencies and disables pnpm's automatic pre-run installation only in the fixture process to avoid writing through dependency symlinks.

## Discussion checkpoint

We pause here, not at the next technology.

Useful questions to discuss together:

1. What constructs HealthService, and why doesn't the controller do it?
2. What differs between a TypeScript `import` and a Nest module's `imports` array?
3. Which selects Fastify at runtime: the generic type argument or the adapter instance?
4. Why does the injected class need to exist at runtime, while HealthResponse does not?
5. Why can an extra JSON field reach the client even when the return type does not name it?

These are conversation prompts, not an exam or a prerequisite for asking questions. We will not begin campaign persistence until you explicitly say you are ready.

## References

- [Nest providers](https://docs.nestjs.com/providers)
- [Nest modules](https://docs.nestjs.com/modules)
- [Nest testing](https://docs.nestjs.com/fundamentals/testing)
- [Jest ESM and require(esm)](https://jestjs.io/docs/ecmascript-modules)
