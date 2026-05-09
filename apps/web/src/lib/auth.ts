import "server-only";
import { timingSafeEqual } from "node:crypto";

const HEADER_NAME = "x-api-key";

let warnedMissingKey = false;

function getExpectedKey(): string | null {
  const key = process.env.LANGUINE_API_KEY;
  if (!key) {
    if (!warnedMissingKey) {
      warnedMissingKey = true;
      console.warn(
        "[languine] LANGUINE_API_KEY is not set. All API requests will be rejected. Generate one (e.g. `openssl rand -hex 32`) and set it on your Vercel project.",
      );
    }
    return null;
  }
  return key;
}

export function isValidApiKey(candidate: string | null | undefined): boolean {
  if (!candidate) return false;
  const expected = getExpectedKey();
  if (!expected) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function readApiKeyFromHeaders(headers: Headers): string | null {
  return headers.get(HEADER_NAME);
}

/**
 * Returns true if the incoming request carries Vercel Deployment Protection
 * bypass cookies / signed headers (i.e. the dashboard is being viewed by an
 * authorized owner). We trust Vercel's edge to gate the dashboard, so any
 * request that reaches us with these markers is considered an owner request.
 *
 * Locally (no Vercel envelope), we allow access when running in development.
 */
export function isOwnerRequest(headers: Headers): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  if (process.env.VERCEL_ENV === "preview") return true;

  const protectionBypass = headers.get("x-vercel-protection-bypass");
  if (protectionBypass) return true;

  const idToken = headers.get("x-vercel-id-token");
  if (idToken) return true;

  return false;
}

export function requireApiKey(headers: Headers): void {
  const candidate = readApiKeyFromHeaders(headers);
  if (!isValidApiKey(candidate)) {
    throw new ApiKeyError();
  }
}

export class ApiKeyError extends Error {
  readonly status = 401;
  constructor() {
    super("Invalid or missing API key");
  }
}
