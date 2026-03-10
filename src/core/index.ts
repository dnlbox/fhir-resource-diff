export type {
  FhirResource,
  FhirMeta,
  ParseResult,
  ValidationError,
  ValidationResult,
  DiffChangeKind,
  DiffEntry,
  DiffResult,
  NormalizeOptions,
  DiffOptions,
  IgnorePreset,
  NormalizationPreset,
} from "./types.js";

export { parseJson, isFhirResource } from "./parse.js";
export { validate } from "./validate.js";
