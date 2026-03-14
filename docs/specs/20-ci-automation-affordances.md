# Spec 20 — CI and automation affordances

**Status:** complete

## Goal

Add CLI flags and output features designed specifically for CI pipelines and AI agents.
The tool already produces structured JSON and meaningful exit codes — this spec fills the
remaining gaps: silent mode for headless CI, and a metadata-rich JSON envelope that gives
automated consumers everything they need in a single parse.

## Dependencies

- Spec 12 (FHIR version model): `FhirVersion`, `resolveFhirVersion`
- Spec 13 (resource type registry): `getResourceDocUrl`
- Spec 16 (`--fhir-version` flag on existing commands)

## Deliverables

| File | Description |
|------|-------------|
| `src/core/types.ts` | Add `DiffSummary`, `OutputEnvelope` types |
| `src/core/summary.ts` | Pure function to compute summary counts from `DiffResult` |
| `src/core/envelope.ts` | Pure function to build the metadata envelope |
| `src/core/index.ts` | Re-export new symbols |
| `src/formatters/json.ts` | Support envelope output for both diff and validation |
| `src/cli/commands/compare.ts` | Add `--quiet` and `--envelope` flags |
| `src/cli/commands/validate.ts` | Add `--quiet` and `--envelope` flags |
| `src/cli/commands/normalize.ts` | Add `--quiet` flag |
| `tests/core/summary.test.ts` | Tests for summary computation |
| `tests/core/envelope.test.ts` | Tests for envelope building |
| `tests/cli/compare.test.ts` | Tests for `--quiet` and `--envelope` behavior |
| `tests/cli/validate.test.ts` | Tests for `--quiet` and `--envelope` behavior |

## New types

### DiffSummary

```typescript
export interface DiffSummary {
  added: number;
  removed: number;
  changed: number;
  typeChanged: number;
  total: number;
}
```

### OutputEnvelope

A generic wrapper that adds metadata around any command's result:

```typescript
export interface OutputEnvelope<T> {
  /** Tool identifier — always "fhir-resource-diff". */
  tool: string;
  /** Tool version from package.json. */
  version: string;
  /** Command that produced this output. */
  command: string;
  /** Resolved FHIR version used for this operation. */
  fhirVersion: string;
  /** Timestamp of when the operation ran (ISO 8601). */
  timestamp: string;
  /** The actual result payload. */
  result: T;
}
```

## New functions

### summary.ts

```typescript
import type { DiffResult, DiffSummary } from "@/core/types.js";

/**
 * Computes summary counts from a DiffResult.
 * Pure function — no I/O, no side effects.
 */
export function summarizeDiff(result: DiffResult): DiffSummary;
```

Implementation: iterate `result.entries`, count by `kind`, return totals.

### envelope.ts

```typescript
import type { OutputEnvelope } from "@/core/types.js";

/**
 * Wraps a result payload in the standard output envelope.
 * Browser-safe — reads version from a constant, not from filesystem.
 */
export function buildEnvelope<T>(
  command: string,
  fhirVersion: string,
  result: T,
): OutputEnvelope<T>;
```

Implementation notes:
- `tool` is always `"fhir-resource-diff"`.
- `version` should come from a `TOOL_VERSION` constant exported from a small module
  (e.g. `src/core/version.ts` with `export const TOOL_VERSION = "0.2.0"`), **not** from
  reading `package.json` at runtime. This keeps the function browser-safe.
- `timestamp` uses `new Date().toISOString()`.

## CLI flags

### `--quiet`

Available on: `compare`, `validate`, `normalize`.

```
--quiet    Suppress all stdout output. Only the exit code indicates the result.
```

Behavior:
- Skip all `process.stdout.write` calls.
- Stderr output (warnings, errors) is NOT suppressed — `--quiet` only affects stdout.
- Exit codes work exactly as before.
- Can be combined with any format flag (the format is simply not written).

Primary use case: CI steps where you only care about pass/fail:

```bash
fhir-resource-diff compare expected.json actual.json --exit-on-diff --quiet
# Exit 0 = identical, Exit 1 = differences found
```

### `--envelope`

Available on: `compare`, `validate` (when `--format json` is also specified).

```
--envelope    Wrap JSON output in a metadata envelope with tool version, FHIR version,
              timestamps, and (for compare) summary counts.
```

Behavior:
- Only takes effect when `--format json` is also specified. If `--format text` or
  `--format markdown` is used with `--envelope`, print a warning to stderr and ignore
  the flag (do not error).
- For `compare`, the envelope result includes both the full `DiffResult` and a `summary`
  field with counts.
- For `validate`, the envelope result includes the `ValidationResult` as-is.

### Compare envelope output

