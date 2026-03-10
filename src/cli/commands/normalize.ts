import { Command } from "commander";
import { writeFileSync } from "node:fs";
import { parseJson } from "../../core/parse.js";
import { normalize } from "../../core/normalize.js";
import { getNormalizationPreset } from "../../presets/index.js";
import { readFileOrExit } from "../utils/read-file.js";

const DEFAULT_PRESET_NAME = "canonical";

interface NormalizeOptions {
  preset: string;
  output?: string;
}

/**
 * Registers the normalize command on the given Commander program.
 */
export function registerNormalizeCommand(program: Command): void {
  program
    .command("normalize <file>")
    .description("Normalize a FHIR JSON resource file and output the result")
    .option(
      "--preset <name>",
      `Named normalization preset (default: "${DEFAULT_PRESET_NAME}")`,
      DEFAULT_PRESET_NAME,
    )
    .option("--output <path>", "Write output to a file instead of stdout")
    .action((file: string, opts: NormalizeOptions) => {
      // 1. Read file
      const raw = readFileOrExit(file);

      // 2. Parse — exit(2) on failure
      const parsed = parseJson(raw);
      if (!parsed.success) {
        process.stderr.write(`Error: "${file}" is not valid FHIR JSON: ${parsed.error}\n`);
        process.exit(2);
      }

      // 3. Look up normalization preset
      const presetName = opts.preset;
      const preset = getNormalizationPreset(presetName);
      if (preset === undefined) {
        process.stderr.write(
          `Error: Unknown normalization preset "${presetName}". Available: canonical, none\n`,
        );
        process.exit(2);
      }

      // 4. Normalize
      const normalized = normalize(parsed.resource, preset.options);

      // 5. Format as pretty-printed JSON
      const output = JSON.stringify(normalized, null, 2);

      // 6. Write to file or stdout
      if (opts.output !== undefined) {
        try {
          writeFileSync(opts.output, output + "\n", "utf-8");
        } catch (e) {
          process.stderr.write(
            `Error: Cannot write to "${opts.output}": ${e instanceof Error ? e.message : String(e)}\n`,
          );
          process.exit(2);
        }
      } else {
        process.stdout.write(output + "\n");
      }
    });
}
