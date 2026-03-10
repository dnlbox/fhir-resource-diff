# fhir-resource-diff

Structural diff, validation, and normalization for FHIR R4 JSON resources.

## Why this exists

FHIR resources evolve across API versions, profiles, and integration points. Diff tooling for FHIR is sparse. This tool fills that gap for developers and CI pipelines.

## Features

- Compare two FHIR JSON resources and see exactly what changed
- Validate resource shape before diffing
- Normalize resources before comparison (sort keys, trim strings, normalize dates)
- Named presets for common ignore patterns (`metadata`, `clinical`, `strict`)
- Output as human-readable text, JSON, or Markdown
- Browser-safe core library — works in Node.js and future web apps
- Written in TypeScript with full type exports

## Install

```bash
npm install -g fhir-resource-diff
# or
pnpm add -g fhir-resource-diff
```

## Quick start

Compare two resources:

```bash
fhir-resource-diff compare examples/patient-a.json examples/patient-b.json
```

```
Changed:
  birthDate: "1985-06-15" → "1985-06-20"
  meta.lastUpdated: "2024-01-15T10:00:00.000Z" → "2024-03-10T14:22:00.000Z"
  name[0].given[0]: "Jane" → "Janet"

Added:
  identifier[0].system: "urn:oid:1.2.36.146.595.217.0.1"
  identifier[0].type.coding[0].code: "MR"
  identifier[0].type.coding[0].system: "http://terminology.hl7.org/CodeSystem/v2-0203"
  identifier[0].use: "usual"
  identifier[0].value: "MRN-00442817"
  telecom[1].system: "email"
  telecom[1].use: "work"
  telecom[1].value: "janet.doe@example.com"
```

Validate a resource:

```bash
fhir-resource-diff validate examples/patient-a.json
```

```
valid
```

Output diff as JSON:

```bash
fhir-resource-diff compare a.json b.json --format json
```

```json
{
  "changed": [
    { "path": "birthDate", "left": "1985-06-15", "right": "1985-06-20" }
  ],
  "added": [
    { "path": "identifier[0].system", "right": "urn:oid:1.2.36.146.595.217.0.1" }
  ],
  "removed": []
}
```

## CLI reference

### compare

```
fhir-resource-diff compare <file-a> <file-b> [options]

  --format <fmt>      text | json | markdown  (default: text)
  --ignore <paths>    comma-separated paths to ignore (e.g. meta.lastUpdated,id)
  --preset <name>     metadata | clinical | strict
  --normalize <name>  canonical | none
  --no-color          disable color output
  --exit-on-diff      exit 1 if differences found (for CI)
```

### validate

```
fhir-resource-diff validate <file> [options]

  --format <fmt>  text | json  (default: text)
```

### normalize

```
fhir-resource-diff normalize <file> [options]

  --preset <name>   canonical | none  (default: canonical)
  --output <path>   write to file instead of stdout
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

The **core library** (`src/core/`) contains browser-safe shared logic — parsing, validation, normalization, and diffing — with no Node.js dependencies. **Formatters** (`src/formatters/`) are pure string renderers for text, JSON, and Markdown output, also browser-safe. The **CLI adapter** (`src/cli/`) is a thin Node.js layer that reads files, parses flags, calls the core, and prints output.

This separation means the same validation and diff logic can power both the CLI and a future hosted web app.

## Roadmap

- **Phase 1** (current): core diff engine, validation, CLI, text/JSON/markdown output
- **Phase 2**: normalization presets, hardened browser-safe core, integration points for a future React/Vite web app
- **Phase 3**: profile-aware comparison, bundle support, richer semantic diffing, initial hosted app

## Contributing

Fork the repo, create a branch, and open a PR against `main`. `pnpm test` and `pnpm typecheck` must pass before submitting.

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

## License

MIT.
