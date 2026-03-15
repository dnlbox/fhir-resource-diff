import { defineConfig } from "vitepress";

export default defineConfig({
  title: "fhir-resource-diff",
  description: "Diff, validate, and inspect FHIR resources. Fast. Local. CI-ready.",
  base: "/fhir-resource-diff/",
  themeConfig: {
    nav: [
      { text: "Guide", link: "/guide/getting-started", activeMatch: "/guide/" },
      { text: "Reference", link: "/reference/cli", activeMatch: "/reference/" },
      { text: "Ecosystem", link: "/ecosystem" },
    ],
    sidebar: {
      "/guide/": [
        {
          text: "Guide",
          items: [
            { text: "Getting started", link: "/guide/getting-started" },
            { text: "Validate", link: "/guide/validate" },
            { text: "Compare", link: "/guide/compare" },
            { text: "Normalize", link: "/guide/normalize" },
            { text: "Info & list-resources", link: "/guide/info" },
            { text: "CI/CD integration", link: "/guide/ci-cd" },
            { text: "AI agents & automation", link: "/guide/ai-agents" },
            { text: "FHIR versions (R4/R4B/R5)", link: "/guide/fhir-versions" },
          ],
        },
      ],
      "/reference/": [
        {
          text: "Reference",
          items: [
            { text: "CLI reference", link: "/reference/cli" },
            { text: "Library API", link: "/reference/library-api" },
            { text: "Output formats", link: "/reference/output-formats" },
            { text: "Exit codes", link: "/reference/exit-codes" },
          ],
        },
      ],
    },
    socialLinks: [
      { icon: "github", link: "https://github.com/dnlbox/fhir-resource-diff" },
      { icon: "npm", link: "https://www.npmjs.com/package/fhir-resource-diff" },
    ],
    search: {
      provider: "local",
    },
    editLink: {
      pattern:
        "https://github.com/dnlbox/fhir-resource-diff/edit/main/docs/site/:path",
      text: "Edit this page on GitHub",
    },
    footer: {
      message: "Released under the MIT License.",
      copyright: "Copyright © 2026 Daniel Veronez",
    },
  },
});
