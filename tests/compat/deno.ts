import { parseJson, diff, normalize } from "../../dist/core/index.js";

const parsed = parseJson('{"resourceType":"Patient","id":"p1"}');
if (!parsed.success) throw new Error("parseJson failed");

const a = { resourceType: "Patient", active: true };
const b = { resourceType: "Patient", active: false };
const d = diff(a, b, {});
if (d.identical) throw new Error("diff failed to detect change");

const { stats } = normalize(a, { sortObjectKeys: true });
if (typeof stats.keysSorted !== "number") throw new Error("normalize stats missing");

console.log("Deno compat: OK");
