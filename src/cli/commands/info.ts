import type { Command } from "commander";
import { getResourceDocUrl, getResourceInfo } from "@/core/resource-registry.js";
import type { FhirVersion } from "@/core/fhir-version.js";
import { parseVersionFlag } from "@/cli/utils/resolve-version.js";

function buildTextOutput(resourceType: string, fhirVersion: FhirVersion | undefined): string {
  const info = getResourceInfo(resourceType);

  if (!info) {
    return [
      `Unknown resource type: "${resourceType}"`,
      "",
      "Run 'fhir-resource-diff list-resources' to see known types.",
      "Full resource list: https://hl7.org/fhir/resourcelist.html",
    ].join("\n");
  }

  const versionsToShow: readonly FhirVersion[] = fhirVersion ? [fhirVersion] : info.versions;
  const versionLine =
    fhirVersion
      ? `FHIR version: ${fhirVersion}`
      : `FHIR versions: ${info.versions.join(", ")}`;

  const docLines = versionsToShow.map((v) => {
    const label = `${v}:`.padEnd(5);
    return `  ${label} ${getResourceDocUrl(resourceType, v)}`;
  });

  return [
    `${info.resourceType} (${info.category})`,
    versionLine,
    info.description,
    "",
    "Documentation:",
    ...docLines,
  ].join("\n");
}

function buildJsonOutput(resourceType: string, fhirVersion: FhirVersion | undefined): string {
  const info = getResourceInfo(resourceType);

  if (!info) {
    return JSON.stringify(
      {
        error: "Unknown resource type",
        resourceType,
        help: "https://hl7.org/fhir/resourcelist.html",
      },
      null,
      2,
    );
  }

  const versionsToShow: readonly FhirVersion[] = fhirVersion ? [fhirVersion] : info.versions;
  const documentation: Record<string, string> = {};
  for (const v of versionsToShow) {
    documentation[v] = getResourceDocUrl(resourceType, v);
  }

  return JSON.stringify(
    {
      resourceType: info.resourceType,
      category: info.category,
      versions: fhirVersion ? [fhirVersion] : [...info.versions],
      description: info.description,
      documentation,
    },
    null,
    2,
  );
}

export function registerInfoCommand(program: Command): void {
  program
    .command("info <resourceType>")
    .description("Show metadata and HL7 documentation links for a FHIR resource type")
    .option("--fhir-version <ver>", "Show docs link for a specific version only (R4 | R4B | R5)")
    .option("--format <fmt>", "Output format: text | json", "text")
    .action((resourceType: string, opts: { fhirVersion?: string; format?: string }) => {
      const fhirVersion = parseVersionFlag(opts.fhirVersion);
      const format = opts.format ?? "text";

      const isKnown = getResourceInfo(resourceType) !== undefined;
      const exitCode = isKnown ? 0 : 2;

      let output: string;
      if (format === "json") {
        output = buildJsonOutput(resourceType, fhirVersion);
      } else {
        output = buildTextOutput(resourceType, fhirVersion);
      }

      process.stdout.write(output + "\n");
      process.exit(exitCode);
    });
}
