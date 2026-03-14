# Spec 06 — Presets

**Status:** complete

## Goal

Define built-in named presets for ignore-field lists and normalization configurations.
Presets are pure data — no classes, no closures, no runtime logic.

## Dependencies

- Spec 01 (types): `IgnorePreset`, `NormalizationPreset`, `NormalizeOptions`
- Spec 04 (normalize): `NormalizeOptions` shape is concrete

## Deliverables

| File | Description |
|------|-------------|
| `src/presets/ignore-fields.ts` | Named ignore-field presets |
| `src/presets/normalization.ts` | Named normalization presets |
| `src/presets/index.ts` | Re-exports; preset registry lookup function |
| `tests/presets/ignore-fields.test.ts` | Tests for preset composition and lookup |
| `tests/presets/normalization.test.ts` | Tests for normalization preset lookup |

## Key data and signatures

### ignore-fields.ts

```typescript
export const IGNORE_METADATA: IgnorePreset = {
  name: "metadata",
  description: "Ignore id, meta, and text fields — focus on clinical content",
  paths: ["id", "meta", "text"],
};

export const IGNORE_CLINICAL: IgnorePreset = {
  name: "clinical",
  description: "Ignore metadata and extensions — compare core clinical fields only",
  paths: ["id", "meta", "text", "extension", "modifierExtension"],
};

export const IGNORE_STRICT: IgnorePreset = {
  name: "strict",
  description: "Ignore nothing — compare all fields",
  paths: [],
};
```

### normalization.ts

```typescript
export const NORMALIZE_CANONICAL: NormalizationPreset = {
  name: "canonical",
  description: "Sort keys, trim strings, normalize dates — maximally comparable form",
  options: {
    sortObjectKeys: true,
    trimStrings: true,
    normalizeDates: true,
  },
};

export const NORMALIZE_NONE: NormalizationPreset = {
  name: "none",
  description: "No normalization — compare exact values",
  options: {},
};
```

### index.ts — registry and lookup

```typescript
/**
 * Look up an ignore preset by name. Returns undefined if not found.
 */
export function getIgnorePreset(name: string): IgnorePreset | undefined;

/**
 * Look up a normalization preset by name. Returns undefined if not found.
 */
export function getNormalizationPreset(name: string): NormalizationPreset | undefined;

/**
 * Merge multiple ignore presets into a single deduplicated path list.
 */
export function mergeIgnorePresets(...presets: IgnorePreset[]): string[];
```

## Implementation notes

- Preset definitions are plain `const` objects — no factory functions.
- The registry in `index.ts` can be a simple `Map` or plain object lookup. Do not
  over-engineer it.
- `mergeIgnorePresets` should deduplicate paths using a `Set`.
- Preset names are case-sensitive and lowercase by convention.
- Presets must be browser-safe (no Node imports).

## Acceptance criteria

```bash
pnpm typecheck   # passes
pnpm test        # preset tests pass
```

Tests must cover:
- `getIgnorePreset("metadata")` returns `IGNORE_METADATA`
- `getIgnorePreset("unknown")` returns `undefined`
- `mergeIgnorePresets(IGNORE_METADATA, IGNORE_CLINICAL)` deduplicates and combines paths
- `getNormalizationPreset("canonical")` returns the canonical preset
- All preset objects are frozen or at least structurally correct (correct TypeScript shapes)

## Do not do

- Do not hardcode FHIR-version-specific field names beyond what is listed above.
- Do not add logic that modifies presets at runtime — they are read-only reference data.
- Do not create more than the listed built-in presets for v1.
