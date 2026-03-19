---
**Status:** complete
---

# Spec 43 — Observation.valueQuantity UCUM system validation

## Goal

When an `Observation` carries a `valueQuantity`, the `system` field should be
`http://unitsofmeasure.org` (UCUM). FHIR strongly recommends UCUM for all Observation
quantities and this is a required binding in profiles like US Core and IPS. Currently, any
`system` value passes without warning:

```bash
echo '{"resourceType":"Observation","valueQuantity":{"value":12.3,"system":"http://some-other-system.com","code":"g/dL"}}' \
  | fhir-resource-diff validate -
# → valid  ← no warning about non-UCUM system
```

Add a warning when `valueQuantity.system` is present but not the UCUM URI.

## Dependencies

- Spec 22 (structural-validation-rules) — complete

## Deliverables

- `src/core/validators/rules/fhir-common-bindings.ts` — add `Observation.valueQuantity.system`
  check (extend existing file from spec 38, or create if needed)
- `tests/core/validators/` — add test cases for valid UCUM, non-UCUM, and absent system
- `CHANGELOG.md` — add entry under `[Unreleased]`

## Key interfaces / signatures

```typescript
const UCUM_SYSTEM = 'http://unitsofmeasure.org';

// Only run on Observation resources
if (resourceType === 'Observation' && resource.valueQuantity) {
  const vq = resource.valueQuantity;
  if (vq.system !== undefined && vq.system !== UCUM_SYSTEM) {
    errors.push({
      path: 'valueQuantity.system',
      message: `Observation.valueQuantity.system should be UCUM ('${UCUM_SYSTEM}'), got '${vq.system}'.` +
        ` FHIR recommends UCUM for all quantity values.`,
      severity: 'warning',
      ruleId: 'fhir-common-bindings',
      docUrl: 'https://hl7.org/fhir/observation-definitions.html#Observation.value_x_',
    });
  }
}
```

Also apply the same check to `valueQuantity` in `component[]` entries (compound Observations
like blood pressure):

```typescript
(resource.component ?? []).forEach((comp: FhirResource, i: number) => {
  if (comp.valueQuantity?.system && comp.valueQuantity.system !== UCUM_SYSTEM) {
    errors.push({ path: `component[${i}].valueQuantity.system`, ... });
  }
});
```

## Implementation notes

- Only warn when `system` is **present** and non-UCUM — if `system` is absent, no warning
  (the quantity may be a ratio or a unitless score)
- This is a STRUCTURAL_RULE — only fires when a FHIR version is provided or auto-detected
- Severity: **warning** (the value may still be clinically meaningful; the system is just
  non-standard)
- Do not warn when `valueQuantity` has no `system` field at all (system is optional per FHIR)
- `valueQuantity` is one polymorphic option — `valueCodeableConcept`, `valueString`, etc.
  are out of scope for this spec

## Acceptance criteria

```bash
# Non-UCUM system on valueQuantity must warn
echo '{"resourceType":"Observation","id":"t1","status":"final","code":{"coding":[{"system":"http://loinc.org","code":"718-7"}]},"subject":{"reference":"Patient/p1"},"valueQuantity":{"value":12.3,"unit":"g/dL","system":"http://some-other-system.com","code":"g/dL"}}' \
  | fhir-resource-diff validate - --fhir-version R4
# Expected: valid (with warnings) — should be UCUM

# UCUM system must pass clean
echo '{"resourceType":"Observation","id":"t1","status":"final","code":{"coding":[{"system":"http://loinc.org","code":"718-7"}]},"subject":{"reference":"Patient/p1"},"valueQuantity":{"value":12.3,"unit":"g/dL","system":"http://unitsofmeasure.org","code":"g/dL"}}' \
  | fhir-resource-diff validate - --fhir-version R4
# Expected: valid (no valueQuantity warning)

# Missing system must pass (not required)
echo '{"resourceType":"Observation","id":"t1","status":"final","code":{"coding":[{"system":"http://loinc.org","code":"718-7"}]},"subject":{"reference":"Patient/p1"},"valueQuantity":{"value":12.3,"unit":"g/dL"}}' \
  | fhir-resource-diff validate - --fhir-version R4
# Expected: valid (no valueQuantity warning)

# component[].valueQuantity non-UCUM must also warn (blood pressure compound Obs)
echo '{"resourceType":"Observation","id":"t1","status":"final","code":{"coding":[{"system":"http://loinc.org","code":"85354-9"}]},"subject":{"reference":"Patient/p1"},"component":[{"code":{"coding":[{"system":"http://loinc.org","code":"8480-6"}]},"valueQuantity":{"value":120,"system":"http://bad.system","code":"mm[Hg]"}},{"code":{"coding":[{"system":"http://loinc.org","code":"8462-4"}]},"valueQuantity":{"value":80,"system":"http://unitsofmeasure.org","code":"mm[Hg]"}}]}' \
  | fhir-resource-diff validate - --fhir-version R4
# Expected: warning on component[0].valueQuantity.system only

# End-to-end: fhir-test-data Observations use UCUM — must pass clean
fhir-test-data generate observation --locale us --count 10 --seed 42 \
  | fhir-resource-diff validate - --fhir-version R4
# Expected: 10 resources: 10 valid, 0 invalid
```

## Do not do

- Do not validate UCUM code values — only the system URI
- Do not add UCUM checks to non-Observation resources (e.g. Medication quantity) — out of scope
- Do not enforce UCUM when `system` is absent — that's a choice, not an error
- Do not add this as a FORMAT_RULE — UCUM is a structural concern
