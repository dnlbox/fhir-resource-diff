import { describe, expect, it } from "vitest";
import { buildEnvelope } from "@/core/envelope.js";

describe("buildEnvelope", () => {
  it("includes tool, version, command, fhirVersion, timestamp", () => {
    const envelope = buildEnvelope("compare", "R4", { data: "test" });
    expect(envelope.tool).toBe("fhir-resource-diff");
    expect(envelope.command).toBe("compare");
    expect(envelope.fhirVersion).toBe("R4");
    expect(typeof envelope.version).toBe("string");
    expect(typeof envelope.timestamp).toBe("string");
  });

  it("timestamp is valid ISO 8601", () => {
    const envelope = buildEnvelope("validate", "R5", {});
    const date = new Date(envelope.timestamp);
    expect(date.toISOString()).toBe(envelope.timestamp);
  });

  it("wraps result payload", () => {
    const payload = { valid: true };
    const envelope = buildEnvelope("validate", "R4", payload);
    expect(envelope.result).toBe(payload);
  });
});
