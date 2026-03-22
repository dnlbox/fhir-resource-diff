#!/usr/bin/env node
// Injected at build time by tsup (and in tests by vitest.config.ts define).
// See tsup.config.ts for the define configuration.
declare const __PACKAGE_VERSION__: string;

import { Command } from "commander";
import { registerCompareCommand } from "@/cli/commands/compare.js";
import { registerValidateCommand } from "@/cli/commands/validate.js";
import { registerNormalizeCommand } from "@/cli/commands/normalize.js";
import { registerInfoCommand } from "@/cli/commands/info.js";
import { registerListResourcesCommand } from "@/cli/commands/list-resources.js";

// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
const cliVersion = typeof __PACKAGE_VERSION__ === "string" ? __PACKAGE_VERSION__ : "dev";

const program = new Command();
program
  .name("fhir-resource-diff")
  .description("CLI for diffing and validating FHIR JSON resources")
  .version(cliVersion, "-V", "Print version number");

registerCompareCommand(program);
registerValidateCommand(program);
registerNormalizeCommand(program);
registerInfoCommand(program);
registerListResourcesCommand(program);

program.parse();
