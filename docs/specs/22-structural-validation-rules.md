# Spec 22 — Structural validation rules

**Status:** complete

## Goal

Add validation rules that check resource-level structural requirements: required fields for
common resource types, status field value sets, and Coding/CodeableConcept shapes. These are
curated rules for the most-used FHIR resource types — not a complete implementation, but
enough to catch the majority of real-world FHIR server rejections.

## Dependencies

- Spec 01 (types)
- Spec 02 (validate)
- Spec 12 (fhir-version)
- Spec 13 (resource-registry)
- **Spec 21** (rules infrastructure: `ValidationRule`, `runRules`, `walkResource`)

## Deliverables

### New files

| File | Purpose |
|------|---------|
| `src/core/rules/required-fields.ts` | Required field checks for top resource types |
| `src/core/rules/status-values.ts` | Status field value set checks |
| `src/core/rules/codeable-concept.ts` | Coding and CodeableConcept shape checks |
| `src/core/rules/data/required-field-defs.ts` | Curated required field definitions |
| `src/core/rules/data/status-value-defs.ts` | Curated status value set definitions |
| `tests/core/rules/required-fields.test.ts` | Tests |
| `tests/core/rules/status-values.test.ts` | Tests |
| `tests/core/rules/codeable-concept.test.ts` | Tests |

### Modified files

| File | Change |
|------|--------|
| `src/core/rules/index.ts` | Add new rules to `STRUCTURAL_RULES` array, export combined list |
| `src/core/validate.ts` | Run structural rules (version-gated) |
| `tests/core/validate.test.ts` | Integration tests |

## Key interfaces / signatures

### Required field definitions

```typescript
// src/core/rules/data/required-field-defs.ts

interface RequiredFieldDef {
  /** Dot path from resource root, e.g. "status", "code". */
  field: string;
  /** Human-readable label for error messages. */
  label: string;
  /** Which versions require this field. If omitted, all versions. */
  versions?: readonly FhirVersion[];
}

/** Keyed by resourceType. */
type RequiredFieldMap = Record<string, readonly RequiredFieldDef[]>;

export const REQUIRED_FIELDS: RequiredFieldMap;
```

### Status value set definitions

```typescript
// src/core/rules/data/status-value-defs.ts

interface StatusValueDef {
  /** The field path, e.g. "status". */
  field: string;
  /** Allowed values. */
  values: readonly string[];
  /** Which versions use this value set. If omitted, all versions. */
  versions?: readonly FhirVersion[];
}

type StatusValueMap = Record<string, readonly StatusValueDef[]>;

export const STATUS_VALUES: StatusValueMap;
```

### Rule exports

```typescript
// src/core/rules/required-fields.ts
export const requiredFieldsRule: ValidationRule;

// src/core/rules/status-values.ts
export const statusValuesRule: ValidationRule;

// src/core/rules/codeable-concept.ts
export const codeableConceptRule: ValidationRule;
```

### Updated rules index

```typescript
// src/core/rules/index.ts

/** Format rules from Spec 21 — always run. */
export const FORMAT_RULES: readonly ValidationRule[];

/** Structural rules from Spec 22 — run when version is known. */
export const STRUCTURAL_RULES: readonly ValidationRule[];

/** All rules combined. */
export const ALL_RULES: readonly ValidationRule[];
```

## Implementation notes

### Rule 4: Required fields (`fhir-required-fields`)

Curated required fields for the top ~20 resource types. These are fields marked as
`1..1` or `1..*` in the FHIR spec — truly required, not just recommended.

**Curated list:**

