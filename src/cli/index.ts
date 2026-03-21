#!/usr/bin/env node
import { createRequire } from "module";
import { Command } from "commander";
import { registerCompareCommand } from "@/cli/commands/compare.js";
import { registerValidateCommand } from "@/cli/commands/validate.js";
import { registerNormalizeCommand } from "@/cli/commands/normalize.js";
import { registerInfoCommand } from "@/cli/commands/info.js";
import { registerListResourcesCommand } from "@/cli/commands/list-resources.js";

const require = createRequire(import.meta.url);
const { version } = require("../../package.json") as { version: string };

const program = new Command();
program
  .name("fhir-resource-diff")
  .description("CLI for diffing and validating FHIR JSON resources")
  .version(version, "-V", "Print version number");

registerCompareCommand(program);
registerValidateCommand(program);
registerNormalizeCommand(program);
registerInfoCommand(program);
registerListResourcesCommand(program);

program.parse();
