# Spec 16 — `--fhir-version` flag on existing commands

**Status:** complete

## Goal

Add `--fhir-version <R4|R4B|R5>` to the `compare`, `validate`, and `normalize` commands.
When provided, the tool uses version-specific behavior. When omitted, it auto-detects from
`meta.fhirVersion` or falls back to R4. This spec wires up the flag and detection — actual
version-specific validation logic comes in spec 17.

## Dependencies

- Spec 12 (FHIR version model): `FhirVersion`, `resolveFhirVersion`, `isSupportedFhirVersion`,
  `detectFhirVersion`

## Deliverables

| File | Description |
|------|-------------|
| `src/cli/commands/compare.ts` | Add `--fhir-version` option, version resolution, mismatch warning |
| `src/cli/commands/validate.ts` | Add `--fhir-version` option, version resolution |
| `src/cli/commands/normalize.ts` | Add `--fhir-version` option, version resolution |
| `tests/cli/compare.test.ts` | Add tests for version flag behavior |
| `tests/cli/validate.test.ts` | Add tests for version flag behavior |

## Changes per command

### compare

Add the option:

```
--fhir-version <ver>  FHIR version: R4 | R4B | R5 (default: auto-detect or R4)
```

Version resolution for compare:

1. If `--fhir-version` is provided, use it for both resources.
2. If not, auto-detect from each resource independently using `detectFhirVersion`.
3. If a resource has no detectable version, fall back to `DEFAULT_FHIR_VERSION` (R4).
4. If the two resources resolve to different versions, print a warning to stderr:
   `Warning: resources appear to be from different FHIR versions (<versionA> vs <versionB>)`
5. Pass the resolved version(s) to validation (when spec 17 lands). For now, resolve
   and store the version but pass it through without behavior changes.

### validate

Add the option:

```
--fhir-version <ver>  FHIR version: R4 | R4B | R5 (default: auto-detect or R4)
```

Version resolution:

1. If `--fhir-version` is provided, use it.
2. Otherwise, auto-detect from the resource.
3. Fall back to R4.
4. Pass the resolved version to `validate()` (once spec 17 extends the signature).
   For now, resolve and print the resolved version in verbose/debug context.

### normalize

Add the option:

```
--fhir-version <ver>  FHIR version: R4 | R4B | R5 (default: auto-detect or R4)
```

Version resolution same as validate. No immediate behavior change — normalization is
version-agnostic in v1. The flag is added now so the CLI surface is consistent and ready
for future version-specific normalization.

## Implementation notes

- All three commands share the same flag validation logic. Extract a shared helper if the
  pattern warrants it:

```typescript
// src/cli/utils/resolve-version.ts (optional)
export function parseVersionFlag(value: string | undefined): FhirVersion | undefined {
  if (value === undefined) return undefined;
  if (isSupportedFhirVersion(value)) return value;
  process.stderr.write(
    `Error: Unknown FHIR version "${value}". Supported: R4, R4B, R5\n`,
  );
  process.exit(2);
}
```

- The `--fhir-version` flag value should be case-sensitive: accept "R4", "R4B", "R5" exactly.
  Do not accept lowercase variants like "r4" — FHIR release names are uppercase by convention.
- The mismatch warning in compare is informational only — do not prevent the diff from running.
  Cross-version comparison is valid and will become more useful in later specs.

## Acceptance criteria

```bash
pnpm typecheck   # passes
pnpm test        # updated tests pass
pnpm lint        # passes
```

Manual smoke tests:

```bash
pnpm cli -- compare examples/patient-a.json examples/patient-b.json --fhir-version R4
# → works, no warning

pnpm cli -- compare examples/patient-a.json examples/patient-b.json --fhir-version INVALID
# → "Error: Unknown FHIR version" message, exit 2

pnpm cli -- validate examples/patient-a.json --fhir-version R5
# → works

pnpm cli -- normalize examples/patient-a.json --fhir-version R4B
# → works
```

Tests must cover:

- `--fhir-version R4` is accepted and doesn't change output (yet)
- `--fhir-version INVALID` produces error and exit 2
- Compare with two resources having different `meta.fhirVersion` → warning on stderr
- Version auto-detection when flag is omitted and `meta.fhirVersion` is present
- Default fallback to R4 when neither flag nor meta is available

## Do not do

- Do not implement version-specific validation rules — that is spec 17.
- Do not implement version-specific normalization behavior.
- Do not accept lowercase version strings (r4, r4b, r5).
- Do not block the diff/validate/normalize operation based on version mismatch.
