# Exit codes

`fhir-resource-diff` uses exit codes consistently across all commands. Exit codes are severity-aware — not every finding produces a non-zero exit.

## Exit code table

| Code | Meaning | When |
|------|---------|------|
| `0` | Success | No errors found, or diff found but `--exit-on-diff` was not set |
| `1` | Error or diff | Validation errors found, or diff found with `--exit-on-diff` |
| `2` | Input error | File not found, file unreadable, or stdin is not valid JSON |

## Severity model

Validation findings have three severity levels. Only `error` produces exit code 1.

| Severity | Exit code | Examples |
|----------|-----------|---------|
| `error` | `1` | Invalid JSON, missing `resourceType`, empty `resourceType` |
| `warning` | `0` | Invalid date format, invalid id format, malformed reference string |
| `info` | `0` | Unknown resource type, informational notes |

This means warnings and info findings surface in output but never break pipelines. A resource with a date format warning is still "valid" from an exit code perspective — it won't cause a CI step to fail unless you're explicitly checking the JSON output for warnings.

## validate exit codes

```bash
# 0 — valid, no errors
fhir-resource-diff validate patient.json
echo $?  # 0

# 0 — valid with warnings (date format warning, but not severity: error)
fhir-resource-diff validate patient-with-bad-date.json
echo $?  # 0

# 1 — invalid (missing resourceType)
fhir-resource-diff validate bad-resource.json
echo $?  # 1

# 2 — file not found
fhir-resource-diff validate does-not-exist.json
echo $?  # 2
```

## compare exit codes

```bash
# 0 — identical (no differences)
fhir-resource-diff compare a.json a.json
echo $?  # 0

# 0 — differences found, but --exit-on-diff not set
fhir-resource-diff compare a.json b.json
echo $?  # 0

# 1 — differences found with --exit-on-diff
fhir-resource-diff compare a.json b.json --exit-on-diff
echo $?  # 1

# 2 — file not found
fhir-resource-diff compare a.json missing.json
echo $?  # 2
```

## Checking exit codes in CI

```bash
# Fail the step if validation errors are found
fhir-resource-diff validate payload.json --fhir-version R4
# (step fails automatically if exit code is non-zero)

# Fail the step if any diff is found
fhir-resource-diff compare expected.json actual.json \
  --exit-on-diff --preset metadata
```

## Checking severity in JSON output

When you need to distinguish between errors, warnings, and info findings programmatically:

```bash
result=$(fhir-resource-diff validate patient.json --format json)
echo "$result" | jq '.errors | map(select(.severity == "error")) | length'
echo "$result" | jq '.errors | map(select(.severity == "warning")) | length'
```

## See also

- [Validate](/guide/validate) — severity model for validation checks
- [CI/CD integration](/guide/ci-cd) — using exit codes in GitHub Actions
- [Output formats](/reference/output-formats) — JSON structure for programmatic access
