import { describe, expect, it } from "vitest";
import { dateFormatRule } from "@/core/rules/date-format.js";

const check = (resource: Record<string, unknown>) =>
  dateFormatRule.check(resource as Parameters<typeof dateFormatRule.check>[0]);

describe("dateFormatRule — date fields", () => {
  it("passes for YYYY", () => {
    expect(check({ resourceType: "Patient", birthDate: "2024" })).toHaveLength(0);
  });

  it("passes for YYYY-MM", () => {
    expect(check({ resourceType: "Patient", birthDate: "2024-03" })).toHaveLength(0);
  });

  it("passes for YYYY-MM-DD", () => {
    expect(check({ resourceType: "Patient", birthDate: "1990-01-01" })).toHaveLength(0);
  });

  it("warns for US date format MM/DD/YYYY", () => {
    const findings = check({ resourceType: "Patient", birthDate: "01/15/1990" });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.path).toBe("birthDate");
    expect(findings[0]?.ruleId).toBe("fhir-date-format");
    expect(findings[0]?.severity).toBe("warning");
  });

  it("warns for slash-separated date", () => {
    const findings = check({ resourceType: "Patient", birthDate: "2024/03/15" });
    expect(findings).toHaveLength(1);
  });

  it("ignores non-string values on date fields", () => {
    expect(check({ resourceType: "Patient", birthDate: 19900101 })).toHaveLength(0);
  });
});

describe("dateFormatRule — dateTime fields", () => {
  it("passes for full dateTime with Z timezone", () => {
    expect(
      check({ resourceType: "Observation", effectiveDateTime: "2024-03-15T10:30:00Z" }),
    ).toHaveLength(0);
  });

  it("passes for dateTime with offset timezone", () => {
    expect(
      check({
        resourceType: "Observation",
        effectiveDateTime: "2024-03-15T10:30:00.000+05:30",
      }),
    ).toHaveLength(0);
  });

  it("passes for partial date in dateTime field", () => {
    expect(
      check({ resourceType: "Observation", effectiveDateTime: "2024-03-15" }),
    ).toHaveLength(0);
  });

  it("warns for dateTime with slash separators", () => {
    const findings = check({
      resourceType: "Observation",
      effectiveDateTime: "2024/03/15T10:30:00Z",
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.path).toBe("effectiveDateTime");
  });

  it("passes for authoredOn as dateTime", () => {
    expect(
      check({ resourceType: "MedicationRequest", authoredOn: "2024-03-15T10:30:00Z" }),
    ).toHaveLength(0);
  });
});

describe("dateFormatRule — instant fields", () => {
  it("passes for valid instant in meta.lastUpdated", () => {
    const resource = {
      resourceType: "Patient",
      meta: { lastUpdated: "2024-03-15T10:30:00.000Z" },
    };
    expect(check(resource)).toHaveLength(0);
  });

  it("passes for instant with offset timezone", () => {
    const resource = {
      resourceType: "Patient",
      meta: { lastUpdated: "2024-03-15T10:30:00+05:30" },
    };
    expect(check(resource)).toHaveLength(0);
  });

  it("warns for partial date in instant field", () => {
    const resource = {
      resourceType: "Patient",
      meta: { lastUpdated: "2024-03-15" },
    };
    const findings = check(resource);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.path).toBe("meta.lastUpdated");
    expect(findings[0]?.ruleId).toBe("fhir-date-format");
  });

  it("warns for issued field with invalid format", () => {
    const findings = check({ resourceType: "Observation", issued: "2024/03/15T10:00:00Z" });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.path).toBe("issued");
  });
});

describe("dateFormatRule — non-date fields", () => {
  it("does not check arbitrary string fields", () => {
    expect(
      check({ resourceType: "Patient", name: [{ family: "Smith" }] }),
    ).toHaveLength(0);
  });

  it("does not check fields with unrelated names", () => {
    expect(check({ resourceType: "Patient", active: true })).toHaveLength(0);
  });
});

describe("dateFormatRule — Period.start / Period.end", () => {
  it("passes for valid date in effectivePeriod.start", () => {
    const findings = check({
      resourceType: "Observation",
      effectivePeriod: { start: "2024-01-01", end: "2024-12-31" },
    });
    expect(findings).toHaveLength(0);
  });

  it("passes for valid dateTime in effectivePeriod.start", () => {
    const findings = check({
      resourceType: "Observation",
      effectivePeriod: { start: "2024-01-01T08:00:00Z" },
    });
    expect(findings).toHaveLength(0);
  });

  it("warns for invalid date in effectivePeriod.start", () => {
    const findings = check({
      resourceType: "Observation",
      effectivePeriod: { start: "not-a-date" },
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.path).toBe("effectivePeriod.start");
    expect(findings[0]?.ruleId).toBe("fhir-date-format");
    expect(findings[0]?.severity).toBe("warning");
    expect(findings[0]?.message).toContain("not-a-date");
  });

  it("warns for invalid date in effectivePeriod.end", () => {
    const findings = check({
      resourceType: "Observation",
      effectivePeriod: { start: "2024-01-01", end: "31/12/2024" },
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.path).toBe("effectivePeriod.end");
  });

  it("warns for invalid date in onsetPeriod.start (Condition)", () => {
    const findings = check({
      resourceType: "Condition",
      onsetPeriod: { start: "not-a-date" },
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.path).toBe("onsetPeriod.start");
  });

  it("warns for invalid date in performedPeriod.start (Procedure)", () => {
    const findings = check({
      resourceType: "Procedure",
      performedPeriod: { start: "not-a-date" },
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.path).toBe("performedPeriod.start");
  });

  it("warns for invalid date in bare period.start (Encounter)", () => {
    const findings = check({
      resourceType: "Encounter",
      period: { start: "not-a-date" },
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.path).toBe("period.start");
  });

  it("skips Period when start/end are absent (optional fields)", () => {
    const findings = check({
      resourceType: "Observation",
      effectivePeriod: {},
    });
    expect(findings).toHaveLength(0);
  });

  it("skips Period.start when value is not a string", () => {
    const findings = check({
      resourceType: "Observation",
      effectivePeriod: { start: 20240101 },
    });
    expect(findings).toHaveLength(0);
  });
});
