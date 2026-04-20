import { defineConfig } from "vitepress";

const HOSTNAME = "https://dnlbox.github.io/fhir-resource-diff";
const DESCRIPTION =
  "FHIR R4/R4B/R5 diff, validation, and comparison. TypeScript CLI and library for CI pipelines and AI agents. No server, no Java runtime.";

export default defineConfig({
  title: "fhir-resource-diff",
  description: DESCRIPTION,
  base: "/fhir-resource-diff/",
  appearance: 'dark',
  sitemap: { hostname: HOSTNAME + "/" },
  head: [
    ["meta", { property: "og:type", content: "website" }],
    ["meta", { property: "og:site_name", content: "fhir-resource-diff" }],
    ["meta", { property: "og:title", content: "fhir-resource-diff — FHIR diff, validate & compare CLI" }],
    ["meta", { property: "og:description", content: DESCRIPTION }],
    ["meta", { property: "og:url", content: HOSTNAME + "/" }],
    ["meta", { name: "twitter:card", content: "summary" }],
    ["meta", { name: "twitter:title", content: "fhir-resource-diff — FHIR diff, validate & compare CLI" }],
    ["meta", { name: "twitter:description", content: DESCRIPTION }],
    ["meta", { name: "google-site-verification", content: "Ffbl73Sm-TtkxrvNsLRS417HB-VjOPRmerHZVfhF0QQ" }],
    [
      "script",
      { type: "application/ld+json" },
      JSON.stringify({
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "fhir-resource-diff",
        description: DESCRIPTION,
        applicationCategory: "DeveloperApplication",
        operatingSystem: "Any",
        programmingLanguage: "TypeScript",
        url: HOSTNAME + "/",
        downloadUrl: "https://www.npmjs.com/package/fhir-resource-diff",
        license: "https://opensource.org/licenses/MIT",
        codeRepository: "https://github.com/dnlbox/fhir-resource-diff",
        author: { "@type": "Person", name: "Daniel Veronez" },
      }),
    ],
  ],
  transformHead({ pageData }) {
    const slug = pageData.relativePath
      .replace(/index\.md$/, "")
      .replace(/\.md$/, ".html");
    return [["link", { rel: "canonical", href: `${HOSTNAME}/${slug}` }]];
  },
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
