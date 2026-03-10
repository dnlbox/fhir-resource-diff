import { z } from "zod";
import type { FhirResource, ValidationError, ValidationResult } from "@/core/types.js";
import type { FhirVersion } from "@/core/fhir-version.js";
import { VERSION_STRING_MAP } from "@/core/fhir-version.js";
import { isKnownResourceType } from "@/core/resource-registry.js";

// Internal schema — not exported. Export only `validate`.
const fhirMetaSchema = z
  .object({
    versionId: z.string().optional(),
    lastUpdated: z.string().optional(),
  })
  .passthrough();

const fhirResourceSchema = z
  .object({
    resourceType: z.string().min(1, "resourceType must be a non-empty string"),
    id: z.string().optional(),
    meta: fhirMetaSchema.optional(),
  })
  .passthrough();

/**
 * Validates that a parsed FhirResource meets the minimum required shape.
 * Optionally runs version-aware checks when `version` is provided.
 */
export function validate(resource: FhirResource, version?: FhirVersion): ValidationResult {
  const result = fhirResourceSchema.safeParse(resource);

  const errors: ValidationError[] = [];

  if (!result.success) {
    for (const issue of result.error.issues) {
      errors.push({
        path: issue.path.join("."),
        message: issue.message,
        severity: "error",
      });
    }
  }

  if (version !== undefined) {
    // Unknown resourceType warning
    if (!isKnownResourceType(resource.resourceType, version)) {
      errors.push({
        path: "resourceType",
        message: `resourceType '${resource.resourceType}' is not in the known registry for ${version}. This may be valid — check https://hl7.org/fhir/resourcelist.html`,
        severity: "warning",
        docUrl: "https://hl7.org/fhir/resourcelist.html",
      });
    }

    // Version mismatch warning
    const metaRaw = resource.meta as Record<string, unknown> | undefined;
    const metaFhirVersion = metaRaw?.["fhirVersion"];
    if (typeof metaFhirVersion === "string") {
      const mappedVersion = VERSION_STRING_MAP.get(metaFhirVersion);
      if (mappedVersion !== version) {
        errors.push({
          path: "meta.fhirVersion",
          message: `meta.fhirVersion '${metaFhirVersion}' does not match expected version ${version}`,
          severity: "warning",
        });
      }
    }

    // R5 narrative info
    if (version === "R5") {
      const textRaw = resource["text"] as Record<string, unknown> | undefined;
      if (textRaw !== undefined && textRaw !== null && typeof textRaw === "object") {
        if ("status" in textRaw && !("div" in textRaw)) {
          errors.push({
            path: "text",
            message: "R5 recommends narrative text with a div element",
            severity: "info",
          });
        }
      }
    }

    // Full validation hint — always when version is provided
    errors.push({
      path: "",
      message:
        "For full FHIR schema validation, use the official HL7 FHIR Validator: https://confluence.hl7.org/display/FHIR/Using+the+FHIR+Validator",
      severity: "info",
      docUrl: "https://confluence.hl7.org/display/FHIR/Using+the+FHIR+Validator",
    });
  }

  if (errors.length === 0) {
    return { valid: true };
  }

  return { valid: false, errors };
}
