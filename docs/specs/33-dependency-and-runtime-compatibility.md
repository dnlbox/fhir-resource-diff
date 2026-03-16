# Spec 33 — Dependency discipline and runtime compatibility

**Status:** complete

## Goal

Two related problems addressed together:

1. **Dependency drift** — `pnpm outdated` already shows meaningful drift
   (`@typescript-eslint` two majors behind, causing a TypeScript compatibility
   warning on every lint run; `vitest` and `commander` also behind). No structured
   process exists to keep this in check.

2. **Runtime compatibility** — `src/core/` is explicitly runtime-agnostic
   (no `node:*` imports, enforced by `src/core/AGENTS.md`), but that property
   is never tested. Bun and Deno are real deployment targets for FHIR tooling.
   Node.js minimum version is declared in `engines` but not verified in CI.

**Contributor DX constraint:** all compatibility checks run in CI only.
Contributors should not need Bun, Deno, or multiple Node versions installed locally.

---

## Scope

### In scope

1. **Renovate** — automated dependency update PRs, no automerge
2. **Node.js minimum version matrix** — define minimum, test against it in CI
3. **Bun compatibility** — CI-only; library core smoke test under Bun
4. **Deno compatibility** — CI-only; library core smoke test under Deno

### Out of scope

- Running the CLI under Deno — the CLI uses `node:fs` by design
- JSR publishing — evaluate after compatibility is confirmed
- Any new local dev tooling requirement beyond the existing `pnpm install`

---

## 1. Dependency management with Renovate

### Why Renovate, not Dependabot

Renovate has better pnpm support, allows grouping coupled packages (packages that
must always move together), and gives finer control over scheduling and PR policy.
Dependabot does not support `pnpm` lockfile updates as reliably.

### No automerge

All dependency updates — including minor and patch — require a PR with CI passing
before merge. Automated merges of dependency updates carry real risk: a patch can
introduce a regression that reaches every user before anyone notices. The PR is
the review gate; CI passing is necessary but not sufficient.

