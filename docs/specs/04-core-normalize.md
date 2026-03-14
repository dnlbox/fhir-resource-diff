# Spec 04 — Core: normalize

**Status:** complete

## Goal

Implement `src/core/normalize.ts` — a pure function that transforms a `FhirResource` according to
`NormalizeOptions` before it is passed to the diff engine.

## Dependencies

- Spec 01 (types): `FhirResource`, `NormalizeOptions`
- Spec 02 (parse/validate): `FhirResource` is in scope

## Deliverables

| File | Description |
|------|-------------|
| `src/core/normalize.ts` | Normalization transforms |
| `tests/core/normalize.test.ts` | Unit tests |

## Key function signatures

```typescript
/**
 * Returns a normalized deep copy of the resource.
 * Does not mutate the input — always returns a new object.
 */
export function normalize(
  resource: FhirResource,
  options: NormalizeOptions
): FhirResource;
```

## Implementation notes

### Transforms (apply in order when enabled)

1. **`trimStrings`** — recursively walk the resource; for every string value, apply `.trim()`.
2. **`normalizeDates`** — for string values that look like ISO 8601 dates or date-times, normalize
   to a canonical form. For v1, this means: if a string matches `YYYY-MM-DD`, leave it. If it
   matches a datetime, normalize timezone to UTC and use `Z` suffix. Use a regex + `Date` parsing
   — no external date library required for v1.
3. **`sortObjectKeys`** — recursively sort all object keys alphabetically. This ensures
   `{ b: 1, a: 2 }` and `{ a: 2, b: 1 }` compare as identical.
4. **`sortArrayPaths`** — for each dot-notation path listed, sort the array at that path
   (shallow sort using `JSON.stringify` on each element for stable ordering).

### Important: immutability

`normalize` must return a **deep copy**. The input `FhirResource` must not be mutated.
Use structured cloning (`structuredClone`) or a manual deep copy — do not use `JSON.parse(JSON.stringify(...))` as it drops `undefined` values in ways that could affect diff behaviour.

### Browser safety

- No `node:*` imports.
- `structuredClone` is available in Node 17+ and all modern browsers — use it.

### Apply before diff

The caller is responsible for calling `normalize` before calling `diff`. The diff engine itself
does not normalize — this keeps concerns separated. The CLI adapter and any future web app adapter
should both follow: `normalize → diff → format`.

## Acceptance criteria

```bash
pnpm typecheck   # passes
pnpm test        # tests/core/normalize.test.ts passes
```

Tests must cover:

- `trimStrings`: `" John "` → `"John"`, nested objects and arrays recursed
- `normalizeDates`: a date-time with offset → normalized UTC string
- `normalizeDates`: a plain `YYYY-MM-DD` date → unchanged
- `normalizeDates`: a non-date string → unchanged
- `sortObjectKeys`: `{ z: 1, a: 2 }` → `{ a: 2, z: 1 }` (key order preserved in output)
- `sortArrayPaths`: specified array is sorted; non-specified arrays are not sorted
- Immutability: original resource is not mutated
- Calling with empty `NormalizeOptions {}` returns a deep copy with no changes

## Do not do

- Do not mutate the input resource.
- Do not sort ALL arrays by default — only paths explicitly listed in `sortArrayPaths`.
  Sorting FHIR arrays by default would produce incorrect diffs for ordered data like `name` or `telecom`.
- Do not implement FHIR-semantic normalization (e.g., code system equivalence) in v1.
