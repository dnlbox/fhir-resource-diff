import { DEFAULT_FHIR_VERSION, fhirBaseUrl } from "@/core/fhir-version.js";
import type { FhirVersion } from "@/core/fhir-version.js";

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
  },
  {
    resourceType: "OperationOutcome",
    category: "foundation",
    versions: ["R4", "R4B", "R5"],
    description: "Collection of processing messages (errors, warnings, information)",
  },
  {
    resourceType: "Parameters",
    category: "foundation",
    versions: ["R4", "R4B", "R5"],
    description: "Operation request/response parameters",
  },
  {
    resourceType: "Binary",
    category: "foundation",
    versions: ["R4", "R4B", "R5"],
    description: "Raw binary content",
  },
  // base
  {
    resourceType: "Patient",
    category: "base",
    versions: ["R4", "R4B", "R5"],
    description: "Demographics and administrative information about an individual",
  },
  {
    resourceType: "Practitioner",
    category: "base",
    versions: ["R4", "R4B", "R5"],
    description: "A person with a formal responsibility in healthcare",
  },
  {
    resourceType: "PractitionerRole",
    category: "base",
    versions: ["R4", "R4B", "R5"],
    description: "Roles and specialties a practitioner is authorized to perform",
  },
  {
    resourceType: "Organization",
    category: "base",
    versions: ["R4", "R4B", "R5"],
    description: "A formally recognized grouping of people or organizations",
  },
  {
    resourceType: "Location",
    category: "base",
    versions: ["R4", "R4B", "R5"],
    description: "Physical place where services are provided",
  },
  {
    resourceType: "Endpoint",
    category: "base",
    versions: ["R4", "R4B", "R5"],
    description: "Technical connectivity details for a system",
  },
  {
    resourceType: "RelatedPerson",
    category: "base",
    versions: ["R4", "R4B", "R5"],
    description: "Person related to the patient",
  },
  {
    resourceType: "HealthcareService",
    category: "base",
    versions: ["R4", "R4B", "R5"],
    description: "Details of a healthcare service available at a location",
  },
  // clinical
  {
    resourceType: "Observation",
    category: "clinical",
    versions: ["R4", "R4B", "R5"],
    description: "Measurements and assertions about a patient or subject",
  },
  {
    resourceType: "Condition",
    category: "clinical",
    versions: ["R4", "R4B", "R5"],
    description: "Detailed information about a clinical condition or diagnosis",
  },
  {
    resourceType: "Encounter",
    category: "clinical",
    versions: ["R4", "R4B", "R5"],
    description: "An interaction during which services are provided",
  },
  {
    resourceType: "Procedure",
    category: "clinical",
    versions: ["R4", "R4B", "R5"],
    description: "An action performed on or for a patient",
  },
  {
    resourceType: "AllergyIntolerance",
    category: "clinical",
    versions: ["R4", "R4B", "R5"],
    description: "Allergy or intolerance and its clinical consequences",
  },
  {
    resourceType: "MedicationRequest",
    category: "clinical",
    versions: ["R4", "R4B", "R5"],
    description: "Order or request for a medication",
  },
  {
    resourceType: "MedicationStatement",
    category: "clinical",
    versions: ["R4", "R4B", "R5"],
    description: "Record of medication use",
  },
  {
    resourceType: "DiagnosticReport",
    category: "clinical",
    versions: ["R4", "R4B", "R5"],
    description: "Findings and interpretation of diagnostic investigations",
  },
  {
    resourceType: "Immunization",
    category: "clinical",
    versions: ["R4", "R4B", "R5"],
    description: "Immunization event record",
  },
  {
    resourceType: "CarePlan",
    category: "clinical",
    versions: ["R4", "R4B", "R5"],
    description: "Plan of care for a patient",
  },
  {
    resourceType: "CareTeam",
    category: "clinical",
    versions: ["R4", "R4B", "R5"],
    description: "Participants in coordinated care for a patient",
  },
  {
    resourceType: "ServiceRequest",
    category: "clinical",
    versions: ["R4", "R4B", "R5"],
    description: "Record of a request for a service",
  },
  {
    resourceType: "DocumentReference",
    category: "clinical",
    versions: ["R4", "R4B", "R5"],
    description: "Reference to a document",
  },
  {
    resourceType: "Consent",
    category: "clinical",
    versions: ["R4", "R4B", "R5"],
    description: "Record of a consent decision",
  },
  {
    resourceType: "Goal",
    category: "clinical",
    versions: ["R4", "R4B", "R5"],
    description: "Desired outcome for a patient",
  },
  // financial
  {
    resourceType: "Claim",
    category: "financial",
    versions: ["R4", "R4B", "R5"],
    description: "Request for payment for products and/or services",
  },
  {
    resourceType: "Coverage",
    category: "financial",
    versions: ["R4", "R4B", "R5"],
    description: "Insurance or medical plan details",
  },
  {
    resourceType: "ExplanationOfBenefit",
    category: "financial",
    versions: ["R4", "R4B", "R5"],
    description: "Processed claim adjudication details",
  },
  // specialized
  {
    resourceType: "Questionnaire",
    category: "specialized",
    versions: ["R4", "R4B", "R5"],
    description: "Structured set of questions",
  },
  {
    resourceType: "QuestionnaireResponse",
    category: "specialized",
    versions: ["R4", "R4B", "R5"],
    description: "Responses to a questionnaire",
  },
  {
    resourceType: "ResearchStudy",
    category: "specialized",
    versions: ["R4", "R4B", "R5"],
    description: "Investigation and analysis plan",
  },
  // conformance
  {
    resourceType: "CapabilityStatement",
    category: "conformance",
    versions: ["R4", "R4B", "R5"],
    description: "Server capability description",
  },
  {
    resourceType: "StructureDefinition",
    category: "conformance",
    versions: ["R4", "R4B", "R5"],
    description: "Definition of a FHIR structure (resource or data type)",
  },
  {
    resourceType: "ValueSet",
    category: "conformance",
    versions: ["R4", "R4B", "R5"],
    description: "Set of coded values",
  },
  {
    resourceType: "CodeSystem",
    category: "conformance",
    versions: ["R4", "R4B", "R5"],
    description: "Definition of a code system",
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
