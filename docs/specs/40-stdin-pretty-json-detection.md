---
**Status:** complete
---

# Spec 40 — Fix stdin format detection for pretty-printed single JSON objects

## Goal

The `validate -` command correctly handles:
- Compact single JSON object: `{"resourceType":"Patient",...}` → ✓
- Pretty-printed JSON array: `[\n  {...},\n  {...}\n]` → ✓
- Compact NDJSON: one object per line → ✓

But it **fails** for:
- Pretty-printed single JSON object: `{\n  "resourceType": "Patient",\n  ...}` → ✗

The validator emits NDJSON parse warnings for each line of the pretty-printed object and reports
`0 resources validated`. This means `generate bundle` and `generate patient --pretty` cannot be
piped to `validate -` without adding `--no-pretty`.

**Reproduction:**
```bash
# Works (compact):
fhir-test-data generate patient --locale us --seed 1 --no-pretty | fhir-resource-diff validate -

# Fails (pretty-printed single object):
fhir-test-data generate patient --locale us --seed 1 --pretty | fhir-resource-diff validate -
# → Warning: skipping invalid NDJSON line ... (for every line)
# → 0 resources validated
```

## Root cause

The stdin reader in `src/cli/commands/validate.ts` (or the stdin utility) appears to attempt
NDJSON parsing before trying to parse the entire buffer as a single JSON object. When the buffer
starts with `{` but the first line `{` alone is not valid JSON, the line-by-line NDJSON parser
fires and fails every line.

The detection order should be:
1. Buffer all stdin
2. Trim whitespace
3. If it parses as a complete JSON object → single resource mode
4. If it parses as a complete JSON array → multi-resource array mode
5. Otherwise → NDJSON line-by-line mode

## Dependencies

- Spec 34 (multi-resource-stdin) — complete

## Deliverables

- `src/cli/stdin.ts` (or wherever stdin reading lives) — change detection to read full buffer
  before deciding format, trying JSON parse before NDJSON
- `tests/cli/validate.test.ts` — add test cases for pretty-printed single objects via stdin
- `CHANGELOG.md` — add entry under `[Unreleased]`

## Key interfaces / signatures

The updated detection logic:

```typescript
async function detectAndParseStdin(input: string): Promise<FhirResource[]> {
  const trimmed = input.trim();

  // 1. Try as complete JSON first (handles both single objects and arrays)
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      // JSON array of resources
      return parsed.filter(isValidFhirJson);
    }
    if (typeof parsed === 'object' && parsed !== null) {
      // Single JSON object
      return [parsed];
    }
  } catch {
    // Not valid complete JSON — fall through to NDJSON
  }

  // 2. Try NDJSON (line-by-line)
  const lines = trimmed.split('\n').filter(l => l.trim().length > 0);
  return parseNdjsonLines(lines); // existing logic
}
```

The key change: `JSON.parse(trimmed)` before line-by-line NDJSON. This handles pretty-printed
objects because the full trimmed buffer IS valid JSON even when individual lines are not.

## Implementation notes

- Buffering the full stdin before parsing is already necessary for JSON array detection — this
  change should not introduce new memory concerns
- The existing `JSON.parse` approach will naturally handle indented JSON with any level of
  nesting or whitespace
- This fixes `generate bundle | validate -` as a side effect (bundles are a common use case)
- The fix must not break NDJSON detection — if `JSON.parse` throws, fall back to NDJSON
- Pretty-printed JSON arrays already work; confirm they continue to work after this change

## Acceptance criteria

```bash
# Pretty-printed single Patient must validate via stdin
fhir-test-data generate patient --locale us --seed 1 --pretty \
  | fhir-resource-diff validate -
# Expected: valid

# Pretty-printed Bundle must validate via stdin
fhir-test-data generate bundle --locale us --seed 42 \
  | fhir-resource-diff validate -
# Expected: valid

# Pretty-printed JSON array still works (no regression)
fhir-test-data generate patient --locale us --count 3 --seed 42 \
  | fhir-resource-diff validate -
# Expected: 3 resources: 3 valid, 0 invalid

# Compact NDJSON still works (no regression)
fhir-test-data generate all --locale us --seed 1 \
  | fhir-resource-diff validate -
# Expected: N resources: N valid, 0 invalid

# generate bundle → validate round-trip, all locales
for locale in us uk au jp kr br; do
  fhir-test-data generate bundle --locale $locale --seed 42 \
    | fhir-resource-diff validate -
  # Expected: valid
done
```

## Do not do

- Do not require `--no-pretty` as a workaround in documentation
- Do not change file path mode (only stdin is affected)
- Do not add a `--format` flag to force single/array/NDJSON parsing — auto-detection should
  just work
