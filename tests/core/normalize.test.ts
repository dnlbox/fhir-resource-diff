import { describe, it, expect } from "vitest";
import { normalize } from "@/core/normalize.js";
import type { FhirResource } from "@/core/types.js";

describe("normalize", () => {
  describe("trimStrings", () => {
    it("trims leading and trailing whitespace from top-level string values", () => {
      const resource: FhirResource = {
        resourceType: "Patient",
        id: " patient-1 ",
      };
      const { resource: result } = normalize(resource, { trimStrings: true });
      expect(result.id).toBe("patient-1");
    });

    it("trims strings recursively in nested objects", () => {
      const resource: FhirResource = {
        resourceType: "Patient",
        name: [{ family: " Smith ", given: [" John "] }],
      };
      const { resource: result } = normalize(resource, { trimStrings: true });
      const name = result.name as Array<{ family: string; given: string[] }>;
      expect(name[0]?.family).toBe("Smith");
      expect(name[0]?.given[0]).toBe("John");
    });

    it("trims strings inside arrays", () => {
      const resource: FhirResource = {
        resourceType: "Patient",
        tags: [" alpha ", " beta "],
      };
      const { resource: result } = normalize(resource, { trimStrings: true });
      expect(result.tags).toEqual(["alpha", "beta"]);
    });

    it("leaves non-string values unchanged", () => {
      const resource: FhirResource = {
        resourceType: "Observation",
        active: true,
        count: 42,
        ratio: 3.14,
      };
      const { resource: result } = normalize(resource, { trimStrings: true });
      expect(result.active).toBe(true);
      expect(result.count).toBe(42);
      expect(result.ratio).toBe(3.14);
    });
  });

  describe("normalizeDates", () => {
    it("converts a datetime string with positive timezone offset to UTC with Z suffix", () => {
      const resource: FhirResource = {
        resourceType: "Observation",
        effectiveDateTime: "2024-01-01T00:00:00+05:00",
      };
      const { resource: result } = normalize(resource, { normalizeDates: true });
      expect(result.effectiveDateTime).toBe("2023-12-31T19:00:00.000Z");
    });

    it("converts a datetime string with negative timezone offset to UTC", () => {
      const resource: FhirResource = {
        resourceType: "Observation",
        effectiveDateTime: "2024-06-15T12:00:00-08:00",
      };
      const { resource: result } = normalize(resource, { normalizeDates: true });
      expect(result.effectiveDateTime).toBe("2024-06-15T20:00:00.000Z");
    });

    it("leaves a Z-suffixed datetime unchanged in value (already UTC)", () => {
      const resource: FhirResource = {
        resourceType: "Observation",
        effectiveDateTime: "2024-01-01T00:00:00Z",
      };
      const { resource: result } = normalize(resource, { normalizeDates: true });
      // Should still parse and output as ISO string — same UTC value
      expect(result.effectiveDateTime).toBe("2024-01-01T00:00:00.000Z");
    });

    it("leaves a plain YYYY-MM-DD date string unchanged", () => {
      const resource: FhirResource = {
        resourceType: "Patient",
        birthDate: "1990-05-20",
      };
      const { resource: result } = normalize(resource, { normalizeDates: true });
      expect(result.birthDate).toBe("1990-05-20");
    });

    it("leaves a non-date string unchanged", () => {
      const resource: FhirResource = {
        resourceType: "Patient",
        id: "patient-abc",
      };
      const { resource: result } = normalize(resource, { normalizeDates: true });
      expect(result.id).toBe("patient-abc");
    });

    it("normalizes dates recursively in nested structures", () => {
      const resource: FhirResource = {
        resourceType: "Patient",
        meta: {
          lastUpdated: "2024-03-10T08:30:00+02:00",
        },
      };
      const { resource: result } = normalize(resource, { normalizeDates: true });
      const meta = result.meta as { lastUpdated: string };
      expect(meta.lastUpdated).toBe("2024-03-10T06:30:00.000Z");
    });
  });

  describe("sortObjectKeys", () => {
    it("sorts top-level object keys alphabetically", () => {
      const resource: FhirResource = {
        resourceType: "Patient",
        z: 1,
        a: 2,
        m: 3,
      };
      const { resource: result } = normalize(resource, { sortObjectKeys: true });
      expect(Object.keys(result)).toEqual(["a", "m", "resourceType", "z"]);
    });

    it("a comes before z in sorted output", () => {
      const resource: FhirResource = {
        resourceType: "Patient",
        z: 1,
        a: 2,
      };
      const { resource: result } = normalize(resource, { sortObjectKeys: true });
      const keys = Object.keys(result);
      expect(keys.indexOf("a")).toBeLessThan(keys.indexOf("z"));
    });

    it("sorts object keys recursively in nested objects", () => {
      const resource: FhirResource = {
        resourceType: "Patient",
        name: [{ z: "last", a: "first" }],
      };
      const { resource: result } = normalize(resource, { sortObjectKeys: true });
      const nameArr = result.name as Array<Record<string, string>>;
      expect(Object.keys(nameArr[0] ?? {})).toEqual(["a", "z"]);
    });
  });

  describe("sortArrayPaths", () => {
    it("sorts the array at the specified dot-notation path", () => {
      const resource: FhirResource = {
        resourceType: "Patient",
        name: [
          { family: "Zeta" },
          { family: "Alpha" },
          { family: "Mu" },
        ],
      };
      const { resource: result } = normalize(resource, { sortArrayPaths: ["name"] });
      const nameArr = result.name as Array<{ family: string }>;
      expect(nameArr.map((n) => n.family)).toEqual(["Alpha", "Mu", "Zeta"]);
    });

    it("does not sort arrays at unspecified paths", () => {
      const resource: FhirResource = {
        resourceType: "Patient",
        name: [{ family: "Zeta" }, { family: "Alpha" }],
        identifier: [{ value: "Z" }, { value: "A" }],
      };
      const { resource: result } = normalize(resource, { sortArrayPaths: ["name"] });
      const identifiers = result.identifier as Array<{ value: string }>;
      // identifier was not in sortArrayPaths so original order preserved
      expect(identifiers.map((i) => i.value)).toEqual(["Z", "A"]);
    });

    it("handles nested dot-notation paths", () => {
      const resource: FhirResource = {
        resourceType: "Patient",
        contact: {
          telecom: [{ value: "c" }, { value: "a" }, { value: "b" }],
        },
      };
      const { resource: result } = normalize(resource, { sortArrayPaths: ["contact.telecom"] });
      const contact = result.contact as { telecom: Array<{ value: string }> };
      expect(contact.telecom.map((t) => t.value)).toEqual(["a", "b", "c"]);
    });

    it("ignores a path that does not point to an array", () => {
      const resource: FhirResource = {
        resourceType: "Patient",
        id: "patient-1",
      };
      // Should not throw when path points to a non-array value
      expect(() =>
        normalize(resource, { sortArrayPaths: ["id"] }),
      ).not.toThrow();
    });
  });

  describe("immutability", () => {
    it("does not mutate the original resource when trimStrings is enabled", () => {
      const resource: FhirResource = {
        resourceType: "Patient",
        id: " patient-1 ",
      };
      normalize(resource, { trimStrings: true });
      expect(resource.id).toBe(" patient-1 ");
    });

    it("does not mutate the original resource when sortObjectKeys is enabled", () => {
      const resource: FhirResource = {
        resourceType: "Patient",
        z: 1,
        a: 2,
      };
      normalize(resource, { sortObjectKeys: true });
      expect(Object.keys(resource)).toEqual(["resourceType", "z", "a"]);
    });

    it("does not mutate the original resource when sortArrayPaths is enabled", () => {
      const original = [{ family: "Zeta" }, { family: "Alpha" }];
      const resource: FhirResource = {
        resourceType: "Patient",
        name: original,
      };
      normalize(resource, { sortArrayPaths: ["name"] });
      const nameArr = resource.name as Array<{ family: string }>;
      expect(nameArr[0]?.family).toBe("Zeta");
    });
  });

  describe("empty options", () => {
    it("returns a deep copy with no changes when called with empty options", () => {
      const resource: FhirResource = {
        resourceType: "Patient",
        id: " patient-1 ",
        name: [{ family: "Zeta" }, { family: "Alpha" }],
        birthDate: "1990-05-20",
      };
      const { resource: result } = normalize(resource, {});
      // Values unchanged
      expect(result.id).toBe(" patient-1 ");
      const nameArr = result.name as Array<{ family: string }>;
      expect(nameArr.map((n) => n.family)).toEqual(["Zeta", "Alpha"]);
      expect(result.birthDate).toBe("1990-05-20");
      // Is a distinct object (deep copy)
      expect(result).not.toBe(resource);
    });
  });
});

