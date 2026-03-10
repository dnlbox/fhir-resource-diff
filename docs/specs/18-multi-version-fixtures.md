# Spec 18 — Multi-version example fixtures

## Goal

Add R4B and R5 example resources so users and tests can exercise multi-version scenarios.
Reorganize examples by version while preserving backward compatibility with existing README
references and tests.

## Dependencies

- Spec 12 (FHIR version model): `FhirVersion`, `detectFhirVersion`
- Spec 13 (resource type registry): resource types must be in the registry

## Deliverables

| File | Description |
|------|-------------|
| `examples/r4/patient-a.json` | Copy of existing `patient-a.json` with `meta.fhirVersion: "4.0.1"` |
| `examples/r4/patient-b.json` | Copy of existing `patient-b.json` with `meta.fhirVersion: "4.0.1"` |
| `examples/r4/observation-a.json` | Copy of existing `observation-a.json` with `meta.fhirVersion: "4.0.1"` |
| `examples/r4/observation-b.json` | Copy of existing `observation-b.json` with `meta.fhirVersion: "4.0.1"` |
| `examples/r4b/patient-a.json` | R4B Patient — same logical content as R4, version `"4.3.0"` |
| `examples/r4b/observation-a.json` | R4B Observation — same content, version `"4.3.0"` |
| `examples/r5/patient-a.json` | R5 Patient — includes R5-specific fields where applicable |
| `examples/r5/patient-b.json` | R5 Patient variant for cross-version diff testing |
| `examples/r5/observation-a.json` | R5 Observation — with R5 field conventions |
| `tests/fixtures/patient-r5.json` | R5 Patient fixture for unit tests |
| `tests/fixtures/patient-r4b.json` | R4B Patient fixture for unit tests |

### Existing files — keep as-is

The root-level example files stay in place so existing README examples and tests don't break:

- `examples/patient-a.json` (unchanged)
- `examples/patient-b.json` (unchanged)
- `examples/observation-a.json` (unchanged)
- `examples/observation-b.json` (unchanged)
- `examples/bundle-example.json` (unchanged)

## FHIR content requirements

All resources must:
- Be valid FHIR JSON shape for their respective version
- Use synthetic, fictional data only
- Include `resourceType` as the first key
- Include `meta.fhirVersion` set to the appropriate version string
- Be pretty-printed (2-space indent)

### R4 versioned copies

Take the existing root-level examples and add `meta.fhirVersion: "4.0.1"` if not already present.
No other changes.

### R4B examples

Create by copying the R4 versioned examples and changing:
- `meta.fhirVersion` → `"4.3.0"`
- `meta.lastUpdated` → a different timestamp

R4B is structurally almost identical to R4 for Patient and Observation, so the content
is the same. The version tag is the key difference.

### R5 examples

R5 Patient (`examples/r5/patient-a.json`) differences from R4:
- `meta.fhirVersion` → `"5.0.0"`
- `meta.lastUpdated` → a different timestamp
- Optionally add fields that are new or changed in R5 Patient if any exist (check the spec:
  https://hl7.org/fhir/R5/patient.html). If no material structural changes, keep content
  identical to R4 but with the version tag.

R5 Observation (`examples/r5/observation-a.json`):
- `meta.fhirVersion` → `"5.0.0"`
- In R5, Observation structure is largely the same. Keep the same clinical content.

R5 Patient-b (`examples/r5/patient-b.json`):
- A modified version of patient-a with the same deltas as the R4 pair (changed name,
  birthDate, added telecom, added identifier) — for cross-version diff testing.

### Cross-version test scenario

The key test scenario is:
```bash
fhir-resource-diff compare examples/r4/patient-a.json examples/r5/patient-a.json
```

This should:
1. Detect the version mismatch (spec 16 warning)
2. Show the diff — which should be minimal (mainly `meta.fhirVersion` and `meta.lastUpdated`)
3. Demonstrate that the tool handles cross-version comparison gracefully

## Test fixtures

`tests/fixtures/patient-r5.json` — minimal R5 Patient:
```json
{
  "resourceType": "Patient",
  "id": "r5-test-001",
  "meta": {
    "fhirVersion": "5.0.0",
    "versionId": "1",
    "lastUpdated": "2025-01-15T10:00:00.000Z"
  }
}
```

`tests/fixtures/patient-r4b.json` — minimal R4B Patient:
```json
{
  "resourceType": "Patient",
  "id": "r4b-test-001",
  "meta": {
    "fhirVersion": "4.3.0",
    "versionId": "1",
    "lastUpdated": "2024-06-15T10:00:00.000Z"
  }
}
```

## Acceptance criteria

```bash
pnpm typecheck   # passes
pnpm test        # all tests pass (existing tests unaffected)
pnpm lint        # passes
```

Manual smoke tests:

```bash
# Versioned R4 examples work
pnpm cli -- validate examples/r4/patient-a.json
# → valid

# R5 examples work
pnpm cli -- validate examples/r5/patient-a.json
# → valid

# Cross-version compare
pnpm cli -- compare examples/r4/patient-a.json examples/r5/patient-a.json
# → diff output (at minimum meta.fhirVersion and meta.lastUpdated differ)

# Existing root-level examples still work
pnpm cli -- compare examples/patient-a.json examples/patient-b.json
# → same output as before
```

- All JSON files are valid JSON
- All JSON files pass `validate` command
- `detectFhirVersion` correctly identifies the version of each versioned file
- Existing tests are not broken by the reorganization

## Do not do

- Do not delete or modify the existing root-level example files.
- Do not use real patient data.
- Do not create examples for every resource type — Patient and Observation per version is enough.
- Do not create deeply different R5 resources with many R5-specific fields — keep the focus
  on version tagging and demonstrating cross-version comparison.
- Do not create examples for FHIR versions prior to R4.