| Resource Type | Required Fields |
|---------------|----------------|
| `Observation` | `status`, `code` |
| `Condition` | `subject` |
| `Procedure` | `status`, `subject` |
| `MedicationRequest` | `status`, `intent`, `subject` |
| `MedicationAdministration` | `status`, `subject` |
| `MedicationStatement` | `status`, `subject` |
| `DiagnosticReport` | `status`, `code` |
| `Encounter` | `status` (R4/R4B), `class` (R4/R4B) |
| `AllergyIntolerance` | `patient` (R4/R4B), `subject` (R5 — renamed) |
| `Immunization` | `status`, `vaccineCode`, `patient` |
| `CarePlan` | `status`, `intent`, `subject` |
| `ServiceRequest` | `status`, `intent`, `subject` |
| `Bundle` | `type` |
| `Composition` | `status`, `type`, `date`, `author` |
| `DocumentReference` | `status`, `content` |
| `Claim` | `status`, `type`, `use`, `patient`, `provider` |
| `ExplanationOfBenefit` | `status`, `type`, `use`, `patient`, `provider`, `insurer`, `outcome` |
| `Coverage` | `status`, `beneficiary` |
| `Organization` | (none truly required beyond resourceType) |
| `Patient` | (none truly required beyond resourceType) |
| `Practitioner` | (none truly required beyond resourceType) |

**Implementation approach:**
- Look up `resource.resourceType` in `REQUIRED_FIELDS`
- If not in the map, skip (unknown types get no required-field warnings)
- For each required field, check if the value is present and not null/undefined
- For array fields (like `author`, `content`), check length > 0
- Respect `versions` constraint when `version` parameter is provided

**Severity:** `warning`

> Note: These are warnings, not errors, because our registry is curated and incomplete.
> A missing required field is almost certainly wrong, but we can't be 100% sure without
> full StructureDefinition parsing. The warning is enough to catch the mistake.

**Path format:** `"status"`, `"code"`, `"subject"`, etc.

**Message format:** `"Missing required field 'status' for Observation"` with `docUrl`
pointing to the HL7 resource page.

### Rule 5: Status value sets (`fhir-status-values`)

Most FHIR resources have a `status` field bound to a small, required value set.
These are _required_ bindings — the spec does not allow other values.

**Curated list:**

| Resource Type | Field | Allowed Values |
|---------------|-------|---------------|
| `Observation` | `status` | `registered`, `preliminary`, `final`, `amended`, `corrected`, `cancelled`, `entered-in-error`, `unknown` |
| `Condition` | `clinicalStatus.coding[].code` | `active`, `recurrence`, `relapse`, `inactive`, `remission`, `resolved` |
| `Condition` | `verificationStatus.coding[].code` | `unconfirmed`, `provisional`, `differential`, `confirmed`, `refuted`, `entered-in-error` |
| `Procedure` | `status` | `preparation`, `in-progress`, `not-done`, `on-hold`, `stopped`, `completed`, `entered-in-error`, `unknown` |
| `MedicationRequest` | `status` | `active`, `on-hold`, `ended` (R5), `cancelled`, `completed`, `entered-in-error`, `stopped`, `draft`, `unknown` |
| `MedicationRequest` | `intent` | `proposal`, `plan`, `order`, `original-order`, `reflex-order`, `filler-order`, `instance-order`, `option` |
| `DiagnosticReport` | `status` | `registered`, `partial`, `preliminary`, `modified` (R5), `final`, `amended`, `corrected`, `appended`, `cancelled`, `entered-in-error`, `unknown` |
| `Encounter` | `status` | R4/R4B: `planned`, `arrived`, `triaged`, `in-progress`, `onleave`, `finished`, `cancelled`, `entered-in-error`, `unknown`; R5: `planned`, `in-progress`, `on-hold`, `discharged`, `completed`, `cancelled`, `discontinued`, `entered-in-error`, `unknown` |
| `Bundle` | `type` | `document`, `message`, `transaction`, `transaction-response`, `batch`, `batch-response`, `history`, `searchset`, `collection`, `subscription-notification` |
| `AllergyIntolerance` | `clinicalStatus.coding[].code` | `active`, `inactive`, `resolved` |
| `AllergyIntolerance` | `verificationStatus.coding[].code` | `unconfirmed`, `confirmed`, `refuted`, `entered-in-error` |
| `CarePlan` | `status` | `draft`, `active`, `on-hold`, `revoked`, `completed`, `entered-in-error`, `unknown` |
| `CarePlan` | `intent` | `proposal`, `plan`, `order`, `option`, `directive` |
| `ServiceRequest` | `status` | `draft`, `active`, `on-hold`, `revoked`, `completed`, `entered-in-error`, `unknown` |
| `ServiceRequest` | `intent` | `proposal`, `plan`, `directive`, `order`, `original-order`, `reflex-order`, `filler-order`, `instance-order`, `option` |
| `DocumentReference` | `status` | R4/R4B: `current`, `superseded`, `entered-in-error`; R5: `current`, `superseded`, `entered-in-error` |
| `Immunization` | `status` | `completed`, `entered-in-error`, `not-done` |
| `Coverage` | `status` | `active`, `cancelled`, `draft`, `entered-in-error` |
| `Claim` | `status` | `active`, `cancelled`, `draft`, `entered-in-error` |
| `ExplanationOfBenefit` | `status` | `active`, `cancelled`, `draft`, `entered-in-error` |
| `ExplanationOfBenefit` | `outcome` | `queued`, `complete`, `error`, `partial` |

