import type { Command } from "commander";
import { getResourceDocUrl, getResourceInfo } from "@/core/resource-registry.js";
import type { FhirVersion } from "@/core/fhir-version.js";
import { parseVersionFlag } from "@/cli/utils/resolve-version.js";

function buildMaturityLabel(maturityLevel: number | "N" | undefined): string {
  if (maturityLevel === undefined) return "";
  if (maturityLevel === "N") return " — Normative ★";
  return ` — FMM ${maturityLevel}`;
}

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
  const versionLine = fhirVersion
    ? `FHIR version: ${fhirVersion}`
    : `Available in: ${info.versions.join(" · ")}`;

  const lines: string[] = [];

  // Header
  lines.push(`${info.resourceType} (${info.category})${buildMaturityLabel(info.maturityLevel)}`);
  lines.push(versionLine);
  lines.push("");
  lines.push(info.description);

  // Use cases
  if (info.useCases && info.useCases.length > 0) {
    lines.push("");
    lines.push("Use cases:");
    for (const useCase of info.useCases) {
      lines.push(`  • ${useCase}`);
    }
  }

  // Key fields
  if (info.keyFields && info.keyFields.length > 0) {
    lines.push("");
    lines.push("Key fields:");
    // Calculate column width for field names (name + optional *)
    const nameColWidth = Math.max(...info.keyFields.map((f) => f.name.length + (f.required ? 2 : 0)));
    for (const field of info.keyFields) {
      const nameWithMarker = field.required ? `${field.name} *` : field.name;
      const paddedName = nameWithMarker.padEnd(nameColWidth);
      lines.push(`  ${paddedName}  ${field.note}`);
    }
  }

  // Version notes (only when no --fhir-version specified)
  if (!fhirVersion && info.versionNotes) {
    const r4ToR4b = info.versionNotes["R4→R4B"];
    const r4bToR5 = info.versionNotes["R4B→R5"];
    if (r4ToR4b !== undefined || r4bToR5 !== undefined) {
      lines.push("");
      lines.push("Version notes:");
      if (r4ToR4b !== undefined) {
        lines.push(`  R4 → R4B  ${r4ToR4b}`);
      }
      if (r4bToR5 !== undefined) {
        lines.push(`  R4B → R5  ${r4bToR5}`);
      }
    }
  }

  // Documentation
  const docLines = versionsToShow.map((v) => {
    const label = `${v}:`.padEnd(5);
    return `  ${label} ${getResourceDocUrl(resourceType, v)}`;
  });

  lines.push("");
  lines.push("Documentation:");
  lines.push(...docLines);

  return lines.join("\n");
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

  const output: Record<string, unknown> = {
    resourceType: info.resourceType,
    category: info.category,
    versions: fhirVersion ? [fhirVersion] : [...info.versions],
    description: info.description,
  };

  if (info.maturityLevel !== undefined) {
    output.maturityLevel = info.maturityLevel;
  }
  if (info.useCases !== undefined) {
    output.useCases = [...info.useCases];
  }
  if (info.keyFields !== undefined) {
    output.keyFields = info.keyFields.map((f) => ({ name: f.name, required: f.required, note: f.note }));
  }
  if (!fhirVersion && info.versionNotes !== undefined) {
    output.versionNotes = { ...info.versionNotes };
  }

  output.documentation = documentation;

  return JSON.stringify(output, null, 2);
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
