import { describe, expect, it } from "vitest";
import { profileAwareRule } from "@/core/rules/profile-aware.js";
import type { FhirResource } from "@/core/types.js";

const RULE_ID = "fhir-profile-aware";

function resource(meta?: Record<string, unknown>): FhirResource {
  return { resourceType: "Patient", id: "p1", ...(meta ? { meta } : {}) };
}

describe("profileAwareRule — no profile declared", () => {
  it("returns no findings when meta is absent", () => {
    const findings = profileAwareRule.check(resource());
    expect(findings).toHaveLength(0);
  });

  it("returns no findings when meta.profile is absent", () => {
    const findings = profileAwareRule.check(resource({ versionId: "1" }));
    expect(findings).toHaveLength(0);
  });

  it("returns no findings when meta.profile is an empty array", () => {
    const findings = profileAwareRule.check(resource({ profile: [] }));
    expect(findings).toHaveLength(0);
  });

  it("returns no findings when meta.profile is not an array", () => {
    const findings = profileAwareRule.check(
      resource({ profile: "http://hl7.org/fhir/StructureDefinition/vitalsigns" }),
    );
    expect(findings).toHaveLength(0);
  });
});

describe("profileAwareRule — exact match", () => {
  it("emits info for vitalsigns exact match", () => {
    const findings = profileAwareRule.check(
      resource({ profile: ["http://hl7.org/fhir/StructureDefinition/vitalsigns"] }),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("info");
    expect(findings[0]?.path).toBe("meta.profile[0]");
    expect(findings[0]?.ruleId).toBe(RULE_ID);
    expect(findings[0]?.message).toContain("Vital Signs");
    expect(findings[0]?.docUrl).toContain("vitalsigns");
  });

  it("emits info for US Core Patient exact match", () => {
    const findings = profileAwareRule.check(
      resource({
        profile: ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient"],
      }),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("info");
    expect(findings[0]?.message).toContain("US Core Patient");
    expect(findings[0]?.docUrl).toContain("us-core-patient");
  });

  it("emits info for IPS Patient exact match", () => {
    const findings = profileAwareRule.check(
      resource({
        profile: ["http://hl7.org/fhir/uv/ips/StructureDefinition/Patient-uv-ips"],
      }),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("info");
    expect(findings[0]?.message).toContain("IPS Patient");
  });
});

describe("profileAwareRule — namespace match (not exact)", () => {
  it("emits info for a US Core URL not in exact list", () => {
    const findings = profileAwareRule.check(
      resource({
        profile: [
          "http://hl7.org/fhir/us/core/StructureDefinition/us-core-encounter",
        ],
      }),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("info");
    expect(findings[0]?.path).toBe("meta.profile[0]");
    expect(findings[0]?.ruleId).toBe(RULE_ID);
    expect(findings[0]?.message).toContain("US Core");
    expect(findings[0]?.message).toContain("HL7 FHIR Validator");
  });

  it("emits info for an AU Base URL", () => {
    const findings = profileAwareRule.check(
      resource({
        profile: ["http://hl7.org.au/fhir/StructureDefinition/au-patient"],
      }),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("info");
    expect(findings[0]?.message).toContain("AU Base");
  });
});

describe("profileAwareRule — unrecognized valid URL", () => {
  it("emits info pointing to HL7 Validator for unknown URL", () => {
    const findings = profileAwareRule.check(
      resource({
        profile: ["https://example.org/profiles/custom"],
      }),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("info");
    expect(findings[0]?.path).toBe("meta.profile[0]");
    expect(findings[0]?.ruleId).toBe(RULE_ID);
    expect(findings[0]?.docUrl).toContain("confluence.hl7.org");
    expect(findings[0]?.message).toContain("https://example.org/profiles/custom");
  });
});

describe("profileAwareRule — malformed URL", () => {
  it("emits warning for a non-URL string", () => {
    const findings = profileAwareRule.check(
      resource({ profile: ["not-a-url"] }),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("warning");
    expect(findings[0]?.path).toBe("meta.profile[0]");
    expect(findings[0]?.ruleId).toBe(RULE_ID);
    expect(findings[0]?.message).toContain("not-a-url");
    expect(findings[0]?.message).toContain("not a valid canonical URL");
  });
});

describe("profileAwareRule — non-string entry", () => {
  it("emits warning for a number entry", () => {
    const res = {
      resourceType: "Patient",
      id: "p1",
      meta: { profile: [42] },
    } as unknown as FhirResource;
    const findings = profileAwareRule.check(res);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("warning");
    expect(findings[0]?.path).toBe("meta.profile[0]");
    expect(findings[0]?.ruleId).toBe(RULE_ID);
    expect(findings[0]?.message).toContain("must be strings");
  });

  it("emits warning for a null entry", () => {
    const res = {
      resourceType: "Patient",
      id: "p1",
      meta: { profile: [null] },
    } as unknown as FhirResource;
    const findings = profileAwareRule.check(res);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("warning");
    expect(findings[0]?.message).toContain("must be strings");
  });
});

describe("profileAwareRule — multiple profiles", () => {
  it("emits one finding per entry with correct index in path", () => {
    const findings = profileAwareRule.check(
      resource({
        profile: [
          "http://hl7.org/fhir/StructureDefinition/vitalsigns",
          "http://hl7.org/fhir/us/core/StructureDefinition/us-core-observation-lab",
          "not-a-url",
        ],
      }),
    );
    expect(findings).toHaveLength(3);
    expect(findings[0]?.path).toBe("meta.profile[0]");
    expect(findings[0]?.severity).toBe("info");
    expect(findings[1]?.path).toBe("meta.profile[1]");
    expect(findings[1]?.severity).toBe("info");
    expect(findings[2]?.path).toBe("meta.profile[2]");
    expect(findings[2]?.severity).toBe("warning");
  });

  it("all findings carry the correct ruleId", () => {
    const findings = profileAwareRule.check(
      resource({
        profile: [
          "http://hl7.org/fhir/StructureDefinition/vitalsigns",
          "https://example.org/custom",
        ],
      }),
    );
    for (const finding of findings) {
      expect(finding.ruleId).toBe(RULE_ID);
    }
  });
});

describe("profileAwareRule — version parameter is ignored", () => {
  it("runs regardless of version being undefined", () => {
    const findings = profileAwareRule.check(
      resource({ profile: ["http://hl7.org/fhir/StructureDefinition/vitalsigns"] }),
      undefined,
    );
    expect(findings).toHaveLength(1);
  });

  it("runs regardless of version being R4", () => {
    const findings = profileAwareRule.check(
      resource({ profile: ["http://hl7.org/fhir/StructureDefinition/vitalsigns"] }),
      "R4",
    );
    expect(findings).toHaveLength(1);
  });
});
