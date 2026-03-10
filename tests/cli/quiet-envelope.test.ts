import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const cwd = join(import.meta.dirname, "../..");

function runCli(args: string[], input?: string) {
  return spawnSync(
    "node",
    ["--import", "tsx/esm", "src/cli/index.ts", ...args],
    {
      cwd,
      input,
      encoding: "utf-8",
      env: { ...process.env },
    },
  );
}

describe("--quiet flag", () => {
  it("suppresses stdout for compare", () => {
    const result = runCli([
      "compare",
      "examples/patient-a.json",
      "examples/patient-b.json",
      "--quiet",
    ]);
    expect(result.stdout).toBe("");
    expect(result.status).toBe(0);
  });

  it("suppresses stdout for validate", () => {
    const result = runCli(["validate", "examples/patient-a.json", "--quiet"]);
    expect(result.stdout).toBe("");
    expect(result.status).toBe(0);
  });

  it("suppresses stdout for normalize", () => {
    const result = runCli(["normalize", "examples/patient-a.json", "--quiet"]);
    expect(result.stdout).toBe("");
    expect(result.status).toBe(0);
  });

  it("--quiet + --exit-on-diff still sets correct exit code", () => {
    const result = runCli([
      "compare",
      "examples/patient-a.json",
      "examples/patient-b.json",
      "--exit-on-diff",
      "--quiet",
    ]);
    expect(result.stdout).toBe("");
    // patient-a and patient-b differ, so expect exit code 1
    expect(result.status).toBe(1);
  });

  it("does not suppress stderr when --quiet is set", () => {
    // Force a warning by using --fhir-version with mismatched resources via
    // validate on an empty-resourceType resource would hit stderr
    // Instead verify that a stderr warning still appears with --quiet
    const result = runCli([
      "compare",
      "examples/patient-a.json",
      "examples/patient-b.json",
      "--quiet",
      "--envelope",
    ]);
    // --envelope without --format json produces a stderr warning
    expect(result.stderr).toContain("--envelope");
    expect(result.stdout).toBe("");
  });
});

describe("--envelope flag", () => {
  it("wraps JSON output in envelope for compare", () => {
    const result = runCli([
      "compare",
      "examples/patient-a.json",
      "examples/patient-b.json",
      "--format",
      "json",
      "--envelope",
    ]);
    expect(result.status).toBe(0);
    const parsed = JSON.parse(result.stdout) as unknown;
    const env = parsed as Record<string, unknown>;
    expect(env["tool"]).toBe("fhir-resource-diff");
    expect(env["command"]).toBe("compare");
    expect(typeof env["fhirVersion"]).toBe("string");
    expect(typeof env["timestamp"]).toBe("string");
    expect(typeof env["version"]).toBe("string");
    expect(env["result"]).toBeDefined();
    const res = env["result"] as Record<string, unknown>;
    expect(res["summary"]).toBeDefined();
    const summary = res["summary"] as Record<string, unknown>;
    expect(typeof summary["total"]).toBe("number");
  });

  it("warns when --envelope used without --format json on compare", () => {
    const result = runCli([
      "compare",
      "examples/patient-a.json",
      "examples/patient-b.json",
      "--envelope",
    ]);
    expect(result.stderr).toContain("--envelope");
    // Still produces normal text output
    expect(result.stdout).not.toBe("");
  });

  it("wraps JSON output in envelope for validate", () => {
    const result = runCli([
      "validate",
      "examples/patient-a.json",
      "--format",
      "json",
      "--envelope",
    ]);
    expect(result.status).toBe(0);
    const parsed = JSON.parse(result.stdout) as unknown;
    const env = parsed as Record<string, unknown>;
    expect(env["tool"]).toBe("fhir-resource-diff");
    expect(env["command"]).toBe("validate");
    expect(typeof env["fhirVersion"]).toBe("string");
    expect(typeof env["timestamp"]).toBe("string");
    expect(env["result"]).toBeDefined();
  });

  it("warns when --envelope used without --format json on validate", () => {
    const result = runCli(["validate", "examples/patient-a.json", "--envelope"]);
    expect(result.stderr).toContain("--envelope");
    // Still produces normal text output
    expect(result.stdout).not.toBe("");
  });

  it("envelope timestamp is valid ISO 8601", () => {
    const result = runCli([
      "compare",
      "examples/patient-a.json",
      "examples/patient-b.json",
      "--format",
      "json",
      "--envelope",
    ]);
    const parsed = JSON.parse(result.stdout) as Record<string, unknown>;
    const timestamp = parsed["timestamp"] as string;
    const date = new Date(timestamp);
    expect(date.toISOString()).toBe(timestamp);
  });
});
