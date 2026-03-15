# AI agents & automation

`fhir-resource-diff` is designed for automated tooling. Every command supports stdin pipes, `--format json` for structured output, and `--envelope` for metadata wrapping — so agents and test harnesses can work with FHIR payloads without writing temp files.

## Validate a payload from memory

An agent can validate a FHIR payload it holds in a variable without writing it to disk:

```bash
echo "$FHIR_PAYLOAD" | fhir-resource-diff validate - --format json --fhir-version R4
```

```json
{
  "valid": true,
  "errors": [],
  "hint": null
}
```

Use `-` as the file argument to read from stdin.

## Diff actual vs expected with envelope

```bash
echo "$ACTUAL_PAYLOAD" | fhir-resource-diff compare - expected.json \
  --format json --envelope --preset metadata
```

```json
{
  "tool": "fhir-resource-diff",
  "version": "0.2.0",
  "command": "compare",
  "fhirVersion": "R4",
  "timestamp": "2026-03-10T21:00:00.000Z",
  "result": {
    "resourceType": "Patient",
    "identical": false,
    "summary": { "added": 5, "removed": 0, "changed": 3, "typeChanged": 0, "total": 8 },
    "entries": [...],
    "documentation": "https://hl7.org/fhir/R4/patient.html"
  }
}
```

An agent can parse this once and know: what changed, how many changes, what FHIR version, and where to find the HL7 docs — without a second tool call.

## TypeScript library — import directly

When you control the runtime, skip the CLI and import the library:

```typescript
import { parseJson, validate, diff } from "fhir-resource-diff";

const parsed = parseJson(responseBody);
if (!parsed.success) {
  throw new Error(`Invalid FHIR JSON: ${parsed.error}`);
}

const validation = validate(parsed.resource, "R4");
if (validation.valid === false) {
  const errors = validation.errors.filter(e => e.severity === "error");
  // errors[].path points to the problem field
  // errors[].ruleId is stable for suppression or automation
}

const result = diff(parsed.resource, expectedFixture, {
  ignorePaths: ["meta.lastUpdated", "id"],
});
if (!result.identical) {
  // result.entries has the full structured diff
  // result.summary has counts: added, removed, changed, total
  // result.documentation is the HL7 spec URL for this resource type
}
```

The library is browser-safe — it has no Node.js dependencies and works in React, Vite, Cloudflare Workers, and any bundler.

## Pipe from a FHIR server

```bash
# Validate a live resource
curl -s https://hapi.fhir.org/baseR4/Patient/592473 \
  | fhir-resource-diff validate - --fhir-version R4

# Compare a live resource against a stored baseline
curl -s https://hapi.fhir.org/baseR4/Patient/592473 \
  | fhir-resource-diff compare - baseline/patient-592473.json \
    --format json --envelope
```

## Envelope format

The `--envelope` flag (requires `--format json`) wraps output in a metadata envelope:

```json
{
  "tool": "fhir-resource-diff",
  "version": "0.2.0",
  "command": "validate",
  "fhirVersion": "R4",
  "timestamp": "2026-03-14T15:56:25.686Z",
  "result": { ... }
}
```

Fields in the envelope:

| Field | Type | Description |
|-------|------|-------------|
| `tool` | string | Always `"fhir-resource-diff"` |
| `version` | string | Tool version at time of run |
| `command` | string | `"validate"` or `"compare"` |
| `fhirVersion` | string | FHIR version used (`"R4"`, `"R4B"`, `"R5"`) |
| `timestamp` | string | ISO 8601 timestamp of the run |
| `result` | object | The command result (same structure as non-envelope JSON output) |

## Programmatic patterns

### Parse and validate in one pass

```typescript
import { parseJson, validate } from "fhir-resource-diff";

function checkResource(rawJson: string) {
  const parsed = parseJson(rawJson);
  if (!parsed.success) return { ok: false, reason: parsed.error };

  const result = validate(parsed.resource, "R4");
  const errors = result.errors.filter(e => e.severity === "error");
  return { ok: errors.length === 0, errors };
}
```

### Diff with summary only

```typescript
import { parseJson, diff, summarizeDiff } from "fhir-resource-diff";

const left = parseJson(rawA);
const right = parseJson(rawB);

if (left.success && right.success) {
  const result = diff(left.resource, right.resource, {
    ignorePaths: ["meta.lastUpdated", "id"],
  });
  const summary = summarizeDiff(result.entries);
  console.log(`${summary.total} differences (${summary.added} added, ${summary.removed} removed, ${summary.changed} changed)`);
}
```

## See also

- [Library API](/reference/library-api) — full TypeScript API documentation
- [Output formats](/reference/output-formats) — JSON and envelope format details
- [CI/CD integration](/guide/ci-cd) — GitHub Actions patterns
