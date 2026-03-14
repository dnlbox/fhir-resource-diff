# Spec 08 — Examples and test fixtures

**Status:** complete

## Goal

Create realistic synthetic FHIR JSON example files in `examples/` and shared test fixtures in
`tests/fixtures/`. These files are referenced by the README, used in CLI smoke tests, and loaded
in unit tests.

## Dependencies

- Spec 07 (CLI) complete — examples must work with the actual CLI commands

## Deliverables

### examples/ (for README, docs, and manual use)

| File | Description |
|------|-------------|
| `examples/patient-a.json` | Base Patient resource |
| `examples/patient-b.json` | Modified Patient (changed name, birthDate, added telecom) |
| `examples/observation-a.json` | Base Observation resource |
| `examples/observation-b.json` | Modified Observation (changed value[x], status) |
| `examples/bundle-example.json` | Simple Bundle containing 2 entries (for future bundle work) |

### tests/fixtures/ (for unit tests)

| File | Description |
|------|-------------|
| `tests/fixtures/patient-minimal.json` | Minimal valid Patient `{ "resourceType": "Patient" }` |
| `tests/fixtures/patient-full.json` | Patient with id, meta, name, birthDate, telecom, address |
| `tests/fixtures/patient-modified.json` | patient-full with deliberate changes for diff testing |
| `tests/fixtures/observation-minimal.json` | Minimal valid Observation |
| `tests/fixtures/invalid-no-resource-type.json` | JSON object without resourceType (for validation tests) |

## FHIR content requirements

All resources must:
- Be valid FHIR R4 JSON shape (no full schema compliance required, but realistic structure)
- Use synthetic, fictional data — no real names, no real dates of birth, no real identifiers
- Include `resourceType` as the first key
- Be pretty-printed (2-space indent)

### patient-a.json / patient-b.json

`patient-a.json` should include:
- `resourceType`: "Patient"
- `id`: "example-patient-001"
- `meta.versionId`: "1", `meta.lastUpdated`: some ISO datetime
- `name[0]`: `{ "use": "official", "family": "Doe", "given": ["Jane"] }`
- `birthDate`: "1985-06-15"
- `gender`: "female"
- `telecom[0]`: `{ "system": "phone", "value": "555-1234", "use": "home" }`
- `address[0]`: a synthetic US address

`patient-b.json` should differ from `patient-a.json` by:
- `name[0].given[0]` changed: "Jane" → "Janet"
- `birthDate` changed: "1985-06-15" → "1985-06-20"
- `meta.lastUpdated` changed (different timestamp)
- `telecom[1]` added: an email address
- `identifier[0]` added: a synthetic MRN

These deltas are intentional so running `compare patient-a.json patient-b.json` with
`--ignore meta.lastUpdated` produces a clean, readable, representative diff.

### observation-a.json / observation-b.json

`observation-a.json`: a vital signs Observation — heart rate, value 72 bpm, status "final".
`observation-b.json`: same Observation, status changed to "amended", value changed to 75 bpm.

Use LOINC code 8867-4 (heart rate). Include:
- `resourceType`: "Observation"
- `id`, `meta`, `status`
- `code` with a LOINC coding
- `subject` reference (synthetic)
- `valueQuantity` with value, unit, system, code

### bundle-example.json

A `Bundle` of `type: "collection"` with 2 entries:
- Entry 1: the `patient-a` resource embedded inline
- Entry 2: the `observation-a` resource embedded inline

## Acceptance criteria

```bash
# All files parse successfully
node dist/cli/index.js validate examples/patient-a.json   # exit 0
node dist/cli/index.js validate examples/patient-b.json   # exit 0
node dist/cli/index.js validate examples/observation-a.json
node dist/cli/index.js validate examples/observation-b.json

# Diff produces expected output
node dist/cli/index.js compare examples/patient-a.json examples/patient-b.json
# → should show: 2 changed fields, 2 added fields

node dist/cli/index.js compare examples/patient-a.json examples/patient-b.json --ignore meta.lastUpdated
# → meta.lastUpdated NOT in output

node dist/cli/index.js compare examples/patient-a.json examples/patient-a.json
# → "identical"
```

## Do not do

- Do not use real patient data, real names, or real identifiers.
- Do not include company-specific or private health data.
- Do not create resources with proprietary extensions.
- Do not create more example files than listed — keep the examples folder clean and purposeful.
