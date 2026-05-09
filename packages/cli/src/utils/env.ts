import path from "node:path";
import { config } from "dotenv";
import { expand } from "dotenv-expand";

/**
 * Loads environment variables from a .env file in the working directory.
 * The CLI relies on the user's own Vercel deployment, so both the API key
 * and the base URL are required at runtime (either via env or `languine login`).
 */
export function loadEnv(workingDir: string = process.cwd()) {
  const env = config({ path: path.resolve(workingDir, ".env") });
  expand(env);

  const parsed = env.parsed || {};

  return {
    LANGUINE_DEBUG:
      process.env.LANGUINE_DEBUG ?? parsed.LANGUINE_DEBUG ?? "false",
    LANGUINE_BASE_URL: process.env.LANGUINE_BASE_URL ?? parsed.LANGUINE_BASE_URL,
    LANGUINE_API_KEY: process.env.LANGUINE_API_KEY ?? parsed.LANGUINE_API_KEY,
    LANGUINE_PROJECT_ID:
      process.env.LANGUINE_PROJECT_ID ?? parsed.LANGUINE_PROJECT_ID,
  };
}
