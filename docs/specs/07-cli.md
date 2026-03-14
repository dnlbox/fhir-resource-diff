# Spec 07 — CLI adapter

**Status:** complete

## Goal

Implement the Node.js CLI adapter that wires the core library and formatters into a runnable
command-line tool. This is the only layer that may use Node.js APIs.

## Dependencies

- Spec 02: `parseJson`, `validate`
- Spec 03: `diff`
- Spec 04: `normalize`
- Spec 05: `formatText`, `formatJson`, `formatMarkdown`, `formatValidationText`, `formatValidationJson`
- Spec 06: `getIgnorePreset`, `getNormalizationPreset`, `mergeIgnorePresets`

## Deliverables

| File | Description |
|------|-------------|
| `src/cli/index.ts` | CLI entry point; program definition and command registration |
| `src/cli/commands/compare.ts` | `compare` command implementation |
| `src/cli/commands/validate.ts` | `validate` command implementation |
| `src/cli/commands/normalize.ts` | `normalize` command implementation |
| `src/cli/utils/read-file.ts` | File reading helper (Node-only) |
| `tests/cli/compare.test.ts` | Integration tests for compare command |
| `tests/cli/validate.test.ts` | Integration tests for validate command |

## Command surface

### compare

```
fhir-resource-diff compare <file-a> <file-b> [options]

Arguments:
  file-a          Path to the base FHIR resource (JSON)
  file-b          Path to the target FHIR resource (JSON)

Options:
  --format <fmt>        Output format: text | json | markdown  (default: text)
  --ignore <paths>      Comma-separated field paths to ignore
  --preset <name>       Named ignore preset: metadata | clinical | strict
  --normalize <name>    Named normalization preset: canonical | none
  --no-color            Disable color output
  --exit-on-diff        Exit code 1 if differences found (useful for CI)
```

### validate

```
fhir-resource-diff validate <file> [options]

Arguments:
  file            Path to the FHIR resource (JSON) to validate

Options:
  --format <fmt>  Output format: text | json  (default: text)
```

### normalize

```
fhir-resource-diff normalize <file> [options]

Arguments:
  file            Path to the FHIR resource (JSON) to normalize

Options:
  --preset <name>  Normalization preset: canonical | none  (default: canonical)
  --output <path>  Write normalized JSON to file (default: stdout)
```

## Exit codes

| Code | Meaning |
|------|---------|
| 0 | Success, no differences found (or no validation errors) |
| 1 | Differences found (compare with `--exit-on-diff`) OR validation errors found |
| 2 | Input/usage error (file not found, invalid JSON, invalid flags) |

## Implementation notes

### Structure

`src/cli/index.ts` creates the Commander program, registers commands, and calls `program.parse()`.
Each command is defined in its own file in `src/cli/commands/` and registered in `index.ts`.

### File reading

`src/cli/utils/read-file.ts` exports:

```typescript
import { readFileSync } from "node:fs";

export function readFileOrExit(filePath: string): string;
```

If the file does not exist, print an error to `stderr` and `process.exit(2)`.

### Command flow (compare)

```
1. Read file-a and file-b from disk
2. Parse each with parseJson() — exit(2) on parse failure
3. Validate each with validate() — warn on stderr if invalid (do not exit; allow diffing invalid resources)
4. If --normalize: look up preset and call normalize() on both resources
5. Build DiffOptions from --ignore and --preset flags (merge if both provided)
6. Call diff(left, right, options)
7. Call the appropriate formatter
8. Write result to stdout
9. Exit: 0 by default; 1 if --exit-on-diff and differences found
```

### Colors

Use `picocolors` for coloring text formatter output in the CLI. Apply color AFTER the formatter
returns a string — do a simple post-process pass:
- Lines starting with `Changed:`, `Added:`, `Removed:` → section headers in yellow
- `→` arrows → dim
- Added paths → green
- Removed paths → red

Check `process.env.NO_COLOR` or the `--no-color` flag before applying colors.

## Acceptance criteria

```bash
pnpm build    # builds a working binary at dist/cli/index.js
pnpm typecheck
pnpm test     # CLI tests pass
```

Manual smoke tests (run after build):

```bash
node dist/cli/index.js compare examples/patient-a.json examples/patient-b.json
# → diff output in text format

node dist/cli/index.js compare examples/patient-a.json examples/patient-b.json --format json
# → valid JSON output

node dist/cli/index.js validate examples/patient-a.json
# → "valid" output, exit 0

node dist/cli/index.js compare examples/patient-a.json examples/patient-a.json
# → "identical" output

node dist/cli/index.js compare examples/patient-a.json examples/patient-b.json --ignore meta.lastUpdated,id
# → diff without meta.lastUpdated and id entries

fhir-resource-diff --help
fhir-resource-diff compare --help
```

## Do not do

- Do not put business logic in command files — they orchestrate, they don't compute.
- Do not use `console.log` for structured results — use `process.stdout.write` with the formatted string.
- Do not use Node APIs in `src/core/` or `src/formatters/`.
- Do not implement an interactive mode, REPL, or any TUI elements.
