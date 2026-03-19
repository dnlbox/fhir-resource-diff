---
**Status:** open
---

# Spec 44 — Version-independent binding rules run without `--fhir-version`

## Goal

`Patient.gender` and `telecom[].system` binding violations are silently missed when the caller
does not supply `--fhir-version`. This makes the fault-injection round-trip unreliable:

```bash
# Produces "fax-machine" telecom.system — but validator says "valid"
fhir-test-data generate patient --locale au --seed 3 --faults invalid-telecom-system \
  | fhir-resource-diff validate -
# → valid   ← wrong

# Only catches it when the flag is explicitly passed
fhir-test-data generate patient --locale au --seed 3 --faults invalid-telecom-system \
  | fhir-resource-diff validate - --fhir-version R4
# → valid (with warnings) — telecom[0].system: Invalid ContactPointSystem 'fax-machine'
```

**Root cause:** `commonBindingsRule` lives in `STRUCTURAL_RULES`, which `validate.ts` skips
entirely when `version` is `undefined`. But `validatePatientGender` and `validateTelecomSystems`
(inside `commonBindingsRule`) do not branch on version — they are identical across R4, R4B, and
R5. The external structural gate is too broad for these two checks.

The UCUM check (`validateObservationUcum`) is already internally gated on `version !== undefined`,
so moving the parent rule out of `STRUCTURAL_RULES` is safe.

## Dependencies

- Spec 38 (`38-telecom-system-binding-validation.md`) — complete
- Spec 37 (`37-patient-gender-binding-validation.md`) — complete
- Spec 43 (`43-observation-ucum-validation.md`) — complete

## Deliverables

- `src/core/rules/index.ts` — move `commonBindingsRule` from `STRUCTURAL_RULES` to `FORMAT_RULES`
- `tests/core/validators/` (or equivalent) — add/extend tests confirming binding checks fire
  without a version argument
- `CHANGELOG.md` — entry under `[Unreleased]`

## Key change

```typescript
// src/core/rules/index.ts — BEFORE
export const FORMAT_RULES: readonly ValidationRule[] = [
  idFormatRule, dateFormatRule, referenceFormatRule, resourceTypeRule,
];

export const STRUCTURAL_RULES: readonly ValidationRule[] = [
  requiredFieldsRule, statusValuesRule, codeableConceptRule, commonBindingsRule, // ← here
];

// src/core/rules/index.ts — AFTER
export const FORMAT_RULES: readonly ValidationRule[] = [
  idFormatRule, dateFormatRule, referenceFormatRule, resourceTypeRule,
  commonBindingsRule, // ← moved here; rule already gates UCUM internally
];

export const STRUCTURAL_RULES: readonly ValidationRule[] = [
  requiredFieldsRule, statusValuesRule, codeableConceptRule,
];
```

No changes to `commonBindingsRule` itself — its internal version gate on `validateObservationUcum`
already handles the only version-dependent sub-check correctly.

## Implementation notes

- `validate.ts` has the gate `if (version !== undefined) { runRules(STRUCTURAL_RULES) }` — do not
  change that gate; only change which rules are in which bucket
- After the move, `UCUM` warnings still require `--fhir-version` (the internal gate in
  `commonBindingsRule.check` preserves this)
- Run the full test suite — confirm no existing tests break; some may need minor expectation
  updates if they tested that binding warnings only appeared with a version
- The `ALL_RULES` export is derived from the three lists — verify it stays correct

## Acceptance criteria

```bash
# telecom.system binding caught WITHOUT --fhir-version
echo '{"resourceType":"Patient","id":"p1","telecom":[{"system":"fax-machine","value":"555-1234"}]}' \
  | fhir-resource-diff validate -
# Expected: valid (with warnings)
#   ⚠ telecom[0].system: Invalid ContactPointSystem 'fax-machine': must be one of phone, fax, email, pager, url, sms, other

# Patient.gender binding caught WITHOUT --fhir-version
echo '{"resourceType":"Patient","id":"p1","gender":"INVALID_GENDER"}' \
  | fhir-resource-diff validate -
# Expected: valid (with warnings)
#   ⚠ gender: Invalid Patient.gender 'INVALID_GENDER': must be one of male, female, other, unknown

# UCUM still requires --fhir-version (no regression)
echo '{"resourceType":"Observation","id":"o1","status":"final","code":{"coding":[{"system":"http://loinc.org","code":"8867-4"}]},"valueQuantity":{"value":72,"system":"http://wrong.system","unit":"bpm"}}' \
  | fhir-resource-diff validate -
# Expected: valid   ← UCUM check does NOT fire without version

echo '...(same resource)...' | fhir-resource-diff validate - --fhir-version R4
# Expected: valid (with warnings)
#   ⚠ valueQuantity.system: ...

# Fault-injection round-trip works without --fhir-version
fhir-test-data generate patient --locale au --seed 3 --faults invalid-telecom-system \
  | fhir-resource-diff validate -
# Expected: valid (with warnings) — telecom[0].system warning present

fhir-test-data generate patient --locale us --seed 5 --faults invalid-gender \
  | fhir-resource-diff validate -
# Expected: valid (with warnings) — gender warning present
```

## Do not do

- Do not remove the `if (version !== undefined)` gate in `validate.ts` for `STRUCTURAL_RULES` —
  required-fields and status-value checks are genuinely version-specific
- Do not change the UCUM gate inside `commonBindingsRule.check`
- Do not add `telecom[].use` validation in this spec (noted as a candidate in spec 38, still
  out of scope here)
