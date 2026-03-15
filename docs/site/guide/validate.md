# Validate

The `validate` command catches common FHIR mistakes before you submit a resource to a server — format problems, structural issues, and unknown resource types. It's a fast, local sanity check designed for the development loop.

## Basic usage

```bash
fhir-resource-diff validate examples/showcase/patient-chalmers.json --fhir-version R4
```

```
valid
  ℹ For full FHIR schema validation, use the official HL7 FHIR Validator
    → https://confluence.hl7.org/display/FHIR/Using+the+FHIR+Validator
```

A clean resource shows `valid`. The note about the HL7 Validator is a scope footer — it appears whenever `--fhir-version` is specified and is not a finding about your resource. `valid (with warnings)` only appears when the tool actually found something to flag in your data.

## Version-aware validation

```bash
fhir-resource-diff validate resource.json --fhir-version R5
```

The `--fhir-version` flag enables version-aware checks — the resource type is validated against the registry for that specific version, and the HL7 documentation links in output point to the correct version.

Without `--fhir-version`, the tool auto-detects the version from `meta.fhirVersion` or defaults to R4.

## What this tool checks

| Check | Severity | Description |
|-------|----------|-------------|
| Valid JSON | error | Malformed JSON fails immediately |
| `resourceType` present | error | Required on every FHIR resource |
| `resourceType` non-empty | error | Empty string is not a valid resource type |
| FHIR `id` format | warning | Must match `[A-Za-z0-9\-.]{1,64}` — servers reject silently otherwise |
| Date formats | warning | FHIR uses a strict ISO 8601 subset; `2024/03/15` or `03-15-2024` are caught |
| Reference string format | warning | `subject.reference` must be `ResourceType/id`, an absolute URL, `#fragment`, or `urn:` — bare IDs like `"12345"` are flagged |
| Known resource type | info | Checked against the registry for the specified FHIR version |

## What it doesn't check — and why

Full FHIR schema validation requires StructureDefinitions from the specification: required fields, cardinality, value set bindings, profile conformance, and invariants. Bundling and keeping those current is a significant maintenance surface.

The [HL7 FHIR Validator](https://confluence.hl7.org/display/FHIR/Using+the+FHIR+Validator) is the authoritative tool for full conformance. `fhir-resource-diff` catches the common mistakes that cause server rejections and surface data quality issues — it's the fast check in your development loop, not the compliance gate in staging.

## JSON output format

```bash
fhir-resource-diff validate patient.json --format json
```

```json
{
  "valid": true,
  "errors": [],
  "hint": {
    "message": "For full FHIR schema validation, use the official HL7 FHIR Validator",
    "url": "https://confluence.hl7.org/display/FHIR/Using+the+FHIR+Validator"
  }
}
```

When there are findings:

```json
{
  "valid": false,
  "errors": [
    {
      "severity": "error",
      "path": "resourceType",
      "message": "resourceType is required",
      "ruleId": "required-resource-type"
    },
    {
      "severity": "warning",
      "path": "id",
      "message": "id must match [A-Za-z0-9\\-.]{1,64}",
      "ruleId": "id-format"
    }
  ],
  "hint": null
}
```

Each error has:
- `severity` — `error`, `warning`, or `info`
- `path` — dot-notation path to the field with the problem
- `message` — human-readable description
- `ruleId` — stable identifier for the rule (useful for suppression or automation)

## Severity model

Only `severity: error` findings produce a non-zero exit code. Warnings and info findings surface in output but never break pipelines.

| Severity | Exit code | When |
|----------|-----------|------|
| error | 1 | Invalid JSON, missing resourceType |
| warning | 0 | Date format, id format, reference format |
| info | 0 | Unknown resource type, informational notes |

## Quiet mode for CI

```bash
fhir-resource-diff validate patient.json --quiet
echo $?  # 0 = no errors, 1 = errors found
```

`--quiet` suppresses all stdout output. Useful when you only need the exit code in a CI step and don't want to capture or discard output.

## Stdin pipe

```bash
# Validate a resource fetched from a FHIR server
curl -s https://hapi.fhir.org/baseR4/Patient/592473 \
  | fhir-resource-diff validate - --fhir-version R4

# Validate from a variable (no temp file needed)
echo "$FHIR_PAYLOAD" | fhir-resource-diff validate - --format json --fhir-version R4
```

Use `-` as the file argument to read from stdin.

## With --envelope

```bash
fhir-resource-diff validate patient.json --format json --envelope
```

```json
{
  "tool": "fhir-resource-diff",
  "version": "0.2.0",
  "command": "validate",
  "fhirVersion": "R4",
  "timestamp": "2026-03-14T15:56:25.686Z",
  "result": {
    "valid": true,
    "errors": [],
    "hint": null
  }
}
```

The envelope adds tool version, FHIR version, and timestamp — useful for audit trails and automated pipelines that need to know when and how a validation was run.

## See also

- [Exit codes](/reference/exit-codes) — full severity model and exit code table
- [Output formats](/reference/output-formats) — text, JSON, markdown, envelope
- [CLI reference](/reference/cli) — all flags for `validate`
