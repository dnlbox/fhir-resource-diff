import type { FhirResource, ValidationError } from "@/core/types.js";
import type { FhirVersion } from "@/core/fhir-version.js";
import type { ValidationRule } from "@/core/rules/index.js";
import { walkResource } from "@/core/rules/walk.js";

const FHIR_ID_PATTERN = /^[A-Za-z0-9\-.]{1,64}$/;

export const idFormatRule: ValidationRule = {
  id: "fhir-id-format",
  description: "FHIR id values must match [A-Za-z0-9\\-.]{1,64}",

  check(resource: FhirResource, _version?: FhirVersion): ValidationError[] {
    const findings: ValidationError[] = [];

    walkResource(resource, (path, key, value) => {
      if (key !== "id") return;
      if (typeof value !== "string") return;
      if (!FHIR_ID_PATTERN.test(value)) {
        findings.push({
          path,
          message: `Invalid FHIR id '${value}': must match [A-Za-z0-9\\-.]{1,64}`,
          severity: "warning",
          ruleId: "fhir-id-format",
        });
      }
    });

    return findings;
  },
};
