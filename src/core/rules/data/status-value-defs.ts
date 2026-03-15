import type { FhirVersion } from "@/core/fhir-version.js";

export interface StatusValueDef {
  /** The field path, e.g. "status" or "clinicalStatus.coding[].code". */
  field: string;
  /** Allowed values. */
  values: readonly string[];
  /** Which versions use this value set. If omitted, all versions. */
  versions?: readonly FhirVersion[];
}

export type StatusValueMap = Record<string, readonly StatusValueDef[]>;

/**
 * Curated status value sets for the top FHIR resource types.
 * These are required bindings — the spec does not allow other values.
 * Fields absent from a resource are not checked (required-fields rule handles that).
 */
export const STATUS_VALUES: StatusValueMap = {
  Observation: [
    {
      field: "status",
      values: [
        "registered",
        "preliminary",
        "final",
        "amended",
        "corrected",
        "cancelled",
        "entered-in-error",
        "unknown",
      ],
    },
  ],
  Condition: [
    {
      field: "clinicalStatus.coding[].code",
      values: ["active", "recurrence", "relapse", "inactive", "remission", "resolved"],
    },
    {
      field: "verificationStatus.coding[].code",
      values: [
        "unconfirmed",
        "provisional",
        "differential",
        "confirmed",
        "refuted",
        "entered-in-error",
      ],
    },
  ],
  Procedure: [
    {
      field: "status",
      values: [
        "preparation",
        "in-progress",
        "not-done",
        "on-hold",
        "stopped",
        "completed",
        "entered-in-error",
        "unknown",
      ],
    },
  ],
  MedicationRequest: [
    {
      field: "status",
      values: [
        "active",
        "on-hold",
        "ended",
        "cancelled",
        "completed",
        "entered-in-error",
        "stopped",
        "draft",
        "unknown",
      ],
    },
    {
      field: "intent",
      values: [
        "proposal",
        "plan",
        "order",
        "original-order",
        "reflex-order",
        "filler-order",
        "instance-order",
        "option",
      ],
    },
  ],
  DiagnosticReport: [
    {
      field: "status",
      values: [
        "registered",
        "partial",
        "preliminary",
        "modified",
        "final",
        "amended",
        "corrected",
        "appended",
        "cancelled",
        "entered-in-error",
        "unknown",
      ],
    },
  ],
  Encounter: [
    {
      field: "status",
      values: [
        "planned",
        "arrived",
        "triaged",
        "in-progress",
        "onleave",
        "finished",
        "cancelled",
        "entered-in-error",
        "unknown",
      ],
      versions: ["R4", "R4B"],
    },
    {
      field: "status",
      values: [
        "planned",
        "in-progress",
        "on-hold",
        "discharged",
        "completed",
        "cancelled",
        "discontinued",
        "entered-in-error",
        "unknown",
      ],
      versions: ["R5"],
    },
  ],
  Bundle: [
    {
      field: "type",
      values: [
        "document",
        "message",
        "transaction",
        "transaction-response",
        "batch",
        "batch-response",
        "history",
        "searchset",
        "collection",
        "subscription-notification",
      ],
    },
  ],
  AllergyIntolerance: [
    {
      field: "clinicalStatus.coding[].code",
      values: ["active", "inactive", "resolved"],
    },
    {
      field: "verificationStatus.coding[].code",
      values: ["unconfirmed", "confirmed", "refuted", "entered-in-error"],
    },
  ],
  CarePlan: [
    {
      field: "status",
      values: [
        "draft",
        "active",
        "on-hold",
        "revoked",
        "completed",
        "entered-in-error",
        "unknown",
      ],
    },
    {
      field: "intent",
      values: ["proposal", "plan", "order", "option", "directive"],
    },
  ],
  ServiceRequest: [
    {
      field: "status",
      values: [
        "draft",
        "active",
        "on-hold",
        "revoked",
        "completed",
        "entered-in-error",
        "unknown",
      ],
    },
    {
      field: "intent",
      values: [
        "proposal",
        "plan",
        "directive",
        "order",
        "original-order",
        "reflex-order",
        "filler-order",
        "instance-order",
        "option",
      ],
    },
  ],
  DocumentReference: [
    {
      field: "status",
      values: ["current", "superseded", "entered-in-error"],
    },
  ],
  Immunization: [
    {
      field: "status",
      values: ["completed", "entered-in-error", "not-done"],
    },
  ],
  Coverage: [
    {
      field: "status",
      values: ["active", "cancelled", "draft", "entered-in-error"],
    },
  ],
  Claim: [
    {
      field: "status",
      values: ["active", "cancelled", "draft", "entered-in-error"],
    },
  ],
  ExplanationOfBenefit: [
    {
      field: "status",
      values: ["active", "cancelled", "draft", "entered-in-error"],
    },
    {
      field: "outcome",
      values: ["queued", "complete", "error", "partial"],
    },
  ],
};
