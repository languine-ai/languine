import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export interface LanguineSession {
  baseUrl: string;
  apiKey: string;
}

const SESSION_FILE =
  process.env.LANGUINE_SESSION_FILE ||
  join(homedir(), ".config", "languine", "session.json");

export function saveSession(sessionData: LanguineSession): void {
  mkdirSync(dirname(SESSION_FILE), { recursive: true });
  writeFileSync(SESSION_FILE, JSON.stringify(sessionData, null, 2), {
    mode: 0o600,
  });
}

export function loadSession(): LanguineSession | null {
  if (!existsSync(SESSION_FILE)) return null;
  try {
    return JSON.parse(readFileSync(SESSION_FILE, "utf-8"));
  } catch {
    return null;
  }
}

export function clearSession(): void {
  if (existsSync(SESSION_FILE)) {
    unlinkSync(SESSION_FILE);
  }
}

export function getAPIKey(): string | null {
  if (process.env.LANGUINE_API_KEY) return process.env.LANGUINE_API_KEY;
  return loadSession()?.apiKey ?? null;
}

export function getBaseUrl(): string | null {
  if (process.env.LANGUINE_BASE_URL) return process.env.LANGUINE_BASE_URL;
  return loadSession()?.baseUrl ?? null;
}

export function requireBaseUrl(): string {
  const url = getBaseUrl();
  if (!url) {
    throw new Error(
      "No Languine base URL configured. Run `languine login` or set LANGUINE_BASE_URL.",
    );
  }
  return url.replace(/\/+$/, "");
}
