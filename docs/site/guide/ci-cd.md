# CI/CD integration

`fhir-resource-diff` is designed for CI pipelines — exit codes are severity-aware, output is machine-readable, and `--quiet` mode produces zero stdout.

## GitHub Actions examples

### Validate a FHIR payload

```yaml
- name: Validate FHIR resource
  run: fhir-resource-diff validate payload.json --format json --fhir-version R4
```

Exits 0 on success, 1 if the resource has errors (invalid JSON, missing `resourceType`).

### Diff against an expected baseline

```yaml
- name: Diff against expected baseline
  run: |
    fhir-resource-diff compare expected.json actual.json \
      --format json --exit-on-diff --preset metadata --quiet
```

`--exit-on-diff` fails the step when differences are found. `--preset metadata` ignores `id`, `meta.lastUpdated`, and other fields that are expected to differ between environments. `--quiet` suppresses stdout.

### Full workflow example

```yaml
name: FHIR validation

on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: ">=9.0.0"

      - uses: actions/setup-node@v4
        with:
          node-version: lts/*
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Validate FHIR resources
        run: |
          for f in fixtures/fhir/*.json; do
            fhir-resource-diff validate "$f" --fhir-version R4 --quiet
          done

      - name: Check for unexpected diffs
        run: |
          fhir-resource-diff compare \
            fixtures/expected/patient.json \
            fixtures/actual/patient.json \
            --exit-on-diff --preset metadata
```

## Key flags for CI

| Flag | Purpose |
|------|---------|
| `--exit-on-diff` | Exit 1 when differences are found (compare only) |
| `--quiet` | Suppress all stdout — exit code only |
| `--format json` | Machine-parseable output |
| `--format json --envelope` | JSON with tool version, FHIR version, timestamp |
| `--preset metadata` | Ignore `id`, `meta.lastUpdated`, `meta.versionId`, `text` |
| `--fhir-version R4` | Explicit version — avoids auto-detection ambiguity |

## Exit codes

| Code | Meaning |
|------|---------|
| 0 | Success — no errors, no diff (or diff found but `--exit-on-diff` not set) |
| 1 | Errors found (validation) or diff found with `--exit-on-diff` |
| 2 | Input error — file not found, unreadable, or not valid JSON at all |

Exit codes are severity-aware: `warning` and `info` findings never produce exit 1. Only `severity: error` findings trigger a non-zero exit.

## Capturing JSON output downstream

When you need to process the output of a validation or diff step in a later step:

```yaml
- name: Validate and capture result
  id: validate
  run: |
    result=$(fhir-resource-diff validate payload.json --format json --fhir-version R4)
    echo "result=$result" >> $GITHUB_OUTPUT

- name: Check result
  run: |
    echo '${{ steps.validate.outputs.result }}' | jq '.valid'
```

## Using --envelope for structured pipeline output

```bash
fhir-resource-diff compare a.json b.json --format json --envelope
```

```json
{
  "tool": "fhir-resource-diff",
  "version": "0.2.0",
  "command": "compare",
  "fhirVersion": "R4",
  "timestamp": "2026-03-14T15:56:25.686Z",
  "result": {
    "resourceType": "Patient",
    "identical": false,
    "summary": { "added": 5, "removed": 0, "changed": 3, "typeChanged": 0, "total": 8 },
    "entries": [...],
    "documentation": "https://hl7.org/fhir/R4/patient.html"
  }
}
```

The `summary` counts are useful for automated triage: a step that checks `result.summary.total > 0` is more precise than checking the exit code alone.

## See also

- [Exit codes](/reference/exit-codes) — full severity model
- [Output formats](/reference/output-formats) — JSON format documentation
- [AI agents & automation](/guide/ai-agents) — stdin, programmatic patterns
