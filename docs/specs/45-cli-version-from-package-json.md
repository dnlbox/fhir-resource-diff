---
**Status:** complete
---

# Spec 45 — CLI version sourced from package.json

## Goal

`fhir-resource-diff --version` reports `0.1.0`, the `--envelope` metadata reports `0.2.0`, and
`npm list -g fhir-resource-diff` shows `0.3.1`. All three disagree because both version strings
are hardcoded at two independent sites instead of being derived from `package.json` at build time.

## Reproduction

```bash
fhir-resource-diff --version
# → 0.1.0  (wrong — stale hardcode in cli/index.ts)

fhir-resource-diff validate - --format json --envelope <<< '{"resourceType":"Patient","id":"p1"}'
# → "version": "0.2.0"  (wrong — stale hardcode in core, TOOL_VERSION constant)

npm list -g fhir-resource-diff
# → fhir-resource-diff@0.3.1  (correct)
```

## Root cause

Two independent hardcoded strings:

1. `src/cli/index.ts` — `program.version("0.1.0")` — never updated when the package version bumps
2. `src/core/...` — `const TOOL_VERSION = "0.2.0"` — same problem, different stale value

## Fix

Read the version from `package.json` once at build time via `tsup` / `esbuild` define, and share
it across both sites:

```typescript
// src/version.ts  (new file — one source of truth)
// tsup inlines __PACKAGE_VERSION__ at build time via define
declare const __PACKAGE_VERSION__: string;
export const PACKAGE_VERSION = __PACKAGE_VERSION__;
```

```typescript
// tsup.config.ts — add define
define: {
  __PACKAGE_VERSION__: JSON.stringify(process.env.npm_package_version ?? "0.0.0"),
}
```

```typescript
// src/cli/index.ts
import { PACKAGE_VERSION } from '../version.js';
program.version(PACKAGE_VERSION);

// src/core/envelope.ts (or wherever TOOL_VERSION lives)
import { PACKAGE_VERSION } from '../version.js';
// replace TOOL_VERSION = "0.2.0" with PACKAGE_VERSION
```

## Deliverables

| File | Change |
|------|--------|
| `src/version.ts` | New — exports `PACKAGE_VERSION` constant inlined at build time |
| `tsup.config.ts` | Add `define: { __PACKAGE_VERSION__: ... }` |
| `src/cli/index.ts` | Replace hardcoded `"0.1.0"` with `PACKAGE_VERSION` |
| `src/core/` (TOOL_VERSION site) | Replace hardcoded `"0.2.0"` with `PACKAGE_VERSION` |
| `CHANGELOG.md` | Entry under `[Unreleased]` |

## Acceptance criteria

```bash
# After build — all three agree and match package.json "version" field
fhir-resource-diff --version
# → <version from package.json>

fhir-resource-diff validate - --format json --envelope <<< '{"resourceType":"Patient","id":"p1"}'
# → "version": "<version from package.json>"
```

## Do not do

- Do not read `package.json` at runtime via `fs.readFileSync` — that adds a filesystem dependency
  and breaks bundled/edge environments
- Do not update the hardcoded strings manually — that is what caused this drift in the first place
