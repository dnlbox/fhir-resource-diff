# Spec 25 — Info command enrichment

**Status:** open

## Goal

Transform `info` from a link bookmark into a useful quick-reference for any audience
touching FHIR data — developer, data engineer, QA, or product owner. The command
should answer the questions a person actually has when encountering a resource type
for the first time or returning after a version migration.

Current output is four lines and a URL. Target output is a concise cheat sheet:
maturity level, real-world use cases, key fields with notes (including polymorphic
`[x]` types), valid status values, and version transition notes.

## Dependencies

- Spec 01 (types)
- Spec 13 (resource-registry: `ResourceTypeInfo`)
- Spec 22 (structural rules: `REQUIRED_FIELDS`, `STATUS_VALUES` — referenced for
  display, not duplicated)

## Deliverables

### Modified files

| File | Change |
|------|--------|
| `src/core/resource-registry.ts` | Extend `ResourceTypeInfo` with new optional fields; populate curated data for top-15 resources |
| `src/cli/commands/info.ts` | Update text and JSON formatters to render new fields |
| `tests/core/resource-registry.test.ts` | Tests for new fields |
| `tests/cli/info.test.ts` | Tests for enriched output |

No new files — all data lives in the existing registry.

## Key interfaces / signatures

### Extended `ResourceTypeInfo`

```typescript
export interface ResourceTypeInfo {
  // --- existing ---
  resourceType: string;
  category: ResourceCategory;
  versions: readonly FhirVersion[];
  description: string;

  // --- new ---

  /**
   * FHIR Maturity Model level.
   * 1–2 = draft/experimental, 3–4 = trial use, 5 = mature trial use, "N" = Normative.
   * Normative means backwards-compatibility is guaranteed by HL7.
   * Omitted for rarely-used resources.
   */
  maturityLevel?: number | "N";

  /**
   * 2–3 real-world use cases. Helps product owners and newcomers understand when
   * to use this resource vs alternatives.
   */
  useCases?: readonly string[];

  /**
   * Key fields worth knowing, with brief explanatory notes.
   * Not a full field list — just the ones that trip people up or need context.
   */
  keyFields?: readonly ResourceKeyField[];

  /**
   * Notable changes at each version boundary.
   * Only populated when something meaningful changed — absence means "no significant change".
   */
  versionNotes?: ResourceVersionNotes;
}

export interface ResourceKeyField {
  /** Field name. Use "[x]" suffix for polymorphic fields, e.g. "value[x]". */
  name: string;
  /** Whether this field is required (1..1 or 1..*) in the base spec. */
  required: boolean;
  /** Concise note explaining the field's purpose, type choices, or common gotchas. */
  note: string;
}

export interface ResourceVersionNotes {
  /** What changed moving from R4 to R4B. Omit if no significant changes. */
  "R4→R4B"?: string;
  /** What changed moving from R4B to R5. Omit if no significant changes. */
  "R4B→R5"?: string;
}
```

## Curated data — top 15 resources

These resources get full curation (`maturityLevel`, `useCases`, `keyFields`,
`versionNotes`). All other registry entries get `maturityLevel` only.

### Patient — N (Normative)

```
useCases:
  "Demographics and identity for individuals receiving healthcare"
  "Linking clinical data (observations, conditions, encounters) to a person"
  "Cross-system patient matching and identity resolution"

keyFields:
  identifier    not required  MRN, SSN, passport — systems commonly use multiple
  name          not required  HumanName array; use[official] for the primary name
  birthDate     not required  FHIR date: YYYY, YYYY-MM, or YYYY-MM-DD
  gender        not required  administrative gender: male | female | other | unknown
  address       not required  array — patients may have multiple (home, work, old)
  telecom       not required  phone/email array; rank=1 is preferred contact
  deceased[x]   not required  boolean or dateTime — affects active status logic

versionNotes:
  R4→R4B: No breaking changes
  R4B→R5: link field added for cross-version Patient links; contact.relationship
          binding relaxed
```

### Observation — N (Normative)

