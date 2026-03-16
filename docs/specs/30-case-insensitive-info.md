# Spec 30 — Case-insensitive resource type lookup

**Status:** complete

## Goal

`fhir-resource-diff info observation` should work the same as `fhir-resource-diff info Observation`. FHIR resource types are PascalCase by convention, but requiring exact casing from the CLI is unnecessary friction — especially for users typing quickly or coming from lowercase habits.

## Scope

Affects `getResourceInfo` and `isKnownResourceType` in `resource-registry.ts`.
Output always displays the canonical PascalCase name from the registry.

Does **not** affect:
- `resourceType` validation in parsed FHIR JSON — wrong casing in JSON is a real error and should stay flagged
- Profile registry lookups — canonical URLs are case-sensitive by definition
- `list-resources --category` filter — already lowercase values, no change needed

## Deliverables

| File | Change |
|------|--------|
| `src/core/resource-registry.ts` | Case-insensitive match in `getResourceInfo` and `isKnownResourceType` |
| `tests/core/resource-registry.test.ts` | Tests for lowercase and mixed-case input |
| `tests/cli/info.test.ts` | CLI test for lowercase input |

## Implementation

```typescript
// getResourceInfo: normalise input to lowercase for comparison
export function getResourceInfo(resourceType: string): ResourceTypeInfo | undefined {
  const lower = resourceType.toLowerCase();
  return RESOURCE_REGISTRY.find((r) => r.resourceType.toLowerCase() === lower);
}

// isKnownResourceType: same normalisation
export function isKnownResourceType(resourceType: string, version?: FhirVersion): boolean {
  const lower = resourceType.toLowerCase();
  const info = RESOURCE_REGISTRY.find((r) => r.resourceType.toLowerCase() === lower);
  if (!info) return false;
  if (version === undefined) return true;
  return (info.versions as readonly string[]).includes(version);
}
```

## Acceptance criteria

```bash
fhir-resource-diff info observation         # same output as Observation
fhir-resource-diff info OBSERVATION         # same output
fhir-resource-diff info medicationrequest   # same as MedicationRequest
fhir-resource-diff info Patient             # unchanged
fhir-resource-diff info unknowntype         # still returns "Unknown resource type"
```

## Do not do

- Do not normalise `resourceType` values read from FHIR JSON — wrong casing
  in a resource file is a real problem worth surfacing
