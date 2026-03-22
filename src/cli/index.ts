#!/usr/bin/env node
// Injected at build time by tsup — see tsup.config.ts.
// The define substitution makes the typeof branch always true in the bundle.
// When running via tsx in tests/dev, the readFileSync fallback resolves the version.
declare const __PACKAGE_VERSION__: string;

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { Command } from "commander";
import { registerCompareCommand } from "@/cli/commands/compare.js";
import { registerValidateCommand } from "@/cli/commands/validate.js";
import { registerNormalizeCommand } from "@/cli/commands/normalize.js";
import { registerInfoCommand } from "@/cli/commands/info.js";
import { registerListResourcesCommand } from "@/cli/commands/list-resources.js";

function resolveVersion(): string {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (typeof __PACKAGE_VERSION__ !== "undefined") {
    return __PACKAGE_VERSION__;
  }
  // tsx / dev path — dead code in the built bundle
  const dir = dirname(fileURLToPath(import.meta.url));
  const pkgPath = resolve(dir, "../../package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as { version: string };
  return pkg.version;
}

const program = new Command();
program
  .name("fhir-resource-diff")
  .description("CLI for diffing and validating FHIR JSON resources")
  .version(resolveVersion(), "-V", "Print version number");

registerCompareCommand(program);
registerValidateCommand(program);
registerNormalizeCommand(program);
registerInfoCommand(program);
registerListResourcesCommand(program);

program.parse();
