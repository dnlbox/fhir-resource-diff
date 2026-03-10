#!/usr/bin/env node
import { Command } from "commander";
import { registerCompareCommand } from "@/cli/commands/compare.js";
import { registerValidateCommand } from "@/cli/commands/validate.js";
import { registerNormalizeCommand } from "@/cli/commands/normalize.js";
import { registerInfoCommand } from "@/cli/commands/info.js";
import { registerListResourcesCommand } from "@/cli/commands/list-resources.js";

const program = new Command();
program
  .name("fhir-resource-diff")
  .description("CLI for diffing and validating FHIR JSON resources")
  .version("0.1.0");

registerCompareCommand(program);
registerValidateCommand(program);
registerNormalizeCommand(program);
registerInfoCommand(program);
registerListResourcesCommand(program);

program.parse();
