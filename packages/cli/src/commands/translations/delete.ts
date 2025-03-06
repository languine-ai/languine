import { unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { client } from "@/utils/api.js";
import { loadConfig } from "@/utils/config.ts";
import { configFile } from "@/utils/config.ts";
import { transformLocalePath } from "@/utils/path.js";
import { loadSession } from "@/utils/session.ts";
import { confirm, intro, outro, spinner } from "@clack/prompts";
import chalk from "chalk";
import glob from "fast-glob";
import { z } from "zod";

const argsSchema = z.array(z.string()).transform((args) => {
  return {
    force: args.includes("--force"),
  };
});

export async function deleteCommand(args: string[] = []) {
  const { force } = argsSchema.parse(args);

  intro("Delete all translation files");

  // Check authentication
  const session = loadSession();
  if (!session) {
    console.log(
      chalk.yellow("You need to be logged in to delete translations."),
    );
    process.exit(1);
  }

  if (!force) {
    const shouldProceed = await confirm({
      message: chalk.yellow(
        "⚠️  This will delete all target translation files and remote translations. Are you sure you want to proceed?",
      ),
    });

    if (!shouldProceed) {
      outro("Operation cancelled");
      process.exit(0);
    }
  }

  const s = spinner();
  s.start("Deleting translation files...");

  try {
    // Load config file
    const config = await loadConfig();
    const { path: configPath } = await configFile();

    if (!config) {
      throw new Error(
        "Configuration file not found. Please run `languine init` to create one.",
      );
    }

    if (!config.projectId) {
      throw new Error(
        "Missing project ID. Please set it in your configuration file.",
      );
    }

    // Delete remote translations first
    try {
      await client.translate.deleteTranslations.mutate({
        projectId: config.projectId,
      });
      s.message("Remote translations deleted");
    } catch (error) {
      console.error(chalk.red("Failed to delete remote translations"));
      throw error;
    }

    const { source: sourceLocale, targets: targetLocales } = config.locale;
    let deletedCount = 0;

    // Process each file configuration to delete local files
    for (const [type, fileConfig] of Object.entries(config.files)) {
      const { include } = fileConfig;

      // Process each file pattern
      for (const pattern of include) {
        const globPattern =
          typeof pattern === "object" ? pattern.glob : pattern;
        const sourcePattern = globPattern.replace("[locale]", sourceLocale);

        // Find all matching source files
        const sourceFiles = await glob(sourcePattern, { absolute: true });

        for (const sourceFilePath of sourceFiles) {
          // Process each target locale
          for (const targetLocale of targetLocales) {
            try {
              const targetPath = transformLocalePath(
                sourceFilePath,
                sourceLocale,
                targetLocale,
                process.cwd(),
              );

              // Delete the target file
              await unlink(targetPath);
              deletedCount++;
              s.message(`Deleted file for ${targetLocale}`);
            } catch (error) {
              // Ignore file not found errors
              if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
                console.error(
                  chalk.red(`Failed to delete file for ${targetLocale}`),
                );
              }
            }
          }
        }
      }
    }

    // Empty the languine.lock file
    try {
      const lockPath = join(process.cwd(), "languine.lock");
      await writeFile(lockPath, "{}", "utf-8");
      s.message("Cleared languine.lock file");
    } catch (error) {
      console.error(chalk.red("Failed to clear languine.lock file"));
    }

    s.stop("Translation files deleted successfully");
    outro(
      chalk.green(
        `Deleted ${deletedCount} translation ${deletedCount === 1 ? "file" : "files"} and remote translations.`,
      ),
    );
  } catch (error) {
    s.stop("Failed to delete translation files");
    outro(chalk.red(`Error: ${(error as Error).message}`));
    process.exit(1);
  }
}
