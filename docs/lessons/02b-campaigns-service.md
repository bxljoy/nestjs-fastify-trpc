# Lesson 02B — An application service for campaign listing

## Scope

Lesson 02A proved Prisma could store Campaign records. This slice adds one application capability: list campaigns through an injectable Nest service. There is still no campaign HTTP/tRPC endpoint, seed dataset, performance model, or budget-changing operation.

```text
Integration test (later: tRPC procedure)
  → CampaignsService
  → PrismaService
  → PrismaPg / PostgreSQL
```

## Files to read

- `apps/api/src/campaigns/campaigns.module.ts`
- `apps/api/src/campaigns/campaigns.service.ts`
- `apps/api/test/campaigns.service.integration-spec.ts`

## Module ownership

CampaignsModule imports PrismaModule, provides CampaignsService, and exports CampaignsService. A future consumer imports CampaignsModule; it should not register another copy of CampaignsService in its own providers array.

AppModule still imports only HealthModule and HelloModule. No current HTTP feature needs persistence, so the ordinary application remains database-independent.

The integration testing module imports CampaignsModule and declares a parent-level factory provider that injects CampaignsService. This exercises the exported provider boundary, not merely a broad container lookup that could find an unexported provider.

## Constructor injection

```typescript
constructor(private readonly prisma: PrismaService) {}
```

Nest supplies the PrismaService registered by the imported PrismaModule. The TypeScript parameter-property syntax both declares a private field and assigns the constructor argument to it. Roughly equivalent Java intent:

```java
private final PrismaService prisma;

CampaignsService(PrismaService prisma) {
    this.prisma = prisma;
}
```

`readonly` prevents reassigning the field in TypeScript; it does not freeze the client object or make database operations read-only. This particular service exposes only a read operation.

## Contract

```typescript
interface ListCampaignsOptions {
  limit?: number;
  offset?: number;
}

list(options?: ListCampaignsOptions): Promise<Campaign[]>
```

- `list()` and `list({})`: first 20 campaigns.
- `limit`: integer from 1 through 100; default 20. Oversized requests are rejected, not silently clamped.
- `offset`: integer from 0 through 2,147,483,647; default 0. The upper bound matches Prisma's signed 32-bit `skip` input, not JavaScript's larger safe-integer range.
- Order: `createdAt ASC`, then `id ASC`.
- Empty table or offset beyond the final row: resolves to `[]`.
- Invalid numeric options (including fractions, NaN, infinity, negative values, and out-of-range values): rejects with RangeError before calling Prisma.
- Database failures propagate; they are not disguised as empty results.

This is a typed internal service contract, not a parser for arbitrary HTTP JSON. We validate numeric bounds because TypeScript's `number` alone cannot express them. A later transport boundary will validate external input with Zod and map errors into its own protocol. No HTTP exception type belongs in this slice.

The result type is the generated Campaign record type, imported with `import type`. There is no public wire DTO yet. Returning it internally is simple; a future API must choose its public fields explicitly rather than automatically exposing every future database column.

## Default parameters and async results

```typescript
async list({ limit = 20, offset = 0 }: ListCampaignsOptions = {}): Promise<Campaign[]>
```

There are two levels of defaults:

1. `= {}` allows the caller to omit the options object.
2. The destructured property defaults supply omitted limit and offset values.

`async` ensures a Promise result, including when validation throws before the query. That makes both validation and database errors observable through `await`/`catch` or Jest's `.rejects`.

Returning Prisma's query promise directly is sufficient: the async function adopts its eventual result or failure. An extra `return await` is unnecessary here because there is no local asynchronous error-handling or cleanup block.

## Query and pagination

```typescript
return this.prisma.campaign.findMany({
  take: limit,
  skip: offset,
  orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
});
```

The database performs limiting and skipping. We do not fetch all campaigns and slice an array in Node.

Ordering only by creation time is ambiguous when records share a timestamp. The unique ID is a tie-breaker, giving a total order for a fixed dataset.

Stable ordering does **not** provide a snapshot across separate requests: concurrent inserts/deletes can shift offset-based pages. Large offsets can also be expensive even with a small returned page. Cursor pagination and indexes can be considered when actual requirements justify them. The 32-bit offset bound is an input compatibility limit, not a performance guarantee.

There is no total-count query or generic pagination envelope yet. The one capability returns an array and does not need an explicit multi-operation transaction.

## Why a service rather than direct Prisma calls in future procedures?

The service owns the application-facing listing policy: default size, bounds, ordering, and error semantics. A later transport adapter can delegate to it without duplicating that policy.

This is similar to a Spring service consuming persistence infrastructure. We deliberately do not add a generic repository wrapper that only forwards the same Prisma methods. If business rules grow, this gives them a clear home without implementing those hypothetical rules now.

## Tests and evidence

Run:

```bash
pnpm db:test:up
pnpm test:db
pnpm db:test:stop
pnpm test
pnpm typecheck
pnpm build
```

The 18 new integration cases cover defaults, ordering across equal timestamps, offset/limit behavior, maximum page size, empty results, and invalid numeric inputs. Along with Lesson 02A's two cases, test:db runs 20 tests; ordinary test still runs the six HTTP/DI cases.

Fixtures are generated only inside the test and inserted through Prisma. Their IDs increase within a random per-fixture UUID prefix; timestamps deliberately tie in pairs. Rows are inserted in reverse order so accidental insertion order cannot satisfy the intended sort.

The tests allocate IDs before inserting and delete only those IDs after each test. Before each test they assert the table is empty: this suite expects exclusive use of the disposable test database and fails rather than deleting unfamiliar data. Run the runner serially, not simultaneously from multiple terminals. The container closes in afterAll, independently of row-cleanup hooks.

Initial test-first runs failed for missing implementation; after adding the module/type skeleton, all 18 new behavioral cases failed against the unimplemented method. The implementation then passed all 20 database cases.

Temporary mutations separately replaced offset with zero, ignored the requested limit, and removed the ID tie-breaker. Each caused expected test failures; the original service was restored afterward. These checks provide evidence that tests detect broken pagination and ordering rather than simply exercising a happy path.

No dependencies or migrations changed. The existing [Prisma dependency audit follow-up](../dependency-audit.md) still applies; these tests do not fix dependency vulnerabilities.

## Discussion checkpoint

- What does `private readonly` do in the constructor, and what does it not do?
- Why is both `= {}` and `limit = 20` useful?
- Why doesn't a TypeScript `number` guarantee valid pagination?
- Why is the ID needed after ordering by timestamp?
- Why keep this service independent of HTTP exceptions?

Pause here before adding seed fixtures, reporting-period performance, or a public API.
