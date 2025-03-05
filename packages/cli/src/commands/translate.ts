import { readFileSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { createParser } from "@/parsers/index.ts";
import type { Config } from "@/types.js";
import { client } from "@/utils/api.js";
import { configFile, loadConfig } from "@/utils/config.ts";
import { loadEnv } from "@/utils/env.ts";
import { getGitInfo } from "@/utils/git.ts";
import { LockFileManager } from "@/utils/lock.ts";
import { transformLocalePath } from "@/utils/path.js";
import { getAPIKey } from "@/utils/session.ts";
import { note, outro, select, spinner } from "@clack/prompts";
import { auth, runs } from "@trigger.dev/sdk/v3";
import chalk from "chalk";
import glob from "fast-glob";
import open from "open";
import { z } from "zod";

const { LANGUINE_BASE_URL } = loadEnv();

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

  // Helper function to check if a flag exists
  const hasFlag = (flag: string) => args.includes(flag);

  return {
    forceTranslate: hasFlag("--force"),
    isSilent: hasFlag("--silent"),
    checkOnly: hasFlag("--check"),
    apiKey: getFlagValue("--api-key"),
    projectId: getFlagValue("--project-id"),
    forcedLocales: (() => {
      const forceIndex = args.indexOf("--force");
      if (
        forceIndex !== -1 &&
        args.length > forceIndex + 1 &&
        !args[forceIndex + 1].startsWith("--")
      ) {
        return args[forceIndex + 1].split(",");
      }
      return [];
    })(),
  };
});

type TranslationResult = {
  translations: Record<string, Array<{ key: string; translatedText: string }>>;
};

