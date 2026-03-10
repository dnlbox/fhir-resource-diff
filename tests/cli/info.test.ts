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
    expect(result.stdout).toContain("FHIR versions: R4, R4B, R5");
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
});
