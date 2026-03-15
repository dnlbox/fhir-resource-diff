import type { FhirVersion } from "@/core/fhir-version.js";

export interface RequiredFieldDef {
  /** Dot path from resource root, e.g. "status", "code". */
  field: string;
  /** Human-readable label for error messages. */
  label: string;
  /** Which versions require this field. If omitted, all versions. */
  versions?: readonly FhirVersion[];
}

/** Keyed by resourceType. */
export type RequiredFieldMap = Record<string, readonly RequiredFieldDef[]>;

/**
 * Curated required fields for the top ~20 FHIR resource types.
 * These are fields marked as 1..1 or 1..* in the FHIR spec.
 * Resources not in this map are not checked (no false positives for unknown types).
 */
export const REQUIRED_FIELDS: RequiredFieldMap = {
  Observation: [
    { field: "status", label: "status" },
    { field: "code", label: "code" },
  ],
  Condition: [
    { field: "subject", label: "subject" },
  ],
  Procedure: [
    { field: "status", label: "status" },
    { field: "subject", label: "subject" },
  ],
  MedicationRequest: [
    { field: "status", label: "status" },
    { field: "intent", label: "intent" },
    { field: "subject", label: "subject" },
  ],
  MedicationAdministration: [
    { field: "status", label: "status" },
    { field: "subject", label: "subject" },
  ],
  MedicationStatement: [
    { field: "status", label: "status" },
    { field: "subject", label: "subject" },
  ],
  DiagnosticReport: [
    { field: "status", label: "status" },
    { field: "code", label: "code" },
  ],
  Encounter: [
    { field: "status", label: "status", versions: ["R4", "R4B"] },
    { field: "class", label: "class", versions: ["R4", "R4B"] },
  ],
  AllergyIntolerance: [
    { field: "patient", label: "patient", versions: ["R4", "R4B"] },
    { field: "subject", label: "subject", versions: ["R5"] },
  ],
  Immunization: [
    { field: "status", label: "status" },
    { field: "vaccineCode", label: "vaccineCode" },
    { field: "patient", label: "patient" },
  ],
  CarePlan: [
    { field: "status", label: "status" },
    { field: "intent", label: "intent" },
    { field: "subject", label: "subject" },
  ],
  ServiceRequest: [
    { field: "status", label: "status" },
    { field: "intent", label: "intent" },
    { field: "subject", label: "subject" },
  ],
  Bundle: [
    { field: "type", label: "type" },
  ],
  Composition: [
    { field: "status", label: "status" },
    { field: "type", label: "type" },
    { field: "date", label: "date" },
    { field: "author", label: "author" },
  ],
  DocumentReference: [
    { field: "status", label: "status" },
    { field: "content", label: "content" },
  ],
  Claim: [
    { field: "status", label: "status" },
    { field: "type", label: "type" },
    { field: "use", label: "use" },
    { field: "patient", label: "patient" },
    { field: "provider", label: "provider" },
  ],
  ExplanationOfBenefit: [
    { field: "status", label: "status" },
    { field: "type", label: "type" },
    { field: "use", label: "use" },
    { field: "patient", label: "patient" },
    { field: "provider", label: "provider" },
    { field: "insurer", label: "insurer" },
    { field: "outcome", label: "outcome" },
  ],
  Coverage: [
    { field: "status", label: "status" },
    { field: "beneficiary", label: "beneficiary" },
  ],
  // Organization, Patient, Practitioner — nothing truly required beyond resourceType
  Organization: [],
  Patient: [],
  Practitioner: [],
};
