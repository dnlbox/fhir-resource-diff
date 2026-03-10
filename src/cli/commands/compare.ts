import { Command } from "commander";
import pc from "picocolors";
import { parseJson } from "@/core/parse.js";
import { validate } from "@/core/validate.js";
import { diff } from "@/core/diff.js";
import { normalize } from "@/core/normalize.js";
import { formatText } from "@/formatters/text.js";
import { formatJson } from "@/formatters/json.js";
import { formatMarkdown } from "@/formatters/markdown.js";
import {
  getIgnorePreset,
  getNormalizationPreset,
  mergeIgnorePresets,
} from "@/presets/index.js";
import type { DiffOptions, FhirResource } from "@/core/types.js";
import { readFileOrExit } from "@/cli/utils/read-file.js";

type OutputFormat = "text" | "json" | "markdown";

interface CompareOptions {
  format: OutputFormat;
  ignore?: string;
  preset?: string;
  normalize?: string;
  color: boolean;
  exitOnDiff: boolean;
}

const SECTION_HEADERS = new Set(["Changed:", "Added:", "Removed:", "Type-changed:"]);

/**
 * Apply color post-processing to text-format diff output.
 * Colorizes section headers, arrows, and added/removed lines.
 */
function applyColor(text: string): string {
  const lines = text.split("\n");
  let currentSection: string | null = null;
  const colored: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (SECTION_HEADERS.has(trimmed)) {
      currentSection = trimmed;
      colored.push(pc.yellow(line));
      continue;
    }

    // Empty lines reset section tracking
    if (trimmed === "") {
      currentSection = null;
      colored.push(line);
      continue;
    }

    // Dim the arrow in changed/type-changed lines
    let processed = line;
    if (line.includes(" \u2192 ")) {
      processed = line.replace(
        " \u2192 ",
        ` ${pc.dim("\u2192")} `,
      );
    }

    if (currentSection === "Added:") {
      colored.push(pc.green(processed));
    } else if (currentSection === "Removed:") {
      colored.push(pc.red(processed));
    } else {
      colored.push(processed);
    }
  }

  return colored.join("\n");
}

function parseOrExit(filePath: string, raw: string): FhirResource {
  const result = parseJson(raw);
  if (!result.success) {
    process.stderr.write(`Error: "${filePath}" is not valid FHIR JSON: ${result.error}\n`);
    process.exit(2);
  }
  return result.resource;
}

/**
 * Registers the compare command on the given Commander program.
 */
export function registerCompareCommand(program: Command): void {
  program
    .command("compare <file-a> <file-b>")
    .description("Compare two FHIR JSON resource files and report differences")
    .option(
      "--format <fmt>",
      'Output format: text | json | markdown (default: "text")',
      "text",
    )
    .option(
      "--ignore <paths>",
      "Comma-separated field paths to exclude from comparison",
    )
    .option("--preset <name>", "Named ignore preset (e.g. metadata, clinical, strict)")
    .option("--normalize <name>", "Named normalization preset to apply before diffing")
    .option("--no-color", "Disable color output")
    .option("--exit-on-diff", "Exit with code 1 if differences are found")
    .action((fileA: string, fileB: string, opts: CompareOptions) => {
      // 1. Read files
      const rawA = readFileOrExit(fileA);
      const rawB = readFileOrExit(fileB);

      // 2. Parse — exit(2) on failure
      let resourceA: FhirResource = parseOrExit(fileA, rawA);
      let resourceB: FhirResource = parseOrExit(fileB, rawB);

      // 3. Validate — warn but do not exit
      const validA = validate(resourceA);
      if (!validA.valid) {
        process.stderr.write(`Warning: "${fileA}" has validation issues\n`);
      }

      const validB = validate(resourceB);
      if (!validB.valid) {
        process.stderr.write(`Warning: "${fileB}" has validation issues\n`);
      }

      // 4. Normalize if requested
      if (opts.normalize !== undefined) {
        const normPreset = getNormalizationPreset(opts.normalize);
        if (normPreset === undefined) {
          process.stderr.write(
            `Error: Unknown normalization preset "${opts.normalize}". Available: canonical, none\n`,
          );
          process.exit(2);
        }
        resourceA = normalize(resourceA, normPreset.options);
        resourceB = normalize(resourceB, normPreset.options);
      }

      // 5. Build DiffOptions from --ignore and --preset
      let ignorePaths: string[] = [];

      if (opts.preset !== undefined) {
        const namedPreset = getIgnorePreset(opts.preset);
        if (namedPreset === undefined) {
          process.stderr.write(
            `Error: Unknown ignore preset "${opts.preset}". Available: metadata, clinical, strict\n`,
          );
          process.exit(2);
        }
        ignorePaths = mergeIgnorePresets(namedPreset);
      }

      if (opts.ignore !== undefined && opts.ignore.trim() !== "") {
        const manualPaths = opts.ignore.split(",").map((p) => p.trim()).filter((p) => p !== "");
        ignorePaths = Array.from(new Set([...ignorePaths, ...manualPaths]));
      }

      const diffOptions: DiffOptions = ignorePaths.length > 0
        ? { ignorePaths }
        : {};

      // 6. Diff
      const result = diff(resourceA, resourceB, diffOptions);

      // 7. Format
      const colorsEnabled = opts.color && process.env["NO_COLOR"] === undefined;
      const format = opts.format as OutputFormat;

      let output: string;
      if (format === "json") {
        output = formatJson(result);
      } else if (format === "markdown") {
        output = formatMarkdown(result);
      } else {
        // Default: text
        const textOutput = formatText(result);
        output = colorsEnabled ? applyColor(textOutput) : textOutput;
      }

      // 8. Write to stdout
      process.stdout.write(output + "\n");

      // 9. Exit code
      if (opts.exitOnDiff && !result.identical) {
        process.exit(1);
      }
    });
}
