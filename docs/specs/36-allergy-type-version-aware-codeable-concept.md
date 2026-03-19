---
**Status:** complete
---

# Spec 36 — Fix fhir-codeable-concept false positive: AllergyIntolerance.type in R4/R4B

## Goal

The `fhir-codeable-concept` validation rule incorrectly flags `AllergyIntolerance.type` as
"should be a CodeableConcept object, not a plain string" when the resource is R4 or R4B.

This is a **false positive**: in R4 and R4B, `AllergyIntolerance.type` is bound to a required
code value set and is correctly typed as a plain string (`"allergy"` or `"intolerance"`). Only in
R5 was this field changed to a CodeableConcept.

The rule currently treats any field named `type` that holds a string value as suspicious,
without accounting for version-specific field type changes.

## Dependencies

- Spec 22 (structural-validation-rules) — complete
- Spec 17 (version-aware-validation) — complete

## Deliverables

- `src/core/validators/rules/fhir-codeable-concept.ts` — add version-aware exclusion for
  `AllergyIntolerance.type` in R4/R4B
- `tests/core/validators/fhir-codeable-concept.test.ts` — add test cases confirming no false
  positive for AllergyIntolerance R4/R4B and confirming R5 still validates the CodeableConcept shape
- `CHANGELOG.md` — add entry under `[Unreleased]`

## Key interfaces / signatures

The codeable-concept rule receives the resource, the current path, and the detected FHIR version.
Introduce a version-aware skip list for fields known to be plain strings in specific versions:

```typescript
// Fields that are plain string codes (not CodeableConcept) in specific versions.
// Key: "ResourceType.fieldName", value: versions where it is a plain string.
const PLAIN_STRING_CODE_FIELDS: Record<string, FhirVersion[]> = {
  'AllergyIntolerance.type': ['R4', 'R4B'],
  // Add more as discovered
};
```

When the rule encounters a candidate field, check this map before emitting the warning:

```typescript
const key = `${resourceType}.${fieldPath}`;
if (PLAIN_STRING_CODE_FIELDS[key]?.includes(version)) {
  continue; // skip — this is intentionally a plain string in this version
}
```

## Implementation notes

- The broader pattern here: several FHIR R4→R5 breaking changes involve fields changing type
  from plain string/code to CodeableConcept. The `PLAIN_STRING_CODE_FIELDS` map is the
  extensible solution for future discoveries.
- Other known fields that are plain strings in some versions (document but do not implement unless
  they are currently producing false positives):
  - `Encounter.class` is a `Coding` in R4/R4B but a `CodeableConcept` in R5
  - `MedicationRequest.medication` was polymorphic in R4; changed in R5
- The fix must not suppress valid CodeableConcept warnings for R5 AllergyIntolerance.type
  (where it is genuinely a CodeableConcept)

## Acceptance criteria

```bash
# R4 AllergyIntolerance with type="allergy" must validate clean
echo '{"resourceType":"AllergyIntolerance","id":"test-01","clinicalStatus":{"coding":[{"system":"http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical","code":"active"}]},"verificationStatus":{"coding":[{"system":"http://terminology.hl7.org/CodeSystem/allergyintolerance-verification","code":"confirmed"}]},"type":"allergy","patient":{"reference":"Patient/test"}}' \
  | fhir-resource-diff validate - --fhir-version R4
# Expected: valid (no warning about type being a plain string)

# R4B same — must not warn
echo '{"resourceType":"AllergyIntolerance","id":"test-01","type":"intolerance","patient":{"reference":"Patient/test"}}' \
  | fhir-resource-diff validate - --fhir-version R4B
# Expected: valid or warnings only for other rules, NOT for .type being a plain string

# R5 AllergyIntolerance.type as string SHOULD still warn (it should be CodeableConcept in R5)
echo '{"resourceType":"AllergyIntolerance","id":"test-01","type":"allergy","subject":{"reference":"Patient/test"}}' \
  | fhir-resource-diff validate - --fhir-version R5
# Expected: warning that type should be CodeableConcept in R5

# End-to-end: no false positives with fhir-test-data R4B
fhir-test-data generate allergy-intolerance --locale us --seed 1 --no-pretty --fhir-version R4B \
  | fhir-resource-diff validate - --fhir-version R4B
# Expected: valid (no warnings about .type)
```

## Do not do

- Do not suppress CodeableConcept warnings for R5 (the R5 structural change is intentional)
- Do not create a global suppression for all `type` fields — scope to specific resource/version pairs
- Do not add `PLAIN_STRING_CODE_FIELDS` entries for fields not currently causing false positives
