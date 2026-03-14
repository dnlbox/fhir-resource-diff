# Spec 15 — `list-resources` command

**Status:** complete

## Goal

Add `fhir-resource-diff list-resources` — a discovery command that lists known FHIR resource
types, filterable by version and category. Engineers exploring FHIR or verifying what the tool
supports can get a quick overview without leaving the terminal.

## Dependencies

- Spec 12 (FHIR version model): `FhirVersion`, `isSupportedFhirVersion`
- Spec 13 (resource type registry): `listResourceTypes`, `ResourceCategory`, `ResourceTypeInfo`

## Deliverables

| File | Description |
|------|-------------|
| `src/cli/commands/list-resources.ts` | `list-resources` command implementation |
| `src/cli/index.ts` | Register the `list-resources` command |
| `tests/cli/list-resources.test.ts` | Tests for `list-resources` command output |

## Command surface

```
fhir-resource-diff list-resources [options]

Options:
  --fhir-version <ver>  Filter to resource types available in a specific version (R4 | R4B | R5)
  --category <cat>      Filter by category (foundation | base | clinical | financial | specialized | conformance)
  --format <fmt>        Output format: text | json  (default: text)
```

## Expected output

### Text format (default)

```
FHIR Resource Types (32 total)

foundation
  Bundle                  Container for a collection of resources
  OperationOutcome        Collection of processing messages (errors, warnings, information)
  Parameters              Operation request/response parameters

base
  Patient                 Demographics and administrative information about an individual
  Practitioner            A person with a formal responsibility in healthcare
  Organization            A formally recognized grouping of people or organizations
  ...

clinical
  Observation             Measurements and assertions about a patient or subject
  Condition               Detailed information about a clinical condition or diagnosis
  ...

Full resource list: https://hl7.org/fhir/resourcelist.html
```

With `--fhir-version R5`:

```
FHIR Resource Types — R5 (31 total)

foundation
  ...
```

With `--category clinical`:

```
FHIR Resource Types — clinical (15 total)

  Observation             Measurements and assertions about a patient or subject
  Condition               Detailed information about a clinical condition or diagnosis
  ...

Full resource list: https://hl7.org/fhir/resourcelist.html
```

### JSON format

```json
{
  "total": 32,
  "filters": {},
  "resources": [
    {
      "resourceType": "Bundle",
      "category": "foundation",
      "versions": ["R4", "R4B", "R5"],
      "description": "Container for a collection of resources"
    }
  ]
}
```

With filters applied:

```json
{
  "total": 15,
  "filters": { "category": "clinical" },
  "resources": [...]
}
```

## Implementation notes

- The command calls `listResourceTypes()` with the appropriate filters.
- Text output groups results by category (unless `--category` is specified, in which case
  all results are already in one category — skip the category headers).
- Align the resource type names and descriptions in columns. Use a fixed column width
  (e.g. 24 characters for the resource type) so the output is scannable.
- Always print the "Full resource list" footer linking to HL7, so users know the registry
  is a curated subset.
- Validate `--fhir-version` with `isSupportedFhirVersion`. Print available values on error.
- Validate `--category` against the known `ResourceCategory` values. Print available values
  on error.
- If no results match the filters, print: `No resource types match the given filters.`

## Acceptance criteria

```bash
pnpm typecheck   # passes
pnpm test        # list-resources tests pass
pnpm lint        # passes
```

Manual smoke tests:

```bash
pnpm cli -- list-resources
# → full list grouped by category

pnpm cli -- list-resources --fhir-version R5
# → filtered to R5 types

pnpm cli -- list-resources --category clinical
# → filtered to clinical types

pnpm cli -- list-resources --category clinical --fhir-version R4
# → both filters applied

pnpm cli -- list-resources --format json
# → valid JSON array

pnpm cli -- list-resources --fhir-version INVALID
# → error with available versions
```

Tests must cover:

- Default output (no filters) includes multiple categories
- `--fhir-version` filter reduces results
- `--category` filter reduces results
- Both filters combined
- JSON format produces valid JSON with correct structure
- Invalid `--fhir-version` → error
- Invalid `--category` → error
- Output includes footer link to HL7 resource list (text format)
- Total count in header matches actual results

## Do not do

- Do not paginate output — print everything.
- Do not add interactive selection or fuzzy search.
- Do not add a `--search` flag for text matching — keep it simple for v1.
- Do not add color in this spec.
