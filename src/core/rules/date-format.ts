import type { FhirResource, ValidationError } from "@/core/types.js";
import type { FhirVersion } from "@/core/fhir-version.js";
import type { ValidationRule } from "@/core/rules/index.js";
import { walkResource } from "@/core/rules/walk.js";

type DateFieldType = "date" | "dateTime" | "instant";

const FHIR_DATE_PATTERN = /^\d{4}(-\d{2}(-\d{2})?)?$/;
const FHIR_DATETIME_PATTERN =
  /^\d{4}(-\d{2}(-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2}))?)?)?$/;
const FHIR_INSTANT_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

const INSTANT_FIELD_NAMES = new Set(["lastUpdated", "issued", "recorded"]);
const DATETIME_FIELD_NAMES = new Set([
  "authoredOn",
  "occurrenceDateTime",
  "onsetDateTime",
  "abatementDateTime",
  "performedDateTime",
]);

function classifyDateField(key: string): DateFieldType | null {
  if (INSTANT_FIELD_NAMES.has(key)) return "instant";
  if (DATETIME_FIELD_NAMES.has(key) || key.endsWith("DateTime")) return "dateTime";
  if (key === "date" || key.endsWith("Date") || key.endsWith("date")) return "date";
  return null;
}

function patternFor(type: DateFieldType): RegExp {
  if (type === "instant") return FHIR_INSTANT_PATTERN;
  if (type === "dateTime") return FHIR_DATETIME_PATTERN;
  return FHIR_DATE_PATTERN;
}

function exampleFor(type: DateFieldType): string {
  if (type === "instant") return "e.g. 2024-03-15T10:30:00Z";
  if (type === "dateTime") return "e.g. 2024-03-15T10:30:00Z or 2024-03-15";
  return "e.g. 2024, 2024-03, or 2024-03-15";
}

/**
 * Validate `start` and `end` inside a FHIR Period object.
 * Called when the walker encounters a key ending with "Period" or the bare "period" key.
 */
function validatePeriodFields(
  period: Record<string, unknown>,
  path: string,
  findings: ValidationError[],
): void {
  for (const field of ["start", "end"] as const) {
    const value = period[field];
    if (typeof value !== "string") continue;
    if (!FHIR_DATETIME_PATTERN.test(value)) {
      findings.push({
        path: `${path}.${field}`,
        message: `Invalid FHIR dateTime '${value}' at '${path}.${field}': ${exampleFor("dateTime")}`,
        severity: "warning",
        ruleId: "fhir-date-format",
      });
    }
  }
}

export const dateFormatRule: ValidationRule = {
  id: "fhir-date-format",
  description: "FHIR date/dateTime/instant fields must follow the FHIR date format subset",

  check(resource: FhirResource, _version?: FhirVersion): ValidationError[] {
    const findings: ValidationError[] = [];

    walkResource(resource, (path, key, value) => {
      // Period objects: validate start and end as dateTime
      if (
        (key === "period" || key.endsWith("Period")) &&
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
      ) {
        validatePeriodFields(value as Record<string, unknown>, path, findings);
        return;
      }

      // Named date/dateTime/instant fields
      const fieldType = classifyDateField(key);
      if (fieldType === null) return;
      if (typeof value !== "string") return;
      if (!patternFor(fieldType).test(value)) {
        findings.push({
          path,
          message: `Invalid FHIR ${fieldType} '${value}' at '${path}': ${exampleFor(fieldType)}`,
          severity: "warning",
          ruleId: "fhir-date-format",
        });
      }
    });

    return findings;
  },
};
