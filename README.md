# fhir-resource-diff

Structural diff, validation, and normalization for FHIR R4 / R4B / R5 JSON resources.

[![CI](https://github.com/dnlbox/fhir-resource-diff/actions/workflows/ci.yml/badge.svg)](https://github.com/dnlbox/fhir-resource-diff/actions/workflows/ci.yml)
[![CodeQL](https://github.com/dnlbox/fhir-resource-diff/actions/workflows/codeql.yml/badge.svg)](https://github.com/dnlbox/fhir-resource-diff/actions/workflows/codeql.yml)
[![npm](https://img.shields.io/npm/v/fhir-resource-diff)](https://www.npmjs.com/package/fhir-resource-diff)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## What is FHIR?

FHIR (Fast Healthcare Interoperability Resources) is the modern standard for exchanging healthcare data, published by HL7. This tool works with FHIR JSON resources — the building blocks of healthcare APIs. → [Learn more at hl7.org/fhir](https://hl7.org/fhir/)

## Why this exists

FHIR resources evolve across API versions, profiles, and integration points. `fhir-resource-diff` is a fast, local tool for TypeScript and Node.js environments — built for CI pipelines, developer workflows, and AI agents that need programmatic access to FHIR payloads without a server-side validation dependency.

## Features

- Multi-version support: R4, R4B, R5 — auto-detected or explicit via `--fhir-version`
- Structural diff with path-level change tracking
- Structural validation with severity levels (error, warning, info)
- Resource type lookup with HL7 documentation links (`info` command)
- Resource discovery via `list-resources`
- Stdin/pipe support — compose with `curl`, `jq`, and other unix tools
- Machine-consumable JSON output with summary counts, doc URLs, and metadata envelope
- `--quiet` mode for headless CI (exit code only, no stdout)
- `--exit-on-diff` for CI gate checks
- Named presets for common ignore patterns (`metadata`, `clinical`, `strict`)
- Full TypeScript library API — import `diff()`, `validate()`, `parseJson()` directly

## The FHIR TypeScript ecosystem

The JavaScript/TypeScript FHIR community has built excellent tools across the stack
— type systems, API clients, platform SDKs, auth libraries, and IG authoring tools.
Each project solves a different slice of the problem, and `fhir-resource-diff` is
designed to complement them, not compete.

### Where each tool shines

| Focus area | Tool | What it does best |
|---|---|---|
| Type definitions | [`@types/fhir`](https://www.npmjs.com/package/@types/fhir), [`@medplum/fhirtypes`](https://www.npmjs.com/package/@medplum/fhirtypes) | TypeScript interfaces for FHIR resources — essential for type-safe application code |
| Platform SDK | [`@medplum/core`](https://www.npmjs.com/package/@medplum/core) | Full-featured FHIR client with profile validation, FHIRPath, and the Medplum platform |
| XML/JSON serialization | [`fhir`](https://www.npmjs.com/package/fhir) (Lantana) | FHIR XML ↔ JSON conversion and JSON Schema validation — one of the earliest FHIR JS tools |
| Auth & API client | [`fhirclient`](https://www.npmjs.com/package/fhirclient) | SMART on FHIR auth flows and API calls, maintained by SMART Health IT at Boston Children's |
| Conformance validation | [HL7 FHIR Validator](https://confluence.hl7.org/display/FHIR/Using+the+FHIR+Validator) | The reference implementation for full profile, terminology, and invariant validation |
| **Diff, fast validation, CI/CD** | **`fhir-resource-diff`** | **Structural diffing, format validation, and automation-first output** |

### What this tool adds to the ecosystem

`fhir-resource-diff` focuses on three areas where we saw a gap in the existing
tooling — not because other tools should have built these, but because they fall
outside the scope of what type libraries, API clients, and platform SDKs are designed
to solve:

**FHIR-aware structural diff.** Compare two resources path by path and get a
classified list of additions, removals, and changes — with dot-notation paths,
array index tracking, and ignore presets for metadata noise.

**AI agent and automation friendly.** Every command supports `--format json` for
structured output, `--envelope` for metadata wrapping (tool version, FHIR version,
timestamps, HL7 doc URLs), and stdin pipes for in-memory payloads. An agent can
validate and diff FHIR payloads without writing temp files, parse the output in one
pass, and follow the documentation links — no second tool call needed.

**CI/CD native.** `--exit-on-diff` fails the step when resources diverge.
`--quiet` suppresses stdout for exit-code-only gates. Exit codes are
severity-aware — warnings and info findings never produce non-zero exits.
JSON envelope output includes summary counts for automated triage.

### Using them together

These tools work well in combination:

- **[`@types/fhir`](https://www.npmjs.com/package/@types/fhir)** or **[`@medplum/fhirtypes`](https://www.npmjs.com/package/@medplum/fhirtypes)** for your application's TypeScript types, `fhir-resource-diff` for runtime validation and diffing
- **[`fhirclient`](https://www.npmjs.com/package/fhirclient)** for SMART auth and API transport, then pipe responses into `fhir-resource-diff` for validation and comparison
- **[HL7 FHIR Validator](https://confluence.hl7.org/display/FHIR/Using+the+FHIR+Validator)** for full profile conformance checks in staging, `fhir-resource-diff` for fast local validation and CI gates in the development loop

## Supported FHIR versions

| Version | Status | Spec URL |
|---------|--------|----------|
| R4 (4.0.1) | Default, fully supported | https://hl7.org/fhir/R4/ |
| R4B (4.3.0) | Supported | https://hl7.org/fhir/R4B/ |
| R5 (5.0.0) | Supported | https://hl7.org/fhir/R5/ |

## Install

```bash
npm install -g fhir-resource-diff
# or
pnpm add -g fhir-resource-diff
```

For project-local installation: `pnpm add -D fhir-resource-diff`

## Quick start

Compare two resources:

```bash
fhir-resource-diff compare examples/patient-a.json examples/patient-b.json
```

Validate a resource:

```bash
fhir-resource-diff validate examples/patient-a.json
# → valid
```

Validate with a specific FHIR version:

```bash
fhir-resource-diff validate examples/r5/patient-a.json --fhir-version R5
```

Output diff as JSON:

```bash
fhir-resource-diff compare a.json b.json --format json
```

## CLI reference

### compare

```
fhir-resource-diff compare <file-a> <file-b> [options]

Arguments:
  file-a, file-b      File paths or - to read from stdin

Options:
  --format <fmt>        text | json | markdown  (default: text)
  --fhir-version <ver>  R4 | R4B | R5  (default: auto-detect or R4)
  --ignore <paths>      comma-separated paths to ignore (e.g. meta.lastUpdated,id)
  --preset <name>       metadata | clinical | strict
  --normalize <name>    canonical | none
  --exit-on-diff        exit 1 if differences found (for CI)
  --quiet               suppress stdout output
  --envelope            wrap JSON output in metadata envelope (requires --format json)
```

### validate

```
fhir-resource-diff validate <file> [options]

Arguments:
  file                File path or - to read from stdin

Options:
  --format <fmt>        text | json  (default: text)
  --fhir-version <ver>  R4 | R4B | R5  (default: auto-detect or R4)
  --quiet               suppress stdout output
  --envelope            wrap JSON output in metadata envelope (requires --format json)
```

### normalize

```
fhir-resource-diff normalize <file> [options]

Arguments:
  file                File path or - to read from stdin

Options:
  --preset <name>       canonical | none  (default: canonical)
  --fhir-version <ver>  R4 | R4B | R5  (default: auto-detect or R4)
  --output <path>       write to file instead of stdout
  --quiet               suppress stdout output
```

### info

```
fhir-resource-diff info <resourceType> [options]

Lookup a FHIR resource type and get its HL7 documentation links.

Options:
  --fhir-version <ver>  Show docs link for a specific version only
  --format <fmt>        text | json  (default: text)
```

Example:

```bash
fhir-resource-diff info Patient
# Patient (base)
# FHIR versions: R4, R4B, R5
# Documentation:
#   R4:  https://hl7.org/fhir/R4/patient.html
#   R4B: https://hl7.org/fhir/R4B/patient.html
#   R5:  https://hl7.org/fhir/R5/patient.html
```

### list-resources

```
fhir-resource-diff list-resources [options]

List known FHIR resource types.

Options:
  --fhir-version <ver>  Filter to types available in a specific version
  --category <cat>      foundation | base | clinical | financial | specialized | conformance
  --format <fmt>        text | json  (default: text)
```

Example:

```bash
fhir-resource-diff list-resources --category clinical
fhir-resource-diff list-resources --fhir-version R5 --format json
```

## Use in CI

Use `fhir-resource-diff` as a CI gate to validate and diff FHIR payloads automatically.

**GitHub Actions example:**

```yaml
- name: Validate FHIR resource
  run: fhir-resource-diff validate payload.json --format json --fhir-version R4

- name: Diff against expected baseline
  run: |
    fhir-resource-diff compare expected.json actual.json \
      --format json --exit-on-diff --preset metadata --quiet
```

Key points:

- `--exit-on-diff` exits 1 when differences are found — fails the CI step
- `--quiet` suppresses stdout — useful when you only need the exit code
- `--format json` produces machine-parseable output for downstream tooling
- `--format json --envelope` wraps results in a metadata envelope with summary counts, tool version, FHIR version, and HL7 documentation URL
- Exit codes: 0 = success, 1 = differences found / validation errors, 2 = input error

## Use with AI agents and test harnesses

`fhir-resource-diff` is designed for automated tooling. Agents and test harnesses can pipe FHIR payloads directly without writing temp files.

**CLI — agent validates a payload from memory (no temp file):**

```bash
echo "$FHIR_PAYLOAD" | fhir-resource-diff validate - --format json --fhir-version R4
```

**CLI — agent diffs actual vs expected and gets structured output:**

```bash
echo "$ACTUAL_PAYLOAD" | fhir-resource-diff compare - expected.json \
  --format json --envelope --preset metadata
```

The `--envelope` JSON output is designed for automated consumers:

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
    "summary": { "added": 5, "removed": 0, "changed": 3, "typeChanged": 0, "total": 8 },
    "entries": [...],
    "documentation": "https://hl7.org/fhir/R4/patient.html"
  }
}
```

An agent can parse this once and know: what changed, how many changes, what FHIR version, and where to find the HL7 docs — without a second tool call.

**TypeScript library — agent harness imports directly:**

```typescript
import { parseJson, validate, diff } from "fhir-resource-diff";

const parsed = parseJson(responseBody);
if (!parsed.success) {
  throw new Error(`Invalid FHIR JSON: ${parsed.error}`);
}

const validation = validate(parsed.resource, "R4");
if (validation.valid === false) {
  const errors = validation.errors.filter(e => e.severity === "error");
  // errors[].docUrl points to the relevant HL7 page
}

const result = diff(parsed.resource, expectedFixture, {
  ignorePaths: ["meta.lastUpdated", "id"],
});
if (!result.identical) {
  // result.entries has structured diff for programmatic inspection
}
```

## Library usage

```typescript
import { parseJson, validate, diff, formatText } from "fhir-resource-diff";

const left = parseJson(rawJsonStringA);
const right = parseJson(rawJsonStringB);

if (left.success && right.success) {
  const result = diff(left.resource, right.resource, {
    ignorePaths: ["meta.lastUpdated", "id"],
  });
  console.log(formatText(result));
}
```

`parseJson`, `validate`, `diff`, and the formatters are browser-safe and can be used in a React/Vite app or any bundler.

## Architecture overview

```
┌─────────────────────────────────────────────────┐
│  CLI adapter (src/cli/)                         │
│  Node.js only — file I/O, flags, exit codes     │
├─────────────────────────────────────────────────┤
│  Formatters (src/formatters/)                   │
│  Browser-safe — text, JSON, markdown renderers  │
├─────────────────────────────────────────────────┤
│  Core library (src/core/)                       │
│  Browser-safe — parse, validate, diff, version  │
├─────────────────────────────────────────────────┤
│  Presets (src/presets/)                         │
│  Browser-safe — ignore fields, normalization    │
└─────────────────────────────────────────────────┘
```

The core library has no Node.js dependencies and can run in the browser. The CLI adapter is a thin layer on top that handles file I/O and process exit codes.

## Development

### Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9

### Setup

```bash
git clone https://github.com/<owner>/fhir-resource-diff.git
cd fhir-resource-diff
pnpm install
```

### Run the CLI locally (no build needed)

```bash
pnpm cli -- compare examples/patient-a.json examples/patient-b.json
pnpm cli -- validate examples/patient-a.json
pnpm cli -- normalize examples/observation-a.json
```

Note: the `--` separator after `pnpm cli` is required so pnpm passes flags to the script rather than consuming them.

### Common scripts

| Script | Purpose |
|--------|---------|
| `pnpm cli -- <args>` | Run CLI from source via tsx |
| `pnpm test` | Run tests |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm typecheck` | TypeScript type checking |
| `pnpm lint` | ESLint |
| `pnpm build` | Production build (tsup) |
| `pnpm dev` | Watch mode build (tsup --watch) |

## Related resources

- [FHIR specification](https://hl7.org/fhir/)
- [FHIR resource type listing](https://hl7.org/fhir/resourcelist.html)
- [FHIR R4](https://hl7.org/fhir/R4/) / [R4B](https://hl7.org/fhir/R4B/) / [R5](https://hl7.org/fhir/R5/)
- [HL7 FHIR tooling ecosystem](https://confluence.hl7.org/display/FHIR/FHIR+Tooling)
