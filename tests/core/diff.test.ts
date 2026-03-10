import { describe, it, expect } from "vitest";
import { diff } from "@/core/diff.js";
import type { FhirResource } from "@/core/types.js";

const base: FhirResource = {
  resourceType: "Patient",
  id: "patient-1",
};

describe("diff", () => {
  it("returns identical:true and empty entries for identical resources", () => {
    const result = diff(base, { ...base });
    expect(result.identical).toBe(true);
    expect(result.entries).toEqual([]);
  });

  it("returns a single changed entry for a single changed field", () => {
    const left: FhirResource = { resourceType: "Patient", id: "patient-1" };
    const right: FhirResource = { resourceType: "Patient", id: "patient-2" };
    const result = diff(left, right);
    expect(result.identical).toBe(false);
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]).toMatchObject({
      kind: "changed",
      path: "id",
      left: "patient-1",
      right: "patient-2",
    });
  });

  it("returns an added entry for a field present only in right", () => {
    const left: FhirResource = { resourceType: "Patient" };
    const right: FhirResource = { resourceType: "Patient", id: "patient-1" };
    const result = diff(left, right);
    expect(result.identical).toBe(false);
    const entry = result.entries.find((e) => e.path === "id");
    expect(entry).toBeDefined();
    expect(entry?.kind).toBe("added");
    expect(entry?.right).toBe("patient-1");
    expect(entry?.left).toBeUndefined();
  });

  it("returns a removed entry for a field present only in left", () => {
    const left: FhirResource = { resourceType: "Patient", id: "patient-1" };
    const right: FhirResource = { resourceType: "Patient" };
    const result = diff(left, right);
    expect(result.identical).toBe(false);
    const entry = result.entries.find((e) => e.path === "id");
    expect(entry).toBeDefined();
    expect(entry?.kind).toBe("removed");
    expect(entry?.left).toBe("patient-1");
    expect(entry?.right).toBeUndefined();
  });

  it("uses dot-notation for nested field paths", () => {
    const left: FhirResource = {
      resourceType: "Patient",
      meta: { versionId: "1", lastUpdated: "2024-01-01T00:00:00Z" },
    };
    const right: FhirResource = {
      resourceType: "Patient",
      meta: { versionId: "2", lastUpdated: "2024-01-01T00:00:00Z" },
    };
    const result = diff(left, right);
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]).toMatchObject({
      kind: "changed",
      path: "meta.versionId",
      left: "1",
      right: "2",
    });
  });

  it("uses bracket notation for array element paths", () => {
    const left: FhirResource = {
      resourceType: "Patient",
      name: [{ given: ["Alice"] }],
    };
    const right: FhirResource = {
      resourceType: "Patient",
      name: [{ given: ["Alicia"] }],
    };
    const result = diff(left, right);
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]).toMatchObject({
      kind: "changed",
      path: "name[0].given[0]",
      left: "Alice",
      right: "Alicia",
    });
  });

  it("returns an added entry for a new array element", () => {
    const left: FhirResource = {
      resourceType: "Patient",
      name: [{ text: "Alice" }],
    };
    const right: FhirResource = {
      resourceType: "Patient",
      name: [{ text: "Alice" }, { text: "Bob" }],
    };
    const result = diff(left, right);
    const entry = result.entries.find((e) => e.path === "name[1].text");
    expect(entry).toBeDefined();
    expect(entry?.kind).toBe("added");
    expect(entry?.right).toBe("Bob");
  });

  it("ignores a specific path when listed in ignorePaths", () => {
    const left: FhirResource = {
      resourceType: "Patient",
      meta: { lastUpdated: "2024-01-01T00:00:00Z" },
    };
    const right: FhirResource = {
      resourceType: "Patient",
      meta: { lastUpdated: "2024-06-01T00:00:00Z" },
    };
    const result = diff(left, right, { ignorePaths: ["meta.lastUpdated"] });
    expect(result.entries.find((e) => e.path === "meta.lastUpdated")).toBeUndefined();
  });

  it("ignores all direct meta children when ignorePaths includes meta.*", () => {
    const left: FhirResource = {
      resourceType: "Patient",
      meta: { versionId: "1", lastUpdated: "2024-01-01T00:00:00Z" },
    };
    const right: FhirResource = {
      resourceType: "Patient",
      meta: { versionId: "2", lastUpdated: "2024-06-01T00:00:00Z" },
    };
    const result = diff(left, right, { ignorePaths: ["meta.*"] });
    const metaEntries = result.entries.filter((e) => e.path.startsWith("meta."));
    expect(metaEntries).toHaveLength(0);
  });

  it("returns an entry for resourceType when they differ", () => {
    const left: FhirResource = { resourceType: "Patient" };
    const right: FhirResource = { resourceType: "Practitioner" };
    const result = diff(left, right);
    const entry = result.entries.find((e) => e.path === "resourceType");
    expect(entry).toBeDefined();
    expect(entry?.kind).toBe("changed");
    expect(entry?.left).toBe("Patient");
    expect(entry?.right).toBe("Practitioner");
  });

  it("emits added entries when one resource has meta and the other does not", () => {
    const left: FhirResource = { resourceType: "Patient" };
    const right: FhirResource = {
      resourceType: "Patient",
      meta: { versionId: "1" },
    };
    const result = diff(left, right);
    const entry = result.entries.find((e) => e.path === "meta.versionId");
    expect(entry).toBeDefined();
    expect(entry?.kind).toBe("added");
    expect(entry?.right).toBe("1");
  });

  it("emits removed entries when left has meta but right does not", () => {
    const left: FhirResource = {
      resourceType: "Patient",
      meta: { versionId: "1" },
    };
    const right: FhirResource = { resourceType: "Patient" };
    const result = diff(left, right);
    const entry = result.entries.find((e) => e.path === "meta.versionId");
    expect(entry).toBeDefined();
    expect(entry?.kind).toBe("removed");
    expect(entry?.left).toBe("1");
  });

  it("returns identical:true when only differences are in ignored paths", () => {
    const left: FhirResource = {
      resourceType: "Patient",
      meta: { lastUpdated: "2024-01-01T00:00:00Z" },
    };
    const right: FhirResource = {
      resourceType: "Patient",
      meta: { lastUpdated: "2024-06-01T00:00:00Z" },
    };
    const result = diff(left, right, { ignorePaths: ["meta.lastUpdated"] });
    expect(result.identical).toBe(true);
    expect(result.entries).toEqual([]);
  });
});
