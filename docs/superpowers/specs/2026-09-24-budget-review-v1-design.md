# Budget Review — V1 design

Status: Approved by the user on 2026-09-24. Lesson 01 foundation, Lesson 02A Campaign persistence, and Lesson 02B bounded CampaignsService listing implemented. Seed/performance data, API integration, and remaining V1 capabilities are not implemented.

## 1. Purpose and learning agreement

Build an independent, educational campaign-budget recommendation application. The primary outcome is understanding TypeScript, NestJS, Fastify, tRPC, and Zod in a realistic full-stack workflow.

The intended audience is developers familiar with Java/Spring Boot, backend development, and relational databases. Revisit fundamentals such as why dependency injection and transactions exist; use Spring analogies as a bridge, not as permission to omit explanations. Explain TypeScript-specific concepts as they arise, including structural typing, inference, unions, narrowing, and the distinction between compile-time types and runtime validation.

The assistant implements one small, tested increment at a time, explains its purpose, code flow, alternatives, failure modes, and verification, answers questions, then waits for explicit permission before starting the next increment. Do not implement the full application in one batch. Learning and comprehension take priority over feature count.

## 2. Scope

V1 has three visible phases:

1. Generate budget recommendations from seeded campaign/performance data.
2. Let a customer review the evidence and approve or reject a recommendation.
3. Persist pending execution intent for approved recommendations, without executing anything.

Approval must not change the campaign budget. The UI says "Approved — awaiting execution," never "Applied."

Local development only, with one demo workspace and no authentication or multi-tenancy. This is not safe to expose publicly as a production service.

Out of scope: real advertising or commerce integrations, LLMs, prediction models, automatic daily scheduling, execution adapters/processors, external changes, external execution verification, execution retries, queues, cloud deployment, and role-based access. V2 can separately design asynchronous execution, verification, failure handling, and safe retries. No fake worker, unused retry infrastructure, or pretend execution is needed in V1.

## 3. Architecture and technology choices

Use a pnpm workspace with two applications introduced incrementally:

```text
apps/
  api/    NestJS + Fastify
  web/    React + Vite
```

Backend: strict TypeScript, NestJS, Fastify, tRPC, Zod, Prisma, PostgreSQL. Frontend: React, Vite, TanStack Query integrated with tRPC, shadcn/ui, Tailwind CSS. Start without Zustand: server state belongs in TanStack Query, local UI state in React, and shareable filters can live in the URL. PostgreSQL runs locally in Docker. Introduce shared packages only when an actual boundary requires them; defer Turborepo until task orchestration is useful.

A modular monolith keeps domain responsibilities clear without distributed-system overhead:

- Campaigns: campaign data and seeded reporting-period performance.
- Recommendations: deterministic generation, evidence snapshots, and review decisions.
- Execution intents: persist a pending record as part of approval; no processor.
- Prisma: database client lifecycle and database access.

These are responsibility boundaries, not a requirement to scaffold every module on day one. Avoid generic repositories and unnecessary abstraction layers.

### Request paths

Start with a conventional NestJS health controller to learn bootstrap, modules, providers, dependency injection, and the Fastify adapter.

Business features later use:

```text
React → TanStack Query/tRPC client → HTTP/Fastify
      → tRPC procedure + Zod validation → Nest-managed service
      → Prisma → PostgreSQL
```

Use the official tRPC Fastify adapter, explicitly wired to Nest-managed services. A tRPC procedure is not a Nest controller method: Nest controller guards, pipes, interceptors, and exception filters do not automatically wrap it. Boundary validation and error translation belong in the tRPC layer; business invariants belong in services and database constraints. Future authentication would need explicit integration.

Keep procedures thin. Do not duplicate business endpoints as both REST controllers and tRPC procedures. Share the inferred router contract with the frontend through type-only imports; do not bundle Prisma or backend runtime code into the browser.

NestJS plus tRPC is selected to explore dependency injection, modular backend design, and end-to-end TypeScript API contracts. It is a learning choice, not a claim that this combination is universally preferable to REST or standalone tRPC/Fastify.

## 4. Domain and state

### Campaign and performance

A campaign has an ID, name, daily budget, and currency. V1 uses EUR fixtures and integer minor units (EUR 100 = 10000 cents), with safe-integer validation at API boundaries and appropriate database bounds. No floating-point money arithmetic.

Seeded performance identifies a campaign and reporting period and includes ad spend and attributed revenue. The reporting period uses UTC dates with an inclusive start and exclusive end. Enforce uniqueness for campaign plus reporting period. V1 does not offer performance editing or campaign budget updates.

### Recommendation

Persist campaign ID, reporting period, original budget, proposed budget, currency, a snapshot of the evidence, rule version, creation timestamp, decision timestamp, and status:

