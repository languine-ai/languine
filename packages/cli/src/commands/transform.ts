import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "@/utils/config.ts";
import { getAPIKey } from "@/utils/session.ts";
import { intro, note, outro, spinner } from "@clack/prompts";
import fastGlob from "fast-glob";
import { run } from "jscodeshift/src/Runner.js";
import { simpleGit } from "simple-git";
import { z } from "zod";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const git = simpleGit();

const argsSchema = z.array(z.string()).transform((args) => {
  // Helper function to find value for a flag
  const getFlagValue = (flag: string) => {
    for (let i = 0; i < args.length - 1; i++) {
      if (args[i] === flag && !args[i + 1].startsWith("--")) {
        return args[i + 1];
      }
    }
    return undefined;
  };

  return {
    directory: args[0],
    apiKey: getFlagValue("--api-key"),
    projectId: getFlagValue("--project-id"),
  };
});

export async function transformCommand(args: string[] = []) {
  const {
    directory,
    apiKey: overrideApiKey,
    projectId: overrideProjectId,
  } = argsSchema.parse(args);

  if (!directory) {
    console.error("Error: Directory argument is required");
    process.exit(1);
  }

  if (overrideApiKey) {
    process.env.LANGUINE_API_KEY = overrideApiKey;
  }

  const apiKey = getAPIKey();

  if (!apiKey) {
    throw new Error("No API key found. Please run `languine login` first.");
  }

  intro("🔍 Starting transformation process");

  const spin = spinner();

  try {
    // Check for uncommitted changes
    const status = await git.status();
    if (
      status.modified.length > 0 ||
      status.not_added.length > 0 ||
      status.staged.length > 0
    ) {
      note(
        "You have uncommitted changes. Please commit or stash your changes before running the transform command.",
        "Error",
      );
      process.exit(1);
    }

    // Load config file from working directory
    const config = await loadConfig();

    // If config is null, it means init was just run and we should exit
    if (!config) {
      process.exit(0);
    }

    const projectId =
      overrideProjectId || config.projectId || process.env.LANGUINE_PROJECT_ID;

    if (!projectId) {
      note(
        "Missing project ID. Get one at https://languine.ai/login \nand provide it via --project-id, config file, or LANGUINE_PROJECT_ID",
        "Error",
      );
      process.exit(1);
    }

    const sourceLocale = config.locale.source;

    if (!sourceLocale) {
      note(
        "Missing source locale in config file. Please run `languine init` to set up your locales.",
        "Error",
      );
      process.exit(1);
    }

    spin.start("Finding files to transform");

    // Find all React component files
    const files = await fastGlob(["**/*.tsx", "**/*.jsx"], {
      cwd: directory,
      absolute: true,
      ignore: ["**/node_modules/**", "**/.*/**", "**/dist/**", "**/build/**"],
    });

    spin.stop(`Found ${files.length} files to transform`);

    if (files.length === 0) {
      outro("No files found in the specified directory");
      return;
    }

    // Run the transform
    const result = await run(
      path.join(__dirname, "../dist/utils/transform.js"),
      files,
      {
        parser: "tsx",
        silent: true,
      },
    );

    if (!result.ok) {
      throw new Error("Transform failed");
    }

    spin.stop("Transformation complete");
    outro(`✨ Successfully processed ${files.length} files`);
  } catch (error) {
    spin.stop("Error during transformation");
    console.error("Error:", error);
    process.exit(1);
  }
}
