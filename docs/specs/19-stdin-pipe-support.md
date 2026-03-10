# Spec 19 — Stdin and pipe support

## Goal

Support reading FHIR resources from stdin so the CLI works in unix pipelines **and** can be
called by automated tools without writing temp files. This is critical for two audiences:

1. **Unix composability** — pipe from `curl`, `jq`, `cat`, `pbpaste`, etc.
2. **AI agents and test harnesses** — an agent that has a FHIR payload in a variable can
   pipe it directly into the CLI without filesystem round-trips. This is the primary way
   automated tools will invoke validation and diffing.

## Dependencies

- Specs 00–09 complete (v1 baseline)
- No dependency on other Phase 2 specs — can be implemented in parallel

## Deliverables

| File | Description |
|------|-------------|
| `src/cli/utils/read-file.ts` | Extend to handle `-` as stdin shorthand |
| `src/cli/utils/read-stdin.ts` | New module: read all of stdin into a string |
| `src/cli/commands/compare.ts` | Support `-` as file argument |
| `src/cli/commands/validate.ts` | Support `-` as file argument |
| `src/cli/commands/normalize.ts` | Support `-` as file argument |
| `tests/cli/stdin.test.ts` | Tests for stdin reading behavior |

## Usage

### Developer / unix pipeline examples

```bash
# Validate from stdin
cat examples/patient-a.json | fhir-resource-diff validate -

# Validate piped from curl
curl -s https://example.com/fhir/Patient/123 | fhir-resource-diff validate -

# Compare stdin against a file
cat modified-patient.json | fhir-resource-diff compare - examples/patient-a.json

# Compare a file against stdin
cat other-patient.json | fhir-resource-diff compare examples/patient-a.json -

# Normalize from stdin and pipe to jq
cat examples/patient-a.json | fhir-resource-diff normalize - | jq .

# Chain with jq
curl -s https://example.com/fhir/Patient/123 | jq '.name[0]' | fhir-resource-diff validate -
```

### AI agent / test harness examples

```bash
# Agent validates a payload it holds in a variable (no temp file needed)
echo "$FHIR_PAYLOAD" | fhir-resource-diff validate - --format json --fhir-version R4

# Agent diffs an actual API response against an expected fixture
echo "$API_RESPONSE" | fhir-resource-diff compare - expected-patient.json \
  --format json --envelope --preset metadata

# Agent checks if a payload matches a baseline (exit code only, no stdout)
echo "$PAYLOAD" | fhir-resource-diff compare - baseline.json --exit-on-diff --quiet
```

These patterns avoid filesystem round-trips, which matters for agents running many
validations in sequence and for sandboxed environments without writable filesystems.

## Implementation

### read-stdin.ts

```typescript
import { readFileSync } from "node:fs";

/**
 * Reads all of stdin synchronously and returns it as a UTF-8 string.
 * Throws if stdin is a TTY (no piped input).
 */
export function readStdinSync(): string;
```

Implementation: use `readFileSync("/dev/stdin", "utf-8")` on unix. This is the simplest
cross-platform approach for synchronous stdin reading in Node.js. On Windows,
`readFileSync(0, "utf-8")` reads from file descriptor 0.

For portability, try fd 0 first, fall back to `/dev/stdin`:

```typescript
export function readStdinSync(): string {
  try {
    return readFileSync(0, "utf-8");
  } catch {
    return readFileSync("/dev/stdin", "utf-8");
  }
}
```

### read-file.ts changes

Update `readFileOrExit` to handle `-`:

```typescript
export function readFileOrExit(filePath: string): string {
  if (filePath === "-") {
    try {
      return readStdinSync();
    } catch (err) {
      process.stderr.write("Error: failed to read from stdin\n");
      process.exit(2);
    }
  }
  // existing file reading logic
}
```

### compare command

Add validation: if both `file-a` and `file-b` are `-`, print an error and exit:

```
Error: cannot read both resources from stdin. Provide at least one file path.
```

Exit code 2.

The stdin content should only be read once and reused if both commands need it.
Since `readStdinSync()` consumes the stream, call it once and pass the result.

Implementation approach for compare:

```typescript
// In the compare action, before reading files:
if (fileA === "-" && fileB === "-") {
  process.stderr.write(
    "Error: cannot read both resources from stdin. Provide at least one file path.\n",
  );
  process.exit(2);
}

const rawA = readFileOrExit(fileA);
const rawB = readFileOrExit(fileB);
```

This works because if only one is `-`, `readFileOrExit` handles it.

### TTY detection

If stdin is a TTY (no pipe) and `-` is used, the CLI should not hang waiting for input.
Check `process.stdin.isTTY`:

```typescript
export function readStdinSync(): string {
  if (process.stdin.isTTY) {
    throw new Error("No input on stdin (stdin is a TTY)");
  }
  // ... read logic
}
```

When this error is caught in `readFileOrExit`, print:

```
Error: no input on stdin. Pipe data to stdin or provide a file path.
Usage: cat resource.json | fhir-resource-diff validate -
```

## Acceptance criteria

```bash
pnpm typecheck   # passes
pnpm test        # stdin tests pass
pnpm lint        # passes
```

Manual smoke tests:

```bash
# Validate from stdin
cat examples/patient-a.json | pnpm cli -- validate -
# → "valid"

# Compare with stdin as left
cat examples/patient-b.json | pnpm cli -- compare - examples/patient-a.json
# → diff output

# Compare with stdin as right
cat examples/patient-b.json | pnpm cli -- compare examples/patient-a.json -
# → diff output

# Normalize from stdin
cat examples/patient-a.json | pnpm cli -- normalize -
# → normalized JSON on stdout

# Both stdin → error
echo '{}' | pnpm cli -- compare - -
# → "Error: cannot read both resources from stdin"

# No pipe + dash → helpful error
pnpm cli -- validate -
# → "Error: no input on stdin" (should not hang)
```

Tests must cover:

- `readStdinSync` reads piped input correctly
- `readFileOrExit("-")` delegates to stdin reader
- `readFileOrExit("somefile.json")` still reads files normally
- Compare with both args as `-` → error exit 2
- TTY detection produces helpful error (mock `process.stdin.isTTY`)
- Full pipeline: stdin → validate → correct output
- Full pipeline: stdin + file → compare → correct diff

## Do not do

- Do not support reading from stdin without the explicit `-` argument.
- Do not add interactive prompts or readline-based input.
- Do not buffer stdin asynchronously — keep it synchronous for simplicity.
- Do not support reading multiple resources from a single stdin stream (e.g. NDJSON) — that
  is a future feature.
- Do not add `-` support to the `info` or `list-resources` commands — they don't read files.
