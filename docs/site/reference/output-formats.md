# Output formats

Every command supports multiple output formats. The format is selected with `--format <fmt>`.

## Text (default)

Readable output for terminals. The default when `--format` is not specified.

```bash
fhir-resource-diff compare a.json b.json
```

```
ResourceType: Patient
Status: 3 difference(s) found

Changed:
  birthDate: "1974-12-25" → "1944-11-17"
  name[0].family: "Chalmers" → "van de Heuvel"

Added:
  maritalStatus.coding[0].code

Removed:
  address[0].district
```

For validation:

```bash
fhir-resource-diff validate patient.json
```

```
valid
  ℹ For full FHIR schema validation, use the official HL7 FHIR Validator
    → https://confluence.hl7.org/display/FHIR/Using+the+FHIR+Validator
```

## JSON

Stable, parseable output for automation and pipelines. Use `--format json`.

### Diff JSON

```bash
fhir-resource-diff compare a.json b.json --format json
```

```json
{
  "resourceType": "Patient",
  "identical": false,
  "summary": {
    "added": 1,
    "removed": 1,
    "changed": 2,
    "typeChanged": 0,
    "total": 4
  },
  "entries": [
    {
      "path": "birthDate",
      "kind": "changed",
      "left": "1974-12-25",
      "right": "1944-11-17"
    },
    {
      "path": "name[0].family",
      "kind": "changed",
      "left": "Chalmers",
      "right": "van de Heuvel"
    },
    {
      "path": "maritalStatus.coding[0].code",
      "kind": "added",
      "right": "M"
    },
    {
      "path": "address[0].district",
      "kind": "removed",
      "left": "Erewhon"
    }
  ],
  "documentation": "https://hl7.org/fhir/R4/patient.html"
}
```

**DiffEntry fields:**

| Field | Present when | Description |
|-------|-------------|-------------|
| `path` | always | Dot-notation path with array indices |
| `kind` | always | `"added"`, `"removed"`, `"changed"`, or `"type-changed"` |
| `left` | `removed`, `changed`, `type-changed` | Value in the left (first) resource |
| `right` | `added`, `changed`, `type-changed` | Value in the right (second) resource |

### Validation JSON

```bash
fhir-resource-diff validate patient.json --format json
```

```json
{
  "valid": true,
  "errors": [],
  "hint": {
    "message": "For full FHIR schema validation, use the official HL7 FHIR Validator",
    "url": "https://confluence.hl7.org/display/FHIR/Using+the+FHIR+Validator"
  }
}
```

When there are findings:

```json
{
  "valid": false,
  "errors": [
    {
      "severity": "error",
      "path": "resourceType",
      "message": "resourceType is required",
      "ruleId": "required-resource-type"
    },
    {
      "severity": "warning",
      "path": "id",
      "message": "id must match [A-Za-z0-9\\-.]{1,64}",
      "ruleId": "id-format"
    }
  ],
  "hint": null
}
```

**ValidationError fields:**

| Field | Description |
|-------|-------------|
| `severity` | `"error"`, `"warning"`, or `"info"` |
| `path` | Dot-notation path to the problem field |
| `message` | Human-readable description |
| `ruleId` | Stable identifier for the rule |
| `docUrl` | HL7 spec URL (when relevant to the finding) |

## Markdown

Formatted for pasting into PR descriptions or GitHub comments. Use `--format markdown`.

```bash
fhir-resource-diff compare a.json b.json --format markdown
```

Produces a markdown document with headings, code blocks, and a table of changes — suitable for GitHub PR comments or documentation.

## Envelope

The `--envelope` flag wraps JSON output in a metadata envelope. Requires `--format json`.

```bash
fhir-resource-diff compare a.json b.json --format json --envelope
```

```json
{
  "tool": "fhir-resource-diff",
  "version": "0.2.0",
  "command": "compare",
  "fhirVersion": "R4",
  "timestamp": "2026-03-14T15:56:25.686Z",
  "result": {
    "resourceType": "Patient",
    "identical": false,
    "summary": { "added": 1, "removed": 1, "changed": 2, "typeChanged": 0, "total": 4 },
    "entries": [...],
    "documentation": "https://hl7.org/fhir/R4/patient.html"
  }
}
```

**Envelope fields:**

| Field | Description |
|-------|-------------|
| `tool` | Always `"fhir-resource-diff"` |
| `version` | Tool version at time of run (e.g. `"0.2.0"`) |
| `command` | `"compare"` or `"validate"` |
| `fhirVersion` | FHIR version used (`"R4"`, `"R4B"`, `"R5"`) |
| `timestamp` | ISO 8601 timestamp of the run |
| `result` | The command result — same structure as non-envelope JSON output |

The envelope is designed for automated consumers: an agent can parse this once and know what changed, how many changes, what FHIR version was used, and where to find the HL7 documentation — without a second tool call.

## Format availability by command

| Command | text | json | markdown | envelope |
|---------|------|------|----------|---------|
| `compare` | ✓ | ✓ | ✓ | ✓ (with --format json) |
| `validate` | ✓ | ✓ | — | ✓ (with --format json) |
| `normalize` | stdout only | — | — | — |
| `info` | ✓ | ✓ | — | — |
| `list-resources` | ✓ | ✓ | — | — |

## See also

- [Library API](/reference/library-api) — programmatic access to formatters
- [Exit codes](/reference/exit-codes) — how severity affects exit codes
- [AI agents & automation](/guide/ai-agents) — envelope patterns for automation