```
useCases:
  "Lab results: glucose, HbA1c, CBC panels, lipid panels"
  "Vital signs: blood pressure, heart rate, BMI, oxygen saturation"
  "Clinical scores, assessment findings, and survey answers"

keyFields:
  status        required   registered|preliminary|final|amended|corrected|cancelled|entered-in-error|unknown
  code          required   what was observed — LOINC (preferred), SNOMED, local codes
  subject       required   usually Patient; can be Group, Device, or Location
  effective[x]  not required  when the observation was made — dateTime or Period
  value[x]      not required  the result — Quantity, CodeableConcept, string, boolean,
                              integer, Range, Ratio, SampledData, time, dateTime, Period
  component[]   not required  for panel observations; each component has its own
                              code + value[x] (e.g. systolic + diastolic for BP)
  referenceRange not required low/high bounds for interpreting Quantity values

versionNotes:
  R4→R4B: No breaking changes
  R4B→R5: bodyStructure field added (replaces bodySite extension); subject broadens
          to support more reference targets; triggeredBy added for derived observations
```

### Condition — 3

```
useCases:
  "Problem list entries: active chronic conditions"
  "Encounter diagnoses: the reason care was provided"
  "Past medical history and resolved conditions"

keyFields:
  clinicalStatus   not required  CodeableConcept — active|recurrence|relapse|inactive|remission|resolved
  verificationStatus not required CodeableConcept — unconfirmed|provisional|differential|confirmed|refuted|entered-in-error
  code             not required  the diagnosis (SNOMED, ICD-10, local) — surprisingly not required in base spec
  subject          required      the patient
  onset[x]         not required  when the condition started — dateTime, Age, Period, Range, string
  abatement[x]     not required  when it resolved — same type choices as onset[x]

versionNotes:
  R4→R4B: No breaking changes
  R4B→R5: participant added (who was involved); stage moved to backbone element;
          encounter reference added directly to resource
```

### Encounter — 2

```
useCases:
  "Inpatient admission and discharge records"
  "Outpatient visits and office appointments"
  "Emergency department presentations"

keyFields:
  status      required   R4/R4B: planned|arrived|triaged|in-progress|onleave|finished|cancelled|...
                         R5: planned|in-progress|on-hold|discharged|completed|cancelled|...
  class       required   R4/R4B: Coding (AMB=ambulatory, IMP=inpatient, EMER=emergency)
                         R5: renamed to class and made CodeableConcept
  subject     required   the patient
  period      not required  start and end datetime of the encounter
  participant[] not required  practitioners involved (type + individual reference)
  diagnosis[] not required  conditions and procedures linked to this encounter

versionNotes:
  R4→R4B: No breaking changes
  R4B→R5: class changed from Coding to CodeableConcept (CodeableReference); status
          values reworked; hospitalization renamed to admission; reason now a
          CodeableReference instead of CodeableConcept
```

### MedicationRequest — 3

```
useCases:
  "Prescriptions from a prescriber to a pharmacy"
  "Medication orders within inpatient care"
  "Medication plans in chronic disease management"

keyFields:
  status      required   active|on-hold|cancelled|completed|entered-in-error|stopped|draft|unknown
  intent      required   proposal|plan|order|original-order|reflex-order|filler-order|instance-order|option
  medication[x] required  reference to Medication resource or CodeableConcept — R5 uses CodeableReference
  subject     required   the patient
  authoredOn  not required  when the prescription was written
  dosageInstruction[] not required  timing, route, dose — highly structured but verbose

versionNotes:
  R4→R4B: No breaking changes
  R4B→R5: medication[x] changed to CodeableReference; statusChanged added;
          informationSource added; renderedDosageInstruction added (human-readable summary)
```

### Bundle — N (Normative)

