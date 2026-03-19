import type { Command } from "commander";
import { parseJson } from "@/core/parse.js";
import { validate } from "@/core/validate.js";
import { formatValidationText } from "@/formatters/text.js";
import { formatValidationJson } from "@/formatters/json.js";
import { readFileOrExit } from "@/cli/utils/read-file.js";
import { parseVersionFlag } from "@/cli/utils/resolve-version.js";
import { resolveFhirVersion } from "@/core/fhir-version.js";
import { getResourceDocUrl } from "@/core/resource-registry.js";
import { buildEnvelope } from "@/core/envelope.js";
import { parseMultiResource } from "@/cli/utils/parse-multi-resource.js";
import type { FhirResource, ValidationResult } from "@/core/types.js";
import type { FhirVersion } from "@/core/fhir-version.js";

type OutputFormat = "text" | "json";

interface ValidateOptions {
  format: OutputFormat;
  fhirVersion?: string;
  quiet: boolean;
  envelope: boolean;
}

interface MultiEntry {
  index: number;
  resource: FhirResource;
  result: ValidationResult;
  resolvedVersion: FhirVersion;
}

function resourceLabel(resource: FhirResource): string {
  return resource.id !== undefined
    ? `${resource.resourceType}/${resource.id}`
    : `${resource.resourceType} (no id)`;
}

function isInvalid(result: ValidationResult): boolean {
  return result.valid === false && result.errors.some((e) => e.severity === "error");
}

function formatMultiText(entries: MultiEntry[]): string {
  const total = entries.length;
  const lines: string[] = [];
  let validCount = 0;
  let invalidCount = 0;

  for (const entry of entries) {
    lines.push(`[${entry.index}/${total}] ${resourceLabel(entry.resource)}`);
    lines.push(formatValidationText(entry.result));
    lines.push("");
    if (isInvalid(entry.result)) {
      invalidCount++;
    } else {
      validCount++;
    }
  }

  lines.push("---");
  lines.push(`${total} resources: ${validCount} valid, ${invalidCount} invalid`);
  return lines.join("\n");
}

function formatMultiJson(entries: MultiEntry[]): string {
  const output = entries.map((entry) => {
    const base = JSON.parse(formatValidationJson(entry.result)) as Record<string, unknown>;
    const resourceId =
      entry.resource.id !== undefined
        ? { resourceType: entry.resource.resourceType, id: entry.resource.id }
        : { resourceType: entry.resource.resourceType };
    return { index: entry.index, resource: resourceId, ...base };
  });
  return JSON.stringify(output, null, 2);
}

function runSingleResource(
  resource: FhirResource,
  explicitVersion: FhirVersion | undefined,
  opts: ValidateOptions,
  useEnvelope: boolean,
): void {
  const resolvedVersion = resolveFhirVersion(explicitVersion, resource);
  const result = validate(resource, explicitVersion !== undefined ? resolvedVersion : undefined);

  let output: string;
  if (opts.format === "json") {
    if (useEnvelope) {
      const documentation = getResourceDocUrl(resource.resourceType, resolvedVersion);
      const envelopeResult = { ...result, documentation };
      const envelope = buildEnvelope("validate", resolvedVersion, envelopeResult);
      output = JSON.stringify(envelope, null, 2);
    } else {
      output = formatValidationJson(result);
    }
  } else {
    output = formatValidationText(result);
  }

  if (!opts.quiet) {
    process.stdout.write(output + "\n");
  }

  process.exit(isInvalid(result) ? 1 : 0);
}

/**
 * Registers the validate command on the given Commander program.
 */
export function registerValidateCommand(program: Command): void {
  program
    .command("validate <file>")
    .description("Validate a FHIR JSON resource file")
    .option(
      "--format <fmt>",
      'Output format: text | json (default: "text")',
      "text",
    )
    .option("--fhir-version <ver>", "FHIR version: R4 | R4B | R5 (default: auto-detect or R4)")
    .option("--quiet", "Suppress all stdout output. Only exit code indicates result.")
    .option("--envelope", "Wrap JSON output in a metadata envelope (requires --format json)")
    .action(async (file: string, opts: ValidateOptions) => {
      // 1. Read file
      const raw = await readFileOrExit(file);

      // 2. Resolve common options
      const explicitVersion = parseVersionFlag(opts.fhirVersion);
      let useEnvelope = opts.envelope;
      if (useEnvelope && opts.format !== "json") {
        process.stderr.write(
          "Warning: --envelope requires --format json. Ignoring --envelope.\n",
        );
        useEnvelope = false;
      }

      // 3. Multi-resource path — stdin only
      if (file === "-") {
        const multiResult = parseMultiResource(raw);
        if (!multiResult.success) {
          process.stderr.write(
            `Error: stdin input is not valid FHIR JSON: ${multiResult.error}\n`,
          );
          process.exit(2);
        }

        const { resources } = multiResult;

        if (resources.length === 0) {
          if (!opts.quiet) process.stdout.write("0 resources validated\n");
          process.exit(0);
        }

        if (resources.length === 1) {
          runSingleResource(resources[0]!, explicitVersion, opts, useEnvelope);
          return;
        }

        // Multiple resources
        const entries: MultiEntry[] = resources.map((resource, i) => {
          const resolvedVersion = resolveFhirVersion(explicitVersion, resource);
          const result = validate(
            resource,
            explicitVersion !== undefined ? resolvedVersion : undefined,
          );
          return { index: i + 1, resource, result, resolvedVersion };
        });

        const hasAnyErrors = entries.some((entry) => isInvalid(entry.result));

        if (!opts.quiet) {
          let output: string;
          if (opts.format === "json") {
            const jsonOutput = formatMultiJson(entries);
            if (useEnvelope) {
              const parsed = JSON.parse(jsonOutput) as unknown;
              const envelope = buildEnvelope("validate", entries[0]!.resolvedVersion, parsed);
              output = JSON.stringify(envelope, null, 2);
            } else {
              output = jsonOutput;
            }
          } else {
            output = formatMultiText(entries);
          }
          process.stdout.write(output + "\n");
        }

        process.exit(hasAnyErrors ? 1 : 0);
        return;
      }

      // 4. Single-resource path — file input
      const parsed = parseJson(raw);
      if (!parsed.success) {
        process.stderr.write(`Error: "${file}" is not valid FHIR JSON: ${parsed.error}\n`);
        process.exit(2);
      }

      runSingleResource(parsed.resource, explicitVersion, opts, useEnvelope);
    });
}