### `.github/renovate.json`

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": ["config:recommended"],
  "schedule": ["before 6am on monday"],
  "labels": ["dependencies"],
  "packageRules": [
    {
      "matchPackageNames": [
        "@typescript-eslint/eslint-plugin",
        "@typescript-eslint/parser"
      ],
      "groupName": "typescript-eslint",
      "groupSlug": "typescript-eslint"
    },
    {
      "matchPackageNames": ["vitest", "@vitest/coverage-v8"],
      "groupName": "vitest",
      "groupSlug": "vitest"
    }
  ]
}
```

**Coupled package groups:**

| Group | Packages | Reason |
|-------|----------|--------|
| `typescript-eslint` | `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser` | Must always be the same major; mismatched versions cause parse errors |
| `vitest` | `vitest`, `@vitest/coverage-v8` | Coverage plugin must match test runner version |

### Dependency update policy

| Update type | Action |
|-------------|--------|
| Patch | Open PR → review changelog → merge if CI green |
| Minor | Open PR → review changelog → merge if CI green |
| Major | Open PR → read migration guide → open a spec if code changes needed |
| Coupled packages | Always in a single grouped PR |
| Security advisory | Open PR immediately regardless of schedule |

---

## 2. Node.js minimum version

### Current state

`package.json` declares `engines.node: ">=20.0.0"`. The CI workflow uses
`node-version: lts/*` which resolves to the current LTS, not the minimum.
If something accidentally requires a newer Node API, CI would not catch it.

### Minimum version rationale

Node 20 is the right minimum:

- `structuredClone` (used in `normalize.ts`) requires Node 17+
- `node:` protocol imports require Node 14.18+
- `"type": "module"` (ESM) is stable from Node 12+
- Node 18 reached EOL in April 2025 — no reason to support it
- Node 20 is the oldest still-maintained LTS line

### CI matrix change

Update `ci.yml` to test on both the minimum (`20`) and the current LTS:

```yaml
strategy:
  matrix:
    node-version: ["20", "lts/*"]
```

This catches accidental use of APIs that were added after Node 20.

---

## 3. Bun compatibility

Bun is Node.js-compatible for `src/core/` — it implements the same built-in
APIs and handles ESM. The test confirms the library loads and behaves correctly
under Bun without any changes to the source.

### `tests/compat/bun.test.ts`

Focused smoke test of the public API. Does not replicate the Vitest suite —
one path through each major export is enough to confirm the module loads and
core logic runs.

```typescript
import { test, expect } from "bun:test";
import { parseJson, diff, normalize, validate } from "../../src/core/index.ts";

test("parseJson returns a valid resource", () => {
  const result = parseJson('{"resourceType":"Patient","id":"p1"}');
  expect(result.success).toBe(true);
});

test("diff detects a changed field", () => {
  const a = { resourceType: "Patient", id: "p1", active: true };
  const b = { resourceType: "Patient", id: "p1", active: false };
  const result = diff(a, b, {});
  expect(result.identical).toBe(false);
});

test("normalize returns resource and stats", () => {
  const resource = { resourceType: "Patient", z: 1, a: 2 };
  const { resource: r, stats } = normalize(resource, { sortObjectKeys: true });
  expect(Object.keys(r)[0]).toBe("a");
  expect(stats.keysSorted).toBeGreaterThan(0);
});

test("validate returns a result", () => {
  const resource = { resourceType: "Patient", id: "p1" };
  const result = validate(resource, "R4");
  expect(typeof result.valid).toBe("boolean");
});
```

### CI: runs against TypeScript source directly

Bun resolves TypeScript natively — no build step needed for the Bun job.

---

## 4. Deno compatibility

Deno can consume npm packages. The test imports from the local built `dist/`
using a relative path — this validates the current build, not the last published
release, which is what's useful in CI.

### `tests/compat/deno.ts`

A standalone script (not a test framework file). Exits non-zero on failure.
Runs against the built dist so it validates the published artefact shape.

```typescript
import { parseJson, diff, normalize } from "../../dist/core/index.js";

const parsed = parseJson('{"resourceType":"Patient","id":"p1"}');
if (!parsed.success) throw new Error("parseJson failed");

const a = { resourceType: "Patient", active: true };
const b = { resourceType: "Patient", active: false };
const d = diff(a, b, {});
if (d.identical) throw new Error("diff failed to detect change");

const { stats } = normalize(a, { sortObjectKeys: true });
if (typeof stats.keysSorted !== "number") throw new Error("normalize stats missing");

console.log("Deno compat: OK");
```

### CI: requires build step first

```yaml
- run: pnpm build
- run: deno run --allow-read tests/compat/deno.ts
```

---

## 5. Compatibility CI workflow

### `.github/workflows/compat.yml`

Separate from `ci.yml` — a compatibility failure should not block normal CI.
Both runtimes are informational signals while the feature is new; they become
blocking once stability is confirmed.

```yaml
name: Runtime compatibility

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  bun:
    name: Bun
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun test tests/compat/bun.test.ts

  deno:
    name: Deno
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: ">=9.0.0"
      - uses: actions/setup-node@v4
        with:
          node-version: lts/*
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - uses: denoland/setup-deno@v2
        with:
          deno-version: v2.x
      - run: deno run --allow-read tests/compat/deno.ts
```

---

## Deliverables

| File | Change |
|------|--------|
| `.github/renovate.json` | New — Renovate config, no automerge |
| `.github/workflows/ci.yml` | Add Node 20 + lts/* matrix |
| `.github/workflows/compat.yml` | New — Bun and Deno compatibility jobs |
| `tests/compat/bun.test.ts` | New — Bun smoke tests |
| `tests/compat/deno.ts` | New — Deno smoke script |
| `CHANGELOG.md` | Add entry under [Unreleased] |

---

## Acceptance criteria

### Renovate
- Renovate opens a PR on Monday for `@typescript-eslint` v7 → v8 (both packages in one PR)
- PR has `dependencies` label and passes CI before anyone reviews it
- No PR is automerged

### Node.js matrix
- CI runs and passes on Node 20 and `lts/*`
- If a `Node 22+`-only API is accidentally used, the Node 20 job catches it

### Bun
```bash
# CI only — contributors do not need Bun locally
bun test tests/compat/bun.test.ts  # 4 tests pass
```

### Deno
```bash
# CI only — contributors do not need Deno locally
pnpm build && deno run --allow-read tests/compat/deno.ts
# Deno compat: OK
```

---

## Do not do

- Do not automerge any dependency updates — PRs are the review gate
- Do not add Bun or Deno to the pre-commit hook or require them locally
- Do not move Bun/Deno jobs into `ci.yml` — keep them in `compat.yml` so a
  runtime regression doesn't block normal development while being investigated
- Do not attempt to make the CLI work under Deno in this spec
