import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";

const cwd = process.cwd();

function runCli(args: string[]) {
  return spawnSync("node", ["--import", "tsx/esm", "src/cli/index.ts", ...args], {
    cwd,
    encoding: "utf-8",
    env: { ...process.env },
  });
}

describe("info command — text format", () => {
  it("shows Patient info with all version doc links", () => {
    const result = runCli(["info", "Patient"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Patient (base)");
    expect(result.stdout).toContain("Available in: R4 · R4B · R5");
    expect(result.stdout).toContain("Documentation:");
    expect(result.stdout).toContain("https://hl7.org/fhir/R4/patient.html");
    expect(result.stdout).toContain("https://hl7.org/fhir/R4B/patient.html");
    expect(result.stdout).toContain("https://hl7.org/fhir/R5/patient.html");
  });

  it("filters to specific version with --fhir-version", () => {
    const result = runCli(["info", "Patient", "--fhir-version", "R5"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("FHIR version: R5");
    expect(result.stdout).toContain("https://hl7.org/fhir/R5/patient.html");
    expect(result.stdout).not.toContain("R4B");
  });

  it("shows error for unknown resource type", () => {
    const result = runCli(["info", "NotARealType"]);
    expect(result.status).toBe(2);
    expect(result.stdout).toContain('Unknown resource type: "NotARealType"');
    expect(result.stdout).toContain("list-resources");
    expect(result.stdout).toContain("https://hl7.org/fhir/resourcelist.html");
  });

  it("errors on invalid --fhir-version", () => {
    const result = runCli(["info", "Patient", "--fhir-version", "INVALID"]);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain("Unknown FHIR version");
  });

  it("shows Normative star in header for Observation", () => {
    const result = runCli(["info", "Observation"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Observation (clinical) — Normative ★");
  });

  it("shows FMM number in header for Encounter", () => {
    const result = runCli(["info", "Encounter"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Encounter (clinical) — FMM 2");
  });

  it("shows use cases section for Observation", () => {
    const result = runCli(["info", "Observation"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Use cases:");
    expect(result.stdout).toContain("• Lab results");
    expect(result.stdout).toContain("• Vital signs");
  });

  it("skips use cases section for ResearchStudy (no curation)", () => {
    const result = runCli(["info", "ResearchStudy"]);
    expect(result.status).toBe(0);
    expect(result.stdout).not.toContain("Use cases:");
  });

  it("shows key fields section for Observation", () => {
    const result = runCli(["info", "Observation"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Key fields:");
    expect(result.stdout).toContain("status *");
    expect(result.stdout).toContain("value[x]");
  });

  it("marks required fields with * and optional fields without", () => {
    const result = runCli(["info", "Observation"]);
    expect(result.status).toBe(0);
    // status is required — should have *
    expect(result.stdout).toContain("status *");
    // effective[x] is not required — should not have * on the name
    expect(result.stdout).toContain("effective[x]");
    expect(result.stdout).not.toContain("effective[x] *");
  });

  it("skips key fields section for ResearchStudy (no curation)", () => {
    const result = runCli(["info", "ResearchStudy"]);
    expect(result.status).toBe(0);
    expect(result.stdout).not.toContain("Key fields:");
  });

  it("shows version notes when no --fhir-version specified", () => {
    const result = runCli(["info", "Observation"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Version notes:");
    expect(result.stdout).toContain("R4B → R5");
  });

  it("omits version notes when --fhir-version is specified", () => {
    const result = runCli(["info", "Observation", "--fhir-version", "R4"]);
    expect(result.status).toBe(0);
    expect(result.stdout).not.toContain("Version notes:");
  });

  it("shows maturity level for ResearchStudy (FMM 1) without use cases or key fields", () => {
    const result = runCli(["info", "ResearchStudy"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("— FMM 1");
    expect(result.stdout).not.toContain("Use cases:");
    expect(result.stdout).not.toContain("Key fields:");
  });
});

describe("info command — JSON format", () => {
  it("outputs valid JSON for known resource type", () => {
    const result = runCli(["info", "Patient", "--format", "json"]);
    expect(result.status).toBe(0);
    const parsed = JSON.parse(result.stdout) as Record<string, unknown>;
    expect(parsed.resourceType).toBe("Patient");
    expect(parsed.category).toBe("base");
    expect(parsed.versions).toContain("R4");
    expect(parsed.documentation).toBeDefined();
  });

  it("outputs error JSON for unknown type", () => {
    const result = runCli(["info", "FooBar", "--format", "json"]);
    expect(result.status).toBe(2);
    const parsed = JSON.parse(result.stdout) as Record<string, unknown>;
    expect(parsed.error).toBe("Unknown resource type");
    expect(parsed.resourceType).toBe("FooBar");
  });

  it("includes maturityLevel in JSON output", () => {
    const result = runCli(["info", "Observation", "--format", "json"]);
    expect(result.status).toBe(0);
    const parsed = JSON.parse(result.stdout) as Record<string, unknown>;
    expect(parsed.maturityLevel).toBe("N");
  });

  it("includes useCases in JSON output for curated resources", () => {
    const result = runCli(["info", "Observation", "--format", "json"]);
    expect(result.status).toBe(0);
    const parsed = JSON.parse(result.stdout) as Record<string, unknown>;
    expect(Array.isArray(parsed.useCases)).toBe(true);
    expect((parsed.useCases as string[]).length).toBeGreaterThan(0);
  });

  it("includes keyFields in JSON output for curated resources", () => {
    const result = runCli(["info", "Observation", "--format", "json"]);
    expect(result.status).toBe(0);
    const parsed = JSON.parse(result.stdout) as Record<string, unknown>;
    expect(Array.isArray(parsed.keyFields)).toBe(true);
    const keyFields = parsed.keyFields as Array<{ name: string; required: boolean; note: string }>;
    const statusField = keyFields.find((f) => f.name === "status");
    expect(statusField?.required).toBe(true);
  });

  it("includes versionNotes in JSON output when no --fhir-version", () => {
    const result = runCli(["info", "Observation", "--format", "json"]);
    expect(result.status).toBe(0);
    const parsed = JSON.parse(result.stdout) as Record<string, unknown>;
    expect(parsed.versionNotes).toBeDefined();
  });

  it("omits versionNotes from JSON output when --fhir-version is specified", () => {
    const result = runCli(["info", "Observation", "--fhir-version", "R4", "--format", "json"]);
    expect(result.status).toBe(0);
    const parsed = JSON.parse(result.stdout) as Record<string, unknown>;
    expect(parsed.versionNotes).toBeUndefined();
  });

  it("does not include useCases for minimally curated resources", () => {
    const result = runCli(["info", "ResearchStudy", "--format", "json"]);
    expect(result.status).toBe(0);
    const parsed = JSON.parse(result.stdout) as Record<string, unknown>;
    expect(parsed.useCases).toBeUndefined();
    expect(parsed.keyFields).toBeUndefined();
  });
});
