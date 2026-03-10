# Spec 02 — Core: parse and validate

## Goal

Implement `src/core/parse.ts` and `src/core/validate.ts`, and write unit tests for both.

## Dependencies

- Spec 00 (tooling)
- Spec 01 (types) — `FhirResource`, `ParseResult`, `ValidationResult`, `ValidationError`

## Deliverables

| File | Description |
|------|-------------|
| `src/core/parse.ts` | Parse unknown JSON input into a typed FhirResource |
| `src/core/validate.ts` | Validate the basic shape of a FhirResource |
| `tests/core/parse.test.ts` | Unit tests for parse |
| `tests/core/validate.test.ts` | Unit tests for validate |

## Key function signatures

### parse.ts

```typescript
/**
 * Parses a raw JSON string into a FhirResource.
 * Returns a discriminated union — always check `.success` before using `.resource`.
 * Does not validate FHIR shape beyond JSON well-formedness.
 */
export function parseJson(input: string): ParseResult;

/**
 * Narrows an unknown value to FhirResource if it has a string resourceType.
 * Useful for callers that already have a parsed JS object.
 */
export function isFhirResource(value: unknown): value is FhirResource;
```

### validate.ts

```typescript
/**
 * Validates that a parsed FhirResource meets the minimum required shape.
 * Does not enforce FHIR-version-specific constraints.
 */
export function validate(resource: FhirResource): ValidationResult;
```

## Implementation notes

### parse.ts

- `parseJson` wraps `JSON.parse` and catches `SyntaxError`. Return `{ success: false, error: ... }`
  on any error; never throw.
- After parsing, call `isFhirResource` to narrow the result. If the parsed value lacks a string
  `resourceType`, return `{ success: false, error: "Missing or invalid resourceType" }`.
- `isFhirResource` should check: value is a non-null object AND `typeof value.resourceType === "string"`.
- **No Node.js imports.** File reading is the CLI adapter's job.

### validate.ts

- Minimum validation rules for v1:
  1. `resourceType` is a non-empty string
  2. If `id` is present, it must be a string
  3. If `meta` is present, it must be an object
  4. If `meta.lastUpdated` is present, it must be a string (no full date parsing required)
- Use zod for the schema definition — it keeps the rules declarative and gives free error messages.
- The zod schema should be defined internally; do not export it. Export only `validate`.
- Return `{ valid: true }` or `{ valid: false, errors: ValidationError[] }`.

### Path format in ValidationError

Use dot-notation. For a top-level field: `"resourceType"`. For nested: `"meta.lastUpdated"`.
Map zod's `ZodError.issues` to `ValidationError` — use `issue.path.join(".")` for the path.

## Acceptance criteria

```bash
pnpm typecheck   # passes
pnpm test        # tests/core/parse.test.ts and tests/core/validate.test.ts pass
```

Tests must cover:

**parse:**
- Valid FHIR JSON string → `{ success: true, resource: ... }`
- Invalid JSON string → `{ success: false, error: ... }`
- Valid JSON but no `resourceType` → `{ success: false, error: ... }`
- `resourceType` is a number → `{ success: false, error: ... }`
- `isFhirResource` correctly narrows objects

**validate:**
- Valid minimal resource `{ resourceType: "Patient" }` → `{ valid: true }`
- Missing `resourceType` → `{ valid: false, errors: [{ path: "resourceType", ... }] }`
- Empty string `resourceType` → `{ valid: false }`
- `meta.lastUpdated` as a non-string → `{ valid: false }`

## Do not do

- Do not read files from disk — input is always a string or unknown object.
- Do not validate FHIR-resource-type-specific fields (e.g., Patient.name structure) in v1.
- Do not throw errors — all error cases return the error variant of the discriminated union.