describe("normalize — stats", () => {
  it("counts trimmed strings", () => {
    const resource: FhirResource = {
      resourceType: "Patient",
      id: " patient-1 ",
      name: [{ family: " Smith " }],
    };
    const { stats } = normalize(resource, { trimStrings: true });
    expect(stats.stringsTrimmed).toBe(2); // " patient-1 " and " Smith " have whitespace; "Patient" does not change
  });

  it("does not count strings where trim makes no difference", () => {
    const resource: FhirResource = {
      resourceType: "Patient",
      id: "patient-1",
    };
    const { stats } = normalize(resource, { trimStrings: true });
    expect(stats.stringsTrimmed).toBe(0);
  });

  it("counts normalized dates", () => {
    const resource: FhirResource = {
      resourceType: "Observation",
      effectiveDateTime: "2024-01-01T00:00:00+05:00",
      issued: "2024-06-15T12:00:00-08:00",
    };
    const { stats } = normalize(resource, { normalizeDates: true });
    expect(stats.datesNormalized).toBe(2);
  });

  it("does not count dates that are already UTC ISO 8601 without milliseconds", () => {
    // "2024-01-01T00:00:00Z" becomes "2024-01-01T00:00:00.000Z" — that IS a change
    const resource: FhirResource = {
      resourceType: "Observation",
      effectiveDateTime: "2024-01-01T00:00:00.000Z",
    };
    const { stats } = normalize(resource, { normalizeDates: true });
    expect(stats.datesNormalized).toBe(0);
  });

  it("counts sorted keys across all objects in tree", () => {
    const resource: FhirResource = {
      resourceType: "Patient",
      z: 1,
      a: 2,
    };
    const { stats } = normalize(resource, { sortObjectKeys: true });
    // "resourceType" < "z", "a" < "z": keys [resourceType, z, a] sorted to [a, resourceType, z]
    // "z" and "a" are both displaced from their original positions
    expect(stats.keysSorted).toBeGreaterThan(0);
  });

  it("returns zero keysSorted when keys are already sorted", () => {
    const resource: FhirResource = {
      resourceType: "Patient",
    };
    const { stats } = normalize(resource, { sortObjectKeys: true });
    expect(stats.keysSorted).toBe(0);
  });

  it("counts sorted arrays", () => {
    const resource: FhirResource = {
      resourceType: "Patient",
      name: [{ family: "Zeta" }, { family: "Alpha" }],
      identifier: [{ value: "Z" }, { value: "A" }],
    };
    const { stats } = normalize(resource, { sortArrayPaths: ["name", "identifier"] });
    expect(stats.arraysSorted).toBe(2);
  });

  it("does not count arrays already in sorted order", () => {
    const resource: FhirResource = {
      resourceType: "Patient",
      name: [{ family: "Alpha" }, { family: "Zeta" }],
    };
    const { stats } = normalize(resource, { sortArrayPaths: ["name"] });
    expect(stats.arraysSorted).toBe(0);
  });

  it("returns all-zero stats for empty options", () => {
    const resource: FhirResource = {
      resourceType: "Patient",
      id: " patient-1 ",
    };
    const { stats } = normalize(resource, {});
    expect(stats).toEqual({ keysSorted: 0, stringsTrimmed: 0, datesNormalized: 0, arraysSorted: 0 });
  });
});

