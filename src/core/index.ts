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
export { diff } from "./diff.js";
export { classifyChange } from "./classify.js";
export { normalize } from "./normalize.js";

// Formatters are re-exported through core for library consumers
export {
  formatText,
  formatValidationText,
  formatJson,
  formatValidationJson,
  formatMarkdown,
} from "../formatters/index.js";
