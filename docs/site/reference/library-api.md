# Library API

`fhir-resource-diff` exports a browser-safe TypeScript API. The core library has no Node.js dependencies and works in React, Vite, Cloudflare Workers, and any bundler.

## Install

```bash
pnpm add fhir-resource-diff
```

## Main functions

### parseJson

Parse a raw JSON string into a typed FHIR resource.

```typescript
import { parseJson } from "fhir-resource-diff";

const result = parseJson(rawJsonString);

if (result.success) {
  // result.resource: FhirResource
} else {
  // result.error: string — parse error message
}
```

**Signature:**
```typescript
function parseJson(raw: string): ParseResult
```

**Returns:** `ParseResult` — `{ success: true; resource: FhirResource }` or `{ success: false; error: string }`

### validate

Validate a FHIR resource for format and structural correctness.

```typescript
import { parseJson, validate } from "fhir-resource-diff";

const parsed = parseJson(rawJson);
if (!parsed.success) throw new Error(parsed.error);

const result = validate(parsed.resource, "R4");

if (!result.valid) {
  const errors = result.errors.filter(e => e.severity === "error");
  console.log(errors);
}
```

**Signature:**
```typescript
function validate(resource: FhirResource, version?: FhirVersion): ValidationResult
```

**Returns:** `ValidationResult`

```typescript
type ValidationResult = {
  valid: boolean;
  errors: ValidationError[];
  hint: ValidationHint | null;
};

type ValidationError = {
  severity: "error" | "warning" | "info";
  path: string;         // dot-notation path to the problem field
  message: string;      // human-readable description
  ruleId: string;       // stable rule identifier
  docUrl?: string;      // HL7 spec URL when relevant
};

type ValidationHint = {
  message: string;
  url: string;
};
```

### diff

Compare two FHIR resources and return a structured diff.

```typescript
import { parseJson, diff } from "fhir-resource-diff";

const left = parseJson(rawA);
const right = parseJson(rawB);

if (left.success && right.success) {
  const result = diff(left.resource, right.resource, {
    ignorePaths: ["meta.lastUpdated", "id"],
  });

  if (!result.identical) {
    console.log(result.entries);   // DiffEntry[]
    console.log(result.summary);   // DiffSummary
  }
}
```

**Signature:**
```typescript
function diff(left: FhirResource, right: FhirResource, options?: DiffOptions): DiffResult
```

**Options:**
```typescript
type DiffOptions = {
  ignorePaths?: string[];        // dot-notation paths to exclude
  preset?: IgnorePreset;         // "metadata" | "clinical" | "strict"
};
```

**Returns:** `DiffResult`
```typescript
type DiffResult = {
  resourceType: string;
  identical: boolean;
  entries: DiffEntry[];
  summary: DiffSummary;
  documentation?: string;        // HL7 spec URL for the resource type
};

type DiffEntry = {
  path: string;                  // dot-notation path (e.g. "name[0].family")
  kind: DiffChangeKind;
  left?: unknown;                // value in left resource (changed/removed)
  right?: unknown;               // value in right resource (changed/added)
};

type DiffChangeKind = "added" | "removed" | "changed" | "type-changed";

type DiffSummary = {
  added: number;
  removed: number;
  changed: number;
  typeChanged: number;
  total: number;
};
```

### normalize

Normalize a FHIR resource to a canonical form.

```typescript
import { parseJson, normalize } from "fhir-resource-diff";

const parsed = parseJson(rawJson);
if (!parsed.success) throw new Error(parsed.error);

const normalized = normalize(parsed.resource, { preset: "canonical" });
```

**Signature:**
```typescript
function normalize(resource: FhirResource, options?: NormalizeOptions): FhirResource
```

**Options:**
```typescript
type NormalizeOptions = {
  preset?: NormalizationPreset;  // "canonical" | "none"
};
```

## Formatters

```typescript
import {
  formatText,
  formatValidationText,
  formatJson,
  formatValidationJson,
  formatMarkdown,
} from "fhir-resource-diff";

// Format a diff result as text
const text = formatText(diffResult);

// Format a diff result as JSON string
const json = formatJson(diffResult);

// Format a diff result as markdown
const md = formatMarkdown(diffResult);

// Format a validation result as text
const validationText = formatValidationText(validationResult);

// Format a validation result as JSON string
const validationJson = formatValidationJson(validationResult);
```

All formatters are browser-safe and return strings.

## Envelope

```typescript
import { buildEnvelope } from "fhir-resource-diff";

const envelope = buildEnvelope({
  command: "compare",
  fhirVersion: "R4",
  result: diffResult,
});
```

**Returns:** `OutputEnvelope`
```typescript
type OutputEnvelope = {
  tool: string;
  version: string;
  command: string;
  fhirVersion: string;
  timestamp: string;
  result: unknown;
};
```

## Core types

```typescript
import type {
  FhirResource,
  FhirMeta,
  FhirVersion,
  ParseResult,
  ValidationError,
  ValidationHint,
  ValidationResult,
  DiffChangeKind,
  DiffEntry,
  DiffResult,
  DiffSummary,
  DiffOptions,
  NormalizeOptions,
  IgnorePreset,
  NormalizationPreset,
  OutputEnvelope,
} from "fhir-resource-diff";
```

## Version utilities

```typescript
import {
  detectFhirVersion,
  resolveFhirVersion,
  fhirVersionLabel,
  fhirBaseUrl,
  isSupportedFhirVersion,
  SUPPORTED_FHIR_VERSIONS,
  DEFAULT_FHIR_VERSION,
} from "fhir-resource-diff";

// Detect version from a resource's meta.fhirVersion
const version = detectFhirVersion(resource);   // FhirVersion | undefined

// Resolve a string to a FhirVersion (throws on unknown)
const v = resolveFhirVersion("R4");   // "R4"

// Get the display label
fhirVersionLabel("R4");   // "R4 (4.0.1)"

// Get the base HL7 URL for a version
fhirBaseUrl("R4");   // "https://hl7.org/fhir/R4/"
```

## Resource registry

```typescript
import {
  getResourceInfo,
  getResourceDocUrl,
  isKnownResourceType,
  listResourceTypes,
  RESOURCE_REGISTRY,
} from "fhir-resource-diff";

// Look up a resource type
const info = getResourceInfo("Observation", "R4");
// { name: "Observation", category: "clinical", description: "...", versions: ["R4", "R4B", "R5"], documentation: {...} }

// Get the doc URL
const url = getResourceDocUrl("Patient", "R4");
// "https://hl7.org/fhir/R4/patient.html"

// Check if a type is known
isKnownResourceType("Patient", "R4");   // true
isKnownResourceType("Unknown", "R4");   // false

// List all types for a version
const types = listResourceTypes("R4");
```

## See also

- [Output formats](/reference/output-formats) — JSON structure details
- [Exit codes](/reference/exit-codes) — severity model
- [AI agents & automation](/guide/ai-agents) — programmatic usage patterns