**Implementation approach:**
- Look up `resource.resourceType` in `STATUS_VALUES`
- For simple `status` fields: read `resource.status` directly
- For CodeableConcept status fields (like `Condition.clinicalStatus`): read
  `resource.clinicalStatus.coding[].code` and check each code value
- When `versions` is specified and `version` is known, only use the matching value set
- If the field is absent, skip (required-fields rule handles that)

**Severity:** `warning`

**Message format:** `"Invalid status value 'active' for Observation.status. Expected one of: registered, preliminary, final, amended, corrected, cancelled, entered-in-error, unknown"`

### Rule 6: Coding / CodeableConcept shape (`fhir-codeable-concept`)

CodeableConcepts and Codings are the most common complex data types in FHIR. Structural
mistakes in these are a top source of server rejections.

**What to check:**

1. **Coding shape**: Any object with a `system` or `code` field (likely a Coding) should
   have both `system` AND `code`. Having one without the other is almost always a mistake.
   - `system` should be a URI (starts with `http://`, `https://`, or `urn:`)
   - `code` should be a non-empty string

2. **CodeableConcept shape**: An object with a `coding` key should have `coding` as an
   array. Each element in the array should be a valid Coding (above). A CodeableConcept
   with empty `coding: []` and no `text` is suspicious — warn.

3. **Common mistake detection**: Flag `"code": "12345"` at resource top level for
   resource types where `code` is a CodeableConcept (like Observation). This catches
   the very common mistake of putting a string where a CodeableConcept is expected.

**Known CodeableConcept fields** (for the string-instead-of-object check):

```typescript
const KNOWN_CODEABLE_CONCEPT_FIELDS: Record<string, string[]> = {
  Observation: ["code", "valueCodeableConcept", "category"],
  Condition: ["code", "clinicalStatus", "verificationStatus", "category", "severity"],
  Procedure: ["code", "category"],
  MedicationRequest: ["medicationCodeableConcept"],
  DiagnosticReport: ["code", "category"],
  AllergyIntolerance: ["code", "clinicalStatus", "verificationStatus", "type", "category"],
  Immunization: ["vaccineCode"],
  ServiceRequest: ["code", "category"],
};
```

**Severity:** `warning`

**Implementation approach:**
- Use `walkResource` from Spec 21 to find Coding-shaped objects
- For the top-level CodeableConcept check, use the `KNOWN_CODEABLE_CONCEPT_FIELDS` map
- Be conservative — only warn when the pattern is clearly wrong

### Integration with `validate()`

Structural rules are **version-gated** — they only run when a `version` is resolved
(either explicit or detected). This is because required fields and value sets are
version-specific.

