# Showcase

`fhir-resource-diff` is a CLI and library for comparing and validating FHIR JSON
resources. It works at the JSON path level — tracking every added, removed, and
changed field across two resources, and flagging format problems that would cause
FHIR server rejections before you submit anything.

This showcase runs it against real clinical data from the official HL7 FHIR R4
specification to show what it surfaces on production-grade resources.

---

## The dataset

All six files in [`examples/showcase/`](examples/showcase/) are sourced directly
from the **HL7 FHIR R4 specification example resources** — the same resources the
HL7 working group uses to illustrate the standard.

| File | What it represents |
|------|--------------------|
| `patient-chalmers.json` | Peter James Chalmers — Australian patient with name history, emergency contact, birth time extension |
| `patient-heuvel.json` | Pieter van de Heuvel — Dutch patient with marital status, language preference, twin birth flag |
| `obs-blood-pressure.json` | Blood pressure panel (107/60 mmHg) — vital signs profile with dual-component systolic/diastolic |
| `obs-glucose.json` | Serum glucose (6.3 mmol/L, flagged High) — lab result with reference range |
| `condition.json` | Severe burn of left ear — SNOMED-coded, encounter diagnosis, active/confirmed |
| `medication-request.json` | Oxycodone inpatient order — with dosage instructions, dispense details, formulary substitution |

These aren't toy examples. They exercise FHIR extensions (`_birthDate`), nested
CodeableConcepts with multiple codings, Quantity with UCUM units, contained resources,
and multi-level identifier hierarchies — exactly the complexity you find in real EHR data.

> Source: HL7 International. *FHIR R4 Example Resources.*
> https://hl7.org/fhir/R4/downloads.html — licensed **CC0**.

---

## Discovering what resource types exist

Before diffing or validating, you can explore the FHIR resource landscape directly
from the CLI:

```bash
fhir-resource-diff list-resources --fhir-version R4
```

```
FHIR Resource Types — R4 (37 total)

foundation
  Bundle                  Container for a collection of resources
  ...

base
  Patient                 Demographics and administrative information about an individual
  Practitioner            A person with a formal responsibility in healthcare
  Organization            A formally recognized grouping of people or organizations
  ...

clinical
  Observation             Measurements and assertions about a patient or subject
  Condition               Detailed information about a clinical condition or diagnosis
  MedicationRequest       Order or request for a medication
  AllergyIntolerance      Allergy or intolerance and its clinical consequences
  ...

financial
  Claim                   Claim, pre-determination, or pre-authorization
  Coverage                Insurance or medical plan coverage
  ExplanationOfBenefit    Explanation of Benefit resource
```

Drill into any type for the spec link:

```bash
fhir-resource-diff info Observation --fhir-version R4
```

```
Observation (clinical)
FHIR version: R4
Measurements and assertions about a patient or subject

Documentation:
  R4:   https://hl7.org/fhir/R4/observation.html
```

---

## Comparing resources

The core capability: diff two FHIR resources field by field, with full dot-notation
path tracking including array indices.

### Two patients from different health systems

Chalmers (Australian) and van de Heuvel (Dutch) are both valid, well-formed R4
Patients. Run them through `compare` to see exactly where they diverge:

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

79 differences — but they're not noise. They reveal genuine divergence between how two
health systems model the same resource type: Australia records birth time as an
extension and full emergency contact addresses; the Dutch record prefers language
preference, marital status, and academic titles. Neither is wrong — they're both valid
R4. The diff shows exactly where the modelling choices differ.

Strip the XHTML narrative to focus on structured clinical data only:

```bash
fhir-resource-diff compare \
  examples/showcase/patient-chalmers.json \
  examples/showcase/patient-heuvel.json \
  --ignore text
```

### Two Observations — structurally different resource shapes

A blood pressure panel and a glucose result are both `Observation` resources, but
they're structured quite differently:

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

The diff cleanly surfaces the structural differences between observation subtypes:
vital signs use `component[]` (systolic + diastolic as parts of one observation),
lab results use a top-level `valueQuantity` with a reference range. Trying to migrate
data between these shapes without a diff tool means manually cross-referencing the
spec — here it's one command.

---

## Validating resources

```bash
fhir-resource-diff validate examples/showcase/patient-chalmers.json --fhir-version R4
```

```
valid
  ℹ For full FHIR schema validation, use the official HL7 FHIR Validator
    → https://confluence.hl7.org/display/FHIR/Using+the+FHIR+Validator
```

All six showcase files pass cleanly. The note pointing to the HL7 FHIR Validator is
always shown when `--fhir-version` is specified — it's a footer about the tool's scope,
not a finding about the resource. "Valid (with warnings)" only appears when the tool
actually found something to flag in your data.

### What this tool checks

- **JSON structure** — valid JSON, `resourceType` present and non-empty
- **FHIR `id` format** — must match `[A-Za-z0-9\-.]{1,64}` (server rejections happen silently otherwise)
- **Date formats** — FHIR uses a strict ISO 8601 subset; `2024/03/15` or `03-15-2024` are caught as warnings
- **Reference strings** — `subject.reference` must be `ResourceType/id`, an absolute URL, a `#fragment`, or a `urn:` — bare IDs like `"12345"` are flagged
- **Known resource types** — checked against the registry for the specified FHIR version

### What it doesn't check — and why

Full FHIR schema validation requires the StructureDefinitions from the specification
(required fields, cardinality, value set bindings, profile conformance, invariants).
Bundling and keeping those current is a significant maintenance surface. The
[HL7 FHIR Validator](https://confluence.hl7.org/display/FHIR/Using+the+FHIR+Validator)
is the authoritative tool for that. `fhir-resource-diff` catches the common mistakes
that cause server rejections and surface data quality issues — it's a fast, local
sanity check, not a compliance validator.

---

## Output formats

Three output formats for every command — human, machine, and document.

**Text** (default) — readable in a terminal:
```bash
fhir-resource-diff compare patient-a.json patient-b.json
```

**JSON** — stable, parseable, pipeline-friendly:
```bash
fhir-resource-diff compare patient-a.json patient-b.json --format json
```

**Markdown** — paste into a PR description or GitHub comment:
```bash
fhir-resource-diff compare patient-a.json patient-b.json --format markdown
```

**Envelope** — wraps JSON output with tool version, FHIR version, and timestamp for
audit trails and agent pipelines:
```bash
fhir-resource-diff compare patient-a.json patient-b.json --format json --envelope
```

```json
{
  "tool": "fhir-resource-diff",
  "version": "0.2.0",
  "command": "compare",
  "fhirVersion": "R4",
  "timestamp": "2026-03-14T15:56:25.686Z",
  "result": { "resourceType": "Patient", "identical": false, "entries": [ ... ] }
}
```

---

## Automation and pipelines

**Stdin** — pipe from curl, jq, or any FHIR server:
```bash
curl -s https://hapi.fhir.org/baseR4/Patient/592473 \
  | fhir-resource-diff validate - --fhir-version R4
```

**Quiet mode** — exit code only, no output, for CI gates:
```bash
fhir-resource-diff validate patient.json --quiet
echo $?  # 0 = no errors, 1 = errors found
```

**Exit codes are severity-aware** — warnings and info findings never produce a non-zero
exit. Only `severity: error` findings (invalid JSON, missing `resourceType`) do.
Informational findings surface in output but don't break pipelines.
