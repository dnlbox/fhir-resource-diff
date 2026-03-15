import { DEFAULT_FHIR_VERSION, fhirBaseUrl } from "@/core/fhir-version.js";
import type { FhirVersion } from "@/core/fhir-version.js";

export type ResourceCategory =
  | "foundation"
  | "base"
  | "clinical"
  | "financial"
  | "specialized"
  | "conformance";

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

export interface ResourceTypeInfo {
  /** The exact resourceType string, e.g. "Patient". */
  resourceType: string;
  /** High-level category for grouping and filtering. */
  category: ResourceCategory;
  /** Which FHIR versions include this resource type. */
  versions: readonly FhirVersion[];
  /** One-line description. Not a full definition — just enough for CLI display. */
  description: string;

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

/**
 * Curated registry of common FHIR resource types.
 * This is intentionally incomplete — it covers the most commonly used types.
 * Full list: https://hl7.org/fhir/resourcelist.html
 */
export const RESOURCE_REGISTRY: readonly ResourceTypeInfo[] = [
  // foundation
  {
    resourceType: "Bundle",
    category: "foundation",
    versions: ["R4", "R4B", "R5"],
    description: "Container for a collection of resources",
    maturityLevel: "N",
    useCases: [
      "Transaction: atomic write of multiple resources to a FHIR server",
      "Search result set: server response to a search query",
      "Document: a persistent clinical document (IPS, CCD)",
      "Message: event notification",
    ],
    keyFields: [
      {
        name: "type",
        required: true,
        note: "document|message|transaction|transaction-response|batch|batch-response|history|searchset|collection|subscription-notification",
      },
      {
        name: "entry[]",
        required: false,
        note: "the resources; shape of entry depends on Bundle.type",
      },
      {
        name: "entry[].resource",
        required: false,
        note: "the actual resource",
      },
      {
        name: "entry[].request",
        required: false,
        note: "for transaction/batch: method + url",
      },
      {
        name: "entry[].response",
        required: false,
        note: "for transaction-response/batch-response: status",
      },
      {
        name: "total",
        required: false,
        note: "only meaningful for searchset — total matching count",
      },
    ],
    versionNotes: {
      "R4B→R5":
        "subscription-notification added as a new Bundle type; issues field added for server-reported problems with individual entries",
    },
  },
  {
    resourceType: "OperationOutcome",
    category: "foundation",
    versions: ["R4", "R4B", "R5"],
    description: "Collection of processing messages (errors, warnings, information)",
    maturityLevel: "N",
  },
  {
    resourceType: "Parameters",
    category: "foundation",
    versions: ["R4", "R4B", "R5"],
    description: "Operation request/response parameters",
    maturityLevel: "N",
  },
  {
    resourceType: "Binary",
    category: "foundation",
    versions: ["R4", "R4B", "R5"],
    description: "Raw binary content",
    maturityLevel: 3,
  },
  // base
  {
    resourceType: "Patient",
    category: "base",
    versions: ["R4", "R4B", "R5"],
    description: "Demographics and administrative information about an individual",
    maturityLevel: "N",
    useCases: [
      "Demographics and identity for individuals receiving healthcare",
      "Linking clinical data (observations, conditions, encounters) to a person",
      "Cross-system patient matching and identity resolution",
    ],
    keyFields: [
      {
        name: "identifier",
        required: false,
        note: "MRN, SSN, passport — systems commonly use multiple",
      },
      {
        name: "name",
        required: false,
        note: "HumanName array; use[official] for the primary name",
      },
      {
        name: "birthDate",
        required: false,
        note: "FHIR date: YYYY, YYYY-MM, or YYYY-MM-DD",
      },
      {
        name: "gender",
        required: false,
        note: "administrative gender: male | female | other | unknown",
      },
      {
        name: "address",
        required: false,
        note: "array — patients may have multiple (home, work, old)",
      },
      {
        name: "telecom",
        required: false,
        note: "phone/email array; rank=1 is preferred contact",
      },
      {
        name: "deceased[x]",
        required: false,
        note: "boolean or dateTime — affects active status logic",
      },
    ],
    versionNotes: {
      "R4B→R5":
        "link field added for cross-version Patient links; contact.relationship binding relaxed",
    },
  },
  {
    resourceType: "Practitioner",
    category: "base",
    versions: ["R4", "R4B", "R5"],
    description: "A person with a formal responsibility in healthcare",
    maturityLevel: 3,
    useCases: [
      "Identifying the author of a clinical note",
      "Linking prescriptions and orders to a licensed provider",
      "Directory listings for healthcare professionals",
    ],
    keyFields: [
      {
        name: "identifier",
        required: false,
        note: "NPI (US), provider number — systems usually require at least one",
      },
      {
        name: "name",
        required: false,
        note: "HumanName array",
      },
      {
        name: "qualification[]",
        required: false,
        note: "licenses and certifications with issuer and period",
      },
    ],
    versionNotes: {
      "R4B→R5": "communication now includes proficiency level",
    },
  },
  {
    resourceType: "PractitionerRole",
    category: "base",
    versions: ["R4", "R4B", "R5"],
    description: "Roles and specialties a practitioner is authorized to perform",
    maturityLevel: 2,
  },
  {
    resourceType: "Organization",
    category: "base",
    versions: ["R4", "R4B", "R5"],
    description: "A formally recognized grouping of people or organizations",
    maturityLevel: 3,
  },
  {
    resourceType: "Location",
    category: "base",
    versions: ["R4", "R4B", "R5"],
    description: "Physical place where services are provided",
    maturityLevel: 3,
  },
  {
    resourceType: "Endpoint",
    category: "base",
    versions: ["R4", "R4B", "R5"],
    description: "Technical connectivity details for a system",
    maturityLevel: 2,
  },
  {
    resourceType: "RelatedPerson",
    category: "base",
    versions: ["R4", "R4B", "R5"],
    description: "Person related to the patient",
    maturityLevel: 2,
  },
  {
    resourceType: "HealthcareService",
    category: "base",
    versions: ["R4", "R4B", "R5"],
    description: "Details of a healthcare service available at a location",
    maturityLevel: 2,
  },
  // clinical
  {
    resourceType: "Observation",
    category: "clinical",
    versions: ["R4", "R4B", "R5"],
    description: "Measurements and assertions about a patient or subject",
    maturityLevel: "N",
    useCases: [
      "Lab results: glucose, HbA1c, CBC panels, lipid panels",
      "Vital signs: blood pressure, heart rate, BMI, oxygen saturation",
      "Clinical scores, assessment findings, and survey answers",
    ],
    keyFields: [
      {
        name: "status",
        required: true,
        note: "registered|preliminary|final|amended|corrected|cancelled|entered-in-error|unknown",
      },
      {
        name: "code",
        required: true,
        note: "what was observed — LOINC (preferred), SNOMED, local codes",
      },
      {
        name: "subject",
        required: true,
        note: "usually Patient; can be Group, Device, or Location",
      },
      {
        name: "effective[x]",
        required: false,
        note: "when the observation was made — dateTime or Period",
      },
      {
        name: "value[x]",
        required: false,
        note: "the result — Quantity, CodeableConcept, string, boolean, integer, Range, Ratio, SampledData, time, dateTime, Period",
      },
      {
        name: "component[]",
        required: false,
        note: "for panel observations; each component has its own code + value[x] (e.g. systolic + diastolic for BP)",
      },
      {
        name: "referenceRange",
        required: false,
        note: "low/high bounds for interpreting Quantity values",
      },
    ],
    versionNotes: {
      "R4B→R5":
        "bodyStructure field added (replaces bodySite extension); subject broadens to support more reference targets; triggeredBy added for derived observations",
    },
  },
  {
    resourceType: "Condition",
    category: "clinical",
    versions: ["R4", "R4B", "R5"],
    description: "Detailed information about a clinical condition or diagnosis",
    maturityLevel: 3,
    useCases: [
      "Problem list entries: active chronic conditions",
      "Encounter diagnoses: the reason care was provided",
      "Past medical history and resolved conditions",
    ],
    keyFields: [
      {
        name: "clinicalStatus",
        required: false,
        note: "CodeableConcept — active|recurrence|relapse|inactive|remission|resolved",
      },
      {
        name: "verificationStatus",
        required: false,
        note: "CodeableConcept — unconfirmed|provisional|differential|confirmed|refuted|entered-in-error",
      },
      {
        name: "code",
        required: false,
        note: "the diagnosis (SNOMED, ICD-10, local) — surprisingly not required in base spec",
      },
      {
        name: "subject",
        required: true,
        note: "the patient",
      },
      {
        name: "onset[x]",
        required: false,
        note: "when the condition started — dateTime, Age, Period, Range, string",
      },
      {
        name: "abatement[x]",
        required: false,
        note: "when it resolved — same type choices as onset[x]",
      },
    ],
    versionNotes: {
      "R4B→R5":
        "participant added (who was involved); stage moved to backbone element; encounter reference added directly to resource",
    },
  },
  {
    resourceType: "Encounter",
    category: "clinical",
    versions: ["R4", "R4B", "R5"],
    description: "An interaction during which services are provided",
    maturityLevel: 2,
    useCases: [
      "Inpatient admission and discharge records",
      "Outpatient visits and office appointments",
      "Emergency department presentations",
    ],
    keyFields: [
      {
        name: "status",
        required: true,
        note: "R4/R4B: planned|arrived|triaged|in-progress|onleave|finished|cancelled|... R5: planned|in-progress|on-hold|discharged|completed|cancelled|...",
      },
      {
        name: "class",
        required: true,
        note: "R4/R4B: Coding (AMB=ambulatory, IMP=inpatient, EMER=emergency) R5: renamed to class and made CodeableConcept",
      },
      {
        name: "subject",
        required: true,
        note: "the patient",
      },
      {
        name: "period",
        required: false,
        note: "start and end datetime of the encounter",
      },
      {
        name: "participant[]",
        required: false,
        note: "practitioners involved (type + individual reference)",
      },
      {
        name: "diagnosis[]",
        required: false,
        note: "conditions and procedures linked to this encounter",
      },
    ],
    versionNotes: {
      "R4B→R5":
        "class changed from Coding to CodeableConcept (CodeableReference); status values reworked; hospitalization renamed to admission; reason now a CodeableReference instead of CodeableConcept",
    },
  },
  {
    resourceType: "Procedure",
    category: "clinical",
    versions: ["R4", "R4B", "R5"],
    description: "An action performed on or for a patient",
    maturityLevel: 3,
    useCases: [
      "Surgical procedures and interventions",
      "Therapeutic procedures (dialysis, chemotherapy, physical therapy)",
      "Diagnostic procedures (biopsy, colonoscopy)",
    ],
    keyFields: [
      {
        name: "status",
        required: true,
        note: "preparation|in-progress|not-done|on-hold|stopped|completed|entered-in-error|unknown",
      },
      {
        name: "code",
        required: false,
        note: "what was performed (SNOMED, CPT, local)",
      },
      {
        name: "subject",
        required: true,
        note: "the patient",
      },
      {
        name: "performed[x]",
        required: false,
        note: "when — dateTime, Period, string, Age, Range",
      },
      {
        name: "report[]",
        required: false,
        note: "linked DiagnosticReport results",
      },
    ],
    versionNotes: {
      "R4B→R5":
        "recorded field added; report made CodeableReference; performer uses new Actor type",
    },
  },
  {
    resourceType: "AllergyIntolerance",
    category: "clinical",
    versions: ["R4", "R4B", "R5"],
    description: "Allergy or intolerance and its clinical consequences",
    maturityLevel: 3,
    useCases: [
      "Medication allergies for prescribing safety checks",
      "Food and environmental allergen records",
      "Adverse reaction history",
    ],
    keyFields: [
      {
        name: "clinicalStatus",
        required: false,
        note: "CodeableConcept — active|inactive|resolved",
      },
      {
        name: "verificationStatus",
        required: false,
        note: "CodeableConcept — unconfirmed|confirmed|refuted|entered-in-error",
      },
      {
        name: "type",
        required: false,
        note: "allergy | intolerance",
      },
      {
        name: "code",
        required: false,
        note: "the allergen (RxNorm for drugs, SNOMED for substances)",
      },
      {
        name: "patient",
        required: true,
        note: "required (R4/R4B) renamed to subject in R5",
      },
      {
        name: "reaction[]",
        required: false,
        note: "manifestation descriptions and severity",
      },
    ],
    versionNotes: {
      "R4B→R5": "patient renamed to subject (breaking rename); participant added",
    },
  },
  {
    resourceType: "MedicationRequest",
    category: "clinical",
    versions: ["R4", "R4B", "R5"],
    description: "Order or request for a medication",
    maturityLevel: 3,
    useCases: [
      "Prescriptions from a prescriber to a pharmacy",
      "Medication orders within inpatient care",
      "Medication plans in chronic disease management",
    ],
    keyFields: [
      {
        name: "status",
        required: true,
        note: "active|on-hold|cancelled|completed|entered-in-error|stopped|draft|unknown",
      },
      {
        name: "intent",
        required: true,
        note: "proposal|plan|order|original-order|reflex-order|filler-order|instance-order|option",
      },
      {
        name: "medication[x]",
        required: true,
        note: "reference to Medication resource or CodeableConcept — R5 uses CodeableReference",
      },
      {
        name: "subject",
        required: true,
        note: "the patient",
      },
      {
        name: "authoredOn",
        required: false,
        note: "when the prescription was written",
      },
      {
        name: "dosageInstruction[]",
        required: false,
        note: "timing, route, dose — highly structured but verbose",
      },
    ],
    versionNotes: {
      "R4B→R5":
        "medication[x] changed to CodeableReference; statusChanged added; informationSource added; renderedDosageInstruction added (human-readable summary)",
    },
  },
  {
    resourceType: "MedicationStatement",
    category: "clinical",
    versions: ["R4", "R4B", "R5"],
    description: "Record of medication use",
    maturityLevel: 3,
  },
  {
    resourceType: "DiagnosticReport",
    category: "clinical",
    versions: ["R4", "R4B", "R5"],
    description: "Findings and interpretation of diagnostic investigations",
    maturityLevel: 3,
    useCases: [
      "Lab report: a set of Observation results with interpretation",
      "Radiology report: imaging study findings",
      "Pathology report: tissue examination results",
    ],
    keyFields: [
      {
        name: "status",
        required: true,
        note: "registered|partial|preliminary|final|amended|corrected|appended|cancelled|entered-in-error",
      },
      {
        name: "code",
        required: true,
        note: "the type of report (LOINC panel code, local code)",
      },
      {
        name: "subject",
        required: false,
        note: "the patient (technically optional in base spec)",
      },
      {
        name: "result[]",
        required: false,
        note: "references to Observation resources in the report",
      },
      {
        name: "conclusion",
        required: false,
        note: "free-text clinical interpretation",
      },
    ],
    versionNotes: {
      "R4B→R5":
        "study replaces imagingStudy; note added; composition added for structured reports",
    },
  },
  {
    resourceType: "Immunization",
    category: "clinical",
    versions: ["R4", "R4B", "R5"],
    description: "Immunization event record",
    maturityLevel: 3,
    useCases: [
      "Vaccination records for immunization history",
      "Reporting immunizations to public health registries",
      "Immunization forecasting input",
    ],
    keyFields: [
      {
        name: "status",
        required: true,
        note: "completed | entered-in-error | not-done",
      },
      {
        name: "vaccineCode",
        required: true,
        note: "the vaccine administered (CVX codes in US, SNOMED)",
      },
      {
        name: "patient",
        required: true,
        note: "the patient",
      },
      {
        name: "occurrence[x]",
        required: true,
        note: "when administered — dateTime or string",
      },
      {
        name: "lotNumber",
        required: false,
        note: "manufacturer lot for traceability",
      },
    ],
    versionNotes: {
      "R4B→R5":
        "informationSource added; basedOn added for linking to immunization recommendations",
    },
  },
  {
    resourceType: "CarePlan",
    category: "clinical",
    versions: ["R4", "R4B", "R5"],
    description: "Plan of care for a patient",
    maturityLevel: 2,
  },
  {
    resourceType: "CareTeam",
    category: "clinical",
    versions: ["R4", "R4B", "R5"],
    description: "Participants in coordinated care for a patient",
    maturityLevel: 2,
  },
  {
    resourceType: "ServiceRequest",
    category: "clinical",
    versions: ["R4", "R4B", "R5"],
    description: "Record of a request for a service",
    maturityLevel: 2,
    useCases: [
      "Referral from a GP to a specialist",
      "Lab test order (precedes DiagnosticReport)",
      "Imaging order (precedes ImagingStudy)",
    ],
    keyFields: [
      {
        name: "status",
        required: true,
        note: "draft|active|on-hold|revoked|completed|entered-in-error|unknown",
      },
      {
        name: "intent",
        required: true,
        note: "proposal|plan|directive|order|original-order|reflex-order|filler-order|instance-order|option",
      },
      {
        name: "code",
        required: false,
        note: "what is being requested",
      },
      {
        name: "subject",
        required: true,
        note: "the patient",
      },
      {
        name: "requester",
        required: false,
        note: "who is ordering",
      },
      {
        name: "performer[]",
        required: false,
        note: "who should fulfill the request",
      },
    ],
    versionNotes: {
      "R4B→R5": "code changed to CodeableReference; bodyStructure added; focus added",
    },
  },
  {
    resourceType: "DocumentReference",
    category: "clinical",
    versions: ["R4", "R4B", "R5"],
    description: "Reference to a document",
    maturityLevel: 3,
    useCases: [
      "Clinical notes (progress notes, discharge summaries, op reports)",
      "Scanned or external documents attached to a patient record",
      "CCDA and structured clinical documents",
    ],
    keyFields: [
      {
        name: "status",
        required: true,
        note: "current | superseded | entered-in-error",
      },
      {
        name: "type",
        required: false,
        note: "document type (LOINC document codes)",
      },
      {
        name: "subject",
        required: false,
        note: "the patient",
      },
      {
        name: "content[]",
        required: true,
        note: "the document itself — attachment with URL or base64 data",
      },
      {
        name: "context",
        required: false,
        note: "encounter, period, and clinical setting",
      },
    ],
    versionNotes: {
      "R4B→R5":
        "docStatus made more prominent; attester replaces author for formal attestation; version added; basedOn added",
    },
  },
  {
    resourceType: "Consent",
    category: "clinical",
    versions: ["R4", "R4B", "R5"],
    description: "Record of a consent decision",
    maturityLevel: 2,
  },
  {
    resourceType: "Goal",
    category: "clinical",
    versions: ["R4", "R4B", "R5"],
    description: "Desired outcome for a patient",
    maturityLevel: 2,
  },
  // financial
  {
    resourceType: "Claim",
    category: "financial",
    versions: ["R4", "R4B", "R5"],
    description: "Request for payment for products and/or services",
    maturityLevel: 2,
  },
  {
    resourceType: "Coverage",
    category: "financial",
    versions: ["R4", "R4B", "R5"],
    description: "Insurance or medical plan details",
    maturityLevel: 2,
    useCases: [
      "Insurance plan and subscriber information for claims processing",
      "Prior authorization eligibility checks",
      "Patient cost-sharing determination",
    ],
    keyFields: [
      {
        name: "status",
        required: true,
        note: "active | cancelled | draft | entered-in-error",
      },
      {
        name: "beneficiary",
        required: true,
        note: "the patient covered",
      },
      {
        name: "payor[]",
        required: true,
        note: "the insurance organization(s)",
      },
      {
        name: "class[]",
        required: false,
        note: "plan, group, and subgroup identifiers",
      },
    ],
    versionNotes: {
      "R4B→R5":
        "kind field added (insurance|self-pay|other); paymentBy added for cost-sharing parties",
    },
  },
  {
    resourceType: "ExplanationOfBenefit",
    category: "financial",
    versions: ["R4", "R4B", "R5"],
    description: "Processed claim adjudication details",
    maturityLevel: 2,
  },
  // specialized
  {
    resourceType: "Questionnaire",
    category: "specialized",
    versions: ["R4", "R4B", "R5"],
    description: "Structured set of questions",
    maturityLevel: 3,
  },
  {
    resourceType: "QuestionnaireResponse",
    category: "specialized",
    versions: ["R4", "R4B", "R5"],
    description: "Responses to a questionnaire",
    maturityLevel: 3,
  },
  {
    resourceType: "ResearchStudy",
    category: "specialized",
    versions: ["R4", "R4B", "R5"],
    description: "Investigation and analysis plan",
    maturityLevel: 1,
  },
  // conformance
  {
    resourceType: "CapabilityStatement",
    category: "conformance",
    versions: ["R4", "R4B", "R5"],
    description: "Server capability description",
    maturityLevel: "N",
  },
  {
    resourceType: "StructureDefinition",
    category: "conformance",
    versions: ["R4", "R4B", "R5"],
    description: "Definition of a FHIR structure (resource or data type)",
    maturityLevel: "N",
  },
  {
    resourceType: "ValueSet",
    category: "conformance",
    versions: ["R4", "R4B", "R5"],
    description: "Set of coded values",
    maturityLevel: "N",
  },
  {
    resourceType: "CodeSystem",
    category: "conformance",
    versions: ["R4", "R4B", "R5"],
    description: "Definition of a code system",
    maturityLevel: "N",
  },
];

/**
 * Looks up a resource type by name (case-sensitive, exact match).
 */
export function getResourceInfo(resourceType: string): ResourceTypeInfo | undefined {
  return RESOURCE_REGISTRY.find((r) => r.resourceType === resourceType);
}

/**
 * Builds the HL7 documentation URL for a resource type and version.
 * e.g. getResourceDocUrl("Patient", "R4") → "https://hl7.org/fhir/R4/patient.html"
 * Falls back to DEFAULT_FHIR_VERSION if version is not provided.
 */
export function getResourceDocUrl(resourceType: string, version?: FhirVersion): string {
  return `${fhirBaseUrl(version ?? DEFAULT_FHIR_VERSION)}/${resourceType.toLowerCase()}.html`;
}

/**
 * Returns true if the resource type is in the registry, optionally filtered by version.
 */
export function isKnownResourceType(resourceType: string, version?: FhirVersion): boolean {
  const info = getResourceInfo(resourceType);
  if (!info) return false;
  if (version === undefined) return true;
  return (info.versions as readonly string[]).includes(version);
}

/**
 * Returns all resource types, optionally filtered by version and/or category.
 */
export function listResourceTypes(filters?: {
  version?: FhirVersion;
  category?: ResourceCategory;
}): readonly ResourceTypeInfo[] {
  if (!filters) return RESOURCE_REGISTRY;
  return RESOURCE_REGISTRY.filter((r) => {
    if (filters.version !== undefined && !(r.versions as readonly string[]).includes(filters.version)) {
      return false;
    }
    if (filters.category !== undefined && r.category !== filters.category) {
      return false;
    }
    return true;
  });
}