describe("normalize — prototype pollution prevention (CWE-915)", () => {
  it("trimStrings: drops __proto__ keys and does not pollute Object.prototype", () => {
    const resourceWithProtoKey = JSON.parse('{"resourceType":"Patient","__proto__":{"polluted":true}}') as FhirResource;
    const before = ({} as Record<string, unknown>)["polluted"];
    normalize(resourceWithProtoKey, { trimStrings: true });
    expect(({} as Record<string, unknown>)["polluted"]).toBe(before);
  });

  it("normalizeDates: drops __proto__ keys and does not pollute Object.prototype", () => {
    const resourceWithProtoKey = JSON.parse('{"resourceType":"Patient","__proto__":{"polluted":true}}') as FhirResource;
    normalize(resourceWithProtoKey, { normalizeDates: true });
    expect(({} as Record<string, unknown>)["polluted"]).toBeUndefined();
  });

  it("sortObjectKeys: drops __proto__ keys and does not pollute Object.prototype", () => {
    const resourceWithProtoKey = JSON.parse('{"resourceType":"Patient","__proto__":{"polluted":true}}') as FhirResource;
    normalize(resourceWithProtoKey, { sortObjectKeys: true });
    expect(({} as Record<string, unknown>)["polluted"]).toBeUndefined();
  });

  it("does not carry __proto__ key into normalized output", () => {
    const resourceWithProtoKey = JSON.parse('{"resourceType":"Patient","__proto__":{"x":1}}') as FhirResource;
    const { resource: result } = normalize(resourceWithProtoKey, { sortObjectKeys: true });
    expect(Object.keys(result)).not.toContain("__proto__");
  });

  it("sortArrayAtPaths: intermediate __proto__ path segment does not pollute prototype", () => {
    // If path contains __proto__ as a segment, current would become Object.prototype —
    // any write after that pollutes every plain object. Must bail out early.
    const resource: FhirResource = { resourceType: "Patient" };
    const before = ({} as Record<string, unknown>)["injected"];
    normalize(resource, { sortArrayPaths: ["__proto__.injected"] });
    expect(({} as Record<string, unknown>)["injected"]).toBe(before);
  });
});
