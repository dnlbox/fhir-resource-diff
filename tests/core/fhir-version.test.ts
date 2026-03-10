import { describe, expect, it } from "vitest";
import {
  DEFAULT_FHIR_VERSION,
  SUPPORTED_FHIR_VERSIONS,
  VERSION_STRING_MAP,
  detectFhirVersion,
  fhirBaseUrl,
  fhirVersionLabel,
  isSupportedFhirVersion,
  resolveFhirVersion,
} from "@/core/fhir-version.js";

describe("SUPPORTED_FHIR_VERSIONS", () => {
  it("contains R4, R4B, and R5", () => {
    expect(SUPPORTED_FHIR_VERSIONS).toEqual(["R4", "R4B", "R5"]);
  });
});

describe("DEFAULT_FHIR_VERSION", () => {
  it("is R4", () => {
    expect(DEFAULT_FHIR_VERSION).toBe("R4");
  });
});

describe("detectFhirVersion", () => {
  it("returns R4 for meta.fhirVersion 4.0.1", () => {
    expect(detectFhirVersion({ resourceType: "Patient", meta: { fhirVersion: "4.0.1" } })).toBe("R4");
  });

  it("returns R4 for meta.fhirVersion 4.0.0", () => {
    expect(detectFhirVersion({ resourceType: "Patient", meta: { fhirVersion: "4.0.0" } })).toBe("R4");
  });

  it("returns R4B for meta.fhirVersion 4.3.0", () => {
    expect(detectFhirVersion({ resourceType: "Patient", meta: { fhirVersion: "4.3.0" } })).toBe("R4B");
  });

  it("returns R5 for meta.fhirVersion 5.0.0", () => {
    expect(detectFhirVersion({ resourceType: "Patient", meta: { fhirVersion: "5.0.0" } })).toBe("R5");
  });

  it("returns undefined for unknown version string", () => {
    expect(detectFhirVersion({ resourceType: "Patient", meta: { fhirVersion: "3.0.2" } })).toBeUndefined();
  });

  it("returns undefined when meta is absent", () => {
    expect(detectFhirVersion({ resourceType: "Patient" })).toBeUndefined();
  });

  it("returns undefined when meta.fhirVersion is absent", () => {
    expect(detectFhirVersion({ resourceType: "Patient", meta: {} })).toBeUndefined();
  });
});

describe("resolveFhirVersion", () => {
  it("uses explicit version when provided", () => {
    const resource = { resourceType: "Patient", meta: { fhirVersion: "5.0.0" } };
    expect(resolveFhirVersion("R4", resource)).toBe("R4");
  });

  it("detects version from meta when no explicit version", () => {
    const resource = { resourceType: "Patient", meta: { fhirVersion: "4.3.0" } };
    expect(resolveFhirVersion(undefined, resource)).toBe("R4B");
  });

  it("falls back to DEFAULT_FHIR_VERSION when neither explicit nor detectable", () => {
    const resource = { resourceType: "Patient" };
    expect(resolveFhirVersion(undefined, resource)).toBe("R4");
  });
});

describe("fhirBaseUrl", () => {
  it("returns R4 URL", () => {
    expect(fhirBaseUrl("R4")).toBe("https://hl7.org/fhir/R4");
  });

  it("returns R4B URL", () => {
    expect(fhirBaseUrl("R4B")).toBe("https://hl7.org/fhir/R4B");
  });

  it("returns R5 URL", () => {
    expect(fhirBaseUrl("R5")).toBe("https://hl7.org/fhir/R5");
  });
});

describe("fhirVersionLabel", () => {
  it("returns label for R4", () => {
    expect(fhirVersionLabel("R4")).toBe("FHIR R4 (v4.0.1)");
  });

  it("returns label for R4B", () => {
    expect(fhirVersionLabel("R4B")).toBe("FHIR R4B (v4.3.0)");
  });

  it("returns label for R5", () => {
    expect(fhirVersionLabel("R5")).toBe("FHIR R5 (v5.0.0)");
  });
});

describe("isSupportedFhirVersion", () => {
  it("returns true for R4", () => {
    expect(isSupportedFhirVersion("R4")).toBe(true);
  });

  it("returns true for R4B", () => {
    expect(isSupportedFhirVersion("R4B")).toBe(true);
  });

  it("returns true for R5", () => {
    expect(isSupportedFhirVersion("R5")).toBe(true);
  });

  it("returns false for lowercase r4", () => {
    expect(isSupportedFhirVersion("r4")).toBe(false);
  });

  it("returns false for unknown string", () => {
    expect(isSupportedFhirVersion("R6")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isSupportedFhirVersion("")).toBe(false);
  });
});

describe("VERSION_STRING_MAP", () => {
  it("maps all expected version strings", () => {
    expect(VERSION_STRING_MAP.get("4.0.1")).toBe("R4");
    expect(VERSION_STRING_MAP.get("4.3.0")).toBe("R4B");
    expect(VERSION_STRING_MAP.get("5.0.0")).toBe("R5");
  });
});
