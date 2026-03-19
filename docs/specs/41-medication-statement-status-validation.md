---
**Status:** complete
---

# Spec 41 — MedicationStatement status value validation

## Goal

`MedicationStatement.status` has a **required** binding to the `medication-statement-status`
value set, but the `fhir-status-values` rule does not validate it. Arbitrary values like
`"GARBAGE"` pass as valid:

```bash
echo '{"resourceType":"MedicationStatement","id":"t1","status":"GARBAGE",...}' \
  | fhir-resource-diff validate - --fhir-version R4
# → valid  ← incorrect, should warn
```

Add `MedicationStatement` (R4/R4B) and `MedicationUsage` (R5) status validation.

## Version-specific status value sets

### R4 / R4B — MedicationStatement.status
`active | completed | entered-in-error | intended | stopped | on-hold | unknown | not-taken`

### R5 — MedicationUsage.status
`recorded | entered-in-error | draft`

(R5 significantly contracted the value set when the resource was renamed.)

## Dependencies

- Spec 22 (structural-validation-rules) — complete
- Spec 35 (medication-usage-r5-registry) — complete

## Deliverables

- `src/core/validators/rules/fhir-status-values.ts` — add MedicationStatement (R4/R4B) and
  MedicationUsage (R5) status value validation
- `tests/core/validators/fhir-status-values.test.ts` — add test cases for valid and invalid
  status values for both resource types across versions
- `CHANGELOG.md` — add entry under `[Unreleased]`

## Key interfaces / signatures

Extend the existing status values map in `fhir-status-values.ts`:

```typescript
// R4/R4B
'MedicationStatement': {
  field: 'status',
  versions: ['R4', 'R4B'],
  allowed: ['active', 'completed', 'entered-in-error', 'intended', 'stopped',
            'on-hold', 'unknown', 'not-taken'],
},

// R5 — note: MedicationUsage is the R5 resource name
'MedicationUsage': {
  field: 'status',
  versions: ['R5'],
  allowed: ['recorded', 'entered-in-error', 'draft'],
},
```

## Implementation notes

- This is a straight addition to the existing status value dispatch — no new infrastructure needed
- The R5 value set is much smaller than R4; do not cross-apply them
- `MedicationStatement` does not exist in R5 — if encountered with `--fhir-version R5`, the
  `fhir-resource-type` rule (spec 39) will already warn about it; no need to also validate its status
- Severity: **warning** — consistent with all other status value violations

## Acceptance criteria

```bash
# R4 GARBAGE status must be caught
echo '{"resourceType":"MedicationStatement","id":"t1","status":"GARBAGE","subject":{"reference":"Patient/p1"},"medicationCodeableConcept":{"coding":[{"system":"http://snomed.info/sct","code":"387458008"}]}}' \
  | fhir-resource-diff validate - --fhir-version R4
# Expected: valid (with warnings) — Invalid value 'GARBAGE' for MedicationStatement.status

# All R4 valid statuses must pass
for s in active completed entered-in-error intended stopped on-hold unknown not-taken; do
  echo '{"resourceType":"MedicationStatement","id":"t1","status":"'"$s"'","subject":{"reference":"Patient/p1"},"medicationCodeableConcept":{"coding":[{"system":"http://snomed.info/sct","code":"387458008"}]}}' \
    | fhir-resource-diff validate - --fhir-version R4 2>&1 | grep "^valid"
  # Expected: valid (no status warning)
done

# R5 MedicationUsage GARBAGE status must be caught
echo '{"resourceType":"MedicationUsage","id":"t1","status":"GARBAGE","subject":{"reference":"Patient/p1"},"medication":{"concept":{"coding":[{"system":"http://snomed.info/sct","code":"387458008"}]}}}' \
  | fhir-resource-diff validate - --fhir-version R5
# Expected: warning for invalid status

# R4 status value 'recorded' (valid in R5 only) should warn in R4
echo '{"resourceType":"MedicationStatement","id":"t1","status":"recorded","subject":{"reference":"Patient/p1"},"medicationCodeableConcept":{"coding":[{"system":"http://snomed.info/sct","code":"387458008"}]}}' \
  | fhir-resource-diff validate - --fhir-version R4
# Expected: warning — 'recorded' not valid for R4 MedicationStatement

# End-to-end: fhir-test-data MedicationStatement must validate clean
fhir-test-data generate medication-statement --locale us --count 10 --seed 42 --no-pretty \
  | fhir-resource-diff validate - --fhir-version R4
# Expected: 10 resources: 10 valid, 0 invalid
```

## Do not do

- Do not add validation for `medicationCodeableConcept` or `medication` code values — structural only
- Do not add MedicationAdministration or MedicationDispense status in this spec — out of scope
- Do not change severity to error — warning is the established posture for status value violations