```
useCases:
  "Transaction: atomic write of multiple resources to a FHIR server"
  "Search result set: server response to a search query"
  "Document: a persistent clinical document (IPS, CCD)"
  "Message: event notification"

keyFields:
  type        required   document|message|transaction|transaction-response|batch|batch-response|
                         history|searchset|collection|subscription-notification
  entry[]     not required  the resources; shape of entry depends on Bundle.type
  entry[].resource     the actual resource
  entry[].request      for transaction/batch: method + url
  entry[].response     for transaction-response/batch-response: status
  total       not required  only meaningful for searchset — total matching count

versionNotes:
  R4→R4B: No breaking changes
  R4B→R5: subscription-notification added as a new Bundle type; issues field
          added for server-reported problems with individual entries
```

### Practitioner — 3

```
useCases:
  "Identifying the author of a clinical note"
  "Linking prescriptions and orders to a licensed provider"
  "Directory listings for healthcare professionals"

keyFields:
  identifier  not required  NPI (US), provider number — systems usually require at least one
  name        not required  HumanName array
  qualification[] not required  licenses and certifications with issuer and period

versionNotes:
  R4→R4B: No breaking changes
  R4B→R5: communication now includes proficiency level
```

### DiagnosticReport — 3

```
useCases:
  "Lab report: a set of Observation results with interpretation"
  "Radiology report: imaging study findings"
  "Pathology report: tissue examination results"

keyFields:
  status      required   registered|partial|preliminary|final|amended|corrected|appended|cancelled|entered-in-error
  code        required   the type of report (LOINC panel code, local code)
  subject     not required  the patient (technically optional in base spec)
  result[]    not required  references to Observation resources in the report
  conclusion  not required  free-text clinical interpretation

versionNotes:
  R4→R4B: No breaking changes
  R4B→R5: study replaces imagingStudy; note added; composition added for structured reports
```

### AllergyIntolerance — 3

```
useCases:
  "Medication allergies for prescribing safety checks"
  "Food and environmental allergen records"
  "Adverse reaction history"

keyFields:
  clinicalStatus    not required  CodeableConcept — active|inactive|resolved
  verificationStatus not required CodeableConcept — unconfirmed|confirmed|refuted|entered-in-error
  type              not required  allergy | intolerance
  code              not required  the allergen (RxNorm for drugs, SNOMED for substances)
  patient           required (R4/R4B) renamed to subject in R5
  reaction[]        not required  manifestation descriptions and severity

versionNotes:
  R4→R4B: No breaking changes
  R4B→R5: patient renamed to subject (breaking rename); participant added
```

### Immunization — 3

```
useCases:
  "Vaccination records for immunization history"
  "Reporting immunizations to public health registries"
  "Immunization forecasting input"

keyFields:
  status       required   completed | entered-in-error | not-done
  vaccineCode  required   the vaccine administered (CVX codes in US, SNOMED)
  patient      required   the patient
  occurrence[x] required  when administered — dateTime or string
  lotNumber    not required  manufacturer lot for traceability

versionNotes:
  R4→R4B: No breaking changes
  R4B→R5: patient renamed to patient (no change); informationSource added;
           basedOn added for linking to immunization recommendations
```

### ServiceRequest — 2

```
useCases:
  "Referral from a GP to a specialist"
  "Lab test order (precedes DiagnosticReport)"
  "Imaging order (precedes ImagingStudy)"

keyFields:
  status      required   draft|active|on-hold|revoked|completed|entered-in-error|unknown
  intent      required   proposal|plan|directive|order|original-order|reflex-order|filler-order|instance-order|option
  code        not required  what is being requested
  subject     required   the patient
  requester   not required  who is ordering
  performer[] not required  who should fulfill the request

versionNotes:
  R4→R4B: No breaking changes
  R4B→R5: code changed to CodeableReference; bodyStructure added; focus added
```

### Coverage — 2

```
useCases:
  "Insurance plan and subscriber information for claims processing"
  "Prior authorization eligibility checks"
  "Patient cost-sharing determination"

keyFields:
  status       required   active | cancelled | draft | entered-in-error
  beneficiary  required   the patient covered
  payor[]      required   the insurance organization(s)
  class[]      not required  plan, group, and subgroup identifiers

versionNotes:
  R4→R4B: No breaking changes
  R4B→R5: kind field added (insurance|self-pay|other); paymentBy added for
           cost-sharing parties
```

