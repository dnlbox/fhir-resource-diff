# Spec 13 — Resource type registry

**Status:** complete

## Goal

A lightweight, hand-curated registry of common FHIR resource types with per-version availability,
one-line descriptions, and HL7 documentation URL generation. This powers the `info` command,
`list-resources` command, and smarter validation messages.

## Dependencies

- Spec 12 (FHIR version model): `FhirVersion`, `fhirBaseUrl`

## Deliverables

| File | Description |
|------|-------------|
| `src/core/resource-registry.ts` | Registry data structure, lookup functions, URL builder |
| `src/core/index.ts` | Re-export new public symbols |
| `tests/core/resource-registry.test.ts` | Tests for all exported functions |

## Key types and functions

### Types

```typescript
export type ResourceCategory =
  | "foundation"
  | "base"
  | "clinical"
  | "financial"
  | "specialized"
  | "conformance";

export interface ResourceTypeInfo {
  /** The exact resourceType string, e.g. "Patient". */
  resourceType: string;
  /** High-level category for grouping and filtering. */
  category: ResourceCategory;
  /** Which FHIR versions include this resource type. */
  versions: readonly FhirVersion[];
  /** One-line description. Not a full definition — just enough for CLI display. */
  description: string;
}
```

### Data

```typescript
export const RESOURCE_REGISTRY: readonly ResourceTypeInfo[];
```

Curate the ~30–40 most commonly used resource types. Group by category. Examples:

**foundation:**
- `Bundle` — Container for a collection of resources
- `OperationOutcome` — Collection of processing messages (errors, warnings, information)
- `Parameters` — Operation request/response parameters

**base:**
- `Patient` — Demographics and administrative information about an individual
- `Practitioner` — A person with a formal responsibility in healthcare
- `PractitionerRole` — Roles and specialties a practitioner is authorized to perform
- `Organization` — A formally recognized grouping of people or organizations
- `Location` — Physical place where services are provided
- `Endpoint` — Technical connectivity details for a system
- `RelatedPerson` — Person related to the patient

**clinical:**
- `Observation` — Measurements and assertions about a patient or subject
- `Condition` — Detailed information about a clinical condition or diagnosis
- `Encounter` — An interaction during which services are provided
- `Procedure` — An action performed on or for a patient
- `AllergyIntolerance` — Allergy or intolerance and its clinical consequences
- `MedicationRequest` — Order or request for a medication
- `MedicationStatement` — Record of medication use (R4/R4B; check R5 status)
- `DiagnosticReport` — Findings and interpretation of diagnostic investigations
- `Immunization` — Immunization event record
- `CarePlan` — Plan of care for a patient
- `CareTeam` — Participants in coordinated care for a patient
- `ServiceRequest` — Record of a request for a service
- `DocumentReference` — Reference to a document
- `Consent` — Record of a consent decision
- `Goal` — Desired outcome for a patient

**financial:**
- `Claim` — Request for payment for products and/or services
- `Coverage` — Insurance or medical plan details
- `ExplanationOfBenefit` — Processed claim adjudication details

**specialized:**
- `Questionnaire` — Structured set of questions
- `QuestionnaireResponse` — Responses to a questionnaire
- `ResearchStudy` — Investigation and analysis plan

**conformance:**
- `CapabilityStatement` — Server capability description
- `StructureDefinition` — Definition of a FHIR structure (resource or data type)
- `ValueSet` — Set of coded values
- `CodeSystem` — Definition of a code system

For each entry, set `versions` to the array of FHIR versions where that resource type exists.
Most types are available in all three versions. Note exceptions where a type was added in R4B
or R5, or where a type was renamed.

### Functions

```typescript
/**
 * Looks up a resource type by name (case-sensitive, exact match).
 */
export function getResourceInfo(resourceType: string): ResourceTypeInfo | undefined;

/**
 * Builds the HL7 documentation URL for a resource type and version.
 * e.g. getResourceDocUrl("Patient", "R4") → "https://hl7.org/fhir/R4/patient.html"
 * Falls back to DEFAULT_FHIR_VERSION if version is not provided.
 */
export function getResourceDocUrl(resourceType: string, version?: FhirVersion): string;

/**
 * Returns true if the resource type is in the registry, optionally filtered by version.
 */
export function isKnownResourceType(resourceType: string, version?: FhirVersion): boolean;

/**
 * Returns all resource types, optionally filtered by version and/or category.
 */
export function listResourceTypes(filters?: {
  version?: FhirVersion;
  category?: ResourceCategory;
}): readonly ResourceTypeInfo[];
```

## Implementation notes

- The registry is a flat array. Lookup functions do linear scans — the list is small enough
  that indexing is unnecessary overhead.
- `getResourceDocUrl` builds the URL as: `${fhirBaseUrl(version)}/${resourceType.toLowerCase()}.html`
  This matches the HL7 URL convention (e.g. `https://hl7.org/fhir/R4/patient.html`).
- Descriptions should be terse — one line, no period at the end, no FHIR jargon that needs
  further explanation. Think `man` page one-liners.
- The registry is intentionally incomplete. It covers the most commonly used types. Add a
  code comment noting this and pointing to https://hl7.org/fhir/resourcelist.html for the
  full list.
- All code must be browser-safe. No Node imports.
- Export `ResourceCategory` and `ResourceTypeInfo` from `src/core/index.ts` for library consumers.

## Acceptance criteria

```bash
pnpm typecheck   # passes
pnpm test        # resource-registry tests pass
pnpm lint        # passes
```

Tests must cover:

- `getResourceInfo("Patient")` returns correct info
- `getResourceInfo("NotAResource")` returns `undefined`
- `getResourceDocUrl("Patient", "R4")` → `"https://hl7.org/fhir/R4/patient.html"`
- `getResourceDocUrl("Observation", "R5")` → `"https://hl7.org/fhir/R5/observation.html"`
- `getResourceDocUrl("Patient")` uses default version
- `isKnownResourceType("Patient")` → `true`
- `isKnownResourceType("FakeType")` → `false`
- `isKnownResourceType` with version filter
- `listResourceTypes()` returns full list
- `listResourceTypes({ version: "R5" })` filters correctly
- `listResourceTypes({ category: "clinical" })` filters correctly
- `listResourceTypes({ version: "R4", category: "clinical" })` applies both filters
- Registry has at least 25 entries

## Do not do

- Do not auto-generate the registry from the FHIR spec — curate it by hand.
- Do not include all 157 R5 resource types — focus on the ones interoperability engineers
  actually encounter.
- Do not add resource-level field definitions or schemas — just type-level metadata.
- Do not make network calls to HL7.org.
- Do not add resource types from FHIR versions prior to R4.
