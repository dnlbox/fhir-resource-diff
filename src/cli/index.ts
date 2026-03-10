#!/usr/bin/env node
import { Command } from "commander";
import { registerCompareCommand } from "@/cli/commands/compare.js";
import { registerValidateCommand } from "@/cli/commands/validate.js";
import { registerNormalizeCommand } from "@/cli/commands/normalize.js";

const program = new Command();
program
  .name("fhir-resource-diff")
  .description("CLI for diffing and validating FHIR JSON resources")
  .version("0.1.0");

registerCompareCommand(program);
registerValidateCommand(program);
registerNormalizeCommand(program);

program.parse();
