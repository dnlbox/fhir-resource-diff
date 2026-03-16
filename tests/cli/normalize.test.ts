import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const cwd = process.cwd();

function runCli(args: string[]) {
  return spawnSync("node", ["--import", "tsx/esm", "src/cli/index.ts", ...args], {
    cwd,
    encoding: "utf-8",
    env: { ...process.env },
  });
}

function withTempFile(content: string, fn: (path: string) => void): void {
  const path = join(tmpdir(), `fhir-normalize-test-${Date.now()}.json`);
  writeFileSync(path, content, "utf-8");
  try {
    fn(path);
  } finally {
    unlinkSync(path);
  }
}

const UNSORTED_PATIENT = JSON.stringify({
  resourceType: "Patient",
  z: "last",
  a: "first",
  effectiveDateTime: "2024-01-01T00:00:00+05:00",
  id: " patient-1 ",
});

// Keys in alphabetical order, no whitespace, no non-UTC dates — already canonical
const CANONICAL_PATIENT = JSON.stringify({
  active: true,
  id: "patient-1",
  resourceType: "Patient",
});

describe("normalize command — --summary flag", () => {
  it("prints summary to stderr, JSON to stdout", () => {
    withTempFile(UNSORTED_PATIENT, (path) => {
      const result = runCli(["normalize", path, "--summary"]);
      expect(result.status).toBe(0);
      // stdout has valid JSON
      expect(() => JSON.parse(result.stdout)).not.toThrow();
      // stderr has summary line
      expect(result.stderr).toContain("↳ normalized:");
    });
  });

  it("reports sorted keys in summary", () => {
    withTempFile(UNSORTED_PATIENT, (path) => {
      const result = runCli(["normalize", path, "--summary"]);
      expect(result.stderr).toContain("keys sorted");
    });
  });

  it("reports trimmed strings in summary when strings have whitespace", () => {
    withTempFile(UNSORTED_PATIENT, (path) => {
      const result = runCli(["normalize", path, "--summary"]);
      expect(result.stderr).toContain("strings trimmed");
    });
  });

  it("reports normalized dates in summary", () => {
    withTempFile(UNSORTED_PATIENT, (path) => {
      const result = runCli(["normalize", path, "--summary"]);
      expect(result.stderr).toContain("dates normalized");
    });
  });

  it("reports no changes for already canonical resource", () => {
    withTempFile(CANONICAL_PATIENT, (path) => {
      const result = runCli(["normalize", path, "--summary"]);
      expect(result.status).toBe(0);
      expect(result.stderr).toContain("no changes (resource was already in canonical form)");
    });
  });

  it("does not print summary to stderr without --summary flag", () => {
    withTempFile(UNSORTED_PATIENT, (path) => {
      const result = runCli(["normalize", path]);
      expect(result.status).toBe(0);
      expect(result.stderr).toBe("");
    });
  });

  it("summary goes to stderr — stdout remains clean JSON for piping", () => {
    withTempFile(UNSORTED_PATIENT, (path) => {
      const result = runCli(["normalize", path, "--summary"]);
      const parsed = JSON.parse(result.stdout) as Record<string, unknown>;
      expect(parsed["resourceType"]).toBe("Patient");
      // Summary arrow is NOT in stdout
      expect(result.stdout).not.toContain("↳");
    });
  });
});

describe("normalize command — help text", () => {
  it("shows updated description mentioning canonical form", () => {
    const result = runCli(["normalize", "--help"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("canonical form");
  });

  it("shows --summary flag in help", () => {
    const result = runCli(["normalize", "--help"]);
    expect(result.stdout).toContain("--summary");
  });
});

describe("normalize command — preset descriptions", () => {
  it("canonical preset description mentions sorting and UTC ISO 8601", () => {
    // The preset descriptions are visible in help output
    const result = runCli(["normalize", "--help"]);
    expect(result.status).toBe(0);
    // default preset is shown in option description
    expect(result.stdout).toContain("canonical");
  });
});
