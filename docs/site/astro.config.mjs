import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

const HOSTNAME = "https://dnlbox.github.io/fhir-resource-diff";
const DESCRIPTION =
  "FHIR R4/R4B/R5 diff, validation, and comparison. TypeScript CLI and library for CI pipelines and AI agents. No server, no Java runtime.";

export default defineConfig({
  site: HOSTNAME,
  base: "/fhir-resource-diff",
  legacy: {
    collections: true,
  },
  integrations: [
    starlight({
      title: "fhir-resource-diff",
      description: DESCRIPTION,
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/dnlbox/fhir-resource-diff",
        },
        {
          icon: "npm",
          label: "npm",
          href: "https://www.npmjs.com/package/fhir-resource-diff",
        },
      ],
      editLink: {
        baseUrl:
          "https://github.com/dnlbox/fhir-resource-diff/edit/main/docs/site/",
      },
      customCss: ["./src/styles/custom.css"],
      sidebar: [
        {
          label: "Guide",
          autogenerate: { directory: "guide" },
        },
        {
          label: "Reference",
          autogenerate: { directory: "reference" },
        },
        {
          label: "Ecosystem",
          link: "/ecosystem/",
        },
      ],
      head: [
        {
          tag: "meta",
          attrs: { property: "og:type", content: "website" },
        },
        {
          tag: "meta",
          attrs: {
            property: "og:site_name",
            content: "fhir-resource-diff",
          },
        },
        {
          tag: "meta",
          attrs: {
            property: "og:title",
            content: "fhir-resource-diff — FHIR diff, validate & compare CLI",
          },
        },
        {
          tag: "meta",
          attrs: { property: "og:description", content: DESCRIPTION },
        },
        {
          tag: "meta",
          attrs: { property: "og:url", content: HOSTNAME + "/" },
        },
        {
          tag: "meta",
          attrs: { name: "twitter:card", content: "summary" },
        },
        {
          tag: "meta",
          attrs: {
            name: "twitter:title",
            content: "fhir-resource-diff — FHIR diff, validate & compare CLI",
          },
        },
        {
          tag: "meta",
          attrs: { name: "twitter:description", content: DESCRIPTION },
        },
        {
          tag: "meta",
          attrs: {
            name: "google-site-verification",
            content: "Ffbl73Sm-TtkxrvNsLRS417HB-VjOPRmerHZVfhF0QQ",
          },
        },
        {
          tag: "script",
          attrs: { type: "application/ld+json" },
          content: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "fhir-resource-diff",
            description: DESCRIPTION,
            applicationCategory: "DeveloperApplication",
            operatingSystem: "Any",
            programmingLanguage: "TypeScript",
            url: HOSTNAME + "/",
            downloadUrl:
              "https://www.npmjs.com/package/fhir-resource-diff",
            license: "https://opensource.org/licenses/MIT",
            codeRepository:
              "https://github.com/dnlbox/fhir-resource-diff",
            author: { "@type": "Person", name: "Daniel Veronez" },
          }),
        },
      ],
      expressiveCode: {
        themes: ["dark-plus", "github-light"],
      },
    }),
  ],
});
