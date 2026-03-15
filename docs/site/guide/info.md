# Info & list-resources

Two commands for exploring the FHIR resource landscape without leaving the terminal.

## info — look up a resource type

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

Without `--fhir-version`, all versions are shown:

```bash
fhir-resource-diff info Patient
```

```
Patient (base)
FHIR versions: R4, R4B, R5
Documentation:
  R4:  https://hl7.org/fhir/R4/patient.html
  R4B: https://hl7.org/fhir/R4B/patient.html
  R5:  https://hl7.org/fhir/R5/patient.html
```

The documentation links point directly to the HL7 specification page for that resource type and version.

### Bundle example

```bash
fhir-resource-diff info Bundle
```

```
Bundle (foundation)
FHIR versions: R4, R4B, R5
Documentation:
  R4:  https://hl7.org/fhir/R4/bundle.html
  R4B: https://hl7.org/fhir/R4B/bundle.html
  R5:  https://hl7.org/fhir/R5/bundle.html
```

### JSON output

```bash
fhir-resource-diff info Observation --fhir-version R4 --format json
```

```json
{
  "resourceType": "Observation",
  "category": "clinical",
  "description": "Measurements and assertions about a patient or subject",
  "versions": ["R4"],
  "documentation": {
    "R4": "https://hl7.org/fhir/R4/observation.html"
  }
}
```

## list-resources — explore the registry

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

### Filter by category

```bash
fhir-resource-diff list-resources --category clinical
fhir-resource-diff list-resources --category financial
fhir-resource-diff list-resources --category foundation
```

Available categories: `foundation`, `base`, `clinical`, `financial`, `specialized`, `conformance`.

### Filter by FHIR version

```bash
fhir-resource-diff list-resources --fhir-version R5
```

Lists only resource types present in R5. Useful for checking which types are available before validating version-specific resources.

### JSON output

```bash
fhir-resource-diff list-resources --fhir-version R5 --format json
```

Returns an array of resource type objects with `name`, `category`, `description`, and `documentation` fields — useful for tooling that needs to enumerate or validate against the registry.

## See also

- [FHIR versions (R4/R4B/R5)](/guide/fhir-versions) — version differences and auto-detection
- [CLI reference](/reference/cli) — all flags for `info` and `list-resources`
