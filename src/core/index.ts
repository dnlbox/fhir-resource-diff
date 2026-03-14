export type {
  FhirResource,
  FhirMeta,
  ParseResult,
  ValidationError,
  ValidationHint,
  ValidationResult,
  DiffChangeKind,
  DiffEntry,
  DiffResult,
  NormalizeOptions,
  DiffOptions,
  IgnorePreset,
  NormalizationPreset,
  DiffSummary,
  OutputEnvelope,
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

export type { ResourceCategory, ResourceTypeInfo } from "@/core/resource-registry.js";
export {
  RESOURCE_REGISTRY,
  getResourceInfo,
  getResourceDocUrl,
  isKnownResourceType,
  listResourceTypes,
} from "@/core/resource-registry.js";

export { parseJson, isFhirResource } from "@/core/parse.js";
export { validate } from "@/core/validate.js";
export type { ValidationRule } from "@/core/rules/index.js";
export { FORMAT_RULES, runRules, walkResource } from "@/core/rules/index.js";
export { diff } from "@/core/diff.js";
export { classifyChange } from "@/core/classify.js";
export { normalize } from "@/core/normalize.js";
export { TOOL_VERSION } from "@/core/version.js";
export { summarizeDiff } from "@/core/summary.js";
export { buildEnvelope } from "@/core/envelope.js";

// Formatters are re-exported through core for library consumers
export {
  formatText,
  formatValidationText,
  formatJson,
  formatValidationJson,
  formatMarkdown,
} from "@/formatters/index.js";
