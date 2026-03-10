import type { FhirResource } from "@/core/types.js";

/** Supported FHIR release identifiers. */
export type FhirVersion = "R4" | "R4B" | "R5";

export const SUPPORTED_FHIR_VERSIONS: readonly FhirVersion[] = ["R4", "R4B", "R5"] as const;

export const DEFAULT_FHIR_VERSION: FhirVersion = "R4";

/**
 * Maps concrete FHIR version strings (as found in meta.fhirVersion or CapabilityStatement)
 * to the corresponding release identifier.
 */
export const VERSION_STRING_MAP: ReadonlyMap<string, FhirVersion> = new Map([
  ["4.0.0", "R4"],
  ["4.0.1", "R4"],
  ["4.3.0", "R4B"],
  ["4.3.0-snapshot1", "R4B"],
  ["5.0.0", "R5"],
  ["5.0.0-snapshot1", "R5"],
  ["5.0.0-ballot", "R5"],
]);

/**
 * Detects the FHIR version from a resource's meta.fhirVersion field.
 * Returns undefined if the field is absent or the version string is unrecognized.
 */
export function detectFhirVersion(resource: FhirResource): FhirVersion | undefined {
  const versionStr = resource.meta?.fhirVersion;
  if (typeof versionStr !== "string") return undefined;
  return VERSION_STRING_MAP.get(versionStr);
}

/**
 * Resolves a FHIR version from an explicit flag, auto-detection, or the default.
 * Priority: explicit > detected > default.
 */
export function resolveFhirVersion(
  explicit: FhirVersion | undefined,
  resource: FhirResource,
): FhirVersion {
  if (explicit !== undefined) return explicit;
  return detectFhirVersion(resource) ?? DEFAULT_FHIR_VERSION;
}

/**
 * Returns a human-readable label, e.g. "FHIR R4 (v4.0.1)".
 */
export function fhirVersionLabel(version: FhirVersion): string {
  const labels: Record<FhirVersion, string> = {
    R4: "FHIR R4 (v4.0.1)",
    R4B: "FHIR R4B (v4.3.0)",
    R5: "FHIR R5 (v5.0.0)",
  };
  return labels[version];
}

/**
 * Returns the base URL for the HL7 FHIR spec for the given version.
 * e.g. "https://hl7.org/fhir/R4"
 */
export function fhirBaseUrl(version: FhirVersion): string {
  return `https://hl7.org/fhir/${version}`;
}

/**
 * Validates that a string is a supported FhirVersion.
 * Useful for parsing CLI flags.
 */
export function isSupportedFhirVersion(value: string): value is FhirVersion {
  return (SUPPORTED_FHIR_VERSIONS as readonly string[]).includes(value);
}
