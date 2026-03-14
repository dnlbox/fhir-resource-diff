# Spec 21 — Format and pattern validation rules

**Status:** complete

## Goal

Add validation rules that catch common FHIR formatting mistakes — malformed IDs, invalid
date/dateTime strings, and broken reference values. These are regex/pattern checks that
run against any resource without needing StructureDefinitions. They surface as warnings
(not errors) so they inform without blocking.

## Dependencies

- Spec 01 (types: `ValidationError`, `ValidationSeverity`)
- Spec 02 (validate: `validate()` function)
- Spec 12 (fhir-version: `FhirVersion`)
- Spec 13 (resource-registry: `isKnownResourceType`)

## Deliverables

### New files

| File | Purpose |
|------|---------|
| `src/core/rules/id-format.ts` | FHIR `id` format rule |
| `src/core/rules/date-format.ts` | FHIR date/dateTime/instant format rule |
| `src/core/rules/reference-format.ts` | FHIR `reference` string format rule |
| `src/core/rules/index.ts` | Re-exports all rules, defines `ValidationRule` type |
| `tests/core/rules/id-format.test.ts` | Tests for id rule |
| `tests/core/rules/date-format.test.ts` | Tests for date rule |
| `tests/core/rules/reference-format.test.ts` | Tests for reference rule |

### Modified files

| File | Change |
|------|--------|
| `src/core/validate.ts` | Import and run rules after base schema validation |
| `src/core/index.ts` | Re-export rule types and runner |
| `tests/core/validate.test.ts` | Integration tests for rules running via `validate()` |

## Key interfaces / signatures

### ValidationRule

```typescript
/**
 * A validation rule that inspects a parsed FHIR resource and returns
 * zero or more validation findings (warnings/info).
 */
interface ValidationRule {
  /** Unique rule identifier, e.g. "fhir-id-format". */
  id: string;
  /** Human-readable short description. */
  description: string;
  /** Run the rule against a resource. Returns findings (empty = pass). */
  check(resource: FhirResource, version?: FhirVersion): ValidationError[];
}
```

### Rule functions

Each rule module exports a single `ValidationRule` object:

```typescript
// src/core/rules/id-format.ts
export const idFormatRule: ValidationRule;

// src/core/rules/date-format.ts
export const dateFormatRule: ValidationRule;

// src/core/rules/reference-format.ts
export const referenceFormatRule: ValidationRule;
```

### Rule runner

```typescript
// src/core/rules/index.ts
export const FORMAT_RULES: readonly ValidationRule[];

export function runRules(
  resource: FhirResource,
  rules: readonly ValidationRule[],
  version?: FhirVersion,
): ValidationError[];
```

## Implementation notes

### Rule 1: FHIR `id` format (`fhir-id-format`)

FHIR ids must match `[A-Za-z0-9\-\.]{1,64}`.

**What to check:**
- `resource.id` — the top-level id
- Walk the resource tree and check any field named `id` at any depth (these are FHIR ids too)

**Severity:** `warning`

**Path format:** dot-notation, e.g. `"id"`, `"contained[0].id"`, `"identifier[0].id"`

**Edge cases:**
- Skip `id` fields that are not strings (those are caught by base schema or are legitimate non-FHIR id fields)
- `id` is optional — absence is not an error
- Empty string `""` fails the pattern (min length 1)

**Regex constant:**
```typescript
const FHIR_ID_PATTERN = /^[A-Za-z0-9\-.]{1,64}$/;
```

### Rule 2: FHIR date/dateTime/instant format (`fhir-date-format`)

FHIR uses a restricted subset of ISO 8601. The valid formats are:

| Type | Pattern | Examples |
|------|---------|----------|
| `date` | `YYYY`, `YYYY-MM`, `YYYY-MM-DD` | `2024`, `2024-03`, `2024-03-15` |
| `dateTime` | date formats + `YYYY-MM-DDThh:mm:ss[.fff]Z` or `YYYY-MM-DDThh:mm:ss[.fff]+\|-hh:mm` | `2024-03-15T10:30:00Z` |
| `instant` | full dateTime with timezone required, seconds required | `2024-03-15T10:30:00.000Z` |

**What to check:**
Walk the resource tree and check any field whose key matches known date-bearing field names:

```typescript
const DATE_FIELD_SUFFIXES = [
  "date", "Date",            // birthDate, effectiveDate, date
  "dateTime", "DateTime",    // effectiveDateTime, authoredOn (not suffixed, skip)
  "instant",                 // meta.lastUpdated is an instant
  "issued", "recorded",      // Observation.issued, Provenance.recorded
  "lastUpdated",             // meta.lastUpdated
  "authoredOn",              // MedicationRequest.authoredOn
  "occurrenceDateTime",
  "onsetDateTime",
  "abatementDateTime",
  "performedDateTime",
];
```

Also detect string values that _look_ like dates but are malformed (e.g., `"2024/03/15"`,
`"03-15-2024"`, `"2024-13-01"`) by checking fields whose values match a loose date heuristic.

**Severity:** `warning`

**Regex constants:**
```typescript
const FHIR_DATE_PATTERN = /^\d{4}(-\d{2}(-\d{2})?)?$/;
const FHIR_DATETIME_PATTERN = /^\d{4}(-\d{2}(-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2}))?)?)?$/;
const FHIR_INSTANT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
```

