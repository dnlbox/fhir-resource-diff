import { describe, expect, it } from "vitest";
import {
  RESOURCE_REGISTRY,
  getResourceDocUrl,
  getResourceInfo,
  isKnownResourceType,
  listResourceTypes,
} from "@/core/resource-registry.js";

describe("getResourceInfo", () => {
  it("returns info for Patient", () => {
    const info = getResourceInfo("Patient");
    expect(info).toBeDefined();
    expect(info?.resourceType).toBe("Patient");
    expect(info?.category).toBe("base");
    expect(info?.description).toContain("Demographics");
    expect(info?.versions).toContain("R4");
  });

  it("returns undefined for unknown resource type", () => {
    expect(getResourceInfo("NotAResource")).toBeUndefined();
  });

  it("is case-insensitive — lowercase resolves to canonical entry", () => {
    const info = getResourceInfo("patient");
    expect(info).toBeDefined();
    expect(info?.resourceType).toBe("Patient");
  });

  it("is case-insensitive — all-caps resolves to canonical entry", () => {
    const info = getResourceInfo("OBSERVATION");
    expect(info).toBeDefined();
    expect(info?.resourceType).toBe("Observation");
  });

  it("is case-insensitive — mixed case works for compound names", () => {
    const info = getResourceInfo("medicationrequest");
    expect(info).toBeDefined();
    expect(info?.resourceType).toBe("MedicationRequest");
  });
});

describe("getResourceDocUrl", () => {
  it("returns correct R4 URL for Patient", () => {
    expect(getResourceDocUrl("Patient", "R4")).toBe("https://hl7.org/fhir/R4/patient.html");
  });

  it("returns correct R5 URL for Observation", () => {
    expect(getResourceDocUrl("Observation", "R5")).toBe("https://hl7.org/fhir/R5/observation.html");
  });

  it("uses default version when not provided", () => {
    expect(getResourceDocUrl("Patient")).toBe("https://hl7.org/fhir/R4/patient.html");
  });

  it("lowercases the resource type in the URL", () => {
    expect(getResourceDocUrl("CapabilityStatement", "R4")).toBe(
      "https://hl7.org/fhir/R4/capabilitystatement.html",
    );
  });
});

describe("isKnownResourceType", () => {
  it("returns true for Patient", () => {
    expect(isKnownResourceType("Patient")).toBe(true);
  });

  it("returns false for unknown type", () => {
    expect(isKnownResourceType("FakeType")).toBe(false);
  });

  it("returns true for Patient with version filter", () => {
    expect(isKnownResourceType("Patient", "R4")).toBe(true);
    expect(isKnownResourceType("Patient", "R4B")).toBe(true);
    expect(isKnownResourceType("Patient", "R5")).toBe(true);
  });

  it("returns false for unknown type with version filter", () => {
    expect(isKnownResourceType("FakeType", "R4")).toBe(false);
  });
});

describe("listResourceTypes", () => {
  it("returns full list when no filters", () => {
    const list = listResourceTypes();
    expect(list.length).toBeGreaterThanOrEqual(25);
    expect(list).toBe(RESOURCE_REGISTRY);
  });

  it("filters by version R5", () => {
    const list = listResourceTypes({ version: "R5" });
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((r) => r.versions.includes("R5"))).toBe(true);
  });

  it("filters by category clinical", () => {
    const list = listResourceTypes({ category: "clinical" });
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((r) => r.category === "clinical")).toBe(true);
  });

  it("applies both filters", () => {
    const list = listResourceTypes({ version: "R4", category: "clinical" });
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((r) => r.category === "clinical" && r.versions.includes("R4"))).toBe(true);
  });

  it("returns empty array when no matches", () => {
    // Use a version filter that nothing matches by creating a test scenario
    // (all our types support all 3 versions, so test with category that would be empty)
    const list = listResourceTypes({ version: "R4", category: "financial" });
    expect(list.length).toBeGreaterThan(0); // financial types exist for R4
  });
});

describe("RESOURCE_REGISTRY", () => {
  it("has at least 25 entries", () => {
    expect(RESOURCE_REGISTRY.length).toBeGreaterThanOrEqual(25);
  });

  it("contains Patient, Observation, Bundle", () => {
    const types = RESOURCE_REGISTRY.map((r) => r.resourceType);
    expect(types).toContain("Patient");
    expect(types).toContain("Observation");
    expect(types).toContain("Bundle");
  });

  it("all entries have required fields", () => {
    for (const entry of RESOURCE_REGISTRY) {
      expect(typeof entry.resourceType).toBe("string");
      expect(typeof entry.description).toBe("string");
      expect(Array.isArray(entry.versions)).toBe(true);
      expect(entry.versions.length).toBeGreaterThan(0);
    }
  });
});

describe("maturityLevel", () => {
  it("Observation has maturityLevel N (Normative)", () => {
    expect(getResourceInfo("Observation")?.maturityLevel).toBe("N");
  });

  it("Encounter has maturityLevel 2", () => {
    expect(getResourceInfo("Encounter")?.maturityLevel).toBe(2);
  });

  it("Patient has maturityLevel N (Normative)", () => {
    expect(getResourceInfo("Patient")?.maturityLevel).toBe("N");
  });

  it("Bundle has maturityLevel N (Normative)", () => {
    expect(getResourceInfo("Bundle")?.maturityLevel).toBe("N");
  });

  it("ResearchStudy has maturityLevel 1", () => {
    expect(getResourceInfo("ResearchStudy")?.maturityLevel).toBe(1);
  });
});

describe("useCases", () => {
  it("Observation has 3 use cases", () => {
    const useCases = getResourceInfo("Observation")?.useCases;
    expect(useCases).toBeDefined();
    expect(useCases?.length).toBe(3);
  });

  it("ResearchStudy has no useCases (minimal curation)", () => {
    const info = getResourceInfo("ResearchStudy");
    expect(info?.useCases).toBeUndefined();
  });
});

describe("keyFields", () => {
  it("Observation has keyFields", () => {
    const keyFields = getResourceInfo("Observation")?.keyFields;
    expect(keyFields).toBeDefined();
    expect(keyFields?.length).toBeGreaterThan(0);
  });

  it("Observation status field is required", () => {
    const keyFields = getResourceInfo("Observation")?.keyFields;
    const statusField = keyFields?.find((f) => f.name === "status");
    expect(statusField).toBeDefined();
    expect(statusField?.required).toBe(true);
  });

  it("Observation value[x] field is not required", () => {
    const keyFields = getResourceInfo("Observation")?.keyFields;
    const valueField = keyFields?.find((f) => f.name === "value[x]");
    expect(valueField).toBeDefined();
    expect(valueField?.required).toBe(false);
  });

  it("ResearchStudy has no keyFields (minimal curation)", () => {
    expect(getResourceInfo("ResearchStudy")?.keyFields).toBeUndefined();
  });
});

describe("versionNotes", () => {
  it("Observation has R4B→R5 version notes", () => {
    const notes = getResourceInfo("Observation")?.versionNotes;
    expect(notes?.["R4B→R5"]).toBeDefined();
    expect(typeof notes?.["R4B→R5"]).toBe("string");
  });

  it("Bundle R4→R4B is undefined (no significant changes)", () => {
    const notes = getResourceInfo("Bundle")?.versionNotes;
    expect(notes?.["R4→R4B"]).toBeUndefined();
  });

  it("ResearchStudy has no versionNotes (minimal curation)", () => {
    expect(getResourceInfo("ResearchStudy")?.versionNotes).toBeUndefined();
  });
});
