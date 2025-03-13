import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { commands as initCommands } from "@/commands/init.js";
import type { Config } from "@/types.js";
import { outro } from "@clack/prompts";
import chalk from "chalk";
import { loadEnv } from "./env.js";

const CONFIG_NAME = "languine.json";

export async function configFile() {
  const workingDir = process.cwd();
  const files = await readdir(workingDir);
  const configFile = files.find((file: string) => file === CONFIG_NAME);
  const filePath = resolve(workingDir, configFile || CONFIG_NAME);

  return {
    path: filePath,
  };
}

/**
 * Check if configuration exists and run init if needed
 */
export async function ensureConfig(): Promise<void> {
  const { path: filePath } = await configFile();

  try {
    await readFile(filePath, "utf-8");
  } catch (error) {
    await initCommands();
  }
}

/**
 * Load the configuration file (languine.json) from the current working directory.
 */
export async function loadConfig(): Promise<Config> {
  const workingDir = process.cwd();
  const { path: filePath } = await configFile();
  const env = loadEnv(workingDir);

  // Ensure configuration exists
  await ensureConfig();

  try {
    const content = await readFile(filePath, "utf-8");
    const config = JSON.parse(content) as Config;

    return {
      ...config,
      projectId: config.projectId || env.LANGUINE_PROJECT_ID,
    };
  } catch (error) {
    outro(chalk.red(`Error loading config: ${error}`));
    process.exit(1);
  }
}
