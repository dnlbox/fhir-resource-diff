# Showcase Data

Real FHIR R4 resources from authoritative public sources, used to demonstrate
`fhir-resource-diff` against production-grade clinical data.

## Files

| File | Resource Type | Description | Source |
|------|--------------|-------------|--------|
| `patient-chalmers.json` | Patient | Peter James Chalmers — full demographic record with contacts, addresses, name history | HL7 R4 spec |
| `patient-heuvel.json` | Patient | Pieter van de Heuvel — Netherlands patient with marital status, communication preferences | HL7 R4 spec |
| `obs-blood-pressure.json` | Observation | Blood pressure panel (107/60 mmHg) conforming to the FHIR vital-signs profile | HL7 R4 spec |
| `obs-glucose.json` | Observation | Serum glucose lab result (6.3 mmol/L, flagged High) with reference range | HL7 R4 spec |
| `condition.json` | Condition | Severe burn of left ear — active, confirmed, with SNOMED coding | HL7 R4 spec |
| `medication-request.json` | MedicationRequest | Oxycodone inpatient order with dosage instructions and dispense details | HL7 R4 spec |

## Sources and Licenses

All files are sourced from the **HL7 FHIR R4 specification example resources**:

> HL7 International. *FHIR R4 Example Resources.*
> https://hl7.org/fhir/R4/downloads.html
> Licensed **CC0** (No Rights Reserved) — freely usable without restriction.

Original URLs:

| File | Original URL |
|------|-------------|
| `patient-chalmers.json` | https://hl7.org/fhir/R4/patient-example.json |
| `patient-heuvel.json` | https://hl7.org/fhir/R4/patient-example-f001-pieter.json |
| `obs-blood-pressure.json` | https://hl7.org/fhir/R4/observation-example-bloodpressure.json |
| `obs-glucose.json` | https://hl7.org/fhir/R4/observation-example-f001-glucose.json |
| `condition.json` | https://hl7.org/fhir/R4/condition-example.json |
| `medication-request.json` | https://hl7.org/fhir/R4/medicationrequest0301.json |

Minor changes from the originals: `text.div` content simplified for readability; the
Provenance contained resource removed from `medication-request.json` (showcase focus is
the MedicationRequest itself).

## Using These Files

See [`SHOWCASE.md`](../../SHOWCASE.md) at the repository root for full command examples
and expected outputs using these files.

Quick start:

```bash
# Validate a resource
fhir-resource-diff validate examples/showcase/patient-chalmers.json --fhir-version R4

# Compare two patients
fhir-resource-diff compare examples/showcase/patient-chalmers.json examples/showcase/patient-heuvel.json

# Look up a resource type
fhir-resource-diff info Observation --fhir-version R4

# Pipe from stdin
cat examples/showcase/obs-glucose.json | fhir-resource-diff validate - --fhir-version R4
```