```json
{
  "tool": "fhir-resource-diff",
  "version": "0.2.0",
  "command": "compare",
  "fhirVersion": "R4",
  "timestamp": "2026-03-10T21:00:00.000Z",
  "result": {
    "resourceType": "Patient",
    "identical": false,
    "summary": {
      "added": 5,
      "removed": 0,
      "changed": 3,
      "typeChanged": 0,
      "total": 8
    },
    "entries": [
      { "kind": "changed", "path": "birthDate", "left": "1985-06-15", "right": "1985-06-20" }
    ],
    "documentation": "https://hl7.org/fhir/R4/patient.html"
  }
}
```

Key additions over raw `DiffResult`:
- `summary` — counts by kind, so an agent can branch on `summary.total === 0` or
  `summary.added > 0` without iterating entries.
- `documentation` — HL7 URL for the resource type, so the agent can provide the link
  to the user or include it in a report.
- Envelope metadata — tool version, FHIR version, timestamp for audit trails.

### Validate envelope output

```json
{
  "tool": "fhir-resource-diff",
  "version": "0.2.0",
  "command": "validate",
  "fhirVersion": "R4",
  "timestamp": "2026-03-10T21:00:00.000Z",
  "result": {
    "valid": false,
    "errors": [
      {
        "path": "resourceType",
        "message": "resourceType must be a non-empty string",
        "severity": "error"
      }
    ],
    "documentation": "https://hl7.org/fhir/R4/patient.html"
  }
}
```

## Implementation notes

- `--quiet` is a simple boolean check before any `stdout.write` call. The cleanest approach
  is to wrap the output step:

```typescript
if (!opts.quiet) {
  process.stdout.write(output + "\n");
}
```

- `--envelope` builds the envelope in the CLI command, not in the formatter. The formatter
  produces the inner `result` payload; the CLI command wraps it with `buildEnvelope()` and
  then `JSON.stringify`s the whole thing.

- `summarizeDiff` is a core library function, not CLI-only. Library consumers may also want
  summary counts without shelling out.

- `buildEnvelope` is also a core library function for the same reason. An agent harness using
  the TypeScript API can call `buildEnvelope("compare", "R4", enrichedResult)`.

- The `documentation` URL inside the result (not the envelope) is computed by the CLI command
  using `getResourceDocUrl(result.resourceType, resolvedVersion)` before passing to the
  envelope builder.

- All core functions (`summarizeDiff`, `buildEnvelope`) must be browser-safe. No Node imports.

- The `TOOL_VERSION` constant must be updated manually when bumping the version. It is NOT
  read from `package.json` at runtime because that would require `node:fs` and break
  browser safety. A future build step could inject it automatically.

## Acceptance criteria

```bash
pnpm typecheck   # passes
pnpm test        # all tests pass
pnpm lint        # passes
```

Manual smoke tests:

```bash
# --quiet suppresses stdout
pnpm cli -- compare examples/patient-a.json examples/patient-b.json --quiet --exit-on-diff
echo $?
# → 1 (differences found), no stdout output

pnpm cli -- validate examples/patient-a.json --quiet
echo $?
# → 0, no stdout output

# --envelope wraps JSON output
pnpm cli -- compare examples/patient-a.json examples/patient-b.json --format json --envelope
# → envelope JSON with tool, version, fhirVersion, timestamp, result.summary, result.entries

pnpm cli -- validate examples/patient-a.json --format json --envelope
# → envelope JSON with result.valid

# --envelope without --format json → warning, ignored
pnpm cli -- compare examples/patient-a.json examples/patient-b.json --envelope
# → normal text output + stderr warning about --envelope requiring --format json

# --quiet + --envelope (valid combo: no output at all)
pnpm cli -- compare examples/patient-a.json examples/patient-b.json \
  --format json --envelope --quiet --exit-on-diff
echo $?
# → exit code only
```

Tests must cover:

- `summarizeDiff` with empty entries → all zeros
- `summarizeDiff` with mixed entries → correct counts
- `summarizeDiff` total equals sum of individual counts
- `buildEnvelope` includes tool, version, command, fhirVersion, timestamp
- `buildEnvelope` timestamp is valid ISO 8601
- CLI `--quiet` suppresses stdout for compare
- CLI `--quiet` suppresses stdout for validate
- CLI `--quiet` does not suppress stderr
- CLI `--envelope` with `--format json` produces valid envelope JSON
- CLI `--envelope` without `--format json` prints warning and proceeds normally
- CLI `--quiet` + `--exit-on-diff` still sets correct exit code
- Envelope `result.summary` matches expected counts
- Envelope `result.documentation` is a valid HL7 URL

## Do not do

- Do not add `--envelope` support for `--format text` or `--format markdown` — it's JSON only.
- Do not read `package.json` at runtime for the version — use a static constant.
- Do not add `--verbose` or `--debug` flags — that's a separate concern for a future spec.
- Do not add log-level configuration — keep it simple: normal or quiet.
- Do not change existing `--format json` output when `--envelope` is NOT specified. The
  default JSON output must remain backward-compatible.
