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

type OutputFormat = "text" | "json";

interface ValidateOptions {
  format: OutputFormat;
  fhirVersion?: string;
  quiet: boolean;
  envelope: boolean;
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
    .action((file: string, opts: ValidateOptions) => {
      // 1. Read file
      const raw = readFileOrExit(file);

      // 2. Parse — exit(2) on failure
      const parsed = parseJson(raw);
      if (!parsed.success) {
        process.stderr.write(`Error: "${file}" is not valid FHIR JSON: ${parsed.error}\n`);
        process.exit(2);
      }

      // 3. Resolve FHIR version
      const explicitVersion = parseVersionFlag(opts.fhirVersion);
      const resolvedVersion = resolveFhirVersion(explicitVersion, parsed.resource);

      // 4. Validate (version-aware)
      const result = validate(parsed.resource, explicitVersion !== undefined ? resolvedVersion : undefined);

      // 5. Resolve envelope flag — only valid with --format json
      let useEnvelope = opts.envelope;
      if (useEnvelope && opts.format !== "json") {
        process.stderr.write(
          "Warning: --envelope requires --format json. Ignoring --envelope.\n",
        );
        useEnvelope = false;
      }

      // 6. Format
      const format = opts.format;
      let output: string;
      if (format === "json") {
        if (useEnvelope) {
          const documentation = getResourceDocUrl(parsed.resource.resourceType, resolvedVersion);
          const envelopeResult = { ...result, documentation };
          const envelope = buildEnvelope("validate", resolvedVersion, envelopeResult);
          output = JSON.stringify(envelope, null, 2);
        } else {
          output = formatValidationJson(result);
        }
      } else {
        output = formatValidationText(result);
      }

      // 7. Write to stdout (suppressed when --quiet)
      if (!opts.quiet) {
        process.stdout.write(output + "\n");
      }

      // 8. Exit: 1 if error-severity issues present, 0 otherwise
      const hasErrors = result.valid === false && result.errors.some((e) => e.severity === "error");
      process.exit(hasErrors ? 1 : 0);
    });
}