### DocumentReference — 3

```
useCases:
  "Clinical notes (progress notes, discharge summaries, op reports)"
  "Scanned or external documents attached to a patient record"
  "CCDA and structured clinical documents"

keyFields:
  status      required   current | superseded | entered-in-error
  type        not required  document type (LOINC document codes)
  subject     not required  the patient
  content[]   required   the document itself — attachment with URL or base64 data
  context     not required  encounter, period, and clinical setting

versionNotes:
  R4→R4B: No breaking changes
  R4B→R5: docStatus made more prominent; attester replaces author for formal
           attestation; version added; basedOn added
```

### Procedure — 3

```
useCases:
  "Surgical procedures and interventions"
  "Therapeutic procedures (dialysis, chemotherapy, physical therapy)"
  "Diagnostic procedures (biopsy, colonoscopy)"

keyFields:
  status      required   preparation|in-progress|not-done|on-hold|stopped|completed|entered-in-error|unknown
  code        not required  what was performed (SNOMED, CPT, local)
  subject     required   the patient
  performed[x] not required  when — dateTime, Period, string, Age, Range
  report[]    not required  linked DiagnosticReport results

versionNotes:
  R4→R4B: No breaking changes
  R4B→R5: recorded field added; report made CodeableReference; performer uses
           new Actor type
```

## Output design

### Text format

```
Observation (clinical) — Normative ★
Available in: R4 · R4B · R5

Measurements and assertions about a patient or subject.

Use cases:
  • Lab results: glucose, HbA1c, CBC panels, lipid panels
  • Vital signs: blood pressure, heart rate, BMI, oxygen saturation
  • Clinical scores, assessment findings, and survey answers

Key fields:
  status *      registered | preliminary | final | amended | corrected | ...
  code *        what was observed — LOINC (preferred), SNOMED, local codes
  subject *     usually Patient; can be Group, Device, or Location
  effective[x]  when observed — dateTime or Period
  value[x]      the result — Quantity, CodeableConcept, string, boolean, integer, ...
  component[]   for panels — each component has its own code + value[x]

Version notes:
  R4 → R4B  No significant changes
  R4B → R5  bodyStructure added; subject broadens reference targets; triggeredBy added

Documentation:
  R4:   https://hl7.org/fhir/R4/observation.html
  R4B:  https://hl7.org/fhir/R4B/observation.html
  R5:   https://hl7.org/fhir/R5/observation.html
```

With `--fhir-version R4`:

```
Observation (clinical) — Normative ★
FHIR version: R4

Measurements and assertions about a patient or subject.

Use cases:
  • Lab results: glucose, HbA1c, CBC panels, lipid panels
  • Vital signs: blood pressure, heart rate, BMI, oxygen saturation
  • Clinical scores, assessment findings, and survey answers

Key fields:
  status *      registered | preliminary | final | amended | corrected | ...
  code *        what was observed — LOINC (preferred), SNOMED, local codes
  subject *     usually Patient; can be Group, Device, or Location
  effective[x]  when observed — dateTime or Period
  value[x]      the result — Quantity, CodeableConcept, string, boolean, integer, ...
  component[]   for panels — each component has its own code + value[x]

Documentation:
  R4:   https://hl7.org/fhir/R4/observation.html
```

Notes on format:
- `*` marks required fields — immediately readable for QA and developers
- `[x]` suffix is shown as-is — educates users on FHIR polymorphic field naming
- The `★` after maturity level is a visual signal for Normative stability
- Non-curated resources (no `useCases` or `keyFields`) show the maturity level and
  version notes only — graceful degradation, never an empty section

### JSON format

