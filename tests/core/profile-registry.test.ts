import { describe, expect, it } from "vitest";
import {
  isValidCanonicalUrl,
  lookupProfile,
  lookupProfileNamespace,
} from "@/core/profile-registry.js";

describe("lookupProfile", () => {
  it("returns ProfileInfo for the vitalsigns profile", () => {
    const result = lookupProfile("http://hl7.org/fhir/StructureDefinition/vitalsigns");
    expect(result).toBeDefined();
    expect(result?.name).toBe("Vital Signs");
    expect(result?.igShort).toBe("FHIR Base");
    expect(result?.docUrl).toContain("vitalsigns");
  });

  it("returns ProfileInfo for the blood pressure profile", () => {
    const result = lookupProfile("http://hl7.org/fhir/StructureDefinition/bp");
    expect(result).toBeDefined();
    expect(result?.name).toBe("Blood Pressure");
  });

  it("returns ProfileInfo for US Core Patient", () => {
    const result = lookupProfile(
      "http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient",
    );
    expect(result).toBeDefined();
    expect(result?.name).toBe("US Core Patient");
    expect(result?.igShort).toBe("US Core");
  });

  it("returns ProfileInfo for IPS Patient", () => {
    const result = lookupProfile(
      "http://hl7.org/fhir/uv/ips/StructureDefinition/Patient-uv-ips",
    );
    expect(result).toBeDefined();
    expect(result?.name).toBe("IPS Patient");
    expect(result?.igShort).toBe("IPS");
  });

  it("returns undefined for an unknown canonical URL", () => {
    const result = lookupProfile("http://unknown.org/foo");
    expect(result).toBeUndefined();
  });

  it("returns undefined for an empty string", () => {
    const result = lookupProfile("");
    expect(result).toBeUndefined();
  });
});

describe("lookupProfileNamespace", () => {
  it("returns US Core namespace for a US Core URL not in exact list", () => {
    const result = lookupProfileNamespace(
      "http://hl7.org/fhir/us/core/StructureDefinition/us-core-encounter",
    );
    expect(result).toBeDefined();
    expect(result?.igShort).toBe("US Core");
    expect(result?.ig).toBe("US Core Implementation Guide");
  });

  it("returns AU Base namespace for an AU Base URL", () => {
    const result = lookupProfileNamespace(
      "http://hl7.org.au/fhir/StructureDefinition/au-patient",
    );
    expect(result).toBeDefined();
    expect(result?.igShort).toBe("AU Base");
  });

  it("returns IPS namespace for an IPS URL not in exact list", () => {
    const result = lookupProfileNamespace(
      "http://hl7.org/fhir/uv/ips/StructureDefinition/Observation-results-uv-ips",
    );
    expect(result).toBeDefined();
    expect(result?.igShort).toBe("IPS");
  });

  it("returns FHIR Base namespace for a StructureDefinition URL", () => {
    const result = lookupProfileNamespace(
      "http://hl7.org/fhir/StructureDefinition/vitalsigns",
    );
    expect(result).toBeDefined();
    expect(result?.igShort).toBe("FHIR Base");
  });

  it("returns undefined for an unknown URL", () => {
    const result = lookupProfileNamespace("http://unknown.org/foo");
    expect(result).toBeUndefined();
  });

  it("returns undefined for an empty string", () => {
    const result = lookupProfileNamespace("");
    expect(result).toBeUndefined();
  });

  it("returns mCode namespace for an mCode URL", () => {
    const result = lookupProfileNamespace(
      "http://hl7.org/fhir/us/mcode/StructureDefinition/mcode-cancer-patient",
    );
    expect(result).toBeDefined();
    expect(result?.igShort).toBe("mCode");
  });

  it("returns AU Core namespace for an AU Core URL (not AU Base)", () => {
    const result = lookupProfileNamespace(
      "http://hl7.org.au/fhir/core/StructureDefinition/au-core-patient",
    );
    expect(result).toBeDefined();
    expect(result?.igShort).toBe("AU Core");
  });
});

describe("isValidCanonicalUrl", () => {
  it("returns true for an https URL", () => {
    expect(isValidCanonicalUrl("https://example.org/profiles/foo")).toBe(true);
  });

  it("returns true for an http URL", () => {
    expect(isValidCanonicalUrl("http://hl7.org/fhir/StructureDefinition/vitalsigns")).toBe(true);
  });

  it("returns false for a plain string", () => {
    expect(isValidCanonicalUrl("not-a-url")).toBe(false);
  });

  it("returns false for an empty string", () => {
    expect(isValidCanonicalUrl("")).toBe(false);
  });

  it("returns true for a urn: URI", () => {
    expect(isValidCanonicalUrl("urn:uuid:something")).toBe(true);
  });

  it("returns false for a relative path", () => {
    expect(isValidCanonicalUrl("/relative/path")).toBe(false);
  });

  it("returns false for ftp:// URL", () => {
    expect(isValidCanonicalUrl("ftp://example.org/profile")).toBe(false);
  });
});
