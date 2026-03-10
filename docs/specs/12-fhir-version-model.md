# Spec 12 — FHIR version model

## Goal

Introduce first-class FHIR version awareness into the core library. This module is the
foundation for resource type registries, version-aware validation, and the `--fhir-version`
CLI flag.

## Dependencies

- Spec 01 (core types): `FhirResource`, `FhirMeta`

## Deliverables

| File | Description |
|------|-------------|
| `src/core/fhir-version.ts` | FHIR version types, constants, detection, and URL helpers |
| `src/core/types.ts` | Add `fhirVersion?: string` to `FhirMeta` interface |
| `src/core/index.ts` | Re-export new public symbols |
| `tests/core/fhir-version.test.ts` | Tests for all exported functions |

## Key types and functions

### Types

```typescript
/** Supported FHIR release identifiers. */
export type FhirVersion = "R4" | "R4B" | "R5";
```

### Constants

```typescript
export const SUPPORTED_FHIR_VERSIONS: readonly FhirVersion[] = ["R4", "R4B", "R5"] as const;

export const DEFAULT_FHIR_VERSION: FhirVersion = "R4";

/**
 * Maps concrete FHIR version strings (as found in meta.fhirVersion or CapabilityStatement)
 * to the corresponding release identifier.
 */
export const VERSION_STRING_MAP: ReadonlyMap<string, FhirVersion> = new Map([
  ["4.0.0", "R4"],
  ["4.0.1", "R4"],
  ["4.3.0", "R4B"],
  ["4.3.0-snapshot1", "R4B"],
  ["5.0.0", "R5"],
  ["5.0.0-snapshot1", "R5"],
  ["5.0.0-ballot", "R5"],
]);
```

### Functions

```typescript
/**
 * Detects the FHIR version from a resource's meta.fhirVersion field.
 * Returns undefined if the field is absent or the version string is unrecognized.
 */
export function detectFhirVersion(resource: FhirResource): FhirVersion | undefined;

/**
 * Resolves a FHIR version from an explicit flag, auto-detection, or the default.
 * Priority: explicit > detected > default.
 */
export function resolveFhirVersion(
  explicit: FhirVersion | undefined,
  resource: FhirResource,
): FhirVersion;

/**
 * Returns a human-readable label, e.g. "FHIR R4 (v4.0.1)".
 */
export function fhirVersionLabel(version: FhirVersion): string;

/**
 * Returns the base URL for the HL7 FHIR spec for the given version.
 * e.g. "https://hl7.org/fhir/R4"
 */
export function fhirBaseUrl(version: FhirVersion): string;

/**
 * Validates that a string is a supported FhirVersion.
 * Useful for parsing CLI flags.
 */
export function isSupportedFhirVersion(value: string): value is FhirVersion;
```

### FhirMeta update

Add `fhirVersion` to the existing `FhirMeta` interface in `src/core/types.ts`:

```typescript
export interface FhirMeta {
  versionId?: string;
  lastUpdated?: string;
  fhirVersion?: string;   // ← add this
  [key: string]: unknown;
}
```

This field is part of the FHIR spec: `Meta.fhirVersion` appears in the resource metadata
when the server populates it.

## Implementation notes

- `detectFhirVersion` reads `resource.meta?.fhirVersion` and looks it up in `VERSION_STRING_MAP`.
  If the field is missing or the string is not in the map, return `undefined`.
- `resolveFhirVersion` implements the priority chain: if an explicit version is provided, use it;
  otherwise try `detectFhirVersion`; otherwise return `DEFAULT_FHIR_VERSION`.
- `fhirBaseUrl` returns:
  - `"R4"` → `"https://hl7.org/fhir/R4"`
  - `"R4B"` → `"https://hl7.org/fhir/R4B"`
  - `"R5"` → `"https://hl7.org/fhir/R5"`
- `fhirVersionLabel` returns:
  - `"R4"` → `"FHIR R4 (v4.0.1)"`
  - `"R4B"` → `"FHIR R4B (v4.3.0)"`
  - `"R5"` → `"FHIR R5 (v5.0.0)"`
- All functions are pure. No side effects. No Node imports. Browser-safe.

## Acceptance criteria

```bash
pnpm typecheck   # passes
pnpm test        # fhir-version tests pass
pnpm lint        # passes
```

Tests must cover:

- `detectFhirVersion` with known version strings → correct FhirVersion
- `detectFhirVersion` with unknown string → `undefined`
- `detectFhirVersion` with missing `meta` → `undefined`
- `detectFhirVersion` with missing `meta.fhirVersion` → `undefined`
- `resolveFhirVersion` priority chain: explicit > detected > default
- `fhirBaseUrl` for each supported version
- `fhirVersionLabel` for each supported version
- `isSupportedFhirVersion` with valid and invalid strings

## Do not do

- Do not add FHIR version-specific resource schemas or field definitions — that is spec 13.
- Do not add CLI flags — that is spec 16.
- Do not make network calls to resolve or validate versions.
- Do not support FHIR versions prior to R4 (DSTU2, STU3) — they are out of scope for now.
