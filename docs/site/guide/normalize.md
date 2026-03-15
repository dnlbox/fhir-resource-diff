# Normalize

The `normalize` command transforms a FHIR resource into a canonical form — trimming whitespace, sorting object keys, and normalizing date representations — so that two semantically equivalent resources produce identical JSON output. This is most useful before comparing resources that were serialized by different systems.

## Basic usage

```bash
fhir-resource-diff normalize patient.json
```

The normalized JSON is written to stdout by default.

## What normalization does

The `canonical` preset (the default) applies:

- **Trim strings** — leading and trailing whitespace removed from all string values
- **Sort object keys** — keys within each JSON object sorted alphabetically, making key order stable across serializers
- **Normalize dates** — date/time strings brought into a consistent representation where possible

These transformations are non-destructive: the information content of the resource is preserved. The goal is eliminating serialization noise before a diff, not altering clinical data.

## Named presets

```bash
# canonical (default) — full normalization
fhir-resource-diff normalize patient.json --preset canonical

# none — no transformations (round-trip through parser only)
fhir-resource-diff normalize patient.json --preset none
```

## Writing to a file

```bash
fhir-resource-diff normalize patient.json --output normalized-patient.json
```

Without `--output`, the result is written to stdout.

## FHIR version

```bash
fhir-resource-diff normalize patient.json --fhir-version R5
```

The FHIR version is used for version-aware normalization where applicable. Without `--fhir-version`, the tool auto-detects from `meta.fhirVersion` or defaults to R4.

## Using normalization before a diff

The typical workflow when comparing resources from different systems:

```bash
fhir-resource-diff normalize system-a-output.json --output a-normalized.json
fhir-resource-diff normalize system-b-output.json --output b-normalized.json
fhir-resource-diff compare a-normalized.json b-normalized.json
```

Or directly in the compare step using `--normalize`:

```bash
fhir-resource-diff compare a.json b.json --normalize canonical
```

## Stdin

```bash
cat patient.json | fhir-resource-diff normalize - --output normalized.json

# Or pipe the output
fhir-resource-diff normalize patient.json | jq '.name'
```

## See also

- [Compare command](/guide/compare) — using --normalize in compare
- [CLI reference](/reference/cli) — all flags for `normalize`
