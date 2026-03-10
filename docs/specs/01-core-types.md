# Spec 01 — Core types

## Goal

Define all shared TypeScript types and interfaces in `src/core/types.ts` and `src/core/index.ts`.
This is the load-bearing spec — every other module depends on these types.
Get them right before anything else is implemented.

## Dependencies

- Spec 00 (project setup) complete

## Deliverables

| File | Description |
|------|-------------|
| `src/core/types.ts` | All shared types (see below) |
| `src/core/index.ts` | Re-exports everything public from src/core |

## Key interfaces and types

Design the following types. Exact field names are specified; add JSDoc comments on non-obvious fields.

### FhirResource

```typescript
/** Minimum shape of any FHIR resource. */
export interface FhirResource {
  resourceType: string;
  id?: string;
  meta?: FhirMeta;
  [key: string]: unknown;
}

export interface FhirMeta {
  versionId?: string;
  lastUpdated?: string;
  [key: string]: unknown;
}
```

### ParseResult

```typescript
export type ParseResult =
  | { success: true; resource: FhirResource }
  | { success: false; error: string };
```

### ValidationResult

```typescript
export type ValidationResult =
  | { valid: true }
  | { valid: false; errors: ValidationError[] };

export interface ValidationError {
  path: string;     // dot-notation path, e.g. "name[0].given"
  message: string;
}
```

### DiffEntry and DiffResult

```typescript
export type DiffChangeKind = "added" | "removed" | "changed" | "type-changed";

export interface DiffEntry {
  kind: DiffChangeKind;
  path: string;        // dot-notation path to the changed value
  left?: unknown;      // value in the left (base) resource; absent for "added"
  right?: unknown;     // value in the right (target) resource; absent for "removed"
}

export interface DiffResult {
  resourceType: string;
  identical: boolean;
  entries: DiffEntry[];
}
```

### NormalizeOptions

```typescript
export interface NormalizeOptions {
  sortObjectKeys?: boolean;
  trimStrings?: boolean;
  normalizeDates?: boolean;
  /** Dot-notation paths of arrays to sort before comparison. */
  sortArrayPaths?: string[];
}
```

### DiffOptions

```typescript
export interface DiffOptions {
  /** Field paths to exclude from comparison. Dot-notation, supports wildcards: "meta.*" */
  ignorePaths?: string[];
  normalize?: NormalizeOptions;
}
```

### Preset types

```typescript
export interface IgnorePreset {
  name: string;
  description: string;
  paths: string[];
}

export interface NormalizationPreset {
  name: string;
  description: string;
  options: NormalizeOptions;
}
```

## Implementation notes

- All types must be plain interfaces or type aliases — no classes.
- No imports from any external package in `types.ts`. Types must have zero runtime cost.
- `FhirResource` uses an index signature `[key: string]: unknown` to allow arbitrary FHIR fields
  without forcing `any`. This is intentional — FHIR resources are open-world objects.
- `DiffEntry.path` uses dot-notation with bracket notation for arrays:
  `name[0].given[1]`, `telecom[2].value`, `meta.lastUpdated`.
- `src/core/index.ts` should re-export all public types and all public functions from the core
  modules (once they are implemented in later specs). For this spec, it only needs to export types.

## Acceptance criteria

```bash
pnpm typecheck    # passes — no errors in src/core/types.ts
pnpm lint         # passes
```

Manually verify:
- `FhirResource` can be assigned `{ resourceType: "Patient", id: "123", name: [{ text: "John" }] }`
  without TypeScript errors.
- `DiffResult` with `identical: true` and `entries: []` is valid.
- `DiffResult` with `entries` containing all four `DiffChangeKind` variants is valid.

## Do not do

- Do not implement any functions yet — only types and interfaces.
- Do not import zod or any runtime library in `types.ts`.
- Do not add FHIR-version-specific types (R4, R5, STU3 structures) — keep types generic.
