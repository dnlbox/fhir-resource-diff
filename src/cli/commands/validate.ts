import { Command } from "commander";
import { parseJson } from "@/core/parse.js";
import { validate } from "@/core/validate.js";
import { formatValidationText } from "@/formatters/text.js";
import { formatValidationJson } from "@/formatters/json.js";
import { readFileOrExit } from "@/cli/utils/read-file.js";

type OutputFormat = "text" | "json";

interface ValidateOptions {
  format: OutputFormat;
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
    .action((file: string, opts: ValidateOptions) => {
      // 1. Read file
      const raw = readFileOrExit(file);

      // 2. Parse — exit(2) on failure
      const parsed = parseJson(raw);
      if (!parsed.success) {
        process.stderr.write(`Error: "${file}" is not valid FHIR JSON: ${parsed.error}\n`);
        process.exit(2);
      }

      // 3. Validate
      const result = validate(parsed.resource);

      // 4. Format
      const format = opts.format as OutputFormat;
      const output = format === "json"
        ? formatValidationJson(result)
        : formatValidationText(result);

      // 5. Write to stdout
      process.stdout.write(output + "\n");

      // 6. Exit: 0 if valid, 1 if invalid
      if (!result.valid) {
        process.exit(1);
      }
    });
}