```json
{
  "resourceType": "Observation",
  "category": "clinical",
  "maturityLevel": "N",
  "versions": ["R4", "R4B", "R5"],
  "description": "Measurements and assertions about a patient or subject",
  "useCases": [
    "Lab results: glucose, HbA1c, CBC panels, lipid panels",
    "Vital signs: blood pressure, heart rate, BMI, oxygen saturation",
    "Clinical scores, assessment findings, and survey answers"
  ],
  "keyFields": [
    { "name": "status", "required": true, "note": "registered | preliminary | final | ..." },
    { "name": "code", "required": true, "note": "what was observed — LOINC, SNOMED, local" },
    { "name": "value[x]", "required": false, "note": "Quantity, CodeableConcept, string, boolean, ..." }
  ],
  "versionNotes": {
    "R4→R4B": "No significant changes",
    "R4B→R5": "bodyStructure added; subject broadens reference targets; triggeredBy added"
  },
  "documentation": {
    "R4": "https://hl7.org/fhir/R4/observation.html",
    "R4B": "https://hl7.org/fhir/R4B/observation.html",
    "R5": "https://hl7.org/fhir/R5/observation.html"
  }
}
```

## Maturity level data for all registry resources

| Resource | FMM |
|----------|-----|
| Bundle | N |
| OperationOutcome | N |
| Parameters | N |
| Binary | 3 |
| Patient | N |
| Practitioner | 3 |
| PractitionerRole | 2 |
| Organization | 3 |
| Location | 3 |
| Endpoint | 2 |
| RelatedPerson | 2 |
| HealthcareService | 2 |
| Observation | N |
| Condition | 3 |
| Encounter | 2 |
| Procedure | 3 |
| AllergyIntolerance | 3 |
| MedicationRequest | 3 |
| MedicationStatement | 3 |
| DiagnosticReport | 3 |
| Immunization | 3 |
| CarePlan | 2 |
| CareTeam | 2 |
| ServiceRequest | 2 |
| DocumentReference | 3 |
| Consent | 2 |
| Goal | 2 |
| Claim | 2 |
| Coverage | 2 |
| ExplanationOfBenefit | 2 |
| Questionnaire | 3 |
| QuestionnaireResponse | 3 |
| ResearchStudy | 1 |
| CapabilityStatement | N |
| StructureDefinition | N |
| ValueSet | N |
| CodeSystem | N |

## Acceptance criteria

### Build and lint
```bash
pnpm typecheck && pnpm lint && pnpm build
```

### Tests

**Registry tests:**
- `getResourceInfo("Observation").maturityLevel` → `"N"`
- `getResourceInfo("Encounter").maturityLevel` → `2`
- `getResourceInfo("Observation").useCases` → array with 3 entries
- `getResourceInfo("Observation").keyFields` → array; `status` entry has `required: true`
- `getResourceInfo("Observation").versionNotes["R4B→R5"]` → defined string
- `getResourceInfo("Bundle").versionNotes["R4→R4B"]` → undefined (no significant changes)
- Resources without full curation (`ResearchStudy`) have `maturityLevel` but no `keyFields`

**Info command output tests:**
- Normative resources show `★` in the header
- Non-normative resources show maturity number (e.g. `— FMM 2`)
- Resources without `useCases` skip the "Use cases" section entirely
- Resources without `keyFields` skip the "Key fields" section entirely
- `*` appears on required fields, absent on optional fields
- Version notes section absent when `--fhir-version` is provided (version-specific view)
- `--format json` includes all new fields

### CLI smoke tests
```bash
# Full output with all sections
fhir-resource-diff info Observation

# Version-specific — no version notes section, single doc link
fhir-resource-diff info Observation --fhir-version R4

# Resource with minimal curation — shows maturity, skips use cases / key fields
fhir-resource-diff info ResearchStudy

# Unknown resource — unchanged
fhir-resource-diff info FooBar
```

## Do not do

- Do not pull data from the HL7 spec website at runtime — all data is static, curated
- Do not attempt to list all fields for a resource — key fields only (5–8 max per resource)
- Do not add a `--fields` flag yet — future spec
- Do not add `list-profiles` or profile-specific info yet — that is Spec 23
- Do not add version notes for resources where nothing significant changed between
  versions — an absent note is cleaner than "no significant changes" for every entry
  (except where a breaking change exists and absence would be misleading)
