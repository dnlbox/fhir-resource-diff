---
**Status:** complete
---

# Spec 38 — Telecom.system binding validation

## Goal

The `telecom[].system` field has a **required** binding to the `ContactPointSystem` value set across
R4, R4B, and R5. Currently, the validator allows any string value in `telecom[].system`. The fault
injection test `--faults invalid-telecom-system` produces `"system": "fax-machine"` which passes
as valid — this is incorrect.

Valid values: `"phone"`, `"fax"`, `"email"`, `"pager"`, `"url"`, `"sms"`, `"other"`

This binding applies wherever `telecom` appears: Patient, Practitioner, PractitionerRole,
Organization, Location, RelatedPerson, HealthcareService.

## Dependencies

- Spec 22 (structural-validation-rules) — complete
- Spec 37 (patient-gender-binding-validation) — complete (or implement alongside it if working
  on `fhir-common-bindings.ts`)

## Deliverables

- `src/core/validators/rules/fhir-common-bindings.ts` — add `telecom[].system` validation
  (create this file if not created by spec 37; extend if it was)
- `tests/core/validators/fhir-common-bindings.test.ts` — test cases for valid/invalid
  telecom.system values across resource types
- `CHANGELOG.md` — add entry under `[Unreleased]`

## Key interfaces / signatures

Walk the `telecom` array on any resource and validate each `system` value:

```typescript
const CONTACT_POINT_SYSTEM = ['phone', 'fax', 'email', 'pager', 'url', 'sms', 'other'] as const;

function validateTelecomSystems(resource: FhirResource, errors: ValidationError[]): void {
  const telecoms = resource.telecom;
  if (!Array.isArray(telecoms)) return;

  telecoms.forEach((t, i) => {
    if (t.system !== undefined && !CONTACT_POINT_SYSTEM.includes(t.system)) {
      errors.push({
        path: `telecom[${i}].system`,
        message: `Invalid ContactPointSystem '${t.system}': must be one of ${CONTACT_POINT_SYSTEM.join(', ')}`,
        severity: 'warning',
        ruleId: 'fhir-common-bindings',
        docUrl: 'https://hl7.org/fhir/valueset-contact-point-system.html',
      });
    }
  });
}
```

This function should be called for any resource that can have a `telecom` field — the known list
includes Patient, Practitioner, PractitionerRole, Organization, Location, RelatedPerson, HealthcareService.

## Implementation notes

- `telecom[].system` is optional (`0..1`) — only validate when present
- The binding is `required` in all versions (R4, R4B, R5) — no version branching needed
- `telecom[].use` has a similar binding (`ContactPointUse`: `home`, `work`, `temp`, `old`, `mobile`)
  — do not add that in this spec, but note it as a candidate for a follow-up
- This is a structural rule — only fires when FHIR version is provided or auto-detected
- The check applies to **any** resource with a `telecom` field, not just Patient

## Acceptance criteria

```bash
# Invalid telecom.system must be caught on Patient
echo '{"resourceType":"Patient","id":"test-01","telecom":[{"system":"fax-machine","value":"555-1234"}]}' \
  | fhir-resource-diff validate - --fhir-version R4
# Expected: warning — Invalid ContactPointSystem 'fax-machine'

# All valid systems must pass
for sys in phone fax email pager url sms other; do
  echo "{\"resourceType\":\"Patient\",\"id\":\"test-01\",\"telecom\":[{\"system\":\"$sys\",\"value\":\"555-1234\"}]}" \
    | fhir-resource-diff validate - --fhir-version R4
  # Expected: valid
done

# Invalid telecom.system on Organization must also be caught
echo '{"resourceType":"Organization","id":"test-01","telecom":[{"system":"carrier-pigeon","value":"555-1234"}]}' \
  | fhir-resource-diff validate - --fhir-version R4
# Expected: warning — Invalid ContactPointSystem 'carrier-pigeon'

# Missing system must pass (field is optional)
echo '{"resourceType":"Patient","id":"test-01","telecom":[{"value":"555-1234"}]}' \
  | fhir-resource-diff validate - --fhir-version R4
# Expected: valid

# Fault injection round-trip: invalid-telecom-system fault must now be detected
fhir-test-data generate patient --locale us --seed 1 --no-pretty --faults invalid-telecom-system \
  | fhir-resource-diff validate - --fhir-version R4
# Expected: valid (with warnings) — telecom.system warning present
```

## Do not do

- Do not validate `telecom[].use` in this spec — that's a separate binding
- Do not validate telecom on resources not listed in the implementation notes
- Do not add severity `error` for this — `warning` matches the existing posture for structural rules
