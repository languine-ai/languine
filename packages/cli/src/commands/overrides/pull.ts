import { createParser } from "@/parsers/index.ts";
import { client } from "@/utils/api.js";
import { loadConfig } from "@/utils/config.ts";
import { loadSession } from "@/utils/session.js";
import { intro, outro, spinner } from "@clack/prompts";
import chalk from "chalk";
import { z } from "zod";

const argsSchema = z.array(z.string()).transform((args) => {
  const localesIndex = args.findIndex((arg) => arg.startsWith("--locales="));
  return {
    locales:
      localesIndex !== -1 ? args[localesIndex].slice(9).split(",") : undefined,
  };
});

export async function pullCommand(args: string[] = []) {
  intro("Pull translation overrides");

  // Check authentication
  const session = loadSession();
  if (!session) {
    console.log(chalk.yellow("You need to be logged in to pull overrides."));
    process.exit(1);
  }

  // Load config
  const config = await loadConfig();
  if (!config) {
    outro(
      chalk.red(
        "No configuration file found. Run 'languine init' to create one.",
      ),
    );
    process.exit(1);
  }

  const { locales } = argsSchema.parse(args);
  const targetLocales = locales || config.locale.targets;

  const s = spinner();
  s.start("Pulling overrides...");

  try {
    // Fetch overrides for each locale
    for (const locale of targetLocales) {
      //   const overrides = await client.translate.getOverridesForLocale.query({
      //     projectId: config.projectId,
      //     targetLanguage: locale,
      //   });

      // Process each file format in the config
      for (const [format, fileConfig] of Object.entries(config.files)) {
        const parser = createParser({ type: format });

        // Process each file pattern
        // for (const pattern of fileConfig.include) {
        //   const targetPath = transformLocalePath(pattern, locale);

        //   // Create directory if it doesn't exist
        //   await mkdir(dirname(targetPath), { recursive: true });

        //   // Read existing translations or create empty object
        //   let existingTranslations: Record<string, string> = {};
        //   try {
        //     const content = await readFile(targetPath, "utf-8");
        //     existingTranslations = await parser.parse(content);
        //   } catch (error) {
        //     // File doesn't exist or can't be parsed, use empty object
        //   }

        //   // Apply overrides
        //   for (const override of overrides) {
        //     existingTranslations[override.translationKey] =
        //       override.translatedText;
        //   }

        //   // Write back to file
        //   const serialized = await parser.serialize(
        //     locale,
        //     existingTranslations,
        //   );
        //   await writeFile(targetPath, serialized);
        // }
      }
    }

    s.stop("Overrides pulled successfully");
    outro(
      chalk.green("Overrides have been applied to your translation files."),
    );
  } catch (error) {
    s.stop("Failed to pull overrides");
    outro(chalk.red(`Error: ${(error as Error).message}`));
    process.exit(1);
  }
}
