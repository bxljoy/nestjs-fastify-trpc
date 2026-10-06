# Dependency audit — Lesson 02A

Initial review: 2026-10-01. Publication recheck: 2026-10-06. Revisit by 2026-10-15, on a Prisma upgrade, or before changing database providers/config loading, whichever comes first.

`pnpm audit` currently reports **two high and two moderate advisories**: three in the Prisma tooling graph and one in the existing Jest tooling graph. Its nonzero result is retained; no advisory is suppressed and no automatic forced remediation was applied. This application remains a local learning project, not production-ready.

## Findings and current exposure

| Dependency | Advisory | Current path / exposure | Follow-up |
|---|---|---|---|
| `deepmerge-ts@7.1.5` | [GHSA-ggr8-5vv4-36mx](https://github.com/advisories/GHSA-ggr8-5vv4-36mx), high: stack exhaustion on recursive object graphs | Loaded by `prisma → @prisma/config` when the CLI loads config. Our versioned `prisma.config.ts` supplies a fixed acyclic object and a URL string, not caller-supplied objects. There is no HTTP/config-object input path in this lesson. | Prefer an upstream Prisma release using a patched dependency. Patched deepmerge-ts starts at 8.0.0; review compatibility before any major-version override. |
| `mysql2@3.15.3` | [GHSA-3f6p-5ww8-9rcr](https://github.com/advisories/GHSA-3f6p-5ww8-9rcr), high: authentication downgrade can expose credentials | Shipped by Prisma CLI. This project uses PostgreSQL through `@prisma/adapter-pg`, not MySQL connections or authentication. | Upgrade through Prisma or a separately reviewed override; patched mysql2 begins at 3.22.0 for this finding. |
| `mysql2@3.15.3` | [GHSA-rgwj-5xj2-c3m3](https://github.com/advisories/GHSA-rgwj-5xj2-c3m3), moderate: compressed-protocol decompression bomb | The MySQL compressed-protocol handler is not used by PostgreSQL migrations or queries. | A fix covering both MySQL findings requires mysql2 >=3.23.1. |

The audit graph can classify these as production dependencies through `@prisma/client`'s Prisma peer link, even though the affected functions here belong to CLI/configuration or an unused database provider. Do not dismiss findings just because a manifest says devDependency; assess the actual path and inputs.

## Additional publication-time finding

`sprintf-js@1.0.3`: [GHSA-hp3w-g68c-fv3c](https://github.com/advisories/GHSA-hp3w-g68c-fv3c), moderate denial of service when attacker-controlled format strings supply unbounded precision. The path is Jest / Istanbul tooling → js-yaml → argparse → sprintf-js; the application does not import this formatter or expose a format-string API. This assessment assumes trusted local test configuration and CLI use, not execution of untrusted projects. Retain it as tooling follow-up rather than forcing a dependency override during publication. The audit suggests >=1.1.4, while the GitHub advisory does not name a confirmed first patched release; verify an upstream fix before choosing a replacement.

## Decision for the bounded lesson

Defer dependency substitution with these explicit exposure limits: only local trusted configuration, PostgreSQL only, no public deployment, and no user-supplied config object loading. This is a risk assessment, not a claim that the dependency versions are fixed or that audits prove safety. Re-evaluate if any limit changes. Reviewers should challenge these assumptions rather than treating this document as an automatic waiver.

Verification commands:

```bash
pnpm audit
pnpm --filter @budget-review/api why deepmerge-ts mysql2
```

Other retained warnings: Jest's test-only VM-modules experimental warning and a deprecated transitive `glob@10.5.0` dependency. These are distinct from the security advisories above.
