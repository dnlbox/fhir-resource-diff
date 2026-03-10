import { Command } from "commander";
import { parseJson } from "@/core/parse.js";
import { validate } from "@/core/validate.js";
import { formatValidationText } from "@/formatters/text.js";
import { formatValidationJson } from "@/formatters/json.js";
import { readFileOrExit } from "@/cli/utils/read-file.js";
import { parseVersionFlag } from "@/cli/utils/resolve-version.js";
import { resolveFhirVersion } from "@/core/fhir-version.js";

type OutputFormat = "text" | "json";

interface ValidateOptions {
  format: OutputFormat;
  fhirVersion?: string;
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
    .action((file: string, opts: ValidateOptions) => {
      // 1. Read file
      const raw = readFileOrExit(file);

      // 2. Parse — exit(2) on failure
      const parsed = parseJson(raw);
      if (!parsed.success) {
        process.stderr.write(`Error: "${file}" is not valid FHIR JSON: ${parsed.error}\n`);
        process.exit(2);
      }

      // 3. Resolve FHIR version (result will be used by spec 17 version-aware validation)
      const explicitVersion = parseVersionFlag(opts.fhirVersion);
      void resolveFhirVersion(explicitVersion, parsed.resource);

      // 4. Validate
      const result = validate(parsed.resource);

      // 5. Format
      const format = opts.format as OutputFormat;
      const output = format === "json"
        ? formatValidationJson(result)
        : formatValidationText(result);

      // 6. Write to stdout
      process.stdout.write(output + "\n");

      // 7. Exit: 0 if valid, 1 if invalid
      if (!result.valid) {
        process.exit(1);
      }
    });
}
