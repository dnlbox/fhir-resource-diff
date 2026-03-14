import { readFileSync } from "node:fs";
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

describe("stdin support — validate", () => {
  it("validates from stdin with - argument", () => {
    const patientJson = readFileSync(join(cwd, "examples/patient-a.json"), "utf-8");
    const result = runCli(["validate", "-"], patientJson);
    expect(result.stdout).toContain("valid");
    expect(result.status).toBe(0);
  });

  it("normalizes from stdin with - argument", () => {
    const patientJson = readFileSync(join(cwd, "examples/patient-a.json"), "utf-8");
    const result = runCli(["normalize", "-"], patientJson);
    expect(result.stdout).toContain("resourceType");
    expect(result.status).toBe(0);
  });
});

describe("stdin support — compare", () => {
  it("errors when both args are -", () => {
    const result = runCli(["compare", "-", "-"], "{}");
    expect(result.stderr).toContain("cannot read both resources from stdin");
    expect(result.status).toBe(2);
  });

  it("compares stdin against a file", () => {
    const patientB = readFileSync(join(cwd, "examples/patient-b.json"), "utf-8");
    const result = runCli(["compare", "-", "examples/patient-a.json"], patientB);
    expect(result.status).toBe(0);
  });
});

describe("readStdinSync", () => {
  it("rejects when stdin is a TTY", async () => {
    const { readStdinSync } = await import("@/cli/utils/read-stdin.js");
    const original = process.stdin.isTTY;
    Object.defineProperty(process.stdin, "isTTY", { value: true, configurable: true });
    await expect(readStdinSync()).rejects.toThrow("No input on stdin (stdin is a TTY)");
    Object.defineProperty(process.stdin, "isTTY", { value: original, configurable: true });
  });
});
