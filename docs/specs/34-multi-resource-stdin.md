# Spec 34 — Multi-resource stdin support

**Status:** complete

## Goal

Extend `validate -` (and only `validate`) to accept multiple FHIR resources from stdin in
three input formats: a single JSON object (existing behaviour), a JSON array, and NDJSON
(Newline-Delimited JSON). Auto-detect the format from the input and validate each resource
independently.

The primary motivation is interoperability with `fhir-test-data`:

```bash
# Works today (single resource)
cat examples/patient-a.json | fhir-resource-diff validate -

# Fails today — fhir-test-data outputs a JSON array when --count > 1
fhir-test-data generate patient --count 5 | fhir-resource-diff validate -

# Works today as a workaround, should also work natively
fhir-test-data generate patient --count 5 --format ndjson | fhir-resource-diff validate -
```

After this spec, all three forms work with auto-detection.

## Out of scope

- `compare` and `normalize` do not gain multi-resource support. Those commands operate on
  exactly two resources (compare) or one resource (normalize) by nature.
- File path arguments (non-stdin) do not gain multi-resource support in this spec.
- No support for FHIR Bundle resources as multi-resource input. A Bundle is a single FHIR
  resource; it will be validated as one unit, not unwrapped.

## Dependencies

- Spec 19 (stdin pipe support) — complete

## Deliverables

| File | Description |
|------|-------------|
| `src/cli/utils/detect-input-format.ts` | Detect single object / JSON array / NDJSON |
| `src/cli/utils/parse-multi-resource.ts` | Parse raw string into `FhirResource[]` |
| `src/cli/commands/validate.ts` | Fan out over multiple resources; adapt output |
| `tests/cli/multi-resource.test.ts` | Unit and integration tests |

## Input format detection

Detection is done by inspecting the raw string before parsing.

```typescript
type InputFormat = "single" | "array" | "ndjson";

function detectInputFormat(raw: string): InputFormat;
```

### Rules

1. Trim leading whitespace from the raw string.
2. If the first non-whitespace character is `[` → **array**
3. Otherwise, count the number of lines that start with `{` after trimming. If more than one
   → **ndjson**
4. Otherwise → **single**

This is intentionally cheap — it does not fully parse the JSON to decide. Full parse happens
in the next step.

### Edge cases

