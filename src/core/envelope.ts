import type { OutputEnvelope } from "@/core/types.js";
import { TOOL_VERSION } from "@/core/version.js";

/**
 * Wraps a result payload in the standard output envelope.
 * Browser-safe — reads version from a constant, not from filesystem.
 */
export function buildEnvelope<T>(
  command: string,
  fhirVersion: string,
  result: T,
): OutputEnvelope<T> {
  return {
    tool: "fhir-resource-diff",
    version: TOOL_VERSION,
    command,
    fhirVersion,
    timestamp: new Date().toISOString(),
    result,
  };
}
