# CLI reference

Complete flag reference for all `fhir-resource-diff` commands.

## compare

Compare two FHIR resources field by field.

```
fhir-resource-diff compare <file-a> <file-b> [options]
```

| Argument / Flag | Type | Default | Description |
|-----------------|------|---------|-------------|
| `file-a` | path or `-` | required | First resource file, or `-` to read from stdin |
| `file-b` | path or `-` | required | Second resource file, or `-` to read from stdin |
| `--format <fmt>` | `text` \| `json` \| `markdown` | `text` | Output format |
| `--fhir-version <ver>` | `R4` \| `R4B` \| `R5` | auto-detect or `R4` | FHIR version for validation and doc links |
| `--ignore <paths>` | comma-separated | — | Dot-notation paths to exclude from comparison (e.g. `meta.lastUpdated,id`) |
| `--preset <name>` | `metadata` \| `clinical` \| `strict` | — | Named set of paths to ignore |
| `--normalize <name>` | `canonical` \| `none` | — | Apply normalization before comparing |
| `--exit-on-diff` | flag | false | Exit 1 when differences are found (for CI gates) |
| `--quiet` | flag | false | Suppress all stdout output |
| `--envelope` | flag | false | Wrap JSON output in metadata envelope (requires `--format json`) |

**Presets:**

| Preset | Ignored paths |
|--------|--------------|
| `metadata` | `id`, `meta.lastUpdated`, `meta.versionId`, `meta.tag`, `text` |
| `clinical` | Same as `metadata` plus narrative text fields |
| `strict` | No ignores — every field compared |

## validate

Validate a FHIR resource for format and structural correctness.

```
fhir-resource-diff validate <file> [options]
```

| Argument / Flag | Type | Default | Description |
|-----------------|------|---------|-------------|
| `file` | path or `-` | required | Resource file, or `-` to read from stdin |
| `--format <fmt>` | `text` \| `json` | `text` | Output format |
| `--fhir-version <ver>` | `R4` \| `R4B` \| `R5` | auto-detect or `R4` | FHIR version for registry checks and doc links |
| `--quiet` | flag | false | Suppress all stdout output |
| `--envelope` | flag | false | Wrap JSON output in metadata envelope (requires `--format json`) |

## normalize

Normalize a FHIR resource to a canonical form.

```
fhir-resource-diff normalize <file> [options]
```

| Argument / Flag | Type | Default | Description |
|-----------------|------|---------|-------------|
| `file` | path or `-` | required | Resource file, or `-` to read from stdin |
| `--preset <name>` | `canonical` \| `none` | `canonical` | Normalization preset |
| `--fhir-version <ver>` | `R4` \| `R4B` \| `R5` | auto-detect or `R4` | FHIR version |
| `--output <path>` | file path | stdout | Write normalized output to a file instead of stdout |
| `--quiet` | flag | false | Suppress stdout output |

## info

Look up a FHIR resource type and get HL7 documentation links.

```
fhir-resource-diff info <resourceType> [options]
```

| Argument / Flag | Type | Default | Description |
|-----------------|------|---------|-------------|
| `resourceType` | string | required | FHIR resource type name (e.g. `Patient`, `Observation`) |
| `--fhir-version <ver>` | `R4` \| `R4B` \| `R5` | all | Show docs link for a specific version only |
| `--format <fmt>` | `text` \| `json` | `text` | Output format |

## list-resources

List known FHIR resource types from the registry.

```
fhir-resource-diff list-resources [options]
```

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--fhir-version <ver>` | `R4` \| `R4B` \| `R5` | all | Filter to types available in a specific version |
| `--category <cat>` | see below | all | Filter by resource category |
| `--format <fmt>` | `text` \| `json` | `text` | Output format |

**Categories:** `foundation`, `base`, `clinical`, `financial`, `specialized`, `conformance`

## Common patterns

```bash
# Validate with explicit version
fhir-resource-diff validate resource.json --fhir-version R4

# Compare with metadata preset and CI exit code
fhir-resource-diff compare expected.json actual.json \
  --preset metadata --exit-on-diff --quiet

# Compare with JSON output and envelope
fhir-resource-diff compare a.json b.json \
  --format json --envelope --fhir-version R4

# Pipe from stdin
curl -s https://hapi.fhir.org/baseR4/Patient/1 \
  | fhir-resource-diff validate - --fhir-version R4

# Ignore specific fields
fhir-resource-diff compare a.json b.json \
  --ignore meta.lastUpdated,meta.versionId,id,text
```

## FHIR version strings

The `--fhir-version` flag accepts these values (case-insensitive):

| Accepted | Resolves to |
|----------|-------------|
| `R4`, `r4`, `4.0.1` | R4 |
| `R4B`, `r4b`, `4.3.0` | R4B |
| `R5`, `r5`, `5.0.0` | R5 |
