# FHIR versions (R4 / R4B / R5)

`fhir-resource-diff` supports FHIR R4, R4B, and R5 — auto-detected or explicit.

## Supported versions

| Version | Status | Spec URL |
|---------|--------|----------|
| R4 (4.0.1) | Default, fully supported | https://hl7.org/fhir/R4/ |
| R4B (4.3.0) | Supported | https://hl7.org/fhir/R4B/ |
| R5 (5.0.0) | Supported | https://hl7.org/fhir/R5/ |

## Auto-detection

When `--fhir-version` is not specified, the tool tries to detect the version from `meta.fhirVersion`:

```json
{
  "resourceType": "Patient",
  "meta": {
    "fhirVersion": "4.3.0"
  }
}
```

If `meta.fhirVersion` is not present, **R4 is the default**. Always specify `--fhir-version` explicitly in CI and automation to avoid relying on auto-detection.

## Explicit version flag

```bash
# R4 (default)
fhir-resource-diff validate patient.json --fhir-version R4

# R4B
fhir-resource-diff validate patient.json --fhir-version R4B

# R5
fhir-resource-diff validate patient.json --fhir-version R5
```

The `--fhir-version` flag is accepted by all commands: `validate`, `compare`, `normalize`, `info`, `list-resources`.

## What the version flag affects

**Validation:** The `resourceType` is checked against the resource registry for the specified version. Some resource types are R5-only or have different names across versions.

**Documentation links:** The `info` command and `--envelope` output link to the correct version of the HL7 specification. Without `--fhir-version`, links for all versions are shown.

**Normalization:** Version-aware normalization where applicable.

**Resource registry:** `list-resources --fhir-version R5` returns only types present in R5.

## R4 vs R4B vs R5 differences

R4 (4.0.1) is the most widely deployed version and the baseline for most EHR integrations.

R4B (4.3.0) is a backport of targeted improvements from R5 — primarily affecting a small set of resource types (Evidence, EvidenceVariable, Citation, etc.). If you're not working with those types, R4B is functionally equivalent to R4 for most purposes.

R5 (5.0.0) is the current published specification with structural changes across several resource types. Notable changes:
- `MedicationRequest` structure updated
- `DeviceRequest`/`DeviceUseStatement` merged into `DeviceRequest`/`DeviceUsage`
- Subscription model redesigned
- Several new resource types added

## Checking which types are version-specific

```bash
# List all R5 resource types
fhir-resource-diff list-resources --fhir-version R5

# Compare against R4
fhir-resource-diff list-resources --fhir-version R4
```

## Version string map

The tool accepts these version strings (case-insensitive):

| Input | Resolved as |
|-------|-------------|
| `R4`, `r4`, `4.0.1` | R4 |
| `R4B`, `r4b`, `4.3.0` | R4B |
| `R5`, `r5`, `5.0.0` | R5 |

## See also

- [Info & list-resources](/guide/info) — exploring the resource registry by version
- [CLI reference](/reference/cli) — `--fhir-version` flag across all commands