```typescript
// In validate.ts, after format rules:
if (version) {
  const structuralFindings = runRules(resource, STRUCTURAL_RULES, version);
  errors.push(...structuralFindings);
}
```

Format rules (Spec 21) always run. Structural rules (this spec) only run with a version.

### Data file organization

Keep the curated definitions in `src/core/rules/data/` as plain TypeScript objects.
These are not JSON files — they are typed constants that benefit from TypeScript
checking. Each definition file is a single `export const` with the full map.

This makes it easy to:
- Add new resource types (one map entry)
- Update value sets for new FHIR versions (add `versions` constraint)
- Review all definitions in one place

## Acceptance criteria

### Build and lint
```bash
pnpm typecheck   # no errors
pnpm lint        # no errors
pnpm build       # succeeds
```

### Tests
```bash
pnpm test        # all pass
```

**required-fields rule tests:**
- Observation with status + code → no warnings
- Observation missing status → warning at path `"status"`
- Observation missing code → warning at path `"code"`
- Bundle missing type → warning at path `"type"`
- Patient with just resourceType → no warnings (nothing required)
- Unknown resourceType → no warnings (not in our map)
- AllergyIntolerance.patient required in R4, .subject required in R5 (version-specific)

**status-values rule tests:**
- `Observation.status: "final"` → no warnings
- `Observation.status: "active"` → warning (wrong value set)
- `Observation.status: "FINAL"` → warning (case-sensitive)
- `Bundle.type: "searchset"` → no warnings
- `Bundle.type: "search"` → warning (not in value set)
- `Encounter.status: "onleave"` in R4 → no warning; in R5 → warning (removed)
- `MedicationRequest.intent: "order"` → no warnings
- Absent status field → no warning (required-fields rule handles that)
- CodeableConcept status fields (Condition.clinicalStatus) → checks coding[].code

**codeable-concept rule tests:**
- `coding: [{ system: "http://loinc.org", code: "1234" }]` → no warnings
- `coding: [{ code: "1234" }]` → warning (missing system)
- `coding: [{ system: "http://loinc.org" }]` → warning (missing code)
- `coding: []` with no `text` → warning (empty CodeableConcept)
- `Observation.code: "12345"` (string) → warning (should be CodeableConcept)
- `Observation.code: { coding: [...] }` → no warning (correct shape)
- Nested CodeableConcepts detected via tree walk

**Integration tests (via validate()):**
- Resource with missing required field → warning with `ruleId: "fhir-required-fields"`
- Resource with bad status → warning with `ruleId: "fhir-status-values"`
- Resource with broken Coding → warning with `ruleId: "fhir-codeable-concept"`
- All structural warnings require version (don't fire without version)
- Warnings don't cause `valid: false`

### CLI smoke tests
```bash
# Observation missing required fields
echo '{"resourceType":"Observation"}' | pnpm cli validate - --fhir-version R4
# Should warn about missing status and code

# Observation with wrong status value
echo '{"resourceType":"Observation","status":"active","code":{"coding":[{"system":"http://loinc.org","code":"1234"}]}}' | pnpm cli validate - --fhir-version R4
# Should warn about invalid status value

# Observation with string instead of CodeableConcept
echo '{"resourceType":"Observation","status":"final","code":"1234"}' | pnpm cli validate - --fhir-version R4
# Should warn about code being a string instead of CodeableConcept
```

## Do not do

- Do not attempt full StructureDefinition parsing
- Do not download or bundle FHIR spec JSON files
- Do not validate extension content
- Do not validate Reference _targets_ (just format, from Spec 21)
- Do not add new CLI flags — future spec for `--rules` / `--skip-rules`
- Do not make structural rule warnings cause exit code 1
- Do not cover every FHIR resource type — focus on the top ~20 by real-world usage
- Do not validate nested backbone elements (e.g., Bundle.entry.request fields) — keep scope to top-level resource fields
