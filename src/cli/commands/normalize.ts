import type { Command } from "commander";
import { writeFileSync } from "node:fs";
import { parseJson } from "@/core/parse.js";
import { normalize } from "@/core/normalize.js";
import { getNormalizationPreset } from "@/presets/index.js";
import { readFileOrExit } from "@/cli/utils/read-file.js";
import { parseVersionFlag } from "@/cli/utils/resolve-version.js";
import { resolveFhirVersion } from "@/core/fhir-version.js";
import type { NormalizeStats } from "@/core/types.js";

const DEFAULT_PRESET_NAME = "canonical";

interface NormalizeOptions {
  preset: string;
  output?: string;
  fhirVersion?: string;
  quiet: boolean;
  summary: boolean;
}

function formatSummaryLine(stats: NormalizeStats): string {
  const parts: string[] = [];
  if (stats.keysSorted > 0) parts.push(`${stats.keysSorted} keys sorted`);
  if (stats.stringsTrimmed > 0) parts.push(`${stats.stringsTrimmed} strings trimmed`);
  if (stats.datesNormalized > 0) parts.push(`${stats.datesNormalized} dates normalized`);
  if (stats.arraysSorted > 0) parts.push(`${stats.arraysSorted} arrays sorted`);

  if (parts.length === 0) {
    return "↳ normalized: no changes (resource was already in canonical form)";
  }
  return `↳ normalized: ${parts.join(", ")}`;
}

/**
 * Registers the normalize command on the given Commander program.
 */
export function registerNormalizeCommand(program: Command): void {
  program
    .command("normalize <file>")
    .description(
      "Normalize a FHIR resource to canonical form — sorts object keys, trims whitespace, and standardizes date formats. Use before comparing resources from different sources to eliminate formatting noise.",
    )
    .option(
      "--preset <name>",
      `Named normalization preset (default: "${DEFAULT_PRESET_NAME}")`,
      DEFAULT_PRESET_NAME,
    )
    .option("--output <path>", "Write output to a file instead of stdout")
    .option("--fhir-version <ver>", "FHIR version: R4 | R4B | R5 (default: auto-detect or R4)")
    .option("--quiet", "Suppress all stdout output.")
    .option("--summary", "Print a one-line summary of what was changed to stderr")
    .action(async (file: string, opts: NormalizeOptions) => {
      // 1. Read file
      const raw = await readFileOrExit(file);

      // 2. Parse — exit(2) on failure
      const parsed = parseJson(raw);
      if (!parsed.success) {
        process.stderr.write(`Error: "${file}" is not valid FHIR JSON: ${parsed.error}\n`);
        process.exit(2);
      }

      // 3. Resolve FHIR version (result will be used by spec 17 version-aware validation)
      const explicitVersion = parseVersionFlag(opts.fhirVersion);
      void resolveFhirVersion(explicitVersion, parsed.resource);

      // 4. Look up normalization preset
      const presetName = opts.preset;
      const preset = getNormalizationPreset(presetName);
      if (preset === undefined) {
        process.stderr.write(
          `Error: Unknown normalization preset "${presetName}". Available: canonical, none\n`,
        );
        process.exit(2);
      }

      // 5. Normalize
      const { resource: normalized, stats } = normalize(parsed.resource, preset.options);

      // 6. Format as pretty-printed JSON
      const output = JSON.stringify(normalized, null, 2);

      // 7. Write to file or stdout (stdout suppressed when --quiet)
      if (opts.output !== undefined) {
        try {
          writeFileSync(opts.output, output + "\n", "utf-8");
        } catch (e) {
          process.stderr.write(
            `Error: Cannot write to "${opts.output}": ${e instanceof Error ? e.message : String(e)}\n`,
          );
          process.exit(2);
        }
      } else if (!opts.quiet) {
        process.stdout.write(output + "\n");
      }

      // 8. Optionally print summary to stderr
      if (opts.summary) {
        process.stderr.write(formatSummaryLine(stats) + "\n");
      }
    });
}
