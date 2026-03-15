# Compare

The `compare` command diffs two FHIR resources field by field, tracking every added, removed, and changed value with dot-notation paths and array index tracking.

## Basic comparison

```bash
fhir-resource-diff compare \
  examples/showcase/patient-chalmers.json \
  examples/showcase/patient-heuvel.json
```

```
ResourceType: Patient
Status: 79 difference(s) found

Changed:
  address[0].city: "PleasantVille" → "Amsterdam"
  address[0].line[0]: "534 Erewhon St" → "Van Egmondkade 23"
  address[0].postalCode: "3999" → "1024 RJ"
  birthDate: "1974-12-25" → "1944-11-17"
  contact[0].name.family: "du Marché" → "Abels"
  name[0].family: "Chalmers" → "van de Heuvel"
  name[0].given[0]: "Peter" → "Pieter"
  telecom[1].system: "phone" → "email"
  telecom[1].value: "(03) 5555 6473" → "p.heuvel@gmail.com"
  ...

Added:
  address[0].country
  communication[0].language.coding[0].code   ← preferred language (Dutch)
  maritalStatus.coding[0].code               ← married
  multipleBirthBoolean                       ← twin
  name[0].suffix[0]                          ← "MSc"
  ...

Removed:
  _birthDate.extension[0].valueDateTime      ← birth time (AU practice)
  address[0].district
  address[0].state
  contact[0].address.*                       ← full contact address (AU practice)
  name[2].*                                  ← maiden name history
  ...
```

79 differences between two valid R4 Patients — revealing how two health systems model the same resource type. Australia records birth time as an extension and full emergency contact addresses; the Dutch record prefers language preference, marital status, and academic titles. Neither is wrong — they're both valid R4. The diff shows exactly where the modelling choices differ.

## Using --ignore to filter noise

Strip the XHTML narrative and focus on structured clinical data:

```bash
fhir-resource-diff compare \
  examples/showcase/patient-chalmers.json \
  examples/showcase/patient-heuvel.json \
  --ignore text
```

Ignore multiple paths with a comma-separated list:

```bash
fhir-resource-diff compare a.json b.json \
  --ignore meta.lastUpdated,meta.versionId,id
```

## Named presets

Presets are curated sets of paths to ignore for common use cases:

```bash
# metadata — ignores id, meta.lastUpdated, meta.versionId, meta.tag, text
fhir-resource-diff compare a.json b.json --preset metadata

# clinical — ignores metadata fields plus narrative text
fhir-resource-diff compare a.json b.json --preset clinical

# strict — no ignores, every field compared
fhir-resource-diff compare a.json b.json --preset strict
```

## Two Observations — structurally different shapes

A blood pressure panel and a glucose result are both `Observation` resources, but they're structured quite differently:

```bash
fhir-resource-diff compare \
  examples/showcase/obs-blood-pressure.json \
  examples/showcase/obs-glucose.json
```

```
ResourceType: Observation
Status: 67 difference(s) found

Changed:
  code.coding[0].code: "85354-9" → "15074-8"    ← LOINC: BP panel → Glucose
  code.coding[0].display: "Blood pressure panel..." → "Glucose [Moles/volume] in Blood"
  interpretation[0].coding[0].code: "L" → "H"   ← low → High

Added:
  effectivePeriod.start                          ← period instead of instant
  issued                                         ← lab result timestamp
  referenceRange[0].high.*                       ← reference range (lab only)
  referenceRange[0].low.*
  valueQuantity.*                                ← single scalar value

Removed:
  effectiveDateTime                              ← point-in-time (vital sign)
  component[0].*                                 ← systolic component
  component[1].*                                 ← diastolic component
  bodySite.*                                     ← right arm
  category.*                                     ← vital-signs category
  meta.profile[0]                                ← vital signs profile
```

The diff cleanly surfaces the structural differences between observation subtypes: vital signs use `component[]` (systolic + diastolic as parts of one observation), lab results use a top-level `valueQuantity` with a reference range. Trying to migrate data between these shapes without a diff tool means manually cross-referencing the spec — here it's one command.

## Output formats

**Text** (default) — readable in a terminal:

```bash
fhir-resource-diff compare a.json b.json
```

**JSON** — stable, parseable, pipeline-friendly:

```bash
fhir-resource-diff compare a.json b.json --format json
```

```json
{
  "resourceType": "Patient",
  "identical": false,
  "summary": { "added": 5, "removed": 3, "changed": 4, "typeChanged": 0, "total": 12 },
  "entries": [
    {
      "path": "birthDate",
      "kind": "changed",
      "left": "1974-12-25",
      "right": "1944-11-17"
    }
  ],
  "documentation": "https://hl7.org/fhir/R4/patient.html"
}
```

**Markdown** — paste into a PR description or GitHub comment:

```bash
fhir-resource-diff compare a.json b.json --format markdown
```

## --exit-on-diff for CI

```bash
fhir-resource-diff compare expected.json actual.json \
  --exit-on-diff --preset metadata --quiet
```

Exits with code 1 when differences are found — fails the CI step. Combine with `--quiet` for a clean exit-code-only gate with no stdout.

## --envelope for automation

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
    "summary": { "added": 5, "removed": 0, "changed": 3, "typeChanged": 0, "total": 8 },
    "entries": [...],
    "documentation": "https://hl7.org/fhir/R4/patient.html"
  }
}
```

The envelope adds tool version, FHIR version, and timestamp. An agent can parse this once and know what changed, how many changes, what FHIR version, and where to find the HL7 docs — without a second tool call.

## Stdin

Use `-` as a file argument to read from stdin:

```bash
# Compare a live resource against a baseline
curl -s https://hapi.fhir.org/baseR4/Patient/592473 \
  | fhir-resource-diff compare - baseline.json --format json

# Compare two in-memory payloads
echo "$ACTUAL" | fhir-resource-diff compare - expected.json --format json --envelope
```

## See also

- [Output formats](/reference/output-formats) — full format documentation
- [Exit codes](/reference/exit-codes) — exit code semantics
- [CLI reference](/reference/cli) — all flags for `compare`
- [AI agents & automation](/guide/ai-agents) — stdin, envelope, programmatic patterns
