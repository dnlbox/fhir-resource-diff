---
**Status:** complete
---

# Spec 37 — Patient.gender binding validation

## Goal

The `fhir-structural-validation` rules do not validate `Patient.gender` against its required value
set. The fault injection test `--faults invalid-gender` produces `"gender": "INVALID_GENDER"` and
the validator reports the resource as valid — this is incorrect.

`Patient.gender` has a **required** binding to the `AdministrativeGender` value set across R4,
R4B, and R5:

- Valid values: `"male"`, `"female"`, `"other"`, `"unknown"`

Add a new structural rule (or extend `fhir-status-values`) to catch invalid values for `Patient.gender`.

## Dependencies

- Spec 22 (structural-validation-rules) — complete
- Spec 17 (version-aware-validation) — complete

## Deliverables

- `src/core/validators/rules/fhir-status-values.ts` (or a new `fhir-common-bindings.ts`) —
  add validation for Patient.gender and other tightly-bound primitive fields
- `tests/core/validators/` — add test cases for valid/invalid gender values across R4, R4B, R5
- `CHANGELOG.md` — add entry under `[Unreleased]`

## Key interfaces / signatures

Extend the existing `fhir-status-values` rule to cover `Patient.gender`:

```typescript
// Patient.gender — required binding, all versions
if (resourceType === 'Patient' && resource.gender !== undefined) {
  const ADMIN_GENDER = ['male', 'female', 'other', 'unknown'] as const;
  if (!ADMIN_GENDER.includes(resource.gender)) {
    errors.push({
      path: 'gender',
      message: `Invalid Patient.gender '${resource.gender}': must be one of male, female, other, unknown`,
      severity: 'warning',
      ruleId: 'fhir-status-values',
      docUrl: 'https://hl7.org/fhir/valueset-administrative-gender.html',
    });
  }
}
```

Alternatively, create `src/core/validators/rules/fhir-common-bindings.ts` as a dedicated rule for
primitive-coded fields (gender, use, status fields that are plain strings). This may be cleaner
given the telecom.system binding will also be added in spec 38.

## Implementation notes

- `Patient.gender` is `0..1` (optional) — only validate if the field is present
- The binding is `required` in all three versions (R4, R4B, R5) — no version branching needed
- This rule should produce a **warning** (not error) to maintain the existing severity posture for
  structural rules — the resource is still parseable and partially usable
- The rule runs as part of STRUCTURAL_RULES, so it only fires when a FHIR version is provided or
  auto-detected
- Other `Patient` fields to consider for future specs (not this one): `name[].use`, `address[].use`

## Acceptance criteria

```bash
# Invalid gender must be caught
echo '{"resourceType":"Patient","id":"test-01","gender":"INVALID_GENDER"}' \
  | fhir-resource-diff validate - --fhir-version R4
# Expected: warning — Invalid Patient.gender 'INVALID_GENDER'

# All valid genders must pass
for gender in male female other unknown; do
  echo "{\"resourceType\":\"Patient\",\"id\":\"test-01\",\"gender\":\"$gender\"}" \
    | fhir-resource-diff validate - --fhir-version R4
  # Expected: valid
done

# Missing gender must pass (field is optional)
echo '{"resourceType":"Patient","id":"test-01"}' \
  | fhir-resource-diff validate - --fhir-version R4
# Expected: valid

# Fault injection round-trip: invalid-gender fault must now be detected
fhir-test-data generate patient --locale us --seed 1 --no-pretty --faults invalid-gender \
  | fhir-resource-diff validate - --fhir-version R4
# Expected: valid (with warnings) — gender warning present
```

## Do not do

- Do not validate `Patient.gender` when no FHIR version is provided (format-only mode)
- Do not add gender validation for Practitioner (same value set but separate concern — different spec)
- Do not produce an error-severity result for invalid gender — warning is appropriate
