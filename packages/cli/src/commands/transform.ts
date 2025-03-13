import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { intro, outro, spinner } from "@clack/prompts";
import fastGlob from "fast-glob";
import { run } from "jscodeshift/src/Runner.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function transformCommand(args: string[] = []) {
  const directory = args[0];

  if (!directory) {
    console.error("Error: Directory argument is required");
    process.exit(1);
  }

  intro("🔍 Starting transformation process");

  const spin = spinner();
  spin.start("Finding files to transform");

  try {
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