```text
PENDING_REVIEW → APPROVED
PENDING_REVIEW → REJECTED
```

Decisions are final in V1; no reopening or editing recommendations. Evidence and proposed values are immutable after generation. There is no authenticated reviewer identity in this local demo.

Concrete teaching rule: for positive ad spend, if attributed revenue is at least four times ad spend and the current budget is positive, suggest a 20% increase, rounded to the nearest cent. If the rounded budget would not increase, emit no recommendation. Zero spend produces no recommendation rather than division by zero. This rule is deterministic, versioned, and expressly not valid advertising advice or a prediction of incremental revenue.

Enforce uniqueness on campaign, reporting period, and rule version. Repeating generation reuses existing recommendations without resetting their decisions or rewriting evidence. No automatic daily job; generation is manually triggered for a seeded reporting period.

### Execution intent

Persist ID, unique recommendation ID, creation timestamp, and status `PENDING`. The immutable recommendation provides the approved payload. An execution intent exists only after approval; rejection creates none.

Do not add success/failure statuses that no V1 component can produce. V2 will define execution transitions and recovery semantics separately.

## 5. Review and concurrency contract

Approval must atomically transition a pending recommendation to approved and create its single pending execution intent in a PostgreSQL transaction.

- Repeat approval of an approved recommendation returns the existing approved result and execution intent.
- Repeat rejection of a rejected recommendation returns the existing rejected result.
- Approval of a rejected recommendation, or rejection of an approved recommendation, returns a conflict.
- Unknown IDs return not found.
- Concurrent approval requests cannot create multiple execution intents.
- Concurrent approve/reject requests permit exactly one transition; the losing conflicting decision receives a conflict.
- If execution-intent creation fails, approval rolls back.

Use an atomic conditional transition or equivalent database concurrency control, together with the unique execution-intent constraint. A read-then-unconditional-write check is insufficient.

Approval records consent to the displayed proposal, not a guarantee that it remains safe to apply later. V1 has no budget editing or external synchronization. Rechecking current external state immediately before execution, handling stale proposals, and expiry policies belong to the V2 execution design.

A pending row is a durable local execution intent, not a guarantee of eventual delivery or a complete transactional-outbox system.

## 6. API and UI behavior

Expose typed capabilities for campaign listing, manual recommendation generation, recommendation listing/detail, approval, and rejection. Exact procedure signatures are set during the relevant implementation lesson. List operations use bounded pagination and stable ordering.

Zod validates incoming identifiers, reporting-period selection, and pagination. Approval/rejection accept the recommendation ID, not a client-supplied budget or evidence payload. The server owns state transitions and proposed values.

Translate expected failures consistently to tRPC errors: invalid input, not found, and conflict. Unexpected failures return a safe generic error rather than SQL details or stack traces. There is no controller exception-filter assumption.

The frontend shows campaigns, recommendation summaries, evidence/details, decision actions, and status. Provide loading, empty, and error states; disable repeat submissions while a mutation is pending, while retaining server-side duplicate protection. Refresh relevant TanStack Query data after mutations. Show rejected recommendations as rejected and approved recommendations as awaiting execution. There is no execute button.

## 7. Verification and acceptance

Tests accompany each increment rather than being postponed to the end.

- Unit tests: rule threshold, zero spend, rounding, ineligible data, and review decisions.
- PostgreSQL integration tests against a separate test database: migrations, uniqueness, transaction rollback, repeated generation, duplicate approvals, and concurrent conflicting decisions.
- API tests through the actual Fastify/tRPC wiring: validation, response contracts, error mapping, and approval behavior. Begin with a health endpoint request-level test before tRPC is introduced.
- Frontend checks: rendering, loading/error states, approve/reject interaction, and the distinction between approval and execution. Verify browser behavior when the frontend exists.
- Strict TypeScript checks and builds for affected workspace applications; Jest for backend tests.

V1 is functionally complete when seeded data can generate a deduplicated recommendation, its saved evidence is visible, review decisions are durable, approval creates exactly one pending intent atomically, rejection creates none, and all campaign budgets remain unchanged. Passing tests do not constitute a production-readiness claim.

## 8. Teaching progression

1. NestJS/Fastify foundation and a tested health endpoint.
2. Prisma/PostgreSQL campaign persistence, migrations, and fixtures.
3. tRPC/Zod boundary and a minimal React/TanStack Query connection.
4. Recommendation generation, evidence snapshots, and review UI.
5. Approval/rejection transactions, pending intents, and concurrency tests.

Each milestone may contain multiple small implementation lessons. Explain why each concept exists, compare with Spring Boot where useful, trace the code, examine trade-offs, demonstrate verification, and pause for questions and explicit continuation approval. Version compatibility and exact package APIs must be checked against official documentation before installation or implementation.
