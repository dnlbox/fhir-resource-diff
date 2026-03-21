---
**Status:** complete
---

# Spec 46 — `validate` multi-resource file path support

## Goal

`validate -` (stdin) can detect and handle JSON arrays and NDJSON (spec 34). But `validate
<file>` does not — the same multi-resource files fail with confusing errors when passed as a
path:

```bash
# Generate 3 patients into a JSON array file
fhir-test-data generate patient --count 3 --output-format json --seed 5 > patients.json

# Works via stdin
cat patients.json | fhir-resource-diff validate -
# → [1/3] Patient/... valid  [2/3] ... [3/3] ... 3 valid, 0 invalid

# Fails via file path with confusing error
fhir-resource-diff validate patients.json
# → Error: "patients.json" is not valid FHIR JSON: Missing or invalid resourceType
#   (JSON array has no resourceType — error text is actively misleading)

# Same problem with NDJSON files
fhir-test-data generate patient --count 3 --format ndjson --output ./out
fhir-resource-diff validate ./out/Patient.ndjson
# → Error: "Patient.ndjson" is not valid FHIR JSON: Unexpected non-whitespace character...
```

## Desired behaviour

Apply the same auto-detection logic from spec 34 to file paths:

| Input | Detection | Behaviour |
|-------|-----------|-----------|
| Single JSON object | `resourceType` at root | Validate single resource (existing) |
| JSON array | Root token is `[` | Validate each element in the array |
| NDJSON | File extension `.ndjson` or multiple lines each starting with `{` | Validate each line |

## Deliverables

| File | Change |
|------|--------|
| `src/cli/commands/validate.ts` | Apply `detectInputFormat` to file-path input, not just stdin |
| `src/core/input/` | Extend (or reuse) the multi-resource parser so file paths go through the same path as stdin |
| `tests/cli/validate.test.ts` | Tests for JSON array file path, NDJSON file path |
| `CHANGELOG.md` | Entry under `[Unreleased]` |

## Error message improvement

When a file path fails because it's a JSON array, the current error `"Missing or invalid resourceType"` is misleading. If the parse fails for a file with extension `.json` and the content starts with `[`, emit a targeted hint:

```
Error: "patients.json" contains a JSON array — pass via stdin: cat patients.json | fhir-resource-diff validate -
```

This is a fallback only if full multi-resource file path support is not implemented in this spec.

## Acceptance criteria

```bash
# JSON array file by path
fhir-resource-diff validate patients.json
# → [1/3] Patient/... valid ... 3 resources: 3 valid, 0 invalid

# NDJSON file by path (extension detection)
fhir-resource-diff validate ./out/Patient.ndjson
# → [1/3] Patient/... valid ... 3 resources: 3 valid, 0 invalid

# Single resource file unchanged
fhir-resource-diff validate patient.json
# → valid
```

## Do not do

- Do not change the behaviour of `validate -` (stdin) — spec 34 is complete and correct
- Do not require an explicit `--format ndjson` flag — auto-detect as stdin already does
