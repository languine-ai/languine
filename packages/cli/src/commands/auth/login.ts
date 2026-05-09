import { saveSession } from "@/utils/session.ts";
import { intro, note, outro, password, text } from "@clack/prompts";
import chalk from "chalk";
import open from "open";

export function parseLoginArgs(args: string[]) {
  return {
    url: getFlag(args, "--url"),
    apiKey: getFlag(args, "--api-key"),
  };
}

function getFlag(args: string[], flag: string): string | undefined {
  for (let i = 0; i < args.length - 1; i++) {
    if (args[i] === flag && !args[i + 1]?.startsWith("--")) {
      return args[i + 1];
    }
  }
  return undefined;
}

export function normalizeBaseUrl(input: string): string {
  let url = input.trim();
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  return url.replace(/\/+$/, "");
}

async function pingApiKey(baseUrl: string, apiKey: string): Promise<boolean> {
  try {
    const res = await fetch(
      `${baseUrl}/api/trpc/project.list?batch=1&input=${encodeURIComponent(
        JSON.stringify({ "0": { json: null, meta: { values: ["undefined"] } } }),
      )}`,
      { headers: { "x-api-key": apiKey } },
    );
    return res.status !== 401;
  } catch {
    return false;
  }
}

export async function loginCommand(args: string[] = []) {
  const flags = parseLoginArgs(args);

  intro("Login to your Languine deployment");

  let baseUrl = flags.url
    ? normalizeBaseUrl(flags.url)
    : ((await text({
        message: "Your Languine deployment URL",
        placeholder: "https://languine.your-team.vercel.app",
        validate: (value) => (!value ? "URL is required" : undefined),
      })) as string);

  baseUrl = normalizeBaseUrl(baseUrl);

  const tokenPage = `${baseUrl}/cli/token`;
  note(
    `Open ${chalk.bold(tokenPage)} in your browser, copy the API key, and paste it below.\nYou must be authorized via Vercel Deployment Protection to view this page.`,
    "Get your API key",
  );

  try {
    await open(tokenPage);
  } catch {
    // ignore: user can copy URL manually
  }

  const apiKey = flags.apiKey
    ? flags.apiKey
    : ((await password({
        message: "Paste your API key",
        validate: (value) => (!value ? "API key is required" : undefined),
      })) as string);

  const ok = await pingApiKey(baseUrl, apiKey);
  if (!ok) {
    outro(chalk.red("API key was rejected. Double-check the key and base URL."));
    process.exit(1);
  }

  saveSession({ baseUrl, apiKey });

  outro(`Logged in to ${chalk.bold(baseUrl)}`);
}
