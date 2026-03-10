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

export type { FhirVersion } from "@/core/fhir-version.js";
export {
  SUPPORTED_FHIR_VERSIONS,
  DEFAULT_FHIR_VERSION,
  VERSION_STRING_MAP,
  detectFhirVersion,
  resolveFhirVersion,
  fhirVersionLabel,
  fhirBaseUrl,
  isSupportedFhirVersion,
} from "@/core/fhir-version.js";

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
