# Spec 03 — Core: diff and classify

## Goal

Implement the recursive diff engine (`src/core/diff.ts`) and change classifier
(`src/core/classify.ts`). This is the most important module in the project — get correctness right
before performance.

## Dependencies

- Spec 01 (types): `FhirResource`, `DiffEntry`, `DiffResult`, `DiffOptions`, `DiffChangeKind`
- Spec 02 (parse/validate): types are in scope; functions are referenced but not called here

## Deliverables

| File | Description |
|------|-------------|
| `src/core/diff.ts` | Recursive diff engine |
| `src/core/classify.ts` | Change kind classification helper |
| `tests/core/diff.test.ts` | Unit tests for the diff engine |
| `tests/core/classify.test.ts` | Unit tests for classify |

## Key function signatures

### classify.ts

```typescript
/**
 * Determines the kind of change between two values at a given path.
 * This is a pure function — it does not recurse; the diff engine calls it per leaf node.
 */
export function classifyChange(
  left: unknown,
  right: unknown
): DiffChangeKind;
```

### diff.ts

```typescript
/**
 * Compares two FHIR resources and returns a structured DiffResult.
 * Pure function — no I/O, no side effects.
 */
export function diff(
  left: FhirResource,
  right: FhirResource,
  options?: DiffOptions
): DiffResult;
```

## Implementation notes

### classify.ts

`classifyChange(left, right)` rules:
- `left === undefined` → `"added"`
- `right === undefined` → `"removed"`
- `typeof left !== typeof right` → `"type-changed"`
- `left !== right` (for primitives) or values differ (for objects/arrays after serialization check) → `"changed"`
- Equal → should not be called for equal values, but return `"changed"` as a safe fallback

Keep this simple — it is a leaf-level classifier, not a recursive diff.

### diff.ts

Algorithm:

1. Apply `options.ignorePaths` filtering — collect the set of paths to skip.
2. Recursively walk both resources simultaneously.
3. At each node:
   - If both sides are plain objects: recurse into the union of their keys.
   - If both sides are arrays: compare element by element by index. Report added/removed at array
     index paths (`name[0]`, `name[1]`, etc.).
   - If both sides are primitives: compare with strict equality. If different, emit a `DiffEntry`.
   - If types differ: emit a `type-changed` `DiffEntry` without recursing further.
4. Collect all `DiffEntry` results. Set `identical: entries.length === 0`.

**Path format:**
- Object key: `parentPath + "." + key` (omit leading dot for root-level keys)
- Array element: `parentPath + "[" + index + "]"`
- Examples: `"name[0].given[1]"`, `"meta.lastUpdated"`, `"telecom[0].value"`

**Ignore path matching:**
- Exact match: `"meta.lastUpdated"` ignores exactly that path.
- Wildcard suffix: `"meta.*"` ignores all direct children of `meta`.
- Implementation: check if the current path starts with any ignore path prefix, or equals any
  exact ignore path. Keep this simple for v1 — no full glob support needed.

**Determinism:**
- Object key iteration order must be consistent. Sort object keys alphabetically before iterating.
- This ensures `diff(a, b)` always produces the same `entries` array order.

**Handling `undefined` vs absent keys:**
- An absent key on the left and a key set to `undefined` on the right should both be treated as
  "absent". Use `Object.keys()` to enumerate — do not rely on `in` operator for value presence.
- If a key has the value `null`, it IS present. `null !== undefined`.

## Acceptance criteria

```bash
pnpm typecheck   # passes
pnpm test        # tests/core/diff.test.ts and tests/core/classify.test.ts pass
```

Tests must cover:

**classify:**
- `(undefined, "x")` → `"added"`
- `("x", undefined)` → `"removed"`
- `("a", "b")` → `"changed"`
- `(1, "1")` → `"type-changed"`
- `(true, false)` → `"changed"`

**diff:**
- Identical resources → `{ identical: true, entries: [] }`
- Single changed field → one `changed` entry with correct path
- Added top-level field → one `added` entry
- Removed top-level field → one `removed` entry
- Changed nested field → correct dot-notation path
- Changed array element → correct bracket path (`name[0].given[0]`)
- Added array element → entry at `name[1]` (or wherever the extra element is)
- `ignorePaths: ["meta.lastUpdated"]` → that field not present in entries
- `ignorePaths: ["meta.*"]` → all direct meta children absent from entries
- Different resourceTypes → `type-changed` or `changed` entry on `resourceType`
- One resource has `meta`, the other doesn't → correct added/removed entries
- Resource with no differences except ignored paths → `{ identical: true }`

## Do not do

- Do not implement normalization in this spec — that is Spec 04. The diff engine should accept
  pre-normalized resources; normalization is applied before calling `diff()`.
- Do not emit entries for paths that are in `ignorePaths`.
- Do not implement formatting — the diff engine returns `DiffResult`, not strings.
- Do not implement semantic FHIR-aware comparison (e.g., treating equivalent date formats as equal)
  in v1 — that is a later extension point.
