import { describe, expect, it } from "vitest";
import { summarizeDiff } from "@/core/summary.js";

describe("summarizeDiff", () => {
  it("returns all zeros for empty diff", () => {
    const result = summarizeDiff({ resourceType: "Patient", identical: true, entries: [] });
    expect(result).toEqual({ added: 0, removed: 0, changed: 0, typeChanged: 0, total: 0 });
  });

  it("counts added entries", () => {
    const result = summarizeDiff({
      resourceType: "Patient",
      identical: false,
      entries: [
        { kind: "added", path: "name", right: "Alice" },
        { kind: "added", path: "birthDate", right: "1990-01-01" },
      ],
    });
    expect(result.added).toBe(2);
    expect(result.total).toBe(2);
  });

  it("counts mixed entries correctly", () => {
    const result = summarizeDiff({
      resourceType: "Patient",
      identical: false,
      entries: [
        { kind: "added", path: "a", right: "1" },
        { kind: "removed", path: "b", left: "2" },
        { kind: "changed", path: "c", left: "3", right: "4" },
        { kind: "type-changed", path: "d", left: 5, right: "5" },
      ],
    });
    expect(result).toEqual({ added: 1, removed: 1, changed: 1, typeChanged: 1, total: 4 });
  });

  it("total equals sum of individual counts", () => {
    const result = summarizeDiff({
      resourceType: "Patient",
      identical: false,
      entries: [
        { kind: "added", path: "a", right: "1" },
        { kind: "added", path: "b", right: "2" },
        { kind: "removed", path: "c", left: "3" },
      ],
    });
    expect(result.total).toBe(result.added + result.removed + result.changed + result.typeChanged);
  });
});
