import {
  isSupportedFhirVersion,
  type FhirVersion,
} from "@/core/fhir-version.js";

/**
 * Parses and validates the --fhir-version CLI flag value.
 * Returns a FhirVersion if valid, undefined if the flag was not provided.
 * Writes an error to stderr and exits with code 2 if the value is invalid.
 */
export function parseVersionFlag(value: string | undefined): FhirVersion | undefined {
  if (value === undefined) return undefined;
  if (isSupportedFhirVersion(value)) return value;
  process.stderr.write(
    `Error: Unknown FHIR version "${value}". Supported: R4, R4B, R5\n`,
  );
  process.exit(2);
}
