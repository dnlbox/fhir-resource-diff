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

describe("list-resources command — text format", () => {
  it("shows full list grouped by category", () => {
    const result = runCli(["list-resources"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("FHIR Resource Types");
    expect(result.stdout).toContain("foundation");
    expect(result.stdout).toContain("clinical");
    expect(result.stdout).toContain("Patient");
    expect(result.stdout).toContain("https://hl7.org/fhir/resourcelist.html");
  });

  it("filters by --fhir-version", () => {
    const result = runCli(["list-resources", "--fhir-version", "R5"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("R5");
    expect(result.stdout).toContain("Patient");
  });

  it("filters by --category", () => {
    const result = runCli(["list-resources", "--category", "clinical"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("clinical");
    expect(result.stdout).toContain("Observation");
    expect(result.stdout).not.toContain("Patient"); // Patient is base, not clinical
  });

  it("applies both filters", () => {
    const result = runCli(["list-resources", "--category", "clinical", "--fhir-version", "R4"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Observation");
  });

  it("includes footer link to HL7 resource list", () => {
    const result = runCli(["list-resources"]);
    expect(result.stdout).toContain("https://hl7.org/fhir/resourcelist.html");
  });

  it("total count in header matches actual results", () => {
    const result = runCli(["list-resources", "--format", "json"]);
    const parsed = JSON.parse(result.stdout) as { total: number; resources: unknown[] };
    expect(parsed.total).toBe(parsed.resources.length);
  });
});

describe("list-resources command — JSON format", () => {
  it("produces valid JSON with correct structure", () => {
    const result = runCli(["list-resources", "--format", "json"]);
    expect(result.status).toBe(0);
    const parsed = JSON.parse(result.stdout) as Record<string, unknown>;
    expect(typeof parsed.total).toBe("number");
    expect(Array.isArray(parsed.resources)).toBe(true);
    expect(parsed.filters).toBeDefined();
  });

  it("includes filters in JSON output", () => {
    const result = runCli(["list-resources", "--category", "clinical", "--format", "json"]);
    const parsed = JSON.parse(result.stdout) as { filters: Record<string, string>; resources: unknown[] };
    expect(parsed.filters.category).toBe("clinical");
  });
});

describe("list-resources command — validation", () => {
  it("errors on invalid --fhir-version", () => {
    const result = runCli(["list-resources", "--fhir-version", "INVALID"]);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain("Unknown FHIR version");
  });

  it("errors on invalid --category", () => {
    const result = runCli(["list-resources", "--category", "bogus"]);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain("Unknown category");
  });
});

// ---------------------------------------------------------------------------
// Spec 48 — --version flag conflict
// ---------------------------------------------------------------------------

describe("list-resources --version flag conflict (spec 48)", () => {
  it("does NOT silently print version number when --version R4 is passed", () => {
    const result = runCli(["list-resources", "--version", "R4"]);
    // Should NOT exit 0 silently printing a version string
    // Either errors (unknown option) or exits non-zero
    const stdout = result.stdout.trim();
    // The stdout should NOT look like a semver string alone
    const looksLikeVersion = /^\d+\.\d+\.\d+$/.test(stdout);
    expect(looksLikeVersion).toBe(false);
  });

  it("--fhir-version R4 still filters correctly", () => {
    const result = runCli(["list-resources", "--fhir-version", "R4"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("R4");
    expect(result.stdout).toContain("Patient");
  });
});
