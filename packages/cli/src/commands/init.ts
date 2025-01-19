import { existsSync } from "node:fs";
import { intro, isCancel, outro, select, text } from "@clack/prompts";
import chalk from "chalk";
import type { parserTypeSchema } from "../parsers/index.js";
import type { Config } from "../types.js";
import { loadSession } from "../utils/session.js";
import { commands as authCommands } from "./auth/index.js";

type Format = typeof parserTypeSchema._type;

const SUPPORTED_FORMATS = [
  { value: "json", label: "JSON (.json)" },
  { value: "yml", label: "YAML (.yml, .yaml)" },
  { value: "properties", label: "Java Properties (.properties)" },
  { value: "android-xml", label: "Android XML (.xml)" },
  { value: "xcode-strings", label: "iOS Strings (.strings)" },
  { value: "xcode-stringsdict", label: "iOS Stringsdict (.stringsdict)" },
  { value: "xcode-xcstrings", label: "iOS XCStrings (.xcstrings)" },
  { value: "md", label: "Markdown (.md)" },
  { value: "mdx", label: "MDX (.mdx)" },
  { value: "html", label: "HTML (.html)" },
  { value: "js", label: "JavaScript (.js)" },
  { value: "ts", label: "TypeScript (.ts)" },
  { value: "po", label: "Gettext PO (.po)" },
  { value: "xliff", label: "XLIFF (.xlf, .xliff)" },
  { value: "csv", label: "CSV (.csv)" },
  { value: "xml", label: "XML (.xml)" },
  { value: "arb", label: "Flutter ARB (.arb)" },
] as const;

const FORMAT_EXAMPLES: Record<Format, string> = {
  json: "src/locales/[locale].json",
  yml: "src/locales/[locale].yaml",
  properties: "src/locales/messages_[locale].properties",
  "android-xml": "res/values-[locale]/strings.xml",
  "xcode-strings": "[locale].lproj/Localizable.strings",
  "xcode-stringsdict": "[locale].lproj/Localizable.stringsdict",
  "xcode-xcstrings": "[locale].lproj/Localizable.xcstrings",
  md: "src/docs/[locale]/*.md",
  mdx: "src/docs/[locale]/*.mdx",
  html: "src/content/[locale]/**/*.html",
  js: "src/locales/[locale].js",
  ts: "src/locales/[locale].ts",
  po: "src/locales/[locale].po",
  xliff: "src/locales/[locale].xlf",
  csv: "src/locales/[locale].csv",
  xml: "src/locales/[locale].xml",
  arb: "lib/l10n/app_[locale].arb",
};

export async function commands() {
  intro("Initialize a new Languine configuration");

  // Check authentication first
  const session = loadSession();
  if (!session) {
    console.log(
      chalk.yellow("You need to be logged in to initialize a project."),
    );
    console.log();
    await authCommands("login");

    // Verify login was successful
    const newSession = loadSession();
    if (!newSession) {
      outro("Please try initializing again after logging in.");
      process.exit(1);
    }
  }

  // Get source language
  const sourceLanguage = (await select({
    message: "What is your source language?",
    options: [
      { value: "en", label: "English", hint: "recommended" },
      { value: "es", label: "Spanish" },
      { value: "fr", label: "French" },
      { value: "de", label: "German" },
    ],
  })) as string;

  if (isCancel(sourceLanguage)) {
    outro("Configuration cancelled");
    process.exit(0);
  }

  const targetLanguages = (await text({
    message: "What languages do you want to translate to?",
    placeholder: "es, fr, de, zh, ja, pt",
    validate: (value) => {
      if (!value) return "Please enter at least one language";
      return;
    },
  })) as string;

  if (isCancel(targetLanguages)) {
    outro("Configuration cancelled");
    process.exit(0);
  }

  // Get file configurations
  const fileConfigs: Config["files"] = {};

  // Select format
  const format = (await select({
    message: "Select file format",
    options: [...SUPPORTED_FORMATS],
  })) as Format;

  if (isCancel(format)) {
    outro("Configuration cancelled");
    process.exit(0);
  }

  // Get file pattern
  const pattern = await text({
    message: "Enter the file pattern for translations",
    placeholder: FORMAT_EXAMPLES[format],
    defaultValue: FORMAT_EXAMPLES[format],
    validate(value) {
      if (!value) return;

      if (!value.includes("[locale]")) {
        return "Path must include [locale] placeholder (e.g. src/locales/[locale].json)";
      }
    },
  });

  if (isCancel(pattern)) {
    outro("Configuration cancelled");
    process.exit(0);
  }

  // Add to file configs
  fileConfigs[format] = {
    include: [pattern],
  };

  // Check if project has TypeScript support
  const hasTypeScript =
    existsSync("tsconfig.json") || existsSync("package.json");

  let configFormat = "json";
  if (hasTypeScript) {
    const format = await select({
      message: "Select configuration format",
      options: [
        { value: "typescript", label: "TypeScript (languine.config.ts)" },
        { value: "json", label: "JSON (languine.config.json)" },
      ],
    });

    if (isCancel(format)) {
      outro("Configuration cancelled");
      process.exit(0);
    }
    configFormat = format;
  }

  // Create config file
  const config: Config = {
    projectId: "",
    locale: {
      source: sourceLanguage,
      targets: targetLanguages.split(",").map((lang) => lang.trim()),
    },
    files: fileConfigs,
  };

  try {
    const fs = await import("node:fs/promises");

    if (configFormat === "typescript") {
      const tsConfig = `import { defineConfig } from "languine";

export default defineConfig({
  locale: {
    source: "${sourceLanguage}",
    targets: ["${targetLanguages
      .split(",")
      .map((lang) => lang.trim())
      .join('", "')}"],
  },
  files: {
    ${format}: {
      include: [${JSON.stringify(pattern)}],
    },
  },
});
`;
      await fs.writeFile("languine.config.ts", tsConfig, "utf-8");
    } else {
      await fs.writeFile(
        "languine.config.json",
        JSON.stringify(config, null, 2),
        "utf-8",
      );
    }

    outro(chalk.green("Configuration file created successfully!"));
    console.log();
    console.log("Next steps:");
    console.log(
      `1. Review your languine.config.${configFormat === "typescript" ? "ts" : "json"} file`,
    );
    console.log("2. Run 'languine translate' to start translating your files");
    console.log();
  } catch (error) {
    outro(chalk.red("Failed to create configuration file"));
    console.error(error);
    process.exit(1);
  }
}
