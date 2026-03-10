/** Minimum shape of any FHIR resource. */
export interface FhirResource {
  resourceType: string;
  id?: string;
  meta?: FhirMeta;
  [key: string]: unknown;
}

export interface FhirMeta {
  versionId?: string;
  lastUpdated?: string;
  fhirVersion?: string;
  [key: string]: unknown;
}

export type ParseResult =
  | { success: true; resource: FhirResource }
  | { success: false; error: string };

export type ValidationSeverity = "error" | "warning" | "info";

export interface ValidationError {
  /** Dot-notation path, e.g. "name[0].given" */
  path: string;
  message: string;
  severity: ValidationSeverity;
  /** Optional HL7 documentation link for context. */
  docUrl?: string;
}

export type ValidationResult =
  | { valid: true }
  | { valid: false; errors: ValidationError[] };

export type DiffChangeKind = "added" | "removed" | "changed" | "type-changed";

export interface DiffEntry {
  kind: DiffChangeKind;
  /** Dot-notation path to the changed value, e.g. "name[0].given[1]" */
  path: string;
  /** Value in the left (base) resource; absent for "added" */
  left?: unknown;
  /** Value in the right (target) resource; absent for "removed" */
  right?: unknown;
}

export interface DiffResult {
  resourceType: string;
  identical: boolean;
  entries: DiffEntry[];
}

export interface NormalizeOptions {
  sortObjectKeys?: boolean;
  trimStrings?: boolean;
  normalizeDates?: boolean;
  /** Dot-notation paths of arrays to sort before comparison. */
  sortArrayPaths?: string[];
}

export interface DiffOptions {
  /** Field paths to exclude from comparison. Dot-notation, supports wildcards: "meta.*" */
  ignorePaths?: string[];
  normalize?: NormalizeOptions;
}

export interface IgnorePreset {
  name: string;
  description: string;
  paths: string[];
}

export interface NormalizationPreset {
  name: string;
  description: string;
  options: NormalizeOptions;
}

export interface DiffSummary {
  added: number;
  removed: number;
  changed: number;
  typeChanged: number;
  total: number;
}

export interface OutputEnvelope<T> {
  /** Tool identifier — always "fhir-resource-diff". */
  tool: string;
  /** Tool version from package.json. */
  version: string;
  /** Command that produced this output. */
  command: string;
  /** Resolved FHIR version used for this operation. */
  fhirVersion: string;
  /** Timestamp of when the operation ran (ISO 8601). */
  timestamp: string;
  /** The actual result payload. */
  result: T;
}
