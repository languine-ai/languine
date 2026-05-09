import { basename } from "node:path";
import { intro, isCancel, note, outro, select, text } from "@clack/prompts";
import chalk from "chalk";
import { z } from "zod";
import type { parserTypeSchema } from "../parsers/index.js";
import { expo } from "../presets/expo.js";
import type { Config } from "../types.js";
import { client } from "../utils/api.js";
import { loadSession } from "../utils/session.js";
import { commands as authCommands } from "./auth/index.js";

async function ensureProjectId(explicitId?: string): Promise<string> {
  if (explicitId) return explicitId;

  const defaultName = basename(process.cwd()) || "languine";
  const nameInput = await text({
    message: "Project name",
    placeholder: defaultName,
    defaultValue: defaultName,
  });

  if (isCancel(nameInput)) {
    outro("Configuration cancelled");
    process.exit(0);
  }

  const name = (nameInput as string)?.trim() || defaultName;

  try {
    const project = await client.project.create.mutate({ name });
    note(
      `Created project ${chalk.bold(project.name)} (${chalk.cyan(project.id)})`,
      "Project",
    );
    return project.id;
  } catch (error) {
    outro(
      chalk.red(
        `Failed to create project on your deployment: ${
          error instanceof Error ? error.message : String(error)
        }`,
      ),
    );
    process.exit(1);
  }
}

interface Preset {
  value: string;
  label: string;
  hint?: string;
}

const SUPPORTED_PRESETS: Preset[] = [
  { value: "expo", label: "Expo", hint: "React Native with Expo" },
];

type PresetType = (typeof SUPPORTED_PRESETS)[number]["value"];

const argsSchema = z.array(z.string()).transform((args) => {
  const projectIdIndex = args.findIndex((arg) => arg.startsWith("--p="));
  const presetIndex = args.findIndex(
    (arg) => arg.startsWith("--preset=") || arg === "--preset" || arg === "-p",
  );
  const presetValueIndex =
    presetIndex !== -1 &&
    (args[presetIndex] === "--preset" || args[presetIndex] === "-p")
      ? presetIndex + 1
      : -1;

  const presetValue =
    presetIndex !== -1
      ? presetValueIndex !== -1
        ? args[presetValueIndex]
        : args[presetIndex].includes("=")
          ? args[presetIndex].split("=")[1]
          : undefined
      : undefined;

  const supportedPresets = SUPPORTED_PRESETS.map((p) => p.value);
  if (presetValue && !supportedPresets.includes(presetValue)) {
    throw new Error(
      `Invalid preset "${presetValue}". Supported presets are: ${supportedPresets.join(", ")}`,
    );
  }

  return {
    projectId:
      projectIdIndex !== -1 ? args[projectIdIndex].slice(4) : undefined,
    preset: presetValue as PresetType | undefined,
  };
});

type Format = z.infer<typeof parserTypeSchema>;

const SUPPORTED_FORMATS = [
  { value: "json", label: "JSON (.json)" },
  { value: "yaml", label: "YAML (.yml, .yaml)" },
  { value: "properties", label: "Java Properties (.properties)" },
  { value: "android", label: "Android (.xml)" },
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
  { value: "ftl", label: "Fluent (.ftl)" },
  { value: "php", label: "PHP (.php)" },
] as const;

const FORMAT_EXAMPLES: Record<Format, string> = {
  json: "src/locales/[locale].json",
  yaml: "src/locales/[locale].yaml",
  properties: "src/locales/messages_[locale].properties",
  android: "res/values-[locale]/strings.xml",
  "xcode-strings": "[locale].lproj/Localizable.strings",
  "xcode-stringsdict": "[locale].lproj/Localizable.stringsdict",
  "xcode-xcstrings": "[locale].lproj/Localizable.xcstrings",
  md: "src/docs/[locale]/*.md",
  mdx: "src/docs/[locale]/*.mdx",
  html: "src/content/[locale]/**/*.html",
  ftl: "src/locales/[locale].ftl",
  js: "src/locales/[locale].js",
  ts: "src/locales/[locale].ts",
  po: "src/locales/[locale].po",
  xliff: "src/locales/[locale].xlf",
  csv: "src/locales/[locale].csv",
  xml: "src/locales/[locale].xml",
  arb: "lib/l10n/app_[locale].arb",
  php: "lang/[locale]/*.php",
};

export async function commands(args: string[] = []) {
  const { projectId, preset: cliPreset } = argsSchema.parse(args);

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

  const selectedPreset = cliPreset;
  if (
    selectedPreset &&
    !SUPPORTED_PRESETS.find((p) => p.value === selectedPreset)
  ) {
    outro(
      chalk.red(
        `Invalid preset "${selectedPreset}". Supported presets are: ${SUPPORTED_PRESETS.map((p) => p.value).join(", ")}`,
      ),
    );
    process.exit(1);
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

  // Handle preset if specified
  if (selectedPreset) {
    let presetResult:
      | { fileFormat: string; filesPattern: string[] }
      | undefined;
    const presetOptions = {
      sourceLanguage,
      targetLanguages: targetLanguages.split(",").map((lang) => lang.trim()),
    };

    switch (selectedPreset) {
      case "expo":
        presetResult = await expo(presetOptions);
        break;
      // Add more preset handlers here as they become available
      // case "next":
      //   presetResult = await next(presetOptions);
      //   break;
    }

    if (presetResult) {
      const resolvedProjectId = await ensureProjectId(projectId);
      const config: Config = {
        projectId: resolvedProjectId,
        locale: {
          source: sourceLanguage,
          targets: targetLanguages.split(",").map((lang) => lang.trim()),
        },
        files: {
          [presetResult.fileFormat]: {
            include: presetResult.filesPattern,
          },
        },
      };

      try {
        const fs = await import("node:fs/promises");
        await fs.writeFile(
          "languine.json",
          JSON.stringify(config, null, 2),
          "utf-8",
        );

        outro(chalk.green("Configuration file created successfully!"));
        console.log();

        note(
          `Run 'languine translate' to start translating your files`,
          "Next steps.",
        );

        console.log();

        return;
      } catch (error) {
        outro(chalk.red("Failed to create configuration file"));
        console.error(error);
        process.exit(1);
      }
    }
  }

  // Continue with manual configuration if no preset was used
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

  const resolvedProjectId = await ensureProjectId(projectId);
  const config: Config = {
    projectId: resolvedProjectId,
    locale: {
      source: sourceLanguage,
      targets: targetLanguages.split(",").map((lang) => lang.trim()),
    },
    files: fileConfigs,
  };

  try {
    const fs = await import("node:fs/promises");

    await fs.writeFile(
      "languine.json",
      JSON.stringify(config, null, 2),
      "utf-8",
    );

    outro(chalk.green("Configuration file created successfully!"));
    console.log();

    note(
      `Run 'languine translate' to start translating your files`,
      "Next steps.",
    );

    console.log();

    outro(
      `Problems? ${chalk.underline(chalk.cyan("https://go.midday.ai/wzhr9Gt"))}`,
    );
  } catch (error) {
    outro(chalk.red("Failed to create configuration file"));
    console.error(error);
    process.exit(1);
  }
}
