# Spec 14 — `info` command

**Status:** complete

## Goal

Add `fhir-resource-diff info <resourceType>` — a quick lookup command that shows a resource
type's metadata and links to the HL7 documentation. This makes the CLI a lightweight reference
tool, not just a diff tool.

## Dependencies

- Spec 12 (FHIR version model): `FhirVersion`, `fhirBaseUrl`, `isSupportedFhirVersion`
- Spec 13 (resource type registry): `getResourceInfo`, `getResourceDocUrl`

## Deliverables

| File | Description |
|------|-------------|
| `src/cli/commands/info.ts` | `info` command implementation |
| `src/cli/index.ts` | Register the `info` command |
| `tests/cli/info.test.ts` | Tests for `info` command output |

## Command surface

```
fhir-resource-diff info <resourceType> [options]

Arguments:
  resourceType        FHIR resource type name (e.g. Patient, Observation)

Options:
  --fhir-version <ver>  Show docs link for a specific version only (R4 | R4B | R5)
  --format <fmt>        Output format: text | json  (default: text)
```

## Expected output

### Text format (default)

For a known resource type:

```
Patient (base)
FHIR versions: R4, R4B, R5
Demographics and administrative information about an individual

Documentation:
  R4:  https://hl7.org/fhir/R4/patient.html
  R4B: https://hl7.org/fhir/R4B/patient.html
  R5:  https://hl7.org/fhir/R5/patient.html
```

With `--fhir-version R5`:

```
Patient (base)
FHIR version: R5
Demographics and administrative information about an individual

Documentation:
  R5:  https://hl7.org/fhir/R5/patient.html
```

For an unknown resource type:

```
Unknown resource type: "FooBar"

Run 'fhir-resource-diff list-resources' to see known types.
Full resource list: https://hl7.org/fhir/resourcelist.html
```

Exit code 0 for known types, exit code 2 for unknown types.

### JSON format

For a known resource type:

```json
{
  "resourceType": "Patient",
  "category": "base",
  "versions": ["R4", "R4B", "R5"],
  "description": "Demographics and administrative information about an individual",
  "documentation": {
    "R4": "https://hl7.org/fhir/R4/patient.html",
    "R4B": "https://hl7.org/fhir/R4B/patient.html",
    "R5": "https://hl7.org/fhir/R5/patient.html"
  }
}
```

For an unknown resource type:

```json
{
  "error": "Unknown resource type",
  "resourceType": "FooBar",
  "help": "https://hl7.org/fhir/resourcelist.html"
}
```

## Implementation notes

- The command is a thin adapter: read the argument, call `getResourceInfo`, call
  `getResourceDocUrl` for each version, format output, write to stdout.
- No business logic in the command file — delegate to core functions.
- If `--fhir-version` is provided, filter the documentation URLs and version badges to
  that single version only. Validate the flag value with `isSupportedFhirVersion`.
- Documentation URLs are generated from the registry — no network calls.
- The text output should align the version labels in the documentation section
  (pad shorter labels like "R4:" to match "R4B:" width).

## Acceptance criteria

```bash
pnpm typecheck   # passes
pnpm test        # info command tests pass
pnpm lint        # passes
```

Manual smoke tests:

```bash
pnpm cli -- info Patient
# → shows Patient info with all version doc links

pnpm cli -- info Patient --fhir-version R5
# → shows Patient info with R5 doc link only

pnpm cli -- info Patient --format json
# → valid JSON output

pnpm cli -- info NotARealType
# → "Unknown resource type" message, exit 2

pnpm cli -- info Observation
# → shows Observation info
```

Tests must cover:

- Known resource type → correct text output
- Known resource type → correct JSON output
- Unknown resource type → error message
- `--fhir-version` flag filters doc links
- Invalid `--fhir-version` value → error

## Do not do

- Do not fetch anything from the network.
- Do not display field-level details of the resource — just type-level metadata.
- Do not add color to the text output in this spec — the CLI adapter can add color later.
- Do not add an `--open` flag to open the browser — keep it simple.
