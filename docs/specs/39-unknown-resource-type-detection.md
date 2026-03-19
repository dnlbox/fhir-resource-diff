---
**Status:** complete
---

# Spec 39 — Clearer detection of unknown/invalid resource types

## Goal

The fault injection test `--faults invalid-resource-type` produces `"resourceType": "InvalidResourceXYZ"`.
The validator currently reports this resource as **valid** — which is incorrect. A resource with a
completely fabricated or misspelled `resourceType` is not a valid FHIR resource.

The `fhir-status-values` or a new rule should flag resources whose `resourceType` is not found in
the known registry. When no FHIR version is known, the check applies across all versions; when a
version is specified, restrict to that version.

## Current behaviour

Resources with `resourceType` values that the registry doesn't recognise (but that aren't blank)
pass the parse-level checks. The registry lookup silently returns `undefined`, and no downstream
rule flags it.

## Dependencies

- Spec 13 (resource-type-registry) — complete
- Spec 22 (structural-validation-rules) — complete

## Deliverables

- `src/core/validators/rules/fhir-status-values.ts` or a new
  `src/core/validators/rules/fhir-resource-type.ts` — add resource type registry check
- `tests/core/validators/` — add test cases for known, unknown, and version-mismatched resource types
- `CHANGELOG.md` — add entry under `[Unreleased]`

## Key interfaces / signatures

Add a FORMAT_RULE (always-run, no version required) that checks whether the resource type is
in the registry:

```typescript
// fhir-resource-type rule (FORMAT_RULE — runs even without version)
function validateResourceType(resource: FhirResource, version?: FhirVersion): ValidationError[] {
  const errors: ValidationError[] = [];
  const rt = resource.resourceType;

  // resourceType presence is already checked at parse time; this rule focuses on known-ness
  if (!rt) return errors;

  const info = getResourceInfo(rt); // case-insensitive lookup
  if (!info) {
    errors.push({
      path: 'resourceType',
      message: `Unknown resourceType '${rt}': not in the FHIR resource registry. ` +
        `Check https://hl7.org/fhir/resourcelist.html`,
      severity: 'warning',
      ruleId: 'fhir-resource-type',
      docUrl: 'https://hl7.org/fhir/resourcelist.html',
    });
    return errors;
  }

  // Version-gated: check if the resource type exists in the given version
  if (version && !info.versions.includes(version)) {
    errors.push({
      path: 'resourceType',
      message: `resourceType '${rt}' is not available in ${version}. ` +
        `It exists in: ${info.versions.join(', ')}`,
      severity: 'warning',
      ruleId: 'fhir-resource-type',
      docUrl: `https://hl7.org/fhir/${version}/resourcelist.html`,
    });
  }

  return errors;
}
```

## Implementation notes

- This rule should be a FORMAT_RULE (always run), not a STRUCTURAL_RULE, because the resource type
  is fundamental — we can check it without a declared FHIR version
- The existing behaviour for `MedicationUsage` warning in the `fhir-status-values` rule should be
  replaced by this new rule after spec 35 adds `MedicationUsage` to the registry — no duplication
- Severity: **warning** (not error) — the registry is curated, not complete. A type unknown to the
  registry may be a custom extension. The message should clearly say "not in the FHIR resource
  registry" rather than "invalid"
- The case-insensitive lookup in `getResourceInfo` will handle capitalisation variants naturally
- After implementing spec 35 (MedicationUsage R5 registry), the warning for MedicationUsage should
  disappear automatically when this rule is in place

## Acceptance criteria

```bash
# Completely unknown resourceType must be flagged
echo '{"resourceType":"InvalidResourceXYZ","id":"test-01"}' \
  | fhir-resource-diff validate -
# Expected: valid (with warnings) — "Unknown resourceType 'InvalidResourceXYZ'"

# Fault injection round-trip: invalid-resource-type fault must now be detected
fhir-test-data generate patient --locale us --seed 1 --no-pretty --faults invalid-resource-type \
  | fhir-resource-diff validate -
# Expected: valid (with warnings) — resourceType warning present

# Version mismatch must be flagged: MedicationStatement in R5
echo '{"resourceType":"MedicationStatement","id":"test-01"}' \
  | fhir-resource-diff validate - --fhir-version R5
# Expected: warning — 'MedicationStatement' not available in R5

# Known resource types must pass without resource-type warnings
echo '{"resourceType":"Patient","id":"test-01"}' \
  | fhir-resource-diff validate -
# Expected: valid (no resourceType warning)

# Case insensitive — 'patient' (lowercase) should not warn
echo '{"resourceType":"patient","id":"test-01"}' \
  | fhir-resource-diff validate -
# Note: parse-level still requires correct capitalisation; this tests the rule
```

## Do not do

- Do not produce severity `error` for unknown resource types — the registry is not exhaustive
- Do not remove the existing "may be valid" language from the registry lookup warning that already
  exists in `fhir-status-values` until this rule fully replaces it
- Do not change how parse-level `resourceType` checking works (missing/null is a parse error)
- Do not validate `resourceType` field values that use extensions (e.g. `_resourceType`) — out of scope
