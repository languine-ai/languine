import { getAPIKey, getBaseUrl } from "@/utils/session.ts";
import { note } from "@clack/prompts";
import chalk from "chalk";

export async function whoamiCommand() {
  const baseUrl = getBaseUrl();
  const apiKey = getAPIKey();

  if (!baseUrl || !apiKey) {
    note(
      "Not logged in. Run `languine login` to connect to your deployment.",
      "Status",
    );
    process.exit(1);
  }

  const masked = `${apiKey.slice(0, 6)}...${apiKey.slice(-4)}`;

  console.log();
  console.log(chalk.bold("Languine session"));
  console.log("- ".repeat(20));
  console.log(`${chalk.dim("•")} ${chalk.bold("Base URL".padEnd(10))} ${baseUrl}`);
  console.log(`${chalk.dim("•")} ${chalk.bold("API key".padEnd(10))} ${masked}`);
  console.log("- ".repeat(20));
  console.log();
}