export async function translateCommand(args: string[] = []) {
  const {
    forceTranslate,
    isSilent,
    checkOnly,
    forcedLocales,
    apiKey: overrideApiKey,
    projectId: overrideProjectId,
  } = argsSchema.parse(args);

  const s = spinner();
  const startTime = Date.now();

  if (overrideApiKey) {
    process.env.LANGUINE_API_KEY = overrideApiKey;
  }

  const apiKey = getAPIKey();
  const gitInfo = await getGitInfo();

  if (!apiKey) {
    throw new Error("No API key found. Please run `languine login` first.");
  }

  if (!isSilent) {
    s.start(checkOnly ? "Checking translations..." : "Translating...");
  }

  try {
    // Load config file from working directory
    const config = await loadConfig();
    const { path: configPath } = await configFile();

    const lockManager = new LockFileManager(configPath);

    if (!config) {
      note(
        "Configuration file not found. Please run `languine init` to create one.",
      );

      process.exit(1);
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

    let translatedAnything = false;
    let needsUpdates = false;
    let totalKeysToTranslate = 0;
    const allTranslationInputs: Array<{
      type: string;
      sourceFilePath: string;
      input: Array<{ key: string; sourceText: string; sourceFile: string }>;
    }> = [];

    const { source: sourceLocale, targets: targetLocales } = config.locale;

    // Filter target locales if specific ones are forced
    const effectiveTargetLocales =
      forcedLocales.length > 0
        ? targetLocales.filter((locale) => forcedLocales.includes(locale))
        : targetLocales;

    if (forcedLocales.length > 0) {
      const invalidLocales = forcedLocales.filter(
        (locale) => !targetLocales.includes(locale),
      );
      if (invalidLocales.length > 0) {
        throw new Error(`Invalid target locales: ${invalidLocales.join(", ")}`);
      }
    }

    // Process each file configuration
    for (const [type, fileConfig] of Object.entries(config.files)) {
      const { include } = fileConfig as Config["files"][string];

      // Process each file pattern
      for (const pattern of include) {
        const globPattern =
          pattern && typeof pattern === "object" ? pattern.glob : pattern;

        const sourcePattern = globPattern.replace("[locale]", sourceLocale);

        // Find all matching source files
        const sourceFiles = await glob(sourcePattern, { absolute: true });

        for (const sourceFilePath of sourceFiles) {
          const parser = createParser({ type });

          // Read and parse the source file
          const sourceFileContent = await readFile(sourceFilePath, "utf-8");
          const parsedSourceFile = await parser.parse(sourceFileContent);

          // Filter out empty strings first
          const nonEmptySourceFile = Object.fromEntries(
            Object.entries(parsedSourceFile).filter(
              ([_, value]) => value !== "",
            ),
          );

          // Skip empty markdown documents
          if (
            (type === "mdx" || type === "md") &&
            Object.keys(nonEmptySourceFile).length === 0
          ) {
            // Don't show empty document message, just skip silently
            continue;
          }

          let keysToTranslate: string[];

          if (forceTranslate) {
            // If force flag is used, translate all non-empty keys
            keysToTranslate = Object.keys(nonEmptySourceFile);
          } else {
            // Otherwise use normal diff detection
            try {
              const currentContent = readFileSync(sourceFilePath, "utf-8");
              const currentJson = await parser.parse(currentContent);

              // Get changes using the lock manager
              const changes = await lockManager.getChanges(
                sourceFilePath,
                currentJson,
              );

              // Include both new keys and changed values
              keysToTranslate = [
                ...changes.addedKeys,
                ...changes.valueChanges.map((change) => change.key),
              ].filter((key) => nonEmptySourceFile[key] !== undefined);
            } catch (error) {
              console.log();
              note(
                "An error occurred while checking for translation changes. Please check the error message below.\nNeed help? https://languine.ai/docs/getting-started/troubleshooting",
                "Error",
              );
              console.error(error);
              console.log();
              process.exit(1);
            }
          }

          totalKeysToTranslate += keysToTranslate.length;

          if (keysToTranslate.length > 0) {
            needsUpdates = true;
            if (checkOnly) {
              if (!isSilent) {
                console.log(
                  chalk.yellow(
                    `  ${keysToTranslate.length} ${keysToTranslate.length === 1 ? "key" : "keys"} to translate in ${sourceFilePath.split("/").pop()}`,
                  ),
                );
              }
              continue;
            }
          }

          if (checkOnly) continue;

          // Convert the content to the expected format
          const translationInput = Object.entries(nonEmptySourceFile)
            .filter(([key]) => keysToTranslate.includes(key))
            .map(([key, sourceText]) => ({
              key,
              sourceText: sourceText,
              sourceFile: sourceFilePath.split("/").pop() ?? "",
            }));

          if (translationInput.length > 0) {
            allTranslationInputs.push({
              type,
              sourceFilePath,
              input: translationInput,
            });
          }
        }
      }
    }

    // Handle case when no changes are found across all files
    if (allTranslationInputs.length === 0 && !isSilent) {
      s.stop();
      note(
        "No keys to translate. Use --force flag to translate all keys.",
        "No Changes",
      );
      process.exit(0);
    }

    // Process all translation inputs
    for (const { type, sourceFilePath, input } of allTranslationInputs) {
      if (!isSilent) {
        const fileName = sourceFilePath.split("/").pop();
        if (type === "mdx" || type === "md") {
          s.message(
            `Translating ${fileName} to ${effectiveTargetLocales.length} ${effectiveTargetLocales.length === 1 ? "language" : "languages"}`,
          );
        } else {
          s.message(
            `Translating ${input.length} ${input.length === 1 ? "key" : "keys"} from ${fileName} to ${effectiveTargetLocales.length} ${effectiveTargetLocales.length === 1 ? "language" : "languages"}...`,
          );
        }
      }

      let result: TranslationResult;

      const { error, run, meta } = await client.jobs.startJob.mutate({
        apiKey: apiKey,
        projectId,
        sourceFormat: type,
        sourceLanguage: sourceLocale,
        targetLanguages: effectiveTargetLocales,
        content: input,
        branch: gitInfo?.branchName,
        commit: gitInfo?.commitHash,
        sourceProvider: gitInfo?.provider,
        commitMessage: gitInfo?.commitMessage,
        commitLink: gitInfo?.commitLink,
      });

      if (
        error?.code === "DOCUMENT_LIMIT_REACHED" ||
        error?.code === "KEY_LIMIT_REACHED"
      ) {
        s.stop();

        switch (error?.code) {
          case "DOCUMENT_LIMIT_REACHED":
            note(
              "Document limit reached. Upgrade your plan to increase your limit.",
              "Limit reached",
            );
            break;
          case "KEY_LIMIT_REACHED":
            note(
              "Translation keys limit reached. Upgrade your plan to increase your limit.",
              "Limit reached",
            );
            break;
        }

        const shouldUpgrade = await select({
          message: "Would you like to upgrade your plan now?",
          options: [
            { label: "Upgrade plan", value: "upgrade" },
            { label: "Cancel", value: "cancel" },
          ],
        });

        if (shouldUpgrade === "upgrade") {
          if (meta?.plan === "free") {
            await open(
              `${LANGUINE_BASE_URL}/${meta?.organizationId}/default/settings?tab=billing&modal=plan&tier=${Number(meta?.tier) + 1}`,
            );
          } else {
            await open(
              `${LANGUINE_BASE_URL}/api/portal?id=${meta?.polarCustomerId}`,
            );
          }

          note("Run `languine translate` again to continue.", "What's next?");
        }

        process.exit(1);
      }

      if (!run) {
        s.stop();
        note("Translation job not found", "Error");
        process.exit(1);
      }

      // If in queue, show a pro tip
      if (!isSilent && meta?.plan === "free") {
        if (!checkOnly) {
          console.log();
          note(
            "Upgrade to Pro for faster translations https://languine.ai/pricing",
            "Pro tip",
          );
          console.log();
        }
      }

      await auth.withAuth({ accessToken: run.publicAccessToken }, async () => {
        for await (const update of runs.subscribeToRun(run.id)) {
          if (update.metadata?.progress && !isSilent) {
            s.message(
              `Translating: ${Math.round(Number(update.metadata.progress))}%`,
            );
          }

          if (update.finishedAt) {
            result = update.output;
            break;
          }
        }
      });

      if (!isSilent) {
        s.message("Processing translations...");
      }

      // Process results for each target locale
      for (const targetLocale of effectiveTargetLocales) {
        try {
          const targetPath = transformLocalePath(
            sourceFilePath,
            sourceLocale,
            targetLocale,
            process.cwd(),
          );

          // Create directory if it doesn't exist
          await mkdir(dirname(targetPath), { recursive: true });

          const parser = createParser({ type });

          // Read existing target file if it exists
          let existingContent: Record<string, string> = {};
          let originalFileContent: string | undefined;
          try {
            const existingFile = await readFile(targetPath, "utf-8");
            originalFileContent = existingFile;
            existingContent = await parser.parse(existingFile);
          } catch (error) {
            // File doesn't exist yet, use empty object
          }

          // Read source file for serialization context
          const sourceFileContent = await readFile(sourceFilePath, "utf-8");
          const parsedSourceContent = await parser.parse(sourceFileContent);

          // Convert the translations and merge with existing content
          const translatedContent = Object.fromEntries(
            result.translations[targetLocale].map((translation) => [
              translation.key,
              translation.translatedText ?? "",
            ]),
          );

          const mergedContent = {
            ...existingContent,
            ...translatedContent,
          };

          // Pass the original file content as a string if it exists
          const serialized = await parser.serialize(
            targetLocale,
            mergedContent,
            originalFileContent,
            sourceFileContent,
          );

          await writeFile(targetPath, serialized, "utf-8");

          // Register the source content in the lock file instead of the translated content
          lockManager.registerSourceData(sourceFilePath, parsedSourceContent);

          if (input.length > 0) {
            translatedAnything = true;
          }
        } catch {
          chalk.red(`Translation failed for ${targetLocale}`);
        }
      }
    }

    if (!isSilent) {
      const duration = Math.round((Date.now() - startTime) / 1000);
      if (checkOnly) {
        if (needsUpdates) {
          s.stop(chalk.red("Updates needed"));
          if (totalKeysToTranslate > 0) {
            note(
              `Found ${totalKeysToTranslate} ${totalKeysToTranslate === 1 ? "key" : "keys"} that need translation.\nRun without --check to update translations.`,
              "Translation Required",
            );
          }
          process.exit(1);
        } else {
          s.stop(chalk.green("No updates needed"));
          process.exit(0);
        }
      } else {
        s.stop();
        if (translatedAnything) {
          outro(
            `All translations completed in ${duration >= 60 ? `${Math.floor(duration / 60)}m ` : ""}${duration % 60}s`,
          );
        }
      }
    }
    process.exit(checkOnly && needsUpdates ? 1 : 0);
  } catch (error) {
    const translationError = error as Error;

    if (!isSilent) {
      console.log(
        chalk.red(`Translation process failed: ${translationError.message}`),
      );
    }
    process.exit(1);
  }
}
