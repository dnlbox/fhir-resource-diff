# Spec 31 — normalize command improvements

**Status:** open

## Goal

Make the `normalize` command useful on its own, not just as a silent
preprocessor. Address three problems: no feedback about what changed,
preset names that don't explain themselves, and no visible connection
to why you'd reach for normalize before a compare.

## Background — what normalize is actually for

`normalize` exists to eliminate formatting differences that would create
false diffs. Two FHIR resources can be semantically identical but produce
noisy compare output because:

- Object keys are in different order (JSON has no guaranteed key order;
  different serializers produce different orderings)
- Dates are in different timezone representations (`2024-01-15T10:05:00Z`
  vs `2024-01-15T10:05:00.000Z` vs `2024-01-15T10:05:00+00:00`)
- Strings have trailing whitespace from copy/paste or different editors
- Arrays are in different order (for arrays where order doesn't matter)

None of these are real clinical differences, but `compare` treats them all
as changes. Normalize is the answer — run it on both resources first, then
compare. The current command does this correctly but silently, leaving
users wondering what it did and why.

## Dependencies

- Spec 01 (types)
- Spec 07 (CLI: normalize command)

## Deliverables

| File | Change |
|------|--------|
| `src/cli/commands/normalize.ts` | Add `--summary` flag; improve help text |
| `src/core/normalize.ts` | Return normalization stats alongside result |
| `src/core/types.ts` | Add `NormalizeResult` type with stats |
| `src/presets/normalization.ts` | Improve preset descriptions |
| `tests/core/normalize.test.ts` | Tests for stats |
| `tests/cli/normalize.test.ts` | Tests for `--summary` output |
| `CHANGELOG.md` | Add entry under [Unreleased] |

## Key interfaces / signatures

### NormalizeResult

Currently `normalize()` returns `FhirResource`. Extend to carry stats:

```typescript
export interface NormalizeStats {
  /** Number of object keys sorted across the entire resource tree. */
  keysSorted: number;
  /** Number of string values trimmed. */
  stringsTrimmed: number;
  /** Number of date/datetime strings normalized to ISO 8601. */
  datesNormalized: number;
  /** Number of arrays sorted (from sortArrayPaths). */
  arraysSorted: number;
}

export interface NormalizeResult {
  resource: FhirResource;
  stats: NormalizeStats;
}
```

`normalize()` returns `NormalizeResult`. The CLI uses `result.resource` for
output and `result.stats` for the summary line. Callers that only need the
resource use `normalize(...).resource`.

### --summary flag

New optional flag on the `normalize` command:

```
--summary    Print a one-line summary of what was changed to stderr
```

Output goes to **stderr** so it doesn't contaminate stdout piping.

Example:
```
$ fhir-resource-diff normalize observation.json --summary
{...normalized json...}
↳ normalized: 5 keys sorted, 2 dates normalized
```

If nothing changed, the summary line reads:
```
↳ normalized: no changes (resource was already in canonical form)
```

**Why stderr?** The primary use case is piping: `normalize a.json | compare - b.json`.
Putting the summary on stdout would break the pipe. Stderr is visible in the
terminal but invisible to downstream processes.

### Preset description improvements

Update the preset descriptions in `src/presets/normalization.ts` to explain
what each preset does in plain terms, not just name it:

| Preset | Current description | New description |
|--------|-------------------|-----------------|
| `canonical` | "Sort keys, trim strings, normalize dates" | "Canonical form: alphabetically sort all object keys, trim string whitespace, normalize dates and datetimes to UTC ISO 8601. Use before comparing resources from different systems." |
| `none` | "No normalization" | "Re-serialize only: parse the resource and output clean JSON without any transformations. Useful for pretty-printing or validating that a file is valid FHIR JSON." |

### Help text improvement

Update the command `.description()` in `normalize.ts`:

```
Before (current):
  "Normalize a FHIR JSON resource file and output the result"

After:
  "Normalize a FHIR resource to canonical form — sorts object keys,
   trims whitespace, and standardizes date formats. Use before comparing
   resources from different sources to eliminate formatting noise."
```

## Implementation notes

### Counting stats

The normalize functions already traverse the entire resource tree. Add
counters as they run:

- `keysSorted`: in `sortObjectKeysDeep`, increment for each key in each
  object that moved position (i.e. the sorted order differs from original)
- `stringsTrimmed`: in `trimStringsDeep`, increment when `value !== value.trim()`
- `datesNormalized`: in `normalizeDatesDeep`, increment when a date string
  was changed by the transformation
- `arraysSorted`: in `sortArrayAtPaths`, increment for each path where the
  sorted array differs from the original

### Backwards compatibility

`normalize()` return type change (`FhirResource` → `NormalizeResult`) is a
breaking change for library consumers. Mitigate with a wrapper:

```typescript
/** @deprecated Use normalize() which now returns NormalizeResult */
export function normalizeResource(
  resource: FhirResource,
  options: NormalizeOptions,
): FhirResource {
  return normalize(resource, options).resource;
}
```

Or: keep `normalize()` returning `FhirResource` and add a new
`normalizeWithStats()` function. Choose based on whether we want to bump
the minor version.

> Given we're pre-1.0 and this is a meaningful improvement, changing
> `normalize()` and bumping to `0.3.0` is the cleaner path.

## Acceptance criteria

### Summary flag
```bash
# Shows summary on stderr, JSON on stdout
fhir-resource-diff normalize examples/observation-a.json --summary
# stderr: ↳ normalized: 5 keys sorted, 2 dates normalized
# stdout: {...sorted JSON...}

# Pipe still works cleanly — summary goes to stderr, not stdout
fhir-resource-diff normalize examples/observation-a.json --summary \
  | fhir-resource-diff compare - examples/observation-b.json

# Already canonical resource
fhir-resource-diff normalize already-normalized.json --summary
# stderr: ↳ normalized: no changes (resource was already in canonical form)
```

### Stats accuracy
- `keysSorted` counts individual keys that moved, not objects
- `datesNormalized` only counts strings that actually changed value
- `stringsTrimmed` only counts strings where trimming made a difference

### Preset descriptions
```bash
fhir-resource-diff normalize --help
# Shows updated descriptions for canonical and none presets
```

### No regression
- All existing normalize tests pass
- `--summary` is opt-in — no change to output without the flag
- Pipe usage without `--summary` unchanged

## Do not do

- Do not add `--summary` output to stdout — breaks pipe usage
- Do not change the default preset — `canonical` stays the default
- Do not rename presets — `canonical` and `none` are already in the wild;
  only improve their descriptions
- Do not add a `--verbose` flag that shows field-by-field changes —
  that is what `compare` is for
