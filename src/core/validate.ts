import { z } from "zod";
import type { FhirResource, ValidationError, ValidationResult } from "@/core/types.js";

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
 * Does not enforce FHIR-version-specific constraints.
 */
export function validate(resource: FhirResource): ValidationResult {
  const result = fhirResourceSchema.safeParse(resource);

  if (result.success) {
    return { valid: true };
  }

  const errors: ValidationError[] = result.error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));

  return { valid: false, errors };
}
