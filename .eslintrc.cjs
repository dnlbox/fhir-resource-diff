/* eslint-disable */
// CommonJS format required — ESLint pre-v9 config does not support ESM well with NodeNext moduleResolution
"use strict";

module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    project: "./tsconfig.json",
  },
  plugins: ["@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "prettier",
  ],
  rules: {
    // Enforce explicit return types on exported functions
    "@typescript-eslint/explicit-module-boundary-types": "error",
    // No any — must justify with a comment if unavoidable
    "@typescript-eslint/no-explicit-any": "error",
    // Named exports only
    "no-restricted-syntax": [
      "error",
      {
        selector: "ExportDefaultDeclaration",
        message: "Use named exports only — no default exports.",
      },
    ],
    // No unused vars
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    // Consistent type imports
    "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
  },
  env: {
    node: true,
    es2022: true,
  },
};
