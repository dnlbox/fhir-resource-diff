import type { Command } from "commander";
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
import { parseVersionFlag } from "@/cli/utils/resolve-version.js";
import { detectFhirVersion, resolveFhirVersion } from "@/core/fhir-version.js";
import { getResourceDocUrl } from "@/core/resource-registry.js";
import { summarizeDiff } from "@/core/summary.js";
import { buildEnvelope } from "@/core/envelope.js";

type OutputFormat = "text" | "json" | "markdown";

interface CompareOptions {
  format: OutputFormat;
  ignore?: string;
  preset?: string;
  normalize?: string;
  color: boolean;
  exitOnDiff: boolean;
  fhirVersion?: string;
  quiet: boolean;
  envelope: boolean;
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
    .option("--fhir-version <ver>", "FHIR version: R4 | R4B | R5 (default: auto-detect or R4)")
    .option("--quiet", "Suppress all stdout output. Only exit code indicates result.")
    .option("--envelope", "Wrap JSON output in a metadata envelope (requires --format json)")
    .action(async (fileA: string, fileB: string, opts: CompareOptions) => {
      if (fileA === "-" && fileB === "-") {
        process.stderr.write(
          "Error: cannot read both resources from stdin. Provide at least one file path.\n",
        );
        process.exit(2);
      }

      // 1. Read files
      const rawA = await readFileOrExit(fileA);
      const rawB = await readFileOrExit(fileB);

      // 2. Parse — exit(2) on failure
      let resourceA: FhirResource = parseOrExit(fileA, rawA);
      let resourceB: FhirResource = parseOrExit(fileB, rawB);

      // 3. Resolve FHIR version
      const explicitVersion = parseVersionFlag(opts.fhirVersion);
      const resolvedVersionA = resolveFhirVersion(explicitVersion, resourceA);
      void resolveFhirVersion(explicitVersion, resourceB);

      if (explicitVersion === undefined) {
        const detectedA = detectFhirVersion(resourceA);
        const detectedB = detectFhirVersion(resourceB);
        if (detectedA !== undefined && detectedB !== undefined && detectedA !== detectedB) {
          process.stderr.write(
            `Warning: resources appear to be from different FHIR versions (${detectedA} vs ${detectedB})\n`,
          );
        }
      }

      // 4. Validate — warn but do not exit
      const validateVersion = explicitVersion !== undefined ? resolvedVersionA : undefined;
      const validA = validate(resourceA, validateVersion);
      if (!validA.valid) {
        process.stderr.write(`Warning: "${fileA}" has validation issues\n`);
      }

      const validB = validate(resourceB, validateVersion);
      if (!validB.valid) {
        process.stderr.write(`Warning: "${fileB}" has validation issues\n`);
      }

      // 5. Normalize if requested
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

      // 6. Build DiffOptions from --ignore and --preset
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

      // 7. Diff
      const result = diff(resourceA, resourceB, diffOptions);

      // 8. Resolve envelope flag — only valid with --format json
      let useEnvelope = opts.envelope;
      if (useEnvelope && opts.format !== "json") {
        process.stderr.write(
          "Warning: --envelope requires --format json. Ignoring --envelope.\n",
        );
        useEnvelope = false;
      }

      // 9. Format
      const colorsEnabled = opts.color && process.env["NO_COLOR"] === undefined;
      const format = opts.format;

      let output: string;
      if (format === "json") {
        if (useEnvelope) {
          const summary = summarizeDiff(result);
          const documentation = getResourceDocUrl(result.resourceType, resolvedVersionA);
          const envelopeResult = { ...result, summary, documentation };
          const envelope = buildEnvelope("compare", resolvedVersionA, envelopeResult);
          output = JSON.stringify(envelope, null, 2);
        } else {
          output = formatJson(result);
        }
      } else if (format === "markdown") {
        output = formatMarkdown(result);
      } else {
        // Default: text
        const textOutput = formatText(result);
        output = colorsEnabled ? applyColor(textOutput) : textOutput;
      }

      // 10. Write to stdout (suppressed when --quiet)
      if (!opts.quiet) {
        process.stdout.write(output + "\n");
      }

      // 11. Exit code
      if (opts.exitOnDiff && !result.identical) {
        process.exit(1);
      }
    });
}