**Implementation approach:**
- Use suffix matching on field names, not hardcoded full paths
- For `meta.lastUpdated`, validate as `instant` (strictest)
- For fields ending in `DateTime`, validate as `dateTime`
- For fields ending in `date` or `Date`, validate as `date` (most permissive)
- For `issued`, `recorded`, validate as `instant`

### Rule 3: Reference format (`fhir-reference-format`)

FHIR references should follow one of these patterns:
- Relative: `ResourceType/id` (e.g., `Patient/123`)
- Absolute: `https://...` (full URL)
- Fragment: `#contained-id` (reference to contained resource)
- URN: `urn:uuid:...` or `urn:oid:...`

**What to check:**
Walk the resource tree. For any object that has a `reference` key with a string value,
validate the format.

```typescript
const RELATIVE_REF_PATTERN = /^[A-Z][A-Za-z]+\/[A-Za-z0-9\-.]{1,64}$/;
const FRAGMENT_REF_PATTERN = /^#.+$/;
const ABSOLUTE_REF_PATTERN = /^https?:\/\/.+/;
const URN_REF_PATTERN = /^urn:(uuid|oid):.+$/;
```

**Additional check for relative references:**
When `version` is provided, validate that the resource type portion (before `/`) is a
known resource type using `isKnownResourceType()`.

**Severity:** `warning`

**Path format:** e.g., `"subject.reference"`, `"performer[0].reference"`, `"entry[2].resource.subject.reference"`

### Tree walker utility

All three rules need to walk the resource object tree. Extract a shared utility:

```typescript
// src/core/rules/walk.ts
type FieldVisitor = (
  path: string,
  key: string,
  value: unknown,
  parent: Record<string, unknown>,
) => void;

export function walkResource(resource: FhirResource, visitor: FieldVisitor): void;
```

- Recurse into objects and arrays
- Build dot-notation path with array indices: `"name[0].given[0]"`
- Skip `null` and `undefined` values
- No depth limit needed for realistic FHIR resources (max ~10 levels)

### Integration with `validate()`

In `validate.ts`, after the existing version-aware checks, run format rules:

```typescript
import { FORMAT_RULES, runRules } from "./rules/index.js";

// After existing checks, always run format rules (they produce warnings only)
const ruleFindings = runRules(resource, FORMAT_RULES, version);
errors.push(...ruleFindings);
```

Format rules run **regardless** of whether `version` is provided — they are structural
checks, not version-specific. The `version` parameter is passed through so rules like
reference-format can optionally use the registry.

### Rule findings include `ruleId`

Extend `ValidationError` to optionally carry the rule that produced it:

```typescript
interface ValidationError {
  path: string;
  message: string;
  severity: ValidationSeverity;
  docUrl?: string;
  /** Identifier of the rule that produced this finding. */
  ruleId?: string;
}
```

This is a backwards-compatible addition (optional field). It enables future `--skip-rules`
filtering without changing the error shape.

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

**id-format rule tests:**
- `"abc-123"` → pass
- `"a".repeat(64)` → pass (boundary)
- `"a".repeat(65)` → warn (too long)
- `"has spaces"` → warn
- `"special!@#"` → warn
- `""` → warn
- Nested id fields detected and validated
- Non-string id fields skipped

**date-format rule tests:**
- `"2024"` → pass (date)
- `"2024-03"` → pass (date)
- `"2024-03-15"` → pass (date)
- `"2024-03-15T10:30:00Z"` → pass (dateTime)
- `"2024-03-15T10:30:00.000+05:30"` → pass (dateTime)
- `"2024/03/15"` → warn (wrong separator)
- `"03-15-2024"` → warn (US format)
- `"2024-13-01"` → warn (invalid month — optional, best-effort)
- `meta.lastUpdated` validated as instant

**reference-format rule tests:**
- `"Patient/123"` → pass
- `"https://example.com/fhir/Patient/123"` → pass
- `"#contained-1"` → pass
- `"urn:uuid:550e8400-e29b-41d4-a716-446655440000"` → pass
- `"12345"` → warn (bare id, no type prefix)
- `"Patient"` → warn (missing id)
- `""` → warn (empty string)
- `"InvalidType/123"` with version → warn (unknown resource type in reference)

**Integration tests (via validate()):**
- Resource with malformed id produces warning with `ruleId: "fhir-id-format"`
- Resource with bad date produces warning with `ruleId: "fhir-date-format"`
- Resource with bare reference produces warning with `ruleId: "fhir-reference-format"`
- Clean resource produces no rule warnings
- Rule warnings don't cause `valid: false` (only severity `"error"` does that)

### CLI smoke test
```bash
# Resource with a bad id should show warning but exit 0
echo '{"resourceType":"Patient","id":"has spaces!!"}' | pnpm cli validate -
# Should show: warning about id format
# Exit code: 0 (warnings don't fail)
```

## Do not do

- Do not validate field _presence_ (required fields) — that is Spec 22
- Do not validate value sets or code system bindings — that is Spec 22
- Do not add CLI flags for rule selection yet — future spec
- Do not validate extensions or modifierExtensions
- Do not validate contained resources differently from top-level (same rules apply)
- Do not error on unknown field names — FHIR resources use `.passthrough()`
