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
} from "@/core/types.js";

export { parseJson, isFhirResource } from "@/core/parse.js";
export { validate } from "@/core/validate.js";
export { diff } from "@/core/diff.js";
export { classifyChange } from "@/core/classify.js";
export { normalize } from "@/core/normalize.js";

// Formatters are re-exported through core for library consumers
export {
  formatText,
  formatValidationText,
  formatJson,
  formatValidationJson,
  formatMarkdown,
} from "@/formatters/index.js";
