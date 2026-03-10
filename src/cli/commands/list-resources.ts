import type { Command } from "commander";
import {
  listResourceTypes,
  type ResourceCategory,
  type ResourceTypeInfo,
} from "@/core/resource-registry.js";
import { type FhirVersion } from "@/core/fhir-version.js";
import { parseVersionFlag } from "@/cli/utils/resolve-version.js";

const VALID_CATEGORIES: readonly ResourceCategory[] = [
  "foundation",
  "base",
  "clinical",
  "financial",
  "specialized",
  "conformance",
];

const CATEGORY_ORDER: readonly ResourceCategory[] = [
  "foundation",
  "base",
  "clinical",
  "financial",
  "specialized",
  "conformance",
];

const HL7_RESOURCE_LIST_URL = "https://hl7.org/fhir/resourcelist.html";
const RESOURCE_TYPE_COL_WIDTH = 24;

function buildTitle(
  fhirVersion: FhirVersion | undefined,
  category: ResourceCategory | undefined,
  total: number,
): string {
  const parts: string[] = [];
  if (category) parts.push(category);
  if (fhirVersion) parts.push(fhirVersion);
  const qualifier = parts.length > 0 ? ` — ${parts.join(", ")}` : "";
  return `FHIR Resource Types${qualifier} (${total} total)`;
}

function buildTextOutput(
  resources: readonly ResourceTypeInfo[],
  fhirVersion: FhirVersion | undefined,
  category: ResourceCategory | undefined,
): string {
  if (resources.length === 0) {
    return "No resource types match the given filters.";
  }

  const lines: string[] = [buildTitle(fhirVersion, category, resources.length), ""];

  if (category) {
    // No category headers — single category filter
    for (const r of resources) {
      lines.push(`  ${r.resourceType.padEnd(RESOURCE_TYPE_COL_WIDTH)}${r.description}`);
    }
  } else {
    // Group by category in order
    for (const cat of CATEGORY_ORDER) {
      const group = resources.filter((r) => r.category === cat);
      if (group.length === 0) continue;
      lines.push(cat);
      for (const r of group) {
        lines.push(`  ${r.resourceType.padEnd(RESOURCE_TYPE_COL_WIDTH)}${r.description}`);
      }
      lines.push("");
    }
  }

  lines.push(`Full resource list: ${HL7_RESOURCE_LIST_URL}`);
  return lines.join("\n");
}

function buildJsonOutput(
  resources: readonly ResourceTypeInfo[],
  fhirVersion: FhirVersion | undefined,
  category: ResourceCategory | undefined,
): string {
  const filters: Record<string, string> = {};
  if (fhirVersion) filters.fhirVersion = fhirVersion;
  if (category) filters.category = category;

  return JSON.stringify(
    {
      total: resources.length,
      filters,
      resources: resources.map((r) => ({
        resourceType: r.resourceType,
        category: r.category,
        versions: [...r.versions],
        description: r.description,
      })),
    },
    null,
    2,
  );
}

export function registerListResourcesCommand(program: Command): void {
  program
    .command("list-resources")
    .description(
      "List known FHIR resource types, optionally filtered by version and category",
    )
    .option(
      "--fhir-version <ver>",
      "Filter to resource types available in a specific version (R4 | R4B | R5)",
    )
    .option(
      "--category <cat>",
      "Filter by category (foundation | base | clinical | financial | specialized | conformance)",
    )
    .option("--format <fmt>", "Output format: text | json", "text")
    .action(
      (opts: { fhirVersion?: string; category?: string; format?: string }) => {
        const fhirVersion = parseVersionFlag(opts.fhirVersion);
        const format = opts.format ?? "text";

        let category: ResourceCategory | undefined;
        if (opts.category !== undefined) {
          if (!(VALID_CATEGORIES as readonly string[]).includes(opts.category)) {
            process.stderr.write(
              `Error: Unknown category "${opts.category}". Available: ${VALID_CATEGORIES.join(", ")}\n`,
            );
            process.exit(2);
          }
          category = opts.category as ResourceCategory;
        }

        const resources = listResourceTypes({
          ...(fhirVersion !== undefined && { version: fhirVersion }),
          ...(category !== undefined && { category }),
        });

        let output: string;
        if (format === "json") {
          output = buildJsonOutput(resources, fhirVersion, category);
        } else {
          output = buildTextOutput(resources, fhirVersion, category);
        }

        process.stdout.write(output + "\n");
      },
    );
}
