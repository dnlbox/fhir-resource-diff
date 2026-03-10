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
  [key: string]: unknown;
}

export type ParseResult =
  | { success: true; resource: FhirResource }
  | { success: false; error: string };

export interface ValidationError {
  /** Dot-notation path, e.g. "name[0].given" */
  path: string;
  message: string;
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