| Input | Detection | Reason |
|-------|-----------|--------|
| `{}` | single | one line starting with `{` |
| `[{...}]` | array | leading `[` |
| `{"a":1}\n{"b":2}` | ndjson | two lines starting with `{` |
| `{"a":1}` (no newline) | single | only one `{`-starting line |
| `{\n  "resourceType": "Patient"\n}` | single | only one `{`-starting line (inner lines don't start with `{`) |
| `[  ]` (empty array) | array | leading `[` → parsed as empty slice → zero results |

## Parsing

```typescript
import type { FhirResource } from "@/core/types.js";

/**
 * Parse raw stdin content into an array of FHIR resource objects.
 * Returns a ParseMultiResult indicating success and the resources, or failure with an error.
 */
type ParseMultiResult =
  | { success: true; resources: FhirResource[]; format: InputFormat }
  | { success: false; error: string; format: InputFormat };

function parseMultiResource(raw: string): ParseMultiResult;
```

### Single

Delegate to the existing `parseJson` function from `@/core/parse.js`. Wrap the single
result in a one-element array on success.

### Array

`JSON.parse` the full string. Verify the result is an array. Each element must be a plain
object; non-objects are skipped with a warning printed to stderr.

### NDJSON

Split on `\n`. Filter to lines that are non-empty after trimming. Parse each line
independently with `JSON.parse`. Non-object lines are skipped with a warning to stderr.

## Validate command changes

### Single resource (existing behaviour — unchanged)

When `parseMultiResource` returns exactly one resource (including when the input was a
JSON array with one element), the existing behaviour is preserved exactly: same output
format, same exit code logic.

### Multiple resources

Run the full validate pipeline (`resolveFhirVersion` → `validate`) for each resource
independently. Collect all results.

#### Text output

Print one block per resource, separated by a blank line. Each block has a header line
identifying the resource, then the existing `formatValidationText` output indented or
preceded by the header.

```
[1/5] Patient/abc123
valid

[2/5] Patient/def456
invalid
  ✗ name: must not be empty

[3/5] Patient/ghi789
valid

[4/5] Observation/jkl012
valid (with warnings)
  ⚠ status: unrecognised value "draft"

[5/5] Patient/mno345
valid

---
5 resources: 4 valid, 1 invalid
```

Header format: `[<index>/<total>] <resourceType>/<id>`. If `id` is absent: `[<index>/<total>] <resourceType> (no id)`.

Summary line at the end: `---\n<N> resources: <valid> valid, <invalid> invalid`.

If any resource failed FHIR JSON parsing (not a valid object, missing `resourceType`),
print:

```
[2/5] (parse error)
  ✗ not valid FHIR JSON: <reason>
```

#### JSON output

Emit a JSON array where each element is the result object for that resource. Each element
has the same shape as the current single-resource JSON output, plus an additional `index`
field (1-based) and a `resource` field with `resourceType` and `id`.

```json
[
  {
    "index": 1,
    "resource": { "resourceType": "Patient", "id": "abc123" },
    "valid": true
  },
  {
    "index": 2,
    "resource": { "resourceType": "Patient", "id": "def456" },
    "valid": false,
    "errors": [
      { "path": "name", "message": "must not be empty", "severity": "error" }
    ]
  }
]
```

For a resource that failed JSON parsing:

```json
{
  "index": 2,
  "resource": null,
  "valid": false,
  "errors": [
    { "path": "", "message": "not valid FHIR JSON: <reason>", "severity": "error" }
  ]
}
```

#### Envelope flag with multi-resource JSON output

When `--envelope` is used with `--format json`, wrap the array in the standard envelope
structure. The `data` field contains the array.

```json
{
  "tool": "fhir-resource-diff",
  "version": "...",
  "fhirVersion": "R4",
  "command": "validate",
  "data": [ ... ]
}
```

Note: `fhirVersion` in the envelope reflects the version used for the first resource.
If resources use different versions (rare), each result object already carries its own
context through the errors.

#### Quiet flag

`--quiet` suppresses all stdout as with single-resource validation. Exit code logic
below still applies.

### Exit code for multiple resources

| Condition | Exit code |
|-----------|-----------|
| All resources valid (no errors) | `0` |
| At least one resource has error-severity issues | `1` |
| Input could not be parsed at all (e.g. completely empty stdin) | `2` |

Note: exit code `1` even if only one of N resources is invalid. This preserves the
invariant that exit code `0` means "all clear".

## `--format ndjson` output — decision: not implemented

The user-facing output of this command is human-readable text (default) or JSON. Neither
case warrants an NDJSON *output* format for the results:

- Text output with the `[N/M]` headers is already line-oriented and grep-friendly.
- JSON output as an array is unambiguous and usable with `jq`.
- Adding NDJSON output would require callers to know the output format differs from the
  input format, adding complexity for no clear benefit.

**Decision**: do not add NDJSON as a validate output format. The `--format` option
continues to accept only `text` and `json`.

## Implementation notes

### No new top-level flags

The multi-resource path is triggered purely by input content — not by a flag like
`--multi` or `--batch`. Callers should not need to know ahead of time whether their input
contains one or many resources.

### stdin is read once

`readFileOrExit("-")` already returns the full raw string. Detection and parsing operate
on that string. No second read of stdin.

### File inputs

This spec only covers stdin (`-`). File path inputs are not extended to support
multi-resource in this spec. If a file is passed (not `-`), single-resource behaviour
is preserved regardless of file content.

## Acceptance criteria

```bash
pnpm typecheck   # passes
pnpm lint        # passes
pnpm test        # all tests pass, including new multi-resource tests
```

### Pipe from fhir-test-data

```bash
# JSON array — newly supported
fhir-test-data generate patient --count 3 | fhir-resource-diff validate -
# → [1/3] / [2/3] / [3/3] blocks, summary line, exit 0

# NDJSON — was broken, now explicit
fhir-test-data generate patient --count 3 --format ndjson | fhir-resource-diff validate -
# → same output as above

# Single resource — unchanged
fhir-test-data generate patient | fhir-resource-diff validate -
# → existing single-resource output, no header, no summary
```

### JSON output

```bash
fhir-test-data generate patient --count 2 | fhir-resource-diff validate - --format json
# → JSON array with two result objects
```

### Exit codes

```bash
# All valid → 0
fhir-test-data generate patient --count 3 | fhir-resource-diff validate -; echo $?
# 0

# Mix valid and invalid → 1
printf '{"resourceType":"Patient"}\n{"resourceType":"X"}' | fhir-resource-diff validate -; echo $?
# 1
```

### Edge cases

```bash
# Empty array → zero results, exit 0
echo "[]" | fhir-resource-diff validate -
# → "0 resources validated" (or similar — no per-resource blocks)

# Single-element array → single-resource output (no header, no summary)
echo '[{"resourceType":"Patient","id":"x"}]' | fhir-resource-diff validate -
# → existing single-resource format
```

## Tests to write

- `detectInputFormat` unit tests: single object, array, NDJSON, empty-array string
- `parseMultiResource` unit tests: single / array / NDJSON happy paths, malformed inputs
- Validate command integration: N=1 (unchanged), N=3 text, N=3 JSON, mixed valid/invalid
- Exit code: all valid → 0, one invalid → 1
- `--quiet` suppresses output
- `--envelope` wraps JSON array
- Empty array input
- Resource missing `id` → header shows `(no id)`
