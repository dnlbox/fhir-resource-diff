# Spec 17 — Version-aware validation

**Status:** complete

## Goal

Extend the validation system with version-aware structural checks and a severity model.
Not full FHIR schema validation (that's the HL7 validator's job), but enough awareness
to catch common issues and provide helpful guidance.

## Dependencies

- Spec 12 (FHIR version model): `FhirVersion`, `resolveFhirVersion`, `VERSION_STRING_MAP`
- Spec 13 (resource type registry): `isKnownResourceType`, `getResourceDocUrl`
- Spec 16 (`--fhir-version` flag wired into CLI commands)

## Deliverables

| File | Description |
|------|-------------|
| `src/core/types.ts` | Add `ValidationSeverity`, update `ValidationError` |
| `src/core/validate.ts` | Extend `validate()` to accept `FhirVersion`, add version checks |
| `src/formatters/text.ts` | Update `formatValidationText` to display severity |
| `src/formatters/json.ts` | Update `formatValidationJson` to include severity |
| `src/cli/commands/validate.ts` | Pass resolved version to `validate()` |
| `src/cli/commands/compare.ts` | Pass resolved version to `validate()` |
| `tests/core/validate.test.ts` | Add version-aware validation tests |
| `tests/formatters/text.test.ts` | Update for severity display |
| `tests/formatters/json.test.ts` | Update for severity field |

## Type changes

### ValidationSeverity

Add to `src/core/types.ts`:

```typescript
export type ValidationSeverity = "error" | "warning" | "info";
```

### ValidationError update

Add `severity` and `docUrl` to the existing `ValidationError` interface:

```typescript
export interface ValidationError {
  path: string;
  message: string;
  severity: ValidationSeverity;
  /** Optional HL7 documentation link for context. */
  docUrl?: string;
}
```

**Why `severity` and `docUrl` matter for automation:**
These fields are designed specifically for programmatic consumers — CI pipelines and AI agents.
An automated tool can filter by severity to decide pass/fail without parsing human text, and
can follow `docUrl` to provide contextual help to the user or escalate with a direct link to
the relevant HL7 specification page. Human-readable formatters also benefit, but the primary
design driver is machine-consumability.

### ValidationResult update

No structural change needed. The existing discriminated union works — `valid: false` now
carries `ValidationError[]` entries that include severity. A resource with only warnings
is still `valid: false` structurally, but the CLI can use severity to decide exit codes.

### validate() signature update

```typescript
export function validate(
  resource: FhirResource,
  version?: FhirVersion,
): ValidationResult;
```

The `version` parameter is optional for backward compatibility. When omitted, behaves
as before (no version-specific checks).

## Version-aware checks

When a `FhirVersion` is provided, add these checks on top of the existing structural validation:

### All versions

- **Unknown resourceType (warning):** If `isKnownResourceType(resource.resourceType, version)`
  returns false, add a warning: `"resourceType '<type>' is not in the known registry for
  <version>. This may be valid — check <docUrl>"`. Set `docUrl` to the HL7 resource list URL.
  Severity: `warning`.

### R4 / R4B / R5 — fhirVersion mismatch

- **Version mismatch (warning):** If `meta.fhirVersion` is present and does not map to the
  expected version via `VERSION_STRING_MAP`, add a warning: `"meta.fhirVersion '<value>'
  does not match expected version <version>"`. Severity: `warning`.

### R5 — deprecated patterns

- **Narrative text type (info):** If the resource has `text.status` but no `text.div`, add
  an info message: `"R5 recommends narrative text with a div element"`. Severity: `info`.

### General guidance

- **Full validation hint (info):** When any version is specified, always append an info-level
  entry: `"For full FHIR schema validation, use the official HL7 FHIR Validator:
  https://confluence.hl7.org/display/FHIR/Using+the+FHIR+Validator"`. Severity: `info`.
  This ensures users know our tool does structural checks, not full conformance.

## Formatter changes

### text formatter

Update `formatValidationText` to prefix entries with severity indicators:

```
valid (with warnings)

  ⚠ resourceType 'CustomResource' is not in the known registry for R5
    → https://hl7.org/fhir/resourcelist.html
  ℹ For full FHIR schema validation, use the official HL7 FHIR Validator
    → https://confluence.hl7.org/display/FHIR/Using+the+FHIR+Validator
```

For errors:

```
invalid

  ✗ resourceType must be a non-empty string
  ⚠ meta.fhirVersion '3.0.2' does not match expected version R4
```

Severity indicators: `✗` for errors, `⚠` for warnings, `ℹ` for info.

### json formatter

Include `severity` and `docUrl` fields in each error entry:

```json
{
  "valid": false,
  "errors": [
    {
      "path": "resourceType",
      "message": "resourceType must be a non-empty string",
      "severity": "error"
    },
    {
      "path": "meta.fhirVersion",
      "message": "meta.fhirVersion '3.0.2' does not match expected version R4",
      "severity": "warning"
    }
  ]
}
```

## CLI exit code behavior

The `validate` command should adjust exit codes based on severity:

- Errors present → exit 1
- Only warnings/info → exit 0 (resource is structurally valid, warnings are advisory)
- No issues → exit 0

This is a change from the current behavior where any `valid: false` returns exit 1.
Add a `hasErrors()` helper or check `errors.some(e => e.severity === "error")`.

## Implementation notes

- Existing `ValidationError` entries from the zod schema check should all get
  `severity: "error"`. This is a backward-compatible change.
- The `version` parameter is optional. When `undefined`, skip all version-aware checks.
  Existing tests must still pass without modification.
- Keep validation checks lightweight. Do not attempt to validate field types, cardinality,
  or FHIR profiles — that is outside our scope.
- All new code must be browser-safe. No Node imports in `src/core/` or `src/formatters/`.
- The structured JSON output from `formatValidationJson` (with severity + docUrl) is the
  primary interface for CI and AI agents. Ensure the JSON shape is stable and documented
  — automated consumers will parse it programmatically.

## Acceptance criteria

```bash
pnpm typecheck   # passes
pnpm test        # all tests pass (existing + new)
pnpm lint        # passes
```

Tests must cover:

- `validate(resource)` without version → same behavior as before (backward compat)
- `validate(resource, "R4")` with known resourceType → no version warnings
- `validate(resource, "R5")` with unknown resourceType → warning present
- `validate(resource, "R4")` with mismatched `meta.fhirVersion` → warning
- Severity field present on all validation errors
- Text formatter shows severity indicators
- JSON formatter includes severity field
- CLI exits 0 for warnings-only, exits 1 for errors

## Do not do

- Do not implement full FHIR schema validation — we are not an HL7 validator replacement.
- Do not validate individual field types, cardinality, or value sets.
- Do not fetch schemas or profiles from the network.
- Do not add version-specific normalization rules — normalization stays version-agnostic.
- Do not break backward compatibility — `validate(resource)` without a version must work.
