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
